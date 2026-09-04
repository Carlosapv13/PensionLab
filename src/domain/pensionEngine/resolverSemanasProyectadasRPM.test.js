import { describe, it, expect } from 'vitest'
import { resolverSemanasProyectadasRPM } from './resolverSemanasProyectadasRPM.js'

describe('resolverSemanasProyectadasRPM', () => {
  it('sin historia y sin declaración: todo en cero salvo las futuras, fuente historia_estructurada', () => {
    const r = resolverSemanasProyectadasRPM({ historiaCotizacion: [], semanasReferenciaDeclaradas: null, diasFuturos: 700 })
    expect(r.observadas).toBe(0)
    expect(r.futuras).toBe(100)
    expect(r.sustentadasPorHistoria).toBe(100)
    expect(r.declaradas).toBeNull()
    expect(r.certeza).toBeNull()
    expect(r.total).toBe(100)
    expect(r.fuente).toBe('historia_estructurada')
  })

  it('con historia real: observadas = suma de diasCotizados / 7', () => {
    const historia = [{ diasCotizados: 3650 }, { diasCotizados: 365 }]
    const r = resolverSemanasProyectadasRPM({ historiaCotizacion: historia, semanasReferenciaDeclaradas: null, diasFuturos: 700 })
    expect(r.observadas).toBe(4015 / 7)
    expect(r.total).toBe(r.sustentadasPorHistoria)
    expect(r.fuente).toBe('historia_estructurada')
  })

  it('declaración válida: precedencia total sobre la historia, nunca se suman ambas', () => {
    const historia = [{ diasCotizados: 3650 }]
    const r = resolverSemanasProyectadasRPM({
      historiaCotizacion: historia,
      semanasReferenciaDeclaradas: { cantidad: 1200, certeza: 'aproximado' },
      diasFuturos: 700,
    })
    expect(r.fuente).toBe('declaracion_agregada')
    expect(r.declaradas).toBe(1200)
    expect(r.certeza).toBe('aproximado')
    expect(r.total).toBe(1200 + 100)
    // observadas/sustentadasPorHistoria se conservan trazables aunque no alimenten total.
    expect(r.observadas).toBe(3650 / 7)
    expect(r.total).not.toBe(r.declaradas + r.observadas + r.futuras) // nunca doble conteo
  })

  it.each([
    [{ cantidad: NaN, certeza: 'conocido' }],
    [{ cantidad: -1, certeza: 'conocido' }],
    [{ cantidad: 100, certeza: 'desconocido' }],
    [{ cantidad: 100, certeza: undefined }],
  ])('declaración inválida %o se trata como ausente, nunca lanza', (declaracionInvalida) => {
    const r = resolverSemanasProyectadasRPM({
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: declaracionInvalida,
      diasFuturos: 700,
    })
    expect(r.fuente).toBe('historia_estructurada')
    expect(r.declaradas).toBeNull()
  })

  it('declaración con cantidad 0 y certeza válida sí es válida (0 es un valor legítimo, no "ausente")', () => {
    const r = resolverSemanasProyectadasRPM({
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 0, certeza: 'conocido' },
      diasFuturos: 700,
    })
    expect(r.fuente).toBe('declaracion_agregada')
    expect(r.declaradas).toBe(0)
  })

  it('determinismo: misma entrada produce el mismo resultado', () => {
    const input = { historiaCotizacion: [{ diasCotizados: 1000 }], semanasReferenciaDeclaradas: null, diasFuturos: 500 }
    expect(resolverSemanasProyectadasRPM(input)).toEqual(resolverSemanasProyectadasRPM(input))
  })
})
