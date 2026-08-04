import { describe, it, expect } from 'vitest'
import { evaluarSemanasMinimas } from './evidenciaSemanasMinimas.js'

const FECHA = '2026-06-15' // dentro del cronograma 2026 para mujeres

const base = {
  sexo: 'Hombre',
  regimenActual: 'RPM',
  nivelConocimientoSemanas: 'conocido',
  semanasCotizadas: '1300',
  fecha: FECHA,
}

describe('evaluarSemanasMinimas — casos evaluables', () => {
  it('semanas por debajo del mínimo: no_cumple, con faltantes positivos y excedentes en 0', () => {
    const r = evaluarSemanasMinimas({ ...base, semanasCotizadas: '1200' })

    expect(r.estado).toBe('no_cumple')
    expect(r.razonNoEvaluable).toBeNull()
    expect(r.semanasMinimas).toBe(1300)
    expect(r.semanasDeclaradas).toBe(1200)
    expect(r.semanasFaltantes).toBe(100)
    expect(r.semanasExcedentes).toBe(0)
  })

  it('semanas exactamente iguales al mínimo: cumple, faltantes y excedentes en 0', () => {
    const r = evaluarSemanasMinimas({ ...base, semanasCotizadas: '1300' })

    expect(r.estado).toBe('cumple')
    expect(r.semanasFaltantes).toBe(0)
    expect(r.semanasExcedentes).toBe(0)
  })

  it('semanas por encima del mínimo: cumple, con excedentes positivos y faltantes en 0', () => {
    const r = evaluarSemanasMinimas({ ...base, semanasCotizadas: '1500' })

    expect(r.estado).toBe('cumple')
    expect(r.semanasFaltantes).toBe(0)
    expect(r.semanasExcedentes).toBe(200)
  })

  it('semanas aproximadas: conserva certezaSemanas como aproximado', () => {
    const r = evaluarSemanasMinimas({
      ...base,
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '1200',
    })

    expect(r.certezaSemanas).toBe('aproximado')
    expect(r.estado).toBe('no_cumple')
  })

  it('conserva la fecha de evaluación efectiva', () => {
    const r = evaluarSemanasMinimas(base)

    expect(r.fechaEvaluacion).toBe(FECHA)
  })

  it('normaUsada conserva id, fuente, artículo, vigencia y metadata del archivo', () => {
    const r = evaluarSemanasMinimas(base)

    expect(r.normaUsada.id).toBe('semanas-minimas-pension-hombre')
    expect(r.normaUsada.fuente).toBe('Ley 100 de 1993')
    expect(r.normaUsada.vigenciaDesde).toBe('2003-01-29')
    expect(r.normaUsada.vigenciaHasta).toBeNull()
    expect(r.normaUsada.estado).toBe('borrador')
    expect(r.normaUsada.listoParaProduccion).toBe(false)
  })

  it('la limitación de régimen de transición está siempre presente en resultados evaluables', () => {
    const r = evaluarSemanasMinimas(base)

    expect(r.limitaciones.map((l) => l.codigo)).toContain('REGIMEN_TRANSICION_NO_EVALUADO')
  })

  it('hereda el estado borrador/no-listo de la fuente y genera la limitación correspondiente', () => {
    // vigente-2026.json está hoy marcado "borrador" / listoParaProduccion: false.
    const r = evaluarSemanasMinimas(base)

    expect(r.limitaciones.map((l) => l.codigo)).toContain('FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION')
  })
})

describe('evaluarSemanasMinimas — no evaluable', () => {
  it('régimen RAIS: no_evaluable / regimen_no_rpm', () => {
    const r = evaluarSemanasMinimas({ ...base, regimenActual: 'RAIS' })

    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('regimen_no_rpm')
    expect(r.normaUsada).toBeNull()
    expect(r.limitaciones).toEqual([])
  })

  it('régimen desconocido: no_evaluable / regimen_desconocido', () => {
    const r = evaluarSemanasMinimas({ ...base, regimenActual: 'desconocido' })

    expect(r.razonNoEvaluable).toBe('regimen_desconocido')
  })

  it('régimen null: no_evaluable / regimen_desconocido', () => {
    const r = evaluarSemanasMinimas({ ...base, regimenActual: null })

    expect(r.razonNoEvaluable).toBe('regimen_desconocido')
  })

  it('semanas desconocidas: no_evaluable / semanas_desconocidas', () => {
    const r = evaluarSemanasMinimas({ ...base, nivelConocimientoSemanas: 'desconocido' })

    expect(r.razonNoEvaluable).toBe('semanas_desconocidas')
    expect(r.certezaSemanas).toBeNull()
    expect(r.semanasDeclaradas).toBeNull()
  })

  it('sexo inválido: no_evaluable / sexo_no_valido, nunca una suposición', () => {
    const r = evaluarSemanasMinimas({ ...base, sexo: 'desconocido' })

    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
  })

  it('sexo ausente (null): no_evaluable / sexo_no_valido', () => {
    const r = evaluarSemanasMinimas({ ...base, sexo: null })

    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
  })

  it('no elimina información válida: conserva certezaSemanas y semanasDeclaradas aunque el sexo sea inválido', () => {
    const r = evaluarSemanasMinimas({ ...base, sexo: null, semanasCotizadas: '1200' })

    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
    expect(r.certezaSemanas).toBe('conocido')
    expect(r.semanasDeclaradas).toBe(1200)
  })

  it('siempre conserva fechaEvaluacion, incluso cuando no_evaluable', () => {
    const r = evaluarSemanasMinimas({ ...base, regimenActual: 'RAIS' })

    expect(r.fechaEvaluacion).toBe(FECHA)
  })
})

describe('evaluarSemanasMinimas — validación de semanas (semanas_invalidas)', () => {
  const casosInvalidos = [
    ['cadena vacía', ''],
    ['texto no numérico', 'abc'],
    ['número negativo', '-5'],
    ['decimal', '12.5'],
    ['Infinity', 'Infinity'],
  ]

  it.each(casosInvalidos)('%s: no_evaluable / semanas_invalidas', (_nombre, valor) => {
    const r = evaluarSemanasMinimas({ ...base, semanasCotizadas: valor })

    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('semanas_invalidas')
    expect(r.semanasDeclaradas).toBeNull()
    expect(r.normaUsada).toBeNull()
  })

  it('conserva certezaSemanas aunque el número sea inválido', () => {
    const r = evaluarSemanasMinimas({ ...base, semanasCotizadas: 'abc' })

    expect(r.certezaSemanas).toBe('conocido')
  })

  it('cero es un entero válido y produce no_cumple (no semanas_invalidas)', () => {
    const r = evaluarSemanasMinimas({ ...base, semanasCotizadas: '0' })

    expect(r.estado).toBe('no_cumple')
    expect(r.razonNoEvaluable).toBeNull()
    expect(r.semanasDeclaradas).toBe(0)
    expect(r.semanasFaltantes).toBe(1300)
  })
})
