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
} from './GraficoEsfuerzoResultado.helpers.js'

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
