// Pantalla funcional "Tu historia de cotización" — Slice S4-001 (Entregable 2, Sprint 4):
// primera capacidad real de captura de historiaCotizacion desde la UI pública, sin
// Panel de Desarrollo ni fixtures.
//
// Perfil soportado: cualquier caso con regimenActual === 'RPM' — ni
// seleccionarPeriodosIBL.js ni calcularPensionRPM.js filtran por tipoCotizante,
// lugarCotizacion ni trasladoRegimen (a diferencia de generarCaminosRAIS.js), así que
// esta pantalla no impone ninguna restricción adicional de perfil (ver análisis técnico
// de S4-001). No se construye código específico de ninguna persona: Carlos y Alex son
// casos de validación, nunca condiciones del producto (Entregable 2, §4).
//
// diasCotizados nunca se pide como campo crudo: esta versión solo admite períodos
// declarados como cotización continua y completa sobre el mismo IBC durante todo el
// intervalo — se deriva siempre de las fechas (ver HistoriaCotizacionRPM.helpers.js).
// Un hueco o una interrupción real no se "declara": simplemente no se agrega un período
// para ese tramo, o se declara partido en dos — la ausencia de período ya es la
// representación del hueco, igual que ya asume seleccionarPeriodosIBL.js.
//
// "Continuar" nunca se deshabilita por historia incompleta o vacía — mismo criterio ya
// establecido en ExploraTuProyeccion.jsx: "todavía no hay suficiente información" es una
// respuesta completa, no un bloqueo. La pantalla siguiente (ExploraTuProyeccionRPM.jsx)
// ya maneja honestamente el caso sin historia y cada código no_evaluable.
//
// Captura de fechas día/mes/año (no <input type="date">) mediante CampoFechaDiaMesAnio.jsx
// — estándar permanente de captura de fechas en PensionLab desde la revisión final de
// S4-001 (mismo comportamiento exacto que la fecha de nacimiento, incluido el buffer de
// escritura numérica del mes). fechaDesde/fechaHasta del borrador ya son cadenas ISO — la
// construcción día/mes/año vive exclusivamente dentro de ese componente.

import { useState, useRef, useEffect } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import CampoMonetario from '../components/CampoMonetario.jsx'
import CampoFechaDiaMesAnio from '../components/CampoFechaDiaMesAnio.jsx'
import { formatearPesos } from '../format/formatearDinero.js'
import { evaluarIndicioVidaLaboral } from '../domain/evidenciaIndicioVidaLaboral.js'
import {
  borradorVacio,
  construirPeriodoCotizacion,
  periodoAFormularioBorrador,
  evaluarPeriodoParaHistoria,
  reemplazarPeriodoEnPosicion,
  quitarPeriodoEnPosicion,
} from './HistoriaCotizacionRPM.helpers.js'

function textoRangoPeriodo(periodo) {
  const hasta = periodo.fechaHasta ?? 'actualidad'
  return `${periodo.fechaDesde} – ${hasta} · ${formatearPesos(periodo.ibc)}`
}

// Jerarquía visual (revisión de usuaria real, 2026-09-02): solo instrucción principal + nota
// breve quedan visibles antes de la lista; el resto vive dentro del <details>, organizado en
// dos subtítulos no interactivos ("Cómo completarla" / "Cómo usa PensionLab esta información").
const TEXTO_INSTRUCCION_PRINCIPAL =
  'Agrega un período por cada tramo continuo en el que cotizaste con la misma base de ' +
  'cotización (IBC), es decir, el ingreso reportado para calcular tus aportes. Si cambió tu ' +
  'IBC, crea otro período. No incluyas los meses o años en los que no cotizaste.'

const TEXTO_NOTA_SECUNDARIA =
  'Estos son aportes que ya realizaste; no estás creando aportes nuevos, adicionales ni voluntarios.'

const TEXTO_AYUDA_HISTORIA_OFICIAL =
  'Si tienes a la mano tu historia laboral de Colpensiones o de tu fondo privado, puedes ' +
  'consultarla para identificar fechas e IBC con precisión.'

const TEXTO_AYUDA_HISTORIA_PARCIAL =
  'Puedes comenzar con los períodos que ya conozcas — no hace falta que tengas toda tu historia lista.'

const TEXTO_AYUDA_HUECOS =
  'Los intervalos en los que no cotizaste no se agregan como período: su ausencia ya representa ese hueco.'

const TEXTO_AYUDA_INFORMACION_INSUFICIENTE =
  'Si la información que agregues no alcanza para estimar tu pensión con precisión, PensionLab te lo indicará.'

// Condensa Art. 21 Ley 100 de 1993 + convención de 3.650 días (ver trazabilidad-normativa.md)
// en un solo párrafo, sin repetir la instrucción principal.
const TEXTO_LEGAL_VENTANA_FECHAS =
  'La ley (Art. 21, Ley 100 de 1993) usa como referencia los 10 años anteriores al momento en ' +
  'que te reconozcan la pensión — una fecha futura que hoy no podemos calcular sin inventar ' +
  'datos. Por eso esta lectura usa tus últimos años efectivamente cotizados, contados hacia ' +
  'atrás desde hoy: es un punto de partida honesto, no tu resultado final. Para saber cuándo ' +
  'esos años se completan usamos 3.650 días de cotización efectiva (el equivalente a 10 años) ' +
  '— una convención técnica propia de PensionLab, respaldada por un caso real de la Corte ' +
  'Suprema de Justicia. Si tu historia tiene interrupciones, retrocedemos más atrás en el ' +
  'tiempo para completarlos.'

const TEXTO_REGLA_1250_SEMANAS =
  'Si tienes 1.250 semanas o más cotizadas en total, puede existir la opción de comparar el ' +
  'promedio de los últimos 10 años con el de toda tu vida laboral y usar el que resulte más ' +
  'favorable. Por eso agregar más historia puede cambiar el resultado.'

// Solo se llama con indicio.estado === 'indicio_probable' (ver guarda de render, más abajo) —
// la rama genérica que existía aquí (TEXTO_INVITACION_GENERICA) se eliminó por
// inalcanzable: repetía TEXTO_REGLA_1250_SEMANAS sin aportar nada nuevo (2026-09-02).
function textoInvitacionVidaLaboral(indicio) {
  return (
    `Nos dijiste antes que tienes aproximadamente ${indicio.semanasDeclaradas} semanas cotizadas — ` +
    'si agregas tu historia más allá de estos 10 años, podríamos confirmar si calificas para una ' +
    'alternativa de cálculo que la ley permite cuando resulta más favorable.'
  )
}

// Advertencia + fundamento legal de traslado fusionados en una sola redacción (antes
// duplicados entre un aviso corto y el detalle normativo) — ver §8.9 del Entregable 2 y
// trazabilidad-normativa.md. Se renderiza solo si trasladoRegimen === 'si'.
const TEXTO_TRASLADO_REGIMEN =
  'Como te trasladaste de régimen: el tiempo cotizado en tu régimen anterior sí tiene respaldo ' +
  'legal para reconocerse (Decreto 3800 de 2003, Art. 3), pero ninguna fuente que consultamos ' +
  'resuelve cómo debe tratarse el valor económico de esa historia previa al traslado en este ' +
  'cálculo. Puedes agregarla igual: la tratamos igual que el resto de tu historia, sin que eso ' +
  'sea una afirmación de que así debe calcularse legalmente en tu caso.'

/**
 * @param {Object} props
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} props.historiaCotizacion
 * @param {(historia: Array<Object>) => void} props.onCambiarHistoriaCotizacion
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.nivelConocimientoSemanas
 * @param {string} props.semanasCotizadas
 * @param {string | null} props.trasladoRegimen
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function HistoriaCotizacionRPM({
  historiaCotizacion,
  onCambiarHistoriaCotizacion,
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  trasladoRegimen,
  onVolver,
  onContinuar,
}) {
  const indicioVidaLaboral = evaluarIndicioVidaLaboral({ regimenActual, nivelConocimientoSemanas, semanasCotizadas })
  const [borrador, setBorrador] = useState(borradorVacio())
  const [intentoAgregar, setIntentoAgregar] = useState(false)
  // Confirmación accesible tras agregar/quitar/editar un período (feedback de usuaria real,
  // 2026-09-02) — estado local simple, sin arquitectura nueva; se limpia al quitar un
  // período para no dejar un mensaje de "agregaste X" sobre una lista que ya cambió.
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState(null)
  // Revisión correctiva E4-C1 (2026-09-10) — "Edición real de periodos históricos": null =
  // modo "Agregar" (comportamiento sin cambios); un número = modo "Editar" — la POSICIÓN
  // TRANSITORIA, dentro de esta única sesión de edición, del período de `historiaCotizacion`
  // que se está reemplazando. Precisión deliberada (revisión correctiva 2026-09-10): esto NO
  // es un identificador estable — es válido únicamente mientras el array no se reordena ni
  // se elimina nada antes de esa posición. En este componente eso está garantizado: agregar
  // siempre añade al final (nunca desplaza índices anteriores) y `manejarConfirmarQuitarPeriodo`
  // ya cancela la edición en curso ANTES de eliminar (ver más abajo), así que `indiceEnEdicion`
  // nunca sobrevive a un cambio de longitud del array. Ningún otro punto de este archivo
  // reordena `historiaCotizacion`. Si en el futuro se agregara reordenamiento, filtrado o
  // eliminación fuera de `manejarQuitarPeriodo`, la posición dejaría de ser segura y este
  // campo debería reemplazarse por un identificador persistente — no se introduce uno ahora
  // porque no hay evidencia de que haga falta. Estado puramente transitorio de esta pantalla:
  // nunca se persiste en App.jsx ni forma parte de PeriodoCotizacion.
  const [indiceEnEdicion, setIndiceEnEdicion] = useState(null)
  const enModoEdicion = indiceEnEdicion !== null

  // Revisión correctiva E4-C1 (2026-09-10), hallazgo 5: "Quitar" ya no elimina de inmediato —
  // el primer clic solo abre una confirmación asociada a ESE período (nunca un
  // window.confirm nativo, para seguir el estilo visual de la app). null = ningún período en
  // confirmación; un número = la posición del período cuya confirmación está abierta. Mismo
  // criterio de "posición transitoria, no identificador persistente" que indiceEnEdicion
  // (ver su comentario, arriba) — misma garantía de seguridad: agregar solo añade al final, y
  // la eliminación real (manejarConfirmarQuitarPeriodo) es el único punto que cambia la
  // longitud del array, y limpia este estado en el mismo gesto.
  const [indiceEnConfirmacionQuitar, setIndiceEnConfirmacionQuitar] = useState(null)
  // Foco visible tras abrir la confirmación (requisito explícito: "debe funcionar con
  // teclado, tener foco visible") — el botón "Quitar" que se pulsó desaparece del DOM al
  // renderizarse la confirmación, así que el navegador lo perdería por completo sin este
  // efecto. Se mueve a "Cancelar" (la acción no destructiva) por defecto, nunca a la acción
  // destructiva — mismo criterio de seguridad que cualquier diálogo de confirmación.
  const cancelarQuitarRef = useRef(null)
  useEffect(() => {
    if (indiceEnConfirmacionQuitar !== null) cancelarQuitarRef.current?.focus()
  }, [indiceEnConfirmacionQuitar])

  const evaluacion = evaluarPeriodoParaHistoria({ historiaCotizacion, borrador, indiceExcluido: indiceEnEdicion })

  function actualizarBorrador(campos) {
    setBorrador((actual) => ({ ...actual, ...campos }))
    setIntentoAgregar(false)
  }

  function alternarSigueAbierto(marcado) {
    // Al marcar "sigue abierto", cualquier fecha de fin ya escrita queda obsoleta —
    // mismo criterio ya usado en App.jsx para invalidar campos dependientes ante un
    // cambio semántico (ej. actualizarRegimenActual).
    actualizarBorrador({ sigueAbierto: marcado, fechaHasta: marcado ? '' : borrador.fechaHasta })
  }

  function manejarAgregarPeriodo() {
    if (!evaluacion.puedeAgregar) {
      setIntentoAgregar(true)
      return
    }
    const nuevoPeriodo = construirPeriodoCotizacion(evaluacion)
    onCambiarHistoriaCotizacion([...historiaCotizacion, nuevoPeriodo])
    setMensajeConfirmacion(`Agregaste el período ${textoRangoPeriodo(nuevoPeriodo)}.`)
    setBorrador(borradorVacio())
    setIntentoAgregar(false)
  }

  // Revisión correctiva E4-C1: carga el período seleccionado en el mismo formulario de
  // arriba (nunca un formulario paralelo) y cambia el modo a "Editar" — nunca borra ni
  // modifica el período hasta que se pulse "Guardar cambios" explícitamente.
  function manejarEmpezarEdicion(indice) {
    setBorrador(periodoAFormularioBorrador(historiaCotizacion[indice]))
    setIndiceEnEdicion(indice)
    setIntentoAgregar(false)
    setMensajeConfirmacion(null)
    // Defensivo: cierra cualquier confirmación de "Quitar" pendiente en otro período — evita
    // dos diálogos de acción distintos abiertos a la vez en la misma lista.
    setIndiceEnConfirmacionQuitar(null)
  }

  // Cancelar deja el período original intacto — nunca escribe en historiaCotizacion.
  function manejarCancelarEdicion() {
    setBorrador(borradorVacio())
    setIndiceEnEdicion(null)
    setIntentoAgregar(false)
  }

  // Reemplaza en la MISMA posición (indiceEnEdicion) — nunca agrega un elemento nuevo, así
  // que nunca duplica; los demás períodos del array se conservan intactos, sin tocarlos.
  function manejarGuardarEdicion() {
    if (!evaluacion.puedeAgregar) {
      setIntentoAgregar(true)
      return
    }
    const periodoActualizado = construirPeriodoCotizacion(evaluacion)
    onCambiarHistoriaCotizacion(reemplazarPeriodoEnPosicion(historiaCotizacion, indiceEnEdicion, periodoActualizado))
    setMensajeConfirmacion(`Guardaste los cambios del período ${textoRangoPeriodo(periodoActualizado)}.`)
    setBorrador(borradorVacio())
    setIndiceEnEdicion(null)
    setIntentoAgregar(false)
  }

  // Enter dentro de un campo de fecha del borrador confirma la acción principal vigente
  // (agregar o guardar, según el modo) en vez de enviar el formulario completo (que
  // dispararía "Continuar") — mismo espíritu que el estándar ya adoptado de navegación por
  // Enter, adaptado a que esta pantalla tiene más de una acción en un único <form>.
  function manejarEnterEnBorrador(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (enModoEdicion) {
      manejarGuardarEdicion()
    } else {
      manejarAgregarPeriodo()
    }
  }

  // Revisión correctiva E4-C1, hallazgo 5: primer clic en "Quitar" — solo abre la
  // confirmación, nunca elimina todavía. No toca historiaCotizacion ni ningún otro estado.
  function manejarPedirConfirmacionQuitar(indice) {
    setIndiceEnConfirmacionQuitar(indice)
  }

  // "Cancelar" — conserva el período sin modificaciones, solo cierra la confirmación.
  function manejarCancelarConfirmacionQuitar() {
    setIndiceEnConfirmacionQuitar(null)
  }

  // "Sí, quitar período" — única acción que efectivamente elimina. `filter` por índice
  // garantiza por construcción que solo se elimina la posición confirmada y que los demás
  // períodos se conservan intactos y en su mismo orden relativo (ni se duplican ni se
  // alteran).
  function manejarConfirmarQuitarPeriodo(indice) {
    onCambiarHistoriaCotizacion(quitarPeriodoEnPosicion(historiaCotizacion, indice))
    setMensajeConfirmacion(null)
    setIndiceEnConfirmacionQuitar(null)
    // Defensivo: si se quita el período que se estaba editando (o cualquier otro, para
    // evitar que `indiceEnEdicion` quede apuntando a una posición desplazada por el
    // splice), la edición en curso se cancela — nunca deja el formulario mostrando datos de
    // un período que ya no existe en esa posición. Eliminar es siempre una acción distinta
    // y explícita: esto nunca elimina un SEGUNDO período, solo cierra la edición transitoria.
    if (enModoEdicion) manejarCancelarEdicion()
  }

  const campoIbc = useCampoMonetario(borrador.ibc, (valor) => actualizarBorrador({ ibc: valor }))

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--historia-cotizacion-rpm">Tu historia de cotización</h1>

      <p className="screen__subtitle">{TEXTO_INSTRUCCION_PRINCIPAL}</p>
      <p className="screen__subtitle screen__subtitle--secundario">{TEXTO_NOTA_SECUNDARIA}</p>

      <details className="legal-detail">
        <summary>¿Necesitas ayuda para completar tu historia?</summary>

        <p className="insight__label">Cómo completarla</p>
        <p>{TEXTO_AYUDA_HISTORIA_OFICIAL}</p>
        <p>{TEXTO_AYUDA_HISTORIA_PARCIAL}</p>
        <p>{TEXTO_AYUDA_HUECOS}</p>
        <p>{TEXTO_AYUDA_INFORMACION_INSUFICIENTE}</p>

        <p className="insight__label">Cómo usa PensionLab esta información</p>
        <p>{TEXTO_LEGAL_VENTANA_FECHAS}</p>
        <p>{TEXTO_REGLA_1250_SEMANAS}</p>
        {indicioVidaLaboral.estado === 'indicio_probable' && <p>{textoInvitacionVidaLaboral(indicioVidaLaboral)}</p>}
        {trasladoRegimen === 'si' && <p>{TEXTO_TRASLADO_REGIMEN}</p>}
      </details>

      {historiaCotizacion.length === 0 ? (
        <p className="screen__subtitle screen__subtitle--secundario">
          Todavía no has agregado ningún período. Agrega abajo los tramos de tiempo en los que sí cotizaste.
        </p>
      ) : (
        <ul className="checklist">
          {historiaCotizacion.map((periodo, indice) => (
            <li
              className={`checklist__item${indice === indiceEnEdicion ? ' checklist__item--siguiente' : ''}`}
              key={`${periodo.fechaDesde}-${indice}`}
            >
              <span>
                {textoRangoPeriodo(periodo)}
                {indice === indiceEnEdicion && ' — editando'}
              </span>
              {/* Revisión correctiva E4-C1 (2026-09-10), hallazgo 5: confirmación dentro de la
                  interfaz (nunca window.confirm), asociada visualmente a este período —
                  reutiliza field__warning (mismo estilo ya usado para avisos) y btn-primary/
                  btn-secondary existentes, sin CSS nuevo. */}
              {indice === indiceEnConfirmacionQuitar ? (
                <div className="field__warning">
                  <p>¿Quieres quitar este período de tu historia de cotización?</p>
                  <div className="screen__actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      ref={cancelarQuitarRef}
                      onClick={manejarCancelarConfirmacionQuitar}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      aria-label={`Confirmar: quitar el período ${textoRangoPeriodo(periodo)}`}
                      onClick={() => manejarConfirmarQuitarPeriodo(indice)}
                    >
                      Sí, quitar período
                    </button>
                  </div>
                </div>
              ) : (
                <div className="screen__actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={`Editar el período ${textoRangoPeriodo(periodo)}`}
                    onClick={() => manejarEmpezarEdicion(indice)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    aria-label={`Quitar el período ${textoRangoPeriodo(periodo)}`}
                    onClick={() => manejarPedirConfirmacionQuitar(indice)}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {mensajeConfirmacion && (
        <p className="screen__subtitle screen__subtitle--secundario" role="status">
          {mensajeConfirmacion}
        </p>
      )}

      <fieldset className="field-group" onKeyDown={manejarEnterEnBorrador}>
        <legend className="field__label">{enModoEdicion ? 'Editar período' : 'Agregar un período'}</legend>

        {/* La key incluye indiceEnEdicion (además de historiaCotizacion.length, ya usado
            para el reinicio tras agregar) porque CampoFechaDiaMesAnio es semi-controlado:
            solo lee `valor` al montarse — cambiar de "Agregar" a "Editar" (o entre dos
            períodos distintos) debe forzar un remontaje para mostrar la fecha cargada. */}
        <CampoFechaDiaMesAnio
          key={`desde-${historiaCotizacion.length}-${indiceEnEdicion ?? 'nuevo'}`}
          valor={borrador.fechaDesde}
          onCambiar={(fecha) => actualizarBorrador({ fechaDesde: fecha })}
          etiquetaDia="Día desde"
          etiquetaMes="Mes desde"
          etiquetaAnio="Año desde"
        />

        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={borrador.sigueAbierto}
            onChange={(e) => alternarSigueAbierto(e.target.checked)}
          />
          <span>Sigo cotizando en este período actualmente.</span>
        </label>

        {!borrador.sigueAbierto && (
          <CampoFechaDiaMesAnio
            key={`hasta-${historiaCotizacion.length}-${indiceEnEdicion ?? 'nuevo'}`}
            valor={borrador.fechaHasta}
            onCambiar={(fecha) => actualizarBorrador({ fechaHasta: fecha })}
            etiquetaDia="Día hasta"
            etiquetaMes="Mes hasta"
            etiquetaAnio="Año hasta"
          />
        )}

        <label className="field">
          <span className="field__label">Base de cotización (IBC) de este período, en pesos</span>
          <CampoMonetario {...campoIbc} />
        </label>

        {intentoAgregar && evaluacion.errores.length > 0 && (
          <div className="field__warning">
            {evaluacion.errores.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        {enModoEdicion ? (
          <div className="screen__actions">
            <button type="button" className="btn btn-primary" onClick={manejarGuardarEdicion}>
              Guardar cambios
            </button>
            <button type="button" className="btn btn-secondary" onClick={manejarCancelarEdicion}>
              Cancelar edición
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={manejarAgregarPeriodo}>
            Agregar período
          </button>
        )}
      </fieldset>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary">
          Continuar
        </button>
      </div>
    </form>
  )
}

export default HistoriaCotizacionRPM
