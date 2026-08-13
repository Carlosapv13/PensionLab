import { describe, it, expect } from 'vitest'
import { tienePrimeraLecturaValor } from './tienePrimeraLecturaValor.js'

const FECHA = '2026-08-06'

const CASO_EVALUABLE_BASE = {
  sexo: 'Mujer',
  regimenActual: 'RPM',
  nivelConocimientoSemanas: 'conocido',
  semanasCotizadas: '1300',
  fechaNacimiento: '1980-01-01', // edadActual = 46 en FECHA
  fecha: FECHA,
}

describe('tienePrimeraLecturaValor — ambas evidencias evaluables', () => {
  it('devuelve true', () => {
    expect(tienePrimeraLecturaValor(CASO_EVALUABLE_BASE)).toBe(true)
  })
})

describe('tienePrimeraLecturaValor — semanas evaluables, edad no evaluable', () => {
  it('fecha de nacimiento inválida (futura): edad no_evaluable, semanas sigue siendo evaluable → true', () => {
    const resultado = tienePrimeraLecturaValor({
      ...CASO_EVALUABLE_BASE,
      fechaNacimiento: '2030-01-01', // posterior a FECHA
    })
    expect(resultado).toBe(true)
  })
})

describe('tienePrimeraLecturaValor — edad evaluable, semanas no evaluables', () => {
  it('semanas desconocidas: semanas no_evaluable, edad sigue siendo evaluable → true', () => {
    const resultado = tienePrimeraLecturaValor({
      ...CASO_EVALUABLE_BASE,
      nivelConocimientoSemanas: 'desconocido',
    })
    expect(resultado).toBe(true)
  })
})

describe('tienePrimeraLecturaValor — ambas evidencias no_evaluable', () => {
  it('sexo inválido: ambas no_evaluable por la misma razón (sexo_no_valido) → false', () => {
    const resultado = tienePrimeraLecturaValor({
      ...CASO_EVALUABLE_BASE,
      sexo: null,
    })
    expect(resultado).toBe(false)
  })

  it('régimen desconocido: ambas no_evaluable (regimen_desconocido) → false', () => {
    const resultado = tienePrimeraLecturaValor({
      ...CASO_EVALUABLE_BASE,
      regimenActual: 'desconocido',
    })
    expect(resultado).toBe(false)
  })
})

describe('tienePrimeraLecturaValor — caso RAIS (el que motivó este cambio)', () => {
  it('régimen RAIS: ambas evidencias no_evaluable (regimen_no_rpm) → false, PrimeraLectura debe omitirse', () => {
    const resultado = tienePrimeraLecturaValor({
      ...CASO_EVALUABLE_BASE,
      regimenActual: 'RAIS',
    })
    expect(resultado).toBe(false)
  })
})

// Los tres describe siguientes verifican las propiedades exactas de las que
// depende la navegación en App.jsx (vistaSegunValorDePrimeraLectura): tanto
// HistoriaPensional → Continuar como IndiciosRegimenTransicion → Volver
// llaman a esta misma función pura con los datos vigentes del estado plano —
// no existe lógica de enrutamiento propia que probar por separado, ni una
// bandera guardada que pudiera quedar obsoleta. App.jsx no tiene precedente
// de tests de componente en este proyecto (solo dominio) — estas pruebas
// cubren la garantía real que sostiene esa navegación.
describe('tienePrimeraLecturaValor — navegación hacia adelante (HistoriaPensional → Continuar)', () => {
  it('con datos RPM evaluables, la decisión de destino sería "primeraLectura"', () => {
    expect(tienePrimeraLecturaValor(CASO_EVALUABLE_BASE)).toBe(true)
  })

  it('con datos RAIS, la decisión de destino sería "indiciosTransicion" directamente', () => {
    expect(tienePrimeraLecturaValor({ ...CASO_EVALUABLE_BASE, regimenActual: 'RAIS' })).toBe(false)
  })
})

describe('tienePrimeraLecturaValor — navegación hacia atrás (IndiciosRegimenTransicion → Volver), simétrica con la de avance', () => {
  it('para los mismos datos, dos evaluaciones consecutivas (ida y vuelta) devuelven exactamente el mismo resultado', () => {
    const datos = { ...CASO_EVALUABLE_BASE, regimenActual: 'RAIS' }
    const alAvanzar = tienePrimeraLecturaValor(datos)
    const alRetroceder = tienePrimeraLecturaValor(datos)
    expect(alRetroceder).toBe(alAvanzar)
    expect(alRetroceder).toBe(false) // Volver también iría directo a 'historiaPensional', nunca a 'primeraLectura'
  })
})

describe('tienePrimeraLecturaValor — recálculo con datos vigentes, sin bandera obsoleta', () => {
  it('la misma llamada con datos distintos produce resultados distintos — nunca memoriza el primer resultado', () => {
    const primeraEvaluacion = tienePrimeraLecturaValor(CASO_EVALUABLE_BASE) // RPM, evaluable
    expect(primeraEvaluacion).toBe(true)

    // Simula: el usuario retrocedió más atrás en el recorrido y cambió de
    // régimen antes de volver a avanzar — la función es pura y sin estado
    // propio, así que la segunda llamada refleja los datos vigentes, nunca
    // el resultado ya obtenido antes.
    const segundaEvaluacion = tienePrimeraLecturaValor({ ...CASO_EVALUABLE_BASE, regimenActual: 'RAIS' })
    expect(segundaEvaluacion).toBe(false)
    expect(segundaEvaluacion).not.toBe(primeraEvaluacion)
  })
})
