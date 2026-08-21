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

import { formatearPesos } from '../format/formatearDinero.js'

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

// Duplicada a propósito de ExploraTuProyeccion.helpers.js (RAIS) — mismo criterio de
// duplicación ya usado entre generarCaminosRAIS.js/generarCaminosRPM.js para no acoplar
// la pantalla de un régimen al archivo de helpers del otro. Regla data-driven, no
// estética: un código es "común" si aparece en TODOS los escenarios viables — nunca
// reinterpreta el mensaje ni asume qué código debería ser común, solo agrupa por
// coincidencia exacta de codigo (y por construcción, calcularProyeccionRPM.js siempre
// empareja el mismo codigo con el mismo mensaje, así que agrupar por codigo nunca mezcla
// dos textos distintos bajo un mismo grupo). Con un solo escenario viable, todas sus
// limitaciones cuentan como comunes (no hay nada de qué distinguirlas).

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
