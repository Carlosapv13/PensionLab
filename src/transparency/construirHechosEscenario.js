// Fuente única de verdad de los "hechos" (cifras ya calculadas por generarCaminosRPM.js,
// ya formateadas exactamente como el usuario ya las ve en la tarjeta) que la explicación IA
// de S4-007 puede referenciar — nunca recalcular, nunca reformatear distinto de lo visible.
//
// Microdiseño de la garantía de cifras (S4-007, 2026-08-23): el modelo NUNCA escribe un
// número directamente en su prosa. Solo puede insertar un token `{{escenarioId:clave}}`
// (o `{{global:clave}}` para hechos compartidos entre todos los escenarios del mismo
// resultado) en medio de una frase libre. Este mismo diccionario se usa dos veces con el
// mismo origen exacto:
//   1. Al construir la petición al modelo — se le informa qué claves existen y su valor
//      YA formateado, nunca se le pide que calcule ni que formatee nada.
//   2. Al validar/sustituir la respuesta (validarConsistenciaExplicacion.js /
//      construirTextoExplicacion.js) — cualquier token que no exista aquí se rechaza; todo
//      token que sí exista se sustituye por EXACTAMENTE este mismo valor, carácter por
//      carácter, nunca por lo que el modelo haya escrito.
// Que ambos usos lean del mismo diccionario, construido una sola vez por escenario, es lo
// que hace estructuralmente imposible que "lo que se le dijo al modelo que existe" y "lo
// que se sustituye en su respuesta" diverjan.
//
// Deliberadamente NO incluye códigos/ids/enums de dominio (ej. escenario.id,
// razonDescartado.codigo) — esos nunca se re-redactan por IA, siguen siendo texto ya
// aprobado por dominio (decision, limitaciones[].mensaje, razonDescartado.mensaje).

import { formatearPesos } from '../format/formatearDinero.js'
import { formatearDuracionCalendario } from '../format/formatearDuracionCalendario.js'

/**
 * Hechos propios de un único escenario 'viable' (nunca 'descartado' — ver explicarCaminos.js
 * para el filtro de alcance, decisión de producto S4-007 punto 4: solo caminos que
 * representan una alternativa real).
 *
 * @param {Object} escenario - un elemento de generarCaminosRPM(...).escenarios, estado === 'viable'
 * @returns {Record<string, string>} clave → valor ya formateado, listo para mostrarse tal cual
 */
export function construirHechosEscenario(escenario) {
  const hechos = {
    pensionProyectada: formatearPesos(escenario.resultado.valor),
    ibcActual: formatearPesos(escenario.esfuerzo.ibcActual),
    ibcPropuesto: formatearPesos(escenario.esfuerzo.ibcPropuesto),
    aumentoIBC: formatearPesos(escenario.esfuerzo.aumentoIBC),
    costoPensionalAdicionalMensual: formatearPesos(escenario.esfuerzo.costoPensionalAdicionalMensual),
    edadExploracion: `${escenario.entradas.edadJubilacionDeseada} años`,
    tasaReemplazo: `${escenario.tasaReemplazo.toFixed(2)}%`,
  }

  // distanciaObjetivo siempre existe en un escenario viable (construirCamino() lo llena
  // siempre) — igualmente defendido por si acaso, mismo criterio de Principio 11 que el
  // resto del proyecto.
  if (escenario.distanciaObjetivo) {
    hechos.objetivoDeclarado = formatearPesos(escenario.distanciaObjetivo.valorObjetivo)
    hechos.distanciaAlObjetivo = formatearPesos(Math.abs(escenario.distanciaObjetivo.delta))
  }

  return hechos
}

/**
 * Hechos compartidos por TODOS los escenarios del mismo resultado (namespace 'global') —
 * nunca duplicados por escenario, para que no puedan divergir entre uno y otro dentro de la
 * misma respuesta.
 *
 * @param {Object} resultado - salida completa de generarCaminosRPM(...)
 * @returns {Record<string, string>}
 */
export function construirHechosGlobales(resultado) {
  const hechos = {}
  if (resultado.horizonte) {
    hechos.diasHorizonte = String(resultado.horizonte.diasCotizados)
    // Reutiliza formatearDuracionCalendario.js tal cual — mismo formateador que
    // ProyectaTuPensionRPM.jsx ya usa (textoHorizonte, visible en "Horizonte de esta
    // proyección"). Ningún cálculo nuevo: es el mismo diasCotizados de arriba, en unidades
    // legibles. Precisión de calidad S4-007 (2026-08-23): "durante 730 días" es torpe en
    // una frase de sostenibilidad; "durante 1 año y 11 meses" no.
    hechos.horizonteResumen = formatearDuracionCalendario(resultado.horizonte.fechaInicio, resultado.horizonte.fechaFin)
  }
  return hechos
}

/**
 * @param {Array<Object>} escenariosViables
 * @param {Object} resultado
 * @returns {{ porEscenario: Record<string, Record<string,string>>, global: Record<string,string> }}
 */
export function construirTodosLosHechos(escenariosViables, resultado) {
  const porEscenario = {}
  for (const escenario of escenariosViables) {
    porEscenario[escenario.id] = construirHechosEscenario(escenario)
  }
  return { porEscenario, global: construirHechosGlobales(resultado) }
}
