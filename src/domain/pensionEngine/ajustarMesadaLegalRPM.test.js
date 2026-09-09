import { describe, it, expect } from 'vitest'
import { ajustarMesadaLegalRPM } from './ajustarMesadaLegalRPM.js'
import { REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM } from '../../data/legal/referenciasNormativasAjusteLegalRPM.js'
import { ESTADOS_ELEGIBILIDAD_RPM } from './evaluarElegibilidadProyectadaRPM.js'
import { evaluarVigenciaSmlv, obtenerSmlv } from '../../data/legal/index.js'

const FECHA_BASE = '2026-09-07'
const FECHA_MARZO_2026 = '2026-03-01' // dentro de la ventana real de suspensión del Decreto 1469/2025
const FECHA_FEB_12_2026 = '2026-02-12' // expedición del auto de suspensión — fundamento no verificado
const FECHA_FEB_18_2026 = '2026-02-18' // último día antes de la publicación real del Decreto 0159/2026
const FECHA_RECONOCIMIENTO = '2033-04-12'
const SMLV_2026 = 1750905

// smlv trimmed — ajustarMesadaLegalRPM ya no lee estadoJuridico/listoParaProduccion.
const smlv = {
  valor: SMLV_2026,
  id: 'smlv-2026',
  fuente: 'Decreto del Gobierno Nacional (Ministerio del Trabajo)',
  articulo: 'Decreto 1469 de 2025 — cadena de tres fundamentos sucesivos durante 2026',
}

// --- Cadena normativa real del SMLMV 2026 (ver vigente-2026.json, entrada smlv-2026):
// mismo valor ($1.750.905) durante todo 2026, bajo tres fundamentos sucesivos.
const smlvResueltoConCadenaReal = {
  ...smlv,
  vigenciaDesde: '2026-01-01',
  vigenciaHasta: null,
  estadoEvaluadoAl: '2026-09-07',
  litigioPendiente: true,
  medidaCautelarActiva: false,
  cadenaNormativa: [
    { desde: '2026-01-01', hasta: '2026-02-11', fuente: smlv.fuente, articulo: 'Decreto 1469/2025 en plena vigencia.', litigioPendiente: false, medidaCautelarActiva: false },
    { desde: '2026-02-12', hasta: '2026-07-16', fuente: smlv.fuente, articulo: 'Decreto 1469/2025 suspendido; valor sostenido por el Decreto 0159/2026 (no suspendido).', litigioPendiente: true, medidaCautelarActiva: false },
    { desde: '2026-07-17', hasta: null, fuente: smlv.fuente, articulo: 'Decreto 1469/2025 reactivado (Consejo de Estado, 17-jul-2026).', litigioPendiente: true, medidaCautelarActiva: false },
  ],
}

// --- vigenciaSmlv: construidos con evaluarVigenciaSmlv real (data/legal/index.js) —
// prueba el modelo de vigencia real, no fixtures inventados a mano.
const vigenciaHoyConLitigioSinCautelar = evaluarVigenciaSmlv(smlvResueltoConCadenaReal, FECHA_BASE)
const vigenciaMarzo2026RealViaDecreto159 = evaluarVigenciaSmlv(smlvResueltoConCadenaReal, FECHA_MARZO_2026)
const vigenciaFirmeSinLitigio = evaluarVigenciaSmlv({ ...smlvResueltoConCadenaReal, cadenaNormativa: [], litigioPendiente: false }, FECHA_BASE)
const vigenciaFueraDeVigencia = evaluarVigenciaSmlv(smlvResueltoConCadenaReal, '2025-06-01')
const vigenciaFuenteInsuficiente = evaluarVigenciaSmlv({ valor: SMLV_2026 }, FECHA_BASE)

// Caso GENÉRICO explícito (no el caso real de 2026): una regla hipotética con medida
// cautelar activa y SIN norma sustituta que sostenga el valor — a diferencia del caso real
// de marzo de 2026 (donde el Decreto 0159/2026 sí sostenía el mismo valor), aquí no hay
// ningún tramo alternativo. Ver el caso histórico real más abajo para el 2026 verdadero.
const smlvGenericoSinSustituto = {
  valor: 999_999,
  id: 'smlv-generico-test',
  fuente: 'Norma hipotética de prueba',
  articulo: 'Norma hipotética de prueba, sin cadena normativa ni norma sustituta',
  vigenciaDesde: '2020-01-01',
  vigenciaHasta: null,
  litigioPendiente: true,
  medidaCautelarActiva: true, // suspendida, y sin cadenaNormativa que la sustituya
  cadenaNormativa: [],
}
const vigenciaGenericaSuspendidaSinSustituto = evaluarVigenciaSmlv(smlvGenericoSinSustituto, '2020-06-01')

const desgloseSinIncremento = {
  tasaInicial: 65,
  bloquesAdicionales: 0,
  incrementoPorSemanas: 0,
  tasaFinalAplicada: 65,
  limiteOchentaPorcientoAplicado: false,
}

const desgloseConLimiteOchenta = {
  tasaInicial: 65,
  bloquesAdicionales: 20,
  incrementoPorSemanas: 30,
  tasaFinalAplicada: 80,
  limiteOchentaPorcientoAplicado: true,
}

const elegibleCumple = { estado: ESTADOS_ELEGIBILIDAD_RPM.CUMPLE }
const noCumpleSemanas = { estado: ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_SEMANAS }
const noCumpleEdad = { estado: ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_EDAD }
const noCumpleNinguno = { estado: ESTADOS_ELEGIBILIDAD_RPM.NO_CUMPLE_NINGUNO }
const elegibilidadNoEvaluable = { estado: ESTADOS_ELEGIBILIDAD_RPM.NO_EVALUABLE }

function entradaBase(overrides = {}) {
  return {
    resultadoMatematico: 5_000_000,
    ibl: 7_000_000,
    desgloseTasa: desgloseSinIncremento,
    smlv,
    vigenciaSmlv: vigenciaHoyConLitigioSinCautelar,
    elegibilidad: elegibleCumple,
    fechaBaseMonetaria: FECHA_BASE,
    fechaReconocimientoProyectada: FECHA_RECONOCIMIENTO,
    referenciasNormativas: REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM,
    ...overrides,
  }
}

describe('ajustarMesadaLegalRPM — piso y techo', () => {
  it('resultado inferior a 1 SMLMV + elegible → sube exactamente a 1 SMLMV', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000 }))
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
    expect(r.pisoEvaluado.evaluable).toBe(true)
    expect(r.pisoEvaluado.aplica).toBe(true)
    expect(r.techoEvaluado.aplica).toBe(false)
    expect(r.razon).toBeNull()
  })

  it('resultado igual a 1 SMLMV → no registra ajuste', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: SMLV_2026 }))
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
    expect(r.pisoEvaluado.aplica).toBe(false)
    expect(r.techoEvaluado.aplica).toBe(false)
  })

  it('resultado superior al piso e inferior al techo → no cambia', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 5_000_000 }))
    expect(r.resultadoFinalAjustado).toBe(5_000_000)
    expect(r.pisoEvaluado.aplica).toBe(false)
    expect(r.techoEvaluado.aplica).toBe(false)
  })

  it('resultado igual a 25 SMLMV → no cambia', () => {
    const valor25SMLMV = 25 * SMLV_2026
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: valor25SMLMV }))
    expect(r.resultadoFinalAjustado).toBe(valor25SMLMV)
    expect(r.techoEvaluado.aplica).toBe(false)
  })

  it('resultado superior a 25 SMLMV → baja exactamente a 25 SMLMV', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 50_000_000 }))
    expect(r.resultadoFinalAjustado).toBe(25 * SMLV_2026)
    expect(r.techoEvaluado.aplica).toBe(true)
    expect(r.pisoEvaluado.aplica).toBe(false)
  })

  it('caso equivalente al de Oscar: $1.243.210 con SMLMV $1.750.905, elegible → sube exactamente al SMLMV, con advertencia de litigio pendiente', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_243_210 }))
    expect(r.resultadoMatematico).toBe(1_243_210)
    expect(r.resultadoFinalAjustado).toBe(1_750_905)
    expect(r.pisoEvaluado.aplica).toBe(true)
    expect(r.supuestos.some((s) => s.codigo === 'LITIGIO_DE_FONDO_PENDIENTE')).toBe(true)
    expect(r.razon).toBeNull()
  })
})

describe('ajustarMesadaLegalRPM — modelo de vigencia (cadena normativa, no solo estado más reciente)', () => {
  it('SMLMV vigente y sin litigio → aplica normalmente, sin advertencia', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: vigenciaFirmeSinLitigio }))
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
    expect(r.razon).toBeNull()
    expect(r.supuestos.some((s) => s.codigo === 'LITIGIO_DE_FONDO_PENDIENTE')).toBe(false)
  })

  it('SMLMV vigente con litigio pendiente y sin medida cautelar (hoy, 2026-09-07) → aplica y advierte, no bloquea', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: vigenciaHoyConLitigioSinCautelar }))
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
    expect(r.razon).toBeNull()
    expect(r.supuestos.find((s) => s.codigo === 'LITIGIO_DE_FONDO_PENDIENTE')).toBeDefined()
  })

  it('CASO HISTÓRICO REAL — marzo de 2026 (dentro de la ventana de suspensión del Decreto 1469/2025): el valor sí es apto porque el Decreto 0159/2026 lo sostenía; no aplica retroactivamente el "sin suspensión" de hoy, resuelve el fundamento correcto por fecha', () => {
    expect(vigenciaMarzo2026RealViaDecreto159.tipoVigencia).toBe('vigente_con_litigio')
    expect(vigenciaMarzo2026RealViaDecreto159.aptoParaCalculoEnFechaBase).toBe(true)
    expect(vigenciaMarzo2026RealViaDecreto159.fundamentoNormativoAplicable.articulo).toContain('Decreto 0159/2026')
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, fechaBaseMonetaria: FECHA_MARZO_2026, vigenciaSmlv: vigenciaMarzo2026RealViaDecreto159 }))
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
    expect(r.razon).toBeNull()
  })

  it('CASO HISTÓRICO REAL — 12 de febrero de 2026 (fecha de expedición del auto de suspensión, efecto no confirmado con fuente oficial primaria): conserva resultadoMatematico, NO genera resultadoFinalAjustado, propaga FUNDAMENTO_NORMATIVO_NO_VERIFICADO — nunca confundido con suspensión activa (MEDIDA_CAUTELAR_ACTIVA), falta de fuente general (FUENTE_INSUFICIENTE) ni falta de elegibilidad', () => {
    const vigenciaFeb12Real = evaluarVigenciaSmlv(obtenerSmlv(FECHA_FEB_12_2026), FECHA_FEB_12_2026)
    expect(vigenciaFeb12Real.tipoVigencia).toBe('fundamento_no_verificado')
    expect(vigenciaFeb12Real.aptoParaCalculoEnFechaBase).toBe(false)

    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_243_210, fechaBaseMonetaria: FECHA_FEB_12_2026, vigenciaSmlv: vigenciaFeb12Real }))
    expect(r.resultadoMatematico).toBe(1_243_210)
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.pisoEvaluado.aplica).toBeNull()
    expect(r.techoEvaluado.aplica).toBeNull()
    expect(r.razon.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    expect(r.razon.codigo).not.toBe('MEDIDA_CAUTELAR_ACTIVA')
    expect(r.razon.codigo).not.toBe('FUENTE_INSUFICIENTE')
    expect(r.razon.codigo).not.toBe('NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.razon.codigo).not.toBe('ELEGIBILIDAD_NO_EVALUABLE')
  })

  it('CASO HISTÓRICO REAL — 18 de febrero de 2026 (último día de la ventana de fundamento no verificado, previo a la publicación real del Decreto 0159/2026): mismo comportamiento que el 12 de febrero', () => {
    const vigenciaFeb18Real = evaluarVigenciaSmlv(obtenerSmlv(FECHA_FEB_18_2026), FECHA_FEB_18_2026)
    expect(vigenciaFeb18Real.tipoVigencia).toBe('fundamento_no_verificado')
    expect(vigenciaFeb18Real.aptoParaCalculoEnFechaBase).toBe(false)

    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_243_210, fechaBaseMonetaria: FECHA_FEB_18_2026, vigenciaSmlv: vigenciaFeb18Real }))
    expect(r.resultadoMatematico).toBe(1_243_210)
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
  })

  it('CASO GENÉRICO (hipotético, no el caso real de 2026) — medida cautelar activa y SIN norma sustituta → no aplica', () => {
    expect(vigenciaGenericaSuspendidaSinSustituto.tipoVigencia).toBe('suspendido')
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: vigenciaGenericaSuspendidaSinSustituto }))
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('MEDIDA_CAUTELAR_ACTIVA')
    expect(r.pisoEvaluado.evaluable).toBe(false)
  })

  it('SMLMV derogado o fuera de vigencia para la fecha base → no aplica', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: vigenciaFueraDeVigencia }))
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('FUERA_DE_VIGENCIA')
  })

  it('fuente insuficiente → no aplica', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: vigenciaFuenteInsuficiente }))
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('FUENTE_INSUFICIENTE')
  })

  it('vigenciaSmlv.aptoParaCalculoEnFechaBase=false sin advertencia explícita (fallback de razón cuando no la trae)', () => {
    const r = ajustarMesadaLegalRPM(
      entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: { aptoParaCalculoEnFechaBase: false, tipoVigencia: 'suspendido' } })
    )
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('SMLV_NO_APTO_PARA_CALCULO')
  })
})

describe('ajustarMesadaLegalRPM — contrato de elegibilidad (tres ramas: cumple / no cumple / no evaluable)', () => {
  it('A. CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO → continúa hacia piso/techo, produce ajuste', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: elegibleCumple }))
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
    expect(r.razon).toBeNull()
  })

  it('B. NO_CUMPLE_SEMANAS → incumplimiento confirmado, código NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: noCumpleSemanas }))
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.pisoEvaluado.razonNoEvaluable).toBe('NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('B. NO_CUMPLE_EDAD → mismo código canónico de incumplimiento', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: noCumpleEdad }))
    expect(r.razon.codigo).toBe('NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('B. NO_CUMPLE_NINGUNO → mismo código canónico de incumplimiento', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: noCumpleNinguno }))
    expect(r.razon.codigo).toBe('NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('C. NO_EVALUABLE → código DISTINTO (ELEGIBILIDAD_NO_EVALUABLE), nunca confundido con incumplimiento', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: elegibilidadNoEvaluable }))
    expect(r.resultadoFinalAjustado).toBeNull()
    expect(r.razon.codigo).toBe('ELEGIBILIDAD_NO_EVALUABLE')
    expect(r.razon.codigo).not.toBe('NO_CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
    expect(r.pisoEvaluado.razonNoEvaluable).toBe('ELEGIBILIDAD_NO_EVALUABLE')
  })

  it('C. NO_EVALUABLE → conserva resultadoMatematico', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_243_210, elegibilidad: elegibilidadNoEvaluable }))
    expect(r.resultadoMatematico).toBe(1_243_210)
    expect(r.resultadoFinalAjustado).toBeNull()
  })

  it('estado desconocido (string no perteneciente a ESTADOS_ELEGIBILIDAD_RPM) → ENTRADA_INVALIDA, nunca NO_CUMPLE ni NO_EVALUABLE', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: { estado: 'ES_PENSIONADO_DEFINITIVO' } }))
    expect(r.razon.codigo).toBe('ENTRADA_INVALIDA')
    expect(r.razon.detalle.campo).toBe('elegibilidad')
    expect(r.resultadoFinalAjustado).toBeNull()
  })

  it('nunca usa texto libre de UI: elegibilidad.estado debe ser exactamente un valor canónico', () => {
    expect(ESTADOS_ELEGIBILIDAD_RPM.CUMPLE).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })
})

describe('ajustarMesadaLegalRPM — validación de entrada (detención segura, sin throw)', () => {
  it('resultadoMatematico NaN', () => {
    expect(() => ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: NaN }))).not.toThrow()
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: NaN }))
    expect(r.razon.codigo).toBe('ENTRADA_INVALIDA')
    expect(r.razon.detalle.campo).toBe('resultadoMatematico')
  })

  it('resultadoMatematico negativo', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: -100 })).razon.codigo).toBe('ENTRADA_INVALIDA')
  })

  it('ibl ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ ibl: undefined })).razon.detalle.campo).toBe('ibl')
  })

  it('ibl negativo', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ ibl: -1 })).razon.codigo).toBe('ENTRADA_INVALIDA')
  })

  it('desgloseTasa ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ desgloseTasa: null })).razon.detalle.campo).toBe('desgloseTasa')
  })

  it('desgloseTasa incompleto', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ desgloseTasa: { tasaInicial: 65 } })).razon.codigo).toBe('ENTRADA_INVALIDA')
  })

  it('smlv ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ smlv: null })).razon.detalle.campo).toBe('smlv')
  })

  it('smlv.valor no numérico', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ smlv: { ...smlv, valor: 'no-numero' } })).razon.codigo).toBe('ENTRADA_INVALIDA')
  })

  it('vigenciaSmlv ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ vigenciaSmlv: null })).razon.detalle.campo).toBe('vigenciaSmlv')
  })

  it('vigenciaSmlv sin aptoParaCalculoEnFechaBase booleano', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ vigenciaSmlv: { tipoVigencia: 'firme' } })).razon.codigo).toBe('ENTRADA_INVALIDA')
  })

  it('elegibilidad ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ elegibilidad: null })).razon.detalle.campo).toBe('elegibilidad')
  })

  it('fechaBaseMonetaria inválida', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ fechaBaseMonetaria: 'no-es-fecha' })).razon.detalle.campo).toBe('fechaBaseMonetaria')
  })

  it('fechaReconocimientoProyectada ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ fechaReconocimientoProyectada: undefined })).razon.detalle.campo).toBe('fechaReconocimientoProyectada')
  })

  it('referenciasNormativas ausente', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ referenciasNormativas: null })).razon.detalle.campo).toBe('referenciasNormativas')
  })

  it('referenciasNormativas incompleta (falta techo)', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ referenciasNormativas: { piso: REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM.piso } }))
    expect(r.razon.codigo).toBe('ENTRADA_INVALIDA')
  })

  it('llamada sin ningún argumento no lanza', () => {
    expect(() => ajustarMesadaLegalRPM()).not.toThrow()
    expect(ajustarMesadaLegalRPM().razon.codigo).toBe('ENTRADA_INVALIDA')
  })
})

describe('ajustarMesadaLegalRPM — resultadoMatematico nunca se sobrescribe', () => {
  it('se preserva cuando el ajuste sí se aplica', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000 }))
    expect(r.resultadoMatematico).toBe(1_000_000)
    expect(r.resultadoFinalAjustado).not.toBe(r.resultadoMatematico)
  })

  it('se preserva cuando no cumple', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: noCumpleSemanas })).resultadoMatematico).toBe(1_000_000)
  })

  it('se preserva cuando no es evaluable', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, elegibilidad: elegibilidadNoEvaluable })).resultadoMatematico).toBe(1_000_000)
  })

  it('se preserva cuando el SMLV no está apto (suspensión genérica sin sustituto)', () => {
    expect(ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, vigenciaSmlv: vigenciaGenericaSuspendidaSinSustituto })).resultadoMatematico).toBe(1_000_000)
  })

  it('se preserva junto con el desglose de tasa cuando otro campo de entrada es inválido', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, fechaBaseMonetaria: 'invalida' }))
    expect(r.resultadoMatematico).toBe(1_000_000)
    expect(r.tasaFinalAplicada).toBe(desgloseSinIncremento.tasaFinalAplicada)
  })
})

describe('ajustarMesadaLegalRPM — unidades y trazabilidad', () => {
  it('unidad SMLMV y pesos de hoy son aritméticamente consistentes', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000 }))
    expect(r.resultadoFinalEnSMLMV * smlv.valor).toBeCloseTo(r.resultadoFinalAjustado, 6)
    expect(r.resultadoMatematicoEnSMLMV * smlv.valor).toBeCloseTo(r.resultadoMatematico, 6)
    expect(r.pisoEvaluado.valorPesosDeHoy).toBe(r.pisoEvaluado.valorSMLMV * smlv.valor)
    expect(r.techoEvaluado.valorPesosDeHoy).toBe(r.techoEvaluado.valorSMLMV * smlv.valor)
  })

  it('el límite del 80% no vuelve a aplicarse en esta capa (se echoa tal cual)', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 1_000_000, desgloseTasa: desgloseConLimiteOchenta }))
    expect(r.tasaFinalAplicada).toBe(80)
    expect(r.limiteOchentaPorciento).toEqual({ aplicado: true, tasaMaxima: 80 })
    expect(r.resultadoFinalAjustado).toBe(SMLV_2026)
  })

  it('trazabilidad normativa presente para cada ajuste evaluado, tomada de la fuente única en data/legal', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ resultadoMatematico: 50_000_000 }))
    const campos = r.trazabilidadNormativa.map((t) => t.campo)
    expect(campos).toContain('smlv')
    expect(campos).toContain('pisoEvaluado')
    expect(campos).toContain('techoEvaluado')
    expect(r.trazabilidadNormativa.find((t) => t.campo === 'pisoEvaluado').fuente).toBe(REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM.piso.fuente)
    expect(r.trazabilidadNormativa.find((t) => t.campo === 'techoEvaluado').fuente).toBe(REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM.techo.fuente)
  })

  it('sin ajuste evaluable (no cumple), la trazabilidad conserva al menos el smlv', () => {
    const r = ajustarMesadaLegalRPM(entradaBase({ elegibilidad: noCumpleSemanas }))
    expect(r.trazabilidadNormativa.map((t) => t.campo)).toEqual(['smlv'])
  })

  it('la convención de pesos de hoy queda declarada explícitamente en supuestos', () => {
    const r = ajustarMesadaLegalRPM(entradaBase())
    expect(r.supuestos.some((s) => s.codigo === 'PISO_TECHO_EN_PESOS_DE_HOY_SIN_PRONOSTICO_SMLMV_FUTURO')).toBe(true)
  })
})
