import { describe, it, expect } from 'vitest'
import { evaluarDisponibilidadCuantiaRPM } from './evaluarDisponibilidadCuantiaRPM.js'
import { calcularProyeccionRPM } from './calcularProyeccionRPM.js'

const FECHA_CALCULO = '2026-01-01'

describe('evaluarDisponibilidadCuantiaRPM — interpreta calcularProyeccionRPM sin volver a llamarlo', () => {
  it('estado calculado (ventana completa por historia real) → CUANTIA_CALCULABLE, 3650/0 días, fuente historia_estructurada', () => {
    const historia = [{ fechaDesde: '2000-01-01', fechaHasta: '2025-12-31', ibc: 1500000, diasCotizados: 9497 }]
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: historia,
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64,
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')

    const r = evaluarDisponibilidadCuantiaRPM(resultado, { historiaCotizacion: historia })
    expect(r.estado).toBe('CUANTIA_CALCULABLE')
    expect(r.diasIBLCubiertos).toBe(3650)
    expect(r.diasIBLFaltantes).toBe(0)
    expect(r.fuentesDePeriodos).toEqual(['historia_estructurada'])
    expect(r.procedencia).toBe('historia_estructurada')
    expect(r.razon).toBeNull()
    expect(r.accionNecesaria).toBeNull()
  })

  it('estado calculado (ventana completa solo por el tramo futuro, sin historia real) → CUANTIA_CALCULABLE, procedencia continuidad_futura_unicamente', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 90, // horizonte largo, cubre la ventana solo con el futuro
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('calculado')

    const r = evaluarDisponibilidadCuantiaRPM(resultado, { historiaCotizacion: [] })
    expect(r.estado).toBe('CUANTIA_CALCULABLE')
    expect(r.procedencia).toBe('continuidad_futura_unicamente')
    expect(r.fuentesDePeriodos).toEqual(['continuidad_futura_sintetica'])
  })

  it('no_evaluable por HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA → CUANTIA_NO_CALCULABLE_TODAVIA, con días cubiertos/faltantes exactos y accionNecesaria', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-31',
      edadJubilacionDeseada: 62, // horizonte de 30 días — muy por debajo de 3.650
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.razonNoEvaluable).toBe('HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA')

    const r = evaluarDisponibilidadCuantiaRPM(resultado, { historiaCotizacion: [] })
    expect(r.estado).toBe('CUANTIA_NO_CALCULABLE_TODAVIA')
    expect(r.diasIBLCubiertos).toBe(30)
    expect(r.diasIBLFaltantes).toBe(3620)
    expect(r.accionNecesaria).toEqual({
      codigo: 'COMPLETAR_HISTORIA_COTIZACION',
      mensaje: expect.any(String),
    })
    expect(r.razon).toBeTruthy()
  })

  it('CUANTIA_NO_CALCULABLE_TODAVIA nunca contiene pensión, tasa, IBL ni aporte adicional — solo describe disponibilidad de datos', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-31',
      edadJubilacionDeseada: 62,
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    const r = evaluarDisponibilidadCuantiaRPM(resultado, { historiaCotizacion: [] })
    const claves = Object.keys(r)
    for (const clavesProhibidas of ['pensionMensualProyectada', 'tasaReemplazo', 'ibl', 'esfuerzo', 'costoPensionalAdicionalMensual']) {
      expect(claves).not.toContain(clavesProhibidas)
    }
  })

  it('CUANTIA_APROXIMABLE_BAJO_DATOS_DECLARADOS no es alcanzable en E2 (documentado, no implementado) — con los datos que el motor acepta hoy, todo caso no calculado cae en CUANTIA_NO_CALCULABLE_TODAVIA', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [],
      fechaNacimiento: '1964-01-31',
      edadJubilacionDeseada: 62,
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'aproximado' },
    })
    const r = evaluarDisponibilidadCuantiaRPM(resultado, { historiaCotizacion: [] })
    expect(r.estado).not.toBe('CUANTIA_APROXIMABLE_BAJO_DATOS_DECLARADOS')
    expect(r.estado).toBe('CUANTIA_NO_CALCULABLE_TODAVIA')
  })

  it('otras razones de no_evaluable (sin trazabilidadVentana) → diasIBLCubiertos/Faltantes null, razon específica, sin accionNecesaria', () => {
    const resultado = calcularProyeccionRPM({
      historiaCotizacion: [
        { fechaDesde: '2020-01-01', fechaHasta: '2020-06-30', ibc: 1000000, diasCotizados: 999 }, // más días que el rango calendario real
      ],
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64,
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: FECHA_CALCULO,
    })
    expect(resultado.estado).toBe('no_evaluable')
    expect(resultado.trazabilidadVentana).toBeNull()

    const r = evaluarDisponibilidadCuantiaRPM(resultado, { historiaCotizacion: [] })
    expect(r.estado).toBe('CUANTIA_NO_CALCULABLE_TODAVIA')
    expect(r.diasIBLCubiertos).toBeNull()
    expect(r.diasIBLFaltantes).toBeNull()
    expect(r.accionNecesaria).toBeNull()
    expect(r.razon).toBeTruthy()
  })
})
