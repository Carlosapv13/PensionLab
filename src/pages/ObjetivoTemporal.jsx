// Vista temporal de Objetivo: destino provisional del botón "Comenzar" de Bienvenida
// hasta que el Slice correspondiente implemente la pantalla real.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function ObjetivoTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title">Objetivo</h1>

      <p className="screen__subtitle">
        Esta pantalla se implementará en el siguiente Slice.
      </p>

      <button type="button" className="btn btn-primary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default ObjetivoTemporal
