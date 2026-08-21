// Inversa de calcularEdadCumplida.js: la fecha en la que una persona nacida en
// fechaNacimiento cumple edadObjetivo años.

/**
 * @param {string} fechaNacimiento - ISO
 * @param {number} edadObjetivo
 * @returns {string} ISO de la fecha en que se cumple edadObjetivo años.
 */
export function calcularFechaPorEdad(fechaNacimiento, edadObjetivo) {
  const nacimiento = new Date(fechaNacimiento)
  const anioObjetivo = nacimiento.getUTCFullYear() + edadObjetivo
  const mes = nacimiento.getUTCMonth()
  const dia = nacimiento.getUTCDate()

  const fecha = new Date(Date.UTC(anioObjetivo, mes, dia))
  // 29 de febrero en un año objetivo no bisiesto: Date.UTC desborda al 1 de marzo.
  // Se retrocede al último día de febrero de ese año, en vez de adelantar el cumpleaños.
  if (fecha.getUTCMonth() !== mes) {
    fecha.setTime(Date.UTC(anioObjetivo, mes + 1, 0))
  }
  return fecha.toISOString().slice(0, 10)
}
