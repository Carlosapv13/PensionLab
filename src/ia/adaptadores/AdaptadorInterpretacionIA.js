// Puerto de la capa de interpretación IA (S4-006) — el único contrato que conoce el
// resto de la aplicación. Ninguna pantalla ni el orquestador (interpretarDeclaracion.js)
// importa jamás un adaptador concreto por su nombre de proveedor: reciben uno ya elegido
// por inyección (producción: AdaptadorViaServidor.js; dev/tests: AdaptadorSimulado.js).
// Cambiar de proveedor de IA en el futuro significa escribir un nuevo Adaptador*.js que
// cumpla esta misma firma — cero cambios en UI ni en el orquestador.
//
// Todo adaptador SIEMPRE devuelve un ResultadoInterpretacion ya bien formado, incluidos
// los casos de fallo de transporte (estado: 'error_proveedor') — la validación semántica
// adicional (validarConsistenciaInterpretacion.js) se aplica únicamente a los cuatro
// estados que el modelo puede producir, nunca a error_proveedor (ya es, por definición,
// una respuesta que no llegó a evaluarse).

// Códigos de error propios del adaptador/transporte — nunca los produce el modelo (no
// forman parte de interpretacionDeclaracion.schema.js), siempre los decide el adaptador o
// el orquestador.
export const ERRORES_ADAPTADOR = [
  'TIMEOUT',
  'ERROR_RED',
  'RESPUESTA_INVALIDA',
  'RESPUESTA_INCONSISTENTE',
  'RECHAZADO_POR_PROVEEDOR',
  'CONFIGURACION_SERVIDOR_INCOMPLETA',
]

/**
 * @typedef {Object} CamposInterpretados
 * @property {{valorCOP: number}|null} objetivoPensionMensual
 * @property {{valorCOP: number}|null} restriccionCostoPensionalAdicionalMaximoMensual
 * @property {{valorAnios: number}|null} edadJubilacionDeseada
 */

/**
 * @typedef {Object} ResultadoInterpretacion
 * @property {'interpretado'|'insuficiente'|'ambiguo'|'no_pertinente'|'error_proveedor'} estado
 * @property {CamposInterpretados} campos - los tres campos en null salvo en 'interpretado'
 * @property {string[]} camposAmbiguos - solo no vacío cuando estado === 'ambiguo'
 * @property {string|null} razonCodigo - código cerrado, nunca prosa libre del modelo
 * @property {string|null} errorCodigo - uno de ERRORES_ADAPTADOR, solo si estado === 'error_proveedor'
 */

export function camposVacios() {
  return {
    objetivoPensionMensual: null,
    restriccionCostoPensionalAdicionalMaximoMensual: null,
    edadJubilacionDeseada: null,
  }
}

/**
 * @param {string} errorCodigo - uno de ERRORES_ADAPTADOR
 * @returns {ResultadoInterpretacion}
 */
export function resultadoError(errorCodigo) {
  return { estado: 'error_proveedor', campos: camposVacios(), camposAmbiguos: [], razonCodigo: null, errorCodigo }
}

/**
 * Contrato del puerto (documental — cada Adaptador*.js implementa esta firma).
 *
 * @callback AdaptadorInterpretacionIA
 * @param {{texto: string}} entrada
 * @returns {Promise<ResultadoInterpretacion>}
 */
