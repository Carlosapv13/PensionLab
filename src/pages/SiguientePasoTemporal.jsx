// Vista temporal: destino provisional del botón "Continuar" de
// PrimeraLectura hasta que el Slice correspondiente implemente la pantalla
// real siguiente (retomando S3-010 — salario/IBC — u otro bloque pendiente
// del Expediente Pensional, todavía sin decidir).

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function SiguientePasoTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--siguiente-paso">
        Sigamos construyendo tu expediente
      </h1>

      <p className="screen__subtitle">
        Ya tienes una primera lectura de tu situación. En los siguientes
        pasos seguiremos agregando la información que la hará más precisa.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default SiguientePasoTemporal
