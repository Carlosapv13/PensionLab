import { describe, it, expect } from 'vitest'
import { evaluarDeclaracion } from './evaluarDeclaracion.js'

describe('evaluarDeclaracion — ausencia', () => {
  it('produce solo declaracionOriginal, sin aptitud ni estructura', () => {
    const r = evaluarDeclaracion({ tipo: 'ausencia' })
    expect(r.declaracionOriginal).toEqual({ tipo: 'ausencia' })
    expect(r.aptitud).toBeUndefined()
    expect(r.estructura).toBeUndefined()
  })
})

describe('evaluarDeclaracion — no_apto', () => {
  it('"blablabla" → aptitud no_apto, sin estructura', () => {
    const r = evaluarDeclaracion({ tipo: 'contenido', texto: 'blablabla' })
    expect(r.declaracionOriginal).toEqual({ tipo: 'contenido', texto: 'blablabla' })
    expect(r.aptitud).toEqual({ estado: 'no_apto', version: 'v1' })
    expect(r.estructura).toBeUndefined()
  })
})

describe('evaluarDeclaracion — indeterminado', () => {
  it('"quiero comprar una bicicleta mañana" → aptitud indeterminado, sin estructura', () => {
    const r = evaluarDeclaracion({ tipo: 'contenido', texto: 'quiero comprar una bicicleta mañana' })
    expect(r.aptitud).toEqual({ estado: 'indeterminado', version: 'v1' })
    expect(r.estructura).toBeUndefined()
  })

  it('"Quiero saber si me conviene seguir en mi fondo privado" → aptitud indeterminado, sin estructura', () => {
    const r = evaluarDeclaracion({
      tipo: 'contenido',
      texto: 'Quiero saber si me conviene seguir en mi fondo privado',
    })
    expect(r.aptitud).toEqual({ estado: 'indeterminado', version: 'v1' })
    expect(r.estructura).toBeUndefined()
  })
})

describe('evaluarDeclaracion — declaración no evaluable (Principio 11: nunca asumida garantizada por el caller)', () => {
  it('null → declaracionOriginal: null, sin aptitud (nunca se inventa contenido vacío)', () => {
    const r = evaluarDeclaracion(null)
    expect(r.declaracionOriginal).toBeNull()
    expect(r.aptitud).toBeUndefined()
    expect(r.estructura).toBeUndefined()
  })

  it('undefined → mismo tratamiento que null', () => {
    const r = evaluarDeclaracion(undefined)
    expect(r.declaracionOriginal).toBeNull()
    expect(r.aptitud).toBeUndefined()
  })

  it('llamado sin argumento → mismo tratamiento que null', () => {
    const r = evaluarDeclaracion()
    expect(r.declaracionOriginal).toBeNull()
    expect(r.aptitud).toBeUndefined()
  })

  it('objeto vacío (sin tipo) → declaracionOriginal: null, nunca no_apto', () => {
    const r = evaluarDeclaracion({})
    expect(r.declaracionOriginal).toBeNull()
    expect(r.aptitud).toBeUndefined()
  })

  it('tipo desconocido → declaracionOriginal: null, nunca no_apto ni una tercera forma inventada', () => {
    const r = evaluarDeclaracion({ tipo: 'otra-cosa' })
    expect(r.declaracionOriginal).toBeNull()
    expect(r.aptitud).toBeUndefined()
  })

  it('"contenido" con texto ausente permanece dentro del contrato reconocido — no colapsa a null (evaluarAptitud ya defiende texto no-string)', () => {
    const r = evaluarDeclaracion({ tipo: 'contenido' })
    expect(r.declaracionOriginal).toEqual({ tipo: 'contenido', texto: undefined })
    expect(r.aptitud).toEqual({ estado: 'no_apto', version: 'v1' })
  })
})

describe('evaluarDeclaracion — ningún resultado de v1 contiene "estructura"', () => {
  const declaraciones = [
    { tipo: 'ausencia' },
    { tipo: 'contenido', texto: 'blablabla' },
    { tipo: 'contenido', texto: 'jajajaja' },
    { tipo: 'contenido', texto: 'quiero comprar una bicicleta mañana' },
    { tipo: 'contenido', texto: 'Quiero saber si me conviene seguir en mi fondo privado' },
  ]

  it.each(declaraciones)('%j → sin campo estructura', (declaracion) => {
    const r = evaluarDeclaracion(declaracion)
    expect(r.estructura).toBeUndefined()
    expect(Object.keys(r)).not.toContain('estructura')
  })
})
