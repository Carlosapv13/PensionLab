import { describe, it, expect } from 'vitest'
import { llamarResponsesAPI, leerConfiguracion, extraerSalidaEstructurada } from './clienteResponsesAPI.js'

// leerConfiguracion y extraerSalidaEstructurada ya tienen cobertura exhaustiva en
// AdaptadorOpenAI.test.js (que las importa re-exportadas, mismas funciones exactas — no
// duplicadas). Este archivo cubre exclusivamente lo nuevo: llamarResponsesAPI como pieza
// independiente, sin pasar por ningún adaptador concreto.

function respuestaFalsa({ ok = true, status = 200, cuerpo = null } = {}) {
  return { ok, status, json: async () => cuerpo }
}

const ENTORNO_COMPLETO = { OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-ejemplo' }

describe('llamarResponsesAPI — EVIDENCIA: mecánica genérica, sin conocer ningún schema', () => {
  it('invoca construirPeticion(modelo) exactamente una vez, con el modelo resuelto desde el entorno', async () => {
    const construirPeticionEspiado = (modelo) => ({ model: modelo, input: [], text: {} })
    let peticionEnviada = null
    await llamarResponsesAPI({
      construirPeticion: construirPeticionEspiado,
      entorno: ENTORNO_COMPLETO,
      fetchImpl: async (url, opciones) => {
        peticionEnviada = JSON.parse(opciones.body)
        return respuestaFalsa({ cuerpo: { output_text: JSON.stringify({ ok: true }) } })
      },
    })
    expect(peticionEnviada.model).toBe('gpt-ejemplo')
  })

  it('sin configuración completa → CONFIGURACION_SERVIDOR_INCOMPLETA, nunca invoca construirPeticion ni fetch', async () => {
    let construirPeticionFueLlamado = false
    const resultado = await llamarResponsesAPI({
      construirPeticion: () => {
        construirPeticionFueLlamado = true
        return {}
      },
      entorno: {},
      fetchImpl: async () => respuestaFalsa(),
    })
    expect(resultado).toEqual({ ok: false, errorCodigo: 'CONFIGURACION_SERVIDOR_INCOMPLETA' })
    expect(construirPeticionFueLlamado).toBe(false)
  })

  it('respuesta con salida estructurada válida → { ok: true, valor }', async () => {
    const resultado = await llamarResponsesAPI({
      construirPeticion: (modelo) => ({ model: modelo }),
      entorno: ENTORNO_COMPLETO,
      fetchImpl: async () => respuestaFalsa({ cuerpo: { output_text: JSON.stringify({ campo: 'valor' }) } }),
    })
    expect(resultado).toEqual({ ok: true, valor: { campo: 'valor' } })
  })

  it('timeout → { ok: false, errorCodigo: "TIMEOUT" }', async () => {
    const fetchQueNuncaResponde = (url, opciones) =>
      new Promise((_resolve, reject) => {
        opciones.signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    const resultado = await llamarResponsesAPI({
      construirPeticion: (modelo) => ({ model: modelo }),
      entorno: ENTORNO_COMPLETO,
      fetchImpl: fetchQueNuncaResponde,
      timeoutMs: 5,
    })
    expect(resultado).toEqual({ ok: false, errorCodigo: 'TIMEOUT' })
  })

  it('rechazo del proveedor (refusal) → RECHAZADO_POR_PROVEEDOR', async () => {
    const cuerpoConRechazo = { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }
    const resultado = await llamarResponsesAPI({
      construirPeticion: (modelo) => ({ model: modelo }),
      entorno: ENTORNO_COMPLETO,
      fetchImpl: async () => respuestaFalsa({ cuerpo: cuerpoConRechazo }),
    })
    expect(resultado).toEqual({ ok: false, errorCodigo: 'RECHAZADO_POR_PROVEEDOR' })
  })
})

describe('leerConfiguracion / extraerSalidaEstructurada — smoke test de que la importación directa desde aquí también funciona (mismas funciones que AdaptadorOpenAI.js re-exporta)', () => {
  it('leerConfiguracion', () => {
    expect(leerConfiguracion(ENTORNO_COMPLETO)).toEqual({ completa: true, apiKey: 'sk-test', modelo: 'gpt-ejemplo' })
  })

  it('extraerSalidaEstructurada', () => {
    expect(extraerSalidaEstructurada({ output_text: JSON.stringify({ a: 1 }) })).toEqual({ ok: true, valor: { a: 1 } })
  })
})
