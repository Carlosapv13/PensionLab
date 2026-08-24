import { describe, it, expect } from 'vitest'
import {
  CAMPOS_INTERPRETABLES,
  ESTADOS_INTERPRETACION,
  RAZONES_CODIGO_MODELO,
  INTERPRETACION_DECLARACION_SCHEMA,
} from './interpretacionDeclaracion.schema.js'

describe('INTERPRETACION_DECLARACION_SCHEMA — forma general', () => {
  it('es serializable a JSON sin perder información (sin funciones, sin undefined)', () => {
    const clon = JSON.parse(JSON.stringify(INTERPRETACION_DECLARACION_SCHEMA))
    expect(clon).toEqual(INTERPRETACION_DECLARACION_SCHEMA)
  })

  it('strict: true en el nivel superior — requisito de OpenAI Structured Outputs', () => {
    expect(INTERPRETACION_DECLARACION_SCHEMA.strict).toBe(true)
  })

  it('additionalProperties: false en todo nivel objeto (estricto, sin campos no declarados)', () => {
    const { schema } = INTERPRETACION_DECLARACION_SCHEMA
    expect(schema.additionalProperties).toBe(false)
    expect(schema.properties.campos.additionalProperties).toBe(false)
    for (const campo of CAMPOS_INTERPRETABLES) {
      expect(schema.properties.campos.properties[campo].additionalProperties).toBe(false)
    }
  })
})

describe('INTERPRETACION_DECLARACION_SCHEMA — cero texto libre', () => {
  it('ninguna propiedad de nivel superior es un string sin enum (nunca prosa libre del modelo)', () => {
    const { properties } = INTERPRETACION_DECLARACION_SCHEMA.schema
    for (const [nombre, definicion] of Object.entries(properties)) {
      const tipos = Array.isArray(definicion.type) ? definicion.type : [definicion.type]
      if (tipos.includes('string')) {
        expect(definicion, `${nombre} permite string sin enum`).toHaveProperty('enum')
      }
    }
  })
})

describe('INTERPRETACION_DECLARACION_SCHEMA — consistencia con las constantes exportadas', () => {
  it('estado.enum coincide exactamente con ESTADOS_INTERPRETACION', () => {
    expect(INTERPRETACION_DECLARACION_SCHEMA.schema.properties.estado.enum).toEqual(ESTADOS_INTERPRETACION)
  })

  it('campos.required coincide exactamente con CAMPOS_INTERPRETABLES (mismo orden no exigido, mismo conjunto sí)', () => {
    const requerido = INTERPRETACION_DECLARACION_SCHEMA.schema.properties.campos.required
    expect([...requerido].sort()).toEqual([...CAMPOS_INTERPRETABLES].sort())
  })

  it('camposAmbiguos.items.enum coincide con CAMPOS_INTERPRETABLES', () => {
    expect(INTERPRETACION_DECLARACION_SCHEMA.schema.properties.camposAmbiguos.items.enum).toEqual(
      CAMPOS_INTERPRETABLES
    )
  })

  it('razonCodigo.enum contiene exactamente los códigos del modelo más null', () => {
    expect(INTERPRETACION_DECLARACION_SCHEMA.schema.properties.razonCodigo.enum).toEqual([
      ...RAZONES_CODIGO_MODELO,
      null,
    ])
  })

  it('cada campo monetario exige valorCOP numérico; edadJubilacionDeseada exige valorAnios entero', () => {
    const { properties } = INTERPRETACION_DECLARACION_SCHEMA.schema.properties.campos
    expect(properties.objetivoPensionMensual.properties.valorCOP.type).toBe('number')
    expect(properties.restriccionCostoPensionalAdicionalMaximoMensual.properties.valorCOP.type).toBe('number')
    expect(properties.edadJubilacionDeseada.properties.valorAnios.type).toBe('integer')
  })
})
