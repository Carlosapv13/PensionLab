// E3-A (sprint-4-correcciones-oscar-baldor) — función pura de ajuste legal posterior a la
// fórmula RPM. Corrige el defecto reportado por Oscar: el motor podía mostrar una pensión
// matemática por debajo del salario mínimo (violando el piso del Art. 35 Ley 100/1993) y,
// a partir de esa cifra sin ajustar, recomendar aumentos de IBC innecesarios.
//
// Decisiones Carlos/Atlas que fijan el contrato de esta función:
//
// 1. La tasa máxima del 80% (Art. 34 Ley 100/1993, mod. Art. 10 Ley 797/2003) permanece
//    DENTRO de formulaRPM.js (ver desglosarTasaReemplazoRPM) — esta función nunca la
//    recalcula ni la vuelve a aplicar. `limiteOchentaPorciento` en la salida es
//    exclusivamente informativo/trazable, tomado tal cual del desglose recibido.
// 2. Esta capa SOLO evalúa dos ajustes, en este orden: (a) piso de 1 SMLMV (Constitución
//    Art. 48; Ley 100/1993 Art. 35); (b) techo absoluto de 25 SMLMV (Acto Legislativo 01 de
//    2005), aplicado DESPUÉS del piso.
// 3. La mesada final ajustada SOLO existe si `elegibilidad.estado` es exactamente
//    ESTADOS_ELEGIBILIDAD_RPM.CUMPLE (ver evaluarElegibilidadProyectadaRPM.js). Fuera de
//    ese caso, esta función distingue TRES ramas, no dos (corrección de coherencia con la
//    separación ya establecida en E2 — evaluarElegibilidadProyectadaRPM.js): (A) CUMPLE →
//    continúa hacia vigencia/piso/techo; (B) incumplimiento CANÓNICO Y CONFIRMADO
//    (NO_CUMPLE_EDAD/NO_CUMPLE_SEMANAS/NO_CUMPLE_NINGUNO) → razón
//    NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO; (C) NO_EVALUABLE → incertidumbre, no
//    incumplimiento, razón ELEGIBILIDAD_NO_EVALUABLE, sin llamar "no elegible" a un caso
//    de "no sabemos". Un `elegibilidad.estado` que no pertenece al conjunto canónico de
//    ESTADOS_ELEGIBILIDAD_RPM es ENTRADA_INVALIDA, nunca se trata como incumplimiento por
//    defecto. Aplicar el piso sin elegibilidad confirmada convertiría, por construcción del
//    propio ajuste, a cualquier persona en "pensionada de al menos 1 SMLMV" — exactamente
//    lo que esta decisión prohíbe. CUMPLE nunca afirma un derecho reconocido, solo que la
//    proyección cumpliría los requisitos generales en la fecha objetivo (distinción ya
//    establecida en evaluarElegibilidadProyectadaRPM.js — este archivo no la reinterpreta).
// 4. Cierre del modelo de vigencia (2026-09-07): esta función NUNCA exige que la norma de
//    SMLMV esté "firme" o libre de litigios — exige que esté OPERATIVAMENTE VIGENTE. Recibe
//    ya interpretado el contrato `vigenciaSmlv` (ver evaluarVigenciaSmlv, data/legal/
//    index.js) — nunca lee `estadoJuridico`/`listoParaProduccion` (el esquema interno de
//    LegalRuleEntry) directamente, para no acoplarse a detalles de data/legal que no le
//    conciernen. Si `vigenciaSmlv.aptoParaCalculoEnFechaBase` es true, el ajuste se aplica
//    — con una advertencia estructurada si hay litigio pendiente. Si es false (suspensión
//    activa, fuera de vigencia, o fuente insuficiente), no se aplica en silencio.
// 5. PensionLab trabaja en pesos de hoy: el cálculo interno de piso/techo se hace en
//    unidades de SMLMV (1 y 25 — la propia fórmula del Art. 34 ya trabaja en
//    `s = IBL/SMLV`, así que esta capa no introduce una unidad nueva). La conversión a pesos
//    usa el SMLMV de `fechaBaseMonetaria` (hoy) como ancla — nunca se pronostica el SMLMV
//    nominal de `fechaReconocimientoProyectada`. Mantener el equivalente de 1 SMLMV en
//    términos reales hasta esa fecha futura es una CONVENCIÓN DE ESCENARIO del producto, no
//    una garantía legal sobre el valor nominal futuro — declarada en `supuestos`.
// 6. Esta función es neutral del dominio: no importa React, no importa IA, no lee
//    data/legal directamente (recibe todo ya resuelto) y no se integra todavía en
//    generarCaminosRPM.js ni en ningún orquestador.

import { ESTADOS_ELEGIBILIDAD_RPM } from './evaluarElegibilidadProyectadaRPM.js'
import { esFechaValida } from './validarHistoriaCotizacionTemporal.js'

const VALOR_SMLMV_PISO = 1
const VALOR_SMLMV_TECHO = 25

const ESTADOS_ELEGIBILIDAD_VALIDOS = new Set(Object.values(ESTADOS_ELEGIBILIDAD_RPM))

// Separación E2 preservada explícitamente (cierre E3-A, corrección de coherencia): un
// escenario que NO CUMPLE los requisitos (edad y/o semanas insuficientes, con evidencia) es
// jurídicamente distinto de un escenario NO EVALUABLE (datos insuficientes para siquiera
// concluir) — el primero es incumplimiento confirmado, el segundo es incertidumbre. Tratar
// ambos como "no elegible" habría contradicho esa separación ya establecida en
// evaluarElegibilidadProyectadaRPM.js (E2). CUMPLE se maneja aparte, fuera de este set.
const ESTADOS_ELEGIBILIDAD_INCUMPLIMIENTO = new Set([
  ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_EDAD,
  ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_SEMANAS,
  ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_NINGUNO,
])

const SUPUESTO_CONVENCION_PESOS_DE_HOY = {
  codigo: 'PISO_TECHO_EN_PESOS_DE_HOY_SIN_PRONOSTICO_SMLMV_FUTURO',
  mensaje:
    'El piso y el techo legal se evalúan en unidades de SMLMV y se expresan en pesos de la ' +
    'fecha base de este cálculo (hoy) — PensionLab no pronostica cuál será el SMLMV nominal ' +
    'en la fecha proyectada de reconocimiento. Asumir que 1 SMLMV conservará su poder ' +
    'adquisitivo real hasta esa fecha es una convención de este escenario, no una garantía ' +
    'legal sobre el valor nominal futuro.',
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function esDesgloseValido(desglose) {
  return (
    desglose !== null &&
    typeof desglose === 'object' &&
    esNumeroValido(desglose.tasaInicial) &&
    esNumeroValido(desglose.bloquesAdicionales) &&
    esNumeroValido(desglose.incrementoPorSemanas) &&
    esNumeroValido(desglose.tasaFinalAplicada) &&
    typeof desglose.limiteOchentaPorcientoAplicado === 'boolean'
  )
}

function normaRefValida(ref) {
  return ref !== null && typeof ref === 'object' && typeof ref.fuente === 'string' && ref.fuente.length > 0 && typeof ref.articulo === 'string' && ref.articulo.length > 0
}

function esSmlvValido(smlv) {
  return smlv !== null && typeof smlv === 'object' && esNumeroValido(smlv.valor) && smlv.valor > 0
}

function esVigenciaSmlvValida(vigenciaSmlv) {
  return vigenciaSmlv !== null && typeof vigenciaSmlv === 'object' && typeof vigenciaSmlv.aptoParaCalculoEnFechaBase === 'boolean'
}

function esElegibilidadValida(elegibilidad) {
  return elegibilidad !== null && typeof elegibilidad === 'object' && ESTADOS_ELEGIBILIDAD_VALIDOS.has(elegibilidad.estado)
}

// Tabla declarativa de validación — un único punto que enumera qué hace inválida cada
// entrada, en vez de repetir el mismo bloque `return {...base, razon: {...}}` una vez por
// campo (duplicación encontrada en la revisión de complejidad, corregida aquí).
function primerCampoInvalido(entradas) {
  const reglas = [
    ['resultadoMatematico', !esNumeroValido(entradas.resultadoMatematico) || entradas.resultadoMatematico < 0, 'resultadoMatematico ausente, no numérico o negativo.'],
    ['ibl', !esNumeroValido(entradas.ibl) || entradas.ibl <= 0, 'ibl ausente, no numérico o no positivo.'],
    ['desgloseTasa', !esDesgloseValido(entradas.desgloseTasa), 'desgloseTasa ausente o incompleto — se espera la salida de desglosarTasaReemplazoRPM().'],
    ['smlv', !esSmlvValido(entradas.smlv), 'smlv ausente, no numérico o no positivo.'],
    ['vigenciaSmlv', !esVigenciaSmlvValida(entradas.vigenciaSmlv), 'vigenciaSmlv ausente o sin aptoParaCalculoEnFechaBase booleano — se espera la salida de evaluarVigenciaSmlv().'],
    ['elegibilidad', !esElegibilidadValida(entradas.elegibilidad), 'elegibilidad ausente o con estado no reconocido (se espera un valor de ESTADOS_ELEGIBILIDAD_RPM).'],
    ['fechaBaseMonetaria', !esFechaValida(entradas.fechaBaseMonetaria), 'fechaBaseMonetaria ausente o con formato inválido.'],
    ['fechaReconocimientoProyectada', !esFechaValida(entradas.fechaReconocimientoProyectada), 'fechaReconocimientoProyectada ausente o con formato inválido.'],
    ['referenciasNormativas', !entradas.referenciasNormativas || !normaRefValida(entradas.referenciasNormativas.piso) || !normaRefValida(entradas.referenciasNormativas.techo), 'referenciasNormativas ausente o incompleta (se requiere piso y techo, cada una con fuente y articulo).'],
  ]
  const fallo = reglas.find(([, invalido]) => invalido)
  return fallo ? { campo: fallo[0], mensaje: fallo[2] } : null
}

function construirResultadoBase({ resultadoMatematico, ibl, smlv, desgloseTasa, fechaBaseMonetaria, fechaReconocimientoProyectada }) {
  const resultadoMatematicoSeguro = esNumeroValido(resultadoMatematico) ? resultadoMatematico : null
  const smlvValorSeguro = esSmlvValido(smlv) ? smlv.valor : null
  const desgloseSeguro = esDesgloseValido(desgloseTasa) ? desgloseTasa : null

  return {
    resultadoMatematico: resultadoMatematicoSeguro,
    resultadoMatematicoEnSMLMV:
      resultadoMatematicoSeguro !== null && smlvValorSeguro !== null ? resultadoMatematicoSeguro / smlvValorSeguro : null,
    ibl: esNumeroValido(ibl) ? ibl : null,
    tasaInicial: desgloseSeguro?.tasaInicial ?? null,
    bloquesAdicionales: desgloseSeguro?.bloquesAdicionales ?? null,
    incrementoPorSemanas: desgloseSeguro?.incrementoPorSemanas ?? null,
    tasaFinalAplicada: desgloseSeguro?.tasaFinalAplicada ?? null,
    limiteOchentaPorciento: desgloseSeguro ? { aplicado: desgloseSeguro.limiteOchentaPorcientoAplicado, tasaMaxima: 80 } : null,
    pisoEvaluado: { evaluable: false, aplica: null, valorSMLMV: null, valorPesosDeHoy: null, fundamento: null, razonNoEvaluable: null },
    techoEvaluado: { evaluable: false, aplica: null, valorSMLMV: null, valorPesosDeHoy: null, fundamento: null, razonNoEvaluable: null },
    resultadoFinalAjustado: null,
    resultadoFinalEnSMLMV: null,
    unidadMonetaria: {
      codigo: 'COP',
      convencion: 'pesos_de_hoy',
      descripcion: 'Pesos de la fecha base monetaria (hoy) — no pesos nominales de la fecha proyectada de reconocimiento.',
    },
    fechaBaseMonetaria: typeof fechaBaseMonetaria === 'string' ? fechaBaseMonetaria : null,
    fechaReconocimientoProyectada: typeof fechaReconocimientoProyectada === 'string' ? fechaReconocimientoProyectada : null,
    supuestos: [SUPUESTO_CONVENCION_PESOS_DE_HOY],
    trazabilidadNormativa: [],
    razon: null,
  }
}

/**
 * @typedef {Object} NormaRef
 * @property {string} normaId
 * @property {string} fuente
 * @property {string} articulo
 * @property {string} [descripcion]
 */

/**
 * @typedef {Object} SmlvValor - Solo lo indispensable para la aritmética y la cita —
 *   ajustarMesadaLegalRPM ya no lee `estadoJuridico`/`listoParaProduccion` (ver `vigenciaSmlv`).
 * @property {number} valor
 * @property {string} [id]
 * @property {string} [fuente]
 * @property {string} [articulo]
 */

/**
 * @typedef {Object} VigenciaSmlv - Salida de evaluarVigenciaSmlv() (data/legal/index.js).
 * @property {boolean} aptoParaCalculoEnFechaBase
 * @property {string} [tipoVigencia]
 * @property {boolean} [litigioPendiente]
 * @property {boolean} [medidaCautelarActiva]
 * @property {{codigo: string, mensaje: string}|null} [advertencia]
 */

/**
 * @param {Object} params
 * @param {number} params.resultadoMatematico - Salida de formulaRPM() — ya incluye el
 *   límite interno del 80% de formulaRPM. Pesos de `fechaBaseMonetaria`.
 * @param {number} params.ibl
 * @param {{tasaInicial: number, bloquesAdicionales: number, incrementoPorSemanas: number, tasaFinalAplicada: number, limiteOchentaPorcientoAplicado: boolean}} params.desgloseTasa
 *   Salida de desglosarTasaReemplazoRPM() (formulaRPM.js) — nunca recalculada aquí.
 * @param {SmlvValor} params.smlv
 * @param {VigenciaSmlv} params.vigenciaSmlv - Ya interpretado por evaluarVigenciaSmlv().
 * @param {{estado: string}} params.elegibilidad - `.estado` debe ser exactamente un valor
 *   de ESTADOS_ELEGIBILIDAD_RPM (evaluarElegibilidadProyectadaRPM.js) — cualquier otro
 *   string se trata como entrada inválida, nunca como "no elegible" por defecto.
 * @param {string} params.fechaBaseMonetaria - ISO
 * @param {string} params.fechaReconocimientoProyectada - ISO
 * @param {{piso: NormaRef, techo: NormaRef}} params.referenciasNormativas
 * @returns {Object} Nunca sobrescribe `resultadoMatematico`/el desglose de tasa, incluso
 *   cuando el ajuste no es evaluable.
 */
export function ajustarMesadaLegalRPM({
  resultadoMatematico,
  ibl,
  desgloseTasa,
  smlv,
  vigenciaSmlv,
  elegibilidad,
  fechaBaseMonetaria,
  fechaReconocimientoProyectada,
  referenciasNormativas,
} = {}) {
  const entradas = { resultadoMatematico, ibl, desgloseTasa, smlv, vigenciaSmlv, elegibilidad, fechaBaseMonetaria, fechaReconocimientoProyectada, referenciasNormativas }
  const base = construirResultadoBase(entradas)

  const campoInvalido = primerCampoInvalido(entradas)
  if (campoInvalido) {
    return { ...base, razon: { codigo: 'ENTRADA_INVALIDA', mensaje: campoInvalido.mensaje, detalle: { campo: campoInvalido.campo } } }
  }

  const trazabilidadNormativa = [
    { campo: 'smlv', normaId: smlv.id ?? null, fuente: smlv.fuente ?? null, articulo: smlv.articulo ?? null, tipoVigencia: vigenciaSmlv.tipoVigencia ?? null },
  ]

  // Orden del cálculo: (1) elegibilidad — con TRES ramas explícitas, no dos — (2) vigencia
  // operativa del SMLMV, (3) piso, (4) techo.
  //
  // A. CUMPLE — continúa hacia vigencia/piso/techo.
  // B. Incumplimiento canónico (NO_CUMPLE_EDAD/SEMANAS/NINGUNO) — incumplimiento
  //    CONFIRMADO por la proyección: código NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO.
  // C. NO_EVALUABLE — incertidumbre, no incumplimiento: no hay evidencia suficiente para
  //    concluir nada. Código distinto (ELEGIBILIDAD_NO_EVALUABLE) — nunca se etiqueta como
  //    "no elegible" un caso que en realidad es "no sabemos". resultadoMatematico ya se
  //    conserva en `base` sin necesidad de nada adicional aquí.
  if (elegibilidad.estado !== ESTADOS_ELEGIBILIDAD_RPM.CUMPLE) {
    const esIncumplimientoConfirmado = ESTADOS_ELEGIBILIDAD_INCUMPLIMIENTO.has(elegibilidad.estado)
    const codigo = esIncumplimientoConfirmado ? 'NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO' : 'ELEGIBILIDAD_NO_EVALUABLE'
    const mensaje = esIncumplimientoConfirmado
      ? `El escenario proyectado no cumple los requisitos de edad y/o semanas (elegibilidad.estado = '${elegibilidad.estado}'). ` +
        'El piso legal de 1 SMLMV nunca se aplica a un escenario que no cumple.'
      : `No hay evidencia suficiente para determinar si el escenario proyectado cumple los requisitos de edad y semanas ` +
        `(elegibilidad.estado = '${elegibilidad.estado}') — esto es incertidumbre, no un incumplimiento confirmado. El piso ` +
        'legal no se aplica sin esa confirmación, pero tampoco se afirma que la persona incumpla.'
    return {
      ...base,
      trazabilidadNormativa,
      pisoEvaluado: { ...base.pisoEvaluado, razonNoEvaluable: codigo },
      techoEvaluado: { ...base.techoEvaluado, razonNoEvaluable: codigo },
      razon: { codigo, mensaje },
    }
  }

  if (!vigenciaSmlv.aptoParaCalculoEnFechaBase) {
    return {
      ...base,
      trazabilidadNormativa,
      pisoEvaluado: { ...base.pisoEvaluado, razonNoEvaluable: vigenciaSmlv.tipoVigencia ?? 'SMLV_NO_APTO' },
      techoEvaluado: { ...base.techoEvaluado, razonNoEvaluable: vigenciaSmlv.tipoVigencia ?? 'SMLV_NO_APTO' },
      razon: vigenciaSmlv.advertencia ?? {
        codigo: 'SMLV_NO_APTO_PARA_CALCULO',
        mensaje: `El SMLMV de ${fechaBaseMonetaria} no está apto para calcular el ajuste (tipoVigencia='${vigenciaSmlv.tipoVigencia ?? 'desconocido'}').`,
      },
    }
  }

  // A partir de aquí el SMLMV es operativamente vigente (con o sin litigio de fondo
  // pendiente) — el ajuste se aplica; la advertencia de litigio, si existe, viaja en
  // `supuestos`, nunca bloquea el cálculo (decisión: "la existencia de una demanda no
  // equivale por sí sola a falta de vigencia").
  const valorPisoPesos = VALOR_SMLMV_PISO * smlv.valor
  const pisoAplica = resultadoMatematico < valorPisoPesos
  const resultadoTrasPiso = Math.max(resultadoMatematico, valorPisoPesos)

  const valorTechoPesos = VALOR_SMLMV_TECHO * smlv.valor
  const techoAplica = resultadoTrasPiso > valorTechoPesos
  const resultadoFinalAjustado = Math.min(resultadoTrasPiso, valorTechoPesos)

  trazabilidadNormativa.push(
    { campo: 'pisoEvaluado', ...referenciasNormativas.piso },
    { campo: 'techoEvaluado', ...referenciasNormativas.techo }
  )

  const supuestos = vigenciaSmlv.advertencia ? [...base.supuestos, vigenciaSmlv.advertencia] : base.supuestos

  return {
    ...base,
    pisoEvaluado: {
      evaluable: true,
      aplica: pisoAplica,
      valorSMLMV: VALOR_SMLMV_PISO,
      valorPesosDeHoy: valorPisoPesos,
      fundamento: referenciasNormativas.piso,
      razonNoEvaluable: null,
    },
    techoEvaluado: {
      evaluable: true,
      aplica: techoAplica,
      valorSMLMV: VALOR_SMLMV_TECHO,
      valorPesosDeHoy: valorTechoPesos,
      fundamento: referenciasNormativas.techo,
      razonNoEvaluable: null,
    },
    resultadoFinalAjustado,
    resultadoFinalEnSMLMV: resultadoFinalAjustado / smlv.valor,
    supuestos,
    trazabilidadNormativa,
    razon: null,
  }
}
