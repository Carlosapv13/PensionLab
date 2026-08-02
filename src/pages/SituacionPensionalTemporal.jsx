// Vista temporal de Situación pensional: destino provisional del botón
// "Continuar" de Datos iniciales hasta que el Slice correspondiente implemente
// la pantalla real.

/**
 * @param {Object} props
 * @param {string | null} props.objetivoSeleccionado
 * @param {string} props.fechaNacimiento
 * @param {string | null} props.sexo
 * @param {string | null} props.lugarResidencia
 * @param {() => void} props.onVolver
 */
function SituacionPensionalTemporal({
  objetivoSeleccionado,
  fechaNacimiento,
  sexo,
  lugarResidencia,
  onVolver,
}) {
  return (
    <div className="screen">
      <h1 className="screen__title">Situación pensional</h1>

      <p className="screen__subtitle">
        Esta pantalla se implementará en el siguiente Slice.
      </p>

      <div className="summary">
        <p>Objetivo seleccionado: {objetivoSeleccionado}</p>
        <p>Fecha de nacimiento: {fechaNacimiento}</p>
        <p>Sexo: {sexo}</p>
        <p>Lugar de residencia: {lugarResidencia}</p>
      </div>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default SituacionPensionalTemporal
