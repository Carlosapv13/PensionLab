// E6.2 — pruebas de construirModeloVisualEjercicioRPM.js (adaptador visual puro y dormido,
// PL-260 §9.2). Convención de este archivo (mismo criterio ya usado por
// construirEjercicioResueltoRPM.test.js/evaluarPoliticasEjercicioRPM.test.js, nunca
// importado de otro .test.js): cada describe/it indica explícitamente si construye su
// entrada con una llamada REAL a generarCaminosRPM()/evaluarPoliticasEjercicioRPM()/
// construirEjercicioResueltoRPM() (Contrato F cerrado, aprobado) o con un objeto SINTÉTICO
// (para ejercitar ramas defensivas del adaptador que un Contrato F válido no puede producir
// hoy — pasos incompletos, código de paso desconocido, o más de una política involucrada,
// cosa que el motor actual, con una sola política evaluable en E5.4, todavía no produce).
// Ningún test depende del orden de otro. Cero consumidores reales de este módulo — ver
// verificación de importaciones en el informe de este checkpoint.

import { describe, it, expect } from 'vitest'
import { generarCaminosRPM } from '../domain/pensionEngine/generarCaminosRPM.js'
import { evaluarPoliticasEjercicioRPM } from '../domain/pensionEngine/evaluarPoliticasEjercicioRPM.js'
import { construirEjercicioResueltoRPM } from '../domain/pensionEngine/construirEjercicioResueltoRPM.js'
import { construirModeloVisualEjercicioRPM, CODIGOS_ENTRADA_INVALIDA } from './construirModeloVisualEjercicioRPM.js'

// --- Datos reales propios de este archivo (mismos valores legales públicos de 2026 que
// construirEjercicioResueltoRPM.test.js/evaluarPoliticasEjercicioRPM.test.js ya usan, nunca
// importados de otro archivo de test) ---
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

const CONFIRMACION_VALIDA = (edad) => ({
  codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
  confirmado: true,
  textoAceptado: 'Entiendo y quiero explorar este escenario.',
  edadObjetivoConfirmada: edad,
})

// --- REAL: perfil ordinario, Hombre, un único camino base que ya cumple el objetivo — mismo
// fixture que construirEjercicioResueltoRPM.test.js#resultadoRealBasico, reconstruido aquí
// con datos propios de este archivo. Sin política aplicable (Hombre). ---
function resultadoRealBasico() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaAnios(1990, 2025),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 2000000,
    objetivoValorMensual: 1600000,
    fecha: FECHA_CALCULO,
  })
}

// --- REAL: IBC actual ya en el tope legal → alternativo descartado (YA_EN_TOPE_LEGAL) —
// mismo fixture que construirEjercicioResueltoRPM.test.js#resultadoRealConDescartado. ---
function resultadoRealConDescartado() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Hombre',
    historiaCotizacion: historiaAnios(1990, 2025),
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 64,
    ibcAplicableSimulacion: 25 * SMLV_2026,
    objetivoValorMensual: 900000000,
    fecha: FECHA_CALCULO,
  })
}

// --- REAL: mujer en el rango divergente de PoliticaAnclaIncrementoMujer — mismo fixture que
// evaluarPoliticasEjercicioRPM.test.js#resultadoRealMujerRangoDivergente. Produce una
// política NO_RESUELTA/aplicable real, sin sintetizar nada. ---
function resultadoRealMujerRangoDivergente() {
  return generarCaminosRPM({
    regimenActual: 'RPM',
    sexo: 'Mujer',
    historiaCotizacion: historiaAnios(1990, 2025),
    semanasReferenciaDeclaradas: { cantidad: 1039, certeza: 'conocido' },
    fechaNacimiento: '1974-01-01',
    edadJubilacionDeseada: 57,
    ibcAplicableSimulacion: SMLV_2026,
    objetivoValorMensual: SMLV_2026,
    fecha: FECHA_CALCULO,
  })
}

// Orquesta los 3 pasos previos al adaptador (E→políticas→F, PL-260 §9.3, pasos 1-3) con
// datos reales — nunca construye el modelo visual, solo su entrada.
function construirEjercicioYPoliticas({ resultado, sexo, edadJubilacionDeseada, confirmacionesSupuestos = [] }) {
  const { politicasInvolucradas } = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: resultado, sexo })
  const ejercicioResuelto = construirEjercicioResueltoRPM({
    resultadoGenerarCaminos: resultado,
    edadJubilacionDeseada,
    confirmacionesSupuestos,
    politicasInvolucradas,
  })
  return { ejercicioResuelto, politicasInvolucradas }
}

describe('construirModeloVisualEjercicioRPM — 1/2. estado global literal de F (REAL)', () => {
  it('1. ejercicio completo y publicable: estadoEjercicio refleja exactamente completo:true/publicable:true de F', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    expect(ejercicioResuelto.completo).toBe(true)
    expect(ejercicioResuelto.publicable).toBe(true)

    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.estado).toBe('MODELO_VISUAL_CONSTRUIDO')
    expect(modelo.estadoEjercicio).toEqual({
      completo: true,
      publicable: true,
      razonesIncompleto: ejercicioResuelto.razonesIncompleto,
      razonesNoPublicable: ejercicioResuelto.razonesNoPublicable,
    })
    expect(modelo.estadoEjercicio.razonesIncompleto).toBe(ejercicioResuelto.razonesIncompleto)
  })

  it('2. completo pero no publicable (sin confirmación): estadoEjercicio refleja exactamente completo:true/publicable:false', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [],
    })
    expect(ejercicioResuelto.completo).toBe(true)
    expect(ejercicioResuelto.publicable).toBe(false)

    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.estadoEjercicio.completo).toBe(true)
    expect(modelo.estadoEjercicio.publicable).toBe(false)
    expect(modelo.estadoEjercicio.razonesNoPublicable).toBe(ejercicioResuelto.razonesNoPublicable)
  })

  it('3. incompleto y no publicable por política jurídica NO_RESUELTA real (mujer en rango divergente): estadoEjercicio y politicasJuridicas lo reflejan', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealMujerRangoDivergente(),
      sexo: 'Mujer',
      edadJubilacionDeseada: 57,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(57)],
    })
    expect(ejercicioResuelto.completo).toBe(false)
    expect(ejercicioResuelto.publicable).toBe(false)
    expect(politicasInvolucradas).toHaveLength(1)
    expect(politicasInvolucradas[0].estado).toBe('NO_RESUELTA')

    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.estadoEjercicio.completo).toBe(false)
    expect(modelo.estadoEjercicio.publicable).toBe(false)
    expect(modelo.politicasJuridicas).toEqual(politicasInvolucradas)
    expect(modelo.politicasJuridicas[0]).toBe(politicasInvolucradas[0])
  })
})

describe('construirModeloVisualEjercicioRPM — 4/5/6. confirmación de continuidad tomada únicamente de supuestosEscenario, sin inferencias (REAL)', () => {
  it('4. confirmación válida: confirmacionContinuidad.confirmacion refleja confirmado:true, mismo textoAceptado/edad', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.confirmacionContinuidad).toBe(ejercicioResuelto.supuestosEscenario[0])
    expect(modelo.confirmacionContinuidad.confirmacion).toEqual({
      confirmado: true,
      textoAceptado: 'Entiendo y quiero explorar este escenario.',
      edadObjetivoConfirmada: 64,
    })
  })

  it('5. confirmación ausente: confirmacionContinuidad.confirmacion es null, nunca fabricado', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [],
    })
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.confirmacionContinuidad.confirmacion).toBeNull()
    expect(modelo.confirmacionContinuidad.requiereConfirmacion).toBe(true)
  })

  it('6. edad confirmada distinta: la confirmación se conserva literal (incluida la edad que no coincide), publicable:false', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(99)],
    })
    expect(ejercicioResuelto.publicable).toBe(false)
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.confirmacionContinuidad.confirmacion.edadObjetivoConfirmada).toBe(99)
    expect(modelo.estadoEjercicio.publicable).toBe(false)
  })
})

describe('construirModeloVisualEjercicioRPM — 7/11/12. camino viable: pasos indexados y resumen desde los pasos exactos (REAL)', () => {
  it('7. los siete pasos quedan accesibles por código y conservan el orden original de Contrato F', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    const caminoF = ejercicioResuelto.caminos[0]
    const pasosVisual = modelo.caminos[0].pasos

    expect(Object.keys(pasosVisual)).toEqual([
      'DATOS_UTILIZADOS',
      'IBL',
      'TASA_REEMPLAZO',
      'RESULTADO_MATEMATICO',
      'AJUSTE_LEGAL',
      'RESULTADO_FINAL',
      'COMPARACION_OBJETIVO',
    ])
    expect(Object.keys(pasosVisual)).toEqual(caminoF.pasos.map((p) => p.codigo))
    for (const paso of caminoF.pasos) {
      expect(pasosVisual[paso.codigo]).toBe(paso.datos)
    }
  })

  it('auditoría: el orden visual reproduce el orden RECIBIDO, nunca un orden canónico reconstruido (SINTÉTICO — pasos en orden deliberadamente distinto al de Contrato F)', () => {
    // Con datos reales, el orden de F siempre coincide con CODIGOS_PASO_CONOCIDOS (canónico) —
    // eso por sí solo no distingue "conserva el orden recibido" de "siempre reordena al
    // canónico, que aquí coincide por casualidad". Se invierte el arreglo de pasos real
    // (mismos 7 pasos, mismos datos, orden deliberadamente NO canónico) para falsear esa
    // hipótesis: si el adaptador reordenara por código (p.ej. iterando
    // CODIGOS_PASO_CONOCIDOS en vez del arreglo recibido), esta prueba fallaría.
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const pasosInvertidos = [...ejercicioResuelto.caminos[0].pasos].reverse()
    const caminoConOrdenInvertido = { ...ejercicioResuelto.caminos[0], pasos: pasosInvertidos }
    const ejercicioConOrdenInvertido = { ...ejercicioResuelto, caminos: [caminoConOrdenInvertido] }

    const modelo = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: ejercicioConOrdenInvertido,
      politicasInvolucradas,
    })

    expect(Object.keys(modelo.caminos[0].pasos)).toEqual(pasosInvertidos.map((p) => p.codigo))
    expect(Object.keys(modelo.caminos[0].pasos)).not.toEqual([...pasosInvertidos.map((p) => p.codigo)].sort())
  })

  it('11. cifras del resumen provienen exactamente de RESULTADO_FINAL/COMPARACION_OBJETIVO; esfuerzo de caminos[].esfuerzo, nunca de un paso', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    const caminoF = ejercicioResuelto.caminos[0]
    const pasoFinal = caminoF.pasos.find((p) => p.codigo === 'RESULTADO_FINAL')
    const pasoComparacion = caminoF.pasos.find((p) => p.codigo === 'COMPARACION_OBJETIVO')
    const resumen = modelo.caminos[0].resumen

    expect(resumen.cifraFinal).toBe(pasoFinal.datos.valor)
    expect(resumen.cumpleObjetivo).toBe(pasoComparacion.datos.cumple)
    expect(resumen.delta).toBe(pasoComparacion.datos.delta)
    expect(resumen.valorObjetivo).toBe(pasoComparacion.datos.valorObjetivo)
    expect(resumen.esfuerzo).toBe(caminoF.esfuerzo)
  })

  it('12. ninguna cifra se recalcula ni se formatea: valores numéricos crudos, misma referencia para esfuerzo', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    const resumen = modelo.caminos[0].resumen

    expect(typeof resumen.cifraFinal).toBe('number')
    expect(Number.isFinite(resumen.cifraFinal)).toBe(true)
    expect(resumen.esfuerzo).toBe(ejercicioResuelto.caminos[0].esfuerzo) // misma referencia — nunca un objeto nuevo
  })
})

describe('construirModeloVisualEjercicioRPM — 8/9. caminos descartados y orden conservado (REAL)', () => {
  it('8. camino descartado: resumen y pasos null, razonDescartado literal — nunca un acordeón vacío ni una cifra inventada', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealConDescartado(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const descartadoF = ejercicioResuelto.caminos.find((c) => c.estado === 'descartado')
    expect(descartadoF).toBeDefined()

    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    const descartadoVisual = modelo.caminos.find((c) => c.estado === 'descartado')
    expect(descartadoVisual.resumen).toBeNull()
    expect(descartadoVisual.pasos).toBeNull()
    expect(descartadoVisual.razonDescartado).toBe(descartadoF.razonDescartado)
  })

  it('9. varios caminos (viable + descartado) conservan exactamente el orden de ejercicioResuelto.caminos', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealConDescartado(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    expect(ejercicioResuelto.caminos.length).toBeGreaterThan(1)

    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(modelo.caminos.map((c) => c.id)).toEqual(ejercicioResuelto.caminos.map((c) => c.id))
  })
})

describe('construirModeloVisualEjercicioRPM — 10. politicasJuridicas conservadas literalmente y en orden (REAL ejercicioResuelto + SINTÉTICO politicasInvolucradas)', () => {
  it('con más de una política involucrada (el motor actual, E5.4, solo evalúa una — este arreglo es SINTÉTICO para probar que el adaptador soporta cualquier longitud/orden tal cual los reciba)', () => {
    const { ejercicioResuelto } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const politicasSinteticas = [
      { nombre: 'PoliticaB', estado: 'NO_RESUELTA', aplicaAEsteEjercicio: true, mensaje: 'segunda' },
      { nombre: 'PoliticaA', estado: 'RESUELTA', aplicaAEsteEjercicio: false, mensaje: 'primera' },
    ]
    const modelo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas: politicasSinteticas })
    expect(modelo.politicasJuridicas).toEqual(politicasSinteticas)
    expect(modelo.politicasJuridicas[0]).toBe(politicasSinteticas[0])
    expect(modelo.politicasJuridicas[1]).toBe(politicasSinteticas[1])
    expect(modelo.politicasJuridicas).not.toBe(politicasSinteticas) // arreglo nuevo, nunca la misma referencia mutable
  })
})

describe('construirModeloVisualEjercicioRPM — 13. entrada inválida (SINTÉTICO — validación de contrato, no de dominio)', () => {
  it('ejercicioResuelto ausente', () => {
    const r = construirModeloVisualEjercicioRPM({ politicasInvolucradas: [] })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.EJERCICIO_RESUELTO_INVALIDO }))
  })

  it('ejercicioResuelto no es un objeto', () => {
    const r = construirModeloVisualEjercicioRPM({ ejercicioResuelto: 'no-es-objeto', politicasInvolucradas: [] })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.EJERCICIO_RESUELTO_INVALIDO }))
  })

  it('ejercicioResuelto con estado ENTRADA_INVALIDA (de F) se rechaza igual, nunca se repara', () => {
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { estado: 'ENTRADA_INVALIDA', errores: [] },
      politicasInvolucradas: [],
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.EJERCICIO_RESUELTO_INVALIDO }))
  })

  it('ejercicioResuelto.caminos no es un arreglo', () => {
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { estado: 'EJERCICIO_CONSTRUIDO', caminos: 'no-es-arreglo' },
      politicasInvolucradas: [],
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.CAMINOS_NO_ES_ARREGLO }))
  })

  it('politicasInvolucradas ausente — nunca se asume "sin políticas" por defecto', () => {
    const r = construirModeloVisualEjercicioRPM({ ejercicioResuelto: { estado: 'EJERCICIO_CONSTRUIDO', caminos: [] } })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO }))
  })

  it('politicasInvolucradas no es un arreglo (null)', () => {
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { estado: 'EJERCICIO_CONSTRUIDO', caminos: [] },
      politicasInvolucradas: null,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO }))
  })

  it('camino con estado desconocido', () => {
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { estado: 'EJERCICIO_CONSTRUIDO', caminos: [{ id: 'x', estado: 'pendiente' }] },
      politicasInvolucradas: [],
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.CAMINO_CON_ESTADO_DESCONOCIDO }))
  })

  it('ambos campos ausentes a la vez: ambos errores presentes, ninguno oculta al otro', () => {
    const r = construirModeloVisualEjercicioRPM()
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores.map((e) => e.codigo).sort()).toEqual(
      [CODIGOS_ENTRADA_INVALIDA.EJERCICIO_RESUELTO_INVALIDO, CODIGOS_ENTRADA_INVALIDA.POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO].sort()
    )
  })

  it('llamada sin ningún argumento no lanza', () => {
    expect(() => construirModeloVisualEjercicioRPM()).not.toThrow()
    expect(construirModeloVisualEjercicioRPM().estado).toBe('ENTRADA_INVALIDA')
  })
})

describe('construirModeloVisualEjercicioRPM — 14/15. estructura de pasos defensiva (REAL ejercicioResuelto, mutado deliberadamente en copia — SINTÉTICO en ese punto)', () => {
  it('14. paso obligatorio ausente en un camino viable: CAMINO_VIABLE_SIN_PASOS_COMPLETOS, lista el código faltante', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const caminoSinIBL = {
      ...ejercicioResuelto.caminos[0],
      pasos: ejercicioResuelto.caminos[0].pasos.filter((p) => p.codigo !== 'IBL'),
    }
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { ...ejercicioResuelto, caminos: [caminoSinIBL] },
      politicasInvolucradas,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    const error = r.errores.find((e) => e.codigo === CODIGOS_ENTRADA_INVALIDA.CAMINO_VIABLE_SIN_PASOS_COMPLETOS)
    expect(error).toBeDefined()
    expect(error.mensaje).toContain('IBL')
  })

  it('15. código de paso adicional desconocido: PASO_CON_CODIGO_DESCONOCIDO, comportamiento fail-closed explícito — nunca se descarta en silencio', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const caminoConPasoExtra = {
      ...ejercicioResuelto.caminos[0],
      pasos: [...ejercicioResuelto.caminos[0].pasos, { codigo: 'PASO_INVENTADO', datos: {} }],
    }
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { ...ejercicioResuelto, caminos: [caminoConPasoExtra] },
      politicasInvolucradas,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores).toContainEqual(
      expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.PASO_CON_CODIGO_DESCONOCIDO, campo: 'caminos[0].pasos[7].codigo' })
    )
  })

  it('auditoría: dos pasos con el mismo código (uno duplicado, los 7 conocidos "presentes") — antes de la corrección esto pasaba silenciosamente y sobrescribía el primero al indexar; ahora ENTRADA_INVALIDA', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const pasoIbl = ejercicioResuelto.caminos[0].pasos.find((p) => p.codigo === 'IBL')
    // Agrega una SEGUNDA copia del paso IBL, conservando los 7 originales intactos (8 pasos
    // en total) — los 7 códigos conocidos siguen "presentes" según `.includes()` (IBL aparece,
    // solo que dos veces), así que la comprobación de "faltantes" NO detectaría este caso por
    // sí sola: es exactamente el escenario donde la sobrescritura silenciosa podía ocurrir.
    const pasosConDuplicado = [...ejercicioResuelto.caminos[0].pasos, pasoIbl]
    const caminoConDuplicado = { ...ejercicioResuelto.caminos[0], pasos: pasosConDuplicado }

    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { ...ejercicioResuelto, caminos: [caminoConDuplicado] },
      politicasInvolucradas,
    })

    expect(r.estado).toBe('ENTRADA_INVALIDA')
    const error = r.errores.find((e) => e.codigo === CODIGOS_ENTRADA_INVALIDA.PASO_CON_CODIGO_DUPLICADO)
    expect(error).toBeDefined()
    expect(error.mensaje).toContain('IBL')
    // Nunca coexiste con CAMINO_VIABLE_SIN_PASOS_COMPLETOS en este caso exacto: los 7 códigos
    // conocidos están "presentes" (uno duplicado, ninguno realmente ausente) — confirma que el
    // duplicado necesita su propia detección, independiente de "faltantes".
    expect(r.errores.find((e) => e.codigo === CODIGOS_ENTRADA_INVALIDA.CAMINO_VIABLE_SIN_PASOS_COMPLETOS)).toBeUndefined()
  })

  it('auditoría: dos pasos con código desconocido repetido — se reportan tanto el código desconocido como el duplicado, ninguna causa oculta a la otra', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealBasico(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
    })
    const caminoConDosInventados = {
      ...ejercicioResuelto.caminos[0],
      pasos: [
        ...ejercicioResuelto.caminos[0].pasos,
        { codigo: 'PASO_INVENTADO', datos: {} },
        { codigo: 'PASO_INVENTADO', datos: {} },
      ],
    }
    const r = construirModeloVisualEjercicioRPM({
      ejercicioResuelto: { ...ejercicioResuelto, caminos: [caminoConDosInventados] },
      politicasInvolucradas,
    })
    expect(r.estado).toBe('ENTRADA_INVALIDA')
    expect(r.errores.filter((e) => e.codigo === CODIGOS_ENTRADA_INVALIDA.PASO_CON_CODIGO_DESCONOCIDO)).toHaveLength(2)
    expect(r.errores).toContainEqual(expect.objectContaining({ codigo: CODIGOS_ENTRADA_INVALIDA.PASO_CON_CODIGO_DUPLICADO }))
  })
})

describe('construirModeloVisualEjercicioRPM — 16/17. no mutación y determinismo (REAL)', () => {
  it('16. no muta ejercicioResuelto ni politicasInvolucradas', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealConDescartado(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    const snapshotEjercicio = JSON.parse(JSON.stringify(ejercicioResuelto))
    const snapshotPoliticas = JSON.parse(JSON.stringify(politicasInvolucradas))

    construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })

    expect(ejercicioResuelto).toEqual(snapshotEjercicio)
    expect(politicasInvolucradas).toEqual(snapshotPoliticas)
  })

  it('17. determinismo: la misma entrada produce una estructura equivalente en dos llamadas distintas', () => {
    const { ejercicioResuelto, politicasInvolucradas } = construirEjercicioYPoliticas({
      resultado: resultadoRealConDescartado(),
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    const primero = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    const segundo = construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
    expect(primero).toEqual(segundo)
    expect(primero).not.toBe(segundo) // estructuras equivalentes, nunca el mismo objeto reutilizado
  })
})
