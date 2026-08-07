// resolverSupuestosVigentes(fecha): devuelve el set de supuestos de modelado de
// versions/ aplicable a una fecha dada. Misma mecánica que data/legal/index.js
// (dentroDeVigencia + buscarPorCampo), pero implementada de forma independiente,
// sin importar nada de data/legal — los supuestos no son normativa, y el
// Principio 1 del proyecto exige que ambos permanezcan separados incluso a nivel
// de código, no solo de datos.
//
// A diferencia de data/legal, AssumptionEntry no tiene ningún campo equivalente a
// `estadoJuridico` (ver schema.js) — no existe aquí ningún concepto de "firme" vs.
// "transitorio", así que no se replica esa parte del mecanismo de data/legal.

import supuestosV1 from './versions/supuestos-v1.json' with { type: 'json' }

const LINEA_DE_TIEMPO_SUPUESTOS = [supuestosV1]

function dentroDeVigencia(entrada, fecha) {
  const { desde, hasta } = entrada.vigencia ?? {}
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

/**
 * @param {string} fecha - Fecha ISO (ej. '2026-07-30')
 * @returns {import('./schema.js').AssumptionEntry[]}
 */
export function resolverSupuestosVigentes(fecha) {
  return LINEA_DE_TIEMPO_SUPUESTOS
    .flatMap((archivo) => archivo?.entradas ?? [])
    .filter((entrada) => dentroDeVigencia(entrada, fecha))
}

/**
 * Resuelve un supuesto de modelado por su campo, con trazabilidad completa —
 * mismo criterio de "nunca un número suelto" ya aplicado en data/legal/index.js.
 *
 * @param {string} fecha - Fecha ISO en la que se evalúa el supuesto
 * @param {string} campo - Ej. 'rentabilidadEsperadaRAIS'
 * @returns {{
 *   valor: *,
 *   id: string,
 *   fuente: string,
 *   vigenciaDesde: string | null,
 *   vigenciaHasta: string | null,
 * }}
 */
export function obtenerSupuesto(fecha, campo) {
  const supuestos = resolverSupuestosVigentes(fecha)
  const entrada = supuestos.find((s) => s.campo === campo) ?? null

  if (!entrada) {
    throw new Error(`obtenerSupuesto: no se encontró '${campo}' vigente para la fecha ${fecha}`)
  }

  return {
    valor: entrada.valor,
    id: entrada.id,
    fuente: entrada.fuente,
    vigenciaDesde: entrada.vigencia?.desde ?? null,
    vigenciaHasta: entrada.vigencia?.hasta ?? null,
  }
}
