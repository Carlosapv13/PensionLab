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

import { seleccionarPeriodosIBL } from '../seleccionarPeriodosIBL.js'
import { calcularPromedioIBL, dividirPeriodoPorAnio } from '../formulas/formulaIBL.js'
import { calcularTasaReemplazoRPM, formulaRPM } from '../formulas/formulaRPM.js'
import {
  obtenerIPC,
  obtenerParametrosTasaReemplazoRPM,
  obtenerSemanasHabilitanAlternativaIBL,
  obtenerSmlv,
} from '../../data/legal/index.js'

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

function noEvaluable(razonNoEvaluable) {
  return {
    estado: 'no_evaluable',
    razonNoEvaluable,
    ibl: null,
    totalDiasCotizados: null,
    semanasObservadas: null,
    tasaReemplazo: null,
    resultadoEconomicoActual: null,
    limitaciones: [],
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
 *   razonNoEvaluable: ('VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS'|'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS'|'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS'|'COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA'|null),
 *   ibl: {
 *     ordinario: { valor: number, detalle: Array<Object> },
 *     vidaLaboral: { valor: number, detalle: Array<Object> } | null,
 *     aplicable: number,
 *     esOpcionLegal: boolean,
 *   } | null,
 *   totalDiasCotizados: number | null,
 *   semanasObservadas: number | null,
 *   tasaReemplazo: number | null,
 *   resultadoEconomicoActual: number | null,
 *   limitaciones: Array<{codigo: string, mensaje: string}>,
 * }}
 */
export function calcularPensionRPM({ historiaCotizacion = [], fecha = hoyISO() } = {}) {
  const seleccion = seleccionarPeriodosIBL({ historiaCotizacion, fechaCalculo: fecha })

  if (!seleccion.evaluable) {
    return noEvaluable(seleccion.razonNoEvaluable)
  }

  const anioReferenciaIPC = new Date(fecha).getUTCFullYear() - 1

  const tablaIPCOrdinario = construirTablaIPC(aniosRequeridosParaIPC(seleccion.periodosOrdinario, anioReferenciaIPC))
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
  let iblVidaLaboral = null
  if (semanasObservadas >= umbralAlternativa.valor) {
    const tablaIPCVidaLaboral = construirTablaIPC(
      aniosRequeridosParaIPC(seleccion.periodosVidaLaboral, anioReferenciaIPC)
    )
    iblVidaLaboral = calcularPromedioIBL({
      periodos: seleccion.periodosVidaLaboral,
      tablaIPC: tablaIPCVidaLaboral,
      anioReferenciaIPC,
    })
  }

  const esOpcionLegal = iblVidaLaboral !== null && iblVidaLaboral.promedio > iblOrdinario.promedio
  const iblAplicable = esOpcionLegal ? iblVidaLaboral.promedio : iblOrdinario.promedio

  const smlv = obtenerSmlv(fecha)
  const parametrosLegales = { ...obtenerParametrosTasaReemplazoRPM(fecha), smlv: smlv.valor }
  const datosUsuario = { ibl: iblAplicable, semanasCotizadas: semanasObservadas }

  const tasaReemplazo = calcularTasaReemplazoRPM({ datosUsuario, parametrosLegales })
  const resultadoEconomicoActual = formulaRPM({ datosUsuario, parametrosLegales })

  return {
    estado: 'calculado',
    razonNoEvaluable: null,
    ibl: {
      ordinario: { valor: iblOrdinario.promedio, detalle: iblOrdinario.detalle },
      vidaLaboral: iblVidaLaboral ? { valor: iblVidaLaboral.promedio, detalle: iblVidaLaboral.detalle } : null,
      aplicable: iblAplicable,
      esOpcionLegal,
    },
    totalDiasCotizados: seleccion.totalDiasCotizados,
    semanasObservadas,
    tasaReemplazo,
    resultadoEconomicoActual,
    limitaciones: [LIMITACION_NO_ES_PROYECCION_FUTURA],
  }
}
