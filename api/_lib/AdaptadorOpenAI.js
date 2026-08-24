// SERVER-ONLY. Único archivo de todo el proyecto que lee OPENAI_API_KEY/OPENAI_MODEL y que
// habla directamente con la Responses API de OpenAI. Vive bajo api/ (nunca bajo src/) para
// que sea estructuralmente imposible que Vite lo incluya en el bundle del navegador —
// verificado tras el build (ver auditoría de dist/ en el cierre de este Slice).
//
// Sin SDK: usa fetch nativo (disponible en el runtime de funciones serverless de Node
// modernas) en vez de instalar el paquete `openai` — evita una dependencia nueva sin
// evidencia de que haga falta (Principio 9) y hace el adaptador trivialmente testeable por
// inyección de fetchImpl, mismo criterio que AdaptadorViaServidor.js (cliente).
//
// VERIFICADO CONTRA DOCUMENTACIÓN OFICIAL (2026-08-21, sin ninguna llamada real):
// https://developers.openai.com/api/docs/guides/structured-outputs y
// https://developers.openai.com/api/docs/api-reference/responses/object — endpoint,
// método, headers, forma de `text.format` (type/name/schema/strict como hermanos) y la
// ubicación documentada del texto estructurado (`output[].content[].text`, con
// `output[].type === 'message'` y `content[].type === 'output_text'`) coinciden con lo ya
// implementado aquí, sin cambios. Dos correcciones reales encontradas y aplicadas:
// (1) un rechazo del modelo (refusal) reemplaza el objeto output_text DENTRO de
// content[] (`{type: 'refusal', refusal: '...'}'`) — nunca un campo `refusal` en la raíz
// de la respuesta, que es donde lo buscaba la versión anterior de este archivo, un error
// real que habría dejado pasar cualquier rechazo real sin detectarlo. (2) no existe
// ningún `status: 'refused'` documentado — se retiró esa comprobación inventada. Los
// códigos de error HTTP (401 clave inválida, 404 modelo inexistente, 429 límite de tasa,
// 400 petición malformada) están documentados de forma general para la API de OpenAI,
// pero no hay una forma HTTP específica y confirmada para "contenido rechazado" — el
// mapeo 400/403→RECHAZADO_POR_PROVEEDOR de la versión anterior no tenía respaldo
// documental y se reemplazó por un mapeo más conservador (ver abajo).
//
// Sin modelo por defecto silencioso (decisión explícita, 2026-08-21): si falta
// OPENAI_API_KEY u OPENAI_MODEL, se falla explícitamente con CONFIGURACION_SERVIDOR_INCOMPLETA
// — nunca se continúa con una clave vacía ni con un modelo asumido.

import { INTERPRETACION_DECLARACION_SCHEMA } from '../../src/ia/contratos/interpretacionDeclaracion.schema.js'
import { resultadoError } from '../../src/ia/adaptadores/AdaptadorInterpretacionIA.js'
import { esInterpretacionConsistente } from '../../src/ia/validarConsistenciaInterpretacion.js'

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

export function construirPeticionOpenAI({ texto, modelo }) {
  return {
    model: modelo,
    input: [{ role: 'user', content: texto }],
    text: {
      format: {
        type: 'json_schema',
        name: INTERPRETACION_DECLARACION_SCHEMA.name,
        schema: INTERPRETACION_DECLARACION_SCHEMA.schema,
        strict: INTERPRETACION_DECLARACION_SCHEMA.strict,
      },
    },
  }
}

// Defensivo (Principio 11): nunca asume una forma exacta de la respuesta sin verificarla —
// cualquier forma inesperada produce { ok: false }, nunca una excepción sin capturar.
//
// Orden de comprobación, cada paso verificado contra la documentación oficial:
// 1. Rechazo del modelo — un item `{type: 'refusal', refusal: '...'}` DENTRO de
//    output[].content[], nunca un campo top-level (corregido, ver cabecera del archivo).
//    Se comprueba primero: un rechazo real nunca debe confundirse con "no encontramos
//    output_text" y caer genéricamente en RESPUESTA_INVALIDA.
// 2. `output_text` — accesor de conveniencia documentado para los SDKs oficiales; no hay
//    evidencia de que sea un campo garantizado en el JSON crudo de una llamada fetch
//    directa (sin SDK), pero probarlo primero es inofensivo y gratuito si alguna vez
//    aparece.
// 3. output[].content[].text (con output[].type==='message', content[].type==='output_text')
//    — la forma documentada de forma explícita y con ejemplo completo; la vía confirmada.
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
 * @param {{texto: string}} entrada
 * @param {Object} [opciones]
 * @param {typeof fetch} [opciones.fetchImpl]
 * @param {NodeJS.ProcessEnv} [opciones.entorno]
 * @param {number} [opciones.timeoutMs]
 * @returns {Promise<import('../../src/ia/adaptadores/AdaptadorInterpretacionIA.js').ResultadoInterpretacion>}
 */
export async function adaptadorOpenAI(
  { texto },
  { fetchImpl = fetch, entorno = process.env, timeoutMs = TIMEOUT_MS_DEFECTO } = {}
) {
  const configuracion = leerConfiguracion(entorno)
  if (!configuracion.completa) {
    return resultadoError('CONFIGURACION_SERVIDOR_INCOMPLETA')
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
      body: JSON.stringify(construirPeticionOpenAI({ texto, modelo: configuracion.modelo })),
      signal: controlador.signal,
    })
  } catch (error) {
    return error?.name === 'AbortError' ? resultadoError('TIMEOUT') : resultadoError('ERROR_RED')
  } finally {
    clearTimeout(temporizador)
  }

  // 401 (clave inválida) / 404 (modelo inexistente): documentados de forma general por
  // OpenAI como errores de autenticación/recurso, ambos indican en la práctica un problema
  // de configuración del servidor (clave o nombre de modelo incorrectos), no una falla de
  // red ni un rechazo de contenido — se tratan igual que configuración incompleta, para
  // fallar con el mismo código explícito en vez de uno genérico.
  if (respuestaHttp.status === 401 || respuestaHttp.status === 404) {
    return resultadoError('CONFIGURACION_SERVIDOR_INCOMPLETA')
  }
  if (!respuestaHttp.ok) {
    return resultadoError('ERROR_RED')
  }

  let cuerpo
  try {
    cuerpo = await respuestaHttp.json()
  } catch {
    return resultadoError('RESPUESTA_INVALIDA')
  }

  const extraido = extraerSalidaEstructurada(cuerpo)
  if (extraido.rechazado) {
    return resultadoError('RECHAZADO_POR_PROVEEDOR')
  }
  if (!extraido.ok) {
    return resultadoError('RESPUESTA_INVALIDA')
  }

  // Defensa en profundidad también server-side (Principio 11): nunca se reenvía al
  // cliente un payload schema-válido pero semánticamente incoherente, aunque el cliente
  // vuelva a validarlo de todas formas — dos capas independientes, ninguna confía en que
  // la otra ya lo hizo.
  if (!esInterpretacionConsistente(extraido.valor)) {
    return resultadoError('RESPUESTA_INCONSISTENTE')
  }

  return extraido.valor
}
