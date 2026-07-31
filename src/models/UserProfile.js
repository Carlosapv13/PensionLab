/**
 * Modelo UserProfile: identidad y datos laborales relativamente estables del usuario.
 * No incluye resultados de cálculo — eso vive en Simulation.js. Un mismo UserProfile
 * puede usarse en varias Simulation a lo largo del tiempo.
 *
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {Object} personalInfo
 * @property {string} personalInfo.fechaNacimiento - Única fuente de verdad; la edad se deriva
 *   en cada Simulation a partir de esta fecha y metadata.fechaCalculo, no se almacena aquí.
 * @property {('M'|'F')} personalInfo.sexo - Relevante: la edad legal de pensión difiere por sexo.
 * @property {Object} laboralInfo
 * @property {('RPM'|'RAIS'|'desconocido')} laboralInfo.regimenActual
 * @property {number} laboralInfo.semanasCotizadas
 * @property {string} laboralInfo.fechaInicioCotizacion
 * @property {number} laboralInfo.salarioActual
 * @property {string} laboralInfo.fechaCorte - Fecha a la que corresponden semanasCotizadas y
 *   salarioActual: son autorreportados, no derivables matemáticamente como la edad.
 * @property {Array<{anio: number, ibcPromedio: number}>} laboralInfo.historialIBC
 * @property {Object} consentimiento
 * @property {boolean} consentimiento.aceptado
 * @property {string} consentimiento.fecha
 */
