// Adaptador de desarrollo/tests — implementa el mismo puerto que AdaptadorViaServidor.js
// (AdaptadorInterpretacionIA.js) sin ninguna llamada de red. Es el único adaptador que
// debe usarse en toda la suite de tests de S4-006 — nunca una llamada real a OpenAI
// durante tests, ni siquiera indirectamente.

/**
 * @param {import('./AdaptadorInterpretacionIA.js').ResultadoInterpretacion |
 *   ((entrada: {texto: string}) => import('./AdaptadorInterpretacionIA.js').ResultadoInterpretacion)} respuesta -
 *   un resultado fijo, o una función que decide el resultado según la entrada (para
 *   simular distintos textos en un mismo test).
 * @returns {import('./AdaptadorInterpretacionIA.js').AdaptadorInterpretacionIA}
 */
export function crearAdaptadorSimulado(respuesta) {
  return async function adaptadorSimulado(entrada) {
    return typeof respuesta === 'function' ? respuesta(entrada) : respuesta
  }
}
