/**
 * Contrato de datos: Explanation
 *
 * Responsabilidad: representar la explicación legible de un resultado de cálculo —
 * datos usados, fórmula aplicada, normas legales con su vigencia, supuestos de
 * modelado y limitaciones conocidas. Construida por
 * domain/transparency/explainCalculation.js a partir de dos fuentes ya resueltas,
 * sin volver a resolver nada directamente contra data/legal ni data/assumptions:
 * el CalculationTrace correspondiente, para saber qué entradas (normasUsadasIds/
 * supuestosUsadosIds) utilizó la fórmula, y el contextoEvaluacionUtilizado de esa
 * misma Simulation (ver src/domain/contracts/ContextoEvaluacion.js), que es la
 * fuente autoritativa de los valores y metadatos ya resueltos de esas entradas.
 *
 * @typedef {Object} Explanation
 * @property {Object} datosUsados
 * @property {{id: string, descripcion: string, expresion: string}} formula
 * @property {Array<{id: string, campo: string, valorAplicado: *, articulo: string, fuente: string, vigenciaDesde: string, vigenciaHasta: (string|null)}>} normas
 * @property {Array<{id: string, campo: string, valorAplicado: *, descripcion: string}>} supuestos
 * @property {string[]} limitaciones
 * @property {{nivel: ('alta'|'media'|'baja'), motivo: string}} [gradoEstimacion] - Opcional: refleja
 *   qué tan incierta es la proyección hacia el futuro que hace este cálculo (ej. grado bajo si
 *   falta historial de IBC completo, o si la edad de jubilación deseada está lejos en el tiempo).
 *   No mide la confiabilidad del sistema/motor de cálculo — eso es una propiedad del software,
 *   no del resultado individual, y no se representa en este contrato.
 */
