// SOLO DESARROLLO. Simulador determinista de explicación IA — hermano de
// adaptadorInterpretacionDesarrollo.js (S4-006), mismo mecanismo exacto: permite revisar
// visualmente S4-007 (Entender este camino → explicación bajo demanda) sin consumir la API
// real de OpenAI ni necesitar OPENAI_API_KEY. No es una explicación real: es una plantilla
// determinista — pero, desde la precisión de calidad de 2026-08-23, estas plantillas están
// diseñadas para DEMOSTRAR la misma calidad que se le exige al modelo real
// (AdaptadorOpenAIExplicacion.js#INSTRUCCIONES): nunca enunciar una cifra sola, y nunca
// atribuir una causa que el dominio no calculó — solo describir el resultado de cada
// escenario, usando `cumpleObjetivo` (nunca adivinado: viaja explícito desde
// explicarCaminos.js) para elegir la dirección correcta.
//
// Compactado a 2 campos por escenario (decisión de producto, 2026-08-24): queRepresenta y
// porQueAlcanzaONo se retiraron del contrato visible porque duplicaban, con más palabras,
// cifras que la tarjeta ya muestra (esfuerzo/IBC/pensión/distancia al objetivo). Solo
// quedan queCambia (sostenibilidad — el único hecho que la tarjeta no dice) y
// preguntaSugerida (activa la decisión). El rol de "qué resultado da cada camino frente al
// objetivo, comparado entre caminos" vive ahora exclusivamente en `comparacion`.
//
// Generalizado a propósito: no hay ningún texto hardcodeado para un fixture específico —
// las mismas funciones producen una explicación coherente para cualquier escenario/hechos
// reales que generarCaminosRPM.js llegue a construir, con cualquier número de escenarios
// viables (nunca una lógica especial para "exactamente dos" o "exactamente tres" ids).
//
// Nunca se importa desde ninguna pantalla fuera del árbol import.meta.env.DEV (ver
// App.jsx) — mismo mecanismo de dead-code-elimination ya usado por
// adaptadorInterpretacionDesarrollo.js.
//
// Mismo disparador "[forzar error]" ya establecido en S4-006 (dentro de declaracionLibre de
// contexto) para poder revisar visualmente el estado de fallo sin desconectar la red.

import { crearAdaptadorSimulado } from '../ia/adaptadores/AdaptadorSimulado.js'
import { resultadoError } from '../ia/adaptadores/AdaptadorExplicacionIA.js'

const DISPARADOR_ERROR = '[forzar error]'

function tieneEsfuerzoReal(propios) {
  return 'costoPensionalAdicionalMensual' in propios && propios.costoPensionalAdicionalMensual !== '$0'
}

function construirExplicacionEscenario(escenario, hechos) {
  const propios = hechos.porEscenario[escenario.id] ?? {}
  const global = hechos.global ?? {}
  const token = (clave) => `{{${escenario.id}:${clave}}}`
  const tokenGlobal = (clave) => `{{global:${clave}}}`

  const esfuerzo = tieneEsfuerzoReal(propios)
  const tieneHorizonte = 'horizonteResumen' in global
  // El camino personalizado es aquel que la propia persona eligió explorar — sugerirle
  // "explorar un punto intermedio" sobre SÍ MISMO no tendría sentido (ya lo está viendo).
  const esCaminoPersonalizado = escenario.id === 'esfuerzo-adicional-deseado'

  // queCambia: la implicación de sostenibilidad en el tiempo — el único hecho que la
  // tarjeta no muestra ya (compactado 2026-08-24: ya no describe el resultado frente al
  // objetivo, eso vive en "comparacion"). Solo tiene sentido cuando el camino SÍ exige un
  // esfuerzo distinto de la situación actual; un camino de continuidad se deja en null a
  // propósito (mejor omitir que rellenar con una repetición vacía).
  const queCambia = !esfuerzo
    ? null
    : tieneHorizonte
      ? `A diferencia de mantener tu situación actual, aquí el aporte adicional de ${token('costoPensionalAdicionalMensual')} se sostiene durante ${tokenGlobal('horizonteResumen')} — no es un pago único.`
      : `A diferencia de mantener tu situación actual, aquí destinas ${token('costoPensionalAdicionalMensual')} adicionales cada mes.`

  // preguntaSugerida: invita a reflexionar sobre sostenibilidad; si el camino no exige
  // esfuerzo pero tampoco alcanza la meta, invita a explorar cuánto esfuerzo sí bastaría —
  // salvo que ya sea, precisamente, el camino personalizado que la persona eligió.
  const preguntaSugerida =
    esfuerzo && tieneHorizonte
      ? esCaminoPersonalizado
        ? `¿Podrías sostener ${token('costoPensionalAdicionalMensual')} adicionales cada mes durante ${tokenGlobal('horizonteResumen')}?`
        : `¿Podrías sostener ${token('costoPensionalAdicionalMensual')} adicionales cada mes durante ${tokenGlobal('horizonteResumen')}, o preferirías explorar un punto intermedio?`
      : escenario.cumpleObjetivo === false
        ? 'Considerando este resultado, ¿preferirías explorar cuánto esfuerzo adicional te acercaría más a tu meta?'
        : null

  return { escenarioId: escenario.id, queCambia, preguntaSugerida }
}

// Frase de alcance de un escenario frente al objetivo, a partir de cumpleObjetivo (nunca
// adivinado — viaja explícito desde explicarCaminos.js, igual que en
// construirExplicacionEscenario). null cuando no hay señal (defensivo) — se omite en vez
// de inventar una dirección.
function fraseAlcance(cumpleObjetivo) {
  if (cumpleObjetivo === true) return ', que sí alcanza tu objetivo'
  if (cumpleObjetivo === false) return ', que no alcanza tu objetivo'
  return ''
}

// Construye el trade-off ENTRE caminos — el rol central de "comparacion" desde que
// "Entender este camino" se compactó (2026-08-24): aquí, y no en cada tarjeta individual,
// es donde se dice qué resultado da cada camino frente al objetivo. Generalizado sobre
// CUALQUIER cantidad de escenarios viables recibidos (nunca una lógica especial para dos o
// tres ids concretos): con N escenarios, si alguno no exige esfuerzo (la situación actual)
// se contrasta contra TODOS los que sí lo exigen, uno por uno — antes (defecto real,
// corregido aquí) solo tomaba `conEsfuerzo[0]`, ignorando en silencio cualquier camino
// adicional con esfuerzo.
function construirComparacion(escenarios, hechos) {
  if (escenarios.length < 2) return null

  const conEsfuerzo = escenarios.filter((e) => tieneEsfuerzoReal(hechos.porEscenario[e.id] ?? {}))
  const sinEsfuerzo = escenarios.filter((e) => !conEsfuerzo.includes(e))
  const tieneHorizonte = 'horizonteResumen' in (hechos.global ?? {})
  const duracion = tieneHorizonte ? ' durante {{global:horizonteResumen}}' : ''

  if (conEsfuerzo.length === 0) {
    return 'La diferencia entre tus caminos está en cuánto exige cada uno frente a qué tan cerca te deja de tu meta — compáralos antes de decidir.'
  }

  const opcionesEsfuerzo = conEsfuerzo
    .map((e) => `sostener {{${e.id}:costoPensionalAdicionalMensual}} cada mes${duracion}${fraseAlcance(e.cumpleObjetivo)}`)
    .join(', o bien ')

  if (sinEsfuerzo.length > 0) {
    const sujeto = conEsfuerzo.length > 1 ? 'los demás piden' : 'el otro pide'
    return (
      'La diferencia entre tus caminos es, en el fondo, una decisión entre esfuerzo y resultado: uno no exige ' +
      `ningún aporte adicional, ${sujeto} ${opcionesEsfuerzo}. Ninguno es automáticamente mejor — depende de si ` +
      'ese esfuerzo es sostenible para ti.'
    )
  }

  // Defensivo: todos los escenarios viables exigen esfuerzo (no hay "situación actual"
  // entre ellos) — el contraste es entre cuánto pide cada uno, no entre "nada" y "algo".
  return (
    `Tus caminos piden esfuerzos distintos — ${opcionesEsfuerzo}. Ninguno es automáticamente mejor — depende de ` +
    'cuánto de ese esfuerzo es sostenible para ti.'
  )
}

function generarExplicacionDesarrollo({ escenarios, hechos, contexto }) {
  if (contexto?.declaracionLibre?.includes(DISPARADOR_ERROR)) {
    return resultadoError('TIMEOUT')
  }

  return {
    explicaciones: escenarios.map((escenario) => construirExplicacionEscenario(escenario, hechos)),
    comparacion: construirComparacion(escenarios, hechos),
  }
}

export function crearAdaptadorExplicacionDesarrollo() {
  return crearAdaptadorSimulado(generarExplicacionDesarrollo)
}
