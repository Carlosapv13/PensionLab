// E6.6 (sprint-4-correcciones-oscar-baldor, PL-260 §9.1/§9.6) — "Nivel completo": sección
// propia y explícita para las políticas jurídicas involucradas en el ejercicio
// (`politicasJuridicas`, salida literal de `evaluarPoliticasEjercicioRPM.js`, vía el modelo
// visual de E6.2). `nombre`/`estado`/`aplicaAEsteEjercicio`/`mensaje` se reexponen tal cual —
// este componente nunca redacta una conclusión jurídica propia ni resume el mensaje del
// comparador (mismo principio ya fijado en evaluarPoliticasEjercicioRPM.js, decisión #6).
//
// Vacío (`politicas.length === 0`) es un estado de dominio válido — significa que ninguna
// política evaluable quedó pendiente o aplicable a este ejercicio (ver decisiones #8/#9 de
// evaluarPoliticasEjercicioRPM.js: nunca se fabrica una entrada RESUELTA inerte) — este
// componente entonces no renderiza nada, nunca una sección vacía.
//
// E6.7 (PL-260 §9.6) — useId() (no un id literal fijo) para el id de aria-labelledby: mismo
// criterio ya usado en ConfirmacionContinuidadCotizacion.jsx, para que dos instancias de este
// componente en la misma página (hoy no ocurre, pero nada lo impide) nunca colisionen. Se
// llama ANTES del return temprano de abajo — las reglas de Hooks de React exigen el mismo
// orden de llamadas en cada render, nunca condicionado por un return anterior.

// Corrección de auditoría visual (2026-09-25, hallazgo de revisión con capturas reales de
// Carlos, Caso B): `politica.nombre` es un identificador interno de código
// (`NOMBRE_POLITICA_ANCLA_INCREMENTO_MUJER = 'PoliticaAnclaIncrementoMujer'`,
// evaluarPoliticasEjercicioRPM.js — contrato cerrado, sin tocar) — se mostraba tal cual como
// el título visible de esta sección. `etiquetaNombrePolitica` (nivelCompletoAuditable.helpers.js
// — única fuente de esta traducción, reutilizada también por `mensajePasoPendienteDePolitica`
// para que ambos lugares nunca queden inconsistentes entre sí) lo traduce a una descripción
// legible, citando el mismo fundamento legal (Art. 34) que el propio `politica.mensaje` ya
// usa — nunca inventa una posición jurídica, solo nombra de qué trata la política, tal como
// PL-260 §2 ya la describe ("el ancla del incremento de tasa de reemplazo, Art. 34").
// `politica.mensaje` en sí (el texto jurídico completo, reexpuesto sin cambios más abajo)
// nunca incluyó el identificador interno — solo el título lo hacía.

import { useId } from 'react'
import { etiquetaNombrePolitica } from '../pages/nivelCompletoAuditable.helpers.js'

const ETIQUETAS_ESTADO_POLITICA = {
  NO_RESUELTA: 'No resuelta',
  RESUELTA: 'Resuelta',
}

/**
 * @param {Object} props
 * @param {Array<{nombre: string, estado: ('RESUELTA'|'NO_RESUELTA'), aplicaAEsteEjercicio: boolean, mensaje: string}>} props.politicas
 */
export default function PoliticasJuridicasInvolucradas({ politicas }) {
  const idTitulo = useId()

  if (!Array.isArray(politicas) || politicas.length === 0) return null

  return (
    <section className="politicas-juridicas" aria-labelledby={idTitulo}>
      <p className="screen__subtitle screen__subtitle--secundario" id={idTitulo}>
        Políticas jurídicas de este ejercicio
      </p>
      <ul className="politicas-juridicas__lista">
        {politicas.map((politica) => (
          <li className="politicas-juridicas__item" key={politica.nombre}>
            <p className="politicas-juridicas__nombre">
              {etiquetaNombrePolitica(politica.nombre)}
              <span className="politicas-juridicas__estado">
                {' — '}
                {ETIQUETAS_ESTADO_POLITICA[politica.estado] ?? politica.estado}
              </span>
            </p>
            <p className="camino-celda__nota">
              {politica.aplicaAEsteEjercicio ? 'Aplica a este ejercicio.' : 'No aplica a este ejercicio.'}
            </p>
            <p className="insight__message">{politica.mensaje}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
