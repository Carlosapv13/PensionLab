// Etapa 1 de la capacidad de reconocimiento (Capacidad C, v1 reducida) —
// media entre DeclaracionLibre y el Bloque 3, sin clasificar PerfilDecision.
//
// Alcance deliberadamente acotado, aprobado explícitamente tras revisión
// contractual: determinar con comprensión real si un texto es "materia
// pensional" requiere una capacidad semántica (NLP/comprensión de lenguaje
// natural) que PensionLab no tiene hoy. No existe ninguna regla determinista,
// no arbitraria, que lo resuelva sin caer en una lista de palabras clave —
// eso está explícitamente prohibido. Por eso 'apto' NO es un valor producible
// en v1: se omite del contrato en vez de declararse como un caso que nunca
// se dispara. Queda para C-v2, cuando exista un mecanismo real de
// promoción indeterminado → apto.
//
// Lo único que esta función evalúa, sin ninguna comprensión de tema, es si
// el texto es ruido/relleno inequívocamente detectable — una oración
// sustantiva sobre cualquier cosa (comprar una bicicleta, seguir en un fondo
// privado) queda igual de 'indeterminado': C-v1 no tiene fundamento para
// distinguirlas, y no lo finge.

// Relleno/ruido inequívoco: el texto completo (sin espacios) es una unidad
// corta (1-4 caracteres) repetida 3 o más veces — "blablabla", "jajajaja",
// "xxxxx". Deliberadamente estrecho: solo captura repetición literal, nunca
// juicio de contenido.
const RE_RELLENO_REPETITIVO = /^(.{1,4})\1{2,}$/i

/**
 * @param {string} texto - ya no vacío (garantizado aguas arriba por
 *   DeclaracionLibre.jsx: tipo 'contenido' nunca lleva texto vacío/blanco).
 * @returns {boolean}
 */
function esRuidoORelleno(texto) {
  const sinEspacios = texto.replace(/\s+/g, '')
  return RE_RELLENO_REPETITIVO.test(sinEspacios)
}

/**
 * @param {Object} input
 * @param {string} input.texto
 * @returns {{ estado: 'no_apto' | 'indeterminado', version: 'v1' }}
 */
export function evaluarAptitud({ texto }) {
  // Defensa propia del contrato (Principio 11): un texto vacío o solo
  // espacios no debería llegar aquí (DeclaracionLibre.jsx ya lo descarta como
  // 'ausencia'), pero esta función no asume que el caller lo garantizó —
  // se trata igual que ruido/relleno, nunca como una declaración sustantiva.
  if (typeof texto !== 'string' || texto.trim() === '') {
    return { estado: 'no_apto', version: 'v1' }
  }

  if (esRuidoORelleno(texto.trim())) {
    return { estado: 'no_apto', version: 'v1' }
  }

  return { estado: 'indeterminado', version: 'v1' }
}
