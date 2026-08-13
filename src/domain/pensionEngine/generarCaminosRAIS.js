// Orquesta el "Motor de caminos RAIS" — primer Slice vertical de PensionLab que
// construye y compara alternativas reales, en vez de mostrar una única cifra
// aislada. No es una ampliación de calcularProyeccionRAIS.js: lo reutiliza tal
// cual (incluida su defensa genérica ya existente) para cada camino que genera.
//
// Perfil estrecho aprobado para este Slice — fuera de él, se declara
// explícitamente no evaluable, sin bloquear el resto del recorrido de la app:
// RAIS, independiente, cotización en Colombia, sin traslados de régimen previos
// (bono pensional no evaluado), con IBC apto y saldo acumulado conocido.
//
// Solo dos palancas sobreviven la revisión de accionabilidad ya aprobada:
//   - camino_base: seguir con la base de cotización actual (siempre viable,
//     directamente calculable).
//   - camino "aumentar tu base de cotización": la única decisión que un
//     independiente puede ejecutar hoy por sí mismo, sin depender de un
//     tercero — resuelta algebraicamente a partir de la distancia real al
//     objetivo, nunca con un número inventado.
// El aporte voluntario queda fuera (investigación normativa/producto
// pendiente — qué vehículo, qué descuento aplica). El tiempo no es un camino:
// es un dato complementario del camino base (proyeccionTemporal).
//
// El resultado nunca se presenta como "tu pensión mensual" — es una
// "proyección pensional parcial": combina los componentes que este Slice sí
// puede modelar (base de cotización + saldo acumulado + supuestos ya
// aprobados), pero no representa una estimación completa (sin FGPM, sin
// mortalidad real, sin bono pensional, sin verificar viabilidad legal de
// retiro a la edad elegida) — ver LIMITACION_ANUALIZACION_SIMPLIFICADA en
// calcularProyeccionRAIS.js, que viaja en cada escenario.
//
// Convención Económica v1 — RAIS en términos reales (auditoría aprobada, ver
// domain/formulas/trazabilidad-formula-RAIS.md): ibcAplicableSimulacion,
// saldoAcumulado, objetivoValorMensual y el resultado.valor de cada escenario
// se interpretan en pesos de hoy (poder adquisitivo constante), no como
// pesos nominales futuros. formulaRAIS.js y calcularProyeccionRAIS.js NO se
// modificaron para esto — su aritmética ya es válida bajo esta lectura (un
// aporte y una tasa reales componen correctamente un capital y una mesada
// reales); lo que cambia aquí es la interpretación declarada, nunca el
// cálculo. La convención está registrada como supuesto real en
// data/assumptions/versions/supuestos-v1.json (campo
// 'ibcConstanteEnTerminosReales') y viaja al usuario como
// LIMITACION_PROYECCION_TERMINOS_REALES en cada escenario viable, no
// únicamente en este comentario.

import { obtenerSmlv, obtenerTopeMaximoIBC, obtenerTasaCotizacion } from '../../data/legal/index.js'
import { obtenerSupuesto } from '../../data/assumptions/index.js'
import { resolverIBCNecesarioRAIS, resolverMesesNecesariosRAIS } from '../formulas/formulaRAIS.js'
import { calcularProyeccionRAIS } from './calcularProyeccionRAIS.js'
import { calcularEdadCumplida } from '../calcularEdadCumplida.js'

const EDAD_MAXIMA_FUNCIONAL = 100

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function resultadoVacio(codigo, razon) {
  return {
    escenarios: [],
    orientacion: { caminoMasAlineadoId: null, codigo, razon },
  }
}

const LIMITACION_SALDO_TRATADO_COMO_ACTUAL = {
  codigo: 'SALDO_TRATADO_COMO_ACTUAL',
  mensaje:
    'Tratamos tu saldo acumulado como si correspondiera a hoy — si tu extracto es de hace algunas semanas o ' +
    'meses, la proyección podría tener una pequeña diferencia.',
}

const LIMITACION_COSTO_SOLO_PENSIONAL = {
  codigo: 'COSTO_SOLO_PENSIONAL',
  mensaje:
    'El esfuerzo económico mostrado solo incluye tu aporte a pensión. Si aumentas tu base de cotización, ' +
    'también aumentarían otros aportes obligatorios —como salud y, cuando corresponda, riesgos laborales— que ' +
    'esta primera versión todavía no calcula.',
}

// Convención Económica v1 (ver comentario de cabecera de este archivo) — común
// a todo escenario viable, nunca específica de uno solo: base y alternativo
// se proyectan bajo la misma lectura en pesos de hoy.
const LIMITACION_PROYECCION_TERMINOS_REALES = {
  codigo: 'PROYECCION_EN_TERMINOS_REALES',
  mensaje:
    'Esta proyección está expresada en pesos de hoy: tratamos tu base de cotización, tu saldo y tu objetivo ' +
    'como un nivel constante de poder adquisitivo a lo largo de todo el horizonte, no como el mismo número ' +
    'nominal de pesos durante 25 años. Todavía no calculamos cuál sería ese valor en pesos del futuro.',
}

// Específica del camino "aumentar tu base de cotización": es el único lugar
// de este archivo donde se compara un IBC proyectado contra un tope legal.
// El tope usa el SMMLV vigente en la fecha de esta simulación — PensionLab
// no proyecta todavía el SMMLV futuro, así que este tope debe entenderse
// como una restricción construida con los parámetros legales actuales, no
// como el tope legal que efectivamente regirá dentro de 25 años.
const LIMITACION_TOPE_SMMLV_VIGENTE = {
  codigo: 'TOPE_IBC_CON_SMMLV_VIGENTE',
  mensaje:
    'El tope legal de 25 SMMLV que aplicamos aquí se evalúa con el SMMLV vigente en la fecha de esta ' +
    'simulación. Todavía no proyectamos el SMMLV futuro, así que este tope debe entenderse como una ' +
    'restricción construida con los parámetros legales actuales — una limitación de esta versión.',
}

/**
 * Construye el bloque `esfuerzo` de un escenario — separa explícitamente la
 * variación de IBC (magnitud técnica, nunca presentada como costo) del costo
 * pensional real que sale del bolsillo de la persona. Usa la tasa de
 * cotización BRUTA (antes de descuentoSobreAporteCapitalizable a propósito:
 * ese descuento decide cuánto capitaliza, nunca cuánto desembolsa la persona
 * — confundirlos subestimaría el costo real.
 *
 * @param {number} ibcActual
 * @param {number} ibcPropuesto
 * @param {number} tasaCotizacion - fracción (ej. 0.16), no puntos porcentuales
 */
function construirEsfuerzo(ibcActual, ibcPropuesto, tasaCotizacion) {
  const aporteMensualPensionActual = ibcActual * tasaCotizacion
  const aporteMensualPensionPropuesto = ibcPropuesto * tasaCotizacion
  return {
    ibcActual,
    ibcPropuesto,
    aumentoIBC: ibcPropuesto - ibcActual,
    aporteMensualPensionActual,
    aporteMensualPensionPropuesto,
    costoPensionalAdicionalMensual: aporteMensualPensionPropuesto - aporteMensualPensionActual,
  }
}

/**
 * Determina el resultado "más alineado" con el objetivo declarado, mediante
 * reglas deterministas — nunca texto generativo, nunca preferencias
 * inventadas. Un camino con estado 'potencial' nunca puede ser seleccionado
 * aquí, sin excepción, aunque su condición faltante parezca menor.
 *
 * @param {Array<Object>} escenarios
 * @returns {{ caminoMasAlineadoId: string|null, codigo: string, razon: string }}
 */
function calcularOrientacion(escenarios) {
  const viables = escenarios.filter((e) => e.estado === 'viable')

  if (viables.length === 0) {
    return {
      caminoMasAlineadoId: null,
      codigo: 'SIN_CAMINOS_VIABLES',
      razon: 'Ningún camino resultó evaluable con la información actual.',
    }
  }

  const cumplen = viables.filter((e) => e.distanciaObjetivo.cumple)

  if (cumplen.length === 1) {
    return {
      caminoMasAlineadoId: cumplen[0].id,
      codigo: 'UNICO_CUMPLE',
      razon: 'Es el único camino evaluado que alcanza tu objetivo.',
    }
  }

  if (cumplen.length > 1) {
    return {
      caminoMasAlineadoId: null,
      codigo: 'VARIOS_CUMPLEN_FALTA_PRIORIDAD',
      razon:
        'Más de un camino evaluado alcanza tu objetivo; falta que definas una prioridad entre ellos para elegir uno.',
    }
  }

  const masCercano = viables.reduce((a, b) => (a.distanciaObjetivo.delta <= b.distanciaObjetivo.delta ? a : b))
  return {
    caminoMasAlineadoId: masCercano.id,
    codigo: 'NINGUNO_CUMPLE_MAS_CERCANO',
    razon: 'Ningún camino evaluado alcanza tu objetivo completo; este es el que más se acerca.',
  }
}

/**
 * @param {Object} input
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {('empleado'|'independiente'|'ambos'|null)} input.tipoCotizante
 * @param {('colombia'|'exterior'|'ambos'|null)} input.lugarCotizacion
 * @param {string|null} input.trasladoRegimen
 * @param {string} input.fechaNacimiento
 * @param {number|null} input.edadJubilacionDeseada
 * @param {number|null} input.ibcAplicableSimulacion - ya resuelto y apto (ver determinarBaseCotizacion.js).
 *   Convención Económica v1: en pesos de hoy, tratado como nivel constante de poder adquisitivo a lo largo del
 *   horizonte, no como el mismo número nominal de pesos durante 25 años (ver comentario de cabecera).
 * @param {number|null} input.saldoAcumulado - en pesos de hoy (ver Convención Económica v1, comentario de cabecera)
 * @param {number|null} input.objetivoValorMensual - en pesos de hoy (ver Convención Económica v1, comentario de cabecera)
 * @param {number|null} [input.restriccionCostoPensionalAdicionalMaximoMensual] - cuánto más puede destinar la
 *   persona exclusivamente a su aporte pensional cada mes, opcional. Nunca es un límite de IBC — se convierte a
 *   uno internamente (ver limiteIBCPorRestriccion más abajo).
 * @param {string} [input.fecha]
 * @returns {{
 *   escenarios: Array<Object>,
 *   orientacion: { caminoMasAlineadoId: string|null, codigo: string, razon: string },
 * }} escenarios[].resultado.valor está en pesos de hoy (Convención Económica v1, comentario de cabecera) —
 *   nunca pesos nominales futuros.
 */
export function generarCaminosRAIS({
  regimenActual,
  tipoCotizante,
  lugarCotizacion,
  trasladoRegimen,
  fechaNacimiento,
  edadJubilacionDeseada,
  ibcAplicableSimulacion,
  saldoAcumulado,
  objetivoValorMensual,
  restriccionCostoPensionalAdicionalMaximoMensual = null,
  fecha = hoyISO(),
}) {
  // --- Perfil estrecho (§1 del diseño aprobado) ---
  if (regimenActual !== 'RAIS') {
    return resultadoVacio('PERFIL_NO_EVALUABLE', 'Este análisis de caminos solo está disponible hoy para régimen RAIS.')
  }
  if (tipoCotizante !== 'independiente') {
    return resultadoVacio(
      'PERFIL_NO_EVALUABLE',
      'Este análisis de caminos, en su primera versión, solo está disponible para quienes cotizan como independientes — para un empleado, aumentar la base de cotización depende del empleador, no es una decisión que puedas tomar hoy por tu cuenta.'
    )
  }
  if (lugarCotizacion !== 'colombia') {
    return resultadoVacio('PERFIL_NO_EVALUABLE', 'Este análisis todavía no evalúa cotización desde el exterior.')
  }
  if (trasladoRegimen !== 'no') {
    return resultadoVacio(
      'PERFIL_NO_EVALUABLE',
      'Este análisis todavía no evalúa el bono pensional, así que no aplica si te has trasladado alguna vez de régimen.'
    )
  }

  // --- Datos imprescindibles ---
  if (!esNumeroValido(ibcAplicableSimulacion) || ibcAplicableSimulacion <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta una base de cotización apta para simular.')
  }
  if (!esNumeroValido(saldoAcumulado) || saldoAcumulado < 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu saldo acumulado en tu cuenta individual.')
  }
  if (!esNumeroValido(objetivoValorMensual) || objetivoValorMensual <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu objetivo de pensión mensual.')
  }
  if (!esNumeroValido(edadJubilacionDeseada)) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar la edad hasta la que quieres explorar.')
  }

  // --- Camino base ---
  const resultadoBase = calcularProyeccionRAIS({
    regimenActual,
    fechaNacimiento,
    edadJubilacionDeseada,
    ibcAplicableSimulacion,
    capitalInicial: saldoAcumulado,
    fecha,
  })

  if (resultadoBase.estado !== 'calculado') {
    return resultadoVacio('SIN_CAMINOS_VIABLES', 'No fue posible calcular ni siquiera el camino base con los datos actuales.')
  }

  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)
  const deltaBase = objetivoValorMensual - resultadoBase.pensionMensualProyectada
  const cumpleBase = deltaBase <= 0

  const smlv = obtenerSmlv(fecha)
  const tope = obtenerTopeMaximoIBC(fecha)
  const tasaCotizacion = obtenerTasaCotizacion(fecha)
  const rentabilidad = obtenerSupuesto(fecha, 'rentabilidadEsperadaRAIS')
  const descuento = obtenerSupuesto(fecha, 'descuentoSobreAporteCapitalizable')
  const horizontePago = obtenerSupuesto(fecha, 'mesesPayoutSimplificado')

  const parametrosLegales = { smlv: smlv.valor, tasaCotizacion: tasaCotizacion.valor / 100, topeMaximoIBC: tope.valor }
  const parametrosSupuestos = {
    rentabilidadEsperadaRAIS: rentabilidad.valor,
    descuentoSobreAporteCapitalizable: descuento.valor,
    mesesPayoutSimplificado: horizontePago.valor,
  }

  // Dato complementario del camino base — nunca un camino aparte (ver
  // revisión de accionabilidad aprobada: "tiempo" es una consecuencia de
  // mantener el comportamiento actual, no una decisión que se tome hoy).
  const mesesNecesarios = resolverMesesNecesariosRAIS({
    datosUsuario: { salarioActual: ibcAplicableSimulacion, capitalInicial: saldoAcumulado },
    parametrosLegales,
    parametrosSupuestos,
    pensionObjetivo: objetivoValorMensual,
  })

  let proyeccionTemporal
  if (mesesNecesarios === null) {
    proyeccionTemporal = { edadAproximadaAlcanceObjetivo: null, alcanzable: false }
  } else if (mesesNecesarios <= 0) {
    proyeccionTemporal = { edadAproximadaAlcanceObjetivo: edadActual, alcanzable: true }
  } else {
    const edadAlcance = edadActual + mesesNecesarios / 12
    proyeccionTemporal =
      edadAlcance > EDAD_MAXIMA_FUNCIONAL
        ? { edadAproximadaAlcanceObjetivo: null, alcanzable: false }
        : { edadAproximadaAlcanceObjetivo: Math.round(edadAlcance), alcanzable: true }
  }

  const horizonteBase = { edadActual, edadJubilacionDeseada, mesesHastaJubilacion: (edadJubilacionDeseada - edadActual) * 12 }

  // SALDO_TRATADO_COMO_ACTUAL solo aplica cuando el saldo declarado realmente
  // entra al cálculo (saldoAcumulado > 0) — con saldo 0 no hay nada que un
  // desfase de fecha pudiera distorsionar.
  const limitacionesSaldo = saldoAcumulado > 0 ? [LIMITACION_SALDO_TRATADO_COMO_ACTUAL] : []

  const escenarioBase = {
    id: 'base',
    tipo: 'base',
    estado: 'viable',
    decision: 'Seguir con tu base de cotización actual.',
    esfuerzo: construirEsfuerzo(ibcAplicableSimulacion, ibcAplicableSimulacion, parametrosLegales.tasaCotizacion),
    horizonte: horizonteBase,
    resultado: { valor: resultadoBase.pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
    distanciaObjetivo: { valorObjetivo: objetivoValorMensual, delta: deltaBase, cumple: cumpleBase },
    proyeccionTemporal,
    parametrosSupuestosUsados: resultadoBase.parametrosSupuestosUsados,
    limitaciones: [...resultadoBase.limitaciones, ...limitacionesSaldo, LIMITACION_PROYECCION_TERMINOS_REALES],
    analisisPotencial: null,
    razonDescartado: null,
  }

  const escenarios = [escenarioBase]

  // --- Camino alternativo: aumentar la base de cotización ---
  // Solo se genera cuando el base no alcanza el objetivo — si ya lo alcanza o
  // lo supera, no hay brecha que cerrar y no se inventa una alternativa.
  if (deltaBase > 0) {
    const topeEnPesos = tope.valor * smlv.valor

    if (ibcAplicableSimulacion >= topeEnPesos) {
      // Caso real, no inventado: ya no hay margen legal para subir la base.
      escenarios.push({
        id: 'aumentar-ibc',
        tipo: 'alternativo',
        estado: 'descartado',
        decision: 'Aumentar tu base de cotización.',
        esfuerzo: null,
        horizonte: null,
        resultado: null,
        distanciaObjetivo: null,
        proyeccionTemporal: null,
        parametrosSupuestosUsados: null,
        limitaciones: [],
        analisisPotencial: null,
        razonDescartado: {
          codigo: 'YA_EN_TOPE_LEGAL',
          mensaje:
            'Ya cotizas sobre el tope máximo legal (25 SMLV) — no es posible aumentar tu base de cotización. ' +
            'Este tope se evalúa con el SMMLV vigente en la fecha de esta simulación; todavía no proyectamos ' +
            'el SMMLV futuro.',
          reglaAplicada: 'tope-maximo-ibc',
        },
      })
    } else {
      const ibcNecesario = resolverIBCNecesarioRAIS({
        datosUsuario: { edadActual, edadJubilacionDeseada, capitalInicial: saldoAcumulado },
        parametrosLegales,
        parametrosSupuestos,
        pensionObjetivo: objetivoValorMensual,
      })

      // Convierte la restricción económica (cuánto más puede pagar de aporte
      // pensional) en un límite de IBC evaluable — dividir entre la tasa de
      // cotización, nunca sumar directamente: $1 de restricción no equivale a
      // $1 de aumento de IBC (Hallazgo de revisión: solo el 16% de un aumento
      // de IBC sale efectivamente del bolsillo de la persona como aporte
      // pensional).
      const limiteIBCPorRestriccion =
        restriccionCostoPensionalAdicionalMaximoMensual !== null &&
        esNumeroValido(restriccionCostoPensionalAdicionalMaximoMensual)
          ? ibcAplicableSimulacion + restriccionCostoPensionalAdicionalMaximoMensual / parametrosLegales.tasaCotizacion
          : Infinity

      // Nunca se ofrece un "aumento" por debajo del IBC actual (caso límite
      // algebraico ya documentado en resolverIBCNecesarioRAIS), y siempre se
      // respeta el tope legal y el límite propio que el usuario haya
      // declarado — lo que sea más restrictivo.
      const ibcAOfrecer = Math.min(Math.max(ibcNecesario, ibcAplicableSimulacion), topeEnPesos, limiteIBCPorRestriccion)

      const resultadoAlternativo = calcularProyeccionRAIS({
        regimenActual,
        fechaNacimiento,
        edadJubilacionDeseada,
        ibcAplicableSimulacion: ibcAOfrecer,
        capitalInicial: saldoAcumulado,
        fecha,
      })

      const deltaAlternativo = objetivoValorMensual - resultadoAlternativo.pensionMensualProyectada

      escenarios.push({
        id: 'aumentar-ibc',
        tipo: 'alternativo',
        estado: 'viable',
        decision: 'Aumentar tu base de cotización.',
        esfuerzo: construirEsfuerzo(ibcAplicableSimulacion, ibcAOfrecer, parametrosLegales.tasaCotizacion),
        horizonte: horizonteBase,
        resultado: { valor: resultadoAlternativo.pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
        distanciaObjetivo: { valorObjetivo: objetivoValorMensual, delta: deltaAlternativo, cumple: deltaAlternativo <= 0 },
        proyeccionTemporal: null,
        parametrosSupuestosUsados: resultadoAlternativo.parametrosSupuestosUsados,
        limitaciones: [
          ...resultadoAlternativo.limitaciones,
          ...limitacionesSaldo,
          LIMITACION_COSTO_SOLO_PENSIONAL,
          LIMITACION_PROYECCION_TERMINOS_REALES,
          LIMITACION_TOPE_SMMLV_VIGENTE,
        ],
        analisisPotencial: null,
        razonDescartado: null,
      })
    }
  }

  return { escenarios, orientacion: calcularOrientacion(escenarios) }
}
