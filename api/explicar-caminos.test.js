import { describe, it, expect, vi } from 'vitest'
import { crearHandler } from './explicar-caminos.js'

function resFalso() {
  const res = { statusCode: null, cuerpoEnviado: null }
  res.status = vi.fn((codigo) => {
    res.statusCode = codigo
    return { json: (cuerpo) => { res.cuerpoEnviado = cuerpo } }
  })
  return res
}

const PETICION_VALIDA = {
  escenarios: [{ id: 'base', decision: 'Mantener tu aporte actual.', tipo: 'base', cumpleObjetivo: false }],
  hechos: { porEscenario: { base: { pensionProyectada: '$3.100.000' } }, global: {} },
  contexto: { declaracionLibre: null, caminoMasAlineadoId: 'base' },
}

describe('handler — método HTTP', () => {
  it('método distinto de POST → 405, el adaptador nunca se invoca', async () => {
    const adaptadorEspiado = vi.fn()
    const handler = crearHandler(adaptadorEspiado)
    const res = resFalso()

    await handler({ method: 'GET', body: null }, res)

    expect(res.statusCode).toBe(405)
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })
})

describe('handler — EVIDENCIA: rechazo server-side de payloads con forma inesperada', () => {
  it('cuerpo con una clave adicional (ej. historiaCotizacion) → 400, el adaptador nunca se invoca', async () => {
    const adaptadorEspiado = vi.fn()
    const handler = crearHandler(adaptadorEspiado)
    const res = resFalso()

    await handler({ method: 'POST', body: { ...PETICION_VALIDA, historiaCotizacion: [] } }, res)

    expect(res.statusCode).toBe(400)
    expect(res.cuerpoEnviado.errorCodigo).toBe('PETICION_INVALIDA')
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })

  it('cuerpo vacío → 400, el adaptador nunca se invoca', async () => {
    const adaptadorEspiado = vi.fn()
    const handler = crearHandler(adaptadorEspiado)
    const res = resFalso()

    await handler({ method: 'POST', body: {} }, res)

    expect(res.statusCode).toBe(400)
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })
})

describe('handler — EVIDENCIA: configuración incompleta → 503 explícito, nunca 200 con datos inventados', () => {
  it('el adaptador reporta CONFIGURACION_SERVIDOR_INCOMPLETA → responde 503 con ese cuerpo', async () => {
    const resultadoConfigIncompleta = { estado: 'error_proveedor', explicaciones: [], comparacion: null, errorCodigo: 'CONFIGURACION_SERVIDOR_INCOMPLETA' }
    const handler = crearHandler(async () => resultadoConfigIncompleta)
    const res = resFalso()

    await handler({ method: 'POST', body: PETICION_VALIDA }, res)

    expect(res.statusCode).toBe(503)
    expect(res.cuerpoEnviado).toEqual(resultadoConfigIncompleta)
  })
})

describe('handler — respuesta exitosa', () => {
  it('petición válida, adaptador responde "generado" → 200 con el resultado tal cual, pasando exactamente escenarios/hechos/contexto', async () => {
    const resultado = { estado: 'generado', explicaciones: [{ escenarioId: 'base', queCambia: 'x', preguntaSugerida: null }], comparacion: null, errorCodigo: null }
    const handler = crearHandler(async (entrada) => {
      expect(entrada).toEqual(PETICION_VALIDA)
      return resultado
    })
    const res = resFalso()

    await handler({ method: 'POST', body: PETICION_VALIDA }, res)

    expect(res.statusCode).toBe(200)
    expect(res.cuerpoEnviado).toEqual(resultado)
  })

  it('otros errores de proveedor (ej. TIMEOUT) también responden 200 — el cliente decide qué mostrar', async () => {
    const resultado = { estado: 'error_proveedor', explicaciones: [], comparacion: null, errorCodigo: 'TIMEOUT' }
    const handler = crearHandler(async () => resultado)
    const res = resFalso()

    await handler({ method: 'POST', body: PETICION_VALIDA }, res)

    expect(res.statusCode).toBe(200)
    expect(res.cuerpoEnviado).toEqual(resultado)
  })
})
