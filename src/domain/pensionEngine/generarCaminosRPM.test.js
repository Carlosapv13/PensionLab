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
