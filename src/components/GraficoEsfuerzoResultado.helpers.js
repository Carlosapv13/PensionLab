// Funciones puras de escalado para GraficoEsfuerzoResultado.jsx — S4-005.
//
// Presentación pura: nunca calculan esfuerzo, resultado ni ningún valor de dominio, solo
// transforman valores ya calculados por generarCaminosRPM.js (barrido.puntos) a
// coordenadas de píxel dentro de un viewBox fijo. Testeable con Vitest sin montar el
// componente — mismo patrón ya establecido por ProyectaTuPensionRPM.helpers.js.

import { formatearPesos } from '../format/formatearDinero.js'

export const ANCHO_SVG = 600
export const ALTO_SVG = 320
export const MARGEN = { arriba: 20, derecha: 24, abajo: 44, izquierda: 84 }
export const AREA_GRAFICA = {
  x: MARGEN.izquierda,
  y: MARGEN.arriba,
  ancho: ANCHO_SVG - MARGEN.izquierda - MARGEN.derecha,
  alto: ALTO_SVG - MARGEN.arriba - MARGEN.abajo,
}

/**
 * Dominio [min, max] de un eje a partir de los valores reales que debe cubrir. Rango
 * degenerado (todos los valores iguales, ej. un barrido sin margen real de esfuerzo)
 * recibe un margen simétrico artificial solo para evitar división por cero al escalar —
 * nunca se inventa un dato, solo se evita un NaN geométrico.
 *
 * @param {Array<number>} valores
 * @returns {{min: number, max: number}}
 */
export function calcularDominioEje(valores) {
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  if (min === max) {
    const margen = min === 0 ? 1 : Math.abs(min) * 0.1
    return { min: min - margen, max: max + margen }
  }
  return { min, max }
}

/**
 * Escala lineal de un valor de dominio a un rango de píxeles.
 *
 * @param {number} valor
 * @param {{min: number, max: number}} dominio
 * @param {[number, number]} rangoPixeles
 * @returns {number}
 */
export function escalarValor(valor, dominio, rangoPixeles) {
  const [pixelInicio, pixelFin] = rangoPixeles
  const fraccion = (valor - dominio.min) / (dominio.max - dominio.min)
  return pixelInicio + fraccion * (pixelFin - pixelInicio)
}

/**
 * Convierte UN punto (forma { esfuerzo, resultado } — la misma que cada elemento de
 * barrido.puntos y también la de barrido.puntoObjetivo) a coordenadas de píxel — eje X =
 * esfuerzo.costoPensionalAdicionalMensual, eje Y = resultado.valor (invertido, porque en
 * SVG y crece hacia abajo). Reutilizado tanto para los 5 puntos de la rejilla como para el
 * marcador aparte del objetivo — mismo cálculo, ninguna lógica duplicada.
 *
 * @param {{esfuerzo: {costoPensionalAdicionalMensual: number}, resultado: {valor: number}}} punto
 * @param {{min: number, max: number}} dominioX
 * @param {{min: number, max: number}} dominioY
 * @returns {{x: number, y: number}}
 */
export function construirPuntoSvg(punto, dominioX, dominioY) {
  const rangoX = [AREA_GRAFICA.x, AREA_GRAFICA.x + AREA_GRAFICA.ancho]
  const rangoY = [AREA_GRAFICA.y + AREA_GRAFICA.alto, AREA_GRAFICA.y]
  return {
    x: escalarValor(punto.esfuerzo.costoPensionalAdicionalMensual, dominioX, rangoX),
    y: escalarValor(punto.resultado.valor, dominioY, rangoY),
  }
}

/**
 * Convierte los puntos del barrido (ya calculados por dominio) a coordenadas de píxel.
 *
 * @param {Array<Object>} puntos - barrido.puntos de generarCaminosRPM.js
 * @param {{min: number, max: number}} dominioX
 * @param {{min: number, max: number}} dominioY
 * @returns {Array<{indice: number, posicion: string, x: number, y: number}>}
 */
export function construirPuntosSvg(puntos, dominioX, dominioY) {
  return puntos.map((punto) => ({
    indice: punto.indice,
    posicion: punto.posicion,
    ...construirPuntoSvg(punto, dominioX, dominioY),
  }))
}

/**
 * Atributo `d` de un <path> que conecta los puntos en orden — solo une lo ya calculado,
 * nunca interpola ni infiere valores intermedios.
 *
 * @param {Array<{x: number, y: number}>} puntosSvg
 * @returns {string}
 */
export function construirRutaLinea(puntosSvg) {
  return puntosSvg.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
}

/**
 * Dominio Y del gráfico a partir de los resultados del barrido, más el objetivo declarado
 * SOLO cuando el barrido realmente lo alcanzó (`puntoObjetivo !== null`) — un objetivo
 * inalcanzable dentro de lo explorado nunca debe estirar el eje Y a costa de comprimir la
 * curva que sí es real (corrección 2026-08-21, cuarta iteración de S4-005: misma
 * disciplina "nunca más allá de lo realmente explorable" que ya regía el eje X/rango de
 * IBC, aplicada ahora también al eje Y). `objetivoIncluido` es la misma señal que el
 * componente usa para decidir si dibuja la línea/etiqueta del objetivo o, en su lugar, un
 * mensaje textual fuera del SVG.
 *
 * `puntoPersonalizado` (decisión de producto 2026-08-23, marcador "Tu elección") — a
 * diferencia del objetivo, siempre se incluye en el dominio cuando existe: no depende de
 * si alcanza ninguna meta, solo de que la persona lo haya explorado. Nunca afecta
 * `objetivoIncluido` — ambas señales son independientes por diseño (ver GraficoEsfuerzoResultado.jsx).
 *
 * @param {Array<{resultado: {valor: number}}>} puntos - barrido.puntos
 * @param {{resultado: {valor: number}}|null} puntoObjetivo - barrido.puntoObjetivo
 * @param {number|null} objetivoValorMensual
 * @param {{resultado: {valor: number}}|null} [puntoPersonalizado] - escenario esfuerzo-adicional-deseado, ya calculado por dominio
 * @returns {{dominioY: {min: number, max: number}, objetivoIncluido: boolean}}
 */
export function calcularDominioYConObjetivo(puntos, puntoObjetivo, objetivoValorMensual, puntoPersonalizado = null) {
  const objetivoDeclarado = objetivoValorMensual !== null && objetivoValorMensual !== undefined
  const objetivoIncluido = puntoObjetivo !== null && objetivoDeclarado

  const valoresY = puntos.map((p) => p.resultado.valor)
  if (puntoObjetivo) valoresY.push(puntoObjetivo.resultado.valor)
  if (objetivoIncluido) valoresY.push(objetivoValorMensual)
  if (puntoPersonalizado) valoresY.push(puntoPersonalizado.resultado.valor)

  return { dominioY: calcularDominioEje(valoresY), objetivoIncluido }
}

/**
 * Posición Y (píxel) de la línea de referencia horizontal del objetivo, o null si el
 * objetivo cae fuera del dominio Y ya calculado (no se fuerza a expandir el dominio para
 * que siempre quepa — ver calcularDominioEjeY en el componente, que sí lo incluye a
 * propósito cuando corresponde).
 *
 * @param {number} objetivoValorMensual
 * @param {{min: number, max: number}} dominioY
 * @returns {number}
 */
export function calcularYObjetivo(objetivoValorMensual, dominioY) {
  const rangoY = [AREA_GRAFICA.y + AREA_GRAFICA.alto, AREA_GRAFICA.y]
  return escalarValor(objetivoValorMensual, dominioY, rangoY)
}

// Ajuste UX/producto (2026-08-27) — hallazgo pendiente cerrado: el marcador "Tu elección"
// mostraba solo el esfuerzo, nunca la pensión proyectada resultante. Exactamente dos líneas,
// mismo alto total que antes (ninguna cambia MARGEN/AREA_GRAFICA ni el cálculo de posición
// del <text> en GraficoEsfuerzoResultado.jsx, solo su contenido) — verificado geométricamente
// contra el fixture QA (dev/fixtures.js) antes de este cambio, incluido un caso límite de
// esfuerzo alto cerca del borde superior derecho del viewBox. Nunca IBC (este gráfico sigue
// siendo esfuerzo → pensión, no un segundo lugar para el IBC ya protagonista en la tarjeta) ni
// %  (ya vive en la tarjeta, "Frente a tu objetivo" — evita la redundancia ya descartada en la
// revisión crítica de diseño). Puro formato: ambos valores ya vienen calculados por
// generarCaminosRPM.js dentro de `puntoPersonalizado` — ninguna resta ni derivación nueva.
/**
 * @param {{esfuerzo: {costoPensionalAdicionalMensual: number}, resultado: {valor: number}}} puntoPersonalizado
 * @returns {{lineaEleccion: string, lineaPension: string}}
 */
export function textoEtiquetaEleccion(puntoPersonalizado) {
  return {
    lineaEleccion: `Tu elección: ${formatearPesos(puntoPersonalizado.esfuerzo.costoPensionalAdicionalMensual)}`,
    lineaPension: `Pensión: ${formatearPesos(puntoPersonalizado.resultado.valor)}`,
  }
}

// Ajuste UX/producto (2026-08-27, hallazgo de validación visual) — decide si la etiqueta
// "Tu elección" se dibuja arriba o abajo de su propio punto: arriba es el comportamiento
// histórico (mismo que "Tu objetivo", sin cambios), salvo que "Tu objetivo" esté
// posicionado arriba de "Tu elección" en el eje Y — ahí ambas etiquetas, que por defecto
// crecen hacia arriba de su punto, terminan compitiendo por el mismo espacio vertical
// (medido con el fixture QA: hasta 65 unidades de solape horizontal con solo 14 de margen
// vertical). Nunca toca el eje X ni la posición de "Tu objetivo" — GraficoEsfuerzoResultado.jsx
// sigue siendo el único dueño de los radios/gaps/alto de línea (constantes de layout, no de
// escala). Igualdad exacta de Y cae en la rama "arriba" (comportamiento por defecto): no hay
// evidencia de que competir sea peor que no voltear en ese empate exacto de punto flotante,
// prácticamente inalcanzable en la práctica, y no amerita una tercera rama solo para eso.
// Sin puntoObjetivoSvg (objetivo no incluido en el dominio Y actual), no hay nada que
// evitar: mismo comportamiento de siempre. Puro: nunca dibuja, nunca recalcula esfuerzo ni
// pensión — solo decide un booleano a partir de coordenadas ya calculadas por
// construirPuntoSvg.
/**
 * @param {{x: number, y: number}} puntoPersonalizadoSvg
 * @param {{x: number, y: number}|null} puntoObjetivoSvg
 * @returns {boolean}
 */
export function etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, puntoObjetivoSvg) {
  return puntoObjetivoSvg !== null && puntoObjetivoSvg.y < puntoPersonalizadoSvg.y
}
