import { describe, it, expect } from 'vitest'
import { esInterpretacionConsistente } from './validarConsistenciaInterpretacion.js'

const CAMPOS_VACIOS = {
  objetivoPensionMensual: null,
  restriccionCostoPensionalAdicionalMaximoMensual: null,
  edadJubilacionDeseada: null,
}

describe('esInterpretacionConsistente — casos válidos', () => {
  it('interpretado con un solo campo presente, razonCodigo null, sin campos ambiguos', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } },
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(true)
  })

  it('interpretado con los tres campos presentes', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: {
          objetivoPensionMensual: { valorCOP: 3500000 },
          restriccionCostoPensionalAdicionalMaximoMensual: { valorCOP: 500000 },
          edadJubilacionDeseada: { valorAnios: 65 },
        },
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(true)
  })

  it('insuficiente: campos vacíos, razonCodigo presente', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'insuficiente',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: [],
        razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
      })
    ).toBe(true)
  })

  it('no_pertinente: campos vacíos, razonCodigo presente', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'no_pertinente',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: [],
        razonCodigo: 'SIN_MATERIA_PENSIONAL',
      })
    ).toBe(true)
  })

  it('ambiguo: campos vacíos, razonCodigo presente, camposAmbiguos no vacío', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'ambiguo',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: ['objetivoPensionMensual'],
        razonCodigo: 'MULTIPLES_LECTURAS_POSIBLES',
      })
    ).toBe(true)
  })
})

describe('esInterpretacionConsistente — inconsistencias que el JSON Schema por sí solo no detecta', () => {
  it('interpretado pero los tres campos en null — schema-válido, semánticamente incoherente', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })

  it('interpretado con razonCodigo no nulo — contradictorio (si interpretó, no hay razón que dar)', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } },
        camposAmbiguos: [],
        razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
      })
    ).toBe(false)
  })

  it('insuficiente pero con un campo presente — el valor no debería colarse a un formulario', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'insuficiente',
        campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } },
        camposAmbiguos: [],
        razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
      })
    ).toBe(false)
  })

  it('insuficiente sin razonCodigo — no explica por qué', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'insuficiente',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })

  it('ambiguo pero camposAmbiguos vacío — dice ambiguo sin señalar qué', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'ambiguo',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: [],
        razonCodigo: 'MULTIPLES_LECTURAS_POSIBLES',
      })
    ).toBe(false)
  })

  it('no_pertinente con camposAmbiguos no vacío — solo "ambiguo" puede traer esa lista', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'no_pertinente',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: ['objetivoPensionMensual'],
        razonCodigo: 'SIN_MATERIA_PENSIONAL',
      })
    ).toBe(false)
  })

  it('objetivoPensionMensual.valorCOP negativo — fuera de rango razonable', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: -100 } },
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })

  it('objetivoPensionMensual.valorCOP === 0 — fuera de rango razonable (no es un objetivo real)', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 0 } },
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })

  it('edadJubilacionDeseada.valorAnios fuera de [1, 100]', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: { ...CAMPOS_VACIOS, edadJubilacionDeseada: { valorAnios: 150 } },
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })

})

describe('esInterpretacionConsistente — guarda de forma defensiva (nunca asume que una capa anterior ya validó)', () => {
  it('null → false, sin lanzar excepción', () => {
    expect(esInterpretacionConsistente(null)).toBe(false)
  })

  it('estado fuera del enum conocido → false', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'algo_no_definido',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })

  it('campos con una clave faltante → false', () => {
    const camposIncompletos = Object.fromEntries(
      Object.entries(CAMPOS_VACIOS).filter(([clave]) => clave !== 'objetivoPensionMensual')
    )
    expect(
      esInterpretacionConsistente({
        estado: 'insuficiente',
        campos: camposIncompletos,
        camposAmbiguos: [],
        razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
      })
    ).toBe(false)
  })

  it('camposAmbiguos no es un arreglo → false', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'insuficiente',
        campos: CAMPOS_VACIOS,
        camposAmbiguos: 'no-es-un-arreglo',
        razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
      })
    ).toBe(false)
  })

  it('edadJubilacionDeseada.valorAnios no entero — el schema ya lo evitaría, pero se defiende igual', () => {
    expect(
      esInterpretacionConsistente({
        estado: 'interpretado',
        campos: { ...CAMPOS_VACIOS, edadJubilacionDeseada: { valorAnios: 65.5 } },
        camposAmbiguos: [],
        razonCodigo: null,
      })
    ).toBe(false)
  })
})
