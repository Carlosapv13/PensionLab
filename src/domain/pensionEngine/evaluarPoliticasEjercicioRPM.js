// E5.4 (sprint-4-correcciones-oscar-baldor) — adaptador entre los datos reales de un ejercicio
// (`generarCaminosRPM.js`) y la capa comparativa `compararAnclaIncrementoRPM.js` (E3-B,
// corregida en E5.4-A; nació dormida, conectada en firme desde E6.5 — ver más abajo). Produce
// `politicasInvolucradas` en la forma exacta que
// `construirEjercicioResueltoRPM.js` (Contrato F, E5.3) ya consume — F nunca invoca a este
// archivo ni al comparador directamente (recibe `politicasInvolucradas` como entrada externa,
// decisión fijada desde E5.1/PL-260 §8.2).
//
// Decisiones Carlos/Atlas que fijan el contrato de este archivo:
//
// 1. Agregador extensible: hoy evalúa únicamente `PoliticaAnclaIncrementoMujer`, pero la
//    forma de la salida (`Array<PoliticaInvolucrada>`) y la estructura interna de este
//    archivo no asumen que sea la única — agregar una segunda política futura significa
//    agregar una entrada más al arreglo devuelto, nunca reescribir el contrato.
// 2. Evaluado a nivel de EJERCICIO, no por camino (mismo principio que I3, PL-260 §8.3):
//    `fecha`, `fechaAplicacionRegla`, `sexo` y `semanasCotizadas` son invariantes entre los
//    caminos de un mismo ejercicio (ver diagnóstico E5.4 — `semanasCotizadas.total` depende
//    solo de la historia y el horizonte, nunca de `escenarioIbcFuturo`); solo `ibl.aplicable`
//    puede variar por camino, y el comparador nunca lo expone en `PoliticaInvolucrada`
//    (`{nombre, estado, aplicaAEsteEjercicio, mensaje}`) — por construcción, cualquier camino
//    viable con datos válidos produce el mismo resultado de política. Por eso se usa el
//    PRIMER camino viable con datos usables, sin comparar los demás ni reordenar (I6).
// 3. `sexo` se recibe como parámetro EXPLÍCITO, nunca reconstruido desde
//    `elegibilidad.sexoResuelto` ('F'/'M') — decisión D1(a) del diagnóstico E5.4: evita
//    inventar una función inversa y sigue el mismo patrón ya usado por
//    `construirEjercicioResueltoRPM.js`, que también re-recibe `edadJubilacionDeseada` en vez
//    de derivarlo de `resultadoGenerarCaminos`.
// 4. Sin camino viable con datos numéricos usables (incluido "sin IBL real"): decisión D2(a)
//    del diagnóstico E5.4 — se devuelve `politicasInvolucradas: []`, nunca se fabrica un IBL
//    ni se reimplementa la fórmula de anclas para intentar responder de todos modos.
// 5. `fechaAplicacionRegla` se obtiene ÚNICAMENTE de
//    `resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion` — el
//    mismo dato que Contrato A (`evaluarElegibilidadProyectadaRPM.js`) ya calculó para el
//    mismo cronograma de C-197/2023 (ver E5.4-A). Este archivo nunca recalcula esa fecha ni
//    reimplementa su validación de formato: si el dato está presente pero es `null` o un
//    string con formato inválido, el propio comparador lo rechaza (`ENTRADA_INVALIDA`,
//    `detalle.campo:'fechaAplicacionRegla'`) y este archivo propaga esa negativa como
//    `COMPARADOR_RECHAZO_ENTRADA_DERIVADA` — ninguna validación de FORMATO se duplica aquí.
//    Corrección de revisión final (Carlos/Atlas, 2026-09-20): cuando el dato está AUSENTE
//    (`undefined`), el comparador NUNCA lo rechaza — `fechaAplicacionRegla = fecha` es un
//    parámetro por defecto de JavaScript, que se activa exactamente cuando el argumento
//    recibido es `undefined` (nunca con `null` ni con un string inválido), así que este
//    archivo habría evaluado en silencio la política con la fecha monetaria del camino en
//    vez de la fecha real de aplicación de la regla. Ese hueco puntual —y solo ese— sí se
//    valida aquí antes de invocar el comparador (`fechaAplicacionReglaAusente`), devolviendo
//    el mismo `ENTRADA_INVALIDA`/`COMPARADOR_RECHAZO_ENTRADA_DERIVADA` pero con el campo
//    exacto `resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion` —
//    la única validación paralela de fechas de este archivo, acotada a esta ausencia.
// 6. Todo `mensaje` de `PoliticaInvolucrada` es EXACTAMENTE el texto que ya produjo el
//    comparador (`razon.mensaje` o `incertidumbreJuridica.mensaje`) — este archivo nunca
//    redacta una conclusión jurídica propia ni resume/reinterpreta el texto recibido.
// 7. Fail-closed ante bloqueos de datos/SMLV (D3.2/D3.3 del diagnóstico E5.4): una fuente
//    legal ausente o una vigencia de SMLV no apta NUNCA se traduce en "la política no aplica"
//    — se traduce en `NO_RESUELTA`/`aplicaAEsteEjercicio:true`, conservando la causa real del
//    bloqueo en `mensaje`, nunca disfrazada de conclusión sobre el ancla misma.
// 8. `SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE` → `politicasInvolucradas: []` (decisión de
//    diseño Carlos/Atlas, 2026-09-20, cierre de la revisión final de E5.4 — reemplaza una
//    decisión previa no aprobada que este mismo archivo se atribuía a sí mismo antes de
//    comitearse, y que devolvía una entrada `RESUELTA`/`aplicaAEsteEjercicio:false`).
//    Justificación: (1) el ancla mínima dinámica no alcanza a aplicarse al ejercicio; (2) no
//    existe incertidumbre jurídica que afecte el resultado; (3) una entrada `RESUELTA` con
//    `aplicaAEsteEjercicio:false` sería información inerte dentro de `politicasInvolucradas`;
//    (4) mantiene consistencia con el caso evaluable sin incertidumbre (nota #9 abajo), que
//    también devuelve `[]`; (5) la trazabilidad de que el comparador evaluó esta rama queda
//    cubierta en las pruebas propias de `compararAnclaIncrementoRPM.test.js` — no necesita
//    transformarse en una política involucrada para Contrato F. Nota de alcance: dado que un
//    camino solo es 'viable' cuando `elegibilidad.estado === CUMPLE` (que ya exige
//    `semanasTotalesEnFechaObjetivo >= semanasMinimasAplicables.valor` con la MISMA fórmula y
//    la MISMA `fechaAplicacionRegla`), esta rama es defensiva — no alcanzable desde datos
//    reales de `generarCaminosRPM` con un camino viable, solo desde entradas sintéticas o
//    futuras inconsistencias entre Contrato A y el comparador.
// 9. Comparador evaluable sin incertidumbre jurídica (anclas coinciden para ese sexo/fecha):
//    se devuelve `politicasInvolucradas: []`, nunca una entrada `RESUELTA` inerte — no hay
//    ningún bloqueo que explicar.

import { compararAnclaIncrementoRPM } from './compararAnclaIncrementoRPM.js'

export const NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER = 'PoliticaAnclaIncrementoMujer'

export const CODIGOS_ENTRADA_INVALIDA = {
  RESULTADO_GENERAR_CAMINOS_INVALIDO: 'RESULTADO_GENERAR_CAMINOS_INVALIDO',
  SEXO_INVALIDO: 'SEXO_INVALIDO',
  COMPARADOR_RECHAZO_ENTRADA_DERIVADA: 'COMPARADOR_RECHAZO_ENTRADA_DERIVADA',
}

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object'
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function esSexoValido(sexo) {
  return sexo === 'Mujer' || sexo === 'Hombre'
}

function validarEntrada({ resultadoGenerarCaminos, sexo }) {
  const errores = []

  const resultadoValido = esObjeto(resultadoGenerarCaminos) && Array.isArray(resultadoGenerarCaminos.escenarios)
  if (!resultadoValido) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO,
      campo: 'resultadoGenerarCaminos',
      mensaje: 'resultadoGenerarCaminos ausente, no es un objeto, o su campo escenarios no es un arreglo.',
    })
  }

  if (!esSexoValido(sexo)) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.SEXO_INVALIDO,
      campo: 'sexo',
      mensaje: "sexo ausente o no reconocido — se esperaba 'Mujer' u 'Hombre'; nunca se asume un sexo por defecto.",
    })
  }

  return errores
}

// Único punto que decide si un camino aporta datos usables para el comparador — los tres
// campos que compararAnclaIncrementoRPM necesita además de fecha/fechaAplicacionRegla/sexo.
// Nunca valida nada más del camino (esa validación estructural completa es responsabilidad de
// Contrato F, `CAMINO_VIABLE_INCOMPLETO`) — este archivo solo mira lo que él mismo consume.
function esCaminoUsable(escenario) {
  return (
    esObjeto(escenario) &&
    escenario.estado === 'viable' &&
    typeof escenario.ajusteLegal?.fechaBaseMonetaria === 'string' &&
    esNumeroValido(escenario.semanasCotizadas?.total) &&
    esNumeroValido(escenario.ibl?.aplicable)
  )
}

// Único hueco real encontrado en revisión final E5.4 (Carlos/Atlas, 2026-09-20): el default
// `fechaAplicacionRegla = fecha` de compararAnclaIncrementoRPM.js solo se activa cuando el
// argumento recibido es EXACTAMENTE `undefined` — `null` o un string con formato inválido no
// lo activan y el comparador los rechaza igual que siempre (ver decisión #5 arriba). Sin este
// chequeo, un camino viable con `semanasMinimasAplicables.fechaAplicacion` ausente pasaría
// `fechaAplicacionRegla: undefined` al comparador, que evaluaría en silencio usando `fecha`
// (la fecha monetaria del camino) en vez de la fecha real de aplicación de la regla.
function fechaAplicacionReglaAusente(resultadoGenerarCaminos) {
  return resultadoGenerarCaminos.elegibilidad?.semanasMinimasAplicables?.fechaAplicacion === undefined
}

function politicaAnclaIncrementoMujer({ estado, aplicaAEsteEjercicio, mensaje }) {
  return { nombre: NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER, estado, aplicaAEsteEjercicio, mensaje }
}

// Traduce el resultado ya producido por compararAnclaIncrementoRPM.js a `PoliticaInvolucrada`
// — mapeo cerrado y aprobado por Carlos/Atlas (ver decisiones #7-#9 arriba). Nunca recalcula
// nada del comparador; solo decide, por cada rama ya cerrada de su contrato, qué
// `{estado, aplicaAEsteEjercicio}` corresponde y de dónde sale el `mensaje` textual.
function mapearResultadoComparadorAPolitica(resultadoComparador) {
  if (!resultadoComparador.evaluable) {
    const { codigo, mensaje } = resultadoComparador.razon

    if (codigo === 'SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE') {
      // La política no llega a aplicarse al ejercicio y no hay incertidumbre jurídica que
      // afecte el resultado — `null` aquí produce `politicasInvolucradas: []` en el llamador,
      // nunca una entrada `RESUELTA` inerte (decisión Carlos/Atlas, ver nota de diseño #8
      // arriba).
      return null
    }

    // Fail-closed: `FUENTE_LEGAL_NO_ENCONTRADA` (D3.2) y cualquier bloqueo de vigencia del
    // SMLV (D3.3) — `FUNDAMENTO_NORMATIVO_NO_VERIFICADO`, `MEDIDA_CAUTELAR_ACTIVA`,
    // `FUERA_DE_VIGENCIA`, `FUENTE_INSUFICIENTE` o `SMLV_NO_APTO_PARA_CALCULO` — un dato
    // ausente o una vigencia no apta nunca se traduce en "no aplica"; se conserva la causa
    // real del bloqueo, nunca reinterpretada como conclusión jurídica sobre el ancla. Mismo
    // default también ante cualquier otro `codigo` de bloqueo futuro no listado aquí: la
    // dirección segura es la misma (nunca resolver en silencio ante una causa desconocida).
    return politicaAnclaIncrementoMujer({ estado: 'NO_RESUELTA', aplicaAEsteEjercicio: true, mensaje })
  }

  if (resultadoComparador.incertidumbreJuridica.existe) {
    return politicaAnclaIncrementoMujer({
      estado: 'NO_RESUELTA',
      aplicaAEsteEjercicio: true,
      mensaje: resultadoComparador.incertidumbreJuridica.mensaje,
    })
  }

  // Evaluable y sin incertidumbre jurídica (anclas coinciden para este sexo/fecha) — la
  // política no aplica; `[]` en el arreglo del llamador, nunca una entrada RESUELTA inerte.
  return null
}

/**
 * Evalúa, con datos reales de un ejercicio ya resuelto por `generarCaminosRPM.js`, las
 * políticas jurídicas que podrían dejarlo incompleto (I3, PL-260 §8.3) y produce
 * `politicasInvolucradas` en la forma exacta que consume `construirEjercicioResueltoRPM.js`
 * (Contrato F). Nunca invoca ni es invocado por F — F recibe este resultado como entrada
 * externa ya evaluada (decisión fijada en E5.1).
 *
 * @param {Object} params
 * @param {Object} params.resultadoGenerarCaminos - Salida completa de `generarCaminosRPM(...)`.
 * @param {('Mujer'|'Hombre')} params.sexo - Recibido explícito, nunca reconstruido desde
 *   `resultadoGenerarCaminos.elegibilidad.sexoResuelto` (D1(a)).
 * @returns {
 *   {estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: Array<{nombre: string, estado: ('RESUELTA'|'NO_RESUELTA'), aplicaAEsteEjercicio: boolean, mensaje: string}>}
 *   | {estado: 'ENTRADA_INVALIDA', errores: Array<{codigo: string, campo: string, mensaje: string}>}
 * }
 */
export function evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos, sexo } = {}) {
  const errores = validarEntrada({ resultadoGenerarCaminos, sexo })
  if (errores.length > 0) {
    return { estado: 'ENTRADA_INVALIDA', errores }
  }

  const caminoUsable = resultadoGenerarCaminos.escenarios.find(esCaminoUsable)
  if (!caminoUsable) {
    return { estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: [] }
  }

  // Corrección de revisión final E5.4 (ver decisión #5 arriba): con el dato AUSENTE
  // (`undefined`), el comparador nunca lo rechazaría — activaría en silencio su propio
  // default (`fechaAplicacionRegla = fecha`). Se detiene aquí, antes de invocarlo.
  if (fechaAplicacionReglaAusente(resultadoGenerarCaminos)) {
    return {
      estado: 'ENTRADA_INVALIDA',
      errores: [
        {
          codigo: CODIGOS_ENTRADA_INVALIDA.COMPARADOR_RECHAZO_ENTRADA_DERIVADA,
          campo: 'resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion',
          mensaje:
            'resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion está ausente. ' +
            'compararAnclaIncrementoRPM no lo habría rechazado: su parámetro fechaAplicacionRegla usa fecha ' +
            'como valor por defecto exactamente cuando recibe undefined, así que habría evaluado la política ' +
            'con la fecha monetaria del camino en vez de la fecha real de aplicación de la regla.',
        },
      ],
    }
  }

  const resultadoComparador = compararAnclaIncrementoRPM({
    fecha: caminoUsable.ajusteLegal.fechaBaseMonetaria,
    fechaAplicacionRegla: resultadoGenerarCaminos.elegibilidad?.semanasMinimasAplicables?.fechaAplicacion,
    sexo,
    semanasCotizadas: caminoUsable.semanasCotizadas.total,
    ibl: caminoUsable.ibl.aplicable,
  })

  if (!resultadoComparador.evaluable && resultadoComparador.razon.codigo === 'ENTRADA_INVALIDA') {
    return {
      estado: 'ENTRADA_INVALIDA',
      errores: [
        {
          codigo: CODIGOS_ENTRADA_INVALIDA.COMPARADOR_RECHAZO_ENTRADA_DERIVADA,
          campo: resultadoComparador.razon.detalle?.campo ?? 'desconocido',
          mensaje: resultadoComparador.razon.mensaje,
        },
      ],
    }
  }

  const politica = mapearResultadoComparadorAPolitica(resultadoComparador)
  return { estado: 'POLITICAS_EVALUADAS', politicasInvolucradas: politica ? [politica] : [] }
}
