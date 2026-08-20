import { describe, it, expect } from 'vitest'
import {
  construirFechaISO,
  parsearFechaISO,
  esFechaDiaMesAnioReal,
  diasMaximosEnMes,
  mensajeErrorDiaEnMes,
} from './fechaDiaMesAnio.js'

describe('construirFechaISO', () => {
  it('construye una fecha ISO con día de un solo dígito', () => {
    expect(construirFechaISO('7', '03', '2020')).toBe('2020-03-07')
  })

  it('construye una fecha ISO con día de dos dígitos', () => {
    expect(construirFechaISO('31', '01', '2020')).toBe('2020-01-31')
  })

  it('devuelve cadena vacía si falta el día', () => {
    expect(construirFechaISO('', '03', '2020')).toBe('')
  })

  it('devuelve cadena vacía si falta el mes', () => {
    expect(construirFechaISO('7', '', '2020')).toBe('')
  })

  it('devuelve cadena vacía si el año no tiene 4 dígitos', () => {
    expect(construirFechaISO('7', '03', '202')).toBe('')
  })
})

describe('parsearFechaISO', () => {
  it('separa una fecha ISO en día/mes/año, sin ceros a la izquierda en el día', () => {
    expect(parsearFechaISO('2020-03-07')).toEqual({ dia: '7', mes: '03', anio: '2020' })
  })

  it('devuelve campos vacíos para una fecha vacía', () => {
    expect(parsearFechaISO('')).toEqual({ dia: '', mes: '', anio: '' })
  })
})

describe('esFechaDiaMesAnioReal', () => {
  it('acepta una fecha real', () => {
    expect(esFechaDiaMesAnioReal('2024-02-29')).toBe(true) // 2024 es bisiesto
  })

  it('rechaza el 29 de febrero en un año no bisiesto', () => {
    expect(esFechaDiaMesAnioReal('2023-02-29')).toBe(false)
  })

  it('rechaza el 31 de abril (abril tiene 30 días)', () => {
    expect(esFechaDiaMesAnioReal('2023-04-31')).toBe(false)
  })

  it('rechaza cadena vacía', () => {
    expect(esFechaDiaMesAnioReal('')).toBe(false)
  })
})

describe('diasMaximosEnMes', () => {
  it('devuelve 31 si todavía no se eligió mes', () => {
    expect(diasMaximosEnMes('', '2020')).toBe(31)
  })

  it('febrero en año bisiesto: 29 días', () => {
    expect(diasMaximosEnMes('02', '2024')).toBe(29)
  })

  it('febrero en año no bisiesto: 28 días', () => {
    expect(diasMaximosEnMes('02', '2023')).toBe(28)
  })

  it('febrero sin año completo todavía: usa año bisiesto de referencia (29, permisivo)', () => {
    expect(diasMaximosEnMes('02', '')).toBe(29)
  })

  it('abril: 30 días', () => {
    expect(diasMaximosEnMes('04', '2023')).toBe(30)
  })

  it('enero: 31 días', () => {
    expect(diasMaximosEnMes('01', '2023')).toBe(31)
  })
})

describe('mensajeErrorDiaEnMes', () => {
  it('sin día todavía: sin mensaje', () => {
    expect(mensajeErrorDiaEnMes('', '04', '2023')).toBeNull()
  })

  it('día fuera de 1-31: mensaje genérico', () => {
    expect(mensajeErrorDiaEnMes('32', '01', '2023')).toBe('Ingresa un día entre 1 y 31.')
  })

  it('31 de abril: mensaje específico con nombre del mes', () => {
    expect(mensajeErrorDiaEnMes('31', '04', '2023')).toBe('Abril tiene máximo 30 días.')
  })

  it('30 de febrero de un año no bisiesto: mensaje específico con el año', () => {
    expect(mensajeErrorDiaEnMes('30', '02', '2023')).toBe('Febrero de 2023 tiene máximo 28 días.')
  })

  it('29 de febrero de un año bisiesto: válido, sin mensaje', () => {
    expect(mensajeErrorDiaEnMes('29', '02', '2024')).toBeNull()
  })

  it('día válido para el mes: sin mensaje', () => {
    expect(mensajeErrorDiaEnMes('15', '06', '2023')).toBeNull()
  })
})
