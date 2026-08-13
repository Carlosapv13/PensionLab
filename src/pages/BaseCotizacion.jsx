// Pantalla funcional "El valor sobre el que cotizas hoy" — Slice "Base actual
// de cotización". Reemplaza a SiguienteEtapaTemporal.jsx.
//
// Objetivo del Slice (no de esta pantalla en abstracto): obtener
// `ibcAplicableSimulacion`, con su origen y trazabilidad, para alimentar las
// primeras simulaciones — no conocer el ingreso general de la persona. La
// mecánica de captura es universal para los cinco casos jurídicos
// investigados (empleado, independiente en sus dos modalidades, mixto,
// cotización desde el exterior): se pregunta primero si la persona conoce el
// valor sobre el que cotiza hoy, con el mismo patrón de tres niveles ya
// validado para semanas cotizadas — nunca se intenta calcular el IBC de
// independientes, mixto ni exterior en este alcance (la investigación
// normativa encontró que el fundamento legal exacto del 40% para contrato de
// servicios está anulado —Sentencia C-068/2020— y que el piso para exterior
// tiene una discrepancia normativa sin resolver — ver
// domain/determinarBaseCotizacion.js y data/legal/trazabilidad-normativa.md).
//
// El valor original declarado nunca se sobrescribe: domain/determinarBaseCotizacion.js
// conserva ibcActualDeclarado/ibcActualCalculado por separado de
// ibcAplicableSimulacion (después de ajustes). Esta pantalla no produce ni
// deriva ningún "grado de estimación de la simulación" — esa síntesis
// pertenece al futuro Motor de Explicabilidad, cuando exista una Simulation
// real que combine este dato con los demás (decisión explícita, ver
// expediente-pensional.md, Bloque 2).
//
// Cambio de fase reconocido dentro del propio subtítulo, sin pantalla de
// pausa aparte: hasta IndiciosRegimenTransicion, PensionLab interpretaba
// elegibilidad; desde aquí empieza a reunir insumos para una estimación
// económica. Se decidió explícitamente no crear una vista intermedia solo
// para señalar ese quiebre — el riesgo de fatiga ya registrado (ver
// cierre-sprint-3.md) pesó más que la ganancia narrativa de una pantalla sin
// captura ni resultado propio.

import { determinarBaseCotizacion } from '../domain/determinarBaseCotizacion.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import { formatearPesos } from '../format/formatearDinero.js'
import CampoMonetario from '../components/CampoMonetario.jsx'

const OPCIONES_CERTEZA = [
  { valor: 'conocido', texto: 'Lo conozco.' },
  { valor: 'aproximado', texto: 'Tengo una idea aproximada.' },
  { valor: 'desconocido', texto: 'No lo conozco.' },
]

// Ayuda contextual: "dónde encontrarlo", no "por qué lo necesitamos" — esa
// segunda parte ya la cubre el texto principal antes del fieldset. Vive como
// hint dentro del fieldset (mismo patrón que "Sexo para efectos pensionales"
// en DatosIniciales.jsx), no como párrafo introductorio.
function textoAyudaContextual(tipoCotizante, lugarCotizacion) {
  if (lugarCotizacion === 'exterior') {
    return (
      'Es el valor que elegiste al afiliarte voluntariamente a través de Colpensiones — puedes verificarlo en tu ' +
      'comprobante de pago o en el portal de Colpensiones para colombianos en el exterior.'
    )
  }
  if (tipoCotizante === 'empleado') {
    return 'Puedes encontrarlo en tu desprendible de pago, como el valor base sobre el que se calculan tus aportes.'
  }
  if (tipoCotizante === 'independiente') {
    return (
      'Es el valor que reportas cada mes en la Planilla Integrada de Liquidación de Aportes (PILA), ' +
      'directamente o a través de quien te gestione los aportes.'
    )
  }
  if (tipoCotizante === 'ambos') {
    return 'Es el valor total que reportas hoy para tus aportes a pensión.'
  }
  return 'Es el valor sobre el que actualmente se calculan tus aportes a pensión.'
}

function textoResultado(resultado) {
  const { origenDatoIbc, certezaValorDeclarado, ibcAplicableSimulacion, ibcActualDeclarado, ibcActualCalculado, razonNoApto } =
    resultado

  // Distinto del caso "sin dato en absoluto" de abajo: aquí sí hay un valor
  // capturado (declarado o estimado), pero el dominio ya determinó que no es
  // apto para simulación por estar bajo el piso legal — nunca se oculta lo
  // que la persona escribió, y nunca se reutiliza el mensaje genérico de
  // "todavía no tenemos este dato", que sería falso en este caso.
  if (ibcAplicableSimulacion === null && razonNoApto === 'valor_bajo_piso_legal') {
    const valorCapturado = ibcActualDeclarado ?? ibcActualCalculado

    // Solo la ruta "declarado por el usuario" (conocido/aproximado) bloquea
    // Continuar (ver puedeContinuar más abajo) — la persona afirmó conocer
    // este valor, y el dominio ya determinó que no puede ser correcto, así
    // que el mensaje debe explicar el bloqueo y las dos salidas posibles:
    // corregirlo o declarar que no lo conoce. La ruta de estimación desde
    // salario (origenDatoIbc === 'calculado_desde_dato_declarado') es una
    // ayuda opcional de menor confianza — nunca bloquea, mismo criterio ya
    // usado para "Puedes continuar sin usar esta ayuda" — así que conserva un
    // mensaje que solo informa, sin hablar de un bloqueo que no existe ahí.
    if (origenDatoIbc === 'declarado_por_usuario') {
      const prefijo = certezaValorDeclarado === 'aproximado' ? 'aproximadamente ' : ''
      return (
        `Registramos ${prefijo}${formatearPesos(valorCapturado)}, pero ese valor está por debajo del salario ` +
        'mínimo legal, así que no podemos continuar con él como base de tus simulaciones. Puedes corregir el ' +
        'valor si crees que hay un error, o elegir "No lo conozco" para continuar sin él — no lo usaremos hasta ' +
        'que puedas confirmarlo.'
      )
    }

    return (
      `Con tu salario calculamos ${formatearPesos(valorCapturado)} como estimación, pero ese valor está por ` +
      'debajo del salario mínimo legal — no lo usaremos todavía para tus simulaciones. Puedes continuar igual; ' +
      'lo guardamos tal como lo diste.'
    )
  }

  if (ibcAplicableSimulacion === null) {
    return (
      'Todavía no tenemos este dato, pero puedes continuar igual. Más adelante podremos ayudarte a completarlo ' +
      'con tu historia de aportes o tu historia laboral oficial.'
    )
  }

  const valorFormateado = formatearPesos(ibcAplicableSimulacion)

  if (origenDatoIbc === 'calculado_desde_dato_declarado') {
    return (
      `Con tu salario, calculamos una primera estimación de tu base: ${valorFormateado}. Es aproximada — no ` +
      'reemplaza tu base verificada, y más adelante podremos ajustarla.'
    )
  }

  const prefijo = certezaValorDeclarado === 'aproximado' ? 'aproximadamente ' : ''
  return (
    `Con ${prefijo}${valorFormateado} construiremos tus primeras estimaciones. Más adelante podremos confirmar ` +
    'si coincide con la información oficial.'
  )
}

function textoAjusteTecho(ajustesAplicados) {
  const ajuste = ajustesAplicados.find((a) => a.codigo === 'TOPE_MAXIMO_IBC')
  if (!ajuste) return null
  return (
    `El valor que nos diste (${formatearPesos(ajuste.valorAntes)}) supera el tope legal, así que usaremos ` +
    `${formatearPesos(ajuste.valorDespues)} para las simulaciones.`
  )
}

function textoVigencia({ vigenciaDesde, vigenciaHasta }) {
  if (!vigenciaDesde) return null
  return vigenciaHasta ? `Vigente desde ${vigenciaDesde} hasta ${vigenciaHasta}.` : `Vigente desde ${vigenciaDesde}.`
}

const CODIGOS_LIMITACION_FUENTE = ['FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION', 'SMLV_TRANSITORIO']

// Cuando no hay valor determinado, la limitación BASE_COTIZACION_NO_DETERMINADA
// ya queda comunicada como mensaje principal (ver textoResultado) — repetirla
// en el desplegable de limitaciones sería la misma idea dos veces. Mismo
// criterio para VALOR_BAJO_PISO_LEGAL: cuando dispara razonNoApto, ya queda
// comunicada como mensaje principal.
const CODIGOS_LIMITACION_YA_COMUNICADA_EN_MENSAJE = ['BASE_COTIZACION_NO_DETERMINADA', 'VALOR_BAJO_PISO_LEGAL']

/**
 * @param {Object} props
 * @param {'empleado'|'independiente'|'ambos'|null} props.tipoCotizante
 * @param {'colombia'|'exterior'|'ambos'|null} props.lugarCotizacion
 * @param {'conocido'|'aproximado'|'desconocido'|null} props.certezaBaseCotizacion
 * @param {(valor: string) => void} props.onCambiarCertezaBaseCotizacion
 * @param {string} props.valorBaseCotizacionDeclarado
 * @param {(valor: string) => void} props.onCambiarValorBaseCotizacionDeclarado
 * @param {string} props.salarioParaEstimarBase
 * @param {(valor: string) => void} props.onCambiarSalarioParaEstimarBase
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function BaseCotizacion({
  tipoCotizante,
  lugarCotizacion,
  certezaBaseCotizacion,
  onCambiarCertezaBaseCotizacion,
  valorBaseCotizacionDeclarado,
  onCambiarValorBaseCotizacionDeclarado,
  salarioParaEstimarBase,
  onCambiarSalarioParaEstimarBase,
  onVolver,
  onContinuar,
}) {
  const resultado = certezaBaseCotizacion
    ? determinarBaseCotizacion({
        certeza: certezaBaseCotizacion,
        valorDeclarado: valorBaseCotizacionDeclarado,
        tipoCotizante,
        lugarCotizacion,
        salarioParaEstimar: salarioParaEstimarBase,
        fecha: new Date().toISOString().slice(0, 10),
      })
    : null

  const requiereValorDeclarado = certezaBaseCotizacion === 'conocido' || certezaBaseCotizacion === 'aproximado'
  const faltaValorDeclarado = requiereValorDeclarado && valorBaseCotizacionDeclarado.trim() === ''

  // Bloquea únicamente cuando la persona afirmó conocer el valor (conocido/
  // aproximado) y el dominio ya determinó que no es apto para simulación —
  // nunca para la ruta de estimación desde salario (origenDatoIbc
  // 'calculado_desde_dato_declarado'), que es una ayuda opcional de menor
  // confianza y nunca fue pensada para bloquear el recorrido. Tampoco afecta
  // a lugarCotizacion === 'exterior' ni a otros casos no evaluables: el
  // dominio nunca fija razonNoApto ahí (ver determinarBaseCotizacion.js).
  const valorDeclaradoNoApto =
    requiereValorDeclarado && resultado?.razonNoApto === 'valor_bajo_piso_legal'

  const puedeContinuar = Boolean(certezaBaseCotizacion) && !faltaValorDeclarado && !valorDeclaradoNoApto

  const limitacionesFuncionales = resultado
    ? resultado.limitaciones.filter(
        (l) =>
          !CODIGOS_LIMITACION_FUENTE.includes(l.codigo) &&
          !CODIGOS_LIMITACION_YA_COMUNICADA_EN_MENSAJE.includes(l.codigo)
      )
    : []
  const limitacionesFuente = resultado
    ? resultado.limitaciones.filter((l) => CODIGOS_LIMITACION_FUENTE.includes(l.codigo))
    : []

  // Llamados incondicionalmente (Reglas de los Hooks), aunque sus campos
  // solo se rendericen bajo ciertas condiciones más abajo.
  const campoValorDeclarado = useCampoMonetario(valorBaseCotizacionDeclarado, onCambiarValorBaseCotizacionDeclarado)
  const campoSalarioParaEstimar = useCampoMonetario(salarioParaEstimarBase, onCambiarSalarioParaEstimarBase)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio}>
      <h1 className="screen__title screen__title--base-cotizacion">El valor sobre el que cotizas hoy</h1>

      <p className="screen__subtitle">
        Hasta aquí comprendimos algunos aspectos básicos de tu situación pensional. A partir de ahora empezamos a
        reunir lo necesario para construir tus primeras estimaciones económicas — y esto es lo primero que
        necesitamos: la base con la que se calculan tus aportes.
      </p>

      <p className="screen__subtitle">
        Todas las simulaciones empiezan con este dato. Es el valor sobre el que actualmente realizas tus aportes a
        pensión. Si no recuerdas el número exacto, no te preocupes; podremos ayudarte o verificarlo más adelante.
      </p>

      <fieldset className="options">
        <legend>¿Sabes sobre qué valor cotizas actualmente para pensión?</legend>

        <p className="option__hint">{textoAyudaContextual(tipoCotizante, lugarCotizacion)}</p>

        {OPCIONES_CERTEZA.map(({ valor, texto }) => (
          <label key={valor} className="option">
            <input
              type="radio"
              name="certezaBaseCotizacion"
              value={valor}
              checked={certezaBaseCotizacion === valor}
              onChange={() => onCambiarCertezaBaseCotizacion(valor)}
            />
            <span>{texto}</span>
          </label>
        ))}
      </fieldset>

      {requiereValorDeclarado && (
        <label className="field">
          <span className="field__label">Valor sobre el que cotizas (en pesos)</span>
          <CampoMonetario {...campoValorDeclarado} />
        </label>
      )}

      {certezaBaseCotizacion === 'desconocido' && tipoCotizante === 'empleado' && (
        <label className="field">
          <span className="field__label">
            ¿Conoces tu salario mensual? Podemos estimar tu base a partir de él (opcional).
          </span>
          <p className="option__hint">
            Es una reconstrucción aproximada, no un cálculo exacto: usa la regla general y no cubre salario
            integral, pagos no constitutivos de salario ni varias relaciones laborales simultáneas. No reemplaza
            una base verificada. Puedes continuar sin usar esta ayuda.
          </p>
          <CampoMonetario {...campoSalarioParaEstimar} />
        </label>
      )}

      {resultado && (
        <div className="insight">
          <p className="insight__label">Lo que esto significa</p>
          <p className="insight__message">{textoResultado(resultado)}</p>

          {textoAjusteTecho(resultado.ajustesAplicados) && (
            <p className="insight__message">{textoAjusteTecho(resultado.ajustesAplicados)}</p>
          )}

          {resultado.normaUsada && (
            <details className="legal-detail">
              <summary>Ver fundamento legal — {resultado.normaUsada.articulo}</summary>
              <p>{resultado.normaUsada.fuente}</p>
              {textoVigencia(resultado.normaUsada) && <p>{textoVigencia(resultado.normaUsada)}</p>}
              {limitacionesFuente.map(({ codigo, mensaje }) => (
                <p key={codigo}>{mensaje}</p>
              ))}
            </details>
          )}
        </div>
      )}

      {limitacionesFuncionales.length > 0 && (
        <details className="field__warning">
          <summary>Ver qué aspectos todavía no evalúa esta lectura ({limitacionesFuncionales.length})</summary>
          {limitacionesFuncionales.map(({ codigo, mensaje }) => (
            <p key={codigo}>{mensaje}</p>
          ))}
        </details>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary" disabled={!puedeContinuar}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default BaseCotizacion
