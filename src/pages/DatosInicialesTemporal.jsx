// Vista temporal de Datos iniciales: destino provisional del botón "Continuar"
// de Objetivo hasta que el Slice correspondiente implemente la pantalla real.

/**
 * @param {Object} props
 * @param {string | null} props.objetivoSeleccionado
 * @param {() => void} props.onVolver
 */
function DatosInicialesTemporal({ objetivoSeleccionado, onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title">Datos iniciales</h1>

      <p className="screen__subtitle">
        Esta pantalla se implementará en el siguiente Slice.
      </p>

      <p className="screen__subtitle">Objetivo seleccionado: {objetivoSeleccionado}</p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default DatosInicialesTemporal
