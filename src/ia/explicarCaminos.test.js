import { describe, it, expect, vi } from 'vitest'
import { explicarCaminos } from './explicarCaminos.js'
import { crearAdaptadorSimulado } from './adaptadores/AdaptadorSimulado.js'
import { resultadoError } from './adaptadores/AdaptadorExplicacionIA.js'

function escenarioViable(id, overrides = {}) {
  return {
    id,
    tipo: id === 'base' ? 'base' : 'alternativo',
    estado: 'viable',
    decision: `Decisión de ${id}`,
    entradas: { edadJubilacionDeseada: 62 },
    resultado: { valor: 3100000 },
    tasaReemplazo: 60,
    esfuerzo: { ibcActual: 2900000, ibcPropuesto: 2900000, aumentoIBC: 0, costoPensionalAdicionalMensual: 0 },
    distanciaObjetivo: { valorObjetivo: 3500000, delta: 400000, cumple: false },
    ...overrides,
  }
}

function escenarioDescartado(id) {
  return { id, tipo: 'alternativo', estado: 'descartado', decision: 'Descartado', razonDescartado: { codigo: 'X', mensaje: 'razon' } }
}

function resultadoInterpretadoFijo(overrides = {}) {
  return {
    explicaciones: [{ escenarioId: 'base', queCambia: 'texto', preguntaSugerida: null }],
    comparacion: null,
    ...overrides,
  }
}

describe('explicarCaminos — EVIDENCIA: sin escenarios viables, el adaptador nunca se invoca', () => {
  it('resultado.escenarios vacío → estado "generado" con explicaciones vacías, sin llamar al adaptador', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    const salida = await explicarCaminos({ resultado: { escenarios: [] }, contexto: {}, adaptador: adaptadorEspiado })
    expect(salida).toEqual({ estado: 'generado', explicaciones: [], comparacion: null, errorCodigo: null })
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })

  it('todos los escenarios descartados → mismo tratamiento, ninguna llamada', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    const salida = await explicarCaminos({
      resultado: { escenarios: [escenarioDescartado('aumentar-ibc-futuro')] },
      contexto: {},
      adaptador: adaptadorEspiado,
    })
    expect(salida.explicaciones).toEqual([])
    expect(adaptadorEspiado).not.toHaveBeenCalled()
  })
})

describe('explicarCaminos — filtro de alcance: solo escenarios viables llegan al adaptador', () => {
  it('un escenario viable + uno descartado en el mismo resultado → el adaptador solo recibe el viable', async () => {
    const adaptadorEspiado = vi.fn(
      crearAdaptadorSimulado(
        resultadoInterpretadoFijo({ explicaciones: [{ escenarioId: 'base', queCambia: null, preguntaSugerida: null }] })
      )
    )
    await explicarCaminos({
      resultado: { escenarios: [escenarioViable('base'), escenarioDescartado('aumentar-ibc-futuro')] },
      contexto: {},
      adaptador: adaptadorEspiado,
    })
    const entradaRecibida = adaptadorEspiado.mock.calls[0][0]
    expect(entradaRecibida.escenarios).toEqual([
      { id: 'base', decision: 'Decisión de base', tipo: 'base', cumpleObjetivo: false },
    ])
  })
})

describe('explicarCaminos — EVIDENCIA (precisión de calidad 2026-08-23): cumpleObjetivo viaja junto a cada escenario, nunca adivinado', () => {
  it('escenario que cumple el objetivo → cumpleObjetivo: true', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    await explicarCaminos({
      resultado: { escenarios: [escenarioViable('base', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } })] },
      contexto: {},
      adaptador: adaptadorEspiado,
    })
    expect(adaptadorEspiado.mock.calls[0][0].escenarios[0].cumpleObjetivo).toBe(true)
  })

  it('sin distanciaObjetivo (defensivo) → cumpleObjetivo: null, nunca se adivina true/false', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    await explicarCaminos({
      resultado: { escenarios: [escenarioViable('base', { distanciaObjetivo: null })] },
      contexto: {},
      adaptador: adaptadorEspiado,
    })
    expect(adaptadorEspiado.mock.calls[0][0].escenarios[0].cumpleObjetivo).toBeNull()
  })
})

describe('explicarCaminos — construcción de la entrada al adaptador', () => {
  it('incluye hechos por escenario, contexto.declaracionLibre y contexto.caminoMasAlineadoId', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    await explicarCaminos({
      resultado: {
        escenarios: [escenarioViable('base')],
        orientacion: { caminoMasAlineadoId: 'base' },
        horizonte: { fechaInicio: '2026-01-01', fechaFin: '2028-01-01', diasCotizados: 730 },
      },
      contexto: { declaracionLibre: 'Quiero pensionarme con al menos 3.500.000 al mes.' },
      adaptador: adaptadorEspiado,
    })
    const entradaRecibida = adaptadorEspiado.mock.calls[0][0]
    expect(entradaRecibida.hechos.porEscenario.base.pensionProyectada).toBe('$3.100.000')
    expect(entradaRecibida.hechos.global.diasHorizonte).toBe('730')
    expect(entradaRecibida.contexto).toEqual({
      declaracionLibre: 'Quiero pensionarme con al menos 3.500.000 al mes.',
      caminoMasAlineadoId: 'base',
    })
  })

  it('sin contexto provisto → declaracionLibre queda null, nunca undefined ni un error', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    await explicarCaminos({ resultado: { escenarios: [escenarioViable('base')] }, contexto: undefined, adaptador: adaptadorEspiado })
    expect(adaptadorEspiado.mock.calls[0][0].contexto.declaracionLibre).toBeNull()
  })

  it('EVIDENCIA (2026-08-24): objetivoLegalmenteInalcanzable === true → la IA recibe caminoMasAlineadoId null, aunque resultado.orientacion.caminoMasAlineadoId siga teniendo un valor real (información determinista interna, nunca borrada)', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    await explicarCaminos({
      resultado: {
        escenarios: [escenarioViable('base')],
        orientacion: { caminoMasAlineadoId: 'base', objetivoLegalmenteInalcanzable: true },
      },
      contexto: {},
      adaptador: adaptadorEspiado,
    })
    expect(adaptadorEspiado.mock.calls[0][0].contexto.caminoMasAlineadoId).toBeNull()
  })

  it('objetivoLegalmenteInalcanzable === false (o ausente) → la IA sigue recibiendo caminoMasAlineadoId normalmente', async () => {
    const adaptadorEspiado = vi.fn(crearAdaptadorSimulado(resultadoInterpretadoFijo()))
    await explicarCaminos({
      resultado: {
        escenarios: [escenarioViable('base')],
        orientacion: { caminoMasAlineadoId: 'base', objetivoLegalmenteInalcanzable: false },
      },
      contexto: {},
      adaptador: adaptadorEspiado,
    })
    expect(adaptadorEspiado.mock.calls[0][0].contexto.caminoMasAlineadoId).toBe('base')
  })
})

describe('explicarCaminos — validación y errores', () => {
  it('respuesta consistente → estado "generado" con las explicaciones tal cual', async () => {
    const adaptador = crearAdaptadorSimulado(resultadoInterpretadoFijo())
    const salida = await explicarCaminos({ resultado: { escenarios: [escenarioViable('base')] }, contexto: {}, adaptador })
    expect(salida.estado).toBe('generado')
    expect(salida.explicaciones).toHaveLength(1)
  })

  it('respuesta con un token inventado (clave que no existe en los hechos enviados) → RESPUESTA_INCONSISTENTE', async () => {
    const adaptador = crearAdaptadorSimulado(
      resultadoInterpretadoFijo({
        explicaciones: [{ escenarioId: 'base', queCambia: 'Sube a {{base:claveInventada}}.', preguntaSugerida: null }],
      })
    )
    const salida = await explicarCaminos({ resultado: { escenarios: [escenarioViable('base')] }, contexto: {}, adaptador })
    expect(salida).toEqual(resultadoError('RESPUESTA_INCONSISTENTE'))
  })

  it('error de transporte del adaptador se devuelve tal cual, sin pasar por validación semántica', async () => {
    const errorTimeout = resultadoError('TIMEOUT')
    const adaptador = crearAdaptadorSimulado(errorTimeout)
    const salida = await explicarCaminos({ resultado: { escenarios: [escenarioViable('base')] }, contexto: {}, adaptador })
    expect(salida).toEqual(errorTimeout)
  })
})
