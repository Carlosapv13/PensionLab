// Pantalla funcional "Qué determina tu resultado": explica, a partir del régimen ya
// declarado, qué determina el resultado pensional de la persona y por qué todavía
// no se puede estimar con la confianza suficiente — sin capturar ningún dato nuevo. Título
// provisional, igual que el nombre de la función de dominio que consume — sujeto a
// revisión durante el cierre de este Slice.
//
// No repite nada ya mostrado por PrimeraLectura.jsx (semanas, edad legal, indicios
// de transición) ni por BaseCotizacion.jsx (IBC como cifra) — su territorio propio
// es exclusivamente el mecanismo económico y su vacío, nunca elegibilidad.
//
// Reutiliza el mismo patrón visual ya validado en PrimeraLectura.jsx (bloques
// .insight), en vez de introducir un patrón nuevo — Principio 9. El dominio
// (determinarMecanismoYFaltantes.js) entrega solo códigos estructurales; toda la
// redacción vive aquí, mismo criterio ya corregido en determinarBaseCotizacion.js.

import { determinarMecanismoYFaltantes } from '../domain/determinarMecanismoYFaltantes.js'

const TEXTO_MECANISMO = {
  MECANISMO_IBL_SEMANAS: {
    etiquetaDirecta: 'Bajo Colpensiones',
    etiquetaCondicional: 'Si tu régimen fuera Colpensiones',
    mensajeDirecto:
      'Tu pensión no se calcula sobre lo que cotizas hoy, sino sobre el promedio de lo ' +
      'que cotizaste durante tus últimos años de vida laboral. Hoy conocemos tu base ' +
      'de cotización actual, pero no esa historia completa. Por eso, aunque ya sabemos ' +
      'mucho de tu caso, todavía no podemos estimar tu pensión con la confianza suficiente.',
    mensajeCondicional:
      'Si tu régimen fuera Colpensiones, tu pensión no se calcularía sobre lo que ' +
      'cotizas hoy, sino sobre el promedio de lo que cotizaste durante tus últimos ' +
      'años de vida laboral. Esa historia tampoco la conocemos todavía.',
  },
  MECANISMO_CAPITAL_ACUMULADO: {
    etiquetaDirecta: 'Bajo tu fondo privado',
    etiquetaCondicional: 'Si tu régimen fuera un fondo privado',
    mensajeDirecto:
      'Tu pensión depende de lo que se acumule en tu cuenta individual: lo que ya ' +
      'tienes ahorrado, más lo que sigas aportando. Hoy no conocemos ese saldo, así ' +
      'que no podemos estimarla con la confianza suficiente. Y aunque lo ' +
      'conociéramos, cualquier proyección hacia el futuro también necesitaría ' +
      'conocer el horizonte de tiempo que tienes en mente para tu retiro — eso lo ' +
      'construiremos contigo más adelante, no todavía.',
    mensajeCondicional:
      'Si tu régimen fuera un fondo privado, tu pensión dependería de lo que se ' +
      'acumule en tu cuenta individual: lo que ya tienes ahorrado, más lo que sigas ' +
      'aportando. Ese saldo tampoco lo conocemos todavía.',
  },
}

const TEXTO_FALTA_REGIMEN =
  'Todavía no sabemos si cotizas en Colpensiones o en un fondo privado, y esa es, ' +
  'en sí misma, la primera pieza que nos falta.'

// Cierre explícito para los regímenes sin una capacidad posterior en esta
// versión (todo lo que no sea RAIS): en vez de un "Continuar" que no lleva a
// ningún lado, esta pantalla termina aquí para ese caso, con Volver
// disponible — mismo criterio de honestidad ya aplicado en ExploraTuProyeccion.jsx.
const TEXTO_CIERRE_SIN_CAPACIDAD_POSTERIOR =
  'PensionLab todavía no puede continuar este análisis en esta versión.'

function BloqueMecanismo({ codigo, condicional }) {
  const texto = TEXTO_MECANISMO[codigo]
  return (
    <div className="insight">
      <p className="insight__label">
        {condicional ? texto.etiquetaCondicional : texto.etiquetaDirecta}
      </p>
      <p className="insight__message">
        {condicional ? texto.mensajeCondicional : texto.mensajeDirecto}
      </p>
    </div>
  )
}

/**
 * @param {Object} props
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function QueDeterminaTuResultado({ regimenActual, onVolver, onContinuar }) {
  const resultado = determinarMecanismoYFaltantes({ regimenActual })
  const condicional = resultado.caso === 'desconocido'
  const faltaRegimen = resultado.elementosFaltantes.some((f) => f.codigo === 'FALTA_REGIMEN')
  // Slice "Primera lectura económica RPM desde historia estructurada": RPM deja de ser un
  // callejón sin salida en esta pantalla, igual que RAIS ya no lo era desde el Slice
  // "Motor de caminos RAIS".
  const tieneCapacidadPosterior = regimenActual === 'RAIS' || regimenActual === 'RPM'

  function manejarEnvio(e) {
    e.preventDefault()
    if (tieneCapacidadPosterior) onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title screen__title--que-determina-resultado">
        Qué determina tu resultado
      </h1>

      <p className="screen__subtitle">
        Ya conocemos tu régimen, tu historia de cotización y tu base actual. Antes de
        mostrarte cualquier número, queremos explicarte qué determina tu resultado —
        y qué le falta todavía a PensionLab para calcularlo con la confianza suficiente.
      </p>

      {faltaRegimen && (
        <div className="insight">
          <p className="insight__label">Lo que todavía no sabemos</p>
          <p className="insight__message">{TEXTO_FALTA_REGIMEN}</p>
        </div>
      )}

      {resultado.mecanismos.map((mecanismo) => (
        <BloqueMecanismo
          key={`${mecanismo.regimen}-${mecanismo.codigo}`}
          codigo={mecanismo.codigo}
          condicional={condicional}
        />
      ))}

      {tieneCapacidadPosterior ? (
        <p className="screen__subtitle">
          Así se construye tu expediente: pieza por pieza, no de una sola vez. Seguiremos
          avanzando paso a paso.
        </p>
      ) : (
        <p className="screen__subtitle">{TEXTO_CIERRE_SIN_CAPACIDAD_POSTERIOR}</p>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        {tieneCapacidadPosterior && (
          <button type="submit" className="btn btn-primary">
            Continuar
          </button>
        )}
      </div>
    </form>
  )
}

export default QueDeterminaTuResultado
