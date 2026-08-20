// Sexta función de dominio de PensionLab, del mismo tipo `evaluar*` (evidenciaSemanasMinimas.js,
// evidenciaEdadPension.js, evidenciaIndiciosTransicion.js): produce un JUICIO comparando un dato
// declarado por la persona contra un umbral legal — nunca un cálculo, nunca una decisión.
//
// Hallazgo que origina este archivo (revisión manual de S4-001, Entregable 2): `calcularPensionRPM.js`
// deriva `semanasObservadas` exclusivamente de `historiaCotizacion` (evidencia estructurada) — nunca
// de `semanasCotizadas`/`nivelConocimientoSemanas`, ya declarados antes en el mismo expediente
// (InformacionPensionalEsencial.jsx). Si el usuario declara solo una parte de su historia, el motor
// nunca intenta la alternativa de vida laboral (Art. 21, inciso 2, Ley 100 de 1993) en silencio,
// aunque el usuario ya haya declarado semanas suficientes en otra pantalla.
//
// Esta función NO resuelve esa confusión sustituyendo un dato por otro — Principio de Arquitectura
// 11 exige que el dominio siga confiando exclusivamente en la historia estructurada para calcular.
// Solo produce un INDICIO, deliberadamente con vocabulario distinto al de evidencia verificada
// (nunca 'cumple'/'no_cumple', como sí usa evidenciaSemanasMinimas.js): 'indicio_probable' /
// 'sin_indicio_suficiente' / 'no_evaluable'. Un dato declarado por debajo del umbral nunca se
// transforma semánticamente en una afirmación probabilística sobre la elegibilidad real —
// 'sin_indicio_suficiente' describe la falta de indicio, no una conclusión negativa (decisión
// explícita Carlos/Atlas al aprobar este archivo).
//
// Autónoma: valida sus propias entradas sin asumir que la interfaz ya lo hizo (Principio 11),
// mismo criterio que las tres evidencias anteriores.

import { obtenerSemanasHabilitanAlternativaIBL } from '../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// Misma validación que evidenciaSemanasMinimas.js — implementación independiente, no importada,
// mismo criterio de independencia entre evidencias ya aplicado en el proyecto.
function validarSemanas(valor) {
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
      codigo: 'INDICIO_NO_ES_EVIDENCIA_VERIFICADA',
      mensaje:
        'Este indicio se basa en las semanas que declaraste antes, no en tu historia de cotización ' +
        'estructurada — por sí solo no confirma ni descarta la alternativa de vida laboral.',
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
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {('conocido'|'aproximado'|'desconocido'|null)} input.nivelConocimientoSemanas
 * @param {string} input.semanasCotizadas
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   estado: 'indicio_probable' | 'sin_indicio_suficiente' | 'no_evaluable',
 *   razonNoEvaluable: 'regimen_no_rpm' | 'regimen_desconocido' | 'semanas_desconocidas' | 'semanas_invalidas' | null,
 *   fechaEvaluacion: string,
 *   umbral: number | null,
 *   semanasDeclaradas: number | null,
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
export function evaluarIndicioVidaLaboral({
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  fecha = hoyISO(),
}) {
  function noEvaluable(razonNoEvaluable) {
    return {
      estado: 'no_evaluable',
      razonNoEvaluable,
      fechaEvaluacion: fecha,
      umbral: null,
      semanasDeclaradas: null,
      certezaSemanas: null,
      normaUsada: null,
      limitaciones: [],
    }
  }

  if (regimenActual === 'RAIS') {
    return noEvaluable('regimen_no_rpm')
  }
  if (regimenActual !== 'RPM') {
    return noEvaluable('regimen_desconocido')
  }

  const certezaSemanasValida =
    nivelConocimientoSemanas === 'conocido' || nivelConocimientoSemanas === 'aproximado'
      ? nivelConocimientoSemanas
      : null
  if (certezaSemanasValida === null) {
    return noEvaluable('semanas_desconocidas')
  }

  const semanasDeclaradasValidas = validarSemanas(semanasCotizadas)
  if (semanasDeclaradasValidas === null) {
    return noEvaluable('semanas_invalidas')
  }

  const resuelto = obtenerSemanasHabilitanAlternativaIBL(fecha)
  const umbral = resuelto.valor

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
    estado: semanasDeclaradasValidas >= umbral ? 'indicio_probable' : 'sin_indicio_suficiente',
    razonNoEvaluable: null,
    fechaEvaluacion: fecha,
    umbral,
    semanasDeclaradas: semanasDeclaradasValidas,
    certezaSemanas: certezaSemanasValida,
    normaUsada,
    limitaciones: construirLimitaciones(normaUsada),
  }
}
