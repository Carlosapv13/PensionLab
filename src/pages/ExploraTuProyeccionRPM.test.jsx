// @vitest-environment jsdom
//
// Corrección de auditoría visual (2026-09-26, validación de Carlos/Atlas sobre el Preview del
// commit 31221ec, Caso B) — mismo criterio que DetallePasoAuditable.test.jsx: directiva
// `@vitest-environment jsdom` acotada a este archivo, sin `@testing-library/jest-dom`.
//
// `calcularPensionRPM` (dominio, sin tocar) se mockea deliberadamente en vez de construir una
// `historiaCotizacion` real que produzca exactamente 521.9 semanas/64.56% — esto prueba la
// capa de presentación en aislamiento, con los mismos números literales que reportaron
// Carlos/Atlas, sin depender de la fecha real del sistema ni de la aritmética interna del
// dominio (ya cubierta por calcularPensionRPM.test.js, sin cambios).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('../domain/pensionEngine/calcularPensionRPM.js', () => ({
  calcularPensionRPM: vi.fn(),
}))

import { calcularPensionRPM } from '../domain/pensionEngine/calcularPensionRPM.js'
import ExploraTuProyeccionRPM from './ExploraTuProyeccionRPM.jsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const HISTORIA_MINIMA = [{ fechaDesde: '2016-01-01', fechaHasta: '2026-01-01', ibc: 4000000, diasCotizados: 3653 }]

function resultadoCalculado(overrides = {}) {
  return {
    estado: 'calculado',
    razonNoEvaluable: null,
    ibl: {
      ordinario: { valor: 3500000, detalle: [] },
      vidaLaboral: null,
      aplicable: 3500000,
      esOpcionLegal: false,
      razonVidaLaboralNoEvaluada: null,
    },
    totalDiasCotizados: 3653,
    semanasObservadas: 521.9,
    tasaReemplazo: 64.56,
    resultadoEconomicoActual: 3211757,
    limitaciones: [],
    trazabilidadVentana: {},
    datosFaltantes: null,
    vigenciaSmlv: { aptoParaCalculoEnFechaBase: true },
    ...overrides,
  }
}

function renderPantalla(resultado) {
  calcularPensionRPM.mockReturnValue(resultado)
  render(
    <ExploraTuProyeccionRPM
      historiaCotizacion={HISTORIA_MINIMA}
      regimenActual="RPM"
      nivelConocimientoSemanas="conocido"
      semanasCotizadas="1500"
      trasladoRegimen={null}
      onVolver={() => {}}
    />
  )
}

describe('ExploraTuProyeccionRPM — semanas observadas (corrección Caso B)', () => {
  it('521.9 semanas se presenta como semanas completas y días, nunca el decimal crudo', () => {
    renderPantalla(resultadoCalculado({ semanasObservadas: 521.9 }))
    expect(screen.getByText('521 semanas y 6 días cotizados, según tu historia.')).toBeTruthy()
    expect(screen.queryByText(/521\.9/)).toBeNull()
    expect(document.body.textContent).not.toMatch(/521\.9/)
  })

  it('un número entero de semanas no muestra "0 días"', () => {
    renderPantalla(resultadoCalculado({ semanasObservadas: 500 }))
    expect(screen.getByText('500 semanas cotizados, según tu historia.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/0 días/)
  })
})

describe('ExploraTuProyeccionRPM — tasa de reemplazo en formato español (corrección Caso B)', () => {
  // `document.body.textContent` en vez de `screen.getByText(regex)` a propósito: un regex
  // de subcadena coincide también con los `<div>`/`<form>` ancestros (mismo texto concatenado
  // con el resto de la pantalla), lo que produciría "multiple elements found" en vez de una
  // aserción útil — la comprobación exacta de cadena completa (ver bloque de semanas arriba)
  // sí es segura porque ningún ancestro tiene exactamente ese texto propio.
  it('64.56 se muestra como 64,56% (coma decimal, es-CO)', () => {
    renderPantalla(resultadoCalculado({ tasaReemplazo: 64.56 }))
    expect(document.body.textContent).toContain('En tu caso es 64,56%.')
    expect(document.body.textContent).not.toMatch(/64\.56/)
  })

  it('80 se mantiene como 80%, sin decimales agregados', () => {
    renderPantalla(resultadoCalculado({ tasaReemplazo: 80 }))
    expect(document.body.textContent).toContain('En tu caso es 80%.')
    expect(document.body.textContent).not.toMatch(/80,00%|80\.00%/)
  })
})

describe('ExploraTuProyeccionRPM — IBL y resultado económico exactos (sin regresión)', () => {
  it('conserva el IBL y el resultado económico exactos junto al nuevo formato', () => {
    renderPantalla(resultadoCalculado())
    expect(document.body.textContent).toContain('En tu caso es $3.500.000, calculado sobre los últimos 10 años')
    expect(document.body.textContent).toContain('$3.211.757 mensuales')
  })
})
