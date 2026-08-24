import { describe, it, expect } from 'vitest'
import { determinarCamposFaltantesObjetivoRPM } from './determinarCamposFaltantesObjetivoRPM.js'

const VACIO = { objetivoPensionMensual: null, edadJubilacionDeseada: null }
const EDAD_ACTUAL_FIXTURE = 48 // misma persona de fixtures.js (fechaNacimiento 1978-02-11) usada en el caso reportado

describe('determinarCamposFaltantesObjetivoRPM', () => {
  it('nada confirmado, nada en borrador → faltan los dos campos requeridos', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: VACIO,
      borradorInterpretado: VACIO,
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).toEqual(['objetivoPensionMensual', 'edadJubilacionDeseada'])
    expect(resultado.listoParaAvanzar).toBe(false)
  })

  it('los dos ya confirmados en el expediente, borrador vacío → nada falta', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: 62 },
      borradorInterpretado: VACIO,
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).toEqual([])
    expect(resultado.listoParaAvanzar).toBe(true)
  })

  it('objetivo en el borrador (recién interpretado), edad ya confirmada antes → no falta ninguno', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: { objetivoPensionMensual: null, edadJubilacionDeseada: 62 },
      borradorInterpretado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: null },
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).toEqual([])
    expect(resultado.listoParaAvanzar).toBe(true)
  })

  it('solo objetivo interpretado, edad nunca capturada → falta exactamente edad (un solo dato)', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: VACIO,
      borradorInterpretado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: null },
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).toEqual(['edadJubilacionDeseada'])
    expect(resultado.listoParaAvanzar).toBe(false)
  })

  it('el borrador tiene prioridad sobre el expediente cuando ambos traen un valor (posible contradicción a revisar, nunca se descarta silenciosamente)', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: { objetivoPensionMensual: 2000000, edadJubilacionDeseada: 65 },
      borradorInterpretado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: null },
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    // No evalúa "cuál vale más" — solo que haya un valor suficiente para avanzar. Cuál de
    // los dos gana la escritura real es responsabilidad de la revisión humana (borrador),
    // no de este cálculo.
    expect(resultado.listoParaAvanzar).toBe(true)
  })

  it('objetivo en 0 (inválido, mismo criterio que generarCaminosRPM.js) → sigue faltando aunque no sea null', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: { objetivoPensionMensual: 0, edadJubilacionDeseada: 62 },
      borradorInterpretado: VACIO,
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).toEqual(['objetivoPensionMensual'])
  })

  it('restriccionCostoPensionalAdicionalMaximoMensual nunca aparece como campo requerido (opcional por diseño del dominio)', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: 62 },
      borradorInterpretado: VACIO,
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).not.toContain('restriccionCostoPensionalAdicionalMaximoMensual')
  })

  it('expedienteConfirmado/borradorInterpretado ausentes (undefined) → se tratan como vacíos, sin lanzar', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({})
    expect(resultado.camposFaltantes).toEqual(['objetivoPensionMensual', 'edadJubilacionDeseada'])
  })
})

describe('determinarCamposFaltantesObjetivoRPM — EVIDENCIA del bug de revisión visual (2026-08-23): "6" mientras se escribe "62" nunca debe declarar listoParaAvanzar', () => {
  it('REGRESIÓN EXACTA: objetivo ya interpretado (3.500.000), edad="6" (primer dígito de "62") → edad sigue faltando, CTA no debe habilitarse', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: VACIO,
      borradorInterpretado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: 6 },
      edadActual: EDAD_ACTUAL_FIXTURE,
    })
    expect(resultado.camposFaltantes).toEqual(['edadJubilacionDeseada'])
    expect(resultado.listoParaAvanzar).toBe(false)
  })

  it('secuencia real de tecleo "6" → "62": solo al llegar a 62 el resultado pasa a listo', () => {
    const secuencia = [6, 62].map((edadJubilacionDeseada) =>
      determinarCamposFaltantesObjetivoRPM({
        expedienteConfirmado: VACIO,
        borradorInterpretado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada },
        edadActual: EDAD_ACTUAL_FIXTURE,
      }).listoParaAvanzar
    )
    expect(secuencia).toEqual([false, true])
  })

  it('sin edadActual (caller no lo proveyó) → edadJubilacionDeseada nunca se declara lista, incluso con un valor por lo demás plausible como 62 — nunca "válido por defecto"', () => {
    const resultado = determinarCamposFaltantesObjetivoRPM({
      expedienteConfirmado: VACIO,
      borradorInterpretado: { objetivoPensionMensual: 3500000, edadJubilacionDeseada: 62 },
    })
    expect(resultado.camposFaltantes).toContain('edadJubilacionDeseada')
    expect(resultado.listoParaAvanzar).toBe(false)
  })
})
