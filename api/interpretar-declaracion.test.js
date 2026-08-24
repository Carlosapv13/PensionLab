import { describe, it, expect, vi } from 'vitest'
import { crearHandler } from './interpretar-declaracion.js'

function resFalso() {
  const res = { statusCode: null, cuerpoEnviado: null }
  res.status = vi.fn((codigo) => {
    res.statusCode = codigo
    return { json: (cuerpo) => { res.cuerpoEnviado = cuerpo } }
  })
  return res
}

const CAMPOS_VACIOS = {
  objetivoPensionMensual: null,
  restriccionCostoPensionalAdicionalMaximoMensual: null,
  edadJubilacionDeseada: null,
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

describe('handler — EVIDENCIA: rechazo server-side de payloads con claves distintas de {texto}', () => {
  it('cuerpo con una clave adicional → 400, el adaptador nunca se invoca', async () => {
    const adaptadorEspiado = vi.fn()
    const handler = crearHandler(adaptadorEspiado)
    const res = resFalso()

    await handler({ method: 'POST', body: { texto: 'algo', regimenActual: 'RPM' } }, res)

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
    const resultadoConfigIncompleta = { estado: 'error_proveedor', campos: CAMPOS_VACIOS, camposAmbiguos: [], razonCodigo: null, errorCodigo: 'CONFIGURACION_SERVIDOR_INCOMPLETA' }
    const handler = crearHandler(async () => resultadoConfigIncompleta)
    const res = resFalso()

    await handler({ method: 'POST', body: { texto: 'algo' } }, res)

    expect(res.statusCode).toBe(503)
    expect(res.cuerpoEnviado).toEqual(resultadoConfigIncompleta)
  })
})

describe('handler — respuesta exitosa', () => {
  it('petición válida, adaptador responde interpretado → 200 con el resultado tal cual', async () => {
    const resultado = { estado: 'interpretado', campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } }, camposAmbiguos: [], razonCodigo: null }
    const handler = crearHandler(async ({ texto }) => {
      expect(texto).toBe('quiero un objetivo de 3.500.000')
      return resultado
    })
    const res = resFalso()

    await handler({ method: 'POST', body: { texto: 'quiero un objetivo de 3.500.000' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.cuerpoEnviado).toEqual(resultado)
  })

  it('otros errores de proveedor (ej. TIMEOUT) también responden 200 con el estado error_proveedor — el cliente decide qué mostrar', async () => {
    const resultado = { estado: 'error_proveedor', campos: CAMPOS_VACIOS, camposAmbiguos: [], razonCodigo: null, errorCodigo: 'TIMEOUT' }
    const handler = crearHandler(async () => resultado)
    const res = resFalso()

    await handler({ method: 'POST', body: { texto: 'algo' } }, res)

    expect(res.statusCode).toBe(200)
    expect(res.cuerpoEnviado).toEqual(resultado)
  })
})
