// Fuente única de verdad para los predicados de "dato imprescindible" que comparten más de
// un consumidor real: generarCaminosRPM.js (sus guard clauses "--- Datos imprescindibles
// ---"), determinarCamposFaltantesObjetivoRPM.js (qué le falta a la persona para poder
// avanzar) y, desde la corrección de 2026-08-23 descrita abajo, ProyectaTuPensionRPM.jsx.
// Extraído deliberadamente mínimo tras el diagnóstico arquitectónico previo (2026-08-23):
// solo estos campos tienen consumidores reales compartidos hoy.
//
// Fuera de alcance a propósito, sin evidencia de un segundo consumidor real (Principio 9):
// sexo, ibcAplicableSimulacion, regimenActual, elegibilidad legal (edad mínima/semanas
// mínimas — obtenerEdadPension/obtenerSemanasMinimas en data/legal/index.js). Esas reglas
// siguen viviendo exclusivamente en generarCaminosRPM.js — no se tocan ni se generalizan
// aquí, y esta corrección no las duplica en ningún sitio nuevo.
//
// Tampoco vive aquí la lista de nombres de campos ni ninguna correspondencia con el schema
// de interpretación IA (objetivoPensionMensual, etc.) — generarCaminosRPM.js y
// determinarCamposFaltantesObjetivoRPM.js usan vocabularios de nombres distintos a
// propósito (parámetros de dominio vs. campos del contrato IA); solo el predicado numérico
// en sí es la fuente compartida.
//
// Corrección 2026-08-23 (revisión visual de Carlos, S4-006): "6" (un solo dígito, mientras
// se escribe "62") pasaba edadJubilacionDeseadaEsValida (número finito) y bastaba para que
// DeclaracionLibre.jsx declarara "ya tenemos lo necesario para explorar tu meta". La causa
// raíz: esa función SOLO valida forma (dato sintácticamente válido) — nunca pretendió
// validar si el valor es plausible para la persona concreta (dato contextualmente válido
// para explorar). Ese chequeo contextual (edadJubilacionDeseada > edadActual, <=
// EDAD_MAXIMA_FUNCIONAL) ya existía, pero vivía solo dentro de ProyectaTuPensionRPM.jsx —
// determinarCamposFaltantesObjetivoRPM.js no tenía forma de aplicarlo. Se agrega aquí
// edadJubilacionDeseadaEsUtilizable, que compone el predicado sintáctico existente con esa
// misma cota contextual (aritmética sobre la fecha de nacimiento real de la persona, no una
// regla legal — la edad mínima LEGAL de pensión, dependiente de sexo/fecha, sigue siendo
// una decisión exclusiva de generarCaminosRPM.js vía obtenerEdadPension, nunca duplicada
// aquí). edadJubilacionDeseadaEsValida se conserva intacta, con su mismo alcance sintáctico
// de siempre: generarCaminosRPM.js sigue usándola tal cual, sin cambios de comportamiento
// (una edad implausible como 6 ya la resolvía correctamente como
// EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL, no como error).

/**
 * @param {*} valor
 * @returns {boolean}
 */
export function objetivoValorMensualEsValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0
}

/**
 * Dato imprescindible sintácticamente válido — solo exige ser un número finito. No evalúa
 * si el valor es plausible para una persona concreta ni si cumple ningún requisito legal:
 * esas son responsabilidades distintas (ver edadJubilacionDeseadaEsUtilizable más abajo, y
 * la elegibilidad legal exclusiva de generarCaminosRPM.js).
 *
 * @param {*} valor
 * @returns {boolean}
 */
export function edadJubilacionDeseadaEsValida(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

// Límite de producto para explorar proyecciones — no un límite legal (ver
// ProyectaTuPensionRPM.jsx, mensaje asociado). Vive aquí porque, desde esta corrección,
// edadJubilacionDeseadaEsUtilizable también lo aplica.
export const EDAD_MAXIMA_FUNCIONAL = 100

/**
 * Dato imprescindible contextualmente válido para explorar: además de ser sintácticamente
 * válido, debe ser una edad futura real respecto a la persona (mayor que su edad actual) y
 * dentro del rango que PensionLab soporta explorar. `edadActual` es un número ya resuelto
 * por el caller (ver calcularEdadCumplida.js) — este predicado no calcula fechas ni conoce
 * fechaNacimiento, solo compara los dos números.
 *
 * Deliberadamente NO evalúa elegibilidad legal (edad mínima de pensión, que depende de sexo
 * y varía en el tiempo) — un valor puede ser plausible/utilizable para EXPLORAR un escenario
 * sin cumplir todavía el requisito legal; esa distinción es la que hace generarCaminosRPM.js
 * al devolver EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL como un resultado informativo, no
 * como un dato inválido.
 *
 * @param {*} valor
 * @param {number} edadActual - ya resuelta por el caller (calcularEdadCumplida)
 * @returns {boolean}
 */
export function edadJubilacionDeseadaEsUtilizable(valor, edadActual) {
  if (!edadJubilacionDeseadaEsValida(valor)) return false
  if (typeof edadActual !== 'number' || !Number.isFinite(edadActual)) return false
  return valor > edadActual && valor <= EDAD_MAXIMA_FUNCIONAL
}
