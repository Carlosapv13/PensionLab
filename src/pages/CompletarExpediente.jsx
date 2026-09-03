// Pantalla funcional de "Completemos tu expediente" (Slice S3-007; fusionada con
// ExpedientePensional.jsx el 2026-09-02 — feedback de usuaria real: dos pantallas
// introductorias seguidas, sin decisión real entre ellas, confundían más de lo que
// ayudaban). Única pantalla entre HistorialLaboral.jsx e InformacionPensionalEsencial.jsx:
// explica brevemente qué sigue y muestra el checklist de progreso del expediente — qué
// bloques ya tienen información básica registrada y cuál es el siguiente. No captura datos
// nuevos, no implementa reglas ni cálculos.
//
// Desde S3-008, el bloque "Información pensional esencial" y el siguiente
// bloque mostrado dependen del estado real capturado (infoEsencialCompletada),
// no de una etiqueta fija.

import { useRef } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'

const BLOQUES_BASE = [
  'Objetivo',
  'Datos personales',
  'Situación pensional',
  'Historial laboral',
]

/**
 * @param {Object} props
 * @param {boolean} props.infoEsencialCompletada
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function CompletarExpediente({ infoEsencialCompletada, onVolver, onContinuar }) {
  const bloquesRegistrados = infoEsencialCompletada
    ? [...BLOQUES_BASE, 'Información pensional esencial']
    : BLOQUES_BASE

  const bloqueSiguiente = infoEsencialCompletada
    ? 'Historia pensional'
    : 'Información pensional esencial'

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--completar-expediente">Completemos tu expediente</h1>

      <p className="screen__subtitle">
        Ya conocemos la información básica de tu caso. A partir de aquí iremos completando el
        resto de tu expediente pensional — la información que PensionLab necesita para calcular
        y comparar tus estrategias pensionales.
      </p>

      <p className="screen__subtitle screen__subtitle--secundario">
        No necesitas tenerlo todo listo desde el principio: iremos avanzando paso a paso, y te
        explicaremos qué falta y por qué es importante en cada momento.
      </p>

      <ul className="checklist">
        {bloquesRegistrados.map((bloque) => (
          <li key={bloque} className="checklist__item">
            <span className="checklist__label">{bloque}</span>
            <span className="badge badge--registrado">Información básica registrada</span>
          </li>
        ))}

        {/* Resalta el siguiente bloque solo con el borde/fondo de checklist__item--siguiente
            (App.css) — sin badge de acento: ese badge imitaba el color de .btn-primary sin
            tener ninguna acción real (feedback de usuaria real, 2026-09-02). */}
        <li className="checklist__item checklist__item--siguiente">
          <span className="checklist__label">{bloqueSiguiente}</span>
        </li>
      </ul>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary">
          Continuar con mi información pensional
        </button>
      </div>
    </form>
  )
}

export default CompletarExpediente
