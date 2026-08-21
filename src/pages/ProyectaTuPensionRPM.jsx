// Pantalla funcional "Proyecta tu pensión RPM" — Slice S4-003 ("Objetivo/restricción RPM
// capturables + búsqueda determinista del IBC necesario").
//
// Distinta de ExploraTuProyeccionRPM.jsx a propósito (decisión Carlos/Atlas, 2026-08-20):
// esa pantalla conserva intacto su alcance de lectura histórica ("con tu historia hasta
// hoy", nunca proyecta) — es el "Slice posterior" que su propio comentario de cabecera ya
// anticipaba. Esta pantalla sí proyecta a una fecha de reconocimiento futura, vía
// calcularProyeccionRPM.js (S4-002) + generarCaminosRPM.js (S4-003), reutilizados como
// caja negra — ninguna lógica de IBL, tasa de reemplazo ni bisección vive aquí.
//
// ibcAplicableSimulacion se recalcula aquí mismo a partir de los datos crudos ya
// existentes en App.jsx, invocando determinarBaseCotizacion.js — mismo patrón ya usado en
// ExploraTuProyeccion.jsx (RAIS) y QueDeterminaTuResultado.jsx. No se persiste el
// resultado en App.jsx.
//
// Sin "saldoAcumulado": es un concepto de RAIS (capital en cuenta individual) que no
// aplica a RPM (reparto, no capitalización individual) — omitido a propósito, no un
// olvido.
//
// El resultado nunca se llama "tu pensión" — es una proyección bajo un escenario
// (LIMITACION_NO_ES_TU_PENSION_FINAL, ya declarada por calcularProyeccionRPM.js).

import { useRef } from 'react'
import { determinarBaseCotizacion } from '../domain/determinarBaseCotizacion.js'
import { generarCaminosRPM } from '../domain/pensionEngine/generarCaminosRPM.js'
import { calcularEdadCumplida } from '../domain/calcularEdadCumplida.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import { formatearPesos } from '../format/formatearDinero.js'
import CampoMonetario from '../components/CampoMonetario.jsx'
import GraficoEsfuerzoResultado from '../components/GraficoEsfuerzoResultado.jsx'
import {
  textoEsfuerzoAdicional,
  textoIBCFuturo,
  textoDistancia,
  calcularLimitacionesComunes,
  limitacionesEspecificas,
} from './ProyectaTuPensionRPM.helpers.js'

const EDAD_MAXIMA_FUNCIONAL = 100

const CAMINO_MAS_ALINEADO_TEXTO = 'Camino más alineado con tu objetivo y las condiciones que nos diste.'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const TEXTO_INTRO =
  'A diferencia de la lectura anterior (que usa solo tu historia hasta hoy), esta pantalla ' +
  'proyecta hacia una edad futura que elijas, combinando tu historia real con un escenario ' +
  'de ingreso futuro — nunca inventa inflación futura ni asume que la ley cambiará.'

// Mismo criterio de validación mínima que ExploraTuProyeccion.jsx (RAIS) — duplicado a
// propósito, no extraído todavía a un módulo compartido (Principio 9: sin abstracción sin
// evidencia de un tercer consumidor real).
function validarMontoNoNegativo(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero < 0) return null
  return numero
}

function validarEdadJubilacionDeseada(edadTexto, edadActual) {
  if (edadTexto === '') {
    return { edadValida: null, mensajeError: null }
  }
  const edadNumero = Number(edadTexto)
  if (!Number.isInteger(edadNumero) || edadNumero <= edadActual) {
    return { edadValida: null, mensajeError: `Ingresa una edad mayor a tu edad actual (${edadActual} años).` }
  }
  if (edadNumero > EDAD_MAXIMA_FUNCIONAL) {
    return {
      edadValida: null,
      mensajeError: `PensionLab está diseñado actualmente para explorar proyecciones hasta los ${EDAD_MAXIMA_FUNCIONAL} años.`,
    }
  }
  return { edadValida: edadNumero, mensajeError: null }
}

/**
 * @param {Object} props
 * @param {Array<{fechaDesde: string, fechaHasta: (string|null), ibc: number, diasCotizados: number}>} props.historiaCotizacion
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {('Mujer'|'Hombre'|null)} props.sexo - indispensable para resolver los requisitos
 *   legales de edad y semanas mínimas (auditoría 2026-08-21)
 * @param {string} props.fechaNacimiento
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.certezaBaseCotizacion
 * @param {string} props.valorBaseCotizacionDeclarado
 * @param {('empleado'|'independiente'|'ambos'|null)} props.tipoCotizante
 * @param {('colombia'|'exterior'|'ambos'|null)} props.lugarCotizacion
 * @param {string} props.salarioParaEstimarBase
 * @param {string} props.edadJubilacionDeseada
 * @param {(valor: string) => void} props.onCambiarEdadJubilacionDeseada
 * @param {string} props.objetivoPensionMensual
 * @param {(valor: string) => void} props.onCambiarObjetivoPensionMensual
 * @param {string} props.restriccionCostoPensionalAdicionalMaximoMensual
 * @param {(valor: string) => void} props.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
 * @param {() => void} props.onVolver
 */
function ProyectaTuPensionRPM({
  historiaCotizacion,
  regimenActual,
  sexo,
  fechaNacimiento,
  certezaBaseCotizacion,
  valorBaseCotizacionDeclarado,
  tipoCotizante,
  lugarCotizacion,
  salarioParaEstimarBase,
  edadJubilacionDeseada,
  onCambiarEdadJubilacionDeseada,
  objetivoPensionMensual,
  onCambiarObjetivoPensionMensual,
  restriccionCostoPensionalAdicionalMaximoMensual,
  onCambiarRestriccionCostoPensionalAdicionalMaximoMensual,
  onVolver,
}) {
  const fecha = hoyISO()
  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)

  const { edadValida, mensajeError } = validarEdadJubilacionDeseada(edadJubilacionDeseada, edadActual)

  const baseCotizacion = determinarBaseCotizacion({
    certeza: certezaBaseCotizacion,
    valorDeclarado: valorBaseCotizacionDeclarado,
    tipoCotizante,
    lugarCotizacion,
    salarioParaEstimar: salarioParaEstimarBase,
    fecha,
  })

  const objetivoValorMensual = validarMontoNoNegativo(objetivoPensionMensual)
  const restriccionCostoPensional = validarMontoNoNegativo(restriccionCostoPensionalAdicionalMaximoMensual)

  const resultado =
    edadValida !== null && baseCotizacion.ibcAplicableSimulacion !== null
      ? generarCaminosRPM({
          regimenActual,
          sexo,
          historiaCotizacion,
          fechaNacimiento,
          edadJubilacionDeseada: edadValida,
          ibcAplicableSimulacion: baseCotizacion.ibcAplicableSimulacion,
          objetivoValorMensual,
          restriccionCostoPensionalAdicionalMaximoMensual: restriccionCostoPensional,
          fecha,
        })
      : null

  // S4-004: separa, una sola vez, las limitaciones presentes en TODOS los caminos viables
  // (comunes — se muestran una vez, debajo de la comparación) de las que solo aparecen en
  // algunos (específicas — se quedan junto a su camino). Mismo patrón ya usado por
  // ExploraTuProyeccion.jsx (RAIS). Los datos en sí no cambian, solo dónde se renderizan.
  const escenariosViables = resultado ? resultado.escenarios.filter((e) => e.estado === 'viable') : []
  const limitacionesComunes = calcularLimitacionesComunes(escenariosViables)

  const campoObjetivo = useCampoMonetario(objetivoPensionMensual, onCambiarObjetivoPensionMensual)
  const campoRestriccion = useCampoMonetario(
    restriccionCostoPensionalAdicionalMaximoMensual,
    onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
  )

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--proyecta-tu-pension-rpm">Proyecta tu pensión</h1>

      <p className="screen__subtitle screen__subtitle--secundario">{TEXTO_INTRO}</p>

      <p className="screen__subtitle">¿Hasta qué edad te gustaría explorar tu proyección?</p>
      <p className="screen__subtitle screen__subtitle--secundario">
        PensionLab verifica que, a esa edad, cumplas los requisitos legales de reconocimiento RPM (edad y semanas
        mínimas) — si no los cumples, te lo explicamos en vez de mostrarte una cifra de pensión.
      </p>

      <label className="field">
        <span className="field__label">Edad</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="field__input"
          value={edadJubilacionDeseada}
          onChange={(e) => onCambiarEdadJubilacionDeseada(e.target.value.replace(/\D/g, ''))}
        />
      </label>

      {mensajeError && <p className="screen__subtitle">{mensajeError}</p>}

      {edadValida !== null && baseCotizacion.ibcAplicableSimulacion === null && (
        <p className="screen__subtitle">
          {baseCotizacion.razonNoApto === 'valor_bajo_piso_legal'
            ? 'El valor que registraste como base de cotización está por debajo del salario mínimo legal, así ' +
              'que no podemos construir caminos con él. Vuelve atrás y revísalo.'
            : 'Todavía no tenemos tu base de cotización lista para poder construir caminos.'}
        </p>
      )}

      {edadValida !== null && baseCotizacion.ibcAplicableSimulacion !== null && (
        <>
          <label className="field">
            <span className="field__label">¿Con cuánto te gustaría pensionarte, al menos, cada mes?</span>
            <p className="option__hint">
              En pesos de hoy — el poder de compra que tiene ese dinero actualmente, no el número que verías
              nominalmente en el futuro.
            </p>
            <CampoMonetario {...campoObjetivo} />
          </label>

          <label className="field">
            <span className="field__label">
              ¿Cuánto más podrías destinar exclusivamente a tu aporte a pensión cada mes? (opcional)
            </span>
            <p className="option__hint">
              Este límite considera solo el aporte pensional. Otros aportes obligatorios podrían aumentar también
              — esta primera versión todavía no los calcula.
            </p>
            <CampoMonetario {...campoRestriccion} />
          </label>
        </>
      )}

      {resultado && resultado.escenarios.length === 0 && resultado.detalleElegibilidad && (
        <div className="insight">
          <p className="insight__label">A esa edad no cumplirías los requisitos legales de reconocimiento RPM</p>
          <p className="insight__message">{resultado.orientacion.razon}</p>
        </div>
      )}

      {resultado && resultado.escenarios.length === 0 && !resultado.detalleElegibilidad && (
        <p className="screen__subtitle">{resultado.orientacion.razon}</p>
      )}

      {resultado && resultado.escenarios.length > 0 && (
        <>
          <p className="screen__subtitle screen__subtitle--secundario">
            Cada cifra es una <strong>proyección bajo un escenario</strong>, no tu pensión definitiva — depende de
            que sigas cotizando como se asumió aquí, de que la ley no cambie antes de tu jubilación, y del
            escenario de ingreso futuro evaluado.
          </p>

          <p className="comparacion-caminos__contexto">
            Comparación proyectada hasta los {edadValida} años · Objetivo: {formatearPesos(objetivoValorMensual)} al
            mes, en pesos de hoy.
          </p>

          <div
            className="comparacion-caminos"
            style={{ '--comparacion-caminos-columnas': resultado.escenarios.length }}
          >
            {resultado.escenarios.map((escenario, index) => {
              const esMasAlineado = resultado.orientacion.caminoMasAlineadoId === escenario.id
              const notasEspecificas = limitacionesEspecificas(escenario, limitacionesComunes)

              return (
                <div
                  className={`camino-columna${esMasAlineado ? ' camino-columna--alineado' : ''}`}
                  style={{ '--col': index + 1 }}
                  key={escenario.id}
                >
                  <div className="camino-celda camino-celda--encabezado">
                    <p className="camino-celda__valor camino-celda__valor--titulo">{escenario.decision}</p>
                    {esMasAlineado && <p className="camino-celda__nota">{CAMINO_MAS_ALINEADO_TEXTO}</p>}
                  </div>

                  {escenario.estado === 'descartado' ? (
                    <p className="camino-celda camino-celda--descartado">{escenario.razonDescartado.mensaje}</p>
                  ) : (
                    <>
                      <div className="camino-celda camino-celda--esfuerzo">
                        <span className="camino-celda__etiqueta">Aporte pensional adicional mensual</span>
                        <span className="camino-celda__valor camino-celda__valor--enfasis">
                          {textoEsfuerzoAdicional(escenario)}
                        </span>
                      </div>
                      <div className="camino-celda camino-celda--base">
                        <span className="camino-celda__etiqueta">IBC futuro del escenario</span>
                        <span className="camino-celda__valor">{textoIBCFuturo(escenario)}</span>
                      </div>
                      <div className="camino-celda camino-celda--proyeccion">
                        <span className="camino-celda__etiqueta">Pensión proyectada mensual (pesos de hoy)</span>
                        <span className="camino-celda__valor camino-celda__valor--enfasis">
                          {formatearPesos(escenario.resultado.valor)}
                        </span>
                      </div>
                      <div className="camino-celda camino-celda--objetivo">
                        <span className="camino-celda__etiqueta">Frente a tu objetivo</span>
                        <span
                          className={`camino-celda__valor${escenario.distanciaObjetivo.cumple ? ' camino-celda__valor--cumple' : ''}`}
                        >
                          {textoDistancia(escenario)}
                        </span>
                      </div>
                      {notasEspecificas.length > 0 && (
                        <div className="camino-celda camino-celda--notas">
                          {notasEspecificas.map((l) => (
                            <p className="camino-celda__nota" key={l.codigo}>
                              {l.mensaje}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <GraficoEsfuerzoResultado barrido={resultado.barrido} objetivoValorMensual={objetivoValorMensual} />

          {limitacionesComunes.length > 0 && (
            <div className="comparacion-caminos__supuestos">
              <p className="screen__subtitle screen__subtitle--secundario comparacion-caminos__supuestos-titulo">
                Supuestos y limitaciones de esta proyección
              </p>
              <ul className="comparacion-caminos__supuestos-lista">
                {limitacionesComunes.map((l) => (
                  <li key={l.codigo}>{l.mensaje}</li>
                ))}
              </ul>
            </div>
          )}

          {resultado.orientacion.caminoMasAlineadoId === null && (
            <p className="screen__subtitle">{resultado.orientacion.razon}</p>
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

export default ProyectaTuPensionRPM
