import { describe, it, expect } from 'vitest'
import { evaluarIndicioVidaLaboral } from './evidenciaIndicioVidaLaboral.js'

const FECHA = '2026-08-19'

function base(overrides = {}) {
  return {
    regimenActual: 'RPM',
    nivelConocimientoSemanas: 'aproximado',
    semanasCotizadas: '1500',
    fecha: FECHA,
    ...overrides,
  }
}

describe('evaluarIndicioVidaLaboral', () => {
  it('semanas declaradas por encima del umbral → indicio_probable', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ semanasCotizadas: '1500' }))
    expect(resultado.estado).toBe('indicio_probable')
    expect(resultado.semanasDeclaradas).toBe(1500)
    expect(resultado.umbral).toBeGreaterThan(0)
  })

  it('semanas declaradas por debajo del umbral → sin_indicio_suficiente, nunca una conclusión negativa', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ semanasCotizadas: '500' }))
    expect(resultado.estado).toBe('sin_indicio_suficiente')
  })

  it('exactamente en el umbral → indicio_probable', () => {
    const umbral = evaluarIndicioVidaLaboral(base()).umbral
    const resultado = evaluarIndicioVidaLaboral(base({ semanasCotizadas: String(umbral) }))
    expect(resultado.estado).toBe('indicio_probable')
  })

  it('nivelConocimientoSemanas desconocido → no_evaluable, semanas_desconocidas', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ nivelConocimientoSemanas: 'desconocido' }))
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('semanas_desconocidas')
  })

  it('nivelConocimientoSemanas null → no_evaluable, semanas_desconocidas', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ nivelConocimientoSemanas: null }))
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('semanas_desconocidas')
  })

  it('semanas inválidas (no numérico) → no_evaluable, semanas_invalidas', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ semanasCotizadas: 'abc' }))
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('semanas_invalidas')
  })

  it('semanas negativas → no_evaluable, semanas_invalidas', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ semanasCotizadas: '-10' }))
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('semanas_invalidas')
  })

  it('régimen RAIS → no_evaluable, regimen_no_rpm', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ regimenActual: 'RAIS' }))
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('regimen_no_rpm')
  })

  it('régimen desconocido/null → no_evaluable, regimen_desconocido', () => {
    const resultado = evaluarIndicioVidaLaboral(base({ regimenActual: null }))
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('regimen_desconocido')
  })

  it('siempre declara la limitación de que el indicio no es evidencia verificada', () => {
    const resultado = evaluarIndicioVidaLaboral(base())
    expect(resultado.limitaciones.map((l) => l.codigo)).toContain('INDICIO_NO_ES_EVIDENCIA_VERIFICADA')
  })
})
