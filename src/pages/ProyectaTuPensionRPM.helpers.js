// Lógica pura de presentación para la comparación de caminos en
// ProyectaTuPensionRPM.jsx — separada en su propio módulo (mismo criterio ya usado por
// ExploraTuProyeccion.helpers.js: no un archivo de página, para poder exportar funciones
// sueltas sin romper react-refresh, y testeable sin montar el componente).
//
// Exclusivamente formato/presentación (S4-004): cada función recibe un escenario ya
// construido por generarCaminosRPM.js y solo decide cómo mostrarlo — nunca calcula IBC,
// pensión, esfuerzo, distancia al objetivo ni decide cuál camino está más alineado. Esos
// valores llegan ya determinados por dominio; aquí no se hace ninguna aritmética sobre
// ellos, solo comparaciones de igualdad/signo para elegir qué texto mostrar y formatearPesos
// para darles forma.
//
// Excepción puntual (2026-08-23): validarEsfuerzoAdicionalMensualDeseado es validación de
// UI, no presentación — vive aquí únicamente para poder testearse sin montar el componente
// (mismo motivo por el que existe este archivo), no porque pertenezca conceptualmente al
// resto de estas funciones.

import { formatearPesos } from '../format/formatearDinero.js'
import { formatearFechaCorta } from '../format/formatearFechaCorta.js'
import { formatearDuracionCalendario } from '../format/formatearDuracionCalendario.js'

/**
 * @param {Object} escenario
 * @returns {string}
 */
export function textoEsfuerzoAdicional(escenario) {
  if (escenario.tipo === 'base') return 'Sin cambios respecto a hoy.'
  if (escenario.esfuerzo.costoPensionalAdicionalMensual <= 0) return 'Sin cambios respecto a hoy.'
  return `${formatearPesos(escenario.esfuerzo.costoPensionalAdicionalMensual)} adicionales al mes.`
}

/**
 * @param {Object} escenario
 * @returns {string}
 */
export function textoIBCFuturo(escenario) {
  const { ibcActual, ibcPropuesto } = escenario.esfuerzo
  if (ibcPropuesto === ibcActual) return `${formatearPesos(ibcActual)} (sin cambios).`
  return `${formatearPesos(ibcActual)} → ${formatearPesos(ibcPropuesto)}.`
}

/**
 * @param {Object} escenario
 * @returns {string}
 */
export function textoDistancia(escenario) {
  const { cumple, delta } = escenario.distanciaObjetivo
  if (cumple) return 'Alcanza tu objetivo.'
  return `No alcanza tu objetivo — le faltarían ${formatearPesos(delta)} al mes.`
}

/**
 * Presenta diferenciaFrenteABase.delta (decisión de producto, 2026-08-24) — exclusivamente
 * formato: nunca resta, nunca recibe dos escenarios, solo decide el texto a partir del
 * delta ya calculado por generarCaminosRPM.js. delta === 0 (camino base) devuelve null a
 * propósito — "no mostrar una cifra redundante en el camino base" — el llamador decide si
 * omitir la celda o no renderizarla. Nunca usa la palabra "rentabilidad"/"retorno"/"ROI".
 * @param {{delta: number}|null} diferenciaFrenteABase
 * @returns {string|null}
 */
export function textoDiferenciaFrenteABase(diferenciaFrenteABase) {
  if (diferenciaFrenteABase === null) return null
  const { delta } = diferenciaFrenteABase
  if (delta === 0) return null
  // "más"/"menos" ya expresan la dirección — sin signo +/− delante de la cifra, para no
  // parecerse a una notación de rentabilidad/retorno financiero (decisión de producto,
  // 2026-08-24).
  const direccion = delta > 0 ? 'más' : 'menos'
  return `${formatearPesos(Math.abs(delta))} ${direccion} de pensión al mes frente a mantenerte como hoy.`
}

// Copy determinístico de "Qué podrías explorar ahora" (decisión de producto, 2026-08-24) —
// mapeo código → texto, mismo patrón ya usado por ETIQUETA_POSICION en
// GraficoEsfuerzoResultado.jsx: un objeto plano en la capa de presentación, sin abstracción
// nueva. determinarOrientacionExploracion.js (domain/) decide QUÉ situación existe; este
// mapeo decide CÓMO se dice — así el lenguaje de PensionLab puede cambiar sin tocar la
// lógica que determina el estado. Nunca cifras, nunca "mejor"/"recomendado"/"deberías"/
// "te conviene"/"asequible"/"rentable" — las cifras ya están en las tarjetas.
const TEXTO_ORIENTACION = {
  HOY_YA_ALCANZA_OBJETIVO: 'Mantener tu situación actual ya alcanza tu objetivo declarado.',
  OBJETIVO_LEGALMENTE_INALCANZABLE:
    'Con las condiciones actuales, aumentar tu aporte no permite alcanzar tu objetivo dentro del límite legal.',
  VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD:
    'Más de un camino evaluado alcanza tu objetivo, con esfuerzos mensuales distintos.',
  ELECCION_YA_ALCANZA_OBJETIVO: 'El esfuerzo que elegiste ya alcanza tu objetivo declarado.',
  ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE:
    'El esfuerzo que elegiste eleva tu proyección, pero no alcanza tu objetivo. Existe otro camino evaluado, ' +
    'con un esfuerzo mensual distinto, que sí lo alcanza.',
  RESTRICCION_COSTO_IMPIDE_OBJETIVO:
    'El límite que declaraste para tu aporte adicional impide alcanzar tu objetivo; sin ese límite, el objetivo ' +
    'sería alcanzable dentro del tope legal.',
  SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE:
    'Tu objetivo es alcanzable con un esfuerzo adicional mensual. Puedes explorar un nivel de esfuerzo que sea ' +
    'relevante para ti.',
}

/**
 * @param {string} codigo - orientacionExploracion.codigo de determinarOrientacionExploracion()
 * @returns {string|null} null si el código no está mapeado (defensivo, nunca lanza)
 */
export function textoOrientacion(codigo) {
  return TEXTO_ORIENTACION[codigo] ?? null
}

// Duplicada a propósito de ExploraTuProyeccion.helpers.js (RAIS) — mismo criterio de
// duplicación ya usado entre generarCaminosRAIS.js/generarCaminosRPM.js para no acoplar
// la pantalla de un régimen al archivo de helpers del otro. Regla data-driven, no
// estética: un código es "común" si aparece en TODOS los escenarios viables — nunca
// reinterpreta el mensaje ni asume qué código debería ser común, solo agrupa por
// coincidencia exacta de codigo (y por construcción, calcularProyeccionRPM.js siempre
// empareja el mismo codigo con el mismo mensaje, así que agrupar por codigo nunca mezcla
// dos textos distintos bajo un mismo grupo). Con un solo escenario viable, todas sus
// limitaciones cuentan como comunes (no hay nada de qué distinguirlas).

// Hace explícito el horizonte temporal de los caminos (§14 punto 9 del Entregable 2,
// decisión Carlos/Atlas 2026-08-21) — compone dos funciones de formato puras
// (formatearFechaCorta, formatearDuracionCalendario) sobre `resultado.horizonte`, ya
// calculado por generarCaminosRPM.js. Nunca instancia `new Date()` ni el reloj del
// navegador: fechaInicio/fechaFin vienen exclusivamente de dominio.
//
// @param {{fechaInicio: string, fechaFin: string, diasCotizados: number}} horizonte
// @param {number} edadJubilacionDeseada
// @returns {string}
export function textoHorizonte(horizonte, edadJubilacionDeseada) {
  const inicio = formatearFechaCorta(horizonte.fechaInicio)
  const fin = formatearFechaCorta(horizonte.fechaFin)
  const duracion = formatearDuracionCalendario(horizonte.fechaInicio, horizonte.fechaFin)
  return `${inicio} → ${fin} · ${duracion} · hasta los ${edadJubilacionDeseada} años`
}

// Único código de generarCaminosRPM.js relevante para esta decisión de presentación
// (precisión de producto S4-006, 2026-08-23): cuando la persona no alcanzaría las
// semanas mínimas a la edad explorada, el diagnóstico previo confirmó que ningún valor de
// restricciónCostoPensionalAdicionalMaximoMensual puede afectar ese resultado (el propio
// generarCaminosRPM.js retorna antes de leer ese parámetro en este caso) — pedirlo como
// paso principal ahí sería pedir un dato irrelevante para el problema real. No reinterpreta
// el código: solo decide, a partir de él, si ese campo debe ocultarse como paso principal.
const CODIGO_SEMANAS_INSUFICIENTES = 'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM'

/**
 * @param {{orientacion: {codigo: string}} | null} resultado - salida de generarCaminosRPM.js, o null si todavía no se calculó
 * @returns {boolean}
 */
export function debeOcultarRestriccion(resultado) {
  return resultado?.orientacion?.codigo === CODIGO_SEMANAS_INSUFICIENTES
}

/**
 * @param {Array<Object>} escenariosViables
 * @returns {Array<{codigo: string, mensaje: string}>}
 */
export function calcularLimitacionesComunes(escenariosViables) {
  if (escenariosViables.length === 0) return []
  const [primero, ...resto] = escenariosViables
  return primero.limitaciones.filter((l) =>
    resto.every((otro) => otro.limitaciones.some((otraLimitacion) => otraLimitacion.codigo === l.codigo))
  )
}

/**
 * @param {Object} escenario
 * @param {Array<{codigo: string}>} limitacionesComunes
 * @returns {Array<{codigo: string, mensaje: string}>}
 */
export function limitacionesEspecificas(escenario, limitacionesComunes) {
  const codigosComunes = new Set(limitacionesComunes.map((l) => l.codigo))
  return escenario.limitaciones.filter((l) => !codigosComunes.has(l.codigo))
}

/**
 * Validación UX del borrador del camino personalizado — "no permitas confirmar: vacío,
 * 0, negativo, no numérico". No duplica ninguna regla legal: la única regla es "monto
 * positivo", la misma que ya exige generarCaminosRPM.js del lado del dominio
 * (esfuerzoAdicionalMensualDeseado > 0). Esta validación de UI solo evita que se intente
 * confirmar algo que el dominio de todas formas ignoraría en silencio.
 * @param {string} valorTexto
 * @returns {{valorValido: (number|null), mensajeError: (string|null)}}
 */
export function validarEsfuerzoAdicionalMensualDeseado(valorTexto) {
  if (valorTexto === '') {
    return { valorValido: null, mensajeError: null }
  }
  const numero = Number(valorTexto)
  if (!Number.isFinite(numero) || numero <= 0) {
    return { valorValido: null, mensajeError: 'Ingresa un monto mayor a $0.' }
  }
  return { valorValido: numero, mensajeError: null }
}

/**
 * Reordena las tarjetas de camino solo para presentación (decisión de producto
 * 2026-08-23): "situación actual → esfuerzo elegido por la persona → esfuerzo necesario
 * para el objetivo". Orden SEMÁNTICO por id, nunca por monto — el esfuerzo personalizado
 * no está garantizado a ser numéricamente menor que el del camino alternativo, así que
 * ordenar por cifra sería incorrecto. Nunca muta el array recibido ni el contrato de
 * resultado.escenarios que entrega generarCaminosRPM.js — devuelve siempre una copia.
 * @param {Array<Object>} escenarios
 * @returns {Array<Object>}
 */
export function ordenarCaminosParaPresentacion(escenarios) {
  const personalizado = escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
  if (!personalizado) return [...escenarios]

  const resto = escenarios.filter((e) => e.id !== 'esfuerzo-adicional-deseado')
  const indiceBase = resto.findIndex((e) => e.id === 'base')
  const posicionInsercion = indiceBase === -1 ? 0 : indiceBase + 1

  return [...resto.slice(0, posicionInsercion), personalizado, ...resto.slice(posicionInsercion)]
}
