// Tests de las funciones puras de presentación de ProyectaTuPensionRPM.jsx (S4-004) — sin
// mount de componente, mismo criterio ya usado por ExploraTuProyeccion.limitaciones.test.js.
//
// Objetivo explícito de este archivo: demostrar que estas funciones son exclusivamente de
// formato — nunca recalculan IBC, pensión, esfuerzo ni distancia al objetivo. Cada escenario
// simulado trae solo los campos que la función bajo prueba necesita (más algún campo
// "extra" deliberadamente distinto de lo esperado, para confirmar que no se usa en el
// texto) — nunca se construye vía generarCaminosRPM.js/calcularProyeccionRPM.js, porque el
// dominio ya está probado en otro archivo; aquí solo interesa la presentación.

import { describe, it, expect } from 'vitest'
import {
  textoEsfuerzoAdicional,
  textoIBCFuturo,
  textoDistancia,
  calcularLimitacionesComunes,
  limitacionesEspecificas,
} from './ProyectaTuPensionRPM.helpers.js'

describe('textoEsfuerzoAdicional', () => {
  it('camino base: siempre "sin cambios", incluso si esfuerzo trajera un costo (no debería ocurrir, pero confirma que ni se lee)', () => {
    const escenario = { tipo: 'base', esfuerzo: { costoPensionalAdicionalMensual: 999999 } }
    expect(textoEsfuerzoAdicional(escenario)).toBe('Sin cambios respecto a hoy.')
  })

  it('camino alternativo con costo cero: "sin cambios"', () => {
    const escenario = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 0 } }
    expect(textoEsfuerzoAdicional(escenario)).toBe('Sin cambios respecto a hoy.')
  })

  it('camino alternativo con costo negativo (caso límite): sigue siendo "sin cambios", no un número negativo', () => {
    const escenario = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: -1 } }
    expect(textoEsfuerzoAdicional(escenario)).toBe('Sin cambios respecto a hoy.')
  })

  it('camino alternativo con costo positivo: muestra exactamente ese valor formateado, ningún otro', () => {
    const escenario = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 391865 } }
    expect(textoEsfuerzoAdicional(escenario)).toBe('$391.865 adicionales al mes.')
  })

  it('dos escenarios con costos distintos producen textos que reflejan cada uno su propio valor, sin mezclarlos', () => {
    const a = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 100000 } }
    const b = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 200000 } }
    expect(textoEsfuerzoAdicional(a)).toBe('$100.000 adicionales al mes.')
    expect(textoEsfuerzoAdicional(b)).toBe('$200.000 adicionales al mes.')
  })
})

describe('textoIBCFuturo', () => {
  it('sin cambio de IBC: un solo valor, marcado "(sin cambios)"', () => {
    const escenario = { esfuerzo: { ibcActual: 2900000, ibcPropuesto: 2900000 } }
    expect(textoIBCFuturo(escenario)).toBe('$2.900.000 (sin cambios).')
  })

  it('con cambio de IBC: muestra actual → propuesto, en ese orden exacto, sin invertirlos', () => {
    const escenario = { esfuerzo: { ibcActual: 2900000, ibcPropuesto: 5345679 } }
    expect(textoIBCFuturo(escenario)).toBe('$2.900.000 → $5.345.679.')
  })

  it('no confunde ibcActual con ibcPropuesto entre dos escenarios distintos', () => {
    const a = { esfuerzo: { ibcActual: 1000000, ibcPropuesto: 1500000 } }
    const b = { esfuerzo: { ibcActual: 2000000, ibcPropuesto: 4000000 } }
    expect(textoIBCFuturo(a)).toBe('$1.000.000 → $1.500.000.')
    expect(textoIBCFuturo(b)).toBe('$2.000.000 → $4.000.000.')
  })
})

describe('textoDistancia', () => {
  it('cumple el objetivo: mensaje fijo, ignora el valor de delta (no debería usarse cuando cumple=true)', () => {
    const escenario = { distanciaObjetivo: { cumple: true, delta: -999999 } }
    expect(textoDistancia(escenario)).toBe('Alcanza tu objetivo.')
  })

  it('no cumple el objetivo: muestra exactamente el delta recibido, formateado, ningún otro número', () => {
    const escenario = { distanciaObjetivo: { cumple: false, delta: 150000 } }
    expect(textoDistancia(escenario)).toBe('No alcanza tu objetivo — le faltarían $150.000 al mes.')
  })

  it('dos escenarios con deltas distintos producen mensajes que reflejan cada uno su propio delta', () => {
    const a = { distanciaObjetivo: { cumple: false, delta: 50000 } }
    const b = { distanciaObjetivo: { cumple: false, delta: 999000 } }
    expect(textoDistancia(a)).toBe('No alcanza tu objetivo — le faltarían $50.000 al mes.')
    expect(textoDistancia(b)).toBe('No alcanza tu objetivo — le faltarían $999.000 al mes.')
  })
})

const NO_ES_PENSION_FINAL = { codigo: 'NO_ES_TU_PENSION_FINAL', mensaje: 'no es tu pensión final' }
const PARAMETROS_CONGELADOS = { codigo: 'PARAMETROS_LEGALES_CONGELADOS_A_FECHA_CALCULO', mensaje: 'parámetros congelados' }
const CONTINUIDAD_SIN_HUECOS = { codigo: 'CONTINUIDAD_FUTURA_ASUMIDA_SIN_HUECOS', mensaje: 'continuidad sin huecos' }
const RESTRICCION_LIMITA = { codigo: 'RESTRICCION_COSTO_LIMITA_RESULTADO', mensaje: 'la restricción limita el resultado' }

function escenario(limitaciones) {
  return { limitaciones }
}

describe('calcularLimitacionesComunes', () => {
  it('sin escenarios viables, no hay comunes', () => {
    expect(calcularLimitacionesComunes([])).toEqual([])
  })

  it('un solo escenario viable: todas sus limitaciones cuentan como comunes', () => {
    const unico = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS])
    expect(calcularLimitacionesComunes([unico])).toEqual([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS])
  })

  it('dos escenarios con las mismas tres limitaciones (caso real: base + alternativo, ambos vía calcularProyeccionRPM): las tres son comunes', () => {
    const base = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS, CONTINUIDAD_SIN_HUECOS])
    const alternativo = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS, CONTINUIDAD_SIN_HUECOS])
    expect(calcularLimitacionesComunes([base, alternativo])).toEqual([
      NO_ES_PENSION_FINAL,
      PARAMETROS_CONGELADOS,
      CONTINUIDAD_SIN_HUECOS,
    ])
  })

  it('una limitación presente en un solo escenario (ej. RESTRICCION_COSTO_LIMITA_RESULTADO, solo en el alternativo) NO se considera común', () => {
    const base = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS])
    const alternativo = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS, RESTRICCION_LIMITA])
    expect(calcularLimitacionesComunes([base, alternativo])).toEqual([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS])
  })

  it('no agrupa por igualdad de mensaje, solo por codigo — nunca reinterpreta el texto', () => {
    const a = escenario([{ codigo: 'X', mensaje: 'texto uno' }])
    const b = escenario([{ codigo: 'X', mensaje: 'texto uno' }])
    // Mismo codigo y mismo mensaje en ambos (el caso real: calcularProyeccionRPM.js siempre
    // empareja el mismo codigo con el mismo mensaje) — se agrupa correctamente.
    expect(calcularLimitacionesComunes([a, b])).toEqual([{ codigo: 'X', mensaje: 'texto uno' }])
  })
})

describe('limitacionesEspecificas', () => {
  it('sin limitaciones comunes, todas las del escenario son específicas', () => {
    const e = escenario([NO_ES_PENSION_FINAL])
    expect(limitacionesEspecificas(e, [])).toEqual([NO_ES_PENSION_FINAL])
  })

  it('excluye únicamente las que coinciden por codigo con las comunes, conserva el resto intacto', () => {
    const e = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS, RESTRICCION_LIMITA])
    expect(limitacionesEspecificas(e, [NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS])).toEqual([RESTRICCION_LIMITA])
  })

  it('caso real completo: base + alternativo comparten tres limitaciones, solo el alternativo conserva la suya propia', () => {
    const base = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS, CONTINUIDAD_SIN_HUECOS])
    const alternativo = escenario([NO_ES_PENSION_FINAL, PARAMETROS_CONGELADOS, CONTINUIDAD_SIN_HUECOS, RESTRICCION_LIMITA])
    const comunes = calcularLimitacionesComunes([base, alternativo])

    expect(limitacionesEspecificas(base, comunes)).toEqual([])
    expect(limitacionesEspecificas(alternativo, comunes)).toEqual([RESTRICCION_LIMITA])
  })
})
