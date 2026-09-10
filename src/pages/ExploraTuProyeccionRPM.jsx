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
import { evaluarIndicioVidaLaboral } from '../domain/evidenciaIndicioVidaLaboral.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { formatearPesos } from '../format/formatearDinero.js'
import { formatearDiasFaltantesParaVentanaIBL } from '../format/aproximarDiasEnSemanasYMeses.js'

const TEXTO_SIN_HISTORIA =
  'Conocemos algunos datos generales de tu historia, pero esta lectura económica necesita ' +
  'además conocer cómo estuvieron distribuidas tus cotizaciones y bases de cotización a lo ' +
  'largo del tiempo. Esta versión de PensionLab todavía no permite cargar esa historia con ' +
  'el detalle necesario.'

const TEXTO_CIERRE_SIN_HISTORIA = 'Hasta aquí llega la lectura económica RPM en esta versión de PensionLab.'

// Ventana del IBL ordinario — convención técnica provisional de PensionLab, no una
// constante legal (ver src/data/legal/trazabilidad-normativa.md, sección "Convención
// técnica provisional — 3.650 días efectivamente cotizados"). Duplicada a propósito de
// generarCaminosRPM.js (mismo criterio de no acoplamiento ya documentado ahí).
const DIAS_REFERENCIA_VENTANA_IBL = 3650

// checkpoint E4-C1, Decisión 1 (2026-09-10): mismo defecto que en ProyectaTuPensionRPM.jsx
// ("identificamos X de los Y días" sin decir cuántos faltan ni su equivalente aproximado) —
// aplicado aquí también porque es exactamente el mismo mensaje en la práctica, solo que
// para "esta lectura" en vez de "esta proyección". formatearDiasFaltantesParaVentanaIBL ya
// centraliza el criterio de redondeo (aproximarDiasEnSemanasYMeses.js), nunca reimplementado
// aquí.
function textoHistoriaInsuficiente(resultado) {
  const dias = resultado?.trazabilidadVentana?.diasEfectivosAcumulados ?? null
  const detalleDiasFaltantes =
    dias !== null
      ? ` ${formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: dias, diasRequeridos: DIAS_REFERENCIA_VENTANA_IBL })}`
      : ''
  return (
    'Tu historia declarada, sumada, todavía no alcanza los años de cotización efectiva que ' +
    'esta lectura necesita para calcular tu IBL — no es un error, es información real que ' +
    `todavía no tienes completa.${detalleDiasFaltantes} ${TEXTO_ALCANCE_HISTORIA_FALTANTE}`
  )
}

// Misma aclaración que ProyectaTuPensionRPM.jsx (checkpoint E4-C1, Decisión 1) — duplicada a
// propósito, no extraída a un módulo compartido todavía (Principio 9: solo dos consumidores
// reales, y cada pantalla puede necesitar ajustar su redacción de forma independiente).
const TEXTO_ALCANCE_HISTORIA_FALTANTE =
  'Esto no significa que te falte toda tu historia laboral — es la parte que esta lectura usa para completar ' +
  'su ventana de cálculo. Agregar el resto de tu historia puede servir para verificar tus datos o evaluar otras ' +
  'alternativas legales, pero no es obligatorio si esta lectura concreta solo necesita este tramo.'

// Distinta de textoHistoriaInsuficiente a propósito: aquí la historia SÍ alcanza los 3.650
// días — el problema es que PensionLab no tiene cargado el IPC real de alguno de los años
// que esa historia toca, nunca la cantidad de historia declarada por la persona.
function textoCoberturaIPCInsuficiente(resultado) {
  const anios = resultado?.datosFaltantes?.ipcAnios ?? []
  const detalleAnios = anios.length > 0 ? ` Nos falta el índice de precios (IPC) de ${anios.join(', ')}.` : ''
  return (
    'Tu historia sí tiene los años de cotización efectiva que esta lectura necesita — el ' +
    'problema no es tu historia. PensionLab todavía no tiene cargada la inflación oficial ' +
    `(IPC) de algunos de esos años para poder actualizar los valores.${detalleAnios} No ` +
    'inventamos ese dato: preferimos decírtelo con honestidad a mostrarte una cifra que no ' +
    'podemos respaldar.'
  )
}

const TEXTO_NO_EVALUABLE = {
  HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA: textoHistoriaInsuficiente,
  COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO: textoCoberturaIPCInsuficiente,
  PERIODOS_SUPERPUESTOS_NO_SOPORTADOS: () =>
    'Encontramos períodos de tu historia que se superponen en el tiempo. PensionLab no ' +
    'puede calcular tu IBL sobre una historia con esa inconsistencia.',
  INCONSISTENCIA_DIAS_COTIZADOS_INVALIDOS: () =>
    'Uno de los períodos de tu historia declara más días cotizados que días calendario ' +
    'tiene su propio rango de fechas — es un dato inconsistente que PensionLab no puede usar.',
  COTIZACION_PARCIAL_EN_LIMITE_VENTANA_IBL_NO_SOPORTADA: () =>
    'El período más antiguo que necesitábamos usar de tu historia tiene cotización parcial ' +
    '(menos días cotizados que días calendario en su propio rango). PensionLab no asume ' +
    'cuáles días concretos fueron los cotizados, así que todavía no puede calcular tu IBL ' +
    'con esa información.',
}

const TEXTO_NO_EVALUABLE_GENERICO = () => 'Tu historia no es evaluable con la información disponible todavía.'

const TEXTO_NO_ES_PROYECCION =
  'Esta lectura usa exclusivamente tu historia de cotización observada hasta hoy. No ' +
  'incluye los años que te faltan por cotizar, no proyecta tu IBL ni tus semanas a una ' +
  'edad futura, y no es la pensión que recibirías al pensionarte — es un punto de ' +
  'partida, no una proyección.'

// Ampliado en la revisión final de S4-001: la cifra de IBL sorprendió en la prueba manual
// porque no se explicaba que los IBC históricos se actualizan por IPC antes de promediarse —
// un IBC nominal constante en el tiempo produce un IBL mayor que ese mismo valor, por la
// inflación acumulada (ver formulaIBL.js/trazabilidad-formula-IBL.md). Solo se explica aquí en
// lenguaje llano; el cálculo en sí no cambia.
function textoIBL(ibl) {
  const definicion =
    'El IBL es el ingreso promedio que la fórmula del RPM usa como base de cálculo. Antes de ' +
    'promediarlos, cada valor histórico se actualiza según la inflación acumulada hasta hoy (IPC) ' +
    '— por eso el IBL no necesariamente coincide con el promedio simple de las cifras que ' +
    'introdujiste. '
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

const TEXTO_ADVERTENCIA_TRASLADO =
  'Como te trasladaste de régimen: todavía no podemos confirmar cómo debe tratarse tu historia ' +
  'previa al traslado en este cálculo. La tratamos igual que el resto de tu historia, sin que eso ' +
  'sea una afirmación de que así debe calcularse legalmente en tu caso.'

const TEXTO_INDICIO_PENDIENTE_DE_HISTORIA =
  'Nos dijiste antes que tienes semanas suficientes para explorar la alternativa de toda tu vida ' +
  'laboral, pero tu historia registrada hasta ahora todavía no alcanza para calcularla. Vuelve a ' +
  'la captura y agrega más períodos para poder confirmarlo.'

const TEXTO_DATOS_LEGALES_INSUFICIENTES =
  'Tu historia registrada ya alcanza las semanas necesarias para la alternativa de toda tu vida ' +
  'laboral, pero todavía no pudimos calcularla: nos falta información de precios (IPC) para ' +
  'algunos de los años más antiguos de tu historia. Seguimos usando el resultado de los últimos ' +
  '10 años mientras tanto.'

/**
 * @param {Object} props
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} props.historiaCotizacion
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.nivelConocimientoSemanas
 * @param {string} props.semanasCotizadas
 * @param {string | null} props.trasladoRegimen
 * @param {() => void} props.onVolver
 * @param {(() => void) | undefined} [props.onContinuar] - Avanza hacia ProyectaTuPensionRPM.
 *   Se ofrece en dos situaciones independientes, nunca confundidas en el botón (S4-003;
 *   ampliado 2026-08-27, hallazgo de prueba manual): (1) esta lectura histórica calculó
 *   (`resultado.estado === 'calculado'`) — comportamiento original, sin cambios; (2)
 *   `permitirVolverAProyeccion` es true — el usuario llegó aquí desde la profundización
 *   opcional de ProyectaTuPensionRPM y quiere retomar SU pregunta original, sin que eso
 *   dependa de si esta OTRA lectura (más estricta, un umbral independiente) calculó. No
 *   cambia el alcance de esta pantalla, que sigue siendo exclusivamente la lectura
 *   histórica — el botón solo cambia de etiqueta según cuál de las dos situaciones aplica.
 * @param {boolean} [props.permitirVolverAProyeccion] - true cuando esta pantalla se abrió
 *   desde "Completar mi historia de cotización" en ProyectaTuPensionRPM (ver App.jsx) —
 *   nunca se infiere aquí, viene ya decidido de arriba.
 */
function ExploraTuProyeccionRPM({
  historiaCotizacion,
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  trasladoRegimen,
  onVolver,
  onContinuar,
  permitirVolverAProyeccion = false,
}) {
  const sinHistoria = !historiaCotizacion || historiaCotizacion.length === 0
  const resultado = sinHistoria ? null : calcularPensionRPM({ historiaCotizacion })
  const indicioVidaLaboral = evaluarIndicioVidaLaboral({ regimenActual, nivelConocimientoSemanas, semanasCotizadas })

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
            {(TEXTO_NO_EVALUABLE[resultado.razonNoEvaluable] ?? TEXTO_NO_EVALUABLE_GENERICO)(resultado)}
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
            {resultado.ibl.razonVidaLaboralNoEvaluada === 'SEMANAS_OBSERVADAS_INSUFICIENTES' &&
              indicioVidaLaboral.estado === 'indicio_probable' && (
                <p className="insight__message">{TEXTO_INDICIO_PENDIENTE_DE_HISTORIA}</p>
              )}
            {resultado.ibl.razonVidaLaboralNoEvaluada === 'DATOS_LEGALES_INSUFICIENTES' && (
              <p className="insight__message">{TEXTO_DATOS_LEGALES_INSUFICIENTES}</p>
            )}
          </div>

          {trasladoRegimen === 'si' && (
            <div className="field__warning">
              <p>{TEXTO_ADVERTENCIA_TRASLADO}</p>
            </div>
          )}

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
        {/* Dos situaciones independientes que nunca se confunden en el texto del botón
            (2026-08-27): si ESTA lectura calculó, "Proyectar hacia el futuro" (sin
            cambios). Si no calculó pero el origen es la profundización opcional,
            "Volver a tu proyección" — nunca afirma que esta lectura calculó algo que no
            calculó; solo permite retomar la pregunta original de ProyectaTuPensionRPM. */}
        {onContinuar && (resultado?.estado === 'calculado' || permitirVolverAProyeccion) && (
          <button type="button" className="btn btn-primary" onClick={onContinuar}>
            {resultado?.estado === 'calculado' ? 'Proyectar hacia el futuro' : 'Volver a tu proyección'}
          </button>
        )}
      </div>
    </form>
  )
}

export default ExploraTuProyeccionRPM
