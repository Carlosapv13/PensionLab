import { describe, it, expect } from 'vitest'
import { evaluarAptitud } from './evaluarAptitud.js'

describe('evaluarAptitud — no_apto: ruido/relleno inequívocamente detectable', () => {
  it('"blablabla" → no_apto', () => {
    expect(evaluarAptitud({ texto: 'blablabla' }).estado).toBe('no_apto')
  })

  it('"jajajaja" → no_apto', () => {
    expect(evaluarAptitud({ texto: 'jajajaja' }).estado).toBe('no_apto')
  })

  it('secuencia repetitiva equivalente ("xxxxxxxx") → no_apto', () => {
    expect(evaluarAptitud({ texto: 'xxxxxxxx' }).estado).toBe('no_apto')
  })

  it('texto vacío o solo espacios (defensa propia, no debería llegar aquí) → no_apto', () => {
    expect(evaluarAptitud({ texto: '' }).estado).toBe('no_apto')
    expect(evaluarAptitud({ texto: '   ' }).estado).toBe('no_apto')
  })

  it('siempre reporta version "v1"', () => {
    expect(evaluarAptitud({ texto: 'blablabla' }).version).toBe('v1')
  })
})

describe('evaluarAptitud — indeterminado: cualquier contenido sustantivo, sea o no pensional', () => {
  it('"quiero comprar una bicicleta mañana" → indeterminado (sustantivo, no pensional)', () => {
    expect(evaluarAptitud({ texto: 'quiero comprar una bicicleta mañana' }).estado).toBe('indeterminado')
  })

  it('"Quiero saber si me conviene seguir en mi fondo privado" → indeterminado (sustantivo pensional real)', () => {
    expect(evaluarAptitud({ texto: 'Quiero saber si me conviene seguir en mi fondo privado' }).estado).toBe(
      'indeterminado'
    )
  })

  it('siempre reporta version "v1"', () => {
    expect(evaluarAptitud({ texto: 'quiero comprar una bicicleta mañana' }).version).toBe('v1')
  })
})

describe('evaluarAptitud — ningún texto sustantivo produce "apto" en v1', () => {
  const textosSustantivos = [
    'quiero comprar una bicicleta mañana',
    'Quiero saber si me conviene seguir en mi fondo privado',
    'no sé qué hacer con mi pensión',
    'me gustaría entender mejor mis opciones',
    'tengo dudas sobre el traslado de régimen que hice hace unos años',
  ]

  it.each(textosSustantivos)('%s → nunca "apto"', (texto) => {
    const resultado = evaluarAptitud({ texto })
    expect(resultado.estado).not.toBe('apto')
    expect(['no_apto', 'indeterminado']).toContain(resultado.estado)
  })
})
