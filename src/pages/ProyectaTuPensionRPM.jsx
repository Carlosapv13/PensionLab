// Pantalla funcional "Proyecta tu pensión RPM" — Slice S4-003 ("Objetivo/restricción RPM
// capturables + búsqueda determinista del IBC necesario").
//
// Distinta de ExploraTuProyeccionRPM.jsx a propósito (decisión Carlos/Atlas, 2026-08-20):
// esa pantalla conserva intacto su alcance de lectura histórica ("con tu historia hasta
// hoy", nunca proyecta) — es el "Slice posterior" que su propio comentario de cabecera ya
// anticipaba. Esta pantalla sí proyecta a una fecha de reconocimiento futura, vía
// calcularProyeccionRPM.js (S4-002) + generarCaminosRPM.js (S4-003), reutilizados como
// caja negra — ninguna lógica de IBL, tasa de reemplazo ni bisección vive aquí.
//
// ibcAplicableSimulacion se recalcula aquí mismo a partir de los datos crudos ya
// existentes en App.jsx, invocando determinarBaseCotizacion.js — mismo patrón ya usado en
// ExploraTuProyeccion.jsx (RAIS) y QueDeterminaTuResultado.jsx. No se persiste el
// resultado en App.jsx.
//
// Sin "saldoAcumulado": es un concepto de RAIS (capital en cuenta individual) que no
// aplica a RPM (reparto, no capitalización individual) — omitido a propósito, no un
// olvido.
//
// El resultado nunca se llama "tu pensión" — es una proyección bajo un escenario
// (LIMITACION_NO_ES_TU_PENSION_FINAL, ya declarada por calcularProyeccionRPM.js).
//
// Precisión de producto S4-006 (2026-08-23): cuando esta pantalla se alcanza con
// objetivoPensionMensual/edadJubilacionDeseada YA confirmados (típicamente desde
// DeclaracionLibre.jsx), el formulario de esos dos campos empieza colapsado —
// mostrarFormulario se inicializa una sola vez, al montar, reutilizando el mismo
// determinarCamposFaltantesObjetivoRPM.js ya compartido con DeclaracionLibre.jsx (nunca se
// reimplementa ese criterio aquí). El resultado ya calculado (generarCaminosRPM se sigue
// ejecutando de forma síncrona en cada render, sin cambios) queda así como lo primero
// relevante que se ve, sin repetir un formulario con datos que la persona acaba de dar. La
// otra entrada real a esta pantalla (historiaCotizacionRPM → exploraTuProyeccionRPM, sin
// nada capturado todavía) sigue viendo el formulario abierto exactamente como antes, porque
// ahí determinarCamposFaltantesObjetivoRPM sí encuentra campos faltantes al montar. Un
// botón "Editar" siempre disponible cuando está colapsado permite volver a abrirlo — el
// formulario nunca se elimina, solo deja de ser lo primero que se muestra cuando no hace
// falta. restriccionCostoPensionalAdicionalMaximoMensual además se oculta como paso
// principal específicamente cuando el resultado es SEMANAS_INSUFICIENTES_PARA_
// RECONOCIMIENTO_RPM (debeOcultarRestriccion, en el archivo de helpers): el diagnóstico
// previo confirmó que ese dato no puede afectar ese resultado — sigue siendo opcional en
// cualquier otro estado, sin cambio de comportamiento ahí.
//
// Corrección de bug (revisión visual de Carlos, mismo día): determinarCamposFaltantesObjetivoRPM
// ahora exige `edadActual` para poder declarar edadJubilacionDeseada como no-faltante (ver
// requisitosDatosImprescindiblesRPM.js#edadJubilacionDeseadaEsUtilizable) — este archivo ya
// lo tenía calculado (variable `edadActual`, usada por validarEdadJubilacionDeseada desde
// antes) y ahora también se lo pasa al inicializador de `mostrarFormulario`. EDAD_MAXIMA_FUNCIONAL
// se importa desde ese mismo módulo compartido en vez de mantener una segunda constante
// local con el mismo valor — validarEdadJubilacionDeseada (más abajo) no se modifica: su
// validación (entero, > edadActual, <= EDAD_MAXIMA_FUNCIONAL) ya era correcta y esta
// corrección no la duplica, solo evita que el mismo criterio quedara ausente en
// DeclaracionLibre.jsx.
//
// S4-007 (2026-08-23) — "Entender este camino": bajo demanda, cero llamadas al cargar la
// pantalla (§7.5 del Entregable 2: "el gráfico muestra qué ocurre, la IA explica por qué
// importa" — ninguna capa asume el trabajo de otra). Alcance exclusivamente sobre
// escenarios con estado 'viable' (nunca los descartados, nunca los puntos de
// resultado.barrido — decisión de producto, ver explicarCaminos.js). Una sola solicitud
// agrupada cubre todos los escenarios viables del resultado actual — el primer clic en
// cualquiera de las tarjetas dispara esa única llamada; el resto de tarjetas se puebla con
// la misma respuesta. `identidadResultado` (edad/objetivo/restricción ya validados, los
// tres únicos valores que esta pantalla puede cambiar y que afectan el resultado) es la
// clave de caché: si cambia, la explicación ya obtenida deja de considerarse vigente
// (`explicacionVigente`, derivado en cada render — nunca se "limpia" el estado guardado,
// solo se deja de mostrar hasta que una nueva solicitud lo reemplace). Mismo guard de token
// que DeclaracionLibre.jsx para descartar una respuesta que ya quedó obsoleta. Ninguna
// cifra visible depende de esta capacidad: si la IA falla, las tarjetas ya calculadas
// siguen exactamente igual de utilizables (ver bloque de fallo, más abajo).

import { useRef, useState } from 'react'
import { determinarBaseCotizacion } from '../domain/determinarBaseCotizacion.js'
import { generarCaminosRPM } from '../domain/pensionEngine/generarCaminosRPM.js'
import { calcularEdadCumplida } from '../domain/calcularEdadCumplida.js'
import { determinarCamposFaltantesObjetivoRPM } from '../domain/determinarCamposFaltantesObjetivoRPM.js'
import { determinarOrientacionExploracion } from '../domain/determinarOrientacionExploracion.js'
import { EDAD_MAXIMA_FUNCIONAL } from '../domain/pensionEngine/requisitosDatosImprescindiblesRPM.js'
import { explicarCaminos } from '../ia/explicarCaminos.js'
import { construirTodosLosHechos } from '../ia/construirHechosEscenario.js'
import { construirTextoExplicacion } from '../ia/construirTextoExplicacion.js'
import { crearAdaptadorExplicacionViaServidor } from '../ia/adaptadores/AdaptadorExplicacionViaServidor.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import { formatearPesos } from '../format/formatearDinero.js'
import CampoMonetario from '../components/CampoMonetario.jsx'
import GraficoEsfuerzoResultado from '../components/GraficoEsfuerzoResultado.jsx'
import {
  textoEsfuerzoAdicional,
  textoIBCFuturo,
  textoDistancia,
  textoDiferenciaFrenteABase,
  textoOrientacion,
  textoHorizonte,
  calcularLimitacionesComunes,
  limitacionesEspecificas,
  debeOcultarRestriccion,
  validarEsfuerzoAdicionalMensualDeseado,
  ordenarCaminosParaPresentacion,
} from './ProyectaTuPensionRPM.helpers.js'

// Una sola instancia del adaptador de producción — mismo criterio ya usado en
// DeclaracionLibre.jsx.
const adaptadorExplicacionProduccion = crearAdaptadorExplicacionViaServidor()

const CAMINO_MAS_ALINEADO_TEXTO = 'Camino más alineado con tu objetivo y las condiciones que nos diste.'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const TEXTO_INTRO =
  'A diferencia de la lectura anterior (que usa solo tu historia hasta hoy), esta pantalla ' +
  'proyecta hacia una edad futura que elijas, combinando tu historia real con un escenario ' +
  'de ingreso futuro — nunca inventa inflación futura ni asume que la ley cambiará.'

// Mismo criterio de validación mínima que ExploraTuProyeccion.jsx (RAIS) — duplicado a
// propósito, no extraído todavía a un módulo compartido (Principio 9: sin abstracción sin
// evidencia de un tercer consumidor real).
function validarMontoNoNegativo(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero < 0) return null
  return numero
}

function validarEdadJubilacionDeseada(edadTexto, edadActual) {
  if (edadTexto === '') {
    return { edadValida: null, mensajeError: null }
  }
  const edadNumero = Number(edadTexto)
  if (!Number.isInteger(edadNumero) || edadNumero <= edadActual) {
    return { edadValida: null, mensajeError: `Ingresa una edad mayor a tu edad actual (${edadActual} años).` }
  }
  if (edadNumero > EDAD_MAXIMA_FUNCIONAL) {
    return {
      edadValida: null,
      mensajeError: `PensionLab está diseñado actualmente para explorar proyecciones hasta los ${EDAD_MAXIMA_FUNCIONAL} años.`,
    }
  }
  return { edadValida: edadNumero, mensajeError: null }
}

// Presentación pura de una explicación ya sustituida (construirTextoExplicacion.js) —
// cada campo es opcional por diseño (decisión de producto S4-007: "no es obligatorio que
// todos los elementos aparezcan siempre"). Si el modelo optó por no decir nada de valor
// sobre este camino, se comunica honestamente en vez de mostrar una tarjeta vacía.
function TextoExplicacionCamino({ texto }) {
  // Compactado (decisión de producto, 2026-08-24): solo queCambia (sostenibilidad en el
  // tiempo — el único hecho que la tarjeta no dice ya) y preguntaSugerida (activa la
  // decisión). queRepresenta/porQueAlcanzaONo se retiraron porque duplicaban, con más
  // palabras, cifras que la tarjeta ya muestra (esfuerzo/IBC/pensión/distancia) — ese rol de
  // "qué resultado da cada camino frente al objetivo" ahora lo cumple la comparación
  // conjunta, no cada tarjeta aislada.
  if (texto.queCambia === null && texto.preguntaSugerida === null) {
    return <p className="camino-celda__nota">No encontramos algo adicional que agregar sobre este camino.</p>
  }

  return (
    <div className="camino-celda__explicacion">
      {texto.queCambia && <p className="camino-celda__nota">{texto.queCambia}</p>}
      {texto.preguntaSugerida && <p className="camino-celda__nota camino-celda__nota--pregunta">{texto.preguntaSugerida}</p>}
    </div>
  )
}

/**
 * @param {Object} props
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} props.historiaCotizacion
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {('Mujer'|'Hombre'|null)} props.sexo - indispensable para resolver los requisitos
 *   legales de edad y semanas mínimas (auditoría 2026-08-21)
 * @param {string} props.fechaNacimiento
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.certezaBaseCotizacion
 * @param {string} props.valorBaseCotizacionDeclarado
 * @param {('empleado'|'independiente'|'ambos'|null)} props.tipoCotizante
 * @param {('colombia'|'exterior'|'ambos'|null)} props.lugarCotizacion
 * @param {string} props.salarioParaEstimarBase
 * @param {string} props.edadJubilacionDeseada
 * @param {(valor: string) => void} props.onCambiarEdadJubilacionDeseada
 * @param {string} props.objetivoPensionMensual
 * @param {(valor: string) => void} props.onCambiarObjetivoPensionMensual
 * @param {string} props.restriccionCostoPensionalAdicionalMaximoMensual
 * @param {(valor: string) => void} props.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
 * @param {() => void} props.onVolver
 * @param {{tipo: 'contenido', texto: string} | {tipo: 'ausencia'} | null} [props.declaracionLibre] -
 *   contexto lingüístico opcional de S4-006, usado únicamente para que "Entender este
 *   camino" pueda conectar la explicación con lo que la persona originalmente quería
 *   resolver — nunca reinterpretado como dato nuevo.
 * @param {import('../ia/adaptadores/AdaptadorExplicacionIA.js').AdaptadorExplicacionIA} [props.adaptadorExplicacion] -
 *   inyectable para pruebas manuales/dev; por defecto, el adaptador de producción.
 */
function ProyectaTuPensionRPM({
  historiaCotizacion,
  regimenActual,
  sexo,
  fechaNacimiento,
  certezaBaseCotizacion,
  valorBaseCotizacionDeclarado,
  tipoCotizante,
  lugarCotizacion,
  salarioParaEstimarBase,
  edadJubilacionDeseada,
  onCambiarEdadJubilacionDeseada,
  objetivoPensionMensual,
  onCambiarObjetivoPensionMensual,
  restriccionCostoPensionalAdicionalMaximoMensual,
  onCambiarRestriccionCostoPensionalAdicionalMaximoMensual,
  onVolver,
  declaracionLibre = null,
  adaptadorExplicacion = adaptadorExplicacionProduccion,
}) {
  const fecha = hoyISO()
  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)

  const { edadValida, mensajeError } = validarEdadJubilacionDeseada(edadJubilacionDeseada, edadActual)

  const baseCotizacion = determinarBaseCotizacion({
    certeza: certezaBaseCotizacion,
    valorDeclarado: valorBaseCotizacionDeclarado,
    tipoCotizante,
    lugarCotizacion,
    salarioParaEstimar: salarioParaEstimarBase,
    fecha,
  })

  const objetivoValorMensual = validarMontoNoNegativo(objetivoPensionMensual)
  const restriccionCostoPensional = validarMontoNoNegativo(restriccionCostoPensionalAdicionalMaximoMensual)

  // Se evalúa una sola vez, al montar (lazy initializer de useState — React nunca vuelve a
  // invocar esta función en renders posteriores): si en ese momento ya no falta ningún dato
  // imprescindible, el formulario arranca colapsado. Reutiliza el mismo criterio compartido
  // con DeclaracionLibre.jsx (requisitosDatosImprescindiblesRPM.js, vía
  // determinarCamposFaltantesObjetivoRPM.js) — nunca un criterio nuevo o duplicado.
  const [mostrarFormulario, setMostrarFormulario] = useState(() => {
    const { camposFaltantes } = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: { objetivoPensionMensual: objetivoValorMensual, edadJubilacionDeseada: edadValida },
      borradorInterpretado: { objetivoPensionMensual: null, edadJubilacionDeseada: null },
      edadActual,
    })
    return camposFaltantes.length > 0
  })

  // Camino personalizado (decisión de producto 2026-08-23) — estado LOCAL de esta pantalla,
  // deliberadamente NUNCA persistido en App.jsx/el expediente (diagnóstico previo: es una
  // exploración momentánea, no un hecho declarado que otra pantalla necesite reutilizar).
  // Borrador vs. confirmado, a propósito: el borrador cambia con cada tecla (vía
  // useCampoMonetario, más abajo) pero NUNCA alimenta generarCaminosRPM directamente — solo
  // "esfuerzoAdicionalMensualDeseadoConfirmado" lo hace, y solo cambia cuando la persona
  // pulsa "Explorar este esfuerzo". Así, escribir en el campo nunca dispara un recálculo.
  const [mostrarExploracionEsfuerzo, setMostrarExploracionEsfuerzo] = useState(false)
  const [esfuerzoAdicionalMensualDeseadoBorrador, setEsfuerzoAdicionalMensualDeseadoBorrador] = useState('')
  const [esfuerzoAdicionalMensualDeseadoConfirmado, setEsfuerzoAdicionalMensualDeseadoConfirmado] = useState('')
  // Mismo parseo ya usado para objetivo/restricción (validarMontoNoNegativo) — sin una
  // función de conversión nueva. Nunca puede quedar en 0 en la práctica (la validación de
  // confirmación, abajo, ya lo impide), pero se reutiliza el mismo helper por consistencia.
  const esfuerzoAdicionalMensualDeseadoParsed = validarMontoNoNegativo(esfuerzoAdicionalMensualDeseadoConfirmado)

  const resultado =
    edadValida !== null && baseCotizacion.ibcAplicableSimulacion !== null
      ? generarCaminosRPM({
          regimenActual,
          sexo,
          historiaCotizacion,
          fechaNacimiento,
          edadJubilacionDeseada: edadValida,
          ibcAplicableSimulacion: baseCotizacion.ibcAplicableSimulacion,
          objetivoValorMensual,
          restriccionCostoPensionalAdicionalMaximoMensual: restriccionCostoPensional,
          esfuerzoAdicionalMensualDeseado: esfuerzoAdicionalMensualDeseadoParsed,
          fecha,
        })
      : null

  // S4-004: separa, una sola vez, las limitaciones presentes en TODOS los caminos viables
  // (comunes — se muestran una vez, debajo de la comparación) de las que solo aparecen en
  // algunos (específicas — se quedan junto a su camino). Mismo patrón ya usado por
  // ExploraTuProyeccion.jsx (RAIS). Los datos en sí no cambian, solo dónde se renderizan.
  const escenariosViables = resultado ? resultado.escenarios.filter((e) => e.estado === 'viable') : []
  const limitacionesComunes = calcularLimitacionesComunes(escenariosViables)

  // "Qué podrías explorar ahora" (decisión de producto, 2026-08-24) — determinístico, sin
  // IA: determinarOrientacionExploracion (domain/) decide QUÉ situación existe y qué
  // acciones tienen sentido; textoOrientacion (helpers, arriba) decide CÓMO se dice. Ninguna
  // cifra nueva aquí — las cifras ya están en las tarjetas.
  const orientacionExploracion = determinarOrientacionExploracion(resultado)
  const textoOrientacionActual = orientacionExploracion ? textoOrientacion(orientacionExploracion.codigo) : null

  // S4-007 — "Entender este camino". identidadResultado es la clave de caché: los tres
  // únicos valores que esta pantalla puede cambiar y que producen un resultado distinto.
  // No incluye historiaCotizacion/ibcAplicableSimulacion/sexo porque ninguno es editable
  // en esta pantalla — cambian en otras, lo que ya implica un remount completo (App.jsx
  // desmonta/monta esta pantalla al cambiar de vista), no una actualización in-place que
  // esta caché tendría que detectar.
  // Corrección obligatoria (2026-08-23): el camino personalizado es un cuarto valor que
  // puede cambiar el resultado — sin incluirlo aquí, una explicación generada con 2
  // caminos seguiría marcándose "vigente" después de explorar un esfuerzo nuevo, mostrando
  // texto que nunca menciona el tercer camino recién aparecido.
  const identidadResultado = JSON.stringify([
    edadValida,
    objetivoValorMensual,
    restriccionCostoPensional,
    esfuerzoAdicionalMensualDeseadoParsed,
  ])
  const [estadoExplicacion, setEstadoExplicacion] = useState('inactivo') // 'inactivo' | 'cargando' | 'lista'
  const [resultadoExplicacion, setResultadoExplicacion] = useState(null)
  const [identidadResultadoExplicado, setIdentidadResultadoExplicado] = useState(null)
  const tokenExplicacion = useRef(0)

  // true solo si ya hay una respuesta Y corresponde exactamente al resultado que se ve
  // ahora mismo — un cambio de objetivo/edad/restricción posterior a la solicitud invalida
  // la explicación anterior sin necesidad de "limpiarla" activamente: simplemente deja de
  // considerarse vigente en el siguiente render.
  const explicacionVigente = resultadoExplicacion !== null && identidadResultadoExplicado === identidadResultado
  const hechosResultadoActual = construirTodosLosHechos(escenariosViables, resultado ?? {})
  const textoExplicacion =
    explicacionVigente && resultadoExplicacion.estado === 'generado'
      ? construirTextoExplicacion(resultadoExplicacion, hechosResultadoActual)
      : null

  async function manejarEntenderCaminos() {
    const identidadDeEstaSolicitud = identidadResultado
    const miToken = ++tokenExplicacion.current
    setEstadoExplicacion('cargando')

    const salida = await explicarCaminos({
      resultado,
      contexto: { declaracionLibre: declaracionLibre?.tipo === 'contenido' ? declaracionLibre.texto : null },
      adaptador: adaptadorExplicacion,
    })

    // Guard de token — mismo criterio que DeclaracionLibre.jsx: una respuesta que ya no es
    // la vigente (el objetivo/edad/restricción cambiaron mientras estaba en vuelo) se
    // descarta por completo, nunca pisa un estado más reciente.
    if (tokenExplicacion.current !== miToken) return

    setResultadoExplicacion(salida)
    setIdentidadResultadoExplicado(identidadDeEstaSolicitud)
    setEstadoExplicacion('lista')
  }

  const campoObjetivo = useCampoMonetario(objetivoPensionMensual, onCambiarObjetivoPensionMensual)
  const campoRestriccion = useCampoMonetario(
    restriccionCostoPensionalAdicionalMaximoMensual,
    onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
  )
  const campoEsfuerzoExploracion = useCampoMonetario(
    esfuerzoAdicionalMensualDeseadoBorrador,
    setEsfuerzoAdicionalMensualDeseadoBorrador
  )

  const { valorValido: esfuerzoBorradorValido, mensajeError: mensajeErrorEsfuerzo } =
    validarEsfuerzoAdicionalMensualDeseado(esfuerzoAdicionalMensualDeseadoBorrador)

  function manejarConfirmarEsfuerzo() {
    if (esfuerzoBorradorValido === null) return // defensivo: el botón ya está disabled en este caso
    setEsfuerzoAdicionalMensualDeseadoConfirmado(esfuerzoAdicionalMensualDeseadoBorrador)
    setMostrarExploracionEsfuerzo(false)
  }

  // Abrir siempre resincroniza el borrador desde el último valor confirmado (nunca desde lo
  // que quedó escrito la vez anterior) — corrección UX 2026-08-24: sin esto, un borrador
  // escrito y luego cancelado (o editado y cancelado) reaparecía la próxima vez que se abría
  // el panel, aunque nunca se hubiera confirmado. Cubre los dos casos con la misma línea:
  // sin confirmación previa, esfuerzoAdicionalMensualDeseadoConfirmado es '' → el campo abre
  // vacío; con una confirmación previa, abre mostrando exactamente ese valor. Cancelar no
  // necesita tocar el borrador: al cerrar el panel el campo se desmonta, y la próxima
  // apertura ya lo resincroniza aquí — un solo punto de verdad, sin estado nuevo.
  function manejarAbrirExploracionEsfuerzo() {
    setEsfuerzoAdicionalMensualDeseadoBorrador(esfuerzoAdicionalMensualDeseadoConfirmado)
    setMostrarExploracionEsfuerzo(true)
  }

  // Enter confirma exactamente igual que el botón "Explorar este esfuerzo" — mismo criterio
  // de validez (esfuerzoBorradorValido, derivado de validarEsfuerzoAdicionalMensualDeseado),
  // nunca uno paralelo. No se anida un <form> (este campo ya vive dentro de <form
  // className="screen">, y el HTML no permite formularios anidados): en vez de eso, se
  // intercepta Enter solo en este campo, sin tocar useCampoMonetario.js (hook compartido con
  // objetivo/restricción) ni su comportamiento en ningún otro campo.
  // Corrección UX (2026-08-24): con valor inválido, NUNCA se quita el foco — a diferencia
  // del Enter genérico de useCampoMonetario.js (que sí hace blur), aquí perder el foco
  // obligaría a un clic adicional para corregir, justo la fricción que este panel busca
  // eliminar. Solo se bloquea la confirmación (preventDefault evita además cualquier envío
  // nativo del <form> exterior) — el mensaje de validación ya visible y el campo enfocado
  // bastan para corregir de inmediato con teclado.
  function manejarTeclaEsfuerzo(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (esfuerzoBorradorValido === null) return
    manejarConfirmarEsfuerzo()
  }

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--proyecta-tu-pension-rpm">Proyecta tu pensión</h1>

      <p className="screen__subtitle screen__subtitle--secundario">{TEXTO_INTRO}</p>

      {mostrarFormulario ? (
        <>
          <p className="screen__subtitle">¿Hasta qué edad te gustaría explorar tu proyección?</p>
          <p className="screen__subtitle screen__subtitle--secundario">
            PensionLab verifica que, a esa edad, cumplas los requisitos legales de reconocimiento RPM (edad y
            semanas mínimas) — si no los cumples, te lo explicamos en vez de mostrarte una cifra de pensión.
          </p>

          <label className="field">
            <span className="field__label">Edad</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="field__input"
              value={edadJubilacionDeseada}
              onChange={(e) => onCambiarEdadJubilacionDeseada(e.target.value.replace(/\D/g, ''))}
            />
          </label>

          {mensajeError && <p className="screen__subtitle">{mensajeError}</p>}
        </>
      ) : (
        <>
          {edadValida !== null && (
            <p className="screen__subtitle screen__subtitle--secundario">
              Explorando hasta los {edadValida} años
              {objetivoValorMensual !== null ? `, con tu objetivo de ${formatearPesos(objetivoValorMensual)} al mes.` : '.'}
            </p>
          )}
          <div className="screen__actions">
            <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormulario(true)}>
              Editar tu objetivo o la edad que quieres explorar
            </button>
          </div>
        </>
      )}

      {edadValida !== null && baseCotizacion.ibcAplicableSimulacion === null && (
        <p className="screen__subtitle">
          {baseCotizacion.razonNoApto === 'valor_bajo_piso_legal'
            ? 'El valor que registraste como base de cotización está por debajo del salario mínimo legal, así ' +
              'que no podemos construir caminos con él. Vuelve atrás y revísalo.'
            : 'Todavía no tenemos tu base de cotización lista para poder construir caminos.'}
        </p>
      )}

      {mostrarFormulario && edadValida !== null && baseCotizacion.ibcAplicableSimulacion !== null && (
        <label className="field">
          <span className="field__label">¿Con cuánto te gustaría pensionarte, al menos, cada mes?</span>
          <p className="option__hint">
            En pesos de hoy — el poder de compra que tiene ese dinero actualmente, no el número que verías
            nominalmente en el futuro.
          </p>
          <CampoMonetario {...campoObjetivo} />
        </label>
      )}

      {mostrarFormulario &&
        edadValida !== null &&
        baseCotizacion.ibcAplicableSimulacion !== null &&
        !debeOcultarRestriccion(resultado) && (
          <label className="field">
            <span className="field__label">
              ¿Cuánto más podrías destinar exclusivamente a tu aporte a pensión cada mes? (opcional)
            </span>
            <p className="option__hint">
              Este límite considera solo el aporte pensional. Otros aportes obligatorios podrían aumentar también
              — esta primera versión todavía no los calcula.
            </p>
            <CampoMonetario {...campoRestriccion} />
          </label>
        )}

      {resultado && resultado.escenarios.length === 0 && resultado.detalleElegibilidad && (
        <div className="insight">
          <p className="insight__label">A esa edad no cumplirías los requisitos legales de reconocimiento RPM</p>
          <p className="insight__message">{resultado.orientacion.razon}</p>
        </div>
      )}

      {resultado && resultado.escenarios.length === 0 && !resultado.detalleElegibilidad && (
        <p className="screen__subtitle">{resultado.orientacion.razon}</p>
      )}

      {resultado && resultado.escenarios.length > 0 && (
        <>
          <p className="screen__subtitle screen__subtitle--secundario">
            Cada cifra es una <strong>proyección bajo un escenario</strong>, no tu pensión definitiva — depende de
            que sigas cotizando como se asumió aquí, de que la ley no cambie antes de tu jubilación, y del
            escenario de ingreso futuro evaluado.
          </p>

          {resultado.horizonte && (
            <div className="horizonte-proyeccion">
              <p className="horizonte-proyeccion__titulo">Horizonte de esta proyección</p>
              <p className="horizonte-proyeccion__resumen">{textoHorizonte(resultado.horizonte, edadValida)}</p>
              <p className="horizonte-proyeccion__nota">
                Los caminos comparados suponen mantener el IBC indicado durante este período.
              </p>
            </div>
          )}

          <p className="comparacion-caminos__contexto">
            Objetivo: {formatearPesos(objetivoValorMensual)} al mes, en pesos de hoy.
          </p>

          <div
            className="comparacion-caminos"
            style={{ '--comparacion-caminos-columnas': resultado.escenarios.length }}
          >
            {ordenarCaminosParaPresentacion(resultado.escenarios).map((escenario, index) => {
              // objetivoLegalmenteInalcanzable (decisión de producto, 2026-08-24): cuando el
              // objetivo es legal/estructuralmente inalcanzable (ni en el tope), la cercanía
              // matemática de caminoMasAlineadoId deja de convertirse en distinción visual —
              // el dato sigue existiendo en resultado.orientacion, solo no se pinta aquí.
              const esMasAlineado =
                resultado.orientacion.caminoMasAlineadoId === escenario.id &&
                !resultado.orientacion.objetivoLegalmenteInalcanzable
              const notasEspecificas = limitacionesEspecificas(escenario, limitacionesComunes)
              const textoDiferencia = textoDiferenciaFrenteABase(escenario.diferenciaFrenteABase)

              return (
                <div
                  className={`camino-columna${esMasAlineado ? ' camino-columna--alineado' : ''}`}
                  style={{ '--col': index + 1 }}
                  key={escenario.id}
                >
                  <div className="camino-celda camino-celda--encabezado">
                    <p className="camino-celda__valor camino-celda__valor--titulo">{escenario.decision}</p>
                    {esMasAlineado && <p className="camino-celda__nota">{CAMINO_MAS_ALINEADO_TEXTO}</p>}
                  </div>

                  {escenario.estado === 'descartado' ? (
                    <p className="camino-celda camino-celda--descartado">{escenario.razonDescartado.mensaje}</p>
                  ) : (
                    <>
                      <div className="camino-celda camino-celda--esfuerzo">
                        <span className="camino-celda__etiqueta">Aporte pensional adicional mensual</span>
                        <span className="camino-celda__valor camino-celda__valor--enfasis">
                          {textoEsfuerzoAdicional(escenario)}
                        </span>
                      </div>
                      <div className="camino-celda camino-celda--proyeccion">
                        <span className="camino-celda__etiqueta">Pensión proyectada mensual (pesos de hoy)</span>
                        <span className="camino-celda__valor camino-celda__valor--enfasis">
                          {formatearPesos(escenario.resultado.valor)}
                        </span>
                        {textoDiferencia && (
                          <span className="camino-celda__valor camino-celda__valor--secundario">{textoDiferencia}</span>
                        )}
                      </div>
                      <div className="camino-celda camino-celda--objetivo">
                        <span className="camino-celda__etiqueta">Frente a tu objetivo</span>
                        <span
                          className={`camino-celda__valor${escenario.distanciaObjetivo.cumple ? ' camino-celda__valor--cumple' : ''}`}
                        >
                          {textoDistancia(escenario)}
                        </span>
                      </div>
                      <div className="camino-celda camino-celda--base">
                        <span className="camino-celda__etiqueta">IBC futuro del escenario</span>
                        <span className="camino-celda__valor">{textoIBCFuturo(escenario)}</span>
                      </div>
                      {notasEspecificas.length > 0 && (
                        <div className="camino-celda camino-celda--notas">
                          {notasEspecificas.map((l) => (
                            <p className="camino-celda__nota" key={l.codigo}>
                              {l.mensaje}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* S4-007: bajo demanda, nunca automático — las cifras de arriba ya
                          son completamente utilizables sin esto (criterio de aceptación
                          explícito). No se abre modal ni otra pantalla: se expande dentro
                          de esta misma tarjeta. */}
                      <div className="camino-celda camino-celda--explicacion">
                        {!explicacionVigente && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={manejarEntenderCaminos}
                            disabled={estadoExplicacion === 'cargando'}
                          >
                            {estadoExplicacion === 'cargando' ? 'Generando explicación…' : 'Entender este camino'}
                          </button>
                        )}

                        {explicacionVigente && resultadoExplicacion.estado === 'generado' && (
                          <TextoExplicacionCamino texto={textoExplicacion.porEscenario[escenario.id]} />
                        )}

                        {explicacionVigente && resultadoExplicacion.estado === 'error_proveedor' && (
                          <div className="camino-celda__explicacion-fallo">
                            <p className="camino-celda__nota">No pudimos generar la explicación en este momento.</p>
                            <button type="button" className="btn btn-secondary" onClick={manejarEntenderCaminos}>
                              Reintentar
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {explicacionVigente && resultadoExplicacion.estado === 'generado' && textoExplicacion.comparacion && (
            <div className="insight">
              <p className="insight__label">Comparando tus caminos</p>
              <p className="insight__message">{textoExplicacion.comparacion}</p>
            </div>
          )}

          {/* "Qué podrías explorar ahora" — determinístico, siempre visible cuando aplica,
              nunca depende de la IA. Distinto de "Camino más alineado" (cercanía matemática,
              por tarjeta), "Comparando tus caminos" (IA, bajo demanda) y "Entender este
              camino" (IA, por tarjeta) — es la conclusión práctica después de ver los caminos
              y, si existe, la comparación (decisión de producto, 2026-08-24). Colocado
              deliberadamente justo antes de .exploracion-esfuerzo: EXPLORAR_ESFUERZO_PERSONALIZADO
              nunca renderiza su propio botón aquí porque ese control original, inmediatamente
              debajo, ya resuelve la misma acción con el mismo handler — un solo control
              visible, nunca dos para lo mismo. AJUSTAR_DATOS_BASE sí conserva su botón: no
              existe ningún control equivalente cerca de esta zona de la pantalla. */}
          {orientacionExploracion && textoOrientacionActual && (
            <div className="orientacion-exploracion">
              <p className="orientacion-exploracion__titulo">Qué podrías explorar ahora</p>
              <p className="orientacion-exploracion__mensaje">{textoOrientacionActual}</p>
              {orientacionExploracion.acciones.some((accion) => accion.codigo === 'AJUSTAR_DATOS_BASE') && (
                <div className="orientacion-exploracion__acciones">
                  <button type="button" className="btn btn-secondary" onClick={() => setMostrarFormulario(true)}>
                    Editar tu objetivo o la edad que quieres explorar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Suprimido cuando el objetivo es legal/estructuralmente inalcanzable (decisión de
              producto, 2026-08-24): ningún esfuerzo personalizado dentro del tope legal puede
              resolverlo, así que invitar a explorarlo justo debajo de ese mensaje sería
              incoherente. Acotado deliberadamente a este único código — RESTRICCION_COSTO_IMPIDE_OBJETIVO
              conserva el control, porque el personalizado ignora la restricción declarada y
              sigue siendo una exploración válida ahí. */}
          {orientacionExploracion?.codigo !== 'OBJETIVO_LEGALMENTE_INALCANZABLE' && (
            <div className="exploracion-esfuerzo">
              {!mostrarExploracionEsfuerzo && (
                <button type="button" className="btn btn-secondary" onClick={manejarAbrirExploracionEsfuerzo}>
                  {esfuerzoAdicionalMensualDeseadoConfirmado
                    ? 'Editar el esfuerzo que quieres explorar'
                    : 'Explorar otro esfuerzo mensual'}
                </button>
              )}

              {mostrarExploracionEsfuerzo && (
                <div className="exploracion-esfuerzo__panel">
                  <label className="field">
                    <span className="field__label">¿Cuánto más podrías destinar cada mes a tu pensión?</span>
                    {/* autoFocus nativo, no un ref/hook nuevo: CampoMonetario ya reenvía cualquier
                        prop extra tal cual al <input> (ver CampoMonetario.jsx). Cubre igual el caso
                        "Explorar otro esfuerzo mensual" (campo vacío) y "Editar el esfuerzo..." (campo
                        con valor ya confirmado) porque este bloque solo existe en el árbol mientras
                        mostrarExploracionEsfuerzo es true — cada apertura es un montaje nuevo del
                        input, así que autoFocus se dispara cada vez, no solo la primera. */}
                    <CampoMonetario {...campoEsfuerzoExploracion} autoFocus onKeyDown={manejarTeclaEsfuerzo} />
                  </label>
                  {mensajeErrorEsfuerzo && <p className="screen__subtitle">{mensajeErrorEsfuerzo}</p>}
                  <div className="exploracion-esfuerzo__acciones">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={manejarConfirmarEsfuerzo}
                      disabled={esfuerzoBorradorValido === null}
                    >
                      Explorar este esfuerzo
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setMostrarExploracionEsfuerzo(false)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <GraficoEsfuerzoResultado
            barrido={resultado.barrido}
            objetivoValorMensual={objetivoValorMensual}
            escenarioPersonalizado={resultado.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado') ?? null}
          />

          {resultado.escenarios.length > 1 && (
            <p className="comparacion-caminos__aclaracion">
              Estas diferencias comparan pensiones proyectadas entre escenarios; no representan una rentabilidad
              de tus aportes.
            </p>
          )}

          {limitacionesComunes.length > 0 && (
            <div className="comparacion-caminos__supuestos">
              <p className="screen__subtitle screen__subtitle--secundario comparacion-caminos__supuestos-titulo">
                Supuestos y limitaciones de esta proyección
              </p>
              <ul className="comparacion-caminos__supuestos-lista">
                {limitacionesComunes.map((l) => (
                  <li key={l.codigo}>{l.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.orientacion.caminoMasAlineadoId === null && (
            <p className="screen__subtitle">{resultado.orientacion.razon}</p>
          )}
        </>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
      </div>
    </form>
  )
}

export default ProyectaTuPensionRPM
