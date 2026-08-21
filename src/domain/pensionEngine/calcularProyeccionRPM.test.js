import { describe, it, expect } from 'vitest'
import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { diasCalendarioEnRango } from '../seleccionarPeriodosIBL.js'
import { calcularPromedioIBL } from '../formulas/formulaIBL.js'

// Mismos valores reales que calcularPensionRPM.test.js — fecha de cálculo fija,
// dentro del rango 2015-2025 verificado de ipc-historico.json.
const FECHA_CALCULO = '2026-01-01'

// Mismos valores que data/legal/versions/vigente-2026.json a la fecha de cálculo — SMLV
// 2026 (bajo litigio, permitido vía permitirTransitorio en obtenerSmlv) y tope de 25 SMLV.
const SMLV_2026 = 1750905
const TOPE_IBC_2026 = 25 * SMLV_2026 // 43.772.625

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

// historiaDiezAniosCompleta() ya cubre 2016-2025 (~522 semanas). Para probar vida laboral
// con datos reales hace falta declarar años adicionales anteriores, sin solaparse — mismo
// criterio que calcularPensionRPM.test.js ("historiaVeintiseisAnios"): 2000-2015 agrega
// ~16 años más, total ~26 años (~1356 semanas), por encima del umbral de 1250 con margen.
function historiaVeintiseisAnios() {
  const periodos = []
  for (let anio = 2000; anio <= 2015; anio++) periodos.push(periodoAnioCompleto(anio, 900000 + anio))
  return [...periodos, ...historiaDiezAniosCompleta()]
}

function escenarioContinuidad(valor) {
  return { valor, origen: 'continuidad_ibc_actual' }
}

function sumarDiasISO(fechaISO, delta) {
  const d = new Date(fechaISO)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

// Construye una fechaNacimiento tal que calcularFechaPorEdad(resultado, 100) ===
// fechaReconocimientoObjetivo exactamente (mismo día/mes, 100 años antes) — permite fijar
// un horizonte exacto en días sin depender de la duración variable de los años.
function fechaNacimientoParaObjetivo(fechaReconocimientoObjetivo) {
  const [anio, mes, dia] = fechaReconocimientoObjetivo.split('-').map(Number)
  return `${anio - 100}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

describe('calcularProyeccionRPM — no evaluable', () => {
  it('edadJubilacionDeseada no declarada → EDAD_JUBILACION_NO_DECLARADA', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1976-01-01',
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('EDAD_JUBILACION_NO_DECLARADA')
  })

  it('fechaNacimiento ausente o inválida → FECHA_NACIMIENTO_NO_VALIDA, sin lanzar excepción', () => {
    const base = {
      historiaCotizacion: historiaDiezAniosCompleta(),
      edadJubilacionDeseada: 62,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    }
    expect(() => calcularProyeccionRPM({ ...base, fechaNacimiento: undefined })).not.toThrow()
    expect(calcularProyeccionRPM({ ...base, fechaNacimiento: undefined }).razonNoEvaluable).toBe('FECHA_NACIMIENTO_NO_VALIDA')
    expect(calcularProyeccionRPM({ ...base, fechaNacimiento: null }).razonNoEvaluable).toBe('FECHA_NACIMIENTO_NO_VALIDA')
    expect(calcularProyeccionRPM({ ...base, fechaNacimiento: 'no-es-una-fecha' }).razonNoEvaluable).toBe('FECHA_NACIMIENTO_NO_VALIDA')
  })

  it('escenarioIbcFuturo ausente o inválido (0, negativo, no numérico) → IBC_FUTURO_NO_VALIDO', () => {
    const base = {
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1976-01-01',
      edadJubilacionDeseada: 62,
      fecha: FECHA_CALCULO,
    }
    expect(calcularProyeccionRPM({ ...base }).razonNoEvaluable).toBe('IBC_FUTURO_NO_VALIDO')
    expect(calcularProyeccionRPM({ ...base, escenarioIbcFuturo: escenarioContinuidad(0) }).razonNoEvaluable).toBe('IBC_FUTURO_NO_VALIDO')
    expect(calcularProyeccionRPM({ ...base, escenarioIbcFuturo: escenarioContinuidad(-100) }).razonNoEvaluable).toBe('IBC_FUTURO_NO_VALIDO')
    expect(calcularProyeccionRPM({ ...base, escenarioIbcFuturo: escenarioContinuidad(NaN) }).razonNoEvaluable).toBe('IBC_FUTURO_NO_VALIDO')
  })

  it('fechaReconocimiento no posterior a hoy (edad ya alcanzada) → EDAD_JUBILACION_NO_POSTERIOR_A_HOY', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1960-01-01',
      edadJubilacionDeseada: 60, // cumple 60 el 2020-01-01, ya pasado respecto a FECHA_CALCULO
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('EDAD_JUBILACION_NO_POSTERIOR_A_HOY')
  })

  it('historia insuficiente incluso sumando el horizonte futuro → HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1996-01-31',
      edadJubilacionDeseada: 30, // fechaReconocimiento = 2026-01-31, horizonte de 30 días
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
  })

  it('cobertura IPC insuficiente en el tramo observado (historia real toca años fuera de 2015-2025) → COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO', () => {
    // Historia real concentrada en 1990-2005, sin nada declarado cerca de fecha — el
    // horizonte futuro (30 días) no basta para evitar que el selector retroceda hasta esa
    // década, fuera del rango de ipc-historico.json (2015-2025). fecha se mantiene en
    // FECHA_CALCULO (2026) para que obtenerSmlv/obtenerTopeMaximoIBC —resueltos antes del
    // chequeo de IPC, porque el tope debe aplicarse antes de construir la ventana— tengan
    // una entrada vigente que resolver.
    const historia = [
      { fechaDesde: '1990-01-01', fechaHasta: '2005-12-31', ibc: 1000000, diasCotizados: diasCalendarioEnRango('1990-01-01', '2005-12-31') },
    ]
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1996-01-31',
      edadJubilacionDeseada: 30, // fechaReconocimiento = 2026-01-31, horizonte de 30 días
      escenarioIbcFuturo: escenarioContinuidad(1500000),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO')
    expect(resultado.datosFaltantes.ipcAnios.length).toBeGreaterThan(0)
    expect(resultado.datosFaltantes.ipcAnios.every((anio) => anio < 2015)).toBe(true)
    expect(resultado.trazabilidadVentana.diasEfectivosAcumulados).toBe(3650)
  })
})

describe('calcularProyeccionRPM — historia con período posterior a fecha: rechazo explícito, no reinterpretación', () => {
  it('un período de historiaCotizacion fechado después de fecha → no_evaluable con HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO', () => {
    const historia = [
      ...historiaDiezAniosCompleta(),
      { fechaDesde: '2027-01-01', fechaHasta: '2027-06-01', ibc: 999999999, diasCotizados: 152 },
    ]
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1961-02-01',
      edadJubilacionDeseada: 65, // fechaReconocimiento = 2026-02-01, horizonte corto
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    expect(resultado.trazabilidadVentana).toBeNull()
    expect(resultado.ibl).toBeNull()
  })

  it('reproduce exactamente el caso encontrado por la auditoría: variar el ibc de ese período ya no puede producir un cálculo válido', () => {
    function correr(ibcMalformado) {
      const historia = [
        ...historiaDiezAniosCompleta(),
        { fechaDesde: '2027-01-01', fechaHasta: '2027-06-01', ibc: ibcMalformado, diasCotizados: 152 },
      ]
      return calcularProyeccionRPM({
        historiaCotizacion: historia,
        fechaNacimiento: '1961-02-01',
        edadJubilacionDeseada: 65,
        escenarioIbcFuturo: escenarioContinuidad(2000000),
        fecha: FECHA_CALCULO,
      })
    }

    const conIbc999 = correr(999999999)
    const conIbc1 = correr(1)

    // Antes de la corrección: ambos llegaban a 'calculado' con el mismo ibl.ordinario.valor
    // (el ibc real del período se descartaba en silencio). Ahora ambos deben terminar en el
    // mismo no_evaluable explícito — ninguno llega a producir una cifra.
    expect(conIbc999.estado).toBe('no_evaluable')
    expect(conIbc1.estado).toBe('no_evaluable')
    expect(conIbc999.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    expect(conIbc1.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('un período "cerrado" (fechaHasta no nula) que termina después de fecha también se rechaza, aunque empiece antes', () => {
    const historia = [
      ...historiaDiezAniosCompleta().slice(0, -1), // sin el período de 2025, para no solapar
      { fechaDesde: '2025-06-01', fechaHasta: '2026-06-01', ibc: 1000000, diasCotizados: diasCalendarioEnRango('2025-06-01', '2026-06-01') },
    ]
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1961-02-01',
      edadJubilacionDeseada: 65,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('un período abierto (fechaHasta: null) nunca dispara este rechazo — se resuelve a fecha, no queda "posterior"', () => {
    const historia = [{ fechaDesde: '2016-01-01', fechaHasta: null, ibc: 1000000, diasCotizados: diasCalendarioEnRango('2016-01-01', FECHA_CALCULO) }]
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1961-02-01',
      edadJubilacionDeseada: 65,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.razonNoEvaluable).not.toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })
})

describe('calcularProyeccionRPM — horizonte corto (2 años): mezcla real de historia observada y escenario futuro', () => {
  it('composicionVentanaOrdinaria refleja la mezcla, y el IBL ordinario coincide con el blend calculado independientemente (con un período parcial, no solo períodos completos)', () => {
    // 2019 se declara parcial a propósito (200 de 365 días) — si la implementación
    // ponderara por días calendario en vez de diasCotizados, este test lo detectaría: con
    // todos los períodos "completos" ambas ponderaciones coinciden y el test no distingue
    // nada (hallazgo de la auditoría de S4-002, 2026-08-20).
    const historia = historiaDiezAniosCompleta().map((p) =>
      p.fechaDesde === '2019-01-01' ? { ...p, diasCotizados: 200 } : p
    )
    const valorAplicado = 2000000 // por debajo del tope, no se capa
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64, // fechaReconocimiento = 2028-01-01, horizonte ≈ 2 años
      escenarioIbcFuturo: escenarioContinuidad(valorAplicado),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.fechaReconocimiento).toBe('2028-01-01')
    expect(resultado.composicionVentanaOrdinaria.diasObservados).toBeGreaterThan(0)
    expect(resultado.composicionVentanaOrdinaria.diasFuturos).toBeGreaterThan(0)
    expect(resultado.composicionVentanaOrdinaria.diasObservados + resultado.composicionVentanaOrdinaria.diasFuturos).toBe(3650)

    // El período de 2019 (parcial) debe seguir dentro de la ventana usada, no ser el
    // tramo recortado — confirma que el caso realmente ejercita un período parcial no
    // limítrofe, no un accidente de las fechas elegidas.
    const periodo2019 = resultado.trazabilidadVentana.periodosUsados.find((p) => p.fechaDesde === '2019-01-01')
    expect(periodo2019).toBeDefined()
    expect(periodo2019.diasCotizados).toBe(200)
    expect(resultado.trazabilidadVentana.tramoInicialParcial?.fechaDesde.startsWith('2019')).not.toBe(true)

    // Reconstrucción independiente del blend, clasificando por el marcador estructural
    // (esEscenarioFuturo), no por fecha.
    const periodosObservados = resultado.trazabilidadVentana.periodosUsados.filter((p) => !p.esEscenarioFuturo)
    const periodosFuturos = resultado.trazabilidadVentana.periodosUsados.filter((p) => p.esEscenarioFuturo)
    const diasObs = periodosObservados.reduce((acc, p) => acc + p.diasCotizados, 0)
    const diasFut = periodosFuturos.reduce((acc, p) => acc + p.diasCotizados, 0)

    const promedioObservado = calcularPromedioIBL({ periodos: periodosObservados, tablaIPC: TABLA_IPC_REAL, anioReferenciaIPC: 2025 })
    const esperado = (promedioObservado.promedio * diasObs + valorAplicado * diasFut) / (diasObs + diasFut)

    expect(resultado.ibl.ordinario.valor).toBeCloseTo(esperado, 6)
  })

  it('semanasCotizadas.total = observadas + futuras, futuras derivadas exactamente del calendario del horizonte', () => {
    const historia = historiaDiezAniosCompleta()
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })

    const diasFuturosEsperados = diasCalendarioEnRango('2026-01-02', '2028-01-01')
    const diasObservadosTotal = historia.reduce((acc, p) => acc + p.diasCotizados, 0)

    expect(resultado.semanasCotizadas.futuras).toBeCloseTo(diasFuturosEsperados / 7, 10)
    expect(resultado.semanasCotizadas.observadas).toBeCloseTo(diasObservadosTotal / 7, 10)
    expect(resultado.semanasCotizadas.total).toBeCloseTo(resultado.semanasCotizadas.observadas + resultado.semanasCotizadas.futuras, 10)
  })
})

describe('calcularProyeccionRPM — horizonte ≥10 años: convergencia al escenario futuro', () => {
  it('composicionVentanaOrdinaria queda 100% futura y el IBL ordinario converge exactamente al valor aplicado', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(), // presente, pero no debe participar
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72, // fechaReconocimiento = 2036-01-01, horizonte > 3650 días
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.composicionVentanaOrdinaria.diasObservados).toBe(0)
    expect(resultado.composicionVentanaOrdinaria.diasFuturos).toBe(3650)
    expect(resultado.composicionVentanaOrdinaria.fraccionFutura).toBe(1)
    expect(resultado.ibl.ordinario.valor).toBe(2000000) // convergencia exacta, sin redondeo
    expect(resultado.ibl.ordinario.detalle).toEqual([])
  })

  it('la historia real sigue disponible para la alternativa de vida laboral aunque el ordinario sea 100% futuro, y su valor coincide con el blend calculado independientemente', () => {
    // Horizonte ~15 años (~782 semanas futuras) + 10 años reales (~522 semanas) supera el
    // umbral de 1250 solo si se cuenta el total proyectado — nunca lo alcanzaría con
    // semanasObservadas solas.
    const historia = historiaDiezAniosCompleta()
    const valorAplicado = 2000000
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1976-01-01',
      edadJubilacionDeseada: 65, // fechaReconocimiento = 2041-01-01
      escenarioIbcFuturo: escenarioContinuidad(valorAplicado),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.semanasCotizadas.observadas).toBeLessThan(1250)
    expect(resultado.semanasCotizadas.total).toBeGreaterThan(1250)
    expect(resultado.ibl.vidaLaboral).not.toBeNull()
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBeNull()

    // Reconstrucción numérica independiente: vida laboral usa TODA la historia real
    // (sin ventana de 3.650 días) mezclada con el horizonte futuro completo.
    const diasObsVL = historia.reduce((acc, p) => acc + p.diasCotizados, 0)
    const diasFutVL = diasCalendarioEnRango('2026-01-02', '2041-01-01')
    const promedioObservadoVL = calcularPromedioIBL({ periodos: historia, tablaIPC: TABLA_IPC_REAL, anioReferenciaIPC: 2025 })
    const esperadoVL = (promedioObservadoVL.promedio * diasObsVL + valorAplicado * diasFutVL) / (diasObsVL + diasFutVL)

    expect(resultado.ibl.vidaLaboral.valor).toBeCloseTo(esperadoVL, 6)
  })
})

describe('calcularProyeccionRPM — vida laboral con historia real que excede la cobertura de IPC', () => {
  it('el ordinario se calcula igual (su ventana no necesita los años sin IPC), pero vidaLaboral declara DATOS_LEGALES_INSUFICIENTES', () => {
    // 26 años reales (2000-2025, ~1356 semanas, ya por encima de 1250 sin contar nada
    // futuro) — la ventana ordinaria (3.650 días + horizonte corto) solo necesita retroceder
    // hasta ~2016, dentro de ipc-historico.json; pero vidaLaboral usa TODA la carrera,
    // tocando 2000-2014, fuera de rango.
    const historia = historiaVeintiseisAnios()
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1996-01-31',
      edadJubilacionDeseada: 30, // fechaReconocimiento = 2026-01-31, horizonte de 30 días
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.ibl.ordinario.valor).toBeGreaterThan(0)
    expect(resultado.semanasCotizadas.total).toBeGreaterThan(1250)
    expect(resultado.ibl.vidaLaboral).toBeNull()
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBe('DATOS_LEGALES_INSUFICIENTES')
    expect(resultado.ibl.esOpcionLegal).toBe(false)
    expect(resultado.ibl.aplicable).toBe(resultado.ibl.ordinario.valor)
  })
})

describe('calcularProyeccionRPM — tope legal de IBC: trazabilidad completa, nunca sobrescritura silenciosa', () => {
  it('escenario declarado por encima del tope → valorAplicado capado, valorDeclarado conservado, el cálculo usa el capado', () => {
    const valorDeclarado = 50000000 // > TOPE_IBC_2026 (43.772.625)
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72, // horizonte ≥10 años → convergencia exacta, facilita la verificación
      escenarioIbcFuturo: escenarioContinuidad(valorDeclarado),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.escenarioIbcFuturo.valorDeclarado).toBe(valorDeclarado)
    expect(resultado.escenarioIbcFuturo.valorAplicado).toBe(TOPE_IBC_2026)
    expect(resultado.escenarioIbcFuturo.valorAplicado).toBeLessThan(resultado.escenarioIbcFuturo.valorDeclarado)
    expect(resultado.escenarioIbcFuturo.topeAplicado).toBe(TOPE_IBC_2026)
    expect(resultado.escenarioIbcFuturo.origen).toBe('continuidad_ibc_actual')
    expect(resultado.ibl.ordinario.valor).toBe(TOPE_IBC_2026) // usa valorAplicado, no valorDeclarado
  })

  it('escenario dentro del tope: topeAplicado sigue presente, pero no se activa', () => {
    const valorDeclarado = 2000000
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72,
      escenarioIbcFuturo: escenarioContinuidad(valorDeclarado),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.escenarioIbcFuturo.valorDeclarado).toBe(valorDeclarado)
    expect(resultado.escenarioIbcFuturo.valorAplicado).toBe(valorDeclarado)
    expect(resultado.escenarioIbcFuturo.topeAplicado).toBe(TOPE_IBC_2026)
  })

  it('escenario declarado exactamente igual al tope: valorAplicado === valorDeclarado === topeAplicado, sin ambigüedad en el borde', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72, // horizonte ≥10 años → convergencia exacta
      escenarioIbcFuturo: escenarioContinuidad(TOPE_IBC_2026),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.escenarioIbcFuturo.valorDeclarado).toBe(TOPE_IBC_2026)
    expect(resultado.escenarioIbcFuturo.valorAplicado).toBe(TOPE_IBC_2026)
    expect(resultado.escenarioIbcFuturo.topeAplicado).toBe(TOPE_IBC_2026)
    expect(resultado.ibl.ordinario.valor).toBe(TOPE_IBC_2026)
  })
})

describe('calcularProyeccionRPM — bordes exactos del horizonte', () => {
  it('horizonte = 1 día (reconocimiento mañana)', () => {
    const fechaReconocimientoObjetivo = sumarDiasISO(FECHA_CALCULO, 1)
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: fechaNacimientoParaObjetivo(fechaReconocimientoObjetivo),
      edadJubilacionDeseada: 100,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.fechaReconocimiento).toBe(fechaReconocimientoObjetivo)
    expect(resultado.composicionVentanaOrdinaria.diasFuturos).toBe(1)
  })

  it('horizonte exactamente 3.650 días: cero historia observada, convergencia exacta', () => {
    const fechaReconocimientoObjetivo = sumarDiasISO('2026-01-02', 3649) // 3.650 días inclusive desde 2026-01-02
    expect(diasCalendarioEnRango('2026-01-02', fechaReconocimientoObjetivo)).toBe(3650)

    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: fechaNacimientoParaObjetivo(fechaReconocimientoObjetivo),
      edadJubilacionDeseada: 100,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.composicionVentanaOrdinaria.diasFuturos).toBe(3650)
    expect(resultado.composicionVentanaOrdinaria.diasObservados).toBe(0)
    expect(resultado.ibl.ordinario.valor).toBe(2000000)
  })

  it('horizonte exactamente 3.649 días: 1 día de historia observada entra a la mezcla, ya no converge exacto', () => {
    const fechaReconocimientoObjetivo = sumarDiasISO('2026-01-02', 3648) // 3.649 días inclusive
    expect(diasCalendarioEnRango('2026-01-02', fechaReconocimientoObjetivo)).toBe(3649)

    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: fechaNacimientoParaObjetivo(fechaReconocimientoObjetivo),
      edadJubilacionDeseada: 100,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.composicionVentanaOrdinaria.diasFuturos).toBe(3649)
    expect(resultado.composicionVentanaOrdinaria.diasObservados).toBe(1)
    expect(resultado.ibl.ordinario.valor).not.toBe(2000000)
  })

  it('cumpleaños 29 de febrero: fechaReconocimiento se ajusta a 28 de febrero en año no bisiesto, sin romper el cálculo', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '2000-02-29',
      edadJubilacionDeseada: 26, // 2000 + 26 = 2026, no bisiesto
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.fechaReconocimiento).toBe('2026-02-28')
  })
})

describe('calcularProyeccionRPM — trazabilidad y limitaciones', () => {
  it('declara exactamente las tres limitaciones de la proyección, siempre que calcula', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.limitaciones.map((l) => l.codigo).sort()).toEqual([
      'CONTINUIDAD_FUTURA_ASUMIDA_SIN_HUECOS',
      'NO_ES_TU_PENSION_FINAL',
      'PARAMETROS_LEGALES_CONGELADOS_A_FECHA_CALCULO',
    ])
  })

  it('fechaBaseMonetaria = fecha; origen del escenario viaja intacto hasta la salida', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72,
      escenarioIbcFuturo: { valor: 2000000, origen: 'un_origen_cualquiera_no_valida_nada' },
      fecha: FECHA_CALCULO,
    })

    expect(resultado.fechaBaseMonetaria).toBe(FECHA_CALCULO)
    expect(resultado.escenarioIbcFuturo.origen).toBe('un_origen_cualquiera_no_valida_nada')
    // El origen es opaco: no cambia ningún resultado numérico.
    expect(resultado.ibl.ordinario.valor).toBe(2000000)
  })

  it('no lanza excepción con historiaCotizacion vacía y horizonte largo — el escenario futuro basta por sí solo', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.ibl.ordinario.valor).toBe(2000000)
  })
})

describe('calcularProyeccionRPM — horizonteFuturo (§14 punto 9 del Entregable 2)', () => {
  it('null en todo resultado no_evaluable', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: null, // EDAD_JUBILACION_NO_DECLARADA
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.horizonteFuturo).toBeNull()
  })

  it('fechaInicio = un día después de fecha, fechaFin = fechaReconocimiento, diasCotizados coincide con diasCalendarioEnRango — sin recalcular nada, mismos valores que ya usa periodoFuturo internamente', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72, // fechaReconocimiento = 2036-01-01, horizonte > 3650 días
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.horizonteFuturo.fechaInicio).toBe('2026-01-02') // diaSiguiente(FECHA_CALCULO)
    expect(resultado.horizonteFuturo.fechaFin).toBe(resultado.fechaReconocimiento)
    expect(resultado.horizonteFuturo.diasCotizados).toBe(
      diasCalendarioEnRango(resultado.horizonteFuturo.fechaInicio, resultado.horizonteFuturo.fechaFin)
    )
    // Nunca confundir con composicionVentanaOrdinaria.diasFuturos — esa cifra está acotada a
    // la ventana ordinaria de 3.650 días, no representa el horizonte completo cuando lo excede.
    expect(resultado.horizonteFuturo.diasCotizados).toBeGreaterThan(resultado.composicionVentanaOrdinaria.diasFuturos)
  })

  it('fixture real rpm-empleado-proyecta-tu-pension: horizonte exacto 2026-08-22 → 2043-02-11, 6.018 días', () => {
    const historiaFixture = [
      { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
      { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
    ]
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historiaFixture,
      fechaNacimiento: '1978-02-11',
      edadJubilacionDeseada: 65,
      escenarioIbcFuturo: escenarioContinuidad(2900000),
      fecha: '2026-08-21',
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.horizonteFuturo).toEqual({
      fechaInicio: '2026-08-22',
      fechaFin: '2043-02-11',
      diasCotizados: 6018,
    })
  })
})
