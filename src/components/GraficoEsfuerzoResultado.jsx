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
//
// Marcador "Tu elección" (2026-08-23, decisión de producto): representa el escenario
// 'esfuerzo-adicional-deseado' de generarCaminosRPM.js — un tercer camino que la persona
// eligió explorar (ver ProyectaTuPensionRPM.jsx). Reutiliza exactamente el mismo mecanismo
// ya usado para "Tu objetivo" (`escenario.esfuerzo.costoPensionalAdicionalMensual` /
// `escenario.resultado.valor`, escalados con `construirPuntoSvg` — nunca recalculados, sin
// convertir esfuerzo→IBC en la UI) — el dominio no necesita saber nada de este marcador, el
// escenario ya trae la misma forma que `puntoObjetivo`. Independiente de si el objetivo es
// alcanzable: siempre se dibuja cuando existe un camino personalizado, sin importar qué
// ocurra con "Tu objetivo". Si coincide exactamente con el objetivo, ambos marcadores caen
// en el mismo píxel — se documenta ese solapamiento (ver test correspondiente), no se
// inventa un desplazamiento ni una regla de desempate no pedida.

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
  textoEtiquetaEleccion,
  etiquetaEleccionVaDebajo,
} from './GraficoEsfuerzoResultado.helpers.js'
import { formatearPesos } from '../format/formatearDinero.js'

// Jerarquía visual de dos niveles (decisión de producto, 2026-08-24): "Hoy" (posición
// 'actual') es protagonista, al mismo nivel que los marcadores "Tu elección"/"Tu objetivo"
// (radio 7 más abajo) — el resto de la rejilla (los 3 'intermedio' que solo dan forma a la
// curva, y el punto extremo donde termina la exploración) son contexto secundario: mismo
// dato, misma curva, mismo dominio, solo con menor peso visual (radio más chico aquí,
// opacidad reducida en App.css) para que no compitan por atención con la historia
// Hoy → Tu elección → Tu objetivo.
const RADIO_PUNTO = { actual: 6, intermedio: 3, referencia_superior: 5, limite_restriccion: 5, extremo_superior: 5 }

// Etiqueta corta junto al punto — deliberadamente neutral, nunca sugiere que el margen del
// 125% sea una meta o una recomendación ("Fin de exploración", no "Objetivo superior"). Las
// etiquetas de posiciones secundarias (todo excepto 'actual') se renderizan con menor peso
// tipográfico — ver ES_POSICION_SECUNDARIA y su uso más abajo.
const ETIQUETA_POSICION = {
  actual: 'Hoy',
  intermedio: null,
  referencia_superior: 'Fin de exploración',
  limite_restriccion: 'Límite de tu aporte adicional',
  extremo_superior: 'Tope explorado',
}

function esPosicionSecundaria(posicion) {
  return posicion !== 'actual'
}

const RADIO_PUNTO_OBJETIVO = 7
const RADIO_PUNTO_ELECCION = 7

// Ajuste 2026-08-27 (separación visual de "Tu objetivo"/la curva) — antes 8, exclusivamente
// para "Tu elección"; el gap de "Tu objetivo" (8, más abajo) queda sin cambios a propósito,
// ver etiquetaEleccionVaDebajo (helpers.js).
const GAP_PUNTO_ELECCION = 12

// Ajuste 2026-08-27 (b), tras validación visual: cuando la etiqueta va debajo del punto
// (etiquetaEleccionVaDebajo), queda más cerca de la curva que cuando va arriba — un gap
// aparte, solo para esa rama, la separa un poco más sin tocar la rama "arriba" (que sigue
// usando GAP_PUNTO_ELECCION) ni el caso de "Tu objetivo". Verificado con el fixture QA para
// $100.000/$200.000/$600.000 antes de fijar este valor: 14 es el mayor que mantiene margen
// seguro contra el eje X inferior en el caso más ajustado ($100.000).
const GAP_PUNTO_ELECCION_ABAJO = 14

// Alto de línea (unidades del viewBox, no em) entre las dos líneas de la etiqueta de "Tu
// objetivo"/"Tu elección" (2026-08-27, ajuste tras validación visual) — coherente con el
// tamaño de fuente ya usado por `.grafico-esfuerzo-resultado__punto-etiqueta` (11px,
// App.css). La segunda línea (la cifra) queda exactamente donde antes vivía la única
// línea de la etiqueta; la primera ("Tu objetivo"/"Tu elección") se agrega una línea más
// arriba — ninguna se acerca más al punto ni a la curva que la versión de una sola línea.
const ALTO_LINEA_ETIQUETA = 13

/**
 * @param {Object} props
 * @param {Object|null} props.barrido - `resultado.barrido` de generarCaminosRPM.js
 * @param {number|null} props.objetivoValorMensual
 * @param {Object|null} [props.escenarioPersonalizado] - escenario 'esfuerzo-adicional-deseado'
 *   de `resultado.escenarios` (generarCaminosRPM.js), o null/undefined si la persona no
 *   exploró ningún esfuerzo personalizado. Se ignora si no está en estado 'viable' (un
 *   camino descartado no trae `esfuerzo`/`resultado` utilizables).
 */
function GraficoEsfuerzoResultado({ barrido, objetivoValorMensual, escenarioPersonalizado = null }) {
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

  const puntoPersonalizado = escenarioPersonalizado?.estado === 'viable' ? escenarioPersonalizado : null

  const valoresX = puntos.map((p) => p.esfuerzo.costoPensionalAdicionalMensual)
  if (puntoObjetivo) valoresX.push(puntoObjetivo.esfuerzo.costoPensionalAdicionalMensual)
  if (puntoPersonalizado) valoresX.push(puntoPersonalizado.esfuerzo.costoPensionalAdicionalMensual)
  const dominioX = calcularDominioEje(valoresX)

  // objetivoIncluido: el objetivo solo entra al dominio Y (y se dibuja su línea/marcador)
  // cuando el barrido realmente lo alcanzó dentro de lo explorado — ver
  // calcularDominioYConObjetivo para el porqué (hallazgo de la revisión visual, 2026-08-21).
  // puntoPersonalizado, en cambio, siempre entra al dominio Y cuando existe — independiente
  // de si alcanza el objetivo (ver comentario de cabecera).
  const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(
    puntos,
    puntoObjetivo,
    objetivoValorMensual,
    puntoPersonalizado
  )
  const puntosSvg = construirPuntosSvg(puntos, dominioX, dominioY)
  const ruta = construirRutaLinea(puntosSvg)
  const puntoObjetivoSvg = puntoObjetivo ? construirPuntoSvg(puntoObjetivo, dominioX, dominioY) : null
  const puntoPersonalizadoSvg = puntoPersonalizado ? construirPuntoSvg(puntoPersonalizado, dominioX, dominioY) : null

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
                className={`grafico-esfuerzo-resultado__punto-etiqueta${
                  esPosicionSecundaria(p.posicion) ? ' grafico-esfuerzo-resultado__punto-etiqueta--secundaria' : ''
                }`}
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
            serie de color. Etiqueta con cifra exacta, en dos líneas vía <tspan>
            (2026-08-27, hallazgo de auditoría manual, ajustado tras validación visual): el
            rombo cae, por coincidencia geométrica, muy cerca del cruce de las marcas
            centrales de ambos ejes — sin una cifra propia, se prestaba a leerse contra esas
            marcas en vez de su valor real. Solo el ESFUERZO va en esta etiqueta — la
            pensión objetivo ya la identifica, sin repetirla, la línea horizontal
            "Tu objetivo: $X" de más abajo (evita una etiqueta larga y redundante). La
            segunda línea (la cifra) queda exactamente en la misma posición que ocupaba la
            única línea anterior; la primera línea ("Tu objetivo") se agrega una línea más
            arriba — ninguna de las dos se acerca más al punto ni a la curva que antes. El
            valor viene tal cual de `puntoObjetivo` (bit-idéntico al camino "objetivo" ya
            mostrado en la tarjeta, ver generarCaminosRPM.js) — nunca recalculado ni
            derivado de los ejes. */}
        {puntoObjetivoSvg && (
          <g>
            <polygon
              className="grafico-esfuerzo-resultado__punto-objetivo"
              points={`${puntoObjetivoSvg.x},${puntoObjetivoSvg.y - RADIO_PUNTO_OBJETIVO} ${puntoObjetivoSvg.x + RADIO_PUNTO_OBJETIVO},${puntoObjetivoSvg.y} ${puntoObjetivoSvg.x},${puntoObjetivoSvg.y + RADIO_PUNTO_OBJETIVO} ${puntoObjetivoSvg.x - RADIO_PUNTO_OBJETIVO},${puntoObjetivoSvg.y}`}
            />
            <text
              className="grafico-esfuerzo-resultado__punto-etiqueta grafico-esfuerzo-resultado__punto-etiqueta--objetivo"
              x={puntoObjetivoSvg.x}
              y={puntoObjetivoSvg.y - RADIO_PUNTO_OBJETIVO - 8 - ALTO_LINEA_ETIQUETA}
              textAnchor="middle"
            >
              <tspan x={puntoObjetivoSvg.x} dy={0}>Tu objetivo</tspan>
              <tspan x={puntoObjetivoSvg.x} dy={ALTO_LINEA_ETIQUETA}>
                {`${formatearPesos(puntoObjetivo.esfuerzo.costoPensionalAdicionalMensual)} adicionales`}
              </tspan>
            </text>
          </g>
        )}

        {/* Marcador aparte del esfuerzo personalizado ("Tu elección") — cuadrado, para
            distinguirse tanto de los círculos de la rejilla como del rombo del objetivo,
            sin introducir un color nuevo (misma regla que el marcador de objetivo). Si
            coincide exactamente con "Tu objetivo" caen en el mismo píxel — solapamiento
            documentado (ver GraficoEsfuerzoResultado.helpers.test.js), no resuelto aquí.
            Ajuste 2026-08-27 (hallazgo pendiente cerrado): las dos líneas ahora reparten
            esfuerzo y pensión proyectada, una variable por línea (textoEtiquetaEleccion,
            helpers.js) — antes la 2ª línea solo repetía el esfuerzo, sin decir a qué pensión
            equivale. Nunca IBC (este gráfico sigue siendo esfuerzo → pensión) ni % (ya vive
            en la tarjeta, "Frente a tu objetivo").
            Ajuste 2026-08-27 (b), tras validación visual: siempre centrada en X sobre su
            propio punto (sin cambios ahí — nunca se desplaza horizontalmente, eso arriesgaba
            salirse del viewBox en esfuerzos altos, ya verificado). En Y, en cambio, se voltea
            arriba/abajo del punto según etiquetaEleccionVaDebajo (helpers.js): por defecto
            arriba, igual que "Tu objetivo" — pero abajo cuando "Tu objetivo" queda posicionado
            arriba de "Tu elección", que si no competirían por el mismo espacio vertical
            (medido con el fixture QA: hasta 65 unidades de solape horizontal con solo 14 de
            margen). Gap respecto al propio punto, solo para "Tu elección" — el de "Tu
            objetivo" (8, arriba) queda intacto a propósito: 12 cuando va arriba
            (GAP_PUNTO_ELECCION), 14 cuando va abajo (GAP_PUNTO_ELECCION_ABAJO, ajuste
            2026-08-27 (b) — la rama "abajo" quedaba más cerca de la curva que la rama
            "arriba"). */}
        {puntoPersonalizadoSvg && (() => {
          const { lineaEleccion, lineaPension } = textoEtiquetaEleccion(puntoPersonalizado)
          const vaDebajo = etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, puntoObjetivoSvg)
          const yEtiquetaEleccion = vaDebajo
            ? puntoPersonalizadoSvg.y + RADIO_PUNTO_ELECCION + GAP_PUNTO_ELECCION_ABAJO
            : puntoPersonalizadoSvg.y - RADIO_PUNTO_ELECCION - GAP_PUNTO_ELECCION - ALTO_LINEA_ETIQUETA
          return (
            <g>
              <rect
                className="grafico-esfuerzo-resultado__punto-eleccion"
                x={puntoPersonalizadoSvg.x - RADIO_PUNTO_ELECCION}
                y={puntoPersonalizadoSvg.y - RADIO_PUNTO_ELECCION}
                width={RADIO_PUNTO_ELECCION * 2}
                height={RADIO_PUNTO_ELECCION * 2}
              />
              <text
                className="grafico-esfuerzo-resultado__punto-etiqueta grafico-esfuerzo-resultado__punto-etiqueta--eleccion"
                x={puntoPersonalizadoSvg.x}
                y={yEtiquetaEleccion}
                textAnchor="middle"
              >
                <tspan x={puntoPersonalizadoSvg.x} dy={0}>{lineaEleccion}</tspan>
                <tspan x={puntoPersonalizadoSvg.x} dy={ALTO_LINEA_ETIQUETA}>
                  {lineaPension}
                </tspan>
              </text>
            </g>
          )
        })()}

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
