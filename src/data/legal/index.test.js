import { describe, it, expect } from 'vitest'
import {
  obtenerSemanasMinimas,
  obtenerEdadPension,
  obtenerFechaEntradaVigenciaSistema,
  obtenerEdadTransicion,
  obtenerTopeMaximoIBC,
  obtenerSmlv,
  obtenerTasaCotizacion,
  resolverReglasVigentes,
} from './index.js'

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

// obtenerEdadPension no recibe régimen: solo resuelve qué dice la norma para
// un sexo y una fecha, con su trazabilidad completa. Si esa norma aplica a un
// caso concreto es responsabilidad de quien la consume, no de este resolver.
describe('obtenerEdadPension', () => {
  it('hombre: 62 años, trazable a la entrada por sexo', () => {
    const resultado = obtenerEdadPension('2026-06-15', 'M')

    expect(resultado.valor).toBe(62)
    expect(resultado.id).toBe('edad-pension-hombre')
    expect(resultado.fuente).toBe('Ley 100 de 1993')
  })

  it('mujer: 57 años, trazable a la entrada por sexo', () => {
    const resultado = obtenerEdadPension('2026-06-15', 'F')

    expect(resultado.valor).toBe(57)
    expect(resultado.id).toBe('edad-pension-mujer')
  })

  it('devuelve la trazabilidad completa: estado y listoParaProduccion del archivo de origen', () => {
    const resultado = obtenerEdadPension('2026-06-15', 'M')

    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
    expect(resultado.vigenciaDesde).toBe('2003-01-29')
    expect(resultado.vigenciaHasta).toBeNull()
  })
})

// obtenerFechaEntradaVigenciaSistema y obtenerEdadTransicion viven en
// ley100-1993.json, no en vigente-2026.json — cubren el screening de indicios de
// régimen de transición (Art. 36 y Art. 151, Ley 100 de 1993). Ver
// trazabilidad-normativa.md para la investigación normativa completa.

describe('obtenerFechaEntradaVigenciaSistema', () => {
  it('resuelve la fecha fija de entrada en vigencia del Sistema', () => {
    const resultado = obtenerFechaEntradaVigenciaSistema('2026-06-15')

    expect(resultado.valor).toBe('1994-04-01')
    expect(resultado.id).toBe('fecha-entrada-vigencia-sistema-pensional')
    expect(resultado.fuente).toBe('Ley 100 de 1993')
    expect(resultado.articulo).toBe('Art. 151 Ley 100 de 1993')
  })

  it('devuelve la trazabilidad completa: estado y listoParaProduccion del archivo de origen', () => {
    const resultado = obtenerFechaEntradaVigenciaSistema('2026-06-15')

    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
    expect(resultado.vigenciaDesde).toBe('1994-04-01')
    expect(resultado.vigenciaHasta).toBeNull()
  })
})

describe('obtenerEdadTransicion', () => {
  it('mujer: 35 años, trazable a la entrada por sexo', () => {
    const resultado = obtenerEdadTransicion('2026-06-15', 'F')

    expect(resultado.valor).toBe(35)
    expect(resultado.id).toBe('edad-transicion-mujer')
    expect(resultado.fuente).toBe('Ley 100 de 1993')
  })

  it('hombre: 40 años, trazable a la entrada por sexo', () => {
    const resultado = obtenerEdadTransicion('2026-06-15', 'M')

    expect(resultado.valor).toBe(40)
    expect(resultado.id).toBe('edad-transicion-hombre')
  })

  it('devuelve la trazabilidad completa: estado y listoParaProduccion del archivo de origen', () => {
    const resultado = obtenerEdadTransicion('2026-06-15', 'F')

    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
    expect(resultado.vigenciaDesde).toBe('1994-04-01')
    expect(resultado.vigenciaHasta).toBeNull()
  })
})

// obtenerTopeMaximoIBC y obtenerSmlv viven en vigente-2026.json — usados por
// determinarBaseCotizacion.js (Slice "Base actual de cotización") para aplicar
// el techo del IBC. Ver trazabilidad-normativa.md.

describe('obtenerTopeMaximoIBC', () => {
  it('resuelve 25 SMLMV, trazable a su entrada', () => {
    const resultado = obtenerTopeMaximoIBC('2026-06-15')

    expect(resultado.valor).toBe(25)
    expect(resultado.id).toBe('tope-maximo-ibc')
    expect(resultado.fuente).toMatch(/^Ley 100 de 1993/)
  })

  it('devuelve la trazabilidad completa: estado y listoParaProduccion del archivo de origen', () => {
    const resultado = obtenerTopeMaximoIBC('2026-06-15')

    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
    expect(resultado.vigenciaDesde).toBe('2003-01-29')
    expect(resultado.vigenciaHasta).toBeNull()
  })
})

describe('obtenerSmlv', () => {
  it('resuelve el valor vigente, activando conscientemente el estado transitorio', () => {
    const resultado = obtenerSmlv('2026-06-15')

    expect(resultado.valor).toBe(1750905)
    expect(resultado.id).toBe('smlv-2026')
  })

  it('expone estadoJuridico transitorio, sin ocultarlo', () => {
    const resultado = obtenerSmlv('2026-06-15')

    expect(resultado.estadoJuridico).toBe('transitorio')
  })

  it('sin activar permitirTransitorio, resolverReglasVigentes excluye smlv por defecto', () => {
    // Confirma la premisa que justifica la activación consciente en el JSDoc
    // de obtenerSmlv: sin ese permiso explícito, la entrada ni siquiera
    // aparece entre las reglas vigentes.
    const reglasPorDefecto = resolverReglasVigentes('2026-06-15')
    expect(reglasPorDefecto.find((r) => r.campo === 'smlv')).toBeUndefined()
  })
})

describe('obtenerTasaCotizacion', () => {
  it('resuelve 16 puntos porcentuales, trazable a su entrada', () => {
    const resultado = obtenerTasaCotizacion('2026-06-15')

    expect(resultado.valor).toBe(16)
    expect(resultado.id).toBe('tasa-cotizacion')
    expect(resultado.fuente).toBe('Ley 100 de 1993')
  })

  it('devuelve la trazabilidad completa: estado y listoParaProduccion del archivo de origen', () => {
    const resultado = obtenerTasaCotizacion('2026-06-15')

    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
    expect(resultado.vigenciaDesde).toBe('2006-01-01')
    expect(resultado.vigenciaHasta).toBeNull()
  })
})
