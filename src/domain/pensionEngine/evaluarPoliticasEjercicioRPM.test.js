// E5.4 — pruebas de evaluarPoliticasEjercicioRPM.js (adaptador entre generarCaminosRPM.js y
// compararAnclaIncrementoRPM.js, PL-260 §8.6).
//
// Convención de este archivo (mismo criterio ya usado en construirEjercicioResueltoRPM.test.js,
// E5.3): cada describe/it indica explícitamente si construye su entrada con una llamada REAL a
// generarCaminosRPM() o con un objeto SINTÉTICO mínimo (para ejercitar ramas del contrato —
// principalmente las defensivas de compararAnclaIncrementoRPM/E5.4-A— que los datos reales de
// hoy no alcanzan a producir: no hay SMLV cargado antes de 2026, y un camino solo es 'viable'
// cuando ya cumplió elegibilidad con la MISMA fórmula/fecha que usa el comparador, así que
// SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE y los bloqueos de vigencia del SMLV son
// estructuralmente inalcanzables desde un camino viable real — ver comentario de diseño #8 en
// evaluarPoliticasEjercicioRPM.js). Ningún test depende del orden de otro.

import { describe, it, expect } from 'vitest'
import { generarCaminosRPM } from './generarCaminosRPM.js'
import {
  evaluarPoliticasEjercicioRPM,
  CODIGOS_ENTRADA_INVALIDA,
  NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER,
} from './evaluarPoliticasEjercicioRPM.js'
import { compararAnclaIncrementoRPM } from './compararAnclaIncrementoRPM.js'
import { construirEjercicioResueltoRPM, CODIGOS_RAZON_INCOMPLETO, CODIGOS_RAZON_NO_PUBLICABLE } from './construirEjercicioResueltoRPM.js'
import { obtenerSmlv } from '../../data/legal/index.js'

// --- Datos reales propios de este archivo (mismo criterio que construirEjercicioResueltoRPM.test.js: nunca importados de otro .test.js) ---
const SMLV_2026 = obtenerSmlv('2026-06-15').valor

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}
function diasEnAnio(anio) {
  return esBisiesto(anio) ? 366 : 365
}
function periodoAnioCompleto(anio, ibc) {
  return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: diasEnAnio(anio) }
}
function historiaAnios(desde, hasta) {
  const periodos = []
  for (let anio = desde; anio <= hasta; anio++) periodos.push(periodoAnioCompleto(anio, 1000000 + anio))
  return periodos
}

// --- REAL: mujer nacida en 1974-01-01, objetivo 57 años con fecha=2026-01-01 ->
// fechaObjetivoSolicitada=2031-01-01. ~1300 semanas totales (declaración 1039 + futuras
// 260.857142857143), dentro del rango divergente del cronograma C-197/2023 en la fecha de
// aplicación (mínimo dinámico 1125 en 2031, frente al ancla fija 1300) — mismo fixture
// verificado en el diagnóstico E5.4/D4. `objetivoValorMensual` bajo (alcanzable con el IBC de
// simulación) para que el único camino resultante sea 'base', viable, sin alternativo.
function resultadoRealMujerRangoDivergente(overrides = {}) {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Mujer',
    historiaCotizacion: historiaAnios(1990, 2025),
    semanasReferenciaDeclaradas: { cantidad: 1039, certeza: 'conocido' },
    fechaNacimiento: '1974-01-01',
    edadJubilacionDeseada: 57,
    ibcAplicableSimulacion: SMLV_2026,
    objetivoValorMensual: SMLV_2026,
    fecha: '2026-01-01',
    ...overrides,
  })
}

// --- REAL: mismo perfil, pero con historia/declaración insuficiente para alcanzar el mínimo
// dinámico exigido en su propia fechaObjetivoSolicitada (2031, mínimo 1125) — elegibilidad
// NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO, generarCaminosRPM nunca construye ningún camino. ---
function resultadoRealMujerBajoElMinimoDinamico() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Mujer',
    historiaCotizacion: [],
    semanasReferenciaDeclaradas: { cantidad: 200, certeza: 'conocido' },
    fechaNacimiento: '1974-01-01',
    edadJubilacionDeseada: 57,
    ibcAplicableSimulacion: SMLV_2026,
    objetivoValorMensual: SMLV_2026,
    fecha: '2026-01-01',
  })
}

// --- REAL: perfil ordinario de hombre, mismo patrón que construirEjercicioResueltoRPM.test.js ---
function resultadoRealHombre() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaAnios(1990, 2025),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 1600000,
    fecha: '2026-01-01',
  })
}

// --- SINTÉTICO mínimo: solo los campos que evaluarPoliticasEjercicioRPM realmente lee de
// resultadoGenerarCaminos — usado exclusivamente para ejercitar ramas del comparador que datos
// reales de hoy no alcanzan a producir (ver cabecera de este archivo). ---
function resultadoSinteticoUnCamino({ fechaBaseMonetaria, fechaAplicacion, semanas = 1300, ibl = SMLV_2026 }) {
  return {
    elegibilidad: { semanasMinimasAplicables: { fechaAplicacion } },
    escenarios: [
      {
        estado: 'viable',
        ajusteLegal: { fechaBaseMonetaria },
        semanasCotizadas: { total: semanas },
        ibl: { aplicable: ibl },
      },
    ],
  }
}

describe('evaluarPoliticasEjercicioRPM — ENTRADA_INVALIDA estructural (SINTÉTICO)', () => {
  it('resultadoGenerarCaminos ausente', () => {
    const r = evaluarPoliticasEjercicioRPM({ sexo: 'Mujer' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO, campo: 'resultadoGenerarCaminos' }))
  })

  it('resultadoGenerarCaminos.escenarios no es un arreglo', () => {
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: { escenarios: 'no-es-arreglo' }, sexo: 'Mujer' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO }))
  })

  it('sexo ausente', () => {
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: { escenarios: [] } })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.SEXO_INVALIDO, campo: 'sexo' }))
  })

  it("sexo inválido — nunca se asume 'Hombre' por defecto", () => {
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: { escenarios: [] }, sexo: 'Otro' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.SEXO_INVALIDO }))
  })

  it('ambos campos inválidos a la vez: ambos errores presentes, ninguno oculta al otro', () => {
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: null, sexo: undefined })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toHaveLength(2)
    expect(r.errores.map((e) => e.codigo).sort()).toEqual([CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO, CODIGOS_ENTRADA_INVALIDA.SEXO_INVALIDO].sort())
  })

  it('llamada sin ningún argumento no lanza', () => {
    expect(() => evaluarPoliticasEjercicioRPM()).not.toThrow()
    expect(evaluarPoliticasEjercicioRPM().estado).toBe('ENTRADA_INVALIDA')
  })
})

describe('evaluarPoliticasEjercicioRPM — ninguna política aplica → [] (REAL)', () => {
  it('4. Hombre: la ancla de hombre no tiene cronograma, nunca diverge — []', () => {
    const real = resultadoRealHombre()
    expect(real.escenarios[0].estado).toBe('viable')
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Hombre' })
    expect(r).toEqual({ estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: [] })
  })

  it('5. Mujer por debajo del mínimo dinámico en su propia fecha de aplicación: elegibilidad NO_CUMPLE, sin ningún camino que evaluar — []', () => {
    const real = resultadoRealMujerBajoElMinimoDinamico()
    expect(real.elegibilidad.estado).toBe('NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO')
    expect(real.elegibilidad.semanasTotalesEnFechaObjetivo).toBeLessThan(real.elegibilidad.semanasMinimasAplicables.valor)
    expect(real.escenarios).toEqual([])
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Mujer' })
    expect(r).toEqual({ estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: [] })
  })

  it('6. Sin caminos viables por una causa genérica distinta (edad no alcanzada) — []: la regla no depende de POR QUÉ falta el camino', () => {
    const real = generarCaminosRPM({
      regimenActual: 'RPM',
      sexo: 'Mujer',
      historiaCotizacion: historiaAnios(1990, 2025),
      fechaNacimiento: '2010-01-01',
      edadJubilacionDeseada: 30,
      ibcAplicableSimulacion: 2000000,
      objetivoValorMensual: 1600000,
      fecha: '2026-01-01',
    })
    expect(real.escenarios).toEqual([])
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Mujer' })
    expect(r).toEqual({ estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: [] })
  })
})

describe('evaluarPoliticasEjercicioRPM — ninguna política aplica → [] (SINTÉTICO: rango del comparador que datos reales de 2026+ no producen)', () => {
  it('3. Mujer con fechaAplicacionRegla anterior al cronograma de C-197/2023: anclas coinciden, sin incertidumbre — []', () => {
    // No reproducible con datos reales: fechaAplicacionRegla (=fechaObjetivoSolicitada) es
    // siempre >= fecha (horizonte futuro), y no hay SMLV cargado antes de 2026 — así que un
    // ejercicio real con fecha>=2026 nunca tiene fechaAplicacionRegla<2026. Se ejercita la
    // rama de todos modos porque es parte cerrada del contrato del comparador.
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-06-15', fechaAplicacion: '2025-06-15' })
    const comparadorDirecto = compararAnclaIncrementoRPM({ fecha: '2026-06-15', fechaAplicacionRegla: '2025-06-15', sexo: 'Mujer', semanasCotizadas: 1300, ibl: SMLV_2026 })
    expect(comparadorDirecto.evaluable).toBe(true)
    expect(comparadorDirecto.incertidumbreJuridica.existe).toBe(false)

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r).toEqual({ estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: [] })
  })

  it('4. SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE (rama defensiva del comparador, no alcanzable desde un camino real viable): [] — decisión Carlos/Atlas 2026-09-20, nunca una entrada RESUELTA inerte', () => {
    // La política no llega a aplicarse al ejercicio y no hay incertidumbre jurídica que
    // afecte el resultado — una entrada RESUELTA/aplicaAEsteEjercicio:false sería
    // información inerte en politicasInvolucradas (ver decisión de diseño #8 en
    // evaluarPoliticasEjercicioRPM.js). Misma familia que el caso anterior (evaluable sin
    // incertidumbre): ambos devuelven [], nunca una entrada inerte.
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-06-15', fechaAplicacion: '2026-06-15', semanas: 100 })
    const comparadorDirecto = compararAnclaIncrementoRPM({ fecha: '2026-06-15', fechaAplicacionRegla: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 100, ibl: SMLV_2026 })
    expect(comparadorDirecto.razon.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE')

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r).toEqual({ estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: [] })
  })
})

describe('evaluarPoliticasEjercicioRPM — mujer en rango divergente real (REAL) — caso central del diagnóstico E5.4', () => {
  it('1. Valoración 2026, aplicación 2031: mínimo dinámico 1125, divergencia de 4.5 puntos, política NO_RESUELTA y aplicable', () => {
    const real = resultadoRealMujerRangoDivergente()
    expect(real.elegibilidad.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(real.elegibilidad.fechaObjetivoSolicitada).toBe('2031-01-01')
    expect(real.elegibilidad.semanasMinimasAplicables).toMatchObject({ valor: 1125, fechaAplicacion: '2031-01-01' })
    expect(real.escenarios[0].estado).toBe('viable')

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Mujer' })
    expect(r.estado).toBe('POLITICAS_EVALUADAS')
    expect(r.politicasInvolucradas).toHaveLength(1)
    expect(r.politicasInvolucradas[0]).toMatchObject({
      nombre: NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER,
      estado: 'NO_RESUELTA',
      aplicaAEsteEjercicio: true,
    })

    // Confirma la divergencia real de 4.5 puntos que motivó D4/E5.4-A, y que E5.4 nunca
    // recalcula ni reexpone directamente (solo decide estado/aplicaAEsteEjercicio a partir de
    // incertidumbreJuridica, nunca de la cifra numérica de la diferencia).
    const comparadorDirecto = compararAnclaIncrementoRPM({
      fecha: real.escenarios[0].ajusteLegal.fechaBaseMonetaria,
      fechaAplicacionRegla: real.elegibilidad.semanasMinimasAplicables.fechaAplicacion,
      sexo: 'Mujer',
      semanasCotizadas: real.escenarios[0].semanasCotizadas.total,
      ibl: real.escenarios[0].ibl.aplicable,
    })
    expect(comparadorDirecto.minimoAplicable.valor).toBe(1125)
    expect(comparadorDirecto.diferencia).toEqual({ puntosPorcentuales: 4.5, existeDiferencia: true })
    expect(r.politicasInvolucradas[0].mensaje).toBe(comparadorDirecto.incertidumbreJuridica.mensaje)
  })

  it('2. Integración contractual real con construirEjercicioResueltoRPM: completo:false / publicable:false, POLITICA_JURIDICA_NO_RESUELTA + EJERCICIO_NO_COMPLETO', () => {
    const real = resultadoRealMujerRangoDivergente()
    const { politicasInvolucradas } = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Mujer' })
    expect(politicasInvolucradas).toHaveLength(1)

    const ejercicio = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 57,
      confirmacionesSupuestos: [
        { codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES', confirmado: true, textoAceptado: 'Entiendo y quiero explorar este escenario.', edadObjetivoConfirmada: 57 },
      ],
      politicasInvolucradas,
    })

    expect(ejercicio.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(ejercicio.completo).toBe(false)
    expect(ejercicio.razonesIncompleto).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_INCOMPLETO.POLITICA_JURIDICA_NO_RESUELTA }))
    expect(ejercicio.publicable).toBe(false)
    expect(ejercicio.razonesNoPublicable).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_NO_PUBLICABLE.EJERCICIO_NO_COMPLETO }))
  })
})

describe('evaluarPoliticasEjercicioRPM — bloqueos fail-closed del comparador (SINTÉTICO: fuera del alcance de datos reales de hoy)', () => {
  it('10. Bloqueo de vigencia del SMLV (ventana de fundamento no verificado, E3-A): política aplicable NO_RESUELTA, mensaje EXACTO del comparador — nunca "no aplica"', () => {
    // No reproducible con un camino REAL viable: la misma ventana bloquea también
    // ajustarMesadaLegalRPM.js (mismo criterio de vigencia en todo el motor), así que ningún
    // camino real puede llegar a 'viable' con esta fecha base monetaria.
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-02-12', fechaAplicacion: '2031-01-01' })
    const comparadorDirecto = compararAnclaIncrementoRPM({ fecha: '2026-02-12', fechaAplicacionRegla: '2031-01-01', sexo: 'Mujer', semanasCotizadas: 1300, ibl: SMLV_2026 })
    expect(comparadorDirecto.evaluable).toBe(false)
    expect(comparadorDirecto.razon.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.estado).toBe('POLITICAS_EVALUADAS')
    expect(r.politicasInvolucradas).toEqual([
      {
        nombre: NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER,
        estado: 'NO_RESUELTA',
        aplicaAEsteEjercicio: true,
        mensaje: comparadorDirecto.razon.mensaje,
      },
    ])
  })

  it('FUENTE_LEGAL_NO_ENCONTRADA (sin SMLV cargado para la fecha): también fail-closed NO_RESUELTA/aplicable, nunca []', () => {
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2025-06-15', fechaAplicacion: '2025-06-15' })
    const comparadorDirecto = compararAnclaIncrementoRPM({ fecha: '2025-06-15', fechaAplicacionRegla: '2025-06-15', sexo: 'Mujer', semanasCotizadas: 1300, ibl: SMLV_2026 })
    expect(comparadorDirecto.razon.codigo).toBe('FUENTE_LEGAL_NO_ENCONTRADA')

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.politicasInvolucradas).toEqual([
      { nombre: NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER, estado: 'NO_RESUELTA', aplicaAEsteEjercicio: true, mensaje: comparadorDirecto.razon.mensaje },
    ])
  })
})

describe('evaluarPoliticasEjercicioRPM — 9. datos derivados que el comparador rechaza como ENTRADA_INVALIDA (SINTÉTICO)', () => {
  it('fechaAplicacionRegla con formato inválido: E5.4 devuelve su propio ENTRADA_INVALIDA con COMPARADOR_RECHAZO_ENTRADA_DERIVADA, conservando campo y mensaje reales', () => {
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-06-15', fechaAplicacion: 'no-es-fecha' })
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toHaveLength(1)
    expect(r.errores[0].codigo).toBe(CODIGOS_ENTRADA_INVALIDA.COMPARADOR_RECHAZO_ENTRADA_DERIVADA)
    expect(r.errores[0].campo).toBe('fechaAplicacionRegla')
    // Mensaje EXACTO del comparador (E5.4-A), nunca redactado de nuevo por este archivo.
    const comparadorDirecto = compararAnclaIncrementoRPM({ fecha: '2026-06-15', fechaAplicacionRegla: 'no-es-fecha', sexo: 'Mujer', semanasCotizadas: 1300, ibl: SMLV_2026 })
    expect(r.errores[0].mensaje).toBe(comparadorDirecto.razon.mensaje)
  })

  it('fechaAplicacionRegla null (dato presente pero nulo): el comparador SÍ lo rechaza (el default de JS no se activa con null) — mismo camino que formato inválido', () => {
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-06-15', fechaAplicacion: null })
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toHaveLength(1)
    expect(r.errores[0].codigo).toBe(CODIGOS_ENTRADA_INVALIDA.COMPARADOR_RECHAZO_ENTRADA_DERIVADA)
    expect(r.errores[0].campo).toBe('fechaAplicacionRegla')
    const comparadorDirecto = compararAnclaIncrementoRPM({ fecha: '2026-06-15', fechaAplicacionRegla: null, sexo: 'Mujer', semanasCotizadas: 1300, ibl: SMLV_2026 })
    expect(r.errores[0].mensaje).toBe(comparadorDirecto.razon.mensaje)
  })

  it('fechaAplicacionRegla AUSENTE (undefined): NUNCA puede evaluar en silencio usando fechaBaseMonetaria — bug real de `fechaAplicacionRegla = fecha` en JS al recibir `undefined` explícito', () => {
    // Camino viable con datos numéricos válidos, fechaBaseMonetaria válida, sexo Mujer,
    // fechaAplicacion AUSENTE (undefined) en resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.
    const sintetico = resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-06-15', fechaAplicacion: undefined })
    expect(sintetico.escenarios[0].estado).toBe('viable')
    expect(sintetico.elegibilidad.semanasMinimasAplicables.fechaAplicacion).toBeUndefined()

    // Prueba de control: si E5.4 pasara este `undefined` tal cual, el default de JS
    // (`fechaAplicacionRegla = fecha`) lo sustituiría en silencio por `fecha` y SÍ evaluaría.
    const comparadorConDefaultActivado = compararAnclaIncrementoRPM({
      fecha: '2026-06-15',
      fechaAplicacionRegla: undefined,
      sexo: 'Mujer',
      semanasCotizadas: 1300,
      ibl: SMLV_2026,
    })
    expect(comparadorConDefaultActivado.evaluable).toBe(true)

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toHaveLength(1)
    expect(r.errores[0]).toEqual({
      codigo: CODIGOS_ENTRADA_INVALIDA.COMPARADOR_RECHAZO_ENTRADA_DERIVADA,
      campo: 'resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion',
      mensaje: expect.any(String),
    })
    expect(r.errores[0].mensaje.length).toBeGreaterThan(0)
  })

  it('fechaAplicacionRegla ausente incluso sin elegibilidad.semanasMinimasAplicables (estructura mínima): mismo rechazo, nunca un TypeError', () => {
    const sintetico = {
      elegibilidad: {},
      escenarios: [
        {
          estado: 'viable',
          ajusteLegal: { fechaBaseMonetaria: '2026-06-15' },
          semanasCotizadas: { total: 1300 },
          ibl: { aplicable: SMLV_2026 },
        },
      ],
    }
    expect(() => evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })).not.toThrow()
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores[0].campo).toBe('resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion')
  })

  it('fechaAplicacionRegla válida: sigue produciendo la política esperada sin verse afectada por la validación nueva (REAL)', () => {
    const real = resultadoRealMujerRangoDivergente()
    expect(real.elegibilidad.semanasMinimasAplicables.fechaAplicacion).toBe('2031-01-01')
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Mujer' })
    expect(r.estado).toBe('POLITICAS_EVALUADAS')
    expect(r.politicasInvolucradas).toHaveLength(1)
    expect(r.politicasInvolucradas[0].estado).toBe('NO_RESUELTA')
  })
})

describe('evaluarPoliticasEjercicioRPM — 11. selección del primer camino viable con datos usables, sin ordenar ni recalcular', () => {
  it('salta un primer camino viable SIN ibl utilizable y usa el siguiente que sí lo tiene (SINTÉTICO)', () => {
    const sintetico = {
      elegibilidad: { semanasMinimasAplicables: { fechaAplicacion: '2031-01-01' } },
      escenarios: [
        { estado: 'viable', ajusteLegal: { fechaBaseMonetaria: '2026-01-01' }, semanasCotizadas: { total: 1300 }, ibl: { aplicable: null } },
        { estado: 'viable', ajusteLegal: { fechaBaseMonetaria: '2026-01-01' }, semanasCotizadas: { total: 1300 }, ibl: { aplicable: SMLV_2026 } },
      ],
    }
    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: sintetico, sexo: 'Mujer' })
    expect(r.estado).toBe('POLITICAS_EVALUADAS')
    expect(r.politicasInvolucradas[0].aplicaAEsteEjercicio).toBe(true)
  })

  it('con dos caminos viables reales de distinto IBL (base + alternativo), usa el primero — nunca compara ni combina ambos (REAL)', () => {
    const real = resultadoRealMujerRangoDivergente({ objetivoValorMensual: 3000000 })
    const viables = real.escenarios.filter((e) => e.estado === 'viable')
    expect(viables).toHaveLength(2)
    expect(viables[0].id).toBe('base')
    // Los dos caminos comparten semanas (invariante) pero difieren en IBL — evidencia de que
    // sí son numéricamente distintos y que "usar el primero" no es indiferente por casualidad.
    expect(viables[0].ibl.aplicable).not.toBe(viables[1].ibl.aplicable)
    expect(viables[0].semanasCotizadas.total).toBe(viables[1].semanasCotizadas.total)

    const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: real, sexo: 'Mujer' })

    const comparadorConPrimerCamino = compararAnclaIncrementoRPM({
      fecha: viables[0].ajusteLegal.fechaBaseMonetaria,
      fechaAplicacionRegla: real.elegibilidad.semanasMinimasAplicables.fechaAplicacion,
      sexo: 'Mujer',
      semanasCotizadas: viables[0].semanasCotizadas.total,
      ibl: viables[0].ibl.aplicable,
    })
    const comparadorConSegundoCamino = compararAnclaIncrementoRPM({
      fecha: viables[1].ajusteLegal.fechaBaseMonetaria,
      fechaAplicacionRegla: real.elegibilidad.semanasMinimasAplicables.fechaAplicacion,
      sexo: 'Mujer',
      semanasCotizadas: viables[1].semanasCotizadas.total,
      ibl: viables[1].ibl.aplicable,
    })
    // Los dos IBL sí producen tasas iniciales distintas (prueba de que el segundo camino no
    // habría dado, por casualidad, exactamente el mismo resultado numérico completo).
    expect(comparadorConPrimerCamino.interpretacionPrincipal.tasaInicial).not.toBe(comparadorConSegundoCamino.interpretacionPrincipal.tasaInicial)

    expect(r.politicasInvolucradas[0].mensaje).toBe(comparadorConPrimerCamino.incertidumbreJuridica.mensaje)
  })
})

describe('evaluarPoliticasEjercicioRPM — 12. ningún mensaje jurídico es redactado por este archivo: siempre el texto literal del comparador', () => {
  it('en cada rama que produce una política, el mensaje es idéntico —por referencia de contenido— al que el comparador ya produjo', () => {
    // SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE queda fuera de esta lista a propósito:
    // desde la decisión Carlos/Atlas 2026-09-20 (ver decisión #8 en evaluarPoliticasEjercicioRPM.js)
    // esa rama produce `politicasInvolucradas: []` — no hay ninguna PoliticaInvolucrada cuyo
    // mensaje comparar. Cubierta en su propio test ("ninguna política aplica → []").
    const casos = [
      // [construirEntrada, construirComparadorDirecto]
      [
        () => resultadoRealMujerRangoDivergente(),
        (real) =>
          compararAnclaIncrementoRPM({
            fecha: real.escenarios[0].ajusteLegal.fechaBaseMonetaria,
            fechaAplicacionRegla: real.elegibilidad.semanasMinimasAplicables.fechaAplicacion,
            sexo: 'Mujer',
            semanasCotizadas: real.escenarios[0].semanasCotizadas.total,
            ibl: real.escenarios[0].ibl.aplicable,
          }).incertidumbreJuridica.mensaje,
      ],
      [
        () => resultadoSinteticoUnCamino({ fechaBaseMonetaria: '2026-02-12', fechaAplicacion: '2031-01-01' }),
        () => compararAnclaIncrementoRPM({ fecha: '2026-02-12', fechaAplicacionRegla: '2031-01-01', sexo: 'Mujer', semanasCotizadas: 1300, ibl: SMLV_2026 }).razon.mensaje,
      ],
    ]

    for (const [construirEntrada, mensajeEsperado] of casos) {
      const entrada = construirEntrada()
      const r = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: entrada, sexo: 'Mujer' })
      expect(r.politicasInvolucradas[0].mensaje).toBe(mensajeEsperado(entrada))
    }
  })
})
