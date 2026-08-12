import { describe, it, expect } from 'vitest'
import { formatearPesos, formatearMilesInput } from './formatearDinero.js'

describe('formatearMilesInput', () => {
  it('cadena vacía se conserva vacía', () => {
    expect(formatearMilesInput('')).toBe('')
  })

  it('0', () => {
    expect(formatearMilesInput('0')).toBe('0')
  })

  it('cientos', () => {
    expect(formatearMilesInput('500')).toBe('500')
  })

  it('miles', () => {
    expect(formatearMilesInput('7000')).toBe('7.000')
  })

  it('millones', () => {
    expect(formatearMilesInput('7000000')).toBe('7.000.000')
  })

  it('80000000 (saldo acumulado del fixture RAIS independiente)', () => {
    expect(formatearMilesInput('80000000')).toBe('80.000.000')
  })

  it('4500000 (objetivo de pensión mensual del fixture)', () => {
    expect(formatearMilesInput('4500000')).toBe('4.500.000')
  })

  it('500000 (restricción de esfuerzo del fixture)', () => {
    expect(formatearMilesInput('500000')).toBe('500.000')
  })
})

describe('formatearPesos', () => {
  it('antepone el signo $ y agrupa por miles', () => {
    expect(formatearPesos(3585045)).toBe('$3.585.045')
  })

  it('redondea valores no enteros (resultado de una fórmula, no de un input)', () => {
    expect(formatearPesos(4500000.4)).toBe('$4.500.000')
    expect(formatearPesos(4500000.6)).toBe('$4.500.001')
  })

  it('0', () => {
    expect(formatearPesos(0)).toBe('$0')
  })
})
