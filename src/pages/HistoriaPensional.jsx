// Pantalla funcional de "Historia pensional" (Slice S3-009): antes de abrir
// una pregunta nueva, PensionLab refleja lo que ya entendió del caso
// (Tiempo 1), devuelve un valor personalizado derivado únicamente de datos
// ya declarados (Tiempo 2), y desde ese mismo contexto abre la pregunta
// sobre traslados de régimen (Tiempo 3) — una sola conversación continua,
// no una pantalla de resumen seguida de un formulario aparte.

const HOY = new Date().toISOString().slice(0, 10)
const ANIO_ACTUAL = Number(HOY.slice(0, 4))

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

function textoValorPersonalizado(anioInicioCotizacion) {
  if (anioInicioCotizacion === 'desconocido') {
    return 'No recordar el año exacto no detiene la construcción de tu expediente. Más adelante podremos verificarlo con tu historia laboral oficial.'
  }

  const anios = ANIO_ACTUAL - Number(anioInicioCotizacion)

  if (anios === 0) {
    return 'Según el año que nos compartiste, comenzaste a construir tu historia pensional este mismo año.'
  }
  if (anios === 1) {
    return 'Según el año que nos compartiste, llevas aproximadamente un año construyendo tu historia pensional.'
  }
  return `Según el año que nos compartiste, llevas aproximadamente ${anios} años construyendo tu historia pensional.`
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

  return (
    <div className="screen">
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={onContinuar}
          disabled={!trasladoRegimen}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default HistoriaPensional
