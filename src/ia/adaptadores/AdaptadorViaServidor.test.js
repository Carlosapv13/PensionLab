import { describe, it, expect, vi } from 'vitest'
import { crearAdaptadorViaServidor } from './AdaptadorViaServidor.js'

function respuestaFalsa({ ok = true, status = 200, cuerpo = null, jsonLanzaError = false } = {}) {
  return {
    ok,
    status,
    json: async () => {
      if (jsonLanzaError) throw new SyntaxError('Unexpected token')
      return cuerpo
    },
  }
}

describe('AdaptadorViaServidor — EVIDENCIA: solo envía {texto}, nunca ningún otro dato del expediente', () => {
  it('el cuerpo de la petición contiene exclusivamente la clave "texto"', async () => {
    const fetchEspiado = vi.fn(async () => respuestaFalsa({ cuerpo: { estado: 'interpretado' } }))
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: fetchEspiado })

    await adaptador({ texto: 'quiero un objetivo de 3.500.000' })

    expect(fetchEspiado).toHaveBeenCalledTimes(1)
    const [url, opciones] = fetchEspiado.mock.calls[0]
    expect(url).toBe('/api/interpretar-declaracion')
    expect(opciones.method).toBe('POST')
    const cuerpoEnviado = JSON.parse(opciones.body)
    expect(Object.keys(cuerpoEnviado)).toEqual(['texto'])
    expect(cuerpoEnviado.texto).toBe('quiero un objetivo de 3.500.000')
  })
})

describe('AdaptadorViaServidor — respuesta exitosa', () => {
  it('devuelve el cuerpo JSON tal cual cuando la respuesta es ok', async () => {
    const cuerpo = { estado: 'interpretado', campos: {}, camposAmbiguos: [], razonCodigo: null }
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: async () => respuestaFalsa({ cuerpo }) })

    const resultado = await adaptador({ texto: 'algo' })

    expect(resultado).toEqual(cuerpo)
  })
})

describe('AdaptadorViaServidor — EVIDENCIA: manejo de timeout, red, respuesta inválida y configuración incompleta', () => {
  it('timeout: la petición nunca resuelve hasta que expira el límite → estado error_proveedor / TIMEOUT', async () => {
    const fetchQueNuncaResponde = (url, opciones) =>
      new Promise((_resolve, reject) => {
        opciones.signal.addEventListener('abort', () => {
          const error = new Error('The operation was aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: fetchQueNuncaResponde, timeoutMs: 5 })

    const resultado = await adaptador({ texto: 'algo' })

    expect(resultado).toEqual({ estado: 'error_proveedor', campos: expect.any(Object), camposAmbiguos: [], razonCodigo: null, errorCodigo: 'TIMEOUT' })
  })

  it('error de red (fetch rechaza con TypeError, como hace fetch ante fallo de conexión) → ERROR_RED', async () => {
    const fetchQueFalla = async () => {
      throw new TypeError('Failed to fetch')
    }
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: fetchQueFalla })

    const resultado = await adaptador({ texto: 'algo' })

    expect(resultado.estado).toBe('error_proveedor')
    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('respuesta HTTP no-ok genérica (ej. 500) → ERROR_RED', async () => {
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: async () => respuestaFalsa({ ok: false, status: 500 }) })

    const resultado = await adaptador({ texto: 'algo' })

    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('HTTP 503 → CONFIGURACION_SERVIDOR_INCOMPLETA (el servidor usa este código para "falta OPENAI_API_KEY/OPENAI_MODEL")', async () => {
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: async () => respuestaFalsa({ ok: false, status: 503 }) })

    const resultado = await adaptador({ texto: 'algo' })

    expect(resultado.errorCodigo).toBe('CONFIGURACION_SERVIDOR_INCOMPLETA')
  })

  it('respuesta ok pero cuerpo no es JSON válido → RESPUESTA_INVALIDA, nunca se lanza una excepción sin capturar', async () => {
    const adaptador = crearAdaptadorViaServidor({ fetchImpl: async () => respuestaFalsa({ jsonLanzaError: true }) })

    const resultado = await adaptador({ texto: 'algo' })

    expect(resultado.errorCodigo).toBe('RESPUESTA_INVALIDA')
  })
})
