// Vista temporal: destino provisional del botón "Continuar" de DeclaracionLibre, hasta
// que la capacidad correspondiente ("Capacidad C" de la Fase 2 reconstruida) implemente
// la pantalla real.
//
// Deliberadamente no afirma que lo declarado ya fue comprendido, clasificado o
// respondido, ni promete una forma específica de respuesta — esa determinación
// (si contiene una decisión procesable, una pregunta informativa, varios asuntos, o
// contenido fuera de alcance) todavía no se ha diseñado.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function RevisionDeclaracionTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--revision-declaracion">
        Seguimos construyendo tu expediente
      </h1>

      <p className="screen__subtitle">
        Recibimos lo que compartiste, o la ausencia que nos indicaste. En el siguiente
        paso, PensionLab revisará qué contiene lo que nos dijiste, antes de intentar
        responder nada.
      </p>

      <p className="screen__subtitle">Esta parte de tu expediente sigue en construcción.</p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default RevisionDeclaracionTemporal
