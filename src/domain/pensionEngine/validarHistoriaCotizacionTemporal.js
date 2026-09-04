// Corrección de riesgo funcional (Carlos/Atlas, 2026-09-04, previa al commit de E2):
// evaluarElegibilidadProyectadaRPM.js no validaba períodos temporalmente inconsistentes
// antes de sumarlos vía resolverSemanasProyectadasRPM.js, aunque calcularProyeccionRPM.js
// sí los rechazaba (HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO, vía la función local
// `tienePeriodoPosteriorAFecha`). Esto permitía que la elegibilidad contara como "semanas
// observadas" días que ya pertenecen al tramo futuro sintético que la propia elegibilidad
// construye por separado — doble conteo del futuro — y que generarCaminosRPM.js devolviera
// una conclusión de requisitos antes de que calcularProyeccionRPM.js llegara a rechazar esa
// misma historia.
//
// Esta función es la ÚNICA fuente de verdad para "¿esta historia es temporalmente válida
// para calcularse a `fechaCalculo`?", compartida por calcularProyeccionRPM.js (que ya
// aplicaba la regla de período futuro, ahora extraída aquí sin cambiar su comportamiento)
// y evaluarElegibilidadProyectadaRPM.js (que antes no la aplicaba en absoluto).
//
// Regla de período futuro — REUTILIZADA TAL CUAL, sin reinterpretarla (mismo criterio que
// calcularProyeccionRPM.js ya tenía, mismo comentario original conservado):
//   "Ninguna fecha de historiaCotizacion puede ser posterior a `fecha` — un período
//    'histórico' fechado en el futuro no es historia real, y mezclarlo con el período
//    futuro sintético le haría perder su propio ibc en silencio."
//
// Las otras tres validaciones (arreglo, fechas inválidas, fechas invertidas) son NUEVAS —
// calcularProyeccionRPM.js no las aplicaba explícitamente antes de esta corrección (ver
// hallazgo documentado más abajo). Deliberadamente NO se modifica calcularProyeccionRPM.js
// para exigirlas también — sería ampliar el alcance de E2 más allá de lo pedido. Quedan
// aplicadas únicamente a través de este validador compartido, consumido por
// evaluarElegibilidadProyectadaRPM.js (donde si son indispensables, porque a diferencia de
// calcularProyeccionRPM.js esa función nunca pasa por seleccionarPeriodosIBL.js, que es
// donde algunas de estas inconsistencias terminan cayendo hoy, de forma indirecta y con un
// código de razón distinto — ver hallazgo).
//
// HALLAZGO DOCUMENTADO (no corregido aquí, fuera de alcance de esta tarea):
// calcularProyeccionRPM.js, tal como existe hoy, no queda protegido de forma limpia y
// uniforme contra los otros tres casos:
//   - historiaCotizacion no-arreglo (ej. null): `tienePeriodoPosteriorAFecha` llama
//     `.some()` sobre el valor recibido — con un valor no-arreglo, lanza un TypeError sin
//     capturar (crash), en vez de declarar `no_evaluable`.
//   - fechas invertidas (fechaDesde > fechaHasta) en un período que no es futuro: no se
//     rechaza en `tienePeriodoPosteriorAFecha` — cae más adelante en
//     `seleccionarPeriodosIBL.js`, donde el rango de días calendario resulta negativo y
//     dispara `INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS` (un código de razón distinto,
//     correcto en su efecto — rechaza — pero no es la misma ruta que este validador usa).
//   - fechas con formato inválido (ej. "no-es-fecha"): el comportamiento actual de
//     `tienePeriodoPosteriorAFecha` depende de una comparación de STRINGS, no de fechas
//     parseadas — algunos valores inválidos quedan atrapados por accidente (si el string
//     compara mayor que `fecha` léxicamente), otros no, y terminan produciendo `NaN` en
//     `diasCalendarioEnRango` más adelante, que nunca dispara
//     `INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS` (cualquier comparación con NaN es falsa) —
//     un resultado corrupto silencioso, no una declaración de no evaluable.
// Corregir estos tres puntos DENTRO de calcularProyeccionRPM.js excede el alcance de esta
// corrección (no se pidió, y tocaría código ya cerrado de S4-002/S4-003). Se documenta aquí
// explícitamente, tal como exige el criterio "conserva el criterio existente salvo que
// documentes una contradicción y te detengas", para que Carlos/Atlas decidan si amerita una
// entrega propia.

/**
 * @param {*} fechaISO
 * @returns {boolean}
 */
export function esFechaValida(fechaISO) {
  return typeof fechaISO === 'string' && !Number.isNaN(new Date(fechaISO).getTime())
}

/**
 * Regla de "período futuro" — EXTRAÍDA TAL CUAL de calcularProyeccionRPM.js (antes una
 * función local no exportada, mismo nombre, misma condición exacta, mismo comentario de
 * origen). Único punto de esta corrección donde calcularProyeccionRPM.js reutiliza este
 * módulo SIN ningún cambio de comportamiento respecto a como ya funcionaba — se sigue
 * llamando directamente sobre `historiaCotizacion` cruda, sin pasar por
 * `validarHistoriaCotizacionTemporal` (que además valida arreglo/fechas/inversión, checks
 * nuevos que calcularProyeccionRPM.js no aplicaba y que esta corrección NO le agrega, para
 * no ampliar su alcance — ver hallazgo documentado arriba).
 *
 * Ninguna fecha de historiaCotizacion puede ser posterior a `fecha` — un período
 * "histórico" fechado en el futuro no es historia real, y mezclarlo con el período futuro
 * sintético le haría perder su propio ibc en silencio.
 *
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null)}>} historiaCotizacion
 * @param {string} fecha - ISO
 * @returns {boolean}
 */
export function tienePeriodoPosteriorAFecha(historiaCotizacion, fecha) {
  return historiaCotizacion.some((p) => p.fechaDesde > fecha || (p.fechaHasta != null && p.fechaHasta > fecha))
}

/**
 * @typedef {Object} ResultadoValidacionHistoriaTemporal
 * @property {boolean} valida
 * @property {('HISTORIA_NO_ES_ARREGLO_VALIDO'|'HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA'|'HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS'|'HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')|null} codigo
 * @property {Object|null} periodo - el período que disparó el rechazo, tal cual fue recibido
 * @property {number|null} indice - su posición dentro del arreglo recibido
 */

/**
 * Valida que `historiaCotizacion` sea temporalmente consistente para calcularse a
 * `fechaCalculo` — arreglo válido, fechas parseables, sin períodos con fechaDesde posterior
 * a fechaHasta, y sin ningún período (completo o parcialmente) posterior a fechaCalculo.
 * Pura, sin efectos secundarios, sin leer data/legal.
 *
 * Orden de verificación, por período, en el orden del arreglo recibido (se detiene en la
 * primera violación encontrada — nunca acumula varias):
 *   1. Fechas parseables (fechaDesde siempre; fechaHasta solo si no es null — un período
 *      abierto, "sigue cotizando", es válido con fechaHasta: null).
 *   2. fechaDesde <= fechaHasta (invertidas), solo si fechaHasta no es null.
 *   3. Ni fechaDesde ni fechaHasta pueden ser posteriores a fechaCalculo (regla ya existente
 *      en calcularProyeccionRPM.js, reutilizada sin cambios).
 *
 * @param {*} historiaCotizacion
 * @param {string} fechaCalculo - ISO
 * @returns {ResultadoValidacionHistoriaTemporal}
 */
export function validarHistoriaCotizacionTemporal(historiaCotizacion, fechaCalculo) {
  if (!Array.isArray(historiaCotizacion)) {
    return { valida: false, codigo: 'HISTORIA_NO_ES_ARREGLO_VALIDO', periodo: null, indice: null }
  }

  for (let indice = 0; indice < historiaCotizacion.length; indice++) {
    const periodo = historiaCotizacion[indice]
    const tieneFechaHasta = periodo != null && periodo.fechaHasta != null

    if (periodo == null || !esFechaValida(periodo.fechaDesde) || (tieneFechaHasta && !esFechaValida(periodo.fechaHasta))) {
      return { valida: false, codigo: 'HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA', periodo, indice }
    }

    if (tieneFechaHasta && periodo.fechaDesde > periodo.fechaHasta) {
      return { valida: false, codigo: 'HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS', periodo, indice }
    }

    // Regla ya aprobada en calcularProyeccionRPM.js — reutilizada llamando exactamente la
    // misma función (tienePeriodoPosteriorAFecha, arriba), nunca reimplementando su
    // condición por separado.
    if (tienePeriodoPosteriorAFecha([periodo], fechaCalculo)) {
      return { valida: false, codigo: 'HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO', periodo, indice }
    }
  }

  return { valida: true, codigo: null, periodo: null, indice: null }
}
