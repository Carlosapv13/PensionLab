import { describe, it, expect } from 'vitest'
import { calcularPensionRPM } from './calcularPensionRPM.js'
import { calcularPromedioIBL } from '../formulas/formulaIBL.js'

// fecha de cálculo fija para todos los casos: ventana de evaluabilidad = 2016-01-01 a
// 2025-12-31, año de referencia IPC = 2025 — todos dentro del rango 2015-2025 verificado
// por búsqueda web (ver ipc-historico.json).
const FECHA_CALCULO = '2026-01-01'

// Mismos valores que data/legal/versions/ipc-historico.json — duplicados aquí a propósito
// para que estos tests detecten un cambio accidental en el archivo real, no para
// reemplazarlo: son tests de integración del orquestador, no matemática pura, así que usan
// los mismos valores reales (no sintéticos) que data/legal expone. Cubre solo 2015-2025:
// ipc-historico.json ya no tiene años anteriores no verificados (ver su 'notas').
const TABLA_IPC_REAL = {
  2015: 100.0, 2016: 105.75, 2017: 110.08, 2018: 113.58, 2019: 117.89,
  2020: 119.79, 2021: 126.52, 2022: 143.12, 2023: 156.41, 2024: 164.54, 2025: 172.93,
}

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

function diasEnAnio(anio) {
  return esBisiesto(anio) ? 366 : 365
}

function periodoAnioCompleto(anio, ibc) {
  return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: diasEnAnio(anio) }
}

function historiaDiezAniosCompleta() {
  const periodos = []
  for (let anio = 2016; anio <= 2025; anio++) periodos.push(periodoAnioCompleto(anio, 1000000 + anio))
  return periodos
}

describe('calcularPensionRPM — Caso 1: evaluable, sin alternativa (< 1250 semanas)', () => {
  it('calcula IBL ordinario, semanas observadas, tasa y resultado económico actual', () => {
    const resultado = calcularPensionRPM({ historiaCotizacion: historiaDiezAniosCompleta(), fecha: FECHA_CALCULO })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.razonNoEvaluable).toBeNull()
    expect(resultado.ibl.ordinario.valor).toBeGreaterThan(0)
    expect(resultado.ibl.vidaLaboral).toBeNull() // 10 años ≈ 522 semanas, muy por debajo de 1250
    expect(resultado.ibl.esOpcionLegal).toBe(false)
    expect(resultado.ibl.aplicable).toBe(resultado.ibl.ordinario.valor)
    expect(resultado.semanasObservadas).toBeGreaterThan(0)
    expect(resultado.tasaReemplazo).toBeGreaterThan(0)
    expect(resultado.resultadoEconomicoActual).toBeGreaterThan(0)
  })

  it('declara la limitación NO_ES_PROYECCION_A_EDAD_OBJETIVO — nunca se presenta como pensión futura', () => {
    const resultado = calcularPensionRPM({ historiaCotizacion: historiaDiezAniosCompleta(), fecha: FECHA_CALCULO })
    expect(resultado.limitaciones.map((l) => l.codigo)).toContain('NO_ES_PROYECCION_A_EDAD_OBJETIVO')
  })

  it('semanasObservadas = totalDiasCotizados / 7, sin redondeo silencioso (3653 días → decimal exacto)', () => {
    const resultado = calcularPensionRPM({ historiaCotizacion: historiaDiezAniosCompleta(), fecha: FECHA_CALCULO })

    expect(resultado.totalDiasCotizados).toBe(3653) // 2016-2025, 3 años bisiestos (2016/2020/2024)
    expect(resultado.semanasObservadas).toBeCloseTo(3653 / 7, 10)
    expect(Number.isInteger(resultado.semanasObservadas)).toBe(false)
  })
})

// Casos 2-4 del diseño original (evaluable CON alternativa de vida laboral, ≥1250 semanas
// ≈ 24 años, y las dos direcciones posibles de la comparación IBL ordinario vs. vida
// laboral) NO tienen cobertura de integración en este archivo: exigirían historia real
// cubierta por IPC verificado más allá del rango 2015-2025 que hoy tiene
// ipc-historico.json, y no se amplió esa tabla con datos no verificados para conservar
// estos tests en verde (ver informe de la ronda de corrección). La propiedad matemática
// que esos casos querían demostrar — que el IBL ordinario puede ser mayor O menor que el
// de vida laboral según la tendencia real del ingreso, sin heurística que lo prejuzgue —
// sí queda probada con datos sintéticos, legítimos en un test de matemática pura, en
// formulaIBL.test.js ("comparación IBL ordinario vs. vida laboral"). Lo que NO queda
// probado aquí es el cableado específico de calcularPensionRPM.js (el gate ≥1250, la
// comparación esOpcionLegal, ibl.aplicable) contra datos reales de esa magnitud temporal.

describe('calcularPensionRPM — Caso 5: no evaluable', () => {
  it('un hueco dentro de la ventana produce no_evaluable con razón estructurada, nunca una cifra inventada', () => {
    const historia = historiaDiezAniosCompleta().filter((p) => !p.fechaDesde.startsWith('2020'))
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })

    expect(resultado).toEqual({
      estado: 'no_evaluable',
      razonNoEvaluable: 'VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS',
      ibl: null,
      totalDiasCotizados: null,
      semanasObservadas: null,
      tasaReemplazo: null,
      resultadoEconomicoActual: null,
      limitaciones: [],
    })
  })

  it('sin historia declarada → no_evaluable, no lanza excepción', () => {
    const resultado = calcularPensionRPM({ fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS')
  })

  it('períodos superpuestos → no_evaluable con PERIODOS_SUPERPUESTOS_NO_SOPORTADOS', () => {
    const historia = [
      ...historiaDiezAniosCompleta(),
      { fechaDesde: '2020-06-01', fechaHasta: '2020-08-31', ibc: 1200000, diasCotizados: 92 },
    ]
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('PERIODOS_SUPERPUESTOS_NO_SOPORTADOS')
  })

  it('diasCotizados inconsistente → no_evaluable con INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS', () => {
    const historia = [...historiaDiezAniosCompleta().slice(0, 9), { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 400 }]
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS')
  })

  it('cotización parcial dentro de la ventana → no_evaluable con COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA', () => {
    const historia = [...historiaDiezAniosCompleta().slice(0, 9), { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 200 }]
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA')
  })
})

describe('calcularPensionRPM — Caso 6: usa los valores reales de IPC de la tabla versionada', () => {
  it('el IBL ordinario coincide con un recálculo independiente sobre la misma tabla de IPC real', () => {
    const historia = historiaDiezAniosCompleta()
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })

    const esperado = calcularPromedioIBL({
      periodos: historia,
      tablaIPC: TABLA_IPC_REAL,
      anioReferenciaIPC: 2025,
    })

    expect(resultado.ibl.ordinario.valor).toBeCloseTo(esperado.promedio, 6)
  })
})
