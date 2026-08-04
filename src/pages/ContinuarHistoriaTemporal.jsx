// Vista temporal: destino provisional del botón "Continuar" de
// HistoriaPensional hasta que el Slice correspondiente implemente la
// pantalla real siguiente (detalle de traslado, salario/IBC o semanas
// verificadas — alcance todavía sin decidir).

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function ContinuarHistoriaTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--continuar-historia">
        Sigamos construyendo tu historia
      </h1>

      <p className="screen__subtitle">
        Ya sabemos más sobre tu trayectoria pensional. En los siguientes
        pasos seguiremos completando la información que necesitamos para
        ayudarte a comparar tus alternativas.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default ContinuarHistoriaTemporal
