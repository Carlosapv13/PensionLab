// Orquestador de la capacidad de reconocimiento (Capacidad C, v1 reducida).
// Dormida, sin consumidor en la UI (decisión aprobada en el cierre de Sprint 3, "Alternativa
// D" — el código se conserva, sin conectar) — compone evaluarAptitud sin invocar ninguna
// resolución de estructura: esa etapa no existe todavía en v1 (su precondición,
// aptitud.estado === 'apto', nunca ocurre en esta versión — ver evaluarAptitud.js).
// `estructura` está deliberadamente ausente en los resultados que produce esta versión.

import { evaluarAptitud } from './evaluarAptitud.js'

/**
 * Principio 11 (validación desde el origen): esta función nunca asume que el caller le
 * garantiza una de las dos formas reconocidas — aunque hoy DeclaracionLibre.jsx nunca deje
 * avanzar sin una de ellas. `null`, `undefined`, o cualquier forma que no sea exactamente
 * `{tipo: 'ausencia'}` o `{tipo: 'contenido', texto}` producen `declaracionOriginal: null`,
 * sin `aptitud` — nunca se inventa una declaración de contenido vacío ni se evalúa aptitud
 * sobre datos que en realidad no llegaron (eso confundiría "no hay dato" con "el usuario
 * escribió ruido", dos hechos distintos). `null` reutiliza, a propósito, el mismo valor que
 * el tipo del prop `declaracion` de DeclaracionLibre.jsx ya admite para "nada capturado
 * todavía" — no es un tercer estado nuevo inventado aquí.
 *
 * @param {{ tipo: 'contenido', texto: string } | { tipo: 'ausencia' } | null | undefined} declaracion
 * @returns {{
 *   declaracionOriginal: { tipo: 'contenido', texto: string } | { tipo: 'ausencia' } | null,
 *   aptitud?: { estado: 'no_apto' | 'indeterminado', version: 'v1' },
 * }}
 */
export function evaluarDeclaracion(declaracion) {
  if (declaracion?.tipo === 'ausencia') {
    return { declaracionOriginal: { tipo: 'ausencia' } }
  }

  if (declaracion?.tipo === 'contenido') {
    return {
      declaracionOriginal: { tipo: 'contenido', texto: declaracion.texto },
      aptitud: evaluarAptitud({ texto: declaracion.texto }),
    }
  }

  return { declaracionOriginal: null }
}
