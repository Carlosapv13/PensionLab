// Proyección RPM con horizonte futuro (S4-002) — extiende calcularPensionRPM.js (lectura
// histórica hasta hoy) a una fecha de reconocimiento futura. Ver
// domain/formulas/trazabilidad-formula-RPM.md, sección "Proyección RPM — Convención
// económica v1 (S4-002)", para la metodología completa aprobada antes de este código.
//
// Principio rector: todo el resultado se expresa en pesos reales de `fecha`
// (fechaBaseMonetaria) — cero IPC futuro inventado, cero pesos nominales futuros.
//
// formulaIBL.js, formulaRPM.js, calcularTasaReemplazoRPM y
// seleccionarVentanaEfectivamenteCotizada NO se modifican — toda la novedad vive aquí y en
// la extensión mínima de fechaAncla en seleccionarPeriodosIBL.js.
//
// No implementa búsqueda/bisección de escenarioIbcFuturo.valor para alcanzar un objetivo
// — eso es S4-003. Esta función evalúa un único escenario por llamada, exactamente como
// calcularProyeccionRAIS evalúa un único ibcAplicableSimulacion por llamada — la misma
// forma que S4-003 reutilizará repetidamente con distintos candidatos.

import { seleccionarPeriodosIBL, diasCalendarioEnRango, diaSiguiente } from '../seleccionarPeriodosIBL.js'
import { calcularPromedioIBL, dividirPeriodoPorAnio } from '../formulas/formulaIBL.js'
import { calcularTasaReemplazoRPM, formulaRPM } from '../formulas/formulaRPM.js'
import { calcularFechaPorEdad } from '../calcularFechaPorEdad.js'
import {
  obtenerIPC,
  obtenerParametrosTasaReemplazoRPM,
  obtenerSemanasHabilitanAlternativaIBL,
  obtenerSmlv,
  obtenerTopeMaximoIBC,
  tieneIPC,
} from '../../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Guarda el propio contrato de la función pública (Principio 11) en vez de confiar en
// que quien la llama ya entregó una fecha válida — hallazgo de la revisión de S4-002
// (2026-08-20): sin esta comprobación, calcularFechaPorEdad podía lanzar
// "RangeError: Invalid time value" sin capturar, en vez de declarar no_evaluable.
function esFechaValida(fechaISO) {
  return typeof fechaISO === 'string' && !Number.isNaN(new Date(fechaISO).getTime())
}

// Ninguna fecha de historiaCotizacion puede ser posterior a `fecha` — un período
// "histórico" fechado en el futuro no es historia real, y mezclarlo con el período
// futuro sintético (más abajo) le haría perder su propio ibc en silencio (hallazgo de la
// revisión de S4-002, 2026-08-20). Se rechaza explícitamente en vez de reinterpretarlo.
function tienePeriodoPosteriorAFecha(historiaCotizacion, fecha) {
  return historiaCotizacion.some((p) => p.fechaDesde > fecha || (p.fechaHasta != null && p.fechaHasta > fecha))
}

const LIMITACION_NO_ES_PENSION_FINAL = {
  codigo: 'NO_ES_TU_PENSION_FINAL',
  mensaje:
    'Esta es una proyección bajo un escenario, no tu pensión definitiva — depende de que ' +
    'sigas cotizando como se asumió aquí, de que la ley no cambie antes de tu jubilación, y ' +
    'del escenario de ingreso futuro evaluado.',
}

const LIMITACION_PARAMETROS_CONGELADOS = {
  codigo: 'PARAMETROS_LEGALES_CONGELADOS_A_FECHA_CALCULO',
  mensaje:
    'El SMLV y los parámetros legales de la fórmula (tasa de reemplazo, topes, umbrales) se ' +
    'usan tal como están vigentes hoy — PensionLab no proyecta cómo cambiará la ley entre ' +
    'ahora y tu jubilación.',
}

const LIMITACION_CONTINUIDAD_FUTURA = {
  codigo: 'CONTINUIDAD_FUTURA_ASUMIDA_SIN_HUECOS',
  mensaje:
    'Este escenario asume que cotizas de forma continua, sin interrupciones, desde hoy hasta ' +
    'tu fecha de jubilación — cualquier hueco real cambiaría el resultado.',
}

function noEvaluable(razonNoEvaluable, trazabilidadVentana, datosFaltantes) {
  return {
    estado: 'no_evaluable',
    razonNoEvaluable,
    fechaBaseMonetaria: null,
    fechaReconocimiento: null,
    horizonteFuturo: null,
    escenarioIbcFuturo: null,
    ibl: null,
    composicionVentanaOrdinaria: null,
    semanasCotizadas: null,
    tasaReemplazo: null,
    pensionMensualProyectada: null,
    limitaciones: [],
    trazabilidadVentana: trazabilidadVentana ?? null,
    datosFaltantes: datosFaltantes ?? null,
  }
}

// Mismo mecanismo que calcularPensionRPM.js: años de IPC que hacen falta para indexar un
// conjunto de períodos — nunca se llama sobre el período futuro (ver más abajo), así que
// nunca busca IPC de un año que todavía no existe.
function aniosRequeridosParaIPC(periodos, anioReferenciaIPC) {
  const anios = new Set([anioReferenciaIPC])
  for (const periodo of periodos) {
    for (const tramo of dividirPeriodoPorAnio(periodo.fechaDesde, periodo.fechaHasta)) {
      anios.add(tramo.anio - 1)
    }
  }
  return anios
}

function aniosIPCFaltantes(anios) {
  return [...anios].filter((anio) => !tieneIPC(anio)).sort((a, b) => a - b)
}

function construirTablaIPC(anios) {
  const tabla = {}
  for (const anio of anios) {
    tabla[anio] = obtenerIPC(anio).valor
  }
  return tabla
}

function sumaDias(periodos) {
  return periodos.reduce((acc, p) => acc + p.diasCotizados, 0)
}

// Separa un conjunto de períodos ya seleccionados en el tramo observado (indexable con
// IPC real) y el tramo futuro (el período sintético construido más abajo, en pesos ya
// constantes — nunca pasa por indexación). Clasifica por el marcador estructural
// esEscenarioFuturo (ver seleccionarPeriodosIBL.js, PeriodoCotizacion) — nunca comparando
// fechas: una comparación de fechas por sí sola no distingue "historia real fechada en el
// futuro por error" de "el escenario futuro sintético", y eso permitía que un período mal
// fechado en historiaCotizacion perdiera su propio ibc en silencio, sustituido por
// valorAplicado (hallazgo de la revisión de S4-002, 2026-08-20). Esa historia mal fechada
// ya se rechaza explícitamente antes de llegar aquí (tienePeriodoPosteriorAFecha) — esta
// función asume esa garantía, no la reimplementa.
function partirObservadoFuturo(periodos) {
  return {
    observados: periodos.filter((p) => !p.esEscenarioFuturo),
    futuros: periodos.filter((p) => p.esEscenarioFuturo === true),
  }
}

// Promedia el tramo observado (indexado con IPC real, vía calcularPromedioIBL, sin
// cambios) con el tramo futuro (valorAplicado constante, sin indexar) ponderando por días.
// Devuelve null en `razon` cuando el promedio se calculó; una razón estructurada cuando no
// pudo calcularse por falta de IPC en el tramo observado.
function promediarConFuturo({ periodosObservados, diasFuturos, valorAplicado, anioReferenciaIPC }) {
  const diasObservados = sumaDias(periodosObservados)

  if (diasObservados === 0) {
    return { promedio: valorAplicado, detalle: [], razonFaltanteIPC: null }
  }

  const anios = aniosRequeridosParaIPC(periodosObservados, anioReferenciaIPC)
  const faltantes = aniosIPCFaltantes(anios)
  if (faltantes.length > 0) {
    return { promedio: null, detalle: null, razonFaltanteIPC: faltantes }
  }

  const tablaIPC = construirTablaIPC(anios)
  const resultado = calcularPromedioIBL({ periodos: periodosObservados, tablaIPC, anioReferenciaIPC })
  const totalDias = diasObservados + diasFuturos
  const promedio = (resultado.promedio * diasObservados + valorAplicado * diasFuturos) / totalDias

  return { promedio, detalle: resultado.detalle, razonFaltanteIPC: null }
}

/**
 * @typedef {Object} EscenarioIbcFuturoEntrada
 * @property {number} valor - En pesos de `fecha` (fechaBaseMonetaria) — nunca nominal futuro.
 * @property {string} origen - Opaco para el cálculo, solo viaja hasta la salida. S4-002
 *   produce únicamente 'continuidad_ibc_actual'.
 */

/**
 * @param {Object} input
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} [input.historiaCotizacion]
 * @param {string} input.fechaNacimiento - ISO
 * @param {(number|null|undefined)} input.edadJubilacionDeseada
 * @param {EscenarioIbcFuturoEntrada} input.escenarioIbcFuturo
 * @param {string} [input.fecha] - ISO, por defecto hoy (fechaBaseMonetaria)
 * @returns {{
 *   estado: 'calculado' | 'no_evaluable',
 *   razonNoEvaluable: ('EDAD_JUBILACION_NO_DECLARADA'|'FECHA_NACIMIENTO_NO_VALIDA'|'IBC_FUTURO_NO_VALIDO'|'HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO'|'EDAD_JUBILACION_NO_POSTERIOR_A_HOY'|'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA'|'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA'|'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS'|'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS'|'COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO'|null),
 *   fechaBaseMonetaria: string | null,
 *   fechaReconocimiento: string | null,
 *   horizonteFuturo: {fechaInicio: string, fechaFin: string, diasCotizados: number} | null,
 *   escenarioIbcFuturo: {valorDeclarado: number, valorAplicado: number, origen: string, topeAplicado: number} | null,
 *   ibl: Object | null,
 *   composicionVentanaOrdinaria: {diasObservados: number, diasFuturos: number, fraccionFutura: number} | null,
 *   semanasCotizadas: {observadas: number, futuras: number, total: number} | null,
 *   tasaReemplazo: number | null,
 *   pensionMensualProyectada: number | null,
 *   limitaciones: Array<{codigo: string, mensaje: string}>,
 *   trazabilidadVentana: Object | null,
 *   datosFaltantes: {ipcAnios: number[]} | null,
 * }}
 */
export function calcularProyeccionRPM({
  historiaCotizacion = [],
  fechaNacimiento,
  edadJubilacionDeseada,
  escenarioIbcFuturo,
  fecha = hoyISO(),
} = {}) {
  if (edadJubilacionDeseada === null || edadJubilacionDeseada === undefined || !Number.isFinite(edadJubilacionDeseada)) {
    return noEvaluable('EDAD_JUBILACION_NO_DECLARADA', null)
  }

  if (!esFechaValida(fechaNacimiento)) {
    return noEvaluable('FECHA_NACIMIENTO_NO_VALIDA', null)
  }

  if (
    !escenarioIbcFuturo ||
    !Number.isFinite(escenarioIbcFuturo.valor) ||
    escenarioIbcFuturo.valor <= 0
  ) {
    return noEvaluable('IBC_FUTURO_NO_VALIDO', null)
  }

  if (tienePeriodoPosteriorAFecha(historiaCotizacion, fecha)) {
    return noEvaluable('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO', null)
  }

  const fechaReconocimiento = calcularFechaPorEdad(fechaNacimiento, edadJubilacionDeseada)
  if (fechaReconocimiento <= fecha) {
    return noEvaluable('EDAD_JUBILACION_NO_POSTERIOR_A_HOY', null)
  }

  const smlv = obtenerSmlv(fecha)
  const tope = obtenerTopeMaximoIBC(fecha)
  const topeAplicado = tope.valor * smlv.valor
  const valorDeclarado = escenarioIbcFuturo.valor
  const valorAplicado = Math.min(valorDeclarado, topeAplicado)

  const periodoFuturo = {
    fechaDesde: diaSiguiente(fecha),
    fechaHasta: fechaReconocimiento,
    ibc: valorAplicado,
    diasCotizados: diasCalendarioEnRango(diaSiguiente(fecha), fechaReconocimiento),
    esEscenarioFuturo: true,
  }

  const seleccion = seleccionarPeriodosIBL({
    historiaCotizacion: [...historiaCotizacion, periodoFuturo],
    fechaCalculo: fecha,
    fechaAncla: fechaReconocimiento,
  })

  if (!seleccion.evaluable) {
    return noEvaluable(seleccion.razonNoEvaluable, seleccion.trazabilidadVentana)
  }

  const anioReferenciaIPC = new Date(fecha).getUTCFullYear() - 1

  const { observados: ordinarioObservado, futuros: ordinarioFuturo } = partirObservadoFuturo(seleccion.periodosOrdinario)
  const diasObservadosOrdinario = sumaDias(ordinarioObservado)
  const diasFuturosOrdinario = sumaDias(ordinarioFuturo)

  const ordinario = promediarConFuturo({
    periodosObservados: ordinarioObservado,
    diasFuturos: diasFuturosOrdinario,
    valorAplicado,
    anioReferenciaIPC,
  })
  if (ordinario.razonFaltanteIPC) {
    return noEvaluable('COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO', seleccion.trazabilidadVentana, {
      ipcAnios: ordinario.razonFaltanteIPC,
    })
  }

  const diasObservadosTotal = sumaDias(historiaCotizacion)
  const semanasObservadas = diasObservadosTotal / 7
  const semanasFuturas = periodoFuturo.diasCotizados / 7
  const semanasCotizadas = { observadas: semanasObservadas, futuras: semanasFuturas, total: semanasObservadas + semanasFuturas }

  const umbralAlternativa = obtenerSemanasHabilitanAlternativaIBL(fecha)

  // A diferencia de calcularPensionRPM.js (lectura histórica, umbral evaluado solo contra
  // semanasObservadas), aquí el umbral se evalúa contra el total proyectado — decisión de
  // alcance de S4-002, ver domain/formulas/trazabilidad-formula-RPM.md, "Semanas — total,
  // no solo observadas". El bloqueo §8.10 (semanas declaradas vs. historia estructurada)
  // sigue sin resolver, sin relación con esta decisión.
  let iblVidaLaboral = null
  let razonVidaLaboralNoEvaluada = 'SEMANAS_TOTALES_INSUFICIENTES'
  if (semanasCotizadas.total >= umbralAlternativa.valor) {
    const { observados: vlObservado, futuros: vlFuturo } = partirObservadoFuturo(seleccion.periodosVidaLaboral)
    const diasFuturosVL = sumaDias(vlFuturo)

    const vidaLaboral = promediarConFuturo({
      periodosObservados: vlObservado,
      diasFuturos: diasFuturosVL,
      valorAplicado,
      anioReferenciaIPC,
    })

    if (vidaLaboral.razonFaltanteIPC) {
      razonVidaLaboralNoEvaluada = 'DATOS_LEGALES_INSUFICIENTES'
    } else {
      iblVidaLaboral = { valor: vidaLaboral.promedio, detalle: vidaLaboral.detalle }
      razonVidaLaboralNoEvaluada = null
    }
  }

  const esOpcionLegal = iblVidaLaboral !== null && iblVidaLaboral.valor > ordinario.promedio
  const iblAplicable = esOpcionLegal ? iblVidaLaboral.valor : ordinario.promedio

  const parametrosLegales = { ...obtenerParametrosTasaReemplazoRPM(fecha), smlv: smlv.valor }
  const datosUsuario = { ibl: iblAplicable, semanasCotizadas: semanasCotizadas.total }

  const tasaReemplazo = calcularTasaReemplazoRPM({ datosUsuario, parametrosLegales })
  const pensionMensualProyectada = formulaRPM({ datosUsuario, parametrosLegales })

  return {
    estado: 'calculado',
    razonNoEvaluable: null,
    fechaBaseMonetaria: fecha,
    fechaReconocimiento,
    // Horizonte temporal explícito (§14 punto 9 del Entregable 2) — reexpone, sin ningún
    // cálculo nuevo, las mismas fechaDesde/fechaHasta/diasCotizados de periodoFuturo
    // (arriba) que ya se usan internamente para construir el período sintético. Antes se
    // descartaban al salir de esta función; ahora también forman parte del contrato
    // público, para que la UI pueda mostrar "desde/hasta/duración" sin recalcular fechas.
    horizonteFuturo: {
      fechaInicio: periodoFuturo.fechaDesde,
      fechaFin: periodoFuturo.fechaHasta,
      diasCotizados: periodoFuturo.diasCotizados,
    },
    escenarioIbcFuturo: {
      valorDeclarado,
      valorAplicado,
      origen: escenarioIbcFuturo.origen,
      topeAplicado,
    },
    ibl: {
      ordinario: { valor: ordinario.promedio, detalle: ordinario.detalle },
      vidaLaboral: iblVidaLaboral,
      aplicable: iblAplicable,
      esOpcionLegal,
      razonVidaLaboralNoEvaluada,
    },
    composicionVentanaOrdinaria: {
      diasObservados: diasObservadosOrdinario,
      diasFuturos: diasFuturosOrdinario,
      fraccionFutura: diasFuturosOrdinario / (diasObservadosOrdinario + diasFuturosOrdinario),
    },
    semanasCotizadas,
    tasaReemplazo,
    pensionMensualProyectada,
    limitaciones: [LIMITACION_NO_ES_PENSION_FINAL, LIMITACION_PARAMETROS_CONGELADOS, LIMITACION_CONTINUIDAD_FUTURA],
    trazabilidadVentana: seleccion.trazabilidadVentana,
    datosFaltantes: null,
  }
}
