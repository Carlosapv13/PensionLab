// Puerto de la capa de explicación IA de caminos RPM (S4-007) — el único contrato que
// conoce el resto de la aplicación. Contrato HERMANO de AdaptadorInterpretacionIA.js
// (S4-006), no una extensión — responsabilidad distinta (explicar caminos ya calculados,
// nunca interpretar texto libre hacia campos del expediente), decisión de producto cerrada
// para no instanciar Explanation.js/CalculationTrace (pendiente §14.4 del Entregable 2,
// documentada como resuelta en docs/gestion/cierre-sprint-4.md al cerrar este Slice).
//
// Ningún adaptador concreto se importa jamás por nombre de proveedor fuera de este
// archivo — mismo criterio que el puerto de S4-006.

export const ERRORES_ADAPTADOR = [
  'TIMEOUT',
  'ERROR_RED',
  'RESPUESTA_INVALIDA',
  'RESPUESTA_INCONSISTENTE',
  'RECHAZADO_POR_PROVEEDOR',
  'CONFIGURACION_SERVIDOR_INCOMPLETA',
]

/**
 * Reducido a 2 campos (decisión de producto, 2026-08-24): ver
 * contratos/explicacionCaminos.schema.js#CAMPOS_EXPLICACION_POR_ESCENARIO, fuente de verdad
 * real de qué campos existen — este typedef es documental, no debe divergir de esa lista.
 *
 * @typedef {Object} ExplicacionEscenario
 * @property {string} escenarioId
 * @property {string|null} queCambia
 * @property {string|null} preguntaSugerida
 */

/**
 * @typedef {Object} ResultadoExplicacion
 * @property {'generado'|'error_proveedor'} estado
 * @property {ExplicacionEscenario[]} explicaciones
 * @property {string|null} comparacion
 * @property {string|null} errorCodigo - uno de ERRORES_ADAPTADOR, solo si estado === 'error_proveedor'
 */

/**
 * @returns {ResultadoExplicacion}
 */
export function resultadoVacio() {
  return { estado: 'generado', explicaciones: [], comparacion: null, errorCodigo: null }
}

/**
 * @param {string} errorCodigo - uno de ERRORES_ADAPTADOR
 * @returns {ResultadoExplicacion}
 */
export function resultadoError(errorCodigo) {
  return { estado: 'error_proveedor', explicaciones: [], comparacion: null, errorCodigo }
}

/**
 * Contrato del puerto (documental — cada adaptador concreto implementa esta firma).
 *
 * @callback AdaptadorExplicacionIA
 * @param {{
 *   escenarios: Array<{id: string, decision: string, tipo: string, cumpleObjetivo: boolean|null}>,
 *   hechos: { porEscenario: Record<string, Record<string,string>>, global: Record<string,string> },
 *   contexto: { declaracionLibre: string|null, caminoMasAlineadoId: string|null },
 * }} entrada - cumpleObjetivo NO es un "hecho"/token (nunca se escribe como texto), solo
 *   orienta la dirección del resultado sin que el modelo tenga que inferirla de
 *   distanciaAlObjetivo (siempre en valor absoluto)
 * @returns {Promise<ResultadoExplicacion>}
 */
