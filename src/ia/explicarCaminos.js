// Orquestador cliente de S4-007 — hermano de interpretarDeclaracion.js (S4-006), sin
// filtro previo de aptitud (no hay texto libre de usuario que evaluar aquí: la entrada es
// siempre el resultado ya calculado y confiable de generarCaminosRPM.js).
//
// Alcance (decisión de producto S4-007, punto 4): solo se explican escenarios con
// estado === 'viable' — un camino 'descartado' no es una alternativa real para la persona
// (ya fue rechazado por el propio dominio, con su razonDescartado.mensaje ya redactado por
// generarCaminosRPM.js, suficiente por sí solo). Los puntos de `resultado.barrido` NUNCA se
// explican — son una curva de exploración visual, no caminos de decisión (misma decisión de
// producto). Este filtro vive aquí, una sola vez, para que ningún consumidor tenga que
// reimplementarlo.

import { construirTodosLosHechos } from '../transparency/construirHechosEscenario.js'
import { esExplicacionConsistente } from './validarConsistenciaExplicacion.js'
import { resultadoVacio, resultadoError } from './adaptadores/AdaptadorExplicacionIA.js'

/**
 * @param {Object} input
 * @param {Object} input.resultado - salida completa de generarCaminosRPM(...)
 * @param {{ declaracionLibre: string|null }} input.contexto - contexto lingüístico opcional
 *   (S4-006) — nunca reinterpretado como dato nuevo, solo texto de apoyo para la IA.
 * @param {import('./adaptadores/AdaptadorExplicacionIA.js').AdaptadorExplicacionIA} input.adaptador
 * @returns {Promise<import('./adaptadores/AdaptadorExplicacionIA.js').ResultadoExplicacion>}
 */
export async function explicarCaminos({ resultado, contexto, adaptador }) {
  const escenariosViables = (resultado?.escenarios ?? []).filter((e) => e.estado === 'viable')

  // Nada que explicar (sin escenarios viables) — resuelto localmente, el adaptador nunca
  // se invoca. No es un error: es un estado del dominio (ej. SEMANAS_INSUFICIENTES...) que
  // ya se comunica por su cuenta en la pantalla, sin necesitar IA.
  if (escenariosViables.length === 0) {
    return resultadoVacio()
  }

  const hechos = construirTodosLosHechos(escenariosViables, resultado)
  const escenarioIds = escenariosViables.map((e) => e.id)

  const bruto = await adaptador({
    // cumpleObjetivo (booleano, no un "hecho"/token — nunca se escribe como texto, solo
    // orienta si el resultado del escenario alcanza o no la meta) viaja aquí, no en
    // `hechos`: distanciaAlObjetivo siempre se envía en valor absoluto (Math.abs), así que
    // sin esta señal ni el modelo ni el simulador de desarrollo tendrían forma de saber la
    // dirección sin adivinarla — precisión de calidad 2026-08-23, encontrada al implementar
    // el ejemplo BIEN ("queda X por debajo de tu objetivo") de forma genuinamente general.
    escenarios: escenariosViables.map((e) => ({
      id: e.id,
      decision: e.decision,
      tipo: e.tipo,
      cumpleObjetivo: e.distanciaObjetivo?.cumple ?? null,
    })),
    hechos,
    contexto: {
      declaracionLibre: contexto?.declaracionLibre ?? null,
      // Cuando el objetivo es legal/estructuralmente inalcanzable (decisión de producto,
      // 2026-08-24), el modelo NUNCA recibe caminoMasAlineadoId como "posición oficial del
      // sistema" — se comporta como si no existiera selección oficial, igual que ya ocurre
      // hoy en VARIOS_CUMPLEN_FALTA_PRIORIDAD. El dato determinista sigue intacto en
      // resultado.orientacion; esto solo decide qué recibe la IA, sin tocar el schema ni el
      // contrato de explicarCaminos.
      caminoMasAlineadoId: resultado?.orientacion?.objetivoLegalmenteInalcanzable
        ? null
        : (resultado?.orientacion?.caminoMasAlineadoId ?? null),
    },
  })

  // Un fallo de transporte ya llega bien formado desde el adaptador — nada que validar
  // semánticamente (nunca hubo una respuesta del modelo que evaluar).
  if (bruto.estado === 'error_proveedor') {
    return bruto
  }

  if (!esExplicacionConsistente(bruto, hechos, escenarioIds)) {
    return resultadoError('RESPUESTA_INCONSISTENTE')
  }

  return { estado: 'generado', explicaciones: bruto.explicaciones, comparacion: bruto.comparacion, errorCodigo: null }
}
