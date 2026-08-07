// Pantalla funcional de Situación pensional: el usuario indica dónde está
// afiliado actualmente (Slice S3-004). Aquí comienza la construcción del
// expediente pensional — no captura fecha de inicio de cotización, semanas,
// salario, IBC, aportes, historial laboral, traslados ni cálculos.

const OPCIONES_REGIMEN = [
  {
    valor: 'RPM',
    texto: 'Colpensiones',
    ayuda: 'Régimen público de prima media (RPM).',
  },
  {
    valor: 'RAIS',
    texto: 'Estoy afiliado a un fondo privado (Porvenir, Protección, Colfondos o Skandia)',
    ayuda: 'Régimen de ahorro individual (RAIS).',
  },
  {
    valor: 'desconocido',
    texto: 'No estoy seguro',
    ayuda: 'No te preocupes si no lo sabes. PensionLab te ayudará a identificarlo.',
  },
]

/**
 * @param {Object} props
 * @param {string | null} props.regimenActual
 * @param {(regimen: string) => void} props.onCambiarRegimenActual
 * @param {() => void} props.onContinuar
 * @param {() => void} props.onVolver
 */
function SituacionPensional({
  regimenActual,
  onCambiarRegimenActual,
  onContinuar,
  onVolver,
}) {
  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title">Situación pensional</h1>

      <fieldset className="options">
        <legend>¿Dónde estás afiliado actualmente?</legend>

        <p className="screen__subtitle">
          No te preocupes si no conoces el nombre técnico del régimen. Elige la
          opción que mejor describa tu situación actual.
        </p>

        {OPCIONES_REGIMEN.map(({ valor, texto, ayuda }) => (
          <label key={valor} className="option">
            <input
              type="radio"
              name="regimenActual"
              value={valor}
              checked={regimenActual === valor}
              onChange={() => onCambiarRegimenActual(valor)}
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
        <button type="submit" className="btn btn-primary" disabled={!regimenActual}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default SituacionPensional
