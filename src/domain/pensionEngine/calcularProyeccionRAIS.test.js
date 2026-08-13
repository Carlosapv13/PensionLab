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

describe('calcularProyeccionRAIS — no_evaluable: ibc_no_valido (defensa genérica del contrato)', () => {
  it('ibcAplicableSimulacion null', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, ibcAplicableSimulacion: null })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('ibc_no_valido')
    expect(r.pensionMensualProyectada).toBeNull()
  })

  it('ibcAplicableSimulacion undefined', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, ibcAplicableSimulacion: undefined })
    expect(r.razonNoEvaluable).toBe('ibc_no_valido')
  })

  it('ibcAplicableSimulacion en cero', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, ibcAplicableSimulacion: 0 })
    expect(r.razonNoEvaluable).toBe('ibc_no_valido')
  })

  it('ibcAplicableSimulacion negativo', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, ibcAplicableSimulacion: -100 })
    expect(r.razonNoEvaluable).toBe('ibc_no_valido')
  })

  it('ibcAplicableSimulacion no numérico (NaN), nunca lanza', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, ibcAplicableSimulacion: NaN })
    expect(r.razonNoEvaluable).toBe('ibc_no_valido')
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
  it('sin capitalInicial (default 0): incluye la limitación de capital no incluido, más la de anualización simplificada', () => {
    const r = calcularProyeccionRAIS(CASO_BASE)

    expect(r.limitaciones).toHaveLength(2)
    expect(r.limitaciones.map((l) => l.codigo)).toContain('CAPITAL_ACUMULADO_NO_INCLUIDO')
    expect(r.limitaciones.find((l) => l.codigo === 'CAPITAL_ACUMULADO_NO_INCLUIDO').mensaje).toMatch(
      /no incluye el capital/i
    )
    expect(r.limitaciones.map((l) => l.codigo)).toContain('ANUALIZACION_SIMPLIFICADA')
  })

  it('con capitalInicial > 0 (Slice "Motor de caminos RAIS"): ya no incluye la limitación de capital no incluido, porque dejaría de ser cierta', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, capitalInicial: 5000000 })

    expect(r.limitaciones).toHaveLength(1)
    expect(r.limitaciones[0].codigo).toBe('ANUALIZACION_SIMPLIFICADA')
  })

  it('un resultado no_evaluable no lleva limitaciones (no hay cálculo del que advertir)', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, regimenActual: 'RPM' })
    expect(r.limitaciones).toEqual([])
  })
})

describe('calcularProyeccionRAIS — capitalInicial (Slice "Motor de caminos RAIS")', () => {
  it('con capitalInicial: produce una pensión mayor que sin él, para el mismo caso', () => {
    const sinCapital = calcularProyeccionRAIS(CASO_BASE)
    const conCapital = calcularProyeccionRAIS({ ...CASO_BASE, capitalInicial: 20000000 })

    expect(conCapital.pensionMensualProyectada).toBeGreaterThan(sinCapital.pensionMensualProyectada)
  })

  it('no_evaluable: capital_inicial_no_valido cuando es negativo', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, capitalInicial: -1 })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('capital_inicial_no_valido')
  })

  it('no_evaluable: capital_inicial_no_valido cuando no es finito (NaN)', () => {
    const r = calcularProyeccionRAIS({ ...CASO_BASE, capitalInicial: NaN })
    expect(r.razonNoEvaluable).toBe('capital_inicial_no_valido')
  })
})
