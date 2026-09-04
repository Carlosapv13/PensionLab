import { describe, it, expect } from 'vitest'
import { evaluarElegibilidadProyectadaRPM } from './evaluarElegibilidadProyectadaRPM.js'
import { calcularFechaPorEdad } from '../calcularFechaPorEdad.js'
import { diasCalendarioEnRango, diaSiguiente } from '../seleccionarPeriodosIBL.js'

const FECHA_CALCULO = '2026-01-01'

function semanasFuturasEsperadas(fechaNacimiento, edadObjetivo, fecha = FECHA_CALCULO) {
  const fechaObjetivo = calcularFechaPorEdad(fechaNacimiento, edadObjetivo)
  return diasCalendarioEnRango(diaSiguiente(fecha), fechaObjetivo) / 7
}

const PERFIL_BASE = {
  sexo: 'Hombre',
  fechaNacimiento: '1964-01-01', // edad actual (2026-01-01) = 62
  edadJubilacionDeseada: 64, // horizonte corto (~2 años), edad ya cumplida
  historiaCotizacion: [],
  semanasReferenciaDeclaradas: null,
  fecha: FECHA_CALCULO,
}

describe('evaluarElegibilidadProyectadaRPM — datos estructurales insuficientes (hard stop)', () => {
  it('sin sexo válido', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, sexo: null })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('SEXO_NO_DECLARADO')
    expect(r.fechaObjetivoSolicitada).toBeNull()
  })

  it('sin fecha de nacimiento válida', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, fechaNacimiento: 'no-es-una-fecha' })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('FECHA_NACIMIENTO_NO_VALIDA')
  })

  it('sin edad de jubilación deseada válida', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, edadJubilacionDeseada: null })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_NO_VALIDA')
  })
})

describe('evaluarElegibilidadProyectadaRPM — Casos de Oscar (regresión, datos sintéticos)', () => {
  // Caso 3A/3B de Oscar: Hombre, 53 años, RPM, hasta 62, sin historia salarial detallada,
  // horizonte < 10 años (< 3.650 días) — exactamente el escenario que antes de E2 quedaba
  // bloqueado por HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA sin nunca llegar a
  // confirmar que la persona sí cumpliría edad y semanas.
  const PERFIL_OSCAR = {
    sexo: 'Hombre',
    fechaNacimiento: '1972-06-15', // 53 años cumplidos al 2026-01-01
    edadJubilacionDeseada: 62,
    historiaCotizacion: [],
    fecha: FECHA_CALCULO,
  }

  it('confirma que el horizonte de este fixture es menor a 10 años (3.650 días) — precondición del caso', () => {
    const futuras = semanasFuturasEsperadas(PERFIL_OSCAR.fechaNacimiento, 62)
    expect(futuras * 7).toBeLessThan(3650)
  })

  it('Oscar 3A — 1.200 semanas declaradas: elegibilidad proyectada evaluada, semanas futuras visibles, supera 1.300 con continuidad, CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_OSCAR,
      semanasReferenciaDeclaradas: { cantidad: 1200, certeza: 'conocido' },
    })

    expect(r.sexoResuelto).toBe('M')
    expect(r.edadMinimaAplicable.valor).toBe(62)
    expect(r.semanasMinimasAplicables.valor).toBe(1300)
    expect(r.semanasActuales.procedencia).toBe('declaracion_agregada')
    expect(r.semanasActuales.cantidad).toBe(1200)

    const futurasEsperadas = semanasFuturasEsperadas(PERFIL_OSCAR.fechaNacimiento, 62)
    expect(r.semanasFuturasHastaFechaObjetivo).toBeCloseTo(futurasEsperadas, 6)
    expect(r.semanasTotalesEnFechaObjetivo).toBeCloseTo(1200 + futurasEsperadas, 6)
    // 1.200 + ~450 semanas futuras (horizonte ~8,6 años) supera ampliamente 1.300.
    expect(r.semanasTotalesEnFechaObjetivo).toBeGreaterThan(1300)

    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.razones).toEqual([])
  })

  it('Oscar 3B — 1.300 semanas declaradas: mismo resultado de elegibilidad (la cuantía, no evaluada aquí, es un contrato distinto)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_OSCAR,
      semanasReferenciaDeclaradas: { cantidad: 1300, certeza: 'conocido' },
    })
    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.semanasActuales.cantidad).toBe(1300)
  })

  it('Oscar 3A y 3B nunca calculan ni exponen pensión, tasa, IBL ni aporte — este contrato solo resuelve fechas y semanas', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_OSCAR,
      semanasReferenciaDeclaradas: { cantidad: 1200, certeza: 'conocido' },
    })
    const claves = Object.keys(r)
    for (const clavesProhibidas of ['pensionMensualProyectada', 'tasaReemplazo', 'ibl', 'esfuerzo', 'aporteMensualPensionPropuesto']) {
      expect(claves).not.toContain(clavesProhibidas)
    }
  })
})

describe('evaluarElegibilidadProyectadaRPM — edad y semanas, orden de cumplimiento', () => {
  it('edad cumplida antes que semanas: fechaCumpleEdad < fechaCompletaSemanas, fechaReconocimientoConjunta = fechaCompletaSemanas', () => {
    // Historia amplia en semanas (muchas semanas ya) pero persona joven — la edad tarda
    // más que las semanas ya cotizadas en completarse... en realidad para forzar
    // "edad ANTES que semanas" se necesita lo opuesto: edad mínima llega pronto, semanas
    // faltan mucho. Usamos una persona con pocas semanas actuales y edad ya cerca del
    // mínimo legal.
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-06-15', // edad actual (2026-01-01) = 61
      edadJubilacionDeseada: 62, // fechaCumpleEdad muy cercana
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 100, certeza: 'conocido' }, // muy pocas semanas
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCumpleEdad < r.fechaCompletaSemanas).toBe(true)
    expect(r.fechaReconocimientoConjunta).toBe(r.fechaCompletaSemanas)
  })

  it('semanas cumplidas antes que edad: fechaCompletaSemanas < fechaCumpleEdad, fechaReconocimientoConjunta = fechaCumpleEdad', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '2000-01-01', // persona joven — la edad mínima (62) tarda décadas
      edadJubilacionDeseada: 62,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1290, certeza: 'conocido' }, // casi las 1.300 ya
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCompletaSemanas < r.fechaCumpleEdad).toBe(true)
    expect(r.fechaReconocimientoConjunta).toBe(r.fechaCumpleEdad)
  })

  it('ambas cumplidas en la fecha objetivo (historia amplia, edad ya alcanzada): CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1960-01-01', // edad actual = 66, ya sobre el mínimo (62)
      edadJubilacionDeseada: 67, // > edadActual (66) — horizonte futuro real, no el mismo día
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1500, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('fecha de reconocimiento conjunta posterior a la fecha objetivo solicitada — el estado se evalúa en fechaObjetivoSolicitada, nunca se prolonga silenciosamente', () => {
    // Persona a la que, en la fecha que pidió explorar, todavía le faltan semanas —
    // fechaReconocimientoConjunta (informativa) cae después de fechaObjetivoSolicitada,
    // pero el estado sigue siendo NO_ELEGIBLE en la fecha que realmente se preguntó.
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1974-01-01',
      edadJubilacionDeseada: 62,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 200, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaReconocimientoConjunta > r.fechaObjetivoSolicitada).toBe(true)
    expect(r.estado).toBe('NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO')
    // La proyección nunca se "adelanta" a fechaReconocimientoConjunta por su cuenta.
    expect(r.semanasTotalesEnFechaObjetivo).toBeLessThan(r.semanasMinimasAplicables.valor)
  })
})

describe('evaluarElegibilidadProyectadaRPM — estados NO_ELEGIBLE con causa explícita', () => {
  it('edad insuficiente, semanas suficientes → NO_CUMPLE_EDAD_EN_FECHA_OBJETIVO', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1990-01-01',
      edadJubilacionDeseada: 50, // < 62
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('NO_CUMPLE_EDAD_EN_FECHA_OBJETIVO')
    expect(r.razones).toHaveLength(1)
    expect(r.razones[0].codigo).toBe('EDAD_INSUFICIENTE')
    expect(r.razones[0].detalle).toEqual({ edadMinima: 62, edadElegida: 50, aniosFaltantes: 12 })
  })

  it('edad suficiente, semanas insuficientes (con evidencia) → NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 50, certeza: 'conocido' },
    })
    expect(r.estado).toBe('NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO')
    expect(r.razones).toHaveLength(1)
    expect(r.razones[0].codigo).toBe('SEMANAS_INSUFICIENTES')
  })

  it('edad y semanas insuficientes (con evidencia) → NO_CUMPLE_EDAD_NI_SEMANAS_EN_FECHA_OBJETIVO, ambas razones presentes', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1990-01-01',
      edadJubilacionDeseada: 50,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 50, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('NO_CUMPLE_EDAD_NI_SEMANAS_EN_FECHA_OBJETIVO')
    expect(r.razones.map((x) => x.codigo).sort()).toEqual(['EDAD_INSUFICIENTE', 'SEMANAS_INSUFICIENTES'])
  })
})

describe('evaluarElegibilidadProyectadaRPM — semanas sin evidencia (historia vacía y sin declaración)', () => {
  it('sin historia y sin declaración, límite inferior de semanas ya insuficiente → NO_EVALUABLE_DATOS_INSUFICIENTES (nunca una afirmación confiada de "no cumples")', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, historiaCotizacion: [], semanasReferenciaDeclaradas: null })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('SEMANAS_ACTUALES_SIN_EVIDENCIA')
    expect(r.semanasActuales.procedencia).toBe('sin_evidencia')
  })

  it('sin historia y sin declaración, pero el límite inferior YA alcanza el mínimo (horizonte largo) → CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO con confianza (más semanas reales solo ayudarían)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1960-01-01',
      edadJubilacionDeseada: 100, // horizonte larguísimo (~36 años, ~1.877 semanas) — > 1.300 solo con el futuro
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: null,
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasActuales.procedencia).toBe('sin_evidencia')
    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('edad insuficiente siempre tiene prioridad de causa, incluso con semanas ambiguas (sin evidencia)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1990-01-01',
      edadJubilacionDeseada: 50,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: null,
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('NO_CUMPLE_EDAD_EN_FECHA_OBJETIVO')
  })
})

describe('evaluarElegibilidadProyectadaRPM — historia estructurada (suficiente, parcial, vacía)', () => {
  function periodoAnioCompleto(anio, ibc) {
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
    return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: bisiesto ? 366 : 365 }
  }
  function historiaAnios(desde, hasta, ibc = 1500000) {
    const periodos = []
    for (let anio = desde; anio <= hasta; anio++) periodos.push(periodoAnioCompleto(anio, ibc))
    return periodos
  }

  it('historia suficiente (evidencia real, sin declaración): confirma con certeza, procedencia historia_estructurada', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      historiaCotizacion: historiaAnios(1990, 2025), // 36 años, ~1878 semanas
      semanasReferenciaDeclaradas: null,
    })
    expect(r.semanasActuales.procedencia).toBe('historia_estructurada')
    expect(r.semanasActuales.certeza).toBe('verificado')
    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('historia parcial (evidencia real pero insuficiente): NO_ELEGIBLE_POR_SEMANAS con certeza, no ambiguo', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      historiaCotizacion: historiaAnios(2020, 2025), // 6 años, ~313 semanas, real pero corta
      semanasReferenciaDeclaradas: null,
    })
    expect(r.semanasActuales.procedencia).toBe('historia_estructurada')
    expect(r.estado).toBe('NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO')
  })

  it('historia vacía (sin declaración): sin_evidencia, nunca historia_estructurada con 0 semanas', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, historiaCotizacion: [], semanasReferenciaDeclaradas: null })
    expect(r.semanasActuales.procedencia).toBe('sin_evidencia')
  })

  it('cambiar el IBC de la historia (sin cambiar diasCotizados) nunca cambia la elegibilidad — este contrato no lee ibc', () => {
    const historiaBase = historiaAnios(1990, 2025, 1500000)
    const historiaOtroIBC = historiaAnios(1990, 2025, 9999999)
    const r1 = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, historiaCotizacion: historiaBase })
    const r2 = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, historiaCotizacion: historiaOtroIBC })
    expect(r1.estado).toBe(r2.estado)
    expect(r1.semanasTotalesEnFechaObjetivo).toBe(r2.semanasTotalesEnFechaObjetivo)
  })
})

describe('evaluarElegibilidadProyectadaRPM — horizontes (3, 5, 9, 10, más de 10 años)', () => {
  // fechaNacimiento fija; edad actual ya sobre el mínimo (62) para que solo varíe el
  // horizonte hasta fechaObjetivoSolicitada, con semanas declaradas amplias de sobra para
  // aislar el efecto del horizonte sobre semanasFuturasHastaFechaObjetivo.
  const NACIMIENTO_HORIZONTE = '1960-01-01'

  it.each([3, 5, 9, 10, 15])('horizonte de %i años: semanasFuturasHastaFechaObjetivo coincide con el cálculo independiente vía diasCalendarioEnRango', (anios) => {
    const edadObjetivo = 66 + anios // edad actual (2026-01-01) = 66
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: NACIMIENTO_HORIZONTE,
      edadJubilacionDeseada: edadObjetivo,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    const esperado = semanasFuturasEsperadas(NACIMIENTO_HORIZONTE, edadObjetivo)
    expect(r.semanasFuturasHastaFechaObjetivo).toBeCloseTo(esperado, 6)
    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO') // semanas declaradas ya alcanzan por sí solas
  })
})

describe('evaluarElegibilidadProyectadaRPM — hombre y mujer', () => {
  it('mujer: edadMinimaAplicable y semanasMinimasAplicables usan la salida actual del resolver jurídico (cronograma C-197/2023), sin política de ancla de incremento — E2 no calcula tasa', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1969-06-15', // edad objetivo 57 -> fechaObjetivoSolicitada ~2026-06-15
      edadJubilacionDeseada: 57,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1260, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.sexoResuelto).toBe('F')
    expect(r.edadMinimaAplicable.valor).toBe(57)
    // Cronograma vigente 2026 (ver diagnóstico previo, verificado contra el motor real):
    // 1.250 semanas para fechas de reconocimiento en 2026.
    expect(r.semanasMinimasAplicables.valor).toBe(1250)
    expect(r.semanasMinimasAplicables.normaId).toBe('semanas-minimas-pension-mujer-cronograma-2026')
  })
})

describe('evaluarElegibilidadProyectadaRPM — fuente de semanas declarada/aproximada', () => {
  it('certeza "conocido" se conserva tal cual', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.semanasActuales.certeza).toBe('conocido')
  })

  it('certeza "aproximado" se conserva tal cual', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'aproximado' },
    })
    expect(r.semanasActuales.certeza).toBe('aproximado')
  })

  it('una declaración inválida (certeza "desconocido") se trata como ausente, nunca como 0 semanas confiadas', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'desconocido' },
    })
    expect(r.semanasActuales.procedencia).toBe('sin_evidencia')
  })
})

describe('evaluarElegibilidadProyectadaRPM — trazabilidad (valueId, fuentesUtilizadas, supuestos)', () => {
  it('cada campo trazable expone su valueId estable', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.edadMinimaAplicable.valueId).toBe('elegibilidadProyectadaRPM.edadMinimaAplicable')
    expect(r.semanasActuales.valueId).toBe('elegibilidadProyectadaRPM.semanasActuales')
    expect(r.semanasMinimasAplicables.valueId).toBe('elegibilidadProyectadaRPM.semanasMinimasAplicables')
  })

  it('fuentesUtilizadas incluye normaId, estado y listoParaProduccion de cada regla legal usada — nunca desaparece en silencio aunque la fuente esté en borrador', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.fuentesUtilizadas).toHaveLength(2)
    for (const fuente of r.fuentesUtilizadas) {
      expect(typeof fuente.normaId).toBe('string')
      expect(typeof fuente.estado).toBe('string')
      expect(typeof fuente.listoParaProduccion).toBe('boolean')
    }
  })

  it('supuestos declara explícitamente la continuidad futura — sin fallas de monotonía detectadas para este caso, sin supuestos adicionales de degradación', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.supuestos.map((s) => s.codigo)).toEqual(expect.arrayContaining(['CONTINUIDAD_SIN_INTERRUPCIONES']))
    expect(r.supuestos.map((s) => s.codigo)).not.toContain('FECHA_CUMPLE_EDAD_NO_DETERMINABLE')
    expect(r.supuestos.map((s) => s.codigo)).not.toContain('FECHA_COMPLETA_SEMANAS_NO_DETERMINABLE')
  })
})

describe('evaluarElegibilidadProyectadaRPM — pruebas de propiedades', () => {
  it('aumentar semanas actuales declaradas nunca empeora la elegibilidad (monotonicidad)', () => {
    const base = { ...PERFIL_BASE, edadJubilacionDeseada: 65 }
    const candidatos = [0, 100, 500, 900, 1200, 1300, 1400, 2000]
    const RANGO_ELEGIBILIDAD = ['NO_EVALUABLE_DATOS_INSUFICIENTES', 'NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO', 'CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO']
    let mejorIndicePrevio = -1
    for (const cantidad of candidatos) {
      const r = evaluarElegibilidadProyectadaRPM({ ...base, semanasReferenciaDeclaradas: { cantidad, certeza: 'conocido' } })
      const indiceActual = RANGO_ELEGIBILIDAD.indexOf(r.estado)
      expect(indiceActual).toBeGreaterThanOrEqual(0)
      expect(indiceActual).toBeGreaterThanOrEqual(mejorIndicePrevio)
      mejorIndicePrevio = indiceActual
    }
  })

  it('ampliar el horizonte (misma fecha de nacimiento, edad objetivo mayor) nunca reduce semanasFuturasHastaFechaObjetivo', () => {
    const edades = [40, 45, 50, 60, 70, 90] // todas > edadActual (36) para el nacimiento usado
    let anterior = -Infinity
    for (const edadObjetivo of edades) {
      const r = evaluarElegibilidadProyectadaRPM({
        sexo: 'Hombre',
        fechaNacimiento: '1990-01-01', // edad actual (2026-01-01) = 36
        edadJubilacionDeseada: edadObjetivo,
        historiaCotizacion: [],
        semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
        fecha: FECHA_CALCULO,
      })
      expect(r.semanasFuturasHastaFechaObjetivo).toBeGreaterThanOrEqual(anterior)
      anterior = r.semanasFuturasHastaFechaObjetivo
    }
  })

  it('cambiar el IBC de la historia (sin cambiar diasCotizados ni fechas) no modifica el estado de elegibilidad', () => {
    function historia(ibc) {
      return [{ fechaDesde: '1990-01-01', fechaHasta: '2025-12-31', ibc, diasCotizados: 13149 }]
    }
    const r1 = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, historiaCotizacion: historia(500000) })
    const r2 = evaluarElegibilidadProyectadaRPM({ ...PERFIL_BASE, historiaCotizacion: historia(50000000) })
    expect(r1.estado).toBe(r2.estado)
    expect(r1.semanasTotalesEnFechaObjetivo).toBe(r2.semanasTotalesEnFechaObjetivo)
  })

  it('semanas mínimas siempre se resuelven a fechaObjetivoSolicitada, nunca a `fecha` (hoy) — verificado con un caso donde ambas difieren (cronograma de mujer)', () => {
    // fechaObjetivoSolicitada cae varios años después de `fecha`, cruzando un año del
    // cronograma con un mínimo distinto al de hoy.
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1969-06-15',
      edadJubilacionDeseada: 57, // fechaObjetivoSolicitada = 2026-06-15
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1260, certeza: 'conocido' },
      fecha: FECHA_CALCULO, // 2026-01-01 — mismo año, pero distinto punto del cronograma si cruzara un límite anual
    })
    // El mínimo aplicable debe corresponder a fechaObjetivoSolicitada (2026-06-15: 1.250),
    // no a `fecha` (2026-01-01: también 1.250 este año — se confirma con una fecha de otro
    // año en el siguiente caso, donde SÍ difieren).
    expect(r.semanasMinimasAplicables.fechaAplicacion).toBe(r.fechaObjetivoSolicitada)

    const rOtroAnio = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1969-06-15',
      edadJubilacionDeseada: 58, // fechaObjetivoSolicitada = 2027-06-15 (cronograma: 1.225)
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1260, certeza: 'conocido' },
      fecha: FECHA_CALCULO, // sigue siendo 2026-01-01 (cronograma en esa fecha: 1.250)
    })
    expect(rOtroAnio.semanasMinimasAplicables.valor).toBe(1225)
    expect(rOtroAnio.semanasMinimasAplicables.valor).not.toBe(1250) // el de `fecha`, si se hubiera usado por error
  })
})

describe('evaluarElegibilidadProyectadaRPM — determinismo', () => {
  it('misma entrada produce exactamente el mismo resultado', () => {
    const input = {
      ...PERFIL_BASE,
      semanasReferenciaDeclaradas: { cantidad: 1200, certeza: 'aproximado' },
    }
    const r1 = evaluarElegibilidadProyectadaRPM(input)
    const r2 = evaluarElegibilidadProyectadaRPM(input)
    expect(r1).toEqual(r2)
  })
})
