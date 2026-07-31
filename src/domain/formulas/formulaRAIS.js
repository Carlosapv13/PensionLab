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
 * @param {{edadActual: number, edadJubilacionDeseada: number, salarioActual: number}} params.datosUsuario
 * @param {{smlv: number, tasaCotizacion: number, topeMaximoIBC: number}} params.parametrosLegales
 * @param {{descuentoSobreAporteCapitalizable: number, rentabilidadEsperadaRAIS: number}} params.parametrosSupuestos
 * @returns {number} Capital proyectado al momento de jubilación, en la unidad de
 *   datosUsuario.salarioActual. Sin redondear.
 */
export function calcularCapitalProyectadoRAIS(params) {
  const { edadActual, edadJubilacionDeseada } = params.datosUsuario
  const { rentabilidadEsperadaRAIS } = params.parametrosSupuestos

  const aporteMensualNeto = calcularAporteCapitalizableRAIS(params)
  const mesesHastaJubilacion = (edadJubilacionDeseada - edadActual) * 12
  const tasaMensual = tasaMensualDesdeAnual(rentabilidadEsperadaRAIS)

  return aporteMensualNeto * ((Math.pow(1 + tasaMensual, mesesHastaJubilacion) - 1) / tasaMensual)
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
