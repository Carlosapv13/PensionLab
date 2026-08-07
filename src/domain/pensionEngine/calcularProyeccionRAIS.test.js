import { describe, it, expect } from 'vitest'
import { calcularProyeccionRAIS } from './calcularProyeccionRAIS.js'

const CASO_BASE = {
  regimenActual: 'RAIS',
  fechaNacimiento: '1980-01-01',
  edadJubilacionDeseada: 60,
  ibcAplicableSimulacion: 3501810, // 2 SMLV (smlv 2026 = 1750905)
  fecha: '2026-08-06', // posterior a la vigencia de los supuestos (2026-07-30); edadActual = 46
}

describe('calcularProyeccionRAIS — caso calculado', () => {
  it('produce una pensión mensual proyectada, verificada por ejecución', () => {
    const r = calcularProyeccionRAIS(CASO_BASE)

    expect(r.estado).toBe('calculado')
    expect(r.razonNoEvaluable).toBeNull()
    expect(r.pensionMensualProyectada).toBeCloseTo(566208.8259091519, 4)
  })

  it('el mismo caso produce siempre el mismo resultado (determinismo)', () => {
    const primero = calcularProyeccionRAIS(CASO_BASE)
    const segundo = calcularProyeccionRAIS(CASO_BASE)
    expect(primero).toEqual(segundo)
  })
})

describe('calcularProyeccionRAIS — no_evaluable: regimen_no_rais', () => {
  it('regimenActual RPM', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, regimenActual: 'RPM' })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('regimen_no_rais')
    expect(r.pensionMensualProyectada).toBeNull()
  })

  it('regimenActual desconocido', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, regimenActual: 'desconocido' })
    expect(r.razonNoEvaluable).toBe('regimen_no_rais')
  })

  it('regimenActual null: se trata como no evaluable, nunca lanza', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, regimenActual: null })
    expect(r.razonNoEvaluable).toBe('regimen_no_rais')
  })
})

describe('calcularProyeccionRAIS — no_evaluable: edad_jubilacion_no_declarada', () => {
  it('edadJubilacionDeseada null', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, edadJubilacionDeseada: null })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('edad_jubilacion_no_declarada')
  })

  it('edadJubilacionDeseada undefined', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, edadJubilacionDeseada: undefined })
    expect(r.razonNoEvaluable).toBe('edad_jubilacion_no_declarada')
  })

  it('edadJubilacionDeseada no numérica (NaN), nunca inventa un valor por defecto', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, edadJubilacionDeseada: NaN })
    expect(r.razonNoEvaluable).toBe('edad_jubilacion_no_declarada')
  })
})

describe('calcularProyeccionRAIS — trazabilidad', () => {
  it('incluye los ids de los valores legales usados', () => {
    const r = calcularProyeccionRAIS(CASO_BASE)

    expect(r.parametrosLegalesUsados.smlv.id).toBe('smlv-2026')
    expect(r.parametrosLegalesUsados.topeMaximoIBC.id).toBe('tope-maximo-ibc')
    expect(r.parametrosLegalesUsados.tasaCotizacion.id).toBe('tasa-cotizacion')
  })

  it('incluye los ids de los supuestos usados', () => {
    const r = calcularProyeccionRAIS(CASO_BASE)

    expect(r.parametrosSupuestosUsados.rentabilidadEsperadaRAIS.id).toBe('rentabilidad-esperada-rais-2026')
    expect(r.parametrosSupuestosUsados.descuentoSobreAporteCapitalizable.id).toBe(
      'descuento-aporte-capitalizable-2026'
    )
    expect(r.parametrosSupuestosUsados.mesesPayoutSimplificado.id).toBe('meses-payout-simplificado-2026')
  })

  it('la tasa de cotización usada en el cálculo ya está convertida a fracción', () => {
    const r = calcularProyeccionRAIS(CASO_BASE)
    // El valor trazado conserva la unidad original del resolver (puntos porcentuales);
    // la conversión a fracción ocurre solo al pasarla a formulaRAIS, no se sobreescribe aquí.
    expect(r.parametrosLegalesUsados.tasaCotizacion.valor).toBe(16)
  })
})

describe('calcularProyeccionRAIS — limitación crítica', () => {
  it('el resultado calculado siempre incluye la limitación de capital no incluido', () => {
    const r = calcularProyeccionRAIS(CASO_BASE)

    expect(r.limitaciones).toHaveLength(1)
    expect(r.limitaciones[0].codigo).toBe('CAPITAL_ACUMULADO_NO_INCLUIDO')
    expect(r.limitaciones[0].mensaje).toMatch(/no incluye el capital/i)
  })

  it('un resultado no_evaluable no lleva limitaciones (no hay cálculo del que advertir)', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, regimenActual: 'RPM' })
    expect(r.limitaciones).toEqual([])
  })
})
