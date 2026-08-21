// Validación empírica del bloqueo §8.5 del Entregable 2 ("Monotonicidad aún no
// demostrada") — prerrequisito explícito de S4-003 (ver entregable-2-...md §10, fila
// S4-003: "Dependencias: S4-002 + validación de monotonicidad (§8.5)").
//
// Pregunta: ¿pensionMensualProyectada es monótona respecto de escenarioIbcFuturo.valor,
// manteniendo fijos todos los demás parámetros (historia, fecha, fechaReconocimiento)?
//
// No se implementa aquí generarCaminosRPM.js ni ninguna bisección — solo se barre
// calcularProyeccionRPM.js con valores crecientes de escenarioIbcFuturo.valor y se
// verifica la propiedad, buscando activamente un contraejemplo (IBC1 < IBC2 con
// pensión(IBC1) > pensión(IBC2)).
//
// Derivación analítica previa (ver reporte de la sesión, no repetida en detalle aquí):
// pensión(IBL) = [(65.5+incremento)·IBL − 0.5·IBL²/SMLV] / 100 antes de cualquier clamp
// — una parábola con vértice en IBL* ≈ (65.5+incremento)×SMLV, muy por encima del tope
// legal (25×SMLV) y del punto donde la tasa base clampa al piso (21×SMLV). El dominio
// alcanzable (acotado por el tope) queda íntegramente del lado ascendente de la parábola.

import { describe, it, expect } from 'vitest'
import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'

const FECHA_CALCULO = '2026-01-01'
const SMLV_2026 = 1750905
const TOPE_IBC_2026 = 25 * SMLV_2026 // 43.772.625

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}
function diasEnAnio(anio) {
  return esBisiesto(anio) ? 366 : 365
}
function periodoAnioCompleto(anio, ibc) {
  return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: diasEnAnio(anio) }
}
function historiaAnios(desde, hasta, ibc = 1000000) {
  const periodos = []
  for (let anio = desde; anio <= hasta; anio++) periodos.push(periodoAnioCompleto(anio, ibc))
  return periodos
}

function escenario(valor) {
  return { valor, origen: 'continuidad_ibc_actual' }
}

/**
 * Evalúa calcularProyeccionRPM en una secuencia CRECIENTE de valores de
 * escenarioIbcFuturo.valor y verifica que pensionMensualProyectada nunca decrezca —
 * comparando cada par consecutivo, no solo extremos, para no dejar pasar un
 * contraejemplo local escondido en medio del barrido.
 *
 * @returns {Array<{valor: number, resultado: Object}>} para inspección adicional del test
 */
function barrerYVerificarMonotonia(inputBase, valores) {
  const puntos = valores.map((valor) => ({
    valor,
    resultado: calcularProyeccionRPM({ ...inputBase, escenarioIbcFuturo: escenario(valor) }),
  }))

  for (let i = 1; i < puntos.length; i++) {
    const anterior = puntos[i - 1]
    const actual = puntos[i]
    if (anterior.resultado.estado !== 'calculado' || actual.resultado.estado !== 'calculado') continue

    const pensionAnterior = anterior.resultado.pensionMensualProyectada
    const pensionActual = actual.resultado.pensionMensualProyectada

    // Tolerancia mínima solo para ruido de punto flotante (no para ocultar un
    // contraejemplo real) — 1 peso sobre cifras del orden de millones es ruido, no señal.
    if (pensionActual < pensionAnterior - 0.01) {
      throw new Error(
        `CONTRAEJEMPLO: IBC1=${anterior.valor} → pensión=${pensionAnterior}; ` +
          `IBC2=${actual.valor} → pensión=${pensionActual} (decreció ${pensionAnterior - pensionActual})`
      )
    }
  }

  return puntos
}

function rangoLineal(desde, hasta, pasos) {
  const valores = []
  for (let i = 0; i <= pasos; i++) valores.push(desde + ((hasta - desde) * i) / pasos)
  return valores
}

describe('Monotonicidad de calcularProyeccionRPM respecto de escenarioIbcFuturo.valor (§8.5)', () => {
  it('ventana 100% futura (horizonte ≥10 años): barrido amplio desde IBC bajo hasta el tope, incluida la zona del piso de tasa (s≈21)', () => {
    const inputBase = {
      historiaCotizacion: historiaAnios(2016, 2025),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72, // fechaReconocimiento = 2036-01-01, horizonte > 3650 días
      fecha: FECHA_CALCULO,
    }
    // 60 puntos entre 500.000 y el tope — incluye deliberadamente la zona s∈[19,23]
    // (piso de tasa en s=21) con resolución fina adicional.
    const valores = [
      ...rangoLineal(500000, 30000000, 20),
      ...rangoLineal(30000000, 40000000, 40), // fino alrededor de s=21 (~36.769.005)
      ...rangoLineal(40000000, TOPE_IBC_2026, 20),
    ]
    const puntos = barrerYVerificarMonotonia(inputBase, valores)

    // Confirma que el barrido realmente cruzó el piso de tasa (s=21): tasaReemplazo debe
    // bajar de un valor alto (IBC pequeño) a exactamente 55 (o cerca, según incremento)
    // en algún punto del barrido — si no, el test no estaría probando lo que dice probar.
    const tasas = puntos.map((p) => p.resultado.tasaReemplazo)
    expect(Math.max(...tasas)).toBeGreaterThan(60)
    expect(Math.min(...tasas)).toBeLessThanOrEqual(56)
  })

  it('estrictamente creciente antes del tope, plana en o después del tope (100% futuro)', () => {
    const inputBase = {
      historiaCotizacion: historiaAnios(2016, 2025),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 72,
      fecha: FECHA_CALCULO,
    }
    const antesDelTope = calcularProyeccionRPM({ ...inputBase, escenarioIbcFuturo: escenario(TOPE_IBC_2026 - 1000000) })
    const enElTope = calcularProyeccionRPM({ ...inputBase, escenarioIbcFuturo: escenario(TOPE_IBC_2026) })
    const masAllaDelTope1 = calcularProyeccionRPM({ ...inputBase, escenarioIbcFuturo: escenario(TOPE_IBC_2026 + 5000000) })
    const masAllaDelTope2 = calcularProyeccionRPM({ ...inputBase, escenarioIbcFuturo: escenario(TOPE_IBC_2026 + 50000000) })

    expect(enElTope.pensionMensualProyectada).toBeGreaterThan(antesDelTope.pensionMensualProyectada)
    // Más allá del tope: plana, no decreciente — valorAplicado se satura, nunca decrece.
    expect(masAllaDelTope1.pensionMensualProyectada).toBe(enElTope.pensionMensualProyectada)
    expect(masAllaDelTope2.pensionMensualProyectada).toBe(enElTope.pensionMensualProyectada)
  })

  it('ventana mixta (historia real + horizonte corto de 2 años): mismo barrido, mismo resultado', () => {
    const inputBase = {
      historiaCotizacion: historiaAnios(2016, 2025),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64, // fechaReconocimiento = 2028-01-01, horizonte ≈ 2 años
      fecha: FECHA_CALCULO,
    }
    const valores = rangoLineal(500000, TOPE_IBC_2026, 60)
    barrerYVerificarMonotonia(inputBase, valores)
  })

  it('horizonte extremadamente corto (1 día)', () => {
    // fechaReconocimiento debe ser posterior a FECHA_CALCULO — se resuelve directamente
    // con una fecha de nacimiento que produzca 2026-01-02.
    const inputHorizonte1Dia = {
      historiaCotizacion: historiaAnios(2016, 2025),
      fechaNacimiento: '1965-01-02',
      edadJubilacionDeseada: 61, // 1965 + 61 = 2026-01-02
      fecha: FECHA_CALCULO,
    }
    const valores = rangoLineal(500000, TOPE_IBC_2026, 40)
    barrerYVerificarMonotonia(inputHorizonte1Dia, valores)
  })

  it('horizonte muy largo (40 años) con muchas semanas totales (incremento grande) y IBC bajo: zona del techo de tasa (80%)', () => {
    // Historia larga (1986-2025, 40 años, ~2086 semanas) — suficiente para tramos ≈ 15,
    // incremento ≈ 22.5 puntos, empujando base+incremento por encima de 80 con IBC bajo.
    // La ventana ordinaria (horizonte corto) solo necesita retroceder hasta ~2016,
    // dentro de ipc-historico.json — no hace falta que toda la historia tenga IPC.
    const inputBase = {
      historiaCotizacion: historiaAnios(1986, 2025),
      fechaNacimiento: '1996-01-31',
      edadJubilacionDeseada: 30, // fechaReconocimiento = 2026-01-31, horizonte corto
      fecha: FECHA_CALCULO,
    }
    const valores = rangoLineal(200000, 8000000, 40) // IBC bajo, para permanecer cerca del techo
    const puntos = barrerYVerificarMonotonia(inputBase, valores)

    // Confirma que efectivamente se tocó el clamp de techo (80%) — si no, el caso no
    // estaría probando lo que dice probar.
    const tasas = puntos.filter((p) => p.resultado.estado === 'calculado').map((p) => p.resultado.tasaReemplazo)
    expect(Math.max(...tasas)).toBe(80)
  })

  it('vida laboral disponible (esOpcionLegal puede activarse durante el barrido): sigue siendo monótona', () => {
    // Mismo escenario que el test de S4-002 donde vidaLaboral queda disponible
    // (historia 2016-2025 + horizonte ~15 años → semanas totales > 1250, sin años
    // fuera de ipc-historico.json en ninguna de las dos ramas).
    const inputBase = {
      historiaCotizacion: historiaAnios(2016, 2025),
      fechaNacimiento: '1976-01-01',
      edadJubilacionDeseada: 65, // fechaReconocimiento = 2041-01-01
      fecha: FECHA_CALCULO,
    }
    const valores = rangoLineal(500000, TOPE_IBC_2026, 80) // resolución fina, buscando el cruce ordinario/vidaLaboral
    const puntos = barrerYVerificarMonotonia(inputBase, valores)

    // Confirma que el barrido realmente atravesó AMBOS regímenes (esOpcionLegal true y
    // false) — verificado con 200 puntos en la exploración previa a este archivo: el
    // cruce ocurre cerca de valor≈1.58M, con la pensión subiendo con normalidad a ambos
    // lados (900.591 → 1.028.944), sin caída en el punto de cruce. Si esta aserción
    // alguna vez fallara (un solo valor observado), el test dejaría de ejercitar el
    // cruce entre ramas y habría que ajustar el rango del barrido, no debilitarla.
    const estados = puntos
      .filter((p) => p.resultado.estado === 'calculado')
      .map((p) => p.resultado.ibl.esOpcionLegal)
    expect(new Set(estados)).toEqual(new Set([true, false]))
  })
})
