import { describe, it, expect, vi } from 'vitest'
import { construirSettersEdicion } from './construirSettersEdicion.js'
import { CLAVES_ESTADO_EDITABLE } from './estadoApp.js'

function crearSettersCrudosEspia() {
  const setters = {}
  for (const clave of CLAVES_ESTADO_EDITABLE) {
    setters[clave] = vi.fn()
  }
  return setters
}

describe('construirSettersEdicion — usa el setter semántico cuando existe', () => {
  it('llama al setter semántico, no al crudo, para una clave con override', () => {
    const crudos = crearSettersCrudosEspia()
    const semantico = vi.fn()

    const resultado = construirSettersEdicion(crudos, { regimenActual: semantico })
    resultado.regimenActual('RAIS')

    expect(semantico).toHaveBeenCalledWith('RAIS')
    expect(crudos.regimenActual).not.toHaveBeenCalled()
  })
})

describe('construirSettersEdicion — usa el setter crudo cuando no hay uno semántico', () => {
  it('una clave sin override en settersSemanticos usa su setter crudo', () => {
    const crudos = crearSettersCrudosEspia()

    const resultado = construirSettersEdicion(crudos, { regimenActual: vi.fn() })
    resultado.fechaNacimiento('1980-01-01')

    expect(crudos.fechaNacimiento).toHaveBeenCalledWith('1980-01-01')
  })

  it('con un objeto de semánticos vacío, todas las claves usan su setter crudo', () => {
    const crudos = crearSettersCrudosEspia()
    const resultado = construirSettersEdicion(crudos, {})

    for (const clave of CLAVES_ESTADO_EDITABLE) {
      resultado[clave]('x')
      expect(crudos[clave]).toHaveBeenCalledWith('x')
    }
  })
})

describe('construirSettersEdicion — cobertura completa', () => {
  it('el resultado cubre exactamente CLAVES_ESTADO_EDITABLE, ni más ni menos', () => {
    const crudos = crearSettersCrudosEspia()
    const resultado = construirSettersEdicion(crudos, {})
    expect(Object.keys(resultado).sort()).toEqual([...CLAVES_ESTADO_EDITABLE].sort())
  })
})
