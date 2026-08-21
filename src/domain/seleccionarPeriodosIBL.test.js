import { describe, it, expect } from 'vitest'
import { seleccionarPeriodosIBL, diasCalendarioEnRango } from './seleccionarPeriodosIBL.js'

const FECHA_ANCLA = '2026-01-01'
const DIAS_VENTANA = 3650

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

function periodoAnioCompleto(anio, ibc) {
  const dias = esBisiesto(anio) ? 366 : 365
  return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: dias }
}

// 2016-01-01 a 2025-12-31: 3653 días calendario reales (10 años, 3 bisiestos: 2016, 2020,
// 2024) — el mismo total que arroja la tabla de SL1006-2025 para su ventana real de "10
// últimos años efectivamente cotizados". Se usa deliberadamente como caso de regresión
// directo: 3653 − 3 = 3650, igual que la reconstrucción de la sentencia (ver
// src/data/legal/trazabilidad-normativa.md, sección "Reconstrucción matemática del corte
// inicial").
function historiaDiezAniosCompleta() {
  const periodos = []
  for (let anio = 2016; anio <= 2025; anio++) {
    periodos.push(periodoAnioCompleto(anio, 1000000 + anio))
  }
  return periodos
}

function periodoCompleto(fechaDesde, fechaHasta, ibc) {
  return { fechaDesde, fechaHasta, ibc, diasCotizados: diasCalendarioEnRango(fechaDesde, fechaHasta) }
}

function sumarDiasLocal(fechaISO, delta) {
  const d = new Date(fechaISO)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

describe('seleccionarPeriodosIBL — regresión directa de SL1006-2025', () => {
  it('3653 días reales disponibles, declarados por año calendario → se recortan del año más antiguo exactamente los días que sobran del total (363 de 2016, no 3 — el recorte es sobre el período límite, no sobre el excedente del total)', () => {
    const resultado = seleccionarPeriodosIBL({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaCalculo: FECHA_ANCLA,
    })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(DIAS_VENTANA)
    // 2017-2025 completos suman 3287 días; 2016 aporta solo los 363 que faltan (de sus 366).
    expect(resultado.trazabilidadVentana.tramoInicialParcial).toEqual({
      fechaDesde: sumarDiasLocal('2016-12-31', -362),
      fechaHasta: '2016-12-31',
      diasCotizados: 363,
    })
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toHaveLength(0)
    expect(resultado.periodosOrdinario).toHaveLength(10)
  })

  it('réplica fiel de la granularidad de SL1006-2025: el tramo límite queda recortado a exactamente 3 días cuando el período que cruza el corte es de escala mensual, no anual', () => {
    // Recreación directa de la aritmética de la sentencia: 3.653 días efectivamente
    // cotizados disponibles en total, de los cuales solo 3 quedan fuera de la ventana de
    // 3.650 — pero, a diferencia del test anterior, aquí el período que cruza el corte es
    // un mes completo (30 días), igual que noviembre de 1983 en la sentencia, así que el
    // fragmento conservado es literalmente de 3 días.
    const fechaHastaReciente = '2025-12-31'
    const fechaDesdeReciente = sumarDiasLocal(fechaHastaReciente, -(3647 - 1)) // 3647 días, contiguo hasta fechaAncla-1año
    const historia = [
      periodoCompleto('2000-01-01', '2000-01-30', 500000), // mes completo, 30 días — el período límite
      periodoCompleto(fechaDesdeReciente, fechaHastaReciente, 1000000), // 3647 días
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(DIAS_VENTANA)
    expect(resultado.trazabilidadVentana.tramoInicialParcial).toEqual({
      fechaDesde: '2000-01-28',
      fechaHasta: '2000-01-30',
      diasCotizados: 3,
    })
  })
})

describe('seleccionarPeriodosIBL — caso evaluable', () => {
  it('cotización continua muy superior a 3650 días → se recorta el tramo más antiguo, sin huecos', () => {
    const historia = [periodoCompleto('2010-01-01', '2025-12-31', 1000000)]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.periodosOrdinario).toHaveLength(1)
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(DIAS_VENTANA)
    const tramo = resultado.trazabilidadVentana.tramoInicialParcial
    expect(tramo).not.toBeNull()
    expect(tramo.fechaHasta).toBe('2025-12-31')
    expect(diasCalendarioEnRango(tramo.fechaDesde, tramo.fechaHasta)).toBe(DIAS_VENTANA)
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toHaveLength(0)
  })

  it('hueco de 6 meses entre dos períodos → la ventana retrocede para completarse y el hueco queda registrado', () => {
    const historia = [
      periodoCompleto('2000-01-01', '2023-12-31', 900000), // muy superior a lo que hará falta
      periodoCompleto('2024-07-01', '2025-12-31', 1200000),
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(DIAS_VENTANA)
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toEqual([
      { fechaDesde: '2024-01-01', fechaHasta: '2024-06-30', diasCalendario: diasCalendarioEnRango('2024-01-01', '2024-06-30') },
    ])
  })

  it('hueco de varios años (análogo al de SL1006-2025) → se salta por completo, no bloquea', () => {
    const historia = [
      periodoCompleto('1990-01-01', '2010-12-31', 800000), // muy anterior, cubre lo que falte
      periodoCompleto('2023-01-01', '2025-12-31', 1200000),
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toEqual([
      { fechaDesde: '2011-01-01', fechaHasta: '2022-12-31', diasCalendario: diasCalendarioEnRango('2011-01-01', '2022-12-31') },
    ])
  })

  it('un hueco anterior al punto donde ya se completaron los 3650 días no se registra (nunca se llega hasta él)', () => {
    const historia = [
      periodoCompleto('2016-01-01', '2025-12-31', 1000000), // 3653 días, ya alcanza y sobra la ventana por sí solo
      periodoCompleto('1990-01-01', '2000-12-31', 700000), // más antiguo que el punto de corte; nunca se examina
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.trazabilidadVentana.huecosCalendarioSaltados).toHaveLength(0)
    expect(resultado.periodosOrdinario).toHaveLength(1)
  })

  it('cotización parcial en un período NO limítrofe sigue siendo evaluable (ya no bloquea en cualquier punto de la ventana)', () => {
    const historia = [
      periodoCompleto('2025-01-01', '2025-12-31', 1200000), // más reciente, completo
      { fechaDesde: '2015-01-01', fechaHasta: '2024-12-31', ibc: 900000, diasCotizados: 3000 }, // parcial, pero no es el tramo límite
      periodoCompleto('1990-01-01', '2014-12-31', 800000), // completa el resto sin problema
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(true)
    const periodoParcialUsado = resultado.periodosOrdinario.find((p) => p.fechaDesde === '2015-01-01')
    expect(periodoParcialUsado).toBeDefined()
    expect(periodoParcialUsado.diasCotizados).toBe(3000)
  })
})

describe('seleccionarPeriodosIBL — no evaluable', () => {
  it('historia insuficiente (toda la historia declarada suma menos de 3650 días) → HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA', () => {
    const historia = [periodoCompleto('2025-01-01', '2025-04-10', 1000000)] // 100 días
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(false)
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(100)
  })

  it('historia vacía → HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA', () => {
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: [], fechaCalculo: FECHA_ANCLA })

    expect(resultado.evaluable).toBe(false)
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(0)
  })

  it('el período límite (el que habría que recortar) ya era en sí mismo parcial → COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA, sin fabricar una fechaDesde', () => {
    const historia = [
      periodoCompleto('2025-01-01', '2025-12-31', 1200000), // 365 días completos, restante = 3285
      { fechaDesde: '2000-01-01', fechaHasta: '2024-12-31', ibc: 900000, diasCotizados: 3300 }, // contiguo (sin hueco), pero parcial: su rango tiene ~9131 días calendario, y 3300 > restante
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado).toEqual({
      evaluable: false,
      razonNoEvaluable: 'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA',
      trazabilidadVentana: {
        fechaAncla: FECHA_ANCLA,
        diasEfectivosAcumulados: 365,
        periodosUsados: [{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1200000, diasCotizados: 365 }],
        huecosCalendarioSaltados: [],
        tramoInicialParcial: null,
      },
    })
  })

  it('dos períodos que se solapan → PERIODOS_SUPERPUESTOS_NO_SOPORTADOS', () => {
    const historia = [
      periodoCompleto('2016-01-01', '2025-12-31', 1000000),
      { fechaDesde: '2020-06-01', fechaHasta: '2020-08-31', ibc: 1200000, diasCotizados: 92 }, // se solapa
    ]
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS', trazabilidadVentana: null })
  })

  it('diasCotizados mayor a los días calendario del rango → INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS', () => {
    const historia = [{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 400 }] // imposible: el rango tiene 365 días
    const resultado = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: FECHA_ANCLA })

    expect(resultado).toEqual({ evaluable: false, razonNoEvaluable: 'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS', trazabilidadVentana: null })
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

// Extensión mínima de S4-002 (proyección RPM): fechaAncla separado de fechaCalculo.
// fechaCalculo sigue resolviendo períodos abiertos (nunca cambia); fechaAncla mueve
// únicamente el punto desde el que la ventana retrocede.
describe('seleccionarPeriodosIBL — fechaAncla separada de fechaCalculo', () => {
  it('sin fechaAncla, el comportamiento es idéntico al de S4-001B (default = fechaCalculo)', () => {
    const historia = historiaDiezAniosCompleta()
    const conAncla = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: '2026-01-01', fechaAncla: '2026-01-01' })
    const sinAncla = seleccionarPeriodosIBL({ historiaCotizacion: historia, fechaCalculo: '2026-01-01' })

    expect(sinAncla).toEqual(conAncla)
  })

  it('un período abierto (fechaHasta: null) resuelve a fechaCalculo, no a fechaAncla, aunque fechaAncla sea futura', () => {
    const fechaDesde = '2016-01-01'
    const fechaCalculo = '2026-01-01'
    const diasCotizados = diasCalendarioEnRango(fechaDesde, fechaCalculo)
    const historia = [{ fechaDesde, fechaHasta: null, ibc: 1000000, diasCotizados }]
    const resultado = seleccionarPeriodosIBL({
      historiaCotizacion: historia,
      fechaCalculo,
      fechaAncla: '2036-01-01',
    })

    expect(resultado.evaluable).toBe(true)
    // El tramo usado termina en fechaCalculo (2026) — si el período abierto se hubiera
    // resuelto a fechaAncla (2036), este valor sería distinto.
    expect(resultado.periodosOrdinario.at(-1).fechaHasta).toBe('2026-01-01')
  })

  it('fechaAncla se registra en la trazabilidad tal cual, independiente de fechaCalculo', () => {
    const historia = historiaDiezAniosCompleta() // 2016-01-01 a 2025-12-31
    const resultado = seleccionarPeriodosIBL({
      historiaCotizacion: historia,
      fechaCalculo: '2026-06-15', // sin efecto: no hay períodos abiertos en esta historia
      fechaAncla: '2025-12-31', // ancla = fin de la historia real (horizonte futuro de 0 días, como haría S4-002)
    })

    expect(resultado.evaluable).toBe(true)
    expect(resultado.trazabilidadVentana.fechaAncla).toBe('2025-12-31')
  })
})
