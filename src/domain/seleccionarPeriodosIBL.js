// Valida la consistencia de una historia de cotización estructurada y determina si es
// evaluable para el cálculo del IBL bajo la frontera provisional de este Slice, según los
// tres códigos de no_evaluable ya cerrados en el diseño:
//
//   INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS  - un período declara más días cotizados que
//                                                días calendario de su propio rango.
//   PERIODOS_SUPERPUESTOS_NO_SOPORTADOS       - dos períodos comparten días calendario.
//   VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS       - los últimos 10 años calendario antes de
//                                                fechaCalculo no están cubiertos sin huecos
//                                                por los períodos declarados.
//   COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA - un período que toca esa ventana tiene
//                                                diasCotizados menor a los días calendario
//                                                de su rango (PensionLab no asume cuáles
//                                                días estuvieron cotizados).
//
// La regla de qué períodos integran el IBL ordinario cuando hay interrupciones dentro de
// los últimos 10 años NO está confirmada en fuente primaria (ver investigación normativa
// previa) — esta frontera la sortea exigiendo cobertura completa en vez de resolverla; no
// es una interpretación legal ni una regla permanente de PensionLab.
//
// Fuera de la ventana de 10 años (para la alternativa de vida laboral, cuando aplica), un
// hueco NO es un problema: la ambigüedad normativa que motiva la frontera anterior es
// específica de la selección de "los últimos 10 años" — promediar toda la carrera no tiene
// ese mecanismo de retroceso en disputa, así que un período de no cotización simplemente
// no participa del promedio. Por eso solo se exige cobertura sin huecos DENTRO de la
// ventana, nunca en el resto de la historia.

const MS_POR_DIA = 24 * 60 * 60 * 1000

// Exportada a partir de S4-001 (captura de historia RPM estructurada real):
// segundo consumidor real fuera de este archivo (src/pages/HistoriaCotizacionRPM.helpers.js),
// para no reimplementar aritmética de fechas (bisiestos incluidos) en la capa de UI.
// Comportamiento sin cambios — solo visibilidad.
export function diasCalendarioEnRango(fechaDesde, fechaHasta) {
  const ms = new Date(fechaHasta).getTime() - new Date(fechaDesde).getTime()
  return Math.round(ms / MS_POR_DIA) + 1
}

function diaSiguiente(fechaISO) {
  const d = new Date(fechaISO)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function seSuperponen(a, b) {
  return a.fechaDesde <= b.fechaHastaResuelta && b.fechaDesde <= a.fechaHastaResuelta
}

/**
 * Ventana de evaluabilidad: los 10 años calendario completos inmediatamente anteriores al
 * año de fechaCalculo (ej. fechaCalculo en 2026 → ventana 2016-01-01 a 2025-12-31). Mismo
 * criterio de "años calendario completos" usado en la investigación normativa del IBL.
 *
 * Exportada a partir de S4-001 (revisión, Entregable 2): segundo consumidor real fuera de
 * este archivo (src/pages/HistoriaCotizacionRPM.jsx), para mostrar el rango exacto que la UI
 * necesita en vez de que la persona lo adivine. Esta ventana está anclada a `fechaCalculo`
 * (hoy, en el uso actual) — NO es la ventana de 10 años que el Art. 21 de la Ley 100 de 1993
 * ancla a la fecha de reconocimiento de la pensión; ver
 * `docs/tecnico/arquitectura/entregable-2-pensionlab-responde-explora-y-explica.md` §7.1 y
 * `src/data/legal/trazabilidad-normativa.md` ("Traslado de régimen (RAIS→RPM) e IBL"). Quien
 * consuma esta función debe mantener esa distinción visible, nunca presentarla como la
 * ventana jurídicamente definitiva. Comportamiento sin cambios — solo visibilidad.
 */
export function calcularVentana(fechaCalculo) {
  const anioCalculo = new Date(fechaCalculo).getUTCFullYear()
  const anioFin = anioCalculo - 1
  const anioInicio = anioFin - 9
  return {
    desde: `${anioInicio}-01-01`,
    hasta: `${anioFin}-12-31`,
    anioInicio,
    anioFin,
  }
}

function clipAVentana(fechaDesde, fechaHastaResuelta, ventana) {
  const desde = fechaDesde > ventana.desde ? fechaDesde : ventana.desde
  const hasta = fechaHastaResuelta < ventana.hasta ? fechaHastaResuelta : ventana.hasta
  if (desde > hasta) return null
  return { fechaDesde: desde, fechaHasta: hasta }
}

function cubreVentanaSinVacios(rangosClip, ventana) {
  if (rangosClip.length === 0) return false
  const ordenados = [...rangosClip].sort((a, b) => (a.fechaDesde < b.fechaDesde ? -1 : 1))
  if (ordenados[0].fechaDesde !== ventana.desde) return false

  let cursor = ordenados[0].fechaHasta
  for (let i = 1; i < ordenados.length; i++) {
    if (ordenados[i].fechaDesde !== diaSiguiente(cursor)) return false
    cursor = ordenados[i].fechaHasta
  }
  return cursor === ventana.hasta
}

function noEvaluable(razonNoEvaluable) {
  return { evaluable: false, razonNoEvaluable }
}

/**
 * @typedef {Object} PeriodoCotizacion
 * @property {string} fechaDesde - ISO
 * @property {(string|null)} fechaHasta - ISO, o null si sigue abierto (se resuelve a fechaCalculo)
 * @property {number} ibc
 * @property {number} diasCotizados - evidencia observada, obligatoria; nunca derivada de fechas
 */

/**
 * @param {Object} params
 * @param {PeriodoCotizacion[]} params.historiaCotizacion
 * @param {string} params.fechaCalculo - ISO
 * @returns {
 *   | { evaluable: false, razonNoEvaluable: 'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS' | 'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS' | 'VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS' | 'COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA' }
 *   | {
 *       evaluable: true,
 *       periodosOrdinario: Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>,
 *       periodosVidaLaboral: Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>,
 *       totalDiasCotizados: number,
 *       ventana: {desde: string, hasta: string, anioInicio: number, anioFin: number},
 *     }
 * }
 */
export function seleccionarPeriodosIBL({ historiaCotizacion, fechaCalculo }) {
  const conFechaResuelta = historiaCotizacion.map((p) => ({
    ...p,
    fechaHastaResuelta: p.fechaHasta ?? fechaCalculo,
  }))

  for (const periodo of conFechaResuelta) {
    const diasCalendario = diasCalendarioEnRango(periodo.fechaDesde, periodo.fechaHastaResuelta)
    if (periodo.diasCotizados > diasCalendario) {
      return noEvaluable('INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS')
    }
  }

  for (let i = 0; i < conFechaResuelta.length; i++) {
    for (let j = i + 1; j < conFechaResuelta.length; j++) {
      if (seSuperponen(conFechaResuelta[i], conFechaResuelta[j])) {
        return noEvaluable('PERIODOS_SUPERPUESTOS_NO_SOPORTADOS')
      }
    }
  }

  const ventana = calcularVentana(fechaCalculo)

  const enVentana = conFechaResuelta
    .map((periodo) => ({ periodo, clip: clipAVentana(periodo.fechaDesde, periodo.fechaHastaResuelta, ventana) }))
    .filter(({ clip }) => clip !== null)

  if (!cubreVentanaSinVacios(enVentana.map(({ clip }) => clip), ventana)) {
    return noEvaluable('VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS')
  }

  for (const { periodo } of enVentana) {
    const diasCalendario = diasCalendarioEnRango(periodo.fechaDesde, periodo.fechaHastaResuelta)
    if (periodo.diasCotizados !== diasCalendario) {
      return noEvaluable('COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA')
    }
  }

  const periodosOrdinario = enVentana.map(({ periodo, clip }) => ({
    fechaDesde: clip.fechaDesde,
    fechaHasta: clip.fechaHasta,
    ibc: periodo.ibc,
    // El período ya se confirmó completo (diasCotizados == días calendario de su rango
    // TOTAL) en la validación anterior — por eso el tramo recortado a la ventana también
    // está completo, y sus días cotizados son exactamente sus días calendario.
    diasCotizados: diasCalendarioEnRango(clip.fechaDesde, clip.fechaHasta),
  }))

  const periodosVidaLaboral = conFechaResuelta.map((periodo) => ({
    fechaDesde: periodo.fechaDesde,
    fechaHasta: periodo.fechaHastaResuelta,
    ibc: periodo.ibc,
    diasCotizados: periodo.diasCotizados,
  }))

  const totalDiasCotizados = conFechaResuelta.reduce((acc, periodo) => acc + periodo.diasCotizados, 0)

  return {
    evaluable: true,
    periodosOrdinario,
    periodosVidaLaboral,
    totalDiasCotizados,
    ventana,
  }
}
