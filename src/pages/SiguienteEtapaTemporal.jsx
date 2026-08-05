// Vista temporal: destino provisional del botón "Continuar" de IndiciosRegimenTransicion
// hasta que el Slice correspondiente implemente la pantalla real siguiente
// (candidatos todavía sin decidir: salario/IBC, la vía de tiempo de servicio del
// régimen de transición, u otro bloque pendiente del Expediente Pensional).
//
// Observación de UX registrada durante la revisión visual del Slice de indicios de
// régimen de transición (sin implementar todavía): esta pantalla cumple su función
// de placeholder, pero se percibe como una simple transición, no como progreso.
// Antes del MVP, revisar si necesita transmitir una sensación más clara de avance y
// continuidad — ver docs/gestion/cierre-sprint-3.md para el registro completo.

/**
 * @param {Object} props
 * @param {() => void} props.onVolver
 */
function SiguienteEtapaTemporal({ onVolver }) {
  return (
    <div className="screen">
      <h1 className="screen__title screen__title--siguiente-paso">
        Sigamos construyendo tu expediente
      </h1>

      <p className="screen__subtitle">
        Ya tienes dos primeras lecturas de tu situación. En los siguientes pasos
        seguiremos agregando la información que las hará más precisas.
      </p>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default SiguienteEtapaTemporal
