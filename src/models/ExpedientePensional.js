/**
 * Modelo ExpedientePensional: contrato mínimo y compositivo que identifica el
 * "caso" del Expediente Pensional — la raíz de agregado del dominio descrita en
 * docs/tecnico/arquitectura/expediente-pensional.md.
 *
 * Es deliberadamente mínimo: compone UserProfile y Simulation por referencia, sin
 * duplicar la estructura interna de ninguno de los dos. No incluye persistencia,
 * documentos ni archivos adjuntos.
 *
 * Comparación es una capacidad futura del Expediente, y Brújula Pensional es el
 * producto final futuro del sistema — no son equivalentes entre sí, y ninguna de
 * las dos forma parte de este contrato mínimo ni tiene todavía diseño propio (ver
 * Próximos pasos del documento de arquitectura).
 *
 * Tampoco incluye Resultados, Contexto de Evaluación ni Historia Pensional como
 * campos propios del Expediente. Persona e Historia Pensional se representan
 * actualmente de forma parcial mediante UserProfile, y Resultados se representan
 * mediante Simulation. PerfilDecision y ContextoEvaluacion ya se incorporan como
 * copias embebidas e inmutables dentro de Simulation, mediante
 * perfilDecisionUtilizado y contextoEvaluacionUtilizado (ver
 * src/models/Simulation.js). Estos bloques no deben duplicarse como campos
 * propios del ExpedientePensional.
 *
 * El campo `id` identifica el expediente en sí, no a la persona — la forma técnica
 * de garantizar unicidad por persona sigue pendiente (ver Decisión 2 y Próximos
 * pasos #1 del documento de arquitectura); este contrato no asume ni inventa esa
 * clave.
 *
 * @typedef {Object} ExpedientePensional
 * @property {string} id - Identificador del expediente.
 * @property {string} userProfileId - Referencia al UserProfile existente (ver
 *   src/models/UserProfile.js). No embebe sus datos.
 * @property {PerfilDecision} perfilDecisionVigente - El único Perfil de Decisión
 *   vigente del expediente (ver src/models/PerfilDecision.js), embebido completo.
 * @property {string[]} simulationIds - Referencias a las Simulation existentes
 *   asociadas a este expediente (ver src/models/Simulation.js). No embebe sus datos.
 */
