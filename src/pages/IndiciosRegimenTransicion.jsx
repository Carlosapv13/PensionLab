// Pantalla funcional "Posibles indicios de régimen de transición" (renombrada
// desde "Una segunda lectura de tu situación" por ser demasiado genérica: no
// comunicaba qué se estaba evaluando). El título nombra el tema directamente,
// manteniendo el lenguaje no concluyente ya exigido para esta evidencia —
// "posibles indicios", nunca "tu régimen de transición" a secas. Consume una
// tercera evidencia real de domain/: un screening preliminar evaluado únicamente
// por la vía de edad (ver domain/evidenciaIndiciosTransicion.js y
// data/legal/trazabilidad-normativa.md para el alcance y la investigación
// normativa completa).
//
// Además de leer esa evidencia, esta pantalla captura un único dato nuevo —el
// detalle de dirección del traslado— solo cuando `trasladoRegimen === 'si'`
// (capturado en HistoriaPensional.jsx, Slice S3-009, que permanece cerrado y sin
// tocar). El detalle nunca es input de la evidencia: solo matiza qué limitación se
// muestra.
//
// Ubicación en el recorrido: se mantiene dentro del flujo principal por decisión
// explícita (Principio 9 — un único caso real no basta para diseñar algo nuevo),
// pero dejó registrada una hipótesis arquitectónica formal, no solo un pendiente:
// "Panel de Hallazgos del Expediente Pensional" (ver expediente-pensional.md,
// Bloque 5 — Resultados, Decisión 14). Se diseñará solo cuando exista una segunda
// evidencia real que produzca la misma tensión de ubicación en el recorrido lineal.

import { useRef } from 'react'
import { evaluarIndiciosTransicion } from '../domain/evidenciaIndiciosTransicion.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'

const TEXTOS_NO_EVALUABLE = {
  sexo_no_valido: 'Todavía no podemos hacer esta lectura con la información que tenemos.',
  fecha_nacimiento_invalida:
    'Todavía no podemos hacer esta lectura porque tu fecha de nacimiento no quedó ' +
    'registrada correctamente.',
}

const OPCIONES_DETALLE_TRASLADO = [
  { valor: 'rpm_a_rais', texto: 'De Colpensiones a un fondo privado.' },
  { valor: 'rais_a_rpm', texto: 'De un fondo privado a Colpensiones.' },
  { valor: 'multiple', texto: 'Me he trasladado más de una vez.' },
  {
    valor: 'no_estoy_seguro',
    texto: 'No estoy seguro de la dirección exacta.',
    ayuda: "No pasa nada si no recuerdas la dirección exacta: elegir 'No estoy seguro' es suficiente para continuar.",
  },
]

function textoIndicios(resultado) {
  const { estado, edadA1994 } = resultado

  if (estado === 'con_indicios') {
    return (
      `Según tu fecha de nacimiento, tenías ${edadA1994} años el 1 de abril de 1994 ` +
      `—la fecha en que entró en vigencia el sistema de pensiones actual—. Por la ` +
      `vía de edad, esto es un indicio de que el régimen de transición podría ` +
      `aplicarte, aunque no lo confirma por sí solo: todavía faltan otras ` +
      `condiciones que esta lectura no evalúa.`
    )
  }

  return (
    `Según tu fecha de nacimiento, tenías ${edadA1994} años el 1 de abril de 1994 ` +
    `—la fecha en que entró en vigencia el sistema de pensiones actual—. Con este ` +
    `dato, por la vía de edad, no encontramos indicios de que el régimen de ` +
    `transición pueda aplicar a tu caso. Esto no permite descartarlo por completo, ` +
    `porque esta lectura todavía no evalúa la otra vía prevista por la ley.`
  )
}

function textoVigencia({ vigenciaDesde, vigenciaHasta }) {
  if (!vigenciaDesde) return null
  return vigenciaHasta ? `Vigente desde ${vigenciaDesde} hasta ${vigenciaHasta}.` : `Vigente desde ${vigenciaDesde}.`
}

function limitacionTraslado(trasladoRegimen) {
  if (trasladoRegimen !== 'si') return null
  return {
    codigo: 'REGIMEN_TRANSICION_TRASLADO_NO_EVALUADO',
    mensaje:
      'Como te has trasladado alguna vez entre regímenes, esta lectura tampoco ' +
      'evalúa cómo pudo afectar eso a tu régimen de transición — es un tema ' +
      'legalmente más complejo que construiremos más adelante.',
  }
}

/**
 * @param {Object} props
 * @param {'Mujer'|'Hombre'} props.sexo
 * @param {string} props.fechaNacimiento
 * @param {string | null} props.trasladoRegimen
 * @param {string | null} props.detalleTraslado
 * @param {(valor: string) => void} props.onCambiarDetalleTraslado
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function IndiciosRegimenTransicion({
  sexo,
  fechaNacimiento,
  trasladoRegimen,
  detalleTraslado,
  onCambiarDetalleTraslado,
  onVolver,
  onContinuar,
}) {
  const resultado = evaluarIndiciosTransicion({ sexo, fechaNacimiento })

  // Aspectos funcionales que esta lectura todavía no evalúa (tiempo de servicio,
  // vigencia posterior, y traslado cuando corresponde) — se muestran en un
  // desplegable propio. El estado de la fuente normativa (borrador/no lista para
  // producción) es un dato distinto: pertenece al fundamento legal, no a esta
  // lista, así que se excluye aquí y se muestra junto a la norma citada.
  const limitacionesFuncionales = resultado.limitaciones.filter(
    (l) => l.codigo !== 'FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION'
  )
  const limTraslado = limitacionTraslado(trasladoRegimen)
  if (limTraslado) limitacionesFuncionales.push(limTraslado)

  const limitacionFuente = resultado.limitaciones.find(
    (l) => l.codigo === 'FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION'
  )

  const faltaDetalleTraslado = trasladoRegimen === 'si' && !detalleTraslado

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--indicios-transicion">
        Posibles indicios de régimen de transición
      </h1>

      <p className="screen__subtitle">
        El régimen de transición permite que algunas personas se pensionen con
        reglas anteriores, que en ciertos casos pueden ser más favorables. Esta
        lectura busca únicamente un primer indicio de si podría ser relevante
        para ti; no es una conclusión definitiva.
      </p>

      {trasladoRegimen === 'si' && (
        <fieldset className="options options--secundario">
          <legend>
            Nos contaste que te has trasladado alguna vez entre Colpensiones y un
            fondo privado. ¿En qué dirección fue?
          </legend>

          {OPCIONES_DETALLE_TRASLADO.map(({ valor, texto, ayuda }) => (
            <label key={valor} className="option">
              <input
                type="radio"
                name="detalleTraslado"
                value={valor}
                checked={detalleTraslado === valor}
                onChange={() => onCambiarDetalleTraslado(valor)}
              />
              <span>
                {texto}
                {ayuda && <span className="option__hint">{ayuda}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="insight">
        <p className="insight__label">Lo que esto nos dice</p>

        {resultado.estado === 'no_evaluable' ? (
          <p className="insight__message">{TEXTOS_NO_EVALUABLE[resultado.razonNoEvaluable]}</p>
        ) : (
          <>
            <p className="insight__message">{textoIndicios(resultado)}</p>
            <details className="legal-detail">
              <summary>Ver fundamento legal</summary>
              <p>
                {resultado.normaUsada.fuente} — {resultado.normaUsada.articulo}
              </p>
              {textoVigencia(resultado.normaUsada) && <p>{textoVigencia(resultado.normaUsada)}</p>}
              {limitacionFuente && <p>{limitacionFuente.mensaje}</p>}
            </details>
          </>
        )}
      </div>

      {limitacionesFuncionales.length > 0 && (
        <details className="field__warning">
          <summary>
            Ver qué aspectos todavía no evalúa esta lectura ({limitacionesFuncionales.length})
          </summary>
          {limitacionesFuncionales.map(({ codigo, mensaje }) => (
            <p key={codigo}>{mensaje}</p>
          ))}
        </details>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={faltaDetalleTraslado}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default IndiciosRegimenTransicion
