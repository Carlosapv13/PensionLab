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
// Además de leer esa evidencia, esta pantalla captura dos datos nuevos —el
// detalle de dirección del traslado, y desde el Slice S4-001A la fecha en que
// se hizo efectivo— solo cuando `trasladoRegimen === 'si'` (capturado en
// HistoriaPensional.jsx, Slice S3-009, que permanece cerrado y sin tocar).
// Ninguno de los dos es input de la evidencia: solo matizan qué limitación se
// muestra y qué queda registrado en el expediente.
//
// Ubicación en el recorrido: se mantiene dentro del flujo principal por decisión
// explícita (Principio 9 — un único caso real no basta para diseñar algo nuevo),
// pero dejó registrada una hipótesis arquitectónica formal, no solo un pendiente:
// "Panel de Hallazgos del Expediente Pensional" (ver expediente-pensional.md,
// Bloque 5 — Resultados, Decisión 14). Se diseñará solo cuando exista una segunda
// evidencia real que produzca la misma tensión de ubicación en el recorrido lineal.
//
// S4-001A (Slice complementario a S4-001, previo a S4-002): fechaTrasladoRegimen +
// certezaFechaTraslado se capturan y se guardan en el expediente — no se usan
// todavía en ningún cálculo, no se asume que equivalgan a la fecha de primera
// cotización bajo el régimen actual, y no se infiere de ellas ningún derecho,
// elegibilidad ni consecuencia económica. El detalle técnico/normativo completo
// (bloqueo §8.9, investigación normativa pendiente) vive en
// `docs/tecnico/arquitectura/entregable-2-pensionlab-responde-explora-y-explica.md`
// y en `src/data/legal/trazabilidad-normativa.md` — nunca en esta pantalla, que
// solo explica, en lenguaje breve, para qué sirve el dato hoy.

import { useRef } from 'react'
import { evaluarIndiciosTransicion } from '../domain/evidenciaIndiciosTransicion.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import CampoFechaDiaMesAnio from '../components/CampoFechaDiaMesAnio.jsx'
import { esFechaDiaMesAnioReal } from '../format/fechaDiaMesAnio.js'

const HOY = new Date().toISOString().slice(0, 10)

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

const OPCIONES_CERTEZA_FECHA_TRASLADO = [
  { valor: 'conocido', texto: 'La conozco' },
  { valor: 'aproximado', texto: 'Tengo una fecha aproximada' },
  { valor: 'desconocido', texto: 'No la conozco' },
]

// checkpoint E4-C1, Decisión 4 (2026-09-10, revisión de copy — el comportamiento de dominio
// no cambia: fechaTrasladoRegimen nunca se pasa a generarCaminosRPM.js, ver
// ProyectaTuPensionRPM.jsx). Reescrita para cubrir, sin ambigüedad, los cuatro puntos que la
// persona debe entender: (1) esta fecha solo UBICA el cambio de régimen dentro de su
// historia; (2) no determina por sí sola las semanas cotizadas; (3) no indica desde cuándo
// cotiza sobre su IBC actual (una pregunta distinta que hoy no se hace); (4) cambiarla no
// recalcula nada. La pregunta "¿Desde cuándo cotizas sobre este valor?" queda explícitamente
// fuera de este checkpoint — reservada para un checkpoint posterior sobre períodos de IBC
// declarados.
const TEXTO_EXPLICACION_FECHA_TRASLADO =
  'Esta fecha nos ayuda a ubicar tu cambio de régimen dentro de tu historia pensional — nada más.'

const TEXTO_HONESTIDAD_FECHA_TRASLADO =
  'Por ahora PensionLab la guarda en tu expediente, pero no la usa para ningún cálculo: no suma ni resta ' +
  'semanas cotizadas, y cambiarla no vuelve a calcular nada. Tampoco indica desde cuándo cotizas sobre tu ' +
  'base de cotización (IBC) actual — es un dato distinto que hoy no te preguntamos.'

// Solo valida que la fecha sea real y no futura — un traslado no puede haber ocurrido
// todavía. Ninguna otra regla de negocio (Principio 11: esta validación es de interfaz,
// no la barrera que protege el dominio, que hoy ni siquiera consume este dato).
function mensajeErrorFechaTraslado(fecha) {
  if (!fecha || !esFechaDiaMesAnioReal(fecha)) return null
  if (fecha > HOY) {
    return 'La fecha de traslado que ingresaste está en el futuro. Verifica ese dato antes de continuar.'
  }
  return null
}

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
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.certezaFechaTraslado
 * @param {(valor: string) => void} props.onCambiarCertezaFechaTraslado
 * @param {string} props.fechaTrasladoRegimen
 * @param {(fecha: string) => void} props.onCambiarFechaTrasladoRegimen
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function IndiciosRegimenTransicion({
  sexo,
  fechaNacimiento,
  trasladoRegimen,
  detalleTraslado,
  onCambiarDetalleTraslado,
  certezaFechaTraslado,
  onCambiarCertezaFechaTraslado,
  fechaTrasladoRegimen,
  onCambiarFechaTrasladoRegimen,
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

  const requiereFechaTraslado =
    trasladoRegimen === 'si' && (certezaFechaTraslado === 'conocido' || certezaFechaTraslado === 'aproximado')
  const faltaCertezaFechaTraslado = trasladoRegimen === 'si' && !certezaFechaTraslado
  const errorFechaTraslado = requiereFechaTraslado ? mensajeErrorFechaTraslado(fechaTrasladoRegimen) : null
  const fechaTrasladoIncompleta = requiereFechaTraslado && !esFechaDiaMesAnioReal(fechaTrasladoRegimen)
  const bloqueaPorFechaTraslado = faltaCertezaFechaTraslado || fechaTrasladoIncompleta || Boolean(errorFechaTraslado)

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

      {trasladoRegimen === 'si' && (
        <fieldset className="options options--secundario">
          <legend>¿Recuerdas cuándo se hizo efectivo tu traslado?</legend>

          {OPCIONES_CERTEZA_FECHA_TRASLADO.map(({ valor, texto }) => (
            <label key={valor} className="option">
              <input
                type="radio"
                name="certezaFechaTraslado"
                value={valor}
                checked={certezaFechaTraslado === valor}
                onChange={() => onCambiarCertezaFechaTraslado(valor)}
              />
              <span>{texto}</span>
            </label>
          ))}

          {requiereFechaTraslado && (
            <>
              <CampoFechaDiaMesAnio
                valor={fechaTrasladoRegimen}
                onCambiar={onCambiarFechaTrasladoRegimen}
                etiquetaDia="Día del traslado"
                etiquetaMes="Mes del traslado"
                etiquetaAnio="Año del traslado"
              />
              {errorFechaTraslado && (
                <div className="field__warning">
                  <p>{errorFechaTraslado}</p>
                </div>
              )}
            </>
          )}

          <p className="option__hint">{TEXTO_EXPLICACION_FECHA_TRASLADO}</p>
          <p className="option__hint">{TEXTO_HONESTIDAD_FECHA_TRASLADO}</p>
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
        <button type="submit" className="btn btn-primary" disabled={faltaDetalleTraslado || bloqueaPorFechaTraslado}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default IndiciosRegimenTransicion
