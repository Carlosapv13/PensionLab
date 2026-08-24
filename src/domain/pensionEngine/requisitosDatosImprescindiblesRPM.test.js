import { describe, it, expect } from 'vitest'
import {
  objetivoValorMensualEsValido,
  edadJubilacionDeseadaEsValida,
  edadJubilacionDeseadaEsUtilizable,
  EDAD_MAXIMA_FUNCIONAL,
} from './requisitosDatosImprescindiblesRPM.js'

describe('objetivoValorMensualEsValido', () => {
  it('número positivo → válido', () => {
    expect(objetivoValorMensualEsValido(3500000)).toBe(true)
    expect(objetivoValorMensualEsValido(1)).toBe(true)
  })

  it('cero o negativo → inválido (mismo criterio que generarCaminosRPM.js: > 0, no >= 0)', () => {
    expect(objetivoValorMensualEsValido(0)).toBe(false)
    expect(objetivoValorMensualEsValido(-100)).toBe(false)
  })

  it('null, undefined, NaN, Infinity o no-número → inválido', () => {
    expect(objetivoValorMensualEsValido(null)).toBe(false)
    expect(objetivoValorMensualEsValido(undefined)).toBe(false)
    expect(objetivoValorMensualEsValido(NaN)).toBe(false)
    expect(objetivoValorMensualEsValido(Infinity)).toBe(false)
    expect(objetivoValorMensualEsValido('3500000')).toBe(false)
  })
})

describe('edadJubilacionDeseadaEsValida', () => {
  it('número finito (incluido 0 o negativo) → válido — esta función no evalúa elegibilidad, solo forma', () => {
    expect(edadJubilacionDeseadaEsValida(62)).toBe(true)
    expect(edadJubilacionDeseadaEsValida(0)).toBe(true)
    expect(edadJubilacionDeseadaEsValida(-5)).toBe(true)
  })

  it('null, undefined, NaN, Infinity o no-número → inválido', () => {
    expect(edadJubilacionDeseadaEsValida(null)).toBe(false)
    expect(edadJubilacionDeseadaEsValida(undefined)).toBe(false)
    expect(edadJubilacionDeseadaEsValida(NaN)).toBe(false)
    expect(edadJubilacionDeseadaEsValida(Infinity)).toBe(false)
    expect(edadJubilacionDeseadaEsValida('62')).toBe(false)
  })
})

describe('edadJubilacionDeseadaEsUtilizable — EVIDENCIA del bug de revisión visual (2026-08-23): "6" mientras se escribe "62" nunca debe ser utilizable', () => {
  const EDAD_ACTUAL_FIXTURE = 48 // fechaNacimiento 1978-02-11, fixtures.js — misma persona del caso reportado

  it('REGRESIÓN EXACTA: "6" (primer dígito de "62"), con edadActual=48 → false — antes de esta corrección, edadJubilacionDeseadaEsValida(6) por sí sola ya daba true', () => {
    expect(edadJubilacionDeseadaEsUtilizable(6, EDAD_ACTUAL_FIXTURE)).toBe(false)
    // Confirma que el valor SÍ era (y sigue siendo) sintácticamente válido — la causa raíz
    // no era la forma del dato, era usar esa validación sintáctica como si fuera suficiente.
    expect(edadJubilacionDeseadaEsValida(6)).toBe(true)
  })

  it('"62" completo, con la misma edadActual=48 → true (utilizable)', () => {
    expect(edadJubilacionDeseadaEsUtilizable(62, EDAD_ACTUAL_FIXTURE)).toBe(true)
  })

  it('dígito a dígito, "6" luego "62": solo el valor final pasa a ser utilizable', () => {
    const secuenciaTecleada = [6, 62]
    const resultados = secuenciaTecleada.map((v) => edadJubilacionDeseadaEsUtilizable(v, EDAD_ACTUAL_FIXTURE))
    expect(resultados).toEqual([false, true])
  })

  it('vacío (null) → false', () => {
    expect(edadJubilacionDeseadaEsUtilizable(null, EDAD_ACTUAL_FIXTURE)).toBe(false)
  })

  it('menor o igual que la edad actual de la persona → false (no es una edad futura real, sin importar si "parece" una edad plausible en abstracto)', () => {
    expect(edadJubilacionDeseadaEsUtilizable(48, EDAD_ACTUAL_FIXTURE)).toBe(false) // igual
    expect(edadJubilacionDeseadaEsUtilizable(40, EDAD_ACTUAL_FIXTURE)).toBe(false) // menor
  })

  it('justo por encima de la edad actual → true (esta función no evalúa elegibilidad legal, solo plausibilidad temporal — 49 puede no cumplir el mínimo legal y aun así ser válido para EXPLORAR)', () => {
    expect(edadJubilacionDeseadaEsUtilizable(49, EDAD_ACTUAL_FIXTURE)).toBe(true)
  })

  it(`${EDAD_MAXIMA_FUNCIONAL} exacto (límite funcional inclusive) → true; ${EDAD_MAXIMA_FUNCIONAL + 1} → false`, () => {
    expect(edadJubilacionDeseadaEsUtilizable(EDAD_MAXIMA_FUNCIONAL, EDAD_ACTUAL_FIXTURE)).toBe(true)
    expect(edadJubilacionDeseadaEsUtilizable(EDAD_MAXIMA_FUNCIONAL + 1, EDAD_ACTUAL_FIXTURE)).toBe(false)
  })

  it('edadActual ausente o inválida (null, undefined, NaN, no-número) → false, nunca asume ni cae a "válido por defecto"', () => {
    expect(edadJubilacionDeseadaEsUtilizable(62, null)).toBe(false)
    expect(edadJubilacionDeseadaEsUtilizable(62, undefined)).toBe(false)
    expect(edadJubilacionDeseadaEsUtilizable(62, NaN)).toBe(false)
    expect(edadJubilacionDeseadaEsUtilizable(62, '48')).toBe(false)
  })

  it('texto en vez de número → false', () => {
    expect(edadJubilacionDeseadaEsUtilizable('62', EDAD_ACTUAL_FIXTURE)).toBe(false)
  })
})
