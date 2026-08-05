// Tercera evidencia real y ejecutable de PensionLab: un screening preliminar de
// posibles indicios de régimen de transición (Art. 36 Ley 100 de 1993), evaluado
// únicamente por la vía de edad al momento de entrada en vigencia del Sistema
// General de Pensiones (1994-04-01).
//
// Deliberadamente NO es un "Motor de Evidencias" genérico — mismo criterio que
// evidenciaSemanasMinimas.js y evidenciaEdadPension.js: archivo único, sin
// abstracción compartida todavía (Principio 9).
//
// Autónoma: valida su propia fecha de nacimiento (formato, fecha real, no futura)
// sin asumir que la interfaz ya lo hizo, y sin importar nada de pages/.
//
// Deliberadamente NO concluye. Ningún estado de esta función puede leerse como
// "tienes" o "no tienes" régimen de transición — solo si existen o no indicios,
// por una única vía, que ameriten revisión posterior. La vía de tiempo de
// servicio (15 años) y la vigencia posterior del régimen (Acto Legislativo 01 de
// 2005) quedan explícitamente fuera de cálculo, declaradas como limitaciones
// permanentes en cada resultado evaluable — ver trazabilidad-normativa.md para la
// investigación normativa completa y la razón de este alcance.

import { obtenerFechaEntradaVigenciaSistema, obtenerEdadTransicion } from '../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Validación propia de fecha ISO real — implementación independiente, no
// importada de evidenciaEdadPension.js (mismo criterio de independencia entre
// evidencias ya aplicado en el proyecto).
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
      codigo: 'REGIMEN_TRANSICION_TIEMPO_SERVICIO_NO_EVALUADO',
      mensaje:
        'Esta lectura solo revisa tu edad al 1 de abril de 1994. Todavía no evalúa ' +
        'la otra vía que contempla la ley (15 años o más de tiempo de servicio a esa ' +
        'fecha) — es un cálculo que depende de tu historia laboral completa, y lo ' +
        'construiremos en una etapa posterior.',
    },
    {
      codigo: 'REGIMEN_TRANSICION_VIGENCIA_NO_EVALUADA',
      mensaje:
        'Aunque haya indicios por edad, el régimen de transición tuvo una fecha ' +
        'límite de vigencia (2010 o 2014, según el caso) y esta lectura no evalúa si ' +
        'alcanzaste a cumplir sus requisitos antes de esa fecha. Es una expectativa ' +
        'legítima, no una determinación de derecho.',
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
 * @param {string} input.fechaNacimiento - ISO YYYY-MM-DD
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   estado: 'con_indicios' | 'sin_indicios' | 'no_evaluable',
 *   razonNoEvaluable: 'sexo_no_valido' | 'fecha_nacimiento_invalida' | null,
 *   fechaEvaluacion: string,
 *   edadA1994: number | null,
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
export function evaluarIndiciosTransicion({ sexo, fechaNacimiento, fecha = hoyISO() }) {
  function noEvaluable(razonNoEvaluable) {
    return {
      estado: 'no_evaluable',
      razonNoEvaluable,
      fechaEvaluacion: fecha,
      edadA1994: null,
      normaUsada: null,
      limitaciones: [],
    }
  }

  if (sexo !== 'Mujer' && sexo !== 'Hombre') {
    return noEvaluable('sexo_no_valido')
  }
  if (!esFechaISOReal(fechaNacimiento) || fechaNacimiento > fecha) {
    return noEvaluable('fecha_nacimiento_invalida')
  }

  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'
  const fechaVigenciaSistema = obtenerFechaEntradaVigenciaSistema(fecha)
  const umbral = obtenerEdadTransicion(fecha, sexoResuelto)
  const edadA1994 = calcularEdadCumplida(fechaNacimiento, fechaVigenciaSistema.valor)

  const normaUsada = {
    id: umbral.id,
    fuente: umbral.fuente,
    articulo: umbral.articulo,
    estado: umbral.estado,
    listoParaProduccion: umbral.listoParaProduccion,
    vigenciaDesde: umbral.vigenciaDesde,
    vigenciaHasta: umbral.vigenciaHasta,
  }

  return {
    estado: edadA1994 >= umbral.valor ? 'con_indicios' : 'sin_indicios',
    razonNoEvaluable: null,
    fechaEvaluacion: fecha,
    edadA1994,
    normaUsada,
    limitaciones: construirLimitaciones(normaUsada),
  }
}
