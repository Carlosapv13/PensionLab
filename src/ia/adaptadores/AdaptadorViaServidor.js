// Adaptador de producción — CLIENTE. Es el único adaptador que se empaquetará en el bundle
// del navegador: nunca importa el SDK/HTTP de OpenAI ni lee OPENAI_API_KEY (Corrección A,
// 2026-08-21) — solo habla, por fetch, con el endpoint propio same-origin
// /api/interpretar-declaracion. Ese endpoint (api/interpretar-declaracion.js, server-only)
// es el único que conoce OpenAI.
//
// Envía exclusivamente {texto} en el cuerpo de la petición — nunca regimenActual,
// edadActual ni ningún otro dato del expediente (decisión v1, 2026-08-21).
//
// fetchImpl es inyectable a propósito para poder testear timeout/error/respuesta inválida
// sin ninguna llamada de red real, mismo criterio de inyección pura ya usado en todo el
// proyecto (nunca vi.mock de módulos).

import { resultadoError } from './AdaptadorInterpretacionIA.js'

const URL_DEFECTO = '/api/interpretar-declaracion'
const TIMEOUT_MS_DEFECTO = 15000

/**
 * @param {Object} [opciones]
 * @param {typeof fetch} [opciones.fetchImpl] - por defecto, el fetch global del navegador
 * @param {string} [opciones.url]
 * @param {number} [opciones.timeoutMs]
 * @returns {import('./AdaptadorInterpretacionIA.js').AdaptadorInterpretacionIA}
 */
export function crearAdaptadorViaServidor({
  fetchImpl = typeof fetch !== 'undefined' ? fetch : undefined,
  url = URL_DEFECTO,
  timeoutMs = TIMEOUT_MS_DEFECTO,
} = {}) {
  return async function adaptadorViaServidor({ texto }) {
    const controlador = new AbortController()
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs)

    let respuesta
    try {
      respuesta = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Único cuerpo enviado — nunca ningún otro dato del expediente.
        body: JSON.stringify({ texto }),
        signal: controlador.signal,
      })
    } catch (error) {
      return error?.name === 'AbortError' ? resultadoError('TIMEOUT') : resultadoError('ERROR_RED')
    } finally {
      clearTimeout(temporizador)
    }

    if (respuesta.status === 503) {
      return resultadoError('CONFIGURACION_SERVIDOR_INCOMPLETA')
    }

    if (!respuesta.ok) {
      return resultadoError('ERROR_RED')
    }

    try {
      return await respuesta.json()
    } catch {
      return resultadoError('RESPUESTA_INVALIDA')
    }
  }
}
