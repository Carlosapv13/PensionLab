// Pantalla funcional de la Capacidad B: permite a la persona expresar, en sus propias
// palabras, algo que le gustaría resolver sobre su futuro pensional — o declarar
// explícitamente que no tiene nada puntual por ahora. No interpreta, no clasifica, no
// reacciona a lo declarado — esa responsabilidad pertenece a la capacidad siguiente.
//
// Nombre de página y de estado deliberadamente provisionales: lo que se produce aquí
// ("declaración sin clasificar") sigue siendo una hipótesis de dominio, no un concepto
// consolidado (ver PL-050).
//
// No consume ningún dato del Expediente — ni siquiera el régimen. El estado se
// representa como una única variable con tres valores mutuamente excluyentes (sin
// definir / contenido / ausencia), nunca como dos datos independientes que deban
// sincronizarse — así la simultaneidad de ambos resultados queda excluida por
// construcción, no por vigilancia. Escribir contenido siempre reemplaza una ausencia
// previa; declarar ausencia siempre reemplaza y descarta el contenido previo — ningún
// borrador paralelo se conserva.
//
// Deliberadamente sin ejemplos en esta primera versión: no existe todavía evidencia,
// dentro del proyecto, de que la expresión libre bloquee a las personas — introducirlos
// sin esa evidencia sería anticipar una solución a un problema no observado.

/**
 * @param {Object} props
 * @param {{ tipo: 'contenido', texto: string } | { tipo: 'ausencia' } | null} props.declaracion
 * @param {(declaracion: { tipo: 'contenido', texto: string } | { tipo: 'ausencia' } | null) => void} props.onCambiarDeclaracion
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function DeclaracionLibre({ declaracion, onCambiarDeclaracion, onVolver, onContinuar }) {
  const texto = declaracion?.tipo === 'contenido' ? declaracion.texto : ''
  const puedeContinuar = declaracion?.tipo === 'contenido' || declaracion?.tipo === 'ausencia'

  function manejarCambioTexto(valor) {
    if (valor.trim() === '') {
      onCambiarDeclaracion(null)
      return
    }
    onCambiarDeclaracion({ tipo: 'contenido', texto: valor })
  }

  function declararAusencia() {
    onCambiarDeclaracion({ tipo: 'ausencia' })
  }

  return (
    <div className="screen">
      <h1 className="screen__title screen__title--declaracion-libre">
        ¿Hay algo sobre tu futuro pensional que te gustaría resolver?
      </h1>

      <p className="screen__subtitle">
        Ya sabes qué determina tu resultado y qué le falta a PensionLab para calcularlo.
        Si hay algo de tu futuro pensional que te gustaría resolver, cuéntanoslo con tus
        propias palabras — no hace falta que esté del todo definido, ni que uses términos
        técnicos.
      </p>

      <div className="field">
        <label className="visually-hidden" htmlFor="declaracion-libre-texto">
          ¿Hay algo sobre tu futuro pensional que te gustaría resolver?
        </label>
        <textarea
          id="declaracion-libre-texto"
          className="field__input field__textarea"
          value={texto}
          onChange={(e) => manejarCambioTexto(e.target.value)}
          rows={4}
        />
      </div>

      <button
        type="button"
        className={
          'btn btn-secondary' +
          (declaracion?.tipo === 'ausencia' ? ' btn-secondary--activo' : '')
        }
        onClick={declararAusencia}
      >
        No tengo nada puntual que plantear por ahora
      </button>

      {declaracion?.tipo === 'contenido' && (
        <p className="screen__subtitle">Recibimos lo que nos compartiste.</p>
      )}

      {declaracion?.tipo === 'ausencia' && (
        <p className="screen__subtitle">
          Tomamos nota de que, por ahora, no tienes nada puntual que plantear.
        </p>
      )}

      {!puedeContinuar && (
        <p className="screen__subtitle">
          Para continuar, cuéntanos algo que te gustaría resolver, o indícanos que no
          tienes nada puntual por ahora.
        </p>
      )}

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

export default DeclaracionLibre
