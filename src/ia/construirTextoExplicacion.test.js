import { describe, it, expect } from 'vitest'
import { sustituirTokens, construirTextoExplicacion } from './construirTextoExplicacion.js'

const HECHOS = {
  porEscenario: { base: { pensionProyectada: '$3.100.000' }, 'aumentar-ibc-futuro': { pensionProyectada: '$3.500.001' } },
  global: { diasHorizonte: '730' },
}

describe('sustituirTokens', () => {
  it('sustituye un token por el valor exacto del diccionario, carácter por carácter', () => {
    expect(sustituirTokens('Tu pensión sería {{base:pensionProyectada}}.', HECHOS.porEscenario, HECHOS.global)).toBe(
      'Tu pensión sería $3.100.000.'
    )
  })

  it('sustituye varios tokens, incluido uno global', () => {
    const texto = 'Pasarías de {{base:pensionProyectada}} a {{aumentar-ibc-futuro:pensionProyectada}} en {{global:diasHorizonte}} días.'
    expect(sustituirTokens(texto, HECHOS.porEscenario, HECHOS.global)).toBe(
      'Pasarías de $3.100.000 a $3.500.001 en 730 días.'
    )
  })

  it('null se conserva como null', () => {
    expect(sustituirTokens(null, HECHOS.porEscenario, HECHOS.global)).toBeNull()
  })

  it('texto sin tokens se devuelve intacto', () => {
    expect(sustituirTokens('Texto plano sin cifras.', HECHOS.porEscenario, HECHOS.global)).toBe('Texto plano sin cifras.')
  })

  it('defensivo: un token que no resuelve (no debería llegar aquí tras la validación) se deja literal, nunca se inventa un valor', () => {
    expect(sustituirTokens('{{base:claveInexistente}}', HECHOS.porEscenario, HECHOS.global)).toBe('{{base:claveInexistente}}')
  })
})

describe('construirTextoExplicacion', () => {
  it('estado "generado" → sustituye tokens en los campos vigentes (CAMPOS_EXPLICACION_POR_ESCENARIO) de cada escenario y en la comparación', () => {
    const resultado = {
      estado: 'generado',
      explicaciones: [
        { escenarioId: 'base', queCambia: null, preguntaSugerida: null },
        {
          escenarioId: 'aumentar-ibc-futuro',
          queCambia: 'Tu pensión sube a {{aumentar-ibc-futuro:pensionProyectada}}.',
          preguntaSugerida: '¿Podrías sostenerlo durante {{global:diasHorizonte}} días?',
        },
      ],
      comparacion: 'El alternativo llega a {{aumentar-ibc-futuro:pensionProyectada}}, el base se queda en {{base:pensionProyectada}}.',
      errorCodigo: null,
    }
    const texto = construirTextoExplicacion(resultado, HECHOS)
    expect(texto.porEscenario.base).toEqual({ queCambia: null, preguntaSugerida: null })
    expect(texto.porEscenario['aumentar-ibc-futuro'].queCambia).toBe('Tu pensión sube a $3.500.001.')
    expect(texto.porEscenario['aumentar-ibc-futuro'].preguntaSugerida).toBe('¿Podrías sostenerlo durante 730 días?')
    expect(texto.comparacion).toBe('El alternativo llega a $3.500.001, el base se queda en $3.100.000.')
  })

  it('nunca produce campos ajenos a CAMPOS_EXPLICACION_POR_ESCENARIO (contrato compactado 2026-08-24) — un campo retirado (ej. queRepresenta) en la respuesta cruda se ignora, no se propaga', () => {
    const resultado = {
      estado: 'generado',
      explicaciones: [{ escenarioId: 'base', queCambia: null, preguntaSugerida: null, queRepresenta: 'texto residual' }],
      comparacion: null,
      errorCodigo: null,
    }
    const texto = construirTextoExplicacion(resultado, HECHOS)
    expect(Object.keys(texto.porEscenario.base)).toEqual(['queCambia', 'preguntaSugerida'])
  })

  it('estado "error_proveedor" → objeto vacío, nunca intenta sustituir sobre datos que no llegaron', () => {
    const resultado = { estado: 'error_proveedor', explicaciones: [], comparacion: null, errorCodigo: 'TIMEOUT' }
    expect(construirTextoExplicacion(resultado, HECHOS)).toEqual({ porEscenario: {}, comparacion: null })
  })
})
