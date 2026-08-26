import { describe, it, expect } from 'vitest'
import { generarCaminosRPM } from './generarCaminosRPM.js'
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
  it('historia insuficiente incluso con el horizonte futuro → SIN_CAMINOS_VIABLES, sin excepción — con una edad que ya cumple el mínimo legal', () => {
    const r = generarCaminosRPM({
      ...PERFIL_BASE,
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-31', // edad actual = 61, apenas antes del cumpleaños
      edadJubilacionDeseada: 62, // exactamente el mínimo legal — pasa la elegibilidad, horizonte de 30 días
    })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('SIN_CAMINOS_VIABLES')
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
    const proyeccionEsperada = calcularProyeccionRPM({
      historiaCotizacion: PERFIL_BASE.historiaCotizacion,
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      escenarioIbcFuturo: { valor: ibcEsperado, origen: 'esfuerzo_adicional_declarado' },
      fecha: FECHA_CALCULO,
    })

    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')

    expect(personalizado).toBeDefined()
    expect(personalizado.estado).toBe('viable')
    expect(personalizado.tipo).toBe('alternativo')
    expect(personalizado.entradas.escenarioIbcFuturo.origen).toBe('esfuerzo_adicional_declarado')
    expect(personalizado.entradas.escenarioIbcFuturo.valorAplicado).toBe(ibcEsperado)
    expect(personalizado.resultado.valor).toBe(proyeccionEsperada.pensionMensualProyectada)
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

  it('B. camino personalizado: delta === resultado.valor - base.resultado.valor exactamente (verificado independientemente)', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 200000 })
    const base = r.escenarios.find((e) => e.id === 'base')
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    expect(personalizado.diferenciaFrenteABase.delta).toBe(personalizado.resultado.valor - base.resultado.valor)
    expect(personalizado.diferenciaFrenteABase.delta).toBeGreaterThan(0) // más esfuerzo, más pensión — monotonicidad ya validada (§8.5)
  })

  it('C. camino objetivo (alternativo): mismo criterio', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual })
    const base = r.escenarios.find((e) => e.id === 'base')
    const alternativo = r.escenarios.find((e) => e.id === 'aumentar-ibc-futuro')
    expect(alternativo.diferenciaFrenteABase.delta).toBe(alternativo.resultado.valor - base.resultado.valor)
  })

  it('D. la resta es directa, sin Math.abs ni clamping — un delta negativo (si existiera) se conservaría intacto. Nota arquitectónica: hoy generarCaminosRPM.js no puede producir legítimamente un camino viable con pensión menor que el base (el alternativo y el personalizado solo evalúan IBC >= ibcActual, y la monotonicidad de calcularProyeccionRPM ya está validada en §8.5) — por eso el signo negativo se prueba de forma exhaustiva a nivel de helper de presentación (ProyectaTuPensionRPM.helpers.test.js), que sí recibe deltas arbitrarios. Aquí solo se confirma que la resta del dominio nunca invierte ni recorta el signo de un delta positivo real.', () => {
    const objetivoValorMensual = objetivoNoAlcanzadoPorBase()
    const r = generarCaminosRPM({ ...PERFIL_BASE, objetivoValorMensual, esfuerzoAdicionalMensualDeseado: 50000 })
    const base = r.escenarios.find((e) => e.id === 'base')
    const personalizado = r.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    // Un esfuerzo pequeño produce un delta pequeño pero sigue siendo exactamente la resta —
    // nunca 0 por redondeo, nunca forzado a un mínimo.
    expect(personalizado.diferenciaFrenteABase.delta).toBe(personalizado.resultado.valor - base.resultado.valor)
    expect(personalizado.diferenciaFrenteABase.delta).not.toBe(0)
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
      const r = generarCaminosRPM({
        ...PERFIL_BASE,
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
      // Calibrado numéricamente: objetivo alcanzable con IBC ≈ $4.213.375; su ×1.25
      // necesitaría IBC ≈ $6.611.197. La restricción elegida (a mitad de camino entre
      // ambos IBC) deja alcanzar el objetivo pero no el margen del 125%.
      const objetivoValorMensual = 1534606
      const restriccion = 545966

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
    const r = generarCaminosRPM(PERFIL_BASE)
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
