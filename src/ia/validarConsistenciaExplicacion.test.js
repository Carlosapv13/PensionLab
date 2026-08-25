import { describe, it, expect } from 'vitest'
import { esExplicacionConsistente } from './validarConsistenciaExplicacion.js'

const HECHOS = {
  porEscenario: {
    base: { pensionProyectada: '$3.100.000', ibcActual: '$2.900.000' },
    'aumentar-ibc-futuro': { pensionProyectada: '$3.500.001', costoPensionalAdicionalMensual: '$391.309' },
  },
  global: { diasHorizonte: '730' },
}
const IDS = ['base', 'aumentar-ibc-futuro']

function respuestaBase(overrides = {}) {
  return {
    explicaciones: [
      { escenarioId: 'base', queCambia: null, preguntaSugerida: null },
      {
        escenarioId: 'aumentar-ibc-futuro',
        queCambia: 'Tu pensión proyectada pasa a {{aumentar-ibc-futuro:pensionProyectada}}.',
        preguntaSugerida: '¿Podrías sostener {{aumentar-ibc-futuro:costoPensionalAdicionalMensual}} durante todo el horizonte de {{global:diasHorizonte}} días?',
      },
    ],
    comparacion: 'El alternativo exige más esfuerzo pero sí alcanza tu meta; el base la deja por debajo.',
    ...overrides,
  }
}

describe('esExplicacionConsistente — EVIDENCIA: ninguna cifra inventada o alterada llega al usuario como hecho', () => {
  it('respuesta bien formada, con tokens válidos → consistente', () => {
    expect(esExplicacionConsistente(respuestaBase(), HECHOS, IDS)).toBe(true)
  })

  it('MALICIOSA: dígito literal fuera de cualquier token (el modelo "inventa" $3.600.000) → rechazada por completo', () => {
    const bruto = respuestaBase()
    bruto.explicaciones[1].queCambia = 'Tu pensión proyectada pasa a $3.600.000.'
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('MALICIOSA: token con clave inventada que no existe en los hechos provistos → rechazada', () => {
    const bruto = respuestaBase()
    bruto.explicaciones[1].queCambia = 'Tu pensión sube a {{aumentar-ibc-futuro:pensionInventada}}.'
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('MALICIOSA: token que referencia un escenario que nunca se envió a explicar → rechazada', () => {
    const bruto = respuestaBase()
    bruto.explicaciones[1].queCambia = 'Comparado con {{escenario-fantasma:pensionProyectada}}.'
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('MALICIOSA: escenarioId inventado en la lista de explicaciones → rechazada (cobertura no coincide)', () => {
    const bruto = respuestaBase()
    bruto.explicaciones.push({ escenarioId: 'un-tercer-camino-inventado', queCambia: 'texto', preguntaSugerida: null })
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('escenarioId duplicado → rechazada', () => {
    const bruto = respuestaBase()
    bruto.explicaciones.push({ ...bruto.explicaciones[0] })
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('cobertura incompleta (omite un escenario enviado) → rechazada', () => {
    const bruto = respuestaBase()
    bruto.explicaciones = [bruto.explicaciones[0]]
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('MALICIOSA: recomendación imperativa ("deberías elegir") → rechazada aunque las cifras sean correctas', () => {
    const bruto = respuestaBase()
    bruto.explicaciones[1].preguntaSugerida = 'Deberías elegir este camino porque alcanza tu objetivo.'
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
  })

  it('recomendación imperativa en variantes (te conviene, la mejor opción es) → rechazadas', () => {
    for (const frase of ['Te conviene este camino.', 'La mejor opción es este.', 'Lo mejor es aumentar tu aporte.']) {
      const bruto = respuestaBase()
      bruto.explicaciones[1].queCambia = frase
      expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(false)
    }
  })

  it('comparacion con un solo escenario enviado → rechazada (nada que comparar)', () => {
    const bruto = respuestaBase({ comparacion: 'Comparando ambos caminos...' })
    expect(esExplicacionConsistente(bruto, HECHOS, ['base'])).toBe(false)
  })

  it('comparacion null con dos escenarios → válida (el modelo puede optar por no comparar)', () => {
    const bruto = respuestaBase({ comparacion: null })
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(true)
  })

  it('todos los campos en null para un escenario → válida (nada obligatorio, decisión de producto)', () => {
    const bruto = respuestaBase()
    bruto.explicaciones[0] = { escenarioId: 'base', queCambia: null, preguntaSugerida: null }
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(true)
  })

  it('forma inesperada (explicaciones no es array, comparacion no es string/null) → rechazada, nunca lanza', () => {
    expect(esExplicacionConsistente({ explicaciones: 'no-es-array', comparacion: null }, HECHOS, IDS)).toBe(false)
    expect(esExplicacionConsistente(respuestaBase({ comparacion: 12345 }), HECHOS, IDS)).toBe(false)
    expect(esExplicacionConsistente(null, HECHOS, IDS)).toBe(false)
    expect(esExplicacionConsistente(undefined, HECHOS, IDS)).toBe(false)
  })

  it('token con formato roto (sin cerrar, o con espacios) se trata como texto literal, no como token — y su dígito, si lo hay, sigue cayendo en la defensa de dígitos sueltos', () => {
    const bruto = respuestaBase()
    bruto.explicaciones[1].queCambia = 'Tu pensión sube a {{aumentar-ibc-futuro:pensionProyectada'
    expect(esExplicacionConsistente(bruto, HECHOS, IDS)).toBe(true) // sin dígitos literales, solo texto roto sin llaves cerradas — no hay token ni dígito, pasa
  })
})
