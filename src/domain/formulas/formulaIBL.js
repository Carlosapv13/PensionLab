// Fórmula matemática pura del Ingreso Base de Liquidación (IBL, Art. 21 Ley 100 de 1993).
// Recibe períodos y una tabla de IPC ya resueltos; no lee data/legal ni conoce cómo se
// seleccionaron esos períodos — esa selección (incluida la frontera de evaluabilidad para
// historias con interrupciones) vive en domain/seleccionarPeriodosIBL.js, no aquí.
//
// Ver trazabilidad-formula-IBL.md para la fórmula legal, sus fuentes y los 3 casos
// numéricos de referencia (usados en formulaIBL.test.js).

const MS_POR_DIA = 24 * 60 * 60 * 1000

function inicioDeAnioUTC(anio) {
  return Date.UTC(anio, 0, 1)
}

function finDeAnioUTC(anio) {
  return Date.UTC(anio, 11, 31)
}

/**
 * Divide un rango de fechas en tramos por año calendario, con los días calendario
 * (inclusive en ambos extremos) que caen dentro de cada año. Detalle mecánico de la
 * indexación anual (el factor de indexación solo varía por año) — no una exigencia sobre
 * el modelo de datos de entrada, que puede representar un período con cualquier duración.
 *
 * @param {string} fechaDesde - ISO
 * @param {string} fechaHasta - ISO
 * @returns {Array<{anio: number, dias: number}>}
 */
export function dividirPeriodoPorAnio(fechaDesde, fechaHasta) {
  const inicio = new Date(fechaDesde).getTime()
  const fin = new Date(fechaHasta).getTime()
  const anioInicio = new Date(fechaDesde).getUTCFullYear()
  const anioFin = new Date(fechaHasta).getUTCFullYear()

  const tramos = []
  for (let anio = anioInicio; anio <= anioFin; anio++) {
    const desdeTramo = Math.max(inicio, inicioDeAnioUTC(anio))
    const hastaTramo = Math.min(fin, finDeAnioUTC(anio))
    const dias = Math.round((hastaTramo - desdeTramo) / MS_POR_DIA) + 1
    tramos.push({ anio, dias })
  }
  return tramos
}

/**
 * @param {Object} params
 * @param {number} params.ibc
 * @param {number} params.ipcOrigen     - IPC de diciembre del año anterior al año del tramo
 * @param {number} params.ipcReferencia - IPC de diciembre del año anterior a la fecha de cálculo
 * @returns {number} IBC indexado. Sin redondear.
 */
export function indexarIBC({ ibc, ipcOrigen, ipcReferencia }) {
  return ibc * (ipcReferencia / ipcOrigen)
}

/**
 * Promedio ponderado por tiempo cotizado (diasCotizados, nunca duración calendario
 * asumida) de los IBC indexados de un conjunto de períodos ya seleccionados como
 * utilizables. Sirve tanto para el IBL ordinario (períodos de la ventana de 10 años) como
 * para el de vida laboral (todos los períodos válidos) — la diferencia entre ambos está en
 * qué períodos recibe, no en esta función.
 *
 * @param {Object} params
 * @param {Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>} params.periodos
 * @param {Record<number, number>} params.tablaIPC - IPC de diciembre por año, ya resuelto
 * @param {number} params.anioReferenciaIPC - año cuyo IPC de diciembre es el numerador (año anterior a la fecha de cálculo)
 * @returns {{
 *   promedio: number,
 *   detalle: Array<{anio: number, ibcIndexado: number, ipcOrigen: number, ipcReferencia: number, dias: number}>
 * }}
 */
export function calcularPromedioIBL({ periodos, tablaIPC, anioReferenciaIPC }) {
  const ipcReferencia = tablaIPC[anioReferenciaIPC]
  if (ipcReferencia === undefined) {
    throw new Error(`calcularPromedioIBL: falta IPC de referencia para el año ${anioReferenciaIPC}`)
  }

  let sumaPonderada = 0
  let sumaPesos = 0
  const detalle = []

  for (const periodo of periodos) {
    const tramos = dividirPeriodoPorAnio(periodo.fechaDesde, periodo.fechaHasta)
    const diasCalendarioTotales = tramos.reduce((acc, t) => acc + t.dias, 0)

    for (const tramo of tramos) {
      const anioOrigenIPC = tramo.anio - 1
      const ipcOrigen = tablaIPC[anioOrigenIPC]
      if (ipcOrigen === undefined) {
        throw new Error(`calcularPromedioIBL: falta IPC de origen para el año ${anioOrigenIPC}`)
      }

      const ibcIndexado = indexarIBC({ ibc: periodo.ibc, ipcOrigen, ipcReferencia })
      // Días cotizados atribuidos a este tramo, proporcional a la participación
      // calendario del tramo dentro del período completo — para períodos completos
      // (único caso que llega al cálculo ordinario en este Slice: diasCotizados ya es
      // igual a los días calendario de su rango) coincide exactamente con los días
      // calendario del propio tramo. Se calcula así, y no con los días calendario del
      // tramo directamente, porque diasCotizados es la evidencia observada del período
      // y no debe descartarse como irrelevante para el IBL (decisión ya cerrada del Slice).
      const peso = periodo.diasCotizados * (tramo.dias / diasCalendarioTotales)

      sumaPonderada += ibcIndexado * peso
      sumaPesos += peso
      detalle.push({ anio: tramo.anio, ibcIndexado, ipcOrigen, ipcReferencia, dias: peso })
    }
  }

  if (sumaPesos === 0) {
    throw new Error('calcularPromedioIBL: no hay períodos con días cotizados para promediar')
  }

  return {
    promedio: sumaPonderada / sumaPesos,
    detalle,
  }
}
