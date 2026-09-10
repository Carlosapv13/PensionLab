import { describe, it, expect } from 'vitest'
import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { diasCalendarioEnRango } from '../seleccionarPeriodosIBL.js'
import { calcularPromedioIBL } from '../formulas/formulaIBL.js'
import { desglosarTasaReemplazoRPM, formulaRPM } from '../formulas/formulaRPM.js'
import { obtenerParametrosTasaReemplazoRPM } from '../../data/legal/index.js'
import { resolverSmlvVigenteRPM } from './resolverSmlvVigenteRPM.js'

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

describe('calcularProyeccionRPM — E3-C1: vigencia del SMLV (mismas fechas de frontera de E3-A)', () => {
  const perfilBase = {
    historiaCotizacion: historiaDiezAniosCompleta(),
    fechaNacimiento: '1976-01-01',
    edadJubilacionDeseada: 62,
    escenarioIbcFuturo: escenarioContinuidad(2000000),
  }

  it('2026-02-11 (Decreto 1469/2025, firme): calcula normalmente', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-02-11' })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(true)
    expect(resultado.pensionMensualProyectada).toBeGreaterThan(0)
  })

  it('2026-02-12 (expedición del auto, efecto no confirmado): no evaluable, no fabrica pensión, conserva fechas ya resueltas', () => {
    let resultado
    expect(() => {
      resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-02-12' })
    }).not.toThrow()

    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    expect(resultado.pensionMensualProyectada).toBeNull()
    expect(resultado.tasaReemplazo).toBeNull()
    expect(resultado.escenarioIbcFuturo).toBeNull()
    expect(resultado.pensionMensualProyectada).not.toBe(0)
    expect(Number.isNaN(resultado.pensionMensualProyectada)).toBe(false)
    // Datos intermedios seguros (no dependen del SMLV: solo de fechaNacimiento/edad/fecha).
    expect(resultado.fechaBaseMonetaria).toBe('2026-02-12')
    expect(resultado.fechaReconocimiento).not.toBeNull()
    expect(resultado.horizonteFuturo).not.toBeNull()
    expect(resultado.vigenciaSmlv.advertencia.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    expect(resultado.razonNoEvaluable).not.toBe('MEDIDA_CAUTELAR_ACTIVA')
    expect(resultado.razonNoEvaluable).not.toBe('FUERA_DE_VIGENCIA')
    expect(resultado.razonNoEvaluable).not.toBe('FUENTE_INSUFICIENTE')
    expect(resultado.razonNoEvaluable).not.toBe('FUENTE_LEGAL_NO_ENCONTRADA')
  })

  it('2026-02-18 (último día de la ventana no verificada): mismo comportamiento que el 12 de febrero', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-02-18' })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    expect(resultado.pensionMensualProyectada).toBeNull()
    expect(resultado.fechaReconocimiento).not.toBeNull()
  })

  it('2026-02-19 (Decreto 0159/2026, expedición/publicación real): calcula', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-02-19' })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(true)
  })

  it('2026-07-16 (último día del Decreto 0159/2026): calcula', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-07-16' })
    expect(resultado.estado).toBe('calculado')
  })

  it('2026-07-17 (Decreto 1469/2025 reactivado): calcula', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-07-17' })
    expect(resultado.estado).toBe('calculado')
  })

  it('litigio pendiente sin suspensión (hoy, 2026-09-07): genera advertencia pero no bloquea, no altera la aritmética', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2026-09-07' })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.vigenciaSmlv.litigioPendiente).toBe(true)
    expect(resultado.vigenciaSmlv.medidaCautelarActiva).toBe(false)
    expect(resultado.vigenciaSmlv.advertencia.codigo).toBe('LITIGIO_DE_FONDO_PENDIENTE')
    expect(resultado.pensionMensualProyectada).toBeGreaterThan(0)
  })

  it('fecha apta (FECHA_CALCULO, ya cubierta por los tests existentes de este archivo): mismo camino numérico, topeAplicado usa el mismo SMLV_2026', () => {
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: FECHA_CALCULO })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(true)
    expect(resultado.escenarioIbcFuturo.topeAplicado).toBeCloseTo(TOPE_IBC_2026, 6)
    expect(resultado.pensionMensualProyectada).toBeGreaterThan(0)
  })

  it('fecha anterior a la cobertura de SMLV disponible (2025-12-31): no evaluable, FUENTE_LEGAL_NO_ENCONTRADA, sin inventar un SMLV histórico', () => {
    let resultado
    expect(() => {
      resultado = calcularProyeccionRPM({ ...perfilBase, fecha: '2025-12-31' })
    }).not.toThrow()

    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    expect(resultado.pensionMensualProyectada).toBeNull()
    expect(resultado.vigenciaSmlv.encontrado).toBe(false)
    expect(resultado.vigenciaSmlv.valor).toBeNull()
  })

  // Prueba directa, no solo argumentada: construida para que fechaReconocimiento y `fecha`
  // (fechaBaseMonetaria) caigan en tramos de vigencia DISTINTOS del SMLV — si el código
  // usara por error fechaReconocimiento para resolver el SMLV, este caso bloquearía
  // (fechaReconocimiento cae en la ventana de fundamento no verificado); como usa `fecha`
  // (firme, apto), calcula con normalidad. fechaNacimiento='1964-02-13' + edadJubilacionDeseada=62
  // + fecha='2026-02-11' (edadActual=61, el cumpleaños del 13 aún no ocurrió) produce
  // fechaReconocimiento='2026-02-13', dentro de 2026-02-12 a 2026-02-18.
  it('fechaReconocimiento no se usa para resolver el SMLV — solo fechaBaseMonetaria (fecha)', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilBase,
      fechaNacimiento: '1964-02-13',
      edadJubilacionDeseada: 62,
      fecha: '2026-02-11',
    })
    expect(resultado.fechaReconocimiento).toBe('2026-02-13')
    expect(resultado.fechaBaseMonetaria).toBe('2026-02-11')
    // Si el código hubiera usado fechaReconocimiento (2026-02-13, fundamento no verificado)
    // para el SMLV, esto sería 'no_evaluable'. Usa fecha (2026-02-11, firme) → calcula.
    expect(resultado.estado).toBe('calculado')
    expect(resultado.vigenciaSmlv.fechaBase).toBe('2026-02-11')
    expect(resultado.vigenciaSmlv.tipoVigencia).toBe('firme')
  })

  // Cierre de diseño, quinta ronda (revisión Atlas, 2026-09-08): antes de esta ronda, una
  // fecha inválida llegaba sin filtrar hasta validarHistoriaCotizacionTemporal/
  // resolverHorizonteFuturoRPM y producía un throw sin control ("Invalid time value") —
  // verificado que ya ocurría en HEAD, ajeno a E3-C1, pero incompatible con el contrato de
  // detención segura de esta función. Ese comportamiento NO se consagra como contrato: se
  // reemplaza por una detención segura, validada ANTES de que la fecha toque
  // validarHistoriaCotizacionTemporal o resolverHorizonteFuturoRPM.
  // 'undefined' se excluye deliberadamente de esta lista: calcularProyeccionRPM tiene
  // `fecha = hoyISO()` como valor por defecto — pasar `fecha: undefined` activa ese default
  // (comportamiento estándar de JavaScript, no distinguible de omitir `fecha`), así que
  // nunca llega a resolverSmlvVigenteRPM como "undefined". Se documenta aparte, abajo.
  const casosFechaInvalida = [
    ['null', null],
    ['cadena vacía', ''],
    ["'no-es-fecha'", 'no-es-fecha'],
    ["'2026-13-01' (mes fuera de rango)", '2026-13-01'],
    ["'2026-02-30' (día fuera de rango)", '2026-02-30'],
  ]

  for (const [descripcion, valor] of casosFechaInvalida) {
    it(`fecha ${descripcion}: no lanza, no_evaluable, FECHA_BASE_MONETARIA_INVALIDA, sin proyección ni NaN`, () => {
      expect(() => calcularProyeccionRPM({ ...perfilBase, fecha: valor })).not.toThrow()
      const resultado = calcularProyeccionRPM({ ...perfilBase, fecha: valor })

      expect(resultado.estado).toBe('no_evaluable')
      expect(resultado.razonNoEvaluable).toBe('FECHA_BASE_MONETARIA_INVALIDA')
      expect(resultado.vigenciaSmlv).not.toBeNull()
      expect(resultado.vigenciaSmlv.encontrado).toBe(false)
      expect(resultado.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(false)
      expect(resultado.vigenciaSmlv.advertencia.codigo).toBe('FECHA_BASE_MONETARIA_INVALIDA')
      // Ninguna cifra final calculada — nunca 0/NaN como sustituto.
      expect(resultado.pensionMensualProyectada).toBeNull()
      expect(resultado.tasaReemplazo).toBeNull()
      expect(resultado.escenarioIbcFuturo).toBeNull()
      expect(Number.isNaN(resultado.pensionMensualProyectada)).toBe(false)
      // Nada calculado todavía en este punto (la fecha se validó antes de historia/horizonte).
      expect(resultado.fechaBaseMonetaria).toBeNull()
      expect(resultado.fechaReconocimiento).toBeNull()
      expect(resultado.horizonteFuturo).toBeNull()
      // Nunca confundida con la fuente-no-encontrada (fecha válida sin cobertura).
      expect(resultado.razonNoEvaluable).not.toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    })
  }

  it('fecha undefined: NO es un caso inválido aquí — activa el valor por defecto (hoyISO()), igual que omitir fecha; calcula con normalidad', () => {
    // perfilBase no declara `fecha` — omitirla o pasarla explícitamente como undefined son
    // indistinguibles para JavaScript (ambas activan `fecha = hoyISO()`).
    const conUndefined = calcularProyeccionRPM({ ...perfilBase, fecha: undefined })
    const sinFecha = calcularProyeccionRPM(perfilBase)
    expect(conUndefined.estado).toBe('calculado')
    expect(conUndefined.razonNoEvaluable).not.toBe('FECHA_BASE_MONETARIA_INVALIDA')
    expect(conUndefined).toEqual(sinFecha)
  })
})

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

// Contrato GO-B (decisión de arquitectura, 2026-08-25) — semanas agregadas ya declaradas
// (nivelConocimientoSemanas/semanasCotizadas de InformacionPensionalEsencial.jsx) para una
// PROYECCIÓN PRELIMINAR. Perfil sin historia: fechaNacimiento 1978-01-01 (edad actual
// FECHA_CALCULO = 48), edadJubilacionDeseada 62 (fechaReconocimiento 2040-01-01,
// horizonte ≈ 14 años ≈ 730 semanas futuras) — cubre la ventana IBL (3.650 días) pero no
// las 1.300/1.250 semanas mínimas de reconocimiento/alternativa por sí solo. Umbral real
// de la alternativa de vida laboral verificado en exploración previa: 1.250 semanas.
function perfilSinHistoriaParaGoB() {
  return {
    historiaCotizacion: [],
    fechaNacimiento: '1978-01-01',
    edadJubilacionDeseada: 62,
    escenarioIbcFuturo: escenarioContinuidad(2500000),
    fecha: FECHA_CALCULO,
  }
}

// Historia real pequeña (3 años, ~156 semanas) — deliberadamente insuficiente para cruzar
// el umbral de 1.250 incluso sumada al horizonte futuro de perfilSinHistoriaParaGoB()
// (~156+730=886), a diferencia de historiaDiezAniosCompleta() (~522 semanas), que sí lo
// cruzaría por sí sola con este mismo horizonte — se usa aquí exactamente para NO
// contaminar las pruebas de "la declaración no fabrica historia" con un cruce accidental
// por datos reales.
function historiaParcialPequena() {
  return [periodoAnioCompleto(2023, 1200000), periodoAnioCompleto(2024, 1200000), periodoAnioCompleto(2025, 1200000)]
}

describe('calcularProyeccionRPM — contrato GO-B: semanas declaradas para proyección preliminar', () => {
  it('CASO A — declaradas aproximadas: semanas de proyección = declaradas + futuras, nunca +observadas; fuente y certeza trazables', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(resultado.estado).toBe('calculado')
    expect(resultado.semanasCotizadas.observadas).toBe(0)
    expect(resultado.semanasCotizadas.declaradas).toBe(1100)
    expect(resultado.semanasCotizadas.certeza).toBe('aproximado')
    expect(resultado.semanasCotizadas.fuente).toBe('declaracion_agregada')
    expect(resultado.semanasCotizadas.total).toBe(1100 + resultado.semanasCotizadas.futuras)
    expect(resultado.semanasCotizadas.sustentadasPorHistoria).toBe(resultado.semanasCotizadas.futuras) // observadas=0

    const limitacionDeclarada = resultado.limitaciones.find((l) => l.codigo === 'PROYECCION_CONDICIONADA_A_SEMANAS_DECLARADAS')
    expect(limitacionDeclarada).toBeDefined()
    expect(limitacionDeclarada.mensaje).toContain('aproximadamente 1100')
  })

  it('CASO A (continuación) — la misma cifra que alimenta elegibilidad también mueve la tasa de reemplazo, nunca una distinta para cada una', () => {
    const sinDeclaracion = calcularProyeccionRPM(perfilSinHistoriaParaGoB())
    const conDeclaracion = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(conDeclaracion.semanasCotizadas.total).toBeGreaterThan(sinDeclaracion.semanasCotizadas.total)
    // El IBL aplicable no cambia — la declaración nunca lo toca (solo semanas). Toda la
    // diferencia de tasa/pensión viene exclusivamente de datosUsuario.semanasCotizadas.
    expect(conDeclaracion.ibl.aplicable).toBe(sinDeclaracion.ibl.aplicable)
    expect(conDeclaracion.tasaReemplazo).toBeGreaterThan(sinDeclaracion.tasaReemplazo)
    expect(conDeclaracion.pensionMensualProyectada).toBeGreaterThan(sinDeclaracion.pensionMensualProyectada)
  })

  it('CASO B — declaradas conocidas: certeza trazable, sin prefijo "aproximadamente" en la limitación', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })

    expect(resultado.semanasCotizadas.certeza).toBe('conocido')
    expect(resultado.semanasCotizadas.fuente).toBe('declaracion_agregada')
    expect(resultado.semanasCotizadas.total).toBe(1400 + resultado.semanasCotizadas.futuras)

    const limitacionDeclarada = resultado.limitaciones.find((l) => l.codigo === 'PROYECCION_CONDICIONADA_A_SEMANAS_DECLARADAS')
    expect(limitacionDeclarada.mensaje).toContain('1400')
    expect(limitacionDeclarada.mensaje).not.toContain('aproximadamente')
  })

  it('CASO C — historia parcial + declaración: NO hay doble conteo, la historia parcial no reemplaza automáticamente la declaración en este slice', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      historiaCotizacion: historiaParcialPequena(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(resultado.semanasCotizadas.observadas).toBeGreaterThan(0) // hay historia real
    expect(resultado.semanasCotizadas.fuente).toBe('declaracion_agregada') // sigue ganando la declaración
    // PROHIBIDO: declaradas + observadas + futuras (doble conteo del mismo pasado)
    const sumaProhibida =
      resultado.semanasCotizadas.declaradas + resultado.semanasCotizadas.observadas + resultado.semanasCotizadas.futuras
    expect(resultado.semanasCotizadas.total).not.toBe(sumaProhibida)
    expect(resultado.semanasCotizadas.total).toBe(1100 + resultado.semanasCotizadas.futuras)
    // sustentadasPorHistoria sigue disponible aparte, sin mezclarse con la declaración
    expect(resultado.semanasCotizadas.sustentadasPorHistoria).toBe(
      resultado.semanasCotizadas.observadas + resultado.semanasCotizadas.futuras
    )
    expect(resultado.semanasCotizadas.sustentadasPorHistoria).toBeLessThan(resultado.semanasCotizadas.total)
  })

  it('CASO D — semanas desconocidas: comportamiento idéntico al existente antes de GO-B, nunca "0 semanas declaradas"', () => {
    const conNullExplicito = calcularProyeccionRPM({ ...perfilSinHistoriaParaGoB(), semanasReferenciaDeclaradas: null })
    const sinElParametro = calcularProyeccionRPM(perfilSinHistoriaParaGoB())

    expect(conNullExplicito).toEqual(sinElParametro) // regresión: default y null explícito son idénticos
    expect(conNullExplicito.semanasCotizadas.fuente).toBe('historia_estructurada')
    expect(conNullExplicito.semanasCotizadas.declaradas).toBeNull()
    expect(conNullExplicito.semanasCotizadas.certeza).toBeNull()
    expect(conNullExplicito.semanasCotizadas.total).toBe(conNullExplicito.semanasCotizadas.sustentadasPorHistoria)
    expect(conNullExplicito.limitaciones.some((l) => l.codigo === 'PROYECCION_CONDICIONADA_A_SEMANAS_DECLARADAS')).toBe(false)
  })

  it('certeza inválida (p. ej. "desconocido" dentro del objeto) se trata como ausencia de declaración, nunca como error', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'desconocido' },
    })
    expect(resultado.semanasCotizadas.fuente).toBe('historia_estructurada')
    expect(resultado.semanasCotizadas.declaradas).toBeNull()
  })

  it('cantidad inválida (negativa o no finita) se trata como ausencia de declaración, nunca como error', () => {
    const conNegativa = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: -5, certeza: 'aproximado' },
    })
    const conNaN = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: NaN, certeza: 'conocido' },
    })
    expect(conNegativa.semanasCotizadas.fuente).toBe('historia_estructurada')
    expect(conNaN.semanasCotizadas.fuente).toBe('historia_estructurada')
  })
})

describe('calcularProyeccionRPM — contrato GO-B: el gate del IBL alternativo SOLO usa semanas sustentadas por historia', () => {
  it('A — genuinamente insuficiente, ni con historia ni con una declaración baja: SEMANAS_TOTALES_INSUFICIENTES', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: 50, certeza: 'aproximado' },
    })
    expect(resultado.semanasCotizadas.total).toBeLessThan(1250)
    expect(resultado.ibl.vidaLaboral).toBeNull()
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBe('SEMANAS_TOTALES_INSUFICIENTES')
  })

  it('B — la declaración cruza el umbral pero no hay historia sustentada (historia=[]): VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA, nunca fabrica el IBL alternativo', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(resultado.semanasCotizadas.sustentadasPorHistoria).toBeLessThan(1250)
    expect(resultado.semanasCotizadas.total).toBeGreaterThanOrEqual(1250)
    expect(resultado.ibl.vidaLaboral).toBeNull()
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBe('VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA')
    expect(resultado.ibl.esOpcionLegal).toBe(false)
    expect(resultado.ibl.aplicable).toBe(resultado.ibl.ordinario.valor)
  })

  it('B (con historia parcial real, no solo vacía) — la declaración sigue sin fabricar el IBL alternativo aunque exista algo de historia real', () => {
    const resultado = calcularProyeccionRPM({
      ...perfilSinHistoriaParaGoB(),
      historiaCotizacion: historiaParcialPequena(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(resultado.semanasCotizadas.sustentadasPorHistoria).toBeLessThan(1250) // ~156+730=886
    expect(resultado.semanasCotizadas.total).toBeGreaterThanOrEqual(1250) // 1100+730
    expect(resultado.ibl.vidaLaboral).toBeNull()
    expect(resultado.ibl.razonVidaLaboralNoEvaluada).toBe('VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA')
  })

  it('E — historia real por sí sola ya alcanza el umbral: la alternativa sigue funcionando igual, con o sin semanasReferenciaDeclaradas=null explícito (sin regresión)', () => {
    const params = {
      historiaCotizacion: historiaDiezAniosCompleta(),
      fechaNacimiento: '1976-01-01',
      edadJubilacionDeseada: 65,
      escenarioIbcFuturo: escenarioContinuidad(2000000),
      fecha: FECHA_CALCULO,
    }
    const sinParametroNuevo = calcularProyeccionRPM(params)
    const conNullExplicito = calcularProyeccionRPM({ ...params, semanasReferenciaDeclaradas: null })

    expect(sinParametroNuevo.ibl.vidaLaboral).not.toBeNull()
    expect(sinParametroNuevo.ibl.razonVidaLaboralNoEvaluada).toBeNull()
    expect(conNullExplicito).toEqual(sinParametroNuevo)
    expect(sinParametroNuevo.semanasCotizadas.fuente).toBe('historia_estructurada')
  })
})

// Cierre de integridad (Carlos/Atlas, 2026-09-04): calcularProyeccionRPM.js es una frontera
// pública del motor y debe defender sus propias precondiciones de historiaCotizacion, sin
// depender de que quien la invoque ya haya pasado por evaluarElegibilidadProyectadaRPM.js.
// Estas pruebas invocan calcularProyeccionRPM DIRECTAMENTE (nunca a través de
// generarCaminosRPM.js) para los mismos casos que validarHistoriaCotizacionTemporal.test.js
// ya cubre a nivel de función pura — aquí se verifica la integración real.
describe('calcularProyeccionRPM — cierre de integridad: valida historiaCotizacion al comienzo, antes de cualquier cifra', () => {
  // edadJubilacionDeseada: 90 (no 65) — horizonte de ~24 años, muy por encima de los 3.650
  // días que exige la ventana del IBL, para que los casos "CONSERVADO" (que sí deben
  // llegar a `estado: 'calculado'`) no fallen por una razón no relacionada con esta
  // corrección (ventana incompleta) — los casos de rechazo no dependen del horizonte, se
  // detienen antes de resolverlo.
  const PARAMS_BASE = {
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 90,
    escenarioIbcFuturo: escenarioContinuidad(2000000),
    fecha: FECHA_CALCULO,
  }

  it('historiaCotizacion no-arreglo (null): se detiene limpiamente, sin lanzar, con HISTORIA_NO_ES_ARREGLO_VALIDO', () => {
    expect(() => calcularProyeccionRPM({ ...PARAMS_BASE, historiaCotizacion: null })).not.toThrow()
    const r = calcularProyeccionRPM({ ...PARAMS_BASE, historiaCotizacion: null })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('HISTORIA_NO_ES_ARREGLO_VALIDO')
    expect(r.pensionMensualProyectada).toBeNull()
    expect(r.ibl).toBeNull()
    expect(r.tasaReemplazo).toBeNull()
  })

  it('historiaCotizacion no-arreglo (string): se detiene limpiamente, sin lanzar', () => {
    expect(() => calcularProyeccionRPM({ ...PARAMS_BASE, historiaCotizacion: 'no-es-un-arreglo' })).not.toThrow()
    const r = calcularProyeccionRPM({ ...PARAMS_BASE, historiaCotizacion: 'no-es-un-arreglo' })
    expect(r.razonNoEvaluable).toBe('HISTORIA_NO_ES_ARREGLO_VALIDO')
  })

  it('período con fecha inválida: HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA, sin NaN en ningún campo de salida', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: 'no-es-una-fecha', fechaHasta: '2020-12-31', ibc: 1000000, diasCotizados: 300 }],
    })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA')
    expect(r.pensionMensualProyectada).toBeNull()
  })

  it('período con fechas invertidas: HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS — antes de esta corrección, este caso caía en un código distinto (INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS) más adelante en seleccionarPeriodosIBL.js; ahora se rechaza aquí, al comienzo, con el código canónico', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: '2020-06-01', fechaHasta: '2020-01-01', ibc: 1000000, diasCotizados: 30 }],
    })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS')
  })

  it('período totalmente posterior a fechaCalculo: HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO — mismo código que antes de esta corrección (comportamiento vigente conservado)', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', ibc: 1000000, diasCotizados: 365 }],
    })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('período parcialmente posterior a fechaCalculo (empieza antes, termina después): mismo código, comportamiento vigente conservado', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: '2025-06-01', fechaHasta: '2026-06-30', ibc: 1000000, diasCotizados: 395 }],
    })
    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('CONSERVADO — arreglo vacío (valor por defecto): comportamiento vigente sin cambios, calcula normalmente', () => {
    const r = calcularProyeccionRPM(PARAMS_BASE)
    expect(r.estado).toBe('calculado')
  })

  it('CONSERVADO — historia válida (sin ningún período futuro ni inconsistente): comportamiento vigente sin cambios', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: '2020-01-01', fechaHasta: '2025-12-31', ibc: 1500000, diasCotizados: 2192 }],
    })
    expect(r.estado).toBe('calculado')
    expect(r.pensionMensualProyectada).toBeGreaterThan(0)
  })

  it('CONSERVADO — período que termina EXACTAMENTE en fechaCalculo: no se rechaza (límite inclusive), comportamiento vigente sin cambios', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: '2020-01-01', fechaHasta: FECHA_CALCULO, ibc: 1500000, diasCotizados: 2192 }],
    })
    expect(r.estado).toBe('calculado')
  })

  it('CONSERVADO — período que termina el día calendario anterior a fechaCalculo: no se rechaza, comportamiento vigente sin cambios', () => {
    const r = calcularProyeccionRPM({
      ...PARAMS_BASE,
      historiaCotizacion: [{ fechaDesde: '2020-01-01', fechaHasta: '2025-12-31', ibc: 1500000, diasCotizados: 2191 }],
    })
    expect(r.estado).toBe('calculado')
  })
})

// E3-C2a (plomería interna, sin integrar todavía ajustarMesadaLegalRPM.js): esta suite prueba
// exclusivamente que sustituir calcularTasaReemplazoRPM() por desglosarTasaReemplazoRPM()
// dentro de calcularProyeccionRPM.js es un cambio de plomería puro — cero diferencia numérica,
// pensionMensualProyectada sigue siendo el resultado matemático crudo (nunca redefinido,
// Decisión 1 de E3-C2), y el límite interno del 80% (que vive únicamente en
// desglosarTasaReemplazoRPM, ver formulaRPM.js) no se aplica dos veces ni diverge entre las
// dos rutas de cálculo (tasaReemplazo vía el desglose, pensionMensualProyectada vía
// formulaRPM(), que internamente llama al mismo desglose). Cada test reconstruye
// parametrosLegales/datosUsuario de forma independiente, con las mismas piezas públicas que
// calcularProyeccionRPM.js ya usa (resolverSmlvVigenteRPM + obtenerParametrosTasaReemplazoRPM
// + los campos ya expuestos del resultado) — nunca leyendo un campo interno no expuesto.
describe('calcularProyeccionRPM — E3-C2a: tasaReemplazo vía desglosarTasaReemplazoRPM, pensionMensualProyectada sin cambios', () => {
  const perfilBase = {
    historiaCotizacion: historiaDiezAniosCompleta(),
    fechaNacimiento: '1976-01-01',
    edadJubilacionDeseada: 62,
    escenarioIbcFuturo: escenarioContinuidad(2000000),
  }

  function desgloseIndependiente(fecha, resultado) {
    const smlvVigente = resolverSmlvVigenteRPM(fecha)
    const parametrosLegales = { ...obtenerParametrosTasaReemplazoRPM(fecha), smlv: smlvVigente.valor }
    const datosUsuario = { ibl: resultado.ibl.aplicable, semanasCotizadas: resultado.semanasCotizadas.total }
    return { desglose: desglosarTasaReemplazoRPM({ datosUsuario, parametrosLegales }), datosUsuario, parametrosLegales }
  }

  it('escenario base: tasaReemplazo coincide exactamente con desglosarTasaReemplazoRPM(...).tasaFinalAplicada', () => {
    const fecha = '2026-02-11'
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha })
    expect(resultado.estado).toBe('calculado')

    const { desglose } = desgloseIndependiente(fecha, resultado)
    expect(resultado.tasaReemplazo).toBe(desglose.tasaFinalAplicada)
  })

  it('escenario base: pensionMensualProyectada sigue siendo exactamente formulaRPM(datosUsuario, parametrosLegales) — el resultado matemático crudo, nunca el ajustado', () => {
    const fecha = '2026-02-11'
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha })
    const { datosUsuario, parametrosLegales } = desgloseIndependiente(fecha, resultado)

    expect(resultado.pensionMensualProyectada).toBe(formulaRPM({ datosUsuario, parametrosLegales }))
  })

  it('escenario base: la relación pensionMensualProyectada = ibl.aplicable * tasaReemplazo/100 se mantiene (misma aritmética que antes de E3-C2a)', () => {
    const fecha = '2026-02-11'
    const resultado = calcularProyeccionRPM({ ...perfilBase, fecha })
    const pensionEsperada = resultado.ibl.aplicable * (resultado.tasaReemplazo / 100)
    expect(resultado.pensionMensualProyectada).toBeCloseTo(pensionEsperada, 6)
  })

  it('carrera larga (26 años, ~1356 semanas) con IBC futuro bajo — región donde el incremento por semanas puede acercar o superar el límite del 80%: tasaReemplazo y pensionMensualProyectada siguen sin divergir de una única aplicación del desglose (nunca doble aplicación del límite)', () => {
    const historia = historiaVeintiseisAnios()
    const fecha = FECHA_CALCULO
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1996-01-31',
      edadJubilacionDeseada: 30,
      escenarioIbcFuturo: escenarioContinuidad(1500000),
      fecha,
    })
    expect(resultado.estado).toBe('calculado')
    expect(resultado.tasaReemplazo).toBeLessThanOrEqual(80)

    const { desglose, datosUsuario, parametrosLegales } = desgloseIndependiente(fecha, resultado)
    expect(resultado.tasaReemplazo).toBe(desglose.tasaFinalAplicada)
    expect(resultado.pensionMensualProyectada).toBe(formulaRPM({ datosUsuario, parametrosLegales }))
  })
})
