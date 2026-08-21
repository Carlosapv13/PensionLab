import { describe, it, expect } from 'vitest'
import { calcularPensionRPM } from './calcularPensionRPM.js'
import { seleccionarPeriodosIBL } from '../seleccionarPeriodosIBL.js'
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
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBe('SEMANAS_OBSERVADAS_INSUFICIENTES')
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
  it('un hueco de un año completo, sin más historia disponible dentro del rango de IPC cargado (2015-2025) → HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA', () => {
    // A diferencia del selector puro (seleccionarPeriodosIBL.test.js), aquí el hueco no
    // puede "saltarse" retrocediendo más atrás de 2016 sin salir del rango de
    // ipc-historico.json — por eso este caso queda insuficiente, no por el hueco en sí,
    // sino porque no hay más historia real utilizable para completarlo.
    const historia = historiaDiezAniosCompleta().filter((p) => !p.fechaDesde.startsWith('2020'))
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })

    expect(resultado).toEqual({
      estado: 'no_evaluable',
      razonNoEvaluable: 'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA',
      ibl: null,
      totalDiasCotizados: null,
      semanasObservadas: null,
      tasaReemplazo: null,
      resultadoEconomicoActual: null,
      limitaciones: [],
      trazabilidadVentana: expect.any(Object),
      datosFaltantes: null,
    })
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(3653 - 366) // 2020 era bisiesto
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toEqual([
      { fechaDesde: '2020-01-01', fechaHasta: '2020-12-31', diasCalendario: 366 },
    ])
  })

  it('un hueco pequeño (3 días) dentro de la historia real 2016-2025 no bloquea — la ventana se completa igual y el hueco queda trazado', () => {
    const historia = historiaDiezAniosCompleta().map((p) =>
      p.fechaDesde === '2020-01-01' ? { ...p, fechaHasta: '2020-12-28', diasCotizados: 363 } : p
    )
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.ibl.ordinario.valor).toBeGreaterThan(0)
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(3650)
    expect(resultado.trazabilidadVentana.tramoInicialParcial).toBeNull() // encaja exacto, sin recortar 2016
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toEqual([
      { fechaDesde: '2020-12-29', fechaHasta: '2020-12-31', diasCalendario: 3 },
    ])
  })

  it('sin historia declarada → no_evaluable, no lanza excepción', () => {
    const resultado = calcularPensionRPM({ fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(0)
  })

  it('períodos superpuestos → no_evaluable con PERIODOS_SUPERPUESTOS_NO_SOPORTADOS', () => {
    const historia = [
      ...historiaDiezAniosCompleta(),
      { fechaDesde: '2020-06-01', fechaHasta: '2020-08-31', ibc: 1200000, diasCotizados: 92 },
    ]
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('PERIODOS_SUPERPUESTOS_NO_SOPORTADOS')
    expect(resultado.trazabilidadVentana).toBeNull()
  })

  it('diasCotizados inconsistente → no_evaluable con INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS', () => {
    const historia = [...historiaDiezAniosCompleta().slice(0, 9), { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 400 }]
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS')
    expect(resultado.trazabilidadVentana).toBeNull()
  })

  it('el período límite ya era en sí mismo parcial → no_evaluable con COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA, sin fabricar una fechaDesde', () => {
    const historia = [
      { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1200000, diasCotizados: 365 }, // completo, restante = 3285
      { fechaDesde: '2000-01-01', fechaHasta: '2024-12-31', ibc: 900000, diasCotizados: 3300 }, // parcial (rango real ~9131 días), y 3300 > restante
    ]
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA')
    expect(resultado.trazabilidadVentana.tramoInicialParcial).toBeNull()
  })
})

describe('calcularPensionRPM — Caso 7: suficiencia temporal vs. cobertura económica (IPC), separadas', () => {
  it('historia con 3.650 días efectivos que caen fuera de ipc-historico.json → no_evaluable con COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO, nunca HISTORIA_INSUFICIENTE, conservando la trazabilidad temporal completa', () => {
    // Caso real encontrado durante la revisión del Slice correctivo: un único período
    // 2005-01-01 a 2015-05-31 (3.803 días) con fecha de cálculo 2015-06-01. La ventana
    // ordinaria retrocede hasta completar exactamente 3.650 días (2005-06-03 a 2015-05-31),
    // pero ese rango toca años 2005-2014, fuera de ipc-historico.json (cubre 2015-2025).
    const historia = [{ fechaDesde: '2005-01-01', fechaHasta: '2015-05-31', ibc: 1000000, diasCotizados: 3803 }]
    const fecha = '2015-06-01'

    const seleccion = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: fecha })
    expect(seleccion.evaluable).toBe(true)
    expect(seleccion.trazabilidadVentana.diasEfectivosAcumulados).toBe(3650)

    let resultado
    expect(() => {
      resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha })
    }).not.toThrow()

    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO')
    expect(resultado.razonNoEvaluable).not.toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(3650)
    expect(resultado.trazabilidadVentana.periodosUsados).toEqual([
      { fechaDesde: '2005-06-03', fechaHasta: '2015-05-31', ibc: 1000000, diasCotizados: 3650 },
    ])
    expect(resultado.datosFaltantes.ipcAnios).toEqual([2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014])
  })

  // No encontré una manera realista, sin artificios, de provocar una excepción DISTINTA a
  // "falta IPC" en el camino ordinario de calcularPensionRPM con datos reales: el nuevo
  // chequeo (aniosIPCFaltantes) usa exactamente el mismo cómputo de años que
  // calcularPromedioIBL usa internamente, así que si el chequeo pasa, calcularPromedioIBL no
  // puede fallar por IPC faltante en esa misma llamada — y su única otra excepción posible
  // (sumaPesos === 0, periodos vacíos) es estructuralmente inalcanzable aquí porque
  // seleccionarPeriodosIBL ya garantiza 3.650 días reales cuando evaluable es true. Todo lo
  // que ocurre después (obtenerSmlv, obtenerParametrosTasaReemplazoRPM, calcularTasaReemplazoRPM,
  // formulaRPM) queda fuera de cualquier try/catch de este Slice — no cambió con este cambio,
  // así que no hay una superficie nueva que pueda estar tragándose sus excepciones. En su
  // lugar, esta prueba confirma directamente, a nivel de la función que sí lanza esa otra
  // excepción, que sigue lanzándola sin que nada en este Slice la intercepte.
  it('calcularPromedioIBL sigue lanzando su propia excepción (no relacionada con IPC faltante) sin que nada de este Slice la intercepte', () => {
    expect(() =>
      calcularPromedioIBL({ periodos: [], tablaIPC: { 2025: 172.93 }, anioReferenciaIPC: 2025 })
    ).toThrow('calcularPromedioIBL: no hay períodos con días cotizados para promediar')
  })
})

// historiaDiezAniosCompleta() ya cubre 2016-2025 (~522 semanas). Para probar la ruta de vida
// laboral con datos reales hace falta declarar años adicionales anteriores, sin solaparse con
// esa ventana — 2000-2015 agrega ~16 años más, total ~26 años (~1356 semanas), por encima del
// umbral de 1250 y con margen suficiente para no depender de un cálculo exacto al límite.
function historiaVeintiseisAnios() {
  const periodos = []
  for (let anio = 2000; anio <= 2015; anio++) periodos.push(periodoAnioCompleto(anio, 900000 + anio))
  return [...periodos, ...historiaDiezAniosCompleta()]
}

describe('calcularPensionRPM — Caso 6b: vida laboral con historia real que excede la cobertura de IPC', () => {
  it('no lanza excepción — declara DATOS_LEGALES_INSUFICIENTES en vez de propagar el error de IPC faltante', () => {
    const resultado = calcularPensionRPM({ historiaCotizacion: historiaVeintiseisAnios(), fecha: FECHA_CALCULO })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.semanasObservadas).toBeGreaterThan(1250) // supera el umbral con datos reales
    expect(resultado.ibl.vidaLaboral).toBeNull()
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBe('DATOS_LEGALES_INSUFICIENTES')
    expect(resultado.ibl.esOpcionLegal).toBe(false)
    expect(resultado.ibl.aplicable).toBe(resultado.ibl.ordinario.valor) // sigue usando el ordinario, sí evaluado
  })
})

describe('calcularPensionRPM — Caso 6: usa los valores reales de IPC de la tabla versionada', () => {
  it('el IBL ordinario coincide con un recálculo independiente sobre la misma tabla de IPC real, aplicado a la ventana ya recortada a 3.650 días (no a la historia cruda)', () => {
    const historia = historiaDiezAniosCompleta() // 3653 días — el selector recorta 3 días de 2016 antes de promediar
    const resultado = calcularPensionRPM({ historiaCotizacion: historia, fecha: FECHA_CALCULO })

    const esperado = calcularPromedioIBL({
      periodos: resultado.trazabilidadVentana.periodosUsados,
      tablaIPC: TABLA_IPC_REAL,
      anioReferenciaIPC: 2025,
    })

    expect(
      resultado.trazabilidadVentana.periodosUsados.reduce((acc, p) => acc + p.diasCotizados, 0)
    ).toBe(3650)
    expect(resultado.ibl.ordinario.valor).toBeCloseTo(esperado.promedio, 6)
  })
})
