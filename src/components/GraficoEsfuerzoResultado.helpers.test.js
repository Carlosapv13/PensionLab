import { describe, it, expect } from 'vitest'
import {
  AREA_GRAFICA,
  calcularDominioEje,
  calcularDominioYConObjetivo,
  escalarValor,
  construirPuntoSvg,
  construirPuntosSvg,
  construirRutaLinea,
  calcularYObjetivo,
  textoEtiquetaEleccion,
  etiquetaEleccionVaDebajo,
} from './GraficoEsfuerzoResultado.helpers.js'
import { formatearPesos } from '../format/formatearDinero.js'

describe('calcularDominioEje', () => {
  it('min/max reales cuando los valores difieren', () => {
    expect(calcularDominioEje([10, 5, 20, 0])).toEqual({ min: 0, max: 20 })
  })

  it('rango degenerado (todos iguales, distinto de cero) recibe un margen simétrico proporcional', () => {
    const { min, max } = calcularDominioEje([100, 100, 100])
    expect(min).toBeLessThan(100)
    expect(max).toBeGreaterThan(100)
    expect(max - 100).toBe(100 - min) // simétrico
  })

  it('rango degenerado en cero recibe un margen fijo (no puede ser proporcional a cero)', () => {
    expect(calcularDominioEje([0, 0])).toEqual({ min: -1, max: 1 })
  })
})

describe('escalarValor', () => {
  it('mapea el mínimo del dominio al inicio del rango y el máximo al final', () => {
    const dominio = { min: 0, max: 100 }
    expect(escalarValor(0, dominio, [10, 210])).toBe(10)
    expect(escalarValor(100, dominio, [10, 210])).toBe(210)
    expect(escalarValor(50, dominio, [10, 210])).toBe(110)
  })

  it('funciona con un rango invertido (eje Y de SVG, que crece hacia abajo)', () => {
    const dominio = { min: 0, max: 100 }
    expect(escalarValor(0, dominio, [300, 20])).toBe(300)
    expect(escalarValor(100, dominio, [300, 20])).toBe(20)
  })
})

describe('construirPuntoSvg', () => {
  const dominioX = { min: 0, max: 100000 }
  const dominioY = { min: 1000000, max: 1500000 }

  it('funciona con la misma forma { esfuerzo, resultado } tanto para un punto de la rejilla como para puntoObjetivo (sin indice/posicion)', () => {
    const puntoObjetivo = { esfuerzo: { costoPensionalAdicionalMensual: 50000 }, resultado: { valor: 1250000 } }
    const svg = construirPuntoSvg(puntoObjetivo, dominioX, dominioY)
    expect(svg).toEqual({ x: expect.any(Number), y: expect.any(Number) })
    expect(svg.x).toBeCloseTo(AREA_GRAFICA.x + AREA_GRAFICA.ancho / 2, 5) // a mitad del dominio X
  })

  it('construirPuntosSvg reutiliza construirPuntoSvg — mismas coordenadas para el mismo punto', () => {
    const punto = { indice: 1, posicion: 'intermedio', esfuerzo: { costoPensionalAdicionalMensual: 50000 }, resultado: { valor: 1200000 } }
    const [svgDeLista] = construirPuntosSvg([punto], dominioX, dominioY)
    const svgSuelto = construirPuntoSvg(punto, dominioX, dominioY)
    expect(svgDeLista.x).toBe(svgSuelto.x)
    expect(svgDeLista.y).toBe(svgSuelto.y)
  })
})

describe('construirPuntosSvg', () => {
  const puntos = [
    { indice: 0, posicion: 'actual', esfuerzo: { costoPensionalAdicionalMensual: 0 }, resultado: { valor: 1000000 } },
    { indice: 1, posicion: 'intermedio', esfuerzo: { costoPensionalAdicionalMensual: 50000 }, resultado: { valor: 1200000 } },
    { indice: 4, posicion: 'extremo_superior', esfuerzo: { costoPensionalAdicionalMensual: 100000 }, resultado: { valor: 1500000 } },
  ]
  const dominioX = { min: 0, max: 100000 }
  const dominioY = { min: 1000000, max: 1500000 }

  it('preserva índice y posición de cada punto, sin transformarlos', () => {
    const svg = construirPuntosSvg(puntos, dominioX, dominioY)
    expect(svg.map((p) => p.indice)).toEqual([0, 1, 4])
    expect(svg.map((p) => p.posicion)).toEqual(['actual', 'intermedio', 'extremo_superior'])
  })

  it('el punto de menor esfuerzo cae en el borde izquierdo del área gráfica', () => {
    const svg = construirPuntosSvg(puntos, dominioX, dominioY)
    expect(svg[0].x).toBeCloseTo(AREA_GRAFICA.x, 5)
  })

  it('el punto de mayor esfuerzo cae en el borde derecho del área gráfica', () => {
    const svg = construirPuntosSvg(puntos, dominioX, dominioY)
    expect(svg[2].x).toBeCloseTo(AREA_GRAFICA.x + AREA_GRAFICA.ancho, 5)
  })

  it('mayor resultado.valor produce menor y (SVG crece hacia abajo, arriba es "más pensión")', () => {
    const svg = construirPuntosSvg(puntos, dominioX, dominioY)
    expect(svg[2].y).toBeLessThan(svg[0].y)
  })
})

describe('construirRutaLinea', () => {
  it('empieza con M y conecta el resto con L, en el orden recibido — nunca interpola puntos nuevos', () => {
    const puntosSvg = [
      { x: 0, y: 10 },
      { x: 5, y: 20 },
      { x: 10, y: 5 },
    ]
    expect(construirRutaLinea(puntosSvg)).toBe('M0,10 L5,20 L10,5')
  })

  it('un único punto produce solo un M, sin ningún L', () => {
    expect(construirRutaLinea([{ x: 3, y: 4 }])).toBe('M3,4')
  })
})

describe('calcularDominioYConObjetivo', () => {
  const puntos = [
    { resultado: { valor: 2000000 } },
    { resultado: { valor: 3000000 } },
    { resultado: { valor: 4375000 } },
  ]

  it('objetivo alcanzado (puntoObjetivo no null): entra al dominio Y, objetivoIncluido true', () => {
    const puntoObjetivo = { resultado: { valor: 3500000 } }
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, puntoObjetivo, 3500000)
    expect(objetivoIncluido).toBe(true)
    expect(dominioY).toEqual({ min: 2000000, max: 4375000 }) // el objetivo ya cae dentro del rango de la curva
  })

  it('objetivo NO alcanzado (puntoObjetivo null): no entra al dominio Y aunque sea mucho mayor que el máximo de la curva', () => {
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, null, 37000000)
    expect(objetivoIncluido).toBe(false)
    // El dominio se construye solo con los resultados realmente explorados — nunca se
    // estira hasta un objetivo inalcanzable que comprimiría la curva real.
    expect(dominioY).toEqual({ min: 2000000, max: 4375000 })
  })

  it('un objetivo absurdamente alto (ej. fixture de $900M) no aplasta la curva real', () => {
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, null, 900000000)
    expect(objetivoIncluido).toBe(false)
    expect(dominioY.max).toBe(4375000)
  })

  it('sin objetivo declarado (null): se comporta igual que sin objetivo alcanzado', () => {
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, null, null)
    expect(objetivoIncluido).toBe(false)
    expect(dominioY).toEqual({ min: 2000000, max: 4375000 })
  })

  it('objetivo declarado como undefined: mismo tratamiento que null', () => {
    const { objetivoIncluido } = calcularDominioYConObjetivo(puntos, null, undefined)
    expect(objetivoIncluido).toBe(false)
  })

  it('puntoObjetivo siempre se incluye en el dominio aunque el objetivo declarado esté ausente (caso defensivo, no ocurre en la práctica)', () => {
    const puntoObjetivo = { resultado: { valor: 5000000 } }
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, puntoObjetivo, null)
    expect(objetivoIncluido).toBe(false) // objetivoValorMensual ausente, no se incluye SU valor
    expect(dominioY.max).toBe(5000000) // pero puntoObjetivo.resultado.valor sí, es un punto real del barrido
  })

  // A. Marcador "Tu elección" (decisión de producto 2026-08-23) — sin escenario
  // personalizado, el 4º parámetro se omite o es null: comportamiento idéntico al ya
  // probado arriba, ningún caso nuevo se activa.
  it('sin puntoPersonalizado (omitido): mismo resultado que antes de esta capacidad', () => {
    const puntoObjetivo = { resultado: { valor: 3500000 } }
    const conDefault = calcularDominioYConObjetivo(puntos, puntoObjetivo, 3500000)
    const conNullExplicito = calcularDominioYConObjetivo(puntos, puntoObjetivo, 3500000, null)
    expect(conDefault).toEqual(conNullExplicito)
    expect(conDefault.dominioY).toEqual({ min: 2000000, max: 4375000 })
  })

  // B. Con escenario personalizado presente, el dominio Y se estira para incluirlo aunque
  // caiga fuera del rango de la curva/objetivo ya calculados.
  it('con puntoPersonalizado fuera del rango de la curva: el dominio Y se estira para incluirlo', () => {
    const puntoPersonalizado = { resultado: { valor: 2731318 } } // dentro del rango en este caso
    const { dominioY } = calcularDominioYConObjetivo(puntos, null, null, puntoPersonalizado)
    expect(dominioY).toEqual({ min: 2000000, max: 4375000 }) // ya estaba dentro, no cambia el máximo

    const puntoPersonalizadoAlto = { resultado: { valor: 5200000 } } // por encima de todo lo demás
    const { dominioY: dominioYAlto } = calcularDominioYConObjetivo(puntos, null, null, puntoPersonalizadoAlto)
    expect(dominioYAlto.max).toBe(5200000) // el punto elegido nunca queda fuera del área visible
  })

  // C. Objetivo alcanzable + personalizado: ambos entran al dominio simultáneamente, sin
  // que uno excluya al otro — pueden coexistir en el mismo gráfico.
  it('objetivo alcanzable + personalizado: ambos valores entran al dominio Y, objetivoIncluido sigue true', () => {
    const puntoObjetivo = { resultado: { valor: 3500001 } } // "Tu objetivo" ($391.309 del caso real)
    const puntoPersonalizado = { resultado: { valor: 4900000 } } // "Tu elección", deliberadamente por encima de todo lo demás
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, puntoObjetivo, 3500000, puntoPersonalizado)
    expect(objetivoIncluido).toBe(true) // "Tu objetivo" se sigue dibujando
    expect(dominioY.max).toBe(4900000) // y el dominio se estiró para que "Tu elección" también quepa — coexisten
  })

  // D. Objetivo NO alcanzable + personalizado: objetivoIncluido debe seguir false — el
  // marcador de elección nunca "fabrica" un punto objetivo que el dominio no calculó.
  it('objetivo NO alcanzable + personalizado presente: objetivoIncluido sigue false, nunca se inventa "Tu objetivo"', () => {
    const puntoPersonalizado = { resultado: { valor: 2731318 } }
    const { dominioY, objetivoIncluido } = calcularDominioYConObjetivo(puntos, null, 8000000, puntoPersonalizado)
    expect(objetivoIncluido).toBe(false)
    expect(dominioY.max).toBeGreaterThanOrEqual(2731318) // el personalizado sí entra
    expect(dominioY.max).toBeLessThan(8000000) // el objetivo inalcanzable NO estira el dominio
  })
})

// E. Coincidencia exacta entre "Tu elección" y "Tu objetivo": documenta que ambos marcadores
// caen en el mismo píxel cuando representan la misma cifra — comportamiento actual, no
// resuelto con desplazamiento ni tolerancia (decisión de producto explícita, 2026-08-23).
describe('construirPuntoSvg — solapamiento cuando el esfuerzo personalizado coincide con el objetivo', () => {
  it('mismo esfuerzo y mismo resultado → mismas coordenadas SVG exactas (superposición documentada, no evitada)', () => {
    const dominioX = { min: 0, max: 500000 }
    const dominioY = { min: 2000000, max: 3500001 }
    const puntoObjetivo = { esfuerzo: { costoPensionalAdicionalMensual: 391309 }, resultado: { valor: 3500001 } }
    const puntoPersonalizadoIgual = { esfuerzo: { costoPensionalAdicionalMensual: 391309 }, resultado: { valor: 3500001 } }

    const svgObjetivo = construirPuntoSvg(puntoObjetivo, dominioX, dominioY)
    const svgEleccion = construirPuntoSvg(puntoPersonalizadoIgual, dominioX, dominioY)

    expect(svgEleccion).toEqual(svgObjetivo) // mismo píxel — un marcador queda visualmente encima del otro
  })

  it('coordenadas iguales, pero cada punto conserva sus propios valores de esfuerzo/resultado — la etiqueta de cada marcador (construida en GraficoEsfuerzoResultado.jsx a partir de estos mismos objetos) nunca podría mostrar la cifra del otro', () => {
    const dominioX = { min: 0, max: 500000 }
    const dominioY = { min: 2000000, max: 3500001 }
    const puntoObjetivo = { esfuerzo: { costoPensionalAdicionalMensual: 391309 }, resultado: { valor: 3500001 } }
    const puntoPersonalizadoIgual = { esfuerzo: { costoPensionalAdicionalMensual: 391309 }, resultado: { valor: 3500001 } }

    construirPuntoSvg(puntoObjetivo, dominioX, dominioY)
    construirPuntoSvg(puntoPersonalizadoIgual, dominioX, dominioY)

    // Mismo píxel (ya demostrado arriba) no implica mismo objeto — cada marcador lee su
    // propio esfuerzo/resultado, nunca uno compartido ni derivado del otro.
    expect(puntoPersonalizadoIgual).not.toBe(puntoObjetivo)
    expect(puntoPersonalizadoIgual.esfuerzo).not.toBe(puntoObjetivo.esfuerzo)
  })
})

// Corrección de representación/UX (2026-08-27, hallazgo de auditoría manual; ajustado el
// mismo día tras validación visual — la primera versión, en una sola línea con esfuerzo Y
// pensión, resultó larga y redundante). El rombo "Tu objetivo" muestra, en dos líneas vía
// <tspan>, únicamente su etiqueta y el esfuerzo mensual exacto — nunca la pensión, que ya
// identifica sin repetirla la línea horizontal "Tu objetivo: $X"
// (calcularYObjetivo/objetivoValorMensual, sin cambios). GraficoEsfuerzoResultado.jsx no
// tiene infraestructura de componente para verificar el <text>/<tspan> renderizado (sin
// jsdom/RTL) — este test ancla, al nivel disponible, las mismas dos líneas de texto que la
// JSX construye a partir de `puntoObjetivo`, usando el caso real reportado (auditoría
// 2026-08-27): $302.026,08 de aporte adicional. La validación de que las dos líneas
// realmente aparecen en pantalla, en la posición correcta, legibles y sin taparse con la
// línea, queda como verificación manual (ver matriz funcional).
describe('Etiqueta de "Tu objetivo" — dos líneas, solo esfuerzo, mismo texto que construye GraficoEsfuerzoResultado.jsx', () => {
  function lineasMarcador(etiqueta, punto) {
    return [etiqueta, `${formatearPesos(punto.esfuerzo.costoPensionalAdicionalMensual)} adicionales`]
  }

  it('caso real (auditoría 2026-08-27): línea 1 "Tu objetivo", línea 2 "$302.026 adicionales" — nunca la pensión, nunca las marcas de eje ($336.598 / $7.151.296)', () => {
    const puntoObjetivoCasoReal = {
      esfuerzo: { costoPensionalAdicionalMensual: 302026.0800000001 },
      resultado: { valor: 7000000.244372 },
    }
    const [linea1, linea2] = lineasMarcador('Tu objetivo', puntoObjetivoCasoReal)

    expect(linea1).toBe('Tu objetivo')
    expect(linea2).toBe('$302.026 adicionales')
    expect(linea2).not.toContain('336.598')
    expect(linea2).not.toContain('7.151.296')
    expect(linea2).not.toContain('7.000.000') // la pensión no se repite aquí — la muestra la línea horizontal
  })

  it('funciona razonablemente con cifras más largas (esfuerzo de 7 dígitos)', () => {
    const puntoEsfuerzoGrande = { esfuerzo: { costoPensionalAdicionalMensual: 1234567 }, resultado: { valor: 9000000 } }
    const [, linea2] = lineasMarcador('Tu objetivo', puntoEsfuerzoGrande)
    expect(linea2).toBe('$1.234.567 adicionales')
  })
})

// Ajuste UX/producto (2026-08-27) — hallazgo pendiente cerrado: a diferencia de "Tu
// objetivo" (arriba, sin cambios), "Tu elección" no tiene una línea horizontal equivalente
// que ya identifique su pensión — por eso, y solo para este marcador, la 2ª línea deja de
// repetir el esfuerzo y pasa a mostrar la pensión proyectada resultante. Testea la función
// real exportada (textoEtiquetaEleccion), no una reimplementación local — a diferencia del
// bloque de "Tu objetivo" arriba, que sí necesita `lineasMarcador` porque ese patrón vive
// inline en el JSX, nunca extraído a un helper (sin un segundo consumidor real, Principio 9).
describe('textoEtiquetaEleccion — "Tu elección": una línea por variable (esfuerzo, pensión), nunca IBC ni %', () => {
  it('caso real (fixture QA, esfuerzo $200.000): línea 1 con el esfuerzo, línea 2 con la pensión proyectada', () => {
    const puntoPersonalizado = {
      esfuerzo: { costoPensionalAdicionalMensual: 200000 },
      resultado: { valor: 6513702.781798975 },
    }
    const { lineaEleccion, lineaPension } = textoEtiquetaEleccion(puntoPersonalizado)

    expect(lineaEleccion).toBe('Tu elección: $200.000')
    expect(lineaPension).toBe('Pensión: $6.513.703')
  })

  it('dos escenarios con valores distintos producen líneas que reflejan cada uno los suyos, sin mezclarlos', () => {
    const a = { esfuerzo: { costoPensionalAdicionalMensual: 150000 }, resultado: { valor: 6100000 } }
    const b = { esfuerzo: { costoPensionalAdicionalMensual: 391865 }, resultado: { valor: 6900000 } }

    expect(textoEtiquetaEleccion(a)).toEqual({ lineaEleccion: 'Tu elección: $150.000', lineaPension: 'Pensión: $6.100.000' })
    expect(textoEtiquetaEleccion(b)).toEqual({ lineaEleccion: 'Tu elección: $391.865', lineaPension: 'Pensión: $6.900.000' })
  })

  it('nunca menciona IBC ni el símbolo de porcentaje — ese gráfico sigue siendo esfuerzo → pensión, y el % ya vive en la tarjeta', () => {
    const puntoPersonalizado = { esfuerzo: { costoPensionalAdicionalMensual: 200000 }, resultado: { valor: 6513703 } }
    const { lineaEleccion, lineaPension } = textoEtiquetaEleccion(puntoPersonalizado)

    for (const linea of [lineaEleccion, lineaPension]) {
      expect(linea).not.toMatch(/ibc/i)
      expect(linea).not.toContain('%')
    }
  })
})

describe('calcularYObjetivo', () => {
  it('un objetivo dentro del dominio cae dentro del área gráfica', () => {
    const dominioY = { min: 1000000, max: 2000000 }
    const y = calcularYObjetivo(1500000, dominioY)
    expect(y).toBeGreaterThan(AREA_GRAFICA.y)
    expect(y).toBeLessThan(AREA_GRAFICA.y + AREA_GRAFICA.alto)
  })

  it('el objetivo en el máximo del dominio cae en el borde superior del área gráfica', () => {
    const dominioY = { min: 1000000, max: 2000000 }
    expect(calcularYObjetivo(2000000, dominioY)).toBeCloseTo(AREA_GRAFICA.y, 5)
  })
})

// Ajuste UX/producto (2026-08-27, hallazgo de validación visual): "Tu objetivo" y "Tu
// elección" competían visualmente cuando quedaban cerca — este helper decide arriba/abajo
// para "Tu elección" únicamente, sin tocar "Tu objetivo" ni el eje X. Coordenadas de los
// dos primeros tests tomadas literalmente de la verificación numérica contra el fixture QA
// (src/dev/fixtures.js) para $200.000 y $600.000 — no inventadas.
describe('etiquetaEleccionVaDebajo — arriba/abajo de "Tu elección" según la posición de "Tu objetivo"', () => {
  it('caso real (fixture QA, esfuerzo $200.000): "Tu objetivo" queda arriba de "Tu elección" → etiqueta va debajo', () => {
    const puntoObjetivoSvg = { x: 304.7334891988612, y: 160.1134817980046 }
    const puntoPersonalizadoSvg = { x: 230.16849591191675, y: 199.04880735899346 }
    expect(etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, puntoObjetivoSvg)).toBe(true)
  })

  it('caso real (fixture QA, esfuerzo $600.000): "Tu objetivo" queda abajo de "Tu elección" → etiqueta se mantiene arriba', () => {
    const puntoObjetivoSvg = { x: 304.7334891988612, y: 160.1134817980046 }
    const puntoPersonalizadoSvg = { x: 522.5054877357502, y: 47.44043355070619 }
    expect(etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, puntoObjetivoSvg)).toBe(false)
  })

  it('sin puntoObjetivoSvg (objetivo no incluido en el dominio actual): comportamiento por defecto, arriba', () => {
    const puntoPersonalizadoSvg = { x: 100, y: 100 }
    expect(etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, null)).toBe(false)
  })

  it('igualdad exacta de Y: cae en la rama por defecto (arriba), no en la de "debajo"', () => {
    const puntoObjetivoSvg = { x: 50, y: 150 }
    const puntoPersonalizadoSvg = { x: 200, y: 150 }
    expect(etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, puntoObjetivoSvg)).toBe(false)
  })

  it('la posición en X de ambos puntos nunca influye en la decisión — solo Y', () => {
    const puntoObjetivoSvg = { x: 999999, y: 50 } // muy arriba, X irrelevante
    const puntoPersonalizadoSvg = { x: -999999, y: 200 } // muy abajo, X irrelevante
    expect(etiquetaEleccionVaDebajo(puntoPersonalizadoSvg, puntoObjetivoSvg)).toBe(true)
  })
})
