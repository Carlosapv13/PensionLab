// Pantalla funcional "Explora tu proyección" — Slice "Motor de caminos RAIS".
// Transformación de la pantalla original (Sprint 3, "primer resultado
// pensional real de todo el producto") tras la revisión de producto: una
// cifra aislada no respondía la pregunta real del usuario ("¿con cuánto
// podría pensionarme?"), así que esta pantalla ahora construye y compara
// caminos en vez de mostrar un único número — mismo lugar en el recorrido,
// propósito distinto.
//
// Perfil estrecho aprobado (ver generarCaminosRAIS.js para el detalle
// completo): RAIS, independiente, cotización en Colombia, sin traslados de
// régimen previos. Fuera de ese perfil, se explica honestamente y se permite
// continuar — este Slice nunca bloquea el recorrido general de la app.
//
// ibcAplicableSimulacion se recalcula aquí mismo a partir de los datos crudos
// ya existentes en App.jsx, invocando determinarBaseCotizacion — mismo patrón
// ya usado en QueDeterminaTuResultado.jsx. No se persiste el resultado en
// App.jsx: es barato de recalcular y evita mantener un dato derivado
// sincronizado con su origen.
//
// El resultado nunca se llama "tu pensión" — es una "proyección pensional
// parcial": combina lo que este Slice sí puede modelar (base de cotización +
// saldo acumulado + supuestos ya aprobados), pero no representa una
// estimación completa (sin FGPM, sin mortalidad real, sin bono pensional, sin
// verificar viabilidad legal de retiro a la edad elegida).
//
// Sin "Continuar" deshabilitado por falta de resultado o de caminos: el caso
// "todavía no hay suficiente información" es una respuesta completa de esta
// pantalla, no un bloqueo — mismo criterio ya establecido en este Slice desde
// su primera versión.
//
// Cierre funcional del MVP: esta pantalla ya no tiene una siguiente (se
// retiró DeclaracionLibre/RevisionDeclaracionTemporal del recorrido
// principal). No existe botón "Continuar" — un botón visible sin destino
// sería una afordancia falsa — solo "Volver" y una indicación breve de que
// esto es hasta donde llega esta versión.

import { useRef } from 'react'
import { determinarBaseCotizacion } from '../domain/determinarBaseCotizacion.js'
import { generarCaminosRAIS } from '../domain/pensionEngine/generarCaminosRAIS.js'
import { calcularEdadCumplida } from '../domain/calcularEdadCumplida.js'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import { useCampoMonetario } from '../hooks/useCampoMonetario.js'
import { formatearPesos } from '../format/formatearDinero.js'
import {
  calcularLimitacionesComunes,
  limitacionesEspecificas,
  separarLimitacionesGenerales,
} from './ExploraTuProyeccion.helpers.js'

const EDAD_MAXIMA_FUNCIONAL = 100

const CAMINO_MAS_ALINEADO_TEXTO = 'Camino más alineado con tu objetivo y las condiciones que nos diste.'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

const TEXTO_CIERRE_MVP =
  'Hasta aquí llega esta versión de PensionLab: estos son los caminos y resultados que ' +
  'puede evaluar con la información disponible.'

/**
 * Validación mínima compartida por saldo acumulado, objetivo y restricción:
 * un monto no negativo. A diferencia del IBC (determinarBaseCotizacion.js),
 * ninguno de estos tres tiene un piso legal aplicable — un saldo acumulado
 * puede ser legítimamente $0, así que no se replica esa validación aquí.
 *
 * @param {string} valor
 * @returns {number | null}
 */
function validarMontoNoNegativo(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero < 0) return null
  return numero
}

/**
 * @param {string} edadTexto
 * @param {number} edadActual
 * @returns {{ edadValida: number | null, mensajeError: string | null }}
 */
function validarEdadJubilacionDeseada(edadTexto, edadActual) {
  if (edadTexto === '') {
    return { edadValida: null, mensajeError: null }
  }

  const edadNumero = Number(edadTexto)

  if (!Number.isInteger(edadNumero) || edadNumero <= edadActual) {
    return {
      edadValida: null,
      mensajeError: `Ingresa una edad mayor a tu edad actual (${edadActual} años).`,
    }
  }

  if (edadNumero > EDAD_MAXIMA_FUNCIONAL) {
    return {
      edadValida: null,
      mensajeError: `PensionLab está diseñado actualmente para explorar proyecciones hasta los ${EDAD_MAXIMA_FUNCIONAL} años.`,
    }
  }

  return { edadValida: edadNumero, mensajeError: null }
}

// Esfuerzo adicional y base de cotización son dos filas separadas de la
// comparación (decisión de producto: responden preguntas distintas — cuánto
// sale realmente del bolsillo vs. cuál es el número técnico que cambia — y
// ambas son relevantes para decidir, no una duplica a la otra).
//
// El esfuerzo mostrado es costoPensionalAdicionalMensual — lo que realmente
// sale del bolsillo de la persona (16% del aumento de IBC), nunca aumentoIBC
// ni ibcPropuesto directamente (Hallazgo de revisión: $1 de aumento de IBC
// no equivale a $1 de costo — corresponde a la tasa de cotización, 16%).
//
// Deliberadamente solo la cifra — sin repetir aquí la explicación de
// "pesos de hoy, sostenidos durante el horizonte": esa ya vive una sola vez
// en PROYECCION_EN_TERMINOS_REALES (sección general), para que la cifra sea
// protagonista de esta celda en vez de competir con un párrafo.
function textoEsfuerzoAdicional(escenario) {
  if (escenario.tipo === 'base') return 'Sin cambios respecto a hoy.'
  if (escenario.esfuerzo.costoPensionalAdicionalMensual <= 0) return 'Sin cambios respecto a hoy.'
  return `${formatearPesos(escenario.esfuerzo.costoPensionalAdicionalMensual)} adicionales al mes.`
}

function textoBaseCotizacion(escenario) {
  const { ibcActual, ibcPropuesto } = escenario.esfuerzo
  if (ibcPropuesto === ibcActual) return `${formatearPesos(ibcActual)} (sin cambios).`
  return `${formatearPesos(ibcActual)} → ${formatearPesos(ibcPropuesto)}.`
}

function textoDistancia(escenario) {
  const { cumple, delta } = escenario.distanciaObjetivo
  if (cumple) return 'Alcanza tu objetivo.'
  return `No alcanza tu objetivo — le faltarían ${formatearPesos(delta)} al mes.`
}

function textoProyeccionTemporal(proyeccionTemporal, edadActual, edadJubilacionDeseada) {
  if (!proyeccionTemporal) return null
  if (!proyeccionTemporal.alcanzable) {
    return 'A este ritmo, no alcanzarías tu objetivo dentro de un horizonte razonable.'
  }
  if (proyeccionTemporal.edadAproximadaAlcanceObjetivo <= edadActual) {
    return 'A este ritmo, ya alcanzarías tu objetivo con lo que ya tienes acumulado.'
  }
  return (
    `Si mantuvieras tu base de cotización actual y siguieras cotizando después de los ${edadJubilacionDeseada} años ` +
    `que elegiste explorar, alcanzarías este objetivo aproximadamente a los ${proyeccionTemporal.edadAproximadaAlcanceObjetivo} ` +
    'años. Esta referencia no determina a qué edad puedes pensionarte.'
  )
}

/**
 * @param {Object} props
 * @param {('RPM'|'RAIS'|'desconocido'|null)} props.regimenActual
 * @param {string} props.fechaNacimiento
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.certezaBaseCotizacion
 * @param {string} props.valorBaseCotizacionDeclarado
 * @param {('empleado'|'independiente'|'ambos'|null)} props.tipoCotizante
 * @param {('colombia'|'exterior'|'ambos'|null)} props.lugarCotizacion
 * @param {string} props.salarioParaEstimarBase
 * @param {string|null} props.trasladoRegimen
 * @param {string} props.edadJubilacionDeseada
 * @param {(valor: string) => void} props.onCambiarEdadJubilacionDeseada
 * @param {('conocido'|'aproximado'|'desconocido'|null)} props.certezaSaldoAcumulado
 * @param {(valor: string) => void} props.onCambiarCertezaSaldoAcumulado
 * @param {string} props.saldoAcumuladoDeclarado
 * @param {(valor: string) => void} props.onCambiarSaldoAcumuladoDeclarado
 * @param {string} props.objetivoPensionMensual
 * @param {(valor: string) => void} props.onCambiarObjetivoPensionMensual
 * @param {string} props.restriccionCostoPensionalAdicionalMaximoMensual
 * @param {(valor: string) => void} props.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
 * @param {() => void} props.onVolver
 */
function ExploraTuProyeccion({
  regimenActual,
  fechaNacimiento,
  certezaBaseCotizacion,
  valorBaseCotizacionDeclarado,
  tipoCotizante,
  lugarCotizacion,
  salarioParaEstimarBase,
  trasladoRegimen,
  edadJubilacionDeseada,
  onCambiarEdadJubilacionDeseada,
  certezaSaldoAcumulado,
  onCambiarCertezaSaldoAcumulado,
  saldoAcumuladoDeclarado,
  onCambiarSaldoAcumuladoDeclarado,
  objetivoPensionMensual,
  onCambiarObjetivoPensionMensual,
  restriccionCostoPensionalAdicionalMaximoMensual,
  onCambiarRestriccionCostoPensionalAdicionalMaximoMensual,
  onVolver,
}) {
  const fecha = hoyISO()
  const edadActual = calcularEdadCumplida(fechaNacimiento, fecha)

  const perfilAplica = tipoCotizante === 'independiente' && lugarCotizacion === 'colombia' && trasladoRegimen === 'no'

  const { edadValida, mensajeError } = validarEdadJubilacionDeseada(edadJubilacionDeseada, edadActual)

  const baseCotizacion = determinarBaseCotizacion({
    certeza: certezaBaseCotizacion,
    valorDeclarado: valorBaseCotizacionDeclarado,
    tipoCotizante,
    lugarCotizacion,
    salarioParaEstimar: salarioParaEstimarBase,
    fecha,
  })

  const saldoAcumulado = validarMontoNoNegativo(saldoAcumuladoDeclarado)
  const objetivoValorMensual = validarMontoNoNegativo(objetivoPensionMensual)
  const restriccionCostoPensional = validarMontoNoNegativo(restriccionCostoPensionalAdicionalMaximoMensual)

  const resultado =
    perfilAplica && edadValida !== null && baseCotizacion.ibcAplicableSimulacion !== null
      ? generarCaminosRAIS({
          regimenActual,
          tipoCotizante,
          lugarCotizacion,
          trasladoRegimen,
          fechaNacimiento,
          edadJubilacionDeseada: edadValida,
          ibcAplicableSimulacion: baseCotizacion.ibcAplicableSimulacion,
          saldoAcumulado,
          objetivoValorMensual,
          restriccionCostoPensionalAdicionalMaximoMensual: restriccionCostoPensional,
          fecha,
        })
      : null

  const escenariosViables = resultado ? resultado.escenarios.filter((e) => e.estado === 'viable') : []
  const limitacionesComunes = calcularLimitacionesComunes(escenariosViables)

  // Por escenario: separa, una sola vez, lo que se queda junto a ese camino
  // de lo que —aunque el dominio solo lo haya declarado en ese escenario—
  // describe el método de cálculo en general y debe leerse en la sección
  // común (ej. TOPE_IBC_CON_SMMLV_VIGENTE). Se calcula aquí, no dentro del
  // .map() de JSX, para reutilizar el mismo resultado en la columna y en la
  // sección general sin invocar las funciones puras dos veces.
  const notasPorEscenario = new Map(
    (resultado ? resultado.escenarios : []).map((escenario) => [
      escenario.id,
      separarLimitacionesGenerales(limitacionesEspecificas(escenario, limitacionesComunes)),
    ])
  )

  const limitacionesGeneralesAdicionales = Array.from(
    new Map(
      Array.from(notasPorEscenario.values())
        .flatMap(({ generales }) => generales)
        .map((l) => [l.codigo, l])
    ).values()
  )

  const limitacionesSeccionGeneral = [...limitacionesComunes, ...limitacionesGeneralesAdicionales]

  // Llamados incondicionalmente (Reglas de los Hooks), aunque sus campos
  // solo se rendericen bajo ciertas condiciones más abajo (perfilAplica,
  // saldoAcumulado !== null...).
  const campoSaldo = useCampoMonetario(saldoAcumuladoDeclarado, onCambiarSaldoAcumuladoDeclarado)
  const campoObjetivo = useCampoMonetario(objetivoPensionMensual, onCambiarObjetivoPensionMensual)
  const campoRestriccion = useCampoMonetario(
    restriccionCostoPensionalAdicionalMaximoMensual,
    onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
  )

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  // Sin destino: esta pantalla es el cierre funcional del MVP. El submit se
  // conserva únicamente para absorber el Enter nativo dentro de los campos
  // de esta pantalla (estándar de navegación del producto), sin navegar a
  // ningún lado.
  function manejarEnvio(e) {
    e.preventDefault()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title screen__title--explora-tu-proyeccion">Explora tu proyección</h1>

      {!perfilAplica && (
        <>
          <p className="screen__subtitle">
            Todavía no podemos construir ni comparar caminos para tu situación específica.
          </p>
          <p className="screen__subtitle screen__subtitle--secundario">
            En esta primera versión, PensionLab solo puede comparar caminos para quienes cotizan como
            independientes, en Colombia, y nunca se han trasladado entre Colpensiones y un fondo privado — tu
            expediente sigue construyéndose igual, y podrás volver a esto más adelante.
          </p>
        </>
      )}

      {perfilAplica && (
        <>
          <p className="screen__subtitle">¿Hasta qué edad te gustaría explorar tu proyección?</p>
          <p className="screen__subtitle screen__subtitle--secundario">
            Esta es una edad hipotética para poder construir una comparación — no es la edad legal mínima que ya
            vimos antes, ni una decisión que estés tomando ahora. Puedes cambiarla cuando quieras.
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
              <fieldset className="options">
                <legend>¿Sabes aproximadamente cuánto tienes acumulado en tu cuenta individual?</legend>
                <p className="option__hint">
                  Indica el saldo más reciente que conozcas — puedes consultarlo en el extracto o la app de tu
                  fondo privado (Porvenir, Protección, Colfondos o Skandia). No hace falta que sea exactamente el
                  de hoy.
                </p>

                {[
                  { valor: 'conocido', texto: 'Lo conozco.' },
                  { valor: 'aproximado', texto: 'Tengo una idea aproximada.' },
                  { valor: 'desconocido', texto: 'No lo conozco.' },
                ].map(({ valor, texto }) => (
                  <label key={valor} className="option">
                    <input
                      type="radio"
                      name="certezaSaldoAcumulado"
                      value={valor}
                      checked={certezaSaldoAcumulado === valor}
                      onChange={() => onCambiarCertezaSaldoAcumulado(valor)}
                    />
                    <span>{texto}</span>
                  </label>
                ))}
              </fieldset>

              {(certezaSaldoAcumulado === 'conocido' || certezaSaldoAcumulado === 'aproximado') && (
                <label className="field">
                  <span className="field__label">Saldo acumulado (en pesos)</span>
                  <input type="text" inputMode="numeric" className="field__input" {...campoSaldo} />
                </label>
              )}

              {certezaSaldoAcumulado === 'desconocido' && (
                <p className="screen__subtitle">
                  Sin este dato no podemos construir caminos comparables todavía — puedes continuar igual, y
                  volver a esto cuando lo tengas.
                </p>
              )}

              {saldoAcumulado !== null && (
                <>
                  <label className="field">
                    <span className="field__label">¿Con cuánto te gustaría pensionarte, al menos, cada mes?</span>
                    <p className="option__hint">
                      En pesos de hoy — el poder de compra que tiene ese dinero actualmente, no el número que
                      verías nominalmente dentro de 25 años.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="field__input"
                      {...campoObjetivo}
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">
                      ¿Cuánto más podrías destinar exclusivamente a tu aporte a pensión cada mes? (opcional)
                    </span>
                    <p className="option__hint">
                      Este límite considera solo el aporte pensional. Si aumentas tu base de cotización, otros
                      aportes obligatorios —como salud y, cuando corresponda, riesgos laborales— también podrían
                      aumentar. Esta primera versión todavía no calcula esos costos.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="field__input"
                      {...campoRestriccion}
                    />
                  </label>
                </>
              )}
            </>
          )}

          {resultado && resultado.escenarios.length === 0 && (
            <p className="screen__subtitle">{resultado.orientacion.razon}</p>
          )}

          {resultado && resultado.escenarios.length > 0 && (
            <>
              <p className="screen__subtitle screen__subtitle--secundario">
                Cada cifra es una <strong>proyección pensional parcial</strong>: combina tu base de cotización y
                tu saldo acumulado bajo los supuestos ya declarados, pero todavía no representa una estimación
                completa de tu pensión — no incluye Garantía de Pensión Mínima, tablas de mortalidad reales, ni
                verifica si legalmente podrías retirarte a la edad elegida.
              </p>

              <p className="comparacion-caminos__contexto">
                Comparación proyectada hasta los {edadValida} años · Objetivo: {formatearPesos(objetivoValorMensual)}{' '}
                al mes, en pesos de hoy.
              </p>

              {/* Conceptualmente esta comparación es una matriz (una fila por variable
                  comparable, una columna por camino). Se implementa con CSS Grid
                  autodescriptivo — cada celda lleva su propia etiqueta junto al valor —
                  en vez de un <table> semántico, porque un <table> reflowed por CSS para
                  apilarse en móvil pierde la asociación fila/columna para lectores de
                  pantalla. Decisión pragmática para este MVP (ver App.css): si la
                  comparación crece en número de variables o densidad, reevaluar una
                  tabla semántica real (con roles ARIA de tabla si necesita seguir siendo
                  responsive). Nunca asume 2 caminos: el número de columnas sale de
                  resultado.escenarios.length. */}
              <div
                className="comparacion-caminos"
                style={{ '--comparacion-caminos-columnas': resultado.escenarios.length }}
              >
                {resultado.escenarios.map((escenario, index) => {
                  const esMasAlineado = resultado.orientacion.caminoMasAlineadoId === escenario.id
                  const notaTiempo = textoProyeccionTemporal(escenario.proyeccionTemporal, edadActual, edadValida)
                  const { especificas: notasEspecificas } = notasPorEscenario.get(escenario.id)
                  const tieneNotas = notaTiempo !== null || notasEspecificas.length > 0

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
                            <span className="camino-celda__valor">{textoEsfuerzoAdicional(escenario)}</span>
                          </div>
                          <div className="camino-celda camino-celda--base">
                            <span className="camino-celda__etiqueta">Base de cotización</span>
                            <span className="camino-celda__valor">{textoBaseCotizacion(escenario)}</span>
                          </div>
                          <div className="camino-celda camino-celda--proyeccion">
                            <span className="camino-celda__etiqueta">Proyección parcial mensual (pesos de hoy)</span>
                            <span className="camino-celda__valor">{formatearPesos(escenario.resultado.valor)}</span>
                          </div>
                          <div className="camino-celda camino-celda--objetivo">
                            <span className="camino-celda__etiqueta">Frente a tu objetivo</span>
                            <span className="camino-celda__valor">{textoDistancia(escenario)}</span>
                          </div>
                          {tieneNotas && (
                            <div className="camino-celda camino-celda--notas">
                              {notaTiempo && <p className="camino-celda__nota">{notaTiempo}</p>}
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

              {limitacionesSeccionGeneral.length > 0 && (
                <div className="comparacion-caminos__supuestos">
                  <p className="screen__subtitle screen__subtitle--secundario comparacion-caminos__supuestos-titulo">
                    Supuestos y limitaciones de esta proyección
                  </p>
                  <ul className="comparacion-caminos__supuestos-lista">
                    {limitacionesSeccionGeneral.map((l) => (
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
        </>
      )}

      <p className="screen__subtitle screen__subtitle--secundario">{TEXTO_CIERRE_MVP}</p>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
      </div>
    </form>
  )
}

export default ExploraTuProyeccion
