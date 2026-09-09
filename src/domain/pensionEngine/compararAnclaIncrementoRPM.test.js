import { describe, it, expect } from 'vitest'
import { compararAnclaIncrementoRPM, CODIGO_ANCLA_FIJA_1300, CODIGO_ANCLA_MINIMO_DINAMICO } from './compararAnclaIncrementoRPM.js'
import { obtenerSmlv, obtenerSemanasMinimas, obtenerParametrosTasaReemplazoRPM, evaluarVigenciaSmlv } from '../../data/legal/index.js'

// La entrada `smlv-2026` de vigente-2026.json no tiene `vigencia.hasta` (rige sin límite
// superior desde 2026-01-01) — por eso el mismo valor sirve para cualquier fecha >= 2026 en
// estas pruebas. `ibl = SMLV_2026` da s=1 en todos los casos evaluables (tasaInicial=65%
// antes de cualquier bloque adicional), mismo truco que ya usa formulaRPM.test.js con
// smlv=1 — aquí no podemos fijar smlv=1 porque compararAnclaIncrementoRPM ya no acepta
// parámetros legales externos: lo resuelve internamente vía obtenerSmlv(fecha).
const SMLV_2026 = obtenerSmlv('2026-06-15').valor

function comparar(overrides = {}) {
  return compararAnclaIncrementoRPM({ ibl: SMLV_2026, ...overrides })
}

describe('compararAnclaIncrementoRPM — hombres (invariante: ambas interpretaciones siempre coinciden)', () => {
  const casos = [
    { fecha: '2026-06-15', semanasCotizadas: 1300 },
    { fecha: '2026-06-15', semanasCotizadas: 1350 },
    { fecha: '2026-06-15', semanasCotizadas: 1400 },
  ]

  for (const c of casos) {
    it(`hombre ${c.fecha}, ${c.semanasCotizadas} semanas — principal y alternativa idénticas`, () => {
      const r = comparar({ ...c, sexo: 'Hombre' })
      expect(r.evaluable).toBe(true)
      expect(r.interpretacionPrincipal.semanasBaseIncremento).toBe(1300)
      expect(r.interpretacionAlternativa.semanasBaseIncremento).toBe(1300)
      expect(r.interpretacionPrincipal.tasaFinalAplicada).toBe(r.interpretacionAlternativa.tasaFinalAplicada)
      expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(r.interpretacionAlternativa.bloquesAdicionales)
      expect(r.diferencia.existeDiferencia).toBe(false)
      expect(r.incertidumbreJuridica.existe).toBe(false)
    })
  }

  it('hombre 1300 semanas: tasa base 65%, sin bloques', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Hombre', semanasCotizadas: 1300 })
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBe(65)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
  })

  it('hombre 1350 semanas: 1 bloque, 66.5%', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Hombre', semanasCotizadas: 1350 })
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(1)
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBeCloseTo(66.5, 10)
  })

  it('hombre 1400 semanas: 2 bloques, 68%', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Hombre', semanasCotizadas: 1400 })
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(2)
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBeCloseTo(68, 10)
  })

  it('hombre en 2036 (fecha muy posterior): ambas interpretaciones también coinciden (el ancla de hombre no tiene cronograma)', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Hombre', semanasCotizadas: 1400 })
    expect(r.interpretacionPrincipal.semanasBaseIncremento).toBe(1300)
    expect(r.interpretacionAlternativa.semanasBaseIncremento).toBe(1300)
    expect(r.diferencia.existeDiferencia).toBe(false)
  })
})

describe('compararAnclaIncrementoRPM — antes de 2026 (hombres y mujeres)', () => {
  // Invariante legal de fondo: antes de 2026 (previo al cronograma de C-197/2023), el mínimo
  // aplicable de la mujer coincide con el del hombre (1.300, sin cronograma) — verificado
  // directamente contra la fuente legal, sin depender de que exista SMLV cargado para esa
  // fecha (ver nota siguiente).
  it('invariante legal: el mínimo aplicable de mujer y hombre coincide antes de 2026 (fuente compartida por ambas interpretaciones)', () => {
    const minimoMujer = obtenerSemanasMinimas('2025-06-15', 'F', 'RPM')
    const minimoHombre = obtenerSemanasMinimas('2025-06-15', 'M', 'RPM')
    expect(minimoMujer.valor).toBe(1300)
    expect(minimoHombre.valor).toBe(1300)
  })

  // vigente-2026.json solo carga una entrada de SMLV vigente desde 2026-01-01 (sin tope
  // superior) — no hay SMLV cargado para fechas anteriores a 2026, porque ningún consumidor
  // existente de data/legal lo necesitaba hasta ahora. compararAnclaIncrementoRPM resuelve
  // el SMLV internamente (ver cierre de diseño, segunda ronda) porque desglosarTasaReemplazoRPM
  // lo necesita para AMBAS interpretaciones (tasaInicial = 65.5 − 0.5·(ibl/smlv)) — sin SMLV
  // no hay ningún resultado que comparar, para ningún sexo. La prueba real y honesta no es
  // "produce tasas iguales" (no hay tasas, no evaluable) sino "falla de forma segura y
  // SIMÉTRICA para ambos sexos" — ninguna asimetría por sexo se cuela ni siquiera en este
  // caso límite de datos insuficientes.
  it('fecha 2025 (antes de la vigencia del SMLV cargado): no evaluable de forma idéntica para hombre y mujer, nunca por causas distintas', () => {
    const rHombre = comparar({ fecha: '2025-06-15', sexo: 'Hombre', semanasCotizadas: 1300 })
    const rMujer = comparar({ fecha: '2025-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(rHombre.evaluable).toBe(false)
    expect(rMujer.evaluable).toBe(false)
    expect(rHombre.razon.codigo).toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    expect(rMujer.razon.codigo).toBe('FUENTE_LEGAL_NO_ENCONTRADA')
  })
})

describe('compararAnclaIncrementoRPM — mujeres desde 2026 (pueden diferir)', () => {
  it('1249 semanas: no alcanza el mínimo aplicable (1250) — no evaluable, no fabrica incremento', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1249 })
    expect(r.evaluable).toBe(false)
    expect(r.interpretacionPrincipal).toBeNull()
    expect(r.interpretacionAlternativa).toBeNull()
    expect(r.razon.codigo).toBe('SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE')
    expect(r.minimoAplicable.valor).toBe(1250)
    expect(r.semanasFaltantesParaMinimo).toBe(1)
    // Datos de entrada conservados, aunque no evaluable.
    expect(r.fecha).toBe('2026-06-15')
    expect(r.sexo).toBe('Mujer')
    expect(r.semanasCotizadas).toBe(1249)
  })

  it('1250 semanas: elegible, ambas interpretaciones sin bloques (excedente 0)', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1250 })
    expect(r.evaluable).toBe(true)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(0)
    expect(r.diferencia.existeDiferencia).toBe(false)
    // La ambigüedad estructural existe (anclas distintas: 1300 vs 1250) aunque el
    // resultado numérico coincida para este caso concreto.
    expect(r.incertidumbreJuridica.existe).toBe(true)
  })

  it('1299 semanas: excedente insuficiente para un bloque en ninguna de las dos anclas — coinciden numéricamente, pero las anclas usadas son distintas', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1299 })
    expect(r.interpretacionPrincipal.semanasBaseIncremento).toBe(1300)
    expect(r.interpretacionAlternativa.semanasBaseIncremento).toBe(1250)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(0)
    expect(r.diferencia.existeDiferencia).toBe(false)
    expect(r.incertidumbreJuridica.existe).toBe(true)
  })

  it('1300 semanas: la principal no da ningún bloque, la alternativa sí da 1 — caso central de la controversia', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.interpretacionPrincipal.codigo).toBe(CODIGO_ANCLA_FIJA_1300)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBe(65)
    expect(r.interpretacionAlternativa.codigo).toBe(CODIGO_ANCLA_MINIMO_DINAMICO)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(1)
    expect(r.interpretacionAlternativa.tasaFinalAplicada).toBeCloseTo(66.5, 10)
    expect(r.diferencia.existeDiferencia).toBe(true)
    expect(r.diferencia.puntosPorcentuales).toBeCloseTo(1.5, 10)
    expect(r.incertidumbreJuridica.existe).toBe(true)
  })

  it('1350 semanas: principal 1 bloque, alternativa 2 bloques', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1350 })
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(1)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(2)
    expect(r.diferencia.puntosPorcentuales).toBeCloseTo(1.5, 10)
  })
})

describe('compararAnclaIncrementoRPM — mujer 2027 (mínimo aplicable 1225)', () => {
  it('1224 semanas: no evaluable', () => {
    const r = comparar({ fecha: '2027-06-15', sexo: 'Mujer', semanasCotizadas: 1224 })
    expect(r.evaluable).toBe(false)
    expect(r.minimoAplicable.valor).toBe(1225)
  })

  it('1225 semanas: elegible, ambas sin bloques', () => {
    const r = comparar({ fecha: '2027-06-15', sexo: 'Mujer', semanasCotizadas: 1225 })
    expect(r.evaluable).toBe(true)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(0)
  })

  it('1275 semanas: principal sin bloques (excedente negativo sobre 1300), alternativa 1 bloque', () => {
    const r = comparar({ fecha: '2027-06-15', sexo: 'Mujer', semanasCotizadas: 1275 })
    expect(r.interpretacionPrincipal.semanasAdicionales).toBe(0)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.semanasAdicionales).toBe(50)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(1)
  })
})

describe('compararAnclaIncrementoRPM — mujer 2036 (mínimo aplicable 1000, el caso más extremo)', () => {
  it('999 semanas: no evaluable', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 999 })
    expect(r.evaluable).toBe(false)
    expect(r.minimoAplicable.valor).toBe(1000)
  })

  it('1000 semanas: elegible, ambas sin bloques', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 1000 })
    expect(r.evaluable).toBe(true)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(0)
  })

  it('1049 semanas: ninguna interpretación completa un bloque todavía', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 1049 })
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(0)
  })

  it('1050 semanas: la alternativa ya completa 1 bloque, la principal ninguno', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 1050 })
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(1)
  })

  it('1300 semanas: caso más severo — principal 65% (0 bloques), alternativa 74% (6 bloques) — 9 puntos de diferencia', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBe(65)
    expect(r.interpretacionPrincipal.bloquesAdicionales).toBe(0)
    expect(r.interpretacionAlternativa.tasaFinalAplicada).toBeCloseTo(74, 10)
    expect(r.interpretacionAlternativa.bloquesAdicionales).toBe(6)
    expect(r.diferencia.puntosPorcentuales).toBeCloseTo(9, 10)
    expect(r.diferencia.existeDiferencia).toBe(true)
  })
})

describe('compararAnclaIncrementoRPM — vigencia del SMLV (cierre de diseño, tercera ronda: consume evaluarVigenciaSmlv, mismo contrato de E3-A)', () => {
  // Mismas seis fechas de frontera que index.test.js (E3-A) sobre la cadena normativa real
  // del SMLV 2026 — nunca fechas ni umbrales inventados para este archivo. semanas=1300 en
  // todos los casos: elegible en cualquiera de estas fechas (mínimo aplicable 1250 durante
  // todo 2026), así que lo único que puede bloquear la comparación es la vigencia del SMLV.

  it('2026-02-11 (Decreto 1469/2025, firme, sin incidencia): evaluable si los demás datos son válidos', () => {
    const r = comparar({ fecha: '2026-02-11', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(true)
    expect(r.interpretacionPrincipal).not.toBeNull()
    expect(r.interpretacionAlternativa).not.toBeNull()
  })

  it('2026-02-12 (expedición del auto de suspensión, efecto no confirmado): no evaluable, FUNDAMENTO_NORMATIVO_NO_VERIFICADO — no fabrica ninguna tasa', () => {
    const fecha = '2026-02-12'
    const r = comparar({ fecha, sexo: 'Mujer', semanasCotizadas: 1300 })
    const vigenciaEsperada = evaluarVigenciaSmlv(obtenerSmlv(fecha), fecha)

    expect(r.evaluable).toBe(false)
    expect(r.interpretacionPrincipal).toBeNull()
    expect(r.interpretacionAlternativa).toBeNull()
    expect(r.diferencia).toBeNull()
    expect(r.razon.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    // La razón es EXACTAMENTE la advertencia estructurada de E3-A — nunca un mensaje propio
    // de este archivo, nunca reinterpretada como FUENTE_LEGAL_NO_ENCONTRADA.
    expect(r.razon).toEqual(vigenciaEsperada.advertencia)
    expect(r.razon.codigo).not.toBe('FUENTE_LEGAL_NO_ENCONTRADA')
    expect(r.razon.codigo).not.toBe('MEDIDA_CAUTELAR_ACTIVA')
    expect(r.razon.codigo).not.toBe('FUERA_DE_VIGENCIA')
    expect(r.razon.codigo).not.toBe('FUENTE_INSUFICIENTE')
    // Datos de entrada conservados.
    expect(r.fecha).toBe(fecha)
    expect(r.sexo).toBe('Mujer')
    expect(r.semanasCotizadas).toBe(1300)
    expect(r.ibl).toBe(SMLV_2026)
  })

  it('2026-02-18 (último día de la ventana de fundamento no verificado): mismo comportamiento que el 12 de febrero', () => {
    const fecha = '2026-02-18'
    const r = comparar({ fecha, sexo: 'Mujer', semanasCotizadas: 1300 })
    const vigenciaEsperada = evaluarVigenciaSmlv(obtenerSmlv(fecha), fecha)

    expect(r.evaluable).toBe(false)
    expect(r.interpretacionPrincipal).toBeNull()
    expect(r.interpretacionAlternativa).toBeNull()
    expect(r.razon.codigo).toBe('FUNDAMENTO_NORMATIVO_NO_VERIFICADO')
    expect(r.razon).toEqual(vigenciaEsperada.advertencia)
    expect(r.fecha).toBe(fecha)
    expect(r.semanasCotizadas).toBe(1300)
  })

  it('2026-02-19 (Decreto 0159/2026, expedición/publicación real): evaluable', () => {
    const r = comparar({ fecha: '2026-02-19', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(true)
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBe(65)
    expect(r.interpretacionAlternativa.tasaFinalAplicada).toBeCloseTo(66.5, 10)
  })

  it('2026-07-16 (último día del Decreto 0159/2026): evaluable', () => {
    const r = comparar({ fecha: '2026-07-16', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(true)
  })

  it('2026-07-17 (Decreto 1469/2025 reactivado): evaluable', () => {
    const r = comparar({ fecha: '2026-07-17', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(true)
  })

  it('en la ventana no verificada, minimoAplicable y semanasFaltantesParaMinimo=0 se conservan (la persona SÍ cumplía semanas — lo que bloquea es el SMLV, no la elegibilidad)', () => {
    const r = comparar({ fecha: '2026-02-12', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.minimoAplicable).not.toBeNull()
    expect(r.minimoAplicable.valor).toBe(1250)
    expect(r.semanasFaltantesParaMinimo).toBe(0)
  })

  it('trazabilidadNormativa sigue presente aunque el SMLV no esté apto (se conoce la fuente del ancla, solo se bloquea el cálculo)', () => {
    const r = comparar({ fecha: '2026-02-12', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.trazabilidadNormativa.length).toBeGreaterThan(0)
  })
})

describe('compararAnclaIncrementoRPM — validación de entrada (detención segura, sin throw)', () => {
  it('sexo ausente', () => {
    expect(() => comparar({ fecha: '2026-06-15', semanasCotizadas: 1300 })).not.toThrow()
    const r = comparar({ fecha: '2026-06-15', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.codigo).toBe('ENTRADA_INVALIDA')
    expect(r.razon.detalle.campo).toBe('sexo')
  })

  it('sexo inválido (nunca se asume Hombre por defecto)', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Otro', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('sexo')
    expect(r.sexoResuelto).toBeNull()
  })

  it('fecha ausente', () => {
    const r = comparar({ sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('fecha')
  })

  it('fecha inválida', () => {
    const r = comparar({ fecha: 'no-es-fecha', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('fecha')
  })

  it('semanasCotizadas NaN', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: NaN })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('semanasCotizadas')
  })

  it('semanasCotizadas negativa', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: -1 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('semanasCotizadas')
  })

  it('semanasCotizadas ausente', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer' })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('semanasCotizadas')
  })

  it('ibl ausente o no positivo', () => {
    const r = compararAnclaIncrementoRPM({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('ibl')
  })

  it('ibl negativo', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300, ibl: -1 })
    expect(r.evaluable).toBe(false)
    expect(r.razon.detalle.campo).toBe('ibl')
  })

  it('llamada sin ningún argumento no lanza', () => {
    expect(() => compararAnclaIncrementoRPM()).not.toThrow()
    expect(compararAnclaIncrementoRPM().evaluable).toBe(false)
  })
})

// Estas propiedades adicionales SÍ pueden enviarse — JavaScript no lo impide, y esta función
// no valida su ausencia (no hay ninguna regla que las "rechace"). Lo que estas pruebas
// demuestran es más acotado y sí es una garantía real de esta función: ninguna propiedad
// externa altera las anclas ni los parámetros legales, porque ambos se resuelven siempre
// internamente (obtenerParametrosTasaReemplazoRPM(fecha)/obtenerSmlv(fecha)/
// obtenerSemanasMinimas(fecha, sexo, 'RPM')) y ningún camino de esta función lee esas
// propiedades adicionales para nada.
describe('compararAnclaIncrementoRPM — propiedades ajenas al contrato se ignoran (comportamiento de JavaScript, no una validación de esta función)', () => {
  it('un objeto parametrosLegalesBase adicional en la llamada no altera el resultado (JavaScript ignora las propiedades que la función no destructura)', () => {
    const base = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    const conExtra = compararAnclaIncrementoRPM({
      ibl: SMLV_2026,
      fecha: '2026-06-15',
      sexo: 'Mujer',
      semanasCotizadas: 1300,
      parametrosLegalesBase: { semanasBaseIncrementoRPM: 1, smlv: 1, tasaReemplazoConstante: 999 },
    })
    expect(conExtra).toEqual(base)
  })

  it('un semanasBaseIncrementoRPM en el nivel superior de la llamada tampoco altera el resultado — las anclas se resuelven internamente, no desde la entrada', () => {
    const base = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    const conExtra = compararAnclaIncrementoRPM({ ibl: SMLV_2026, fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300, semanasBaseIncrementoRPM: 1 })
    expect(conExtra).toEqual(base)
  })
})

describe('compararAnclaIncrementoRPM — límite del 80%, idéntico en ambas interpretaciones', () => {
  it('semanas muy altas: ambas interpretaciones respetan el mismo techo de 80%', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 3000 })
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBe(80)
    expect(r.interpretacionAlternativa.tasaFinalAplicada).toBe(80)
    expect(r.interpretacionPrincipal.limiteOchentaPorcientoAplicado).toBe(true)
    expect(r.interpretacionAlternativa.limiteOchentaPorcientoAplicado).toBe(true)
    expect(r.diferencia.existeDiferencia).toBe(false)
  })

  it('semanas que solo saturan el techo bajo la interpretación dinámica (ancla más baja) — la principal aún no llega', () => {
    const r = comparar({ fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 1550 })
    expect(r.interpretacionAlternativa.tasaFinalAplicada).toBe(80)
    expect(r.interpretacionAlternativa.limiteOchentaPorcientoAplicado).toBe(true)
    expect(r.interpretacionPrincipal.tasaFinalAplicada).toBeLessThan(80)
    expect(r.interpretacionPrincipal.limiteOchentaPorcientoAplicado).toBe(false)
  })
})

describe('compararAnclaIncrementoRPM — resolución legal interna (misma fecha para todo, sexo solo para el mínimo dinámico)', () => {
  it('todos los parámetros legales y la ancla fija se resuelven con la misma fecha recibida', () => {
    const fecha = '2027-06-15'
    const r = comparar({ fecha, sexo: 'Mujer', semanasCotizadas: 1400 })
    const esperado = obtenerParametrosTasaReemplazoRPM(fecha)
    expect(r.interpretacionPrincipal.semanasBaseIncremento).toBe(esperado.semanasBaseIncrementoRPM)
  })

  it('ANCLA_FIJA_1300 no depende del sexo: mismo resultado para Mujer y Hombre con los mismos demás datos', () => {
    const rMujer = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1400 })
    const rHombre = comparar({ fecha: '2026-06-15', sexo: 'Hombre', semanasCotizadas: 1400 })
    expect(rMujer.interpretacionPrincipal).toEqual(rHombre.interpretacionPrincipal)
  })

  it('una consulta para mujer resuelve el mínimo dinámico con su sexo real — nunca reporta una regla de hombre', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.sexoResuelto).toBe('F')
    expect(r.minimoAplicable.normaId).toContain('mujer')
    expect(r.minimoAplicable.normaId).not.toContain('hombre')
  })

  it('una consulta para hombre resuelve el mínimo dinámico con su sexo real', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Hombre', semanasCotizadas: 1300 })
    expect(r.sexoResuelto).toBe('M')
    expect(r.minimoAplicable.normaId).toContain('hombre')
  })
})

describe('compararAnclaIncrementoRPM — referenciaInterpretativa', () => {
  it('interpretacionPrincipal trae referenciaInterpretativa de ANCLA_FIJA_1300, Art. 34/Art. 10 Ley 797, sin afirmar postura oficial', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    const ref = r.interpretacionPrincipal.referenciaInterpretativa
    expect(ref.codigo).toBe(CODIGO_ANCLA_FIJA_1300)
    expect(ref.fuente).toMatch(/Art\. 34/)
    expect(ref.fuente).toMatch(/Ley 797 de 2003/)
    expect(ref.alcance.toLowerCase()).toContain('ancla fija')
    expect(ref.certeza.toLowerCase()).toContain('provisional')
    expect(ref.certeza.toLowerCase()).toContain('no es una postura oficial')
  })

  it('interpretacionAlternativa trae referenciaInterpretativa de ANCLA_MINIMO_DINAMICO, Art. 34 + C-197/2023, marcada como no resuelta', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    const ref = r.interpretacionAlternativa.referenciaInterpretativa
    expect(ref.codigo).toBe(CODIGO_ANCLA_MINIMO_DINAMICO)
    expect(ref.fuente).toMatch(/Art\. 34/)
    expect(ref.fuente).toMatch(/C-197 de 2023/)
    expect(ref.alcance.toLowerCase()).toContain('mínimas requeridas')
    expect(ref.certeza.toLowerCase()).toContain('no resuelta')
  })

  it('la referenciaInterpretativa está DENTRO de cada interpretación, no hay que inferirla por posición en un arreglo', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r.interpretacionPrincipal.referenciaInterpretativa.codigo).toBe(r.interpretacionPrincipal.codigo)
    expect(r.interpretacionAlternativa.referenciaInterpretativa.codigo).toBe(r.interpretacionAlternativa.codigo)
  })
})

describe('compararAnclaIncrementoRPM — invariantes estructurales', () => {
  it('interpretacionPrincipal siempre es ANCLA_FIJA_1300 (caracter base_conservadora) y interpretacionAlternativa siempre ANCLA_MINIMO_DINAMICO (caracter interpretacion_juridica_no_resuelta)', () => {
    const casos = [
      { fecha: '2026-06-15', sexo: 'Hombre', semanasCotizadas: 1300 },
      { fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 },
      { fecha: '2036-06-15', sexo: 'Mujer', semanasCotizadas: 1300 },
    ]
    for (const c of casos) {
      const r = comparar(c)
      expect(r.interpretacionPrincipal.codigo).toBe(CODIGO_ANCLA_FIJA_1300)
      expect(r.interpretacionPrincipal.caracter).toBe('base_conservadora')
      expect(r.interpretacionAlternativa.codigo).toBe(CODIGO_ANCLA_MINIMO_DINAMICO)
      expect(r.interpretacionAlternativa.caracter).toBe('interpretacion_juridica_no_resuelta')
    }
  })

  it('la interpretación dinámica nunca produce una tasa menor que la fija, en un barrido amplio de semanas y fechas dentro del cronograma vigente', () => {
    const fechas = ['2026-06-15', '2027-06-15', '2030-06-15', '2033-06-15', '2036-06-15']
    for (const fecha of fechas) {
      for (let semanas = 1000; semanas <= 2000; semanas += 25) {
        const r = comparar({ fecha, sexo: 'Mujer', semanasCotizadas: semanas })
        if (!r.evaluable) continue
        expect(r.interpretacionAlternativa.tasaFinalAplicada).toBeGreaterThanOrEqual(r.interpretacionPrincipal.tasaFinalAplicada)
      }
    }
  })

  it('nunca modifica ni conoce resultadoMatematico/resultadoFinalAjustado de E3-A — no hay integración', () => {
    const r = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(r).not.toHaveProperty('resultadoMatematico')
    expect(r).not.toHaveProperty('resultadoFinalAjustado')
  })

  it('trazabilidadNormativa siempre presente cuando hay resolución legal (evaluable o no por semanas), ausente solo en entrada inválida', () => {
    const evaluable = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(evaluable.trazabilidadNormativa.length).toBeGreaterThan(0)

    const noEvaluablePorSemanas = comparar({ fecha: '2026-06-15', sexo: 'Mujer', semanasCotizadas: 1249 })
    expect(noEvaluablePorSemanas.trazabilidadNormativa.length).toBeGreaterThan(0)

    const entradaInvalida = comparar({ fecha: 'no-es-fecha', sexo: 'Mujer', semanasCotizadas: 1300 })
    expect(entradaInvalida.trazabilidadNormativa).toEqual([])
  })
})
