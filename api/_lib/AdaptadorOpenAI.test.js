import { describe, it, expect } from 'vitest'
import { leerConfiguracion, construirPeticionOpenAI, extraerSalidaEstructurada, adaptadorOpenAI } from './AdaptadorOpenAI.js'
import { INTERPRETACION_DECLARACION_SCHEMA } from '../../src/ia/contratos/interpretacionDeclaracion.schema.js'

const CAMPOS_VACIOS = {
  objetivoPensionMensual: null,
  restriccionCostoPensionalAdicionalMaximoMensual: null,
  edadJubilacionDeseada: null,
}

function respuestaFalsa({ ok = true, status = 200, cuerpo = null } = {}) {
  return { ok, status, json: async () => cuerpo }
}

describe('leerConfiguracion — EVIDENCIA: sin modelo por defecto silencioso', () => {
  it('con ambas variables presentes → completa', () => {
    expect(leerConfiguracion({ OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'un-modelo' })).toEqual({
      completa: true,
      apiKey: 'sk-test',
      modelo: 'un-modelo',
    })
  })

  it('sin OPENAI_API_KEY → incompleta, nunca asume una clave vacía', () => {
    expect(leerConfiguracion({ OPENAI_MODEL: 'un-modelo' })).toEqual({ completa: false })
  })

  it('sin OPENAI_MODEL → incompleta, nunca cae a un modelo por defecto', () => {
    expect(leerConfiguracion({ OPENAI_API_KEY: 'sk-test' })).toEqual({ completa: false })
  })

  it('entorno completamente vacío → incompleta', () => {
    expect(leerConfiguracion({})).toEqual({ completa: false })
  })
})

describe('construirPeticionOpenAI', () => {
  it('incluye el modelo configurado y el schema completo de interpretación (mismo objeto exportado, no una copia divergente)', () => {
    const peticion = construirPeticionOpenAI({ texto: 'mi texto', modelo: 'gpt-ejemplo' })
    expect(peticion.model).toBe('gpt-ejemplo')
    expect(peticion.input).toEqual([{ role: 'user', content: 'mi texto' }])
    expect(peticion.text.format.schema).toBe(INTERPRETACION_DECLARACION_SCHEMA.schema)
    expect(peticion.text.format.strict).toBe(true)
  })
})

describe('extraerSalidaEstructurada — EVIDENCIA: verificado contra el ejemplo completo de la documentación oficial', () => {
  it('extrae desde output[].content[].text — forma exacta documentada (output[].type==="message", content[].type==="output_text")', () => {
    // Ejemplo tomado de https://developers.openai.com/api/docs/api-reference/responses/object
    // (verificado 2026-08-21), con el texto interno reemplazado por nuestro propio JSON.
    const cuerpo = {
      id: 'resp_1234567890',
      object: 'response',
      status: 'completed',
      error: null,
      incomplete_details: null,
      model: 'gpt-ejemplo',
      output: [
        {
          id: 'msg_1234567890',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify({ estado: 'ambiguo' }) }],
        },
      ],
      usage: { input_tokens: 81, output_tokens: 11, total_tokens: 92 },
    }
    expect(extraerSalidaEstructurada(cuerpo)).toEqual({ ok: true, valor: { estado: 'ambiguo' } })
  })

  it('extrae desde output_text cuando está presente (accesor de conveniencia de los SDKs — se prueba primero, inofensivo si no aplica a fetch crudo)', () => {
    const cuerpo = { output_text: JSON.stringify({ estado: 'interpretado' }) }
    expect(extraerSalidaEstructurada(cuerpo)).toEqual({ ok: true, valor: { estado: 'interpretado' } })
  })

  it('EVIDENCIA: un rechazo del modelo (refusal) se detecta en output[].content[], NUNCA en un campo top-level (corrección aplicada tras verificar contra documentación oficial)', () => {
    const cuerpoConRechazo = {
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [{ type: 'refusal', refusal: 'No puedo ayudar con esta solicitud.' }],
        },
      ],
    }
    expect(extraerSalidaEstructurada(cuerpoConRechazo)).toEqual({ ok: false, rechazado: true })
  })

  it('un refusal top-level (forma antigua, incorrecta) ya NO se detecta como rechazo — confirma que la ubicación vieja quedó retirada, no solo agregada la nueva', () => {
    const cuerpoConCampoTopLevelIncorrecto = { refusal: 'esto ya no debe interpretarse como rechazo' }
    expect(extraerSalidaEstructurada(cuerpoConCampoTopLevelIncorrecto)).toEqual({ ok: false })
  })

  it('respuesta completamente inesperada → { ok: false }, sin lanzar excepción', () => {
    expect(extraerSalidaEstructurada({ algo: 'no reconocido' })).toEqual({ ok: false })
    expect(extraerSalidaEstructurada(null)).toEqual({ ok: false })
    expect(extraerSalidaEstructurada(undefined)).toEqual({ ok: false })
  })

  it('output_text con JSON malformado → { ok: false }, no lanza', () => {
    expect(extraerSalidaEstructurada({ output_text: '{no es json valido' })).toEqual({ ok: false })
  })
})

describe('adaptadorOpenAI — EVIDENCIA: manejo de timeout, red, respuesta inválida y configuración incompleta', () => {
  const entornoCompleto = { OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-ejemplo' }

  it('sin configuración completa → CONFIGURACION_SERVIDOR_INCOMPLETA, nunca intenta llamar a fetch', async () => {
    let fetchFueLlamado = false
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: {}, fetchImpl: async () => { fetchFueLlamado = true; return respuestaFalsa() } }
    )
    expect(resultado.estado).toBe('error_proveedor')
    expect(resultado.errorCodigo).toBe('CONFIGURACION_SERVIDOR_INCOMPLETA')
    expect(fetchFueLlamado).toBe(false)
  })

  it('timeout → TIMEOUT', async () => {
    const fetchQueNuncaResponde = (url, opciones) =>
      new Promise((_resolve, reject) => {
        opciones.signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: fetchQueNuncaResponde, timeoutMs: 5 }
    )
    expect(resultado.errorCodigo).toBe('TIMEOUT')
  })

  it('error de red → ERROR_RED', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => { throw new TypeError('fetch failed') } }
    )
    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('HTTP 401 (clave inválida, documentado por OpenAI) → CONFIGURACION_SERVIDOR_INCOMPLETA, no ERROR_RED', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ ok: false, status: 401 }) }
    )
    expect(resultado.errorCodigo).toBe('CONFIGURACION_SERVIDOR_INCOMPLETA')
  })

  it('HTTP 404 (modelo inexistente, ej. OPENAI_MODEL mal configurado) → CONFIGURACION_SERVIDOR_INCOMPLETA', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ ok: false, status: 404 }) }
    )
    expect(resultado.errorCodigo).toBe('CONFIGURACION_SERVIDOR_INCOMPLETA')
  })

  it('HTTP 400 (petición malformada) → ERROR_RED (sin código propio: no hay evidencia documental de un caso HTTP específico para "rechazo de contenido")', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ ok: false, status: 400 }) }
    )
    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('HTTP 429 (límite de tasa, documentado) → ERROR_RED', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ ok: false, status: 429 }) }
    )
    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('HTTP 500 → ERROR_RED', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ ok: false, status: 500 }) }
    )
    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('respuesta ok pero sin salida estructurada reconocible → RESPUESTA_INVALIDA', async () => {
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ cuerpo: { algo: 'inesperado' } }) }
    )
    expect(resultado.errorCodigo).toBe('RESPUESTA_INVALIDA')
  })

  it('cuerpo con refusal en la ubicación real documentada (output[].content[]) → RECHAZADO_POR_PROVEEDOR', async () => {
    const cuerpoConRechazo = {
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'contenido no permitido' }] }],
    }
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ cuerpo: cuerpoConRechazo }) }
    )
    expect(resultado.errorCodigo).toBe('RECHAZADO_POR_PROVEEDOR')
  })

  it('salida estructurada schema-válida pero semánticamente inconsistente → RESPUESTA_INCONSISTENTE (defensa server-side también aquí)', async () => {
    const salidaInconsistente = { estado: 'interpretado', campos: CAMPOS_VACIOS, camposAmbiguos: [], razonCodigo: null }
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ cuerpo: { output_text: JSON.stringify(salidaInconsistente) } }) }
    )
    expect(resultado.errorCodigo).toBe('RESPUESTA_INCONSISTENTE')
  })

  it('salida estructurada válida y consistente → se devuelve tal cual', async () => {
    const salidaValida = {
      estado: 'interpretado',
      campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } },
      camposAmbiguos: [],
      razonCodigo: null,
    }
    const resultado = await adaptadorOpenAI(
      { texto: 'algo' },
      { entorno: entornoCompleto, fetchImpl: async () => respuestaFalsa({ cuerpo: { output_text: JSON.stringify(salidaValida) } }) }
    )
    expect(resultado).toEqual(salidaValida)
  })
})

describe('adaptadorOpenAI — EVIDENCIA: envía la clave como Authorization Bearer, nunca en el cuerpo ni en la URL', () => {
  it('la petición HTTP lleva la clave únicamente en el header Authorization', async () => {
    let opcionesCapturadas = null
    await adaptadorOpenAI(
      { texto: 'algo' },
      {
        entorno: { OPENAI_API_KEY: 'sk-secreta', OPENAI_MODEL: 'gpt-ejemplo' },
        fetchImpl: async (url, opciones) => {
          opcionesCapturadas = { url, opciones }
          return respuestaFalsa({ cuerpo: { output_text: JSON.stringify({ estado: 'no_pertinente', campos: CAMPOS_VACIOS, camposAmbiguos: [], razonCodigo: 'SIN_MATERIA_PENSIONAL' }) } })
        },
      }
    )
    expect(opcionesCapturadas.url).not.toContain('sk-secreta')
    expect(opcionesCapturadas.opciones.body).not.toContain('sk-secreta')
    expect(opcionesCapturadas.opciones.headers.Authorization).toBe('Bearer sk-secreta')
  })
})
