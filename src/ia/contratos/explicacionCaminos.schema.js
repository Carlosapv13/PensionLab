// Contrato Structured Output de la explicación IA de caminos RPM (S4-007). Única fuente
// del schema — la usa api/_lib/AdaptadorOpenAIExplicacion.js (server-only) para construir
// el request a la Responses API, y este mismo módulo la usa para validar su propia forma
// en test. Mismo patrón que interpretacionDeclaracion.schema.js (S4-006).
//
// Microdiseño de la garantía de cifras (decisión de producto S4-007, 2026-08-23): el riesgo
// a resolver era que "el modelo nunca escribe números" (S4-006) tiende a una plantilla
// rígida de etiquetas, mientras que prosa completamente libre puede inventar/alterar una
// cifra. La solución adoptada: el modelo SÍ escribe prosa libre y natural en cada campo,
// pero toda cifra debe expresarse como un token `{{escenarioId:clave}}` o `{{global:clave}}`
// — nunca como un dígito literal. `construirHechosEscenario.js` es la única fuente de qué
// claves existen y su valor ya formateado; `validarConsistenciaExplicacion.js` rechaza
// cualquier token desconocido y cualquier dígito suelto fuera de un token (regex de defensa
// en profundidad — ver ese archivo); `construirTextoExplicacion.js` sustituye cada token
// válido por el valor exacto del diccionario, nunca por lo que el modelo haya escrito. El
// modelo controla la prosa; el sistema controla cada cifra que esa prosa muestra.
//
// CERO texto libre sin restricción de contenido más allá de esa regla de tokens — igual que
// S4-006, PensionLab sigue siendo dueño de cómo se compone el texto final (construirTextoExplicacion.js
// hace la sustitución, nunca se muestra la respuesta cruda del modelo).

// Los campos que la IA puede completar por escenario — ambos opcionales (pueden venir
// null): "no es obligatorio que todos los elementos aparezcan siempre" (decisión de
// producto). Cada uno puede contener tokens {{...}}, nunca dígitos sueltos.
//
// Reducido de 4 a 2 campos (decisión de producto, 2026-08-24 — "compactar Entender este
// camino"): la tarjeta ya muestra esfuerzo/IBC/pensión/distancia al objetivo — un texto que
// solo repite esas mismas cifras con más palabras (antes: queRepresenta, porQueAlcanzaONo)
// no aporta valor y se retiró del contrato visible. Lo que queda es exactamente lo que la
// tarjeta NO dice: la implicación de sostenibilidad en el tiempo (queCambia) y una pregunta
// que ayude a decidir (preguntaSugerida). El rol de "qué resultado da cada camino frente al
// objetivo, comparado" pasa a vivir en `comparacion` — el único lugar que ya compara caminos
// entre sí en vez de describir uno aislado (ver adaptadorExplicacionDesarrollo.js).
export const CAMPOS_EXPLICACION_POR_ESCENARIO = ['queCambia', 'preguntaSugerida']

function campoTextoConTokens() {
  return { type: ['string', 'null'] }
}

// Propiedades del objeto por escenario, derivadas de CAMPOS_EXPLICACION_POR_ESCENARIO —
// nunca una segunda lista hardcodeada de nombres de campo. Con OpenAI Structured Outputs en
// modo strict, `required` debe listar EXACTAMENTE las mismas claves que `properties`
// (nulidad expresa la opcionalidad, no la ausencia de la clave) — una propiedad definida
// aquí que faltara en CAMPOS_EXPLICACION_POR_ESCENARIO (o viceversa) produciría un schema
// inválido para la API real, no solo un desajuste cosmético.
const PROPIEDADES_POR_ESCENARIO = Object.fromEntries(
  CAMPOS_EXPLICACION_POR_ESCENARIO.map((campo) => [campo, campoTextoConTokens()])
)

export const EXPLICACION_CAMINOS_SCHEMA = {
  name: 'explicacion_caminos_rpm',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['explicaciones', 'comparacion'],
    properties: {
      explicaciones: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['escenarioId', ...CAMPOS_EXPLICACION_POR_ESCENARIO],
          properties: {
            escenarioId: { type: 'string' },
            ...PROPIEDADES_POR_ESCENARIO,
          },
        },
      },
      // Solo tiene sentido con ≥2 escenarios viables — null en cualquier otro caso, nunca
      // una comparación inventada sobre un único camino.
      comparacion: campoTextoConTokens(),
    },
  },
}
