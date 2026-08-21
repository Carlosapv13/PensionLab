import { describe, it, expect } from 'vitest'
import { calcularFechaPorEdad } from './calcularFechaPorEdad.js'

describe('calcularFechaPorEdad', () => {
  it('caso normal: mismo día/mes, año de nacimiento + edad objetivo', () => {
    expect(calcularFechaPorEdad('1984-08-06', 62)).toBe('2046-08-06')
  })

  it('edad objetivo 0: la propia fecha de nacimiento', () => {
    expect(calcularFechaPorEdad('1984-08-06', 0)).toBe('1984-08-06')
  })

  it('nacido 29 de febrero, edad objetivo cae en año NO bisiesto → 28 de febrero', () => {
    // 2000 es bisiesto; 2000+25=2025 no lo es.
    expect(calcularFechaPorEdad('2000-02-29', 25)).toBe('2025-02-28')
  })

  it('nacido 29 de febrero, edad objetivo cae en año bisiesto → se preserva 29 de febrero', () => {
    // 2000 es bisiesto; 2000+24=2024 también lo es.
    expect(calcularFechaPorEdad('2000-02-29', 24)).toBe('2024-02-29')
  })

  it('es la inversa de calcularEdadCumplida: la edad calculada en la fecha resultante es exactamente edadObjetivo', () => {
    const fechaNacimiento = '1990-11-23'
    const edadObjetivo = 57
    const fechaResultante = calcularFechaPorEdad(fechaNacimiento, edadObjetivo)
    expect(fechaResultante).toBe('2047-11-23')
  })
})
