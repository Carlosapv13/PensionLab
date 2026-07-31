/**
 * Esquema de data/assumptions/versions/*.json
 *
 * Mismo principio de trazabilidad individual que data/legal/schema.js, adaptado a
 * supuestos de modelado (no mandados por ley). `articulo` queda nulo cuando el supuesto
 * no se sustenta en una norma sino en un criterio técnico o estudio propio; en ese caso
 * `fuente` describe ese origen (ej. 'Estudio actuarial interno 2026'). Se agrega
 * `descripcion`, no pedida explícitamente pero necesaria: es la fuente del campo ya
 * aprobado Explanation.supuestos[].descripcion.
 *
 * @typedef {Object} AssumptionEntry
 * @property {string} id       - Id único, referenciado desde CalculationTrace.supuestosUsadosIds
 *   y desde Explanation.supuestos[].id
 * @property {string} campo    - Qué concepto asume (ej. 'rentabilidadEsperadaRAIS', 'salarioConstante')
 * @property {*} valor
 * @property {string} unidad   - Unidad del valor (ej. '%', 'COP')
 * @property {string} descripcion - Explicación legible del supuesto
 * @property {string} fuente   - Origen/justificación (norma, estudio actuarial, o criterio de producto)
 * @property {(string|null)} articulo - Artículo legal, si aplica; null si es un criterio de modelado propio
 * @property {{desde: string, hasta: (string|null)}} vigencia - Ventana de validez del supuesto
 * @property {number} [periodo] - Año al que corresponde el valor, para supuestos que se revisan
 *   periódicamente (ej. rentabilidadEsperadaRAIS podría reestimarse cada año). Mismo criterio
 *   que en data/legal/schema.js: opcional, solo aplica a campos variables por período.
 *
 * @typedef {Object} AssumptionsVersionFile
 * @property {string} id
 * @property {string} descripcion
 * @property {AssumptionEntry[]} entradas
 */
