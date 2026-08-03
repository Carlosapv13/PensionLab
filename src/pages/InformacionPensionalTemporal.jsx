// Vista temporal de "Información pensional esencial": destino provisional
// del botón "Continuar con mi expediente" de CompletarExpediente hasta que
// el Slice correspondiente implemente la pantalla real.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function InformacionPensionalTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--informacion-pensional">Información pensional esencial</h1>

      <p className="screen__subtitle">
        En este bloque comenzaremos a construir la historia pensional que
        servirá de base para evaluar tus alternativas.
      </p>

      <p className="screen__subtitle">
        PensionLab te acompañará paso a paso para registrar únicamente la
        información necesaria.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default InformacionPensionalTemporal
