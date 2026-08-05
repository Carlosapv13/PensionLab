import { describe, it, expect } from 'vitest'
import { evaluarIndiciosTransicion } from './evidenciaIndiciosTransicion.js'

const FECHA = '2026-06-15'

describe('evaluarIndiciosTransicion — casos evaluables', () => {
  it('mujer con 35 años exactos al 1994-04-01: con_indicios', () => {
    // Nace 1959-04-01 → cumple 35 años exactamente el 1994-04-01.
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.estado).toBe('con_indicios')
    expect(r.edadA1994).toBe(35)
  })

  it('mujer un día antes de cumplir 35 al 1994-04-01: sin_indicios', () => {
    // Nace 1959-04-02 → el 1994-04-01 todavía tiene 34 años.
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-02', fecha: FECHA })

    expect(r.estado).toBe('sin_indicios')
    expect(r.edadA1994).toBe(34)
  })

  it('hombre con 40 años exactos al 1994-04-01: con_indicios', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Hombre', fechaNacimiento: '1954-04-01', fecha: FECHA })

    expect(r.estado).toBe('con_indicios')
    expect(r.edadA1994).toBe(40)
  })

  it('hombre con 39 años al 1994-04-01: sin_indicios', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Hombre', fechaNacimiento: '1954-04-02', fecha: FECHA })

    expect(r.estado).toBe('sin_indicios')
    expect(r.edadA1994).toBe(39)
  })

  it('umbral distinto por sexo: misma fecha de nacimiento, resultado distinto', () => {
    // Alguien nacido en 1957 tiene 37 años al 1994-04-01: alcanza el umbral de
    // mujer (35) pero no el de hombre (40).
    const mujer = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1957-01-01', fecha: FECHA })
    const hombre = evaluarIndiciosTransicion({ sexo: 'Hombre', fechaNacimiento: '1957-01-01', fecha: FECHA })

    expect(mujer.estado).toBe('con_indicios')
    expect(hombre.estado).toBe('sin_indicios')
  })

  it('conserva la fecha de evaluación efectiva', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.fechaEvaluacion).toBe(FECHA)
  })

  it('normaUsada conserva id, fuente, artículo y metadata del archivo', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.normaUsada.id).toBe('edad-transicion-mujer')
    expect(r.normaUsada.fuente).toBe('Ley 100 de 1993')
    expect(r.normaUsada.vigenciaDesde).toBe('1994-04-01')
    expect(r.normaUsada.vigenciaHasta).toBeNull()
    expect(r.normaUsada.estado).toBe('borrador')
    expect(r.normaUsada.listoParaProduccion).toBe(false)
  })

  it('la limitación de tiempo de servicio no evaluado está siempre presente, con o sin indicios', () => {
    const conIndicios = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-01', fecha: FECHA })
    const sinIndicios = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1990-01-01', fecha: FECHA })

    expect(conIndicios.limitaciones.map((l) => l.codigo)).toContain(
      'REGIMEN_TRANSICION_TIEMPO_SERVICIO_NO_EVALUADO'
    )
    expect(sinIndicios.limitaciones.map((l) => l.codigo)).toContain(
      'REGIMEN_TRANSICION_TIEMPO_SERVICIO_NO_EVALUADO'
    )
  })

  it('la limitación de vigencia posterior no evaluada está siempre presente', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.limitaciones.map((l) => l.codigo)).toContain('REGIMEN_TRANSICION_VIGENCIA_NO_EVALUADA')
  })

  it('hereda el estado borrador/no-listo de la fuente y genera la limitación correspondiente', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.limitaciones.map((l) => l.codigo)).toContain('FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION')
  })
})

describe('evaluarIndiciosTransicion — no evaluable', () => {
  it('sexo inválido: no_evaluable / sexo_no_valido', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'desconocido', fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.estado).toBe('no_evaluable')
    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
    expect(r.normaUsada).toBeNull()
    expect(r.limitaciones).toEqual([])
  })

  it('sexo ausente (null): no_evaluable / sexo_no_valido', () => {
    const r = evaluarIndiciosTransicion({ sexo: null, fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.razonNoEvaluable).toBe('sexo_no_valido')
  })

  it('fecha de nacimiento vacía: no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '', fecha: FECHA })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('fecha de nacimiento mal formada: no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '01-04-1959', fecha: FECHA })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('fecha de nacimiento imposible (30 de febrero): no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '2000-02-30', fecha: FECHA })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('fecha de nacimiento futura respecto a la fecha de evaluación: no_evaluable / fecha_nacimiento_invalida', () => {
    const r = evaluarIndiciosTransicion({ sexo: 'Mujer', fechaNacimiento: '2027-01-01', fecha: FECHA })

    expect(r.razonNoEvaluable).toBe('fecha_nacimiento_invalida')
  })

  it('siempre conserva fechaEvaluacion, incluso cuando no_evaluable', () => {
    const r = evaluarIndiciosTransicion({ sexo: null, fechaNacimiento: '1959-04-01', fecha: FECHA })

    expect(r.fechaEvaluacion).toBe(FECHA)
  })
})
