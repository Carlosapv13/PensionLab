import { describe, it, expect } from 'vitest'
import {
  calcularAporteCapitalizableRAIS,
  calcularCapitalProyectadoRAIS,
  formulaRAIS,
  resolverIBCNecesarioRAIS,
  resolverMesesNecesariosRAIS,
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

describe('calcularCapitalProyectadoRAIS — capitalInicial (Slice "Motor de caminos RAIS")', () => {
  it('sin capitalInicial (default 0): idéntico al comportamiento ya probado', () => {
    const capital = calcularCapitalProyectadoRAIS({
      datosUsuario: casos[0].datosUsuario,
      parametrosLegales,
      parametrosSupuestos,
    })
    expect(capital).toBeCloseTo(casos[0].capitalEsperado, 4)
  })

  it('con capitalInicial: se capitaliza al mismo ritmo que los aportes, no se queda estático', () => {
    const capitalSinInicial = calcularCapitalProyectadoRAIS({
      datosUsuario: casos[0].datosUsuario,
      parametrosLegales,
      parametrosSupuestos,
    })
    const capitalConInicial = calcularCapitalProyectadoRAIS({
      datosUsuario: { ...casos[0].datosUsuario, capitalInicial: 10 },
      parametrosLegales,
      parametrosSupuestos,
    })
    // 10 SMLV capitalizados durante 15 años (180 meses) a la tasa esperada,
    // no simplemente sumados sin crecer.
    const tasaMensual = Math.pow(1.035, 1 / 12) - 1
    const capitalInicialEsperado = 10 * Math.pow(1 + tasaMensual, 180)
    expect(capitalConInicial - capitalSinInicial).toBeCloseTo(capitalInicialEsperado, 4)
  })

  it('capitalInicial en 0 explícito produce el mismo resultado que omitirlo', () => {
    const conCero = calcularCapitalProyectadoRAIS({
      datosUsuario: { ...casos[1].datosUsuario, capitalInicial: 0 },
      parametrosLegales,
      parametrosSupuestos,
    })
    const omitido = calcularCapitalProyectadoRAIS({
      datosUsuario: casos[1].datosUsuario,
      parametrosLegales,
      parametrosSupuestos,
    })
    expect(conCero).toBeCloseTo(omitido, 10)
  })
})

describe('resolverIBCNecesarioRAIS — inversa de formulaRAIS respecto al salario/IBC', () => {
  it('ida y vuelta: el IBC resuelto, ejecutado de nuevo, reproduce el objetivo', () => {
    const datosUsuario = { edadActual: 52, edadJubilacionDeseada: 62, capitalInicial: 80 }
    const pensionObjetivo = 0.6

    const ibcNecesario = resolverIBCNecesarioRAIS({
      datosUsuario,
      parametrosLegales,
      parametrosSupuestos,
      pensionObjetivo,
    })

    const pensionResultante = formulaRAIS({
      datosUsuario: { ...datosUsuario, salarioActual: ibcNecesario },
      parametrosLegales,
      parametrosSupuestos,
    })

    expect(pensionResultante).toBeCloseTo(pensionObjetivo, 6)
  })

  it('si el objetivo ya se alcanza solo con capitalInicial, devuelve un IBC menor al que produciría un aporte positivo (caso límite, sin defenderse — mismo criterio que el resto del archivo)', () => {
    const datosUsuario = { edadActual: 52, edadJubilacionDeseada: 62, capitalInicial: 1000 }
    const ibcNecesario = resolverIBCNecesarioRAIS({
      datosUsuario,
      parametrosLegales,
      parametrosSupuestos,
      pensionObjetivo: 0.1,
    })
    expect(ibcNecesario).toBeLessThan(0)
  })
})

describe('resolverMesesNecesariosRAIS — inversa de formulaRAIS respecto al horizonte', () => {
  it('ida y vuelta: los meses resueltos, ejecutados de nuevo, reproducen el objetivo', () => {
    const salarioActual = 4
    const capitalInicial = 20
    const pensionObjetivo = 0.5

    const meses = resolverMesesNecesariosRAIS({
      datosUsuario: { salarioActual, capitalInicial },
      parametrosLegales,
      parametrosSupuestos,
      pensionObjetivo,
    })

    const pensionResultante = formulaRAIS({
      datosUsuario: { salarioActual, capitalInicial, edadActual: 0, edadJubilacionDeseada: meses / 12 },
      parametrosLegales,
      parametrosSupuestos,
    })

    expect(pensionResultante).toBeCloseTo(pensionObjetivo, 4)
  })

  it('objetivo ya alcanzado hoy: devuelve un número de meses <= 0, nunca null', () => {
    const meses = resolverMesesNecesariosRAIS({
      datosUsuario: { salarioActual: 4, capitalInicial: 1000 },
      parametrosLegales,
      parametrosSupuestos,
      pensionObjetivo: 0.1,
    })
    expect(meses).not.toBeNull()
    expect(meses).toBeLessThanOrEqual(0)
  })
})
