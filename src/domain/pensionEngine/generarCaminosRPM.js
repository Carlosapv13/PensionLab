// Orquesta S4-003 — "Objetivo/restricción RPM capturables + búsqueda determinista del IBC
// necesario (camino base + alternativo)". Ver domain/formulas/trazabilidad-formula-RPM.md,
// sección "Bisección de S4-003", para el contrato completo aprobado antes de este código.
//
// calcularProyeccionRPM.js se reutiliza como caja negra — este archivo nunca reimplementa
// IBL, tasa de reemplazo, ventana ni indexación. formulaIBL.js, formulaRPM.js y la
// convención de 3.650 días permanecen intactos.
//
// costoAcumuladoHastaJubilacion queda fuera de esfuerzo — "Regla 5 del Entregable" (citada
// en §7.2 del Entregable 2) no está definida en ningún documento del proyecto; no se
// inventa su contenido ni se asigna a ningún Slice futuro como obligación (decisión
// Carlos/Atlas, 2026-08-20).

import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { calcularFechaPorEdad } from '../calcularFechaPorEdad.js'
import { obtenerTasaCotizacion, obtenerEdadPension, obtenerSemanasMinimas } from '../../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

const LIMITACION_RESTRICCION_COSTO_LIMITA_RESULTADO = {
  codigo: 'RESTRICCION_COSTO_LIMITA_RESULTADO',
  mensaje:
    'El límite que declaraste para tu aporte pensional adicional impidió alcanzar tu objetivo — sin esa ' +
    'restricción, tu objetivo sí sería alcanzable dentro del tope legal.',
}

function resultadoVacio(codigo, razon, detalleElegibilidad = null) {
  return {
    escenarios: [],
    orientacion: { caminoMasAlineadoId: null, codigo, razon },
    detalleElegibilidad,
  }
}

// Duplicada a propósito de generarCaminosRAIS.js — misma lógica genérica (opera solo
// sobre estado/distanciaObjetivo, sin nada específico de RAIS ni de RPM), mismo criterio
// de duplicación ya usado en este proyecto para no acoplar un motor al archivo del otro
// régimen. Si un tercer régimen la necesitara, ahí correspondería extraerla.
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

function construirCamino({ id, tipo, decision, proyeccion, edadJubilacionDeseada, ibcActual, tasaCotizacion, objetivoValorMensual }) {
  const delta = objetivoValorMensual - proyeccion.pensionMensualProyectada
  return {
    id,
    tipo,
    estado: 'viable',
    decision,
    entradas: { escenarioIbcFuturo: proyeccion.escenarioIbcFuturo, edadJubilacionDeseada },
    resultado: { valor: proyeccion.pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
    ibl: proyeccion.ibl,
    tasaReemplazo: proyeccion.tasaReemplazo,
    semanasCotizadas: proyeccion.semanasCotizadas,
    composicionVentanaOrdinaria: proyeccion.composicionVentanaOrdinaria,
    trazabilidadVentana: proyeccion.trazabilidadVentana,
    esfuerzo: construirEsfuerzo(ibcActual, proyeccion.escenarioIbcFuturo.valorAplicado, tasaCotizacion),
    distanciaObjetivo: { valorObjetivo: objetivoValorMensual, delta, cumple: delta <= 0 },
    limitaciones: proyeccion.limitaciones,
    razonDescartado: null,
  }
}

function caminoDescartado(id, decision, razonDescartado) {
  return {
    id,
    tipo: 'alternativo',
    estado: 'descartado',
    decision,
    entradas: null,
    resultado: null,
    ibl: null,
    tasaReemplazo: null,
    semanasCotizadas: null,
    composicionVentanaOrdinaria: null,
    trazabilidadVentana: null,
    esfuerzo: null,
    distanciaObjetivo: null,
    limitaciones: [],
    razonDescartado,
  }
}

// Bisección sobre escenarioIbcFuturo.valor, acotada a [ibcActual, topeAplicado] — nunca
// fuera de ese rango (§8.5, ver trazabilidad-formula-RPM.md). Cada evaluación intermedia
// llama a calcularProyeccionRPM sin transformar ni reinterpretar su resultado.
//
// No se defiende contra que una evaluación intermedia resulte 'no_evaluable': variar
// únicamente escenarioIbcFuturo.valor nunca cambia la evaluabilidad de la ventana (la
// selección de períodos y la cobertura de IPC dependen solo de fechas, nunca del propio
// IBC) — invariante ya verificado en S4-002 y ejercitado de nuevo en los tests de este
// archivo. Documentado, no defendido con código adicional (mismo criterio ya usado en
// resolverMesesNecesariosRAIS para su propio caso límite no manejado).
function biseccionarEscenarioIbcFuturo({ construirInput, ibcActual, topeAplicado, objetivoValorMensual }) {
  const rango = topeAplicado - ibcActual
  const iteraciones = Math.ceil(Math.log2(rango))

  let limiteInferior = ibcActual
  let limiteSuperior = topeAplicado

  for (let i = 0; i < iteraciones; i++) {
    const medio = (limiteInferior + limiteSuperior) / 2
    const proyeccion = calcularProyeccionRPM(construirInput(medio))

    if (proyeccion.pensionMensualProyectada >= objetivoValorMensual) {
      limiteSuperior = medio
    } else {
      limiteInferior = medio
    }
  }

  // Redondeo hacia ARRIBA (Math.ceil), no al más cercano — una búsqueda de objetivo cuyo
  // propio resultado redondeado cayera una fracción de peso por debajo del objetivo
  // derrotaría su propio propósito (hallazgo de la revisión de S4-003, 2026-08-20:
  // Math.round produjo distanciaObjetivo.cumple === false en un caso real de prueba).
  // Se acota con topeAplicado por si el redondeo empujara 1 peso más allá del límite por
  // ruido de punto flotante — nunca se ofrece un IBC fuera del rango aprobado.
  const valorFinal = Math.min(Math.ceil(limiteSuperior), topeAplicado)
  return calcularProyeccionRPM(construirInput(valorFinal))
}

/**
 * @param {Object} input
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {('Mujer'|'Hombre'|null)} input.sexo - indispensable para resolver edad y semanas
 *   mínimas legales (Art. 33 Ley 100 de 1993, diferenciado por sexo)
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} [input.historiaCotizacion]
 * @param {string} input.fechaNacimiento - ISO
 * @param {number|null} input.edadJubilacionDeseada
 * @param {number|null} input.ibcAplicableSimulacion - ya resuelto y apto (determinarBaseCotizacion.js)
 * @param {number|null} input.objetivoValorMensual - en pesos de fechaBaseMonetaria
 * @param {number|null} [input.restriccionCostoPensionalAdicionalMaximoMensual]
 * @param {string} [input.fecha]
 * @returns {{
 *   escenarios: Array<Object>,
 *   orientacion: { caminoMasAlineadoId: string|null, codigo: string, razon: string },
 *   detalleElegibilidad: Object|null,
 * }}
 */
export function generarCaminosRPM({
  regimenActual,
  sexo,
  historiaCotizacion = [],
  fechaNacimiento,
  edadJubilacionDeseada,
  ibcAplicableSimulacion,
  objetivoValorMensual,
  restriccionCostoPensionalAdicionalMaximoMensual = null,
  fecha = hoyISO(),
}) {
  // --- Perfil (S4-001: sin restricción de tipoCotizante/lugarCotizacion/trasladoRegimen) ---
  if (regimenActual !== 'RPM') {
    return resultadoVacio('PERFIL_NO_EVALUABLE', 'Este análisis de caminos solo está disponible hoy para régimen RPM.')
  }

  // --- Datos imprescindibles ---
  if (sexo !== 'Mujer' && sexo !== 'Hombre') {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu sexo para poder resolver los requisitos legales de edad y semanas mínimas.')
  }
  if (!esNumeroValido(ibcAplicableSimulacion) || ibcAplicableSimulacion <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta una base de cotización apta para simular.')
  }
  if (!esNumeroValido(objetivoValorMensual) || objetivoValorMensual <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu objetivo de pensión mensual.')
  }
  if (!esNumeroValido(edadJubilacionDeseada)) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar la edad hasta la que quieres explorar.')
  }

  // --- Elegibilidad legal RPM (auditoría 2026-08-21) ---
  // Requisito de edad: se resuelve a fechaReconocimiento, no a fecha — no es un valor
  // legal futuro desconocido, es aplicar hoy una constante ya vigente (57/62, sin
  // cronograma) a la fecha en que efectivamente se evaluaría. Se verifica ANTES de
  // llamar a calcularProyeccionRPM: no depende de historia ni de IBC, así que no tiene
  // sentido calcular nada si la edad elegida ya descarta el reconocimiento.
  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'
  const fechaReconocimiento = calcularFechaPorEdad(fechaNacimiento, edadJubilacionDeseada)
  const edadMinima = obtenerEdadPension(fechaReconocimiento, sexoResuelto)

  if (edadJubilacionDeseada < edadMinima.valor) {
    const aniosFaltantes = edadMinima.valor - edadJubilacionDeseada
    return resultadoVacio(
      'EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL',
      `A los ${edadJubilacionDeseada} años no cumplirías el requisito legal de edad para RPM (${edadMinima.valor} años) — te faltarían ${aniosFaltantes} años.`,
      { edadMinima: edadMinima.valor, edadElegida: edadJubilacionDeseada, aniosFaltantes }
    )
  }

  const escenarioBaseInput = {
    historiaCotizacion,
    fechaNacimiento,
    edadJubilacionDeseada,
    escenarioIbcFuturo: { valor: ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
    fecha,
  }

  const resultadoBase = calcularProyeccionRPM(escenarioBaseInput)

  if (resultadoBase.estado !== 'calculado') {
    return resultadoVacio('SIN_CAMINOS_VIABLES', 'No fue posible calcular ni siquiera el camino base con los datos actuales.')
  }

  // Requisito de semanas: igual criterio de fecha que la edad (fechaReconocimiento, no
  // fecha) — semanasMinimasPensionMujer sí tiene un cronograma legal ya vigente
  // (Sentencia C-197/2023) que sería incorrecto ignorar. Se compara contra
  // semanasCotizadas.total (historia observada + horizonte futuro completo, ya
  // proyectado por calcularProyeccionRPM) — nunca contra la semanas declaradas hoy por
  // el usuario en otra pantalla, que reflejan una fecha distinta. Una sola verificación
  // basta: semanasCotizadas.total no depende de escenarioIbcFuturo.valor (invariante ya
  // establecida), así que si el camino base cumple, cualquier alternativo también.
  const semanasMinimas = obtenerSemanasMinimas(fechaReconocimiento, sexoResuelto, 'RPM')
  const semanasProyectadas = resultadoBase.semanasCotizadas.total

  if (semanasProyectadas < semanasMinimas.valor) {
    const semanasFaltantes = semanasMinimas.valor - semanasProyectadas
    return resultadoVacio(
      'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM',
      `Con la historia y el escenario de cotización utilizados, a esa fecha proyectamos ${semanasProyectadas.toFixed(1)} semanas. El requisito legal aplicable es ${semanasMinimas.valor}; faltarían ${semanasFaltantes.toFixed(1)} semanas.`,
      { semanasMinimas: semanasMinimas.valor, semanasProyectadas, semanasFaltantes }
    )
  }

  const tasaCotizacion = obtenerTasaCotizacion(fecha)
  const tasaCotizacionFraccion = tasaCotizacion.valor / 100

  const escenarioBase = construirCamino({
    id: 'base',
    tipo: 'base',
    decision: 'Mantener, en términos reales, tu base de cotización actual hasta tu jubilación.',
    proyeccion: resultadoBase,
    edadJubilacionDeseada,
    ibcActual: ibcAplicableSimulacion,
    tasaCotizacion: tasaCotizacionFraccion,
    objetivoValorMensual,
  })

  const escenarios = [escenarioBase]

  // --- Camino alternativo: buscar el IBC futuro necesario ---
  // Solo se genera cuando el base no alcanza el objetivo — si ya lo alcanza o lo supera,
  // no hay brecha que cerrar (mismo criterio que generarCaminosRAIS.js).
  if (escenarioBase.distanciaObjetivo.delta > 0) {
    const topeAplicado = resultadoBase.escenarioIbcFuturo.topeAplicado

    if (ibcAplicableSimulacion >= topeAplicado) {
      escenarios.push(
        caminoDescartado('aumentar-ibc-futuro', 'Aumentar tu IBC futuro para acercarte a tu objetivo.', {
          codigo: 'YA_EN_TOPE_LEGAL',
          mensaje:
            'Ya declaraste una base actual sobre el tope máximo legal (25 SMLV) — no es posible proponer un ' +
            'IBC futuro mayor. Este tope se evalúa con el SMLV vigente en la fecha de esta simulación; ' +
            'PensionLab todavía no proyecta el SMLV futuro.',
          reglaAplicada: 'tope-maximo-ibc',
        })
      )
    } else {
      const resultadoEnTope = calcularProyeccionRPM({
        ...escenarioBaseInput,
        escenarioIbcFuturo: { valor: topeAplicado, origen: 'busqueda_objetivo_rpm' },
      })

      if (resultadoEnTope.pensionMensualProyectada < objetivoValorMensual) {
        escenarios.push(
          caminoDescartado('aumentar-ibc-futuro', 'Aumentar tu IBC futuro para acercarte a tu objetivo.', {
            codigo: 'OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE',
            mensaje:
              'Ni aumentando tu IBC futuro hasta el tope máximo legal (25 SMLV) se alcanza el objetivo que ' +
              'declaraste — no hay un IBC futuro dentro de lo legalmente permitido que lo logre.',
            reglaAplicada: 'tope-maximo-ibc',
          })
        )
      } else {
        // Límite propio declarado por el usuario (restricción de costo), convertido a un
        // límite de IBC — mismo criterio que generarCaminosRAIS.js: dividir entre la tasa
        // de cotización, nunca sumar directamente el peso de restricción al IBC.
        const limiteIBCPorRestriccion =
          restriccionCostoPensionalAdicionalMaximoMensual !== null && esNumeroValido(restriccionCostoPensionalAdicionalMaximoMensual)
            ? ibcAplicableSimulacion + restriccionCostoPensionalAdicionalMaximoMensual / tasaCotizacionFraccion
            : Infinity

        const topeEfectivo = Math.min(topeAplicado, limiteIBCPorRestriccion)

        // Siempre se biseca para encontrar el IBC MÍNIMO suficiente — resultadoEnTope
        // arriba solo sirvió para confirmar que el objetivo es alcanzable dentro del tope
        // legal, nunca es en sí mismo la respuesta a ofrecer (ofrecer directamente "sube
        // hasta el tope" cuando un aumento menor ya bastaría sería un error, no una
        // simplificación). Si la restricción de costo es más estricta que el tope legal
        // (topeEfectivo < topeAplicado), la bisección converge de forma natural al mejor
        // IBC alcanzable dentro de esa restricción — sin necesidad de un código de
        // descarte aparte: distanciaObjetivo.cumple queda en false si no basta, mismo
        // criterio que generarCaminosRAIS.js.
        const resultadoAlternativo = biseccionarEscenarioIbcFuturo({
          construirInput: (valor) => ({
            ...escenarioBaseInput,
            escenarioIbcFuturo: { valor, origen: 'busqueda_objetivo_rpm' },
          }),
          ibcActual: ibcAplicableSimulacion,
          topeAplicado: topeEfectivo,
          objetivoValorMensual,
        })

        const caminoAlternativo = construirCamino({
          id: 'aumentar-ibc-futuro',
          tipo: 'alternativo',
          decision: 'Aumentar tu IBC futuro para alcanzar tu objetivo.',
          proyeccion: resultadoAlternativo,
          edadJubilacionDeseada,
          ibcActual: ibcAplicableSimulacion,
          tasaCotizacion: tasaCotizacionFraccion,
          objetivoValorMensual,
        })

        // Hallazgo de auditoría (2026-08-21): si se llegó hasta aquí, resultadoEnTope ya
        // confirmó que el objetivo SÍ es alcanzable dentro del tope legal — por
        // construcción, la única razón por la que este camino podría no cumplir es que
        // la propia restricción de costo declarada (topeEfectivo < topeAplicado) acotó
        // la búsqueda por debajo de lo necesario. Se distingue explícitamente de un
        // objetivo genuinamente inalcanzable — nunca se muestra como "no alcanza" sin
        // explicar la causa.
        if (topeEfectivo < topeAplicado && !caminoAlternativo.distanciaObjetivo.cumple) {
          caminoAlternativo.limitaciones = [...caminoAlternativo.limitaciones, LIMITACION_RESTRICCION_COSTO_LIMITA_RESULTADO]
        }

        escenarios.push(caminoAlternativo)
      }
    }
  }

  return { escenarios, orientacion: calcularOrientacion(escenarios), detalleElegibilidad: null }
}
