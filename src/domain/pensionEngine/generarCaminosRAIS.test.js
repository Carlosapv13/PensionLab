import { describe, it, expect } from 'vitest'
import { generarCaminosRAIS } from './generarCaminosRAIS.js'
import { calcularProyeccionRAIS } from './calcularProyeccionRAIS.js'

const FECHA = '2026-08-06'
const TASA_COTIZACION = 0.16 // misma fracción que resuelve obtenerTasaCotizacion para 2026
const TOPE_EN_PESOS = 25 * 1750905 // 25 SMLV, smlv 2026 (mismo valor ya usado en otros tests del proyecto)

const PERFIL_BASE = {
  regimenActual: 'RAIS',
  tipoCotizante: 'independiente',
  lugarCotizacion: 'colombia',
  trasladoRegimen: 'no',
  fechaNacimiento: '1976-08-06', // edadActual = 50 en FECHA
  edadJubilacionDeseada: 62,
  ibcAplicableSimulacion: 4000000,
  saldoAcumulado: 80000000,
  objetivoValorMensual: 1600000,
  fecha: FECHA,
}

describe('generarCaminosRAIS — perfil fuera de alcance (§1 del diseño aprobado)', () => {
  it('regimenActual distinto de RAIS', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, regimenActual: 'RPM' })
    expect(r.escenarios).toEqual([])
    expect(r.orientacion.codigo).toBe('PERFIL_NO_EVALUABLE')
    expect(r.orientacion.caminoMasAlineadoId).toBeNull()
  })

  it('tipoCotizante distinto de independiente (empleado)', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, tipoCotizante: 'empleado' })
    expect(r.orientacion.codigo).toBe('PERFIL_NO_EVALUABLE')
  })

  it('lugarCotizacion distinto de colombia', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, lugarCotizacion: 'exterior' })
    expect(r.orientacion.codigo).toBe('PERFIL_NO_EVALUABLE')
  })

  it('trasladoRegimen distinto de no', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, trasladoRegimen: 'si' })
    expect(r.orientacion.codigo).toBe('PERFIL_NO_EVALUABLE')
  })
})

describe('generarCaminosRAIS — datos incompletos', () => {
  it('sin IBC apto', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, ibcAplicableSimulacion: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })

  it('sin saldo acumulado', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, saldoAcumulado: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })

  it('sin objetivo declarado', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, objetivoValorMensual: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })

  it('sin edad de jubilación deseada', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, edadJubilacionDeseada: null })
    expect(r.orientacion.codigo).toBe('DATOS_INCOMPLETOS')
  })
})

describe('generarCaminosRAIS — objetivo ya cumplido con el camino base', () => {
  it('solo genera el camino base, sin inventar un alternativo, con esfuerzo y costo en cero', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, objetivoValorMensual: 100000 })

    expect(r.escenarios).toHaveLength(1)
    expect(r.escenarios[0].tipo).toBe('base')
    expect(r.escenarios[0].esfuerzo.aumentoIBC).toBe(0)
    expect(r.escenarios[0].esfuerzo.costoPensionalAdicionalMensual).toBe(0)
    expect(r.escenarios[0].distanciaObjetivo.cumple).toBe(true)
    expect(r.escenarios[0].distanciaObjetivo.delta).toBeLessThanOrEqual(0)
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    expect(r.orientacion.caminoMasAlineadoId).toBe('base')
  })
})

describe('generarCaminosRAIS — objetivo no cumplido, alternativo viable', () => {
  const r = generarCaminosRAIS(PERFIL_BASE)

  it('genera camino base y camino alternativo, en ese orden', () => {
    expect(r.escenarios).toHaveLength(2)
    expect(r.escenarios[0].tipo).toBe('base')
    expect(r.escenarios[1].tipo).toBe('alternativo')
  })

  it('el camino base no cumple (delta > 0)', () => {
    expect(r.escenarios[0].distanciaObjetivo.delta).toBeGreaterThan(0)
    expect(r.escenarios[0].distanciaObjetivo.cumple).toBe(false)
  })

  it('el camino alternativo es viable, requiere un aumento de IBC positivo y cumple el objetivo', () => {
    const alt = r.escenarios[1]
    expect(alt.estado).toBe('viable')
    expect(alt.esfuerzo.aumentoIBC).toBeGreaterThan(0)
    expect(alt.distanciaObjetivo.delta).toBeLessThanOrEqual(0.01)
    expect(alt.distanciaObjetivo.cumple).toBe(true)
  })

  it('ida y vuelta: el IBC propuesto, ejecutado de nuevo, reproduce el mismo resultado', () => {
    const alt = r.escenarios[1]
    const verificacion = calcularProyeccionRAIS({
      regimenActual: 'RAIS',
      fechaNacimiento: PERFIL_BASE.fechaNacimiento,
      edadJubilacionDeseada: PERFIL_BASE.edadJubilacionDeseada,
      ibcAplicableSimulacion: alt.esfuerzo.ibcPropuesto,
      capitalInicial: PERFIL_BASE.saldoAcumulado,
      fecha: FECHA,
    })
    expect(verificacion.pensionMensualProyectada).toBeCloseTo(alt.resultado.valor, 6)
  })

  it('orientación: el alternativo (único que cumple) es el más alineado', () => {
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    expect(r.orientacion.caminoMasAlineadoId).toBe('aumentar-ibc')
  })

  it('el camino base incluye una proyección temporal informativa, nunca un tercer camino', () => {
    expect(r.escenarios).toHaveLength(2)
    expect(r.escenarios[0].proyeccionTemporal).not.toBeNull()
  })

  it('cada escenario declara sus limitaciones (nunca una cifra sin advertencia)', () => {
    for (const e of r.escenarios) {
      expect(e.limitaciones.length).toBeGreaterThan(0)
      expect(e.limitaciones.map((l) => l.codigo)).toContain('ANUALIZACION_SIMPLIFICADA')
    }
  })
})

describe('generarCaminosRAIS — semántica de esfuerzo (IBC vs. costo pensional real)', () => {
  it('el contrato de esfuerzo separa ibcActual/ibcPropuesto/aumentoIBC de aporteMensualPension*/costoPensionalAdicionalMensual', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.esfuerzo).toHaveProperty('ibcActual')
    expect(alt.esfuerzo).toHaveProperty('ibcPropuesto')
    expect(alt.esfuerzo).toHaveProperty('aumentoIBC')
    expect(alt.esfuerzo).toHaveProperty('aporteMensualPensionActual')
    expect(alt.esfuerzo).toHaveProperty('aporteMensualPensionPropuesto')
    expect(alt.esfuerzo).toHaveProperty('costoPensionalAdicionalMensual')
  })

  it('costoPensionalAdicionalMensual = aumentoIBC × tasaCotizacion (16%) — nunca igual a aumentoIBC', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.esfuerzo.costoPensionalAdicionalMensual).toBeCloseTo(alt.esfuerzo.aumentoIBC * TASA_COTIZACION, 6)
    expect(alt.esfuerzo.costoPensionalAdicionalMensual).toBeLessThan(alt.esfuerzo.aumentoIBC)
  })

  it('aporteMensualPensionActual/Propuesto se derivan directamente de ibcActual/ibcPropuesto', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.esfuerzo.aporteMensualPensionActual).toBeCloseTo(alt.esfuerzo.ibcActual * TASA_COTIZACION, 6)
    expect(alt.esfuerzo.aporteMensualPensionPropuesto).toBeCloseTo(alt.esfuerzo.ibcPropuesto * TASA_COTIZACION, 6)
  })

  it('el camino alternativo declara COSTO_SOLO_PENSIONAL — el esfuerzo mostrado no cubre seguridad social total', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')
    expect(alt.limitaciones.map((l) => l.codigo)).toContain('COSTO_SOLO_PENSIONAL')
  })

  it('el camino base NO declara COSTO_SOLO_PENSIONAL (no propone ningún aumento)', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const base = r.escenarios.find((e) => e.tipo === 'base')
    expect(base.limitaciones.map((l) => l.codigo)).not.toContain('COSTO_SOLO_PENSIONAL')
  })
})

describe('generarCaminosRAIS — SALDO_TRATADO_COMO_ACTUAL', () => {
  it('aparece en todos los escenarios cuando el saldo declarado entra al cálculo (> 0)', () => {
    const r = generarCaminosRAIS(PERFIL_BASE) // saldoAcumulado: 80000000
    for (const e of r.escenarios) {
      expect(e.limitaciones.map((l) => l.codigo)).toContain('SALDO_TRATADO_COMO_ACTUAL')
    }
  })

  it('no aparece cuando el saldo declarado es 0 (nada que un desfase de fecha pueda distorsionar)', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, saldoAcumulado: 0 })
    for (const e of r.escenarios) {
      expect(e.limitaciones.map((l) => l.codigo)).not.toContain('SALDO_TRATADO_COMO_ACTUAL')
    }
  })
})

describe('generarCaminosRAIS — alternativo descartado por tope legal (estado real, no inventado)', () => {
  it('si el IBC actual ya está en el tope, no ofrece aumentar: lo declara descartado', () => {
    const r = generarCaminosRAIS({
      ...PERFIL_BASE,
      ibcAplicableSimulacion: TOPE_EN_PESOS,
      objetivoValorMensual: 50000000, // deliberadamente inalcanzable, para forzar la rama alternativa
    })

    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')
    expect(alt.estado).toBe('descartado')
    expect(alt.razonDescartado.codigo).toBe('YA_EN_TOPE_LEGAL')
    expect(alt.resultado).toBeNull()
  })

  it('el tope legal prevalece incluso con una restricción económica del usuario mucho más holgada', () => {
    const r = generarCaminosRAIS({
      ...PERFIL_BASE,
      ibcAplicableSimulacion: TOPE_EN_PESOS,
      objetivoValorMensual: 50000000,
      restriccionCostoPensionalAdicionalMaximoMensual: 1000000000, // no debería importar: ya no hay margen legal
    })
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')
    expect(alt.estado).toBe('descartado')
    expect(alt.razonDescartado.codigo).toBe('YA_EN_TOPE_LEGAL')
  })

  it('el tope legal limita el IBC propuesto incluso cuando la restricción del usuario permitiría más', () => {
    const r = generarCaminosRAIS({
      ...PERFIL_BASE,
      objetivoValorMensual: 50000000, // exige un IBC muy por encima del tope
      restriccionCostoPensionalAdicionalMaximoMensual: 1000000000, // no vinculante
    })
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')
    expect(alt.estado).toBe('viable')
    expect(alt.esfuerzo.ibcPropuesto).toBeCloseTo(TOPE_EN_PESOS, 2)
  })
})

describe('generarCaminosRAIS — restricción económica declarada por el usuario (semántica corregida)', () => {
  it('un límite de $500.000 pensionales NO limita el aumento de IBC a $500.000 — permite hasta 500.000/0.16 = 3.125.000', () => {
    // Bajo la semántica anterior (buggy), la restricción habría capado el
    // aumento de IBC directamente en 500.000, insuficiente para cumplir este
    // objetivo (ya verificado sin restricción en el describe anterior). Con
    // la semántica corregida, el mismo límite económico permite hasta
    // 500.000 / 0.16 = 3.125.000 de aumento de IBC — de sobra para cumplir.
    const sinRestriccion = generarCaminosRAIS(PERFIL_BASE)
    const altSinRestriccion = sinRestriccion.escenarios.find((e) => e.tipo === 'alternativo')
    // Precondición del caso de prueba: el aumento de IBC realmente necesario
    // para este objetivo debe superar 500.000 (si no, la prueba no probaría
    // nada) y debe estar por debajo del máximo permitido por la restricción.
    expect(altSinRestriccion.esfuerzo.aumentoIBC).toBeGreaterThan(500000)
    expect(altSinRestriccion.esfuerzo.aumentoIBC).toBeLessThan(500000 / TASA_COTIZACION)

    const r = generarCaminosRAIS({ ...PERFIL_BASE, restriccionCostoPensionalAdicionalMaximoMensual: 500000 })
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.esfuerzo.aumentoIBC).toBeGreaterThan(500000)
    expect(alt.distanciaObjetivo.cumple).toBe(true)
  })

  it('el costo pensional adicional del camino ofrecido nunca supera la restricción declarada', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, restriccionCostoPensionalAdicionalMaximoMensual: 50000 })
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')
    expect(alt.esfuerzo.costoPensionalAdicionalMensual).toBeLessThanOrEqual(50000 + 1e-6)
  })

  it('con un límite bajo, el alternativo queda viable pero no alcanza el objetivo — nunca se descarta por esto', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, restriccionCostoPensionalAdicionalMaximoMensual: 50000 })
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.estado).toBe('viable')
    expect(alt.distanciaObjetivo.cumple).toBe(false)
  })

  it('aun sin cumplir, el alternativo limitado se acerca más al objetivo que el base', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, restriccionCostoPensionalAdicionalMaximoMensual: 50000 })
    const base = r.escenarios.find((e) => e.tipo === 'base')
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.distanciaObjetivo.delta).toBeLessThan(base.distanciaObjetivo.delta)
    expect(r.orientacion.codigo).toBe('NINGUNO_CUMPLE_MAS_CERCANO')
  })

  it('sin restricción declarada (null/omitida), el aumento de IBC solo queda acotado por el tope legal y el objetivo', () => {
    const conRestriccion = generarCaminosRAIS({ ...PERFIL_BASE, restriccionCostoPensionalAdicionalMaximoMensual: null })
    const sinCampo = generarCaminosRAIS(PERFIL_BASE)
    const altA = conRestriccion.escenarios.find((e) => e.tipo === 'alternativo')
    const altB = sinCampo.escenarios.find((e) => e.tipo === 'alternativo')
    expect(altA.esfuerzo.ibcPropuesto).toBeCloseTo(altB.esfuerzo.ibcPropuesto, 6)
  })
})

describe('generarCaminosRAIS — Convención Económica v1 (RAIS en términos reales)', () => {
  it('PROYECCION_EN_TERMINOS_REALES aparece en TODOS los escenarios viables (base y alternativo)', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    expect(r.escenarios.length).toBeGreaterThan(0)
    for (const e of r.escenarios.filter((e) => e.estado === 'viable')) {
      expect(e.limitaciones.map((l) => l.codigo)).toContain('PROYECCION_EN_TERMINOS_REALES')
    }
  })

  it('PROYECCION_EN_TERMINOS_REALES aparece incluso cuando solo existe el camino base (objetivo ya cumplido)', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, objetivoValorMensual: 100000 })
    expect(r.escenarios).toHaveLength(1)
    expect(r.escenarios[0].limitaciones.map((l) => l.codigo)).toContain('PROYECCION_EN_TERMINOS_REALES')
  })

  it('TOPE_IBC_CON_SMMLV_VIGENTE es específica del camino alternativo — el base nunca la declara', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const base = r.escenarios.find((e) => e.tipo === 'base')
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    expect(alt.limitaciones.map((l) => l.codigo)).toContain('TOPE_IBC_CON_SMMLV_VIGENTE')
    expect(base.limitaciones.map((l) => l.codigo)).not.toContain('TOPE_IBC_CON_SMMLV_VIGENTE')
  })

  it('TOPE_IBC_CON_SMMLV_VIGENTE no aparece cuando no existe camino alternativo (objetivo ya cumplido)', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, objetivoValorMensual: 100000 })
    expect(r.escenarios[0].limitaciones.map((l) => l.codigo)).not.toContain('TOPE_IBC_CON_SMMLV_VIGENTE')
  })

  it('el camino alternativo descartado por tope legal también declara que el tope usa el SMMLV vigente, no uno proyectado', () => {
    const r = generarCaminosRAIS({
      ...PERFIL_BASE,
      ibcAplicableSimulacion: TOPE_EN_PESOS,
      objetivoValorMensual: 50000000,
    })
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')
    expect(alt.estado).toBe('descartado')
    expect(alt.razonDescartado.mensaje).toMatch(/SMMLV vigente en la fecha de esta simulación/)
    expect(alt.razonDescartado.mensaje).toMatch(/no proyectamos el SMMLV futuro/)
  })

  it('no cambia ningún resultado numérico existente — solo se agregan limitaciones declarativas', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    const base = r.escenarios.find((e) => e.tipo === 'base')
    const alt = r.escenarios.find((e) => e.tipo === 'alternativo')

    // Mismos valores que ya cubren los describe anteriores de este archivo —
    // repetidos aquí para dejar explícito que la Convención Económica v1 no
    // tocó ni un solo número.
    expect(base.distanciaObjetivo.delta).toBeGreaterThan(0)
    expect(alt.distanciaObjetivo.cumple).toBe(true)
    expect(alt.esfuerzo.costoPensionalAdicionalMensual).toBeCloseTo(alt.esfuerzo.aumentoIBC * TASA_COTIZACION, 6)
  })
})

describe('generarCaminosRAIS — semántica de delta (Ajuste 2 aprobado)', () => {
  it('delta = valorObjetivo - resultado.valor; positivo cuando falta, y cumple exactamente cuando delta <= 0', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    for (const e of r.escenarios) {
      if (e.estado !== 'viable') continue
      const deltaEsperado = e.distanciaObjetivo.valorObjetivo - e.resultado.valor
      expect(e.distanciaObjetivo.delta).toBeCloseTo(deltaEsperado, 6)
      expect(e.distanciaObjetivo.cumple).toBe(e.distanciaObjetivo.delta <= 0)
    }
  })

  it('la orientación sigue funcionando correctamente tras la corrección de esfuerzo (caso objetivo cumplido)', () => {
    const r = generarCaminosRAIS({ ...PERFIL_BASE, objetivoValorMensual: 100000 })
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    expect(r.orientacion.caminoMasAlineadoId).toBe('base')
  })

  it('la orientación sigue funcionando correctamente tras la corrección de esfuerzo (caso alternativo cumple)', () => {
    const r = generarCaminosRAIS(PERFIL_BASE)
    expect(r.orientacion.codigo).toBe('UNICO_CUMPLE')
    expect(r.orientacion.caminoMasAlineadoId).toBe('aumentar-ibc')
  })
})
