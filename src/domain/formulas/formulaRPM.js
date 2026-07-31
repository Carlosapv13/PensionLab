// Fórmula matemática pura del cálculo de pensión bajo RPM (Régimen de Prima Media).
// Recibe parámetros ya resueltos (datos del usuario + valores normativos); no contiene
// literales legales embebidos ni conoce data/legal directamente.
//
// Ver trazabilidad-formula-RPM.md para la fórmula legal, sus fuentes, los 4 casos
// numéricos de referencia (usados en formulaRPM.test.js) y el punto de controversia
// sobre semanasBaseIncrementoRPM (nota de alcance: Sprint 1 sigue la metodología
// operacional de Colpensiones, no una interpretación jurídica definitiva).

function clamp(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo)
}

/**
 * @param {Object} params
 * @param {{ibl: number, semanasCotizadas: number}} params.datosUsuario
 * @param {{
 *   smlv: number,
 *   tasaReemplazoConstante: number,
 *   tasaReemplazoPendiente: number,
 *   tasaReemplazoMinima: number,
 *   tasaReemplazoMaxima: number,
 *   semanasBaseIncrementoRPM: number,
 *   semanasPorIncrementoAdicional: number,
 *   incrementoPorcentualPorTramo: number,
 * }} params.parametrosLegales
 * @returns {number} Tasa de reemplazo aplicada, en % (ej. 68.5). Sin redondear.
 */
export function calcularTasaReemplazoRPM({ datosUsuario, parametrosLegales }) {
  const { ibl, semanasCotizadas } = datosUsuario
  const {
    smlv,
    tasaReemplazoConstante,
    tasaReemplazoPendiente,
    tasaReemplazoMinima,
    tasaReemplazoMaxima,
    semanasBaseIncrementoRPM,
    semanasPorIncrementoAdicional,
    incrementoPorcentualPorTramo,
  } = parametrosLegales

  const s = ibl / smlv
  const base = clamp(
    tasaReemplazoConstante - tasaReemplazoPendiente * s,
    tasaReemplazoMinima,
    tasaReemplazoMaxima
  )

  const tramos = Math.floor(
    Math.max(0, semanasCotizadas - semanasBaseIncrementoRPM) / semanasPorIncrementoAdicional
  )
  const incremento = tramos * incrementoPorcentualPorTramo

  return clamp(base + incremento, tasaReemplazoMinima, tasaReemplazoMaxima)
}

/**
 * @param {Object} params
 * @param {{ibl: number, semanasCotizadas: number}} params.datosUsuario
 * @param {Object} params.parametrosLegales - Mismos campos que calcularTasaReemplazoRPM
 * @returns {number} Pensión mensual estimada, en la unidad de datosUsuario.ibl. Sin redondear.
 */
export function formulaRPM(params) {
  const tasaFinal = calcularTasaReemplazoRPM(params)
  return params.datosUsuario.ibl * (tasaFinal / 100)
}
