// Orquesta formulaRAIS + reglas legales vigentes (data/legal) + supuestos vigentes
// (data/assumptions) para un caso dado. Devuelve estado 'calculado' o
// 'no_evaluable' — nunca inventa una edad de jubilación por defecto ni asume un
// régimen distinto del declarado.
//
// Consume exclusivamente `ibcAplicableSimulacion` como salario actual — nunca el
// valor declarado crudo (decisión ya tomada en determinarBaseCotizacion.js: "el
// motor solo consume ibcAplicableSimulacion + origenDatoIbc + certezaValorDeclarado").
//
// tasaCotizacion se resuelve en puntos porcentuales (obtenerTasaCotizacion) y se
// convierte a fracción aquí, porque formulaRAIS espera una fracción — la
// conversión de unidad es responsabilidad de quien consume el resolver, nunca del
// resolver mismo (mismo criterio ya documentado en obtenerTasaCotizacion).
//
// LIMITACIÓN CRÍTICA, declarada estructuralmente en el resultado (nunca solo en
// comentario): esta proyección no incluye capital ya acumulado en la cuenta
// individual — ver domain/formulas/trazabilidad-formula-RAIS.md.
//
// Caso límite no manejado, documentado y no defendido en código (mismo criterio
// ya aplicado a rentabilidadEsperadaRAIS = 0 en trazabilidad-formula-RAIS.md):
// si edadJubilacionDeseada <= edadActual, mesesHastaJubilacion resulta 0 o
// negativo y formulaRAIS puede producir un resultado no significativo. No forma
// parte de las razones `no_evaluable` aprobadas para este Slice — queda
// pendiente, no resuelto silenciosamente.

import { obtenerSmlv, obtenerTopeMaximoIBC, obtenerTasaCotizacion } from '../../data/legal/index.js'
import { obtenerSupuesto } from '../../data/assumptions/index.js'
import { formulaRAIS } from '../formulas/formulaRAIS.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function calcularEdadCumplida(fechaNacimiento, fechaReferencia) {
  const nacimiento = new Date(fechaNacimiento)
  const referencia = new Date(fechaReferencia)

  let edad = referencia.getUTCFullYear() - nacimiento.getUTCFullYear()
  const antesDelCumpleanos =
    referencia.getUTCMonth() < nacimiento.getUTCMonth() ||
    (referencia.getUTCMonth() === nacimiento.getUTCMonth() &&
      referencia.getUTCDate() < nacimiento.getUTCDate())

  if (antesDelCumpleanos) edad -= 1
  return edad
}

const LIMITACION_CAPITAL_NO_INCLUIDO = {
  codigo: 'CAPITAL_ACUMULADO_NO_INCLUIDO',
  mensaje:
    'Esta proyección solo incluye los aportes futuros desde hoy hasta tu jubilación. No ' +
    'incluye el capital que ya tengas acumulado en tu cuenta individual — si ya llevas ' +
    'tiempo cotizando en un fondo privado, tu pensión real probablemente sea mayor que ' +
    'esta cifra.',
}

/**
 * @param {Object} input
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {string} input.fechaNacimiento - ISO
 * @param {(number|null|undefined)} input.edadJubilacionDeseada
 * @param {number} input.ibcAplicableSimulacion
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   estado: 'calculado' | 'no_evaluable',
 *   razonNoEvaluable: 'regimen_no_rais' | 'edad_jubilacion_no_declarada' | null,
 *   pensionMensualProyectada: number | null,
 *   fechaCalculo: string | null,
 *   parametrosLegalesUsados: {
 *     smlv: { valor: number, id: string },
 *     topeMaximoIBC: { valor: number, id: string },
 *     tasaCotizacion: { valor: number, id: string },
 *   } | null,
 *   parametrosSupuestosUsados: {
 *     rentabilidadEsperadaRAIS: { valor: number, id: string },
 *     descuentoSobreAporteCapitalizable: { valor: number, id: string },
 *     mesesPayoutSimplificado: { valor: number, id: string },
 *   } | null,
 *   limitaciones: Array<{ codigo: string, mensaje: string }>,
 * }}
 */
export function calcularProyeccionRAIS({
  regimenActual,
  fechaNacimiento,
  edadJubilacionDeseada,
  ibcAplicableSimulacion,
  fecha = hoyISO(),
}) {
  function noEvaluable(razonNoEvaluable) {
    return {
      estado: 'no_evaluable',
      razonNoEvaluable,
      pensionMensualProyectada: null,
      fechaCalculo: null,
      parametrosLegalesUsados: null,
      parametrosSupuestosUsados: null,
      limitaciones: [],
    }
  }

  if (regimenActual !== 'RAIS') {
    return noEvaluable('regimen_no_rais')
  }

  if (edadJubilacionDeseada === null || edadJubilacionDeseada === undefined || !Number.isFinite(edadJubilacionDeseada)) {
    return noEvaluable('edad_jubilacion_no_declarada')
  }

  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)

  const smlv = obtenerSmlv(fecha)
  const tope = obtenerTopeMaximoIBC(fecha)
  const tasaCotizacion = obtenerTasaCotizacion(fecha)
  const rentabilidad = obtenerSupuesto(fecha, 'rentabilidadEsperadaRAIS')
  const descuento = obtenerSupuesto(fecha, 'descuentoSobreAporteCapitalizable')
  const horizontePago = obtenerSupuesto(fecha, 'mesesPayoutSimplificado')

  const pensionMensualProyectada = formulaRAIS({
    datosUsuario: {
      edadActual,
      edadJubilacionDeseada,
      salarioActual: ibcAplicableSimulacion,
    },
    parametrosLegales: {
      smlv: smlv.valor,
      tasaCotizacion: tasaCotizacion.valor / 100,
      topeMaximoIBC: tope.valor,
    },
    parametrosSupuestos: {
      rentabilidadEsperadaRAIS: rentabilidad.valor,
      descuentoSobreAporteCapitalizable: descuento.valor,
      mesesPayoutSimplificado: horizontePago.valor,
    },
  })

  return {
    estado: 'calculado',
    razonNoEvaluable: null,
    pensionMensualProyectada,
    fechaCalculo: fecha,
    parametrosLegalesUsados: {
      smlv: { valor: smlv.valor, id: smlv.id },
      topeMaximoIBC: { valor: tope.valor, id: tope.id },
      tasaCotizacion: { valor: tasaCotizacion.valor, id: tasaCotizacion.id },
    },
    parametrosSupuestosUsados: {
      rentabilidadEsperadaRAIS: { valor: rentabilidad.valor, id: rentabilidad.id },
      descuentoSobreAporteCapitalizable: { valor: descuento.valor, id: descuento.id },
      mesesPayoutSimplificado: { valor: horizontePago.valor, id: horizontePago.id },
    },
    limitaciones: [LIMITACION_CAPITAL_NO_INCLUIDO],
  }
}
