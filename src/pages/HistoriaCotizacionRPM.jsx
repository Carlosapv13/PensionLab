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
import { calcularVentana } from '../domain/seleccionarPeriodosIBL.js'
import { evaluarIndicioVidaLaboral } from '../domain/evidenciaIndicioVidaLaboral.js'
import { borradorVacio, evaluarNuevoPeriodo, construirPeriodoCotizacion } from './HistoriaCotizacionRPM.helpers.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function textoRangoPeriodo(periodo) {
  const hasta = periodo.fechaHasta ?? 'actualidad'
  return `${periodo.fechaDesde} – ${hasta} · ${formatearPesos(periodo.ibc)}`
}

const TEXTO_INVITACION_GENERICA =
  'Si tienes más historia disponible, agregarla puede ayudarte a acceder a una alternativa de ' +
  'cálculo más favorable.'

// Capa 2 de la UX progresiva (revisión de S4-001): el texto cambia según el indicio ya
// evaluado, nunca según un cálculo — 'indicio_probable' se basa en lo declarado, no en la
// historia estructurada (ver evidenciaIndicioVidaLaboral.js).
function textoInvitacionVidaLaboral(indicio) {
  if (indicio.estado === 'indicio_probable') {
    return (
      `Nos dijiste antes que tienes aproximadamente ${indicio.semanasDeclaradas} semanas cotizadas — ` +
      'si agregas tu historia más allá de estos 10 años, podríamos confirmar si calificas para una ' +
      'alternativa de cálculo que la ley permite cuando resulta más favorable.'
    )
  }
  return TEXTO_INVITACION_GENERICA
}

// Capa 3, solo si trasladoRegimen === 'si' — ver bloqueo §8.9 del Entregable 2 y
// src/data/legal/trazabilidad-normativa.md ("Traslado de régimen (RAIS→RPM) e IBL").
const TEXTO_ADVERTENCIA_TRASLADO =
  'Como te trasladaste de régimen: todavía no podemos confirmar cómo debe tratarse tu historia ' +
  'previa al traslado en este cálculo. Puedes agregarla igual — lo explicamos abajo.'

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
  const ventana = calcularVentana(hoyISO())
  const indicioVidaLaboral = evaluarIndicioVidaLaboral({ regimenActual, nivelConocimientoSemanas, semanasCotizadas })
  const [borrador, setBorrador] = useState(borradorVacio())
  const [intentoAgregar, setIntentoAgregar] = useState(false)

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
    onCambiarHistoriaCotizacion([...historiaCotizacion, construirPeriodoCotizacion(evaluacion)])
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

      {/* Nota de preparación (hallazgo de revisión manual de S4-001): ayuda a que la persona
          sepa, antes de empezar a capturar, que puede apoyarse en un documento oficial —
          nunca lo convierte en requisito: "puedes continuar igual" cierra la frase a propósito. */}
      <p className="screen__subtitle screen__subtitle--secundario">
        Si tienes a la mano tu historia laboral de Colpensiones o de tu fondo privado, este es un
        buen momento para consultarla — te ayuda a identificar fechas e IBC con precisión. Si no la
        tienes, puedes continuar igual con lo que ya conoces.
      </p>

      {/* Capa 1 — mensaje principal corto + rango concreto calculado (nunca adivinado por el
          usuario). No afirma que esta sea la ventana jurídicamente definitiva para su pensión
          futura — eso se explica en la Capa 4, no aquí. "Años calendario completos" reemplaza la
          expresión ambigua "los últimos 10 años" (hallazgo de revisión manual de S4-001). */}
      <p className="screen__subtitle">
        Para tu primera lectura, necesitamos tu historia completa y sin huecos entre el{' '}
        {ventana.desde} y el {ventana.hasta} (los últimos 10 años calendario completos). No es
        necesario que tengas el resto de tu historia lista — puedes continuar con lo que ya tengas.
      </p>

      {/* Capa 2 — invitación a más historia, condicionada al indicio declarado, no genérica. */}
      <p className="screen__subtitle screen__subtitle--secundario">{textoInvitacionVidaLaboral(indicioVidaLaboral)}</p>

      {/* Capa 3 — advertencia de traslado, breve, solo si aplica. */}
      {trasladoRegimen === 'si' && (
        <div className="field__warning">
          <p>{TEXTO_ADVERTENCIA_TRASLADO}</p>
        </div>
      )}

      {/* Capa 4 — detalle normativo, colapsado por defecto (mismo patrón que "Ver fundamento
          legal" en BaseCotizacion.jsx). Aquí vive toda la precisión jurídica, no en el mensaje
          principal. */}
      <details className="legal-detail">
        <summary>¿Por qué estas fechas, y por qué esta limitación?</summary>
        <p>
          La ley (Art. 21, Ley 100 de 1993) usa como referencia los 10 años anteriores al momento
          en que te reconozcan la pensión — una fecha futura que hoy no podemos calcular sin
          inventar datos (inflación y salario mínimo futuros). Por eso esta lectura usa los últimos
          10 años calculados desde hoy: es un punto de partida honesto, no tu resultado final.
        </p>
        <p>
          Usamos años calendario completos ({ventana.anioInicio} a {ventana.anioFin}): el año en
          curso no se incluye porque su inflación acumulada (IPC de cierre) todavía no existe —
          no podemos actualizar valores con un dato que aún no se publica.
        </p>
        <p>
          Si acumulas 1250 semanas o más en total (no solo en los últimos 10 años), la ley te
          permite optar por el promedio de toda tu vida laboral si resulta más favorable —
          por eso puede convenirte agregar más historia de la estrictamente necesaria.
        </p>
        {trasladoRegimen === 'si' && (
          <p>
            Sobre tu traslado de régimen: el tiempo cotizado en tu régimen anterior sí tiene
            respaldo legal para reconocerse (Decreto 3800 de 2003, Art. 3), pero ninguna fuente
            que consultamos resuelve cómo debe tratarse el valor económico de esa historia previa
            dentro de este cálculo. No la estamos incluyendo ni excluyendo con una regla propia:
            si la agregas, se tratará igual que el resto, sin que eso sea una afirmación de que
            así debe calcularse legalmente en tu caso.
          </p>
        )}
      </details>

      {historiaCotizacion.length > 0 && (
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
