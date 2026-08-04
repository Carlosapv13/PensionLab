// Pantalla funcional "Una primera lectura de tu situación": primer punto del
// proyecto donde la interfaz consume una evidencia real de domain/ en vez de
// solo reflejar lo que la persona contó. No captura ningún dato nuevo —
// interpreta, de forma trazable y calificada, lo que ya se sabe.

import { evaluarSemanasMinimas } from '../domain/evidenciaSemanasMinimas.js'

const TEXTOS_NO_EVALUABLE = {
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

const TEXTOS_LIMITACION = {
  REGIMEN_TRANSICION_NO_EVALUADO:
    'Esta lectura utiliza el requisito general de semanas. Todavía no evalúa ' +
    'si en tu caso aplica alguna regla de transición, un régimen anterior o ' +
    'una condición especial que pueda modificar este requisito.',
  FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION:
    'La norma que usamos para este cálculo todavía está en revisión interna, ' +
    'así que este número podría ajustarse.',
}

function prefijoAproximado(certezaSemanas) {
  return certezaSemanas === 'aproximado' ? 'aproximadamente ' : ''
}

function textoEvidencia(resultado) {
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

function textoVigencia({ vigenciaDesde, vigenciaHasta }) {
  if (!vigenciaDesde) return null
  return vigenciaHasta ? `Vigente desde ${vigenciaDesde} hasta ${vigenciaHasta}.` : `Vigente desde ${vigenciaDesde}.`
}

/**
 * @param {Object} props
 * @param {'Mujer'|'Hombre'} props.sexo
 * @param {'RPM'|'RAIS'|'desconocido'} props.regimenActual
 * @param {'conocido'|'aproximado'|'desconocido'} props.nivelConocimientoSemanas
 * @param {string} props.semanasCotizadas
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function PrimeraLectura({
  sexo,
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  onVolver,
  onContinuar,
}) {
  const resultado = evaluarSemanasMinimas({
    sexo,
    regimenActual,
    nivelConocimientoSemanas,
    semanasCotizadas,
  })

  return (
    <div className="screen">
      <h1 className="screen__title screen__title--primera-lectura">
        Una primera lectura de tu situación
      </h1>

      <p className="screen__subtitle">
        Con lo que ya hemos comprendido de tu historia —tu régimen, tu sexo, y
        lo que sabes de tus semanas cotizadas— podemos hacer una primera
        comparación con el requisito general de la ley.
      </p>

      <div className="insight">
        <p className="insight__label">Nuestra primera lectura</p>

        {resultado.estado === 'no_evaluable' ? (
          <p className="insight__message">{TEXTOS_NO_EVALUABLE[resultado.razonNoEvaluable]}</p>
        ) : (
          <>
            <p className="insight__message">{textoEvidencia(resultado)}</p>

            <p className="insight__message">
              Basado en la legislación pensional vigente aplicable a este caso.
            </p>

            <details className="legal-detail">
              <summary>Ver fundamento legal</summary>
              <p>
                {resultado.normaUsada.fuente} — {resultado.normaUsada.articulo}
              </p>
              {textoVigencia(resultado.normaUsada) && <p>{textoVigencia(resultado.normaUsada)}</p>}
            </details>

            {resultado.limitaciones.map(({ codigo }) => (
              <p key={codigo} className="insight__message">
                {TEXTOS_LIMITACION[codigo]}
              </p>
            ))}
          </>
        )}
      </div>

      <p className="screen__subtitle">
        Cada dato nuevo que compartas con nosotros nos permitirá afinar esta
        lectura y acercarnos a una comprensión más precisa de tu situación
        pensional.
      </p>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="button" className="btn btn-primary" onClick={onContinuar}>
          Continuar
        </button>
      </div>
    </div>
  )
}

export default PrimeraLectura
