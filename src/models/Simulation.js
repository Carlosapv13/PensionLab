/**
 * Modelo Simulation: snapshot inmutable de una corrida del motor de cálculo para un
 * UserProfile. Un mismo UserProfile puede tener varias Simulation a lo largo del tiempo,
 * cada una explicable de forma independiente gracias a metadata.versionNormativa y
 * metadata.versionSupuestos.
 *
 * @typedef {Object} Simulation
 * @property {string} id
 * @property {string} userProfileId
 * @property {Object} simulacionInput
 * @property {number} simulacionInput.edadJubilacionDeseada
 * @property {number} [simulacionInput.ahorroVoluntarioMensual]
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
