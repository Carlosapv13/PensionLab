// Primera evidencia real y ejecutable de PensionLab: compara las semanas cotizadas
// declaradas por la persona contra el requisito legal general de semanas mínimas para
// pensión de vejez en RPM. Es deliberadamente un archivo único, sin un "Motor de
// Evidencias" genérico alrededor — ese nombre y esa abstracción se reservan hasta que
// exista un segundo caso real que la justifique (Principio 9).
//
// Esta función es autónoma: no asume que la interfaz ya validó correctamente sus datos
// de entrada. Valida por sí misma el formato de las semanas cotizadas antes de calcular
// nada, y nunca descarta información válida (ej. la certeza declarada por la persona)
// solo porque otra parte de la evaluación no pudo completarse.

import { obtenerSemanasMinimas } from '../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Valida que `valor` represente un entero no negativo y finito. Devuelve el número ya
 * parseado, o `null` si no cumple alguna de las condiciones — nunca lanza, nunca asume.
 *
 * @param {string} valor
 * @returns {number | null}
 */
export function validarSemanas(valor) {
  if (valor === '' || valor === null || valor === undefined) return null

  const numero = Number(valor)

  if (!Number.isFinite(numero)) return null
  if (!Number.isInteger(numero)) return null
  if (numero < 0) return null

  return numero
}

function construirLimitaciones(normaUsada) {
  const limitaciones = [
    {
      codigo: 'REGIMEN_TRANSICION_NO_EVALUADO',
      mensaje:
        'Esta lectura utiliza el requisito general de semanas. Todavía no evalúa ' +
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
 * @param {('conocido'|'aproximado'|'desconocido'|null)} input.nivelConocimientoSemanas
 * @param {string} input.semanasCotizadas
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   estado: 'cumple' | 'no_cumple' | 'no_evaluable',
 *   razonNoEvaluable:
 *     | 'regimen_no_rpm'
 *     | 'regimen_desconocido'
 *     | 'semanas_desconocidas'
 *     | 'semanas_invalidas'
 *     | 'sexo_no_valido'
 *     | null,
 *   fechaEvaluacion: string,
 *   semanasMinimas: number | null,
 *   semanasDeclaradas: number | null,
 *   semanasFaltantes: number | null,
 *   semanasExcedentes: number | null,
 *   certezaSemanas: 'conocido' | 'aproximado' | null,
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
export function evaluarSemanasMinimas({
  sexo,
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  fecha = hoyISO(),
}) {
  // Estas dos piezas se validan de forma independiente al resto del flujo: describen lo
  // que la persona declaró sobre sus semanas, y siguen siendo información válida aunque
  // la evaluación completa no pueda realizarse por otra razón (ej. régimen desconocido).
  const certezaSemanasValida =
    nivelConocimientoSemanas === 'conocido' || nivelConocimientoSemanas === 'aproximado'
      ? nivelConocimientoSemanas
      : null
  const semanasDeclaradasValidas =
    certezaSemanasValida !== null ? validarSemanas(semanasCotizadas) : null

  function noEvaluable(razonNoEvaluable) {
    return {
      estado: 'no_evaluable',
      razonNoEvaluable,
      fechaEvaluacion: fecha,
      semanasMinimas: null,
      semanasDeclaradas: semanasDeclaradasValidas,
      semanasFaltantes: null,
      semanasExcedentes: null,
      certezaSemanas: certezaSemanasValida,
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
  if (certezaSemanasValida === null) {
    return noEvaluable('semanas_desconocidas')
  }
  if (semanasDeclaradasValidas === null) {
    return noEvaluable('semanas_invalidas')
  }

  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'
  const resuelto = obtenerSemanasMinimas(fecha, sexoResuelto, 'RPM')

  const semanasMinimas = resuelto.valor
  const semanasDeclaradas = semanasDeclaradasValidas
  const semanasFaltantes = Math.max(semanasMinimas - semanasDeclaradas, 0)
  const semanasExcedentes = Math.max(semanasDeclaradas - semanasMinimas, 0)

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
    estado: semanasDeclaradas >= semanasMinimas ? 'cumple' : 'no_cumple',
    razonNoEvaluable: null,
    fechaEvaluacion: fecha,
    semanasMinimas,
    semanasDeclaradas,
    semanasFaltantes,
    semanasExcedentes,
    certezaSemanas: certezaSemanasValida,
    normaUsada,
    limitaciones: construirLimitaciones(normaUsada),
  }
}
