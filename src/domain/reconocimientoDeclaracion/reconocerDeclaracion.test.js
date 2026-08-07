import { describe, it, expect } from 'vitest'
import { reconocerDeclaracion } from './reconocerDeclaracion.js'

describe('reconocerDeclaracion — ausencia', () => {
  it('no evalúa aptitud ni estructura; conserva la declaración original', () => {
    const r = reconocerDeclaracion({ tipo: 'ausencia' })
    expect(r).toEqual({
      version: 'v1',
      declaracionOriginal: { tipo: 'ausencia' },
    })
  })
})

describe('reconocerDeclaracion — contenido apto y preciso', () => {
  it('produce version, declaracionOriginal y aptitud; nunca estructura', () => {
    const declaracion = {
      tipo: 'contenido',
      texto: 'Quiero pensionarme a los 60 años con al menos 2 millones mensuales.',
    }
    const r = reconocerDeclaracion(declaracion)
    expect(r).toEqual({
      version: 'v1',
      declaracionOriginal: declaracion,
      aptitud: { estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' },
    })
  })
})

describe('reconocerDeclaracion — contenido no apto', () => {
  it('produce aptitud no_apto; nunca estructura', () => {
    const declaracion = {
      tipo: 'contenido',
      texto: 'Quiero saber cómo declarar mi renta este año.',
    }
    const r = reconocerDeclaracion(declaracion)
    expect(r).toEqual({
      version: 'v1',
      declaracionOriginal: declaracion,
      aptitud: { estado: 'no_apto', regla: 'TERMINO_FUERA_DE_DOMINIO' },
    })
  })
})

describe('reconocerDeclaracion — contenido indeterminado', () => {
  it('produce aptitud indeterminado; nunca estructura', () => {
    const declaracion = { tipo: 'contenido', texto: 'No sé qué va a pasar con mi futuro.' }
    const r = reconocerDeclaracion(declaracion)
    expect(r).toEqual({
      version: 'v1',
      declaracionOriginal: declaracion,
      aptitud: { estado: 'indeterminado', regla: 'SIN_SENAL_DE_DOMINIO' },
    })
  })
})

describe('reconocerDeclaracion — invariante de presencia', () => {
  it('aptitud está presente si y solo si tipo === "contenido"', () => {
    const conContenido = reconocerDeclaracion({ tipo: 'contenido', texto: 'Quiero saber de mi pensión.' })
    const conAusencia = reconocerDeclaracion({ tipo: 'ausencia' })
    expect(conContenido).toHaveProperty('aptitud')
    expect(conAusencia).not.toHaveProperty('aptitud')
  })
})

describe('reconocerDeclaracion — limitación explícita de v1: estructura nunca aparece', () => {
  const casos = [
    { tipo: 'ausencia' },
    { tipo: 'contenido', texto: 'Quiero pensionarme a los 60 años con al menos 2 millones mensuales.' },
    { tipo: 'contenido', texto: 'Quiero jubilarme lo antes posible.' },
    { tipo: 'contenido', texto: 'Quiero saber cómo declarar mi renta este año.' },
    { tipo: 'contenido', texto: 'No sé qué va a pasar con mi futuro.' },
  ]

  it.each(casos)('nunca incluye el campo estructura — caso %#', (declaracion) => {
    const r = reconocerDeclaracion(declaracion)
    expect(r).not.toHaveProperty('estructura')
  })
})

describe('reconocerDeclaracion — validaciones defensivas', () => {
  it('lanza si declaracion es null', () => {
    expect(() => reconocerDeclaracion(null)).toThrow(
      'reconocerDeclaracion: declaracion.tipo debe ser "contenido" o "ausencia"'
    )
  })

  it('lanza si declaracion.tipo no es "contenido" ni "ausencia"', () => {
    expect(() => reconocerDeclaracion({ tipo: 'otro' })).toThrow(
      'reconocerDeclaracion: declaracion.tipo debe ser "contenido" o "ausencia"'
    )
  })

  it('lanza si tipo es "contenido" sin texto', () => {
    expect(() => reconocerDeclaracion({ tipo: 'contenido' })).toThrow(
      'reconocerDeclaracion: declaracion.texto es obligatorio cuando tipo es "contenido"'
    )
  })
})
