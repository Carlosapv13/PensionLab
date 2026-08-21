// Gráfico esfuerzo↔resultado — S4-005 ("Barrido de caminos intermedios").
//
// Presentacional puro: recibe `barrido` y `objetivoValorMensual` ya calculados por
// generarCaminosRPM.js y solo los mapea a un SVG — nunca recalcula esfuerzo, pensión
// proyectada ni ningún valor de dominio (mismo principio "la UI visualiza, no recalcula"
// ya aplicado en S4-004). Sin estado React, sin hover/tooltip, sin interacción — deliberadamente
// simple para este Slice (decisión Carlos/Atlas, 2026-08-21); queda como oportunidad
// futura si más adelante demuestra valor.
//
// eje X = esfuerzo.costoPensionalAdicionalMensual, eje Y = resultado.valor — ambos
// tomados tal cual de cada punto del barrido, sin transformación económica.
//
// Rediseño de producto (2026-08-21, tercera iteración): el rango ya no llega
// incondicionalmente hasta el tope legal — cuando el objetivo es alcanzable, el barrido se
// extiende hasta ~125% del objetivo (margen de exploración de producto, nunca una segunda
// meta) y `barrido.puntoObjetivo` marca el punto exacto donde se alcanza el objetivo
// declarado, reutilizado bit a bit del alternativo de S4-003. `estado ===
// 'objetivo_ya_alcanzado'` es un tercer estado (junto a 'calculado'/'sin_margen'): la
// situación actual ya cumple el objetivo, así que no se dibuja ninguna curva de aumentos
// innecesarios.
//
// Cuarta iteración (2026-08-21, corrección del eje Y): la misma disciplina del rango X
// ("nunca más allá de lo realmente explorable") ahora también rige el eje Y. Cuando
// `puntoObjetivo` es null dentro de un barrido 'calculado' (objetivo no alcanzado, con o
// sin restricción de costo de por medio), el objetivo declarado deja de estirar el dominio
// Y y de dibujarse — se reemplaza por un mensaje textual fuera del SVG, en lenguaje de
// proyección/escenario, que usa el extremo real ya calculado por dominio.

import {
  ANCHO_SVG,
  ALTO_SVG,
  AREA_GRAFICA,
  calcularDominioEje,
  calcularDominioYConObjetivo,
  construirPuntosSvg,
  construirPuntoSvg,
  construirRutaLinea,
  calcularYObjetivo,
} from './GraficoEsfuerzoResultado.helpers.js'
import { formatearPesos } from '../format/formatearDinero.js'

const RADIO_PUNTO = { actual: 6, intermedio: 4, referencia_superior: 6, limite_restriccion: 6, extremo_superior: 6 }

// Etiqueta corta junto al punto — deliberadamente neutral, nunca sugiere que el margen del
// 125% sea una meta o una recomendación ("Fin de exploración", no "Objetivo superior").
const ETIQUETA_POSICION = {
  actual: 'Hoy',
  intermedio: null,
  referencia_superior: 'Fin de exploración',
  limite_restriccion: 'Límite de tu aporte adicional',
  extremo_superior: 'Tope explorado',
}

const RADIO_PUNTO_OBJETIVO = 7

/**
 * @param {Object} props
 * @param {Object|null} props.barrido - `resultado.barrido` de generarCaminosRPM.js
 * @param {number|null} props.objetivoValorMensual
 */
function GraficoEsfuerzoResultado({ barrido, objetivoValorMensual }) {
  if (!barrido) return null

  if (barrido.estado === 'objetivo_ya_alcanzado' || barrido.estado === 'sin_margen') {
    return (
      <div className="grafico-esfuerzo-resultado">
        <p className="grafico-esfuerzo-resultado__mensaje-sin-margen">{barrido.razon}</p>
      </div>
    )
  }

  const { puntos, puntoObjetivo } = barrido
  const extremo = puntos[puntos.length - 1]

  const valoresX = puntos.map((p) => p.esfuerzo.costoPensionalAdicionalMensual)
  if (puntoObjetivo) valoresX.push(puntoObjetivo.esfuerzo.costoPensionalAdicionalMensual)
  const dominioX = calcularDominioEje(valoresX)

  // objetivoIncluido: el objetivo solo entra al dominio Y (y se dibuja su línea/marcador)
  // cuando el barrido realmente lo alcanzó dentro de lo explorado — ver
  // calcularDominioYConObjetivo para el porqué (hallazgo de la revisión visual, 2026-08-21).
  const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, puntoObjetivo, objetivoValorMensual)
  const puntosSvg = construirPuntosSvg(puntos, dominioX, dominioY)
  const ruta = construirRutaLinea(puntosSvg)
  const puntoObjetivoSvg = puntoObjetivo ? construirPuntoSvg(puntoObjetivo, dominioX, dominioY) : null

  const yObjetivo = objetivoIncluido ? calcularYObjetivo(objetivoValorMensual, dominioY) : null

  const ejeXInicio = AREA_GRAFICA.x
  const ejeXFin = AREA_GRAFICA.x + AREA_GRAFICA.ancho
  const ejeYInicio = AREA_GRAFICA.y
  const ejeYFin = AREA_GRAFICA.y + AREA_GRAFICA.alto

  const marcasY = [dominioY.max, (dominioY.min + dominioY.max) / 2, dominioY.min]
  const marcasX = [dominioX.min, (dominioX.min + dominioX.max) / 2, dominioX.max]

  // Copy explícita exigida por el usuario (2026-08-21): solo aplica cuando el objetivo SÍ
  // se alcanzó (puntoObjetivo existe) pero la restricción de costo cortó la exploración
  // antes del margen del 125% — derivada inequívocamente de posicion + presencia de
  // puntoObjetivo, sin que el dominio tenga que redactar ningún texto.
  const mostrarNotaRestriccion = extremo.posicion === 'limite_restriccion' && puntoObjetivo !== null

  // Mutuamente excluyente con mostrarNotaRestriccion por construcción (una exige
  // puntoObjetivo !== null, esta exige lo contrario): el objetivo no fue alcanzado dentro
  // de lo explorado, con o sin restricción de costo de por medio — el propio extremo real
  // ya calculado por dominio (nunca un valor inventado) es el "$Y" del mensaje.
  const mostrarNotaObjetivoFueraDeAlcance =
    !objetivoIncluido && objetivoValorMensual !== null && objetivoValorMensual !== undefined

  return (
    <div className="grafico-esfuerzo-resultado">
      <p className="grafico-esfuerzo-resultado__titulo">Cómo cambia tu pensión proyectada según tu esfuerzo mensual</p>
      <svg
        className="grafico-esfuerzo-resultado__svg"
        viewBox={`0 0 ${ANCHO_SVG} ${ALTO_SVG}`}
        role="img"
        aria-label="Gráfico de esfuerzo mensual adicional contra pensión mensual proyectada"
      >
        {/* Ejes */}
        <line
          className="grafico-esfuerzo-resultado__eje"
          x1={ejeXInicio}
          y1={ejeYInicio}
          x2={ejeXInicio}
          y2={ejeYFin}
        />
        <line className="grafico-esfuerzo-resultado__eje" x1={ejeXInicio} y1={ejeYFin} x2={ejeXFin} y2={ejeYFin} />

        {/* Marcas del eje Y (pensión proyectada) */}
        {marcasY.map((valor, i) => {
          const y = AREA_GRAFICA.y + (i * AREA_GRAFICA.alto) / 2
          return (
            <text key={`y-${i}`} className="grafico-esfuerzo-resultado__marca" x={ejeXInicio - 10} y={y} textAnchor="end" dominantBaseline="middle">
              {formatearPesos(valor)}
            </text>
          )
        })}

        {/* Marcas del eje X (esfuerzo adicional mensual) */}
        {marcasX.map((valor, i) => {
          const x = AREA_GRAFICA.x + (i * AREA_GRAFICA.ancho) / 2
          return (
            <text key={`x-${i}`} className="grafico-esfuerzo-resultado__marca" x={x} y={ejeYFin + 20} textAnchor="middle">
              {formatearPesos(valor)}
            </text>
          )
        })}

        {/* Referencia horizontal del objetivo */}
        {yObjetivo !== null && (
          <>
            <line
              className="grafico-esfuerzo-resultado__objetivo"
              x1={ejeXInicio}
              y1={yObjetivo}
              x2={ejeXFin}
              y2={yObjetivo}
            />
            <text className="grafico-esfuerzo-resultado__objetivo-etiqueta" x={ejeXFin} y={yObjetivo - 6} textAnchor="end">
              Tu objetivo: {formatearPesos(objetivoValorMensual)}
            </text>
          </>
        )}

        {/* Línea que conecta los 5 puntos calculados */}
        <path className="grafico-esfuerzo-resultado__linea" d={ruta} />

        {/* Los 5 puntos de la rejilla */}
        {puntosSvg.map((p) => (
          <g key={p.indice}>
            <circle
              className={`grafico-esfuerzo-resultado__punto grafico-esfuerzo-resultado__punto--${p.posicion}`}
              cx={p.x}
              cy={p.y}
              r={RADIO_PUNTO[p.posicion]}
            />
            {ETIQUETA_POSICION[p.posicion] && (
              <text
                className="grafico-esfuerzo-resultado__punto-etiqueta"
                x={p.x}
                y={p.y - RADIO_PUNTO[p.posicion] - 8}
                textAnchor="middle"
              >
                {ETIQUETA_POSICION[p.posicion]}
              </text>
            )}
          </g>
        ))}

        {/* Marcador aparte del objetivo — nunca uno de los 5 puntos de la rejilla; forma
            de rombo (no un color nuevo) para distinguirlo sin romper la regla de una sola
            serie de color. */}
        {puntoObjetivoSvg && (
          <g>
            <polygon
              className="grafico-esfuerzo-resultado__punto-objetivo"
              points={`${puntoObjetivoSvg.x},${puntoObjetivoSvg.y - RADIO_PUNTO_OBJETIVO} ${puntoObjetivoSvg.x + RADIO_PUNTO_OBJETIVO},${puntoObjetivoSvg.y} ${puntoObjetivoSvg.x},${puntoObjetivoSvg.y + RADIO_PUNTO_OBJETIVO} ${puntoObjetivoSvg.x - RADIO_PUNTO_OBJETIVO},${puntoObjetivoSvg.y}`}
            />
            <text
              className="grafico-esfuerzo-resultado__punto-etiqueta grafico-esfuerzo-resultado__punto-etiqueta--objetivo"
              x={puntoObjetivoSvg.x}
              y={puntoObjetivoSvg.y - RADIO_PUNTO_OBJETIVO - 8}
              textAnchor="middle"
            >
              Tu objetivo
            </text>
          </g>
        )}

        {/* Títulos de eje */}
        <text className="grafico-esfuerzo-resultado__titulo-eje" x={ejeXInicio} y={14}>
          Pensión proyectada mensual
        </text>
        <text className="grafico-esfuerzo-resultado__titulo-eje" x={ejeXFin} y={ALTO_SVG - 4} textAnchor="end">
          Esfuerzo adicional mensual →
        </text>
      </svg>

      {mostrarNotaRestriccion && (
        <p className="grafico-esfuerzo-resultado__nota">
          Tu objetivo sí es alcanzable. La exploración termina aquí porque el límite de aporte adicional que
          indicaste no permite evaluar escenarios más altos.
        </p>
      )}

      {mostrarNotaObjetivoFueraDeAlcance && (
        <p className="grafico-esfuerzo-resultado__nota">
          Tu objetivo de {formatearPesos(objetivoValorMensual)} está por encima del máximo proyectado que este
          escenario permite alcanzar: {formatearPesos(extremo.resultado.valor)}.
        </p>
      )}
    </div>
  )
}

export default GraficoEsfuerzoResultado
