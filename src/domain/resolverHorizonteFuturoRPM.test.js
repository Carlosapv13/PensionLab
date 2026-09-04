import { describe, it, expect } from 'vitest'
import { resolverHorizonteFuturoRPM } from './resolverHorizonteFuturoRPM.js'
import { calcularFechaPorEdad } from './calcularFechaPorEdad.js'
import { diasCalendarioEnRango, diaSiguiente } from './seleccionarPeriodosIBL.js'

describe('resolverHorizonteFuturoRPM', () => {
  it('horizonte válido: fechaObjetivo/fechaInicioFuturo/diasFuturos coinciden con las fórmulas ya aprobadas, invocadas de forma independiente', () => {
    const fechaNacimiento = '1964-06-15'
    const edadObjetivo = 62
    const fecha = '2026-01-01'
    const r = resolverHorizonteFuturoRPM({ fechaNacimiento, edadObjetivo, fecha })

    expect(r.valido).toBe(true)
    expect(r.razonInvalido).toBeNull()
    expect(r.fechaCalculo).toBe(fecha)
    expect(r.fechaObjetivo).toBe(calcularFechaPorEdad(fechaNacimiento, edadObjetivo))
    expect(r.fechaInicioFuturo).toBe(diaSiguiente(fecha))
    expect(r.diasFuturos).toBe(diasCalendarioEnRango(diaSiguiente(fecha), calcularFechaPorEdad(fechaNacimiento, edadObjetivo)))
  })

  it('fecha objetivo igual a la fecha de cálculo (horizonte cero): inválido', () => {
    const fechaNacimiento = '1964-01-01'
    const fecha = '2026-01-01' // persona cumple 62 exactamente hoy
    const r = resolverHorizonteFuturoRPM({ fechaNacimiento, edadObjetivo: 62, fecha })
    expect(r.valido).toBe(false)
    expect(r.razonInvalido).toBe('FECHA_OBJETIVO_NO_POSTERIOR_A_FECHA_CALCULO')
    expect(r.diasFuturos).toBeNull()
  })

  it('fecha objetivo anterior a la fecha de cálculo: inválido', () => {
    const r = resolverHorizonteFuturoRPM({ fechaNacimiento: '1960-01-01', edadObjetivo: 50, fecha: '2026-01-01' })
    expect(r.valido).toBe(false)
    expect(r.razonInvalido).toBe('FECHA_OBJETIVO_NO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('horizonte de un solo día: válido, diasFuturos = 1', () => {
    const fechaNacimiento = '1964-01-01'
    const fecha = '2025-12-31' // cumple 62 el día siguiente
    const r = resolverHorizonteFuturoRPM({ fechaNacimiento, edadObjetivo: 62, fecha })
    expect(r.valido).toBe(true)
    expect(r.diasFuturos).toBe(1)
  })

  it('determinismo: misma entrada produce el mismo resultado', () => {
    const input = { fechaNacimiento: '1970-03-10', edadObjetivo: 57, fecha: '2026-01-01' }
    expect(resolverHorizonteFuturoRPM(input)).toEqual(resolverHorizonteFuturoRPM(input))
  })
})
