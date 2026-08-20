// Funciones puras para capturar una fecha como tres campos separados
// (día/mes/año) en vez de un selector nativo — mismo criterio de UX ya
// usado originalmente en DatosIniciales.jsx (evitar navegar muchos años
// atrás con un <input type="date">).
//
// Extraídas de DatosIniciales.jsx en dos etapas:
//   - S4-001 (Entregable 2): copia deliberada, sin tocar DatosIniciales.jsx
//     todavía — duplicación temporal, a propósito.
//   - Revisión final de S4-001: adoptadas como estándar permanente de
//     captura de fechas en PensionLab (decisión Carlos/Atlas): "toda fecha
//     que PensionLab solicite debe usar el mismo patrón de interacción y
//     comportamiento que la fecha de nacimiento, salvo razón funcional
//     explícita y documentada para apartarse". DatosIniciales.jsx ya
//     consume este módulo (ver src/components/CampoFechaDiaMesAnio.jsx),
//     la duplicación quedó resuelta.
//
// Deliberadamente NO incluye: el buffer de dígitos para escribir el mes por
// teclado (vive en CampoFechaDiaMesAnio.jsx, es interacción, no lógica pura),
// ni ninguna regla de negocio (edad, fecha futura, orden desde/hasta — cada
// pantalla que consume este módulo o el componente sigue siendo responsable
// de sus propias validaciones de negocio sobre el valor ISO que recibe).

export const MESES = [
  { valor: '01', texto: 'Enero' },
  { valor: '02', texto: 'Febrero' },
  { valor: '03', texto: 'Marzo' },
  { valor: '04', texto: 'Abril' },
  { valor: '05', texto: 'Mayo' },
  { valor: '06', texto: 'Junio' },
  { valor: '07', texto: 'Julio' },
  { valor: '08', texto: 'Agosto' },
  { valor: '09', texto: 'Septiembre' },
  { valor: '10', texto: 'Octubre' },
  { valor: '11', texto: 'Noviembre' },
  { valor: '12', texto: 'Diciembre' },
]

function pad2(valor) {
  return String(valor).padStart(2, '0')
}

/**
 * @param {string} dia - sin ceros a la izquierda obligatorios (ej. '7' o '07')
 * @param {string} mes - '01'..'12'
 * @param {string} anio - exactamente 4 dígitos
 * @returns {string} fecha ISO ('' si los tres campos no están completos)
 */
export function construirFechaISO(dia, mes, anio) {
  if (!dia || !mes || anio.length !== 4) return ''
  return `${anio}-${mes}-${pad2(dia)}`
}

/**
 * @param {string} fecha - ISO YYYY-MM-DD
 * @returns {{dia: string, mes: string, anio: string}}
 */
export function parsearFechaISO(fecha) {
  if (!fecha) return { dia: '', mes: '', anio: '' }
  const [anio, mes, dia] = fecha.split('-')
  return { dia: String(Number(dia)), mes, anio }
}

/**
 * Confirma que una fecha ISO representa una fecha calendario real (rechaza,
 * ej., '2023-02-30' aunque Date la reinterprete silenciosamente como marzo).
 *
 * @param {string} fecha - ISO YYYY-MM-DD
 * @returns {boolean}
 */
export function esFechaDiaMesAnioReal(fecha) {
  if (!fecha) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaObj = new Date(`${fecha}T00:00:00`)
  return (
    !Number.isNaN(fechaObj.getTime()) &&
    fechaObj.getFullYear() === anio &&
    fechaObj.getMonth() + 1 === mes &&
    fechaObj.getDate() === dia
  )
}

/**
 * @param {string} mesStr - '01'..'12', o '' si todavía no se eligió
 * @param {string} anioStr - 4 dígitos, o '' si todavía no está completo
 * @returns {number} días máximos del mes (permisivo — usa un año bisiesto de
 *   referencia mientras el año todavía no está completo, mismo criterio que
 *   DatosIniciales.jsx)
 */
export function diasMaximosEnMes(mesStr, anioStr) {
  if (!mesStr) return 31
  const mesNum = Number(mesStr)
  const anioReferencia = anioStr && anioStr.length === 4 ? Number(anioStr) : 2000
  return new Date(Date.UTC(anioReferencia, mesNum, 0)).getUTCDate()
}

/**
 * Mensaje específico cuando el día no es válido para el mes/año ya elegidos (ej. "31 de
 * abril"). Puramente estructural — nunca valida negocio (edad, fecha futura, orden
 * desde/hasta); eso sigue siendo responsabilidad de cada pantalla, no de este módulo.
 *
 * @param {string} diaStr
 * @param {string} mesStr
 * @param {string} anioStr
 * @returns {string | null}
 */
export function mensajeErrorDiaEnMes(diaStr, mesStr, anioStr) {
  if (!diaStr) return null
  const dia = Number(diaStr)
  if (dia < 1 || dia > 31) return 'Ingresa un día entre 1 y 31.'

  const maximo = diasMaximosEnMes(mesStr, anioStr)
  if (dia <= maximo) return null

  if (mesStr === '02' && anioStr && anioStr.length === 4) {
    return `Febrero de ${anioStr} tiene máximo ${maximo} días.`
  }
  const nombreMes = mesStr ? MESES.find((m) => m.valor === mesStr)?.texto : null
  return nombreMes ? `${nombreMes} tiene máximo ${maximo} días.` : 'Ingresa un día entre 1 y 31.'
}
