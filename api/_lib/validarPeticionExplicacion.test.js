import { describe, it, expect } from 'vitest'
import { validarPeticionExplicacion } from './validarPeticionExplicacion.js'

const PETICION_VALIDA = {
  escenarios: [{ id: 'base', decision: 'Mantener tu aporte actual.', tipo: 'base', cumpleObjetivo: false }],
  hechos: { porEscenario: { base: { pensionProyectada: '$3.100.000' } }, global: { diasHorizonte: '730' } },
  contexto: { declaracionLibre: 'Quiero pensionarme con al menos 3.500.000 al mes.', caminoMasAlineadoId: 'base' },
}

describe('validarPeticionExplicacion — casos válidos', () => {
  it('petición completa y bien formada → válida', () => {
    expect(validarPeticionExplicacion(PETICION_VALIDA)).toEqual({ valido: true, ...PETICION_VALIDA })
  })

  it('declaracionLibre y caminoMasAlineadoId en null → válida', () => {
    const peticion = { ...PETICION_VALIDA, contexto: { declaracionLibre: null, caminoMasAlineadoId: null } }
    expect(validarPeticionExplicacion(peticion).valido).toBe(true)
  })
})

describe('validarPeticionExplicacion — EVIDENCIA: rechaza cualquier forma inesperada, nunca lanza', () => {
  it('cuerpo null, no-objeto o arreglo → CUERPO_INVALIDO', () => {
    expect(validarPeticionExplicacion(null)).toEqual({ valido: false, codigo: 'CUERPO_INVALIDO' })
    expect(validarPeticionExplicacion('texto')).toEqual({ valido: false, codigo: 'CUERPO_INVALIDO' })
    expect(validarPeticionExplicacion([])).toEqual({ valido: false, codigo: 'CUERPO_INVALIDO' })
    expect(validarPeticionExplicacion(undefined)).toEqual({ valido: false, codigo: 'CUERPO_INVALIDO' })
  })

  it('clave adicional no permitida (ej. historiaCotizacion completa) → CLAVES_NO_PERMITIDAS', () => {
    const peticion = { ...PETICION_VALIDA, historiaCotizacion: [] }
    expect(validarPeticionExplicacion(peticion)).toEqual({ valido: false, codigo: 'CLAVES_NO_PERMITIDAS' })
  })

  it('falta una clave requerida → CLAVES_NO_PERMITIDAS', () => {
    const sinContexto = { escenarios: PETICION_VALIDA.escenarios, hechos: PETICION_VALIDA.hechos }
    expect(validarPeticionExplicacion(sinContexto)).toEqual({ valido: false, codigo: 'CLAVES_NO_PERMITIDAS' })
  })

  it('escenarios vacío o no-arreglo → ESCENARIOS_INVALIDOS', () => {
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, escenarios: [] })).toEqual({ valido: false, codigo: 'ESCENARIOS_INVALIDOS' })
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, escenarios: 'no-es-arreglo' })).toEqual({ valido: false, codigo: 'ESCENARIOS_INVALIDOS' })
  })

  it('un escenario sin id/decision/tipo con la forma esperada → ESCENARIOS_INVALIDOS', () => {
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, escenarios: [{ id: 'base' }] })).toEqual({ valido: false, codigo: 'ESCENARIOS_INVALIDOS' })
  })

  it('EVIDENCIA (precisión de calidad 2026-08-23): un escenario sin cumpleObjetivo (ni boolean ni null) → ESCENARIOS_INVALIDOS', () => {
    const escenarioSinCumpleObjetivo = { id: 'base', decision: 'x', tipo: 'base' }
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, escenarios: [escenarioSinCumpleObjetivo] })).toEqual({
      valido: false,
      codigo: 'ESCENARIOS_INVALIDOS',
    })
  })

  it('cumpleObjetivo en null (defensivo, sin distanciaObjetivo) → válido', () => {
    const escenario = { id: 'base', decision: 'x', tipo: 'base', cumpleObjetivo: null }
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, escenarios: [escenario] }).valido).toBe(true)
  })

  it('más escenarios de los que generarCaminosRPM.js puede producir hoy → DEMASIADOS_ESCENARIOS', () => {
    const seis = Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, decision: 'x', tipo: 'alternativo', cumpleObjetivo: false }))
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, escenarios: seis })).toEqual({ valido: false, codigo: 'DEMASIADOS_ESCENARIOS' })
  })

  it('hechos con forma inesperada (porEscenario/global faltantes, o un valor no-string dentro) → HECHOS_INVALIDOS', () => {
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, hechos: {} })).toEqual({ valido: false, codigo: 'HECHOS_INVALIDOS' })
    expect(
      validarPeticionExplicacion({ ...PETICION_VALIDA, hechos: { porEscenario: { base: { pensionProyectada: 3500000 } }, global: {} } })
    ).toEqual({ valido: false, codigo: 'HECHOS_INVALIDOS' })
  })

  it('contexto con declaracionLibre demasiado larga o de tipo incorrecto → CONTEXTO_INVALIDO', () => {
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, contexto: { declaracionLibre: 'x'.repeat(2001), caminoMasAlineadoId: null } })).toEqual({
      valido: false,
      codigo: 'CONTEXTO_INVALIDO',
    })
    expect(validarPeticionExplicacion({ ...PETICION_VALIDA, contexto: { declaracionLibre: 123, caminoMasAlineadoId: null } })).toEqual({
      valido: false,
      codigo: 'CONTEXTO_INVALIDO',
    })
  })
})
