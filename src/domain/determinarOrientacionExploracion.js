// Interpreta el resultado YA calculado por generarCaminosRPM.js para decidir
// determinísticamente qué situación existe y qué exploraciones tienen sentido ofrecer a
// continuación — nunca calcula pensión, nunca aplica una regla legal, solo lee hechos ya
// resueltos por dominio (distanciaObjetivo.cumple, objetivoLegalmenteInalcanzable,
// orientacion.codigo, limitaciones). Vive en la raíz de domain/, no en pensionEngine/ —
// mismo criterio que determinarCamposFaltantesObjetivoRPM.js: interpreta datos ya
// validados, no calcula ni aplica fórmula, decide qué mostrar/ofrecer a continuación.
//
// Deliberadamente NO devuelve texto de interfaz — el copy visible vive en
// ProyectaTuPensionRPM.helpers.js#textoOrientacion (decisión de producto, 2026-08-24): quien
// redacta el lenguaje de PensionLab debe poder cambiarlo sin tocar esta función, ni releer
// esta lógica para saber qué dice cada estado. El contrato es exclusivamente
// {codigo, acciones}, ambos códigos estables, nunca prosa.
//
// Deliberadamente NO usa caminoMasAlineadoId: es una señal más débil (solo cercanía
// matemática) que las que sí usa esta función — cumple/no cumple, existencia de caminos,
// objetivoLegalmenteInalcanzable, la limitación explícita RESTRICCION_COSTO_LIMITA_RESULTADO
// y la pluralidad de caminos que cumplen. "Matemáticamente más cercano" sigue siendo
// información distinta de "qué tiene sentido explorar" (diagnóstico de producto,
// 2026-08-24).
//
// `acciones` solo contiene códigos que hoy tienen un control real en ProyectaTuPensionRPM.jsx
// — AJUSTAR_DATOS_BASE (el único formulario combinado de edad/objetivo/restricción,
// setMostrarFormulario(true)) y EXPLORAR_ESFUERZO_PERSONALIZADO (manejarAbrirExploracionEsfuerzo).
// Nunca un código que la UI actual no pueda ejecutar limpiamente.

const CODIGO_RESTRICCION_COSTO_LIMITA_RESULTADO = 'RESTRICCION_COSTO_LIMITA_RESULTADO'

function tieneLimitacion(escenario, codigo) {
  return escenario?.limitaciones?.some((l) => l.codigo === codigo) ?? false
}

/**
 * @param {Object|null} resultado - salida completa de generarCaminosRPM(...), o null si
 *   todavía no hay datos suficientes para calcular caminos.
 * @returns {{
 *   codigo: 'HOY_YA_ALCANZA_OBJETIVO' | 'OBJETIVO_LEGALMENTE_INALCANZABLE' |
 *     'VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD' | 'ELECCION_YA_ALCANZA_OBJETIVO' |
 *     'ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE' | 'RESTRICCION_COSTO_IMPIDE_OBJETIVO' |
 *     'SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE',
 *   acciones: Array<{codigo: 'AJUSTAR_DATOS_BASE' | 'EXPLORAR_ESFUERZO_PERSONALIZADO'}>,
 * } | null} null cuando no existe orientación útil que mostrar (sin resultado, sin
 *   escenarios, o SIN_CAMINOS_VIABLES — esos casos ya tienen su propia comunicación en
 *   pantalla, esta función no la duplica).
 */
export function determinarOrientacionExploracion(resultado) {
  if (!resultado || !Array.isArray(resultado.escenarios) || resultado.escenarios.length === 0) return null
  if (resultado.orientacion?.codigo === 'SIN_CAMINOS_VIABLES') return null

  const base = resultado.escenarios.find((e) => e.id === 'base')
  if (!base || base.estado !== 'viable') return null // defensivo — no debería ocurrir si hay escenarios

  if (base.distanciaObjetivo.cumple) {
    return { codigo: 'HOY_YA_ALCANZA_OBJETIVO', acciones: [] }
  }

  if (resultado.orientacion?.objetivoLegalmenteInalcanzable) {
    return { codigo: 'OBJETIVO_LEGALMENTE_INALCANZABLE', acciones: [{ codigo: 'AJUSTAR_DATOS_BASE' }] }
  }

  if (resultado.orientacion?.codigo === 'VARIOS_CUMPLEN_FALTA_PRIORIDAD') {
    return { codigo: 'VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD', acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }] }
  }

  const personalizado = resultado.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
  const alternativo = resultado.escenarios.find((e) => e.id === 'aumentar-ibc-futuro')
  const personalizadoViable = personalizado?.estado === 'viable' ? personalizado : null
  const alternativoViable = alternativo?.estado === 'viable' ? alternativo : null

  if (personalizadoViable?.distanciaObjetivo.cumple) {
    return { codigo: 'ELECCION_YA_ALCANZA_OBJETIVO', acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }] }
  }

  if (personalizadoViable && alternativoViable?.distanciaObjetivo.cumple) {
    return { codigo: 'ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE', acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }] }
  }

  // Señal semántica explícita del propio dominio como criterio principal (decisión de
  // producto, 2026-08-24) — nunca se infiere solo de "alternativo viable y no cumple", aunque
  // hoy, por construcción de generarCaminosRPM.js, esa combinación solo puede darse por esta
  // causa (un alternativo viable sin restricción vinculante siempre encuentra un IBC que
  // cumple). Si algún día esa garantía cambiara, esta función seguiría siendo correcta.
  if (alternativoViable && tieneLimitacion(alternativoViable, CODIGO_RESTRICCION_COSTO_LIMITA_RESULTADO)) {
    return { codigo: 'RESTRICCION_COSTO_IMPIDE_OBJETIVO', acciones: [{ codigo: 'AJUSTAR_DATOS_BASE' }] }
  }

  if (!personalizadoViable && alternativoViable?.distanciaObjetivo.cumple) {
    return { codigo: 'SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE', acciones: [{ codigo: 'EXPLORAR_ESFUERZO_PERSONALIZADO' }] }
  }

  return null
}
