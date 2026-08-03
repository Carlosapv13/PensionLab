// Vista temporal de "Completemos tu expediente": destino provisional del
// botón "Comenzar expediente" de Expediente pensional hasta que el Slice
// correspondiente implemente la pantalla real.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function CompletarExpedienteTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title">Completemos tu expediente</h1>

      <p className="screen__subtitle">
        Ya comenzamos a construir tu expediente pensional.
      </p>

      <p className="screen__subtitle">
        En los siguientes pasos iremos incorporando la información necesaria
        para comprender completamente tu caso y construir las estrategias
        pensionales que mejor se adapten a tu situación.
      </p>

      <p className="screen__subtitle">
        No necesitas tener toda la información desde el principio. PensionLab
        te explicará qué información se requiere y por qué es importante.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default CompletarExpedienteTemporal
