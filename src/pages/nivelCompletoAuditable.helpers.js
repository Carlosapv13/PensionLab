// E6.6 (sprint-4-correcciones-oscar-baldor, PL-260 §9.1/§9.6) — funciones puras de
// presentación para el "Nivel completo": traducen los `datos` literales de cada
// `PasoAuditable` (Contrato F, vía `construirModeloVisualEjercicioRPM.js`) a pares
// etiqueta/valor legibles, SIN calcular, redondear de forma distinta a lo ya calculado,
// reinterpretar ni redactar ninguna conclusión jurídica nueva — mismo principio que ya rige
// el adaptador visual ("solo puede copiar, seleccionar y organizar datos"), extendido aquí a
// la capa de presentación.
//
// Diseño deliberadamente conservador (auditoría propia de este checkpoint, 2026-09-22): para
// cada campo, solo se aplica un formato específico (pesos/porcentaje/semanas/booleano/origen)
// cuando su significado se verificó leyendo directamente el código que lo produce
// (`ajustarMesadaLegalRPM.js`, `construirEjercicioResueltoRPM.js`, `determinarBaseCotizacion.js`)
// — nunca por una convención de nombre adivinada. Cualquier campo sin una entrada explícita en
// `ETIQUETAS_CAMPO` (incluidos campos futuros que Contrato F llegara a agregar) cae al formato
// genérico (`humanizarClave` + valor literal) — nunca se descarta en silencio, nunca se inventa
// una etiqueta ni una unidad que no se verificó.
//
// `tasaMaxima: 80` en `limiteOchentaPorciento` (ver ajustarMesadaLegalRPM.js:144) confirma que
// las tasas de reemplazo (`tasaInicial`/`tasaFinalAplicada`/`incrementoPorSemanas`/`tasaMaxima`)
// están en puntos porcentuales (80, no 0.8) — de ahí el formato `porcentaje` (sufijo "%" sobre
// el número literal, sin dividir ni multiplicar).

import { formatearPesos } from '../format/formatearDinero.js'

// Campos verificados como monto en pesos de hoy (mismo criterio que el resto de la pantalla,
// formatearPesos ya usado para escenario.resultado.valor/objetivoValorMensual/etc.).
const CAMPOS_PESOS = new Set([
  'valorDeclarado',
  'valorAplicado',
  'topeAplicado',
  'valorAplicable',
  'valor',
  'valorObjetivo',
  'delta',
  'valorPesosDeHoy',
])

// Campos verificados en puntos porcentuales (ver nota de cabecera).
const CAMPOS_PORCENTAJE = new Set(['tasaInicial', 'incrementoPorSemanas', 'tasaFinalAplicada', 'tasaMaxima'])

const CAMPOS_BOOLEANOS = new Set(['esOpcionLegal', 'cumple', 'aplicado', 'evaluable', 'aplica'])

const CAMPOS_NUMERO_PLANO = new Set(['bloquesAdicionales', 'valorSMLMV'])

const ETIQUETAS_ORIGEN = {
  declarado_por_usuario: 'Declarado por ti',
  calculado_desde_dato_declarado: 'Calculado desde el dato que declaraste',
}

// Etiquetas legibles para los campos conocidos de los 7 PasoAuditable — traducción literal
// del nombre del campo (nunca una interpretación nueva de lo que significa el dato).
export const ETIQUETAS_CAMPO = {
  valorDeclarado: 'IBC declarado',
  valorAplicado: 'IBC aplicado',
  origen: 'Origen del dato',
  topeAplicado: 'Tope legal aplicado',
  semanasCotizadas: 'Semanas cotizadas',
  valorAplicable: 'IBL aplicable',
  esOpcionLegal: '¿Es una opción legal disponible?',
  razonVidaLaboralNoEvaluada: 'Razón: alternativa de toda la vida laboral no evaluada',
  trazabilidadVentana: 'Trazabilidad de la ventana usada',
  tasaInicial: 'Tasa de reemplazo inicial',
  bloquesAdicionales: 'Bloques adicionales de semanas',
  incrementoPorSemanas: 'Incremento por semanas adicionales',
  tasaFinalAplicada: 'Tasa de reemplazo final aplicada',
  limiteOchentaPorciento: 'Límite legal del 80%',
  aplicado: '¿Se aplicó?',
  tasaMaxima: 'Tasa máxima',
  pisoEvaluado: 'Piso legal evaluado',
  techoEvaluado: 'Techo legal evaluado',
  evaluable: '¿Se evaluó?',
  aplica: '¿Aplica?',
  valorSMLMV: 'Valor en salarios mínimos (SMLMV)',
  valorPesosDeHoy: 'Valor en pesos de hoy',
  fundamento: 'Fundamento normativo',
  razonNoEvaluable: 'Razón: no evaluable',
  normaId: 'Norma',
  fuente: 'Fuente',
  articulo: 'Artículo',
  valorObjetivo: 'Valor objetivo',
  delta: 'Diferencia frente al objetivo',
  cumple: '¿Cumple el objetivo?',
}

// Títulos legibles de los 7 códigos de PasoAuditable, en el mismo orden en que Contrato F ya
// los produce (`construirPasos`, `construirEjercicioResueltoRPM.js`) — este archivo no decide
// el orden, solo el título; el orden real lo da `Object.entries(camino.pasos)` (garantía de
// orden de inserción ya documentada en `construirModeloVisualEjercicioRPM.js`).
export const ETIQUETAS_PASO = {
  DATOS_UTILIZADOS: 'Datos utilizados',
  IBL: 'Cálculo del IBL',
  TASA_REEMPLAZO: 'Tasa de reemplazo',
  RESULTADO_MATEMATICO: 'Resultado matemático (antes del ajuste legal)',
  AJUSTE_LEGAL: 'Ajuste legal (piso y techo)',
  RESULTADO_FINAL: 'Resultado final',
  COMPARACION_OBJETIVO: 'Comparación contra tu objetivo',
}

// E7 corrección (2026-09-23, PL-260 §0 punto 6/§8/§9) — de los 7 PasoAuditable, solo
// `TASA_REEMPLAZO` en adelante depende de la interpretación jurídica en disputa
// (`PoliticaAnclaIncrementoMujer`, Art. 34: el "ancla" decide `bloquesAdicionales` →
// `incrementoPorSemanas` → `tasaFinalAplicada`, y todo lo que sigue en cadena —
// `RESULTADO_MATEMATICO` aplica esa tasa, `AJUSTE_LEGAL` clampa ese resultado disputado,
// `RESULTADO_FINAL` lo reexpone, `COMPARACION_OBJETIVO` compara ese mismo valor contra el
// objetivo). `DATOS_UTILIZADOS` (IBC declarado/aplicado) e `IBL` (promedio histórico de IBC)
// son datos de ENTRADA — se calculan antes de aplicar cualquier tasa de reemplazo y no
// cambian entre las dos interpretaciones en disputa, así que se excluyen deliberadamente de
// este conjunto y se siguen mostrando completos.
export const PASOS_DEPENDIENTES_DE_TASA_REEMPLAZO = new Set([
  'TASA_REEMPLAZO',
  'RESULTADO_MATEMATICO',
  'AJUSTE_LEGAL',
  'RESULTADO_FINAL',
  'COMPARACION_OBJETIVO',
])

/**
 * @param {string} codigoPaso
 * @returns {boolean}
 */
export function pasoDependeDePoliticaJuridica(codigoPaso) {
  return PASOS_DEPENDIENTES_DE_TASA_REEMPLAZO.has(codigoPaso)
}

/**
 * Mensaje de "paso pendiente" para un PasoAuditable cuyo valor depende de una política
 * jurídica NO_RESUELTA — nunca afirma cuál interpretación es correcta, solo nombra la(s)
 * política(s) que impide(n) cerrarlo. `politicasNoResueltas` ya viene filtrado por el
 * llamador (`estado === 'NO_RESUELTA'`) — esta función solo compone el texto, nunca decide
 * cuáles políticas aplican.
 *
 * @param {Array<{nombre: string}>} politicasNoResueltas
 * @returns {string}
 */
export function mensajePasoPendienteDePolitica(politicasNoResueltas) {
  const nombres = politicasNoResueltas.map((p) => `"${p.nombre}"`).join(' y ')
  return `Pendiente: depende de la política jurídica ${nombres}, todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.`
}

/**
 * camelCase → "Camel Case" — fallback mecánico, nunca una traducción inventada, para
 * cualquier campo sin entrada en ETIQUETAS_CAMPO (incluidos campos futuros de Contrato F que
 * este archivo todavía no conoce — nunca se oculta un campo por no tener etiqueta).
 *
 * @param {string} clave
 * @returns {string}
 */
export function humanizarClave(clave) {
  const conEspacios = clave.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1)
}

/**
 * @param {string} clave
 * @returns {string}
 */
export function etiquetaCampo(clave) {
  return ETIQUETAS_CAMPO[clave] ?? humanizarClave(clave)
}

/**
 * Decide qué tipo de nodo debe renderizar un valor — nunca decide EL CONTENIDO, solo la
 * forma (escalar/objeto/lista/vacío) para que el componente de presentación sepa si debe
 * recursar.
 *
 * @param {*} valor
 * @returns {'vacio'|'lista'|'objeto'|'escalar'}
 */
export function tipoDeValor(valor) {
  if (valor === null || valor === undefined) return 'vacio'
  if (Array.isArray(valor)) return 'lista'
  if (typeof valor === 'object') return 'objeto'
  return 'escalar'
}

/**
 * Formatea un valor ESCALAR (nunca objeto/arreglo/null — ver tipoDeValor) a texto legible,
 * según el campo al que pertenece. Nunca redondea de forma distinta a lo ya calculado, nunca
 * convierte unidades no verificadas — ver nota de diseño en la cabecera de este archivo.
 *
 * @param {string} clave
 * @param {string|number|boolean} valor
 * @returns {string}
 */
export function formatearValorEscalar(clave, valor) {
  if (CAMPOS_PESOS.has(clave) && typeof valor === 'number') return formatearPesos(valor)
  if (CAMPOS_PORCENTAJE.has(clave) && typeof valor === 'number') return `${valor}%`
  if (clave === 'semanasCotizadas' && typeof valor === 'number') return `${valor.toLocaleString('es-CO')} semanas`
  if (CAMPOS_NUMERO_PLANO.has(clave) && typeof valor === 'number') return valor.toLocaleString('es-CO')
  if (CAMPOS_BOOLEANOS.has(clave) && typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (clave === 'origen' && typeof valor === 'string') return ETIQUETAS_ORIGEN[valor] ?? valor
  if (typeof valor === 'number') return valor.toLocaleString('es-CO')
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}
