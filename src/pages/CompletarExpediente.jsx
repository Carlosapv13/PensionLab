// Pantalla funcional de "Completemos tu expediente" (Slice S3-007): muestra
// un checklist de progreso del expediente pensional — qué bloques ya tienen
// información básica registrada y cuál es el siguiente — sin repetir el
// detalle ya mostrado en ExpedientePensional.jsx. No captura datos nuevos,
// no implementa reglas ni cálculos.

const BLOQUES_REGISTRADOS = [
  'Objetivo',
  'Datos personales',
  'Situación pensional',
  'Historial laboral',
]

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function CompletarExpediente({ onVolver, onContinuar }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--completar-expediente">Completemos tu expediente</h1>

      <p className="screen__subtitle">
        Ya comenzamos a construir tu expediente pensional.
      </p>

      <p className="screen__subtitle">
        En los siguientes pasos iremos incorporando la información necesaria
        para comprender completamente tu caso y construir las estrategias
        pensionales que mejor se adapten a tu situación.
      </p>

      <ul className="checklist">
        {BLOQUES_REGISTRADOS.map((bloque) => (
          <li key={bloque} className="checklist__item">
            <span className="checklist__label">{bloque}</span>
            <span className="badge badge--registrado">Información básica registrada</span>
          </li>
        ))}

        <li className="checklist__item checklist__item--siguiente">
          <span className="checklist__label">Información pensional esencial</span>
          <span className="badge badge--siguiente">Siguiente paso</span>
        </li>
      </ul>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="btn btn-primary" onClick={onContinuar}>
          Continuar con mi expediente
        </button>
      </div>
    </div>
  )
}

export default CompletarExpediente
