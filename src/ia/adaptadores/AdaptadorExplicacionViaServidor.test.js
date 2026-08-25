import { describe, it, expect, vi } from 'vitest'
import { crearAdaptadorExplicacionViaServidor } from './AdaptadorExplicacionViaServidor.js'

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

const ENTRADA_FICTICIA = {
  escenarios: [{ id: 'base', decision: 'Mantener tu aporte actual.', tipo: 'base', cumpleObjetivo: false }],
  hechos: { porEscenario: { base: { pensionProyectada: '$3.100.000' } }, global: {} },
  contexto: { declaracionLibre: null, caminoMasAlineadoId: 'base' },
}

describe('AdaptadorExplicacionViaServidor — EVIDENCIA: solo envía {escenarios, hechos, contexto}, nunca el expediente completo', () => {
  it('el cuerpo de la petición contiene exclusivamente esas tres claves', async () => {
    const fetchEspiado = vi.fn(async () => respuestaFalsa({ cuerpo: { estado: 'generado', explicaciones: [], comparacion: null, errorCodigo: null } }))
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: fetchEspiado })

    await adaptador(ENTRADA_FICTICIA)

    expect(fetchEspiado).toHaveBeenCalledTimes(1)
    const [url, opciones] = fetchEspiado.mock.calls[0]
    expect(url).toBe('/api/explicar-caminos')
    expect(opciones.method).toBe('POST')
    const cuerpoEnviado = JSON.parse(opciones.body)
    expect(Object.keys(cuerpoEnviado).sort()).toEqual(['contexto', 'escenarios', 'hechos'])
  })
})

describe('AdaptadorExplicacionViaServidor — respuesta exitosa', () => {
  it('devuelve el cuerpo JSON tal cual cuando la respuesta es ok', async () => {
    const cuerpo = { estado: 'generado', explicaciones: [], comparacion: null, errorCodigo: null }
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: async () => respuestaFalsa({ cuerpo }) })

    const resultado = await adaptador(ENTRADA_FICTICIA)

    expect(resultado).toEqual(cuerpo)
  })
})

describe('AdaptadorExplicacionViaServidor — EVIDENCIA: manejo de timeout, red, respuesta inválida y configuración incompleta', () => {
  it('timeout → error_proveedor / TIMEOUT', async () => {
    const fetchQueNuncaResponde = (url, opciones) =>
      new Promise((_resolve, reject) => {
        opciones.signal.addEventListener('abort', () => {
          const error = new Error('The operation was aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: fetchQueNuncaResponde, timeoutMs: 5 })

    const resultado = await adaptador(ENTRADA_FICTICIA)

    expect(resultado.errorCodigo).toBe('TIMEOUT')
    expect(resultado.estado).toBe('error_proveedor')
  })

  it('error de red → ERROR_RED', async () => {
    const fetchQueFalla = async () => {
      throw new TypeError('Failed to fetch')
    }
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: fetchQueFalla })

    const resultado = await adaptador(ENTRADA_FICTICIA)

    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('HTTP no-ok genérico (500) → ERROR_RED', async () => {
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: async () => respuestaFalsa({ ok: false, status: 500 }) })
    const resultado = await adaptador(ENTRADA_FICTICIA)
    expect(resultado.errorCodigo).toBe('ERROR_RED')
  })

  it('HTTP 503 → CONFIGURACION_SERVIDOR_INCOMPLETA', async () => {
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: async () => respuestaFalsa({ ok: false, status: 503 }) })
    const resultado = await adaptador(ENTRADA_FICTICIA)
    expect(resultado.errorCodigo).toBe('CONFIGURACION_SERVIDOR_INCOMPLETA')
  })

  it('respuesta ok pero cuerpo no es JSON válido → RESPUESTA_INVALIDA', async () => {
    const adaptador = crearAdaptadorExplicacionViaServidor({ fetchImpl: async () => respuestaFalsa({ jsonLanzaError: true }) })
    const resultado = await adaptador(ENTRADA_FICTICIA)
    expect(resultado.errorCodigo).toBe('RESPUESTA_INVALIDA')
  })
})
