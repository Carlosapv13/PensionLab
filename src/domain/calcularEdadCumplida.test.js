import { describe, it, expect } from 'vitest'
import { calcularEdadCumplida } from './calcularEdadCumplida.js'

describe('calcularEdadCumplida', () => {
  it('exactamente en el día del cumpleaños: ya cumplió', () => {
    expect(calcularEdadCumplida('1984-08-06', '2026-08-06')).toBe(42)
  })

  it('un día antes del cumpleaños: todavía no cumplió', () => {
    expect(calcularEdadCumplida('1984-08-06', '2026-08-05')).toBe(41)
  })

  it('un mes antes, mismo día: todavía no cumplió', () => {
    expect(calcularEdadCumplida('1984-08-06', '2026-07-06')).toBe(41)
  })

  it('un día después del cumpleaños: ya cumplió', () => {
    expect(calcularEdadCumplida('1984-08-06', '2026-08-07')).toBe(42)
  })

  it('29 de febrero (año bisiesto) evaluado en un año no bisiesto, antes del 1 de marzo', () => {
    expect(calcularEdadCumplida('2000-02-29', '2026-02-28')).toBe(25)
  })
})
