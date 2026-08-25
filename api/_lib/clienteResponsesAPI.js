// SERVER-ONLY. Mecánica de transporte genérica hacia la Responses API de OpenAI — extraída
// de AdaptadorOpenAI.js (S4-006) al llegar S4-007, su segundo consumidor real (decisión de
// producto explícita: solo extraer con ≥2 consumidores reales, nunca por anticipación —
// Principio 9). Antes de extraer se verificó que este fragmento no conoce ningún schema ni
// semántica de interpretación ni de explicación: solo sabe leer OPENAI_API_KEY/OPENAI_MODEL,
// hacer la petición HTTP con timeout, mapear códigos de error HTTP documentados, y localizar
// la salida estructurada dentro de la forma de respuesta de OpenAI — exactamente lo mismo
// que hacía antes, sin ningún cambio de comportamiento (mismo test suite de
// AdaptadorOpenAI.test.js sigue en verde tras la extracción, sin modificar sus casos).
//
// Qué SÍ sabe: transporte HTTP, autenticación, timeout, mapeo de errores, extracción de
// output_text/output[].content[].
// Qué NO sabe: qué schema se está pidiendo, ni qué forma semántica tiene la respuesta
// esperada — eso lo decide cada adaptador concreto (AdaptadorOpenAI.js,
// AdaptadorOpenAIExplicacion.js) mediante `construirPeticion`, inyectado por el llamador.
//
// Sin SDK: fetch nativo — mismo criterio ya documentado en el archivo original.

const URL_RESPONSES_API = 'https://api.openai.com/v1/responses'
const TIMEOUT_MS_DEFECTO = 20000

/**
 * @param {NodeJS.ProcessEnv} entorno
 * @returns {{completa: true, apiKey: string, modelo: string} | {completa: false}}
 */
export function leerConfiguracion(entorno) {
  const apiKey = entorno.OPENAI_API_KEY
  const modelo = entorno.OPENAI_MODEL
  if (!apiKey || !modelo) return { completa: false }
  return { completa: true, apiKey, modelo }
}

// Defensivo (Principio 11): nunca asume una forma exacta de la respuesta sin verificarla —
// cualquier forma inesperada produce { ok: false }, nunca una excepción sin capturar. Mismo
// orden de comprobación ya verificado contra la documentación oficial de OpenAI (ver
// historial de AdaptadorOpenAI.js antes de esta extracción).
export function extraerSalidaEstructurada(respuestaOpenAI) {
  const bloqueMensaje = respuestaOpenAI?.output?.find((o) => o?.type === 'message')

  const itemRechazo = bloqueMensaje?.content?.find((c) => c?.type === 'refusal')
  if (itemRechazo) {
    return { ok: false, rechazado: true }
  }

  try {
    const textoDirecto = respuestaOpenAI?.output_text
    if (typeof textoDirecto === 'string' && textoDirecto.length > 0) {
      return { ok: true, valor: JSON.parse(textoDirecto) }
    }
  } catch {
    // sigue al siguiente intento
  }

  try {
    const contenidoTexto = bloqueMensaje?.content?.find((c) => c?.type === 'output_text')
    if (contenidoTexto?.text) {
      return { ok: true, valor: JSON.parse(contenidoTexto.text) }
    }
  } catch {
    // cae al error final
  }

  return { ok: false }
}

/**
 * Ejecuta una llamada completa a la Responses API: configuración → petición HTTP con
 * timeout → mapeo de errores documentados → extracción de la salida estructurada. No
 * conoce el schema — `construirPeticion(modelo)` lo aporta el llamador.
 *
 * @param {Object} input
 * @param {(modelo: string) => Object} input.construirPeticion - arma el cuerpo completo de
 *   la petición (model/input/text.format) una vez resuelto el modelo configurado
 * @param {typeof fetch} [input.fetchImpl]
 * @param {NodeJS.ProcessEnv} [input.entorno]
 * @param {number} [input.timeoutMs]
 * @returns {Promise<{ok: true, valor: Object} | {ok: false, errorCodigo: string}>}
 */
export async function llamarResponsesAPI({
  construirPeticion,
  fetchImpl = fetch,
  entorno = process.env,
  timeoutMs = TIMEOUT_MS_DEFECTO,
}) {
  const configuracion = leerConfiguracion(entorno)
  if (!configuracion.completa) {
    return { ok: false, errorCodigo: 'CONFIGURACION_SERVIDOR_INCOMPLETA' }
  }

  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs)

  let respuestaHttp
  try {
    respuestaHttp = await fetchImpl(URL_RESPONSES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${configuracion.apiKey}`,
      },
      body: JSON.stringify(construirPeticion(configuracion.modelo)),
      signal: controlador.signal,
    })
  } catch (error) {
    return { ok: false, errorCodigo: error?.name === 'AbortError' ? 'TIMEOUT' : 'ERROR_RED' }
  } finally {
    clearTimeout(temporizador)
  }

  // 401 (clave inválida) / 404 (modelo inexistente): ver razonamiento completo en el
  // historial de AdaptadorOpenAI.js — ambos indican en la práctica un problema de
  // configuración del servidor, no una falla de red ni un rechazo de contenido.
  if (respuestaHttp.status === 401 || respuestaHttp.status === 404) {
    return { ok: false, errorCodigo: 'CONFIGURACION_SERVIDOR_INCOMPLETA' }
  }
  if (!respuestaHttp.ok) {
    return { ok: false, errorCodigo: 'ERROR_RED' }
  }

  let cuerpo
  try {
    cuerpo = await respuestaHttp.json()
  } catch {
    return { ok: false, errorCodigo: 'RESPUESTA_INVALIDA' }
  }

  const extraido = extraerSalidaEstructurada(cuerpo)
  if (extraido.rechazado) {
    return { ok: false, errorCodigo: 'RECHAZADO_POR_PROVEEDOR' }
  }
  if (!extraido.ok) {
    return { ok: false, errorCodigo: 'RESPUESTA_INVALIDA' }
  }

  return { ok: true, valor: extraido.valor }
}
