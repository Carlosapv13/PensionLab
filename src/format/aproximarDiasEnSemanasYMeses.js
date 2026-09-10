// Aproxima una cantidad de DÍAS FALTANTES (un conteo, no un rango de fechas — para eso ver
// formatearDuracionCalendario.js) a semanas y meses legibles — checkpoint E4-C1, Decisión 1.
//
// Por qué existe: ProyectaTuPensionRPM.jsx (y, con el mismo mensaje en la práctica,
// ExploraTuProyeccionRPM.jsx) mostraban "identificamos X de los Y días" sin decir cuántos
// días FALTAN ni su equivalente aproximado en semanas/meses — obligando a la persona a
// restar mentalmente y a convertir ella misma. Centraliza aquí esa conversión para que
// ninguna pantalla la reimplemente con un criterio de redondeo distinto.
//
// Criterio de redondeo (documentado explícitamente, per requisito del checkpoint):
//   - semanas: Math.ceil(dias / 7) — redondeo hacia ARRIBA. Igual criterio que ya usa
//     biseccionarEscenarioIbcFuturo (generarCaminosRPM.js) para una búsqueda de objetivo:
//     redondear hacia abajo podría sugerir que ya se completó una semana que en realidad
//     todavía falta en parte.
//   - meses: Math.round(dias / 30) — 30 días como mes aproximado. Redondeado al más cercano
//     (no hacia arriba) porque aquí meses es una unidad secundaria puramente orientativa
//     ("o X meses"), nunca la cifra que decide si algo ya se completó — esa responsabilidad
//     es de "días faltantes" (la cifra exacta) y, en segundo lugar, de semanas.
//   - Nunca se expone un "0 meses": si el redondeo da 0 pero todavía hay días faltantes (y
//     por tanto semanas >= 1), `mesesAproximados` es `null` — mostrar "0 meses" junto a
//     "varias semanas" leería como una contradicción (hallazgo explícito del checkpoint
//     E4-C1: evitar precisamente ese resultado absurdo). El llamador decide cómo redactar la
//     ausencia (p. ej., omitir la cláusula "o X meses" por completo).

/**
 * @param {number} diasFaltantes - se espera un entero >= 0; cualquier otro valor (negativo,
 *   no numérico, no finito) se trata como "nada que aproximar", nunca lanza.
 * @returns {{ semanasAproximadas: number, mesesAproximados: number|null }}
 */
export function aproximarDiasEnSemanasYMeses(diasFaltantes) {
  if (typeof diasFaltantes !== 'number' || !Number.isFinite(diasFaltantes) || diasFaltantes <= 0) {
    return { semanasAproximadas: 0, mesesAproximados: null }
  }

  const semanasAproximadas = Math.ceil(diasFaltantes / 7)
  const mesesRedondeados = Math.round(diasFaltantes / 30)

  return { semanasAproximadas, mesesAproximados: mesesRedondeados > 0 ? mesesRedondeados : null }
}

function pluralizar(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

/**
 * Construye la frase completa de días faltantes para completar una ventana de cotización —
 * exclusivamente formato (compone `aproximarDiasEnSemanasYMeses` con los dos conteos ya
 * resueltos por dominio), nunca decide por sí sola cuántos días faltan sin que el llamador
 * los provea. Nunca presenta semanas/meses como una equivalencia legal exacta — siempre
 * "aproximadamente".
 *
 * @param {Object} params
 * @param {number} params.diasIdentificados
 * @param {number} params.diasRequeridos
 * @returns {string|null} null cuando los conteos recibidos no son numéricos/utilizables —
 *   el llamador decide el mensaje de respaldo (nunca inventa aquí una cifra).
 */
export function formatearDiasFaltantesParaVentanaIBL({ diasIdentificados, diasRequeridos }) {
  if (
    typeof diasIdentificados !== 'number' ||
    !Number.isFinite(diasIdentificados) ||
    typeof diasRequeridos !== 'number' ||
    !Number.isFinite(diasRequeridos)
  ) {
    return null
  }

  const diasFaltantes = Math.max(diasRequeridos - diasIdentificados, 0)
  const { semanasAproximadas, mesesAproximados } = aproximarDiasEnSemanasYMeses(diasFaltantes)

  const equivalencia =
    mesesAproximados !== null
      ? `equivalentes aproximadamente a ${pluralizar(semanasAproximadas, 'semana', 'semanas')} o ` +
        `${pluralizar(mesesAproximados, 'mes', 'meses')} de historia de cotización`
      : `equivalentes aproximadamente a ${pluralizar(semanasAproximadas, 'semana', 'semanas')} de historia de cotización`

  return (
    `Identificamos ${diasIdentificados} de los ${diasRequeridos} días necesarios. ` +
    `Faltan ${pluralizar(diasFaltantes, 'día', 'días')}, ${equivalencia}.`
  )
}
