// Adaptador de producción — CLIENTE. Hermano de AdaptadorViaServidor.js (S4-006), mismo
// criterio exacto: es el único adaptador de explicación que se empaqueta en el bundle del
// navegador, nunca importa el SDK/HTTP de OpenAI ni lee OPENAI_API_KEY — solo habla, por
// fetch, con el endpoint propio same-origin /api/explicar-caminos. Ese endpoint
// (api/explicar-caminos.js, server-only) es el único que conoce OpenAI.
//
// Envía exclusivamente {escenarios, hechos, contexto} — nunca historiaCotizacion completa
// ni ningún dato del expediente fuera de lo que explicarCaminos.js ya construyó (decisión
// de alcance, ver construirHechosEscenario.js).
//
// fetchImpl inyectable, mismo criterio que AdaptadorViaServidor.js — sin vi.mock de módulos.

import { resultadoError } from './AdaptadorExplicacionIA.js'

const URL_DEFECTO = '/api/explicar-caminos'
const TIMEOUT_MS_DEFECTO = 20000

/**
 * @param {Object} [opciones]
 * @param {typeof fetch} [opciones.fetchImpl]
 * @param {string} [opciones.url]
 * @param {number} [opciones.timeoutMs]
 * @returns {import('./AdaptadorExplicacionIA.js').AdaptadorExplicacionIA}
 */
export function crearAdaptadorExplicacionViaServidor({
  fetchImpl = typeof fetch !== 'undefined' ? fetch : undefined,
  url = URL_DEFECTO,
  timeoutMs = TIMEOUT_MS_DEFECTO,
} = {}) {
  return async function adaptadorExplicacionViaServidor({ escenarios, hechos, contexto }) {
    const controlador = new AbortController()
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs)

    let respuesta
    try {
      respuesta = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escenarios, hechos, contexto }),
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
