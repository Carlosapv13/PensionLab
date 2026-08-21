// Duración legible en años y meses COMPLETOS de calendario, a partir de dos fechas ISO —
// para el bloque de horizonte temporal de ProyectaTuPensionRPM.jsx (§14 punto 9 del
// Entregable 2, decisión Carlos/Atlas 2026-08-21).
//
// Deliberadamente NO usa dias/365.25 (ni ninguna otra división por un promedio) — verificado
// con el horizonte real del fixture rpm-empleado-proyecta-tu-pension (2026-08-22 →
// 2043-02-11, 6.018 días): la división por promedio da "16 años y 6 meses", mientras que el
// conteo calendario exacto da "16 años y 5 meses" — un mes completo de diferencia, porque
// 6.018/365.25 sobreestima el resto fraccionario. El mismo patrón "años/meses COMPLETOS,
// nunca redondeados hacia arriba" ya lo usa calcularEdadCumplida.js (domain/) para la edad —
// esta función es su equivalente de presentación para un rango de dos fechas cualquiera, no
// solo nacimiento→hoy. `diasCotizados` (dominio) sigue siendo la trazabilidad exacta; esto
// es estrictamente redondeo hacia abajo de esos mismos días para mostrarlos en unidades más
// legibles, nunca un cálculo pensional nuevo.
//
// Mismo criterio de parseo que formatearFechaCorta.js: split del ISO, nunca `new Date(...)`
// — evita que la zona horaria del navegador corra el día.

/**
 * @param {string} fechaInicio - 'YYYY-MM-DD'
 * @param {string} fechaFin - 'YYYY-MM-DD', se asume >= fechaInicio (invariante de dominio:
 *   calcularProyeccionRPM.js nunca produce un horizonteFuturo con fechaFin < fechaInicio)
 * @returns {{anios: number, meses: number}}
 */
export function calcularDuracionCalendario(fechaInicio, fechaFin) {
  const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number)
  const [anioFin, mesFin, diaFin] = fechaFin.split('-').map(Number)

  let anios = anioFin - anioInicio
  let meses = mesFin - mesInicio
  const dias = diaFin - diaInicio

  // Un mes solo cuenta como completo si ya se alcanzó (o superó) el mismo día del mes de
  // inicio — mismo principio que calcularEdadCumplida.js aplica a años ("nunca antes del
  // cumpleaños"), aquí aplicado también a meses. Un día de menos (p. ej. 31 ene → 28 feb,
  // mes más corto) se trata igual, de forma consistente, sin casos especiales por mes.
  if (dias < 0) meses -= 1
  if (meses < 0) {
    anios -= 1
    meses += 12
  }

  return { anios: Math.max(anios, 0), meses: Math.max(meses, 0) }
}

function pluralizar(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

/**
 * @param {string} fechaInicio - 'YYYY-MM-DD'
 * @param {string} fechaFin - 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatearDuracionCalendario(fechaInicio, fechaFin) {
  const { anios, meses } = calcularDuracionCalendario(fechaInicio, fechaFin)

  if (anios === 0 && meses === 0) return 'menos de 1 mes'
  if (meses === 0) return pluralizar(anios, 'año', 'años')
  if (anios === 0) return pluralizar(meses, 'mes', 'meses')
  return `${pluralizar(anios, 'año', 'años')} y ${pluralizar(meses, 'mes', 'meses')}`
}
