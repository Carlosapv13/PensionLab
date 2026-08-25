// Construcción DETERMINÍSTICA del texto que ve el usuario a partir de un
// ResultadoExplicacion ya validado — mismo patrón ya usado por construirTextoConfirmacion.js
// (S4-006): PensionLab es dueño exclusivo del texto final, nunca se muestra la respuesta
// cruda del modelo.
//
// Segunda mitad del microdiseño de la garantía de cifras (ver explicacionCaminos.schema.js
// y validarConsistenciaExplicacion.js): esta función NUNCA decide si un token es válido —
// eso ya lo decidió esExplicacionConsistente() antes de que este archivo se invoque. Aquí
// solo se sustituye cada token {{namespace:clave}} por el valor EXACTO del diccionario de
// hechos, carácter por carácter — nunca por lo que el modelo haya escrito, nunca
// recalculado. Si por algún motivo un token no resuelve (no debería ocurrir tras pasar la
// validación — defensivo, Principio 11), se deja el token literal visible en vez de
// inventar un valor: un texto raro es preferible a una cifra falsa.

import { PATRON_TOKEN } from './validarConsistenciaExplicacion.js'
import { CAMPOS_EXPLICACION_POR_ESCENARIO } from './contratos/explicacionCaminos.schema.js'

/**
 * @param {string|null} texto
 * @param {Record<string, Record<string,string>>} hechosPorEscenario
 * @param {Record<string,string>} hechosGlobales
 * @returns {string|null}
 */
export function sustituirTokens(texto, hechosPorEscenario, hechosGlobales) {
  if (texto === null) return null
  return texto.replace(PATRON_TOKEN, (tokenCompleto, namespace, clave) => {
    const diccionario = namespace === 'global' ? hechosGlobales : hechosPorEscenario[namespace]
    return diccionario && clave in diccionario ? diccionario[clave] : tokenCompleto
  })
}

/**
 * @param {import('./adaptadores/AdaptadorExplicacionIA.js').ResultadoExplicacion} resultado -
 *   ya validado por esExplicacionConsistente() antes de llegar aquí
 * @param {{ porEscenario: Record<string, Record<string,string>>, global: Record<string,string> }} hechos -
 *   el mismo diccionario usado al construir la petición y al validar la respuesta
 * @returns {{
 *   porEscenario: Record<string, Record<string, string|null>>,
 *   comparacion: string|null,
 * }}
 */
export function construirTextoExplicacion(resultado, hechos) {
  if (resultado.estado !== 'generado') {
    return { porEscenario: {}, comparacion: null }
  }

  const porEscenario = {}
  for (const explicacion of resultado.explicaciones) {
    const texto = {}
    // Itera CAMPOS_EXPLICACION_POR_ESCENARIO en vez de nombrar cada campo aquí — única
    // fuente de verdad de qué campos existen (explicacionCaminos.schema.js), nunca una
    // segunda lista que pueda desincronizarse si el contrato cambia.
    for (const campo of CAMPOS_EXPLICACION_POR_ESCENARIO) {
      texto[campo] = sustituirTokens(explicacion[campo], hechos.porEscenario, hechos.global)
    }
    porEscenario[explicacion.escenarioId] = texto
  }

  return { porEscenario, comparacion: sustituirTokens(resultado.comparacion, hechos.porEscenario, hechos.global) }
}
