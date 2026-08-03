// Vista temporal de "Historia pensional": destino provisional del botón
// "Continuar con mi expediente" de InformacionPensionalEsencial hasta que
// el Slice correspondiente implemente la pantalla real.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function HistoriaPensionalTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--historia-pensional">
        Continuemos con tu historia pensional
      </h1>

      <p className="screen__subtitle">
        Ya registramos la información pensional inicial de tu caso. En los
        siguientes pasos podremos completar y validar tu historia con datos
        adicionales o con tu historia laboral oficial.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default HistoriaPensionalTemporal
