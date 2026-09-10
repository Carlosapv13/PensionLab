// E3-C2a (sprint-4-correcciones-oscar-baldor) — adaptador único entre resolverSmlvVigenteRPM.js
// y ajustarMesadaLegalRPM.js. resolverSmlvVigenteRPM() devuelve un único objeto plano que
// mezcla el valor del SMLV con su vigencia jurídica; ajustarMesadaLegalRPM() exige dos
// objetos separados (`smlv`/`vigenciaSmlv`) con una forma distinta (ver su propio JSDoc).
// Sin este adaptador, esa traducción se repetiría en cada orquestador que integre el ajuste
// legal — con riesgo real de divergir entre copias (ej. una olvida `medidaCautelarActiva`).
// Vive junto a resolverSmlvVigenteRPM.js porque es la única fuente que conoce el shape a
// traducir; ajustarMesadaLegalRPM.js permanece neutral y no lo conoce (su propio contrato:
// "acepta cualquier objeto compatible como referenciasNormativas/smlv/vigenciaSmlv").
//
// Responsabilidad única, deliberadamente acotada: transformar FORMA, nunca CONTENIDO.
// - No decide elegibilidad (no la conoce, no la recibe, no la toca).
// - No aplica piso ni techo — eso es exclusivamente ajustarMesadaLegalRPM.js.
// - No consulta data/legal ni vuelve a llamar obtenerSmlv()/evaluarVigenciaSmlv() — opera
//   exclusivamente sobre el objeto ya resuelto que recibe como parámetro.
// - No recalcula vigencia ni reinterpreta ningún código (`tipoVigencia`, `advertencia.codigo`)
//   — los propaga tal cual, sean cuales sean, sin ninguna rama condicionada a su valor.
// - No inventa `fuente`/`articulo`/`id` cuando no existen en la entrada: `null` explícito,
//   nunca un texto genérico ("no disponible", "sin fuente", etc.) que pudiera confundirse
//   con una cita normativa real.
//
// Comportamiento por caso (ninguno es una rama especial en el código de abajo — todos son
// el mismo mapeo estructural aplicado a formas distintas de smlvVigente, documentados aquí
// para que un consumidor no tenga que releer resolverSmlvVigenteRPM.js para saberlo):
//
// - Fecha inválida (`smlvVigente.encontrado === false`,
//   `advertencia.codigo === 'FECHA_BASE_MONETARIA_INVALIDA'`): `smlv.valor` queda `null`
//   (nunca 0 ni un valor inventado); `vigenciaSmlv.aptoParaCalculoEnFechaBase === false`;
//   `advertencia` se propaga tal cual. `ajustarMesadaLegalRPM` la rechazará como
//   `ENTRADA_INVALIDA` (smlv.valor no es un número positivo) — este adaptador no intenta
//   evitar eso ni lo anticipa.
// - Fuente legal no encontrada (`encontrado === false`,
//   `advertencia.codigo === 'FUENTE_LEGAL_NO_ENCONTRADA'`): mismo tratamiento que fecha
//   inválida — `smlv.valor` queda `null`, sin fuente/articulo inventados.
// - Fundamento no verificado / suspendido / fuera de vigencia / fuente insuficiente
//   (`encontrado === true`, `aptoParaCalculoEnFechaBase === false`): `smlv.valor` SÍ puede
//   venir poblado (se conserva como referencia histórica, mismo criterio que
//   resolverSmlvVigenteRPM.js ya documenta) — decidir si ese SMLV es apto para calcular es
//   tarea de ajustarMesadaLegalRPM.js, nunca de este adaptador.
// - Vigente con litigio / medida cautelar activa (`encontrado === true`,
//   `aptoParaCalculoEnFechaBase === true`, `litigioPendiente`/`medidaCautelarActiva` en
//   `true`): se propagan tal cual — decidir si eso bloquea o solo advierte es de
//   ajustarMesadaLegalRPM.js.
// - SMLMV firme (`tipoVigencia === 'firme'`, `advertencia === null`): mapeo idéntico a los
//   demás casos, sin ninguna rama especial para "sin problemas".
// - `smlvVigente` ausente (`null`/`undefined`): única rama real de este archivo — nunca
//   lanza, nunca inventa un SMLV apto. Devuelve la misma forma completa que el caso
//   `encontrado: false`, con `smlv.valor: null` y `vigenciaSmlv.aptoParaCalculoEnFechaBase:
//   false`, sin ningún mensaje de advertencia sintético (ver `entradasVacias` más abajo).

/**
 * @typedef {Object} SmlvEntradaAjusteLegalRPM
 * @property {number|null} valor
 * @property {string|null} id
 * @property {string|null} fuente
 * @property {string|null} articulo
 */

/**
 * @typedef {Object} VigenciaSmlvEntradaAjusteLegalRPM
 * @property {boolean} aptoParaCalculoEnFechaBase
 * @property {string|null} tipoVigencia
 * @property {boolean|null} litigioPendiente
 * @property {boolean|null} medidaCautelarActiva
 * @property {{codigo: string, mensaje: string}|null} advertencia
 */

/**
 * @typedef {Object} EntradasAjusteLegalRPM
 * @property {SmlvEntradaAjusteLegalRPM} smlv
 * @property {VigenciaSmlvEntradaAjusteLegalRPM} vigenciaSmlv
 */

// Borde de contrato (revisión Atlas, E3-C2a): `smlvVigente` puede llegar `null`/`undefined`
// si un futuro llamador olvida resolverlo antes — este adaptador es, por diseño, el primer
// punto de la cadena que un dato así de ausente atravesaría. Detención segura: nunca lanza,
// nunca inventa un `smlv`/`vigenciaSmlv` que pudiera leerse como "apto para calcular"
// (`aptoParaCalculoEnFechaBase: false` siempre en este caso, `valor: null`) — misma forma
// completa que el caso `encontrado: false` de resolverSmlvVigenteRPM.js, sin agregar ningún
// texto de advertencia sintético (esta función no inventa información, ni siquiera un
// mensaje explicativo — esa responsabilidad es de quien valida más abajo, ej.
// ajustarMesadaLegalRPM.js, que ya rechaza `smlv.valor` no positivo como ENTRADA_INVALIDA).
function entradasVacias() {
  return {
    smlv: { valor: null, id: null, fuente: null, articulo: null },
    vigenciaSmlv: {
      aptoParaCalculoEnFechaBase: false,
      tipoVigencia: null,
      litigioPendiente: null,
      medidaCautelarActiva: null,
      advertencia: null,
    },
  }
}

/**
 * Traduce la salida de resolverSmlvVigenteRPM() — un único objeto plano — a los dos objetos
 * separados que exige ajustarMesadaLegalRPM() como parámetros `smlv`/`vigenciaSmlv`. Nunca
 * muta `smlvVigente`; siempre devuelve un objeto nuevo. Nunca lanza: si `smlvVigente` es
 * `null`/`undefined`, devuelve una forma completa y segura (ver `entradasVacias`), nunca un
 * `smlv`/`vigenciaSmlv` que pudiera interpretarse como apto para calcular.
 *
 * @param {ReturnType<typeof import('./resolverSmlvVigenteRPM.js').resolverSmlvVigenteRPM>|null|undefined} smlvVigente
 * @returns {EntradasAjusteLegalRPM}
 */
export function construirEntradasAjusteLegalRPM(smlvVigente) {
  if (smlvVigente === null || smlvVigente === undefined) {
    return entradasVacias()
  }

  return {
    smlv: {
      valor: smlvVigente.valor,
      id: smlvVigente.id ?? null,
      fuente: smlvVigente.fundamentoNormativoAplicable?.fuente ?? null,
      articulo: smlvVigente.fundamentoNormativoAplicable?.articulo ?? null,
    },
    vigenciaSmlv: {
      aptoParaCalculoEnFechaBase: smlvVigente.aptoParaCalculoEnFechaBase,
      tipoVigencia: smlvVigente.tipoVigencia,
      litigioPendiente: smlvVigente.litigioPendiente,
      medidaCautelarActiva: smlvVigente.medidaCautelarActiva,
      advertencia: smlvVigente.advertencia,
    },
  }
}
