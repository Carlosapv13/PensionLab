// Vista temporal: destino provisional del botón "Continuar" de
// QueDeterminaTuResultado, hasta que el Slice correspondiente ("Explorar una
// dirección", Capacidad B de la Fase 2 reconstruida) implemente la pantalla real.
//
// Deliberadamente no promete una meta ni una edad de jubilación — esa suposición ya
// se descartó durante el análisis de arquitectura de este mismo Slice. Solo
// anticipa que la persona podrá indicar, en sus propias palabras, qué le gustaría
// explorar, sin comprometerse todavía con un objetivo cerrado.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function ExplorarDireccionTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--explorar-direccion">
        ¿Qué te gustaría explorar?
      </h1>

      <p className="screen__subtitle">
        En el siguiente paso podrás decirnos, en tus propias palabras, qué te
        gustaría explorar sobre tu situación pensional — sin que eso signifique
        comprometerte todavía con una meta definitiva.
      </p>

      <p className="screen__subtitle">Esta parte de tu expediente sigue en construcción.</p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default ExplorarDireccionTemporal
