// SERVER-ONLY. Único archivo (junto a AdaptadorOpenAIExplicacion.js, S4-007) que conoce el
// schema de interpretación y lo combina con la mecánica de transporte genérica. Vive bajo
// api/ (nunca bajo src/) para que sea estructuralmente imposible que Vite lo incluya en el
// bundle del navegador — verificado tras el build.
//
// Refactor S4-007 (2026-08-23): la mecánica de transporte (config, fetch+timeout, mapeo de
// errores HTTP, extracción de salida estructurada) se extrajo a clienteResponsesAPI.js —
// su segundo consumidor real es AdaptadorOpenAIExplicacion.js. Este archivo conserva
// exactamente el mismo comportamiento observable de antes (mismo test suite, sin
// modificar): solo construye la petición específica de interpretación
// (construirPeticionOpenAI) y aplica la validación semántica específica de interpretación
// (esInterpretacionConsistente) alrededor de esa mecánica compartida. `leerConfiguracion` y
// `extraerSalidaEstructurada` se re-exportan tal cual desde clienteResponsesAPI.js — este
// archivo ya no las define, pero sigue siendo el punto desde el que se importan (sin romper
// ningún consumidor ni test existente).

import { INTERPRETACION_DECLARACION_SCHEMA } from '../../src/ia/contratos/interpretacionDeclaracion.schema.js'
import { resultadoError } from '../../src/ia/adaptadores/AdaptadorInterpretacionIA.js'
import { esInterpretacionConsistente } from '../../src/ia/validarConsistenciaInterpretacion.js'
import { llamarResponsesAPI, leerConfiguracion, extraerSalidaEstructurada } from './clienteResponsesAPI.js'

export { leerConfiguracion, extraerSalidaEstructurada }

export function construirPeticionOpenAI({ texto, modelo }) {
  return {
    model: modelo,
    input: [{ role: 'user', content: texto }],
    text: {
      format: {
        type: 'json_schema',
        name: INTERPRETACION_DECLARACION_SCHEMA.name,
        schema: INTERPRETACION_DECLARACION_SCHEMA.schema,
        strict: INTERPRETACION_DECLARACION_SCHEMA.strict,
      },
    },
  }
}

/**
 * @param {{texto: string}} entrada
 * @param {Object} [opciones]
 * @param {typeof fetch} [opciones.fetchImpl]
 * @param {NodeJS.ProcessEnv} [opciones.entorno]
 * @param {number} [opciones.timeoutMs]
 * @returns {Promise<import('../../src/ia/adaptadores/AdaptadorInterpretacionIA.js').ResultadoInterpretacion>}
 */
export async function adaptadorOpenAI({ texto }, { fetchImpl, entorno, timeoutMs } = {}) {
  const resultado = await llamarResponsesAPI({
    construirPeticion: (modelo) => construirPeticionOpenAI({ texto, modelo }),
    fetchImpl,
    entorno,
    timeoutMs,
  })

  if (!resultado.ok) {
    return resultadoError(resultado.errorCodigo)
  }

  // Defensa en profundidad también server-side (Principio 11): nunca se reenvía al
  // cliente un payload schema-válido pero semánticamente incoherente, aunque el cliente
  // vuelva a validarlo de todas formas — dos capas independientes, ninguna confía en que
  // la otra ya lo hizo.
  if (!esInterpretacionConsistente(resultado.valor)) {
    return resultadoError('RESPUESTA_INCONSISTENTE')
  }

  return resultado.valor
}
