// Vista temporal: destino provisional del botón "Continuar" de BaseCotizacion
// hasta que el Slice correspondiente implemente la pantalla real siguiente
// (candidato ya identificado en la secuencia económica aprobada: meta de
// jubilación deseada, necesaria para RAIS mínimo).

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function SiguientePasoEconomicoTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--siguiente-paso">Ya tienes tu base de cotización</h1>

      <p className="screen__subtitle">
        Con esto, PensionLab ya tiene una pieza clave para empezar a construir tus primeras simulaciones. En el
        siguiente paso definiremos hasta cuándo quieres seguir cotizando.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default SiguientePasoEconomicoTemporal
