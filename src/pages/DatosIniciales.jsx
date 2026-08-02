// Pantalla funcional de Datos iniciales: captura fecha de nacimiento, sexo para
// efectos pensionales y lugar de residencia (Slice S3-003).

const HOY = new Date().toISOString().slice(0, 10)

const OPCIONES_SEXO = ['Mujer', 'Hombre']
const OPCIONES_LUGAR_RESIDENCIA = ['Colombia', 'Exterior']

function esFechaNacimientoValida(fecha) {
  return Boolean(fecha) && fecha <= HOY
}

/**
 * @param {Object} props
 * @param {string} props.fechaNacimiento
 * @param {(fecha: string) => void} props.onCambiarFechaNacimiento
 * @param {string | null} props.sexo
 * @param {(sexo: string) => void} props.onCambiarSexo
 * @param {string | null} props.lugarResidencia
 * @param {(lugar: string) => void} props.onCambiarLugarResidencia
 * @param {() => void} props.onContinuar
 * @param {() => void} props.onVolver
 */
function DatosIniciales({
  fechaNacimiento,
  onCambiarFechaNacimiento,
  sexo,
  onCambiarSexo,
  lugarResidencia,
  onCambiarLugarResidencia,
  onContinuar,
  onVolver,
}) {
  const puedeContinuar =
    esFechaNacimientoValida(fechaNacimiento) && Boolean(sexo) && Boolean(lugarResidencia)

  return (
    <div className="screen">
      <h1 className="screen__title">Datos iniciales</h1>

      <label className="field">
        <span className="field__label">Fecha de nacimiento</span>
        <input
          type="date"
          className="field__input"
          value={fechaNacimiento}
          max={HOY}
          onChange={(e) => onCambiarFechaNacimiento(e.target.value)}
        />
      </label>

      <fieldset className="options">
        <legend>Sexo para efectos pensionales</legend>

        <p className="option__hint">
          Este dato es necesario porque algunos requisitos pensionales pueden
          variar.
        </p>

        {OPCIONES_SEXO.map((opcion) => (
          <label key={opcion} className="option">
            <input
              type="radio"
              name="sexo"
              value={opcion}
              checked={sexo === opcion}
              onChange={() => onCambiarSexo(opcion)}
            />
            <span>{opcion}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="options">
        <legend>Lugar de residencia</legend>

        {OPCIONES_LUGAR_RESIDENCIA.map((opcion) => (
          <label key={opcion} className="option">
            <input
              type="radio"
              name="lugarResidencia"
              value={opcion}
              checked={lugarResidencia === opcion}
              onChange={() => onCambiarLugarResidencia(opcion)}
            />
            <span>{opcion}</span>
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
          disabled={!puedeContinuar}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default DatosIniciales
