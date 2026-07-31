import { describe, it, expect } from 'vitest'
import { calcularTasaReemplazoRPM, formulaRPM } from './formulaRPM.js'

// Parámetros legales de referencia (Art. 34 Ley 100 / Art. 10 Ley 797 de 2003), tomados
// de vigente-2026.json. smlv=1 para que ibl quede expresado directamente en SMLV, igual
// que la columna "IBL (en SMLV)" de la tabla en trazabilidad-formula-RPM.md.
const parametrosLegales = {
  smlv: 1,
  tasaReemplazoConstante: 65.5,
  tasaReemplazoPendiente: 0.5,
  tasaReemplazoMinima: 55,
  tasaReemplazoMaxima: 80,
  semanasBaseIncrementoRPM: 1300,
  semanasPorIncrementoAdicional: 50,
  incrementoPorcentualPorTramo: 1.5,
}

// Los 4 casos documentados en trazabilidad-formula-RPM.md
const casos = [
  {
    nombre: 'hombre, justo en el mínimo',
    datosUsuario: { ibl: 1, semanasCotizadas: 1300 },
    tasaEsperada: 65,
    pensionEsperada: 0.65,
  },
  {
    nombre: 'hombre, con semanas extra',
    datosUsuario: { ibl: 5, semanasCotizadas: 1500 },
    tasaEsperada: 69,
    pensionEsperada: 3.45,
  },
  {
    nombre: 'ingreso alto, en el tope IBC (dispara el piso del 55%)',
    datosUsuario: { ibl: 25, semanasCotizadas: 1300 },
    tasaEsperada: 55,
    pensionEsperada: 13.75,
  },
  {
    nombre: 'mujer 2026, elegible pero bajo el ancla del incremento (1250 < 1300)',
    datosUsuario: { ibl: 3, semanasCotizadas: 1250 },
    tasaEsperada: 64,
    pensionEsperada: 1.92,
  },
]

describe('calcularTasaReemplazoRPM', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const tasa = calcularTasaReemplazoRPM({ datosUsuario: caso.datosUsuario, parametrosLegales })
      expect(tasa).toBeCloseTo(caso.tasaEsperada, 10)
    })
  }
})

describe('formulaRPM', () => {
  for (const caso of casos) {
    it(caso.nombre, () => {
      const pension = formulaRPM({ datosUsuario: caso.datosUsuario, parametrosLegales })
      expect(pension).toBeCloseTo(caso.pensionEsperada, 10)
    })
  }
})
