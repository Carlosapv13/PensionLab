// Mecanismo v1 de reconocimiento de aptitud (Sprint 3, capacidad de reconocimiento
// de la declaración libre — Fase 2, sucesora conceptual de la antigua "Capacidad
// C"; ver docs/gestion/cierre-sprint-3.md). Heurística determinista basada en
// coincidencia contra léxicos fijos y longitud del texto — no interpreta
// significado, no entiende negación ni contexto. Nombre y catálogo tratados como
// v1, no como capacidad final del dominio (mismo criterio ya usado con
// `determinarMecanismoYFaltantes.js`).
//
// Limitaciones documentadas y aceptadas para v1 (no ocultas — Principio 5):
// - No reconoce negación: "no quiero saber nada de mi pensión" se marca 'apto'
//   igual que una declaración afirmativa, porque contiene la raíz "pension".
// - No distingue el uso accidental de una raíz fuera de su sentido pensional
//   (ej. "vivo en una pensión de estudiantes").
// - No fragmenta contenido mixto (pensional + no pensional en la misma
//   declaración) ni detecta pluralidad de asuntos — evalúa el texto completo
//   como una sola unidad (escenarios diferidos: mezcla y varios asuntos).
// - El léxico es finito y estático: un término pensional real no incluido en
//   LEXICO_PENSIONAL cae en 'indeterminado' (SIN_SENAL_DE_DOMINIO), nunca en
//   'no_apto' — sesgo deliberado hacia la honestidad ("no sé") antes que hacia
//   un rechazo falso.
//
// Catálogo de códigos de `regla` cerrado en v1: TEXTO_INSUFICIENTE,
// CONTIENE_TERMINO_PENSIONAL, TERMINO_FUERA_DE_DOMINIO, SIN_SENAL_DE_DOMINIO. No
// se amplía sin evidencia real de declaraciones reales que lo justifique
// (Principio 9).
//
// Ajuste posterior al cierre del diseño (mismo Slice): la ejecución de las
// pruebas contra el ejemplo funcional ya aprobado para TERMINO_FUERA_DE_DOMINIO
// ("Quiero saber cómo declarar mi renta este año.") expuso que LEXICO_FUERA_DE_
// DOMINIO no lo cubría — el léxico solo tenía "declaracion de renta", no
// "declarar mi renta". Se agregó el término exacto "declarar mi renta" como
// ajuste mínimo evidenciado por esa ejecución, sin tocar ningún otro término ni
// agregar variantes no evidenciadas (ej. "renta" sola).

const UMBRAL_PALABRAS_MINIMO = 4

const LEXICO_PENSIONAL = [
  'pension',
  'jubil',
  'cotiz',
  'semanas cotizadas',
  'ibc',
  'regimen',
  'rpm',
  'rais',
  'colpensiones',
  'fondo privado',
  'fondo de pensiones',
  'traslado de regimen',
  'vejez',
  'mesada',
  'bono pensional',
]

const LEXICO_FUERA_DE_DOMINIO = [
  'declaracion de renta',
  'declarar mi renta',
  'impuesto de renta',
  'dian',
  'eps',
  'seguro de vida',
  'arriendo',
  'hipoteca',
  'seguro de auto',
]

/**
 * @param {string} texto
 * @returns {string} `texto` en minúsculas, sin tildes y con espacios colapsados.
 */
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function contienePalabraDe(normalizado, lexico) {
  return lexico.some((termino) => normalizado.includes(termino))
}

/**
 * @param {string} texto
 * @returns {import('../contracts/ReconocimientoDeclaracion.js').ResultadoAptitud}
 */
export function reconocerAptitud(texto) {
  if (typeof texto !== 'string') {
    throw new Error('reconocerAptitud: texto debe ser un string')
  }

  const normalizado = normalizar(texto)

  if (normalizado === '') {
    throw new Error('reconocerAptitud: texto no puede estar vacío')
  }

  const palabras = normalizado.split(' ').filter(Boolean)

  if (palabras.length < UMBRAL_PALABRAS_MINIMO) {
    return { estado: 'indeterminado', regla: 'TEXTO_INSUFICIENTE' }
  }

  if (contienePalabraDe(normalizado, LEXICO_PENSIONAL)) {
    return { estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' }
  }

  if (contienePalabraDe(normalizado, LEXICO_FUERA_DE_DOMINIO)) {
    return { estado: 'no_apto', regla: 'TERMINO_FUERA_DE_DOMINIO' }
  }

  return { estado: 'indeterminado', regla: 'SIN_SENAL_DE_DOMINIO' }
}
