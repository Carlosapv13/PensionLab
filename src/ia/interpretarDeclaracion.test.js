import { describe, it, expect, vi } from 'vitest'
import { interpretarDeclaracion, SIN_DECLARACION, TEXTO_DESCARTADO_COMO_RUIDO } from './interpretarDeclaracion.js'
import { crearAdaptadorSimulado } from './adaptadores/AdaptadorSimulado.js'
import { resultadoError } from './adaptadores/AdaptadorInterpretacionIA.js'

const CAMPOS_VACIOS = {
  objetivoPensionMensual: null,
  restriccionCostoPensionalAdicionalMaximoMensual: null,
  edadJubilacionDeseada: null,
}

function resultadoInterpretadoFijo(camposParciales) {
  return { estado: 'interpretado', campos: { ...CAMPOS_VACIOS, ...camposParciales }, camposAmbiguos: [], razonCodigo: null }
}

describe('interpretarDeclaracion — EVIDENCIA: ruido rechazado antes de invocar cualquier adaptador', () => {
  it('"blablabla" (no_apto) → estado insuficiente/TEXTO_DESCARTADO_COMO_RUIDO, el adaptador nunca se invoca', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo({ objetivoPensionMensual: { valorCOP: 1 } })))

    const resultado = await interpretarDeclaracion({
      declaracion: { tipo: 'contenido', texto: 'blablabla' },
      adaptador: adaptadorEspiado,
    })

    expect(resultado.estado).toBe('insuficiente')
    expect(resultado.razonCodigo).toBe(TEXTO_DESCARTADO_COMO_RUIDO)
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })

  it('"jajajaja" (no_apto) → mismo tratamiento, ninguna llamada', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo({})))
    await interpretarDeclaracion({ declaracion: { tipo: 'contenido', texto: 'jajajaja' }, adaptador: adaptadorEspiado })
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })

  it('{tipo: "ausencia"} → SIN_DECLARACION, el adaptador nunca se invoca', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo({})))
    const resultado = await interpretarDeclaracion({ declaracion: { tipo: 'ausencia' }, adaptador: adaptadorEspiado })
    expect(resultado.estado).toBe('insuficiente')
    expect(resultado.razonCodigo).toBe(SIN_DECLARACION)
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })

  it('declaracion null → SIN_DECLARACION, el adaptador nunca se invoca (Principio 11, mismo tratamiento que evaluarDeclaracion.js)', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo({})))
    const resultado = await interpretarDeclaracion({ declaracion: null, adaptador: adaptadorEspiado })
    expect(resultado.razonCodigo).toBe(SIN_DECLARACION)
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })
})

describe('interpretarDeclaracion — EVIDENCIA: interpretación estructurada con AdaptadorSimulado', () => {
  it('texto sustantivo con cifra → invoca el adaptador exactamente una vez, con el texto tal cual', async () => {
    const adaptadorEspiado = vi.fn(
      crearAdaptadorSimulado(resultadoInterpretadoFijo({ objetivoPensionMensual: { valorCOP: 3500000 } }))
    )

    const resultado = await interpretarDeclaracion({
      declaracion: { tipo: 'contenido', texto: 'quiero un objetivo de $3.500.000 al mes' },
      adaptador: adaptadorEspiado,
    })

    expect(adaptadorEspiado).toHaveBeenCalledTimes(1)
    expect(adaptadorEspiado).toHaveBeenCalledWith({ texto: 'quiero un objetivo de $3.500.000 al mes' })
    expect(resultado.estado).toBe('interpretado')
    expect(resultado.campos.objetivoPensionMensual).toEqual({ valorCOP: 3500000 })
  })

  it('texto sustantivo sin cifra reconocible (indeterminado) → sí invoca el adaptador, respeta lo que responda (insuficiente)', async () => {
    const respuestaInsuficiente = {
      estado: 'insuficiente',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: [],
      razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
    }
    const adaptador = crearAdaptadorSimulado(respuestaInsuficiente)

    const resultado = await interpretarDeclaracion({
      declaracion: { tipo: 'contenido', texto: 'no sé qué hacer con mi pensión' },
      adaptador,
    })

    expect(resultado).toEqual(respuestaInsuficiente)
  })
})

describe('interpretarDeclaracion — validación semántica adicional, más allá de lo que ya garantiza el schema', () => {
  it('el adaptador devuelve estado interpretado pero los tres campos en null (schema-válido, inconsistente) → se descarta como RESPUESTA_INCONSISTENTE', async () => {
    const adaptador = crearAdaptadorSimulado({ estado: 'interpretado', campos: CAMPOS_VACIOS, camposAmbiguos: [], razonCodigo: null })

    const resultado = await interpretarDeclaracion({
      declaracion: { tipo: 'contenido', texto: 'quiero saber sobre mi pensión' },
      adaptador,
    })

    expect(resultado).toEqual(resultadoError('RESPUESTA_INCONSISTENTE'))
  })
})

describe('interpretarDeclaracion — errores de transporte pasan sin modificar (ya vienen bien formados)', () => {
  it('estado: error_proveedor del adaptador se devuelve tal cual, sin pasar por validación semántica', async () => {
    const errorTimeout = resultadoError('TIMEOUT')
    const adaptador = crearAdaptadorSimulado(errorTimeout)

    const resultado = await interpretarDeclaracion({
      declaracion: { tipo: 'contenido', texto: 'quiero saber sobre mi pensión' },
      adaptador,
    })

    expect(resultado).toEqual(errorTimeout)
  })
})
