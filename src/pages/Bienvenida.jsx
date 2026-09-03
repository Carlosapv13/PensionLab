// Pantalla de Bienvenida: primer contacto del usuario con PensionLab (Slice S3-001).
//
// Control de alcance informativo, no interactivo (2026-09-03, feedback de usuaria real):
// Objetivo.jsx (motivo de consulta con 2 o 6 opciones seleccionables, según el bloque) se
// retiró del recorrido — la divulgación progresiva de dos pasos no resolvía el problema que
// motivó su creación, solo escondía las 4 categorías no atendidas detrás de un clic extra.
// Esta pantalla nombra esos casos como una advertencia de alcance (qué NO calcula
// PensionLab hoy), nunca como opciones que la persona deba elegir — sin radios, sin botón
// propio, sin desplegable que la esconda. El único botón establece motivoConsulta = 'vejez'
// y navega directo a DatosIniciales (ver App.jsx) — 0 selecciones y 0 clics adicionales
// frente a "Comenzar".

/**
 * @param {Object} props
 * @param {() => void} props.onComenzar
 */
function Bienvenida({ onComenzar }) {
  function manejarEnvio(e) {
    e.preventDefault()
    onComenzar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title screen__title--bienvenida">Bienvenido a PensionLab</h1>

      <p className="screen__subtitle">
        PensionLab te ayuda a entender y proyectar tu futura pensión de vejez.
      </p>

      <div className="field__warning">
        <p>
          Esta versión no analiza prestaciones por pérdida de capacidad para trabajar,
          protección de la familia por fallecimiento, pensiones ya reconocidas o solicitudes
          de reliquidación, ni reclamaciones, demandas o trámites en curso.
        </p>
        <p>
          Si tu consulta corresponde a alguno de estos casos, te recomendamos acudir
          directamente a tu fondo de pensiones o consultar con un profesional en seguridad
          social.
        </p>
      </div>

      <button type="submit" className="btn btn-primary" autoFocus>
        Proyectar mi pensión de vejez
      </button>
    </form>
  )
}

export default Bienvenida
