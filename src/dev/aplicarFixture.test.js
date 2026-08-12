import { describe, it, expect, vi } from 'vitest'
import { validarFixture, aplicarFixture } from './aplicarFixture.js'
import { CLAVES_ESTADO_EDITABLE, VALORES_POR_DEFECTO } from './estadoApp.js'
import { FIXTURES } from './fixtures.js'

const FIXTURE_RAIS_EMPLEADO = FIXTURES.find((f) => f.id === 'rais-empleado-colombia')

describe('validarFixture — claves reconocidas', () => {
  it('el fixture aprobado (RAIS empleado) es válido para su vista sugerida', () => {
    const r = validarFixture(FIXTURE_RAIS_EMPLEADO, FIXTURE_RAIS_EMPLEADO.vistaSugerida)
    expect(r.valido).toBe(true)
    expect(r.errores).toEqual([])
  })

  it('rechaza un fixture con una clave desconocida', () => {
    const fixtureInvalido = { ...FIXTURE_RAIS_EMPLEADO, datos: { ...FIXTURE_RAIS_EMPLEADO.datos, claveInventada: 'x' } }
    const r = validarFixture(fixtureInvalido, 'declaracionLibre')
    expect(r.valido).toBe(false)
    expect(r.errores.some((e) => e.includes('claveInventada'))).toBe(true)
  })
})

describe('validarFixture — campos mínimos según la vista destino', () => {
  it('rechaza un fixture sin regimenActual cuando el destino es declaracionLibre', () => {
    const resto = Object.fromEntries(
      Object.entries(FIXTURE_RAIS_EMPLEADO.datos).filter(([clave]) => clave !== 'regimenActual')
    )
    const fixtureIncompleto = { ...FIXTURE_RAIS_EMPLEADO, datos: resto }
    const r = validarFixture(fixtureIncompleto, 'declaracionLibre')
    expect(r.valido).toBe(false)
    expect(r.errores.some((e) => e.includes('regimenActual'))).toBe(true)
  })

  it('una vista sin campos mínimos catalogados no exige nada adicional', () => {
    const r = validarFixture({ id: 'x', nombre: 'x', vistaSugerida: 'bienvenida', datos: {} }, 'bienvenida')
    expect(r.valido).toBe(true)
  })
})

// Parametrizado sobre FIXTURES (no solo el de empleado): ninguna aserción de
// este bloque depende de valores específicos de un fixture — se generaliza
// naturalmente a cualquier fixture presente y futuro.
describe.each(FIXTURES)('aplicarFixture — reset limpio + aplicación al estado real ($id)', (fixture) => {
  function crearSettersEspia() {
    const setters = {}
    for (const clave of CLAVES_ESTADO_EDITABLE) {
      setters[clave] = vi.fn()
    }
    return setters
  }

  it('llama al setter de cada clave del fixture con el valor especificado', () => {
    const setters = crearSettersEspia()
    aplicarFixture(fixture, setters)

    for (const [clave, valor] of Object.entries(fixture.datos)) {
      expect(setters[clave]).toHaveBeenCalledWith(valor)
    }
  })

  it('llama al setter de cada clave NO especificada con su valor por defecto (reset limpio)', () => {
    const setters = crearSettersEspia()
    aplicarFixture(fixture, setters)

    const clavesOmitidas = CLAVES_ESTADO_EDITABLE.filter(
      (clave) => !Object.prototype.hasOwnProperty.call(fixture.datos, clave)
    )
    expect(clavesOmitidas.length).toBeGreaterThan(0) // el fixture aprobado no cubre todas las claves
    for (const clave of clavesOmitidas) {
      expect(setters[clave]).toHaveBeenCalledWith(VALORES_POR_DEFECTO[clave])
    }
  })

  it('llama exactamente una vez a cada setter de CLAVES_ESTADO_EDITABLE', () => {
    const setters = crearSettersEspia()
    aplicarFixture(fixture, setters)

    for (const clave of CLAVES_ESTADO_EDITABLE) {
      expect(setters[clave]).toHaveBeenCalledTimes(1)
    }
  })
})
