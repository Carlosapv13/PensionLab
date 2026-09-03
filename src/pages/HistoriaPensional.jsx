// Pantalla funcional de "Historia pensional" (Slice S3-009): antes de abrir
// una pregunta nueva, PensionLab refleja lo que ya entendió del caso
// (Tiempo 1), devuelve un valor personalizado derivado únicamente de datos
// ya declarados (Tiempo 2), y desde ese mismo contexto abre la pregunta
// sobre traslados de régimen (Tiempo 3) — una sola conversación continua,
// no una pantalla de resumen seguida de un formulario aparte.

import { useRef } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'

function textoRegimen(regimenActual) {
  if (regimenActual === 'RPM') return 'Colpensiones'
  if (regimenActual === 'RAIS') return 'un fondo privado'
  return null
}

function textoTipoCotizante(tipoCotizante) {
  if (tipoCotizante === 'empleado') return 'como empleado'
  if (tipoCotizante === 'independiente') return 'como independiente'
  return 'de ambas formas'
}

function textoSemanas(nivelConocimientoSemanas) {
  if (nivelConocimientoSemanas === 'conocido') {
    return 'conoces el número de semanas que has cotizado'
  }
  if (nivelConocimientoSemanas === 'aproximado') {
    return 'tienes una idea aproximada de las semanas que has cotizado'
  }
  return 'todavía no conoces cuántas semanas has cotizado'
}

function textoComprension(regimenActual, tipoCotizante, nivelConocimientoSemanas) {
  const regimen = textoRegimen(regimenActual)
  const tipo = textoTipoCotizante(tipoCotizante)
  const semanas = textoSemanas(nivelConocimientoSemanas)

  if (regimen === null) {
    return `Hasta ahora hemos comprendido que todavía no tienes claro en qué régimen estás cotizando, que lo has hecho ${tipo}, y que ${semanas}.`
  }
  return `Hasta ahora hemos comprendido que cotizas en ${regimen}, que lo has hecho ${tipo}, y que ${semanas}.`
}

// Corrección de precisión y confianza (feedback de usuaria real, 2026-09-02): esta pantalla
// mostraba antes "llevas X años construyendo tu historia pensional", calculado como
// año_actual − anioInicioCotizacion. Ese número es solo años calendario transcurridos desde
// un dato autorreportado — nunca semanas o períodos efectivamente cotizados, e insinuaba
// continuidad que PensionLab no puede confirmar (mismo motivo, ya documentado, por el que
// src/data/legal/trazabilidad-normativa.md excluye anioInicioCotizacion de cualquier
// cálculo: "dato autorreportado y sensible a interrupciones laborales"). No se calcula ni
// se muestra ningún número de años aquí — el dato solo se usa como contexto.
function textoValorPersonalizado(anioInicioCotizacion) {
  if (anioInicioCotizacion === 'desconocido') {
    return 'No recordar el año exacto no detiene la construcción de tu expediente. Más adelante podremos verificarlo con tu historia laboral oficial.'
  }

  return (
    `Nos indicaste que empezaste a cotizar aproximadamente en ${anioInicioCotizacion}. Esto no significa que ` +
    'hayas cotizado de forma continua desde entonces — pudiste tener interrupciones. Para evaluar tu situación, ' +
    'PensionLab usa las semanas y los períodos de cotización que declares, no el tiempo transcurrido desde ese año.'
  )
}

function textoOpcionNo(regimenActual) {
  if (regimenActual === 'RPM') return 'No, siempre he cotizado en Colpensiones.'
  if (regimenActual === 'RAIS') return 'No, siempre he cotizado en un fondo privado.'
  return 'No, siempre he estado en el mismo régimen.'
}

/**
 * @param {Object} props
 * @param {('RPM'|'RAIS'|'desconocido')} props.regimenActual
 * @param {string} props.tipoCotizante
 * @param {string} props.nivelConocimientoSemanas
 * @param {string} props.anioInicioCotizacion
 * @param {string | null} props.trasladoRegimen
 * @param {(valor: string) => void} props.onCambiarTrasladoRegimen
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function HistoriaPensional({
  regimenActual,
  tipoCotizante,
  nivelConocimientoSemanas,
  anioInicioCotizacion,
  trasladoRegimen,
  onCambiarTrasladoRegimen,
  onVolver,
  onContinuar,
}) {
  const opciones = [
    { valor: 'si', texto: 'Sí, me he trasladado.' },
    { valor: 'no', texto: textoOpcionNo(regimenActual) },
    {
      valor: 'no_estoy_seguro',
      texto: 'No estoy seguro.',
      ayuda: 'No te preocupes, más adelante podemos ayudarte a confirmarlo.',
    },
  ]

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--historia-pensional">
        Esto es lo que ya sabemos de tu historia
      </h1>

      <p className="screen__subtitle">
        {textoComprension(regimenActual, tipoCotizante, nivelConocimientoSemanas)}
      </p>

      <div className="insight">
        <p className="insight__label">Lo que esto nos dice</p>
        <p className="insight__message">
          {textoValorPersonalizado(anioInicioCotizacion)}
        </p>
      </div>

      <p className="screen__subtitle">
        Hay algo más que nos ayudará a comprender mejor esa historia.
      </p>

      <fieldset className="options">
        <legend>
          ¿Te has trasladado alguna vez entre Colpensiones y un fondo
          privado, o viceversa?
        </legend>

        {opciones.map(({ valor, texto, ayuda }) => (
          <label key={valor} className="option">
            <input
              type="radio"
              name="trasladoRegimen"
              value={valor}
              checked={trasladoRegimen === valor}
              onChange={() => onCambiarTrasladoRegimen(valor)}
            />
            <span>
              {texto}
              {ayuda && <span className="option__hint">{ayuda}</span>}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={!trasladoRegimen}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default HistoriaPensional
