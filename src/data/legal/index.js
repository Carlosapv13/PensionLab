// resolverReglasVigentes(fecha): devuelve la versión de reglas legales de versions/
// aplicable a una fecha dada, según vigenciaDesde/vigenciaHasta de cada archivo.
// Es la única puerta de entrada para leer normativa — nada más debe importar
// directamente los JSON de versions/.

import ley1001993 from './versions/ley100-1993.json' with { type: 'json' }
import vigente2026 from './versions/vigente-2026.json' with { type: 'json' }

// reforma-2024.json NO participa de esta línea de tiempo a propósito: la reforma
// pensional 2024 (Ley 2381 de 2024) está suspendida por la Corte Constitucional
// (Auto 841 de 2025) y no debe resolverse como normativa vigente hasta que exista
// fallo definitivo. Si en el futuro se necesita, se importa y se agrega explícitamente,
// no por accidente.
const LINEA_DE_TIEMPO_VIGENTE = [ley1001993, vigente2026]

function dentroDeVigencia(entrada, fecha) {
  const { desde, hasta } = entrada.vigencia ?? {}
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

function esFirme(entrada, permitirTransitorio) {
  if (!entrada.estadoJuridico || entrada.estadoJuridico === 'firme') return true
  return permitirTransitorio
}

/**
 * Devuelve todas las LegalRuleEntry aplicables a `fecha`, recorriendo la línea de tiempo
 * de normativa efectivamente vigente. Por defecto excluye entradas cuyo `estadoJuridico`
 * no sea 'firme' (ej. el SMLV 2026, bajo litigio) — pásese `{ permitirTransitorio: true }`
 * para incluirlas explícitamente, a sabiendas del riesgo.
 *
 * Cada entrada devuelta incluye `metadataFuente` (`estado`, `listoParaProduccion`) tomada
 * del archivo de versión (`LegalVersionFile`) del que proviene — esos campos viven a nivel
 * de archivo, no de entrada individual (ver schema.js), así que se propagan aquí para que
 * cualquier consumidor pueda saber si la norma que está usando proviene de una fuente
 * todavía en borrador, sin tener que volver a leer el archivo JSON por su cuenta.
 *
 * @param {string} fecha - Fecha ISO (ej. '2026-07-30')
 * @param {{permitirTransitorio?: boolean}} [opts]
 * @returns {Array<import('./schema.js').LegalRuleEntry & {
 *   metadataFuente: { estado: string, listoParaProduccion: boolean }
 * }>}
 */
export function resolverReglasVigentes(fecha, { permitirTransitorio = false } = {}) {
  return LINEA_DE_TIEMPO_VIGENTE
    .flatMap((archivo) =>
      (archivo?.entradas ?? []).map((entrada) => ({
        ...entrada,
        metadataFuente: {
          estado: archivo?.estado ?? 'publicado',
          listoParaProduccion: archivo?.listoParaProduccion ?? true,
        },
      }))
    )
    .filter((entrada) => dentroDeVigencia(entrada, fecha))
    .filter((entrada) => esFirme(entrada, permitirTransitorio))
}

function buscarPorCampo(reglas, campo) {
  return reglas.find((entrada) => entrada.campo === campo) ?? null
}

function resolverCronograma(valorCronograma, fecha) {
  const { base, decrementoAnual, piso, fechaInicio } = valorCronograma
  const anioInicio = new Date(fechaInicio).getUTCFullYear()
  const anioFecha = new Date(fecha).getUTCFullYear()
  const aniosTranscurridos = Math.max(0, anioFecha - anioInicio)
  return Math.max(piso, base - decrementoAnual * aniosTranscurridos)
}

/**
 * Resuelve las semanas mínimas de cotización exigidas para pensión de vejez, manejando
 * la diferencia por sexo (Art. 33 Ley 100/Art. 9 Ley 797 de 2003) y el cronograma
 * progresivo de reducción para mujeres introducido por la Sentencia C-197 de 2023.
 *
 * Solo implementado para RPM en Sprint 1: la proyección RAIS simplificada no tiene un
 * requisito equivalente de semanas mínimas (ver limitaciones documentadas en
 * domain/pensionEngine/calcularProyeccionRAIS.js) — se lanza un error explícito en vez
 * de asumir o reutilizar el valor de RPM.
 *
 * Devuelve el valor junto con su trazabilidad completa (id, fuente, artículo, vigencia,
 * y el estado del archivo del que proviene) en vez de un número suelto — sin esto, un
 * consumidor podría saber CUÁNTO exige la norma sin poder citar CUÁL norma exactamente
 * (Principio 3: todo resultado debe ser trazable hasta su origen).
 *
 * @param {string} fecha - Fecha ISO en la que se evalúa el requisito (ej. fecha de cálculo)
 * @param {('M'|'F')} sexo
 * @param {('RPM'|'RAIS')} regimen
 * @returns {{
 *   valor: number,
 *   id: string,
 *   fuente: string,
 *   articulo: string,
 *   estado: string,
 *   listoParaProduccion: boolean,
 *   vigenciaDesde: string | null,
 *   vigenciaHasta: string | null,
 * }}
 */
export function obtenerSemanasMinimas(fecha, sexo, regimen) {
  if (regimen !== 'RPM') {
    throw new Error(
      `obtenerSemanasMinimas: no implementado para regimen '${regimen}' en Sprint 1 ` +
      '(la proyección RAIS simplificada no tiene un requisito equivalente de semanas mínimas)'
    )
  }

  const campo = sexo === 'F' ? 'semanasMinimasPensionMujer' : 'semanasMinimasPensionHombre'
  const reglas = resolverReglasVigentes(fecha)
  const entrada = buscarPorCampo(reglas, campo)

  if (!entrada) {
    throw new Error(`obtenerSemanasMinimas: no se encontró '${campo}' vigente para la fecha ${fecha}`)
  }

  const valor =
    typeof entrada.valor === 'object' && entrada.valor?.tipo === 'cronograma-lineal'
      ? resolverCronograma(entrada.valor, fecha)
      : entrada.valor

  return {
    valor,
    id: entrada.id,
    fuente: entrada.fuente,
    articulo: entrada.articulo,
    estado: entrada.metadataFuente.estado,
    listoParaProduccion: entrada.metadataFuente.listoParaProduccion,
    vigenciaDesde: entrada.vigencia?.desde ?? null,
    vigenciaHasta: entrada.vigencia?.hasta ?? null,
  }
}

/**
 * Resuelve la edad legal general de pensión de vejez, según sexo (Art. 33 Ley
 * 100/Art. 9 Ley 797 de 2003) — un valor fijo, sin el cronograma que sí tiene
 * obtenerSemanasMinimas.
 *
 * Responsabilidad estrictamente acotada a resolver qué dice la norma para esa
 * fecha y ese sexo, con su trazabilidad completa. NO decide si esa norma es
 * aplicable a un caso concreto (ej. si el régimen del caso tiene un requisito
 * de edad equivalente) — esa decisión pertenece a quien consume este valor
 * (hoy, evidenciaEdadPension.js), nunca al resolver. Deliberado: este resolver
 * puede tener consumidores futuros distintos de esa evidencia.
 *
 * @param {string} fecha - Fecha ISO en la que se evalúa el requisito
 * @param {('M'|'F')} sexo
 * @returns {{
 *   valor: number,
 *   id: string,
 *   fuente: string,
 *   articulo: string,
 *   estado: string,
 *   listoParaProduccion: boolean,
 *   vigenciaDesde: string | null,
 *   vigenciaHasta: string | null,
 * }}
 */
export function obtenerEdadPension(fecha, sexo) {
  const campo = sexo === 'F' ? 'edadPensionMujer' : 'edadPensionHombre'
  const reglas = resolverReglasVigentes(fecha)
  const entrada = buscarPorCampo(reglas, campo)

  if (!entrada) {
    throw new Error(`obtenerEdadPension: no se encontró '${campo}' vigente para la fecha ${fecha}`)
  }

  return {
    valor: entrada.valor,
    id: entrada.id,
    fuente: entrada.fuente,
    articulo: entrada.articulo,
    estado: entrada.metadataFuente.estado,
    listoParaProduccion: entrada.metadataFuente.listoParaProduccion,
    vigenciaDesde: entrada.vigencia?.desde ?? null,
    vigenciaHasta: entrada.vigencia?.hasta ?? null,
  }
}

/**
 * Resuelve la fecha de entrada en vigencia del Sistema General de Pensiones
 * (Art. 151 Ley 100 de 1993) — la fecha histórica fija contra la que se evalúa el
 * screening de indicios de régimen de transición (ver evaluarIndiciosTransicion,
 * domain/evidenciaIndiciosTransicion.js). Existe como entrada propia de data/legal,
 * no como literal embebido en ningún consumidor — mismo criterio de trazabilidad
 * que cualquier otro campo legal.
 *
 * Nota: la investigación normativa encontró que esta fecha no es universal (los
 * servidores públicos territoriales tienen 1995-06-30, no 1994-04-01) — ver la
 * observación arquitectónica en trazabilidad-normativa.md. Esta versión aplica la
 * fecha general a todos los casos; resolverla según tipo de afiliado queda diferido.
 *
 * @param {string} fecha - Fecha ISO en la que se evalúa el requisito (ej. fecha de cálculo)
 * @returns {{
 *   valor: string,
 *   id: string,
 *   fuente: string,
 *   articulo: string,
 *   estado: string,
 *   listoParaProduccion: boolean,
 *   vigenciaDesde: string | null,
 *   vigenciaHasta: string | null,
 * }}
 */
export function obtenerFechaEntradaVigenciaSistema(fecha) {
  const reglas = resolverReglasVigentes(fecha)
  const entrada = buscarPorCampo(reglas, 'fechaEntradaVigenciaSistemaPensional')

  if (!entrada) {
    throw new Error(`obtenerFechaEntradaVigenciaSistema: no se encontró una entrada vigente para la fecha ${fecha}`)
  }

  return {
    valor: entrada.valor,
    id: entrada.id,
    fuente: entrada.fuente,
    articulo: entrada.articulo,
    estado: entrada.metadataFuente.estado,
    listoParaProduccion: entrada.metadataFuente.listoParaProduccion,
    vigenciaDesde: entrada.vigencia?.desde ?? null,
    vigenciaHasta: entrada.vigencia?.hasta ?? null,
  }
}

/**
 * Resuelve el umbral de edad del régimen de transición (Art. 36, inciso 2, Ley 100
 * de 1993), según sexo — 35 años o más (mujeres) / 40 años o más (hombres) al
 * momento de entrar en vigencia el Sistema (ver obtenerFechaEntradaVigenciaSistema).
 *
 * Responsabilidad estrictamente acotada a resolver qué dice la norma, con su
 * trazabilidad completa — igual que obtenerEdadPension, NO decide si el umbral
 * implica que la persona tuvo o no régimen de transición (esa interpretación, con
 * su lenguaje deliberadamente no concluyente, vive en evaluarIndiciosTransicion).
 * Cubre únicamente la vía de edad: la vía de 15 años de tiempo de servicio queda
 * fuera de este resolver por decisión de alcance ya registrada en
 * trazabilidad-normativa.md — no hay campo `añosServicioTransicion` cargado.
 *
 * @param {string} fecha - Fecha ISO en la que se evalúa el requisito
 * @param {('M'|'F')} sexo
 * @returns {{
 *   valor: number,
 *   id: string,
 *   fuente: string,
 *   articulo: string,
 *   estado: string,
 *   listoParaProduccion: boolean,
 *   vigenciaDesde: string | null,
 *   vigenciaHasta: string | null,
 * }}
 */
export function obtenerEdadTransicion(fecha, sexo) {
  const campo = sexo === 'F' ? 'edadTransicionMujer' : 'edadTransicionHombre'
  const reglas = resolverReglasVigentes(fecha)
  const entrada = buscarPorCampo(reglas, campo)

  if (!entrada) {
    throw new Error(`obtenerEdadTransicion: no se encontró '${campo}' vigente para la fecha ${fecha}`)
  }

  return {
    valor: entrada.valor,
    id: entrada.id,
    fuente: entrada.fuente,
    articulo: entrada.articulo,
    estado: entrada.metadataFuente.estado,
    listoParaProduccion: entrada.metadataFuente.listoParaProduccion,
    vigenciaDesde: entrada.vigencia?.desde ?? null,
    vigenciaHasta: entrada.vigencia?.hasta ?? null,
  }
}
