// Contrato Structured Output de la interpretación IA de la declaración libre (S4-006).
// Única fuente del schema — la usa api/_lib/AdaptadorOpenAI.js (server-only) para construir
// el request a la Responses API, y este mismo módulo la usa para validar su propia forma en
// test. src/ no la envía nunca a ningún sitio: el cliente nunca habla con OpenAI (ver
// AdaptadorViaServidor.js).
//
// Diseño aprobado (corrección B, 2026-08-21): CERO texto libre. El modelo solo puede
// devolver números, un enum de estado, y códigos cerrados — nunca prosa que llegue al
// usuario tal cual. PensionLab es dueño exclusivo del texto que ve la persona
// (construirTextoConfirmacion.js). Esto reduce al mínimo posible la superficie de salida no
// controlada del proveedor.

// Los tres únicos campos que el dominio ya sabe consumir hoy (S4-003) — nunca un campo
// nuevo que domain/ no entienda, ver §6 del Entregable 2 ("Frontera IA↔dominio
// determinista").
export const CAMPOS_INTERPRETABLES = [
  'objetivoPensionMensual',
  'restriccionCostoPensionalAdicionalMaximoMensual',
  'edadJubilacionDeseada',
]

export const ESTADOS_INTERPRETACION = ['interpretado', 'insuficiente', 'ambiguo', 'no_pertinente']

// Códigos que el MODELO puede producir — distintos de los códigos que el filtro previo
// determinista (evaluarAptitud.js) o los errores de transporte pueden producir (ver
// interpretarDeclaracion.js) — esos nunca viajan por este schema porque nunca llegan a
// evaluarse por el modelo.
export const RAZONES_CODIGO_MODELO = [
  'SIN_INFORMACION_CUANTIFICABLE',
  'MULTIPLES_LECTURAS_POSIBLES',
  'SIN_MATERIA_PENSIONAL',
]

function schemaCampoMonetario() {
  return {
    type: ['object', 'null'],
    additionalProperties: false,
    required: ['valorCOP'],
    properties: { valorCOP: { type: 'number' } },
  }
}

export const INTERPRETACION_DECLARACION_SCHEMA = {
  name: 'interpretacion_declaracion_pensional',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['estado', 'campos', 'camposAmbiguos', 'razonCodigo'],
    properties: {
      estado: { type: 'string', enum: ESTADOS_INTERPRETACION },
      campos: {
        type: 'object',
        additionalProperties: false,
        required: [...CAMPOS_INTERPRETABLES],
        properties: {
          objetivoPensionMensual: schemaCampoMonetario(),
          restriccionCostoPensionalAdicionalMaximoMensual: schemaCampoMonetario(),
          edadJubilacionDeseada: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['valorAnios'],
            properties: { valorAnios: { type: 'integer' } },
          },
        },
      },
      camposAmbiguos: {
        type: 'array',
        items: { type: 'string', enum: CAMPOS_INTERPRETABLES },
      },
      razonCodigo: {
        type: ['string', 'null'],
        enum: [...RAZONES_CODIGO_MODELO, null],
      },
    },
  },
}
