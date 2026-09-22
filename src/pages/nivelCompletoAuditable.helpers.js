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

// Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B): las dos
// entradas de abajo (`declarado_por_usuario`/`calculado_desde_dato_declarado`, de
// `determinarBaseCotizacion.js`) NO son los únicos códigos que fluyen por el campo `origen` —
// `escenarioIbcFuturo.origen` (Contrato E, `generarCaminosRPM.js` — cerrado, sin tocar) usa un
// vocabulario propio (`continuidad_ibc_actual`/`busqueda_objetivo_rpm`) que llega tal cual al
// paso `DATOS_UTILIZADOS` (`construirEjercicioResueltoRPM.js`) y, sin esta entrada, se mostraba
// crudo en el Nivel completo. Mismo criterio que el resto de este archivo: solo se traduce lo
// que se verificó leyendo el código que lo produce, nunca se inventa una interpretación nueva
// — `continuidad_ibc_actual` es el camino que mantiene el IBC actual sin cambio;
// `busqueda_objetivo_rpm` es el IBC que resultó de buscar el mínimo que alcanza el objetivo
// (biseccionarEscenarioIbcFuturo) — ninguna de las dos frases toma posición sobre CUÁNTO ni
// bajo qué interpretación jurídica, solo nombra de dónde salió el número.
const ETIQUETAS_ORIGEN = {
  declarado_por_usuario: 'Declarado por ti',
  calculado_desde_dato_declarado: 'Calculado desde el dato que declaraste',
  continuidad_ibc_actual: 'Mismo IBC que tu situación actual, sin cambio',
  busqueda_objetivo_rpm: 'Calculado para alcanzar tu objetivo',
}

// Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B):
// `razonVidaLaboralNoEvaluada` (paso IBL, `calcularProyeccionRPM.js` — cerrado, sin tocar) es
// un código interno de dominio, nunca pensado para mostrarse tal cual — en particular
// `VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA` apareció crudo en una captura real. Los tres
// códigos que ese archivo produce hoy (línea ~460/473/479) se traducen aquí — nunca se
// inventa una explicación jurídica, solo se nombra la razón operativa exacta que el propio
// comentario de dominio ya documenta (semanas insuficientes / falta el IPC del año de
// referencia / declaración agregada sin historia real que promediar).
const ETIQUETAS_RAZON_VIDA_LABORAL_NO_EVALUADA = {
  SEMANAS_TOTALES_INSUFICIENTES: 'No alcanzas las semanas mínimas para que esta alternativa se evalúe',
  DATOS_LEGALES_INSUFICIENTES: 'Faltan datos legales (índice de precios) para calcular esta alternativa',
  VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA:
    'Tu declaración agregada de semanas no aporta historia salarial real con la que calcular esta alternativa — se requiere historia de cotización estructurada',
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

// Corrección de auditoría visual (2026-09-25, hallazgo de revisión con capturas reales de
// Carlos, Caso B): `politica.nombre` (ej. `NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER =
// 'PoliticaAnclaIncrementoMujer'`, evaluarPoliticasEjercicioRPM.js — contrato cerrado, sin
// tocar) es un identificador interno de código, nunca pensado para mostrarse tal cual.
// `etiquetaNombrePolitica` lo traduce citando el mismo fundamento legal (Art. 34) que el
// propio `politica.mensaje` ya usa — nunca inventa una posición jurídica, solo nombra de qué
// trata la política, tal como PL-260 §2 ya la describe. Única fuente de esta traducción —
// usada tanto aquí (mensajePasoPendienteDePolitica, Nivel completo) como en
// PoliticasJuridicasInvolucradas.jsx (su propio título), para que las dos nunca queden
// inconsistentes entre sí. Una política futura sin traducción conocida nunca se oculta ni
// queda sin nombre — cae a `humanizarClave` (misma garantía "nunca ocultar por falta de
// etiqueta" ya aplicada a los campos de Nivel completo).
const ETIQUETAS_NOMBRE_POLITICA = {
  PoliticaAnclaIncrementoMujer: 'Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres',
}

/**
 * @param {string} nombre - `politica.nombre`, identificador interno de código.
 * @returns {string}
 */
export function etiquetaNombrePolitica(nombre) {
  return ETIQUETAS_NOMBRE_POLITICA[nombre] ?? humanizarClave(nombre)
}

/**
 * Mensaje de "paso pendiente" para un PasoAuditable cuyo valor depende de una política
 * jurídica NO_RESUELTA — nunca afirma cuál interpretación es correcta, solo nombra la(s)
 * política(s) que impide(n) cerrarlo (con su nombre ya traducido, nunca el identificador
 * interno de código — ver etiquetaNombrePolitica, arriba). `politicasNoResueltas` ya viene
 * filtrado por el llamador (`estado === 'NO_RESUELTA'`) — esta función solo compone el texto,
 * nunca decide cuáles políticas aplican.
 *
 * @param {Array<{nombre: string}>} politicasNoResueltas
 * @returns {string}
 */
export function mensajePasoPendienteDePolitica(politicasNoResueltas) {
  const nombres = politicasNoResueltas.map((p) => `"${etiquetaNombrePolitica(p.nombre)}"`).join(' y ')
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

// Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B):
// `semanasCotizadas` (paso DATOS_UTILIZADOS, `escenario.semanasCotizadas.total`) puede traer
// decimales reales (ej. cuando la fuente es historia real, `diasCotizados / 7` —
// `calcularPensionRPM.js`/`calcularProyeccionRPM.js`, cerrados, sin tocar) — `toLocaleString`
// los mostraba tal cual ("1.470,857 semanas"), un decimal que nadie puede leer como una
// cantidad de días. Se reexpresa en semanas completas + días restantes, calculados desde el
// MISMO número real (nunca desde una versión ya redondeada) — `Math.round(valor * 7)` solo
// corrige el ruido de punto flotante de esa división (`diasCotizados / 7` y su inverso deben
// ser el mismo entero), nunca cambia el dato. Las semanas completas SIEMPRE se truncan
// (`Math.floor`, nunca `Math.ceil`/`Math.round`) — redondear la cifra de semanas hacia arriba
// afirmaría una semana que todavía no se completó; los días restantes son el resto exacto, sin
// perder precisión. Un valor ya entero (ej. 1300, semanas declaradas) da 0 días restantes y se
// muestra igual que antes ("1.300 semanas") — sin regresión para el caso ya cubierto.
/**
 * @param {number} valorEnSemanas - `semanasCotizadas` real, puede ser fraccionario.
 * @returns {string}
 */
export function formatearSemanasComoTexto(valorEnSemanas) {
  const diasTotales = Math.round(valorEnSemanas * 7)
  const semanasCompletas = Math.floor(diasTotales / 7)
  const diasRestantes = diasTotales - semanasCompletas * 7

  const textoSemanas = `${semanasCompletas.toLocaleString('es-CO')} ${semanasCompletas === 1 ? 'semana' : 'semanas'}`
  if (diasRestantes === 0) return textoSemanas
  return `${textoSemanas} y ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`
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
  if (clave === 'semanasCotizadas' && typeof valor === 'number') return formatearSemanasComoTexto(valor)
  if (CAMPOS_NUMERO_PLANO.has(clave) && typeof valor === 'number') return valor.toLocaleString('es-CO')
  if (CAMPOS_BOOLEANOS.has(clave) && typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (clave === 'origen' && typeof valor === 'string') return ETIQUETAS_ORIGEN[valor] ?? valor
  if (clave === 'razonVidaLaboralNoEvaluada' && typeof valor === 'string') {
    return ETIQUETAS_RAZON_VIDA_LABORAL_NO_EVALUADA[valor] ?? valor
  }
  if (typeof valor === 'number') return valor.toLocaleString('es-CO')
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}
