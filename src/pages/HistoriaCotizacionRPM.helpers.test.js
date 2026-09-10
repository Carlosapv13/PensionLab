import { describe, it, expect } from 'vitest'
import {
  borradorVacio,
  evaluarNuevoPeriodo,
  construirPeriodoCotizacion,
  periodoAFormularioBorrador,
  evaluarPeriodoParaHistoria,
  reemplazarPeriodoEnPosicion,
  quitarPeriodoEnPosicion,
} from './HistoriaCotizacionRPM.helpers.js'

const HOY = '2026-08-19'

function borradorValidoCerrado(overrides = {}) {
  return {
    ...borradorVacio(),
    fechaDesde: '2020-01-01',
    fechaHasta: '2022-12-31',
    ibc: '2500000',
    ...overrides,
  }
}

describe('evaluarNuevoPeriodo', () => {
  it('borrador vacío: no se puede agregar y explica todos los campos faltantes', () => {
    const resultado = evaluarNuevoPeriodo(borradorVacio(), HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores.length).toBeGreaterThan(0)
  })

  it('período cerrado válido: puede agregarse sin errores', () => {
    const resultado = evaluarNuevoPeriodo(borradorValidoCerrado(), HOY)
    expect(resultado).toEqual({
      fechaDesdeISO: '2020-01-01',
      fechaHastaISO: '2022-12-31',
      ibcNumero: 2500000,
      puedeAgregar: true,
      errores: [],
    })
  })

  it('período abierto (sigue cotizando): no exige fecha de fin', () => {
    const borrador = borradorValidoCerrado({ sigueAbierto: true, fechaHasta: '' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(true)
    expect(resultado.fechaHastaISO).toBeNull()
  })

  it('fecha de inicio futura: bloquea con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2027-01-01' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('La fecha de inicio de este período no puede ser futura.')
  })

  it('fecha de inicio irreal (31 de abril): bloquea', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2020-04-31' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.fechaDesdeISO).toBeNull()
  })

  it('fecha de fin anterior a la fecha de inicio: bloquea con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2023-01-01', fechaHasta: '2022-12-31' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('La fecha de fin no puede ser anterior a la fecha de inicio de este período.')
  })

  it('IBC vacío: bloquea con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ ibc: '' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('Ingresa un valor de IBC mayor que cero para este período.')
  })

  it('IBC en cero: bloquea (no es un IBC real)', () => {
    const borrador = borradorValidoCerrado({ ibc: '0' })
    const resultado = evaluarNuevoPeriodo(borrador, HOY)
    expect(resultado.puedeAgregar).toBe(false)
  })
})

describe('construirPeriodoCotizacion', () => {
  it('período cerrado: diasCotizados son los días calendario completos del rango', () => {
    const evaluacion = evaluarNuevoPeriodo(borradorValidoCerrado(), HOY)
    const periodo = construirPeriodoCotizacion(evaluacion, HOY)

    expect(periodo).toEqual({
      fechaDesde: '2020-01-01',
      fechaHasta: '2022-12-31',
      ibc: 2500000,
      diasCotizados: 1096, // 2020 (bisiesto, 366) + 2021 (365) + 2022 (365)
    })
  })

  it('período abierto: diasCotizados se calculan hasta la fecha dada, fechaHasta queda null', () => {
    const borrador = borradorValidoCerrado({ sigueAbierto: true, fechaHasta: '', fechaDesde: '2026-01-01' })
    const evaluacion = evaluarNuevoPeriodo(borrador, HOY)
    const periodo = construirPeriodoCotizacion(evaluacion, HOY)

    expect(periodo.fechaHasta).toBeNull()
    expect(periodo.fechaDesde).toBe('2026-01-01')
    expect(periodo.diasCotizados).toBe(231) // 1 ene a 19 ago 2026, inclusive
  })
})

describe('periodoAFormularioBorrador — revisión correctiva E4-C1 (edición real de períodos)', () => {
  it('período cerrado: vuelve al mismo shape de borrador, con ibc como cadena', () => {
    expect(periodoAFormularioBorrador({ fechaDesde: '2020-01-01', fechaHasta: '2022-12-31', ibc: 2500000, diasCotizados: 1096 })).toEqual({
      fechaDesde: '2020-01-01',
      fechaHasta: '2022-12-31',
      sigueAbierto: false,
      ibc: '2500000',
    })
  })

  it('período abierto (fechaHasta null): sigueAbierto true, fechaHasta vuelve a cadena vacía', () => {
    expect(periodoAFormularioBorrador({ fechaDesde: '2026-01-01', fechaHasta: null, ibc: 3000000, diasCotizados: 231 })).toEqual({
      fechaDesde: '2026-01-01',
      fechaHasta: '',
      sigueAbierto: true,
      ibc: '3000000',
    })
  })

  it('ida y vuelta: evaluarNuevoPeriodo(periodoAFormularioBorrador(periodo)) produce un borrador equivalente al original', () => {
    const original = borradorValidoCerrado()
    const periodo = construirPeriodoCotizacion(evaluarNuevoPeriodo(original, HOY), HOY)
    const borradorRecuperado = periodoAFormularioBorrador(periodo)
    const evaluacionRecuperada = evaluarNuevoPeriodo(borradorRecuperado, HOY)
    expect(evaluacionRecuperada.puedeAgregar).toBe(true)
    expect(construirPeriodoCotizacion(evaluacionRecuperada, HOY)).toEqual(periodo)
  })
})

describe('evaluarPeriodoParaHistoria — revisión correctiva E4-C1 (validación compartida agregar/editar, incluye solapamiento)', () => {
  const historiaExistente = [
    { fechaDesde: '2018-01-01', fechaHasta: '2019-12-31', ibc: 1500000, diasCotizados: 730 },
    { fechaDesde: '2020-01-01', fechaHasta: '2021-12-31', ibc: 2000000, diasCotizados: 731 },
  ]

  it('modo agregar (indiceExcluido null): borrador válido, sin solapar ningún período existente → puedeAgregar true', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2022-01-01', fechaHasta: '2022-12-31' })
    const resultado = evaluarPeriodoParaHistoria({ historiaCotizacion: historiaExistente, borrador, fecha: HOY })
    expect(resultado.puedeAgregar).toBe(true)
    expect(resultado.errores).toEqual([])
  })

  it('modo agregar: borrador que solapa con un período existente → bloqueado con mensaje específico', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2019-06-01', fechaHasta: '2020-06-01' }) // solapa con ambos
    const resultado = evaluarPeriodoParaHistoria({ historiaCotizacion: historiaExistente, borrador, fecha: HOY })
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain(
      'Este período se superpone en fechas con otro que ya agregaste — ajusta las fechas para que no coincidan.'
    )
  })

  it('modo editar: el período se compara SOLO contra los demás, nunca contra sí mismo (indiceExcluido)', () => {
    // Mismo rango exacto que historiaExistente[0] — sin excluirlo, "solaparía consigo mismo".
    const borrador = borradorValidoCerrado({ fechaDesde: '2018-01-01', fechaHasta: '2019-12-31' })
    const resultado = evaluarPeriodoParaHistoria({
      historiaCotizacion: historiaExistente,
      borrador,
      indiceExcluido: 0,
      fecha: HOY,
    })
    expect(resultado.puedeAgregar).toBe(true)
  })

  it('modo editar: si la edición hace que el período solape con OTRO distinto del propio, se bloquea igual', () => {
    // Editando el índice 0 para que ahora solape con el índice 1 (2020-2021).
    const borrador = borradorValidoCerrado({ fechaDesde: '2018-01-01', fechaHasta: '2020-06-01' })
    const resultado = evaluarPeriodoParaHistoria({
      historiaCotizacion: historiaExistente,
      borrador,
      indiceExcluido: 0,
      fecha: HOY,
    })
    expect(resultado.puedeAgregar).toBe(false)
  })

  it('fechas/IBC inválidos se rechazan igual que evaluarNuevoPeriodo, sin siquiera evaluar solapamiento', () => {
    const borrador = borradorValidoCerrado({ ibc: '0' })
    const resultado = evaluarPeriodoParaHistoria({ historiaCotizacion: historiaExistente, borrador, fecha: HOY })
    expect(resultado.puedeAgregar).toBe(false)
    expect(resultado.errores).toContain('Ingresa un valor de IBC mayor que cero para este período.')
    expect(resultado.errores).not.toContain(
      'Este período se superpone en fechas con otro que ya agregaste — ajusta las fechas para que no coincidan.'
    )
  })

  it('historia vacía: nunca puede solapar con nada, puedeAgregar depende solo de fechas/IBC', () => {
    const resultado = evaluarPeriodoParaHistoria({ historiaCotizacion: [], borrador: borradorValidoCerrado(), fecha: HOY })
    expect(resultado.puedeAgregar).toBe(true)
  })

  it('período abierto que solapa con uno cerrado existente: también se detecta (fechaHasta resuelta a `fecha`)', () => {
    const borrador = borradorValidoCerrado({ fechaDesde: '2021-06-01', fechaHasta: '', sigueAbierto: true })
    const resultado = evaluarPeriodoParaHistoria({ historiaCotizacion: historiaExistente, borrador, fecha: HOY })
    expect(resultado.puedeAgregar).toBe(false)
  })
})

describe('reemplazarPeriodoEnPosicion — revisión correctiva E4-C1 (guardar edición: misma posición, sin duplicar, sin tocar los demás)', () => {
  const A = { fechaDesde: '2018-01-01', fechaHasta: '2019-12-31', ibc: 1500000, diasCotizados: 730 }
  const B = { fechaDesde: '2020-01-01', fechaHasta: '2021-12-31', ibc: 2000000, diasCotizados: 731 }
  const C = { fechaDesde: '2022-01-01', fechaHasta: '2022-12-31', ibc: 2500000, diasCotizados: 365 }

  it('reemplaza exactamente en el índice dado, sin cambiar la longitud del array (no duplica)', () => {
    const nuevoA = { ...A, ibc: 1700000 }
    const resultado = reemplazarPeriodoEnPosicion([A, B, C], 0, nuevoA)
    expect(resultado).toHaveLength(3)
    expect(resultado[0]).toBe(nuevoA)
  })

  it('conserva los demás períodos exactamente igual (misma referencia, no solo mismo valor)', () => {
    const nuevoB = { ...B, ibc: 2100000 }
    const resultado = reemplazarPeriodoEnPosicion([A, B, C], 1, nuevoB)
    expect(resultado[0]).toBe(A)
    expect(resultado[2]).toBe(C)
  })

  it('editar el último índice no afecta a los anteriores', () => {
    const nuevoC = { ...C, ibc: 3000000 }
    const resultado = reemplazarPeriodoEnPosicion([A, B, C], 2, nuevoC)
    expect(resultado).toEqual([A, B, nuevoC])
  })

  it('nunca muta el array original', () => {
    const original = [A, B, C]
    const copia = [...original]
    reemplazarPeriodoEnPosicion(original, 1, { ...B, ibc: 999 })
    expect(original).toEqual(copia)
    expect(original[1]).toBe(B)
  })
})

describe('quitarPeriodoEnPosicion — corrección puntual E4-C1 (hallazgo 5: solo elimina el período elegido, conserva los demás)', () => {
  const A = { fechaDesde: '2018-01-01', fechaHasta: '2019-12-31', ibc: 1500000, diasCotizados: 730 }
  const B = { fechaDesde: '2020-01-01', fechaHasta: '2021-12-31', ibc: 2000000, diasCotizados: 731 }
  const C = { fechaDesde: '2022-01-01', fechaHasta: '2022-12-31', ibc: 2500000, diasCotizados: 365 }

  it('elimina exactamente el período en el índice dado, ninguno más', () => {
    expect(quitarPeriodoEnPosicion([A, B, C], 1)).toEqual([A, C])
  })

  it('conserva los demás períodos intactos (misma referencia, no solo mismo valor)', () => {
    const resultado = quitarPeriodoEnPosicion([A, B, C], 1)
    expect(resultado[0]).toBe(A)
    expect(resultado[1]).toBe(C)
  })

  it('eliminar el primero conserva el orden relativo de los restantes', () => {
    expect(quitarPeriodoEnPosicion([A, B, C], 0)).toEqual([B, C])
  })

  it('eliminar el ÚNICO período deja el arreglo vacío — el estado que activa la redacción natural de cero períodos', () => {
    expect(quitarPeriodoEnPosicion([A], 0)).toEqual([])
  })

  it('nunca muta el array original', () => {
    const original = [A, B, C]
    const copia = [...original]
    quitarPeriodoEnPosicion(original, 1)
    expect(original).toEqual(copia)
  })
})
