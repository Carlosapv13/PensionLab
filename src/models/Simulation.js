/**
 * Modelo Simulation: snapshot inmutable de una corrida del motor de cálculo para un
 * UserProfile. Un mismo UserProfile puede tener varias Simulation a lo largo del tiempo,
 * cada una explicable de forma independiente gracias a metadata.versionNormativa y
 * metadata.versionSupuestos.
 *
 * Simulation se trata conceptualmente como evidencia histórica del Expediente
 * Pensional: su responsabilidad dominante es conservar de forma inmutable y
 * auditable qué información se utilizó, bajo qué contexto se evaluó, qué perfil
 * de decisión estaba vigente y qué resultados produjo el sistema en un momento
 * determinado. Técnicamente sigue siendo producida por una ejecución de
 * pensionEngine, pero eso es un detalle de implementación, no su identidad de
 * dominio. Esta responsabilidad no implica resolver aquí persistencia,
 * corrección o anulación de simulaciones, gobernanza del historial, versionado
 * del esquema, Comparación ni Brújula Pensional — todos quedan fuera de alcance.
 *
 * @typedef {Object} Simulation
 * @property {string} id
 * @property {string} userProfileId
 * @property {Object} simulacionInput
 * @property {number} simulacionInput.edadJubilacionDeseada
 * @property {number} [simulacionInput.ahorroVoluntarioMensual]
 * @property {import('./PerfilDecision.js').PerfilDecision} perfilDecisionUtilizado -
 *   Copia completa e inmutable del PerfilDecision efectivamente vigente al momento
 *   de esta ejecución (ver src/models/PerfilDecision.js, Bloque 3) — no una
 *   referencia. PerfilDecision es la fuente conceptual de la intención del
 *   usuario; simulacionInput es su proyección tipada y ya resuelta, consumida
 *   directamente por pensionEngine.
 * @property {import('../domain/contracts/ContextoEvaluacion.js').ContextoEvaluacion} contextoEvaluacionUtilizado -
 *   Copia completa e inmutable de los valores legales y de supuestos
 *   efectivamente resueltos para esta evaluación (ver
 *   src/domain/contracts/ContextoEvaluacion.js, Bloque 4). Puede conservar
 *   identificadores y metadatos de trazabilidad, pero la reproducción de la
 *   Simulation nunca debe depender de información que tenga que resolverse
 *   nuevamente. Es la fuente autoritativa de los valores legales y de supuestos
 *   utilizados en esta Simulation. metadata.versionNormativa y
 *   metadata.versionSupuestos identifican las versiones de los conjuntos de datos
 *   de origen y complementan su trazabilidad. Los campos
 *   CalculationTrace.normasUsadasIds y supuestosUsadosIds indican qué entradas de
 *   este contexto utilizó específicamente cada fórmula.
 * @property {Object} resultadoBase
 * @property {import('../domain/contracts/PensionCalculationResult.js').PensionCalculationResult} resultadoBase.pensionEstimadaRPM
 * @property {import('../domain/contracts/PensionCalculationResult.js').PensionCalculationResult} resultadoBase.proyeccionRAIS
 * @property {number} resultadoBase.semanasFaltantes
 * @property {number} resultadoBase.edadPensionLegal
 * @property {('RPM'|'RAIS')} resultadoBase.regimenRecomendado
 * @property {Array<Object>} [escenarios] - Reservado para el módulo de Escenarios (fuera de Sprint 1).
 * @property {Object} metadata
 * @property {string} metadata.fechaCalculo
 * @property {string} metadata.versionNormativa - Id de la versión de data/legal usada.
 * @property {string} metadata.versionSupuestos - Id de la versión de data/assumptions usada.
 */
