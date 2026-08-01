/**
 * Contrato de datos: ContextoEvaluacion
 *
 * Responsabilidad: representar el Bloque 4 (Contexto de Evaluación) del Expediente
 * Pensional — la legislación vigente, los parámetros legales y los supuestos de
 * modelado efectivamente resueltos para la fecha de una evaluación. Este bloque no
 * pertenece al usuario: es el puente ya resuelto entre data/legal + data/assumptions
 * (vía sus Resolvers) y el motor de cálculo.
 *
 * Cada Simulation debe conservar una copia completa e inmutable de los valores
 * efectivamente utilizados. Puede incluir identificadores y metadatos de
 * trazabilidad, pero nunca depender exclusivamente de referencias, ids de versión o
 * información que deba resolverse nuevamente para reproducir la simulación. Esto
 * sigue el mismo criterio de trazabilidad que ya aplica CalculationTrace.datosUsados.
 * La separación entre normas y supuestos se preserva siempre como dos colecciones
 * distintas, nunca fusionadas en un solo objeto.
 *
 * Ver docs/tecnico/arquitectura/expediente-pensional.md (Bloque 4) para el diseño
 * completo y las decisiones que motivan este contrato.
 *
 * @typedef {Object} ContextoEvaluacion
 * @property {string} fecha - Fecha ISO para la que se resolvió este contexto (ej. la
 *   fecha de cálculo de la Simulation que lo embebe).
 * @property {ContextoEvaluacionNorma[]} normas - Entradas de data/legal efectivamente
 *   resueltas y usadas, con su valor ya aplicado — no solo su id.
 * @property {ContextoEvaluacionSupuesto[]} supuestos - Entradas de data/assumptions
 *   efectivamente resueltas y usadas, con su valor ya aplicado — no solo su id.
 *
 * @typedef {Object} ContextoEvaluacionNorma
 * @property {string} id - Id de la entrada en data/legal (ver data/legal/schema.js).
 * @property {string} campo
 * @property {*} valor - Valor legal ya resuelto y efectivamente aplicado.
 * @property {string} unidad
 * @property {string} fuente
 * @property {string} articulo
 * @property {{desde: string, hasta: (string|null)}} vigencia
 *
 * @typedef {Object} ContextoEvaluacionSupuesto
 * @property {string} id - Id de la entrada en data/assumptions (ver
 *   data/assumptions/schema.js).
 * @property {string} campo
 * @property {*} valor - Valor de supuesto ya resuelto y efectivamente aplicado.
 * @property {string} unidad
 * @property {string} descripcion
 * @property {string} fuente
 * @property {(string|null)} articulo
 * @property {{desde: string, hasta: (string|null)}} vigencia
 */
