// Formato compacto de fecha ("22 ago 2026") — para contextos donde la forma larga de
// ExpedientePensional.jsx ("22 de agosto de 2026") ocupa más espacio del disponible (p.
// ej. el bloque de horizonte temporal de ProyectaTuPensionRPM.jsx). Mismo criterio que
// formatearFecha (ExpedientePensional.jsx): parsea el ISO por split, nunca por `new
// Date(fechaISO).getDate()` — evita que la zona horaria del navegador corra el día.

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * @param {string} fechaISO - 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatearFechaCorta(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-').map(Number)
  return `${dia} ${MESES_CORTOS[mes - 1]} ${anio}`
}
