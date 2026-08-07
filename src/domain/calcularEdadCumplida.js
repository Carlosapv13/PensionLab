// Extraída de domain/pensionEngine/calcularProyeccionRAIS.js para que
// ExploraTuProyeccion.jsx (pantalla) pueda calcular la edad actual sin
// duplicar la misma lógica una segunda vez. No se tocan las copias ya
// existentes en evidenciaEdadPension.js, evidenciaIndiciosTransicion.js ni
// DatosIniciales.jsx — fuera del alcance de este cambio, que se limita
// estrictamente a evitar la nueva duplicación entre el dominio y esta
// pantalla.
//
// Nunca `añoActual - añoNacimiento`, que falla antes del cumpleaños — mismo
// criterio ya establecido en el proyecto.

/**
 * @param {string} fechaNacimiento - ISO
 * @param {string} fechaReferencia - ISO
 * @returns {number} Edad cumplida en años completos a la fecha de referencia.
 */
export function calcularEdadCumplida(fechaNacimiento, fechaReferencia) {
  const nacimiento = new Date(fechaNacimiento)
  const referencia = new Date(fechaReferencia)

  let edad = referencia.getUTCFullYear() - nacimiento.getUTCFullYear()
  const antesDelCumpleanos =
    referencia.getUTCMonth() < nacimiento.getUTCMonth() ||
    (referencia.getUTCMonth() === nacimiento.getUTCMonth() &&
      referencia.getUTCDate() < nacimiento.getUTCDate())

  if (antesDelCumpleanos) edad -= 1
  return edad
}
