import { describe, it, expect } from 'vitest'
import { resolverSupuestosVigentes, obtenerSupuesto } from './index.js'

describe('resolverSupuestosVigentes', () => {
  it('devuelve los 3 supuestos aprobados de RAIS vigentes en una fecha posterior a su aprobación, previa a ibcConstanteEnTerminosReales', () => {
    const supuestos = resolverSupuestosVigentes('2026-08-06')
    const campos = supuestos.map((s) => s.campo).sort()

    expect(campos).toEqual([
      'descuentoSobreAporteCapitalizable',
      'mesesPayoutSimplificado',
      'rentabilidadEsperadaRAIS',
    ])
  })

  it('incluye ibcConstanteEnTerminosReales (Convención Económica v1) desde su fecha de vigencia', () => {
    const supuestos = resolverSupuestosVigentes('2026-08-09')
    const campos = supuestos.map((s) => s.campo).sort()

    expect(campos).toEqual([
      'descuentoSobreAporteCapitalizable',
      'ibcConstanteEnTerminosReales',
      'mesesPayoutSimplificado',
      'rentabilidadEsperadaRAIS',
    ])
  })

  it('excluye supuestos antes de su fecha de vigencia', () => {
    const supuestos = resolverSupuestosVigentes('2026-01-01')
    expect(supuestos).toEqual([])
  })
})

describe('obtenerSupuesto', () => {
  it('resuelve rentabilidadEsperadaRAIS con su trazabilidad', () => {
    const resultado = obtenerSupuesto('2026-08-06', 'rentabilidadEsperadaRAIS')

    expect(resultado.valor).toBe(0.035)
    expect(resultado.id).toBe('rentabilidad-esperada-rais-2026')
    expect(resultado.vigenciaDesde).toBe('2026-07-30')
    expect(resultado.vigenciaHasta).toBeNull()
  })

  it('resuelve descuentoSobreAporteCapitalizable', () => {
    const resultado = obtenerSupuesto('2026-08-06', 'descuentoSobreAporteCapitalizable')
    expect(resultado.valor).toBe(0.1875)
  })

  it('resuelve mesesPayoutSimplificado', () => {
    const resultado = obtenerSupuesto('2026-08-06', 'mesesPayoutSimplificado')
    expect(resultado.valor).toBe(240)
  })

  it('resuelve ibcConstanteEnTerminosReales (Convención Económica v1) con su trazabilidad', () => {
    const resultado = obtenerSupuesto('2026-08-09', 'ibcConstanteEnTerminosReales')

    expect(resultado.valor).toBe(true)
    expect(resultado.id).toBe('ibc-constante-terminos-reales-2026')
    expect(resultado.vigenciaDesde).toBe('2026-08-09')
    expect(resultado.vigenciaHasta).toBeNull()
  })

  it('ibcConstanteEnTerminosReales no está vigente antes de su fecha de aprobación', () => {
    expect(() => obtenerSupuesto('2026-08-06', 'ibcConstanteEnTerminosReales')).toThrow(
      /no se encontró 'ibcConstanteEnTerminosReales'/
    )
  })

  it('lanza un error explícito si el campo no existe vigente para la fecha', () => {
    expect(() => obtenerSupuesto('2026-08-06', 'campoInexistente')).toThrow(
      /no se encontró 'campoInexistente'/
    )
  })

  it('lanza un error explícito si la fecha es anterior a la vigencia', () => {
    expect(() => obtenerSupuesto('2026-01-01', 'rentabilidadEsperadaRAIS')).toThrow(
      /no se encontró 'rentabilidadEsperadaRAIS'/
    )
  })
})
