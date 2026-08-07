import { describe, it, expect } from 'vitest'
import { reconocerAptitud } from './reconocerAptitud.js'

describe('reconocerAptitud — apto', () => {
  it('reconoce una meta pensional precisa', () => {
    const r = reconocerAptitud('Quiero pensionarme a los 60 años con al menos 2 millones mensuales.')
    expect(r).toEqual({ estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' })
  })

  it('reconoce una meta pensional ambigua igual como apta (la ambigüedad no es responsabilidad de esta función)', () => {
    const r = reconocerAptitud('Quiero jubilarme lo antes posible.')
    expect(r).toEqual({ estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' })
  })
})

describe('reconocerAptitud — no_apto', () => {
  it('reconoce contenido fuera del dominio pensional (ejemplo funcional aprobado)', () => {
    const r = reconocerAptitud('Quiero saber cómo declarar mi renta este año.')
    expect(r).toEqual({ estado: 'no_apto', regla: 'TERMINO_FUERA_DE_DOMINIO' })
  })

  it('reconoce también "declaración de renta", término ya presente en el léxico', () => {
    const r = reconocerAptitud('Quiero saber cómo hacer mi declaración de renta este año.')
    expect(r).toEqual({ estado: 'no_apto', regla: 'TERMINO_FUERA_DE_DOMINIO' })
  })
})

describe('reconocerAptitud — indeterminado', () => {
  it('texto con longitud suficiente pero sin señal de dominio en ninguna dirección', () => {
    const r = reconocerAptitud('No sé qué va a pasar con mi futuro.')
    expect(r).toEqual({ estado: 'indeterminado', regla: 'SIN_SENAL_DE_DOMINIO' })
  })

  it('texto por debajo del umbral mínimo de palabras, aunque contenga un término pensional', () => {
    const r = reconocerAptitud('Pensión.')
    expect(r).toEqual({ estado: 'indeterminado', regla: 'TEXTO_INSUFICIENTE' })
  })

  it('la longitud se evalúa antes que el léxico: "Ayuda." también es TEXTO_INSUFICIENTE', () => {
    const r = reconocerAptitud('Ayuda.')
    expect(r).toEqual({ estado: 'indeterminado', regla: 'TEXTO_INSUFICIENTE' })
  })
})

describe('reconocerAptitud — determinismo', () => {
  it('el mismo texto produce siempre el mismo resultado', () => {
    const texto = 'Quiero saber si me conviene trasladarme de fondo privado.'
    const primero = reconocerAptitud(texto)
    const segundo = reconocerAptitud(texto)
    expect(primero).toEqual(segundo)
  })
})

describe('reconocerAptitud — validaciones defensivas', () => {
  it('lanza si texto no es un string', () => {
    expect(() => reconocerAptitud(123)).toThrow('reconocerAptitud: texto debe ser un string')
  })

  it('lanza si texto es null', () => {
    expect(() => reconocerAptitud(null)).toThrow('reconocerAptitud: texto debe ser un string')
  })

  it('lanza si texto está vacío', () => {
    expect(() => reconocerAptitud('')).toThrow('reconocerAptitud: texto no puede estar vacío')
  })

  it('lanza si texto contiene solo espacios en blanco', () => {
    expect(() => reconocerAptitud('    ')).toThrow('reconocerAptitud: texto no puede estar vacío')
  })
})

describe('reconocerAptitud — limitaciones documentadas de v1 (comportamiento esperado, no defectos)', () => {
  it('no reconoce negación: una declaración negativa se marca igual como apta', () => {
    const r = reconocerAptitud('No quiero saber nada de mi pensión por ahora.')
    expect(r).toEqual({ estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' })
  })

  it('reconoce por accidente una raíz fuera de su sentido pensional', () => {
    const r = reconocerAptitud('Vivo cerca de una pensión de estudiantes y quiero mudarme pronto.')
    expect(r).toEqual({ estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' })
  })

  it('un término pensional real no incluido en el léxico cae en indeterminado, nunca en no_apto', () => {
    const r = reconocerAptitud('Quiero saber si me conviene ahorrar para mi retiro.')
    expect(r).toEqual({ estado: 'indeterminado', regla: 'SIN_SENAL_DE_DOMINIO' })
  })
})

describe('reconocerAptitud — normalización', () => {
  it('ignora mayúsculas y tildes al reconocer el léxico pensional', () => {
    const r = reconocerAptitud('QUIERO SABER CUÁNTAS SEMANAS ME FALTAN PARA MI PENSIÓN.')
    expect(r).toEqual({ estado: 'apto', regla: 'CONTIENE_TERMINO_PENSIONAL' })
  })
})
