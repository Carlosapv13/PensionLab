import { describe, it, expect } from 'vitest'
import { construirEntradasAjusteLegalRPM } from './construirEntradasAjusteLegalRPM.js'
import { ajustarMesadaLegalRPM } from './ajustarMesadaLegalRPM.js'
import { resolverSmlvVigenteRPM } from './resolverSmlvVigenteRPM.js'
import { REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM } from '../../data/legal/referenciasNormativasAjusteLegalRPM.js'
import { ESTADOS_ELEGIBILIDAD_RPM } from './evaluarElegibilidadProyectadaRPM.js'

// Fixture base con la forma real de SmlvVigenteRPM (resolverSmlvVigenteRPM.js) — cada test
// solo sobreescribe los campos que le interesan, nunca reconstruye la forma completa.
function smlvVigenteBase(overrides = {}) {
  return {
    encontrado: true,
    valor: 1750905,
    fechaBase: '2026-09-07',
    vigenteDesde: '2026-01-01',
    vigenteHasta: null,
    aptoParaCalculoEnFechaBase: true,
    tipoVigencia: 'firme',
    litigioPendiente: false,
    medidaCautelarActiva: false,
    advertencia: null,
    fundamentoNormativoAplicable: { fuente: 'Decreto 1469 de 2025', articulo: 'Art. 1' },
    estadoEvaluadoAl: '2026-09-07',
    ...overrides,
  }
}

describe('construirEntradasAjusteLegalRPM — mapeo estructural puro (sin decidir elegibilidad ni piso/techo)', () => {
  it('firme: smlv y vigenciaSmlv correctos, sin advertencia', () => {
    const r = construirEntradasAjusteLegalRPM(smlvVigenteBase())
    expect(r.smlv).toEqual({ valor: 1750905, id: null, fuente: 'Decreto 1469 de 2025', articulo: 'Art. 1' })
    expect(r.vigenciaSmlv).toEqual({
      aptoParaCalculoEnFechaBase: true,
      tipoVigencia: 'firme',
      litigioPendiente: false,
      medidaCautelarActiva: false,
      advertencia: null,
    })
  })

  it('vigente_con_litigio: apto=true, litigioPendiente=true, advertencia propagada tal cual (nunca bloquea)', () => {
    const advertencia = { codigo: 'LITIGIO_DE_FONDO_PENDIENTE', mensaje: 'x' }
    const r = construirEntradasAjusteLegalRPM(
      smlvVigenteBase({ tipoVigencia: 'vigente_con_litigio', litigioPendiente: true, advertencia })
    )
    expect(r.vigenciaSmlv.tipoVigencia).toBe('vigente_con_litigio')
    expect(r.vigenciaSmlv.litigioPendiente).toBe(true)
    expect(r.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(true)
    expect(r.vigenciaSmlv.advertencia).toEqual(advertencia)
  })

  it('suspendido (con medida cautelar activa): no apto, campos propagados sin reinterpretar, SMLV conservado como referencia histórica', () => {
    const advertencia = { codigo: 'SMLV_SUSPENDIDO', mensaje: 'x' }
    const r = construirEntradasAjusteLegalRPM(
      smlvVigenteBase({
        tipoVigencia: 'suspendido',
        aptoParaCalculoEnFechaBase: false,
        litigioPendiente: true,
        medidaCautelarActiva: true,
        advertencia,
      })
    )
    expect(r.vigenciaSmlv).toEqual({
      aptoParaCalculoEnFechaBase: false,
      tipoVigencia: 'suspendido',
      litigioPendiente: true,
      medidaCautelarActiva: true,
      advertencia,
    })
    // El adaptador no descarta el valor histórico solo porque no sea apto — esa decisión es
    // de ajustarMesadaLegalRPM, no de este mapeo.
    expect(r.smlv.valor).toBe(1750905)
  })

  it('fundamento_no_verificado: no apto, valor histórico conservado', () => {
    const advertencia = { codigo: 'FUNDAMENTO_NORMATIVO_NO_VERIFICADO', mensaje: 'x' }
    const r = construirEntradasAjusteLegalRPM(
      smlvVigenteBase({ tipoVigencia: 'fundamento_no_verificado', aptoParaCalculoEnFechaBase: false, advertencia })
    )
    expect(r.vigenciaSmlv.tipoVigencia).toBe('fundamento_no_verificado')
    expect(r.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.vigenciaSmlv.advertencia).toEqual(advertencia)
    expect(r.smlv.valor).toBe(1750905)
  })

  it('fuera_de_vigencia: no apto, sin litigio ni cautelar', () => {
    const advertencia = { codigo: 'SMLV_FUERA_DE_VIGENCIA', mensaje: 'x' }
    const r = construirEntradasAjusteLegalRPM(
      smlvVigenteBase({
        tipoVigencia: 'fuera_de_vigencia',
        aptoParaCalculoEnFechaBase: false,
        litigioPendiente: false,
        medidaCautelarActiva: false,
        advertencia,
      })
    )
    expect(r.vigenciaSmlv.tipoVigencia).toBe('fuera_de_vigencia')
    expect(r.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.vigenciaSmlv.advertencia).toEqual(advertencia)
  })

  it('fuente_insuficiente: sin fundamentoNormativoAplicable — fuente/articulo quedan null, nunca inventados', () => {
    const advertencia = { codigo: 'FUENTE_NORMATIVA_INSUFICIENTE', mensaje: 'x' }
    const r = construirEntradasAjusteLegalRPM(
      smlvVigenteBase({
        tipoVigencia: 'fuente_insuficiente',
        aptoParaCalculoEnFechaBase: false,
        fundamentoNormativoAplicable: null,
        advertencia,
      })
    )
    expect(r.smlv.fuente).toBeNull()
    expect(r.smlv.articulo).toBeNull()
    expect(r.vigenciaSmlv.tipoVigencia).toBe('fuente_insuficiente')
    expect(r.vigenciaSmlv.advertencia).toEqual(advertencia)
  })

  it('fecha inválida (encontrado=false, vía resolverSmlvVigenteRPM real): smlv.valor null, apto=false, advertencia propagada', () => {
    const smlvVigente = resolverSmlvVigenteRPM('no-es-fecha')
    const r = construirEntradasAjusteLegalRPM(smlvVigente)
    expect(r.smlv.valor).toBeNull()
    expect(r.smlv.fuente).toBeNull()
    expect(r.smlv.articulo).toBeNull()
    expect(r.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.vigenciaSmlv.tipoVigencia).toBeNull()
    expect(r.vigenciaSmlv.advertencia.codigo).toBe('FECHA_BASE_MONETARIA_INVALIDA')
  })

  it('fuente legal no encontrada (fecha válida sin cobertura, vía resolverSmlvVigenteRPM real): mismo tratamiento, código distinto', () => {
    const smlvVigente = resolverSmlvVigenteRPM('2025-06-15')
    const r = construirEntradasAjusteLegalRPM(smlvVigente)
    expect(r.smlv.valor).toBeNull()
    expect(r.vigenciaSmlv.aptoParaCalculoEnFechaBase).toBe(false)
    expect(r.vigenciaSmlv.advertencia.codigo).toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    expect(r.vigenciaSmlv.advertencia.codigo).not.toBe('FECHA_BASE_MONETARIA_INVALIDA')
  })

  it('campos ausentes: fundamentoNormativoAplicable ausente (no solo null) — fuente/articulo quedan null sin lanzar', () => {
    const sinFundamento = smlvVigenteBase()
    delete sinFundamento.fundamentoNormativoAplicable
    expect(() => construirEntradasAjusteLegalRPM(sinFundamento)).not.toThrow()
    const r = construirEntradasAjusteLegalRPM(sinFundamento)
    expect(r.smlv.fuente).toBeNull()
    expect(r.smlv.articulo).toBeNull()
  })

  // Revisión Atlas (E3-C2a): el mapeo de `id` es condicional (`smlvVigente.id ?? null`), no
  // `null` incondicional — los tres casos siguientes lo demuestran explícitamente, en vez de
  // probar solo la ausencia (que por sí sola no distingue "el adaptador descarta el id" de
  // "resolverSmlvVigenteRPM nunca lo provee").
  it('id: entrada con id real (hipotético — resolverSmlvVigenteRPM no lo expone hoy) → la salida conserva exactamente ese id', () => {
    const r = construirEntradasAjusteLegalRPM(smlvVigenteBase({ id: 'smlv-2026' }))
    expect(r.smlv.id).toBe('smlv-2026')
  })

  it('id: entrada sin la propiedad `id` (caso real de resolverSmlvVigenteRPM, que nunca la expone) → id=null, nunca inventado', () => {
    const r = construirEntradasAjusteLegalRPM(smlvVigenteBase())
    expect(r.smlv.id).toBeNull()
    expect('id' in smlvVigenteBase()).toBe(false)
  })

  it('id: entrada con id explícitamente null → id=null (no se distingue de "ausente", mismo resultado)', () => {
    const r = construirEntradasAjusteLegalRPM(smlvVigenteBase({ id: null }))
    expect(r.smlv.id).toBeNull()
  })

  it('no muta el objeto de entrada (incluye id)', () => {
    const entrada = smlvVigenteBase({ id: 'smlv-2026' })
    const copia = JSON.parse(JSON.stringify(entrada))
    construirEntradasAjusteLegalRPM(entrada)
    expect(entrada).toEqual(copia)
    expect(entrada.id).toBe('smlv-2026')
  })
})

describe('construirEntradasAjusteLegalRPM — robustez de borde: entrada ausente (revisión Atlas, E3-C2a)', () => {
  const FORMA_VACIA = {
    smlv: { valor: null, id: null, fuente: null, articulo: null },
    vigenciaSmlv: {
      aptoParaCalculoEnFechaBase: false,
      tipoVigencia: null,
      litigioPendiente: null,
      medidaCautelarActiva: null,
      advertencia: null,
    },
  }

  it('undefined: nunca lanza, devuelve la forma completa segura, nunca un SMLV apto', () => {
    expect(() => construirEntradasAjusteLegalRPM(undefined)).not.toThrow()
    expect(construirEntradasAjusteLegalRPM(undefined)).toEqual(FORMA_VACIA)
  })

  it('null: nunca lanza, devuelve la forma completa segura, nunca un SMLV apto', () => {
    expect(() => construirEntradasAjusteLegalRPM(null)).not.toThrow()
    expect(construirEntradasAjusteLegalRPM(null)).toEqual(FORMA_VACIA)
  })

  it('llamado sin argumento (equivalente a undefined): mismo comportamiento seguro', () => {
    expect(() => construirEntradasAjusteLegalRPM()).not.toThrow()
    expect(construirEntradasAjusteLegalRPM()).toEqual(FORMA_VACIA)
  })

  it('la forma vacía, encadenada con ajustarMesadaLegalRPM, produce ENTRADA_INVALIDA — nunca un ajuste aplicado en silencio', () => {
    const { smlv, vigenciaSmlv } = construirEntradasAjusteLegalRPM(undefined)
    const resultado = ajustarMesadaLegalRPM({
      resultadoMatematico: 1_243_210,
      ibl: 2_000_000,
      desgloseTasa: {
        tasaInicial: 65,
        bloquesAdicionales: 0,
        incrementoPorSemanas: 0,
        tasaFinalAplicada: 65,
        limiteOchentaPorcientoAplicado: false,
      },
      smlv,
      vigenciaSmlv,
      elegibilidad: { estado: ESTADOS_ELEGIBILIDAD_RPM.CUMPLE },
      fechaBaseMonetaria: '2026-02-11',
      fechaReconocimientoProyectada: '2033-04-12',
      referenciasNormativas: REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM,
    })
    expect(resultado.razon.codigo).toBe('ENTRADA_INVALIDA')
    expect(resultado.razon.detalle.campo).toBe('smlv')
    expect(resultado.resultadoFinalAjustado).toBeNull()
  })
})

describe('construirEntradasAjusteLegalRPM — encadenamiento real: resolverSmlvVigenteRPM -> adaptador -> ajustarMesadaLegalRPM', () => {
  it('SMLV firme real (2026-02-11), elegibilidad CUMPLE: el mapeo nunca dispara ENTRADA_INVALIDA y el piso se evalúa', () => {
    const smlvVigente = resolverSmlvVigenteRPM('2026-02-11')
    expect(smlvVigente.aptoParaCalculoEnFechaBase).toBe(true) // precondición del propio fixture real

    const { smlv, vigenciaSmlv } = construirEntradasAjusteLegalRPM(smlvVigente)

    const resultado = ajustarMesadaLegalRPM({
      resultadoMatematico: 1_243_210, // caso Oscar
      ibl: 2_000_000,
      desgloseTasa: {
        tasaInicial: 65,
        bloquesAdicionales: 0,
        incrementoPorSemanas: 0,
        tasaFinalAplicada: 65,
        limiteOchentaPorcientoAplicado: false,
      },
      smlv,
      vigenciaSmlv,
      elegibilidad: { estado: ESTADOS_ELEGIBILIDAD_RPM.CUMPLE },
      fechaBaseMonetaria: '2026-02-11',
      fechaReconocimientoProyectada: '2033-04-12',
      referenciasNormativas: REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM,
    })

    expect(resultado.razon?.codigo).not.toBe('ENTRADA_INVALIDA')
    expect(resultado.pisoEvaluado.evaluable).toBe(true)
    expect(resultado.pisoEvaluado.aplica).toBe(true)
    expect(resultado.resultadoFinalAjustado).toBe(smlvVigente.valor)
  })

  it('SMLV vigente con litigio real (hoy, 2026-09-07), elegibilidad CUMPLE: la advertencia viaja sin bloquear el ajuste', () => {
    const smlvVigente = resolverSmlvVigenteRPM('2026-09-07')
    expect(smlvVigente.aptoParaCalculoEnFechaBase).toBe(true)
    expect(smlvVigente.advertencia?.codigo).toBe('LITIGIO_DE_FONDO_PENDIENTE') // precondición del fixture real

    const { smlv, vigenciaSmlv } = construirEntradasAjusteLegalRPM(smlvVigente)

    const resultado = ajustarMesadaLegalRPM({
      resultadoMatematico: 5_000_000,
      ibl: 6_000_000,
      desgloseTasa: {
        tasaInicial: 70,
        bloquesAdicionales: 0,
        incrementoPorSemanas: 0,
        tasaFinalAplicada: 70,
        limiteOchentaPorcientoAplicado: false,
      },
      smlv,
      vigenciaSmlv,
      elegibilidad: { estado: ESTADOS_ELEGIBILIDAD_RPM.CUMPLE },
      fechaBaseMonetaria: '2026-09-07',
      fechaReconocimientoProyectada: '2033-04-12',
      referenciasNormativas: REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM,
    })

    expect(resultado.razon?.codigo).not.toBe('ENTRADA_INVALIDA')
    expect(resultado.pisoEvaluado.evaluable).toBe(true)
    expect(resultado.supuestos.some((s) => s.codigo === 'LITIGIO_DE_FONDO_PENDIENTE')).toBe(true)
  })
})
