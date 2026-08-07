// Pantalla funcional "Explora tu proyección" — conecta calcularProyeccionRAIS.js
// (dominio, Sprint 3) con el recorrido real. Solo se renderiza para régimen RAIS
// (App.jsx salta directo a declaracionLibre en cualquier otro caso) — esta
// pantalla no necesita saber por qué, solo asume que si existe, el régimen ya
// es RAIS.
//
// ibcAplicableSimulacion se recalcula aquí mismo a partir de los datos crudos
// ya existentes en App.jsx, invocando determinarBaseCotizacion — mismo patrón
// ya usado en QueDeterminaTuResultado.jsx con determinarMecanismoYFaltantes.
// No se persiste el resultado en App.jsx: es barato de recalcular y evita
// mantener un dato derivado sincronizado con su origen.
//
// Si determinarBaseCotizacion no produce un ibcAplicableSimulacion evaluable,
// no se invoca calcularProyeccionRAIS — se explica la causa sin inventar nada.
//
// Sin "Continuar" deshabilitado por falta de resultado numérico: el caso "sin
// base de cotización disponible" es una respuesta completa de esta pantalla,
// no un bloqueo — la persona ya hizo lo que se le pidió (declarar una edad).

import { determinarBaseCotizacion } from '../domain/determinarBaseCotizacion.js'
import { calcularProyeccionRAIS } from '../domain/pensionEngine/calcularProyeccionRAIS.js'
import { calcularEdadCumplida } from '../domain/calcularEdadCumplida.js'

const EDAD_MAXIMA_FUNCIONAL = 100

function formatearPesos(valor) {
  return `$${Math.round(valor).toLocaleString('es-CO')}`
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * @param {string} edadTexto
 * @param {number} edadActual
 * @returns {{ edadValida: number | null, mensajeError: string | null }}
 */
function validarEdadJubilacionDeseada(edadTexto, edadActual) {
  if (edadTexto === '') {
    return { edadValida: null, mensajeError: null }
  }

  const edadNumero = Number(edadTexto)

  if (!Number.isInteger(edadNumero) || edadNumero <= edadActual) {
    return {
      edadValida: null,
      mensajeError: `Ingresa una edad mayor a tu edad actual (${edadActual} años).`,
    }
  }

  if (edadNumero > EDAD_MAXIMA_FUNCIONAL) {
    return {
      edadValida: null,
      mensajeError: `PensionLab está diseñado actualmente para explorar proyecciones hasta los ${EDAD_MAXIMA_FUNCIONAL} años.`,
    }
  }

  return { edadValida: edadNumero, mensajeError: null }
}

/**
 * @param {Object} props
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {string} props.fechaNacimiento
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.certezaBaseCotizacion
 * @param {string} props.valorBaseCotizacionDeclarado
 * @param {('empleado'|'independiente'|'ambos'|null)} props.tipoCotizante
 * @param {('colombia'|'exterior'|'ambos'|null)} props.lugarCotizacion
 * @param {string} props.salarioParaEstimarBase
 * @param {string} props.edadJubilacionDeseada
 * @param {(valor: string) => void} props.onCambiarEdadJubilacionDeseada
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function ExploraTuProyeccion({
  regimenActual,
  fechaNacimiento,
  certezaBaseCotizacion,
  valorBaseCotizacionDeclarado,
  tipoCotizante,
  lugarCotizacion,
  salarioParaEstimarBase,
  edadJubilacionDeseada,
  onCambiarEdadJubilacionDeseada,
  onVolver,
  onContinuar,
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

  const resultado =
    edadValida !== null && baseCotizacion.ibcAplicableSimulacion !== null
      ? calcularProyeccionRAIS({
          regimenActual,
          fechaNacimiento,
          edadJubilacionDeseada: edadValida,
          ibcAplicableSimulacion: baseCotizacion.ibcAplicableSimulacion,
          fecha,
        })
      : null

  const puedeContinuar = edadJubilacionDeseada !== '' && edadValida !== null

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title screen__title--explora-tu-proyeccion">Explora tu proyección</h1>

      <p className="screen__subtitle">¿A qué edad te gustaría explorar tu proyección de pensión?</p>
      <p className="screen__subtitle screen__subtitle--secundario">
        Esta es una edad hipotética para poder mostrarte un ejemplo — no es la edad legal mínima que ya vimos
        antes, ni una decisión que estés tomando ahora. Puedes cambiarla cuando quieras.
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

      {edadValida !== null && baseCotizacion.ibcAplicableSimulacion === null && (
        <p className="screen__subtitle">
          Todavía no tenemos tu base de cotización lista para poder explorar esta proyección.
        </p>
      )}

      {resultado?.estado === 'calculado' && (
        <div className="insight">
          <p className="insight__label">Proyección estimada, de tus {edadActual} a los {edadValida} años</p>
          <p className="insight__message">
            {formatearPesos(resultado.pensionMensualProyectada)} mensuales, si todo lo demás se mantiene igual.
          </p>
          <p className="insight__message">{resultado.limitaciones[0].mensaje}</p>
        </div>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={!puedeContinuar}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default ExploraTuProyeccion
