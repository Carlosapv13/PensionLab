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
 *   Ningún componente de domain/ la consume todavía (Sprint 3). Cuando la tenga, ese componente
 *   deberá validarla de forma autónoma (fecha real, no futura) sin asumir que la UI ya lo hizo —
 *   Principio de Arquitectura 11 (validación en capas), mismo criterio que ya aplica
 *   evaluarSemanasMinimas.js sobre semanasCotizadas.
 * @property {('M'|'F')} personalInfo.sexo - Relevante: la edad legal de pensión difiere por sexo.
 *   Nota de vocabulario: evaluarSemanasMinimas.js valida hoy 'Mujer'/'Hombre' (el vocabulario de
 *   la UI, su único consumidor real) en vez de 'M'/'F'. Divergencia registrada, no resuelta —
 *   sin un segundo consumidor que la fuerce, no se generaliza por anticipación (Principio 9).
 * @property {Object} laboralInfo
 * @property {('RPM'|'RAIS'|'desconocido')} laboralInfo.regimenActual
 * @property {number} laboralInfo.semanasCotizadas
 * @property {string} laboralInfo.fechaInicioCotizacion
 * @property {number} laboralInfo.salarioActual - Nota (Sprint 3, Slice "Base actual de
 *   cotización"): un único número no representa con precisión este dato para los cinco casos
 *   jurídicos reales (dependiente, independiente en sus dos modalidades, mixto, cotización
 *   desde el exterior) — ver domain/determinarBaseCotizacion.js, que produce en su lugar
 *   ibcActualDeclarado/ibcActualCalculado/ibcAplicableSimulacion junto con origenDatoIbc y
 *   certezaValorDeclarado. Ese modelo vive hoy fuera de UserProfile (como estado plano en
 *   App.jsx, igual que el resto de Sprint 3) — este campo queda documentado como candidato a
 *   reemplazarse por ese modelo más rico cuando UserProfile se instancie realmente, no como
 *   una simplificación todavía válida.
 * @property {string} laboralInfo.fechaCorte - Fecha a la que corresponden semanasCotizadas y
 *   salarioActual: son autorreportados, no derivables matemáticamente como la edad.
 * @property {Array<{anio: number, ibcPromedio: number}>} laboralInfo.historialIBC
 * @property {Object} consentimiento
 * @property {boolean} consentimiento.aceptado
 * @property {string} consentimiento.fecha
 */
