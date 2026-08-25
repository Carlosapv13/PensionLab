// Validación SEMÁNTICA de una respuesta del modelo para la explicación de caminos (S4-007)
// — deliberadamente distinta y adicional al JSON Schema de explicacionCaminos.schema.js.
// El schema (strict:true) garantiza la FORMA; esta capa garantiza que ninguna cifra visible
// pueda ser inventada, alterada o contradictoria con generarCaminosRPM.js — la mitad
// "el sistema garantiza los hechos" del microdiseño (ver explicacionCaminos.schema.js).
//
// Tres defensas independientes sobre cada campo de texto (cada uno de
// CAMPOS_EXPLICACION_POR_ESCENARIO, más "comparacion"), todas obligatorias:
//   1. Todo token {{namespace:clave}} debe resolver a una clave que realmente existe en
//      `hechos` — un token inventado (clave que no le dimos) invalida la respuesta entera.
//   2. Fuera de tokens válidos, CERO dígitos permitidos en el texto — si el modelo ignora la
//      instrucción y escribe "$3.600.000" directamente, esta regex lo atrapa. Nunca se
//      "limpia" el texto quitando el dígito colado: la respuesta completa se descarta
//      (mismo criterio que validarConsistenciaInterpretacion.js — nunca quedarse con la
//      parte que sí parece razonable).
//   3. Ninguna frase de recomendación imperativa (lista cerrada, heurística — defensa en
//      profundidad adicional a la instrucción del prompt, no una garantía semántica
//      completa: se documenta así, no se presenta como algo que resuelve el problema en
//      general).
//
// No corrige ni sustituye nada aquí — solo decide aceptar/rechazar la respuesta completa.
// La sustitución real de tokens por su valor exacto vive en construirTextoExplicacion.js,
// y solo se invoca sobre una respuesta que ya pasó esta validación.

import { CAMPOS_EXPLICACION_POR_ESCENARIO } from './contratos/explicacionCaminos.schema.js'

// Exportado: construirTextoExplicacion.js reutiliza exactamente este mismo patrón para la
// sustitución — misma fuente de verdad de qué cuenta como "token", nunca dos regex que
// puedan divergir entre validación y sustitución.
export const PATRON_TOKEN = /\{\{([\w-]+):(\w+)\}\}/g

const FRASES_RECOMENDACION_IMPERATIVA = [
  'deberías',
  'debieras',
  'te recomiendo',
  'te conviene',
  'lo mejor es',
  'la mejor opción es',
  'la mejor alternativa es',
  'elige este camino',
  'elige el camino',
  'opta por',
  'escoge este',
]

function tieneFormaEsperada(bruto) {
  if (bruto === null || typeof bruto !== 'object') return false
  if (!Array.isArray(bruto.explicaciones)) return false
  if (typeof bruto.comparacion !== 'string' && bruto.comparacion !== null) return false
  return bruto.explicaciones.every((item) => {
    if (item === null || typeof item !== 'object') return false
    if (typeof item.escenarioId !== 'string') return false
    return CAMPOS_EXPLICACION_POR_ESCENARIO.every(
      (campo) => typeof item[campo] === 'string' || item[campo] === null
    )
  })
}

/**
 * @param {string} texto
 * @param {Record<string, Record<string,string>>} hechosPorEscenario
 * @param {Record<string,string>} hechosGlobales
 * @returns {boolean}
 */
function textoEsSeguro(texto, hechosPorEscenario, hechosGlobales) {
  const minusculas = texto.toLowerCase()
  if (FRASES_RECOMENDACION_IMPERATIVA.some((frase) => minusculas.includes(frase))) return false

  let textoSinTokens = texto
  for (const coincidencia of texto.matchAll(PATRON_TOKEN)) {
    const [tokenCompleto, namespace, clave] = coincidencia
    const diccionario = namespace === 'global' ? hechosGlobales : hechosPorEscenario[namespace]
    if (!diccionario || !(clave in diccionario)) return false // token inventado/desconocido
    textoSinTokens = textoSinTokens.replace(tokenCompleto, '')
  }

  // Defensa en profundidad: ningún dígito puede sobrevivir fuera de un token ya validado.
  if (/\d/.test(textoSinTokens)) return false

  return true
}

/**
 * @param {Object} bruto - payload que se espera válido contra explicacionCaminos.schema.js
 * @param {{ porEscenario: Record<string, Record<string,string>>, global: Record<string,string> }} hechos -
 *   el mismo diccionario, construido por construirHechosEscenario.js, que se le informó al
 *   modelo al armar la petición.
 * @param {string[]} escenarioIdsEsperados - exactamente los escenarios que se enviaron a
 *   explicar; el modelo debe cubrir todos, ni más ni menos.
 * @returns {boolean}
 */
export function esExplicacionConsistente(bruto, hechos, escenarioIdsEsperados) {
  if (!tieneFormaEsperada(bruto)) return false

  const idsRecibidos = bruto.explicaciones.map((e) => e.escenarioId)
  const idsUnicos = new Set(idsRecibidos)
  if (idsUnicos.size !== idsRecibidos.length) return false // duplicado
  if (idsUnicos.size !== escenarioIdsEsperados.length) return false // cobertura incompleta o de más
  if (!escenarioIdsEsperados.every((id) => idsUnicos.has(id))) return false // inventó un id no enviado

  for (const explicacion of bruto.explicaciones) {
    for (const campo of CAMPOS_EXPLICACION_POR_ESCENARIO) {
      const valor = explicacion[campo]
      if (valor !== null && !textoEsSeguro(valor, hechos.porEscenario, hechos.global)) return false
    }
  }

  if (bruto.comparacion !== null) {
    if (escenarioIdsEsperados.length < 2) return false // no hay nada que comparar con un solo camino
    if (!textoEsSeguro(bruto.comparacion, hechos.porEscenario, hechos.global)) return false
  }

  return true
}
