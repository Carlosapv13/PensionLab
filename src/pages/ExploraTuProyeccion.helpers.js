// Lógica pura de presentación para la comparación de caminos en
// ExploraTuProyeccion.jsx — separada en su propio módulo (no un archivo de
// página, para poder exportar funciones sueltas sin romper react-refresh) y
// testeable sin montar el componente.

/**
 * Separa, por código, las limitaciones presentes en TODOS los escenarios
 * viables (comunes — se muestran una sola vez, debajo de la comparación) de
 * las que solo aparecen en algunos (específicas — se quedan junto a su
 * camino). Regla data-driven, no estética: no asume de antemano qué código
 * es "compartido", lo deriva de qué trae cada escenario realmente. Con un
 * solo escenario viable, todas sus limitaciones cuentan como comunes (no hay
 * nada de qué distinguirlas).
 *
 * @param {Array<Object>} escenariosViables
 * @returns {Array<{codigo: string, mensaje: string}>}
 */
export function calcularLimitacionesComunes(escenariosViables) {
  if (escenariosViables.length === 0) return []
  const [primero, ...resto] = escenariosViables
  return primero.limitaciones.filter((l) =>
    resto.every((otro) => otro.limitaciones.some((otraLimitacion) => otraLimitacion.codigo === l.codigo))
  )
}

/**
 * @param {Object} escenario
 * @param {Array<{codigo: string}>} limitacionesComunes
 * @returns {Array<{codigo: string, mensaje: string}>}
 */
export function limitacionesEspecificas(escenario, limitacionesComunes) {
  const codigosComunes = new Set(limitacionesComunes.map((l) => l.codigo))
  return escenario.limitaciones.filter((l) => !codigosComunes.has(l.codigo))
}

// Códigos que, aunque el dominio solo los agregue al escenario donde
// numéricamente aplican (ej. TOPE_IBC_CON_SMMLV_VIGENTE solo al camino que
// realmente usa el tope legal), describen un método de cálculo de la
// herramienta en general, no un matiz del resultado de esa columna — se
// presentan en la sección general en vez de junto a un solo camino. Decisión
// de presentación, no de dominio: no se toca dónde el dominio los declara.
const CODIGOS_LIMITACION_SIEMPRE_GENERAL = ['TOPE_IBC_CON_SMMLV_VIGENTE']

// Ajustes de redacción exclusivos de la sección general: el mensaje de
// dominio de TOPE_IBC_CON_SMMLV_VIGENTE dice "...que aplicamos aquí...",
// correcto cuando vivía dentro de la columna del camino que lo origina —
// fuera de esa columna, "aquí" queda ambiguo. Ajuste puramente de redacción
// visible, nunca del significado ni de la estructura del dato de dominio
// (codigo se conserva idéntico).
const AJUSTES_REDACCION_SECCION_GENERAL = {
  TOPE_IBC_CON_SMMLV_VIGENTE: (mensaje) => mensaje.replace('aplicamos aquí', 'aplicamos en esta simulación'),
}

/**
 * Separa las limitaciones específicas de un escenario entre las que deben
 * mostrarse en la sección general (aunque el dominio solo las haya declarado
 * en este escenario) y las que se quedan junto a su camino.
 *
 * @param {Array<{codigo: string, mensaje: string}>} notasEspecificas
 * @returns {{
 *   generales: Array<{codigo: string, mensaje: string}>,
 *   especificas: Array<{codigo: string, mensaje: string}>,
 * }}
 */
export function separarLimitacionesGenerales(notasEspecificas) {
  const generales = []
  const especificas = []

  for (const l of notasEspecificas) {
    if (CODIGOS_LIMITACION_SIEMPRE_GENERAL.includes(l.codigo)) {
      const ajustarRedaccion = AJUSTES_REDACCION_SECCION_GENERAL[l.codigo]
      generales.push(ajustarRedaccion ? { ...l, mensaje: ajustarRedaccion(l.mensaje) } : l)
    } else {
      especificas.push(l)
    }
  }

  return { generales, especificas }
}
