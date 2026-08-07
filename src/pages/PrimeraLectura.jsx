// Pantalla funcional "Una primera lectura de tu situación": consume dos
// evidencias reales de domain/ (semanas mínimas y edad de pensión en RPM) y
// las traduce a lenguaje conversacional. No captura ningún dato nuevo —
// interpreta, de forma trazable y calificada, lo que ya se sabe.

import { evaluarSemanasMinimas } from '../domain/evidenciaSemanasMinimas.js'
import { evaluarEdadPension } from '../domain/evidenciaEdadPension.js'

const TEXTOS_NO_EVALUABLE_SEMANAS = {
  regimen_no_rpm:
    'Todavía no podemos hacer esta comparación porque tu régimen actual (fondo ' +
    'privado) no tiene un requisito equivalente de semanas mínimas — ese camino ' +
    'se evalúa distinto, y lo iremos construyendo más adelante.',
  regimen_desconocido:
    'Todavía no podemos hacer esta comparación porque no tenemos claro en qué ' +
    'régimen estás cotizando.',
  semanas_desconocidas:
    'Todavía no podemos hacer esta comparación porque no conoces cuántas ' +
    'semanas has cotizado — en cuanto tengas una idea, aunque sea aproximada, ' +
    'podremos hacer esta lectura.',
  semanas_invalidas: 'Todavía no podemos hacer esta comparación con la información que tenemos.',
  sexo_no_valido: 'Todavía no podemos hacer esta comparación con la información que tenemos.',
}

const TEXTOS_NO_EVALUABLE_EDAD = {
  regimen_no_rpm:
    'Todavía no podemos comparar tu edad con el requisito de pensión porque tu ' +
    'régimen actual (fondo privado) no tiene un requisito equivalente en este ' +
    'alcance — ese camino lo iremos construyendo más adelante.',
  regimen_desconocido:
    'Todavía no podemos hacer esta comparación porque no tenemos claro en qué ' +
    'régimen estás cotizando.',
  sexo_no_valido: 'Todavía no podemos hacer esta comparación con la información que tenemos.',
  fecha_nacimiento_invalida:
    'Todavía no podemos comparar tu edad con el requisito general porque tu ' +
    'fecha de nacimiento no quedó registrada correctamente.',
}

// Semanas y edad se gatean sobre las mismas condiciones compartidas (régimen,
// sexo) — cuando ambas evidencias resultan no_evaluable por la MISMA razón,
// no es casualidad: es la misma causa evaluada dos veces. Estos textos
// combinan ambas explicaciones en un solo mensaje en vez de repetir casi lo
// mismo dos veces. La combinación ocurre solo en la interfaz, a partir de los
// resultados que el dominio ya produjo — ninguna evidencia cambia.
const TEXTOS_NO_EVALUABLE_COMBINADO = {
  regimen_no_rpm:
    'Todavía no podemos comparar tus semanas ni tu edad con los requisitos de ' +
    'pensión, porque tu régimen actual (fondo privado) no tiene un requisito ' +
    'equivalente en este alcance — ese camino lo iremos construyendo más adelante.',
  regimen_desconocido:
    'Todavía no podemos hacer estas comparaciones porque no tenemos claro en qué ' +
    'régimen estás cotizando.',
  sexo_no_valido: 'Todavía no podemos hacer estas comparaciones con la información que tenemos.',
}

const TEXTOS_LIMITACION = {
  REGIMEN_TRANSICION_NO_EVALUADO:
    'Estas lecturas usan el requisito general de la ley. Todavía no evalúan si ' +
    'tu caso está cobijado por el régimen de transición, un régimen anterior, o ' +
    'una condición especial que pueda modificar estos requisitos.',
  FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION:
    'Las normas que usamos para estas lecturas todavía están en revisión ' +
    'interna, así que estos números podrían ajustarse.',
}

function prefijoAproximado(certezaSemanas) {
  return certezaSemanas === 'aproximado' ? 'aproximadamente ' : ''
}

function textoEvidenciaSemanas(resultado) {
  const { estado, certezaSemanas, semanasMinimas, semanasDeclaradas, semanasFaltantes, semanasExcedentes } =
    resultado

  const referencia =
    `Tomando como referencia las ${prefijoAproximado(certezaSemanas)}${semanasDeclaradas} ` +
    `semanas que nos compartiste`

  if (estado === 'cumple') {
    const base =
      `${referencia}, ya alcanzarías el requisito general de semanas mínimas para ` +
      `pensión en Colpensiones (${semanasMinimas} semanas).`
    if (semanasExcedentes > 0) {
      const excedentes =
        certezaSemanas === 'conocido'
          ? `Llevas ${semanasExcedentes} semanas por encima de ese mínimo.`
          : `Si esa cifra aproximada es correcta, estarías aproximadamente ` +
            `${semanasExcedentes} semanas por encima del mínimo general.`
      return `${base} ${excedentes}`
    }
    return base
  }

  const faltan =
    certezaSemanas === 'conocido'
      ? `te faltan ${semanasFaltantes} semanas`
      : `te faltarían aproximadamente ${semanasFaltantes} semanas`

  return (
    `${referencia}, ${faltan} para alcanzar el requisito general de semanas mínimas ` +
    `en Colpensiones (${semanasMinimas}).`
  )
}

function textoEvidenciaEdad(resultado) {
  const { estado, edadRequerida, edadActual, aniosFaltantes, aniosExcedentes } = resultado

  if (estado === 'cumple') {
    const base =
      `Según tu fecha de nacimiento, ya cumples el requisito general de edad ` +
      `para pensión en Colpensiones —${edadRequerida} años, según la regla ` +
      `general que hoy podemos evaluar.`
    if (aniosExcedentes > 0) {
      return `${base} Tienes ${aniosExcedentes} años más que ese requisito.`
    }
    return base
  }

  return (
    `Según tu fecha de nacimiento, tienes ${edadActual} años. Te faltan ` +
    `${aniosFaltantes} años para alcanzar el requisito general de edad para ` +
    `pensión en Colpensiones —${edadRequerida} años, según la regla general ` +
    `que hoy podemos evaluar.`
  )
}

function textoVigencia({ vigenciaDesde, vigenciaHasta }) {
  if (!vigenciaDesde) return null
  return vigenciaHasta ? `Vigente desde ${vigenciaDesde} hasta ${vigenciaHasta}.` : `Vigente desde ${vigenciaDesde}.`
}

function BloqueEvidencia({ etiqueta, resultado, textoEvaluable, textosNoEvaluable, notaBase }) {
  return (
    <div className="insight">
      <p className="insight__label">{etiqueta}</p>

      {resultado.estado === 'no_evaluable' ? (
        <p className="insight__message">{textosNoEvaluable[resultado.razonNoEvaluable]}</p>
      ) : (
        <>
          <p className="insight__message">{textoEvaluable(resultado)}</p>
          {notaBase && <p className="insight__message">{notaBase}</p>}
          <details className="legal-detail">
            <summary>Ver fundamento legal</summary>
            <p>
              {resultado.normaUsada.fuente} — {resultado.normaUsada.articulo}
            </p>
            {textoVigencia(resultado.normaUsada) && <p>{textoVigencia(resultado.normaUsada)}</p>}
          </details>
        </>
      )}
    </div>
  )
}

/**
 * @param {Object} props
 * @param {'Mujer'|'Hombre'} props.sexo
 * @param {'RPM'|'RAIS'|'desconocido'} props.regimenActual
 * @param {'conocido'|'aproximado'|'desconocido'} props.nivelConocimientoSemanas
 * @param {string} props.semanasCotizadas
 * @param {string} props.fechaNacimiento
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function PrimeraLectura({
  sexo,
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  fechaNacimiento,
  onVolver,
  onContinuar,
}) {
  const resultadoSemanas = evaluarSemanasMinimas({
    sexo,
    regimenActual,
    nivelConocimientoSemanas,
    semanasCotizadas,
  })

  const resultadoEdad = evaluarEdadPension({
    sexo,
    regimenActual,
    fechaNacimiento,
  })

  const limitacionesCombinadas = Array.from(
    new Map(
      [...resultadoSemanas.limitaciones, ...resultadoEdad.limitaciones].map((l) => [l.codigo, l])
    ).values()
  )

  // Combinar solo cuando ambas evidencias comparten la misma razón — nunca
  // ocurre por una razón específica de una sola evidencia (ej.
  // semanas_desconocidas), solo por causas compartidas (régimen, sexo). Si el
  // texto combinado no existe para esa razón, se cae de vuelta a los dos
  // bloques por separado — nunca se muestra un mensaje vacío.
  const razonCompartida =
    resultadoSemanas.estado === 'no_evaluable' &&
    resultadoEdad.estado === 'no_evaluable' &&
    resultadoSemanas.razonNoEvaluable === resultadoEdad.razonNoEvaluable
      ? resultadoSemanas.razonNoEvaluable
      : null
  const textoCombinado = razonCompartida ? TEXTOS_NO_EVALUABLE_COMBINADO[razonCompartida] : null

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title screen__title--primera-lectura">
        Una primera lectura de tu situación
      </h1>

      <p className="screen__subtitle">
        Con lo que ya hemos comprendido de tu historia —tu régimen, tu sexo, tu
        fecha de nacimiento, y lo que sabes de tus semanas cotizadas— podemos
        hacer una primera comparación con dos requisitos generales de la ley:
        semanas y edad.
      </p>

      {textoCombinado ? (
        <div className="insight">
          <p className="insight__label">Lo que esto nos dice</p>
          <p className="insight__message">{textoCombinado}</p>
        </div>
      ) : (
        <>
          <BloqueEvidencia
            etiqueta="Lo que esto nos dice sobre tus semanas"
            resultado={resultadoSemanas}
            textoEvaluable={textoEvidenciaSemanas}
            textosNoEvaluable={TEXTOS_NO_EVALUABLE_SEMANAS}
            notaBase="Basado en la regla general que hoy podemos evaluar."
          />

          <BloqueEvidencia
            etiqueta="Lo que esto nos dice sobre tu edad"
            resultado={resultadoEdad}
            textoEvaluable={textoEvidenciaEdad}
            textosNoEvaluable={TEXTOS_NO_EVALUABLE_EDAD}
          />
        </>
      )}

      {limitacionesCombinadas.length > 0 && (
        <div className="field__warning">
          <p className="insight__label">Lo que todavía no hemos podido revisar</p>
          {limitacionesCombinadas.map(({ codigo }) => (
            <p key={codigo}>{TEXTOS_LIMITACION[codigo]}</p>
          ))}
        </div>
      )}

      <p className="screen__subtitle">
        Estas son apenas dos lecturas parciales de tu historia pensional. Ni
        siquiera cumplir ambos requisitos generales a la vez significa que tu
        expediente ya esté completo — todavía hay elementos que no hemos
        podido revisar, y que pueden cambiar lo que ves aquí. Seguiremos
        construyendo tu expediente paso a paso para comprender cada vez mejor
        tu situación pensional.
      </p>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary">
          Continuar
        </button>
      </div>
    </form>
  )
}

export default PrimeraLectura
