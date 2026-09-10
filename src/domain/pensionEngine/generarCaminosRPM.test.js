import { describe, it, expect } from 'vitest'
import { generarCaminosRPM, mesadaGobernante, construirCamino } from './generarCaminosRPM.js'
import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { obtenerTasaCotizacion } from '../../data/legal/index.js'

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
function historiaAnios(desde, hasta) {
  const periodos = []
  for (let anio = desde; anio <= hasta; anio++) periodos.push(periodoAnioCompleto(anio, 1000000 + anio))
  return periodos
}

// 1990-2025 (36 años, ~1878 semanas) — deliberadamente por encima de las 1300 semanas
// mínimas (Hombre) solo con la historia, sin depender del horizonte futuro, para que los
// tests de bisección/tope/restricción (que ya existían antes de la auditoría de
// elegibilidad) sigan ejercitando exactamente lo que probaban, sin verse bloqueados por
// el nuevo chequeo de semanas mínimas.
function historiaLargaCompleta() {
  return historiaAnios(1990, 2025)
}

// Historia corta (10 años, ~522 semanas) — deliberadamente insuficiente para las 1300
// semanas mínimas incluso sumando un horizonte corto, usada solo por el test dedicado de
// SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM.
function historiaDiezAniosCompleta() {
  return historiaAnios(2016, 2025)
}

const PERFIL_BASE = {
  regimenActual: 'RPM',
  sexo: 'Hombre', // mínimo legal: 62 años, 1300 semanas (ambos constantes, sin cronograma)
  historiaCotizacion: historiaLargaCompleta(),
  fechaNacimiento: '1964-01-01', // edad actual (2026-01-01) = 62 — ya cumple el mínimo de edad
  edadJubilacionDeseada: 64, // fechaReconocimiento = 2028-01-01, horizonte ≈ 2 años (ventana mixta)
  ibcAplicableSimulacion: 2000000,
  objetivoValorMensual: 1600000,
  fecha: FECHA_CALCULO,
}

describe('generarCaminosRPM — perfil fuera de alcance', () => {
  it('regimenActual distinto de RPM', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, regimenActual: 'RAIS' })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('PERFIL_NO_EVALUABLE')
    expect(r.orientacion.caminoMasAlineadoId).toBeNull()
  })

  it('sin restricción de tipoCotizante/lugarCotizacion/trasladoRegimen (confirmado por S4-001) — un caso con esos campos "adversos" sigue evaluándose', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      tipoCotizante: 'empleado',
      lugarCotizacion: 'exterior',
      trasladoRegimen: 'si',
    })
    expect(r.orientacion.codigo).not.toBe('PERFIL_NO_EVALUABLE')
  })
})

describe('generarCaminosRPM — datos incompletos', () => {
  it('sin sexo (o inválido) → DATOS_INCOMPLETOS, indispensable para resolver edad/semanas mínimas', () => {
    expect(generarCaminosRPM({ ...PERFIL_BASE, sexo: null }).orientacion.codigo).toBe('DATOS_INCOMPLETOS')
    expect(generarCaminosRPM({ ...PERFIL_BASE, sexo: 'otro' }).orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })

  it('sin IBC aplicable', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, ibcAplicableSimulacion: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })

  it('sin objetivo declarado', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })

  it('sin edad de jubilación deseada', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, edadJubilacionDeseada: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })
})

describe('generarCaminosRPM — elegibilidad legal RPM (auditoría 2026-08-21): edad mínima', () => {
  it('edad elegida por debajo del mínimo legal (Hombre, 62) → EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL, sin ninguna cifra de pensión, sin llamar a calcularProyeccionRPM', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      fechaNacimiento: '2000-01-01', // persona joven — fechaReconocimiento cae en el futuro real
      edadJubilacionDeseada: 50, // < 62
    })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL')
    expect(r.detalleElegibilidad).toEqual({ edadMinima: 62, edadElegida: 50, aniosFaltantes: 12 })
  })

  it('edad elegida por debajo del mínimo legal (Mujer, 57) — el mínimo aplicado es distinto al de Hombre', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      sexo: 'Mujer',
      fechaNacimiento: '2000-01-01',
      edadJubilacionDeseada: 55, // < 57, pero >= 50 (habría pasado si sexo se ignorara)
    })
    expect(r.orientacion.codigo).toBe('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL')
    expect(r.detalleElegibilidad.edadMinima).toBe(57)
  })

  it('edad elegida exactamente igual al mínimo legal → sí se evalúa (borde), no se rechaza', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      fechaNacimiento: '1964-01-31',
      edadJubilacionDeseada: 62, // exactamente el mínimo — límite inclusive
    })
    expect(r.orientacion.codigo).not.toBe('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL')
    expect(r.escenarios.length).toBeGreaterThan(0)
  })

  it('una edad sin base legal (30 años) para una persona joven ya no produce ninguna cifra de pensión — corrige el hallazgo original de la auditoría', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, fechaNacimiento: '2005-06-15', edadJubilacionDeseada: 30 })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL')
  })
})

describe('generarCaminosRPM — elegibilidad legal RPM (auditoría 2026-08-21): semanas mínimas', () => {
  it('a la edad elegida no se alcanzan las semanas mínimas → SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM, sin ninguna cifra de pensión', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      historiaCotizacion: historiaDiezAniosCompleta(), // ~522 semanas, insuficiente incluso con el horizonte
    })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.detalleElegibilidad.semanasMinimas).toBe(1300)
    expect(r.detalleElegibilidad.semanasProyectadas).toBeLessThan(1300)
    expect(r.detalleElegibilidad.semanasFaltantes).toBeCloseTo(1300 - r.detalleElegibilidad.semanasProyectadas, 5)
  })

  it('con historia suficiente (PERFIL_BASE), las semanas proyectadas superan el mínimo y el análisis continúa con normalidad', () => {
    const r = generarCaminosRPM(PERFIL_BASE)
    expect(r.orientacion.codigo).not.toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.escenarios.length).toBeGreaterThan(0)
  })
})

describe('generarCaminosRPM — camino base no evaluable (historia insuficiente para la ventana del IBL, no para elegibilidad)', () => {
  it('historia insuficiente incluso con el horizonte futuro → HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA, sin excepción — con una edad que ya cumple el mínimo legal', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-31', // edad actual = 61, apenas antes del cumpleaños
      edadJubilacionDeseada: 62, // exactamente el mínimo legal — pasa la elegibilidad, horizonte de 30 días
    })
    expect(r.escenarios).toEqual([])
    // Actualizado (2026-08-27, hallazgo de prueba manual): antes de este Slice, este caso
    // colapsaba al mensaje genérico 'SIN_CAMINOS_VIABLES' — ahora conserva la razón
    // específica que calcularProyeccionRPM ya calculaba internamente, con cifras exactas
    // (ver describe dedicado, más abajo, para el caso real que motivó este cambio).
    expect(r.orientacion.codigo).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.detalleElegibilidad).toEqual({ diasEfectivosAcumulados: 30, diasVentanaRequeridos: 3650 })
  })
})

describe('generarCaminosRPM — UX-RPM-01: historia vacía + horizonte largo → caminos viables sin ningún día real (auditoría 2026-08-24)', () => {
  it('historiaCotizacion=[] con horizonte futuro muy por encima de 3.650 días Y de las 1.300 semanas mínimas produce el camino base viable — el tramo futuro sintético basta por sí solo', () => {
    // fechaNacimiento/fecha heredados de PERFIL_BASE (edad actual = 62, ya cumple el
    // mínimo legal de edad). edadJubilacionDeseada: 92 da un horizonte ≈ 30 años
    // (~10.957 días ≈ 1.565 semanas) — no solo por encima de los 3.650 días que exige la
    // ventana del IBL, sino también, con margen deliberado, por encima de las 1.300
    // semanas mínimas de elegibilidad (Hombre, sin cronograma): un horizonte que sí
    // llena el IBL pero no las semanas (ej. 75 años, ~676 semanas) sigue devolviendo
    // SIN_CAMINOS_VIABLES vía SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM — verificado
    // al construir este test — así que este caso necesita superar ambos umbrales, no
    // solo el de la ventana del IBL.
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      historiaCotizacion: [],
      edadJubilacionDeseada: 92,
    })
    expect(r.orientacion.codigo).not.toBe('SIN_CAMINOS_VIABLES')
    // Regresión (2026-08-27, hallazgo de prueba manual): horizonte largo sin historia
    // sigue produciendo la proyección preliminar, nunca cae en el gate de la ventana
    // del IBL (ver describe dedicado más abajo para el caso contrario, horizonte corto).
    expect(r.orientacion.codigo).not.toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.escenarios.length).toBeGreaterThan(0)
    expect(r.escenarios.some((e) => e.id === 'base' && e.estado === 'viable')).toBe(true)
    expect(r.horizonte).not.toBeNull()
  })

  it('historiaCotizacion=[] con horizonte que sí llena la ventana del IBL (≥3.650 días) pero no las 1.300 semanas mínimas → SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM, con detalleElegibilidad y cifras exactas — no el mensaje genérico de SIN_CAMINOS_VIABLES', () => {
    // Horizonte más probable en la práctica de esta ruta directa (alguien explorando su
    // jubilación con un remanente de carrera de 10-25 años, sin haber cargado historia
    // real todavía) — a diferencia del test anterior (30 años), aquí el motor SÍ
    // distingue la causa exacta del descarte, con cifras (útil para verificar que la
    // UI, línea 477-481 de ProyectaTuPensionRPM.jsx, ya la muestra de forma específica,
    // no genérica).
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      historiaCotizacion: [],
      edadJubilacionDeseada: 75, // horizonte ≈ 13 años — cubre los 3.650 días, no las 1.300 semanas
    })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.detalleElegibilidad).not.toBeNull()
    expect(r.detalleElegibilidad.semanasMinimas).toBe(1300)
    expect(r.detalleElegibilidad.semanasProyectadas).toBeLessThan(1300)
  })
})

describe('generarCaminosRPM — objetivo ya cumplido con continuidad', () => {
  it('solo genera el camino base, sin inventar un alternativo', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 100000 })

    expect(r.escenarios).toHaveLength(1)
    expect(r.escenarios[0].id).toBe('base')
    expect(r.escenarios[0].entradas.escenarioIbcFuturo.origen).toBe('continuidad_ibc_actual')
    expect(r.escenarios[0].esfuerzo.aumentoIBC).toBe(0)
    expect(r.escenarios[0].esfuerzo.costoPensionalAdicionalMensual).toBe(0)
    expect(r.escenarios[0].distanciaObjetivo.cumple).toBe(true)
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    expect(r.orientacion.caminoMasAlineadoId).toBe('base')
  })

  it('esfuerzo nunca incluye costoAcumuladoHastaJubilacion — diferido, no inventado (Regla 5 no definida)', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 100000 })
    expect(r.escenarios[0].esfuerzo).not.toHaveProperty('costoAcumuladoHastaJubilacion')
  })
})

describe('generarCaminosRPM — objetivo alcanzable mediante otro IBC futuro', () => {
  it('genera un alternativo viable con origen busqueda_objetivo_rpm, que cumple el objetivo con el IBC mínimo entero suficiente', () => {
    const base = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    const objetivoValorMensual = base.pensionMensualProyectada * 1.5 // deliberadamente por encima del base

    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })

    expect(r.escenarios).toHaveLength(2)
    const alternativo = r.escenarios[1]
    expect(alternativo.id).toBe('aumentar-ibc-futuro')
    expect(alternativo.estado).toBe('viable')
    expect(alternativo.entradas.escenarioIbcFuturo.origen).toBe('busqueda_objetivo_rpm')
    expect(alternativo.distanciaObjetivo.cumple).toBe(true)
    expect(alternativo.resultado.valor).toBeGreaterThanOrEqual(objetivoValorMensual)

    // El IBC encontrado es un peso entero (redondeo final aprobado)...
    const ibcEncontrado = alternativo.entradas.escenarioIbcFuturo.valorAplicado
    expect(Number.isInteger(ibcEncontrado)).toBe(true)
    expect(alternativo.entradas.escenarioIbcFuturo.valorDeclarado).toBe(ibcEncontrado)

    // ...y es el MÍNIMO entero suficiente: un peso menos ya no alcanza el objetivo. Esta es
    // la verificación más fuerte del criterio de convergencia — no solo "algún valor que
    // sirve", sino "el más pequeño que sirve, con precisión de 1 peso".
    const unPesoMenos = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: ibcEncontrado - 1, origen: 'busqueda_objetivo_rpm' },
      fecha: FECHA_CALCULO,
    })
    expect(unPesoMenos.pensionMensualProyectada).toBeLessThan(objetivoValorMensual)
  })

  it('determinismo: misma entrada produce exactamente el mismo resultado', () => {
    const objetivoValorMensual = 2500000
    const r1 = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
    const r2 = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
    expect(r1).toEqual(r2)
  })
})

describe('generarCaminosRPM — objetivo no alcanzable ni en el tope', () => {
  it('descarta el alternativo con OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE, sin intentar bisección más allá del tope', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 900000000 }) // absurdamente alto

    expect(r.escenarios).toHaveLength(2)
    const alternativo = r.escenarios[1]
    expect(alternativo.estado).toBe('descartado')
    expect(alternativo.razonDescartado.codigo).toBe('OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE')
    expect(alternativo.resultado).toBeNull()
    expect(alternativo.entradas).toBeNull()
    expect(r.orientacion.codigo).toBe('NINGUNO_CUMPLE_MAS_CERCANO')
    expect(r.orientacion.caminoMasAlineadoId).toBe('base')
    // objetivoLegalmenteInalcanzable (decisión de producto, 2026-08-24): caminoMasAlineadoId
    // se conserva tal cual arriba (información determinista interna) — este campo aditivo es
    // lo único nuevo, y le dice a la UI/IA que esa cercanía no debe convertirse en una
    // distinción visual ni en "posición oficial" (ver ProyectaTuPensionRPM.jsx/explicarCaminos.js).
    expect(r.orientacion.objetivoLegalmenteInalcanzable).toBe(true)
  })
})

describe('generarCaminosRPM — IBC actual ya en el tope legal', () => {
  it('descarta el alternativo con YA_EN_TOPE_LEGAL, sin intentar bisección', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      ibcAplicableSimulacion: TOPE_IBC_2026,
      objetivoValorMensual: 900000000, // cualquier objetivo no cumplido con el base basta para este caso
    })

    expect(r.escenarios).toHaveLength(2)
    expect(r.escenarios[1].razonDescartado.codigo).toBe('YA_EN_TOPE_LEGAL')
    // Mismo tratamiento que OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE — también es una imposibilidad
    // legal/estructural, no una elección del usuario que pueda revertirse.
    expect(r.orientacion.objetivoLegalmenteInalcanzable).toBe(true)
    expect(r.orientacion.caminoMasAlineadoId).toBe('base')
  })
})

describe('generarCaminosRPM — restricción de costo pensional adicional', () => {
  it('una restricción más estricta que el tope legal acota la bisección — el alternativo puede no cumplir el objetivo, sin código de error especial', () => {
    const base = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    const objetivoValorMensual = base.pensionMensualProyectada * 3 // exige un aumento grande

    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      objetivoValorMensual,
      restriccionCostoPensionalAdicionalMaximoMensual: 1000, // restricción muy estrecha a propósito
    })

    const alternativo = r.escenarios[1]
    expect(alternativo.estado).toBe('viable') // se evalúa igual, dentro del límite permitido
    expect(alternativo.esfuerzo.costoPensionalAdicionalMensual).toBeLessThanOrEqual(1000 + 1) // tolerancia de redondeo a peso
    expect(alternativo.distanciaObjetivo.cumple).toBe(false) // la restricción no alcanza para el objetivo tan alto
  })

  it('AUDITORÍA 2026-08-21: cuando la restricción es la causa de no alcanzar el objetivo, el camino lo declara explícitamente con RESTRICCION_COSTO_LIMITA_RESULTADO', () => {
    const base = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    const objetivoValorMensual = base.pensionMensualProyectada * 2 // confirmado alcanzable sin restricción, ver test siguiente

    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      objetivoValorMensual,
      restriccionCostoPensionalAdicionalMaximoMensual: 5000, // deliberadamente muy baja
    })

    const alternativo = r.escenarios[1]
    expect(alternativo.distanciaObjetivo.cumple).toBe(false)
    expect(alternativo.limitaciones.map((l) => l.codigo)).toContain('RESTRICCION_COSTO_LIMITA_RESULTADO')
    // EVIDENCIA (2026-08-24): a diferencia de OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE/YA_EN_TOPE_LEGAL,
    // aquí el alternativo sigue VIABLE (no descartado) — es una restricción autoimpuesta por
    // el usuario, no una imposibilidad legal. La distinción "Camino más alineado" debe
    // seguir mostrándose: objetivoLegalmenteInalcanzable debe quedar en false.
    expect(r.orientacion.objetivoLegalmenteInalcanzable).toBe(false)
  })

  it('confirma que el mismo objetivo del test anterior SÍ era alcanzable sin la restricción (prueba de que la restricción era realmente la causa)', () => {
    const base = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    const objetivoValorMensual = base.pensionMensualProyectada * 2

    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual }) // sin restricción
    expect(r.escenarios[1].distanciaObjetivo.cumple).toBe(true)
  })

  it('sin restricción declarada, o con una restricción no vinculante, la limitación NO aparece', () => {
    const rSinRestriccion = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 2500000 })
    expect(rSinRestriccion.escenarios[1].limitaciones.map((l) => l.codigo)).not.toContain('RESTRICCION_COSTO_LIMITA_RESULTADO')

    const rRestriccionAmplia = generarCaminosRPM({
      ...PERFIL_BASE,
      objetivoValorMensual: 2500000,
      restriccionCostoPensionalAdicionalMaximoMensual: 900000000, // deliberadamente no vinculante
    })
    expect(rRestriccionAmplia.escenarios[1].limitaciones.map((l) => l.codigo)).not.toContain('RESTRICCION_COSTO_LIMITA_RESULTADO')
  })
})

describe('generarCaminosRPM — camino personalizado (esfuerzoAdicionalMensualDeseado, decisión de producto 2026-08-23)', () => {
  function calcularBase() {
    return calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
  }
  function tasaCotizacionFraccion() {
    return obtenerTasaCotizacion(FECHA_CALCULO).valor / 100
  }
  function objetivoNoAlcanzadoPorBase() {
    return calcularBase().pensionMensualProyectada * 1.5 // garantiza que el base no lo cumple
  }

  it('1. monto exacto $200.000 → genera un tercer camino con cálculo real, verificado de forma independiente contra calcularProyeccionRPM', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const tasa = tasaCotizacionFraccion()
    const ibcEsperado = PERFIL_BASE.ibcAplicableSimulacion + 200000 / tasa
    // E3-C2d: la verificación independiente ahora debe pasar la misma elegibilidad canónica
    // que generarCaminosRPM.js propaga internamente, y comparar contra la mesada FINAL
    // AJUSTADA (resultado.valor ya no es el crudo) — nunca pensionMensualProyectada, que
    // sigue existiendo pero ya no gobierna el camino.
    const proyeccionEsperada = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: ibcEsperado, origen: 'esfuerzo_adicional_declarado' },
      fecha: FECHA_CALCULO,
      elegibilidad: { estado: 'CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO' },
    })

    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')

    expect(personalizado).toBeDefined()
    expect(personalizado.estado).toBe('viable')
    expect(personalizado.tipo).toBe('alternativo')
    expect(personalizado.entradas.escenarioIbcFuturo.origen).toBe('esfuerzo_adicional_declarado')
    expect(personalizado.entradas.escenarioIbcFuturo.valorAplicado).toBe(ibcEsperado)
    expect(personalizado.resultado.valor).toBe(proyeccionEsperada.ajusteLegal.resultadoFinalAjustado)
    // El crudo se conserva íntegro y auditable, nunca borrado (Decisión 1, E3-C2/E3-C2d).
    expect(personalizado.valorMatematico).toBe(proyeccionEsperada.pensionMensualProyectada)
  })

  it('2. costoPensionalAdicionalMensual del escenario coincide con el monto declarado cuando el tope legal no interviene', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    // Sin redondeo (a diferencia de la bisección): la única fuente posible de diferencia es
    // ruido de punto flotante, nunca una diferencia material — tolerancia de 1 peso.
    expect(Math.abs(personalizado.esfuerzo.costoPensionalAdicionalMensual - 200000)).toBeLessThan(1)
  })

  it('3. esfuerzoAdicionalMensualDeseado ausente (default null) → no genera ningún tercer camino', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: objetivoNoAlcanzadoPorBase() })
    expect(r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')).toBeUndefined()
  })

  it('4. monto inválido (0, negativo, no numérico, undefined) → tratado explícitamente como "no solicitado": nunca genera el tercer camino, nunca lanza', () => {
    for (const valorInvalido of [0, -100000, NaN, 'no-es-numero', undefined]) {
      const r = generarCaminosRPM({
        ...PERFIL_BASE,
        objetivoValorMensual: objetivoNoAlcanzadoPorBase(),
        esfuerzoAdicionalMensualDeseado: valorInvalido,
      })
      expect(r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')).toBeUndefined()
    }
  })

  it('5. respeta el tope legal — un monto que llevaría el IBC candidato por encima del tope se recorta dentro de calcularProyeccionRPM, nunca lo excede', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      objetivoValorMensual: objetivoNoAlcanzadoPorBase(),
      esfuerzoAdicionalMensualDeseado: 900000000, // garantiza exceder el tope legal
    })
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')

    expect(personalizado.entradas.escenarioIbcFuturo.valorAplicado).toBe(TOPE_IBC_2026)
    expect(personalizado.entradas.escenarioIbcFuturo.valorDeclarado).toBeGreaterThan(TOPE_IBC_2026)

    // El costo reportado refleja el IBC ya recortado — honestamente menor que el monto
    // pedido, nunca el monto pedido tal cual ni uno inventado.
    const tasa = tasaCotizacionFraccion()
    const costoEsperado = (TOPE_IBC_2026 - PERFIL_BASE.ibcAplicableSimulacion) * tasa
    expect(Math.abs(personalizado.esfuerzo.costoPensionalAdicionalMensual - costoEsperado)).toBeLessThan(1)
    expect(personalizado.esfuerzo.costoPensionalAdicionalMensual).toBeLessThan(900000000)
  })

  it('5b. ibcAplicableSimulacion ya en el tope legal → el camino personalizado se descarta con YA_EN_TOPE_LEGAL (mismo código que el alternativo en esa misma situación — no se inventa uno nuevo para la misma causa)', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      ibcAplicableSimulacion: TOPE_IBC_2026,
      objetivoValorMensual: 900000000,
      esfuerzoAdicionalMensualDeseado: 200000,
    })
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    expect(personalizado.estado).toBe('descartado')
    expect(personalizado.razonDescartado.codigo).toBe('YA_EN_TOPE_LEGAL')
    expect(personalizado.resultado).toBeNull()
  })

  it('6. elegibilidad insuficiente (edad por debajo del mínimo legal) → el tercer camino nunca se evalúa, la función retorna antes de leer esfuerzoAdicionalMensualDeseado', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      fechaNacimiento: '2000-01-01',
      edadJubilacionDeseada: 50, // por debajo del mínimo legal (62, Hombre)
      esfuerzoAdicionalMensualDeseado: 200000,
    })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL')
  })

  it('6b. elegibilidad insuficiente (semanas mínimas) → mismo tratamiento, sin ningún tercer camino', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      historiaCotizacion: historiaDiezAniosCompleta(),
      esfuerzoAdicionalMensualDeseado: 200000,
    })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
  })

  it('7. el escenario personalizado tiene exactamente la misma estructura (mismas claves) que los caminos base/alternativo ya existentes', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const [base, alternativo, personalizado] = r.escenarios
    expect(Object.keys(personalizado).sort()).toEqual(Object.keys(base).sort())
    expect(Object.keys(personalizado).sort()).toEqual(Object.keys(alternativo).sort())
    // Mismas sub-claves de esfuerzo/distanciaObjetivo — nunca una forma reducida.
    expect(Object.keys(personalizado.esfuerzo).sort()).toEqual(Object.keys(alternativo.esfuerzo).sort())
    expect(Object.keys(personalizado.distanciaObjetivo).sort()).toEqual(Object.keys(alternativo.distanciaObjetivo).sort())
  })

  it('determinismo: misma entrada produce exactamente el mismo resultado', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r1 = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const r2 = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    expect(r1).toEqual(r2)
  })

  it('el barrido y el resto del resultado no se ven afectados por la presencia del camino personalizado — solo agrega un elemento a escenarios', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const conPersonalizado = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const sinPersonalizado = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
    expect(conPersonalizado.barrido).toEqual(sinPersonalizado.barrido)
    expect(conPersonalizado.horizonte).toEqual(sinPersonalizado.horizonte)
    expect(conPersonalizado.escenarios).toHaveLength(sinPersonalizado.escenarios.length + 1)
  })
})

describe('generarCaminosRPM — diferenciaFrenteABase (decisión de producto, 2026-08-24)', () => {
  function calcularBase() {
    return calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
  }
  function objetivoNoAlcanzadoPorBase() {
    return calcularBase().pensionMensualProyectada * 1.5
  }

  it('A. camino base: diferenciaFrenteABase.delta === 0 (se resta contra sí mismo, sin caso especial por id)', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: objetivoNoAlcanzadoPorBase() })
    const base = r.escenarios.find((e) => e.id === 'base')
    expect(base.diferenciaFrenteABase).toEqual({ delta: 0 })
  })

  it('B. camino personalizado: delta === resultado.valor - base.resultado.valor exactamente (verificado independientemente). E3-C2d: con PERFIL_BASE, tanto el base como este esfuerzo de $200.000 quedan dentro de la meseta del piso legal (ambos resultados matemáticos crudos siguen por debajo de 1 SMLMV) — el delta correctamente da 0: el esfuerzo adicional NO se traduce en ningún beneficio pensional final, aunque el resultado matemático crudo sí haya mejorado (caso R de la integración del ajuste legal). Antes de E3-C2d este mismo delta era positivo porque se comparaba el crudo, no la mesada legal final.', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const base = r.escenarios.find((e) => e.id === 'base')
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    expect(personalizado.diferenciaFrenteABase.delta).toBe(personalizado.resultado.valor - base.resultado.valor)
    // Precondición explícita (no asumida): ambos resultados matemáticos crudos siguen
    // dentro de la meseta del piso — por eso el delta LEGAL da exactamente 0.
    expect(base.valorMatematico).toBeLessThan(SMLV_2026)
    expect(personalizado.valorMatematico).toBeLessThan(SMLV_2026)
    expect(personalizado.valorMatematico).toBeGreaterThan(base.valorMatematico) // el crudo SÍ mejoró...
    expect(personalizado.diferenciaFrenteABase.delta).toBe(0) // ...pero el resultado final no, por el piso
  })

  it('C. camino objetivo (alternativo): mismo criterio', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
    const base = r.escenarios.find((e) => e.id === 'base')
    const alternativo = r.escenarios.find((e) => e.id === 'aumentar-ibc-futuro')
    expect(alternativo.diferenciaFrenteABase.delta).toBe(alternativo.resultado.valor - base.resultado.valor)
  })

  it('D. la resta es directa, sin Math.abs ni clamping — un delta negativo (si existiera) se conservaría intacto. Nota arquitectónica: hoy generarCaminosRPM.js no puede producir legítimamente un camino viable con pensión menor que el base (el alternativo y el personalizado solo evalúan IBC >= ibcActual, y la monotonicidad de calcularProyeccionRPM ya está validada en §8.5) — por eso el signo negativo se prueba de forma exhaustiva a nivel de helper de presentación (ProyectaTuPensionRPM.helpers.test.js), que sí recibe deltas arbitrarios. Aquí solo se confirma que la resta del dominio nunca invierte ni recorta el signo de un delta positivo real. E3-C2d: el esfuerzo se eligió deliberadamente grande ($1.500.000) para que el resultado matemático crudo cruce el piso legal — un esfuerzo pequeño, como en el test B, cae dentro de la meseta y da delta=0 (correcto, ver test B), lo cual no sirve para demostrar el punto de ESTE test (que la resta nunca recorta un delta positivo real).', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 1500000 })
    const base = r.escenarios.find((e) => e.id === 'base')
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    // Precondición explícita: este esfuerzo sí saca al resultado matemático crudo de la
    // meseta del piso (a diferencia del test B) — por eso aquí el delta legal sí es real.
    expect(personalizado.valorMatematico).toBeGreaterThan(SMLV_2026)
    expect(personalizado.diferenciaFrenteABase.delta).toBe(personalizado.resultado.valor - base.resultado.valor)
    expect(personalizado.diferenciaFrenteABase.delta).not.toBe(0)
    expect(personalizado.diferenciaFrenteABase.delta).toBeGreaterThan(0)
  })

  it('escenario descartado (sin resultado) → diferenciaFrenteABase es null, nunca un delta inventado sobre un resultado inexistente', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      ibcAplicableSimulacion: TOPE_IBC_2026,
      objetivoValorMensual: 900000000,
      esfuerzoAdicionalMensualDeseado: 200000,
    })
    const personalizadoDescartado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    expect(personalizadoDescartado.estado).toBe('descartado')
    expect(personalizadoDescartado.diferenciaFrenteABase).toBeNull()
  })

  it('no requiere volver a llamar calcularProyeccionRPM — mismo resultado.valor de cada escenario ya construido, verificado por igualdad estructural completa con el resto del camino', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const alternativo = r.escenarios.find((e) => e.id === 'aumentar-ibc-futuro')
    // Mismas claves que antes de este cambio, más exactamente una: diferenciaFrenteABase.
    expect(Object.keys(alternativo)).toContain('diferenciaFrenteABase')
    expect(Object.keys(alternativo.diferenciaFrenteABase)).toEqual(['delta'])
  })
})

describe('generarCaminosRPM — barrido esfuerzo↔resultado (S4-005)', () => {
  // Mecánica compartida por los 4 casos (verificada aquí una sola vez, sobre el caso
  // "objetivo no alcanzable" — el mecanismo de construirRejillaUniforme es el mismo en
  // cualquier caso, solo cambia dónde cae limiteSuperior).
  it('5 puntos, extremos exactos (sin redondear), intermedios enteros no decrecientes, ninguno excede topeEfectivo (caso: objetivo no alcanzable)', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 900000000 }) // sin restricción, inalcanzable

    expect(r.barrido.estado).toBe('calculado')
    expect(r.barrido.puntos).toHaveLength(5)
    expect(r.barrido.puntoObjetivo).toBeNull() // nunca se alcanzó nada que marcar

    const paso = (TOPE_IBC_2026 - PERFIL_BASE.ibcAplicableSimulacion) / 4
    const esperados = [0, 1, 2, 3].map((i) => Math.floor(PERFIL_BASE.ibcAplicableSimulacion + i * paso))
    esperados[0] = PERFIL_BASE.ibcAplicableSimulacion // índice 0: exacto, no floor

    r.barrido.puntos.forEach((punto, indice) => {
      expect(punto.indice).toBe(indice)
      if (indice < 4) {
        expect(punto.escenarioIbcFuturo.valorAplicado).toBe(esperados[indice])
      }
    })

    expect(r.barrido.puntos[0].posicion).toBe('actual')
    expect(r.barrido.puntos[0].escenarioIbcFuturo.valorAplicado).toBe(PERFIL_BASE.ibcAplicableSimulacion)
    expect(r.barrido.puntos[1].posicion).toBe('intermedio')
    expect(r.barrido.puntos[2].posicion).toBe('intermedio')
    expect(r.barrido.puntos[3].posicion).toBe('intermedio')
    expect(r.barrido.puntos[4].posicion).toBe('extremo_superior')
    expect(r.barrido.puntos[4].escenarioIbcFuturo.valorAplicado).toBe(TOPE_IBC_2026)

    expect(r.barrido.puntos.slice(1, 4).every((p) => Number.isInteger(p.escenarioIbcFuturo.valorAplicado))).toBe(true)

    for (let i = 1; i < r.barrido.puntos.length; i++) {
      expect(r.barrido.puntos[i].escenarioIbcFuturo.valorAplicado).toBeGreaterThanOrEqual(
        r.barrido.puntos[i - 1].escenarioIbcFuturo.valorAplicado
      )
      expect(r.barrido.puntos[i].resultado.valor).toBeGreaterThanOrEqual(r.barrido.puntos[i - 1].resultado.valor)
      expect(r.barrido.puntos[i].escenarioIbcFuturo.valorAplicado).toBeLessThanOrEqual(TOPE_IBC_2026)
    }
  })

  it('cada punto de la rejilla se evalúa con calcularProyeccionRPM (caja negra) con origen barrido_esfuerzo_resultado, sin capeo (valorDeclarado === valorAplicado)', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 900000000 })
    r.barrido.puntos.forEach((punto) => {
      expect(punto.escenarioIbcFuturo.origen).toBe('barrido_esfuerzo_resultado')
      expect(punto.escenarioIbcFuturo.valorDeclarado).toBe(punto.escenarioIbcFuturo.valorAplicado)
    })
  })

  describe('Caso: objetivo ya alcanzado con continuidad', () => {
    it("estado 'objetivo_ya_alcanzado', sin puntos — ninguna curva de aumentos innecesarios", () => {
      const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 100000 })
      expect(r.escenarios).toHaveLength(1) // sin alternativo — mismo comportamiento de siempre
      expect(r.barrido.estado).toBe('objetivo_ya_alcanzado')
      expect(r.barrido.codigo).toBe('OBJETIVO_YA_ALCANZADO')
      expect(r.barrido.razon).toBeTruthy()
      expect(r.barrido.puntos).toEqual([])
      expect(r.barrido.puntoObjetivo).toBeNull()
    })
  })

  describe('Caso: objetivo no alcanzable (ni en el tope legal)', () => {
    it("extremo 'extremo_superior' en topeAplicado, sin puntoObjetivo", () => {
      const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 900000000 })
      expect(r.escenarios[1].estado).toBe('descartado') // confirma que estamos en el caso correcto
      expect(r.barrido.estado).toBe('calculado')
      expect(r.barrido.puntos[4].posicion).toBe('extremo_superior')
      expect(r.barrido.puntos[4].escenarioIbcFuturo.valorAplicado).toBe(TOPE_IBC_2026)
      expect(r.barrido.puntoObjetivo).toBeNull()
    })

    it('sin_margen — IBC actual ya en el tope legal, distinguido con SIN_MARGEN_TOPE_LEGAL', () => {
      const r = generarCaminosRPM({
        ...PERFIL_BASE,
        ibcAplicableSimulacion: TOPE_IBC_2026,
        objetivoValorMensual: 900000000,
      })
      expect(r.barrido.estado).toBe('sin_margen')
      expect(r.barrido.codigo).toBe('SIN_MARGEN_TOPE_LEGAL')
      expect(r.barrido.razon).toBeTruthy()
      expect(r.barrido.puntos).toEqual([])
      expect(r.barrido.puntoObjetivo).toBeNull()
    })
  })

  describe('Caso: restricción de costo corta antes de alcanzar el objetivo mismo', () => {
    it("extremo 'limite_restriccion' — límite matemático EXACTO (con decimales, sin redondear), reutiliza el IBC ya encontrado por el alternativo de S4-003", () => {
      const tasaCotizacionFraccion = obtenerTasaCotizacion(PERFIL_BASE.fecha).valor / 100
      const restriccion = 1234 // NO múltiplo exacto de la tasa (16%), para forzar decimales reales
      const topeEfectivoEsperado = PERFIL_BASE.ibcAplicableSimulacion + restriccion / tasaCotizacionFraccion
      expect(Number.isInteger(topeEfectivoEsperado)).toBe(false)

      const r = generarCaminosRPM({
        ...PERFIL_BASE,
        objetivoValorMensual: 2500000,
        restriccionCostoPensionalAdicionalMaximoMensual: restriccion,
      })

      expect(r.escenarios[1].estado).toBe('viable')
      expect(r.escenarios[1].distanciaObjetivo.cumple).toBe(false) // confirma que estamos en el caso correcto

      expect(r.barrido.estado).toBe('calculado')
      const ultimo = r.barrido.puntos[4]
      expect(ultimo.posicion).toBe('limite_restriccion')
      expect(ultimo.escenarioIbcFuturo.valorAplicado).toBe(topeEfectivoEsperado)
      expect(ultimo.escenarioIbcFuturo.valorAplicado).toBe(r.escenarios[1].esfuerzo.ibcPropuesto) // mismo límite, reutilizado
      expect(Number.isInteger(ultimo.escenarioIbcFuturo.valorAplicado)).toBe(false)
      expect(r.barrido.puntos.slice(1, 4).every((p) => Number.isInteger(p.escenarioIbcFuturo.valorAplicado))).toBe(true)
      expect(r.barrido.puntoObjetivo).toBeNull() // nunca se alcanzó el objetivo
    })

    it('sin_margen — restricción de costo declarada en $0, distinguido con SIN_MARGEN_RESTRICCION_COSTO (no es el tope legal el que limita)', () => {
      // E3-C2d: objetivoValorMensual explícito, por encima del piso legal (a diferencia del
      // valor por defecto de PERFIL_BASE, $1.600.000, que el piso de $1.750.905 ya cubre por
      // sí solo desde que el ajuste legal gobierna las decisiones) — de lo contrario el
      // escenario base ya alcanzaría el objetivo vía el piso y este caso (que necesita un
      // objetivo genuinamente no alcanzado) nunca se ejercitaría.
      const r = generarCaminosRPM({
        ...PERFIL_BASE,
        objetivoValorMensual: 2500000,
        restriccionCostoPensionalAdicionalMaximoMensual: 0,
      })
      expect(r.barrido.estado).toBe('sin_margen')
      expect(r.barrido.codigo).toBe('SIN_MARGEN_RESTRICCION_COSTO')
      expect(r.barrido.puntos).toEqual([])
      expect(r.barrido.puntoObjetivo).toBeNull()
    })
  })

  describe('Caso: objetivo alcanzable — el rango se extiende hasta ~125% del objetivo', () => {
    it("margen del 125% alcanzable dentro del tope legal → extremo 'referencia_superior', puntoObjetivo bit-idéntico al alternativo de S4-003", () => {
      const base = calcularProyeccionRPM({
        historiaCotizacion: PERFIL_BASE.historiaCotizacion,
        fechaNacimiento: PERFIL_BASE.fechaNacimiento,
        edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
        escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
        fecha: FECHA_CALCULO,
      })
      const objetivoValorMensual = base.pensionMensualProyectada * 1.5 // holgadamente alcanzable, y su ×1.25 también

      const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })

      expect(r.escenarios[1].estado).toBe('viable')
      expect(r.escenarios[1].distanciaObjetivo.cumple).toBe(true) // confirma que estamos en el caso correcto

      expect(r.barrido.estado).toBe('calculado')
      const ultimo = r.barrido.puntos[4]
      expect(ultimo.posicion).toBe('referencia_superior')
      // El extremo alcanza (o supera) el margen de 1.25× — nunca una segunda meta, solo
      // el punto de referencia hasta donde se extendió la exploración.
      expect(ultimo.resultado.valor).toBeGreaterThanOrEqual(objetivoValorMensual * 1.25)

      // puntoObjetivo es exactamente el alternativo ya calculado por S4-003 — bit a bit,
      // nunca una segunda evaluación.
      expect(r.barrido.puntoObjetivo).not.toBeNull()
      expect(r.barrido.puntoObjetivo.escenarioIbcFuturo).toEqual(r.escenarios[1].entradas.escenarioIbcFuturo)
      expect(r.barrido.puntoObjetivo.esfuerzo).toEqual(r.escenarios[1].esfuerzo)
      expect(r.barrido.puntoObjetivo.resultado).toEqual(r.escenarios[1].resultado)
      expect(r.barrido.puntoObjetivo.escenarioIbcFuturo.origen).toBe('busqueda_objetivo_rpm')

      // El objetivo cae dentro del rango explorado, nunca más allá del extremo.
      expect(r.barrido.puntoObjetivo.escenarioIbcFuturo.valorAplicado).toBeLessThanOrEqual(
        ultimo.escenarioIbcFuturo.valorAplicado
      )
    })

    it("margen del 125% excede el tope legal (sin restricción declarada) → extremo 'extremo_superior' en topeAplicado, objetivo igual alcanzado y marcado", () => {
      // Calibrado numéricamente: pensión en el tope legal ≈ $7.864.086 — un objetivo entre
      // eso y eso/1.25 es alcanzable, pero su ×1.25 no cabe ni en el tope legal.
      const objetivoValorMensual = 7149169
      const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })

      expect(r.escenarios[1].estado).toBe('viable')
      expect(r.escenarios[1].distanciaObjetivo.cumple).toBe(true) // confirma que estamos en el caso correcto
      expect(objetivoValorMensual * 1.25).toBeGreaterThan(
        calcularProyeccionRPM({
          historiaCotizacion: PERFIL_BASE.historiaCotizacion,
          fechaNacimiento: PERFIL_BASE.fechaNacimiento,
          edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
          escenarioIbcFuturo: { valor: TOPE_IBC_2026, origen: 'diagnostico' },
          fecha: FECHA_CALCULO,
        }).pensionMensualProyectada
      ) // confirma que el ×1.25 realmente no cabe en el tope legal

      expect(r.barrido.estado).toBe('calculado')
      const ultimo = r.barrido.puntos[4]
      expect(ultimo.posicion).toBe('extremo_superior')
      expect(ultimo.escenarioIbcFuturo.valorAplicado).toBe(TOPE_IBC_2026)
      expect(r.barrido.puntoObjetivo).not.toBeNull()
      expect(r.barrido.puntoObjetivo.resultado.valor).toBeGreaterThanOrEqual(objetivoValorMensual)
    })

    it("una restricción de costo permite alcanzar el objetivo pero corta antes del margen del 125% → extremo 'limite_restriccion', objetivo igual alcanzado y marcado", () => {
      // Recalibrado (E3-C2d): con el ajuste legal gobernando las decisiones, un objetivo
      // igual o por debajo del piso ($1.750.905) ya lo cubre el escenario base por sí solo
      // (sin necesitar bisección ni restricción) — la calibración original ($1.534.606) caía
      // en ese caso y ya no ejercita esta rama. Recalibrado numéricamente sobre la mesada
      // FINAL AJUSTADA (no sobre el crudo): objetivo alcanzable con IBC ≈ $13.372.088; su
      // ×1.25 ($3.750.000) necesitaría IBC ≈ $18.059.588. La restricción elegida (a mitad de
      // camino entre ambos IBC, en pesos de aporte adicional) deja alcanzar el objetivo pero
      // no el margen del 125%.
      const objetivoValorMensual = 3000000
      const restriccion = 2194534

      const r = generarCaminosRPM({
        ...PERFIL_BASE,
        objetivoValorMensual,
        restriccionCostoPensionalAdicionalMaximoMensual: restriccion,
      })

      expect(r.escenarios[1].estado).toBe('viable')
      expect(r.escenarios[1].distanciaObjetivo.cumple).toBe(true) // confirma que estamos en el caso correcto
      expect(r.escenarios[1].limitaciones.map((l) => l.codigo)).not.toContain('RESTRICCION_COSTO_LIMITA_RESULTADO') // el objetivo SÍ se alcanzó, esta limitación no aplica aquí

      const tasaCotizacionFraccion = obtenerTasaCotizacion(PERFIL_BASE.fecha).valor / 100
      const topeEfectivoEsperado = PERFIL_BASE.ibcAplicableSimulacion + restriccion / tasaCotizacionFraccion

      expect(r.barrido.estado).toBe('calculado')
      const ultimo = r.barrido.puntos[4]
      expect(ultimo.posicion).toBe('limite_restriccion')
      expect(ultimo.escenarioIbcFuturo.valorAplicado).toBe(topeEfectivoEsperado)
      expect(r.barrido.puntoObjetivo).not.toBeNull()
      expect(r.barrido.puntoObjetivo.resultado.valor).toBeGreaterThanOrEqual(objetivoValorMensual)
      // El objetivo se alcanzó con un IBC bastante menor al límite de la restricción —
      // confirma que el 125% (que sí lo hubiera necesitado) es lo que quedó fuera.
      expect(r.barrido.puntoObjetivo.escenarioIbcFuturo.valorAplicado).toBeLessThan(topeEfectivoEsperado)
    })

    it('determinismo: misma entrada produce exactamente el mismo barrido, incluida la doble búsqueda (objetivo + margen del 125%)', () => {
      const base = calcularProyeccionRPM({
        historiaCotizacion: PERFIL_BASE.historiaCotizacion,
        fechaNacimiento: PERFIL_BASE.fechaNacimiento,
        edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
        escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
        fecha: FECHA_CALCULO,
      })
      const objetivoValorMensual = base.pensionMensualProyectada * 1.5
      const r1 = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
      const r2 = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
      expect(r1.barrido).toEqual(r2.barrido)
    })
  })

  it('barrido: null en todos los casos donde el camino base no es evaluable', () => {
    expect(generarCaminosRPM({ ...PERFIL_BASE, regimenActual: 'RAIS' }).barrido).toBeNull()
    expect(generarCaminosRPM({ ...PERFIL_BASE, sexo: null }).barrido).toBeNull()
    expect(
      generarCaminosRPM({ ...PERFIL_BASE, fechaNacimiento: '2000-01-01', edadJubilacionDeseada: 50 }).barrido
    ).toBeNull()
    expect(
      generarCaminosRPM({ ...PERFIL_BASE, historiaCotizacion: historiaDiezAniosCompleta() }).barrido
    ).toBeNull()
    expect(
      generarCaminosRPM({
        ...PERFIL_BASE,
        historiaCotizacion: [],
        fechaNacimiento: '1964-01-31',
        edadJubilacionDeseada: 62,
      }).barrido
    ).toBeNull()
  })
})

describe('generarCaminosRPM — horizonte (§14 punto 9 del Entregable 2)', () => {
  it('null en todos los casos donde el camino base no es evaluable — mismo criterio que barrido', () => {
    expect(generarCaminosRPM({ ...PERFIL_BASE, regimenActual: 'RAIS' }).horizonte).toBeNull()
    expect(generarCaminosRPM({ ...PERFIL_BASE, sexo: null }).horizonte).toBeNull()
  })

  it('coincide exactamente con horizonteFuturo del camino base — reexpuesto, no recalculado', () => {
    const proyeccionBase = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })

    const r = generarCaminosRPM(PERFIL_BASE)

    expect(r.horizonte).toEqual(proyeccionBase.horizonteFuturo)
  })

  it('un único campo top-level, no uno por camino — nunca aparece dentro de cada escenario', () => {
    const r = generarCaminosRPM(PERFIL_BASE)
    expect(r.escenarios.every((e) => !('horizonte' in e) && !('horizonteFuturo' in e))).toBe(true)
  })

  it('base y alternativo comparten exactamente el mismo horizonte cuando hay ambos caminos', () => {
    const base = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_BASE.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    const objetivoValorMensual = base.pensionMensualProyectada * 1.5 // alcanzable → produce el alternativo

    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })

    expect(r.escenarios).toHaveLength(2)
    expect(r.escenarios[1].estado).toBe('viable')
    // El horizonte top-level es el único lugar donde vive esta información — se verifica
    // recalculando independientemente la proyección del alternativo (con el IBC que
    // efectivamente encontró) y confirmando que su horizonteFuturo es idéntico al top-level,
    // nunca uno distinto por camino.
    const proyeccionAlternativo = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: {
        valor: r.escenarios[1].entradas.escenarioIbcFuturo.valorAplicado,
        origen: r.escenarios[1].entradas.escenarioIbcFuturo.origen,
      },
      fecha: FECHA_CALCULO,
    })
    expect(proyeccionAlternativo.horizonteFuturo).toEqual(r.horizonte)
  })

  it('horizonte también cubre el rango del barrido — mismo fecha/fechaNacimiento/edadJubilacionDeseada en cada punto', () => {
    // E3-C2d: objetivoValorMensual explícito, por encima del piso legal — con el valor por
    // defecto de PERFIL_BASE ($1.600.000, por debajo del piso de $1.750.905) el escenario
    // base ya alcanzaría el objetivo vía el piso y el barrido devolvería
    // 'objetivo_ya_alcanzado' sin puntos, en vez de 'calculado'.
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual: 2500000 })
    expect(r.barrido.estado).toBe('calculado')
    const primerPunto = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: {
        valor: r.barrido.puntos[0].escenarioIbcFuturo.valorAplicado,
        origen: r.barrido.puntos[0].escenarioIbcFuturo.origen,
      },
      fecha: FECHA_CALCULO,
    })
    expect(primerPunto.horizonteFuturo).toEqual(r.horizonte)
  })

  it('fixture real rpm-empleado-proyecta-tu-pension: horizonte exacto 2026-08-22 → 2043-02-11, 6.018 días, idéntico en escenario base y alternativo', () => {
    const historiaFixture = [
      { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
      { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
    ]
    const r = generarCaminosRPM({
      regimenActual: 'RPM',
      sexo: 'Hombre',
      historiaCotizacion: historiaFixture,
      fechaNacimiento: '1978-02-11',
      edadJubilacionDeseada: 65,
      ibcAplicableSimulacion: 2900000,
      objetivoValorMensual: 3500000,
      fecha: '2026-08-21',
    })

    expect(r.horizonte).toEqual({ fechaInicio: '2026-08-22', fechaFin: '2043-02-11', diasCotizados: 6018 })
  })
})

// Contrato GO-B (decisión de arquitectura, 2026-08-25) — mismo perfil que
// calcularProyeccionRPM.test.js ("perfilSinHistoriaParaGoB"): fechaNacimiento 1978-01-01
// (edad actual FECHA_CALCULO = 48), edadJubilacionDeseada 62 (horizonte ≈ 730 semanas
// futuras) — cubre la ventana IBL (3.650 días) pero no las 1.300 semanas mínimas de
// reconocimiento por sí solo, sin historia.
function perfilGoBSinHistoria() {
  return {
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: [],
    fechaNacimiento: '1978-01-01',
    edadJubilacionDeseada: 62,
    ibcAplicableSimulacion: 2500000,
    objetivoValorMensual: 1600000,
    fecha: FECHA_CALCULO,
  }
}

describe('generarCaminosRPM — contrato GO-B: semanas declaradas propagadas hasta la elegibilidad y la tasa', () => {
  it('CASO A — declaradas aproximadas + historia=[]: elegibilidad ya no bloquea, resultado.semanas trazable', () => {
    const r = generarCaminosRPM({
      ...perfilGoBSinHistoria(),
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(r.orientacion.codigo).not.toBe('SIN_CAMINOS_VIABLES')
    expect(r.escenarios.length).toBeGreaterThan(0)
    expect(r.escenarios.some((e) => e.id === 'base' && e.estado === 'viable')).toBe(true)
    expect(r.semanas).not.toBeNull()
    expect(r.semanas.fuente).toBe('declaracion_agregada')
    expect(r.semanas.declaradas).toBe(1100)
    expect(r.semanas.certeza).toBe('aproximado')
    expect(r.semanas.total).toBe(1100 + r.semanas.futuras)
  })

  it('CASO B — declaradas conocidas: misma coherencia, fuente y certeza correctas', () => {
    const r = generarCaminosRPM({
      ...perfilGoBSinHistoria(),
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })

    expect(r.escenarios.length).toBeGreaterThan(0)
    expect(r.semanas.fuente).toBe('declaracion_agregada')
    expect(r.semanas.certeza).toBe('conocido')
    expect(r.semanas.total).toBe(1400 + r.semanas.futuras)
  })

  it('CASO C — historia parcial + declaración: sin doble conteo también a este nivel; elegibilidad sigue usando la fuente declarada en este slice', () => {
    const historiaParcial = [
      { fechaDesde: '2023-01-01', fechaHasta: '2023-12-31', ibc: 1200000, diasCotizados: 365 },
      { fechaDesde: '2024-01-01', fechaHasta: '2024-12-31', ibc: 1200000, diasCotizados: 366 },
      { fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1200000, diasCotizados: 365 },
    ]
    const r = generarCaminosRPM({
      ...perfilGoBSinHistoria(),
      historiaCotizacion: historiaParcial,
      semanasReferenciaDeclaradas: { cantidad: 1100, certeza: 'aproximado' },
    })

    expect(r.semanas.observadas).toBeGreaterThan(0)
    expect(r.semanas.fuente).toBe('declaracion_agregada')
    const sumaProhibida = r.semanas.declaradas + r.semanas.observadas + r.semanas.futuras
    expect(r.semanas.total).not.toBe(sumaProhibida)
    expect(r.semanas.total).toBe(1100 + r.semanas.futuras)
    expect(r.semanas.sustentadasPorHistoria).toBeLessThan(r.semanas.total)
    expect(r.escenarios.length).toBeGreaterThan(0) // la elegibilidad ya no bloquea
  })

  it('CASO D — semanas desconocidas (sin declaración): comportamiento idéntico al existente antes de GO-B, mensaje sigue hablando de "historia", nunca de una declaración inexistente', () => {
    const r = generarCaminosRPM({ ...perfilGoBSinHistoria(), semanasReferenciaDeclaradas: null })

    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.detalleElegibilidad.fuenteSemanas).toBe('historia_estructurada')
    expect(r.orientacion.razon).toContain('Con la historia y el escenario de cotización utilizados')
    expect(r.orientacion.razon).not.toContain('declaraste')
    expect(r.semanas).toBeNull() // resultadoVacio: sin escenario base calculado, sin semanas que exponer
  })

  it('el mensaje de SEMANAS_INSUFICIENTES cambia de redacción cuando la fuente es la declaración, sin inventar una cifra distinta', () => {
    const r = generarCaminosRPM({
      ...perfilGoBSinHistoria(),
      semanasReferenciaDeclaradas: { cantidad: 50, certeza: 'aproximado' }, // insuficiente incluso declarando
    })

    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.detalleElegibilidad.fuenteSemanas).toBe('declaracion_agregada')
    expect(r.orientacion.razon).toContain('Con las semanas que declaraste y el escenario de cotización futuro utilizado')
  })

  it('E — regresión: sin ninguna declaración, el comportamiento por defecto (PERFIL_BASE, con historia real) no cambia', () => {
    const r = generarCaminosRPM(PERFIL_BASE)
    expect(r.semanas).not.toBeNull()
    expect(r.semanas.fuente).toBe('historia_estructurada')
    expect(r.semanas.declaradas).toBeNull()
    expect(r.semanas.total).toBe(r.semanas.sustentadasPorHistoria)
  })
})

// Hallazgo de prueba manual (2026-08-27) — caso real RPM/Colpensiones: fechaNacimiento
// 1974-07-13, edadJubilacionDeseada 62, historiaCotizacion=[], semanas declaradas 1350
// aproximadas, IBC actual $7.000.000 aproximado. Reproducido contra el motor real: el
// tramo futuro sintético aporta solo 3.608 de los 3.650 días que exige la ventana del
// IBL ordinario — calcularProyeccionRPM rechaza el escenario ANTES de leer
// semanasReferenciaDeclaradas (el contrato GO-B nunca llega a intervenir). Antes de este
// Slice, generarCaminosRPM colapsaba esto al mensaje genérico 'SIN_CAMINOS_VIABLES', sin
// razón específica ni ninguna acción ofrecida en la UI. FECHA_NACIMIENTO_CASO/edad abajo
// reproducen el mismo mes/día del caso real con un año ajustado para un resultado
// determinista bajo FECHA_CALCULO ('2026-01-01', ya definido arriba en este archivo) —
// verificado con el motor real: exactamente 3.645 de 3.650 días (5 días de faltante,
// misma familia de caso límite que el reportado, nunca inventado).
describe('generarCaminosRPM — HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA propagada hasta la orientación (hallazgo de prueba manual, caso real RPM/Colpensiones, 2026-08-27)', () => {
  const FECHA_NACIMIENTO_CASO = '1973-12-25'

  function perfilCaso(overrides = {}) {
    return {
      regimenActual: 'RPM',
      sexo: 'Hombre',
      historiaCotizacion: [],
      fechaNacimiento: FECHA_NACIMIENTO_CASO,
      edadJubilacionDeseada: 62,
      ibcAplicableSimulacion: 2000000,
      objetivoValorMensual: 1500000,
      fecha: FECHA_CALCULO,
      ...overrides,
    }
  }

  it('B — historia vacía + horizonte corto (3.645 de 3.650 días): devuelve la razón específica con las cifras exactas, nunca el mensaje genérico de SIN_CAMINOS_VIABLES', () => {
    const r = generarCaminosRPM(perfilCaso())

    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.orientacion.codigo).not.toBe('SIN_CAMINOS_VIABLES')
    expect(r.orientacion.razon).toContain('3645')
    expect(r.orientacion.razon).toContain('3650')
    expect(r.orientacion.razon).not.toContain('No fue posible calcular ni siquiera el camino base')
    // Nunca lenguaje de error técnico ni de cambiar edad/régimen — solo historia.
    expect(r.orientacion.razon.toLowerCase()).not.toMatch(/error|inválid|edad objetivo|régimen/)
    expect(r.detalleElegibilidad).toEqual({ diasEfectivosAcumulados: 3645, diasVentanaRequeridos: 3650 })
  })

  it('B (con semanas declaradas, GO-B): la declaración de semanas NO rescata este gate — el contrato GO-B nunca llega a leerse aquí', () => {
    const r = generarCaminosRPM(perfilCaso({ semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'aproximado' } }))

    expect(r.orientacion.codigo).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.escenarios).toEqual([])
    expect(r.semanas).toBeNull() // resultadoVacio: sin escenario base calculado, sin semanas que exponer
  })

  it('D — al completar historia suficiente (conservando la misma declaración de semanas), el bloqueo desaparece y vuelve a calcular un camino viable', () => {
    const historiaCompletada = [{ fechaDesde: '2024-11-01', fechaHasta: '2025-12-31', ibc: 2000000, diasCotizados: 426 }]
    const r = generarCaminosRPM(
      perfilCaso({
        historiaCotizacion: historiaCompletada,
        semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'aproximado' },
      })
    )

    expect(r.orientacion.codigo).not.toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.escenarios.length).toBeGreaterThan(0)
  })

  it('E — sin regresión de GO-B: en el mismo caso D, las semanas que alimentan elegibilidad/tasa siguen siendo la declaración, nunca fabricadas ni duplicadas con la historia agregada', () => {
    const historiaCompletada = [{ fechaDesde: '2024-11-01', fechaHasta: '2025-12-31', ibc: 2000000, diasCotizados: 426 }]
    const r = generarCaminosRPM(
      perfilCaso({
        historiaCotizacion: historiaCompletada,
        semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'aproximado' },
      })
    )

    expect(r.semanas.fuente).toBe('declaracion_agregada')
    expect(r.semanas.declaradas).toBe(1350)
    expect(r.semanas.observadas).toBeGreaterThan(0) // hay historia real, pero no reemplaza la declaración
    const sumaProhibida = r.semanas.declaradas + r.semanas.observadas + r.semanas.futuras
    expect(r.semanas.total).not.toBe(sumaProhibida) // nunca doble conteo
    expect(r.semanas.total).toBe(1350 + r.semanas.futuras)
  })
})

// Regresión del caso real reportado en prueba manual (2026-08-27, segunda vuelta): el
// usuario completó 181 días reales de historia (2026-01-01 → 2026-06-30, IBC $1.800.000)
// después de que la proyección original quedara bloqueada por
// HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA (RPM-032) — y, por un bug de
// navegación ajeno a este archivo (ProyectaTuPensionRPM → HistoriaCotizacionRPM →
// ExploraTuProyeccionRPM, ya corregido en App.jsx/ExploraTuProyeccionRPM.jsx), nunca vio
// que su pregunta original ya era calculable. `fecha` fijo (no hoyISO()) para que el caso
// sea determinista independientemente de cuándo se ejecute la suite — reproduce
// exactamente los mismos días (3.608 futuros) que el caso real.
describe('generarCaminosRPM — regresión: retomar la proyección original tras completar historia suficiente (caso real, 2026-08-27)', () => {
  const PERFIL_CASO_REAL = {
    regimenActual: 'RPM',
    sexo: 'Hombre',
    fechaNacimiento: '1974-07-13',
    edadJubilacionDeseada: 62,
    ibcAplicableSimulacion: 7000000,
    objetivoValorMensual: 7000000,
    semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'aproximado' },
    fecha: '2026-08-27',
  }

  it('sin historia: sigue bloqueado por HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA (regresión de RPM-032, línea base antes de completar historia)', () => {
    const r = generarCaminosRPM({ ...PERFIL_CASO_REAL, historiaCotizacion: [] })
    expect(r.orientacion.codigo).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.escenarios).toEqual([])
    expect(r.detalleElegibilidad).toEqual({ diasEfectivosAcumulados: 3608, diasVentanaRequeridos: 3650 })
  })

  it('al agregar los 181 días reales del caso reportado, deja de estar bloqueado y produce los caminos viables (base + alternativo)', () => {
    const historiaAgregada = [{ fechaDesde: '2026-01-01', fechaHasta: '2026-06-30', ibc: 1800000, diasCotizados: 181 }]
    const r = generarCaminosRPM({ ...PERFIL_CASO_REAL, historiaCotizacion: historiaAgregada })

    expect(r.orientacion.codigo).not.toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.escenarios.length).toBeGreaterThan(0)
    expect(r.escenarios.some((e) => e.id === 'base' && e.estado === 'viable')).toBe(true)
    // Objetivo == IBC actual mantenido: el camino base ya alcanza el objetivo declarado.
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    // Horizonte explícito preservado (restricción: "mantener explícito el horizonte
    // temporal de los caminos futuros") — nunca se pierde ni se oculta al recalcular.
    expect(r.horizonte).toEqual({ fechaInicio: '2026-08-28', fechaFin: '2036-07-13', diasCotizados: 3608 })
    // GO-B intacto: las semanas que alimentan elegibilidad/tasa siguen siendo la
    // declaración, nunca fabricadas a partir de los 181 días agregados.
    expect(r.semanas.fuente).toBe('declaracion_agregada')
    expect(r.semanas.declaradas).toBe(1350)
    expect(r.semanas.observadas).toBeGreaterThan(0)
    expect(r.semanas.total).toBe(1350 + r.semanas.futuras)
  })

  it('con historia agregada todavía insuficiente (20 días, no 181), el conteo se actualiza dinámicamente y el bloqueo persiste — nunca se queda "pegado" a la primera cifra identificada', () => {
    const historiaInsuficiente = [{ fechaDesde: '2026-06-01', fechaHasta: '2026-06-20', ibc: 1800000, diasCotizados: 20 }]
    const r = generarCaminosRPM({ ...PERFIL_CASO_REAL, historiaCotizacion: historiaInsuficiente })

    expect(r.orientacion.codigo).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
    expect(r.escenarios).toEqual([])
    // 3608 (futuro) + 20 (real agregado) = 3628 — cifra distinta de la línea base (3608),
    // prueba de que el motor recalcula desde cero en cada intento, nunca reutiliza el
    // primer diagnóstico.
    expect(r.detalleElegibilidad).toEqual({ diasEfectivosAcumulados: 3628, diasVentanaRequeridos: 3650 })
    expect(r.orientacion.razon).toContain('3628')
  })
})

// E2 (PL-260, Slice "separación entre elegibilidad proyectada y cuantía económica") —
// integra evaluarElegibilidadProyectadaRPM.js/evaluarDisponibilidadCuantiaRPM.js en
// generarCaminosRPM.js. Estos tests verifican específicamente la integración (los
// contratos en sí ya están probados exhaustivamente en sus propios archivos de test) y
// reproducen los Casos de Oscar 3A/3B como regresión de aceptación end-to-end.
describe('generarCaminosRPM — E2: elegibilidad/disponibilidadCuantia expuestas en el resultado', () => {
  it('resultado exitoso (PERFIL_BASE): elegibilidad.estado CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO y disponibilidadCuantia.estado CUANTIA_CALCULABLE, ambos adjuntos', () => {
    const r = generarCaminosRPM(PERFIL_BASE)
    expect(r.elegibilidad).not.toBeNull()
    expect(r.elegibilidad.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.disponibilidadCuantia).not.toBeNull()
    expect(r.disponibilidadCuantia.estado).toBe('CUANTIA_CALCULABLE')
  })

  it('PERFIL_NO_EVALUABLE (régimen distinto de RPM): elegibilidad nunca se evalúa, queda null', () => {
    const r = generarCaminosRPM({ ...PERFIL_BASE, regimenActual: 'RAIS' })
    expect(r.elegibilidad).toBeNull()
    expect(r.disponibilidadCuantia).toBeNull()
  })

  it('Oscar 3A/3B (Hombre, 53 años, RPM, hasta 62, sin historia detallada, horizonte < 10 años): elegibilidad CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO, cuantía no calculable, ninguna cifra de pensión ni aporte inventada — reproduce end-to-end el hallazgo del diagnóstico previo', () => {
    const PERFIL_OSCAR = {
      regimenActual: 'RPM',
      sexo: 'Hombre',
      fechaNacimiento: '1972-06-15', // 53 años al 2026-01-01
      edadJubilacionDeseada: 62,
      historiaCotizacion: [],
      ibcAplicableSimulacion: 1751000,
      objetivoValorMensual: 1751000,
      fecha: FECHA_CALCULO,
    }

    for (const semanas of [1200, 1300]) {
      const r = generarCaminosRPM({
        ...PERFIL_OSCAR,
        semanasReferenciaDeclaradas: { cantidad: semanas, certeza: 'conocido' },
      })

      // Elegibilidad: sí evaluada, y confirmada — el hallazgo central de este Slice.
      expect(r.elegibilidad).not.toBeNull()
      expect(r.elegibilidad.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
      expect(r.elegibilidad.semanasActuales.cantidad).toBe(semanas)
      expect(r.elegibilidad.semanasTotalesEnFechaObjetivo).toBeGreaterThan(1300)

      // Cuantía: no calculable con los datos actuales (sin historia real, horizonte corto).
      expect(r.disponibilidadCuantia).not.toBeNull()
      expect(r.disponibilidadCuantia.estado).toBe('CUANTIA_NO_CALCULABLE_TODAVIA')

      // El resultado nunca presenta el caso como "no cumples semanas" — el orientacion.codigo
      // sigue siendo el de historia insuficiente para el IBL, nunca SEMANAS_INSUFICIENTES.
      expect(r.orientacion.codigo).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')
      expect(r.orientacion.codigo).not.toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')

      // Ninguna cifra inventada: escenarios vacío, sin pensión ni aporte en ningún lugar
      // del resultado.
      expect(r.escenarios).toEqual([])
      expect(r.semanas).toBeNull()
      expect(r.barrido).toBeNull()
    }
  })

  it('edad y semanas insuficientes a la vez → EDAD_Y_SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM, con elegibilidad.estado POR_AMBOS', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      fechaNacimiento: '1990-01-01',
      edadJubilacionDeseada: 50, // < 62
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 50, certeza: 'conocido' },
    })
    expect(r.orientacion.codigo).toBe('EDAD_Y_SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.elegibilidad.estado).toBe('NO_CUMPLE_EDAD_NI_SEMANAS_EN_FECHA_OBJETIVO')
    expect(r.escenarios).toEqual([])
  })

  it('no existe doble cálculo divergente: cuando el camino base sí se calcula, elegibilidad.semanasTotalesEnFechaObjetivo coincide exactamente con resultadoBase.semanasCotizadas.total (misma fórmula compartida, resolverSemanasProyectadasRPM.js)', () => {
    const r = generarCaminosRPM(PERFIL_BASE)
    expect(r.elegibilidad.semanasTotalesEnFechaObjetivo).toBe(r.semanas.total)
  })

  it('IBL no calculable no cambia un CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO a un estado de no cumplimiento — la elegibilidad de Oscar 3A permanece idéntica con y sin historia real (solo cambia disponibilidadCuantia)', () => {
    const base = {
      regimenActual: 'RPM',
      sexo: 'Hombre',
      fechaNacimiento: '1972-06-15',
      edadJubilacionDeseada: 62,
      ibcAplicableSimulacion: 1751000,
      objetivoValorMensual: 1751000,
      semanasReferenciaDeclaradas: { cantidad: 1300, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    }
    const sinHistoria = generarCaminosRPM({ ...base, historiaCotizacion: [] })
    const conHistoria = generarCaminosRPM({
      ...base,
      historiaCotizacion: [{ fechaDesde: '2010-01-01', fechaHasta: '2025-12-31', ibc: 1800000, diasCotizados: 5844 }],
    })

    expect(sinHistoria.elegibilidad.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(conHistoria.elegibilidad.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(sinHistoria.disponibilidadCuantia.estado).toBe('CUANTIA_NO_CALCULABLE_TODAVIA')
    expect(conHistoria.disponibilidadCuantia.estado).toBe('CUANTIA_CALCULABLE')
  })
})

// Corrección de riesgo funcional (Carlos/Atlas, 2026-09-04, previa al commit de E2):
// historia con períodos posteriores a fechaCalculo — integración end-to-end. Verifica que
// generarCaminosRPM.js se detiene ANTES de llegar a calcularProyeccionRPM cuando la
// historia es temporalmente inconsistente, incluso con una declaración agregada válida
// presente — nunca hay doble conteo del futuro, y calcularProyeccionRPM.js (que hubiera
// rechazado la misma historia con el mismo código, si se hubiera llegado a invocar) nunca
// llega a ejecutarse.
describe('generarCaminosRPM — E2 corrección: historia con períodos posteriores a fechaCalculo (integración end-to-end)', () => {
  const PERFIL_HISTORIA_FUTURA = {
    regimenActual: 'RPM',
    sexo: 'Hombre',
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 65,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 1600000,
    fecha: FECHA_CALCULO,
  }

  it('historia futura + declaración agregada válida: se detiene en DATOS_INCOMPLETOS, con elegibilidad adjunta y razón precisa — disponibilidadCuantia nunca se calcula (calcularProyeccionRPM.js nunca se invoca)', () => {
    const r = generarCaminosRPM({
      ...PERFIL_HISTORIA_FUTURA,
      historiaCotizacion: [{ fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', ibc: 2000000, diasCotizados: 365 }],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
    expect(r.escenarios).toEqual([])
    expect(r.elegibilidad).not.toBeNull()
    expect(r.elegibilidad.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.elegibilidad.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    // disponibilidadCuantia nunca se calcula en este camino — hard stop antes de llamar a
    // calcularProyeccionRPM (a diferencia del camino "sin evidencia", que sí deja continuar).
    expect(r.disponibilidadCuantia).toBeNull()
  })

  it('el mismo período, pasado directamente a calcularProyeccionRPM (llamada aislada), lo rechaza con el MISMO código de razón — confirma que ambas capas están de acuerdo, no que una "adivinó" el rechazo de la otra', () => {
    const historiaFutura = [{ fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', ibc: 2000000, diasCotizados: 365 }]
    const resultadoDirecto = calcularProyeccionRPM({
      historiaCotizacion: historiaFutura,
      fechaNacimiento: PERFIL_HISTORIA_FUTURA.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_HISTORIA_FUTURA.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: PERFIL_HISTORIA_FUTURA.ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(resultadoDirecto.estado).toBe('no_evaluable')
    expect(resultadoDirecto.razonNoEvaluable).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('período con fechas invertidas: también se detiene en DATOS_INCOMPLETOS antes de intentar cualquier cálculo económico', () => {
    const r = generarCaminosRPM({
      ...PERFIL_HISTORIA_FUTURA,
      historiaCotizacion: [{ fechaDesde: '2020-06-01', fechaHasta: '2020-01-01', ibc: 2000000, diasCotizados: 30 }],
      semanasReferenciaDeclaradas: null,
    })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
    expect(r.elegibilidad.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS')
    expect(r.escenarios).toEqual([])
  })
})

// E3-C2d (sprint-4-correcciones-oscar-baldor): integración del ajuste legal (piso/techo)
// como gobierno de las decisiones de los caminos — comparación contra objetivo,
// distanciaObjetivo, orientación, búsqueda del esfuerzo mínimo y selección entre
// alternativas usan ahora resultadoFinalAjustado (proyeccion.ajusteLegal.resultadoFinalAjustado),
// nunca pensionMensualProyectada como sustituto silencioso. pensionMensualProyectada se
// conserva íntegro y auditable en cada camino como `valorMatematico`.
//
// Fixture propio (SEXO/FECHA_NACIMIENTO/EDAD_JUBILACION C2D), deliberadamente distinto de
// PERFIL_BASE: fechaNacimiento 1976-01-01 + edadJubilacionDeseada 62 produce un horizonte
// (~12 años) que por sí solo excede los 3.650 días de la ventana del IBL — verificado
// empíricamente antes de escribir estas pruebas (misma técnica ya usada en la suite E3-C2c
// de calcularProyeccionRPM.test.js) — así que la ventana del IBL cae ENTERAMENTE dentro del
// período futuro sintético, y el IBL aplicable es exactamente `ibcAplicableSimulacion`, sin
// que la historia (usada aquí solo para sustentar las semanas mínimas) la contamine con
// indexación IPC. historiaLargaCompleta() (1990-2025, ya definida en este archivo, ~1878
// semanas) sustenta semanas de sobra sin afectar el IBL por esta razón.
describe('generarCaminosRPM — E3-C2d: el ajuste legal gobierna las decisiones de los caminos', () => {
  const SEXO_C2D = 'Hombre'
  const FECHA_NACIMIENTO_C2D = '1976-01-01'
  const EDAD_JUBILACION_C2D = 62
  const TOPE_IBC_2026_C2D = 25 * SMLV_2026

  function perfilBajoElPiso(overrides = {}) {
    return {
      regimenActual: 'RPM',
      sexo: SEXO_C2D,
      historiaCotizacion: historiaLargaCompleta(),
      fechaNacimiento: FECHA_NACIMIENTO_C2D,
      edadJubilacionDeseada: EDAD_JUBILACION_C2D,
      // IBC = exactamente 1 SMLMV — jurídicamente válido (es la base de cotización mínima
      // legal, nunca inferior) y, aun así, matemáticamente insuficiente frente al piso: con
      // semanas de sobra la tasa llega al máximo legal (80%), y 0,80 × 1 SMLMV < 1 SMLMV
      // por construcción (mismo criterio ya usado y verificado en calcularProyeccionRPM.test.js).
      ibcAplicableSimulacion: SMLV_2026,
      objetivoValorMensual: SMLV_2026,
      fecha: FECHA_CALCULO,
      ...overrides,
    }
  }

  it('A — elegible, matemático inferior al piso, meta inferior al piso: el escenario base alcanza la meta por el piso, sin proponer ningún aumento', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual: 1500000 }))

    expect(r.elegibilidad.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.escenarios).toHaveLength(1) // sin alternativo — no hace falta ningún aumento
    const base = r.escenarios[0]
    // Precondiciones explícitas (no asumidas): matemático<piso Y matemático<meta<piso.
    expect(base.valorMatematico).toBeLessThan(1500000)
    expect(base.valorMatematico).toBeLessThan(SMLV_2026)
    expect(1500000).toBeLessThan(SMLV_2026)

    expect(base.resultado.valor).toBe(SMLV_2026)
    expect(base.distanciaObjetivo.cumple).toBe(true)
    expect(base.esfuerzo.aumentoIBC).toBe(0)
    expect(base.esfuerzo.costoPensionalAdicionalMensual).toBe(0)
    expect(base.objetivoAlcanzadoPorPisoLegal).toBe(true)
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    expect(r.barrido.estado).toBe('objetivo_ya_alcanzado')
    expect(r.barrido.puntos).toEqual([])
  })

  it('B — meta exactamente igual al piso: se alcanza sin incremento porque el ajuste aplica', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual: SMLV_2026 }))
    const base = r.escenarios[0]

    expect(r.escenarios).toHaveLength(1)
    expect(base.resultado.valor).toBe(SMLV_2026)
    expect(base.distanciaObjetivo.delta).toBe(0)
    expect(base.distanciaObjetivo.cumple).toBe(true)
    expect(base.objetivoAlcanzadoPorPisoLegal).toBe(true) // el crudo por sí solo no llegaba
  })

  it('C — meta apenas superior al piso: la búsqueda sale de la meseta y encuentra el IBC mínimo que la supera', () => {
    const objetivoValorMensual = SMLV_2026 + 1000
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual }))

    expect(r.escenarios).toHaveLength(2)
    const base = r.escenarios[0]
    const alternativo = r.escenarios[1]
    expect(base.distanciaObjetivo.cumple).toBe(false) // el piso solo no basta para esta meta
    expect(alternativo.estado).toBe('viable')
    expect(alternativo.distanciaObjetivo.cumple).toBe(true)
    expect(alternativo.resultado.valor).toBeGreaterThanOrEqual(objetivoValorMensual)

    // Monotonicidad conservada pese a la meseta: un peso menos en el IBC encontrado ya no
    // alcanza la meta — misma verificación de "mínimo real", ahora sobre el valor ajustado.
    const ibcEncontrado = alternativo.entradas.escenarioIbcFuturo.valorAplicado
    expect(Number.isInteger(ibcEncontrado)).toBe(true)
    const unPesoMenos = calcularProyeccionRPM({
      historiaCotizacion: perfilBajoElPiso().historiaCotizacion,
      fechaNacimiento: perfilBajoElPiso().fechaNacimiento,
      edadJubilacionDeseada: perfilBajoElPiso().edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: ibcEncontrado - 1, origen: 'busqueda_objetivo_rpm' },
      fecha: FECHA_CALCULO,
      elegibilidad: { estado: 'CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO' },
    })
    expect(unPesoMenos.ajusteLegal.resultadoFinalAjustado).toBeLessThan(objetivoValorMensual)
  })

  it('D — matemático superior al piso: el final ajustado es igual al matemático, comportamiento ordinario sin regresión', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ ibcAplicableSimulacion: 8000000, objetivoValorMensual: 3000000 }))
    const base = r.escenarios[0]

    expect(base.valorMatematico).toBeGreaterThan(SMLV_2026) // precondición: fuera de la meseta
    expect(base.resultado.valor).toBe(base.valorMatematico) // ni piso ni techo aplican
    expect(base.ajusteLegal.pisoEvaluado.aplica).toBe(false)
    expect(base.objetivoAlcanzadoPorPisoLegal).toBe(false)
    expect(base.distanciaObjetivo.cumple).toBe(true)
  })

  it('E — NO_CUMPLE_EDAD: mismo hard stop y código de siempre, sin construir ningún camino ni exponer ajuste alguno', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ fechaNacimiento: '2010-01-01', edadJubilacionDeseada: 30 }))
    expect(r.elegibilidad.estado).toBe('NO_CUMPLE_EDAD_EN_FECHA_OBJETIVO')
    expect(r.orientacion.codigo).toBe('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL')
    expect(r.escenarios).toEqual([])
  })

  it('F — NO_CUMPLE_SEMANAS: mismo hard stop y código de siempre, precedencia E2 intacta', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ historiaCotizacion: historiaDiezAniosCompleta() }))
    expect(r.elegibilidad.estado).toBe('NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO')
    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.escenarios).toEqual([])
  })

  it('G — NO_CUMPLE_EDAD_NI_SEMANAS: mismo hard stop y código de siempre', () => {
    // historiaDiezAniosCompleta() (~522 semanas, ya definida en este archivo) aporta
    // EVIDENCIA de semanas insuficientes — con historiaCotizacion=[] (sin evidencia alguna)
    // la causa sería NO_CUMPLE_EDAD a secas (edad decide primero cuando semanas es
    // ambiguo, no insuficiente confirmado) — ver evaluarElegibilidadProyectadaRPM.js.
    const r = generarCaminosRPM(
      perfilBajoElPiso({
        fechaNacimiento: '2010-01-01',
        edadJubilacionDeseada: 20,
        historiaCotizacion: historiaDiezAniosCompleta(),
      })
    )
    expect(r.elegibilidad.estado).toBe('NO_CUMPLE_EDAD_NI_SEMANAS_EN_FECHA_OBJETIVO')
    expect(r.orientacion.codigo).toBe('EDAD_Y_SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.escenarios).toEqual([])
  })

  it('H — elegibilidad NO_EVALUABLE (semanas sin evidencia): nunca se usa la cifra matemática como sustituto, mismo corte de siempre (verificación diferida de E2, intacta)', () => {
    // Mismo fechaNacimiento/edadJubilacionDeseada que el caso ya verificado más arriba en
    // este archivo ("historiaCotizacion=[] con horizonte que sí llena la ventana del IBL
    // pero no las 1.300 semanas mínimas", línea ~197) — con la fechaNacimiento propia de
    // perfilBajoElPiso (1976) un horizonte de 75 años sí alcanza a cubrir las 1.300 semanas
    // por sí solo (25 años ≈ 1.300 semanas), así que no sirve para este caso — se necesita
    // el horizonte más corto que ya está calibrado y verificado (1964 + 75 años ≈ 13 años).
    const r = generarCaminosRPM(
      perfilBajoElPiso({
        fechaNacimiento: '1964-01-01',
        historiaCotizacion: [],
        semanasReferenciaDeclaradas: null,
        edadJubilacionDeseada: 75,
      })
    )
    // Revisión Atlas: aserción explícita sobre el ESTADO real de elegibilidad — distingue
    // NO_EVALUABLE (evidencia insuficiente, este caso: sin historia ni declaración) de
    // NO_CUMPLE_SEMANAS (incumplimiento CONFIRMADO, con evidencia). orientacion.codigo por
    // sí solo no basta para demostrarlo: E2 usa el MISMO código
    // (SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM) para ambos casos — la diferencia real
    // vive en elegibilidad.estado/razones, verificada aquí explícitamente.
    expect(r.elegibilidad.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.elegibilidad.razones[0].codigo).toBe('SEMANAS_ACTUALES_SIN_EVIDENCIA')
    expect(r.orientacion.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM')
    expect(r.escenarios).toEqual([])
    // Ninguna cifra pensional (ajustada o cruda) se filtra en ningún lugar del resultado.
    expect(r.barrido).toBeNull()
    expect(r.semanas).toBeNull()
  })

  it('I — SMLMV no apto: camino no evaluable, propaga la razón jurídica exacta (FUNDAMENTO_NORMATIVO_NO_VERIFICADO), sin cifras inventadas', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ fecha: '2026-02-12' })) // FUNDAMENTO_NORMATIVO_NO_VERIFICADO
    // Revisión Atlas: la orientación ya NO colapsa al mensaje genérico SIN_CAMINOS_VIABLES
    // para esta causa específica — orientacion.codigo ES el código jurídico exacto,
    // auditable, mismo patrón ya usado para HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA.
    expect(r.orientacion.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    expect(r.orientacion.codigo).not.toBe('SIN_CAMINOS_VIABLES')
    expect(r.detalleElegibilidad.vigenciaSmlv.tipoVigencia).toBe('fundamento_no_verificado')
    expect(r.detalleElegibilidad.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.escenarios).toEqual([])
  })

  it('J — fecha base inválida: conserva la precedencia de error existente (DATOS_INCOMPLETOS, antes de cualquier cálculo)', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ fecha: 'no-es-fecha' }))
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
    expect(r.escenarios).toEqual([])
  })

  it('K — meta superior al máximo alcanzable: descarta el alternativo con OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE evaluado sobre el valor ajustado, sin falsos positivos', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ ibcAplicableSimulacion: 8000000, objetivoValorMensual: 900000000 }))
    const alternativo = r.escenarios.find((e) => e.id === 'aumentar-ibc-futuro')
    expect(alternativo.estado).toBe('descartado')
    expect(alternativo.razonDescartado.codigo).toBe('OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE')
    expect(r.orientacion.objetivoLegalmenteInalcanzable).toBe(true)
  })

  it('L — techo legal: estructuralmente inalcanzable mediante la fórmula RPM normal (máximo matemático 20 SMLMV < techo de 25 SMLMV) — se documenta aquí, sin fabricar un caso engañoso; el techo real se prueba en ajustarMesadaLegalRPM.test.js', () => {
    // Incluso en el IBC futuro más alto legalmente posible (25 SMLMV, el tope de IBC), el
    // resultado matemático máximo es 20 SMLMV — el techo (25 SMLMV) nunca se activa en RPM
    // puro. Se verifica aquí como propiedad del sistema completo, no se inventa un mock.
    const r = generarCaminosRPM(perfilBajoElPiso({ ibcAplicableSimulacion: TOPE_IBC_2026_C2D, objetivoValorMensual: 1000000 }))
    const base = r.escenarios[0]
    expect(base.ajusteLegal.techoEvaluado.evaluable).toBe(true)
    expect(base.ajusteLegal.techoEvaluado.aplica).toBe(false)
    expect(base.valorMatematico).toBeLessThan(TOPE_IBC_2026_C2D) // muy por debajo del techo de 25 SMLMV
  })

  it('M — el IBC actual ya alcanza la meta usando el valor ajustado: incremento adicional cero, sin alternativa innecesaria', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual: 1200000 }))
    expect(r.escenarios).toHaveLength(1)
    expect(r.escenarios[0].esfuerzo.aumentoIBC).toBe(0)
    expect(r.escenarios[0].esfuerzo.costoPensionalAdicionalMensual).toBe(0)
  })

  it('N — varios IBC producen el mismo resultado final por la meseta del piso: se selecciona el mínimo esfuerzo (el actual), nunca se recomienda aumentar sin beneficio', () => {
    const conIbcBajo = generarCaminosRPM(perfilBajoElPiso({ ibcAplicableSimulacion: SMLV_2026, objetivoValorMensual: 1000000 }))
    const conIbcMayor = generarCaminosRPM(
      perfilBajoElPiso({ ibcAplicableSimulacion: SMLV_2026 * 1.2, objetivoValorMensual: 1000000 })
    )
    // Ambos IBC (distintos) producen el MISMO resultado final (piso) — confirmado como
    // precondición de la meseta.
    expect(conIbcBajo.escenarios[0].resultado.valor).toBe(SMLV_2026)
    expect(conIbcMayor.escenarios[0].resultado.valor).toBe(SMLV_2026)
    expect(conIbcMayor.escenarios[0].valorMatematico).toBeGreaterThan(conIbcBajo.escenarios[0].valorMatematico)
    // En ninguno de los dos casos se recomienda ningún aumento — el IBC actual ya basta.
    expect(conIbcBajo.escenarios).toHaveLength(1)
    expect(conIbcMayor.escenarios).toHaveLength(1)
  })

  it('O — toda la región relevante permanece en la meseta (objetivo ya alcanzado por el piso): no se ejecuta ni se recomienda ningún incremento, el barrido no explora puntos inútiles', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual: 1000000 }))
    expect(r.barrido.estado).toBe('objetivo_ya_alcanzado')
    expect(r.barrido.puntos).toEqual([])
    expect(r.barrido.razon).toContain('no hace falta explorar')
  })

  it('P — borde exacto de salida de la meseta: la búsqueda sigue siendo monotónica y encuentra el mínimo (mismo caso que C, verificado desde el ángulo del borde)', () => {
    // Reutiliza el mismo mecanismo que C — aquí se enfatiza específicamente que el objetivo
    // elegido cae EXACTAMENTE un peso por encima del piso, el borde más ajustado posible.
    const objetivoValorMensual = SMLV_2026 + 1
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual }))
    const alternativo = r.escenarios.find((e) => e.id === 'aumentar-ibc-futuro')
    expect(alternativo.distanciaObjetivo.cumple).toBe(true)
    expect(alternativo.resultado.valor).toBeGreaterThanOrEqual(objetivoValorMensual)
  })

  it('Q — caso Óscar (integración representativa): elegible, matemático por debajo del piso, meta igual o menor al piso → el valor rector es exactamente el SMLMV aplicable, sin recomendar ningún aumento innecesario. El caso exacto ($1.243.210 matemático / $1.750.905 SMLMV) ya está cubierto bit a bit en ajustarMesadaLegalRPM.test.js (función pura, sin depender de historia/IBL real) — reproducirlo aquí exigiría afinar una historia real hasta acertar esa cifra exacta, frágil ante cualquier cambio futuro de constantes legales, sin aportar cobertura nueva sobre ESTA integración (el objetivo de este checkpoint). Esta prueba cubre la misma situación estructural con una historia real.', () => {
    const r = generarCaminosRPM(perfilBajoElPiso({ objetivoValorMensual: SMLV_2026 }))
    const base = r.escenarios[0]
    expect(base.valorMatematico).toBeLessThan(SMLV_2026)
    expect(base.resultado.valor).toBe(SMLV_2026)
    expect(r.escenarios).toHaveLength(1) // ningún aumento recomendado
    expect(base.esfuerzo.aumentoIBC).toBe(0)
  })

  it('R — el resultado matemático mejora dentro de la meseta, pero el resultado final sigue siendo el mismo piso: no se presenta como beneficio pensional ni se recomienda esfuerzo adicional por ello', () => {
    // objetivoValorMensual calibrado a $1.700.000 — deliberadamente por ENCIMA de ambos
    // resultados matemáticos crudos (verificados por separado: $1.400.724 y $1.680.868,8)
    // pero por DEBAJO del piso ($1.750.905): así ninguno de los dos alcanza la meta por su
    // propio crudo (objetivoAlcanzadoPorPisoLegal exige exactamente eso), y ambos la
    // alcanzan solo gracias al piso — precondición verificada explícitamente abajo.
    const objetivoValorMensual = 1700000
    const conIbcBajo = generarCaminosRPM(perfilBajoElPiso({ ibcAplicableSimulacion: SMLV_2026, objetivoValorMensual }))
    const conIbcMayor = generarCaminosRPM(
      perfilBajoElPiso({ ibcAplicableSimulacion: SMLV_2026 * 1.2, objetivoValorMensual })
    )
    expect(conIbcMayor.escenarios[0].valorMatematico).toBeGreaterThan(conIbcBajo.escenarios[0].valorMatematico) // el crudo mejoró...
    expect(conIbcMayor.escenarios[0].valorMatematico).toBeLessThan(objetivoValorMensual) // ...pero ninguno alcanza la meta por sí solo...
    expect(conIbcBajo.escenarios[0].valorMatematico).toBeLessThan(objetivoValorMensual)
    expect(conIbcMayor.escenarios[0].resultado.valor).toBe(conIbcBajo.escenarios[0].resultado.valor) // ...y el legal final no cambia
    expect(conIbcMayor.escenarios[0].objetivoAlcanzadoPorPisoLegal).toBe(true)
    expect(conIbcBajo.escenarios[0].objetivoAlcanzadoPorPisoLegal).toBe(true)
  })
})

// E3-C2d (revisión Atlas): pruebas directas de la defensa contra el fallback silencioso —
// mesadaGobernante() y construirCamino() se exportan exclusivamente para esto (ver su propia
// justificación en generarCaminosRPM.js). El flujo público de generarCaminosRPM() nunca
// permite fabricar externamente un ajusteLegal no evaluable en este punto (elegibilidad y
// vigencia del SMLV ya están garantizadas antes de construir cualquier camino) — por eso
// esta es la única forma de ejercitar la defensa sin mockear módulos completos.
describe('generarCaminosRPM — E3-C2d: defensa contra el fallback silencioso (mesadaGobernante/construirCamino)', () => {
  // Proyección base bien formada, reutilizada como plantilla — cada test solo sobreescribe
  // `ajusteLegal` y/o `pensionMensualProyectada`, nunca reconstruye la forma completa.
  function proyeccionBase(overrides = {}) {
    return {
      estado: 'calculado',
      pensionMensualProyectada: 900000,
      escenarioIbcFuturo: { valorDeclarado: 2000000, valorAplicado: 2000000, origen: 'continuidad_ibc_actual', topeAplicado: 43772625 },
      ibl: { ordinario: { valor: 2000000, detalle: [] }, vidaLaboral: null, aplicable: 2000000, esOpcionLegal: false, razonVidaLaboralNoEvaluada: null },
      tasaReemplazo: 65,
      semanasCotizadas: { observadas: 1500, futuras: 100, sustentadasPorHistoria: 1600, declaradas: null, certeza: null, total: 1600, fuente: 'historia_estructurada' },
      composicionVentanaOrdinaria: { diasObservados: 3000, diasFuturos: 650, fraccionFutura: 0.178 },
      trazabilidadVentana: {},
      limitaciones: [],
      ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: 1750905, pisoEvaluado: { evaluable: true, aplica: true }, techoEvaluado: { evaluable: true, aplica: false }, razon: null },
      ...overrides,
    }
  }

  describe('mesadaGobernante — detección aislada', () => {
    it('devuelve resultadoFinalAjustado cuando el ajuste está evaluado y es un número finito', () => {
      expect(mesadaGobernante(proyeccionBase())).toBe(1750905)
    })

    it('devuelve null cuando ajusteLegal.estado es no_evaluable — nunca el crudo', () => {
      const proyeccion = proyeccionBase({
        ajusteLegal: { estado: 'no_evaluable', resultadoFinalAjustado: null, razon: { codigo: 'ELEGIBILIDAD_NO_EVALUABLE', mensaje: 'x' } },
      })
      expect(mesadaGobernante(proyeccion)).toBeNull()
    })

    it('devuelve null cuando ajusteLegal.estado es no_solicitado', () => {
      const proyeccion = proyeccionBase({
        ajusteLegal: { estado: 'no_solicitado', resultadoFinalAjustado: null, razon: { codigo: 'AJUSTE_LEGAL_NO_SOLICITADO', mensaje: 'x' } },
      })
      expect(mesadaGobernante(proyeccion)).toBeNull()
    })

    it('devuelve null cuando ajusteLegal es null', () => {
      expect(mesadaGobernante(proyeccionBase({ ajusteLegal: null }))).toBeNull()
    })

    it('devuelve null cuando resultadoFinalAjustado no es finito, incluso si estado dice "evaluado" (entrada malformada)', () => {
      expect(mesadaGobernante(proyeccionBase({ ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: NaN } }))).toBeNull()
      expect(mesadaGobernante(proyeccionBase({ ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: null } }))).toBeNull()
      expect(mesadaGobernante(proyeccionBase({ ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: undefined } }))).toBeNull()
    })
  })

  describe('construirCamino — nunca usa pensionMensualProyectada como sustituto silencioso', () => {
    const paramsComunes = {
      id: 'base',
      tipo: 'base',
      decision: 'x',
      edadJubilacionDeseada: 62,
      ibcActual: 2000000,
      tasaCotizacion: 0.16,
      objetivoValorMensual: 1000000,
    }

    it('ajusteLegal.estado="evaluado": camino viable, resultado.valor = ajustado, valorMatematico = crudo, ambos conservados', () => {
      const camino = construirCamino({ ...paramsComunes, proyeccion: proyeccionBase() })
      expect(camino.estado).toBe('viable')
      expect(camino.resultado.valor).toBe(1750905)
      expect(camino.valorMatematico).toBe(900000)
      expect(camino.ajusteLegal.estado).toBe('evaluado')
    })

    it('ajusteLegal.estado="no_evaluable" con razón propia: camino DESCARTADO, conserva la razón exacta disponible, nunca gobernado por el crudo', () => {
      const proyeccion = proyeccionBase({
        pensionMensualProyectada: 5000000, // deliberadamente alto — si hubiera fallback, "cumpliría" el objetivo
        ajusteLegal: {
          estado: 'no_evaluable',
          resultadoFinalAjustado: null,
          razon: { codigo: 'ELEGIBILIDAD_NO_EVALUABLE', mensaje: 'No hay evidencia suficiente para confirmar el requisito.' },
        },
      })
      const camino = construirCamino({ ...paramsComunes, proyeccion })

      expect(camino.estado).toBe('descartado')
      expect(camino.resultado).toBeNull()
      // Nunca se afirma alcanzabilidad ni inalcanzabilidad legal — es un código distinto,
      // nunca OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE ni YA_EN_TOPE_LEGAL.
      expect(camino.razonDescartado.codigo).toBe('ELEGIBILIDAD_NO_EVALUABLE')
      expect(camino.razonDescartado.codigo).not.toBe('OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE')
      expect(camino.razonDescartado.mensaje).toBe('No hay evidencia suficiente para confirmar el requisito.')
      // El crudo nunca gobierna: ni siquiera se expone como "resultado" a pesar de ser, por
      // construcción de este test, un valor que superaría cualquier objetivo razonable.
      expect(camino.valorMatematico).toBeNull()
      expect(camino.distanciaObjetivo).toBeNull()
    })

    it('ajusteLegal sin razón específica disponible (null/malformado): usa exactamente AJUSTE_LEGAL_NO_EVALUABLE, nunca un código inventado ni silencio', () => {
      const camino = construirCamino({ ...paramsComunes, proyeccion: proyeccionBase({ ajusteLegal: null }) })
      expect(camino.estado).toBe('descartado')
      expect(camino.razonDescartado.codigo).toBe('AJUSTE_LEGAL_NO_EVALUABLE')
      expect(camino.razonDescartado.mensaje).toMatch(/ajuste legal/i)
    })

    it('tipo se preserva en el camino descartado (base o alternativo), nunca forzado a "alternativo" para un camino base', () => {
      const caminoBase = construirCamino({ ...paramsComunes, tipo: 'base', proyeccion: proyeccionBase({ ajusteLegal: null }) })
      expect(caminoBase.tipo).toBe('base')
    })
  })
})
