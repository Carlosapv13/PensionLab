// @vitest-environment jsdom
//
// E6.7 (PL-260 §9.6) — pruebas del componente aislado, enfocadas en la corrección de
// accesibilidad agregada en este checkpoint: role="img" en el <svg> oculta su contenido
// interno de la accesibilidad, así que aria-describedby debe apuntar a un texto equivalente
// (visualmente oculto) con las mismas cifras. No repite las pruebas ya exhaustivas de
// GraficoEsfuerzoResultado.helpers.test.js (escalado, dominio, etc.).

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import GraficoEsfuerzoResultado from './GraficoEsfuerzoResultado.jsx'

afterEach(() => {
  cleanup()
})

const BARRIDO_BASE = {
  estado: 'calculado',
  puntos: [
    { indice: 0, posicion: 'actual', esfuerzo: { costoPensionalAdicionalMensual: 0 }, resultado: { valor: 1500000 } },
    { indice: 1, posicion: 'intermedio', esfuerzo: { costoPensionalAdicionalMensual: 100000 }, resultado: { valor: 1700000 } },
    { indice: 2, posicion: 'intermedio', esfuerzo: { costoPensionalAdicionalMensual: 200000 }, resultado: { valor: 1900000 } },
    { indice: 3, posicion: 'intermedio', esfuerzo: { costoPensionalAdicionalMensual: 300000 }, resultado: { valor: 2100000 } },
    { indice: 4, posicion: 'extremo_superior', esfuerzo: { costoPensionalAdicionalMensual: 400000 }, resultado: { valor: 2300000 } },
  ],
  puntoObjetivo: null,
}

describe('GraficoEsfuerzoResultado — nombre accesible y descripción equivalente (E6.7)', () => {
  it('el <svg> declara role="img", un aria-label, y aria-describedby apuntando a un texto con las mismas cifras que dibuja', () => {
    const { container } = render(<GraficoEsfuerzoResultado barrido={BARRIDO_BASE} objetivoValorMensual={null} />)

    const svg = container.querySelector('svg')
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-label')).toBeTruthy()

    const idDescripcion = svg.getAttribute('aria-describedby')
    expect(idDescripcion).toBeTruthy()

    const descripcion = document.getElementById(idDescripcion)
    expect(descripcion).toBeTruthy()
    expect(descripcion.textContent).toContain('Hoy: sin aporte adicional, pensión proyectada $1.500.000.')
    expect(descripcion.textContent).toContain('$400.000 de aporte adicional mensual explorado')
  })

  it('el texto equivalente está visualmente oculto (clase .visually-hidden), nunca duplicado en pantalla para una persona vidente', () => {
    const { container } = render(<GraficoEsfuerzoResultado barrido={BARRIDO_BASE} objetivoValorMensual={null} />)
    const svg = container.querySelector('svg')
    const descripcion = document.getElementById(svg.getAttribute('aria-describedby'))
    expect(descripcion.className).toContain('visually-hidden')
  })

  it('con objetivo alcanzado dentro del barrido, el texto equivalente menciona "Tu objetivo" con la cifra exacta', () => {
    const barrido = {
      ...BARRIDO_BASE,
      puntoObjetivo: { esfuerzo: { costoPensionalAdicionalMensual: 150000 }, resultado: { valor: 1800000 } },
    }
    const { container } = render(<GraficoEsfuerzoResultado barrido={barrido} objetivoValorMensual={1800000} />)
    const svg = container.querySelector('svg')
    const descripcion = document.getElementById(svg.getAttribute('aria-describedby'))
    expect(descripcion.textContent).toContain('Tu objetivo ($1.800.000) se alcanza con $150.000 de aporte adicional mensual.')
  })

  it('estado objetivo_ya_alcanzado/sin_margen: no dibuja <svg> — el mensaje ya es texto plano, sin necesitar descripción aparte', () => {
    render(<GraficoEsfuerzoResultado barrido={{ estado: 'objetivo_ya_alcanzado', razon: 'Ya alcanzas tu objetivo hoy.' }} objetivoValorMensual={1000000} />)
    expect(screen.getByText('Ya alcanzas tu objetivo hoy.')).toBeTruthy()
    expect(document.querySelector('svg')).toBeNull()
  })

  it('barrido ausente (null): no renderiza nada, no lanza', () => {
    const { container } = render(<GraficoEsfuerzoResultado barrido={null} objetivoValorMensual={null} />)
    expect(container.innerHTML).toBe('')
  })
})
