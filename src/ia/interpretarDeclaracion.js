// Orquestador cliente de S4-006 — el único punto que decide SI se invoca un adaptador de
// interpretación IA, y normaliza lo que devuelve a ResultadoInterpretacion.
//
// Opción 2 aprobada (2026-08-21): evaluarAptitud.js (Capacidad de reconocimiento, ya
// cerrada y probada) actúa como filtro determinista previo, gratuito y sin red — solo
// texto que ya pasa esa evaluación como 'indeterminado' llega a invocar el adaptador
// inyectado. Un texto 'no_apto' (ruido/relleno) NUNCA dispara ninguna llamada, ni siquiera
// al adaptador simulado en producción — se resuelve enteramente aquí. Esto es
// deliberadamente el mismo mecanismo ya cerrado, sin adquirir ninguna responsabilidad
// semántica nueva: evaluarAptitud.js no cambia, no se le agrega ningún estado nuevo.
//
// Después de invocar el adaptador, cualquier resultado que no sea ya un error de
// transporte (estado !== 'error_proveedor') pasa por validarConsistenciaInterpretacion —
// una respuesta schema-válida pero semánticamente incoherente se descarta por completo,
// nunca se usa parcialmente.

import { evaluarDeclaracion } from '../domain/reconocimiento/evaluarDeclaracion.js'
import { esInterpretacionConsistente } from './validarConsistenciaInterpretacion.js'
import { camposVacios, resultadoError } from './adaptadores/AdaptadorInterpretacionIA.js'

// Códigos de razón que decide el filtro previo determinista — nunca el modelo, nunca
// viajan por interpretacionDeclaracion.schema.js (ni se envían ni se reciben de OpenAI).
export const SIN_DECLARACION = 'SIN_DECLARACION'
export const TEXTO_DESCARTADO_COMO_RUIDO = 'TEXTO_DESCARTADO_COMO_RUIDO'

function resultadoLocal(razonCodigo) {
  return { estado: 'insuficiente', campos: camposVacios(), camposAmbiguos: [], razonCodigo }
}

/**
 * @param {Object} input
 * @param {{tipo: 'contenido', texto: string} | {tipo: 'ausencia'} | null | undefined} input.declaracion
 * @param {import('./adaptadores/AdaptadorInterpretacionIA.js').AdaptadorInterpretacionIA} input.adaptador -
 *   inyectado por el caller: AdaptadorViaServidor.js en producción, AdaptadorSimulado.js en
 *   tests/dev. Nunca importado por nombre de proveedor concreto en este archivo.
 * @returns {Promise<import('./adaptadores/AdaptadorInterpretacionIA.js').ResultadoInterpretacion>}
 */
export async function interpretarDeclaracion({ declaracion, adaptador }) {
  const evaluado = evaluarDeclaracion(declaracion)

  // declaracionOriginal === null: entrada no reconocida (Principio 11, ver
  // evaluarDeclaracion.js) — nada que interpretar, el adaptador nunca se invoca.
  if (evaluado.declaracionOriginal === null) {
    return resultadoLocal(SIN_DECLARACION)
  }

  // 'ausencia': la persona ya declaró que no tiene nada puntual — nada que interpretar.
  if (evaluado.declaracionOriginal.tipo === 'ausencia') {
    return resultadoLocal(SIN_DECLARACION)
  }

  // Filtro previo determinista (Opción 2) — evaluarAptitud.js decide esto, no este
  // archivo. 'no_apto': el adaptador NUNCA se invoca.
  if (evaluado.aptitud.estado === 'no_apto') {
    return resultadoLocal(TEXTO_DESCARTADO_COMO_RUIDO)
  }

  // 'indeterminado': único caso donde vale la pena invocar el adaptador inyectado.
  const bruto = await adaptador({ texto: evaluado.declaracionOriginal.texto })

  // Un fallo de transporte ya llega bien formado desde el adaptador — nada que validar
  // semánticamente (nunca hubo una respuesta del modelo que evaluar).
  if (bruto.estado === 'error_proveedor') {
    return bruto
  }

  if (!esInterpretacionConsistente(bruto)) {
    return resultadoError('RESPUESTA_INCONSISTENTE')
  }

  return bruto
}
