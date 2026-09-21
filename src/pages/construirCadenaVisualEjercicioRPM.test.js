// E6.3 — pruebas de construirCadenaVisualEjercicioRPM.js (orquestador puro y dormido,
// PL-260 §9.3). Convención de este archivo (mismo criterio ya usado por
// construirModeloVisualEjercicioRPM.test.js, nunca importado de otro .test.js): cada
// describe/it indica explícitamente si construye su entrada con una llamada REAL a
// generarCaminosRPM()/evaluarPoliticasEjercicioRPM()/construirEjercicioResueltoRPM()
// (contratos cerrados y auditados) o con un SINTÉTICO identificado como tal. Las ramas
// defensivas POLITICAS/EJERCICIO se ejercitan con entradas reales pero deliberadamente
// inválidas (sexo/edad), nunca con dobles de prueba. La rama MODELO_VISUAL es
// estructuralmente inalcanzable con las tres funciones reales encadenadas (si POLITICAS y
// EJERCICIO tuvieron éxito con datos reales, la entrada que le llega a
// construirModeloVisualEjercicioRPM ya satisface por construcción todo lo que ese contrato
// exige) — se ejercita con el mecanismo de inyección de dependencias mínimo que el propio
// orquestador expone (`overridesSoloParaPruebas`), un doble opaco que nunca reimplementa la
// lógica real. Ningún test depende del orden de otro.

import { describe, it, expect } from 'vitest'
import { generarCaminosRPM } from '../domain/pensionEngine/generarCaminosRPM.js'
import { evaluarPoliticasEjercicioRPM } from '../domain/pensionEngine/evaluarPoliticasEjercicioRPM.js'
import { construirEjercicioResueltoRPM } from '../domain/pensionEngine/construirEjercicioResueltoRPM.js'
import { construirModeloVisualEjercicioRPM } from './construirModeloVisualEjercicioRPM.js'
import { construirCadenaVisualEjercicioRPM, ETAPAS_CADENA_VISUAL } from './construirCadenaVisualEjercicioRPM.js'

// --- Datos reales propios de este archivo (mismos valores legales públicos de 2026 que
// construirModeloVisualEjercicioRPM.test.js ya usa, nunca importados de otro archivo de test) ---
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
// fixture que construirModeloVisualEjercicioRPM.test.js#resultadoRealBasico. ---
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

// --- REAL: mujer en el rango divergente de PoliticaAnclaIncrementoMujer — mismo fixture que
// evaluarPoliticasEjercicioRPM.test.js#resultadoRealMujerRangoDivergente. ---
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

describe('construirCadenaVisualEjercicioRPM — 1. resultado nulo (REAL: solo la entrada, sintético en el valor mismo)', () => {
  it('resultado null devuelve null', () => {
    expect(
      construirCadenaVisualEjercicioRPM({ resultado: null, sexo: 'Hombre', edadJubilacionDeseada: 64, confirmacionesSupuestos: [] })
    ).toBeNull()
  })

  it('resultado undefined devuelve null', () => {
    expect(construirCadenaVisualEjercicioRPM({ sexo: 'Hombre', edadJubilacionDeseada: 64, confirmacionesSupuestos: [] })).toBeNull()
  })

  it('llamada sin ningún argumento no lanza y devuelve null', () => {
    expect(() => construirCadenaVisualEjercicioRPM()).not.toThrow()
    expect(construirCadenaVisualEjercicioRPM()).toBeNull()
  })
})

describe('construirCadenaVisualEjercicioRPM — 2/3/12. cadena exitosa con fixture real: reutiliza literalmente resultado, preserva cada etapa sin envolverla', () => {
  it('2. cadena exitosa: estado CADENA_VISUAL_CONSTRUIDA con las tres salidas presentes', () => {
    const resultado = resultadoRealBasico()
    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    expect(cadena.estado).toBe('CADENA_VISUAL_CONSTRUIDA')
    expect(cadena.politicasInvolucradas).toEqual([])
    expect(cadena.ejercicioResuelto.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(cadena.modeloVisual.estado).toBe('MODELO_VISUAL_CONSTRUIDO')
  })

  it('3. reutiliza literalmente `resultado` — nunca lo recalcula ni vuelve a invocar generarCaminosRPM: la cadena de referencias hasta el modelo visual llega intacta hasta el mismo objeto `resultado`', () => {
    const resultado = resultadoRealBasico()
    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [],
    })
    const caminoOriginal = resultado.escenarios.find((e) => e.estado === 'viable')
    // elegibilidad: F la conserva por referencia directa (I4, ya probado en construirEjercicioResueltoRPM.test.js)
    expect(cadena.ejercicioResuelto.elegibilidad).toBe(resultado.elegibilidad)
    // esfuerzo: cadena de referencia F → modelo visual, íntegra hasta el `resultado` original —
    // si el orquestador hubiera vuelto a invocar generarCaminosRPM, esta identidad no se
    // sostendría (sería un objeto `esfuerzo` distinto, aunque con el mismo contenido).
    expect(cadena.modeloVisual.caminos[0].resumen.esfuerzo).toBe(caminoOriginal.esfuerzo)
  })

  it('12. preserva literalmente politicasInvolucradas/ejercicioResuelto/modeloVisual — nunca los clona ni los reconstruye', () => {
    const resultado = resultadoRealMujerRangoDivergente()
    const { politicasInvolucradas: politicasDirectas } = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: resultado, sexo: 'Mujer' })
    const ejercicioDirecto = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: resultado,
      edadJubilacionDeseada: 57,
      confirmacionesSupuestos: [],
      politicasInvolucradas: politicasDirectas,
    })
    const modeloDirecto = construirModeloVisualEjercicioRPM({ ejercicioResuelto: ejercicioDirecto, politicasInvolucradas: politicasDirectas })

    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Mujer',
      edadJubilacionDeseada: 57,
      confirmacionesSupuestos: [],
    })

    // Llamadas independientes (no la misma invocación) — por eso se compara con toEqual
    // (estructura) para politicasInvolucradas/ejercicioResuelto, que F reconstruye en cada
    // llamada, y con las mismas referencias internas ya verificadas en el punto 3 arriba.
    expect(cadena.politicasInvolucradas).toEqual(politicasDirectas)
    expect(cadena.ejercicioResuelto).toEqual(ejercicioDirecto)
    expect(cadena.modeloVisual).toEqual(modeloDirecto)
  })
})

describe('construirCadenaVisualEjercicioRPM — 4/5/6. política jurídica y confirmación de continuidad, propagadas sin transformación (REAL)', () => {
  it('4. política NO_RESUELTA real (mujer en rango divergente) propagada hasta Contrato F y el modelo visual', () => {
    const resultado = resultadoRealMujerRangoDivergente()
    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Mujer',
      edadJubilacionDeseada: 57,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(57)],
    })
    expect(cadena.estado).toBe('CADENA_VISUAL_CONSTRUIDA')
    expect(cadena.politicasInvolucradas).toHaveLength(1)
    expect(cadena.politicasInvolucradas[0].estado).toBe('NO_RESUELTA')
    expect(cadena.ejercicioResuelto.completo).toBe(false)
    expect(cadena.ejercicioResuelto.publicable).toBe(false)
    expect(cadena.modeloVisual.estadoEjercicio.completo).toBe(false)
    expect(cadena.modeloVisual.politicasJuridicas).toEqual(cadena.politicasInvolucradas)
  })

  it('5. confirmacionesSupuestos:[] conserva la confirmación ausente y la no publicabilidad correspondiente', () => {
    const resultado = resultadoRealBasico()
    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [],
    })
    expect(cadena.ejercicioResuelto.completo).toBe(true)
    expect(cadena.ejercicioResuelto.publicable).toBe(false)
    expect(cadena.modeloVisual.confirmacionContinuidad.confirmacion).toBeNull()
    expect(cadena.modeloVisual.estadoEjercicio.publicable).toBe(false)
  })

  it('6. confirmación válida suministrada se propaga sin transformación (mismo texto/edad, sin reescritura)', () => {
    const resultado = resultadoRealBasico()
    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Hombre',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [CONFIRMACION_VALIDA(64)],
    })
    expect(cadena.modeloVisual.confirmacionContinuidad.confirmacion).toEqual({
      confirmado: true,
      textoAceptado: 'Entiendo y quiero explorar este escenario.',
      edadObjetivoConfirmada: 64,
    })
    expect(cadena.modeloVisual.estadoEjercicio.publicable).toBe(true)
  })
})

describe('construirCadenaVisualEjercicioRPM — 7/8/9. detención explícita por etapa (REAL: entradas adversariales legítimas, nunca dobles de las dos primeras etapas)', () => {
  it('7. detención en POLITICAS: sexo inválido produce CADENA_VISUAL_NO_CONSTRUIDA/etapa POLITICAS, con el detalle real de evaluarPoliticasEjercicioRPM', () => {
    const resultado = resultadoRealBasico()
    const detalleDirecto = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: resultado, sexo: 'Otro' })
    expect(detalleDirecto.estado).toBe('ENTRADA_INVALIDA')

    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Otro',
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [],
    })
    expect(cadena).toEqual({ estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa: ETAPAS_CADENA_VISUAL.POLITICAS, detalle: detalleDirecto })
  })

  it('al fallar POLITICAS, ni EJERCICIO ni MODELO_VISUAL se invocan (espías que siguen llamando a la función real, nunca reimplementan su lógica)', () => {
    const resultado = resultadoRealBasico()
    let ejercicioFnInvocada = false
    let modeloVisualFnInvocada = false

    const cadena = construirCadenaVisualEjercicioRPM(
      { resultado, sexo: 'Otro', edadJubilacionDeseada: 64, confirmacionesSupuestos: [] },
      {
        construirEjercicioResueltoRPM: (args) => {
          ejercicioFnInvocada = true
          return construirEjercicioResueltoRPM(args)
        },
        construirModeloVisualEjercicioRPM: (args) => {
          modeloVisualFnInvocada = true
          return construirModeloVisualEjercicioRPM(args)
        },
      }
    )

    expect(cadena.etapa).toBe(ETAPAS_CADENA_VISUAL.POLITICAS)
    expect(ejercicioFnInvocada).toBe(false)
    expect(modeloVisualFnInvocada).toBe(false)
  })

  it('8. detención en EJERCICIO: edadJubilacionDeseada no numérica produce CADENA_VISUAL_NO_CONSTRUIDA/etapa EJERCICIO, con el detalle real de construirEjercicioResueltoRPM', () => {
    const resultado = resultadoRealBasico()
    const { politicasInvolucradas } = evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos: resultado, sexo: 'Hombre' })
    const detalleDirecto = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: resultado,
      edadJubilacionDeseada: 'sesenta y cuatro',
      confirmacionesSupuestos: [],
      politicasInvolucradas,
    })
    expect(detalleDirecto.estado).toBe('ENTRADA_INVALIDA')

    const cadena = construirCadenaVisualEjercicioRPM({
      resultado,
      sexo: 'Hombre',
      edadJubilacionDeseada: 'sesenta y cuatro',
      confirmacionesSupuestos: [],
    })
    expect(cadena).toEqual({ estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa: ETAPAS_CADENA_VISUAL.EJERCICIO, detalle: detalleDirecto })
  })

  it('al fallar EJERCICIO, MODELO_VISUAL nunca se invoca (espía que sigue llamando a la función real)', () => {
    const resultado = resultadoRealBasico()
    let modeloVisualFnInvocada = false

    const cadena = construirCadenaVisualEjercicioRPM(
      { resultado, sexo: 'Hombre', edadJubilacionDeseada: 'sesenta y cuatro', confirmacionesSupuestos: [] },
      {
        construirModeloVisualEjercicioRPM: (args) => {
          modeloVisualFnInvocada = true
          return construirModeloVisualEjercicioRPM(args)
        },
      }
    )

    expect(cadena.etapa).toBe(ETAPAS_CADENA_VISUAL.EJERCICIO)
    expect(modeloVisualFnInvocada).toBe(false)
  })

  it('9. detención en MODELO_VISUAL: estructuralmente inalcanzable con las tres funciones reales encadenadas (POLITICAS y EJERCICIO reales ya garantizan una entrada válida) — ejercitada con el mecanismo de inyección de dependencias mínimo del propio orquestador, un doble opaco que nunca reimplementa la lógica real', () => {
    const resultado = resultadoRealBasico()
    const detalleFalso = { estado: 'ENTRADA_INVALIDA', errores: [{ codigo: 'DOBLE_DE_PRUEBA', campo: 'x', mensaje: 'x' }] }
    const construirModeloVisualDoble = () => detalleFalso

    const cadena = construirCadenaVisualEjercicioRPM(
      { resultado, sexo: 'Hombre', edadJubilacionDeseada: 64, confirmacionesSupuestos: [] },
      { construirModeloVisualEjercicioRPM: construirModeloVisualDoble }
    )
    expect(cadena).toEqual({ estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa: ETAPAS_CADENA_VISUAL.MODELO_VISUAL, detalle: detalleFalso })
  })
})

describe('construirCadenaVisualEjercicioRPM — auditoría del mecanismo de inyección de dependencias (2026-09-20)', () => {
  it('regresión: segundo argumento null explícito no lanza — mismo comportamiento que omitirlo por completo', () => {
    const resultado = resultadoRealBasico()
    const entrada = { resultado, sexo: 'Hombre', edadJubilacionDeseada: 64, confirmacionesSupuestos: [] }

    expect(() => construirCadenaVisualEjercicioRPM(entrada, null)).not.toThrow()

    const conNullExplicito = construirCadenaVisualEjercicioRPM(entrada, null)
    const sinSegundoArgumento = construirCadenaVisualEjercicioRPM(entrada)
    expect(conNullExplicito).toEqual(sinSegundoArgumento)
    expect(conNullExplicito.estado).toBe('CADENA_VISUAL_CONSTRUIDA')
  })

  it('inyección parcial: solo sustituye la etapa indicada — las otras dos siguen usando las funciones reales, nunca quedan undefined', () => {
    const resultado = resultadoRealBasico()
    let politicasFnInvocada = false
    // Espía que SIGUE llamando a la función real (nunca reimplementa su lógica) — solo
    // registra que la sustitución fue efectivamente usada para esta etapa.
    const evaluarPoliticasEspia = (args) => {
      politicasFnInvocada = true
      return evaluarPoliticasEjercicioRPM(args)
    }

    const cadena = construirCadenaVisualEjercicioRPM(
      { resultado, sexo: 'Hombre', edadJubilacionDeseada: 64, confirmacionesSupuestos: [] },
      { evaluarPoliticasEjercicioRPM: evaluarPoliticasEspia }
    )

    expect(politicasFnInvocada).toBe(true)
    // Si la sustitución parcial hubiera dejado construirEjercicioResueltoRPM/
    // construirModeloVisualEjercicioRPM como `undefined`, invocarlas habría lanzado un
    // TypeError aquí — la cadena completa en verde prueba que ambas siguieron siendo las
    // funciones reales.
    expect(cadena.estado).toBe('CADENA_VISUAL_CONSTRUIDA')
  })
})

describe('construirCadenaVisualEjercicioRPM — 10/11. determinismo y ausencia de mutaciones (REAL)', () => {
  it('10. determinismo: la misma entrada produce una estructura equivalente en dos llamadas distintas', () => {
    const resultado = resultadoRealMujerRangoDivergente()
    const entrada = { resultado, sexo: 'Mujer', edadJubilacionDeseada: 57, confirmacionesSupuestos: [CONFIRMACION_VALIDA(57)] }
    const primera = construirCadenaVisualEjercicioRPM(entrada)
    const segunda = construirCadenaVisualEjercicioRPM(entrada)
    expect(primera).toEqual(segunda)
    expect(primera).not.toBe(segunda)
  })

  it('11. no muta resultado ni confirmacionesSupuestos', () => {
    const resultado = resultadoRealBasico()
    const confirmacionesSupuestos = [CONFIRMACION_VALIDA(64)]
    const snapshotResultado = JSON.parse(JSON.stringify(resultado))
    const snapshotConfirmaciones = JSON.parse(JSON.stringify(confirmacionesSupuestos))

    construirCadenaVisualEjercicioRPM({ resultado, sexo: 'Hombre', edadJubilacionDeseada: 64, confirmacionesSupuestos })

    expect(resultado).toEqual(snapshotResultado)
    expect(confirmacionesSupuestos).toEqual(snapshotConfirmaciones)
  })
})
