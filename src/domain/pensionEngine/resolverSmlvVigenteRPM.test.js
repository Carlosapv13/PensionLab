import { describe, it, expect } from 'vitest'
import { resolverSmlvVigenteRPM } from './resolverSmlvVigenteRPM.js'

describe('resolverSmlvVigenteRPM — fechas de frontera de la cadena normativa real 2026 (mismas de E3-A)', () => {
  it('2026-02-11 (Decreto 1469/2025, firme): encontrado, apto', () => {
    const r = resolverSmlvVigenteRPM('2026-02-11')
    expect(r.encontrado).toBe(true)
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.tipoVigencia).toBe('firme')
    expect(r.valor).toBe(1750905)
  })

  it('2026-02-12 (expedición del auto, efecto no confirmado): encontrado, NO apto, FUNDAMENTO_NORMATIVO_NO_VERIFICADO', () => {
    const r = resolverSmlvVigenteRPM('2026-02-12')
    expect(r.encontrado).toBe(true)
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.tipoVigencia).toBe('fundamento_no_verificado')
    expect(r.advertencia.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    // El valor se conserva como referencia histórica, nunca declarado apto.
    expect(r.valor).toBe(1750905)
  })

  it('2026-02-18 (último día de la ventana no verificada): mismo comportamiento que el 12 de febrero', () => {
    const r = resolverSmlvVigenteRPM('2026-02-18')
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.tipoVigencia).toBe('fundamento_no_verificado')
    expect(r.advertencia.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
  })

  it('2026-02-19 (Decreto 0159/2026, expedición/publicación real): apto', () => {
    const r = resolverSmlvVigenteRPM('2026-02-19')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.tipoVigencia).toBe('vigente_con_litigio')
  })

  it('2026-07-16 (último día del Decreto 0159/2026): apto', () => {
    const r = resolverSmlvVigenteRPM('2026-07-16')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
  })

  it('2026-07-17 (Decreto 1469/2025 reactivado): apto', () => {
    const r = resolverSmlvVigenteRPM('2026-07-17')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.tipoVigencia).toBe('vigente_con_litigio')
  })
})

describe('resolverSmlvVigenteRPM — litigio pendiente sin suspensión (hoy)', () => {
  it('hoy (2026-09-07, misma fecha ya probada en E3-A): apto, con litigioPendiente=true y medidaCautelarActiva=false', () => {
    const r = resolverSmlvVigenteRPM('2026-09-07')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.litigioPendiente).toBe(true)
    expect(r.medidaCautelarActiva).toBe(false)
    expect(r.advertencia.codigo).toBe('LITIGIO_DE_FONDO_PENDIENTE')
  })
})

describe('resolverSmlvVigenteRPM — ausencia real de regla (fecha VÁLIDA, sin cobertura — nunca inventa SMLV histórico)', () => {
  it('fecha anterior a la cobertura disponible (2025-06-15): pasa la validación de formato, encontrado=false, FUENTE_LEGAL_NO_ENCONTRADA', () => {
    const r = resolverSmlvVigenteRPM('2025-06-15')
    expect(r.encontrado).toBe(false)
    expect(r.valor).toBeNull()
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.advertencia.codigo).toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    expect(r.fechaBase).toBe('2025-06-15')
    expect(r.tipoVigencia).toBeNull()
    // Distinción explícita: una fecha VÁLIDA sin cobertura nunca se confunde con una fecha
    // INVÁLIDA (caso siguiente) ni con un SMLV que existe pero no es apto por vigencia.
    expect(r.advertencia.codigo).not.toBe('FECHA_BASE_MONETARIA_INVALIDA')
    expect(r.advertencia.codigo).not.toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
  })
})

// Cierre de diseño, cuarta ronda (2026-09-08): una función que declara aptitud JURÍDICA no
// puede limitarse a "no lanzar" ante una fecha inválida — debe rechazarla explícitamente,
// ANTES de tocar data/legal, con un código propio (FECHA_BASE_MONETARIA_INVALIDA) que nunca
// se confunda con "la fuente no cubre esta fecha" (FUENTE_LEGAL_NO_ENCONTRADA, caso anterior:
// ahí la fecha SÍ era válida, solo que ninguna regla la cubre).
describe('resolverSmlvVigenteRPM — fechaBaseMonetaria inválida (rechazo explícito, antes de consultar data/legal)', () => {
  const casosInvalidos = [
    ['undefined', undefined],
    ['null', null],
    ['cadena vacía', ''],
    ["'no-es-fecha'", 'no-es-fecha'],
    ["'2026-13-01' (mes fuera de rango)", '2026-13-01'],
    ["'2026-02-30' (día fuera de rango — el motor JS la recorre en silencio al 2026-03-02, esFechaValida sola no lo detecta)", '2026-02-30'],
  ]

  for (const [descripcion, valor] of casosInvalidos) {
    it(`${descripcion}: no apto, FECHA_BASE_MONETARIA_INVALIDA, valor null, nunca lanza`, () => {
      expect(() => resolverSmlvVigenteRPM(valor)).not.toThrow()
      const r = resolverSmlvVigenteRPM(valor)
      expect(r.encontrado).toBe(false)
      expect(r.valor).toBeNull()
      expect(r.aptoParaCalculoEnFechaBase).toBe(false)
      expect(r.tipoVigencia).toBeNull()
      expect(r.advertencia.codigo).toBe('FECHA_BASE_MONETARIA_INVALIDA')
      // Nunca se confunde con "fecha válida sin cobertura".
      expect(r.advertencia.codigo).not.toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    })
  }
})
