/**
 * Modelo PerfilDecision: representa el Bloque 3 (Perfil de Decisión) del Expediente
 * Pensional — los objetivos, restricciones, preferencias, prioridades y horizonte
 * temporal que el usuario define para su análisis.
 *
 * El Expediente mantiene un único PerfilDecision vigente a la vez. Las alternativas
 * que se quieran explorar simultáneamente (ej. pensionarse a los 62 frente a los 65)
 * se representan como escenarios o estrategias derivados de ese mismo perfil vigente,
 * nunca como varios PerfilDecision vigentes en paralelo. Cuando el usuario cambia
 * realmente su objetivo o sus prioridades, se actualiza el perfil vigente del
 * Expediente.
 *
 * Cada Simulation conserva una copia completa e inmutable (embebida, no referenciada)
 * del PerfilDecision efectivamente usado en esa ejecución, de manera que las
 * simulaciones anteriores sigan siendo reproducibles y auditables aunque el perfil
 * vigente cambie después — mismo criterio de trazabilidad que ya aplica
 * CalculationTrace.datosUsados.
 *
 * Este contrato define la semántica mínima de restricciones, preferencias y
 * prioridades (ver @property de cada una), pero no impone todavía ninguna
 * validación ni lógica que la haga cumplir — eso queda para cuando exista un Motor
 * de Viabilidad o de Comparación que las consuma.
 *
 * Ver docs/tecnico/arquitectura/expediente-pensional.md (Bloque 3) para el diseño
 * completo y las decisiones que motivan este contrato.
 *
 * @typedef {Object} PerfilDecision
 * @property {string} id
 * @property {PerfilDecisionObjetivo} objetivoPrincipal
 * @property {string[]} restricciones - Condiciones obligatorias que una estrategia no
 *   debe incumplir.
 * @property {string[]} preferencias - Condiciones deseables, pero negociables.
 * @property {string[]} prioridades - Criterios usados para ordenar o favorecer
 *   alternativas cuando existen varias estrategias viables. El orden del arreglo
 *   representa su orden de importancia, de la prioridad más alta a la más baja.
 * @property {PerfilDecisionHorizonteTemporal} [horizonteTemporal] - Horizonte
 *   temporal considerado por el usuario para su decisión, si fue definido.
 *
 * @typedef {Object} PerfilDecisionObjetivo
 * @property {string} tipo - Identificador semántico del objetivo (ej.
 *   'edadJubilacion', 'montoPension', 'tasaReemplazo'). Sin enum ni catálogo cerrado
 *   todavía — lo suficiente para que un futuro Motor de Viabilidad distinga de qué
 *   tipo de objetivo se trata.
 * @property {string} descripcion - Explicación legible del objetivo principal (ej.
 *   'Pensionarme a los 62 años con al menos el 70% de mi salario actual').
 * @property {*} [valorObjetivo] - Valor objetivo asociado, si el objetivo es
 *   cuantificable (ej. una edad, un monto, una tasa de reemplazo deseada).
 * @property {string} [unidad] - Unidad de `valorObjetivo`, si aplica (ej. 'años',
 *   'COP', '%').
 *
 * @typedef {Object} PerfilDecisionHorizonteTemporal
 * @property {string} tipo - Identificador semántico del horizonte (ej.
 *   'cantidadAnios', 'edadObjetivo', 'fechaLimite'). Sin enum ni catálogo cerrado
 *   todavía.
 * @property {(number|string)} valor - Valor del horizonte, en la forma que su `tipo`
 *   implique (ej. un número de años, una edad, o una fecha ISO como string).
 * @property {string} [unidad] - Unidad de `valor`, si aplica (ej. 'años').
 */
