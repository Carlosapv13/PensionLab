// E2 (Slice "separación entre elegibilidad proyectada y cuantía económica", sprint-4-
// correcciones-oscar-baldor) — Contrato A del plan PL-260. Responde EXCLUSIVAMENTE la
// pregunta "¿la persona proyecta cumplir edad y semanas?", sin depender en ningún punto de
// si el IBL es calculable. Antes de este Slice, generarCaminosRPM.js solo podía confirmar
// el requisito de semanas DESPUÉS de que calcularProyeccionRPM.js hubiera calculado
// exitosamente el IBL — así que una historia insuficiente para la ventana de 10 años
// bloqueaba la respuesta a "¿cumples semanas?" incluso cuando esa respuesta era
// perfectamente calculable con los datos ya disponibles (historia declarada + semanas
// declaradas + horizonte). Esta función rompe esa dependencia: nunca llama a
// calcularProyeccionRPM.js, seleccionarPeriodosIBL.js ni ninguna función de IBL/tasa.
//
// Reutiliza, sin reimplementar, exactamente los mismos resolvers legales y la misma
// convención de días→semanas que ya usa calcularProyeccionRPM.js/generarCaminosRPM.js
// (Principio 11: ninguna fecha o conteo se resuelve dos veces con lógica distinta) — ver
// resolverSemanasProyectadasRPM.js y resolverHorizonteFuturoRPM.js, compartidos con
// calcularProyeccionRPM.js.
//
// Fuera de alcance deliberado de E2 (ver docs/producto/PL-260-...): piso de pensión
// mínima, ancla de incremento controvertida para mujeres, búsqueda inversa del IBC,
// nuevos caminos, ejercicio Baldor, rediseño visual. Esta función no calcula ningún peso,
// ninguna tasa de reemplazo ni ningún IBL — solo fechas y conteos de semanas.
//
// --- Corrección de revisión crítica (Carlos/Atlas, 2026-09-04) ---
// El diseño original de esta función tenía dos defectos reales, encontrados por el propio
// autor en una revisión adversarial posterior:
//
// 1. `fechaCompletaSemanas`/`fechaReconocimientoConjunta` usaban como "blanco" fijo el
//    mínimo de semanas resuelto a `fechaObjetivoSolicitada` — para una mujer bajo el
//    cronograma decreciente de la Sentencia C-197/2023, el mínimo real en la fecha en que
//    efectivamente completaría las semanas puede ser MENOR que el de fechaObjetivoSolicitada
//    (si esta es anterior), así que ese diseño podía sobreestimar cuánto le falta. Corregido
//    aquí con una búsqueda determinista de la primera fecha en que edad y semanas se cumplen
//    CONJUNTAMENTE, evaluando el mínimo aplicable en cada fecha candidata — nunca un blanco
//    fijo — apoyada en la propiedad monótona demostrada abajo, con verificación explícita de
//    que esa propiedad se sostiene contra los datos legales realmente cargados (nunca
//    asumida a ciegas).
// 2. `edadJubilacionDeseada` solo se validaba como "número finito", sin reutilizar el límite
//    funcional (`EDAD_MAXIMA_FUNCIONAL = 100`) ya definido en
//    requisitosDatosImprescindiblesRPM.js. Corregido: se reutiliza esa misma función y esa
//    misma constante, sin duplicarla.
//
// --- Propiedad monótona que sostiene la búsqueda de fechaCumpleEdad/fechaCompletaSemanas ---
// Sea t una fecha >= `fecha` (hoy). Definimos:
//   f_edad(t)     = edadCumplida(fechaNacimiento, t) >= edadMinimaAplicable(t)
//   f_semanas(t)  = semanasAcumuladas(t)             >= semanasMinimasAplicables(t)
// Ambos predicados son monótonos no decrecientes en t (una vez true, permanecen true),
// PORQUE:
//   - edadCumplida(t) crece con t (trivial, aritmética de fechas).
//   - semanasAcumuladas(t) crece con t (trivial: cada día adicional bajo el supuesto de
//     continuidad solo puede sumar semanas, nunca restarlas).
//   - edadMinimaAplicable(t) NUNCA aumenta en el tiempo, dentro de las reglas versionadas
//     hoy en data/legal (57/62, constantes, sin cronograma) — verificado en tiempo de
//     ejecución, no asumido (ver verificarUmbralNoCreciente más abajo).
//   - semanasMinimasAplicables(t) NUNCA aumenta en el tiempo, dentro del cronograma
//     versionado hoy (Sentencia C-197/2023: decreciente hasta un piso, luego constante) —
//     igualmente verificado en tiempo de ejecución.
// Con ambos factores monótonos no decrecientes y ambos umbrales monótonos no crecientes,
// cada predicado es monótono no decreciente — permite localizar la PRIMERA fecha en que es
// true mediante búsqueda binaria (bisección), en O(log n) evaluaciones, en vez de una
// iteración fija que solo "parece suficiente" para el cronograma de hoy.
//
// Si la verificación de "el umbral nunca aumenta" falla contra los datos legales realmente
// cargados (ej. una versión futura de vigente-2026.json introdujera un cronograma no
// monótono), la búsqueda para ESE campo específico se declara no determinable — nunca se
// asume la propiedad ni se sigue buscando con una premisa no verificada. Esto NUNCA afecta
// `estado` (siempre evaluado directamente en fechaObjetivoSolicitada, sin búsqueda) — solo
// puede dejar `fechaCumpleEdad`/`fechaCompletaSemanas`/`fechaReconocimientoConjunta` en
// null, con la razón documentada en `supuestos`.

import { diasCalendarioEnRango, diaSiguiente } from '../seleccionarPeriodosIBL.js'
import { calcularFechaPorEdad } from '../calcularFechaPorEdad.js'
import { calcularEdadCumplida } from '../calcularEdadCumplida.js'
import { resolverHorizonteFuturoRPM } from '../resolverHorizonteFuturoRPM.js'
import { obtenerEdadPension, obtenerSemanasMinimas } from '../../data/legal/index.js'
import { resolverSemanasProyectadasRPM } from './resolverSemanasProyectadasRPM.js'
import { edadJubilacionDeseadaEsValida, edadJubilacionDeseadaEsUtilizable, EDAD_MAXIMA_FUNCIONAL } from './requisitosDatosImprescindiblesRPM.js'
import { esFechaValida, validarHistoriaCotizacionTemporal } from './validarHistoriaCotizacionTemporal.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Identificadores estables de cada valor trazable de este contrato — para que un consumidor
// (hoy generarCaminosRPM.js; en Slices futuros, el ejercicio tipo Baldor) pueda referenciar
// "de dónde vino este número" sin depender de copiarlo entre objetos. No son literales
// mágicos: cada uno nombra exactamente el campo que identifica dentro de este contrato.
export const VALUE_IDS_ELEGIBILIDAD_RPM = {
  EDAD_MINIMA_APLICABLE: 'elegibilidadProyectadaRPM.edadMinimaAplicable',
  SEMANAS_ACTUALES: 'elegibilidadProyectadaRPM.semanasActuales',
  SEMANAS_MINIMAS_APLICABLES: 'elegibilidadProyectadaRPM.semanasMinimasAplicables',
}

// --- Estados del contrato (punto 5, corrección de nombres) ---
// "ELEGIBLE_PROYECTADO" se retiró: podía leerse como una promesa de derecho reconocido.
// Este contrato nunca determina un derecho — solo si, según los datos y supuestos de ESTA
// proyección, la persona cumpliría los requisitos GENERALES de edad y semanas en la fecha
// que pidió explorar. Cualquier texto futuro (Baldor, UI) que consuma este estado debe
// decir literalmente algo equivalente a:
//   "Según los datos y supuestos de esta proyección, cumplirías los requisitos generales
//    de edad y semanas."
// Nunca "Eres elegible" ni "Tienes derecho a pensión".
export const ESTADOS_ELEGIBILIDAD_RPM = {
  CUMPLE: 'CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO',
  NO_CUMPLE_EDAD: 'NO_CUMPLE_EDAD_EN_FECHA_OBJETIVO',
  NO_CUMPLE_SEMANAS: 'NO_CUMPLE_SEMANAS_EN_FECHA_OBJETIVO',
  NO_CUMPLE_NINGUNO: 'NO_CUMPLE_EDAD_NI_SEMANAS_EN_FECHA_OBJETIVO',
  NO_EVALUABLE: 'NO_EVALUABLE_DATOS_INSUFICIENTES',
}

const RITMO_CONTINUIDAD_SIN_INTERRUPCIONES = {
  codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
  mensaje:
    'Las semanas futuras asumen que cotizas de forma continua, sin interrupciones, desde hoy hasta la fecha ' +
    'que elegiste explorar — cualquier hueco real cambiaría el resultado.',
  // Punto 6 (auditoría del supuesto de continuidad, 2026-09-04): NINGÚN dato de entrada de
  // este contrato (ni de generarCaminosRPM.js en general) distingue hoy si la persona
  // cotiza actualmente, dejó de cotizar, declaró la intención de continuar, tiene un ritmo
  // parcial, tiene interrupciones previstas, o cotiza desde el exterior — `tipoCotizante`/
  // `lugarCotizacion` existen como campos en otras pantallas (determinarBaseCotizacion.js)
  // pero generarCaminosRPM.js los ignora explícitamente (ver su propio comentario "S4-001:
  // sin restricción de tipoCotizante/lugarCotizacion/trasladoRegimen"). La continuidad sin
  // interrupciones es un supuesto ESTRUCTURAL heredado de S4-002 (calcularProyeccionRPM.js),
  // aplicado siempre, sin ningún campo de entrada que lo confirme ni lo niegue — no una
  // inferencia de este contrato. No se agrega un campo nuevo en E2 para distinguir estos
  // casos (instrucción explícita) — se deja registrada la brecha para que una decisión de
  // producto posterior determine si corresponde capturar esa intención antes de mostrar el
  // resultado a un usuario real.
  procedencia: 'supuesto_estructural_heredado_S4-002_sin_campo_de_entrada',
}

function construirRazones({ codigo, mensaje, detalle = null }) {
  return [{ codigo, mensaje, detalle }]
}

function noEvaluable(razones) {
  return {
    fechaCalculo: null,
    sexoResuelto: null,
    edadActual: null,
    edadMinimaAplicable: null,
    fechaCumpleEdad: null,
    semanasActuales: null,
    ritmoCotizacionFutura: null,
    fechaObjetivoSolicitada: null,
    semanasFuturasHastaFechaObjetivo: null,
    semanasTotalesEnFechaObjetivo: null,
    fechaCompletaSemanas: null,
    fechaReconocimientoConjunta: null,
    fechaConjuntaDentroDelObjetivo: null,
    semanasMinimasAplicables: null,
    estado: ESTADOS_ELEGIBILIDAD_RPM.NO_EVALUABLE,
    razones,
    supuestos: [],
    fuentesUtilizadas: [],
  }
}

// --- Búsqueda monótona (punto 1) ---

/**
 * Verifica que `resolverUmbral(fecha)` no aumente al muestrear una vez por año calendario
 * entre fechaInicio y fechaLimite (ambas incluidas) — suficiente porque ningún umbral legal
 * cargado hoy en data/legal cambia con una granularidad más fina que un año (ver
 * resolverCronograma en data/legal/index.js). Si en el futuro una regla cambiara dentro de
 * un mismo año, este muestreo NO lo detectaría — limitación conocida, aceptada porque
 * ninguna entrada real de data/legal lo hace hoy; documentado para revisión si eso cambia.
 *
 * @param {Object} params
 * @param {string} params.fechaInicio - ISO
 * @param {string} params.fechaLimite - ISO, >= fechaInicio
 * @param {(fechaISO: string) => number} params.resolverUmbral
 * @returns {boolean}
 */
function umbralNuncaAumenta({ fechaInicio, fechaLimite, resolverUmbral }) {
  const anioInicio = new Date(fechaInicio).getUTCFullYear()
  const anioLimite = new Date(fechaLimite).getUTCFullYear()
  let anterior = null
  for (let anio = anioInicio; anio <= anioLimite; anio++) {
    const candidata = `${anio}-01-01`
    const fechaMuestra = candidata < fechaInicio ? fechaInicio : candidata > fechaLimite ? fechaLimite : candidata
    const valor = resolverUmbral(fechaMuestra)
    if (anterior !== null && valor > anterior) return false
    anterior = valor
  }
  return true
}

/**
 * Búsqueda binaria de la primera fecha, dentro de [fechaInicio, fechaLimite], en la que
 * `predicado` es true — asumiendo que `predicado` es monótono no decreciente en ese rango
 * (una vez true, permanece true). O(log días) evaluaciones, determinista, sin dependencia
 * de zona horaria (toda la aritmética de fechas pasa por diasCalendarioEnRango/sumarDias,
 * ya en UTC).
 *
 * @param {Object} params
 * @param {string} params.fechaInicio - ISO
 * @param {string} params.fechaLimite - ISO, >= fechaInicio
 * @param {(fechaISO: string) => boolean} params.predicado
 * @returns {string|null} la primera fecha ISO donde predicado es true, o null si nunca lo
 *   es dentro del rango.
 */
export function primeraFechaVerdadera({ fechaInicio, fechaLimite, predicado }) {
  if (predicado(fechaInicio)) return fechaInicio
  if (!predicado(fechaLimite)) return null

  const totalDias = diasCalendarioEnRango(fechaInicio, fechaLimite) - 1
  let bajo = 0 // invariante: predicado(offset bajo) === false
  let alto = totalDias // invariante: predicado(offset alto) === true

  while (alto - bajo > 1) {
    const medio = bajo + Math.floor((alto - bajo) / 2)
    const fechaMedio = sumarDias(fechaInicio, medio)
    if (predicado(fechaMedio)) {
      alto = medio
    } else {
      bajo = medio
    }
  }
  return sumarDias(fechaInicio, alto)
}

/**
 * @typedef {Object} SemanasReferenciaDeclaradasEntrada
 * @property {number} cantidad
 * @property {('conocido'|'aproximado')} certeza
 */

/**
 * @param {Object} input
 * @param {('Mujer'|'Hombre'|null)} input.sexo
 * @param {string} input.fechaNacimiento - ISO
 * @param {number|null} input.edadJubilacionDeseada - años; junto con fechaNacimiento
 *   determina fechaObjetivoSolicitada
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), diasCotizados: number}>} [input.historiaCotizacion]
 * @param {SemanasReferenciaDeclaradasEntrada|null} [input.semanasReferenciaDeclaradas] -
 *   mismo contrato GO-B ya vigente en calcularProyeccionRPM.js
 * @param {string} [input.fecha] - ISO, por defecto hoy
 * @returns {Object} ver ESTADOS_ELEGIBILIDAD_RPM para los valores posibles de `estado`.
 */
export function evaluarElegibilidadProyectadaRPM({
  sexo,
  fechaNacimiento,
  edadJubilacionDeseada,
  historiaCotizacion = [],
  semanasReferenciaDeclaradas = null,
  fecha = hoyISO(),
} = {}) {
  // --- Datos estructurales imprescindibles ---
  if (sexo !== 'Mujer' && sexo !== 'Hombre') {
    return noEvaluable(
      construirRazones({
        codigo: 'SEXO_NO_DECLARADO',
        mensaje: 'Todavía falta declarar tu sexo para poder resolver los requisitos legales de edad y semanas mínimas.',
      })
    )
  }
  if (!esFechaValida(fechaNacimiento)) {
    return noEvaluable(
      construirRazones({ codigo: 'FECHA_NACIMIENTO_NO_VALIDA', mensaje: 'Todavía falta una fecha de nacimiento válida.' })
    )
  }

  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)

  // Punto 3: se reutiliza edadJubilacionDeseadaEsUtilizable (requisitosDatosImprescindiblesRPM.js)
  // en vez de un criterio propio de "cualquier número finito" — la MISMA función y la MISMA
  // constante EDAD_MAXIMA_FUNCIONAL que ya usa ProyectaTuPensionRPM.jsx, sin duplicarla.
  if (!edadJubilacionDeseadaEsValida(edadJubilacionDeseada)) {
    return noEvaluable(
      construirRazones({
        codigo: 'EDAD_JUBILACION_NO_VALIDA',
        mensaje: 'Todavía falta declarar la edad hasta la que quieres explorar.',
      })
    )
  }
  if (!edadJubilacionDeseadaEsUtilizable(edadJubilacionDeseada, edadActual)) {
    const mensaje =
      edadJubilacionDeseada <= edadActual
        ? `La edad que quieres explorar (${edadJubilacionDeseada} años) ya la cumpliste o es tu edad actual (${edadActual} años) — elige una edad futura.`
        : `PensionLab explora escenarios hasta los ${EDAD_MAXIMA_FUNCIONAL} años — la edad que declaraste (${edadJubilacionDeseada}) excede ese límite.`
    return noEvaluable(
      construirRazones({
        codigo: 'EDAD_JUBILACION_FUERA_DE_RANGO_FUNCIONAL',
        mensaje,
        detalle: { edadElegida: edadJubilacionDeseada, edadActual, edadMaximaFuncional: EDAD_MAXIMA_FUNCIONAL },
      })
    )
  }

  // Punto 4: única fuente para fechaObjetivoSolicitada/días futuros — compartida con
  // calcularProyeccionRPM.js vía resolverHorizonteFuturoRPM.js. Reemplaza el defecto
  // encontrado en la revisión crítica: antes esta función no validaba que
  // fechaObjetivoSolicitada fuera posterior a `fecha` (calcularProyeccionRPM.js sí lo
  // hacía, con EDAD_JUBILACION_NO_POSTERIOR_A_HOY) — ahora ambas comparten la misma
  // validación, sin duplicar la lógica que la expresa.
  const horizonte = resolverHorizonteFuturoRPM({ fechaNacimiento, edadObjetivo: edadJubilacionDeseada, fecha })
  if (!horizonte.valido) {
    return noEvaluable(
      construirRazones({
        codigo: horizonte.razonInvalido,
        mensaje: 'La edad que quieres explorar ya se cumplió — elige una fecha futura respecto a hoy.',
      })
    )
  }

  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'
  const fechaObjetivoSolicitada = horizonte.fechaObjetivo

  // --- Edad ---
  // Resuelto a fechaObjetivoSolicitada, no a `fecha` — misma justificación ya documentada
  // en generarCaminosRPM.js: no es proyectar ley futura, es aplicar una constante ya
  // vigente (57/62) a la fecha en que efectivamente se evaluaría.
  const edadMinimaResuelta = obtenerEdadPension(fechaObjetivoSolicitada, sexoResuelto)
  const edadMinimaAplicable = {
    valueId: VALUE_IDS_ELEGIBILIDAD_RPM.EDAD_MINIMA_APLICABLE,
    valor: edadMinimaResuelta.valor,
    normaId: edadMinimaResuelta.id,
    estado: edadMinimaResuelta.estado,
    listoParaProduccion: edadMinimaResuelta.listoParaProduccion,
  }
  const edadSuficiente = edadJubilacionDeseada >= edadMinimaAplicable.valor

  // Corrección de riesgo funcional (2026-09-04, previa al commit de E2): validación
  // temporal de historiaCotizacion, ANTES de sumar nada de ella — hard stop incondicional,
  // incluso si existe una declaración agregada válida. Sin esta comprobación,
  // resolverSemanasProyectadasRPM contaría como "observadas" días que ya pertenecen al
  // tramo futuro sintético que calcularProyeccionRPM.js construye por separado (doble
  // conteo del futuro), y generarCaminosRPM.js podría concluir sobre requisitos antes de
  // que calcularProyeccionRPM.js llegara a rechazar esa misma historia. Se detiene aquí
  // deliberadamente, ANTES de leer semanasReferenciaDeclaradas para nada: la declaración
  // nunca "rescata" una historia temporalmente inconsistente, porque esa misma historia
  // seguiría alimentando el IBL en calcularProyeccionRPM.js si el escenario continuara.
  const validacionHistoria = validarHistoriaCotizacionTemporal(historiaCotizacion, fecha)
  if (!validacionHistoria.valida) {
    const mensajesPorCodigo = {
      HISTORIA_NO_ES_ARREGLO_VALIDO: 'Tu historia de cotización no tiene un formato válido.',
      HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA: 'Uno de los períodos de tu historia de cotización tiene una fecha inválida.',
      HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS: 'Uno de los períodos de tu historia de cotización tiene la fecha de inicio después de la fecha de fin.',
      HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO: 'Uno de los períodos de tu historia de cotización está fechado en el futuro respecto a hoy.',
    }
    return noEvaluable(
      construirRazones({
        codigo: validacionHistoria.codigo,
        mensaje: mensajesPorCodigo[validacionHistoria.codigo],
        detalle: { periodo: validacionHistoria.periodo, indice: validacionHistoria.indice },
      })
    )
  }

  // --- Semanas ---
  const resolucionSemanas = resolverSemanasProyectadasRPM({
    historiaCotizacion,
    semanasReferenciaDeclaradas,
    diasFuturos: horizonte.diasFuturos,
  })

  // Distinción deliberada (E2, hallazgo del propio diseño de este contrato): "0 semanas
  // actuales" significa cosas distintas según de dónde salga. Si NO hay ninguna historia
  // declarada NI ninguna declaración agregada, ese 0 es la ausencia de evidencia, no un
  // hecho confirmado — declarar con la misma confianza "no cumples semanas" en ese caso
  // inventaría certeza que no existe. Cuando SÍ hay evidencia (declaración, o historia con
  // al menos un período, por parcial que sea), el número ya es la cifra real que el resto
  // del dominio siempre trató como autoritativa (contrato GO-B).
  const tieneEvidenciaSemanas = resolucionSemanas.declaradas !== null || historiaCotizacion.length > 0
  const procedenciaSemanasActuales = !tieneEvidenciaSemanas
    ? 'sin_evidencia'
    : resolucionSemanas.fuente === 'declaracion_agregada'
      ? 'declaracion_agregada'
      : 'historia_estructurada'

  const semanasActualesCantidad = resolucionSemanas.declaradas !== null ? resolucionSemanas.declaradas : resolucionSemanas.observadas

  // Punto 7 (auditoría de procedencia de semanas): se exponen declaración e historia
  // SIMULTÁNEAMENTE, aunque la precedencia GO-B (sin cambios) solo use una para `cantidad`.
  // Una historia parcial puede alimentar el IBL en calcularProyeccionRPM.js (a través de
  // `historiaCotizacion`, siempre) y al mismo tiempo NO ser la fuente elegida aquí para las
  // semanas (si hay una declaración válida) — son dos usos independientes del mismo array
  // de entrada, nunca el mismo dato con dos nombres.
  const declaracionInfo =
    semanasReferenciaDeclaradas !== null
      ? {
          cantidad: Number.isFinite(semanasReferenciaDeclaradas.cantidad) ? semanasReferenciaDeclaradas.cantidad : null,
          certeza: semanasReferenciaDeclaradas.certeza ?? null,
          valida: resolucionSemanas.declaradas !== null,
        }
      : null
  const historiaEstructuradaInfo = {
    cantidad: resolucionSemanas.observadas,
    tienePeriodos: historiaCotizacion.length > 0,
  }
  // Diferencia absoluta entre lo declarado y lo que la historia estructurada por sí sola
  // sustenta — sin ningún umbral de advertencia (decisión explícita: esa decisión de
  // producto queda para una entrega posterior, no se inventa aquí).
  const diferenciaDeclaracionVsHistoria =
    declaracionInfo !== null && Number.isFinite(declaracionInfo.cantidad)
      ? Math.abs(declaracionInfo.cantidad - historiaEstructuradaInfo.cantidad)
      : null
  const razonPrecedencia =
    procedenciaSemanasActuales === 'declaracion_agregada'
      ? 'Se usó la declaración agregada: tiene precedencia total sobre la historia estructurada (contrato GO-B) porque el usuario la proporcionó con certeza "conocido" o "aproximado".'
      : procedenciaSemanasActuales === 'historia_estructurada'
        ? 'Se usó la historia estructurada porque no existe una declaración agregada válida.'
        : 'No hay declaración agregada válida ni historia estructurada — no existe evidencia de semanas actuales.'

  const semanasActuales = {
    valueId: VALUE_IDS_ELEGIBILIDAD_RPM.SEMANAS_ACTUALES,
    cantidad: semanasActualesCantidad,
    procedencia: procedenciaSemanasActuales,
    certeza:
      procedenciaSemanasActuales === 'declaracion_agregada'
        ? resolucionSemanas.certeza
        : procedenciaSemanasActuales === 'historia_estructurada'
          ? 'verificado'
          : null,
    declaracion: declaracionInfo,
    historiaEstructurada: historiaEstructuradaInfo,
    diferenciaDeclaracionVsHistoria,
    razonPrecedencia,
  }

  const semanasFuturasHastaFechaObjetivo = resolucionSemanas.futuras
  const semanasTotalesEnFechaObjetivo = resolucionSemanas.total

  const semanasMinimasResuelta = obtenerSemanasMinimas(fechaObjetivoSolicitada, sexoResuelto, 'RPM')
  const semanasMinimasAplicables = {
    valueId: VALUE_IDS_ELEGIBILIDAD_RPM.SEMANAS_MINIMAS_APLICABLES,
    valor: semanasMinimasResuelta.valor,
    normaId: semanasMinimasResuelta.id,
    fechaAplicacion: fechaObjetivoSolicitada,
    estado: semanasMinimasResuelta.estado,
    listoParaProduccion: semanasMinimasResuelta.listoParaProduccion,
  }

  // --- fechaCumpleEdad / fechaCompletaSemanas / fechaReconocimientoConjunta (punto 1) ---
  // Búsqueda determinista, apoyada en la propiedad monótona documentada al inicio de este
  // archivo — nunca un blanco fijo. El horizonte de búsqueda está acotado por
  // EDAD_MAXIMA_FUNCIONAL (mismo límite ya reutilizado arriba, sin una segunda constante).
  const fechaLimiteHorizonteFuncional = calcularFechaPorEdad(fechaNacimiento, EDAD_MAXIMA_FUNCIONAL)
  const fechaLimiteBusqueda = fechaLimiteHorizonteFuncional > fecha ? fechaLimiteHorizonteFuncional : fecha

  const monotoniaEdadOk = umbralNuncaAumenta({
    fechaInicio: fecha,
    fechaLimite: fechaLimiteBusqueda,
    resolverUmbral: (t) => obtenerEdadPension(t, sexoResuelto).valor,
  })
  const fechaCumpleEdad = monotoniaEdadOk
    ? primeraFechaVerdadera({
        fechaInicio: fecha,
        fechaLimite: fechaLimiteBusqueda,
        predicado: (t) => calcularEdadCumplida(fechaNacimiento, t) >= obtenerEdadPension(t, sexoResuelto).valor,
      })
    : null

  const monotoniaSemanasOk = umbralNuncaAumenta({
    fechaInicio: fecha,
    fechaLimite: fechaLimiteBusqueda,
    resolverUmbral: (t) => obtenerSemanasMinimas(t, sexoResuelto, 'RPM').valor,
  })
  // semanasAcumuladasEn(t): mismas semanas actuales ya resueltas arriba (nunca un segundo
  // cálculo con otra fórmula) + semanas futuras hasta t bajo el mismo supuesto de
  // continuidad — 0 futuras para t <= fecha (hoy), por construcción.
  function semanasAcumuladasEn(t) {
    if (t <= fecha) return semanasActuales.cantidad
    return semanasActuales.cantidad + diasCalendarioEnRango(diaSiguiente(fecha), t) / 7
  }
  const fechaCompletaSemanas = monotoniaSemanasOk
    ? primeraFechaVerdadera({
        fechaInicio: fecha,
        fechaLimite: fechaLimiteBusqueda,
        predicado: (t) => semanasAcumuladasEn(t) >= obtenerSemanasMinimas(t, sexoResuelto, 'RPM').valor,
      })
    : null

  // fechaReconocimientoConjunta = max(fechaCumpleEdad, fechaCompletaSemanas) — válido
  // porque ambos predicados son monótonos no decrecientes (demostrado arriba): la primera
  // fecha en que AMBOS son true es, necesariamente, la más tardía de las dos primeras
  // fechas individuales. Nunca se ejecuta una tercera búsqueda para lo mismo.
  const fechaReconocimientoConjunta =
    fechaCumpleEdad !== null && fechaCompletaSemanas !== null
      ? fechaCumpleEdad > fechaCompletaSemanas
        ? fechaCumpleEdad
        : fechaCompletaSemanas
      : null

  // Punto 1: distinción explícita de si la fecha conjunta cae dentro (<=) o después de la
  // fecha objetivo solicitada — puramente informativa, nunca cambia `estado` (ver abajo).
  const fechaConjuntaDentroDelObjetivo =
    fechaReconocimientoConjunta !== null ? fechaReconocimientoConjunta <= fechaObjetivoSolicitada : null

  // --- Estado ---
  // Evaluado SIEMPRE en fechaObjetivoSolicitada — nunca se prolonga silenciosamente hasta
  // fechaReconocimientoConjunta aunque esta caiga después, y nunca depende de si la
  // búsqueda monótona de arriba tuvo éxito (esa búsqueda es un campo informativo aparte).
  const semanasSuficientes = semanasTotalesEnFechaObjetivo >= semanasMinimasAplicables.valor
  const semanasInsuficientesConEvidencia = procedenciaSemanasActuales !== 'sin_evidencia' && !semanasSuficientes
  const semanasAmbiguas = procedenciaSemanasActuales === 'sin_evidencia' && !semanasSuficientes

  const razones = []
  let estado

  if (!edadSuficiente && semanasInsuficientesConEvidencia) {
    estado = ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_NINGUNO
    razones.push({
      codigo: 'EDAD_INSUFICIENTE',
      mensaje: `A los ${edadJubilacionDeseada} años no cumplirías el requisito legal de edad para RPM (${edadMinimaAplicable.valor} años) — te faltarían ${edadMinimaAplicable.valor - edadJubilacionDeseada} años.`,
      detalle: { edadMinima: edadMinimaAplicable.valor, edadElegida: edadJubilacionDeseada, aniosFaltantes: edadMinimaAplicable.valor - edadJubilacionDeseada },
    })
    razones.push({
      codigo: 'SEMANAS_INSUFICIENTES',
      mensaje: `En la fecha que elegiste explorar proyectamos ${semanasTotalesEnFechaObjetivo.toFixed(1)} semanas; el requisito legal aplicable es ${semanasMinimasAplicables.valor}.`,
      detalle: { semanasMinimas: semanasMinimasAplicables.valor, semanasProyectadas: semanasTotalesEnFechaObjetivo, semanasFaltantes: semanasMinimasAplicables.valor - semanasTotalesEnFechaObjetivo },
    })
  } else if (!edadSuficiente) {
    estado = ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_EDAD
    razones.push({
      codigo: 'EDAD_INSUFICIENTE',
      mensaje: `A los ${edadJubilacionDeseada} años no cumplirías el requisito legal de edad para RPM (${edadMinimaAplicable.valor} años) — te faltarían ${edadMinimaAplicable.valor - edadJubilacionDeseada} años.`,
      detalle: { edadMinima: edadMinimaAplicable.valor, edadElegida: edadJubilacionDeseada, aniosFaltantes: edadMinimaAplicable.valor - edadJubilacionDeseada },
    })
  } else if (semanasInsuficientesConEvidencia) {
    estado = ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_SEMANAS
    razones.push({
      codigo: 'SEMANAS_INSUFICIENTES',
      mensaje: `En la fecha que elegiste explorar proyectamos ${semanasTotalesEnFechaObjetivo.toFixed(1)} semanas. El requisito legal aplicable es ${semanasMinimasAplicables.valor}; faltarían ${(semanasMinimasAplicables.valor - semanasTotalesEnFechaObjetivo).toFixed(1)} semanas.`,
      detalle: { semanasMinimas: semanasMinimasAplicables.valor, semanasProyectadas: semanasTotalesEnFechaObjetivo, semanasFaltantes: semanasMinimasAplicables.valor - semanasTotalesEnFechaObjetivo },
    })
  } else if (semanasAmbiguas) {
    estado = ESTADOS_ELEGIBILIDAD_RPM.NO_EVALUABLE
    razones.push({
      codigo: 'SEMANAS_ACTUALES_SIN_EVIDENCIA',
      mensaje:
        'Todavía no registraste ninguna historia de cotización ni declaraste tus semanas actuales — con esa ' +
        'información no podemos confirmar si cumplirías el requisito de semanas en la fecha que elegiste explorar.',
      detalle: { semanasMinimas: semanasMinimasAplicables.valor, semanasProyectadasComoLimiteInferior: semanasTotalesEnFechaObjetivo },
    })
  } else {
    // edadSuficiente === true, y ni semanasInsuficientesConEvidencia ni semanasAmbiguas se
    // cumplieron arriba — solo queda semanasSuficientesConEvidencia === true.
    //
    // Texto para cualquier consumidor futuro (Baldor/UI) de este estado — nunca una
    // afirmación de derecho:
    //   "Según los datos y supuestos de esta proyección, cumplirías los requisitos
    //    generales de edad y semanas."
    // Nunca "Eres elegible" ni "Tienes derecho a pensión".
    estado = ESTADOS_ELEGIBILIDAD_RPM.CUMPLE
  }

  const supuestos = [RITMO_CONTINUIDAD_SIN_INTERRUPCIONES]
  if (!monotoniaEdadOk) {
    supuestos.push({
      codigo: 'FECHA_CUMPLE_EDAD_NO_DETERMINABLE',
      mensaje: 'No pudimos determinar cuándo cumplirías la edad mínima: el umbral legal de edad varía de forma no decreciente en el horizonte explorado, y esta búsqueda no asume una propiedad que los datos no sostienen.',
    })
  }
  if (!monotoniaSemanasOk) {
    supuestos.push({
      codigo: 'FECHA_COMPLETA_SEMANAS_NO_DETERMINABLE',
      mensaje: 'No pudimos determinar cuándo completarías las semanas mínimas: el umbral legal de semanas varía de forma no decreciente en el horizonte explorado, y esta búsqueda no asume una propiedad que los datos no sostienen.',
    })
  }

  const fuentesUtilizadas = [
    { campo: 'edadMinimaAplicable', valueId: edadMinimaAplicable.valueId, normaId: edadMinimaAplicable.normaId, estado: edadMinimaAplicable.estado, listoParaProduccion: edadMinimaAplicable.listoParaProduccion },
    { campo: 'semanasMinimasAplicables', valueId: semanasMinimasAplicables.valueId, normaId: semanasMinimasAplicables.normaId, estado: semanasMinimasAplicables.estado, listoParaProduccion: semanasMinimasAplicables.listoParaProduccion },
  ]

  return {
    fechaCalculo: fecha,
    sexoResuelto,
    edadActual,
    edadMinimaAplicable,
    fechaCumpleEdad,
    semanasActuales,
    ritmoCotizacionFutura: RITMO_CONTINUIDAD_SIN_INTERRUPCIONES,
    fechaObjetivoSolicitada,
    semanasFuturasHastaFechaObjetivo,
    semanasTotalesEnFechaObjetivo,
    fechaCompletaSemanas,
    fechaReconocimientoConjunta,
    fechaConjuntaDentroDelObjetivo,
    semanasMinimasAplicables,
    estado,
    razones,
    supuestos,
    fuentesUtilizadas,
  }
}
