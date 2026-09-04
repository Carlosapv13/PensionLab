// E2 (Slice "separación entre elegibilidad proyectada y cuantía económica") — Contrato B
// del plan PL-260. Responde EXCLUSIVAMENTE "¿existe información suficiente para estimar
// cuánto recibiría?", interpretando el resultado ya producido por calcularProyeccionRPM.js
// — nunca lo recalcula ni lo vuelve a invocar (Principio 11: quien ya resolvió un valor no
// se vuelve a resolver).
//
// Alcance de E2, deliberadamente acotado (ver docs/producto/PL-260-...): NO agrega ningún
// método de captura nuevo (nada de importación, nada de dato agregado como sustituto del
// IBL, nada de estimación consentida) — usa únicamente las fuentes que calcularProyeccionRPM.js
// ya acepta hoy (historiaCotizacion + el tramo futuro sintético). El estado
// 'CUANTIA_APROXIMABLE_BAJO_DATOS_DECLARADOS' existe en el contrato porque el plan PL-260
// ya lo definió como parte de la arquitectura en etapas, pero esta implementación nunca lo
// produce — queda documentado como no alcanzable en este Slice, no como una rama muerta por
// descuido.

const DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS = 3650

const ACCION_COMPLETAR_HISTORIA = {
  codigo: 'COMPLETAR_HISTORIA_COTIZACION',
  mensaje:
    'Para calcular esta cifra necesitamos completar una parte de tu historia de cotización — con la ' +
    'información disponible no alcanza a cubrir el ingreso base de liquidación que exige la fórmula legal.',
}

// Razones de no_evaluable de calcularProyeccionRPM.js que sí implican, específicamente,
// "falta historia" — las únicas dos donde tiene sentido ofrecer la acción de completarla.
const RAZONES_VENTANA_INCOMPLETA = new Set([
  'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA',
  'COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA',
])

const RAZONES_MENSAJE = {
  HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA:
    'Todavía necesitamos completar una parte de tu historia de cotización para calcular tu ingreso base de liquidación.',
  COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA:
    'El período más antiguo que haría falta para completar tu ventana de cálculo está declarado solo parcialmente — no podemos saber qué días concretos de ese período usar.',
  COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO:
    'Falta información de índices de precios (IPC) para indexar correctamente parte de tu historia — no es algo que puedas completar tú, es un dato pendiente de PensionLab.',
  PERIODOS_SUPERPUESTOS_NO_SOPORTADOS: 'Dos períodos de tu historia de cotización se superponen en el tiempo — revisa las fechas declaradas.',
  INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS: 'Un período de tu historia declara más días cotizados que días calendario en su propio rango — revisa ese período.',
  HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO: 'Un período de tu historia está fechado en el futuro respecto a hoy — revisa esa fecha.',
  IBC_FUTURO_NO_VALIDO: 'Todavía falta un ingreso base de cotización futuro válido para simular.',
  EDAD_JUBILACION_NO_DECLARADA: 'Todavía falta declarar la edad hasta la que quieres explorar.',
  FECHA_NACIMIENTO_NO_VALIDA: 'Todavía falta una fecha de nacimiento válida.',
  EDAD_JUBILACION_NO_POSTERIOR_A_HOY: 'La edad que elegiste explorar ya se cumplió — elige una fecha futura.',
}

/**
 * @param {Object} resultadoProyeccion - salida completa de calcularProyeccionRPM(...), sin
 *   transformar (mismo objeto que generarCaminosRPM.js ya obtuvo).
 * @param {Object} [contexto]
 * @param {Array<Object>} [contexto.historiaCotizacion] - el mismo array ya pasado a
 *   calcularProyeccionRPM — solo para describir fuentesDePeriodos/procedencia, nunca
 *   releído para recalcular nada.
 * @returns {{
 *   estado: ('CUANTIA_CALCULABLE'|'CUANTIA_APROXIMABLE_BAJO_DATOS_DECLARADOS'|'CUANTIA_NO_CALCULABLE_TODAVIA'),
 *   diasIBLCubiertos: number|null,
 *   diasIBLFaltantes: number|null,
 *   fuentesDePeriodos: string[],
 *   procedencia: string,
 *   razon: string|null,
 *   accionNecesaria: {codigo: string, mensaje: string}|null,
 * }}
 */
export function evaluarDisponibilidadCuantiaRPM(resultadoProyeccion, { historiaCotizacion = [] } = {}) {
  const tieneHistoria = historiaCotizacion.length > 0
  const fuentesDePeriodos = tieneHistoria ? ['historia_estructurada'] : []

  if (resultadoProyeccion.estado === 'calculado') {
    const diasCubiertos = resultadoProyeccion.trazabilidadVentana?.diasEfectivosAcumulados ?? DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS
    return {
      estado: 'CUANTIA_CALCULABLE',
      diasIBLCubiertos: diasCubiertos,
      diasIBLFaltantes: Math.max(0, DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS - diasCubiertos),
      fuentesDePeriodos: tieneHistoria ? fuentesDePeriodos : ['continuidad_futura_sintetica'],
      procedencia: tieneHistoria ? 'historia_estructurada' : 'continuidad_futura_unicamente',
      razon: null,
      accionNecesaria: null,
    }
  }

  const razonNoEvaluable = resultadoProyeccion.razonNoEvaluable
  const trazabilidadVentana = resultadoProyeccion.trazabilidadVentana ?? null
  const diasCubiertos = trazabilidadVentana?.diasEfectivosAcumulados ?? null

  return {
    estado: 'CUANTIA_NO_CALCULABLE_TODAVIA',
    diasIBLCubiertos: diasCubiertos,
    diasIBLFaltantes: diasCubiertos !== null ? DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS - diasCubiertos : null,
    fuentesDePeriodos,
    procedencia: tieneHistoria ? 'historia_estructurada' : 'sin_historia_declarada',
    razon: RAZONES_MENSAJE[razonNoEvaluable] ?? 'No fue posible calcular tu ingreso base de liquidación con los datos actuales.',
    accionNecesaria: RAZONES_VENTANA_INCOMPLETA.has(razonNoEvaluable) ? ACCION_COMPLETAR_HISTORIA : null,
  }
}
