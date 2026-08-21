import { describe, it, expect } from 'vitest'
import { formatearFechaCorta } from './formatearFechaCorta.js'

describe('formatearFechaCorta', () => {
  it('formatea el inicio del horizonte del fixture rpm-empleado-proyecta-tu-pension', () => {
    expect(formatearFechaCorta('2026-08-22')).toBe('22 ago 2026')
  })

  it('formatea la fecha de reconocimiento del mismo fixture', () => {
    expect(formatearFechaCorta('2043-02-11')).toBe('11 feb 2043')
  })

  it('enero (mes 01)', () => {
    expect(formatearFechaCorta('2026-01-05')).toBe('5 ene 2026')
  })

  it('diciembre (mes 12)', () => {
    expect(formatearFechaCorta('2026-12-31')).toBe('31 dic 2026')
  })

  it('nunca corre el día por zona horaria — parsea por split, no por new Date().getDate()', () => {
    // Regresión: new Date('2026-01-01').getDate() puede dar 31/dic en zonas horarias
    // negativas si se interpreta como medianoche UTC — este helper nunca pasa por ahí.
    expect(formatearFechaCorta('2026-01-01')).toBe('1 ene 2026')
  })
})
