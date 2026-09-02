// Lógica pura de la pregunta "¿Qué situación quieres entender?" (PL-250,
// Bloque 1, primera entrega vertical) — separada de Objetivo.jsx por el
// mismo criterio ya aplicado en el resto del proyecto (ProyectaTuPensionRPM,
// HistoriaCotizacionRPM, DeclaracionLibre): la decisión de negocio debe ser
// pura y testeable sin DOM; el componente solo la consume y renderiza.
//
// Vocabulario de salida idéntico al de
// docs/producto/PL-250-borde-de-la-solucion-pensionlab.md §4-bis —
// deliberado, para que el código y el documento de alcance citen la misma
// forma: CONTINUAR_FLUJO_VEJEZ / ORIENTAR_ANTES_DE_CONTINUAR / DETENER_Y_REMITIR.
//
// Alcance de esta entrega (PL-250 Bloque 1, primera entrega vertical):
// únicamente B-01, B-02, B-03 y B-13. Régimen especial (B-04), alto riesgo
// (B-05), traslado discutido (B-10) y el mensaje de B-12 quedan
// explícitamente fuera — no se tocan `SituacionPensional.jsx`,
// `HistorialLaboral.jsx` ni `IndiciosRegimenTransicion.jsx` en esta entrega.

/** Valores posibles del campo de estado `motivoConsulta`. */
export const MOTIVO_CONSULTA = Object.freeze({
  VEJEZ: 'vejez',
  INCAPACIDAD_LABORAL: 'incapacidad_laboral',
  PROTECCION_FAMILIAR: 'proteccion_familiar',
  PENSION_YA_RECONOCIDA: 'pension_ya_reconocida',
  RECLAMO_O_PROCESO_ACTIVO: 'reclamo_o_proceso_activo',
  NO_SEGURO: 'no_seguro',
  NO_SEGURO_PERSISTE: 'no_seguro_persiste',
})

/**
 * Opciones de la pregunta inicial (PL-250 §15.1, Paso A). B-03 y B-13 son
 * opciones separadas a propósito — PL-250 v0.5 registra por qué: cada una
 * exige una remisión distinta (reliquidación de una pensión ya reconocida
 * no es lo mismo que un trámite negado o en curso), aunque ambas terminen en
 * `DETENER_Y_REMITIR`. Nunca deben fusionarse en una sola opción.
 */
export const OPCIONES_MOTIVO_CONSULTA = [
  {
    valor: MOTIVO_CONSULTA.VEJEZ,
    texto: 'Quiero entender mi futura pensión de vejez.',
  },
  {
    valor: MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
    texto: 'Quiero saber sobre una prestación por pérdida de capacidad para trabajar.',
  },
  {
    valor: MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
    texto: 'Quiero entender la protección de mi familia si llego a faltar.',
  },
  {
    valor: MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
    texto: 'Ya recibo una pensión y quiero revisarla o solicitar una reliquidación.',
  },
  {
    valor: MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
    texto: 'Me negaron la pensión o tengo una reclamación, demanda o trámite activo.',
  },
  {
    valor: MOTIVO_CONSULTA.NO_SEGURO,
    texto: 'No estoy seguro.',
  },
]

/**
 * Opciones de la aclaración única (PL-250 §4-bis, ORIENTAR_ANTES_DE_CONTINUAR):
 * las mismas cinco categorías sustantivas, con un ejemplo cotidiano cada una,
 * más el cierre explícito "sigo sin saber" — nunca se repite la opción
 * "No estoy seguro" en esta segunda vuelta.
 */
export const OPCIONES_ACLARACION_MOTIVO_CONSULTA = [
  {
    valor: MOTIVO_CONSULTA.VEJEZ,
    texto: 'Quiero saber cuánto podría recibir al cumplir la edad y el tiempo cotizado.',
  },
  {
    valor: MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
    texto: 'No puedo (o no podría) seguir trabajando por un problema de salud.',
  },
  {
    valor: MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
    texto: 'Alguien de mi familia falleció (o quiero saber qué le correspondería).',
  },
  {
    valor: MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
    texto: 'Ya recibo una pensión y quiero revisar su valor.',
  },
  {
    valor: MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
    texto: 'Ya pedí mi pensión y me la negaron, o tengo un trámite/proceso en curso.',
  },
  {
    valor: MOTIVO_CONSULTA.NO_SEGURO_PERSISTE,
    texto: 'Sigo sin saber cuál corresponde a mi caso.',
  },
]

const CASOS_DETENCION_DIRECTA = new Set([
  MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
  MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
  MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
  MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
])

/**
 * Decisión pura de alcance (PL-250 §4-bis) — se recalcula siempre desde el
 * valor vigente de `motivoConsulta`, nunca se guarda como bandera aparte,
 * para que retroceder o corregir la selección no pueda dejar un estado de
 * remisión obsoleto (mismo criterio ya usado en `App.jsx` para
 * `tienePrimeraLecturaValor`).
 *
 * @param {string | null} motivoConsulta
 * @returns {{
 *   salida: 'CONTINUAR_FLUJO_VEJEZ' | 'ORIENTAR_ANTES_DE_CONTINUAR' | 'DETENER_Y_REMITIR' | null,
 *   caso: string | null,
 * }}
 */
export function determinarSalidaMotivoConsulta(motivoConsulta) {
  if (motivoConsulta === MOTIVO_CONSULTA.VEJEZ) {
    return { salida: 'CONTINUAR_FLUJO_VEJEZ', caso: null }
  }
  if (motivoConsulta === MOTIVO_CONSULTA.NO_SEGURO) {
    return { salida: 'ORIENTAR_ANTES_DE_CONTINUAR', caso: null }
  }
  if (CASOS_DETENCION_DIRECTA.has(motivoConsulta)) {
    return { salida: 'DETENER_Y_REMITIR', caso: motivoConsulta }
  }
  if (motivoConsulta === MOTIVO_CONSULTA.NO_SEGURO_PERSISTE) {
    return { salida: 'DETENER_Y_REMITIR', caso: MOTIVO_CONSULTA.NO_SEGURO_PERSISTE }
  }
  return { salida: null, caso: null }
}

/**
 * Único punto de decisión sobre el envío de la pregunta de motivo de
 * consulta y de la aclaración única — extraída del componente para que la
 * garantía "solo CONTINUAR_FLUJO_VEJEZ invoca onContinuar" sea verificable
 * con una prueba de integración mínima (callbacks espía), sin necesitar DOM
 * ni el componente montado. Invoca exactamente una de las tres callbacks,
 * nunca más de una, nunca ninguna distinta a la que corresponde a
 * `determinarSalidaMotivoConsulta`. `onContinuar` es la prop real de
 * `Objetivo.jsx` que avanza a `DatosIniciales` — vejez confirmada la invoca
 * directamente, sin ningún paso intermedio (el Paso 2 original,
 * "¿en qué quieres que te ayudemos hoy?", se eliminó tras la auditoría de
 * producto: era una `DECISIÓN_APARENTE`, ver
 * docs/producto/PL-250-borde-de-la-solucion-pensionlab.md §20).
 *
 * @param {Object} args
 * @param {string | null} args.motivoConsulta
 * @param {() => void} args.onContinuar - exclusivo de CONTINUAR_FLUJO_VEJEZ
 * @param {() => void} args.onOrientar - exclusivo de ORIENTAR_ANTES_DE_CONTINUAR
 * @param {() => void} args.onDetener - exclusivo de DETENER_Y_REMITIR
 */
export function manejarEnvioMotivoConsulta({ motivoConsulta, onContinuar, onOrientar, onDetener }) {
  const { salida } = determinarSalidaMotivoConsulta(motivoConsulta)
  if (salida === 'CONTINUAR_FLUJO_VEJEZ') {
    onContinuar()
  } else if (salida === 'ORIENTAR_ANTES_DE_CONTINUAR') {
    onOrientar()
  } else if (salida === 'DETENER_Y_REMITIR') {
    onDetener()
  }
  // salida === null (nada seleccionado todavía): ninguna callback se invoca.
}

// "Volver a las opciones" de la ACLARACIÓN: siempre vuelve a 'motivo', sin
// tocar motivoConsulta.
export function volverALasOpciones(setPasoObjetivo) {
  setPasoObjetivo('motivo')
}

// "Volver a las opciones" de la DETENCIÓN: el destino depende de qué la
// causó. NO_SEGURO_PERSISTE vuelve a la aclaración (limpiando solo esa
// respuesta, no el "no estoy seguro" original); cualquier otro caso vuelve
// al motivo principal sin tocar nada — nunca avanza por sí sola.
export function volverDesdeDetencion({ caso, setPasoObjetivo, onCambiarMotivoConsulta }) {
  if (caso === MOTIVO_CONSULTA.NO_SEGURO_PERSISTE) {
    onCambiarMotivoConsulta(MOTIVO_CONSULTA.NO_SEGURO)
    setPasoObjetivo('aclaracion')
  } else {
    setPasoObjetivo('motivo')
  }
}

// Mensajes de remisión — cada caso nombra la situación detectada en lenguaje
// común, aclara el límite actual de PensionLab y sugiere un siguiente paso
// general, nunca una interpretación jurídica del caso concreto (PL-250 §16,
// criterio 8: "no se presenta la remisión como asesoría jurídica
// personalizada").
export const MENSAJES_DETENCION_MOTIVO_CONSULTA = {
  [MOTIVO_CONSULTA.INCAPACIDAD_LABORAL]: {
    titulo: 'Esto parece ser una prestación por pérdida de capacidad para trabajar',
    mensaje:
      'PensionLab hoy solo calcula pensión de vejez (por edad y tiempo cotizado). No evalúa la ' +
      'pérdida de capacidad para trabajar (invalidez), que tiene sus propias reglas y su propio trámite.',
    siguientePaso:
      'Te recomendamos consultar directamente con tu fondo de pensiones (Colpensiones o tu AFP) o con ' +
      'un profesional en seguridad social sobre ese trámite.',
  },
  [MOTIVO_CONSULTA.PROTECCION_FAMILIAR]: {
    titulo: 'Esto parece ser sobre la pensión de sobrevivientes',
    mensaje:
      'PensionLab hoy solo calcula pensión de vejez. No evalúa la pensión de sobrevivientes ni la ' +
      'sustitución pensional, que se activan cuando un afiliado o pensionado fallece.',
    siguientePaso:
      'Te recomendamos consultar directamente con el fondo de pensiones de la persona fallecida ' +
      '(Colpensiones o su AFP) o con un profesional en seguridad social.',
  },
  [MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA]: {
    titulo: 'Ya tienes una pensión reconocida',
    mensaje:
      'PensionLab hoy está pensado para quienes todavía no se han pensionado. No evalúa la revisión ni ' +
      'la reliquidación de una pensión que ya te reconocieron.',
    siguientePaso:
      'Te recomendamos consultar directamente con la entidad que te reconoció tu pensión (Colpensiones ' +
      'o tu fondo) sobre la revisión que buscas.',
  },
  [MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO]: {
    titulo: 'Tienes una reclamación, negación o trámite en curso',
    mensaje:
      'PensionLab hoy calcula proyecciones para quienes todavía no han iniciado un trámite formal. No ' +
      'evalúa reclamaciones, negaciones ya notificadas ni procesos administrativos o judiciales en curso.',
    siguientePaso:
      'Te recomendamos hacer seguimiento directamente con tu fondo de pensiones sobre ese trámite, o ' +
      'consultar con un profesional en seguridad social si necesitas apoyo adicional.',
  },
  [MOTIVO_CONSULTA.NO_SEGURO_PERSISTE]: {
    titulo: 'Todavía no logramos identificar tu situación',
    mensaje:
      'Sin poder identificar con claridad de qué situación se trata, PensionLab no puede calcular una ' +
      'proyección responsable.',
    siguientePaso:
      'Te recomendamos consultar directamente con tu fondo de pensiones (Colpensiones o tu AFP) para ' +
      'identificar tu caso antes de continuar.',
  },
}

export const TEXTO_NO_ES_ASESORIA_JURIDICA =
  'Esta es una orientación general, no una asesoría jurídica personalizada sobre tu caso.'
