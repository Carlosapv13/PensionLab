import { describe, it, expect } from 'vitest'
import { validarHistoriaCotizacionTemporal, tienePeriodoPosteriorAFecha, esFechaValida } from './validarHistoriaCotizacionTemporal.js'

const FECHA_CALCULO = '2026-01-01'

describe('validarHistoriaCotizacionTemporal — historia no es un arreglo válido', () => {
  it.each([null, undefined, 'no-es-un-arreglo', 42, {}])('%p se rechaza con HISTORIA_NO_ES_ARREGLO_VALIDO', (valor) => {
    const r = validarHistoriaCotizacionTemporal(valor, FECHA_CALCULO)
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_NO_ES_ARREGLO_VALIDO')
  })

  it('un arreglo vacío SÍ es válido (ausencia de historia, no un error de formato)', () => {
    const r = validarHistoriaCotizacionTemporal([], FECHA_CALCULO)
    expect(r.valida).toBe(true)
    expect(r.codigo).toBeNull()
  })
})

describe('validarHistoriaCotizacionTemporal — período completamente futuro', () => {
  it('fechaDesde y fechaHasta ambas posteriores a fechaCalculo: rechazado', () => {
    const r = validarHistoriaCotizacionTemporal(
      [{ fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', diasCotizados: 365 }],
      FECHA_CALCULO
    )
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    expect(r.indice).toBe(0)
  })

  it('período abierto (fechaHasta: null) que empieza en el futuro: rechazado', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2027-01-01', fechaHasta: null, diasCotizados: 100 }], FECHA_CALCULO)
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })
})

describe('validarHistoriaCotizacionTemporal — período parcialmente futuro (empieza antes, termina después)', () => {
  it('fechaDesde antes de fechaCalculo, fechaHasta después: rechazado', () => {
    const r = validarHistoriaCotizacionTemporal(
      [{ fechaDesde: '2025-06-01', fechaHasta: '2026-06-30', diasCotizados: 395 }],
      FECHA_CALCULO
    )
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })
})

describe('validarHistoriaCotizacionTemporal — fechas invertidas', () => {
  it('fechaDesde posterior a fechaHasta (ambas en el pasado, no futuras): rechazado con código propio, no confundido con "posterior a fecha de cálculo"', () => {
    const r = validarHistoriaCotizacionTemporal(
      [{ fechaDesde: '2020-06-01', fechaHasta: '2020-01-01', diasCotizados: 30 }],
      FECHA_CALCULO
    )
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS')
  })

  it('fechaDesde === fechaHasta (un solo día): válido, no se considera invertido', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2020-06-01', fechaHasta: '2020-06-01', diasCotizados: 1 }], FECHA_CALCULO)
    expect(r.valida).toBe(true)
  })

  it('período abierto (fechaHasta: null): nunca se evalúa como invertido, aunque fechaDesde sea "grande"', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2025-06-01', fechaHasta: null, diasCotizados: 100 }], FECHA_CALCULO)
    expect(r.valida).toBe(true)
  })
})

describe('validarHistoriaCotizacionTemporal — fechas inválidas', () => {
  it('fechaDesde con formato inválido: rechazado, nunca produce NaN aguas abajo', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: 'no-es-una-fecha', fechaHasta: '2020-12-31', diasCotizados: 300 }], FECHA_CALCULO)
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA')
  })

  it('fechaHasta con formato inválido: rechazado', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2020-01-01', fechaHasta: 'no-es-una-fecha', diasCotizados: 300 }], FECHA_CALCULO)
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA')
  })

  it('período null/undefined dentro del arreglo: rechazado como fecha inválida, no lanza', () => {
    const r = validarHistoriaCotizacionTemporal([null], FECHA_CALCULO)
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA')
  })

  it('fechaHasta: null (período abierto) nunca se evalúa como "inválida" — null es un valor legítimo, distinto de un string malformado', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2020-01-01', fechaHasta: null, diasCotizados: 300 }], FECHA_CALCULO)
    expect(r.valida).toBe(true)
  })
})

describe('validarHistoriaCotizacionTemporal — bordes exactos contra fechaCalculo', () => {
  it('historia válida que termina EXACTAMENTE en fechaCalculo: válida, no futura (límite inclusive)', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2025-01-01', fechaHasta: FECHA_CALCULO, diasCotizados: 365 }], FECHA_CALCULO)
    expect(r.valida).toBe(true)
  })

  it('historia válida que termina el día calendario anterior a fechaCalculo: válida', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', diasCotizados: 365 }], FECHA_CALCULO)
    expect(r.valida).toBe(true)
  })

  it('historia que termina un día después de fechaCalculo (2026-01-02): rechazada — la frontera es estricta', () => {
    const r = validarHistoriaCotizacionTemporal([{ fechaDesde: '2025-01-01', fechaHasta: '2026-01-02', diasCotizados: 367 }], FECHA_CALCULO)
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })
})

describe('validarHistoriaCotizacionTemporal — múltiples períodos, orden de detección', () => {
  it('el primer período inválido en el orden del arreglo es el que se reporta, con su índice correcto', () => {
    const r = validarHistoriaCotizacionTemporal(
      [
        { fechaDesde: '2020-01-01', fechaHasta: '2020-12-31', diasCotizados: 366 }, // válido
        { fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', diasCotizados: 365 }, // futuro
        { fechaDesde: '2021-06-01', fechaHasta: '2021-01-01', diasCotizados: 30 }, // invertido, nunca se llega a evaluar
      ],
      FECHA_CALCULO
    )
    expect(r.valida).toBe(false)
    expect(r.codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    expect(r.indice).toBe(1)
  })

  it('todos los períodos válidos: la historia completa es válida', () => {
    const r = validarHistoriaCotizacionTemporal(
      [
        { fechaDesde: '2020-01-01', fechaHasta: '2020-12-31', diasCotizados: 366 },
        { fechaDesde: '2021-01-01', fechaHasta: '2025-12-31', diasCotizados: 1826 },
      ],
      FECHA_CALCULO
    )
    expect(r.valida).toBe(true)
  })
})

describe('tienePeriodoPosteriorAFecha — extraída de calcularProyeccionRPM.js, comportamiento verificado sin cambios', () => {
  it('mismo comportamiento documentado en el archivo original: fechaDesde > fecha, o fechaHasta no nulo y > fecha', () => {
    expect(tienePeriodoPosteriorAFecha([{ fechaDesde: '2027-01-01', fechaHasta: null }], FECHA_CALCULO)).toBe(true)
    expect(tienePeriodoPosteriorAFecha([{ fechaDesde: '2020-01-01', fechaHasta: null }], FECHA_CALCULO)).toBe(false)
    expect(tienePeriodoPosteriorAFecha([{ fechaDesde: '2020-01-01', fechaHasta: '2025-12-31' }], FECHA_CALCULO)).toBe(false)
    expect(tienePeriodoPosteriorAFecha([], FECHA_CALCULO)).toBe(false)
  })
})

describe('esFechaValida — reexportada, mismo criterio que el resto del dominio', () => {
  it('acepta ISO válido, rechaza formato inválido, null, undefined y no-strings', () => {
    expect(esFechaValida('2026-01-01')).toBe(true)
    expect(esFechaValida('no-es-fecha')).toBe(false)
    expect(esFechaValida(null)).toBe(false)
    expect(esFechaValida(undefined)).toBe(false)
    expect(esFechaValida(20260101)).toBe(false)
  })
})
