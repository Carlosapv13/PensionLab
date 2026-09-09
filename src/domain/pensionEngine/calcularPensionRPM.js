// Orquesta seleccionarPeriodosIBL + formulaIBL + reglas legales vigentes (data/legal) para
// producir una "Lectura económica RPM con tu historia hasta hoy" desde una historia de
// cotización estructurada.
//
// Separación de alcance del Slice "Primera lectura económica RPM desde historia
// estructurada" (deliberada, no un olvido):
//
// A. Lo que esta función SÍ determina: historia observada hasta la fecha de cálculo; IBL
//    (ordinario y, cuando aplica, vida laboral) construido desde esa historia; semanas
//    observadas (desde diasCotizados, nunca desde duración calendario); tasa de reemplazo
//    aplicable sobre esos datos; el resultado de formulaRPM.js aplicado a esa fotografía.
// B. Lo que esta función NO determina: IBL futuro a la edad objetivo, semanas futuras,
//    trayectoria futura de IBC, pensión real a la edad de retiro, caminos hacia una meta.
//    Eso pertenece a un Slice posterior — este es su punto de partida, no su reemplazo.
//    "resultadoEconomicoActual" es deliberadamente distinto de "pensionProyectada": esta
//    función nunca calcula una proyección a futuro.
//
// `fecha` por defecto es hoy, nunca la edad de jubilación deseada: proyectar a una
// jubilación futura exigiría IPC futuro (prohibido — ver trazabilidad-formula-IBL.md).
// Calcular "como si fuera hoy" evita ese problema por construcción legal, no por
// convención de producto (a diferencia de la "Convención Económica v1" de RAIS).
//
// formulaRPM.js y calcularTasaReemplazoRPM NO se modifican — se reutilizan tal cual.
//
// E3-C1 (2026-09-08): el SMLV ya no se lee directamente vía obtenerSmlv(fecha) — se resuelve
// vía resolverSmlvVigenteRPM(fechaBaseMonetaria) (domain/pensionEngine/), que además
// interpreta su vigencia jurídica (evaluarVigenciaSmlv(), E3-A) antes de que este archivo lo
// use para nada. El parámetro `fecha` de ESTA función es exactamente esa fechaBaseMonetaria
// (nunca una fecha de reconocimiento futura — este archivo no proyecta, todo se calcula "como
// si fuera hoy"), así que se pasa tal cual. Un SMLV que existe pero no es apto para calcular
// en esa fecha (ej. la ventana 2026-02-12 a 2026-02-18, fundamento normativo no verificado) ya
// NO produce silenciosamente una tasa/pensión como si el valor fuera confiable — antes de este
// cambio, sí lo hacía. Para una fecha apta, el valor de SMLV y toda la aritmética posterior
// son idénticos a como eran antes de este cambio (mismo número, mismo camino de cálculo).

import { seleccionarPeriodosIBL } from '../seleccionarPeriodosIBL.js'
import { calcularPromedioIBL, dividirPeriodoPorAnio } from '../formulas/formulaIBL.js'
import { calcularTasaReemplazoRPM, formulaRPM } from '../formulas/formulaRPM.js'
import {
  obtenerIPC,
  obtenerParametrosTasaReemplazoRPM,
  obtenerSemanasHabilitanAlternativaIBL,
  tieneIPC,
} from '../../data/legal/index.js'
import { resolverSmlvVigenteRPM } from './resolverSmlvVigenteRPM.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const LIMITACION_NO_ES_PROYECCION_FUTURA = {
  codigo: 'NO_ES_PROYECCION_A_EDAD_OBJETIVO',
  mensaje:
    'Este resultado usa exclusivamente tu historia de cotización observada hasta hoy — no ' +
    'incluye los años que te faltan por cotizar ni proyecta tu IBL o tus semanas a tu edad ' +
    'objetivo de retiro. No es la pensión que recibirías al pensionarte: es una lectura de ' +
    'tu situación acumulada hasta este momento.',
}

// `datosIntermedios` (E3-C1, aditivo, default null — ningún llamador existente lo pasa, así
// que ningún caso previo a este cambio cambia de forma): cuando el bloqueo ocurre DESPUÉS de
// haber calculado con éxito el IBL/semanas (el único caso hoy: SMLV no apto), esos valores ya
// calculados se conservan aquí en vez de descartarse — nunca se recalculan ni se inventan
// para los demás razonNoEvaluable, que siguen sin tener nada seguro que conservar en ese
// punto del flujo.
function noEvaluable(razonNoEvaluable, trazabilidadVentana, datosFaltantes, datosIntermedios = null) {
  return {
    estado: 'no_evaluable',
    razonNoEvaluable,
    ibl: datosIntermedios?.ibl ?? null,
    totalDiasCotizados: datosIntermedios?.totalDiasCotizados ?? null,
    semanasObservadas: datosIntermedios?.semanasObservadas ?? null,
    tasaReemplazo: null,
    resultadoEconomicoActual: null,
    limitaciones: [],
    trazabilidadVentana: trazabilidadVentana ?? null,
    datosFaltantes: datosFaltantes ?? null,
    // Aditivo (E3-C1): null salvo cuando razonNoEvaluable proviene específicamente de la
    // vigencia del SMLV — permite a un consumidor futuro distinguir esta causa de todas las
    // demás sin tener que interpretar el string de razonNoEvaluable.
    vigenciaSmlv: datosIntermedios?.vigenciaSmlv ?? null,
  }
}

// Años de IPC que hacen falta para indexar un conjunto de períodos: el año de referencia
// (numerador, constante) más el año anterior a cada año efectivamente tocado por algún
// período (denominador, uno por tramo — ver dividirPeriodoPorAnio en formulaIBL.js).
function aniosRequeridosParaIPC(periodos, anioReferenciaIPC) {
  const anios = new Set([anioReferenciaIPC])
  for (const periodo of periodos) {
    for (const tramo of dividirPeriodoPorAnio(periodo.fechaDesde, periodo.fechaHasta)) {
      anios.add(tramo.anio - 1)
    }
  }
  return anios
}

// Comprobación explícita de cobertura, antes de calcular — no un try/catch alrededor del
// cálculo. La diferencia importa (hallazgo de la revisión del Slice correctivo, 2026-08-19):
// un try/catch amplio convertiría en COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO cualquier
// excepción del cálculo ordinario, no solo la ausencia conocida de IPC — incluido un error
// real de programación, que quedaría oculto como si fuera un problema de datos. Esta función
// solo identifica el caso específico y conocido; cualquier otra excepción del cálculo
// posterior sigue sin capturarse aquí y se propaga como lo hacía antes de este Slice.
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

/**
 * @param {Object} [input]
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} [input.historiaCotizacion]
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   estado: 'calculado' | 'no_evaluable',
 *   razonNoEvaluable: ('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA'|'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA'|'COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO'|'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS'|'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS'|null),
 *   ibl: {
 *     ordinario: { valor: number, detalle: Array<Object> },
 *     vidaLaboral: { valor: number, detalle: Array<Object> } | null,
 *     aplicable: number,
 *     esOpcionLegal: boolean,
 *     razonVidaLaboralNoEvaluada: ('SEMANAS_OBSERVADAS_INSUFICIENTES'|'DATOS_LEGALES_INSUFICIENTES'|null),
 *   } | null,
 *   totalDiasCotizados: number | null,
 *   semanasObservadas: number | null,
 *   tasaReemplazo: number | null,
 *   resultadoEconomicoActual: number | null,
 *   limitaciones: Array<{codigo: string, mensaje: string}>,
 *   trazabilidadVentana: Object | null - ver seleccionarPeriodosIBL.js (TrazabilidadVentana);
 *     null solo cuando razonNoEvaluable es PERIODOS_SUPERPUESTOS_NO_SOPORTADOS o
 *     INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS (fallan antes de intentar seleccionar la ventana).
 *     Presente y completa (3.650 días) cuando razonNoEvaluable es
 *     COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO — la ventana temporal sí se completó.
 *   datosFaltantes: {ipcAnios: number[]} | null - solo poblado cuando razonNoEvaluable es
 *     COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO; los años exactos que faltan en
 *     ipc-historico.json para valorar económicamente la ventana ya seleccionada.
 *   vigenciaSmlv: ReturnType<typeof import('./resolverSmlvVigenteRPM.js').resolverSmlvVigenteRPM> | null -
 *     (E3-C1, aditivo) presente siempre que se llegó a resolver el SMLV — tanto en
 *     'calculado' (incluye advertencia de litigio si existe, sin bloquear) como en
 *     'no_evaluable' cuando razonNoEvaluable es el código de una vigencia no apta. null solo
 *     cuando el flujo nunca llegó a resolver el SMLV (razones anteriores: ventana IBL, IPC).
 * }}
 */
export function calcularPensionRPM({ historiaCotizacion = [], fecha = hoyISO() } = {}) {
  // Cierre de diseño, quinta ronda (revisión Atlas, 2026-09-08): `fecha` se valida ANTES de
  // cualquier operación que dependa de ella — `seleccionarPeriodosIBL` y
  // `new Date(fecha).getUTCFullYear()` (dos líneas más abajo) ya la usan de inmediato. Una
  // `fecha` inválida no debe llegar a ninguna de las dos: antes de esta ronda producía
  // COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO (semánticamente incorrecto — el problema
  // real nunca fue el IPC) vía `anioReferenciaIPC = NaN`. `resolverSmlvVigenteRPM` es el
  // ÚNICO punto de validación de formato de fecha (nunca duplicada aquí) — se llama una sola
  // vez, aquí, y su resultado se reutiliza más abajo (sin una segunda llamada) para decidir
  // la aptitud del SMLV una vez que el resto de los datos ya se resolvió con éxito.
  const smlvVigente = resolverSmlvVigenteRPM(fecha)
  if (smlvVigente.advertencia?.codigo === 'FECHA_BASE_MONETARIA_INVALIDA') {
    return noEvaluable('FECHA_BASE_MONETARIA_INVALIDA', null, null, { vigenciaSmlv: smlvVigente })
  }

  const seleccion = seleccionarPeriodosIBL({ historiaCotizacion, fechaCalculo: fecha })

  if (!seleccion.evaluable) {
    return noEvaluable(seleccion.razonNoEvaluable, seleccion.trazabilidadVentana)
  }

  const anioReferenciaIPC = new Date(fecha).getUTCFullYear() - 1

  // Suficiencia temporal (arriba, seleccion.evaluable) y cobertura económica son dos
  // preguntas distintas (decisión Carlos/Atlas, revisión del Slice correctivo): la ventana
  // ya se construyó correctamente aquí — lo que se comprueba ahora es si PensionLab tiene
  // cargado el IPC real necesario para valorarla, antes de intentar calcular.
  const aniosOrdinario = aniosRequeridosParaIPC(seleccion.periodosOrdinario, anioReferenciaIPC)
  const faltantesOrdinario = aniosIPCFaltantes(aniosOrdinario)
  if (faltantesOrdinario.length > 0) {
    return noEvaluable('COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO', seleccion.trazabilidadVentana, {
      ipcAnios: faltantesOrdinario,
    })
  }

  const tablaIPCOrdinario = construirTablaIPC(aniosOrdinario)
  const iblOrdinario = calcularPromedioIBL({
    periodos: seleccion.periodosOrdinario,
    tablaIPC: tablaIPCOrdinario,
    anioReferenciaIPC,
  })

  const semanasObservadas = seleccion.totalDiasCotizados / 7
  const umbralAlternativa = obtenerSemanasHabilitanAlternativaIBL(fecha)

  // La alternativa de vida laboral (Art. 21, inciso 2) nunca se descarta ni se asume
  // superior de antemano — solo se calcula cuando la condición de habilitación se cumple,
  // y se compara numéricamente contra el ordinario más abajo (decisión ya cerrada: ninguna
  // heurística decide cuál será mayor).
  //
  // Hallazgo de la revisión de S4-001 (Entregable 2): periodosVidaLaboral puede incluir años
  // muy anteriores a los de la ventana ordinaria (toda la vida laboral declarada, sin límite
  // de 10 años) — si alguno de esos años no tiene IPC cargado en ipc-historico.json,
  // construirTablaIPC/calcularPromedioIBL lanzan una excepción. Antes de este cambio, esa
  // excepción no se capturaba: con ≥1250 semanas (~24 años) es el caso esperable, no una
  // rareza — cualquier historia real que alcance el umbral y toque un año fuera de la tabla
  // (2015-2025 hoy) habría roto la pantalla en vez de declarar honestamente la limitación.
  let iblVidaLaboral = null
  let vidaLaboralNoEvaluadaPorDatosLegalesFaltantes = false
  if (semanasObservadas >= umbralAlternativa.valor) {
    try {
      const tablaIPCVidaLaboral = construirTablaIPC(
        aniosRequeridosParaIPC(seleccion.periodosVidaLaboral, anioReferenciaIPC)
      )
      iblVidaLaboral = calcularPromedioIBL({
        periodos: seleccion.periodosVidaLaboral,
        tablaIPC: tablaIPCVidaLaboral,
        anioReferenciaIPC,
      })
    } catch {
      vidaLaboralNoEvaluadaPorDatosLegalesFaltantes = true
    }
  }

  // Razón estructurada expuesta explícitamente — la UI nunca debe inferir el motivo a partir
  // de que ibl.vidaLaboral sea null (decisión Carlos/Atlas, revisión de S4-001).
  const razonVidaLaboralNoEvaluada =
    iblVidaLaboral !== null
      ? null
      : vidaLaboralNoEvaluadaPorDatosLegalesFaltantes
        ? 'DATOS_LEGALES_INSUFICIENTES'
        : 'SEMANAS_OBSERVADAS_INSUFICIENTES'

  const esOpcionLegal = iblVidaLaboral !== null && iblVidaLaboral.promedio > iblOrdinario.promedio
  const iblAplicable = esOpcionLegal ? iblVidaLaboral.promedio : iblOrdinario.promedio

  const iblResultado = {
    ordinario: { valor: iblOrdinario.promedio, detalle: iblOrdinario.detalle },
    vidaLaboral: iblVidaLaboral ? { valor: iblVidaLaboral.promedio, detalle: iblVidaLaboral.detalle } : null,
    aplicable: iblAplicable,
    esOpcionLegal,
    razonVidaLaboralNoEvaluada,
  }

  // `smlvVigente` ya se resolvió arriba, al comienzo de la función (una sola llamada, nunca
  // dos) — aquí solo se comprueba su aptitud, ahora que IBL/semanas/ventana ya están
  // calculados con éxito. Si `fechaBaseMonetaria` hubiera sido inválida, la función ya
  // habría retornado arriba, antes de intentar ninguno de esos cálculos.
  if (!smlvVigente.aptoParaCalculoEnFechaBase) {
    return noEvaluable(smlvVigente.advertencia.codigo, seleccion.trazabilidadVentana, null, {
      ibl: iblResultado,
      totalDiasCotizados: seleccion.totalDiasCotizados,
      semanasObservadas,
      vigenciaSmlv: smlvVigente,
    })
  }

  const parametrosLegales = { ...obtenerParametrosTasaReemplazoRPM(fecha), smlv: smlvVigente.valor }
  const datosUsuario = { ibl: iblAplicable, semanasCotizadas: semanasObservadas }

  const tasaReemplazo = calcularTasaReemplazoRPM({ datosUsuario, parametrosLegales })
  const resultadoEconomicoActual = formulaRPM({ datosUsuario, parametrosLegales })

  return {
    estado: 'calculado',
    razonNoEvaluable: null,
    ibl: iblResultado,
    totalDiasCotizados: seleccion.totalDiasCotizados,
    semanasObservadas,
    tasaReemplazo,
    resultadoEconomicoActual,
    limitaciones: [LIMITACION_NO_ES_PROYECCION_FUTURA],
    trazabilidadVentana: seleccion.trazabilidadVentana,
    datosFaltantes: null,
    // Aditivo (E3-C1): advertencia de litigio (si existe) viaja aquí, nunca bloquea ni
    // altera resultadoEconomicoActual — "la existencia de una demanda no equivale por sí
    // sola a falta de vigencia" (mismo criterio ya establecido en E3-A).
    vigenciaSmlv: smlvVigente,
  }
}
