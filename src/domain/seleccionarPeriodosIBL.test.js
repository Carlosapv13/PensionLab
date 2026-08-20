import { describe, it, expect } from 'vitest'
import { seleccionarPeriodosIBL, diasCalendarioEnRango, calcularVentana } from './seleccionarPeriodosIBL.js'

const FECHA_CALCULO = '2026-01-01' // ventana esperada: 2016-01-01 a 2025-12-31

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

function periodoAnioCompleto(anio, ibc) {
  const dias = esBisiesto(anio) ? 366 : 365
  return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: dias }
}

function historiaDiezAniosCompleta() {
  const periodos = []
  for (let anio = 2016; anio <= 2025; anio++) {
    periodos.push(periodoAnioCompleto(anio, 1000000 + anio))
  }
  return periodos
}

describe('seleccionarPeriodosIBL — caso evaluable', () => {
  it('10 años calendario completos, sin huecos ni solapamientos → evaluable', () => {
    const resultado = seleccionarPeriodosIBL({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaCalculo: FECHA_CALCULO,
    })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.ventana).toEqual({ desde: '2016-01-01', hasta: '2025-12-31', anioInicio: 2016, anioFin: 2025 })
    expect(resultado.periodosOrdinario).toHaveLength(10)
    expect(resultado.periodosVidaLaboral).toHaveLength(10)
  })

  it('totalDiasCotizados suma los días de toda la historia, incluida fuera de la ventana', () => {
    // 2005-01-01 a 2015-12-31 tiene 4017 días calendario (11 años, 2 bisiestos) — se usa un
    // valor menor a propósito, ya que fuera de la ventana la cotización parcial es válida.
    const historia = [
      { fechaDesde: '2005-01-01', fechaHasta: '2015-12-31', ibc: 900000, diasCotizados: 3000 },
      ...historiaDiezAniosCompleta(),
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    const diasVentana = historiaDiezAniosCompleta().reduce((acc, p) => acc + p.diasCotizados, 0)
    expect(resultado.evaluable).toBe(true)
    expect(resultado.totalDiasCotizados).toBe(3000 + diasVentana)
    expect(resultado.periodosVidaLaboral).toHaveLength(11) // incluye el período previo a la ventana
  })

  it('8750 días cotizados producen exactamente 1250 semanas (8750 / 7) — solo aritmética de fechas, sin IPC', () => {
    // Esta función no conoce IPC ni data/legal: puede probarse con años fuera del rango
    // verificado de ipc-historico.json sin comprometer la disciplina de datos económicos
    // reales — aquí solo se suman diasCotizados, ninguna cifra se presenta como IPC.
    const historia = [
      { fechaDesde: '1990-01-01', fechaHasta: '2004-12-31', ibc: 900000, diasCotizados: 5097 },
      ...historiaDiezAniosCompleta(), // 3653 días
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.totalDiasCotizados).toBe(8750)
    expect(resultado.totalDiasCotizados / 7).toBe(1250)
  })

  it('un hueco FUERA de la ventana no bloquea la evaluabilidad (la ambigüedad normativa es específica de los últimos 10 años)', () => {
    // Historia sin nada entre 2005 y 2015 (hueco), pero la ventana 2016-2025 sigue completa.
    const historia = [{ fechaDesde: '2000-01-01', fechaHasta: '2004-12-31', ibc: 800000, diasCotizados: 1827 }, ...historiaDiezAniosCompleta()]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.periodosVidaLaboral).toHaveLength(11)
  })

  it('recorta los períodos de periodosOrdinario exactamente a los bordes de la ventana', () => {
    const historia = [
      { fechaDesde: '2015-06-01', fechaHasta: '2016-12-31', ibc: 1000000, diasCotizados: 580 }, // cruza el borde inicial de la ventana
      ...historiaDiezAniosCompleta().slice(1), // 2017-2025
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado.evaluable).toBe(true)
    const primerPeriodoOrdinario = resultado.periodosOrdinario.find((p) => p.fechaDesde === '2016-01-01')
    expect(primerPeriodoOrdinario).toBeDefined()
    expect(primerPeriodoOrdinario.fechaHasta).toBe('2016-12-31')
  })
})

describe('seleccionarPeriodosIBL — no evaluable', () => {
  it('un hueco DENTRO de la ventana → VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS', () => {
    const historia = historiaDiezAniosCompleta().filter((p) => !p.fechaDesde.startsWith('2020'))
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS' })
  })

  it('historia vacía → VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS', () => {
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: [], fechaCalculo: FECHA_CALCULO })
    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS' })
  })

  it('dos períodos que se solapan → PERIODOS_SUPERPUESTOS_NO_SOPORTADOS', () => {
    const historia = [
      ...historiaDiezAniosCompleta(),
      { fechaDesde: '2020-06-01', fechaHasta: '2020-08-31', ibc: 1200000, diasCotizados: 92 }, // se solapa con el período de 2020
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS' })
  })

  it('diasCotizados mayor a los días calendario del rango → INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS', () => {
    const historia = [
      ...historiaDiezAniosCompleta().slice(0, 9),
      { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 400 }, // imposible: el rango tiene 365 días
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS' })
  })

  it('cotización parcial dentro de la ventana → COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA, distinto de VACIOS', () => {
    const historia = [
      ...historiaDiezAniosCompleta().slice(0, 9),
      { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 200 }, // cubre el rango calendario, pero no todos sus días
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA' })
  })

  it('cotización parcial FUERA de la ventana no produce COTIZACION_PARCIAL (esa evidencia sí es válida para vida laboral)', () => {
    const historia = [
      { fechaDesde: '2010-01-01', fechaHasta: '2010-12-31', ibc: 800000, diasCotizados: 100 }, // parcial, pero fuera de la ventana
      ...historiaDiezAniosCompleta(),
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_CALCULO })

    expect(resultado.evaluable).toBe(true)
  })
})

// Cobertura directa agregada en S4-001 (captura de historia RPM estructurada real):
// diasCalendarioEnRango gana un segundo consumidor real fuera de este archivo
// (src/pages/HistoriaCotizacionRPM.helpers.js) y pasa a exportarse — mismo
// comportamiento ya usado indirectamente arriba, ahora probado de forma directa.
describe('diasCalendarioEnRango', () => {
  it('un solo día calendario cuenta como 1 (inclusive en ambos extremos)', () => {
    expect(diasCalendarioEnRango('2023-05-10', '2023-05-10')).toBe(1)
  })

  it('un mes completo de 31 días', () => {
    expect(diasCalendarioEnRango('2023-01-01', '2023-01-31')).toBe(31)
  })

  it('respeta año bisiesto (2024, febrero de 29 días)', () => {
    expect(diasCalendarioEnRango('2024-01-01', '2024-12-31')).toBe(366)
  })

  it('respeta año no bisiesto (2023)', () => {
    expect(diasCalendarioEnRango('2023-01-01', '2023-12-31')).toBe(365)
  })

  it('un rango que cruza varios años cuenta los días calendario totales', () => {
    expect(diasCalendarioEnRango('2023-12-30', '2024-01-02')).toBe(4) // 30, 31, 1, 2
  })
})

// Cobertura directa agregada en la revisión de S4-001 (Entregable 2): calcularVentana gana un
// segundo consumidor real fuera de este archivo (src/pages/HistoriaCotizacionRPM.jsx) y pasa a
// exportarse — mismo comportamiento ya usado indirectamente arriba, ahora probado de forma directa.
describe('calcularVentana', () => {
  it('devuelve los 10 años calendario completos inmediatamente anteriores al año de fechaCalculo', () => {
    expect(calcularVentana('2026-01-01')).toEqual({
      desde: '2016-01-01',
      hasta: '2025-12-31',
      anioInicio: 2016,
      anioFin: 2025,
    })
  })

  it('funciona igual sin importar el mes/día exacto de fechaCalculo dentro del año', () => {
    expect(calcularVentana('2026-08-19')).toEqual({
      desde: '2016-01-01',
      hasta: '2025-12-31',
      anioInicio: 2016,
      anioFin: 2025,
    })
  })
})
