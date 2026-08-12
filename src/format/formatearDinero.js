// Formateo de cifras monetarias — único lugar donde vive esta lógica.
// Antes duplicada de forma idéntica en BaseCotizacion.jsx y
// ExploraTuProyeccion.jsx; consolidada aquí para que un futuro campo
// monetario reutilice esto en vez de copiar la función una tercera vez.
//
// Presentación pura, sin estado: nunca toca el valor canónico que guarda
// App.jsx (siempre una cadena de solo dígitos) ni el que recibe el dominio
// — ver src/hooks/useCampoMonetario.js para cómo se usa esto sin alterarlo.

/**
 * Para texto de solo lectura (resultados, mensajes) — con el signo $.
 *
 * @param {number} valor
 * @returns {string}
 */
export function formatearPesos(valor) {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

/**
 * Para el valor mostrado dentro de un input editable — mismos separadores de
 * miles que formatearPesos, sin el signo $ (el campo ya declara "en pesos"
 * en su propia etiqueta). Cadena vacía se conserva como cadena vacía, para
 * no forzar un "0" en un campo que el usuario todavía no ha llenado.
 *
 * @param {string} valorCrudo - cadena de solo dígitos, como la guarda el estado
 * @returns {string}
 */
export function formatearMilesInput(valorCrudo) {
  if (valorCrudo === '') return ''
  return Number(valorCrudo).toLocaleString('es-CO')
}
