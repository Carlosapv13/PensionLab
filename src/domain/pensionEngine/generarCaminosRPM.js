// Orquesta S4-003 — "Objetivo/restricción RPM capturables + búsqueda determinista del IBC
// necesario (camino base + alternativo)". Ver domain/formulas/trazabilidad-formula-RPM.md,
// sección "Bisección de S4-003", para el contrato completo aprobado antes de este código.
//
// calcularProyeccionRPM.js se reutiliza como caja negra — este archivo nunca reimplementa
// IBL, tasa de reemplazo, ventana ni indexación. formulaIBL.js, formulaRPM.js y la
// convención de 3.650 días permanecen intactos.
//
// costoAcumuladoHastaJubilacion queda fuera de esfuerzo — "Regla 5 del Entregable" (citada
// en §7.2 del Entregable 2) no está definida en ningún documento del proyecto; no se
// inventa su contenido ni se asigna a ningún Slice futuro como obligación (decisión
// Carlos/Atlas, 2026-08-20).
//
// S4-005 agrega `barrido` — 5 puntos deterministas de la misma curva esfuerzo↔resultado.
// Separado a propósito de `escenarios`: no son caminos con decisión/limitaciones/
// trazabilidad propias, son muestras de la misma curva que `escenarios` ya evalúa —
// mezclarlos rompería la semántica de calcularOrientacion() (un barrido monótono denso
// dispararía VARIOS_CUMPLEN_FALTA_PRIORIDAD de forma artificial en cuanto un punto
// cumpliera el objetivo, ya que todos los puntos por encima también cumplirían).
//
// Rediseño de producto (2026-08-21, tercera iteración de S4-005): el rango del barrido ya
// NO es incondicionalmente [ibcActual, topeEfectivo] — el tope legal aplastaba visualmente
// la zona relevante para la decisión del usuario en cualquier caso donde el objetivo era
// alcanzable con un esfuerzo mucho menor (verificado empíricamente: en un caso real el
// objetivo se alcanzaba al 6% del rango hasta el tope). El rango depende de si el objetivo
// es alcanzable — ver `construirBarridoEsfuerzoResultado`, que lee `escenarios` ya
// construido (por eso el barrido se calcula al final de esta función, no en paralelo).

import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { calcularFechaPorEdad } from '../calcularFechaPorEdad.js'
import { obtenerTasaCotizacion, obtenerEdadPension, obtenerSemanasMinimas } from '../../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

const LIMITACION_RESTRICCION_COSTO_LIMITA_RESULTADO = {
  codigo: 'RESTRICCION_COSTO_LIMITA_RESULTADO',
  mensaje:
    'El límite que declaraste para tu aporte pensional adicional impidió alcanzar tu objetivo — sin esa ' +
    'restricción, tu objetivo sí sería alcanzable dentro del tope legal.',
}

function resultadoVacio(codigo, razon, detalleElegibilidad = null) {
  return {
    escenarios: [],
    orientacion: { caminoMasAlineadoId: null, codigo, razon },
    detalleElegibilidad,
    barrido: null,
    horizonte: null,
  }
}

// Duplicada a propósito de generarCaminosRAIS.js — misma lógica genérica (opera solo
// sobre estado/distanciaObjetivo, sin nada específico de RAIS ni de RPM), mismo criterio
// de duplicación ya usado en este proyecto para no acoplar un motor al archivo del otro
// régimen. Si un tercer régimen la necesitara, ahí correspondería extraerla.
function calcularOrientacion(escenarios) {
  const viables = escenarios.filter((e) => e.estado === 'viable')

  if (viables.length === 0) {
    return {
      caminoMasAlineadoId: null,
      codigo: 'SIN_CAMINOS_VIABLES',
      razon: 'Ningún camino resultó evaluable con la información actual.',
    }
  }

  const cumplen = viables.filter((e) => e.distanciaObjetivo.cumple)

  if (cumplen.length === 1) {
    return {
      caminoMasAlineadoId: cumplen[0].id,
      codigo: 'UNICO_CUMPLE',
      razon: 'Es el único camino evaluado que alcanza tu objetivo.',
    }
  }

  if (cumplen.length > 1) {
    return {
      caminoMasAlineadoId: null,
      codigo: 'VARIOS_CUMPLEN_FALTA_PRIORIDAD',
      razon:
        'Más de un camino evaluado alcanza tu objetivo; falta que definas una prioridad entre ellos para elegir uno.',
    }
  }

  const masCercano = viables.reduce((a, b) => (a.distanciaObjetivo.delta <= b.distanciaObjetivo.delta ? a : b))
  return {
    caminoMasAlineadoId: masCercano.id,
    codigo: 'NINGUNO_CUMPLE_MAS_CERCANO',
    razon: 'Ningún camino evaluado alcanza tu objetivo completo; este es el que más se acerca.',
  }
}

function construirEsfuerzo(ibcActual, ibcPropuesto, tasaCotizacion) {
  const aporteMensualPensionActual = ibcActual * tasaCotizacion
  const aporteMensualPensionPropuesto = ibcPropuesto * tasaCotizacion
  return {
    ibcActual,
    ibcPropuesto,
    aumentoIBC: ibcPropuesto - ibcActual,
    aporteMensualPensionActual,
    aporteMensualPensionPropuesto,
    costoPensionalAdicionalMensual: aporteMensualPensionPropuesto - aporteMensualPensionActual,
  }
}

function construirCamino({ id, tipo, decision, proyeccion, edadJubilacionDeseada, ibcActual, tasaCotizacion, objetivoValorMensual }) {
  const delta = objetivoValorMensual - proyeccion.pensionMensualProyectada
  return {
    id,
    tipo,
    estado: 'viable',
    decision,
    entradas: { escenarioIbcFuturo: proyeccion.escenarioIbcFuturo, edadJubilacionDeseada },
    resultado: { valor: proyeccion.pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
    ibl: proyeccion.ibl,
    tasaReemplazo: proyeccion.tasaReemplazo,
    semanasCotizadas: proyeccion.semanasCotizadas,
    composicionVentanaOrdinaria: proyeccion.composicionVentanaOrdinaria,
    trazabilidadVentana: proyeccion.trazabilidadVentana,
    esfuerzo: construirEsfuerzo(ibcActual, proyeccion.escenarioIbcFuturo.valorAplicado, tasaCotizacion),
    distanciaObjetivo: { valorObjetivo: objetivoValorMensual, delta, cumple: delta <= 0 },
    limitaciones: proyeccion.limitaciones,
    razonDescartado: null,
  }
}

function caminoDescartado(id, decision, razonDescartado) {
  return {
    id,
    tipo: 'alternativo',
    estado: 'descartado',
    decision,
    entradas: null,
    resultado: null,
    ibl: null,
    tasaReemplazo: null,
    semanasCotizadas: null,
    composicionVentanaOrdinaria: null,
    trazabilidadVentana: null,
    esfuerzo: null,
    distanciaObjetivo: null,
    limitaciones: [],
    razonDescartado,
  }
}

const CANTIDAD_PUNTOS_BARRIDO = 5

// Margen de exploración de producto, NO una segunda meta del usuario — decisión Carlos/
// Atlas, 2026-08-21. Cuando el objetivo es alcanzable, el barrido se extiende un poco más
// allá de él (aproximadamente) para mostrar "qué ocurre un poco más allá de tu meta", sin
// llegar innecesariamente hasta el tope legal. Revisable como convención de producto, igual
// que la ventana de 3.650 días — ver trazabilidad-formula-RPM.md.
const MULTIPLICADOR_REFERENCIA_SUPERIOR = 1.25

const RAZON_SIN_MARGEN_TOPE_LEGAL = {
  codigo: 'SIN_MARGEN_TOPE_LEGAL',
  razon:
    'Ya declaraste una base actual en el tope máximo legal (25 SMLV) — no hay margen de IBC futuro para explorar.',
}

const RAZON_SIN_MARGEN_RESTRICCION_COSTO = {
  codigo: 'SIN_MARGEN_RESTRICCION_COSTO',
  razon: 'El límite que declaraste para tu aporte pensional adicional no deja margen de IBC futuro para explorar.',
}

const RAZON_OBJETIVO_YA_ALCANZADO = {
  codigo: 'OBJETIVO_YA_ALCANZADO',
  razon: 'Tu situación actual ya alcanza tu objetivo — no hace falta explorar ningún aumento.',
}

// Evalúa un único punto del barrido vía calcularProyeccionRPM (caja negra) y le da la
// misma forma que ya usa construirCamino() para esfuerzo/resultado — sin decision,
// limitaciones ni trazabilidad propias (S4-005 no es un camino, es una muestra).
function construirPuntoBarrido({ construirInput, ibcActual, tasaCotizacion, indice, posicion, valorCandidato }) {
  const proyeccion = calcularProyeccionRPM(construirInput(valorCandidato))
  return {
    indice,
    posicion,
    escenarioIbcFuturo: proyeccion.escenarioIbcFuturo,
    esfuerzo: construirEsfuerzo(ibcActual, proyeccion.escenarioIbcFuturo.valorAplicado, tasaCotizacion),
    resultado: { valor: proyeccion.pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
  }
}

// 5 puntos deterministas, uniformemente espaciados en IBC dentro de [ibcActual,
// limiteSuperior] — el mismo mecanismo para cualquiera de los 4 casos de S4-005, el único
// dato que cambia entre casos es dónde cae limiteSuperior y cómo se etiqueta ese extremo
// (posicionExtremo).
//
// Tratamiento de los extremos (decisión explícita, 2026-08-21): índice 0 = ibcActual
// exacto, índice 4 = limiteSuperior exacto — SIN Math.floor. Verificado contra el contrato
// real de calcularProyeccionRPM: valida únicamente Number.isFinite(escenarioIbcFuturo.valor),
// nunca Number.isInteger — no exige un IBC entero. Cuando limiteSuperior proviene de una
// restricción de costo, puede traer decimales; ese decimal es el límite matemático real de
// la restricción declarada, no un artefacto de redondeo, y el extremo superior lo
// representa tal cual, sin ocultarlo. Distinto de biseccionarEscenarioIbcFuturo (abajo),
// que sí redondea porque busca alcanzar un objetivo puntual — aquí no hay objetivo por
// punto, así que no hay razón de contrato para forzar un entero en los extremos.
//
// Los 3 puntos intermedios sí se redondean hacia abajo (Math.floor) a pesos enteros — son
// solo muestras exploratorias de la curva, no límites que deban preservarse exactos. Floor
// garantiza, por construcción y sin código adicional: (a) ningún punto excede
// limiteSuperior (el valor sin redondear ya es estrictamente menor); (b) orden no
// decreciente (floor de una secuencia no decreciente nunca decrece); (c) reproducibilidad
// (aritmética determinista, sin aleatoriedad ni dependencia de entorno).
function construirRejillaUniforme({ construirInput, ibcActual, limiteSuperior, posicionExtremo, tasaCotizacion }) {
  const ultimoIndice = CANTIDAD_PUNTOS_BARRIDO - 1
  const paso = (limiteSuperior - ibcActual) / ultimoIndice

  const puntos = []
  for (let indice = 0; indice < CANTIDAD_PUNTOS_BARRIDO; indice++) {
    let valorCandidato
    let posicion
    if (indice === 0) {
      valorCandidato = ibcActual
      posicion = 'actual'
    } else if (indice === ultimoIndice) {
      valorCandidato = limiteSuperior
      posicion = posicionExtremo
    } else {
      valorCandidato = Math.floor(ibcActual + indice * paso)
      posicion = 'intermedio'
    }
    puntos.push(construirPuntoBarrido({ construirInput, ibcActual, tasaCotizacion, indice, posicion, valorCandidato }))
  }
  return puntos
}

// Reutiliza un escenario de `escenarios` (S4-003) tal cual, sin volver a evaluar
// calcularProyeccionRPM — usado exclusivamente para `puntoObjetivo`, que debe ser
// bit-idéntico a lo que ya muestra la comparación de caminos (S4-003/S4-004).
function puntoDesdeEscenario(escenario) {
  return {
    escenarioIbcFuturo: escenario.entradas.escenarioIbcFuturo,
    esfuerzo: escenario.esfuerzo,
    resultado: escenario.resultado,
  }
}

/**
 * Construye `barrido` a partir de `escenarios` ya resuelto (S4-003) — no recalcula nada
 * que S4-003 ya haya decidido, solo lee su resultado para elegir el rango a explorar.
 *
 * Cuatro casos, en este orden de prioridad:
 * 1. El camino base ya cumple el objetivo → 'objetivo_ya_alcanzado', sin puntos (ninguna
 *    curva de aumentos innecesarios).
 * 2. No hay alternativo viable (objetivo no alcanzable, ni en el tope legal ni dentro de
 *    la restricción) → rango hasta topeEfectivo — aquí sí importa "¿hasta dónde podrías
 *    llegar como máximo?".
 * 3. Hay alternativo viable pero no cumple el objetivo (la restricción de costo lo impidió
 *    — único caso posible por construcción, ver auditoría de S4-003) → mismo rango que ya
 *    encontró el alternativo (topeEfectivo), reutilizado, nunca recalculado.
 * 4. El alternativo cumple el objetivo → el rango se extiende hasta
 *    objetivoValorMensual × 1.25 (margen de exploración de producto, nunca una segunda
 *    meta), encontrado reutilizando biseccionarEscenarioIbcFuturo con un objetivo distinto
 *    — misma infraestructura de búsqueda de S4-003, sin segunda fórmula. Si ese margen no
 *    cabe en topeEfectivo, la propia bisección converge honestamente al límite real (mismo
 *    mecanismo ya usado cuando un objetivo no es alcanzable — no hace falta ninguna
 *    verificación previa).
 */
function construirBarridoEsfuerzoResultado({
  construirInput,
  ibcActual,
  topeAplicado,
  topeEfectivo,
  tasaCotizacion,
  objetivoValorMensual,
  escenarioBase,
  alternativo,
}) {
  if (escenarioBase.distanciaObjetivo.cumple) {
    return { estado: 'objetivo_ya_alcanzado', ...RAZON_OBJETIVO_YA_ALCANZADO, puntos: [], puntoObjetivo: null }
  }

  if (!alternativo || alternativo.estado !== 'viable') {
    if (topeEfectivo <= ibcActual) {
      const razonSinMargen = topeAplicado <= ibcActual ? RAZON_SIN_MARGEN_TOPE_LEGAL : RAZON_SIN_MARGEN_RESTRICCION_COSTO
      return { estado: 'sin_margen', ...razonSinMargen, puntos: [], puntoObjetivo: null }
    }
    const puntos = construirRejillaUniforme({
      construirInput,
      ibcActual,
      limiteSuperior: topeEfectivo,
      posicionExtremo: 'extremo_superior',
      tasaCotizacion,
    })
    return { estado: 'calculado', codigo: null, razon: null, puntos, puntoObjetivo: null }
  }

  if (!alternativo.distanciaObjetivo.cumple) {
    if (topeEfectivo <= ibcActual) {
      return { estado: 'sin_margen', ...RAZON_SIN_MARGEN_RESTRICCION_COSTO, puntos: [], puntoObjetivo: null }
    }
    const puntos = construirRejillaUniforme({
      construirInput,
      ibcActual,
      limiteSuperior: topeEfectivo,
      posicionExtremo: 'limite_restriccion',
      tasaCotizacion,
    })
    return { estado: 'calculado', codigo: null, razon: null, puntos, puntoObjetivo: null }
  }

  // Reutiliza el mismo construirInput que arma la rejilla (mismo origen,
  // 'barrido_esfuerzo_resultado') — el resultado de esta búsqueda interna nunca se expone
  // tal cual; solo se leen su IBC final y su pensión proyectada, y el punto 4 de la
  // rejilla se vuelve a evaluar más abajo con el mismo mecanismo que los otros 4 puntos.
  const objetivoReferenciaSuperior = objetivoValorMensual * MULTIPLICADOR_REFERENCIA_SUPERIOR
  const resultadoReferenciaSuperior = biseccionarEscenarioIbcFuturo({
    construirInput,
    ibcActual,
    topeAplicado: topeEfectivo,
    objetivoValorMensual: objetivoReferenciaSuperior,
  })
  const ibcReferenciaSuperior = resultadoReferenciaSuperior.escenarioIbcFuturo.valorAplicado
  const referenciaSuperiorAlcanzada = resultadoReferenciaSuperior.pensionMensualProyectada >= objetivoReferenciaSuperior

  // §8.5 (monotonicidad) garantiza ibcReferenciaSuperior >= ibcObjetivo del alternativo —
  // objetivoReferenciaSuperior > objetivoValorMensual, y ambas búsquedas comparten el mismo
  // límite superior (topeEfectivo). No se defiende con Math.max: es una invariante
  // demostrada, no un caso incierto.
  const posicionExtremo = referenciaSuperiorAlcanzada
    ? 'referencia_superior'
    : topeEfectivo < topeAplicado
      ? 'limite_restriccion'
      : 'extremo_superior'

  const puntos = construirRejillaUniforme({
    construirInput,
    ibcActual,
    limiteSuperior: ibcReferenciaSuperior,
    posicionExtremo,
    tasaCotizacion,
  })

  return { estado: 'calculado', codigo: null, razon: null, puntos, puntoObjetivo: puntoDesdeEscenario(alternativo) }
}

// Bisección sobre escenarioIbcFuturo.valor, acotada a [ibcActual, topeAplicado] — nunca
// fuera de ese rango (§8.5, ver trazabilidad-formula-RPM.md). Cada evaluación intermedia
// llama a calcularProyeccionRPM sin transformar ni reinterpretar su resultado.
//
// No se defiende contra que una evaluación intermedia resulte 'no_evaluable': variar
// únicamente escenarioIbcFuturo.valor nunca cambia la evaluabilidad de la ventana (la
// selección de períodos y la cobertura de IPC dependen solo de fechas, nunca del propio
// IBC) — invariante ya verificado en S4-002 y ejercitado de nuevo en los tests de este
// archivo. Documentado, no defendido con código adicional (mismo criterio ya usado en
// resolverMesesNecesariosRAIS para su propio caso límite no manejado).
function biseccionarEscenarioIbcFuturo({ construirInput, ibcActual, topeAplicado, objetivoValorMensual }) {
  const rango = topeAplicado - ibcActual
  const iteraciones = Math.ceil(Math.log2(rango))

  let limiteInferior = ibcActual
  let limiteSuperior = topeAplicado

  for (let i = 0; i < iteraciones; i++) {
    const medio = (limiteInferior + limiteSuperior) / 2
    const proyeccion = calcularProyeccionRPM(construirInput(medio))

    if (proyeccion.pensionMensualProyectada >= objetivoValorMensual) {
      limiteSuperior = medio
    } else {
      limiteInferior = medio
    }
  }

  // Redondeo hacia ARRIBA (Math.ceil), no al más cercano — una búsqueda de objetivo cuyo
  // propio resultado redondeado cayera una fracción de peso por debajo del objetivo
  // derrotaría su propio propósito (hallazgo de la revisión de S4-003, 2026-08-20:
  // Math.round produjo distanciaObjetivo.cumple === false en un caso real de prueba).
  // Se acota con topeAplicado por si el redondeo empujara 1 peso más allá del límite por
  // ruido de punto flotante — nunca se ofrece un IBC fuera del rango aprobado.
  const valorFinal = Math.min(Math.ceil(limiteSuperior), topeAplicado)
  return calcularProyeccionRPM(construirInput(valorFinal))
}

/**
 * @param {Object} input
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {('Mujer'|'Hombre'|null)} input.sexo - indispensable para resolver edad y semanas
 *   mínimas legales (Art. 33 Ley 100 de 1993, diferenciado por sexo)
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} [input.historiaCotizacion]
 * @param {string} input.fechaNacimiento - ISO
 * @param {number|null} input.edadJubilacionDeseada
 * @param {number|null} input.ibcAplicableSimulacion - ya resuelto y apto (determinarBaseCotizacion.js)
 * @param {number|null} input.objetivoValorMensual - en pesos de fechaBaseMonetaria
 * @param {number|null} [input.restriccionCostoPensionalAdicionalMaximoMensual]
 * @param {string} [input.fecha]
 * @returns {{
 *   escenarios: Array<Object>,
 *   orientacion: { caminoMasAlineadoId: string|null, codigo: string, razon: string },
 *   detalleElegibilidad: Object|null,
 *   barrido: {
 *     estado: 'calculado'|'sin_margen'|'objetivo_ya_alcanzado',
 *     codigo: string|null,
 *     razon: string|null,
 *     puntos: Array<{
 *       indice: number,
 *       posicion: 'actual'|'intermedio'|'referencia_superior'|'limite_restriccion'|'extremo_superior',
 *       escenarioIbcFuturo: Object,
 *       esfuerzo: Object,
 *       resultado: { valor: number, moneda: 'COP', periodoReferencia: 'mensual' },
 *     }>,
 *     puntoObjetivo: { escenarioIbcFuturo: Object, esfuerzo: Object, resultado: Object } | null,
 *   } | null,
 *   horizonte: { fechaInicio: string, fechaFin: string, diasCotizados: number } | null,
 * }}
 */
export function generarCaminosRPM({
  regimenActual,
  sexo,
  historiaCotizacion = [],
  fechaNacimiento,
  edadJubilacionDeseada,
  ibcAplicableSimulacion,
  objetivoValorMensual,
  restriccionCostoPensionalAdicionalMaximoMensual = null,
  fecha = hoyISO(),
}) {
  // --- Perfil (S4-001: sin restricción de tipoCotizante/lugarCotizacion/trasladoRegimen) ---
  if (regimenActual !== 'RPM') {
    return resultadoVacio('PERFIL_NO_EVALUABLE', 'Este análisis de caminos solo está disponible hoy para régimen RPM.')
  }

  // --- Datos imprescindibles ---
  if (sexo !== 'Mujer' && sexo !== 'Hombre') {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu sexo para poder resolver los requisitos legales de edad y semanas mínimas.')
  }
  if (!esNumeroValido(ibcAplicableSimulacion) || ibcAplicableSimulacion <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta una base de cotización apta para simular.')
  }
  if (!esNumeroValido(objetivoValorMensual) || objetivoValorMensual <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu objetivo de pensión mensual.')
  }
  if (!esNumeroValido(edadJubilacionDeseada)) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar la edad hasta la que quieres explorar.')
  }

  // --- Elegibilidad legal RPM (auditoría 2026-08-21) ---
  // Requisito de edad: se resuelve a fechaReconocimiento, no a fecha — no es un valor
  // legal futuro desconocido, es aplicar hoy una constante ya vigente (57/62, sin
  // cronograma) a la fecha en que efectivamente se evaluaría. Se verifica ANTES de
  // llamar a calcularProyeccionRPM: no depende de historia ni de IBC, así que no tiene
  // sentido calcular nada si la edad elegida ya descarta el reconocimiento.
  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'
  const fechaReconocimiento = calcularFechaPorEdad(fechaNacimiento, edadJubilacionDeseada)
  const edadMinima = obtenerEdadPension(fechaReconocimiento, sexoResuelto)

  if (edadJubilacionDeseada < edadMinima.valor) {
    const aniosFaltantes = edadMinima.valor - edadJubilacionDeseada
    return resultadoVacio(
      'EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL',
      `A los ${edadJubilacionDeseada} años no cumplirías el requisito legal de edad para RPM (${edadMinima.valor} años) — te faltarían ${aniosFaltantes} años.`,
      { edadMinima: edadMinima.valor, edadElegida: edadJubilacionDeseada, aniosFaltantes }
    )
  }

  const escenarioBaseInput = {
    historiaCotizacion,
    fechaNacimiento,
    edadJubilacionDeseada,
    escenarioIbcFuturo: { valor: ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
    fecha,
  }

  const resultadoBase = calcularProyeccionRPM(escenarioBaseInput)

  if (resultadoBase.estado !== 'calculado') {
    return resultadoVacio('SIN_CAMINOS_VIABLES', 'No fue posible calcular ni siquiera el camino base con los datos actuales.')
  }

  // Requisito de semanas: igual criterio de fecha que la edad (fechaReconocimiento, no
  // fecha) — semanasMinimasPensionMujer sí tiene un cronograma legal ya vigente
  // (Sentencia C-197/2023) que sería incorrecto ignorar. Se compara contra
  // semanasCotizadas.total (historia observada + horizonte futuro completo, ya
  // proyectado por calcularProyeccionRPM) — nunca contra la semanas declaradas hoy por
  // el usuario en otra pantalla, que reflejan una fecha distinta. Una sola verificación
  // basta: semanasCotizadas.total no depende de escenarioIbcFuturo.valor (invariante ya
  // establecida), así que si el camino base cumple, cualquier alternativo también.
  const semanasMinimas = obtenerSemanasMinimas(fechaReconocimiento, sexoResuelto, 'RPM')
  const semanasProyectadas = resultadoBase.semanasCotizadas.total

  if (semanasProyectadas < semanasMinimas.valor) {
    const semanasFaltantes = semanasMinimas.valor - semanasProyectadas
    return resultadoVacio(
      'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM',
      `Con la historia y el escenario de cotización utilizados, a esa fecha proyectamos ${semanasProyectadas.toFixed(1)} semanas. El requisito legal aplicable es ${semanasMinimas.valor}; faltarían ${semanasFaltantes.toFixed(1)} semanas.`,
      { semanasMinimas: semanasMinimas.valor, semanasProyectadas, semanasFaltantes }
    )
  }

  const tasaCotizacion = obtenerTasaCotizacion(fecha)
  const tasaCotizacionFraccion = tasaCotizacion.valor / 100

  const escenarioBase = construirCamino({
    id: 'base',
    tipo: 'base',
    decision: 'Mantener, en términos reales, tu base de cotización actual hasta tu jubilación.',
    proyeccion: resultadoBase,
    edadJubilacionDeseada,
    ibcActual: ibcAplicableSimulacion,
    tasaCotizacion: tasaCotizacionFraccion,
    objetivoValorMensual,
  })

  const escenarios = [escenarioBase]

  // --- Rango compartido por el barrido (S4-005) y por el camino alternativo (S4-003) ---
  // Límite propio declarado por el usuario (restricción de costo), convertido a un límite
  // de IBC — mismo criterio que generarCaminosRAIS.js: dividir entre la tasa de
  // cotización, nunca sumar directamente el peso de restricción al IBC.
  const topeAplicado = resultadoBase.escenarioIbcFuturo.topeAplicado
  const limiteIBCPorRestriccion =
    restriccionCostoPensionalAdicionalMaximoMensual !== null && esNumeroValido(restriccionCostoPensionalAdicionalMaximoMensual)
      ? ibcAplicableSimulacion + restriccionCostoPensionalAdicionalMaximoMensual / tasaCotizacionFraccion
      : Infinity
  const topeEfectivo = Math.min(topeAplicado, limiteIBCPorRestriccion)

  // --- Camino alternativo: buscar el IBC futuro necesario ---
  // Solo se genera cuando el base no alcanza el objetivo — si ya lo alcanza o lo supera,
  // no hay brecha que cerrar (mismo criterio que generarCaminosRAIS.js).
  if (escenarioBase.distanciaObjetivo.delta > 0) {
    if (ibcAplicableSimulacion >= topeAplicado) {
      escenarios.push(
        caminoDescartado('aumentar-ibc-futuro', 'Aumentar tu IBC futuro para acercarte a tu objetivo.', {
          codigo: 'YA_EN_TOPE_LEGAL',
          mensaje:
            'Ya declaraste una base actual sobre el tope máximo legal (25 SMLV) — no es posible proponer un ' +
            'IBC futuro mayor. Este tope se evalúa con el SMLV vigente en la fecha de esta simulación; ' +
            'PensionLab todavía no proyecta el SMLV futuro.',
          reglaAplicada: 'tope-maximo-ibc',
        })
      )
    } else {
      const resultadoEnTope = calcularProyeccionRPM({
        ...escenarioBaseInput,
        escenarioIbcFuturo: { valor: topeAplicado, origen: 'busqueda_objetivo_rpm' },
      })

      if (resultadoEnTope.pensionMensualProyectada < objetivoValorMensual) {
        escenarios.push(
          caminoDescartado('aumentar-ibc-futuro', 'Aumentar tu IBC futuro para acercarte a tu objetivo.', {
            codigo: 'OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE',
            mensaje:
              'Ni aumentando tu IBC futuro hasta el tope máximo legal (25 SMLV) se alcanza el objetivo que ' +
              'declaraste — no hay un IBC futuro dentro de lo legalmente permitido que lo logre.',
            reglaAplicada: 'tope-maximo-ibc',
          })
        )
      } else {
        // topeEfectivo ya está calculado arriba (rango compartido con el barrido de S4-005).
        //
        // Siempre se biseca para encontrar el IBC MÍNIMO suficiente — resultadoEnTope
        // arriba solo sirvió para confirmar que el objetivo es alcanzable dentro del tope
        // legal, nunca es en sí mismo la respuesta a ofrecer (ofrecer directamente "sube
        // hasta el tope" cuando un aumento menor ya bastaría sería un error, no una
        // simplificación). Si la restricción de costo es más estricta que el tope legal
        // (topeEfectivo < topeAplicado), la bisección converge de forma natural al mejor
        // IBC alcanzable dentro de esa restricción — sin necesidad de un código de
        // descarte aparte: distanciaObjetivo.cumple queda en false si no basta, mismo
        // criterio que generarCaminosRAIS.js.
        const resultadoAlternativo = biseccionarEscenarioIbcFuturo({
          construirInput: (valor) => ({
            ...escenarioBaseInput,
            escenarioIbcFuturo: { valor, origen: 'busqueda_objetivo_rpm' },
          }),
          ibcActual: ibcAplicableSimulacion,
          topeAplicado: topeEfectivo,
          objetivoValorMensual,
        })

        const caminoAlternativo = construirCamino({
          id: 'aumentar-ibc-futuro',
          tipo: 'alternativo',
          decision: 'Aumentar tu IBC futuro para alcanzar tu objetivo.',
          proyeccion: resultadoAlternativo,
          edadJubilacionDeseada,
          ibcActual: ibcAplicableSimulacion,
          tasaCotizacion: tasaCotizacionFraccion,
          objetivoValorMensual,
        })

        // Hallazgo de auditoría (2026-08-21): si se llegó hasta aquí, resultadoEnTope ya
        // confirmó que el objetivo SÍ es alcanzable dentro del tope legal — por
        // construcción, la única razón por la que este camino podría no cumplir es que
        // la propia restricción de costo declarada (topeEfectivo < topeAplicado) acotó
        // la búsqueda por debajo de lo necesario. Se distingue explícitamente de un
        // objetivo genuinamente inalcanzable — nunca se muestra como "no alcanza" sin
        // explicar la causa.
        if (topeEfectivo < topeAplicado && !caminoAlternativo.distanciaObjetivo.cumple) {
          caminoAlternativo.limitaciones = [...caminoAlternativo.limitaciones, LIMITACION_RESTRICCION_COSTO_LIMITA_RESULTADO]
        }

        escenarios.push(caminoAlternativo)
      }
    }
  }

  // S4-005: el barrido se construye al final, a partir de escenarios ya resuelto — su
  // rango depende de si el objetivo es alcanzable (ver construirBarridoEsfuerzoResultado),
  // así que no puede calcularse antes de saber qué encontró el camino alternativo.
  const alternativo = escenarios.find((e) => e.id === 'aumentar-ibc-futuro') ?? null
  const barrido = construirBarridoEsfuerzoResultado({
    construirInput: (valor) => ({
      ...escenarioBaseInput,
      escenarioIbcFuturo: { valor, origen: 'barrido_esfuerzo_resultado' },
    }),
    ibcActual: ibcAplicableSimulacion,
    topeAplicado,
    topeEfectivo,
    tasaCotizacion: tasaCotizacionFraccion,
    objetivoValorMensual,
    escenarioBase,
    alternativo,
  })

  // Horizonte temporal (§14 punto 9 del Entregable 2) — un único campo top-level, no uno
  // por camino: fecha/fechaNacimiento/edadJubilacionDeseada son idénticos en cada llamada
  // interna a calcularProyeccionRPM dentro de esta función (camino base, bisección del
  // alternativo, y cada punto del barrido reutilizan escenarioBaseInput, solo varía
  // escenarioIbcFuturo.valor) — el horizonte es, por construcción, el mismo en todos.
  // resultadoBase.horizonteFuturo ya está calculado (S4-002) — se reexpone tal cual, sin
  // recalcular ni derivar nada nuevo.
  const horizonte = resultadoBase.horizonteFuturo

  return { escenarios, orientacion: calcularOrientacion(escenarios), detalleElegibilidad: null, barrido, horizonte }
}
