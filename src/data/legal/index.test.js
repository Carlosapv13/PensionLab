import { describe, it, expect } from 'vitest'
import { obtenerSemanasMinimas } from './index.js'

// obtenerSemanasMinimas no tenía pruebas propias pese a estar implementado — estos casos
// cubren la diferencia por sexo, el cronograma progresivo de mujeres (Sentencia C-197 de
// 2023) antes/después de su fecha de inicio, y el error explícito para RAIS.

describe('obtenerSemanasMinimas', () => {
  it('hombre: 1300 semanas, trazable a la entrada por sexo', () => {
    const resultado = obtenerSemanasMinimas('2026-06-15', 'M', 'RPM')

    expect(resultado.valor).toBe(1300)
    expect(resultado.id).toBe('semanas-minimas-pension-hombre')
    expect(resultado.fuente).toBe('Ley 100 de 1993')
  })

  it('mujer, antes del cronograma 2026: 1300 semanas (misma regla que hombres)', () => {
    const resultado = obtenerSemanasMinimas('2025-12-31', 'F', 'RPM')

    expect(resultado.valor).toBe(1300)
    expect(resultado.id).toBe('semanas-minimas-pension-mujer-pre-2026')
  })

  it('mujer, en el cronograma 2026+: resuelve el valor decreciente por año', () => {
    const resultado = obtenerSemanasMinimas('2026-01-01', 'F', 'RPM')

    expect(resultado.valor).toBe(1250)
    expect(resultado.id).toBe('semanas-minimas-pension-mujer-cronograma-2026')
  })

  it('mujer, un año dentro del cronograma: decrementa 25 semanas por año transcurrido', () => {
    const resultado = obtenerSemanasMinimas('2027-03-10', 'F', 'RPM')

    expect(resultado.valor).toBe(1225)
  })

  it('devuelve la trazabilidad completa: estado y listoParaProduccion del archivo de origen', () => {
    const resultado = obtenerSemanasMinimas('2026-06-15', 'M', 'RPM')

    // vigente-2026.json está hoy marcado como borrador / no listo para producción — el
    // resolver debe reflejarlo, no asumir que toda norma vigente ya está lista.
    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
    expect(resultado.vigenciaDesde).toBe('2003-01-29')
    expect(resultado.vigenciaHasta).toBeNull()
  })

  it('RAIS: lanza un error explícito, no asume ni reutiliza el valor de RPM', () => {
    expect(() => obtenerSemanasMinimas('2026-06-15', 'M', 'RAIS')).toThrow(
      /no implementado para regimen 'RAIS'/
    )
  })
})
