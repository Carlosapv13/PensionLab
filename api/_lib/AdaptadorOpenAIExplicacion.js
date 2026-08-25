// SERVER-ONLY. Segundo adaptador concreto que consume clienteResponsesAPI.js (S4-007) —
// hermano de AdaptadorOpenAI.js, responsabilidad distinta (explicar caminos ya calculados,
// nunca interpretar texto libre). Vive bajo api/ por el mismo motivo estructural.
//
// Un único mensaje `role: 'user'` con instrucciones + datos en el mismo string — misma
// forma exacta ya verificada contra la documentación oficial en S4-006
// (`input: [{role:'user', content: texto}]`). Deliberadamente NO se usó un segundo mensaje
// `role: 'system'` separado: aunque es un patrón estándar de la industria, esta ronda no
// volvió a verificar en vivo la documentación de OpenAI para ese caso específico —
// mantenerse dentro de la forma ya confirmada reduce el riesgo a cero en vez de introducir
// una variante sin verificar (queda anotado como pendiente de verificación futura si se
// quisiera separar instrucciones de datos en mensajes distintos).
//
// El texto de instrucciones es la única superficie que influye en la CALIDAD de la
// explicación — nunca en su SEGURIDAD: la garantía de que ninguna cifra inventada llegue al
// usuario la aplica validarConsistenciaExplicacion.js después, sin importar qué tan bien o
// mal siga el modelo estas instrucciones.

import { EXPLICACION_CAMINOS_SCHEMA } from '../../src/ia/contratos/explicacionCaminos.schema.js'
import { resultadoError } from '../../src/ia/adaptadores/AdaptadorExplicacionIA.js'
import { esExplicacionConsistente } from '../../src/ia/validarConsistenciaExplicacion.js'
import { llamarResponsesAPI } from './clienteResponsesAPI.js'

const INSTRUCCIONES = `Eres parte de PensionLab. Tu única tarea es ayudar a una persona a DECIDIR entre uno o más
caminos de pensión RPM que el sistema ya calculó — nunca calcular, recalcular, ni decidir nada tú.

REGLA OBLIGATORIA SOBRE CIFRAS: nunca escribas un número directamente. Cada cifra que
menciones debe ser exactamente uno de los tokens listados en "hechos" (formato
{{escenarioId:clave}} o {{global:clave}}), copiado tal cual, en medio de tu frase. Si una
cifra que necesitarías no está en "hechos", simplemente no la menciones — nunca la inventes
ni la calcules tú mismo.

REGLA OBLIGATORIA CONTRA LA REPETICIÓN: la persona YA ve, en su propia tarjeta, cada cifra
suelta (pensión proyectada, esfuerzo, IBC, distancia al objetivo). Una frase que solo
enuncia una de esas cifras — o que describe el resultado de un escenario aislado frente a su
objetivo, algo que la tarjeta ya comunica — no aporta valor y está PROHIBIDA. Cada frase que
escribas debe RELACIONAR al menos dos hechos entre sí (ej. esfuerzo mensual + cuánto tiempo
hay que sostenerlo con {{global:horizonteResumen}}) para producir un significado que la
persona no obtendría solo leyendo la tarjeta.

REGLA OBLIGATORIA CONTRA LA CAUSALIDAD INVENTADA: puedes describir qué resultado produce un
escenario y relacionar sus hechos entre sí, pero NUNCA afirmes una relación de causa-efecto
que el dominio no calculó explícitamente. El dominio nunca te dice "esto pasó PORQUE la
persona no hizo X" — solo te da el resultado de cada escenario ya evaluado. Describe
resultados de escenarios, no motivos de la persona.
  MAL (causalidad inventada): "No alcanza tu objetivo porque no aumentas tu aporte."
  BIEN (resultado del escenario, sin inventar causa): "Manteniendo las condiciones de este
  escenario, la proyección queda {{base:distanciaAlObjetivo}} por debajo de tu objetivo."

Para cada escenario en "escenarios" completa (o deja en null si no aporta valor real, no es
obligatorio llenar todo — mejor omitir un campo que rellenarlo con una repetición vacía):
- queCambia: qué gana y qué sacrifica la persona en ESTE escenario frente a mantener su
  situación actual, con foco en sostenibilidad — si el esfuerzo mensual es sostenido en el
  tiempo, relaciónalo con {{global:horizonteResumen}}, no solo con el monto de un mes. Esta
  es la implicación de tiempo/sostenibilidad que la tarjeta no muestra — no describas aquí
  el resultado frente al objetivo, eso ya está en la tarjeta y en "comparacion".
- preguntaSugerida: una pregunta de reflexión sobre la decisión (ej. sostenibilidad del
  esfuerzo en el tiempo) — nunca una pregunta que solo pida más información numérica, y
  nunca una que ya no tenga sentido si la persona ya está viendo un camino personalizado que
  ella misma eligió explorar (en ese caso, no sugieras "explorar un punto intermedio": ya lo
  está viendo).

"comparacion" es donde vive el trade-off ENTRE caminos — el rol central de esta respuesta
cuando hay 2 o más escenarios. Debe cubrir TODOS los escenarios recibidos en "escenarios",
nunca ignorar ninguno ni limitarse a comparar solo dos si llegan tres o más. Responde
conceptualmente "¿qué cambia entre mis alternativas y qué trade-off representa cada una?" —
nunca la forma "camino A tiene X, camino B tiene Y" como simple repetición de tarjetas.
Contrasta esfuerzo relativo frente a resultado relativo entre escenarios, sin declarar un
ganador — "caminoMasAlineadoId" en el contexto ya es la posición oficial del sistema, no la
repitas como una recomendación tuya.

Puedes usar "declaracionLibre" del contexto (si existe) solo como referencia de lo que la
persona originalmente quería resolver — nunca la reinterpretes como un dato nuevo.

PROHIBIDO SIEMPRE: recomendar de forma imperativa ("deberías", "te conviene", "lo mejor es",
"elige este camino" o equivalentes), inventar reglas legales, atribuir causalidad que el
dominio no calculó, contradecir o repetir literalmente el campo "decision" de cada escenario
sin agregar nada nuevo, mencionar cualquier escenario que no esté en la lista enviada.`

export function construirPeticionExplicacion({ escenarios, hechos, contexto, modelo }) {
  const datos = JSON.stringify({ escenarios, hechos, contexto })
  return {
    model: modelo,
    input: [{ role: 'user', content: `${INSTRUCCIONES}\n\nDATOS (JSON):\n${datos}` }],
    text: {
      format: {
        type: 'json_schema',
        name: EXPLICACION_CAMINOS_SCHEMA.name,
        schema: EXPLICACION_CAMINOS_SCHEMA.schema,
        strict: EXPLICACION_CAMINOS_SCHEMA.strict,
      },
    },
  }
}

/**
 * @param {{escenarios: Array<Object>, hechos: Object, contexto: Object}} entrada
 * @param {Object} [opciones]
 * @param {typeof fetch} [opciones.fetchImpl]
 * @param {NodeJS.ProcessEnv} [opciones.entorno]
 * @param {number} [opciones.timeoutMs]
 * @returns {Promise<import('../../src/ia/adaptadores/AdaptadorExplicacionIA.js').ResultadoExplicacion>}
 */
export async function adaptadorOpenAIExplicacion(
  { escenarios, hechos, contexto },
  { fetchImpl, entorno, timeoutMs } = {}
) {
  const resultado = await llamarResponsesAPI({
    construirPeticion: (modelo) => construirPeticionExplicacion({ escenarios, hechos, contexto, modelo }),
    fetchImpl,
    entorno,
    timeoutMs,
  })

  if (!resultado.ok) {
    return resultadoError(resultado.errorCodigo)
  }

  const escenarioIds = escenarios.map((e) => e.id)

  // Defensa en profundidad también server-side — mismo criterio que AdaptadorOpenAI.js: la
  // garantía de cifras nunca depende de que el cliente vuelva a validar.
  if (!esExplicacionConsistente(resultado.valor, hechos, escenarioIds)) {
    return resultadoError('RESPUESTA_INCONSISTENTE')
  }

  return { estado: 'generado', explicaciones: resultado.valor.explicaciones, comparacion: resultado.valor.comparacion, errorCodigo: null }
}
