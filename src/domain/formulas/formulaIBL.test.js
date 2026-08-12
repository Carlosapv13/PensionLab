import { describe, it, expect } from 'vitest'
import { dividirPeriodoPorAnio, indexarIBC, calcularPromedioIBL } from './formulaIBL.js'

// Los 3 casos documentados en trazabilidad-formula-IBL.md

describe('dividirPeriodoPorAnio', () => {
  it('caso C — un período que cruza un límite de año se divide en tramos con sus días calendario', () => {
    const tramos = dividirPeriodoPorAnio('2023-11-15', '2024-02-10')

    expect(tramos).toEqual([
      { anio: 2023, dias: 47 }, // 15-30 nov (16) + 31 dic = 47
      { anio: 2024, dias: 41 }, // 31 ene + 10 feb = 41
    ])
  })

  it('un período dentro de un solo año produce un único tramo', () => {
    const tramos = dividirPeriodoPorAnio('2025-01-01', '2025-12-31')
    expect(tramos).toEqual([{ anio: 2025, dias: 365 }])
  })

  it('un período de un solo día produce un tramo de 1 día', () => {
    const tramos = dividirPeriodoPorAnio('2025-06-15', '2025-06-15')
    expect(tramos).toEqual([{ anio: 2025, dias: 1 }])
  })
})

describe('indexarIBC', () => {
  it('sin variación de IPC, el IBC indexado es igual al original', () => {
    expect(indexarIBC({ ibc: 1000, ipcOrigen: 100, ipcReferencia: 100 })).toBe(1000)
  })

  it('aplica el factor IPC_referencia / IPC_origen', () => {
    expect(indexarIBC({ ibc: 1000, ipcOrigen: 100, ipcReferencia: 105 })).toBeCloseTo(1050, 10)
  })
})

describe('calcularPromedioIBL', () => {
  it('caso A — un solo período dentro de un año: el promedio es el IBC indexado de ese año', () => {
    const resultado = calcularPromedioIBL({
      periodos: [{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000, diasCotizados: 365 }],
      tablaIPC: { 2024: 100, 2025: 105 },
      anioReferenciaIPC: 2025,
    })

    expect(resultado.promedio).toBeCloseTo(1050, 8)
    expect(resultado.detalle).toHaveLength(1)
    expect(resultado.detalle[0]).toMatchObject({ anio: 2025, ibcIndexado: 1050, dias: 365 })
  })

  it('caso B — un período que cruza un año se promedia ponderado por los días de cada tramo', () => {
    const resultado = calcularPromedioIBL({
      periodos: [{ fechaDesde: '2024-07-01', fechaHasta: '2025-06-30', ibc: 1000, diasCotizados: 365 }],
      tablaIPC: { 2023: 90, 2024: 100, 2025: 105 },
      anioReferenciaIPC: 2025,
    })

    // tramo 2024 (184 días): ibc indexado = 1000 * 105/90 = 1166.6667
    // tramo 2025 (181 días): ibc indexado = 1000 * 105/100 = 1050
    // promedio = (1166.6667*184 + 1050*181) / 365
    expect(resultado.promedio).toBeCloseTo(1108.8128, 3)
    expect(resultado.detalle).toHaveLength(2)
    expect(resultado.detalle.map((d) => d.anio)).toEqual([2024, 2025])
    expect(resultado.detalle[0].dias).toBeCloseTo(184, 8)
    expect(resultado.detalle[1].dias).toBeCloseTo(181, 8)
  })

  it('varios períodos completos se promedian ponderados por diasCotizados de cada uno', () => {
    const resultado = calcularPromedioIBL({
      periodos: [
        { fechaDesde: '2024-01-01', fechaHasta: '2024-12-31', ibc: 1000, diasCotizados: 366 },
        { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 2000, diasCotizados: 365 },
      ],
      tablaIPC: { 2023: 100, 2024: 110, 2025: 121 },
      anioReferenciaIPC: 2025,
    })

    // 2024: ibc indexado = 1000 * 121/100 = 1210, peso 366
    // 2025: ibc indexado = 2000 * 121/110 = 2200, peso 365
    const esperado = (1210 * 366 + 2200 * 365) / (366 + 365)
    expect(resultado.promedio).toBeCloseTo(esperado, 8)
  })

  it('lanza un error explícito si falta el IPC de referencia', () => {
    expect(() =>
      calcularPromedioIBL({
        periodos: [{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000, diasCotizados: 365 }],
        tablaIPC: { 2024: 100 },
        anioReferenciaIPC: 2025,
      })
    ).toThrow(/falta IPC de referencia/)
  })

  it('lanza un error explícito si falta el IPC de origen de un año del tramo', () => {
    expect(() =>
      calcularPromedioIBL({
        periodos: [{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000, diasCotizados: 365 }],
        tablaIPC: { 2025: 105 },
        anioReferenciaIPC: 2025,
      })
    ).toThrow(/falta IPC de origen/)
  })
})

// Propiedad matemática (no un dato económico real — tablaIPC es sintética a propósito,
// legítimo en un test de matemática pura): el IBL de los últimos 10 años puede resultar
// MAYOR o MENOR que el de toda la vida laboral según cómo se comportó el ingreso real, no
// según ninguna heurística ("toda la vida laboral casi siempre es superior" es la
// afirmación que esta propiedad refuta — ver investigación normativa del Slice). Se
// calculan aquí ambos promedios directamente, igual que lo haría calcularPensionRPM.js,
// pero sin pasar por data/legal — esta es la cobertura de la propiedad que en la ronda
// anterior vivía como test de integración en calcularPensionRPM.test.js con datos
// reales de 24 años; se movió aquí al retirar de data/legal el IPC no verificado que
// esos años necesitaban (ver informe de la ronda de corrección).
describe('calcularPromedioIBL — comparación IBL ordinario vs. vida laboral', () => {
  const TABLA_IPC_SINTETICA = {}
  for (let anio = 2000; anio <= 2025; anio++) {
    TABLA_IPC_SINTETICA[anio] = 100 * Math.pow(1.06, anio - 2000) // 6% anual, solo para el test
  }

  function esBisiesto(anio) {
    return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
  }

  // ibc construido para que, una vez indexado, su valor resulte SIEMPRE `valorReal` sin
  // importar el año — construcción de prueba, no un supuesto económico real.
  function periodoConValorRealConstante(anio, valorReal) {
    const ibc = (valorReal * TABLA_IPC_SINTETICA[anio - 1]) / TABLA_IPC_SINTETICA[2000]
    return {
      fechaDesde: `${anio}-01-01`,
      fechaHasta: `${anio}-12-31`,
      ibc,
      diasCotizados: esBisiesto(anio) ? 366 : 365,
    }
  }

  function periodosEra(anioInicio, anioFin, valorReal) {
    const periodos = []
    for (let anio = anioInicio; anio <= anioFin; anio++) periodos.push(periodoConValorRealConstante(anio, valorReal))
    return periodos
  }

  it('ingreso real creciente: el IBL de los últimos 10 años (ventana) resulta superior al de toda la vida laboral', () => {
    const ventana = periodosEra(2016, 2025, 3500000) // época reciente, ingreso real alto
    const carreraCompleta = [...periodosEra(2001, 2015, 800000), ...ventana] // época temprana, ingreso real bajo

    const ordinario = calcularPromedioIBL({ periodos: ventana, tablaIPC: TABLA_IPC_SINTETICA, anioReferenciaIPC: 2025 })
    const vidaLaboral = calcularPromedioIBL({ periodos: carreraCompleta, tablaIPC: TABLA_IPC_SINTETICA, anioReferenciaIPC: 2025 })

    expect(ordinario.promedio).toBeGreaterThan(vidaLaboral.promedio)
  })

  it('ingreso real decreciente: el IBL de toda la vida laboral resulta superior al de los últimos 10 años', () => {
    const ventana = periodosEra(2016, 2025, 800000) // época reciente, ingreso real bajo
    const carreraCompleta = [...periodosEra(2001, 2015, 3500000), ...ventana] // época temprana, ingreso real alto

    const ordinario = calcularPromedioIBL({ periodos: ventana, tablaIPC: TABLA_IPC_SINTETICA, anioReferenciaIPC: 2025 })
    const vidaLaboral = calcularPromedioIBL({ periodos: carreraCompleta, tablaIPC: TABLA_IPC_SINTETICA, anioReferenciaIPC: 2025 })

    expect(vidaLaboral.promedio).toBeGreaterThan(ordinario.promedio)
  })
})
