// Pantalla funcional de Historial laboral: captura información estructural
// sobre la forma en que el usuario ha cotizado (Slice S3-005). No captura
// fecha de inicio de cotización, semanas, salario, IBC, aportes ni historia
// salarial — eso queda para slices posteriores.

const OPCIONES_TIPO_COTIZANTE = [
  {
    valor: 'empleado',
    texto: 'Como empleado.',
    ayuda: 'Una empresa o empleador realizó los aportes.',
  },
  {
    valor: 'independiente',
    texto: 'Como independiente.',
    ayuda: 'Realizaste directamente tus propios aportes.',
  },
  {
    valor: 'ambos',
    texto: 'De ambas formas.',
    ayuda: 'Has cotizado como empleado y también como independiente.',
  },
]

const OPCIONES_LUGAR_COTIZACION = [
  {
    valor: 'colombia',
    texto: 'Solo en Colombia.',
    ayuda: 'Tus aportes se realizaron mientras residías o trabajabas en Colombia.',
  },
  {
    valor: 'exterior',
    texto: 'Desde el exterior.',
    ayuda: 'Has realizado aportes al sistema pensional colombiano desde otro país.',
  },
  {
    valor: 'ambos',
    texto: 'En Colombia y desde el exterior.',
    ayuda: 'Has cotizado en ambos contextos.',
  },
]

const OPCIONES_COTIZA_ACTUALMENTE = [
  { valor: 'si', texto: 'Sí.' },
  { valor: 'no', texto: 'No.' },
]

/**
 * @param {Object} props
 * @param {string | null} props.tipoCotizante
 * @param {(valor: string) => void} props.onCambiarTipoCotizante
 * @param {string | null} props.lugarCotizacion
 * @param {(valor: string) => void} props.onCambiarLugarCotizacion
 * @param {string | null} props.cotizaActualmente
 * @param {(valor: string) => void} props.onCambiarCotizaActualmente
 * @param {() => void} props.onContinuar
 * @param {() => void} props.onVolver
 */
function HistorialLaboral({
  tipoCotizante,
  onCambiarTipoCotizante,
  lugarCotizacion,
  onCambiarLugarCotizacion,
  cotizaActualmente,
  onCambiarCotizaActualmente,
  onContinuar,
  onVolver,
}) {
  const puedeContinuar =
    Boolean(tipoCotizante) && Boolean(lugarCotizacion) && Boolean(cotizaActualmente)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title">Historial laboral</h1>

      <p className="screen__subtitle">
        Cuéntanos, de forma general, cómo has realizado tus cotizaciones. Más
        adelante podrás ingresar información más detallada.
      </p>

      <fieldset className="options">
        <legend>¿Cómo has realizado tus cotizaciones?</legend>

        {OPCIONES_TIPO_COTIZANTE.map(({ valor, texto, ayuda }) => (
          <label key={valor} className="option">
            <input
              type="radio"
              name="tipoCotizante"
              value={valor}
              checked={tipoCotizante === valor}
              onChange={() => onCambiarTipoCotizante(valor)}
            />
            <span>
              {texto}
              <span className="option__hint">{ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="options">
        <legend>¿Dónde has realizado cotizaciones?</legend>

        {OPCIONES_LUGAR_COTIZACION.map(({ valor, texto, ayuda }) => (
          <label key={valor} className="option">
            <input
              type="radio"
              name="lugarCotizacion"
              value={valor}
              checked={lugarCotizacion === valor}
              onChange={() => onCambiarLugarCotizacion(valor)}
            />
            <span>
              {texto}
              <span className="option__hint">{ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="options">
        <legend>¿Actualmente realizas aportes al sistema pensional colombiano?</legend>

        {OPCIONES_COTIZA_ACTUALMENTE.map(({ valor, texto }) => (
          <label key={valor} className="option">
            <input
              type="radio"
              name="cotizaActualmente"
              value={valor}
              checked={cotizaActualmente === valor}
              onChange={() => onCambiarCotizaActualmente(valor)}
            />
            <span>{texto}</span>
          </label>
        ))}
      </fieldset>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={!puedeContinuar}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default HistorialLaboral
