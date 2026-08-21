// Valida la consistencia de una historia de cotización estructurada y determina si es
// evaluable para el cálculo del IBL, según los códigos de no_evaluable del diseño:
//
//   INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS  - un período declara más días cotizados que
//                                                días calendario de su propio rango.
//   PERIODOS_SUPERPUESTOS_NO_SOPORTADOS       - dos períodos comparten días calendario.
//   HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA - toda la historia declarada, sumada,
//                                                no alcanza DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS.
//   COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA - el período más antiguo que
//                                                haría falta para completar la ventana ya
//                                                era en sí mismo parcial (diasCotizados <
//                                                diasCalendarioEnRango de su propio rango)
//                                                — PensionLab no inventa cuáles días
//                                                concretos de ese período fueron cotizados.
//
// Ventana del IBL ordinario — convención técnica provisional de PensionLab (2026-08-19):
// ver src/data/legal/trazabilidad-normativa.md, sección "Convención técnica provisional —
// 3.650 días efectivamente cotizados". NO es una constante legal del Art. 21 de la Ley 100
// de 1993 — la evidencia primaria disponible (SL1006-2025) respalda esta cifra para un solo
// caso reconstruido matemáticamente, no una regla general declarada por la Corte. Revisable
// si aparece evidencia primaria adicional (criterios de reapertura documentados allí).
//
// La ventana se construye retrocediendo desde fechaAncla a través de los períodos
// declarados, acumulando sus diasCotizados (el valor observado, nunca recalculado a partir
// de fechas) hasta completar DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS. Los huecos de
// calendario entre períodos declarados no se rellenan ni bloquean — simplemente no aportan
// días y la ventana retrocede más allá de ellos. Un período con diasCotizados menor a los
// días calendario de su propio rango puede aportar su cantidad conocida de días al
// acumulado con su fechaDesde/fechaHasta declaradas tal cual — eso no es inventar
// información, es reportar la ubicación cronológica ya conocida (el rango completo) sin
// afirmar cuáles días exactos dentro de él fueron los cotizados. Solo se vuelve un
// problema cuando ese período es precisamente el que hay que recortar a una porción MÁS
// ESTRECHA que su propio rango para completar la ventana: ahí sí haría falta saber cuáles
// días concretos conservar, y esa información no existe — ver
// COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA arriba.

const MS_POR_DIA = 24 * 60 * 60 * 1000

const DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS = 3650

// Exportada a partir de S4-001 (captura de historia RPM estructurada real): segundo
// consumidor real fuera de este archivo (src/pages/HistoriaCotizacionRPM.helpers.js), para
// no reimplementar aritmética de fechas (bisiestos incluidos) en la capa de UI.
export function diasCalendarioEnRango(fechaDesde, fechaHasta) {
  const ms = new Date(fechaHasta).getTime() - new Date(fechaDesde).getTime()
  return Math.round(ms / MS_POR_DIA) + 1
}

function sumarDias(fechaISO, delta) {
  const d = new Date(fechaISO)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

// Exportada a partir de S4-002 (proyección RPM): segundo consumidor real fuera de este
// archivo (domain/pensionEngine/calcularProyeccionRPM.js), para construir la fecha de
// inicio del período futuro sintético sin reimplementar aritmética de fechas.
export function diaSiguiente(fechaISO) {
  return sumarDias(fechaISO, 1)
}

function diaAnterior(fechaISO) {
  return sumarDias(fechaISO, -1)
}

function seSuperponen(a, b) {
  return a.fechaDesde <= b.fechaHastaResuelta && b.fechaDesde <= a.fechaHastaResuelta
}

function noEvaluable(razonNoEvaluable, trazabilidadVentana) {
  return { evaluable: false, razonNoEvaluable, trazabilidadVentana }
}

/**
 * @typedef {Object} PeriodoCotizacion
 * @property {string} fechaDesde - ISO
 * @property {(string|null)} fechaHasta - ISO, o null si sigue abierto (se resuelve a fechaCalculo)
 * @property {number} ibc
 * @property {number} diasCotizados - evidencia observada, obligatoria; nunca derivada de fechas
 * @property {boolean} [esEscenarioFuturo] - Opcional, ausente en toda historia real. Uso
 *   exclusivo de domain/pensionEngine/calcularProyeccionRPM.js (S4-002): marca el período
 *   sintético que representa el escenario futuro declarado, para que ese orquestador pueda
 *   distinguirlo estructuralmente de la historia observada en la salida — nunca infiriendo
 *   el origen a partir de fechas (hallazgo de la revisión de S4-002, 2026-08-20). Ni
 *   HistoriaCotizacionRPM.helpers.js ni ningún otro consumidor de PeriodoCotizacion lo
 *   declara ni lo necesita.
 */

// Preserva esEscenarioFuturo cuando el período de entrada lo trae — nunca lo añade ni lo
// asume. Ausente en toda historia real, así que esto es un no-op para cualquier consumidor
// existente que nunca declara ese campo (calcularPensionRPM.js incluido).
function conMarcadorEscenarioFuturo(periodo) {
  return periodo.esEscenarioFuturo ? { esEscenarioFuturo: true } : {}
}

/**
 * @typedef {Object} HuecoCalendarioSaltado
 * @property {string} fechaDesde - ISO, primer día del hueco
 * @property {string} fechaHasta - ISO, último día del hueco
 * @property {number} diasCalendario - tamaño del hueco en días calendario
 */

/**
 * @typedef {Object} TrazabilidadVentana
 * @property {string} fechaAncla
 * @property {number} diasEfectivosAcumulados
 * @property {Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>} periodosUsados
 * @property {HuecoCalendarioSaltado[]} huecosCalendarioSaltados
 * @property {({fechaDesde: string, fechaHasta: string, diasCotizados: number}|null)} tramoInicialParcial - el
 *   período más antiguo usado, únicamente cuando PensionLab tuvo que recortarlo (acotarlo a
 *   una porción de su propio rango) para completar exactamente la ventana. null si el
 *   período más antiguo usado se incluyó completo tal como fue declarado.
 */

/**
 * Retrocede desde fechaAncla a través de periodos (ya resueltos, sin solapamientos ni
 * inconsistencias) acumulando diasCotizados hasta DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS.
 *
 * @param {Object} params
 * @param {Array<PeriodoCotizacion & {fechaHastaResuelta: string}>} params.periodos
 * @param {string} params.fechaAncla - ISO
 * @returns {
 *   | { completa: false, razonNoCompleta: 'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA' | 'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA', trazabilidad: TrazabilidadVentana }
 *   | { completa: true, periodosVentana: Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>, trazabilidad: TrazabilidadVentana }
 * }
 */
function seleccionarVentanaEfectivamenteCotizada({ periodos, fechaAncla }) {
  const ordenadosDesc = [...periodos].sort((a, b) =>
    a.fechaHastaResuelta < b.fechaHastaResuelta ? 1 : -1
  )

  let acumulado = 0
  const periodosUsadosDesc = []
  const huecosCalendarioSaltados = []
  let tramoInicialParcial = null
  let completa = false
  let razonNoCompleta = 'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA'

  for (const periodo of ordenadosDesc) {
    if (periodosUsadosDesc.length > 0) {
      const cursorFechaDesde = periodosUsadosDesc[periodosUsadosDesc.length - 1].fechaDesde
      if (diaSiguiente(periodo.fechaHastaResuelta) !== cursorFechaDesde) {
        const huecoFechaDesde = diaSiguiente(periodo.fechaHastaResuelta)
        const huecoFechaHasta = diaAnterior(cursorFechaDesde)
        huecosCalendarioSaltados.push({
          fechaDesde: huecoFechaDesde,
          fechaHasta: huecoFechaHasta,
          diasCalendario: diasCalendarioEnRango(huecoFechaDesde, huecoFechaHasta),
        })
      }
    }

    const restante = DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS - acumulado

    if (periodo.diasCotizados <= restante) {
      periodosUsadosDesc.push({
        fechaDesde: periodo.fechaDesde,
        fechaHasta: periodo.fechaHastaResuelta,
        ibc: periodo.ibc,
        diasCotizados: periodo.diasCotizados,
        ...conMarcadorEscenarioFuturo(periodo),
      })
      acumulado += periodo.diasCotizados
      if (acumulado === DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS) {
        completa = true
        break
      }
      continue
    }

    const diasCalendarioPropios = diasCalendarioEnRango(periodo.fechaDesde, periodo.fechaHastaResuelta)
    const periodoCompletoEnSuPropioRango = periodo.diasCotizados === diasCalendarioPropios

    if (!periodoCompletoEnSuPropioRango) {
      razonNoCompleta = 'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA'
      break
    }

    const fechaDesdeRecortada = sumarDias(periodo.fechaHastaResuelta, -(restante - 1))
    const tramo = {
      fechaDesde: fechaDesdeRecortada,
      fechaHasta: periodo.fechaHastaResuelta,
      ibc: periodo.ibc,
      diasCotizados: restante,
      ...conMarcadorEscenarioFuturo(periodo),
    }
    periodosUsadosDesc.push(tramo)
    tramoInicialParcial = { fechaDesde: tramo.fechaDesde, fechaHasta: tramo.fechaHasta, diasCotizados: tramo.diasCotizados }
    acumulado = DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS
    completa = true
    break
  }

  const periodosVentana = [...periodosUsadosDesc].reverse()
  const trazabilidad = {
    fechaAncla,
    diasEfectivosAcumulados: acumulado,
    periodosUsados: periodosVentana,
    huecosCalendarioSaltados: [...huecosCalendarioSaltados].reverse(),
    tramoInicialParcial,
  }

  if (!completa) {
    return { completa: false, razonNoCompleta, trazabilidad }
  }
  return { completa: true, periodosVentana, trazabilidad }
}

/**
 * @param {Object} params
 * @param {PeriodoCotizacion[]} params.historiaCotizacion
 * @param {string} params.fechaCalculo - ISO. Resuelve los períodos abiertos
 *   (fechaHasta: null) — siempre hoy, incluso cuando fechaAncla difiere. Un período
 *   abierto nunca se extiende hacia una fechaAncla futura: eso inventaría que un IBC
 *   actual declarado se sostiene sin cambios hasta esa fecha (ver
 *   domain/formulas/trazabilidad-formula-RPM.md, "Proyección RPM").
 * @param {string} [params.fechaAncla] - ISO, por defecto fechaCalculo (preserva sin
 *   cambios el comportamiento de S4-001B). Punto desde el que la ventana de 3.650 días
 *   retrocede — hoy para la lectura histórica, fechaReconocimiento para una proyección
 *   (S4-002, domain/pensionEngine/calcularProyeccionRPM.js).
 * @returns {
 *   | { evaluable: false, razonNoEvaluable: 'INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS' | 'PERIODOS_SUPERPUESTOS_NO_SOPORTADOS' | 'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA' | 'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA', trazabilidadVentana: TrazabilidadVentana }
 *   | {
 *       evaluable: true,
 *       periodosOrdinario: Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>,
 *       periodosVidaLaboral: Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>,
 *       totalDiasCotizados: number,
 *       trazabilidadVentana: TrazabilidadVentana,
 *     }
 * }
 */
export function seleccionarPeriodosIBL({ historiaCotizacion, fechaCalculo, fechaAncla = fechaCalculo }) {
  const conFechaResuelta = historiaCotizacion.map((p) => ({
    ...p,
    fechaHastaResuelta: p.fechaHasta ?? fechaCalculo,
  }))

  for (const periodo of conFechaResuelta) {
    const diasCalendario = diasCalendarioEnRango(periodo.fechaDesde, periodo.fechaHastaResuelta)
    if (periodo.diasCotizados > diasCalendario) {
      return noEvaluable('INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS', null)
    }
  }

  for (let i = 0; i < conFechaResuelta.length; i++) {
    for (let j = i + 1; j < conFechaResuelta.length; j++) {
      if (seSuperponen(conFechaResuelta[i], conFechaResuelta[j])) {
        return noEvaluable('PERIODOS_SUPERPUESTOS_NO_SOPORTADOS', null)
      }
    }
  }

  const resultadoVentana = seleccionarVentanaEfectivamenteCotizada({
    periodos: conFechaResuelta,
    fechaAncla,
  })

  if (!resultadoVentana.completa) {
    return noEvaluable(resultadoVentana.razonNoCompleta, resultadoVentana.trazabilidad)
  }

  const periodosVidaLaboral = conFechaResuelta.map((periodo) => ({
    fechaDesde: periodo.fechaDesde,
    fechaHasta: periodo.fechaHastaResuelta,
    ibc: periodo.ibc,
    diasCotizados: periodo.diasCotizados,
    ...conMarcadorEscenarioFuturo(periodo),
  }))

  const totalDiasCotizados = conFechaResuelta.reduce((acc, periodo) => acc + periodo.diasCotizados, 0)

  return {
    evaluable: true,
    periodosOrdinario: resultadoVentana.periodosVentana,
    periodosVidaLaboral,
    totalDiasCotizados,
    trazabilidadVentana: resultadoVentana.trazabilidad,
  }
}
