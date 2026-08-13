// Pantalla funcional "Lectura económica RPM con tu historia hasta hoy" — Slice "Primera
// lectura económica RPM desde historia estructurada".
//
// Nombre y semántica ya cerrados en el diseño del Slice: esto NO es una proyección a la
// edad objetivo de jubilación. Usa exclusivamente la historia de cotización observada
// hasta hoy — nunca proyecta IPC futuro, nunca asume trayectoria futura de IBC. Es el
// punto de partida para un Slice posterior que sí incorpore la trayectoria futura, no su
// reemplazo. Nunca debe presentarse como "tu pensión" ni como lo que la persona recibirá a
// su edad objetivo — mismo criterio de honestidad ya aplicado en ExploraTuProyeccion.jsx
// (RAIS) y QueDeterminaTuResultado.jsx.
//
// historiaCotizacion en este Slice solo se puebla vía el panel de desarrollo (fixtures) —
// no existe todavía una pantalla real de captura de historia laboral (fuera de alcance).
// El caso "sin historia" se maneja con el mismo criterio honesto ya usado en toda la app
// para datos que todavía no existen, nunca como un error.
//
// El dominio (calcularPensionRPM.js) solo entrega códigos estructurados de
// razonNoEvaluable — toda la redacción vive aquí, mismo criterio ya corregido en
// determinarBaseCotizacion.js y QueDeterminaTuResultado.jsx.

import { useRef } from 'react'
import { calcularPensionRPM } from '../domain/pensionEngine/calcularPensionRPM.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { formatearPesos } from '../format/formatearDinero.js'

const TEXTO_SIN_HISTORIA =
  'Conocemos algunos datos generales de tu historia, pero esta lectura económica necesita ' +
  'además conocer cómo estuvieron distribuidas tus cotizaciones y bases de cotización a lo ' +
  'largo del tiempo. Esta versión de PensionLab todavía no permite cargar esa historia con ' +
  'el detalle necesario.'

const TEXTO_CIERRE_SIN_HISTORIA = 'Hasta aquí llega la lectura económica RPM en esta versión de PensionLab.'

const TEXTO_NO_EVALUABLE = {
  VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS:
    'Encontramos huecos sin cotización dentro de los últimos 10 años de tu historia. Por ' +
    'ahora, PensionLab solo puede calcular tu IBL cuando esos 10 años están completamente ' +
    'cubiertos — no inventamos cómo tratar esos huecos, porque la forma correcta de ' +
    'hacerlo todavía no está confirmada.',
  PERIODOS_SUPERPUESTOS_NO_SOPORTADOS:
    'Encontramos períodos de tu historia que se superponen en el tiempo. PensionLab no ' +
    'puede calcular tu IBL sobre una historia con esa inconsistencia.',
  INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS:
    'Uno de los períodos de tu historia declara más días cotizados que días calendario ' +
    'tiene su propio rango de fechas — es un dato inconsistente que PensionLab no puede usar.',
  COTIZACION_PARCIAL_EN_VENTANA_IBL_NO_SOPORTADA:
    'Dentro de los últimos 10 años, encontramos un período con cotización parcial (menos ' +
    'días cotizados que días calendario). PensionLab no asume cuáles días fueron los ' +
    'cotizados, así que todavía no puede calcular tu IBL con esa información.',
}

const TEXTO_NO_EVALUABLE_GENERICO = 'Tu historia no es evaluable con la información disponible todavía.'

const TEXTO_NO_ES_PROYECCION =
  'Esta lectura usa exclusivamente tu historia de cotización observada hasta hoy. No ' +
  'incluye los años que te faltan por cotizar, no proyecta tu IBL ni tus semanas a una ' +
  'edad futura, y no es la pensión que recibirías al pensionarte — es un punto de ' +
  'partida, no una proyección.'

function textoIBL(ibl) {
  const definicion = 'El IBL es el ingreso promedio que la fórmula del RPM usa como base de cálculo. '
  if (ibl.esOpcionLegal) {
    return (
      definicion +
      `En tu caso es ${formatearPesos(ibl.aplicable)}, calculado sobre el promedio de toda tu vida ` +
      'laboral, porque la norma te permite elegir esa alternativa cuando resulta más ' +
      'favorable que la de los últimos 10 años.'
    )
  }
  return (
    definicion +
    `En tu caso es ${formatearPesos(ibl.aplicable)}, calculado sobre los últimos 10 años de tu historia.`
  )
}

function textoComparacionVidaLaboral(ibl) {
  const baseTexto =
    `Comparamos también el promedio de toda tu vida laboral (${formatearPesos(ibl.vidaLaboral.valor)}) ` +
    'porque ya tienes las semanas necesarias para tener esa opción legal — '
  return (
    baseTexto +
    (ibl.esOpcionLegal
      ? 'y resultó más favorable, así que es el que usamos.'
      : 'pero el de los últimos 10 años resultó más favorable, así que es el que usamos.')
  )
}

/**
 * @param {Object} props
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} props.historiaCotizacion
 * @param {() => void} props.onVolver
 */
function ExploraTuProyeccionRPM({ historiaCotizacion, onVolver }) {
  const sinHistoria = !historiaCotizacion || historiaCotizacion.length === 0
  const resultado = sinHistoria ? null : calcularPensionRPM({ historiaCotizacion })

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  return (
    <form className="screen" onSubmit={(e) => e.preventDefault()} ref={formRef}>
      <h1 className="screen__title screen__title--explora-tu-proyeccion-rpm">
        Lectura económica RPM con tu historia hasta hoy
      </h1>

      <p className="screen__subtitle screen__subtitle--secundario">{TEXTO_NO_ES_PROYECCION}</p>

      {sinHistoria && (
        <>
          <p className="screen__subtitle">{TEXTO_SIN_HISTORIA}</p>
          <p className="screen__subtitle screen__subtitle--secundario">{TEXTO_CIERRE_SIN_HISTORIA}</p>
        </>
      )}

      {resultado && resultado.estado === 'no_evaluable' && (
        <div className="insight">
          <p className="insight__label">Todavía no podemos calcular tu IBL</p>
          <p className="insight__message">
            {TEXTO_NO_EVALUABLE[resultado.razonNoEvaluable] ?? TEXTO_NO_EVALUABLE_GENERICO}
          </p>
        </div>
      )}

      {resultado && resultado.estado === 'calculado' && (
        <>
          <div className="insight">
            <p className="insight__label">IBL (Ingreso Base de Liquidación)</p>
            <p className="insight__message">{textoIBL(resultado.ibl)}</p>
            {resultado.ibl.vidaLaboral && (
              <p className="insight__message">{textoComparacionVidaLaboral(resultado.ibl)}</p>
            )}
          </div>

          <div className="insight">
            <p className="insight__label">Semanas observadas</p>
            <p className="insight__message">
              {resultado.semanasObservadas.toFixed(1)} semanas cotizadas, según tu historia.
            </p>
          </div>

          <div className="insight">
            <p className="insight__label">Tasa de reemplazo RPM</p>
            <p className="insight__message">
              La tasa de reemplazo es el porcentaje que la fórmula del RPM aplica a tu IBL. En tu caso es{' '}
              {resultado.tasaReemplazo.toFixed(2)}%.
            </p>
          </div>

          <div className="insight">
            <p className="insight__label">Resultado económico con tu historia hasta hoy</p>
            <p className="insight__message">
              Con tu historia observada hasta hoy, la fórmula da{' '}
              {formatearPesos(resultado.resultadoEconomicoActual)} mensuales. Este valor no es una proyección de
              la pensión que recibirás al jubilarte.
            </p>
          </div>

          {resultado.limitaciones.length > 0 && (
            <div className="comparacion-caminos__supuestos">
              <p className="screen__subtitle screen__subtitle--secundario comparacion-caminos__supuestos-titulo">
                Limitaciones de esta lectura
              </p>
              <ul className="comparacion-caminos__supuestos-lista">
                {resultado.limitaciones.map((l) => (
                  <li key={l.codigo}>{l.mensaje}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
      </div>
    </form>
  )
}

export default ExploraTuProyeccionRPM
