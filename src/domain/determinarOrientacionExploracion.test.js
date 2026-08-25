import { describe, it, expect } from 'vitest'
import { determinarOrientacionExploracion } from './determinarOrientacionExploracion.js'

function escenario(id, overrides = {}) {
  return {
    id,
    estado: 'viable',
    decision: `Decisión de ${id}`,
    distanciaObjetivo: { valorObjetivo: 3500000, delta: 1000000, cumple: false },
    limitaciones: [],
    ...overrides,
  }
}

function descartado(id, codigo) {
  return { id, estado: 'descartado', distanciaObjetivo: null, limitaciones: [], razonDescartado: { codigo, mensaje: 'x' } }
}

function orientacion(overrides = {}) {
  return {
    caminoMasAlineadoId: null,
    codigo: 'NINGUNO_CUMPLE_MAS_CERCANO',
    razon: '',
    objetivoLegalmenteInalcanzable: false,
    ...overrides,
  }
}

function resultado(escenarios, orientacionOverrides = {}) {
  return { escenarios, orientacion: orientacion(orientacionOverrides) }
}

describe('determinarOrientacionExploracion — guard / null', () => {
  it('resultado null → null', () => {
    expect(determinarOrientacionExploracion(null)).toBeNull()
  })

  it('escenarios vacío → null', () => {
    expect(determinarOrientacionExploracion(resultado([]))).toBeNull()
  })

  it('orientacion.codigo SIN_CAMINOS_VIABLES → null, aunque haya algún escenario (defensivo)', () => {
    const r = resultado([escenario('base')], { codigo: 'SIN_CAMINOS_VIABLES' })
    expect(determinarOrientacionExploracion(r)).toBeNull()
  })

  it('sin escenario base → null (defensivo, no debería ocurrir en la práctica)', () => {
    expect(determinarOrientacionExploracion(resultado([escenario('aumentar-ibc-futuro')]))).toBeNull()
  })
})

describe('determinarOrientacionExploracion — los 7 estados', () => {
  it('HOY_YA_ALCANZA_OBJETIVO: base.distanciaObjetivo.cumple === true', () => {
    const r = resultado([escenario('base', { distanciaObjetivo: { valorObjetivo: 1000000, delta: -500000, cumple: true } })])
    expect(determinarOrientacionExploracion(r)).toEqual({ codigo: 'HOY_YA_ALCANZA_OBJETIVO', acciones: [] })
  })

  it('OBJETIVO_LEGALMENTE_INALCANZABLE: orientacion.objetivoLegalmenteInalcanzable === true', () => {
    const r = resultado(
      [escenario('base'), descartado('aumentar-ibc-futuro', 'OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE')],
      { codigo: 'NINGUNO_CUMPLE_MAS_CERCANO', objetivoLegalmenteInalcanzable: true }
    )
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'OBJETIVO_LEGALMENTE_INALCANZABLE',
      acciones: [{ codigo: 'AJUSTAR_DATOS_BASE' }],
    })
  })

  it('VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD: orientacion.codigo === VARIOS_CUMPLEN_FALTA_PRIORIDAD', () => {
    const r = resultado(
      [
        escenario('base'),
        escenario('aumentar-ibc-futuro', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } }),
        escenario('esfuerzo-adicional-deseado', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -2, cumple: true } }),
      ],
      { codigo: 'VARIOS_CUMPLEN_FALTA_PRIORIDAD' }
    )
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD',
      acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }],
    })
  })

  it('ELECCION_YA_ALCANZA_OBJETIVO: personalizado viable y cumple, sin VARIOS_CUMPLEN', () => {
    const r = resultado([
      escenario('base'),
      escenario('esfuerzo-adicional-deseado', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } }),
    ])
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'ELECCION_YA_ALCANZA_OBJETIVO',
      acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }],
    })
  })

  it('ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE: personalizado no cumple, alternativo sí', () => {
    const r = resultado([
      escenario('base'),
      escenario('aumentar-ibc-futuro', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } }),
      escenario('esfuerzo-adicional-deseado', { distanciaObjetivo: { valorObjetivo: 3500000, delta: 768682, cumple: false } }),
    ])
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE',
      acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }],
    })
  })

  it('RESTRICCION_COSTO_IMPIDE_OBJETIVO: alternativo viable, no cumple, con la limitación explícita', () => {
    const r = resultado([
      escenario('base'),
      escenario('aumentar-ibc-futuro', {
        distanciaObjetivo: { valorObjetivo: 3500000, delta: 500000, cumple: false },
        limitaciones: [{ codigo: 'RESTRICCION_COSTO_LIMITA_RESULTADO', mensaje: 'x' }],
      }),
    ])
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'RESTRICCION_COSTO_IMPIDE_OBJETIVO',
      acciones: [{ codigo: 'AJUSTAR_DATOS_BASE' }],
    })
  })

  it('RESTRICCION_COSTO_IMPIDE_OBJETIVO NO se infiere solo de "viable y no cumple" — sin la limitación explícita, no se asigna ese estado (cae a null)', () => {
    const r = resultado([
      escenario('base'),
      escenario('aumentar-ibc-futuro', { distanciaObjetivo: { valorObjetivo: 3500000, delta: 500000, cumple: false }, limitaciones: [] }),
    ])
    expect(determinarOrientacionExploracion(r)).toBeNull()
  })

  it('SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE: sin personalizado, alternativo viable y cumple', () => {
    const r = resultado([
      escenario('base'),
      escenario('aumentar-ibc-futuro', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } }),
    ])
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE',
      acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }],
    })
  })
})

describe('determinarOrientacionExploracion — precedencia', () => {
  it('HOY_YA_ALCANZA_OBJETIVO gana aunque exista un personalizado presente', () => {
    const r = resultado([
      escenario('base', { distanciaObjetivo: { valorObjetivo: 1000000, delta: -500000, cumple: true } }),
      escenario('esfuerzo-adicional-deseado', { distanciaObjetivo: { valorObjetivo: 1000000, delta: -900000, cumple: true } }),
    ])
    expect(determinarOrientacionExploracion(r).codigo).toBe('HOY_YA_ALCANZA_OBJETIVO')
  })

  it('OBJETIVO_LEGALMENTE_INALCANZABLE gana aun con un personalizado viable presente', () => {
    const r = resultado(
      [
        escenario('base'),
        descartado('aumentar-ibc-futuro', 'OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE'),
        escenario('esfuerzo-adicional-deseado', { distanciaObjetivo: { valorObjetivo: 30000000, delta: 27000000, cumple: false } }),
      ],
      { objetivoLegalmenteInalcanzable: true }
    )
    expect(determinarOrientacionExploracion(r).codigo).toBe('OBJETIVO_LEGALMENTE_INALCANZABLE')
  })
})

describe('determinarOrientacionExploracion — acciones nunca fuera del vocabulario aprobado', () => {
  const CODIGOS_VALIDOS = ['AJUSTAR_DATOS_BASE', 'EXPLORAR_ESFUERZO_PERSONALIZADO']

  it('ningún estado devuelve un código de acción fuera de AJUSTAR_DATOS_BASE / EXPLORAR_ESFUERZO_PERSONALIZADO', () => {
    const casos = [
      resultado([escenario('base', { distanciaObjetivo: { valorObjetivo: 1000000, delta: -1, cumple: true } })]),
      resultado(
        [escenario('base'), descartado('aumentar-ibc-futuro', 'YA_EN_TOPE_LEGAL')],
        { objetivoLegalmenteInalcanzable: true }
      ),
      resultado([escenario('base'), escenario('aumentar-ibc-futuro', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } })]),
    ]
    for (const caso of casos) {
      const salida = determinarOrientacionExploracion(caso)
      for (const accion of salida?.acciones ?? []) {
        expect(CODIGOS_VALIDOS).toContain(accion.codigo)
      }
    }
  })
})

describe('determinarOrientacionExploracion — casos reales', () => {
  it('EVIDENCIA: caso real $50.000 (elegido) frente a $391.309 (objetivo)', () => {
    const r = resultado([
      escenario('base', { distanciaObjetivo: { valorObjetivo: 3500000, delta: 1419477, cumple: false } }),
      escenario('aumentar-ibc-futuro', { distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true } }),
      escenario('esfuerzo-adicional-deseado', { distanciaObjetivo: { valorObjetivo: 3500000, delta: 768682, cumple: false } }),
    ])
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE',
      acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }],
    })
  })

  it('EVIDENCIA: caso real objetivo $30.000.000, legalmente inalcanzable', () => {
    const r = resultado(
      [
        escenario('base', { distanciaObjetivo: { valorObjetivo: 30000000, delta: 27919477, cumple: false } }),
        descartado('aumentar-ibc-futuro', 'OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE'),
      ],
      { codigo: 'NINGUNO_CUMPLE_MAS_CERCANO', objetivoLegalmenteInalcanzable: true }
    )
    expect(determinarOrientacionExploracion(r)).toEqual({
      codigo: 'OBJETIVO_LEGALMENTE_INALCANZABLE',
      acciones: [{ codigo: 'AJUSTAR_DATOS_BASE' }],
    })
  })
})
