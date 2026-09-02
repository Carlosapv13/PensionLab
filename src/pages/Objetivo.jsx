// Pantalla funcional de Objetivo: motivo de consulta (Slice S3-002 original,
// reemplazado por PL-250 Bloque 1).
//
// PL-250 Bloque 1, primera entrega vertical (2026-09-01): la pregunta de
// motivo de consulta ("¿Qué situación quieres entender?") decide si el
// recorrido de vejez continúa (CONTINUAR_FLUJO_VEJEZ), se detiene con una
// remisión específica (DETENER_Y_REMITIR — B-01, B-02, B-03, B-13 en esta
// entrega) o pide una única aclaración (ORIENTAR_ANTES_DE_CONTINUAR — "no
// estoy seguro"). Ver docs/producto/PL-250-borde-de-la-solucion-pensionlab.md
// §4-bis y §15.1.
//
// Auditoría de producto (2026-09-01): la pregunta original de esta pantalla
// ("¿en qué quieres que te ayudemos hoy?", `objetivoSeleccionado`) se agregó
// primero como un Paso 2 tras el motivo de consulta, y luego se retiró por
// completo — la auditoría de extremo a extremo encontró que ninguna de sus
// dos opciones habilitadas producía un recorrido, cálculo, texto posterior u
// orientación distintos entre sí (`DECISIÓN_APARENTE`, ver
// docs/producto/PL-250-borde-de-la-solucion-pensionlab.md §20). Se eliminó
// en vez de inventarle una consecuencia artificial. Vejez ahora avanza
// directo a `DatosIniciales`, sin un segundo paso.
//
// La lógica de decisión vive en Objetivo.helpers.js, pura y testeada sin DOM
// (mismo patrón que ProyectaTuPensionRPM.helpers.js/HistoriaCotizacionRPM.helpers.js) —
// este archivo solo la consume y renderiza.
//
// Fuera de alcance en esta entrega, a propósito (PL-250 §11, categorías B/C/D):
// régimen especial (B-04), alto riesgo (B-05), traslado discutido (B-10) y el
// mensaje propio de B-12 — no se toca ninguna otra pantalla.
//
// `pasoObjetivo` es estado puramente de UI (qué sub-vista de esta misma
// pantalla se muestra), local a este componente y no capturado en App.jsx —
// mismo criterio ya aceptado en el proyecto para estado transitorio de
// interacción (ver nota de ExploraTuProyeccionRPM.jsx sobre el borrador de
// esfuerzo personalizado). La decisión de alcance en sí (`motivoConsulta`) sí
// vive en App.jsx, como cualquier otro dato capturado, y se recalcula
// siempre con determinarSalidaMotivoConsulta — nunca se guarda como bandera
// aparte, para que corregir la selección no pueda dejar un estado de
// remisión obsoleto.

import { useEffect, useRef, useState } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import {
  MOTIVO_CONSULTA,
  OPCIONES_MOTIVO_CONSULTA,
  OPCIONES_ACLARACION_MOTIVO_CONSULTA,
  determinarSalidaMotivoConsulta,
  manejarEnvioMotivoConsulta,
  volverALasOpciones,
  MENSAJES_DETENCION_MOTIVO_CONSULTA,
  TEXTO_NO_ES_ASESORIA_JURIDICA,
} from './Objetivo.helpers.js'

/**
 * @param {Object} props
 * @param {string | null} props.motivoConsulta
 * @param {(motivo: string) => void} props.onCambiarMotivoConsulta
 * @param {() => void} props.onContinuar
 * @param {() => void} props.onVolver
 */
function Objetivo({ motivoConsulta, onCambiarMotivoConsulta, onContinuar, onVolver }) {
  // 'motivo' (única pregunta) | 'aclaracion' (única, tras "no estoy seguro") | 'detenido' (DETENER_Y_REMITIR)
  const [pasoObjetivo, setPasoObjetivo] = useState('motivo')

  const formRef = useRef(null)
  const tituloPasoRef = useRef(null)
  const esPrimerRenderRef = useRef(true)
  useRestaurarFocoAlMontar(formRef)

  // Restaura el foco al encabezado principal en CADA transición interna
  // (motivo↔aclaracion, cualquiera→detenido→motivo) —
  // useRestaurarFocoAlMontar ya cubre el montaje inicial (primer render, paso
  // 'motivo'), así que ese primer disparo de este efecto se omite a
  // propósito para no competir con él.
  useEffect(() => {
    if (esPrimerRenderRef.current) {
      esPrimerRenderRef.current = false
      return
    }
    if (tituloPasoRef.current) {
      tituloPasoRef.current.focus()
    }
  }, [pasoObjetivo])

  function manejarEnvio(e) {
    e.preventDefault()
    // Paso único ('motivo') y la aclaración ('aclaracion') comparten la
    // misma regla de decisión — la diferencia entre ambos es solo qué
    // catálogo de opciones se mostró, nunca cómo se interpreta el resultado.
    // Vejez confirmada invoca directamente la prop real onContinuar (avanza
    // a DatosIniciales en App.jsx) — ya no existe un segundo paso intermedio.
    manejarEnvioMotivoConsulta({
      motivoConsulta,
      onContinuar,
      onOrientar: () => setPasoObjetivo('aclaracion'),
      onDetener: () => setPasoObjetivo('detenido'),
    })
  }

  function volverAlMotivo() {
    // Delegado en Objetivo.helpers.js#volverALasOpciones: no limpia
    // motivoConsulta (por construcción, esa función no recibe su setter) —
    // la persona vuelve a ver exactamente lo que ya había marcado, para
    // corregirlo o confirmarlo. Usado por "Volver a las opciones" tanto en
    // la aclaración como en la detención — misma etiqueta, mismo destino.
    volverALasOpciones(setPasoObjetivo)
  }

  const puedeContinuarMotivo = Boolean(motivoConsulta)
  const puedeContinuarAclaracion = motivoConsulta !== MOTIVO_CONSULTA.NO_SEGURO

  const resultadoDetenido = determinarSalidaMotivoConsulta(motivoConsulta)
  const mensajeDetencion = resultadoDetenido.caso
    ? MENSAJES_DETENCION_MOTIVO_CONSULTA[resultadoDetenido.caso]
    : null

  return (
    <form className="screen screen--objetivo" onSubmit={manejarEnvio} ref={formRef}>
      {pasoObjetivo === 'motivo' && (
        <>
          <h1 className="screen__title screen__title--objetivo">¿Qué situación quieres entender?</h1>

          <p className="screen__subtitle">
            No te preocupes si no estás completamente seguro. Elige lo que mejor
            describa tu situación hoy; podrás cambiarlo más adelante.
          </p>

          <fieldset className="options">
            <legend className="visually-hidden">¿Qué situación quieres entender?</legend>

            {OPCIONES_MOTIVO_CONSULTA.map(({ valor, texto }) => (
              <label key={valor} className="option">
                <input
                  type="radio"
                  name="motivoConsulta"
                  value={valor}
                  checked={motivoConsulta === valor}
                  onChange={() => onCambiarMotivoConsulta(valor)}
                />
                <span className="option__label">{texto}</span>
              </label>
            ))}
          </fieldset>

          <div className="screen__actions">
            <button type="button" className="btn btn-secondary" onClick={onVolver}>
              Volver
            </button>
            <button type="submit" className="btn btn-primary" disabled={!puedeContinuarMotivo}>
              Continuar
            </button>
          </div>
        </>
      )}

      {pasoObjetivo === 'aclaracion' && (
        <>
          <h1
            className="screen__title screen__title--objetivo"
            tabIndex={-1}
            ref={tituloPasoRef}
          >
            Antes de continuar, veamos con más detalle
          </h1>

          <p className="screen__subtitle">
            Elige la descripción que más se parezca a tu situación. Si después de
            leerlas sigues sin saber cuál es, también puedes decirlo.
          </p>

          <fieldset className="options">
            <legend className="visually-hidden">¿Cuál de estas describe mejor tu situación?</legend>

            {OPCIONES_ACLARACION_MOTIVO_CONSULTA.map(({ valor, texto }) => (
              <label key={valor} className="option">
                <input
                  type="radio"
                  name="motivoConsultaAclaracion"
                  value={valor}
                  checked={motivoConsulta === valor}
                  onChange={() => onCambiarMotivoConsulta(valor)}
                />
                <span className="option__label">{texto}</span>
              </label>
            ))}
          </fieldset>

          <div className="screen__actions">
            <button type="button" className="btn btn-secondary" onClick={volverAlMotivo}>
              Volver a las opciones
            </button>
            <button type="submit" className="btn btn-primary" disabled={!puedeContinuarAclaracion}>
              Continuar
            </button>
          </div>
        </>
      )}

      {pasoObjetivo === 'detenido' && mensajeDetencion && (
        <>
          <h1
            className="screen__title screen__title--objetivo"
            tabIndex={-1}
            ref={tituloPasoRef}
          >
            <span aria-hidden="true">⚠ </span>
            {mensajeDetencion.titulo}
          </h1>

          <div className="insight" role="status">
            <p className="insight__message">{mensajeDetencion.mensaje}</p>
            <p className="insight__message">{mensajeDetencion.siguientePaso}</p>
          </div>

          <p className="option__hint">{TEXTO_NO_ES_ASESORIA_JURIDICA}</p>

          {/* Ajuste de UX (2026-09-01): una sola acción de recuperación, no dos.
              Antes coexistían aquí un "Volver" genérico (a Bienvenida, vía onVolver)
              y "Corregir mi selección" (local, vía volverAlMotivo) — misma palabra
              "Volver" que ya significa "ir a la pregunta anterior" en el resto de la
              app, generando ambigüedad real sobre cuál de los dos botones hacía qué.
              Se retiró el "Volver" genérico y se renombró la acción restante a
              "Volver a las opciones" — misma etiqueta y mismo destino que ya usa la
              aclaración (arriba), sin ambigüedad entre pantallas de esta vista. */}
          <div className="screen__actions">
            <button type="button" className="btn btn-secondary" onClick={volverAlMotivo}>
              Volver a las opciones
            </button>
          </div>
        </>
      )}
    </form>
  )
}

export default Objetivo
