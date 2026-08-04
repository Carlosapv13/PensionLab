import { describe, it, expect } from 'vitest'
import { evaluarEdadPension } from './evidenciaEdadPension.js'

const FECHA = '2026-06-15'

const base = {
  sexo: 'Hombre',
  regimenActual: 'RPM',
  fechaNacimiento: '1964-06-15', // exactamente 62 años en FECHA
  fecha: FECHA,
}

describe('evaluarEdadPension — casos evaluables', () => {
  it('edad exacta al requisito: cumple, sin excedente', () => {
    const r = evaluarEdadPension(base)

    expect(r.estado).toBe('cumple')
    expect(r.edadRequerida).toBe(62)
    expect(r.edadActual).toBe(62)
    expect(r.aniosFaltantes).toBe(0)
    expect(r.aniosExcedentes).toBe(0)
  })

  it('edad por encima del requisito: cumple, con excedente', () => {
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '1960-01-01' })

    expect(r.estado).toBe('cumple')
    expect(r.aniosExcedentes).toBeGreaterThan(0)
    expect(r.aniosFaltantes).toBe(0)
  })

  it('edad por debajo del requisito: no_cumple, con faltantes', () => {
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '1980-01-01' })

    expect(r.estado).toBe('no_cumple')
    expect(r.aniosFaltantes).toBeGreaterThan(0)
    expect(r.aniosExcedentes).toBe(0)
  })

  it('mujer: requisito de 57 años', () => {
    const r = evaluarEdadPension({ ...base, sexo: 'Mujer', fechaNacimiento: '1969-06-15' })

    expect(r.edadRequerida).toBe(57)
    expect(r.estado).toBe('cumple')
  })

  it('todavía no cumple años el día del cumpleaños: no cuenta el año en curso antes de tiempo', () => {
    // Nace el 16 de junio (un día después de la fecha de evaluación) — no ha
    // cumplido años todavía ese año.
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '1964-06-16' })

    expect(r.edadActual).toBe(61)
    expect(r.estado).toBe('no_cumple')
  })

  it('conserva la fecha de evaluación efectiva', () => {
    const r = evaluarEdadPension(base)

    expect(r.fechaEvaluacion).toBe(FECHA)
  })

  it('normaUsada conserva id, fuente, artículo, vigencia y metadata del archivo', () => {
    const r = evaluarEdadPension(base)

    expect(r.normaUsada.id).toBe('edad-pension-hombre')
    expect(r.normaUsada.fuente).toBe('Ley 100 de 1993')
    expect(r.normaUsada.vigenciaDesde).toBe('2003-01-29')
    expect(r.normaUsada.vigenciaHasta).toBeNull()
    expect(r.normaUsada.estado).toBe('borrador')
    expect(r.normaUsada.listoParaProduccion).toBe(false)
  })

  it('la limitación de régimen de transición está siempre presente en resultados evaluables', () => {
    const r = evaluarEdadPension(base)

    expect(r.limitaciones.map((l) => l.codigo)).toContain('REGIMEN_TRANSICION_NO_EVALUADO')
  })

  it('hereda el estado borrador/no-listo de la fuente y genera la limitación correspondiente', () => {
    const r = evaluarEdadPension(base)

    expect(r.limitaciones.map((l) => l.codigo)).toContain('FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION')
  })
})

describe('evaluarEdadPension — no evaluable', () => {
  it('régimen RAIS: no_evaluable / regimen_no_rpm', () => {
    const r = evaluarEdadPension({ ...base, regimenActual: 'RAIS' })

    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('regimen_no_rpm')
    expect(r.normaUsada).toBeNull()
    expect(r.limitaciones).toEqual([])
  })

  it('régimen desconocido: no_evaluable / regimen_desconocido', () => {
    const r = evaluarEdadPension({ ...base, regimenActual: 'desconocido' })

    expect(r.razonNoEvaluable).toBe('regimen_desconocido')
  })

  it('régimen null: no_evaluable / regimen_desconocido', () => {
    const r = evaluarEdadPension({ ...base, regimenActual: null })

    expect(r.razonNoEvaluable).toBe('regimen_desconocido')
  })

  it('sexo inválido: no_evaluable / sexo_no_valido', () => {
    const r = evaluarEdadPension({ ...base, sexo: 'desconocido' })

    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
  })

  it('sexo ausente (null): no_evaluable / sexo_no_valido', () => {
    const r = evaluarEdadPension({ ...base, sexo: null })

    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
  })

  it('fecha de nacimiento vacía: no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '' })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('fecha de nacimiento mal formada: no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '15-06-1964' })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('fecha de nacimiento imposible (30 de febrero): no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '2000-02-30' })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('fecha de nacimiento futura respecto a la fecha de evaluación: no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarEdadPension({ ...base, fechaNacimiento: '2027-01-01' })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('siempre conserva fechaEvaluacion, incluso cuando no_evaluable', () => {
    const r = evaluarEdadPension({ ...base, regimenActual: 'RAIS' })

    expect(r.fechaEvaluacion).toBe(FECHA)
  })
})
