// Segunda evidencia real y ejecutable de PensionLab: compara la edad cumplida
// de la persona contra el requisito legal general de edad de pensión de
// vejez en RPM. Igual que evidenciaSemanasMinimas.js, es un archivo único,
// sin un "Motor de Evidencias" genérico alrededor — con dos casos reales ya
// existentes, la generalización se evalúa después de comparar ambos
// contratos en código, no antes (Principio 9).
//
// Autónoma: valida su propia fecha de nacimiento (formato, fecha real, no
// futura) sin asumir que la interfaz ya lo hizo, y sin importar nada de
// pages/ — un componente de domain/ nunca depende de la capa de UI
// (Principio 11). La decisión de si el requisito de edad resuelto por
// obtenerEdadPension aplica al régimen del caso vive aquí, no en el
// resolver: obtenerEdadPension solo responde qué dice la norma.

import { obtenerEdadPension } from '../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Validación propia de fecha ISO real — implementación independiente, no
// importada de DatosIniciales.jsx.
function esFechaISOReal(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaObj = new Date(`${fecha}T00:00:00Z`)
  return (
    !Number.isNaN(fechaObj.getTime()) &&
    fechaObj.getUTCFullYear() === anio &&
    fechaObj.getUTCMonth() + 1 === mes &&
    fechaObj.getUTCDate() === dia
  )
}

function calcularEdadCumplida(fechaNacimientoISO, fechaReferenciaISO) {
  const [anioNac, mesNac, diaNac] = fechaNacimientoISO.split('-').map(Number)
  const [anioRef, mesRef, diaRef] = fechaReferenciaISO.split('-').map(Number)
  let edad = anioRef - anioNac
  if (mesRef < mesNac || (mesRef === mesNac && diaRef < diaNac)) edad -= 1
  return edad
}

function construirLimitaciones(normaUsada) {
  const limitaciones = [
    {
      codigo: 'REGIMEN_TRANSICION_NO_EVALUADO',
      mensaje:
        'Esta lectura utiliza el requisito general de edad. Todavía no evalúa ' +
        'si en tu caso aplica alguna regla de transición, un régimen anterior o ' +
        'una condición especial que pueda modificar este requisito.',
    },
  ]

  if (normaUsada.estado !== 'publicado' || !normaUsada.listoParaProduccion) {
    limitaciones.push({
      codigo: 'FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION',
      mensaje: 'La fuente legal utilizada está marcada como borrador y no lista para producción.',
    })
  }

  return limitaciones
}

/**
 * @param {Object} input
 * @param {('Mujer'|'Hombre')} input.sexo
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {string} input.fechaNacimiento - ISO YYYY-MM-DD
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   estado: 'cumple' | 'no_cumple' | 'no_evaluable',
 *   razonNoEvaluable:
 *     | 'regimen_no_rpm'
 *     | 'regimen_desconocido'
 *     | 'sexo_no_valido'
 *     | 'fecha_nacimiento_invalida'
 *     | null,
 *   fechaEvaluacion: string,
 *   edadRequerida: number | null,
 *   edadActual: number | null,
 *   aniosFaltantes: number | null,
 *   aniosExcedentes: number | null,
 *   normaUsada: {
 *     id: string,
 *     fuente: string,
 *     articulo: string,
 *     estado: string,
 *     listoParaProduccion: boolean,
 *     vigenciaDesde: string | null,
 *     vigenciaHasta: string | null,
 *   } | null,
 *   limitaciones: Array<{ codigo: string, mensaje: string }>,
 * }}
 */
export function evaluarEdadPension({ sexo, regimenActual, fechaNacimiento, fecha = hoyISO() }) {
  function noEvaluable(razonNoEvaluable) {
    return {
      estado: 'no_evaluable',
      razonNoEvaluable,
      fechaEvaluacion: fecha,
      edadRequerida: null,
      edadActual: null,
      aniosFaltantes: null,
      aniosExcedentes: null,
      normaUsada: null,
      limitaciones: [],
    }
  }

  if (sexo !== 'Mujer' && sexo !== 'Hombre') {
    return noEvaluable('sexo_no_valido')
  }
  if (regimenActual === 'RAIS') {
    return noEvaluable('regimen_no_rpm')
  }
  if (regimenActual !== 'RPM') {
    return noEvaluable('regimen_desconocido')
  }
  if (!esFechaISOReal(fechaNacimiento) || fechaNacimiento > fecha) {
    return noEvaluable('fecha_nacimiento_invalida')
  }

  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'
  const resuelto = obtenerEdadPension(fecha, sexoResuelto)

  const edadRequerida = resuelto.valor
  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)
  const aniosFaltantes = Math.max(edadRequerida - edadActual, 0)
  const aniosExcedentes = Math.max(edadActual - edadRequerida, 0)

  const normaUsada = {
    id: resuelto.id,
    fuente: resuelto.fuente,
    articulo: resuelto.articulo,
    estado: resuelto.estado,
    listoParaProduccion: resuelto.listoParaProduccion,
    vigenciaDesde: resuelto.vigenciaDesde,
    vigenciaHasta: resuelto.vigenciaHasta,
  }

  return {
    estado: edadActual >= edadRequerida ? 'cumple' : 'no_cumple',
    razonNoEvaluable: null,
    fechaEvaluacion: fecha,
    edadRequerida,
    edadActual,
    aniosFaltantes,
    aniosExcedentes,
    normaUsada,
    limitaciones: construirLimitaciones(normaUsada),
  }
}
