// Lógica pura de presentación para la comparación de caminos en
// ProyectaTuPensionRPM.jsx — separada en su propio módulo (mismo criterio ya usado por
// ExploraTuProyeccion.helpers.js: no un archivo de página, para poder exportar funciones
// sueltas sin romper react-refresh, y testeable sin montar el componente).
//
// Exclusivamente formato/presentación (S4-004): cada función recibe un escenario ya
// construido por generarCaminosRPM.js y solo decide cómo mostrarlo — nunca calcula IBC,
// pensión, esfuerzo, distancia al objetivo ni decide cuál camino está más alineado. Esos
// valores llegan ya determinados por dominio; aquí no se hace ninguna aritmética sobre
// ellos, solo comparaciones de igualdad/signo para elegir qué texto mostrar y formatearPesos
// para darles forma.
//
// Excepción puntual (2026-08-23): validarEsfuerzoAdicionalMensualDeseado es validación de
// UI, no presentación — vive aquí únicamente para poder testearse sin montar el componente
// (mismo motivo por el que existe este archivo), no porque pertenezca conceptualmente al
// resto de estas funciones.

import { formatearPesos } from '../format/formatearDinero.js'
import { formatearFechaCorta } from '../format/formatearFechaCorta.js'
import { formatearDuracionCalendario } from '../format/formatearDuracionCalendario.js'
import { validarSemanas } from '../domain/evidenciaSemanasMinimas.js'

// Ajuste UX/semántico (2026-08-26): "Tu IBC" pasó a ser la fila protagonista de la tarjeta
// (la acción que la persona debe ejecutar); esta función queda como su consecuencia
// económica derivada, siempre después y sin énfasis principal — decisión de producto, ver
// textoAjusteIBC más abajo y ProyectaTuPensionRPM.jsx (orden de las celdas).
/**
 * @param {Object} escenario
 * @returns {string}
 */
export function textoEsfuerzoAdicional(escenario) {
  if (escenario.tipo === 'base') return 'Sin cambios respecto a hoy.'
  if (escenario.esfuerzo.costoPensionalAdicionalMensual <= 0) return 'Sin cambios respecto a hoy.'
  return `Esto representa ${formatearPesos(escenario.esfuerzo.costoPensionalAdicionalMensual)} adicionales de aporte pensional al mes en este escenario.`
}

// Ajuste UX/semántico (2026-08-26, decisión Carlos): antes "textoIBCFuturo" solo informaba
// el dato (un antes/después neutro, última fila de la tarjeta, sin énfasis). El diagnóstico
// de esa fecha confirmó que la interfaz debía enfatizar primero el cambio de IBC como la
// acción real que la persona ejecuta — el aporte pensional adicional (textoEsfuerzoAdicional,
// arriba) es la consecuencia económica de esa acción, no al revés. Renombrada para reflejar
// ese cambio de rol, no solo de posición. Misma fuente de datos (escenario.esfuerzo), ningún
// cálculo nuevo — sigue siendo exclusivamente formato/presentación.
/**
 * @param {Object} escenario
 * @returns {string}
 */
export function textoAjusteIBC(escenario) {
  const { ibcActual, ibcPropuesto } = escenario.esfuerzo
  if (ibcPropuesto === ibcActual) return `Mantén tu IBC actual en ${formatearPesos(ibcActual)}.`
  return `Lleva tu IBC de ${formatearPesos(ibcActual)} a ${formatearPesos(ibcPropuesto)}.`
}

/**
 * checkpoint E4-C1, Decisión 3 (2026-09-10): cuando la meta solo se alcanza porque el piso
 * legal (1 SMLMV) elevó el resultado matemático crudo, la interfaz no puede decir lo mismo
 * que cuando la meta ya se alcanzaba sin ningún ajuste — son hechos distintos para la
 * persona. `escenario.objetivoAlcanzadoPorPisoLegal` ya viene resuelto por
 * generarCaminosRPM.js (E3-C2d): esta función nunca recalcula el piso, solo decide cómo
 * decirlo.
 * @param {Object} escenario
 * @returns {string}
 */
export function textoDistancia(escenario) {
  const { cumple, delta } = escenario.distanciaObjetivo
  if (cumple) {
    return escenario.objetivoAlcanzadoPorPisoLegal
      ? 'Alcanza tu objetivo por aplicación del piso legal.'
      : 'Alcanza tu objetivo.'
  }
  return `No alcanza tu objetivo — le faltarían ${formatearPesos(delta)} al mes.`
}

// checkpoint E4-C1, Decisión 3: revelación progresiva del resultado matemático crudo
// (`valorMatematico`) cuando difiere del resultado final ajustado — nunca compite
// visualmente con la cifra principal (`escenario.resultado.valor`), solo queda disponible
// para quien quiera auditar el ajuste. Distingue piso/techo con la misma fuente que ya
// decide `objetivoAlcanzadoPorPisoLegal` (ajusteLegal.pisoEvaluado/techoEvaluado.aplica) —
// nunca infiere la causa del texto de distancia, que responde una pregunta distinta (si se
// alcanzó el objetivo, no si el ajuste se aplicó).
/**
 * @param {Object} escenario
 * @returns {string|null} null cuando no hay nada que revelar (descartado, sin ajusteLegal,
 *   o el resultado final ajustado coincide con el matemático crudo)
 */
export function textoResultadoMatematicoPrevioAjuste(escenario) {
  if (escenario.estado !== 'viable') return null
  const ajuste = escenario.ajusteLegal
  if (!ajuste || ajuste.estado !== 'evaluado' || !Number.isFinite(ajuste.resultadoFinalAjustado)) return null
  if (escenario.valorMatematico === ajuste.resultadoFinalAjustado) return null

  const causa = ajuste.pisoEvaluado?.aplica ? 'el piso legal' : ajuste.techoEvaluado?.aplica ? 'el techo legal' : 'un ajuste legal'
  return (
    `Antes de aplicar ${causa}, el resultado matemático de la fórmula era ${formatearPesos(escenario.valorMatematico)} ` +
    'al mes — no se usa como tu pensión proyectada, se conserva únicamente para trazabilidad.'
  )
}

// Ajuste UX/producto (2026-08-27, tras revisión crítica de diseño — descartada la idea
// original de una progress bar independiente): segunda línea, secundaria, dentro de la
// misma celda que textoDistancia — nunca un componente ni bloque nuevo. Deliberadamente
// null cuando cumple === true: "Alcanza tu objetivo." ya es la respuesta completa ahí, y
// mostrar "100%"/"127%" se acercaría al lenguaje de puntaje/rentabilidad que esta pantalla
// evita en todo el resto de su copy (ver textoDiferenciaFrenteABase, más abajo). Cuando
// cumple es false, valorObjetivo es necesariamente positivo por construcción (delta =
// valorObjetivo - resultado.valor > 0 y resultado.valor >= 0 ⇒ valorObjetivo > 0) — sin
// guard adicional para valorObjetivo <= 0, ese caso no puede alcanzar esta rama (Principio:
// no validar un escenario que no puede ocurrir). Solo formato/presentación: el porcentaje
// se deriva de resultado.valor y distanciaObjetivo.valorObjetivo, ambos ya calculados por
// generarCaminosRPM.js — ninguna pensión se recalcula aquí. Coma decimal (es-CO), un solo
// decimal — mismo criterio de localización correcta que formatearPesos, arriba.
/**
 * @param {Object} escenario
 * @returns {string|null} null cuando el escenario ya alcanza o supera el objetivo
 */
export function textoPorcentajeObjetivo(escenario) {
  const { cumple, valorObjetivo } = escenario.distanciaObjetivo
  if (cumple) return null
  const porcentaje = (escenario.resultado.valor / valorObjetivo) * 100
  const porcentajeFormateado = porcentaje.toLocaleString('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `Equivale al ${porcentajeFormateado}% de tu objetivo.`
}

/**
 * Presenta diferenciaFrenteABase.delta (decisión de producto, 2026-08-24) — exclusivamente
 * formato: nunca resta, nunca recibe dos escenarios, solo decide el texto a partir del
 * delta ya calculado por generarCaminosRPM.js. delta === 0 (camino base) devuelve null a
 * propósito — "no mostrar una cifra redundante en el camino base" — el llamador decide si
 * omitir la celda o no renderizarla. Nunca usa la palabra "rentabilidad"/"retorno"/"ROI".
 * @param {{delta: number}|null} diferenciaFrenteABase
 * @returns {string|null}
 */
export function textoDiferenciaFrenteABase(diferenciaFrenteABase) {
  if (diferenciaFrenteABase === null) return null
  const { delta } = diferenciaFrenteABase
  if (delta === 0) return null
  // "más"/"menos" ya expresan la dirección — sin signo +/− delante de la cifra, para no
  // parecerse a una notación de rentabilidad/retorno financiero (decisión de producto,
  // 2026-08-24).
  const direccion = delta > 0 ? 'más' : 'menos'
  return `${formatearPesos(Math.abs(delta))} ${direccion} de pensión al mes frente a mantenerte como hoy.`
}

// Copy determinístico de "Qué podrías explorar ahora" (decisión de producto, 2026-08-24) —
// mapeo código → texto, mismo patrón ya usado por ETIQUETA_POSICION en
// GraficoEsfuerzoResultado.jsx: un objeto plano en la capa de presentación, sin abstracción
// nueva. determinarOrientacionExploracion.js (domain/) decide QUÉ situación existe; este
// mapeo decide CÓMO se dice — así el lenguaje de PensionLab puede cambiar sin tocar la
// lógica que determina el estado. Nunca cifras, nunca "mejor"/"recomendado"/"deberías"/
// "te conviene"/"asequible"/"rentable" — las cifras ya están en las tarjetas.
const TEXTO_ORIENTACION = {
  HOY_YA_ALCANZA_OBJETIVO:
    'Mantener tu situación actual ya alcanza tu objetivo declarado. Si quieres, puedes explorar un esfuerzo ' +
    'mensual distinto para ver su efecto.',
  OBJETIVO_LEGALMENTE_INALCANZABLE:
    'Con las condiciones actuales, aumentar tu aporte no permite alcanzar tu objetivo dentro del límite legal.',
  VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD:
    'Más de un camino evaluado alcanza tu objetivo, con esfuerzos mensuales distintos.',
  ELECCION_YA_ALCANZA_OBJETIVO: 'El esfuerzo que elegiste ya alcanza tu objetivo declarado.',
  ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE:
    'El esfuerzo que elegiste eleva tu proyección, pero no alcanza tu objetivo. Existe otro camino evaluado, ' +
    'con un esfuerzo mensual distinto, que sí lo alcanza.',
  RESTRICCION_COSTO_IMPIDE_OBJETIVO:
    'El límite que declaraste para tu aporte adicional impide alcanzar tu objetivo; sin ese límite, el objetivo ' +
    'sería alcanzable dentro del tope legal.',
  SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE:
    'Tu objetivo es alcanzable con un esfuerzo adicional mensual. Puedes explorar un nivel de esfuerzo que sea ' +
    'relevante para ti.',
}

/**
 * @param {string} codigo - orientacionExploracion.codigo de determinarOrientacionExploracion()
 * @returns {string|null} null si el código no está mapeado (defensivo, nunca lanza)
 */
export function textoOrientacion(codigo) {
  return TEXTO_ORIENTACION[codigo] ?? null
}

// Duplicada a propósito de ExploraTuProyeccion.helpers.js (RAIS) — mismo criterio de
// duplicación ya usado entre generarCaminosRAIS.js/generarCaminosRPM.js para no acoplar
// la pantalla de un régimen al archivo de helpers del otro. Regla data-driven, no
// estética: un código es "común" si aparece en TODOS los escenarios viables — nunca
// reinterpreta el mensaje ni asume qué código debería ser común, solo agrupa por
// coincidencia exacta de codigo (y por construcción, calcularProyeccionRPM.js siempre
// empareja el mismo codigo con el mismo mensaje, así que agrupar por codigo nunca mezcla
// dos textos distintos bajo un mismo grupo). Con un solo escenario viable, todas sus
// limitaciones cuentan como comunes (no hay nada de qué distinguirlas).

// Hace explícito el horizonte temporal de los caminos (§14 punto 9 del Entregable 2,
// decisión Carlos/Atlas 2026-08-21) — compone dos funciones de formato puras
// (formatearFechaCorta, formatearDuracionCalendario) sobre `resultado.horizonte`, ya
// calculado por generarCaminosRPM.js. Nunca instancia `new Date()` ni el reloj del
// navegador: fechaInicio/fechaFin vienen exclusivamente de dominio.
//
// @param {{fechaInicio: string, fechaFin: string, diasCotizados: number}} horizonte
// @param {number} edadJubilacionDeseada
// @returns {string}
export function textoHorizonte(horizonte, edadJubilacionDeseada) {
  const inicio = formatearFechaCorta(horizonte.fechaInicio)
  const fin = formatearFechaCorta(horizonte.fechaFin)
  const duracion = formatearDuracionCalendario(horizonte.fechaInicio, horizonte.fechaFin)
  return `${inicio} → ${fin} · ${duracion} · hasta los ${edadJubilacionDeseada} años`
}

// UX-RPM-02A (2026-08-25) — coordina el mensaje de semanas declaradas con el de historia
// vacía (ProyectaTuPensionRPM.jsx, condicionado a `resultado.semanas?.fuente !==
// 'declaracion_agregada'`): esta función cubre exactamente el caso complementario, para
// que nunca se muestren ambos ni ninguno. Reutiliza el contrato GO-B de
// `resultado.semanas` (generarCaminosRPM.js/calcularProyeccionRPM.js) tal cual —
// `observadas`/`futuras`/`sustentadasPorHistoria`/`declaradas`/`certeza`/`total`/`fuente`
// — sin inventar una estructura paralela ni un campo nuevo.
//
// Solo dice lo que el motor ya sabe: reconoce explícitamente que SÍ se conocen las
// semanas declaradas (nunca "desconocemos tu pasado") y, en la misma frase, que esa
// cifra es una declaración, no una historia verificada (nunca "conocemos tu historia") —
// sin afirmar que las semanas están verificadas, sin inventar IBC, períodos ni historia
// detallada. `certeza` distingue conocida/aproximada con el mismo patrón ya usado en
// BaseCotizacion.jsx (prefijo "aproximadamente " solo cuando `certeza === 'aproximado'`).
//
// @param {{observadas: number, futuras: number, sustentadasPorHistoria: number, declaradas: (number|null), certeza: (('conocido'|'aproximado')|null), total: number, fuente: ('declaracion_agregada'|'historia_estructurada')} | null} semanas - resultado.semanas de generarCaminosRPM.js
// @returns {string | null}
export function textoFuenteSemanas(semanas) {
  if (!semanas || semanas.fuente !== 'declaracion_agregada') return null

  const prefijo = semanas.certeza === 'aproximado' ? 'aproximadamente ' : ''
  return (
    `Conocemos las ${prefijo}${semanas.declaradas} semanas que declaraste, pero todavía no conocemos el ` +
    'detalle de los IBC de cada período de tu historia — por eso esta proyección parte de esa cifra ' +
    'declarada, no de una historia de cotización verificada. Completarla puede afinar el resultado.'
  )
}

// Único código de generarCaminosRPM.js relevante para esta decisión de presentación
// (precisión de producto S4-006, 2026-08-23): cuando la persona no alcanzaría las
// semanas mínimas a la edad explorada, el diagnóstico previo confirmó que ningún valor de
// restricciónCostoPensionalAdicionalMaximoMensual puede afectar ese resultado (el propio
// generarCaminosRPM.js retorna antes de leer ese parámetro en este caso) — pedirlo como
// paso principal ahí sería pedir un dato irrelevante para el problema real. No reinterpreta
// el código: solo decide, a partir de él, si ese campo debe ocultarse como paso principal.
const CODIGO_SEMANAS_INSUFICIENTES = 'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM'

/**
 * @param {{orientacion: {codigo: string}} | null} resultado - salida de generarCaminosRPM.js, o null si todavía no se calculó
 * @returns {boolean}
 */
export function debeOcultarRestriccion(resultado) {
  return resultado?.orientacion?.codigo === CODIGO_SEMANAS_INSUFICIENTES
}

/**
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

/**
 * Validación UX del borrador del camino personalizado — "no permitas confirmar: vacío,
 * 0, negativo, no numérico". No duplica ninguna regla legal: la única regla es "monto
 * positivo", la misma que ya exige generarCaminosRPM.js del lado del dominio
 * (esfuerzoAdicionalMensualDeseado > 0). Esta validación de UI solo evita que se intente
 * confirmar algo que el dominio de todas formas ignoraría en silencio.
 * @param {string} valorTexto
 * @returns {{valorValido: (number|null), mensajeError: (string|null)}}
 */
export function validarEsfuerzoAdicionalMensualDeseado(valorTexto) {
  if (valorTexto === '') {
    return { valorValido: null, mensajeError: null }
  }
  const numero = Number(valorTexto)
  if (!Number.isFinite(numero) || numero <= 0) {
    return { valorValido: null, mensajeError: 'Ingresa un monto mayor a $0.' }
  }
  return { valorValido: numero, mensajeError: null }
}

/**
 * Reordena las tarjetas de camino solo para presentación (decisión de producto
 * 2026-08-23): "situación actual → esfuerzo elegido por la persona → esfuerzo necesario
 * para el objetivo". Orden SEMÁNTICO por id, nunca por monto — el esfuerzo personalizado
 * no está garantizado a ser numéricamente menor que el del camino alternativo, así que
 * ordenar por cifra sería incorrecto. Nunca muta el array recibido ni el contrato de
 * resultado.escenarios que entrega generarCaminosRPM.js — devuelve siempre una copia.
 * @param {Array<Object>} escenarios
 * @returns {Array<Object>}
 */
export function ordenarCaminosParaPresentacion(escenarios) {
  const personalizado = escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
  if (!personalizado) return [...escenarios]

  const resto = escenarios.filter((e) => e.id !== 'esfuerzo-adicional-deseado')
  const indiceBase = resto.findIndex((e) => e.id === 'base')
  const posicionInsercion = indiceBase === -1 ? 0 : indiceBase + 1

  return [...resto.slice(0, posicionInsercion), personalizado, ...resto.slice(posicionInsercion)]
}

/**
 * Construye la entrada `semanasReferenciaDeclaradas` de generarCaminosRPM.js (contrato
 * GO-B, 2026-08-25) a partir de lo que la persona YA declaró en
 * InformacionPensionalEsencial.jsx — nunca se le vuelve a preguntar aquí. Reutiliza
 * `validarSemanas` (evidenciaSemanasMinimas.js), el mismo validador que ya usa la Primera
 * Lectura para este campo — ninguna regla nueva.
 *
 * 'desconocido' (o cualquier otro valor, incluido null) devuelve `null` — nunca se
 * interpreta como "0 semanas": ausencia de dato declarado, no un hecho sobre la persona.
 * Con `null`, generarCaminosRPM.js usa exclusivamente semanas sustentadas por historia
 * (comportamiento idéntico al existente antes de este contrato).
 * @param {('conocido'|'aproximado'|'desconocido'|null)} nivelConocimientoSemanas
 * @param {string} semanasCotizadas
 * @returns {{cantidad: number, certeza: ('conocido'|'aproximado')} | null}
 */
export function construirSemanasReferenciaDeclaradas(nivelConocimientoSemanas, semanasCotizadas) {
  if (nivelConocimientoSemanas !== 'conocido' && nivelConocimientoSemanas !== 'aproximado') return null
  const cantidad = validarSemanas(semanasCotizadas)
  if (cantidad === null) return null
  return { cantidad, certeza: nivelConocimientoSemanas }
}

// checkpoint E4-C1, Decisión 2 (2026-09-10): PensionLab no puede aceptar en silencio un
// objetivo de pensión RPM por debajo del piso legal (1 SMLMV) — ni generar caminos para
// alcanzarlo, ni mostrar "Alcanza tu objetivo" como si fuera un objetivo ordinario. Esta
// función es exclusivamente el PREDICADO de bloqueo — nunca decide el valor del piso (lo
// resuelve resolverSmlvVigenteRPM.js, ya consumido por ProyectaTuPensionRPM.jsx antes de
// llamar aquí) y nunca normaliza el objetivo por su cuenta: eso solo ocurre tras la acción
// explícita "Usar 1 SMLV como objetivo mínimo".
//
// `pisoLegalPensionMensual` puede ser null cuando el SMLV vigente no pudo resolverse para la
// fecha de cálculo (resolverSmlvVigenteRPM.js, aptoParaCalculoEnFechaBase === false) — en ese
// caso esta función nunca bloquea: afirmar un piso que no se pudo verificar sería inventar
// una certeza legal que no existe (mismo criterio de "no bloquear sin evidencia" ya usado en
// el resto del dominio).
/**
 * @param {number|null} objetivoValorMensual
 * @param {number|null} pisoLegalPensionMensual
 * @returns {boolean}
 */
export function objetivoInferiorAlPisoLegal(objetivoValorMensual, pisoLegalPensionMensual) {
  if (!Number.isFinite(objetivoValorMensual) || objetivoValorMensual <= 0) return false
  if (!Number.isFinite(pisoLegalPensionMensual) || pisoLegalPensionMensual <= 0) return false
  return objetivoValorMensual < pisoLegalPensionMensual
}

/**
 * @param {number} pisoLegalPensionMensual - ya resuelto, en pesos de hoy
 * @returns {string}
 */
export function textoObjetivoInferiorAlPisoLegal(pisoLegalPensionMensual) {
  return (
    `El objetivo que escribiste está por debajo del salario mínimo legal vigente (${formatearPesos(pisoLegalPensionMensual)} ` +
    'al mes, en pesos de hoy). Si cumples los requisitos para una pensión de vejez en el Régimen de Prima Media, la mesada ' +
    'reconocida no puede quedar por debajo del piso legal evaluado — por eso no construimos caminos para un objetivo menor. ' +
    'PensionLab no predice futuros incrementos del salario mínimo: esta cifra es la vigente hoy.'
  )
}

// Revisión correctiva E4-C1 (2026-09-10), hallazgo 1 de la validación manual de Carlos: el
// texto del botón debe dejar la CONSECUENCIA totalmente explícita ("a qué cifra exacta
// cambiaría mi objetivo"), no solo nombrar la unidad legal ("1 SMLV"). La cifra siempre
// proviene de `pisoLegalPensionMensual` (resolverSmlvVigenteRPM.js, vía
// ProyectaTuPensionRPM.jsx) — esta función nunca hardcodea $1.750.905 ni ningún otro valor;
// si el piso cambia (otro año, otra fecha de cálculo), el texto cambia con él.
/**
 * @param {number} pisoLegalPensionMensual - ya resuelto, en pesos de hoy
 * @returns {string}
 */
export function textoAccionUsarPisoLegalComoObjetivo(pisoLegalPensionMensual) {
  return `Cambiar mi objetivo al mínimo legal de ${formatearPesos(pisoLegalPensionMensual)}`
}

// Revisión correctiva E4-C1 (2026-09-10), hallazgo 3: gramática natural según cantidad —
// nunca "período(s)"/"agregado(s)". El caso cero usa una oración completamente distinta
// (no es una variación de "0 períodos agregados": "No has agregado períodos de cotización."
// es la forma en que una persona real lo diría) — el caso singular/plural sí comparte
// estructura, solo cambia la palabra.
/**
 * @param {number} cantidadPeriodos - historiaCotizacion.length
 * @returns {string}
 */
export function textoResumenHistoriaCotizacion(cantidadPeriodos) {
  if (cantidadPeriodos === 0) return 'No has agregado períodos de cotización.'
  const palabra = cantidadPeriodos === 1 ? 'período' : 'períodos'
  const participio = cantidadPeriodos === 1 ? 'agregado' : 'agregados'
  return `Historia de cotización estructurada: ${cantidadPeriodos} ${palabra} ${participio}.`
}

// Revisión correctiva E4-C1 (2026-09-10), hallazgo 4: distingue explícitamente TRES estados
// — nunca convierte en silencio "campo vacío" en "límite de $0". `restriccionCostoPensional`
// ya llega parseado por validarMontoNoNegativo.js (ProyectaTuPensionRPM.jsx): `null` significa
// "el campo está vacío, la persona no respondió esta pregunta todavía" (nunca "cero"); `0` es
// un valor numérico válido y semánticamente distinto — la persona SÍ escribió "0", una
// declaración real de "no tengo margen para aportar más" que generarCaminosRPM.js ya
// interpreta de forma distinta a la ausencia (limiteIBCPorRestriccion se vuelve exactamente
// ibcAplicableSimulacion, sin margen — ver generarCaminosRPM.js). Por eso el cero explícito
// SÍ es un dato válido en este formulario, y esta función lo redacta de forma reconocible en
// vez de mostrarlo idéntico a la ausencia o a un valor positivo cualquiera.
/**
 * @param {number|null} restriccionCostoPensional - ya parseado (validarMontoNoNegativo);
 *   `null` = campo vacío/no informado, `0` = cero explícito, `> 0` = valor informado.
 * @returns {string}
 */
export function textoResumenLimiteEsfuerzo(restriccionCostoPensional) {
  if (restriccionCostoPensional === null) return 'Límite de esfuerzo mensual: no informado.'
  if (restriccionCostoPensional === 0) {
    return 'Límite de esfuerzo mensual: $0 adicionales al mes — declaraste explícitamente que no puedes destinar nada adicional.'
  }
  return `Límite de esfuerzo mensual: ${formatearPesos(restriccionCostoPensional)} adicionales al mes.`
}

// checkpoint E4-C1, Decisión 5 (2026-09-10) — resumen revisable de la información ingresada.
// Exclusivamente formato: cada función decide cómo mostrar un dato ya capturado en otra
// pantalla, nunca calcula ni reinterpreta ese dato. La ausencia de una fecha de referencia
// para las semanas declaradas se documenta explícitamente aquí (nunca se inventa una) — ver
// InformacionPensionalEsencial.jsx, que hoy no captura ese dato.
/**
 * @param {('conocido'|'aproximado'|'desconocido'|null)} nivelConocimientoSemanas
 * @param {string} semanasCotizadas
 * @returns {string}
 */
export function textoResumenSemanasDeclaradas(nivelConocimientoSemanas, semanasCotizadas) {
  if (nivelConocimientoSemanas === 'desconocido') return 'No declaraste cuántas semanas tienes cotizadas.'
  if (nivelConocimientoSemanas !== 'conocido' && nivelConocimientoSemanas !== 'aproximado') {
    return 'Todavía no respondiste esta pregunta.'
  }
  const prefijo = nivelConocimientoSemanas === 'aproximado' ? 'aproximadamente ' : ''
  // Ausencia documentada a propósito (checkpoint E4-C1, Decisión 5): no existe hoy un dato
  // de "fecha de referencia" para esta cifra — no se inventa ni se implementa aquí.
  return `${prefijo}${semanasCotizadas} semanas — sin una fecha de referencia registrada todavía.`
}

// Revisión correctiva E4-C1 (2026-09-10), punto 4: el resumen NUNCA muestra el nombre
// técnico del enum de certeza ("certeza: conocido", "certeza: aproximado") — siempre
// lenguaje natural. Los cuatro textos exactos exigidos viven aquí, como única fuente de esa
// redacción (el valor técnico `certezaValorDeclarado`/`certezaBaseCotizacion` se sigue
// usando internamente para decidir CUÁL de los cuatro aplica, nunca se imprime tal cual).
const TEXTO_CERTEZA_IBC = {
  exacto: 'Valor exacto declarado por ti',
  aproximado: 'Valor aproximado declarado por ti',
  estimadoDesdeSalario: 'Estimado a partir del salario que declaraste',
  desconocido: 'No conocemos todavía tu IBC actual',
}

/**
 * @param {Object} baseCotizacion - salida de determinarBaseCotizacion.js
 * @param {('conocido'|'aproximado'|'desconocido'|null)} certezaBaseCotizacion
 * @returns {string}
 */
export function textoResumenBaseCotizacion(baseCotizacion, certezaBaseCotizacion) {
  if (!certezaBaseCotizacion) return 'Todavía no respondiste esta pregunta.'
  if (baseCotizacion.ibcAplicableSimulacion === null) {
    return certezaBaseCotizacion === 'desconocido'
      ? `${TEXTO_CERTEZA_IBC.desconocido}.`
      : 'El valor que declaraste no es apto para simulación todavía (ver detalle en esa pantalla).'
  }
  if (baseCotizacion.origenDatoIbc === 'calculado_desde_dato_declarado') {
    return `${formatearPesos(baseCotizacion.ibcAplicableSimulacion)} al mes — ${TEXTO_CERTEZA_IBC.estimadoDesdeSalario}.`
  }
  const descripcionCerteza =
    baseCotizacion.certezaValorDeclarado === 'aproximado' ? TEXTO_CERTEZA_IBC.aproximado : TEXTO_CERTEZA_IBC.exacto
  return `${formatearPesos(baseCotizacion.ibcAplicableSimulacion)} al mes — ${descripcionCerteza}.`
}

// Revisión correctiva E4-C1, punto 4/6: mismo criterio que TEXTO_CERTEZA_IBC — nunca se
// imprime el código interno de detalleTraslado tal cual (ej. "rpm_a_rais"), siempre su
// redacción en lenguaje natural. Vocabulario más breve que OPCIONES_DETALLE_TRASLADO de
// IndiciosRegimenTransicion.jsx (esa pantalla necesita frases completas para un radio button;
// aquí es una cláusula dentro de una sola línea de resumen) — mismos cuatro códigos, nunca
// un quinto inventado.
const TEXTO_DETALLE_TRASLADO = {
  rpm_a_rais: 'de Colpensiones a un fondo privado',
  rais_a_rpm: 'de un fondo privado a Colpensiones',
  multiple: 'más de un traslado',
  no_estoy_seguro: 'dirección no confirmada',
}

/**
 * @param {Object} params
 * @param {string|null} params.trasladoRegimen
 * @param {string|null} params.detalleTraslado
 * @param {('conocido'|'aproximado'|'desconocido'|null)} params.certezaFechaTraslado
 * @param {string} params.fechaTrasladoRegimen
 * @returns {string|null} null cuando no hubo traslado declarado — el llamador decide no
 *   mostrar esta fila en absoluto ("cuando exista", per checkpoint E4-C1)
 */
export function textoResumenTraslado({ trasladoRegimen, detalleTraslado, certezaFechaTraslado, fechaTrasladoRegimen }) {
  if (trasladoRegimen !== 'si') return null
  const partes = ['Te trasladaste de régimen alguna vez']
  const detalleLegible = TEXTO_DETALLE_TRASLADO[detalleTraslado] ?? null
  if (detalleLegible) partes.push(`(${detalleLegible})`)
  if (certezaFechaTraslado === 'conocido' || certezaFechaTraslado === 'aproximado') {
    partes.push(`— fecha ${certezaFechaTraslado === 'aproximado' ? 'aproximada' : ''} ${fechaTrasladoRegimen}`.trim())
  } else {
    partes.push('— sin fecha declarada')
  }
  // Recordatorio deliberado (mismo criterio de honestidad que IndiciosRegimenTransicion.jsx):
  // esta fecha nunca modifica ningún cálculo.
  return `${partes.join(' ')}. Esta fecha no modifica ningún cálculo.`
}

// Revisión correctiva E4-C1 (2026-09-10), hallazgo 6: predicado puro extraído para poder
// probar la regla de visibilidad sin montar el componente (no hay React Testing Library en
// este repositorio — ver decisión registrada en el checkpoint anterior). El botón general
// "Editar tu objetivo o la edad que quieres explorar" solo tiene sentido cuando (a) el
// formulario inline no está ya abierto (mostrarFormulario) — ahí no hay nada que "editar", ya
// se está editando — y (b) el resumen revisable no está expandido — si lo está, sus botones
// individuales "Editar" de objetivo/edad objetivo ya cubren exactamente la misma acción, y
// mostrar ambos sería la duplicación reportada.
/**
 * @param {Object} params
 * @param {boolean} params.mostrarFormulario
 * @param {boolean} params.resumenAbierto
 * @returns {boolean}
 */
export function debeMostrarBotonGeneralEdicionObjetivo({ mostrarFormulario, resumenAbierto }) {
  return !mostrarFormulario && !resumenAbierto
}
