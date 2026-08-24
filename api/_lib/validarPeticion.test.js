import { describe, it, expect } from 'vitest'
import { validarPeticion } from './validarPeticion.js'

describe('validarPeticion — caso válido', () => {
  it('{texto} con contenido no vacío → válido', () => {
    expect(validarPeticion({ texto: 'quiero un objetivo de 3.500.000' })).toEqual({
      valido: true,
      texto: 'quiero un objetivo de 3.500.000',
    })
  })
})

describe('validarPeticion — EVIDENCIA: rechazo server-side de payloads con claves distintas de {texto}', () => {
  it('una clave adicional (ej. regimenActual) → rechazado, aunque texto sea válido', () => {
    const resultado = validarPeticion({ texto: 'algo', regimenActual: 'RPM' })
    expect(resultado.valido).toBe(false)
    expect(resultado.codigo).toBe('CLAVES_NO_PERMITIDAS')
  })

  it('una clave adicional cualquiera (ej. edadActual) → rechazado', () => {
    const resultado = validarPeticion({ texto: 'algo', edadActual: 47 })
    expect(resultado.valido).toBe(false)
    expect(resultado.codigo).toBe('CLAVES_NO_PERMITIDAS')
  })

  it('todo el expediente enviado por error → rechazado igual que una sola clave de más', () => {
    const resultado = validarPeticion({
      texto: 'algo',
      historiaCotizacion: [],
      fechaNacimiento: '1978-02-11',
      valorBaseCotizacionDeclarado: '2900000',
    })
    expect(resultado.valido).toBe(false)
    expect(resultado.codigo).toBe('CLAVES_NO_PERMITIDAS')
  })

  it('objeto vacío → rechazado (falta texto)', () => {
    expect(validarPeticion({}).valido).toBe(false)
  })

  it('texto en una clave con nombre distinto (ej. "text") → rechazado', () => {
    const resultado = validarPeticion({ text: 'algo' })
    expect(resultado.valido).toBe(false)
    expect(resultado.codigo).toBe('CLAVES_NO_PERMITIDAS')
  })
})

describe('validarPeticion — formas inválidas del cuerpo, nunca lanza excepción', () => {
  it('null → CUERPO_INVALIDO', () => {
    expect(validarPeticion(null)).toEqual({ valido: false, codigo: 'CUERPO_INVALIDO' })
  })

  it('un arreglo → CUERPO_INVALIDO', () => {
    expect(validarPeticion(['algo']).valido).toBe(false)
  })

  it('un string suelto → CUERPO_INVALIDO', () => {
    expect(validarPeticion('algo').valido).toBe(false)
  })

  it('texto no-string → TEXTO_INVALIDO', () => {
    expect(validarPeticion({ texto: 12345 })).toEqual({ valido: false, codigo: 'TEXTO_INVALIDO' })
  })

  it('texto vacío o solo espacios → TEXTO_INVALIDO', () => {
    expect(validarPeticion({ texto: '' }).codigo).toBe('TEXTO_INVALIDO')
    expect(validarPeticion({ texto: '   ' }).codigo).toBe('TEXTO_INVALIDO')
  })

  it('texto excesivamente largo → TEXTO_DEMASIADO_LARGO', () => {
    const resultado = validarPeticion({ texto: 'a'.repeat(2001) })
    expect(resultado).toEqual({ valido: false, codigo: 'TEXTO_DEMASIADO_LARGO' })
  })

  it('texto exactamente en el límite → válido (borde inclusive)', () => {
    expect(validarPeticion({ texto: 'a'.repeat(2000) }).valido).toBe(true)
  })
})
