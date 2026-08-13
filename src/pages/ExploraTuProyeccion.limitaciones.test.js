// Tests de las dos funciones puras que separan limitaciones comunes de
// específicas en la comparación de caminos (ExploraTuProyeccion.jsx) — regla
// data-driven aprobada: un código es "común" si aparece en TODOS los
// escenarios viables, "específico" si aparece solo en algunos. Sin mount de
// componente, mismo criterio ya usado para lógica pura extraíble en src/dev/.

import { describe, it, expect } from 'vitest'
import {
  calcularLimitacionesComunes,
  limitacionesEspecificas,
  separarLimitacionesGenerales,
} from './ExploraTuProyeccion.helpers.js'

const ANUALIZACION = { codigo: 'ANUALIZACION_SIMPLIFICADA', mensaje: 'anualización simplificada' }
const SALDO_ACTUAL = { codigo: 'SALDO_TRATADO_COMO_ACTUAL', mensaje: 'saldo tratado como actual' }
const COSTO_SOLO_PENSIONAL = { codigo: 'COSTO_SOLO_PENSIONAL', mensaje: 'costo solo pensional' }
const TOPE_SMMLV = {
  codigo: 'TOPE_IBC_CON_SMMLV_VIGENTE',
  mensaje: 'El tope legal de 25 SMMLV que aplicamos aquí se evalúa con el SMMLV vigente en la fecha de esta simulación.',
}

function escenario(limitaciones) {
  return { limitaciones }
}

describe('calcularLimitacionesComunes', () => {
  it('sin escenarios viables, no hay comunes', () => {
    expect(calcularLimitacionesComunes([])).toEqual([])
  })

  it('con un solo escenario viable, todas sus limitaciones son comunes', () => {
    const resultado = calcularLimitacionesComunes([escenario([ANUALIZACION, SALDO_ACTUAL])])
    expect(resultado).toEqual([ANUALIZACION, SALDO_ACTUAL])
  })

  it('con varios escenarios, solo quedan los códigos presentes en todos', () => {
    const base = escenario([ANUALIZACION, SALDO_ACTUAL])
    const alternativo = escenario([ANUALIZACION, SALDO_ACTUAL, COSTO_SOLO_PENSIONAL])

    const resultado = calcularLimitacionesComunes([base, alternativo])

    expect(resultado).toEqual([ANUALIZACION, SALDO_ACTUAL])
  })

  it('si ningún código se repite en todos los escenarios, no hay comunes', () => {
    const base = escenario([ANUALIZACION])
    const alternativo = escenario([COSTO_SOLO_PENSIONAL])

    expect(calcularLimitacionesComunes([base, alternativo])).toEqual([])
  })
})

describe('limitacionesEspecificas', () => {
  it('excluye del escenario los códigos ya marcados como comunes', () => {
    const alternativo = escenario([ANUALIZACION, SALDO_ACTUAL, COSTO_SOLO_PENSIONAL])
    const comunes = [ANUALIZACION, SALDO_ACTUAL]

    expect(limitacionesEspecificas(alternativo, comunes)).toEqual([COSTO_SOLO_PENSIONAL])
  })

  it('si todas las limitaciones del escenario son comunes, no queda ninguna específica', () => {
    const base = escenario([ANUALIZACION, SALDO_ACTUAL])
    const comunes = [ANUALIZACION, SALDO_ACTUAL]

    expect(limitacionesEspecificas(base, comunes)).toEqual([])
  })

  it('sin limitaciones comunes, todas las del escenario son específicas', () => {
    const base = escenario([ANUALIZACION, SALDO_ACTUAL])

    expect(limitacionesEspecificas(base, [])).toEqual([ANUALIZACION, SALDO_ACTUAL])
  })
})

describe('separarLimitacionesGenerales', () => {
  it('un código no marcado como "siempre general" (ej. COSTO_SOLO_PENSIONAL) se queda como específico', () => {
    const { generales, especificas } = separarLimitacionesGenerales([COSTO_SOLO_PENSIONAL])
    expect(generales).toEqual([])
    expect(especificas).toEqual([COSTO_SOLO_PENSIONAL])
  })

  it('TOPE_IBC_CON_SMMLV_VIGENTE se mueve a generales', () => {
    const { generales, especificas } = separarLimitacionesGenerales([TOPE_SMMLV])
    expect(especificas).toEqual([])
    expect(generales).toHaveLength(1)
    expect(generales[0].codigo).toBe('TOPE_IBC_CON_SMMLV_VIGENTE')
  })

  it('ajusta la redacción de TOPE_IBC_CON_SMMLV_VIGENTE ("aquí" → "en esta simulación") sin cambiar el código', () => {
    const { generales } = separarLimitacionesGenerales([TOPE_SMMLV])
    expect(generales[0].mensaje).toContain('aplicamos en esta simulación')
    expect(generales[0].mensaje).not.toContain('aplicamos aquí')
    expect(generales[0].codigo).toBe(TOPE_SMMLV.codigo)
  })

  it('no muta el objeto original de la limitación', () => {
    const original = { ...TOPE_SMMLV }
    separarLimitacionesGenerales([TOPE_SMMLV])
    expect(TOPE_SMMLV).toEqual(original)
  })

  it('separa correctamente una mezcla de códigos generales y específicos, preservando el resto del mensaje', () => {
    const { generales, especificas } = separarLimitacionesGenerales([COSTO_SOLO_PENSIONAL, TOPE_SMMLV])
    expect(especificas).toEqual([COSTO_SOLO_PENSIONAL])
    expect(generales).toHaveLength(1)
    expect(generales[0].mensaje).toContain('se evalúa con el SMMLV vigente en la fecha de esta simulación.')
  })

  it('lista vacía produce ambos grupos vacíos', () => {
    expect(separarLimitacionesGenerales([])).toEqual({ generales: [], especificas: [] })
  })
})
