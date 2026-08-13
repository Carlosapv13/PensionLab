// Fórmula matemática pura del cálculo de pensión bajo RAIS (Régimen de Ahorro Individual).
// Recibe parámetros ya resueltos (datos del usuario + valores normativos + supuestos de
// modelado); no contiene literales legales/de supuestos embebidos ni conoce data/legal
// ni data/assumptions directamente.
//
// Es una PROYECCIÓN simplificada, no un cálculo normativo cerrado (RAIS no tiene una
// fórmula legal única como RPM). Ver trazabilidad-formula-RAIS.md para la metodología,
// las fuentes de los supuestos, los 3 casos numéricos de referencia (usados en
// formulaRAIS.test.js) y las limitaciones — en particular que esta proyección NO incluye
// capital ya acumulado en la cuenta individual (limitación crítica documentada).

function tasaMensualDesdeAnual(tasaAnual) {
  return Math.pow(1 + tasaAnual, 1 / 12) - 1
}

/**
 * Separa y explica la cadena IBC → aporte obligatorio → descuento sobre aporte →
 * aporte que capitaliza, para que cada paso sea individualmente trazable.
 *
 * @param {Object} params
 * @param {{salarioActual: number}} params.datosUsuario
 * @param {{smlv: number, tasaCotizacion: number, topeMaximoIBC: number}} params.parametrosLegales
 * @param {{descuentoSobreAporteCapitalizable: number}} params.parametrosSupuestos
 * @returns {number} Aporte mensual que efectivamente capitaliza en la cuenta individual,
 *   en la unidad de datosUsuario.salarioActual. Sin redondear.
 */
export function calcularAporteCapitalizableRAIS({ datosUsuario, parametrosLegales, parametrosSupuestos }) {
  const { salarioActual } = datosUsuario
  const { smlv, tasaCotizacion, topeMaximoIBC } = parametrosLegales
  const { descuentoSobreAporteCapitalizable } = parametrosSupuestos

  const ibcMensual = Math.min(salarioActual, topeMaximoIBC * smlv)
  const aporteObligatorio = ibcMensual * tasaCotizacion

  return aporteObligatorio * (1 - descuentoSobreAporteCapitalizable)
}

/**
 * @param {Object} params
 * @param {{edadActual: number, edadJubilacionDeseada: number, salarioActual: number, capitalInicial?: number}} params.datosUsuario -
 *   capitalInicial es opcional (default 0) — capital ya acumulado en la cuenta individual antes
 *   de empezar a proyectar (Slice "Motor de caminos RAIS"). Se capitaliza al mismo ritmo que los
 *   aportes futuros, no se mantiene estático — es la misma anualidad con un valor presente
 *   inicial, álgebra financiera estándar, no una regla nueva.
 * @param {{smlv: number, tasaCotizacion: number, topeMaximoIBC: number}} params.parametrosLegales
 * @param {{descuentoSobreAporteCapitalizable: number, rentabilidadEsperadaRAIS: number}} params.parametrosSupuestos
 * @returns {number} Capital proyectado al momento de jubilación, en la unidad de
 *   datosUsuario.salarioActual. Sin redondear.
 */
export function calcularCapitalProyectadoRAIS(params) {
  const { edadActual, edadJubilacionDeseada, capitalInicial = 0 } = params.datosUsuario
  const { rentabilidadEsperadaRAIS } = params.parametrosSupuestos

  const aporteMensualNeto = calcularAporteCapitalizableRAIS(params)
  const mesesHastaJubilacion = (edadJubilacionDeseada - edadActual) * 12
  const tasaMensual = tasaMensualDesdeAnual(rentabilidadEsperadaRAIS)
  const factorCrecimiento = Math.pow(1 + tasaMensual, mesesHastaJubilacion)

  const capitalInicialCapitalizado = capitalInicial * factorCrecimiento
  const capitalDeAportes = aporteMensualNeto * ((factorCrecimiento - 1) / tasaMensual)

  return capitalInicialCapitalizado + capitalDeAportes
}

/**
 * @param {Object} params
 * @param {{edadActual: number, edadJubilacionDeseada: number, salarioActual: number}} params.datosUsuario
 * @param {{smlv: number, tasaCotizacion: number, topeMaximoIBC: number}} params.parametrosLegales
 * @param {{
 *   descuentoSobreAporteCapitalizable: number,
 *   rentabilidadEsperadaRAIS: number,
 *   mesesPayoutSimplificado: number,
 * }} params.parametrosSupuestos
 * @returns {number} Pensión mensual proyectada, en la unidad de datosUsuario.salarioActual. Sin redondear.
 */
export function formulaRAIS(params) {
  const { rentabilidadEsperadaRAIS, mesesPayoutSimplificado } = params.parametrosSupuestos

  const capitalProyectado = calcularCapitalProyectadoRAIS(params)
  const tasaMensual = tasaMensualDesdeAnual(rentabilidadEsperadaRAIS)
  const factorAnualidadMensual = tasaMensual / (1 - Math.pow(1 + tasaMensual, -mesesPayoutSimplificado))

  return capitalProyectado * factorAnualidadMensual
}

/**
 * Inversa de formulaRAIS respecto al salario/IBC: dado un objetivo de pensión
 * mensual, resuelve el salario/IBC mensual necesario para alcanzarlo
 * exactamente, manteniendo fijos el horizonte, el capital inicial y los
 * supuestos — álgebra pura sobre la misma fórmula, sin investigación nueva
 * (Slice "Motor de caminos RAIS").
 *
 * Deliberadamente NO topa el resultado contra el tope legal de IBC (25 SMLV):
 * esta función pura no conoce data/legal, mismo criterio que el resto de este
 * archivo. Quien la consuma decide qué hacer si el valor devuelto supera el
 * tope o una restricción declarada por el usuario — nunca se resuelve aquí.
 *
 * @param {Object} params
 * @param {{edadActual: number, edadJubilacionDeseada: number, capitalInicial?: number}} params.datosUsuario
 * @param {{tasaCotizacion: number}} params.parametrosLegales - solo tasaCotizacion; el tope no aplica aquí
 * @param {{descuentoSobreAporteCapitalizable: number, rentabilidadEsperadaRAIS: number, mesesPayoutSimplificado: number}} params.parametrosSupuestos
 * @param {number} pensionObjetivo
 * @returns {number} Salario/IBC mensual necesario, sin topar. Puede ser menor
 *   al salario actual (o incluso negativo) si el objetivo ya se alcanza solo
 *   con el capital inicial — quien consume decide qué significa ese caso.
 */
export function resolverIBCNecesarioRAIS({ datosUsuario, parametrosLegales, parametrosSupuestos, pensionObjetivo }) {
  const { edadActual, edadJubilacionDeseada, capitalInicial = 0 } = datosUsuario
  const { tasaCotizacion } = parametrosLegales
  const { descuentoSobreAporteCapitalizable, rentabilidadEsperadaRAIS, mesesPayoutSimplificado } = parametrosSupuestos

  const tasaMensual = tasaMensualDesdeAnual(rentabilidadEsperadaRAIS)
  const mesesHastaJubilacion = (edadJubilacionDeseada - edadActual) * 12
  const factorCrecimiento = Math.pow(1 + tasaMensual, mesesHastaJubilacion)
  const factorAnualidadMensual = tasaMensual / (1 - Math.pow(1 + tasaMensual, -mesesPayoutSimplificado))

  const capitalNecesario = pensionObjetivo / factorAnualidadMensual
  const capitalInicialCapitalizado = capitalInicial * factorCrecimiento
  const capitalDeAportesNecesario = capitalNecesario - capitalInicialCapitalizado
  const factorAnualidadCapital = (factorCrecimiento - 1) / tasaMensual

  const aporteMensualNetoNecesario = capitalDeAportesNecesario / factorAnualidadCapital
  const aporteObligatorioNecesario = aporteMensualNetoNecesario / (1 - descuentoSobreAporteCapitalizable)

  return aporteObligatorioNecesario / tasaCotizacion
}

/**
 * Inversa de formulaRAIS respecto al horizonte: dado un objetivo de pensión
 * mensual, resuelve cuántos meses hacen falta para alcanzarlo manteniendo fijo
 * el salario/IBC actual, el capital inicial y los supuestos — usada para el
 * dato complementario "a este ritmo, alcanzarías tu objetivo aproximadamente
 * a los X años" del camino base (nunca se presenta como un camino aparte).
 *
 * @param {Object} params
 * @param {{salarioActual: number, capitalInicial?: number}} params.datosUsuario
 * @param {{smlv: number, tasaCotizacion: number, topeMaximoIBC: number}} params.parametrosLegales
 * @param {{descuentoSobreAporteCapitalizable: number, rentabilidadEsperadaRAIS: number, mesesPayoutSimplificado: number}} params.parametrosSupuestos
 * @param {number} pensionObjetivo
 * @returns {number|null} Meses necesarios desde hoy — puede ser <= 0 si el
 *   objetivo ya se alcanza con el capital inicial solo. Devuelve null cuando
 *   no existe una solución matemáticamente válida (nunca inventa un valor).
 */
export function resolverMesesNecesariosRAIS({ datosUsuario, parametrosLegales, parametrosSupuestos, pensionObjetivo }) {
  const { capitalInicial = 0 } = datosUsuario
  const { rentabilidadEsperadaRAIS, mesesPayoutSimplificado } = parametrosSupuestos

  const tasaMensual = tasaMensualDesdeAnual(rentabilidadEsperadaRAIS)
  const factorAnualidadMensual = tasaMensual / (1 - Math.pow(1 + tasaMensual, -mesesPayoutSimplificado))
  const capitalNecesario = pensionObjetivo / factorAnualidadMensual

  const aporteMensualNeto = calcularAporteCapitalizableRAIS({ datosUsuario, parametrosLegales, parametrosSupuestos })

  const denominador = capitalInicial + aporteMensualNeto / tasaMensual
  const numerador = capitalNecesario + aporteMensualNeto / tasaMensual

  if (!(denominador > 0) || !(numerador > 0)) return null

  const x = numerador / denominador
  if (!(x > 0)) return null

  return Math.log(x) / Math.log(1 + tasaMensual)
}
