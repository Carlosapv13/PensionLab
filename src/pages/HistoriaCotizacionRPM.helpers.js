// Funciones puras de HistoriaCotizacionRPM.jsx (S4-001) — evaluar un borrador de
// período antes de agregarlo a la historia, y construir el PeriodoCotizacion final.
//
// Decisión de alcance (Entregable 2, S4-001, aprobada explícitamente): esta versión
// admite únicamente períodos declarados como cotización continua y completa sobre el
// mismo IBC durante todo el intervalo. Por eso `diasCotizados` nunca se pide como campo
// crudo al usuario (sería un dato duplicado y propenso a inconsistencia con las fechas,
// el mismo problema que ya motivó "Validación desde el origen") — se deriva siempre de
// fechaDesde/fechaHasta mediante diasCalendarioEnRango, ya validada y usada por
// seleccionarPeriodosIBL.js. El contrato PeriodoCotizacion[] no cambia.
//
// Un hueco o una interrupción real dentro de lo que sería un único período no se
// "representa": simplemente no se declara ese período (o se declara partido en dos) —
// la ausencia de un período ES la representación del hueco, igual que ya asume
// seleccionarPeriodosIBL.js.
//
// borrador.fechaDesde/fechaHasta son ya cadenas ISO ('' si incompletas) — desde la
// revisión final de S4-001, la construcción día/mes/año vive exclusivamente dentro de
// CampoFechaDiaMesAnio.jsx (estándar permanente de captura de fechas de PensionLab);
// este archivo ya no conoce día/mes/año por separado, solo valida y usa el resultado.

import { esFechaDiaMesAnioReal } from '../format/fechaDiaMesAnio.js'
import { diasCalendarioEnRango } from '../domain/seleccionarPeriodosIBL.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * @typedef {Object} BorradorPeriodo
 * @property {string} fechaDesde - ISO, o '' si CampoFechaDiaMesAnio.jsx todavía no la completó
 * @property {string} fechaHasta - ISO, o '' si incompleta; ignorado cuando sigueAbierto es true
 * @property {boolean} sigueAbierto - si es true, fechaHasta queda null (período abierto)
 * @property {string} ibc - cadena de solo dígitos (ver useCampoMonetario.js)
 */

/**
 * @returns {BorradorPeriodo} borrador vacío, punto de partida y estado tras agregar
 */
export function borradorVacio() {
  return {
    fechaDesde: '',
    fechaHasta: '',
    sigueAbierto: false,
    ibc: '',
  }
}

/**
 * Evalúa un borrador de período tal como lo captura la UI, sin agregarlo todavía a la
 * historia. Nunca corrige un valor — solo determina si ya es apto para agregarse y,
 * cuando no lo es, por qué (Explicar todo bloqueo: cada mensaje es específico y
 * accionable, nunca genérico).
 *
 * @param {BorradorPeriodo} borrador
 * @param {string} [fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   fechaDesdeISO: string | null,
 *   fechaHastaISO: string | null,
 *   ibcNumero: number | null,
 *   puedeAgregar: boolean,
 *   errores: string[],
 * }}
 */
export function evaluarNuevoPeriodo(borrador, fecha = hoyISO()) {
  const errores = []

  const fechaDesdeValida = borrador.fechaDesde !== '' && esFechaDiaMesAnioReal(borrador.fechaDesde)

  if (!fechaDesdeValida) {
    errores.push('Ingresa una fecha de inicio completa y real para este período.')
  } else if (borrador.fechaDesde > fecha) {
    errores.push('La fecha de inicio de este período no puede ser futura.')
  }

  let fechaHastaISO = null
  if (!borrador.sigueAbierto) {
    const fechaHastaValida = borrador.fechaHasta !== '' && esFechaDiaMesAnioReal(borrador.fechaHasta)

    if (!fechaHastaValida) {
      errores.push(
        'Ingresa una fecha de fin completa y real para este período, o marca que sigues cotizando ahí actualmente.'
      )
    } else if (borrador.fechaHasta > fecha) {
      errores.push('La fecha de fin de este período no puede ser futura.')
    } else if (fechaDesdeValida && borrador.fechaHasta < borrador.fechaDesde) {
      errores.push('La fecha de fin no puede ser anterior a la fecha de inicio de este período.')
    } else {
      fechaHastaISO = borrador.fechaHasta
    }
  }

  const ibcNumero = borrador.ibc === '' ? null : Number(borrador.ibc)
  if (ibcNumero === null || !Number.isFinite(ibcNumero) || ibcNumero <= 0) {
    errores.push('Ingresa un valor de IBC mayor que cero para este período.')
  }

  return {
    fechaDesdeISO: fechaDesdeValida ? borrador.fechaDesde : null,
    fechaHastaISO,
    ibcNumero,
    puedeAgregar: errores.length === 0,
    errores,
  }
}

/**
 * Construye el PeriodoCotizacion final a partir de una evaluación ya válida
 * (evaluarNuevoPeriodo con puedeAgregar === true). diasCotizados se deriva siempre como
 * los días calendario completos del rango — nunca se acepta un valor distinto, porque
 * esta versión solo admite períodos declarados como cotización continua y completa.
 *
 * @param {{fechaDesdeISO: string, fechaHastaISO: string | null, ibcNumero: number}} evaluacion
 * @param {string} [fecha] - ISO, por defecto hoy (fecha a la que se resuelve un período abierto)
 * @returns {{fechaDesde: string, fechaHasta: string | null, ibc: number, diasCotizados: number}}
 */
export function construirPeriodoCotizacion({ fechaDesdeISO, fechaHastaISO, ibcNumero }, fecha = hoyISO()) {
  const fechaHastaResuelta = fechaHastaISO ?? fecha
  return {
    fechaDesde: fechaDesdeISO,
    fechaHasta: fechaHastaISO,
    ibc: ibcNumero,
    diasCotizados: diasCalendarioEnRango(fechaDesdeISO, fechaHastaResuelta),
  }
}
