import { describe, it, expect } from 'vitest'
import { borradorVacio, evaluarNuevoPeriodo, construirPeriodoCotizacion } from './HistoriaCotizacionRPM.helpers.js'

const HOY = '2026-08-19'

function borradorValidoCerrado(overrides = {}) {
  return {
    ...borradorVacio(),
    fechaDesde: '2020-01-01',
    fechaHasta: '2022-12-31',
    ibc: '2500000',
    ...overrides,
  }
}

describe('evaluarNuevoPeriodo', () => {
  it('borrador vacío: no se puede agregar y explica todos los campos faltantes', () => {
    const resultado = evaluarNuevoPeriodo(borradorVacio(), HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores.length).toBeGreaterThan(0)
  })

  it('período cerrado válido: puede agregarse sin errores', () => {
    const resultado = evaluarNuevoPeriodo(borradorValidoCerrado(), HOY)
    expect(resultado).toEqual({
      fechaDesdeISO: '2020-01-01',
      fechaHastaISO: '2022-12-31',
      ibcNumero: 2500000,
      puedeAgregar: true,
      errores: [],
    })
  })

  it('período abierto (sigue cotizando): no exige fecha de fin', () => {
    const borrador = borradorValidoCerrado({ sigueAbierto: true, fechaHasta: '' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(true)
    expect(resultado.fechaHastaISO).toBeNull()
  })

  it('fecha de inicio futura: bloquea con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2027-01-01' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('La fecha de inicio de este período no puede ser futura.')
  })

  it('fecha de inicio irreal (31 de abril): bloquea', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2020-04-31' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.fechaDesdeISO).toBeNull()
  })

  it('fecha de fin anterior a la fecha de inicio: bloquea con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2023-01-01', fechaHasta: '2022-12-31' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('La fecha de fin no puede ser anterior a la fecha de inicio de este período.')
  })

  it('IBC vacío: bloquea con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ ibc: '' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('Ingresa un valor de IBC mayor que cero para este período.')
  })

  it('IBC en cero: bloquea (no es un IBC real)', () => {
    const borrador = borradorValidoCerrado({ ibc: '0' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
  })
})

describe('construirPeriodoCotizacion', () => {
  it('período cerrado: diasCotizados son los días calendario completos del rango', () => {
    const evaluacion = evaluarNuevoPeriodo(borradorValidoCerrado(), HOY)
    const periodo = construirPeriodoCotizacion(evaluacion, HOY)

    expect(periodo).toEqual({
      fechaDesde: '2020-01-01',
      fechaHasta: '2022-12-31',
      ibc: 2500000,
      diasCotizados: 1096, // 2020 (bisiesto, 366) + 2021 (365) + 2022 (365)
    })
  })

  it('período abierto: diasCotizados se calculan hasta la fecha dada, fechaHasta queda null', () => {
    const borrador = borradorValidoCerrado({ sigueAbierto: true, fechaHasta: '', fechaDesde: '2026-01-01' })
    const evaluacion = evaluarNuevoPeriodo(borrador, HOY)
    const periodo = construirPeriodoCotizacion(evaluacion, HOY)

    expect(periodo.fechaHasta).toBeNull()
    expect(periodo.fechaDesde).toBe('2026-01-01')
    expect(periodo.diasCotizados).toBe(231) // 1 ene a 19 ago 2026, inclusive
  })
})
