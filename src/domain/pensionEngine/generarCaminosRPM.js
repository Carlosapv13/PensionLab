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
//
// Tercer camino — "esfuerzo adicional mensual deseado" (decisión de producto 2026-08-23):
// distinto de restriccionCostoPensionalAdicionalMaximoMensual (un TECHO máximo que acota la
// búsqueda del camino alternativo) — esfuerzoAdicionalMensualDeseado es el monto EXACTO que
// la persona quiere EVALUAR como escenario, sin ninguna búsqueda de objetivo de por medio.
// Nombre elegido explícitamente para no reutilizar "restriccion" (conceptos distintos, ver
// docs/gestion/cierre-sprint-4.md) — reutiliza el vocabulario ya establecido en
// esfuerzo.costoPensionalAdicionalMensual (el campo de salida que este parámetro pretende
// dejar explorar de forma dirigida, en vez de solo observarlo en los 5 puntos automáticos
// del barrido). Reutiliza, sin ninguna fórmula paralela: la misma conversión monto→IBC ya
// usada para limiteIBCPorRestriccion (más abajo), y el mismo
// calcularProyeccionRPM/construirCamino que ya usan el camino base y el alternativo — el
// tope legal se aplica automáticamente dentro de calcularProyeccionRPM (Math.min interno),
// nunca recortado a mano aquí.
//
// S4-005 agrega `barrido` — 5 puntos deterministas de la misma curva esfuerzo↔resultado.
// Separado a propósito de `escenarios`: no son caminos con decisión/limitaciones/
// trazabilidad propias, son muestras de la misma curva que `escenarios` ya evalúa —
// mezclarlos rompería la semántica de calcularOrientacion() (un barrido monótono denso
// dispararía VARIOS_CUMPLEN_FALTA_PRIORIDAD de forma artificial en cuanto un punto
// cumpliera el objetivo, ya que todos los puntos por encima también cumplirían).
//
// Rediseño de producto (2026-08-21, tercera iteración de S4-005): el rango del barrido ya
// NO es incondicionalmente [ibcActual, topeEfectivo] — el tope legal aplastaba visualmente
// la zona relevante para la decisión del usuario en cualquier caso donde el objetivo era
// alcanzable con un esfuerzo mucho menor (verificado empíricamente: en un caso real el
// objetivo se alcanzaba al 6% del rango hasta el tope). El rango depende de si el objetivo
// es alcanzable — ver `construirBarridoEsfuerzoResultado`, que lee `escenarios` ya
// construido (por eso el barrido se calcula al final de esta función, no en paralelo).

import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'
import { obtenerTasaCotizacion } from '../../data/legal/index.js'
import { objetivoValorMensualEsValido } from './requisitosDatosImprescindiblesRPM.js'
import { evaluarElegibilidadProyectadaRPM, ESTADOS_ELEGIBILIDAD_RPM } from './evaluarElegibilidadProyectadaRPM.js'
import { evaluarDisponibilidadCuantiaRPM } from './evaluarDisponibilidadCuantiaRPM.js'

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

// Mismo umbral que DIAS_VENTANA_IBL_EFECTIVAMENTE_COTIZADOS de seleccionarPeriodosIBL.js
// (convención técnica documentada en trazabilidad-normativa.md) — duplicado aquí a
// propósito, exclusivamente para construir el mensaje/detalle de esta capa de
// resultado/orientación cuando el camino base falla por HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA
// (mismo criterio de duplicación ya usado por ExploraTuProyeccionRPM.jsx, Principio 9).
// Nunca se importa de seleccionarPeriodosIBL.js: esa capa no debe tocarse ni acoplarse
// desde aquí (decisión de producto, 2026-08-27, hallazgo de prueba manual con un caso
// real RPM/Colpensiones).
const DIAS_REFERENCIA_VENTANA_IBL = 3650

// elegibilidad/disponibilidadCuantia (E2, PL-260 Contratos A/B): parámetros aditivos, con
// default null — cada resultadoVacio existente antes de E2 sigue produciendo exactamente
// la misma forma que antes en esos dos campos nuevos cuando no aplica (ej. PERFIL_NO_EVALUABLE,
// antes de poder evaluar elegibilidad). Nunca reemplazan ni transforman detalleElegibilidad,
// que se conserva tal cual por compatibilidad con los consumidores ya existentes.
function resultadoVacio(codigo, razon, detalleElegibilidad = null, elegibilidad = null, disponibilidadCuantia = null) {
  return {
    escenarios: [],
    orientacion: { caminoMasAlineadoId: null, codigo, razon, objetivoLegalmenteInalcanzable: false },
    detalleElegibilidad,
    barrido: null,
    horizonte: null,
    semanas: null,
    elegibilidad,
    disponibilidadCuantia,
  }
}

// Duplicada a propósito de generarCaminosRAIS.js — misma lógica genérica (opera solo
// sobre estado/distanciaObjetivo, sin nada específico de RAIS ni de RPM), mismo criterio
// de duplicación ya usado en este proyecto para no acoplar un motor al archivo del otro
// régimen. Si un tercer régimen la necesitara, ahí correspondería extraerla.
// Códigos de descarte que significan "legal/estructuralmente inalcanzable, sin que ninguna
// elección del usuario lo cambie" — distinto de RESTRICCION_COSTO_LIMITA_RESULTADO (una
// limitación sobre un camino todavía VIABLE, causada por una restricción de costo que el
// propio usuario declaró y podría levantar). Decisión de producto, 2026-08-24: solo estos
// dos códigos deben apagar la distinción visual "Camino más alineado" — ver más abajo.
const CODIGOS_OBJETIVO_LEGALMENTE_INALCANZABLE = ['OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE', 'YA_EN_TOPE_LEGAL']

function calcularOrientacion(escenarios) {
  const viables = escenarios.filter((e) => e.estado === 'viable')

  if (viables.length === 0) {
    return {
      caminoMasAlineadoId: null,
      codigo: 'SIN_CAMINOS_VIABLES',
      razon: 'Ningún camino resultó evaluable con la información actual.',
      objetivoLegalmenteInalcanzable: false,
    }
  }

  const cumplen = viables.filter((e) => e.distanciaObjetivo.cumple)

  if (cumplen.length === 1) {
    return {
      caminoMasAlineadoId: cumplen[0].id,
      codigo: 'UNICO_CUMPLE',
      razon: 'Es el único camino evaluado que alcanza tu objetivo.',
      objetivoLegalmenteInalcanzable: false,
    }
  }

  if (cumplen.length > 1) {
    return {
      caminoMasAlineadoId: null,
      codigo: 'VARIOS_CUMPLEN_FALTA_PRIORIDAD',
      razon:
        'Más de un camino evaluado alcanza tu objetivo; falta que definas una prioridad entre ellos para elegir uno.',
      objetivoLegalmenteInalcanzable: false,
    }
  }

  const masCercano = viables.reduce((a, b) => (a.distanciaObjetivo.delta <= b.distanciaObjetivo.delta ? a : b))

  // Campo aditivo (decisión de producto, 2026-08-24): caminoMasAlineadoId/codigo/razon NO
  // cambian — se sigue calculando y conservando exactamente igual que antes, como
  // información determinista interna. Este campo solo le dice a la UI (y a la construcción
  // del contexto de la explicación IA) si esa cercanía matemática debe convertirse en una
  // distinción visual/de "posición oficial", o no — nunca borra ni recalcula el dato.
  const objetivoLegalmenteInalcanzable = escenarios.some(
    (e) => e.estado === 'descartado' && CODIGOS_OBJETIVO_LEGALMENTE_INALCANZABLE.includes(e.razonDescartado?.codigo)
  )

  return {
    caminoMasAlineadoId: masCercano.id,
    codigo: 'NINGUNO_CUMPLE_MAS_CERCANO',
    razon: 'Ningún camino evaluado alcanza tu objetivo completo; este es el que más se acerca.',
    objetivoLegalmenteInalcanzable,
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

const CANTIDAD_PUNTOS_BARRIDO = 5

// Margen de exploración de producto, NO una segunda meta del usuario — decisión Carlos/
// Atlas, 2026-08-21. Cuando el objetivo es alcanzable, el barrido se extiende un poco más
// allá de él (aproximadamente) para mostrar "qué ocurre un poco más allá de tu meta", sin
// llegar innecesariamente hasta el tope legal. Revisable como convención de producto, igual
// que la ventana de 3.650 días — ver trazabilidad-formula-RPM.md.
const MULTIPLICADOR_REFERENCIA_SUPERIOR = 1.25

const RAZON_SIN_MARGEN_TOPE_LEGAL = {
  codigo: 'SIN_MARGEN_TOPE_LEGAL',
  razon:
    'Ya declaraste una base actual en el tope máximo legal (25 SMLV) — no hay margen de IBC futuro para explorar.',
}

const RAZON_SIN_MARGEN_RESTRICCION_COSTO = {
  codigo: 'SIN_MARGEN_RESTRICCION_COSTO',
  razon: 'El límite que declaraste para tu aporte pensional adicional no deja margen de IBC futuro para explorar.',
}

const RAZON_OBJETIVO_YA_ALCANZADO = {
  codigo: 'OBJETIVO_YA_ALCANZADO',
  razon: 'Tu situación actual ya alcanza tu objetivo — no hace falta explorar ningún aumento.',
}

// Evalúa un único punto del barrido vía calcularProyeccionRPM (caja negra) y le da la
// misma forma que ya usa construirCamino() para esfuerzo/resultado — sin decision,
// limitaciones ni trazabilidad propias (S4-005 no es un camino, es una muestra).
function construirPuntoBarrido({ construirInput, ibcActual, tasaCotizacion, indice, posicion, valorCandidato }) {
  const proyeccion = calcularProyeccionRPM(construirInput(valorCandidato))
  return {
    indice,
    posicion,
    escenarioIbcFuturo: proyeccion.escenarioIbcFuturo,
    esfuerzo: construirEsfuerzo(ibcActual, proyeccion.escenarioIbcFuturo.valorAplicado, tasaCotizacion),
    resultado: { valor: proyeccion.pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
  }
}

// 5 puntos deterministas, uniformemente espaciados en IBC dentro de [ibcActual,
// limiteSuperior] — el mismo mecanismo para cualquiera de los 4 casos de S4-005, el único
// dato que cambia entre casos es dónde cae limiteSuperior y cómo se etiqueta ese extremo
// (posicionExtremo).
//
// Tratamiento de los extremos (decisión explícita, 2026-08-21): índice 0 = ibcActual
// exacto, índice 4 = limiteSuperior exacto — SIN Math.floor. Verificado contra el contrato
// real de calcularProyeccionRPM: valida únicamente Number.isFinite(escenarioIbcFuturo.valor),
// nunca Number.isInteger — no exige un IBC entero. Cuando limiteSuperior proviene de una
// restricción de costo, puede traer decimales; ese decimal es el límite matemático real de
// la restricción declarada, no un artefacto de redondeo, y el extremo superior lo
// representa tal cual, sin ocultarlo. Distinto de biseccionarEscenarioIbcFuturo (abajo),
// que sí redondea porque busca alcanzar un objetivo puntual — aquí no hay objetivo por
// punto, así que no hay razón de contrato para forzar un entero en los extremos.
//
// Los 3 puntos intermedios sí se redondean hacia abajo (Math.floor) a pesos enteros — son
// solo muestras exploratorias de la curva, no límites que deban preservarse exactos. Floor
// garantiza, por construcción y sin código adicional: (a) ningún punto excede
// limiteSuperior (el valor sin redondear ya es estrictamente menor); (b) orden no
// decreciente (floor de una secuencia no decreciente nunca decrece); (c) reproducibilidad
// (aritmética determinista, sin aleatoriedad ni dependencia de entorno).
function construirRejillaUniforme({ construirInput, ibcActual, limiteSuperior, posicionExtremo, tasaCotizacion }) {
  const ultimoIndice = CANTIDAD_PUNTOS_BARRIDO - 1
  const paso = (limiteSuperior - ibcActual) / ultimoIndice

  const puntos = []
  for (let indice = 0; indice < CANTIDAD_PUNTOS_BARRIDO; indice++) {
    let valorCandidato
    let posicion
    if (indice === 0) {
      valorCandidato = ibcActual
      posicion = 'actual'
    } else if (indice === ultimoIndice) {
      valorCandidato = limiteSuperior
      posicion = posicionExtremo
    } else {
      valorCandidato = Math.floor(ibcActual + indice * paso)
      posicion = 'intermedio'
    }
    puntos.push(construirPuntoBarrido({ construirInput, ibcActual, tasaCotizacion, indice, posicion, valorCandidato }))
  }
  return puntos
}

// Reutiliza un escenario de `escenarios` (S4-003) tal cual, sin volver a evaluar
// calcularProyeccionRPM — usado exclusivamente para `puntoObjetivo`, que debe ser
// bit-idéntico a lo que ya muestra la comparación de caminos (S4-003/S4-004).
function puntoDesdeEscenario(escenario) {
  return {
    escenarioIbcFuturo: escenario.entradas.escenarioIbcFuturo,
    esfuerzo: escenario.esfuerzo,
    resultado: escenario.resultado,
  }
}

/**
 * Construye `barrido` a partir de `escenarios` ya resuelto (S4-003) — no recalcula nada
 * que S4-003 ya haya decidido, solo lee su resultado para elegir el rango a explorar.
 *
 * Cuatro casos, en este orden de prioridad:
 * 1. El camino base ya cumple el objetivo → 'objetivo_ya_alcanzado', sin puntos (ninguna
 *    curva de aumentos innecesarios).
 * 2. No hay alternativo viable (objetivo no alcanzable, ni en el tope legal ni dentro de
 *    la restricción) → rango hasta topeEfectivo — aquí sí importa "¿hasta dónde podrías
 *    llegar como máximo?".
 * 3. Hay alternativo viable pero no cumple el objetivo (la restricción de costo lo impidió
 *    — único caso posible por construcción, ver auditoría de S4-003) → mismo rango que ya
 *    encontró el alternativo (topeEfectivo), reutilizado, nunca recalculado.
 * 4. El alternativo cumple el objetivo → el rango se extiende hasta
 *    objetivoValorMensual × 1.25 (margen de exploración de producto, nunca una segunda
 *    meta), encontrado reutilizando biseccionarEscenarioIbcFuturo con un objetivo distinto
 *    — misma infraestructura de búsqueda de S4-003, sin segunda fórmula. Si ese margen no
 *    cabe en topeEfectivo, la propia bisección converge honestamente al límite real (mismo
 *    mecanismo ya usado cuando un objetivo no es alcanzable — no hace falta ninguna
 *    verificación previa).
 */
function construirBarridoEsfuerzoResultado({
  construirInput,
  ibcActual,
  topeAplicado,
  topeEfectivo,
  tasaCotizacion,
  objetivoValorMensual,
  escenarioBase,
  alternativo,
}) {
  if (escenarioBase.distanciaObjetivo.cumple) {
    return { estado: 'objetivo_ya_alcanzado', ...RAZON_OBJETIVO_YA_ALCANZADO, puntos: [], puntoObjetivo: null }
  }

  if (!alternativo || alternativo.estado !== 'viable') {
    if (topeEfectivo <= ibcActual) {
      const razonSinMargen = topeAplicado <= ibcActual ? RAZON_SIN_MARGEN_TOPE_LEGAL : RAZON_SIN_MARGEN_RESTRICCION_COSTO
      return { estado: 'sin_margen', ...razonSinMargen, puntos: [], puntoObjetivo: null }
    }
    const puntos = construirRejillaUniforme({
      construirInput,
      ibcActual,
      limiteSuperior: topeEfectivo,
      posicionExtremo: 'extremo_superior',
      tasaCotizacion,
    })
    return { estado: 'calculado', codigo: null, razon: null, puntos, puntoObjetivo: null }
  }

  if (!alternativo.distanciaObjetivo.cumple) {
    if (topeEfectivo <= ibcActual) {
      return { estado: 'sin_margen', ...RAZON_SIN_MARGEN_RESTRICCION_COSTO, puntos: [], puntoObjetivo: null }
    }
    const puntos = construirRejillaUniforme({
      construirInput,
      ibcActual,
      limiteSuperior: topeEfectivo,
      posicionExtremo: 'limite_restriccion',
      tasaCotizacion,
    })
    return { estado: 'calculado', codigo: null, razon: null, puntos, puntoObjetivo: null }
  }

  // Reutiliza el mismo construirInput que arma la rejilla (mismo origen,
  // 'barrido_esfuerzo_resultado') — el resultado de esta búsqueda interna nunca se expone
  // tal cual; solo se leen su IBC final y su pensión proyectada, y el punto 4 de la
  // rejilla se vuelve a evaluar más abajo con el mismo mecanismo que los otros 4 puntos.
  const objetivoReferenciaSuperior = objetivoValorMensual * MULTIPLICADOR_REFERENCIA_SUPERIOR
  const resultadoReferenciaSuperior = biseccionarEscenarioIbcFuturo({
    construirInput,
    ibcActual,
    topeAplicado: topeEfectivo,
    objetivoValorMensual: objetivoReferenciaSuperior,
  })
  const ibcReferenciaSuperior = resultadoReferenciaSuperior.escenarioIbcFuturo.valorAplicado
  const referenciaSuperiorAlcanzada = resultadoReferenciaSuperior.pensionMensualProyectada >= objetivoReferenciaSuperior

  // §8.5 (monotonicidad) garantiza ibcReferenciaSuperior >= ibcObjetivo del alternativo —
  // objetivoReferenciaSuperior > objetivoValorMensual, y ambas búsquedas comparten el mismo
  // límite superior (topeEfectivo). No se defiende con Math.max: es una invariante
  // demostrada, no un caso incierto.
  const posicionExtremo = referenciaSuperiorAlcanzada
    ? 'referencia_superior'
    : topeEfectivo < topeAplicado
      ? 'limite_restriccion'
      : 'extremo_superior'

  const puntos = construirRejillaUniforme({
    construirInput,
    ibcActual,
    limiteSuperior: ibcReferenciaSuperior,
    posicionExtremo,
    tasaCotizacion,
  })

  return { estado: 'calculado', codigo: null, razon: null, puntos, puntoObjetivo: puntoDesdeEscenario(alternativo) }
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
 * @param {number|null} [input.esfuerzoAdicionalMensualDeseado] - monto EXACTO que la
 *   persona quiere evaluar como escenario (distinto de restriccionCostoPensionalAdicionalMaximoMensual,
 *   que es un techo para la búsqueda del alternativo, no un punto a evaluar). Default null
 *   — sin él, el tercer camino no se genera. Debe ser un número finito > 0; cualquier otro
 *   valor (null, 0, negativo, no numérico) se trata como "no solicitado", nunca como error.
 * @param {{cantidad: number, certeza: ('conocido'|'aproximado')} | null} [input.semanasReferenciaDeclaradas] -
 *   Contrato GO-B (2026-08-25) — semanas agregadas ya declaradas en
 *   `InformacionPensionalEsencial.jsx`. Se propaga sin modificación a CADA llamada
 *   interna de `calcularProyeccionRPM` (base, bisección del alternativo, barrido,
 *   personalizado) vía `escenarioBaseInput` — la misma fuente de semanas para todos los
 *   caminos de una misma proyección, nunca una distinta por camino. Ver
 *   `calcularProyeccionRPM.js` para el contrato completo (precedencia, nunca-suma,
 *   nunca habilita el IBL alternativo). Default `null` — comportamiento idéntico al
 *   existente antes de GO-B.
 * @param {string} [input.fecha]
 * @returns {{
 *   escenarios: Array<Object>,
 *   orientacion: { caminoMasAlineadoId: string|null, codigo: string, razon: string, objetivoLegalmenteInalcanzable: boolean },
 *   detalleElegibilidad: Object|null,
 *   barrido: {
 *     estado: 'calculado'|'sin_margen'|'objetivo_ya_alcanzado',
 *     codigo: string|null,
 *     razon: string|null,
 *     puntos: Array<{
 *       indice: number,
 *       posicion: 'actual'|'intermedio'|'referencia_superior'|'limite_restriccion'|'extremo_superior',
 *       escenarioIbcFuturo: Object,
 *       esfuerzo: Object,
 *       resultado: { valor: number, moneda: 'COP', periodoReferencia: 'mensual' },
 *     }>,
 *     puntoObjetivo: { escenarioIbcFuturo: Object, esfuerzo: Object, resultado: Object } | null,
 *   } | null,
 *   horizonte: { fechaInicio: string, fechaFin: string, diasCotizados: number } | null,
 *   semanas: {
 *     observadas: number, futuras: number, sustentadasPorHistoria: number,
 *     declaradas: number|null, certeza: ('conocido'|'aproximado')|null, total: number,
 *     fuente: ('declaracion_agregada'|'historia_estructurada'),
 *   } | null,
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
  esfuerzoAdicionalMensualDeseado = null,
  semanasReferenciaDeclaradas = null,
  fecha = hoyISO(),
}) {
  // --- Perfil (S4-001: sin restricción de tipoCotizante/lugarCotizacion/trasladoRegimen) ---
  if (regimenActual !== 'RPM') {
    return resultadoVacio('PERFIL_NO_EVALUABLE', 'Este análisis de caminos solo está disponible hoy para régimen RPM.')
  }

  // --- Elegibilidad proyectada (E2, PL-260 Contrato A) ---
  // Responde "¿cumplirías edad y semanas?" de forma completamente independiente de si el
  // IBL es calculable — se evalúa primero, y no requiere ibcAplicableSimulacion ni
  // objetivoValorMensual (esos pertenecen a la simulación económica, no a la elegibilidad).
  // Antes de este Slice, el requisito de semanas solo podía confirmarse DESPUÉS de que
  // calcularProyeccionRPM tuviera éxito (leyendo resultadoBase.semanasCotizadas.total) —
  // así que una historia insuficiente para la ventana del IBL bloqueaba también la
  // respuesta a "¿cumples semanas?", aunque esa respuesta fuera perfectamente calculable
  // con los datos ya disponibles (hallazgo de diagnóstico, caso real Oscar/Colpensiones).
  const elegibilidad = evaluarElegibilidadProyectadaRPM({
    sexo,
    fechaNacimiento,
    edadJubilacionDeseada,
    historiaCotizacion,
    semanasReferenciaDeclaradas,
    fecha,
  })

  if (elegibilidad.estado === ESTADOS_ELEGIBILIDAD_RPM.NO_EVALUABLE) {
    // Punto 5/8 (corrección E2) + corrección de riesgo funcional (2026-09-04): lista de
    // causas estructurales ampliada con las razones que evaluarElegibilidadProyectadaRPM.js
    // puede devolver desde la corrección de fecha/edad (punto 1/3/4) y con las cuatro
    // razones de historia temporalmente inconsistente (validarHistoriaCotizacionTemporal.js)
    // — todas hard-stop: sin datos estructurales válidos, o con una historia que
    // calcularProyeccionRPM.js rechazaría de todas formas (o que produciría doble conteo
    // del futuro si se dejara pasar), no tiene sentido intentar calcularProyeccionRPM.
    const razonEstructural = elegibilidad.razones.find((r) =>
      [
        'SEXO_NO_DECLARADO',
        'FECHA_NACIMIENTO_NO_VALIDA',
        'EDAD_JUBILACION_NO_VALIDA',
        'EDAD_JUBILACION_FUERA_DE_RANGO_FUNCIONAL',
        'FECHA_OBJETIVO_NO_POSTERIOR_A_FECHA_CALCULO',
        'HISTORIA_NO_ES_ARREGLO_VALIDO',
        'HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA',
        'HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS',
        'HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO',
      ].includes(r.codigo)
    )
    // Datos estructurales realmente ausentes o inconsistentes — hard stop: sin ellos no se
    // puede calcular nada, ni siquiera intentar calcularProyeccionRPM. Mismos mensajes que
    // antes de este Slice (sin cambio de texto) para las tres causas originales.
    if (razonEstructural) {
      return resultadoVacio('DATOS_INCOMPLETOS', razonEstructural.mensaje, null, elegibilidad)
    }
    // Único otro caso posible: SEMANAS_ACTUALES_SIN_EVIDENCIA (sin historia ni
    // declaración) — no hay evidencia suficiente para CONFIRMAR ni para DESCARTAR el
    // requisito de semanas, aunque edad/fecha/sexo sí están completos. No se bloquea aquí
    // a propósito: se deja continuar para que calcularProyeccionRPM dé su propio
    // diagnóstico específico (p. ej. HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA) en
    // vez de una afirmación de "no cumples semanas" que los datos no sustentan.
  } else if (elegibilidad.estado !== ESTADOS_ELEGIBILIDAD_RPM.CUMPLE) {
    const razonEdad = elegibilidad.razones.find((r) => r.codigo === 'EDAD_INSUFICIENTE')
    const razonSemanas = elegibilidad.razones.find((r) => r.codigo === 'SEMANAS_INSUFICIENTES')

    if (elegibilidad.estado === ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_NINGUNO) {
      return resultadoVacio(
        'EDAD_Y_SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM',
        `${razonEdad.mensaje} ${razonSemanas.mensaje}`,
        { ...razonEdad.detalle, ...razonSemanas.detalle, fuenteSemanas: elegibilidad.semanasActuales.procedencia },
        elegibilidad
      )
    }
    if (elegibilidad.estado === ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_EDAD) {
      return resultadoVacio('EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL', razonEdad.mensaje, razonEdad.detalle, elegibilidad)
    }
    // NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO — misma redacción sensible a la fuente ya
    // aprobada antes de este Slice (contrato GO-B): "con la historia..." vs "con las
    // semanas que declaraste...", construida ahora desde `elegibilidad` (mismos números
    // exactos que antes, verificado: misma fórmula que resultadoBase.semanasCotizadas
    // habría dado, vía resolverSemanasProyectadasRPM.js compartido).
    const fraseFuente =
      elegibilidad.semanasActuales.procedencia === 'declaracion_agregada'
        ? 'Con las semanas que declaraste y el escenario de cotización futuro utilizado'
        : 'Con la historia y el escenario de cotización utilizados'
    return resultadoVacio(
      'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM',
      `${fraseFuente}, a esa fecha proyectamos ${elegibilidad.semanasTotalesEnFechaObjetivo.toFixed(1)} semanas. El requisito legal aplicable es ${elegibilidad.semanasMinimasAplicables.valor}; faltarían ${(elegibilidad.semanasMinimasAplicables.valor - elegibilidad.semanasTotalesEnFechaObjetivo).toFixed(1)} semanas.`,
      { ...razonSemanas.detalle, fuenteSemanas: elegibilidad.semanasActuales.procedencia },
      elegibilidad
    )
  }

  // --- Datos imprescindibles restantes ---
  // No forman parte de la elegibilidad (edad/semanas ya se resolvieron arriba sin
  // necesitarlos): pertenecen a la simulación económica.
  if (!esNumeroValido(ibcAplicableSimulacion) || ibcAplicableSimulacion <= 0) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta una base de cotización apta para simular.', null, elegibilidad)
  }
  if (!objetivoValorMensualEsValido(objetivoValorMensual)) {
    return resultadoVacio('DATOS_INCOMPLETOS', 'Todavía falta declarar tu objetivo de pensión mensual.', null, elegibilidad)
  }

  const escenarioBaseInput = {
    historiaCotizacion,
    fechaNacimiento,
    edadJubilacionDeseada,
    escenarioIbcFuturo: { valor: ibcAplicableSimulacion, origen: 'continuidad_ibc_actual' },
    fecha,
    // Contrato GO-B: misma fuente de semanas para TODOS los caminos de esta proyección —
    // se propaga tal cual (spread de escenarioBaseInput) a la bisección del alternativo,
    // el barrido y el esfuerzo personalizado, más abajo. Nunca una fuente distinta por
    // camino.
    semanasReferenciaDeclaradas,
  }

  const resultadoBase = calcularProyeccionRPM(escenarioBaseInput)

  // --- Disponibilidad de cuantía (E2, PL-260 Contrato B) ---
  // Interpreta el resultado ya producido arriba — nunca vuelve a llamar
  // calcularProyeccionRPM ni recalcula la ventana del IBL.
  const disponibilidadCuantia = evaluarDisponibilidadCuantiaRPM(resultadoBase, { historiaCotizacion })

  if (disponibilidadCuantia.estado !== 'CUANTIA_CALCULABLE') {
    // Hallazgo de prueba manual (2026-08-27, caso real RPM/Colpensiones), preservado tal
    // cual de antes de este Slice: cuando la causa es específicamente la ventana del IBL,
    // se conserva la razón exacta con cifras, nunca el mensaje genérico de
    // SIN_CAMINOS_VIABLES — con `elegibilidad` ahora siempre adjunta (E2), de modo que un
    // caso elegible por edad y semanas nunca se confunde con uno que no cumple requisitos.
    if (resultadoBase.razonNoEvaluable === 'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA') {
      const diasEfectivos = disponibilidadCuantia.diasIBLCubiertos
      const razon =
        diasEfectivos !== null
          ? `Para calcular esta proyección todavía necesitamos completar una parte de tu historia de ` +
            `cotización — con la información disponible identificamos ${diasEfectivos} de los ` +
            `${DIAS_REFERENCIA_VENTANA_IBL} días de cotización que esta proyección necesita.`
          : 'Para calcular esta proyección todavía necesitamos completar una parte de tu historia de cotización.'
      return resultadoVacio(
        'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA',
        razon,
        { diasEfectivosAcumulados: diasEfectivos, diasVentanaRequeridos: DIAS_REFERENCIA_VENTANA_IBL },
        elegibilidad,
        disponibilidadCuantia
      )
    }
    return resultadoVacio(
      'SIN_CAMINOS_VIABLES',
      'No fue posible calcular ni siquiera el camino base con los datos actuales.',
      null,
      elegibilidad,
      disponibilidadCuantia
    )
  }

  // --- Verificación de semanas diferida (E2) ---
  // Se ejecuta ÚNICAMENTE cuando elegibilidad quedó en NO_EVALUABLE_DATOS_INSUFICIENTES
  // por falta de evidencia de semanas (sin historia ni declaración agregada — el único
  // otro motivo posible de ese estado, SEXO/FECHA/EDAD inválidos, ya hizo hard stop más
  // arriba). En ese caso específico, elegibilidad no pudo confirmar ni descartar el
  // requisito de semanas con un límite inferior de 0 — pero calcularProyeccionRPM, si
  // llegó hasta aquí, ya resolvió con éxito la ventana del IBL y su
  // resultadoBase.semanasCotizadas.total es ahora la cifra autoritativa (misma fórmula,
  // resolverSemanasProyectadasRPM.js, que elegibilidad ya usó — nunca diverge). Cuando
  // elegibilidad ya fue confiada arriba (CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO), esta verificación NUNCA se
  // repite: sería recalcular con certeza algo que ya se resolvió con certeza.
  if (elegibilidad.estado === ESTADOS_ELEGIBILIDAD_RPM.NO_EVALUABLE) {
    const semanasMinimasValor = elegibilidad.semanasMinimasAplicables.valor
    const semanasProyectadas = resultadoBase.semanasCotizadas.total
    if (semanasProyectadas < semanasMinimasValor) {
      const semanasFaltantes = semanasMinimasValor - semanasProyectadas
      const fraseFuente =
        resultadoBase.semanasCotizadas.fuente === 'declaracion_agregada'
          ? 'Con las semanas que declaraste y el escenario de cotización futuro utilizado'
          : 'Con la historia y el escenario de cotización utilizados'
      return resultadoVacio(
        'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM',
        `${fraseFuente}, a esa fecha proyectamos ${semanasProyectadas.toFixed(1)} semanas. El requisito legal aplicable es ${semanasMinimasValor}; faltarían ${semanasFaltantes.toFixed(1)} semanas.`,
        { semanasMinimas: semanasMinimasValor, semanasProyectadas, semanasFaltantes, fuenteSemanas: resultadoBase.semanasCotizadas.fuente },
        elegibilidad,
        disponibilidadCuantia
      )
    }
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

  // --- Rango compartido por el barrido (S4-005) y por el camino alternativo (S4-003) ---
  // Límite propio declarado por el usuario (restricción de costo), convertido a un límite
  // de IBC — mismo criterio que generarCaminosRAIS.js: dividir entre la tasa de
  // cotización, nunca sumar directamente el peso de restricción al IBC.
  const topeAplicado = resultadoBase.escenarioIbcFuturo.topeAplicado
  const limiteIBCPorRestriccion =
    restriccionCostoPensionalAdicionalMaximoMensual !== null && esNumeroValido(restriccionCostoPensionalAdicionalMaximoMensual)
      ? ibcAplicableSimulacion + restriccionCostoPensionalAdicionalMaximoMensual / tasaCotizacionFraccion
      : Infinity
  const topeEfectivo = Math.min(topeAplicado, limiteIBCPorRestriccion)

  // --- Camino alternativo: buscar el IBC futuro necesario ---
  // Solo se genera cuando el base no alcanza el objetivo — si ya lo alcanza o lo supera,
  // no hay brecha que cerrar (mismo criterio que generarCaminosRAIS.js).
  if (escenarioBase.distanciaObjetivo.delta > 0) {
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
        // topeEfectivo ya está calculado arriba (rango compartido con el barrido de S4-005).
        //
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

  // --- Camino personalizado: esfuerzo adicional mensual EXACTO que la persona declaró
  // querer explorar --- Independiente de lo que haya ocurrido arriba con el camino
  // alternativo (que busca el IBC mínimo para alcanzar el objetivo): aquí no se busca
  // nada, se EVALÚA una sola vez el monto exacto declarado — mismo criterio "sin
  // búsqueda, una sola evaluación" ya usado por cada punto del barrido
  // (construirPuntoBarrido). Sin margen (ibcAplicableSimulacion ya en o sobre el tope
  // legal): mismo tratamiento y mismo código que el camino alternativo en esa situación
  // (YA_EN_TOPE_LEGAL) — la causa real es idéntica, así que no se inventa un segundo
  // código de descarte para ella.
  if (esNumeroValido(esfuerzoAdicionalMensualDeseado) && esfuerzoAdicionalMensualDeseado > 0) {
    if (ibcAplicableSimulacion >= topeAplicado) {
      escenarios.push(
        caminoDescartado(
          'esfuerzo-adicional-deseado',
          'Con el esfuerzo mensual que elegiste.',
          {
            codigo: 'YA_EN_TOPE_LEGAL',
            mensaje:
              'Ya declaraste una base actual sobre el tope máximo legal (25 SMLV) — no es posible proponer un ' +
              'IBC futuro mayor. Este tope se evalúa con el SMLV vigente en la fecha de esta simulación; ' +
              'PensionLab todavía no proyecta el SMLV futuro.',
            reglaAplicada: 'tope-maximo-ibc',
          }
        )
      )
    } else {
      // Misma conversión monto→IBC que limiteIBCPorRestriccion (arriba) — no una fórmula
      // paralela. El tope legal se aplica dentro de calcularProyeccionRPM
      // (escenarioIbcFuturo.valorAplicado = Math.min(valorDeclarado, topeAplicado)), nunca
      // recortado aquí: si el monto declarado excede el margen legal disponible,
      // construirEsfuerzo (dentro de construirCamino) calcula el costo real a partir del
      // IBC ya recortado — el costoPensionalAdicionalMensual resultante puede entonces ser
      // legítimamente menor que el monto pedido, nunca mayor ni inventado.
      const ibcCandidato = ibcAplicableSimulacion + esfuerzoAdicionalMensualDeseado / tasaCotizacionFraccion
      const resultadoPersonalizado = calcularProyeccionRPM({
        ...escenarioBaseInput,
        escenarioIbcFuturo: { valor: ibcCandidato, origen: 'esfuerzo_adicional_declarado' },
      })

      escenarios.push(
        construirCamino({
          id: 'esfuerzo-adicional-deseado',
          tipo: 'alternativo',
          decision: 'Con el esfuerzo mensual que elegiste.',
          proyeccion: resultadoPersonalizado,
          edadJubilacionDeseada,
          ibcActual: ibcAplicableSimulacion,
          tasaCotizacion: tasaCotizacionFraccion,
          objetivoValorMensual,
        })
      )
    }
  }

  // S4-005: el barrido se construye al final, a partir de escenarios ya resuelto — su
  // rango depende de si el objetivo es alcanzable (ver construirBarridoEsfuerzoResultado),
  // así que no puede calcularse antes de saber qué encontró el camino alternativo.
  const alternativo = escenarios.find((e) => e.id === 'aumentar-ibc-futuro') ?? null
  const barrido = construirBarridoEsfuerzoResultado({
    construirInput: (valor) => ({
      ...escenarioBaseInput,
      escenarioIbcFuturo: { valor, origen: 'barrido_esfuerzo_resultado' },
    }),
    ibcActual: ibcAplicableSimulacion,
    topeAplicado,
    topeEfectivo,
    tasaCotizacion: tasaCotizacionFraccion,
    objetivoValorMensual,
    escenarioBase,
    alternativo,
  })

  // Horizonte temporal (§14 punto 9 del Entregable 2) — un único campo top-level, no uno
  // por camino: fecha/fechaNacimiento/edadJubilacionDeseada son idénticos en cada llamada
  // interna a calcularProyeccionRPM dentro de esta función (camino base, bisección del
  // alternativo, y cada punto del barrido reutilizan escenarioBaseInput, solo varía
  // escenarioIbcFuturo.valor) — el horizonte es, por construcción, el mismo en todos.
  // resultadoBase.horizonteFuturo ya está calculado (S4-002) — se reexpone tal cual, sin
  // recalcular ni derivar nada nuevo.
  const horizonte = resultadoBase.horizonteFuturo

  // Mismo criterio que horizonte, arriba (contrato GO-B, 2026-08-25): un único campo
  // top-level, reexpuesto tal cual desde resultadoBase.semanasCotizadas — nunca uno por
  // camino, porque semanasReferenciaDeclaradas es la misma en cada llamada interna (ver
  // escenarioBaseInput). Le da a la UI la fuente/certeza/cifras trazables sin recalcular
  // nada ni leer dentro de un escenario individual.
  const semanas = resultadoBase.semanasCotizadas

  // diferenciaFrenteABase (decisión de producto, 2026-08-24) — post-proceso final, un único
  // punto del flujo: NUNCA vuelve a llamar calcularProyeccionRPM ni reconstruye ninguna
  // pensión, solo resta dos resultados YA calculados (mismo patrón que distanciaObjetivo.delta,
  // arriba). Para el propio escenarioBase da 0 por construcción (se resta contra sí mismo),
  // sin ningún caso especial por id. null para un escenario 'descartado' (resultado === null,
  // nada que restar). Esto NO es una fórmula pensional nueva — es aritmética de presentación
  // sobre resultados ya cerrados, deliberadamente en dominio (no en la UI) para que quede en
  // el mismo lugar que distanciaObjetivo y no se duplique el cálculo en ningún helper.
  const escenariosConDiferencia = escenarios.map((e) => ({
    ...e,
    diferenciaFrenteABase: e.resultado ? { delta: e.resultado.valor - escenarioBase.resultado.valor } : null,
  }))

  return {
    escenarios: escenariosConDiferencia,
    orientacion: calcularOrientacion(escenariosConDiferencia),
    detalleElegibilidad: null,
    barrido,
    horizonte,
    semanas,
    // E2, PL-260 Contratos A/B — aditivos: ningún consumidor existente antes de este
    // Slice lee estas dos claves, así que su presencia no cambia el comportamiento de
    // ProyectaTuPensionRPM.jsx ni de ningún otro consumidor ya desplegado.
    elegibilidad,
    disponibilidadCuantia,
  }
}
