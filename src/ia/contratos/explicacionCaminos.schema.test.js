import { describe, it, expect } from 'vitest'
import { CAMPOS_EXPLICACION_POR_ESCENARIO, EXPLICACION_CAMINOS_SCHEMA } from './explicacionCaminos.schema.js'

describe('EXPLICACION_CAMINOS_SCHEMA — forma general', () => {
  it('es serializable a JSON sin perder información', () => {
    const clon = JSON.parse(JSON.stringify(EXPLICACION_CAMINOS_SCHEMA))
    expect(clon).toEqual(EXPLICACION_CAMINOS_SCHEMA)
  })

  it('strict: true en el nivel superior — requisito de OpenAI Structured Outputs', () => {
    expect(EXPLICACION_CAMINOS_SCHEMA.strict).toBe(true)
  })

  it('additionalProperties: false en todo nivel objeto', () => {
    const { schema } = EXPLICACION_CAMINOS_SCHEMA
    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.explicaciones.items.additionalProperties).toBe(false)
  })

  it('explicaciones.items.required coincide exactamente con escenarioId + CAMPOS_EXPLICACION_POR_ESCENARIO', () => {
    const requerido = EXPLICACION_CAMINOS_SCHEMA.schema.properties.explicaciones.items.required
    expect([...requerido].sort()).toEqual(['escenarioId', ...CAMPOS_EXPLICACION_POR_ESCENARIO].sort())
  })
})

describe('EXPLICACION_CAMINOS_SCHEMA — desviación deliberada de "cero texto libre" (distinta de interpretacionDeclaracion.schema.js)', () => {
  it('los campos de explicación y "comparacion" SÍ permiten string sin enum — a propósito: la garantía de cifras no vive en el JSON Schema (que no puede expresar "solo números vía token"), vive en validarConsistenciaExplicacion.js (tokens + regex de dígitos sueltos + bloqueo de recomendación imperativa), aplicada DESPUÉS de que el schema ya validó la forma', () => {
    const { properties } = EXPLICACION_CAMINOS_SCHEMA.schema.properties.explicaciones.items
    for (const campo of CAMPOS_EXPLICACION_POR_ESCENARIO) {
      expect(properties[campo].type).toEqual(['string', 'null'])
      expect(properties[campo]).not.toHaveProperty('enum')
    }
    expect(EXPLICACION_CAMINOS_SCHEMA.schema.properties.comparacion.type).toEqual(['string', 'null'])
  })

  it('escenarioId sí es un string sin enum cerrado (no se puede enumerar de antemano — depende del resultado calculado en cada caso), pero su valor se verifica después contra la lista real de escenarios enviados (ver validarConsistenciaExplicacion.js)', () => {
    expect(EXPLICACION_CAMINOS_SCHEMA.schema.properties.explicaciones.items.properties.escenarioId.type).toBe('string')
  })
})
