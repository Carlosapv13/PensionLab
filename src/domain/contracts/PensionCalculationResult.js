/**
 * Contrato de datos: PensionCalculationResult
 *
 * Responsabilidad: forma final de un resultado de cálculo de pensión (RPM o RAIS),
 * combinando el valor numérico con su traza cruda y su explicación legible.
 * Es la forma que consumen Simulation.resultadoBase y cada entrada de
 * Simulation.escenarios[] (cuando el módulo de Escenarios exista).
 *
 * Nota: fechaCalculo y versionNormativa NO se duplican aquí — viven una sola vez
 * en Simulation.metadata, ya que son iguales para todos los PensionCalculationResult
 * de una misma Simulation.
 *
 * @typedef {Object} PensionCalculationResult
 * @property {number} valor
 * @property {string} moneda             - Unidad monetaria del valor (ej. 'COP')
 * @property {'real'|'nominal'} baseValor - Si el valor está en pesos constantes (real) o proyectados (nominal)
 * @property {string} periodoReferencia   - Período que representa el valor (ej. 'mensual', 'anual')
 * @property {import('./CalculationTrace.js').CalculationTrace} trace
 * @property {import('./Explanation.js').Explanation} explicacion
 */
