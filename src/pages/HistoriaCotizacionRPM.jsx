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

import { useState, useRef } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import CampoMonetario from '../components/CampoMonetario.jsx'
import CampoFechaDiaMesAnio from '../components/CampoFechaDiaMesAnio.jsx'
import { formatearPesos } from '../format/formatearDinero.js'
import { evaluarIndicioVidaLaboral } from '../domain/evidenciaIndicioVidaLaboral.js'
import { borradorVacio, evaluarNuevoPeriodo, construirPeriodoCotizacion } from './HistoriaCotizacionRPM.helpers.js'

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
  // Confirmación accesible tras agregar/quitar un período (feedback de usuaria real,
  // 2026-09-02) — estado local simple, sin arquitectura nueva; se limpia al quitar un
  // período para no dejar un mensaje de "agregaste X" sobre una lista que ya cambió.
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState(null)

  const evaluacion = evaluarNuevoPeriodo(borrador)

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

  // Enter dentro de un campo de fecha del borrador agrega el período en vez de
  // enviar el formulario completo (que dispararía "Continuar") — mismo espíritu que
  // el estándar ya adoptado de navegación por Enter, adaptado a que esta pantalla
  // tiene dos acciones (Agregar período / Continuar) en un único <form>.
  function manejarEnterEnBorrador(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    manejarAgregarPeriodo()
  }

  function manejarQuitarPeriodo(indice) {
    onCambiarHistoriaCotizacion(historiaCotizacion.filter((_, i) => i !== indice))
    setMensajeConfirmacion(null)
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
            <li className="checklist__item" key={`${periodo.fechaDesde}-${indice}`}>
              <span>{textoRangoPeriodo(periodo)}</span>
              <button type="button" className="btn btn-secondary" onClick={() => manejarQuitarPeriodo(indice)}>
                Quitar
              </button>
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
        <legend className="field__label">Agregar un período</legend>

        <CampoFechaDiaMesAnio
          key={`desde-${historiaCotizacion.length}`}
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
            key={`hasta-${historiaCotizacion.length}`}
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

        <button type="button" className="btn btn-secondary" onClick={manejarAgregarPeriodo}>
          Agregar período
        </button>
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
