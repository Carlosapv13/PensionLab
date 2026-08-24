// Pantalla funcional de la Capacidad B, rediseñada bajo la precisión de producto S4-006
// (2026-08-23): "cada interacción debe acercar al usuario a una respuesta útil, no
// simplemente completar el expediente" + "PensionLab no debe volver a preguntar algo que
// ya sabe". Fusiona en una sola pantalla lo que antes eran dos (DeclaracionLibre.jsx →
// RevisionDeclaracionTemporal.jsx, retirada en esta ronda): declarar en lenguaje natural,
// interpretación reactiva con debounce, revisión/corrección embebida, y solo los controles
// estructurados de los datos que realmente faltan — nunca un formulario completo ya
// conocido ni un "Interpretar" → "Confirmar" → otro formulario separado.
//
// Frontera IA↔dominio (§6 del Entregable 2), sin excepciones:
// - interpretarDeclaracion() nunca escribe nada por sí solo — solo alimenta `borrador`, un
//   estado local editable de esta pantalla. Nada se escribe en el expediente compartido de
//   App.jsx antes del clic en el CTA final.
// - La IA nunca decide qué falta: eso lo decide exclusivamente
//   determinarCamposFaltantesObjetivoRPM.js (dominio puro, sin red, sin texto libre),
//   comparando el expediente ya confirmado contra `borrador`. Esta pantalla nunca duplica
//   esa lógica ni reimplementa los requisitos que generarCaminosRPM.js ya exige.
// - confirmarCamposInterpretados() —el único punto que invoca los setters compartidos de
//   App.jsx— se llama exclusivamente desde manejarUsarDatos(), nunca automáticamente al
//   recibir o fusionar una interpretación.
//
// Solo objetivoPensionMensual y edadJubilacionDeseada se piden estructuralmente cuando
// faltan — restriccionCostoPensionalAdicionalMaximoMensual sigue siendo opcional (mismo
// criterio ya usado en ProyectaTuPensionRPM.jsx): si la IA la interpretó, se muestra para
// revisión; si no, esta pantalla nunca la exige.
//
// Corrección de bug (revisión visual de Carlos, 2026-08-23): "6" (un solo dígito, mientras
// se escribía "62") bastaba antes para declarar "ya tenemos lo necesario para explorar tu
// meta" — edadJubilacionDeseadaEsValida solo valida forma (dato sintácticamente válido),
// nunca pretendió decidir si el valor ya es plausible para avanzar. Se corrigió pasando
// edadActual (resuelto aquí mismo con calcularEdadCumplida, nunca invocando el motor) a
// determinarCamposFaltantesObjetivoRPM, que ahora aplica edadJubilacionDeseadaEsUtilizable —
// mismo criterio contextual que ya usaba ProyectaTuPensionRPM.jsx, ahora compartido en
// requisitosDatosImprescindiblesRPM.js. No se duplica ninguna regla legal (edad mínima de
// pensión sigue siendo exclusiva de generarCaminosRPM.js).
//
// Semántica de edad (precisión de producto S4-006, 2026-08-23): edadJubilacionDeseada es
// una edad de exploración/proyección de escenario, nunca una promesa de la edad real de
// jubilación — mismo criterio ya establecido en ProyectaTuPensionRPM.jsx ("¿Hasta qué edad
// te gustaría explorar tu proyección?") y en el propio mensaje DATOS_INCOMPLETOS de
// generarCaminosRPM.js. El copy de esta pantalla reutiliza esa misma redacción en vez de
// una tercera variante, para no sugerir más certeza de la que el dominio modela.
//
// Concurrencia (interpretación vieja llegando después de una nueva): cada solicitud lleva
// un token incremental (tokenSolicitud); una respuesta cuyo token ya no es el vigente al
// resolver se descarta por completo — nunca pisa un borrador más reciente. Ver
// DeclaracionLibre.helpers.test.js para la evidencia de por qué este guard es obligatorio
// (fusionarBorrador, por sí sola, no sabe distinguir una respuesta vieja de una nueva).

import { useEffect, useRef, useState } from 'react'
import { interpretarDeclaracion } from '../ia/interpretarDeclaracion.js'
import { construirTextoConfirmacion } from '../ia/construirTextoConfirmacion.js'
import { crearAdaptadorViaServidor } from '../ia/adaptadores/AdaptadorViaServidor.js'
import { determinarCamposFaltantesObjetivoRPM } from '../domain/determinarCamposFaltantesObjetivoRPM.js'
import { calcularEdadCumplida } from '../domain/calcularEdadCumplida.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import CampoMonetario from '../components/CampoMonetario.jsx'
import {
  camposBorradorVacios,
  fusionarBorrador,
  confirmarCamposInterpretados,
  numeroDesdeExpediente,
} from './DeclaracionLibre.helpers.js'

// Una sola instancia del adaptador de producción — no acopla este componente a OpenAI en
// ningún momento (solo conoce el puerto AdaptadorInterpretacionIA), pero sí evita
// reconstruir el AbortController/config de fetch en cada render. Mismo criterio ya usado en
// el archivo retirado.
const adaptadorProduccion = crearAdaptadorViaServidor()

// Pausa antes de interpretar reactivamente, mientras la persona sigue escribiendo —
// convención de producto de este Slice, no una constante técnica del transporte.
const RETRASO_DEBOUNCE_MS = 800

function soloDigitos(valorTexto) {
  return valorTexto === '' ? null : Number(valorTexto.replace(/\D/g, ''))
}

// Mismo criterio de duplicación mínima ya usado en ProyectaTuPensionRPM.jsx/
// ExploraTuProyeccion.jsx (cada pantalla resuelve "hoy" por su cuenta, sin un util
// compartido para una sola línea).
function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * @param {Object} props
 * @param {{ tipo: 'contenido', texto: string } | { tipo: 'ausencia' } | null} props.declaracion
 * @param {(declaracion: { tipo: 'contenido', texto: string } | { tipo: 'ausencia' } | null) => void} props.onCambiarDeclaracion
 * @param {() => void} props.onVolver
 * @param {(valor: string) => void} props.onCambiarObjetivoPensionMensual
 * @param {(valor: string) => void} props.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
 * @param {(valor: string) => void} props.onCambiarEdadJubilacionDeseada
 * @param {string} props.objetivoPensionMensual - valor YA confirmado en el expediente (para
 *   saber qué no volver a preguntar)
 * @param {string} props.edadJubilacionDeseada - valor YA confirmado en el expediente
 * @param {string} props.fechaNacimiento - ISO, ya conocida del expediente — imprescindible
 *   para resolver edadActual y así distinguir un dígito todavía incompleto (ej. "6" mientras
 *   se escribe "62") de una edad realmente utilizable (ver
 *   requisitosDatosImprescindiblesRPM.js#edadJubilacionDeseadaEsUtilizable). No se usa para
 *   ningún otro cálculo aquí — el motor sigue sin invocarse en esta pantalla.
 * @param {(() => void) | undefined} [props.onContinuar] - avanza a la siguiente capacidad
 *   determinista solo tras confirmar; si no se provee, la pantalla se queda en su estado
 *   "confirmado" (mismo criterio de "nunca un botón visible sin destino" ya usado en
 *   ExploraTuProyeccionRPM.jsx).
 * @param {import('../ia/adaptadores/AdaptadorInterpretacionIA.js').AdaptadorInterpretacionIA} [props.adaptador] -
 *   inyectable para pruebas manuales/dev; por defecto, el adaptador de producción.
 */
function DeclaracionLibre({
  declaracion,
  onCambiarDeclaracion,
  onVolver,
  onCambiarObjetivoPensionMensual,
  onCambiarRestriccionCostoPensionalAdicionalMaximoMensual,
  onCambiarEdadJubilacionDeseada,
  objetivoPensionMensual,
  edadJubilacionDeseada,
  fechaNacimiento,
  onContinuar,
  adaptador = adaptadorProduccion,
}) {
  const texto = declaracion?.tipo === 'contenido' ? declaracion.texto : ''
  const personaYaInteractuo = declaracion?.tipo === 'contenido' || declaracion?.tipo === 'ausencia'

  const [resultado, setResultado] = useState(null)
  const [borrador, setBorrador] = useState(camposBorradorVacios())
  const [confirmado, setConfirmado] = useState(false)

  // Texto exacto de la última interpretación ya resuelta — se compara contra
  // textoDebounced para derivar `estaCargando` durante el render, en vez de guardar un
  // estado 'cargando' aparte que habría que poner y quitar con un setState síncrono dentro
  // del efecto (evitado a propósito: ver el efecto más abajo). Solo se escribe dentro del
  // callback async del efecto, nunca durante el render — leer un ref durante el render sí
  // está prohibido, por eso esto es useState y no useRef.
  const [textoUltimaInterpretacion, setTextoUltimaInterpretacion] = useState(null)
  const tokenSolicitud = useRef(0)
  const textoDebounced = useDebounce(texto, RETRASO_DEBOUNCE_MS)
  const estaCargando =
    declaracion?.tipo === 'contenido' &&
    textoDebounced.trim() !== '' &&
    textoUltimaInterpretacion !== textoDebounced

  useEffect(() => {
    if (declaracion?.tipo !== 'contenido' || confirmado) return

    const textoLimpio = textoDebounced.trim()
    // Texto vacío: nada que interpretar. manejarCambioTexto ya reseteó resultado/borrador
    // de forma síncrona (evento, no efecto) en cuanto la persona vació el campo — este
    // efecto no repite ese reseteo.
    if (textoLimpio === '') return

    const miToken = ++tokenSolicitud.current
    const textoSolicitado = textoDebounced

    interpretarDeclaracion({ declaracion: { tipo: 'contenido', texto: textoSolicitado }, adaptador }).then(
      (nuevoResultado) => {
        // Guard de token: si mientras esta solicitud estaba en vuelo llegó un texto más
        // nuevo (que ya disparó su propia solicitud), esta respuesta quedó obsoleta y se
        // descarta por completo — nunca pisa un borrador más reciente.
        if (tokenSolicitud.current !== miToken) return
        setTextoUltimaInterpretacion(textoSolicitado)
        setResultado(nuevoResultado)
        setBorrador((actual) => fusionarBorrador(actual, nuevoResultado))
      }
    )
  }, [textoDebounced, declaracion?.tipo, confirmado, adaptador])

  function manejarCambioTexto(valor) {
    if (valor.trim() === '') {
      // Vaciar el texto es, en la práctica, retirar la declaración en construcción — mismo
      // criterio que declararAusencia(): resetea el borrador y cualquier interpretación
      // mostrada, para que una interpretación vieja (de lo que había antes de borrar) nunca
      // sobreviva a un texto nuevo y no relacionado que la persona escriba después.
      tokenSolicitud.current += 1
      setTextoUltimaInterpretacion(null)
      setResultado(null)
      setBorrador(camposBorradorVacios())
      onCambiarDeclaracion(null)
    } else {
      onCambiarDeclaracion({ tipo: 'contenido', texto: valor })
    }
  }

  function declararAusencia() {
    tokenSolicitud.current += 1 // ausencia reemplaza y descarta cualquier contenido previo
    setTextoUltimaInterpretacion(null)
    setResultado(null)
    setBorrador(camposBorradorVacios())
    onCambiarDeclaracion({ tipo: 'ausencia' })
  }

  const edadActual = calcularEdadCumplida(fechaNacimiento, hoyISO())

  const expedienteConfirmado = {
    objetivoPensionMensual: numeroDesdeExpediente(objetivoPensionMensual),
    edadJubilacionDeseada: numeroDesdeExpediente(edadJubilacionDeseada),
  }
  const { camposFaltantes, listoParaAvanzar } = determinarCamposFaltantesObjetivoRPM({
    expedienteConfirmado,
    borradorInterpretado: borrador,
    edadActual,
  })
  const faltaObjetivo = camposFaltantes.includes('objetivoPensionMensual')
  const faltaEdad = camposFaltantes.includes('edadJubilacionDeseada')
  // Un valor puede estar presente (borrador.X !== null) sin ser todavía suficiente — ej.
  // "6" mientras se escribe "62": presente, pero sigue en camposFaltantes. Sin esta
  // distinción, ese mismo campo se mostraría a la vez como "ya interpretado" (editable,
  // abajo) y como "falta" (arriba) — dos controles duplicados para un único valor. Solo se
  // muestra como "interpretado" cuando además ya es suficiente; mientras no lo sea, el único
  // control visible es el de la sección de faltantes (mismo input, mismo valor tecleado).
  const objetivoEsSuficiente = borrador.objetivoPensionMensual !== null && !faltaObjetivo
  const edadEsSuficiente = borrador.edadJubilacionDeseada !== null && !faltaEdad

  const textoConfirmacion = resultado ? construirTextoConfirmacion(resultado) : null

  function actualizarBorradorCampo(campo, valor) {
    setBorrador((actual) => ({ ...actual, [campo]: valor }))
  }

  const campoObjetivo = useCampoMonetario(
    borrador.objetivoPensionMensual !== null ? String(borrador.objetivoPensionMensual) : '',
    (valor) => actualizarBorradorCampo('objetivoPensionMensual', soloDigitos(valor))
  )
  const campoRestriccion = useCampoMonetario(
    borrador.restriccionCostoPensionalAdicionalMaximoMensual !== null
      ? String(borrador.restriccionCostoPensionalAdicionalMaximoMensual)
      : '',
    (valor) => actualizarBorradorCampo('restriccionCostoPensionalAdicionalMaximoMensual', soloDigitos(valor))
  )

  function campoEdad() {
    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="field__input"
        value={borrador.edadJubilacionDeseada ?? ''}
        onChange={(e) => actualizarBorradorCampo('edadJubilacionDeseada', soloDigitos(e.target.value))}
      />
    )
  }

  function manejarUsarDatos() {
    confirmarCamposInterpretados(borrador, {
      onCambiarObjetivoPensionMensual,
      onCambiarRestriccionCostoPensionalAdicionalMaximoMensual,
      onCambiarEdadJubilacionDeseada,
    })
    setConfirmado(true)
    if (onContinuar) onContinuar()
  }

  const puedeMostrarCTA = personaYaInteractuo && listoParaAvanzar && !confirmado
  const puedeMostrarFaltantes = personaYaInteractuo && !confirmado && (faltaObjetivo || faltaEdad)

  return (
    <form className="screen" onSubmit={(e) => e.preventDefault()}>
      <h1 className="screen__title screen__title--declaracion-libre">
        ¿Hay algo sobre tu futuro pensional que te gustaría resolver?
      </h1>

      <p className="screen__subtitle">
        Cuéntanoslo con tus propias palabras — no hace falta que esté del todo definido, ni que uses
        términos técnicos. PensionLab va a intentar identificar ahí datos que ya usa en otras pantallas,
        como tu objetivo de pensión o la edad a la que te gustaría jubilarte, y solo te va a pedir lo que
        de verdad le falte.
      </p>

      <div className="field">
        <label className="visually-hidden" htmlFor="declaracion-libre-texto">
          ¿Hay algo sobre tu futuro pensional que te gustaría resolver?
        </label>
        <textarea
          id="declaracion-libre-texto"
          className="field__input field__textarea"
          value={texto}
          onChange={(e) => manejarCambioTexto(e.target.value)}
          rows={4}
          disabled={confirmado}
        />
      </div>

      <button
        type="button"
        className={'btn btn-secondary' + (declaracion?.tipo === 'ausencia' ? ' btn-secondary--activo' : '')}
        onClick={declararAusencia}
        disabled={confirmado}
      >
        No tengo nada puntual que plantear por ahora
      </button>

      {declaracion?.tipo === 'ausencia' && (
        <p className="screen__subtitle">Tomamos nota de que, por ahora, no tienes nada puntual que plantear.</p>
      )}

      {declaracion?.tipo === 'contenido' && estaCargando && (
        <p className="screen__subtitle screen__subtitle--secundario">Interpretando tu mensaje…</p>
      )}

      {textoConfirmacion && !confirmado && (
        <div className="revision-declaracion__confirmacion">
          <p className="revision-declaracion__resumen">{textoConfirmacion.resumen}</p>
          {textoConfirmacion.mensaje && <p className="screen__subtitle">{textoConfirmacion.mensaje}</p>}

          {objetivoEsSuficiente && (
            <label className="field">
              <span className="field__label">Objetivo de pensión mensual</span>
              <CampoMonetario {...campoObjetivo} />
            </label>
          )}

          {edadEsSuficiente && (
            <label className="field">
              <span className="field__label">Edad hasta la que quieres explorar</span>
              {campoEdad()}
            </label>
          )}

          {borrador.restriccionCostoPensionalAdicionalMaximoMensual !== null && (
            <label className="field">
              <span className="field__label">Límite de aporte adicional mensual</span>
              <CampoMonetario {...campoRestriccion} />
            </label>
          )}
        </div>
      )}

      {puedeMostrarFaltantes && (
        <div className="field-group">
          <p className="screen__subtitle">
            {camposFaltantes.length === 1
              ? 'Para explorar tu meta nos falta un dato:'
              : 'Para explorar tu meta nos faltan estos datos:'}
          </p>

          {faltaObjetivo && (
            <label className="field">
              <span className="field__label">¿Con cuánto te gustaría pensionarte, al menos, cada mes?</span>
              <CampoMonetario {...campoObjetivo} />
            </label>
          )}

          {faltaEdad && (
            <label className="field">
              <span className="field__label">¿Hasta qué edad te gustaría explorar tu proyección?</span>
              {campoEdad()}
            </label>
          )}
        </div>
      )}

      {puedeMostrarCTA && (
        <div className="insight">
          <p className="insight__label">Ya tenemos lo necesario para explorar tu meta.</p>
          <button type="button" className="btn btn-primary" onClick={manejarUsarDatos}>
            Usar estos datos y explorar mis opciones
          </button>
        </div>
      )}

      {confirmado && (
        <p className="screen__subtitle">
          Confirmado — los valores que aceptaste ya quedaron guardados en tu expediente, igual que si los
          hubieras escrito directamente.
        </p>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
      </div>
    </form>
  )
}

export default DeclaracionLibre
