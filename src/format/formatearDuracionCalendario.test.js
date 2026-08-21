import { describe, it, expect } from 'vitest'
import { calcularDuracionCalendario, formatearDuracionCalendario } from './formatearDuracionCalendario.js'

describe('calcularDuracionCalendario — fixture real (rpm-empleado-proyecta-tu-pension)', () => {
  it('2026-08-22 → 2043-02-11: 16 años y 5 meses, NO 16 años y 6 meses (lo que daría dias/365.25)', () => {
    // 6.018 días / 365.25 ≈ 16.48 años → redondeando el resto a meses da 6 meses — un mes
    // completo MÁS que el conteo calendario real. Este test blinda contra reintroducir esa
    // aproximación: el 11 de febrero de 2043 todavía no completa el 22º día de febrero
    // (mismo día-del-mes que el 22 de agosto de 2026), así que el 6º mes no está completo.
    expect(calcularDuracionCalendario('2026-08-22', '2043-02-11')).toEqual({ anios: 16, meses: 5 })
  })
})

describe('calcularDuracionCalendario — bordes de fin de mes', () => {
  it('31 ene → 31 mar (mismo día del mes): 2 meses completos', () => {
    expect(calcularDuracionCalendario('2026-01-31', '2026-03-31')).toEqual({ anios: 0, meses: 2 })
  })

  it('31 ene → 28 feb (mes más corto, no bisiesto): el mes NO se cuenta como completo', () => {
    expect(calcularDuracionCalendario('2026-01-31', '2026-02-28')).toEqual({ anios: 0, meses: 0 })
  })
})

describe('calcularDuracionCalendario — años bisiestos', () => {
  it('31 ene → 29 feb (bisiesto): mismo criterio que el mes corto no bisiesto — no cuenta como mes completo', () => {
    expect(calcularDuracionCalendario('2024-01-31', '2024-02-29')).toEqual({ anios: 0, meses: 0 })
  })

  it('28 feb 2023 (no bisiesto) → 29 feb 2024 (bisiesto): 1 año exacto, el día 29 no afecta el conteo de años', () => {
    expect(calcularDuracionCalendario('2023-02-28', '2024-02-29')).toEqual({ anios: 1, meses: 0 })
  })
})

describe('calcularDuracionCalendario — otros bordes', () => {
  it('misma fecha: 0 años, 0 meses', () => {
    expect(calcularDuracionCalendario('2026-08-22', '2026-08-22')).toEqual({ anios: 0, meses: 0 })
  })

  it('cruza fin de año calendario: 15 dic → 15 ene (mismo día del mes siguiente): 1 mes', () => {
    expect(calcularDuracionCalendario('2026-12-15', '2027-01-15')).toEqual({ anios: 0, meses: 1 })
  })

  it('exactamente 1 año y 1 mes', () => {
    expect(calcularDuracionCalendario('2025-01-01', '2026-02-01')).toEqual({ anios: 1, meses: 1 })
  })
})

describe('formatearDuracionCalendario — pluralización', () => {
  it('años y meses, ambos plurales', () => {
    expect(formatearDuracionCalendario('2026-08-22', '2043-02-11')).toBe('16 años y 5 meses')
  })

  it('1 año y 1 mes (singular en ambos)', () => {
    expect(formatearDuracionCalendario('2025-01-01', '2026-02-01')).toBe('1 año y 1 mes')
  })

  it('solo años, sin meses (2 años)', () => {
    expect(formatearDuracionCalendario('2024-01-01', '2026-01-01')).toBe('2 años')
  })

  it('solo meses, sin años (1 mes)', () => {
    expect(formatearDuracionCalendario('2026-12-15', '2027-01-15')).toBe('1 mes')
  })

  it('menos de 1 mes (misma fecha)', () => {
    expect(formatearDuracionCalendario('2026-08-22', '2026-08-22')).toBe('menos de 1 mes')
  })
})
