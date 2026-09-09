import { describe, it, expect } from 'vitest'
import {
  obtenerSemanasMinimas,
  obtenerEdadPension,
  obtenerFechaEntradaVigenciaSistema,
  obtenerEdadTransicion,
  obtenerTopeMaximoIBC,
  obtenerSmlv,
  obtenerTasaCotizacion,
  obtenerIPC,
  obtenerParametrosTasaReemplazoRPM,
  obtenerSemanasHabilitanAlternativaIBL,
  resolverReglasVigentes,
  evaluarVigenciaSmlv,
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

  it('cierre E3-A (2026-09-07): expone litigioPendiente=true y medidaCautelarActiva=false — la suspensión provisional fue revocada', () => {
    const resultado = obtenerSmlv('2026-09-07')
    expect(resultado.litigioPendiente).toBe(true)
    expect(resultado.medidaCautelarActiva).toBe(false)
  })
})

describe('evaluarVigenciaSmlv', () => {
  const smlvBase = {
    valor: 1750905,
    id: 'smlv-2026',
    fuente: 'Decreto del Gobierno Nacional (Ministerio del Trabajo)',
    articulo: 'Decreto 1469 de 2025 (reactivado)',
    vigenciaDesde: '2026-01-01',
    vigenciaHasta: null,
    litigioPendiente: true,
    medidaCautelarActiva: false,
  }

  it('vigente con litigio pendiente y sin medida cautelar activa → apto, con advertencia (caso real SMLMV 2026 a hoy)', () => {
    const r = evaluarVigenciaSmlv(smlvBase, '2026-09-07')
    expect(r.vigenteOperativamente).toBe(true)
    expect(r.tipoVigencia).toBe('vigente_con_litigio')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.advertencia.codigo).toBe('LITIGIO_DE_FONDO_PENDIENTE')
  })

  it('firme, sin litigio ni medida cautelar → apto, sin advertencia', () => {
    const r = evaluarVigenciaSmlv({ ...smlvBase, litigioPendiente: false }, '2026-09-07')
    expect(r.tipoVigencia).toBe('firme')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.advertencia).toBeNull()
  })

  it('CASO GENÉRICO (hipotético, no el caso real del SMLMV 2026) — medida cautelar activa y sin cadenaNormativa que la sustituya → no apto', () => {
    // No confundir con marzo de 2026 real (ver más abajo): esta es una regla hipotética de
    // prueba, sin ninguna norma sustituta que sostuviera el valor durante la suspensión.
    const reglaHipoteticaSinSustituto = { ...smlvBase, id: 'regla-hipotetica-test', medidaCautelarActiva: true, cadenaNormativa: [] }
    const r = evaluarVigenciaSmlv(reglaHipoteticaSinSustituto, '2026-09-07')
    expect(r.vigenteOperativamente).toBe(false)
    expect(r.tipoVigencia).toBe('suspendido')
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.advertencia.codigo).toBe('MEDIDA_CAUTELAR_ACTIVA')
  })

  it('CASO HISTÓRICO REAL — marzo de 2026 (dentro de la ventana de suspensión del Decreto 1469/2025): apto, porque la cadena normativa real resuelve el fundamento mediante el Decreto 0159/2026 (nunca suspendido), no mediante el estado más reciente de hoy', () => {
    const smlvResueltoMarzo = obtenerSmlv('2026-03-01')
    const r = evaluarVigenciaSmlv(smlvResueltoMarzo, '2026-03-01')
    expect(r.tipoVigencia).toBe('vigente_con_litigio')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.fundamentoNormativoAplicable.articulo).toContain('Decreto 0159')
    expect(r.valorSmlmvAplicable).toBe(1750905)
  })

  it('la cadena normativa distingue el fundamento del tramo previo a la suspensión (enero de 2026), sin litigio ni cautelar', () => {
    const smlvResueltoEnero = obtenerSmlv('2026-01-15')
    const r = evaluarVigenciaSmlv(smlvResueltoEnero, '2026-01-15')
    expect(r.tipoVigencia).toBe('firme')
    expect(r.litigioPendiente).toBe(false)
    expect(r.fundamentoNormativoAplicable.articulo).toContain('1469')
  })

  // Fronteras temporales exactas de la cadena normativa 2026 (cierre E3-A, tercera ronda) —
  // cada expectativa se deriva de las fechas jurídicas efectivamente investigadas (fecha de
  // expedición del auto: 12-feb-2026, confirmada; fecha de expedición/publicación del
  // Decreto 0159/2026: 19-feb-2026, Diario Oficial No. 53.403, confirmada por convergencia
  // de fuentes profesionales; fecha de la revocatoria: 17-jul-2026, comunicación oficial del
  // Consejo de Estado) — nunca de la estructura del código.
  describe('fronteras temporales exactas de la cadena normativa 2026', () => {
    it('2026-02-11 (último día confirmado de Decreto 1469/2025 sin incidencia) → firme, apto', () => {
      const r = evaluarVigenciaSmlv(obtenerSmlv('2026-02-11'), '2026-02-11')
      expect(r.tipoVigencia).toBe('firme')
      expect(r.aptoParaCalculoEnFechaBase).toBe(true)
      expect(r.fundamentoNormativoAplicable.articulo).toContain('1469')
    })

    it('2026-02-12 (fecha de expedición confirmada del auto de suspensión — efecto no confirmado) → fundamento_no_verificado, NO apto', () => {
      const r = evaluarVigenciaSmlv(obtenerSmlv('2026-02-12'), '2026-02-12')
      expect(r.tipoVigencia).toBe('fundamento_no_verificado')
      expect(r.aptoParaCalculoEnFechaBase).toBe(false)
      expect(r.advertencia.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
      // El valor se conserva como referencia histórica, nunca declarado apto.
      expect(r.valorSmlmvAplicable).toBe(1750905)
      expect(r.fundamentoNormativoAplicable.fuente).toBeNull()
    })

    it('2026-02-18 (último día antes de la expedición real del Decreto 0159/2026) → fundamento_no_verificado, NO apto', () => {
      const r = evaluarVigenciaSmlv(obtenerSmlv('2026-02-18'), '2026-02-18')
      expect(r.tipoVigencia).toBe('fundamento_no_verificado')
      expect(r.aptoParaCalculoEnFechaBase).toBe(false)
    })

    it('2026-02-19 (fecha real de expedición/publicación del Decreto 0159/2026, Diario Oficial No. 53.403) → vigente_con_litigio, apto', () => {
      const r = evaluarVigenciaSmlv(obtenerSmlv('2026-02-19'), '2026-02-19')
      expect(r.tipoVigencia).toBe('vigente_con_litigio')
      expect(r.aptoParaCalculoEnFechaBase).toBe(true)
      expect(r.fundamentoNormativoAplicable.articulo).toContain('Decreto 0159')
      expect(r.fundamentoNormativoAplicable.articulo).toContain('19-feb-2026')
    })

    it('2026-07-16 (último día del Decreto 0159/2026, previo a la revocatoria) → vigente_con_litigio, apto, fundamento Decreto 0159', () => {
      const r = evaluarVigenciaSmlv(obtenerSmlv('2026-07-16'), '2026-07-16')
      expect(r.tipoVigencia).toBe('vigente_con_litigio')
      expect(r.aptoParaCalculoEnFechaBase).toBe(true)
      expect(r.fundamentoNormativoAplicable.articulo).toContain('Decreto 0159')
    })

    it('2026-07-17 (fecha de la comunicación oficial de revocatoria — Decreto 1469/2025 reactivado) → vigente_con_litigio, apto, fundamento Decreto 1469/2025', () => {
      const r = evaluarVigenciaSmlv(obtenerSmlv('2026-07-17'), '2026-07-17')
      expect(r.tipoVigencia).toBe('vigente_con_litigio')
      expect(r.aptoParaCalculoEnFechaBase).toBe(true)
      expect(r.fundamentoNormativoAplicable.articulo).toContain('reactivado')
    })
  })

  it('estadoEvaluadoAl se propaga desde la entrada — fecha de conocimiento del estado procesal, distinta de fechaBaseMonetaria', () => {
    const r = evaluarVigenciaSmlv(smlvBase, '2026-09-07')
    // smlvBase (fixture local, sin estadoEvaluadoAl) → null; la entrada real sí lo trae.
    expect(r.estadoEvaluadoAl).toBeNull()
    const smlvResueltoReal = obtenerSmlv('2026-09-07')
    expect(evaluarVigenciaSmlv(smlvResueltoReal, '2026-09-07').estadoEvaluadoAl).toBe('2026-09-07')
  })

  it('fecha base fuera del período de vigencia de la regla → no apto', () => {
    const r = evaluarVigenciaSmlv(smlvBase, '2025-06-01')
    expect(r.tipoVigencia).toBe('fuera_de_vigencia')
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
  })

  it('regla ya derogada (vigenciaHasta en el pasado respecto a la fecha base) → no apto', () => {
    const smlvDerogado = { ...smlvBase, vigenciaDesde: '2025-01-01', vigenciaHasta: '2025-12-31' }
    const r = evaluarVigenciaSmlv(smlvDerogado, '2026-09-07')
    expect(r.tipoVigencia).toBe('fuera_de_vigencia')
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
  })

  it('fuente insuficiente (sin id/fuente/articulo) → no apto', () => {
    const r = evaluarVigenciaSmlv({ valor: 1750905 }, '2026-09-07')
    expect(r.tipoVigencia).toBe('fuente_insuficiente')
    expect(r.aptoParaCalculoEnFechaBase).toBe(false)
  })

  it('smlv ausente → no apto, sin lanzar', () => {
    expect(() => evaluarVigenciaSmlv(null, '2026-09-07')).not.toThrow()
    expect(evaluarVigenciaSmlv(null, '2026-09-07').aptoParaCalculoEnFechaBase).toBe(false)
  })

  it('el valor de obtenerSmlv(hoy) pasado por evaluarVigenciaSmlv resulta apto (integración real E3-A)', () => {
    const smlvResuelto = obtenerSmlv('2026-09-07')
    const r = evaluarVigenciaSmlv(smlvResuelto, '2026-09-07')
    expect(r.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.tipoVigencia).toBe('vigente_con_litigio')
  })
})

// obtenerIPC no pasa por resolverReglasVigentes/LINEA_DE_TIEMPO_VIGENTE (ver su JSDoc):
// consulta directamente ipc-historico.json por año exacto, no por fecha de vigencia.

describe('obtenerIPC', () => {
  it('resuelve el índice de diciembre de un año cargado, trazable a su entrada', () => {
    const resultado = obtenerIPC(2020)

    expect(resultado.valor).toBe(119.79)
    expect(resultado.id).toBe('ipc-dic-2020')
    expect(resultado.anio).toBe(2020)
    expect(resultado.fuente).toMatch(/DANE/)
  })

  it('refleja el estado borrador del archivo de origen, sin ocultarlo', () => {
    const resultado = obtenerIPC(2025)

    expect(resultado.estado).toBe('borrador')
    expect(resultado.listoParaProduccion).toBe(false)
  })

  it('lanza un error explícito para un año no cargado, en vez de interpolar o asumir', () => {
    expect(() => obtenerIPC(1999)).toThrow(/no hay IPC cargado para el año 1999/)
  })
})

// obtenerParametrosTasaReemplazoRPM agrupa los 6 campos que formulaRPM.js necesita en
// parametrosLegales — antes solo formulaRPM.test.js los hardcodeaba.

describe('obtenerParametrosTasaReemplazoRPM', () => {
  it('resuelve los 6 parámetros de vigente-2026.json más el ancla de incremento reutilizada', () => {
    const resultado = obtenerParametrosTasaReemplazoRPM('2026-06-15')

    expect(resultado).toMatchObject({
      tasaReemplazoConstante: 65.5,
      tasaReemplazoPendiente: 0.5,
      tasaReemplazoMinima: 55,
      tasaReemplazoMaxima: 80,
      semanasPorIncrementoAdicional: 50,
      incrementoPorcentualPorTramo: 1.5,
    })
  })

  it('semanasBaseIncrementoRPM reutiliza semanasMinimasPensionHombre (1300), no el mínimo de la mujer', () => {
    // Aunque 2026 ya está en el cronograma de mujeres (1250 en 2026-01-01), el ancla del
    // incremento debe seguir en 1300 para ambos sexos — ver "Punto de controversia" en
    // trazabilidad-formula-RPM.md.
    const resultado = obtenerParametrosTasaReemplazoRPM('2026-06-15')

    expect(resultado.semanasBaseIncrementoRPM).toBe(1300)
  })

  it('devuelve los ids de las 7 entradas usadas, para trazabilidad', () => {
    const resultado = obtenerParametrosTasaReemplazoRPM('2026-06-15')

    expect(resultado.idsUsados).toHaveLength(7)
    expect(resultado.idsUsados).toContain('semanas-minimas-pension-hombre')
    expect(resultado.idsUsados).toContain('tasa-reemplazo-constante')
  })
})

describe('obtenerSemanasHabilitanAlternativaIBL', () => {
  it('resuelve el umbral fijo de 1250 semanas, distinto de la elegibilidad de vejez', () => {
    const resultado = obtenerSemanasHabilitanAlternativaIBL('2026-06-15')

    expect(resultado.valor).toBe(1250)
    expect(resultado.id).toBe('semanas-habilitan-alternativa-ibl')
    expect(resultado.articulo).toBe('Art. 21, inciso 2, Ley 100 de 1993')
  })

  it('no varía entre 2026 y un año posterior (a diferencia del cronograma de mujeres)', () => {
    const resultado2026 = obtenerSemanasHabilitanAlternativaIBL('2026-06-15')
    const resultado2030 = obtenerSemanasHabilitanAlternativaIBL('2030-06-15')

    expect(resultado2026.valor).toBe(1250)
    expect(resultado2030.valor).toBe(1250)
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
