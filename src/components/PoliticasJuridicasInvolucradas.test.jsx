// @vitest-environment jsdom
//
// E6.6 (PL-260 §9.1/§9.6) — pruebas del componente aislado que presenta la sección "Nivel
// completo" de políticas jurídicas involucradas.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import PoliticasJuridicasInvolucradas from './PoliticasJuridicasInvolucradas.jsx'

afterEach(() => {
  cleanup()
})

const POLITICA_NO_RESUELTA = {
  nombre: 'PoliticaAnclaIncrementoMujer',
  estado: 'NO_RESUELTA',
  aplicaAEsteEjercicio: true,
  mensaje: 'Texto jurídico exacto ya producido por el comparador — nunca reescrito aquí.',
}

describe('PoliticasJuridicasInvolucradas — arreglo vacío es un estado de dominio válido', () => {
  it('con politicas:[] no renderiza nada — nunca una sección vacía', () => {
    const { container } = render(<PoliticasJuridicasInvolucradas politicas={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('con politicas ausente (undefined) tampoco lanza ni renderiza nada', () => {
    expect(() => render(<PoliticasJuridicasInvolucradas />)).not.toThrow()
  })
})

describe('PoliticasJuridicasInvolucradas — política NO_RESUELTA, mensaje literal', () => {
  it('muestra el nombre TRADUCIDO (nunca el identificador interno de código), estado traducido, si aplica al ejercicio, y el mensaje EXACTO — nunca resumido ni reescrito', () => {
    render(<PoliticasJuridicasInvolucradas politicas={[POLITICA_NO_RESUELTA]} />)
    expect(screen.getByText('Políticas jurídicas de este ejercicio')).toBeTruthy()
    // Corrección de auditoría visual (2026-09-25): el título ya no muestra
    // 'PoliticaAnclaIncrementoMujer' (identificador interno de código) — muestra su
    // traducción legible (etiquetaNombrePolitica).
    expect(screen.queryByText('PoliticaAnclaIncrementoMujer', { exact: false })).toBeNull()
    expect(screen.getByText('Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres', { exact: false })).toBeTruthy()
    expect(screen.getByText('No resuelta', { exact: false })).toBeTruthy()
    expect(screen.getByText('Aplica a este ejercicio.')).toBeTruthy()
    expect(
      screen.getByText('Texto jurídico exacto ya producido por el comparador — nunca reescrito aquí.')
    ).toBeTruthy()
  })

  it('aplicaAEsteEjercicio:false se declara explícitamente, nunca se omite la política', () => {
    render(<PoliticasJuridicasInvolucradas politicas={[{ ...POLITICA_NO_RESUELTA, aplicaAEsteEjercicio: false }]} />)
    expect(screen.getByText('No aplica a este ejercicio.')).toBeTruthy()
  })

  it('una política futura sin traducción conocida nunca se oculta — cae a su nombre humanizado, nunca al identificador crudo', () => {
    render(
      <PoliticasJuridicasInvolucradas
        politicas={[{ nombre: 'OtraPoliticaFutura', estado: 'RESUELTA', aplicaAEsteEjercicio: false, mensaje: 'Otro mensaje literal.' }]}
      />
    )
    expect(screen.getByText('Otra Politica Futura', { exact: false })).toBeTruthy()
    expect(screen.queryByText('OtraPoliticaFutura', { exact: false })).toBeNull()
  })
})

describe('PoliticasJuridicasInvolucradas — varias políticas, mismo orden de entrada', () => {
  it('renderiza cada política del arreglo, sin reordenar ni descartar ninguna', () => {
    const segunda = { nombre: 'OtraPoliticaFutura', estado: 'RESUELTA', aplicaAEsteEjercicio: false, mensaje: 'Otro mensaje literal.' }
    render(<PoliticasJuridicasInvolucradas politicas={[POLITICA_NO_RESUELTA, segunda]} />)
    const nombres = document.querySelectorAll('.politicas-juridicas__nombre')
    expect(nombres.length).toBe(2)
    expect(screen.getByText('Otro mensaje literal.')).toBeTruthy()
  })
})
