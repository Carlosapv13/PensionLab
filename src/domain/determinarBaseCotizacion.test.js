import { describe, it, expect } from 'vitest'
import { determinarBaseCotizacion } from './determinarBaseCotizacion.js'

const FECHA = '2026-06-15'
const SMLV = 1750905
const TOPE_PESOS = 25 * SMLV // 43.772.625

describe('determinarBaseCotizacion — valor declarado (conocido/aproximado)', () => {
  it('conocido, dentro del rango legal: se usa tal cual, sin ajustes', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '2000000',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcActualDeclarado).toBe(2000000)
    expect(r.ibcActualCalculado).toBeNull()
    expect(r.ibcAplicableSimulacion).toBe(2000000)
    expect(r.origenDatoIbc).toBe('declarado_por_usuario')
    expect(r.certezaValorDeclarado).toBe('conocido')
    expect(r.confianzaReglaAplicada).toBe('validada_directamente_aplicable')
    expect(r.ajustesAplicados).toEqual([])
  })

  it('aproximado: se conserva la certeza, mismo tratamiento del valor', () => {
    const r = determinarBaseCotizacion({
      certeza: 'aproximado',
      valorDeclarado: '2000000',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.certezaValorDeclarado).toBe('aproximado')
    expect(r.ibcActualDeclarado).toBe(2000000)
  })

  it('valor por encima del tope: se ajusta, pero el valor original se conserva en ibcActualDeclarado', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '50000000',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcActualDeclarado).toBe(50000000)
    expect(r.ibcAplicableSimulacion).toBe(TOPE_PESOS)
    expect(r.ajustesAplicados).toHaveLength(1)
    expect(r.ajustesAplicados[0].codigo).toBe('TOPE_MAXIMO_IBC')
    expect(r.ajustesAplicados[0].valorAntes).toBe(50000000)
    expect(r.ajustesAplicados[0].valorDespues).toBe(TOPE_PESOS)
  })

  it('ajustesAplicados es puramente estructural: sin descripcion, redacción exclusiva de la pantalla', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '50000000',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ajustesAplicados[0]).not.toHaveProperty('descripcion')
    expect(Object.keys(r.ajustesAplicados[0]).sort()).toEqual(
      ['codigo', 'normaUsada', 'valorAntes', 'valorDespues'].sort()
    )
    // El valor original declarado nunca se pierde ni se sobrescribe, incluso
    // cuando ibcAplicableSimulacion ya quedó ajustado por el tope.
    expect(r.ibcActualDeclarado).toBe(50000000)
  })

  it('valor por debajo del piso doméstico: se excluye de la simulación, sin corregir el dato original', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '500000',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.razonNoApto).toBe('valor_bajo_piso_legal')
    expect(r.ibcActualDeclarado).toBe(500000)
    expect(r.limitaciones.map((l) => l.codigo)).toContain('VALOR_BAJO_PISO_LEGAL')
  })

  it('valor exactamente igual al piso: apto, el corte es estrictamente por debajo', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: String(SMLV),
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBe(SMLV)
    expect(r.razonNoApto).toBeNull()
  })

  it('aproximado, por debajo del piso doméstico: mismo tratamiento que conocido', () => {
    const r = determinarBaseCotizacion({
      certeza: 'aproximado',
      valorDeclarado: '70000',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.razonNoApto).toBe('valor_bajo_piso_legal')
    expect(r.ibcActualDeclarado).toBe(70000)
  })

  it('cotización desde el exterior: nunca valida el piso, lo declara como limitación explícita', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '500000',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'exterior',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.limitaciones.map((l) => l.codigo)).toContain('PISO_EXTERIOR_NO_EVALUADO')
    expect(r.limitaciones.map((l) => l.codigo)).not.toContain('VALOR_BAJO_PISO_LEGAL')
    expect(r.ibcAplicableSimulacion).toBe(500000)
    expect(r.razonNoApto).toBeNull()
  })

  it('conserva normaUsada (tope) para "Ver fundamento legal"', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '2000000',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.normaUsada.id).toBe('tope-maximo-ibc')
    expect(r.normaUsada.vigenciaDesde).toBe('2003-01-29')
  })

  it('siempre declara el estado transitorio del SMLV usado', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '2000000',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.limitaciones.map((l) => l.codigo)).toContain('SMLV_TRANSITORIO')
  })

  it('valor inválido (negativo): no produce ningún resultado, conserva solo la certeza', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '-100',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.certezaValorDeclarado).toBe('conocido')
  })

  it('valor inválido (no numérico): mismo tratamiento que negativo', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: 'abc',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
  })
})

// Auditoría adversarial, ronda 2 (2026-09-25 — revisión de Atlas): fronteras EXACTAS del IBC
// pedidas explícitamente ("no solamente lectura del código") — vacío, cero, un peso debajo
// del piso, exactamente en el tope, un peso encima, magnitud extrema finita. Cada caso
// comprueba rechazo/bloqueo/clamp según el contrato YA EXISTENTE (líneas 51-59 y 138-151 de
// determinarBaseCotizacion.js — `validarMonto`/`aplicarTopeMaximoIBC`), nunca una regla nueva.
describe('determinarBaseCotizacion — fronteras EXACTAS del IBC (auditoría Atlas, ronda 2)', () => {
  it('vacío (cadena vacía, literal): certeza se conserva, sin ningún IBC — nunca calcula con una entrada ausente', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })
    expect(r.ibcActualDeclarado).toBeNull()
    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.certezaValorDeclarado).toBe('conocido')
  })

  it('cero (literal): SÍ se parsea como número (0 es un monto válido, no una ausencia), pero el piso legal lo bloquea — nunca se usa como IBC', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: '0',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })
    expect(r.ibcActualDeclarado).toBe(0) // el dato original nunca se sobrescribe, ni con null
    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.razonNoApto).toBe('valor_bajo_piso_legal')
  })

  it('un peso por DEBAJO de 1 SMLV: el piso SÍ bloquea (< estricto)', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: String(SMLV - 1),
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })
    expect(r.ibcActualDeclarado).toBe(SMLV - 1)
    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.razonNoApto).toBe('valor_bajo_piso_legal')
  })

  it('exactamente en el tope (25×SMLV): NO se ajusta (<= inclusive) — se usa tal cual, sin entrada en ajustesAplicados', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: String(TOPE_PESOS),
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })
    expect(r.ibcActualDeclarado).toBe(TOPE_PESOS)
    expect(r.ibcAplicableSimulacion).toBe(TOPE_PESOS)
    expect(r.ajustesAplicados).toEqual([])
  })

  it('un peso por ENCIMA del tope: SÍ se recorta (clamp exacto al tope), el valor original se conserva en ibcActualDeclarado', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: String(TOPE_PESOS + 1),
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })
    expect(r.ibcActualDeclarado).toBe(TOPE_PESOS + 1)
    expect(r.ibcAplicableSimulacion).toBe(TOPE_PESOS)
    expect(r.ajustesAplicados).toEqual([
      { codigo: 'TOPE_MAXIMO_IBC', valorAntes: TOPE_PESOS + 1, valorDespues: TOPE_PESOS, normaUsada: r.normaUsada },
    ])
  })

  it('magnitud extrema finita (10^15): nunca un camino distinto — mismo clamp genérico al tope, sin desbordar ni producir NaN/Infinity', () => {
    const r = determinarBaseCotizacion({
      certeza: 'conocido',
      valorDeclarado: String(1e15),
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })
    expect(r.ibcActualDeclarado).toBe(1e15)
    expect(r.ibcAplicableSimulacion).toBe(TOPE_PESOS)
    expect(Number.isFinite(r.ibcAplicableSimulacion)).toBe(true)
  })
})

describe('determinarBaseCotizacion — desconocido, empleado con ayuda de salario', () => {
  it('salario dentro del rango: produce un IBC calculado, nunca "validada_directamente_aplicable"', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '3000000',
      fecha: FECHA,
    })

    expect(r.ibcActualCalculado).toBe(3000000)
    expect(r.ibcActualDeclarado).toBeNull()
    expect(r.ibcAplicableSimulacion).toBe(3000000)
    expect(r.origenDatoIbc).toBe('calculado_desde_dato_declarado')
    expect(r.confianzaReglaAplicada).toBe('aplicable_con_supuestos')
    expect(r.limitaciones.map((l) => l.codigo)).toContain('ESTIMACION_DESDE_SALARIO_NO_CUBRE_EXCEPCIONES')
  })

  it('salario por encima del tope: se ajusta, conservando el salario original en ibcActualCalculado', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '50000000',
      fecha: FECHA,
    })

    expect(r.ibcActualCalculado).toBe(50000000)
    expect(r.ibcAplicableSimulacion).toBe(TOPE_PESOS)
    expect(r.ajustesAplicados[0].codigo).toBe('TOPE_MAXIMO_IBC')
    expect(r.razonNoApto).toBeNull()
  })

  it('salario estimado por debajo del piso doméstico: antes esta ruta no lo evaluaba, ahora es consistente con conocido/aproximado', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '70000',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.razonNoApto).toBe('valor_bajo_piso_legal')
    expect(r.ibcActualCalculado).toBe(70000)
    expect(r.limitaciones.map((l) => l.codigo)).toContain('VALOR_BAJO_PISO_LEGAL')
  })

  it('empleado desconocido sin usar la ayuda de salario: queda sin valor, sin bloquear', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.limitaciones.map((l) => l.codigo)).toContain('BASE_COTIZACION_NO_DETERMINADA')
  })
})

describe('determinarBaseCotizacion — desconocido, sin ruta de ayuda disponible', () => {
  it('independiente desconocido: nunca estima, queda no determinado', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '3000000', // ignorado a propósito: no es empleado
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.ibcActualCalculado).toBeNull()
    expect(r.origenDatoIbc).toBeNull()
    expect(r.limitaciones.map((l) => l.codigo)).toContain('BASE_COTIZACION_NO_DETERMINADA')
  })

  it('mixto (ambos) desconocido: mismo tratamiento que independiente', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'ambos',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
  })

  it('exterior desconocido: mismo tratamiento, sin importar tipoCotizante', () => {
    const r = determinarBaseCotizacion({
      certeza: 'desconocido',
      valorDeclarado: '',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'exterior',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
  })
})

describe('determinarBaseCotizacion — sin respuesta todavía', () => {
  it('certeza null: devuelve el resultado vacío, sin limitaciones prematuras', () => {
    const r = determinarBaseCotizacion({
      certeza: null,
      valorDeclarado: '',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      salarioParaEstimar: '',
      fecha: FECHA,
    })

    expect(r.ibcAplicableSimulacion).toBeNull()
    expect(r.certezaValorDeclarado).toBeNull()
    expect(r.limitaciones).toEqual([])
  })
})
