// Punto 4 (corrección E2, sprint-4-correcciones-oscar-baldor) — extracción mínima para
// eliminar la doble fuente de verdad que existía entre calcularProyeccionRPM.js y
// evaluarElegibilidadProyectadaRPM.js: ambos calculaban por su cuenta la fecha objetivo
// (calcularFechaPorEdad) y los días futuros (diasCalendarioEnRango + diaSiguiente) con la
// misma fórmula pero dos invocaciones independientes. Esta función es la única fuente para
// esa pregunta — ninguna de las dos vuelve a resolverla con lógica propia.
//
// Deliberadamente pequeña (Principio 9): no es una "capa de horizonte" con su propio
// modelo — es la misma fórmula de siempre, nombrada una sola vez.

import { calcularFechaPorEdad } from './calcularFechaPorEdad.js'
import { diasCalendarioEnRango, diaSiguiente } from './seleccionarPeriodosIBL.js'

/**
 * @param {Object} params
 * @param {string} params.fechaNacimiento - ISO
 * @param {number} params.edadObjetivo - años
 * @param {string} params.fecha - ISO, fecha de cálculo (fechaBaseMonetaria)
 * @returns {{
 *   fechaCalculo: string,
 *   fechaObjetivo: string,
 *   fechaInicioFuturo: string,
 *   diasFuturos: number|null,
 *   valido: boolean,
 *   razonInvalido: ('FECHA_OBJETIVO_NO_POSTERIOR_A_FECHA_CALCULO')|null,
 * }}
 */
export function resolverHorizonteFuturoRPM({ fechaNacimiento, edadObjetivo, fecha }) {
  const fechaObjetivo = calcularFechaPorEdad(fechaNacimiento, edadObjetivo)
  const fechaInicioFuturo = diaSiguiente(fecha)

  if (fechaObjetivo <= fecha) {
    return {
      fechaCalculo: fecha,
      fechaObjetivo,
      fechaInicioFuturo,
      diasFuturos: null,
      valido: false,
      razonInvalido: 'FECHA_OBJETIVO_NO_POSTERIOR_A_FECHA_CALCULO',
    }
  }

  return {
    fechaCalculo: fecha,
    fechaObjetivo,
    fechaInicioFuturo,
    diasFuturos: diasCalendarioEnRango(fechaInicioFuturo, fechaObjetivo),
    valido: true,
    razonInvalido: null,
  }
}
