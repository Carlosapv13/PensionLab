// Construcción DETERMINÍSTICA del texto que ve el usuario a partir de un
// ResultadoInterpretacion — corrección B (2026-08-21): el Structured Output es la única
// fuente de verdad, PensionLab es dueño exclusivo de la redacción. Esta función nunca lee
// ni reproduce texto libre del modelo (el schema ya no lo produce — ver
// interpretacionDeclaracion.schema.js), solo compone frases fijas, ya redactadas, a partir
// de estado/campos/razonCodigo/errorCodigo — mismo patrón ya usado en todo el dominio para
// codigo→mensaje (RAZON_SIN_MARGEN_TOPE_LEGAL, razonDescartado, etc.).
//
// Presentación pura, sin estado, sin red — mismo criterio que formatearPesos.js,
// textoHorizonte, textoDistancia.

import { formatearPesos } from '../format/formatearDinero.js'
import { CAMPOS_INTERPRETABLES } from './contratos/interpretacionDeclaracion.schema.js'
import { SIN_DECLARACION, TEXTO_DESCARTADO_COMO_RUIDO } from './interpretarDeclaracion.js'

const ETIQUETA_CAMPO = {
  objetivoPensionMensual: 'Objetivo de pensión mensual',
  restriccionCostoPensionalAdicionalMaximoMensual: 'Límite de aporte adicional mensual',
  edadJubilacionDeseada: 'Edad de jubilación deseada',
}

function valorLegible(campo, valorObjeto) {
  if (campo === 'edadJubilacionDeseada') return `${valorObjeto.valorAnios} años`
  return formatearPesos(valorObjeto.valorCOP)
}

// Mensajes que PensionLab redacta para cada razón que el modelo puede declarar (nunca el
// modelo mismo) — RAZONES_CODIGO_MODELO de interpretacionDeclaracion.schema.js.
const MENSAJE_RAZON_MODELO = {
  SIN_INFORMACION_CUANTIFICABLE:
    'Entendimos tu mensaje, pero no encontramos ninguna cifra ni edad que podamos usar. Puedes ' +
    'reescribirlo con más detalle o completar el formulario manualmente.',
  MULTIPLES_LECTURAS_POSIBLES:
    'Tu mensaje admite más de una interpretación para algunos datos, así que no los completamos ' +
    'por ti. Puedes reescribirlo con más precisión o completar el formulario manualmente.',
  SIN_MATERIA_PENSIONAL: 'No identificamos ningún asunto pensional en lo que escribiste.',
}

// Mensajes para las razones que decide el filtro previo determinista
// (interpretarDeclaracion.js) — nunca llegan a evaluarse por el modelo.
const MENSAJE_RAZON_FILTRO_PREVIO = {
  [SIN_DECLARACION]: 'Todavía no escribiste nada que podamos interpretar.',
  [TEXTO_DESCARTADO_COMO_RUIDO]:
    'Lo que escribiste no parece contener una declaración suficientemente sustantiva. Puedes volver ' +
    'y contárnoslo con tus propias palabras.',
}

// Mensajes para fallos de transporte (AdaptadorInterpretacionIA.js, ERRORES_ADAPTADOR) —
// deliberadamente neutrales, nunca exponen detalles internos del proveedor.
const MENSAJE_ERROR = {
  TIMEOUT: 'La interpretación tardó demasiado y no pudimos completarla. Puedes intentarlo de nuevo o continuar manualmente.',
  ERROR_RED: 'No pudimos conectarnos para interpretar tu texto en este momento. Puedes intentarlo de nuevo o continuar manualmente.',
  RESPUESTA_INVALIDA: 'No pudimos interpretar tu texto en este momento. Puedes intentarlo de nuevo o continuar manualmente.',
  RESPUESTA_INCONSISTENTE:
    'No pudimos interpretar tu texto con suficiente certeza. Puedes intentarlo de nuevo o continuar manualmente.',
  RECHAZADO_POR_PROVEEDOR: 'No pudimos procesar tu texto en este momento. Puedes intentarlo de nuevo o continuar manualmente.',
  CONFIGURACION_SERVIDOR_INCOMPLETA:
    'La interpretación automática no está disponible en este momento. Puedes continuar completando el formulario manualmente.',
}

/**
 * @param {import('./adaptadores/AdaptadorInterpretacionIA.js').ResultadoInterpretacion} resultado
 * @returns {{
 *   resumen: string,
 *   camposParaMostrar: Array<{campo: string, etiqueta: string, valor: (number|null), presente: boolean}>,
 *   mensaje: string | null,
 * }}
 */
export function construirTextoConfirmacion(resultado) {
  const { estado, campos, razonCodigo, errorCodigo } = resultado

  const camposParaMostrar = CAMPOS_INTERPRETABLES.map((campo) => {
    const valorObjeto = campos[campo]
    return {
      campo,
      etiqueta: ETIQUETA_CAMPO[campo],
      valor: valorObjeto ? (campo === 'edadJubilacionDeseada' ? valorObjeto.valorAnios : valorObjeto.valorCOP) : null,
      presente: valorObjeto !== null,
    }
  })

  if (estado === 'interpretado') {
    const presentes = camposParaMostrar.filter((c) => c.presente)
    const resumen =
      presentes.length === 1
        ? `Entendimos lo siguiente en tu mensaje: ${presentes[0].etiqueta.toLowerCase()} — ${valorLegible(presentes[0].campo, campos[presentes[0].campo])}.`
        : `Entendimos lo siguiente en tu mensaje: ${presentes
            .map((c) => `${c.etiqueta.toLowerCase()} (${valorLegible(c.campo, campos[c.campo])})`)
            .join(', ')}.`
    return { resumen, camposParaMostrar, mensaje: null }
  }

  if (estado === 'error_proveedor') {
    return {
      resumen: 'No pudimos interpretar tu mensaje automáticamente.',
      camposParaMostrar,
      mensaje: MENSAJE_ERROR[errorCodigo] ?? MENSAJE_ERROR.RESPUESTA_INVALIDA,
    }
  }

  // insuficiente / ambiguo / no_pertinente
  return {
    resumen: 'No pudimos completar ningún dato a partir de tu mensaje.',
    camposParaMostrar,
    mensaje: MENSAJE_RAZON_FILTRO_PREVIO[razonCodigo] ?? MENSAJE_RAZON_MODELO[razonCodigo] ?? MENSAJE_ERROR.RESPUESTA_INVALIDA,
  }
}
