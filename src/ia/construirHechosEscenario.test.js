import { describe, it, expect } from 'vitest'
import { construirHechosEscenario, construirHechosGlobales, construirTodosLosHechos } from './construirHechosEscenario.js'
import { explicarCaminos } from './explicarCaminos.js'
import { crearAdaptadorSimulado } from './adaptadores/AdaptadorSimulado.js'
import { generarCaminosRPM } from '../domain/pensionEngine/generarCaminosRPM.js'
import { calcularProyeccionRPM } from '../domain/pensionEngine/calcularProyeccionRPM.js'

function escenarioFicticio(overrides = {}) {
  return {
    id: 'aumentar-ibc-futuro',
    tipo: 'alternativo',
    estado: 'viable',
    decision: 'Aumentar tu IBC futuro para alcanzar tu objetivo.',
    entradas: { edadJubilacionDeseada: 62 },
    resultado: { valor: 3500001, moneda: 'COP', periodoReferencia: 'mensual' },
    tasaReemplazo: 65.4321,
    esfuerzo: { ibcActual: 2900000, ibcPropuesto: 5345679, aumentoIBC: 2445679, costoPensionalAdicionalMensual: 391309 },
    distanciaObjetivo: { valorObjetivo: 3500000, delta: -1, cumple: true },
    ...overrides,
  }
}

describe('construirHechosEscenario', () => {
  it('formatea cada cifra con el mismo formateador que ya usa la UI (formatearPesos) — nunca un formato distinto', () => {
    const hechos = construirHechosEscenario(escenarioFicticio())
    expect(hechos.pensionProyectada).toBe('$3.500.001')
    expect(hechos.ibcActual).toBe('$2.900.000')
    expect(hechos.ibcPropuesto).toBe('$5.345.679')
    expect(hechos.aumentoIBC).toBe('$2.445.679')
    expect(hechos.costoPensionalAdicionalMensual).toBe('$391.309')
    expect(hechos.objetivoDeclarado).toBe('$3.500.000')
  })

  it('edad y tasa de reemplazo, mismo formato que ya usa ExploraTuProyeccionRPM.jsx (toFixed(2) + "%")', () => {
    const hechos = construirHechosEscenario(escenarioFicticio())
    expect(hechos.edadExploracion).toBe('62 años')
    expect(hechos.tasaReemplazo).toBe('65.43%')
  })

  it('distanciaAlObjetivo siempre es un valor absoluto (nunca negativo) — el signo se comunica con "cumple", no con el número', () => {
    const hechos = construirHechosEscenario(escenarioFicticio({ distanciaObjetivo: { valorObjetivo: 3500000, delta: -250000, cumple: true } }))
    expect(hechos.distanciaAlObjetivo).toBe('$250.000')
  })

  it('sin distanciaObjetivo (defensivo) → no agrega esas dos claves, sin lanzar', () => {
    const hechos = construirHechosEscenario(escenarioFicticio({ distanciaObjetivo: null }))
    expect(hechos.objetivoDeclarado).toBeUndefined()
    expect(hechos.distanciaAlObjetivo).toBeUndefined()
  })

  it('nunca incluye el id, tipo ni ningún código de dominio como "hecho" — esos siguen siendo texto ya aprobado, no reformateable por IA', () => {
    const hechos = construirHechosEscenario(escenarioFicticio())
    expect(Object.keys(hechos)).not.toContain('id')
    expect(Object.keys(hechos)).not.toContain('tipo')
    expect(Object.keys(hechos)).not.toContain('decision')
  })
})

describe('construirHechosGlobales', () => {
  it('diasHorizonte presente cuando resultado.horizonte existe', () => {
    const hechos = construirHechosGlobales({ horizonte: { fechaInicio: '2026-01-01', fechaFin: '2028-01-01', diasCotizados: 730 } })
    expect(hechos.diasHorizonte).toBe('730')
  })

  it('horizonteResumen usa formatearDuracionCalendario — mismo formateador ya usado en ProyectaTuPensionRPM.jsx (textoHorizonte), nunca un cálculo propio de este archivo', () => {
    const hechos = construirHechosGlobales({ horizonte: { fechaInicio: '2026-01-01', fechaFin: '2028-01-01', diasCotizados: 730 } })
    expect(hechos.horizonteResumen).toBe('2 años')
  })

  it('horizonteResumen con años y meses combinados', () => {
    const hechos = construirHechosGlobales({ horizonte: { fechaInicio: '2026-01-01', fechaFin: '2027-11-15', diasCotizados: 683 } })
    expect(hechos.horizonteResumen).toBe('1 año y 10 meses')
  })

  it('sin horizonte → objeto vacío, sin lanzar', () => {
    expect(construirHechosGlobales({ horizonte: null })).toEqual({})
  })
})

describe('construirTodosLosHechos', () => {
  it('agrupa por id de escenario, más un bloque global separado', () => {
    const escenarios = [escenarioFicticio({ id: 'base' }), escenarioFicticio({ id: 'aumentar-ibc-futuro' })]
    const resultado = { horizonte: { fechaInicio: '2026-01-01', fechaFin: '2028-01-01', diasCotizados: 730 } }
    const { porEscenario, global } = construirTodosLosHechos(escenarios, resultado)
    expect(Object.keys(porEscenario)).toEqual(['base', 'aumentar-ibc-futuro'])
    expect(global.diasHorizonte).toBe('730')
  })

  it('EVIDENCIA (integración, decisión de producto 2026-08-23): el camino personalizado ("esfuerzo-adicional-deseado") de generarCaminosRPM.js se procesa con exactamente el mismo código genérico — sin ningún caso especial por id', async () => {
    const historiaLarga = Array.from({ length: 36 }, (_, i) => {
      const anio = 1990 + i
      return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc: 1000000 + anio, diasCotizados: 365 }
    })
    const base = calcularProyeccionRPM({
      historiaCotizacion: historiaLarga,
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64,
      escenarioIbcFuturo: { valor: 2000000, origen: 'continuidad_ibc_actual' },
      fecha: '2026-01-01',
    })

    const resultado = generarCaminosRPM({
      regimenActual: 'RPM',
      sexo: 'Hombre',
      historiaCotizacion: historiaLarga,
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64,
      ibcAplicableSimulacion: 2000000,
      objetivoValorMensual: base.pensionMensualProyectada * 1.5,
      esfuerzoAdicionalMensualDeseado: 200000,
      fecha: '2026-01-01',
    })

    const personalizado = resultado.escenarios.find((e) => e.id === 'esfuerzo-adicional-deseado')
    expect(personalizado).toBeDefined() // confirma que el fixture de este test sí ejercita el camino nuevo

    // construirTodosLosHechos no conoce ningún id específico — procesa 'base',
    // 'aumentar-ibc-futuro' y 'esfuerzo-adicional-deseado' de forma idéntica.
    const { porEscenario } = construirTodosLosHechos(resultado.escenarios.filter((e) => e.estado === 'viable'), resultado)
    expect(porEscenario['esfuerzo-adicional-deseado'].costoPensionalAdicionalMensual).toBeDefined()
    expect(porEscenario['esfuerzo-adicional-deseado'].pensionProyectada).toBeDefined()

    // explicarCaminos.js (el orquestador completo de S4-007) también lo incluye sin
    // ningún ajuste — el adaptador simulado recibe los tres escenarios viables, incluido
    // el personalizado, con la misma forma exacta que los otros dos.
    const adaptadorEspiado = crearAdaptadorSimulado((entrada) => ({
      explicaciones: entrada.escenarios.map((e) => ({
        escenarioId: e.id,
        queCambia: null,
        preguntaSugerida: null,
      })),
      comparacion: null,
    }))
    const salida = await explicarCaminos({ resultado, contexto: {}, adaptador: adaptadorEspiado })
    expect(salida.estado).toBe('generado')
    expect(salida.explicaciones.map((e) => e.escenarioId)).toContain('esfuerzo-adicional-deseado')
  })
})
