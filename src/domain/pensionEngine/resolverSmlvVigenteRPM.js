// E3-C1 (sprint-4-correcciones-oscar-baldor) — contrato único de SMLV y vigencia para los
// cálculos RPM. Envuelve, sin duplicar ni reinterpretar, `obtenerSmlv(fechaBaseMonetaria)` +
// `evaluarVigenciaSmlv(smlvResuelto, fechaBaseMonetaria)` (ambas en data/legal/index.js,
// E3-A) — misma fuente de verdad para "¿qué SMLV rige y es apto para calcular en esta
// fecha?" que antes solo consumía `ajustarMesadaLegalRPM.js`.
//
// Por qué vive aquí y no en data/legal/index.js: mismo criterio arquitectónico ya usado por
// resolverHorizonteFuturoRPM.js/resolverSemanasProyectadasRPM.js — una pregunta compuesta
// que necesitan EXACTAMENTE calcularPensionRPM.js y calcularProyeccionRPM.js (evitar que
// cada uno la resuelva por su cuenta, como ocurría hasta ahora) vive en domain/pensionEngine,
// una capa encima de data/legal, que sigue siendo la única fuente de los hechos jurídicos
// crudos (obtenerSmlv/evaluarVigenciaSmlv). Este archivo no importa ningún JSON de
// versions/, no reimplementa cadenaNormativa ni ningún estado de vigencia — solo combina dos
// llamadas ya existentes y les da una forma consistente.
//
// `fechaBaseMonetaria` — nombre del parámetro deliberadamente inequívoco (cierre de diseño,
// 2026-09-08, cuarta ronda): es la fecha EN CUYOS PESOS se expresa el cálculo (típicamente
// hoy), NUNCA `fechaReconocimiento` ni `fechaObjetivo` (la fecha futura, proyectada, en la
// que la persona cumpliría los requisitos). Esta función NO PRONOSTICA SMLV futuros — ningún
// consumidor debe pasarle una fecha de reconocimiento futura esperando obtener "el SMLV
// nominal de ese año": eso inventaría un dato que la ley no ha fijado todavía (el SMLV lo
// determina el Gobierno año a año, sin cronograma legal). Que la entrada `smlv-2026` de
// `vigente-2026.json` no declare `vigencia.hasta` (rija sin límite superior conocido) es una
// propiedad de CÓMO está cargada esa entrada hoy — nunca una afirmación de que $1.750.905
// sea o vaya a ser el SMLV nominal de 2027, 2030 o cualquier año posterior. Ver
// LIMITACION_PARAMETROS_CONGELADOS en calcularProyeccionRPM.js, que ya declara este mismo
// límite hacia el usuario.
//
// Nunca lanza (mismo criterio "detención segura" ya establecido en ajustarMesadaLegalRPM.js/
// compararAnclaIncrementoRPM.js). Tres resultados posibles, cada uno con su propio código,
// nunca confundidos entre sí:
//   1. `fechaBaseMonetaria` ausente o con formato inválido → NUNCA se llega a consultar
//      data/legal (la fuente no se buscó porque la entrada era inválida, no porque no
//      exista) → `encontrado: false`, `advertencia.codigo: 'FECHA_BASE_MONETARIA_INVALIDA'`.
//   2. Fecha válida, pero ninguna entrada de SMLV la cubre (ej. antes de 2026-01-01, hoy sin
//      cobertura en data/legal) → `encontrado: false`,
//      `advertencia.codigo: 'FUENTE_LEGAL_NO_ENCONTRADA'`. No se inventan valores históricos
//      ni futuros: la ausencia de regla se declara, nunca se rellena.
//   3. Fecha válida y con entrada de SMLV, pero `evaluarVigenciaSmlv()` la declara no apta
//      (fundamento no verificado, suspendida, fuera de vigencia, fuente insuficiente) →
//      `encontrado: true`, `aptoParaCalculoEnFechaBase: false`, con la advertencia exacta de
//      E3-A propagada tal cual.
// Una función que declara aptitud JURÍDICA nunca puede resolver `apto: true` para una fecha
// que ni siquiera es una fecha real — de ahí el caso 1, evaluado ANTES de tocar data/legal.

import { obtenerSmlv, evaluarVigenciaSmlv } from '../../data/legal/index.js'
import { esFechaValida } from './validarHistoriaCotizacionTemporal.js'

// esFechaValida() (E3-A/compartida) confirma que la cadena es *parseable* como fecha — pero
// no detecta un desbordamiento de calendario: verificado empíricamente en esta plataforma,
// `new Date('2026-02-30')` NO es `Invalid Date` — el motor la "recorre" en silencio hasta el
// 2026-03-02. Una función que declara aptitud jurídica no puede aceptar esa fecha como si
// fuera la que el llamador escribió. Este chequeo es ADITIVO a esFechaValida, nunca una
// reimplementación de su lógica: exige que la fecha, reconstruida, coincida exactamente
// consigo misma — solo así se detecta el desbordamiento silencioso.
function fechaBaseMonetariaEsValida(fechaBaseMonetaria) {
  if (!esFechaValida(fechaBaseMonetaria)) return false
  return new Date(fechaBaseMonetaria).toISOString().slice(0, 10) === fechaBaseMonetaria
}

function resultadoNoEncontrado(fechaBaseMonetaria, advertencia) {
  return {
    encontrado: false,
    valor: null,
    fechaBase: fechaBaseMonetaria,
    vigenteDesde: null,
    vigenteHasta: null,
    aptoParaCalculoEnFechaBase: false,
    tipoVigencia: null,
    litigioPendiente: null,
    medidaCautelarActiva: null,
    advertencia,
    fundamentoNormativoAplicable: null,
    estadoEvaluadoAl: null,
  }
}

const ADVERTENCIA_FECHA_BASE_MONETARIA_INVALIDA = (fechaBaseMonetaria) => ({
  codigo: 'FECHA_BASE_MONETARIA_INVALIDA',
  mensaje:
    `No se puede resolver el SMLV: fechaBaseMonetaria (recibida: ${JSON.stringify(fechaBaseMonetaria)}) ` +
    'está ausente o no es una fecha ISO (AAAA-MM-DD) calendario válida — la fuente legal ni siquiera se ' +
    'consultó, porque la entrada no es una fecha real.',
})

const ADVERTENCIA_FUENTE_LEGAL_NO_ENCONTRADA = (fechaBaseMonetaria, mensajeOriginal) => ({
  codigo: 'FUENTE_LEGAL_NO_ENCONTRADA',
  mensaje: `No se encontró una regla de SMLV vigente para la fecha ${fechaBaseMonetaria}: ${mensajeOriginal}`,
})

/**
 * @typedef {Object} SmlvVigenteRPM
 * @property {boolean} encontrado - false cuando `fechaBaseMonetaria` es inválida (la fuente
 *   ni se consultó) o cuando no existe NINGUNA entrada de SMLV cargada para esa fecha
 *   (ausencia real de dato) — nunca cuando el SMLV existe pero no es apto.
 * @property {number|null} valor - Valor del SMLV, en pesos de `fechaBaseMonetaria`. Presente
 *   incluso cuando `aptoParaCalculoEnFechaBase` es false por vigencia (se conserva como
 *   referencia histórica, igual criterio que evaluarVigenciaSmlv ya aplica) — `null` cuando
 *   `encontrado` es false. El llamador NUNCA debe usarlo aritméticamente sin comprobar antes
 *   `aptoParaCalculoEnFechaBase`.
 * @property {string|null} fechaBase - La misma `fechaBaseMonetaria` recibida (incluso si es
 *   inválida, para trazabilidad de qué se intentó resolver) — nunca `fechaReconocimiento`.
 * @property {string|null} vigenteDesde
 * @property {string|null} vigenteHasta
 * @property {boolean} aptoParaCalculoEnFechaBase - Único campo que un consumidor debe leer
 *   para decidir si puede calcular algo con `valor`.
 * @property {string|null} tipoVigencia - 'firme'|'vigente_con_litigio'|'suspendido'|
 *   'fundamento_no_verificado'|'fuera_de_vigencia'|'fuente_insuficiente', o null cuando
 *   `encontrado` es false.
 * @property {boolean|null} litigioPendiente
 * @property {boolean|null} medidaCautelarActiva
 * @property {{codigo: string, mensaje: string}|null} advertencia - Propagada TAL CUAL desde
 *   evaluarVigenciaSmlv() cuando `fechaBaseMonetaria` es válida y la fuente se encontró
 *   (incluye el único caso `null`: SMLV firme, apto, sin litigio — evaluarVigenciaSmlv()
 *   mismo la devuelve así). Construida aquí, y SIEMPRE no nula, en los otros dos casos:
 *   `FECHA_BASE_MONETARIA_INVALIDA` o `FUENTE_LEGAL_NO_ENCONTRADA`.
 * @property {{fuente: string, articulo: string}|null} fundamentoNormativoAplicable
 * @property {string|null} estadoEvaluadoAl
 */

/**
 * Resuelve, en una sola llamada y con una sola fuente de verdad, el SMLV y su vigencia
 * jurídica para `fechaBaseMonetaria` — reemplaza cualquier lectura directa de
 * `obtenerSmlv(fecha).valor` dentro de los cálculos RPM que necesiten distinguir un SMLV
 * apto de uno que no lo es.
 *
 * @param {string} fechaBaseMonetaria - ISO (AAAA-MM-DD). La fecha EN CUYOS PESOS se expresa
 *   el cálculo (típicamente hoy) — NUNCA `fechaReconocimiento` ni `fechaObjetivo` (la fecha
 *   futura proyectada). Esta función no pronostica SMLV futuros: pasar una fecha de
 *   reconocimiento futura para obtener "el SMLV de ese año" inventaría un dato que la ley
 *   todavía no ha fijado.
 * @returns {SmlvVigenteRPM}
 */
export function resolverSmlvVigenteRPM(fechaBaseMonetaria) {
  if (!fechaBaseMonetariaEsValida(fechaBaseMonetaria)) {
    return resultadoNoEncontrado(
      typeof fechaBaseMonetaria === 'string' ? fechaBaseMonetaria : null,
      ADVERTENCIA_FECHA_BASE_MONETARIA_INVALIDA(fechaBaseMonetaria)
    )
  }

  let smlvResuelto
  try {
    smlvResuelto = obtenerSmlv(fechaBaseMonetaria)
  } catch (error) {
    return resultadoNoEncontrado(fechaBaseMonetaria, ADVERTENCIA_FUENTE_LEGAL_NO_ENCONTRADA(fechaBaseMonetaria, error.message))
  }

  // evaluarVigenciaSmlv() es la ÚNICA fuente para decidir aptitud — nunca reinterpretada ni
  // recalculada aquí. Este archivo solo reexpone su salida bajo un nombre de campo estable
  // para calcularPensionRPM.js/calcularProyeccionRPM.js.
  const vigencia = evaluarVigenciaSmlv(smlvResuelto, fechaBaseMonetaria)

  return {
    encontrado: true,
    valor: vigencia.valorSmlmvAplicable,
    fechaBase: fechaBaseMonetaria,
    vigenteDesde: vigencia.vigenteDesde,
    vigenteHasta: vigencia.vigenteHasta,
    aptoParaCalculoEnFechaBase: vigencia.aptoParaCalculoEnFechaBase,
    tipoVigencia: vigencia.tipoVigencia,
    litigioPendiente: vigencia.litigioPendiente,
    medidaCautelarActiva: vigencia.medidaCautelarActiva,
    advertencia: vigencia.advertencia,
    fundamentoNormativoAplicable: vigencia.fundamentoNormativoAplicable,
    estadoEvaluadoAl: vigencia.estadoEvaluadoAl,
  }
}
