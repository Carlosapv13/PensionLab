// Pantalla funcional de Objetivo: el usuario elige qué quiere lograr con el
// análisis (Slice S3-002).

const OPCIONES = [
  {
    texto: 'Descubrir mis opciones pensionales.',
    ayuda: 'Conoce caminos que posiblemente no habías considerado.',
  },
  {
    texto: 'Comparar caminos que ya conozco.',
    ayuda: 'Revisa sus beneficios, costos, tiempos y riesgos.',
  },
  {
    texto: 'Validar una estrategia que ya tengo.',
    ayuda: 'Comprueba sus supuestos y compárala con otras alternativas.',
  },
  {
    texto: 'No estoy seguro, quiero que PensionLab me guíe.',
    ayuda: 'Recomendable si todavía no conoces tu mejor estrategia.',
  },
]

/**
 * @param {Object} props
 * @param {string | null} props.objetivoSeleccionado
 * @param {(objetivo: string) => void} props.onSeleccionarObjetivo
 * @param {() => void} props.onContinuar
 * @param {() => void} props.onVolver
 */
function Objetivo({ objetivoSeleccionado, onSeleccionarObjetivo, onContinuar, onVolver }) {
  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen screen--objetivo" onSubmit={manejarEnvio}>
      <h1 className="screen__title screen__title--objetivo">¿En qué quieres que te ayudemos hoy?</h1>

      <p className="screen__subtitle">
        No te preocupes si no estás completamente seguro. Elige lo que mejor
        describa lo que buscas hoy; podrás cambiarlo más adelante.
      </p>

      <fieldset className="options">
        <legend className="visually-hidden">¿En qué quieres que te ayudemos hoy?</legend>

        {OPCIONES.map(({ texto, ayuda }) => (
          <label key={texto} className="option">
            <input
              type="radio"
              name="objetivo"
              value={texto}
              checked={objetivoSeleccionado === texto}
              onChange={() => onSeleccionarObjetivo(texto)}
            />
            <span>
              {texto}
              <span className="option__hint">{ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={!objetivoSeleccionado}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default Objetivo
