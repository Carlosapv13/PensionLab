// E5.3 — pruebas de construirEjercicioResueltoRPM.js (Contrato F, PL-260 §8).
//
// Convención de este archivo (Decisión 7, revisión previa a esta implementación): cada
// describe/it indica explícitamente si construye su entrada con una llamada REAL a
// generarCaminosRPM() (con datos de historia/fecha propios de este archivo, nunca
// importados de otro .test.js) o con un objeto SINTÉTICO (para ejercitar validación de
// contrato que ningún fixture real produce hoy). Ningún test depende del orden de otro.

import { describe, it, expect } from 'vitest'
import { generarCaminosRPM } from './generarCaminosRPM.js'
import {
  construirEjercicioResueltoRPM,
  CODIGOS_ENTRADA_INVALIDA,
  CODIGOS_RAZON_INCOMPLETO,
  CODIGOS_RAZON_NO_PUBLICABLE,
} from './construirEjercicioResueltoRPM.js'

// --- Datos reales propios de este archivo (mismos valores legales públicos de 2026 que el
// resto del dominio ya usa, nunca importados de otro archivo de test) ---
const FECHA_CALCULO = '2026-01-01'
const SMLV_2026 = 1750905

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
function historiaLarga() {
  return historiaAnios(1990, 2025)
}

const CONFIRMACION_VALIDA = (edad) => ({
  codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
  confirmado: true,
  textoAceptado: 'Entiendo y quiero explorar este escenario.',
  edadObjetivoConfirmada: edad,
})

// --- REAL: perfil ordinario, sin piso, un único camino base que ya cumple el objetivo ---
function resultadoRealBasico() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaLarga(),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 1600000,
    fecha: FECHA_CALCULO,
  })
}

// --- REAL: perfil bajo el piso legal (mismo mecanismo que los fixtures B/D/R de
// generarCaminosRPM.test.js, reconstruido aquí con datos propios) ---
function resultadoRealBajoElPiso(overrides = {}) {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaLarga(),
    fechaNacimiento: '1976-01-01',
    edadJubilacionDeseada: 62,
    ibcAplicableSimulacion: SMLV_2026,
    objetivoValorMensual: SMLV_2026,
    fecha: FECHA_CALCULO,
    ...overrides,
  })
}

// --- REAL: perfil con camino alternativo (base no alcanza el objetivo) ---
function resultadoRealConAlternativo() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaLarga(),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 5000000,
    fecha: FECHA_CALCULO,
  })
}

// --- REAL: IBC alto, muy por encima del piso — el resultado matemático crudo ya supera 1
// SMLMV, así que ni piso ni techo aplican (mismo criterio que el fixture D de
// generarCaminosRPM.test.js, reconstruido aquí con datos propios) ---
function resultadoRealSinPiso() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaLarga(),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 8000000,
    objetivoValorMensual: 3000000,
    fecha: FECHA_CALCULO,
  })
}

// --- REAL: IBC actual ya en el tope legal → alternativo descartado (YA_EN_TOPE_LEGAL) ---
function resultadoRealConDescartado() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaLarga(),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 25 * SMLV_2026,
    objetivoValorMensual: 900000000,
    fecha: FECHA_CALCULO,
  })
}

// --- REAL: NO_CUMPLE_EDAD → escenarios:[], disponibilidadCuantia:null ---
function resultadoRealSinEscenarios() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaLarga(),
    fechaNacimiento: '2010-01-01',
    edadJubilacionDeseada: 30,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 1600000,
    fecha: FECHA_CALCULO,
  })
}

describe('construirEjercicioResueltoRPM — ENTRADA_INVALIDA (todos SINTÉTICOS — validación de contrato, no de dominio)', () => {
  it('código desconocido en confirmacionesSupuestos', () => {
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: resultadoRealBasico(),
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [{ codigo: 'CODIGO_INVENTADO', confirmado: true, textoAceptado: 'x', edadObjetivoConfirmada: 64 }],
      politicasInvolucradas: [],
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores[0]).toMatchObject({ codigo: CODIGOS_ENTRADA_INVALIDA.CODIGO_SUPUESTO_DESCONOCIDO, campo: 'confirmacionesSupuestos[0].codigo' })
  })

  it('resultadoGenerarCaminos ausente', () => {
    const r = construirEjercicioResueltoRPM({ edadJubilacionDeseada: 64, confirmacionesSupuestos: [], politicasInvolucradas: [] })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO }))
  })

  it('resultadoGenerarCaminos.escenarios no es un arreglo', () => {
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: { escenarios: 'no-es-arreglo' },
      edadJubilacionDeseada: 64,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO }))
  })

  it('edadJubilacionDeseada no numérica', () => {
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: resultadoRealBasico(), edadJubilacionDeseada: 'sesenta y cuatro' })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.EDAD_JUBILACION_DESEADA_INVALIDA }))
  })

  it('confirmacionesSupuestos no es un arreglo', () => {
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: resultadoRealBasico(),
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: 'no-es-arreglo',
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.CONFIRMACIONES_SUPUESTOS_NO_ES_ARREGLO }))
  })

  it('politicasInvolucradas no es un arreglo', () => {
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: resultadoRealBasico(),
      edadJubilacionDeseada: 64,
      politicasInvolucradas: 'no-es-arreglo',
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO }))
  })

  it('escenario con estado desconocido', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: { ...real, escenarios: [{ ...real.escenarios[0], estado: 'pendiente' }] },
      edadJubilacionDeseada: 64,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.ESCENARIO_CON_ESTADO_DESCONOCIDO }))
  })

  it('camino viable sin los campos obligatorios de sus 7 pasos (objeto mínimo, ni siquiera ibl ni trazabilidadVentana)', () => {
    const escenarioIncompleto = {
      id: 'base',
      tipo: 'base',
      estado: 'viable',
      decision: 'x',
      entradas: { escenarioIbcFuturo: { valorDeclarado: 100, valorAplicado: 100, origen: 'x', topeAplicado: 100 } },
      resultado: { valor: 100 },
      valorMatematico: 100,
      ajusteLegal: {
        estado: 'evaluado',
        tasaInicial: 1,
        bloquesAdicionales: 0,
        incrementoPorSemanas: 0,
        tasaFinalAplicada: 1,
        limiteOchentaPorciento: { aplicado: false, tasaMaxima: 80 },
        pisoEvaluado: { fundamento: { normaId: 'a', fuente: 'b', articulo: 'c' } },
        techoEvaluado: { fundamento: { normaId: 'a', fuente: 'b', articulo: 'c' } },
        fechaBaseMonetaria: '2026-01-01',
      },
      semanasCotizadas: { total: 1000 },
      // ibl y trazabilidadVentana OMITIDOS A PROPÓSITO
      distanciaObjetivo: { valorObjetivo: 100, delta: 0, cumple: true },
      esfuerzo: {},
      limitaciones: [],
      razonDescartado: null,
    }
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: { escenarios: [escenarioIncompleto] },
      edadJubilacionDeseada: 64,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    const error = r.errores.find((e) => e.codigo === CODIGOS_ENTRADA_INVALIDA.CAMINO_VIABLE_INCOMPLETO)
    expect(error).toBeDefined()
    expect(error.mensaje).toContain('ibl.aplicable')
    expect(error.mensaje).toContain('trazabilidadVentana')
  })

  it('camino descartado sin razonDescartado', () => {
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: {
        escenarios: [{ id: 'x', tipo: 'alternativo', estado: 'descartado', decision: 'x', razonDescartado: null }],
      },
      edadJubilacionDeseada: 64,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.CAMINO_DESCARTADO_SIN_RAZON }))
  })

  it('fechas base monetarias inconsistentes entre dos caminos viables (real, con el segundo mutado deliberadamente — SINTÉTICO en ese punto)', () => {
    const real = resultadoRealConAlternativo()
    const segundoConFechaDistinta = {
      ...real.escenarios[1],
      ajusteLegal: { ...real.escenarios[1].ajusteLegal, fechaBaseMonetaria: '2025-01-01' },
    }
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: { ...real, escenarios: [real.escenarios[0], segundoConFechaDistinta] },
      edadJubilacionDeseada: 64,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.FECHAS_BASE_MONETARIA_INCONSISTENTES }))
  })
})

describe('construirEjercicioResueltoRPM — I1: identidad de fuente matemático/final (REAL)', () => {
  it('sin piso (D): RESULTADO_MATEMATICO y RESULTADO_FINAL provienen cada uno de su propio campo, iguales aquí porque no aplica el piso', () => {
    const real = resultadoRealSinPiso()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    const base = r.caminos.find((c) => c.id === 'base')
    const pasoMatematico = base.pasos.find((p) => p.codigo === 'RESULTADO_MATEMATICO')
    const pasoFinal = base.pasos.find((p) => p.codigo === 'RESULTADO_FINAL')
    expect(pasoMatematico.datos.valor).toBe(real.escenarios[0].valorMatematico)
    expect(pasoFinal.datos.valor).toBe(real.escenarios[0].resultado.valor)
    expect(pasoMatematico.datos.valor).toBe(pasoFinal.datos.valor)
  })

  it('con piso (B): RESULTADO_MATEMATICO y RESULTADO_FINAL difieren, cada uno sigue viniendo de su propia fuente, nunca uno sustituye al otro', () => {
    const real = resultadoRealBajoElPiso({ objetivoValorMensual: SMLV_2026 })
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 62 })
    const base = r.caminos[0]
    const pasoMatematico = base.pasos.find((p) => p.codigo === 'RESULTADO_MATEMATICO')
    const pasoFinal = base.pasos.find((p) => p.codigo === 'RESULTADO_FINAL')
    expect(pasoMatematico.datos.valor).toBe(real.escenarios[0].valorMatematico)
    expect(pasoFinal.datos.valor).toBe(SMLV_2026)
    expect(pasoMatematico.datos.valor).toBeLessThan(pasoFinal.datos.valor)
  })
})

describe('construirEjercicioResueltoRPM — I2: nunca produce una confirmación/política no recibida (REAL + SINTÉTICO)', () => {
  it('código desconocido en confirmacionesSupuestos siempre produce ENTRADA_INVALIDA (ya cubierto arriba) — aquí se confirma que un código VÁLIDO sí se usa, nunca se ignora', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(99)], // edad distinta a propósito
    })
    expect(r.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(r.razonesNoPublicable).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_EDAD_NO_COINCIDE }))
  })
})

describe('construirEjercicioResueltoRPM — I3: completo nunca es true con una política NO_RESUELTA aplicable (REAL + política SINTÉTICA)', () => {
  it('política NO_RESUELTA aplicable → completo:false, publicable:false', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      politicasInvolucradas: [{ nombre: 'PoliticaAnclaIncrementoMujer', estado: 'NO_RESUELTA', aplicaAEsteEjercicio: true, mensaje: 'sintético' }],
    })
    expect(r.completo).toBe(false)
    expect(r.publicable).toBe(false)
    expect(r.razonesIncompleto).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_INCOMPLETO.POLITICA_JURIDICA_NO_RESUELTA }))
  })

  it('política RESUELTA aplicable → no aporta ninguna razón de incompletitud', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      politicasInvolucradas: [{ nombre: 'PoliticaAnclaIncrementoMujer', estado: 'RESUELTA', aplicaAEsteEjercicio: true, mensaje: 'sintético' }],
    })
    expect(r.razonesIncompleto.find((x) => x.codigo === CODIGOS_RAZON_INCOMPLETO.POLITICA_JURIDICA_NO_RESUELTA)).toBeUndefined()
  })
})

describe('construirEjercicioResueltoRPM — I4: la elegibilidad nunca se presenta como derecho reconocido (REAL)', () => {
  it('elegibilidad viaja por identidad de referencia — F nunca la reescribe ni le agrega texto', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    expect(r.elegibilidad).toBe(real.elegibilidad) // misma referencia, no una copia reescrita
  })
})

describe('construirEjercicioResueltoRPM — I5: completo y publicable son gates distintos (REAL)', () => {
  it('confirmación válida + edad coincidente + completo:true → publicable:true', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    expect(r.completo).toBe(true)
    expect(r.publicable).toBe(true)
    expect(r.razonesNoPublicable).toEqual([])
  })

  it('sin ninguna confirmación → CONFIRMACION_AUSENTE, nunca ENTRADA_INVALIDA', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64, confirmacionesSupuestos: [] })
    expect(r.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(r.publicable).toBe(false)
    expect(r.razonesNoPublicable).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_AUSENTE }))
  })

  it('textoAceptado vacío/solo espacios → confirmación ausente para publicable, nunca ENTRADA_INVALIDA', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [{ codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES', confirmado: true, textoAceptado: '   ', edadObjetivoConfirmada: 64 }],
    })
    expect(r.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(r.publicable).toBe(false)
    expect(r.razonesNoPublicable).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_AUSENTE }))
  })

  it('edad confirmada distinta de edadJubilacionDeseada → CONFIRMACION_EDAD_NO_COINCIDE', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(65)],
    })
    expect(r.publicable).toBe(false)
    expect(r.razonesNoPublicable).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_EDAD_NO_COINCIDE }))
  })

  it('completo:false nunca permite publicable:true, incluso con confirmación perfectamente válida — y razonesNoPublicable nunca oculta EJERCICIO_NO_COMPLETO', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: real,
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
      politicasInvolucradas: [{ nombre: 'x', estado: 'NO_RESUELTA', aplicaAEsteEjercicio: true, mensaje: 'sintético' }],
    })
    expect(r.completo).toBe(false)
    expect(r.publicable).toBe(false)
    expect(r.razonesNoPublicable).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_NO_PUBLICABLE.EJERCICIO_NO_COMPLETO }))
    // la confirmación SÍ era válida — CONFIRMACION_AUSENTE no debe aparecer, nunca se oculta
    // información pero tampoco se inventa una causa que no ocurrió.
    expect(r.razonesNoPublicable.find((x) => x.codigo === CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_AUSENTE)).toBeUndefined()
  })
})

describe('construirEjercicioResueltoRPM — I6: nunca reordena los caminos (REAL, 2 y 3 escenarios)', () => {
  it('mismo orden e IDs que resultadoGenerarCaminos.escenarios, con alternativo', () => {
    const real = resultadoRealConAlternativo()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    expect(r.caminos.map((c) => c.id)).toEqual(real.escenarios.map((e) => e.id))
  })

  it('mismo orden con un camino descartado incluido', () => {
    const real = resultadoRealConDescartado()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    expect(r.caminos.map((c) => c.id)).toEqual(real.escenarios.map((e) => e.id))
  })
})

describe('construirEjercicioResueltoRPM — I7: un camino descartado nunca tiene pasos ni cifra (REAL)', () => {
  it('descartado por YA_EN_TOPE_LEGAL: pasos:[], distanciaObjetivo/esfuerzo:null, razonDescartado presente', () => {
    const real = resultadoRealConDescartado()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    const descartado = r.caminos.find((c) => c.estado === 'descartado')
    expect(descartado).toBeDefined()
    expect(descartado.pasos).toEqual([])
    expect(descartado.distanciaObjetivo).toBeNull()
    expect(descartado.esfuerzo).toBeNull()
    expect(descartado.razonDescartado).not.toBeNull()
  })
})

describe('construirEjercicioResueltoRPM — I8: trazabilidad normativa viaja con cada campo incluido (REAL)', () => {
  it('elegibilidad conserva valueId/normaId de A; AJUSTE_LEGAL conserva normaId/fuente/articulo de D', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    expect(r.elegibilidad.edadMinimaAplicable.valueId).toBe('elegibilidadProyectadaRPM.edadMinimaAplicable')
    expect(r.elegibilidad.edadMinimaAplicable.normaId).toBeTruthy()
    const pasoAjusteLegal = r.caminos[0].pasos.find((p) => p.codigo === 'AJUSTE_LEGAL')
    expect(pasoAjusteLegal.datos.pisoEvaluado.fundamento.normaId).toBeTruthy()
    expect(pasoAjusteLegal.datos.techoEvaluado.fundamento.normaId).toBeTruthy()
  })
})

describe('construirEjercicioResueltoRPM — casos de contrato adicionales (REAL)', () => {
  it('sin escenarios (NO_CUMPLE_EDAD): EJERCICIO_CONSTRUIDO, caminos:[], completo:false, publicable:false, conserva elegibilidad/disponibilidadCuantia', () => {
    const real = resultadoRealSinEscenarios()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 30 })
    expect(r.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(r.caminos).toEqual([])
    expect(r.completo).toBe(false)
    expect(r.publicable).toBe(false)
    expect(r.razonesIncompleto).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_INCOMPLETO.SIN_CAMINOS_AUDITABLES }))
    expect(r.elegibilidad).toBe(real.elegibilidad)
    expect(r.disponibilidadCuantia).toBeNull()
    expect(r.fechaBaseMonetaria).toBeNull()
  })

  it('disponibilidadCuantia insuficiente aporta su propia razón de incompletitud, independiente de SIN_CAMINOS_AUDITABLES', () => {
    const real = resultadoRealSinEscenarios()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 30 })
    expect(r.razonesIncompleto).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_INCOMPLETO.DISPONIBILIDAD_CUANTIA_INSUFICIENTE }))
    expect(r.razonesIncompleto).toContainEqual(expect.objectContaining({ codigo: CODIGOS_RAZON_INCOMPLETO.FECHA_BASE_MONETARIA_NO_DISPONIBLE }))
  })

  it('DATOS_UTILIZADOS reexpone únicamente valorDeclarado/valorAplicado/origen/topeAplicado/semanasCotizadas — nunca una razón de recorte inventada', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    const pasoDatos = r.caminos[0].pasos.find((p) => p.codigo === 'DATOS_UTILIZADOS')
    expect(Object.keys(pasoDatos.datos).sort()).toEqual(['origen', 'semanasCotizadas', 'topeAplicado', 'valorAplicado', 'valorDeclarado'])
    expect(pasoDatos.datos).not.toHaveProperty('razonRecorte')
    expect(pasoDatos.datos).not.toHaveProperty('recortadoPorTope')
  })

  it('IBL.valorAplicable es idéntico (===) a escenario.ibl.aplicable — solo renombrado, nunca recalculado', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    const pasoIbl = r.caminos[0].pasos.find((p) => p.codigo === 'IBL')
    expect(pasoIbl.datos.valorAplicable).toBe(real.escenarios[0].ibl.aplicable)
  })

  it('supuestosEscenario expone CONTINUIDAD_SIN_INTERRUPCIONES con confirmacion:null cuando no se proporcionó ninguna', () => {
    const real = resultadoRealBasico()
    const r = construirEjercicioResueltoRPM({ resultadoGenerarCaminos: real, edadJubilacionDeseada: 64 })
    expect(r.supuestosEscenario).toEqual([
      { codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES', origen: 'supuesto_de_escenario', requiereConfirmacion: true, confirmacion: null },
    ])
  })
})
