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
import { diasCalendarioEnRango, seSuperponen } from '../domain/seleccionarPeriodosIBL.js'

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

// Revisión correctiva E4-C1 (2026-09-10) — "Edición real de periodos históricos": un período
// ya guardado se convierte de vuelta al mismo BorradorPeriodo que produce el formulario, para
// poder cargarlo y editarlo con exactamente los mismos campos/validaciones que agregar uno
// nuevo. Nunca inventa un campo nuevo en el contrato PeriodoCotizacion — solo transforma ida
// y vuelta entre las dos formas ya existentes (borrador de UI vs. período guardado).
/**
 * @param {{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}} periodo
 * @returns {BorradorPeriodo}
 */
export function periodoAFormularioBorrador(periodo) {
  return {
    fechaDesde: periodo.fechaDesde,
    fechaHasta: periodo.fechaHasta ?? '',
    sigueAbierto: periodo.fechaHasta === null,
    ibc: String(periodo.ibc),
  }
}

// Revisión correctiva E4-C1 (2026-09-10): valida un borrador para agregarlo O para
// reemplazar un período ya existente, con las MISMAS reglas en ambos casos — fechas/IBC (via
// evaluarNuevoPeriodo, sin cambios) más solapamiento contra el resto de la historia (via
// seSuperponen, la MISMA función que ya usa seleccionarPeriodosIBL.js — nunca reimplementada
// aquí, para no crear una segunda fuente de verdad sobre qué cuenta como solapamiento).
//
// `indiceExcluido` es la posición del período que se está editando (se excluye de la
// comparación contra sí mismo) — `null` en modo "agregar", donde no hay ningún índice que
// excluir. Esta es la única función que decide si un borrador puede COMMITTEARSE a la
// historia, tanto para agregar como para editar — evita que ambos flujos verifiquen reglas
// distintas o diverjan con el tiempo.
/**
 * @param {Object} params
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} params.historiaCotizacion
 * @param {BorradorPeriodo} params.borrador
 * @param {number|null} [params.indiceExcluido]
 * @param {string} [params.fecha]
 * @returns {{fechaDesdeISO: string|null, fechaHastaISO: string|null, ibcNumero: number|null, puedeAgregar: boolean, errores: string[]}}
 */
export function evaluarPeriodoParaHistoria({ historiaCotizacion, borrador, indiceExcluido = null, fecha = hoyISO() }) {
  const evaluacionBase = evaluarNuevoPeriodo(borrador, fecha)
  if (!evaluacionBase.puedeAgregar) return evaluacionBase

  const candidato = {
    fechaDesde: evaluacionBase.fechaDesdeISO,
    fechaHastaResuelta: evaluacionBase.fechaHastaISO ?? fecha,
  }

  const solapaConOtroPeriodo = historiaCotizacion.some((periodo, indice) => {
    if (indice === indiceExcluido) return false
    const otro = { fechaDesde: periodo.fechaDesde, fechaHastaResuelta: periodo.fechaHasta ?? fecha }
    return seSuperponen(candidato, otro)
  })

  if (!solapaConOtroPeriodo) return evaluacionBase

  return {
    ...evaluacionBase,
    puedeAgregar: false,
    errores: [
      ...evaluacionBase.errores,
      'Este período se superpone en fechas con otro que ya agregaste — ajusta las fechas para que no coincidan.',
    ],
  }
}

// Revisión correctiva E4-C1 (2026-09-10): extraída como función pura y testeada aparte —
// la misma lógica que antes vivía inline en el manejador de "Guardar cambios" de
// HistoriaCotizacionRPM.jsx — para poder demostrar por prueba, sin montar el componente, que
// guardar una edición (a) reemplaza EXACTAMENTE en `indice` (la posición TRANSITORIA del
// período durante esta edición — ver la nota junto a `indiceEnEdicion` en
// HistoriaCotizacionRPM.jsx sobre por qué no es un identificador persistente), (b) nunca
// cambia la longitud del array (no duplica, no elimina), y (c) nunca toca ningún otro
// elemento. `Array.prototype.map` ya garantiza esto por construcción — esta función solo le
// da un nombre y un lugar donde probarlo explícitamente.
/**
 * @param {Array<Object>} historiaCotizacion
 * @param {number} indice
 * @param {Object} periodoActualizado
 * @returns {Array<Object>} un array nuevo (nunca muta el recibido), misma longitud, con el
 *   elemento en `indice` reemplazado y todos los demás intactos (misma referencia)
 */
export function reemplazarPeriodoEnPosicion(historiaCotizacion, indice, periodoActualizado) {
  return historiaCotizacion.map((periodo, i) => (i === indice ? periodoActualizado : periodo))
}

// Revisión correctiva E4-C1 (2026-09-10), hallazgo 5 — "Eliminación inmediata sin
// confirmación": extraída, mismo criterio que reemplazarPeriodoEnPosicion, para poder probar
// por separado de la confirmación en sí (que es flujo de UI — abrir/cancelar/confirmar — y
// vive como estado de React en HistoriaCotizacionRPM.jsx, no aquí). Esta función es el único
// punto que efectivamente cambia la longitud del array al eliminar: solo se invoca desde
// `manejarConfirmarQuitarPeriodo`, nunca desde el primer clic en "Quitar" (que solo abre la
// confirmación) ni desde "Cancelar" (que no toca historiaCotizacion en absoluto).
/**
 * @param {Array<Object>} historiaCotizacion
 * @param {number} indice
 * @returns {Array<Object>} un array nuevo (nunca muta el recibido), con el elemento en
 *   `indice` eliminado y todos los demás conservados, en el mismo orden relativo
 */
export function quitarPeriodoEnPosicion(historiaCotizacion, indice) {
  return historiaCotizacion.filter((_, i) => i !== indice)
}
