// Pantalla de Bienvenida: primer contacto del usuario con PensionLab (Slice S3-001).

/**
 * @param {Object} props
 * @param {() => void} props.onComenzar
 */
function Bienvenida({ onComenzar }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--bienvenida">Bienvenido a PensionLab</h1>

      <p className="screen__subtitle">
        Comprende tu situación.
        <br />
        Descubre tus caminos posibles.
        <br />
        Toma una mejor decisión.
      </p>

      <button type="button" className="btn btn-primary" onClick={onComenzar}>
        Comenzar
      </button>
    </div>
  )
}

export default Bienvenida
