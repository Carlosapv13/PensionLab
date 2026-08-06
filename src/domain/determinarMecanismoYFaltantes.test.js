import { describe, it, expect } from 'vitest'
import { determinarMecanismoYFaltantes } from './determinarMecanismoYFaltantes.js'

function codigos(lista) {
  return lista.map((x) => x.codigo)
}

describe('determinarMecanismoYFaltantes — RPM', () => {
  it('caso RPM', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RPM' })
    expect(r.caso).toBe('RPM')
  })

  it('mecanismo único: IBL + semanas', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RPM' })
    expect(codigos(r.mecanismos)).toEqual(['MECANISMO_IBL_SEMANAS'])
  })

  it('elemento faltante único: IBL', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RPM' })
    expect(codigos(r.elementosFaltantes)).toEqual(['FALTA_IBL'])
  })

  it('no incluye ningún elemento faltante de RAIS', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RPM' })
    expect(codigos(r.elementosFaltantes)).not.toContain('FALTA_CAPITAL_ACUMULADO')
  })
})

describe('determinarMecanismoYFaltantes — RAIS', () => {
  it('caso RAIS', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RAIS' })
    expect(r.caso).toBe('RAIS')
  })

  it('mecanismo único: capital acumulado', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RAIS' })
    expect(codigos(r.mecanismos)).toEqual(['MECANISMO_CAPITAL_ACUMULADO'])
  })

  it('dos elementos faltantes, de naturaleza distinta: capital y horizonte no solicitable', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RAIS' })
    expect(codigos(r.elementosFaltantes)).toEqual([
      'FALTA_CAPITAL_ACUMULADO',
      'FALTA_HORIZONTE_NO_SOLICITABLE',
    ])
  })

  it('no incluye el elemento faltante de RPM', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RAIS' })
    expect(codigos(r.elementosFaltantes)).not.toContain('FALTA_IBL')
  })
})

describe('determinarMecanismoYFaltantes — régimen desconocido', () => {
  it('regimenActual === "desconocido": caso desconocido', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'desconocido' })
    expect(r.caso).toBe('desconocido')
  })

  it('regimenActual null: se trata como desconocido (mismo criterio que las evidencias existentes)', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: null })
    expect(r.caso).toBe('desconocido')
  })

  it('regimenActual ausente por completo: se trata como desconocido', () => {
    const r = determinarMecanismoYFaltantes({})
    expect(r.caso).toBe('desconocido')
  })

  it('regimenActual con un valor inesperado: se trata como desconocido, nunca lanza', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'otro-valor' })
    expect(r.caso).toBe('desconocido')
  })

  it('incluye ambos mecanismos, RPM y RAIS, en modo informativo', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'desconocido' })
    expect(codigos(r.mecanismos)).toEqual(['MECANISMO_IBL_SEMANAS', 'MECANISMO_CAPITAL_ACUMULADO'])
  })

  it('la primera causa es la ausencia del propio régimen, antes que cualquier otra', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'desconocido' })
    expect(r.elementosFaltantes[0].codigo).toBe('FALTA_REGIMEN')
    expect(r.elementosFaltantes[0].regimen).toBeNull()
  })

  it('incluye también las causas de ambos regímenes, condicionalmente', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'desconocido' })
    expect(codigos(r.elementosFaltantes)).toEqual([
      'FALTA_REGIMEN',
      'FALTA_IBL',
      'FALTA_CAPITAL_ACUMULADO',
    ])
  })
})

describe('determinarMecanismoYFaltantes — nunca produce narrativa', () => {
  it('el resultado es puramente estructural: solo campos "caso", "mecanismos" y "elementosFaltantes"', () => {
    const r = determinarMecanismoYFaltantes({ regimenActual: 'RPM' })
    expect(Object.keys(r).sort()).toEqual(['caso', 'elementosFaltantes', 'mecanismos'])
  })
})
