// Vista temporal de Historial laboral: destino provisional del botón
// "Continuar" de Situación pensional hasta que el Slice correspondiente
// implemente la pantalla real.

const REGIMEN_TEXTO = {
  RPM: 'Colpensiones',
  RAIS: 'Fondo privado',
  desconocido: 'No estoy seguro',
}

/**
 * @param {Object} props
 * @param {string | null} props.objetivoSeleccionado
 * @param {string} props.fechaNacimiento
 * @param {string | null} props.sexo
 * @param {string | null} props.lugarResidencia
 * @param {string | null} props.regimenActual
 * @param {() => void} props.onVolver
 */
function HistorialLaboralTemporal({
  objetivoSeleccionado,
  fechaNacimiento,
  sexo,
  lugarResidencia,
  regimenActual,
  onVolver,
}) {
  return (
    <div className="screen">
      <h1 className="screen__title">Historial laboral</h1>

      <p className="screen__subtitle">
        Esta pantalla se implementará en el siguiente Slice.
      </p>

      <div className="summary">
        <p>Objetivo seleccionado: {objetivoSeleccionado}</p>
        <p>Fecha de nacimiento: {fechaNacimiento}</p>
        <p>Sexo: {sexo}</p>
        <p>Lugar de residencia: {lugarResidencia}</p>
        <p>Régimen actual: {REGIMEN_TEXTO[regimenActual]}</p>
      </div>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default HistorialLaboralTemporal
