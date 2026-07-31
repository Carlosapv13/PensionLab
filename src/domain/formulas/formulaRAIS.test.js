import { describe, it, expect } from 'vitest'
import {
  calcularAporteCapitalizableRAIS,
  calcularCapitalProyectadoRAIS,
  formulaRAIS,
} from './formulaRAIS.js'

// Parámetros de referencia, tomados de trazabilidad-formula-RAIS.md ("Supuestos
// aprobados para Sprint 1"). smlv=1 para que salarioActual quede expresado directamente
// en SMLV, igual que la tabla de ejemplos numéricos del documento.
const parametrosLegales = {
  smlv: 1,
  tasaCotizacion: 0.16,
  topeMaximoIBC: 25,
}

const parametrosSupuestos = {
  rentabilidadEsperadaRAIS: 0.035,
  descuentoSobreAporteCapitalizable: 0.1875,
  mesesPayoutSimplificado: 240,
}

// Los 3 casos documentados en trazabilidad-formula-RAIS.md
const casos = [
  {
    nombre: 'A — mujer, horizonte medio (2 SMLV, 42→57 años)',
    datosUsuario: { salarioActual: 2, edadActual: 42, edadJubilacionDeseada: 57 },
    aporteCapitalizableEsperado: 0.26,
    capitalEsperado: 61.1623,
    pensionEsperada: 0.3530,
  },
  {
    nombre: 'B — hombre, horizonte corto, salario alto (5 SMLV, 52→62 años)',
    datosUsuario: { salarioActual: 5, edadActual: 52, edadJubilacionDeseada: 62 },
    aporteCapitalizableEsperado: 0.65,
    capitalEsperado: 92.9636,
    pensionEsperada: 0.5365,
  },
  {
    nombre: 'C — horizonte largo, salario bajo (1 SMLV, 27→57 años)',
    datosUsuario: { salarioActual: 1, edadActual: 27, edadJubilacionDeseada: 57 },
    aporteCapitalizableEsperado: 0.13,
    capitalEsperado: 81.8152,
    pensionEsperada: 0.4722,
  },
]

describe('calcularAporteCapitalizableRAIS', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const aporte = calcularAporteCapitalizableRAIS({
        datosUsuario: caso.datosUsuario,
        parametrosLegales,
        parametrosSupuestos,
      })
      expect(aporte).toBeCloseTo(caso.aporteCapitalizableEsperado, 10)
    })
  }
})

describe('calcularCapitalProyectadoRAIS', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const capital = calcularCapitalProyectadoRAIS({
        datosUsuario: caso.datosUsuario,
        parametrosLegales,
        parametrosSupuestos,
      })
      expect(capital).toBeCloseTo(caso.capitalEsperado, 4)
    })
  }
})

describe('formulaRAIS', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const pension = formulaRAIS({
        datosUsuario: caso.datosUsuario,
        parametrosLegales,
        parametrosSupuestos,
      })
      expect(pension).toBeCloseTo(caso.pensionEsperada, 4)
    })
  }

  it('las 3 pensiones proyectadas quedan por debajo de 1 SMLV (consistente con la limitación documentada sobre FGPM)', () => {
    for (const caso of casos) {
      const pension = formulaRAIS({
        datosUsuario: caso.datosUsuario,
        parametrosLegales,
        parametrosSupuestos,
      })
      expect(pension).toBeLessThan(1)
    }
  })
})
