// Revisión técnica previa a este archivo (precisión de producto S4-006, 2026-08-23): no
// existe hoy ningún módulo dedicado a "qué campos faltan" para la capacidad objetivo/
// restricción RPM. El único lugar que ya conoce esos requisitos es generarCaminosRPM.js,
// como guard clauses inline ("--- Datos imprescindibles ---"): exige objetivoValorMensual
// > 0 y edadJubilacionDeseada numérico; restriccionCostoPensionalAdicionalMaximoMensual es
// explícitamente opcional (default null, nunca bloquea — así lo confirma también su propio
// input "(opcional)" en ProyectaTuPensionRPM.jsx).
//
// No se invoca generarCaminosRPM aquí como oráculo: esa función exige además sexo,
// ibcAplicableSimulacion e historiaCotizacion — datos que DeclaracionLibre.jsx no captura
// ni le corresponde validar. Acoplar "qué falta pedir en esta pantalla" a una función que
// exige mucho más que eso rompería la frontera IA↔dominio (§6 del Entregable 2: la IA/esta
// capa no decide qué necesita el motor completo, solo qué falta de SU propio alcance).
//
// Refactor 2026-08-23 (diagnóstico arquitectónico previo a ese cambio): los predicados
// numéricos en sí —no la lista de campos, no ningún otro requisito— se extrajeron a
// requisitosDatosImprescindiblesRPM.js (domain/pensionEngine/), única fuente de verdad
// compartida con generarCaminosRPM.js. Sexo, IBC, régimen, elegibilidad legal, semanas e
// historia siguen siendo exclusivos de generarCaminosRPM.js — nunca se generalizaron aquí
// (Principio 9: sin abstracción sin evidencia de un consumidor real).
//
// Corrección 2026-08-23 (revisión visual de Carlos, mismo día): "6" (un dígito, mientras se
// escribía "62") pasaba edadJubilacionDeseadaEsValida y bastaba para declarar
// listoParaAvanzar. Causa raíz: ese predicado solo valida forma (dato sintácticamente
// válido), nunca pretendió validar si el valor ya es una edad plausible para avanzar (dato
// contextualmente válido). Este módulo ahora exige además edadActual (ver
// requisitosDatosImprescindiblesRPM.js#edadJubilacionDeseadaEsUtilizable) para el campo
// edadJubilacionDeseada — mismo criterio contextual que ya usaba ProyectaTuPensionRPM.jsx,
// ahora compartido, no reinventado. objetivoPensionMensual no cambia: no existe una cota
// contextual equivalente y no arbitraria para un monto (ver reporte de esta corrección).

import {
  objetivoValorMensualEsValido,
  edadJubilacionDeseadaEsUtilizable,
} from './pensionEngine/requisitosDatosImprescindiblesRPM.js'

// Único subconjunto de CAMPOS_INTERPRETABLES (ver
// src/ia/contratos/interpretacionDeclaracion.schema.js) que bloquea generarCaminosRPM si
// falta — restriccionCostoPensionalAdicionalMaximoMensual queda fuera a propósito.
export const CAMPOS_REQUERIDOS_OBJETIVO_RPM = ['objetivoPensionMensual', 'edadJubilacionDeseada']

// Vocabulario de nombres distinto a propósito del de generarCaminosRPM.js (campos del
// contrato IA vs. parámetros de dominio) — este mapa es la única correspondencia entre
// ambos, vive aquí porque es responsabilidad exclusiva de este módulo, no de la fuente
// compartida. Firma uniforme (valor, edadActual) para los dos campos, aunque
// objetivoValorMensualEsValido ignore el segundo argumento — así esValorSuficiente no
// necesita saber cuál validador sí lo usa.
const VALIDADOR_POR_CAMPO = {
  objetivoPensionMensual: (valor) => objetivoValorMensualEsValido(valor),
  edadJubilacionDeseada: (valor, edadActual) => edadJubilacionDeseadaEsUtilizable(valor, edadActual),
}

function esValorSuficiente(campo, valor, edadActual) {
  if (valor === null || valor === undefined) return false
  return VALIDADOR_POR_CAMPO[campo](valor, edadActual)
}

/**
 * Determina, de forma puramente determinista, qué campos de la capacidad objetivo/
 * restricción RPM siguen sin un valor utilizable — comparando lo YA confirmado en el
 * expediente contra un borrador todavía sin confirmar (interpretado por IA, editado a
 * mano, o ambos). El borrador tiene prioridad: es el valor que se escribiría si la
 * persona confirmara ahora mismo.
 *
 * @param {Object} input
 * @param {{objetivoPensionMensual: (number|null), edadJubilacionDeseada: (number|null)}} input.expedienteConfirmado
 * @param {{objetivoPensionMensual: (number|null), edadJubilacionDeseada: (number|null)}} input.borradorInterpretado
 * @param {number} input.edadActual - ya resuelta por el caller (calcularEdadCumplida) —
 *   imprescindible para saber si edadJubilacionDeseada es una edad futura plausible, no solo
 *   un número con forma válida.
 * @returns {{ camposFaltantes: string[], listoParaAvanzar: boolean }}
 */
export function determinarCamposFaltantesObjetivoRPM({ expedienteConfirmado, borradorInterpretado, edadActual }) {
  const camposFaltantes = CAMPOS_REQUERIDOS_OBJETIVO_RPM.filter((campo) => {
    const valorBorrador = borradorInterpretado?.[campo] ?? null
    const valorEfectivo = valorBorrador !== null ? valorBorrador : (expedienteConfirmado?.[campo] ?? null)
    return !esValorSuficiente(campo, valorEfectivo, edadActual)
  })

  return { camposFaltantes, listoParaAvanzar: camposFaltantes.length === 0 }
}
