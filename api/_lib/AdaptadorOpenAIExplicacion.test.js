import { describe, it, expect } from 'vitest'
import { construirPeticionExplicacion, adaptadorOpenAIExplicacion } from './AdaptadorOpenAIExplicacion.js'
import { EXPLICACION_CAMINOS_SCHEMA } from '../../src/ia/contratos/explicacionCaminos.schema.js'

function respuestaFalsa({ ok = true, status = 200, cuerpo = null } = {}) {
  return { ok, status, json: async () => cuerpo }
}

const ENTORNO_COMPLETO = { OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-ejemplo' }

const ESCENARIOS = [{ id: 'base', decision: 'Mantener tu aporte actual.', tipo: 'base', cumpleObjetivo: false }]
const HECHOS = { porEscenario: { base: { pensionProyectada: '$3.100.000' } }, global: {} }
const CONTEXTO = { declaracionLibre: null, caminoMasAlineadoId: 'base' }

describe('construirPeticionExplicacion', () => {
  it('incluye el modelo configurado, el schema completo de explicación, y los datos como JSON en un único mensaje user', () => {
    const peticion = construirPeticionExplicacion({ escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO, modelo: 'gpt-ejemplo' })
    expect(peticion.model).toBe('gpt-ejemplo')
    expect(peticion.input).toHaveLength(1)
    expect(peticion.input[0].role).toBe('user')
    expect(peticion.input[0].content).toContain(JSON.stringify({ escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO }))
    expect(peticion.text.format.schema).toBe(EXPLICACION_CAMINOS_SCHEMA.schema)
    expect(peticion.text.format.strict).toBe(true)
  })

  it('las instrucciones mencionan explícitamente la regla de tokens y la prohibición de recomendar', () => {
    const peticion = construirPeticionExplicacion({ escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO, modelo: 'gpt-ejemplo' })
    expect(peticion.input[0].content).toMatch(/nunca escribas un número/i)
    expect(peticion.input[0].content).toMatch(/PROHIBIDO SIEMPRE/i)
  })

  it('EVIDENCIA (precisión de calidad 2026-08-23): las instrucciones exigen relacionar al menos dos hechos, en vez de enunciar una cifra sola', () => {
    const peticion = construirPeticionExplicacion({ escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO, modelo: 'gpt-ejemplo' })
    expect(peticion.input[0].content).toMatch(/REGLA OBLIGATORIA CONTRA LA REPETICIÓN/i)
    expect(peticion.input[0].content).toMatch(/RELACIONAR al menos dos hechos/i)
  })

  it('EVIDENCIA: las instrucciones prohíben explícitamente inventar causalidad, con un ejemplo MAL/BIEN embebido', () => {
    const peticion = construirPeticionExplicacion({ escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO, modelo: 'gpt-ejemplo' })
    expect(peticion.input[0].content).toMatch(/REGLA OBLIGATORIA CONTRA LA CAUSALIDAD INVENTADA/i)
    expect(peticion.input[0].content).toContain('No alcanza tu objetivo porque no aumentas tu aporte.')
    expect(peticion.input[0].content).toContain('Manteniendo las condiciones de este')
    expect(peticion.input[0].content).toMatch(/PROHIBIDO SIEMPRE.*atribuir causalidad/is)
  })

  it('las instrucciones mencionan horizonteResumen para la sostenibilidad del esfuerzo en el tiempo', () => {
    const peticion = construirPeticionExplicacion({ escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO, modelo: 'gpt-ejemplo' })
    expect(peticion.input[0].content).toContain('{{global:horizonteResumen}}')
  })
})

describe('adaptadorOpenAIExplicacion — EVIDENCIA: manejo de errores de transporte', () => {
  it('sin configuración completa → CONFIGURACION_SERVIDOR_INCOMPLETA, nunca llama a fetch', async () => {
    let fetchFueLlamado = false
    const resultado = await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      { entorno: {}, fetchImpl: async () => { fetchFueLlamado = true; return respuestaFalsa() } }
    )
    expect(resultado).toEqual({ estado: 'error_proveedor', explicaciones: [], comparacion: null, errorCodigo: 'CONFIGURACION_SERVIDOR_INCOMPLETA' })
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
    const resultado = await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      { entorno: ENTORNO_COMPLETO, fetchImpl: fetchQueNuncaResponde, timeoutMs: 5 }
    )
    expect(resultado.errorCodigo).toBe('TIMEOUT')
  })

  it('rechazo del proveedor → RECHAZADO_POR_PROVEEDOR', async () => {
    const cuerpoConRechazo = { output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }
    const resultado = await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      { entorno: ENTORNO_COMPLETO, fetchImpl: async () => respuestaFalsa({ cuerpo: cuerpoConRechazo }) }
    )
    expect(resultado.errorCodigo).toBe('RECHAZADO_POR_PROVEEDOR')
  })
})

describe('adaptadorOpenAIExplicacion — EVIDENCIA: la validación de consistencia sí se aplica server-side (no solo confía en el cliente)', () => {
  it('salida schema-válida pero con un token inventado (clave inexistente en los hechos enviados) → RESPUESTA_INCONSISTENTE', async () => {
    const salidaMaliciosa = {
      explicaciones: [{ escenarioId: 'base', queCambia: 'Sube a {{base:claveInventada}}.', preguntaSugerida: null }],
      comparacion: null,
    }
    const resultado = await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      { entorno: ENTORNO_COMPLETO, fetchImpl: async () => respuestaFalsa({ cuerpo: { output_text: JSON.stringify(salidaMaliciosa) } }) }
    )
    expect(resultado.errorCodigo).toBe('RESPUESTA_INCONSISTENTE')
  })

  it('salida schema-válida con un dígito literal fuera de cualquier token → RESPUESTA_INCONSISTENTE', async () => {
    const salidaMaliciosa = {
      explicaciones: [{ escenarioId: 'base', queCambia: 'Tu pensión sería $3.600.000.', preguntaSugerida: null }],
      comparacion: null,
    }
    const resultado = await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      { entorno: ENTORNO_COMPLETO, fetchImpl: async () => respuestaFalsa({ cuerpo: { output_text: JSON.stringify(salidaMaliciosa) } }) }
    )
    expect(resultado.errorCodigo).toBe('RESPUESTA_INCONSISTENTE')
  })

  it('salida válida y consistente → estado "generado" con las explicaciones', async () => {
    const salidaValida = {
      explicaciones: [{ escenarioId: 'base', queCambia: 'Mantienes tu aporte de {{base:pensionProyectada}}.', preguntaSugerida: null }],
      comparacion: null,
    }
    const resultado = await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      { entorno: ENTORNO_COMPLETO, fetchImpl: async () => respuestaFalsa({ cuerpo: { output_text: JSON.stringify(salidaValida) } }) }
    )
    expect(resultado.estado).toBe('generado')
    expect(resultado.explicaciones).toEqual(salidaValida.explicaciones)
  })
})

describe('adaptadorOpenAIExplicacion — EVIDENCIA: envía la clave como Authorization Bearer, nunca en el cuerpo', () => {
  it('la petición HTTP lleva la clave únicamente en el header Authorization', async () => {
    let opcionesCapturadas = null
    await adaptadorOpenAIExplicacion(
      { escenarios: ESCENARIOS, hechos: HECHOS, contexto: CONTEXTO },
      {
        entorno: { OPENAI_API_KEY: 'sk-secreta', OPENAI_MODEL: 'gpt-ejemplo' },
        fetchImpl: async (url, opciones) => {
          opcionesCapturadas = { url, opciones }
          return respuestaFalsa({
            cuerpo: {
              output_text: JSON.stringify({
                explicaciones: [{ escenarioId: 'base', queCambia: null, preguntaSugerida: null }],
                comparacion: null,
              }),
            },
          })
        },
      }
    )
    expect(opcionesCapturadas.opciones.body).not.toContain('sk-secreta')
    expect(opcionesCapturadas.opciones.headers.Authorization).toBe('Bearer sk-secreta')
  })
})
