// Cierre de integridad (Carlos/Atlas, 2026-09-04): prueba de consistencia cruzada entre
// los tres consumidores de la validación temporal de historiaCotizacion —
// validarHistoriaCotizacionTemporal.js (la fuente), evaluarElegibilidadProyectadaRPM.js,
// calcularProyeccionRPM.js y generarCaminosRPM.js. Verifica que los cuatro reconocen la
// MISMA historia temporalmente inválida y exponen la MISMA razón canónica — nunca una regla
// distinta en cada capa — y que ningún camino puede producir elegibilidad, IBL, pensión ni
// recomendación económica a partir de una historia temporal inválida.
//
// Deliberadamente en su propio archivo: no pertenece únicamente a evaluarElegibilidadProyectadaRPM.js,
// ni a calcularProyeccionRPM.js, ni a generarCaminosRPM.js — es, por diseño, una prueba
// sobre la relación entre los tres, no sobre uno solo.

import { describe, it, expect } from 'vitest'
import { validarHistoriaCotizacionTemporal } from './validarHistoriaCotizacionTemporal.js'
import { evaluarElegibilidadProyectadaRPM } from './evaluarElegibilidadProyectadaRPM.js'
import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { generarCaminosRPM } from './generarCaminosRPM.js'

const FECHA_CALCULO = '2026-01-01'

const CASOS_HISTORIA_INVALIDA = [
  {
    nombre: 'período totalmente futuro',
    historia: [{ fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', ibc: 2000000, diasCotizados: 365 }],
    codigoEsperado: 'HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO',
  },
  {
    nombre: 'período parcialmente futuro',
    historia: [{ fechaDesde: '2025-06-01', fechaHasta: '2026-06-30', ibc: 2000000, diasCotizados: 395 }],
    codigoEsperado: 'HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO',
  },
  {
    nombre: 'fechas invertidas',
    historia: [{ fechaDesde: '2020-06-01', fechaHasta: '2020-01-01', ibc: 2000000, diasCotizados: 30 }],
    codigoEsperado: 'HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS',
  },
  {
    nombre: 'fecha inválida',
    historia: [{ fechaDesde: 'no-es-una-fecha', fechaHasta: '2020-12-31', ibc: 2000000, diasCotizados: 300 }],
    codigoEsperado: 'HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA',
  },
  {
    nombre: 'historia no-arreglo',
    historia: null,
    codigoEsperado: 'HISTORIA_NO_ES_ARREGLO_VALIDO',
  },
]

describe.each(CASOS_HISTORIA_INVALIDA)('Consistencia cruzada — $nombre', ({ historia, codigoEsperado }) => {
  const PERFIL = {
    sexo: 'Hombre',
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 65,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 1600000,
    fecha: FECHA_CALCULO,
  }

  it('las cuatro capas reconocen la misma historia inválida con el mismo código canónico', () => {
    // 1. La fuente misma.
    const validacion = validarHistoriaCotizacionTemporal(historia, FECHA_CALCULO)
    expect(validacion.valida).toBe(false)
    expect(validacion.codigo).toBe(codigoEsperado)

    // 2. evaluarElegibilidadProyectadaRPM.js.
    const elegibilidad = evaluarElegibilidadProyectadaRPM({
      sexo: PERFIL.sexo,
      fechaNacimiento: PERFIL.fechaNacimiento,
      edadJubilacionDeseada: PERFIL.edadJubilacionDeseada,
      historiaCotizacion: historia,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' }, // presente a propósito: no debe rescatar nada
      fecha: FECHA_CALCULO,
    })
    expect(elegibilidad.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(elegibilidad.razones[0].codigo).toBe(codigoEsperado)

    // 3. calcularProyeccionRPM.js, invocado DIRECTAMENTE (sin pasar por generarCaminosRPM.js).
    const proyeccion = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: PERFIL.fechaNacimiento,
      edadJubilacionDeseada: PERFIL.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(proyeccion.estado).toBe('no_evaluable')
    expect(proyeccion.razonNoEvaluable).toBe(codigoEsperado)

    // 4. generarCaminosRPM.js — la razón canónica viaja hasta `elegibilidad.razones[0].codigo`
    // dentro del resultado completo (el orientacion.codigo de más alto nivel es
    // 'DATOS_INCOMPLETOS', un código de presentación distinto y ya existente — la prueba de
    // consistencia es sobre la razón canónica de la validación temporal en sí, no sobre el
    // código de orientación de la UI).
    const caminos = generarCaminosRPM({ ...PERFIL, regimenActual: 'RPM', historiaCotizacion: historia, semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' } })
    expect(caminos.elegibilidad.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(caminos.elegibilidad.razones[0].codigo).toBe(codigoEsperado)

    // Las tres capas activas (elegibilidad, calcularProyeccionRPM directo, generarCaminosRPM)
    // coinciden exactamente en el código canónico — nunca tres reglas distintas.
    expect(elegibilidad.razones[0].codigo).toBe(proyeccion.razonNoEvaluable)
    expect(caminos.elegibilidad.razones[0].codigo).toBe(proyeccion.razonNoEvaluable)
  })

  it('ningún camino produce elegibilidad, IBL, pensión ni recomendación económica a partir de esta historia', () => {
    const elegibilidad = evaluarElegibilidadProyectadaRPM({
      sexo: PERFIL.sexo,
      fechaNacimiento: PERFIL.fechaNacimiento,
      edadJubilacionDeseada: PERFIL.edadJubilacionDeseada,
      historiaCotizacion: historia,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    // Ninguna afirmación de elegibilidad — nunca CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO ni
    // ningún NO_CUMPLE_* (que sí serían una conclusión sobre requisitos, solo que negativa)
    // — el único estado posible aquí es "no evaluable", la ausencia de conclusión.
    expect(elegibilidad.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(elegibilidad.semanasActuales).toBeNull()
    expect(elegibilidad.fechaCompletaSemanas).toBeNull()
    expect(elegibilidad.fechaReconocimientoConjunta).toBeNull()

    const proyeccion = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: PERFIL.fechaNacimiento,
      edadJubilacionDeseada: PERFIL.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(proyeccion.ibl).toBeNull()
    expect(proyeccion.tasaReemplazo).toBeNull()
    expect(proyeccion.pensionMensualProyectada).toBeNull()

    const caminos = generarCaminosRPM({ ...PERFIL, regimenActual: 'RPM', historiaCotizacion: historia, semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' } })
    expect(caminos.escenarios).toEqual([])
    expect(caminos.semanas).toBeNull()
    expect(caminos.barrido).toBeNull()
    expect(caminos.disponibilidadCuantia).toBeNull() // nunca se llega a invocar calcularProyeccionRPM desde aquí
    // Ninguna recomendación de aporte adicional en ningún lugar del resultado.
    expect(JSON.stringify(caminos)).not.toContain('costoPensionalAdicionalMensual')
  })
})
