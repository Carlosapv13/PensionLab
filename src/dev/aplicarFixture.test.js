import { describe, it, expect, vi } from 'vitest'
import { validarFixture, aplicarFixture } from './aplicarFixture.js'
import { CLAVES_ESTADO_EDITABLE, VALORES_POR_DEFECTO, VISTAS_CONOCIDAS } from './estadoApp.js'
import { FIXTURES } from './fixtures.js'

const FIXTURE_RAIS_EMPLEADO = FIXTURES.find((f) => f.id === 'rais-empleado-colombia')
const FIXTURE_RAIS_INDEPENDIENTE = FIXTURES.find((f) => f.id === 'rais-independiente-colombia')
const FIXTURE_QA_RPM_OBJETIVO_7M = FIXTURES.find((f) => f.id === 'qa-rpm-objetivo-7m')

describe('validarFixture — claves reconocidas', () => {
  it('el fixture aprobado (RAIS empleado) es válido para su vista sugerida', () => {
    const r = validarFixture(FIXTURE_RAIS_EMPLEADO, FIXTURE_RAIS_EMPLEADO.vistaSugerida)
    expect(r.valido).toBe(true)
    expect(r.errores).toEqual([])
  })

  it('el fixture aprobado (RAIS independiente, perfil soportado) es válido para su vista sugerida', () => {
    const r = validarFixture(FIXTURE_RAIS_INDEPENDIENTE, FIXTURE_RAIS_INDEPENDIENTE.vistaSugerida)
    expect(r.valido).toBe(true)
    expect(r.errores).toEqual([])
  })

  // Cobertura nueva (2026-08-27, caso QA RPM objetivo 7M): ningún fixture con
  // vistaSugerida: 'proyectaTuPensionRPM' tenía hasta ahora un test explícito confirmando que
  // realmente satisface CAMPOS_MINIMOS_POR_VISTA para esa vista — los dos fixtures RPM
  // previos que ya apuntaban ahí ('rpm-empleado-proyecta-tu-pension' y su variante
  // sin-margen) nunca se probaron contra validarFixture, solo se confiaba en probarlos a
  // mano. Este test cierra ese hueco real de cobertura, no solo para este fixture.
  it('el fixture aprobado (QA RPM objetivo 7M) es válido para su vista sugerida', () => {
    const r = validarFixture(FIXTURE_QA_RPM_OBJETIVO_7M, FIXTURE_QA_RPM_OBJETIVO_7M.vistaSugerida)
    expect(r.valido).toBe(true)
    expect(r.errores).toEqual([])
  })

  it('rechaza un fixture con una clave desconocida', () => {
    const fixtureInvalido = { ...FIXTURE_RAIS_EMPLEADO, datos: { ...FIXTURE_RAIS_EMPLEADO.datos, claveInventada: 'x' } }
    const r = validarFixture(fixtureInvalido, 'declaracionLibre')
    expect(r.valido).toBe(false)
    expect(r.errores.some((e) => e.includes('claveInventada'))).toBe(true)
  })
})

describe('validarFixture — campos mínimos según la vista destino', () => {
  it('rechaza un fixture sin regimenActual cuando el destino es declaracionLibre', () => {
    const resto = Object.fromEntries(
      Object.entries(FIXTURE_RAIS_EMPLEADO.datos).filter(([clave]) => clave !== 'regimenActual')
    )
    const fixtureIncompleto = { ...FIXTURE_RAIS_EMPLEADO, datos: resto }
    const r = validarFixture(fixtureIncompleto, 'declaracionLibre')
    expect(r.valido).toBe(false)
    expect(r.errores.some((e) => e.includes('regimenActual'))).toBe(true)
  })

  it('una vista sin campos mínimos catalogados no exige nada adicional', () => {
    const r = validarFixture({ id: 'x', nombre: 'x', vistaSugerida: 'bienvenida', datos: {} }, 'bienvenida')
    expect(r.valido).toBe(true)
  })

  // exploraTuProyeccion: los mínimos existen específicamente para garantizar
  // que un fixture apuntado ahí llegue a la generación de caminos
  // (generarCaminosRAIS.js), no solo a que la pantalla "tenga sentido".
  it.each([
    'regimenActual',
    'tipoCotizante',
    'lugarCotizacion',
    'trasladoRegimen',
    'fechaNacimiento',
    'edadJubilacionDeseada',
    'certezaBaseCotizacion',
    'valorBaseCotizacionDeclarado',
    'certezaSaldoAcumulado',
    'saldoAcumuladoDeclarado',
    'objetivoPensionMensual',
  ])('rechaza un fixture para exploraTuProyeccion sin %s', (claveFaltante) => {
    const resto = Object.fromEntries(
      Object.entries(FIXTURE_RAIS_INDEPENDIENTE.datos).filter(([clave]) => clave !== claveFaltante)
    )
    const fixtureIncompleto = { ...FIXTURE_RAIS_INDEPENDIENTE, datos: resto }
    const r = validarFixture(fixtureIncompleto, 'exploraTuProyeccion')
    expect(r.valido).toBe(false)
    expect(r.errores.some((e) => e.includes(claveFaltante))).toBe(true)
  })

  it('no exige restriccionCostoPensionalAdicionalMaximoMensual para exploraTuProyeccion (opcional en el dominio)', () => {
    const resto = Object.fromEntries(
      Object.entries(FIXTURE_RAIS_INDEPENDIENTE.datos).filter(
        ([clave]) => clave !== 'restriccionCostoPensionalAdicionalMaximoMensual'
      )
    )
    const fixtureSinRestriccion = { ...FIXTURE_RAIS_INDEPENDIENTE, datos: resto }
    const r = validarFixture(fixtureSinRestriccion, 'exploraTuProyeccion')
    expect(r.valido).toBe(true)
    expect(r.errores).toEqual([])
  })
})

// Coherencia con Objetivo.jsx/PL-250 (2026-09-01): ninguna fixture de este
// archivo representa hoy un caso excluido (B-01..B-13) — todas son
// recorridos de pensión de vejez, aunque su vistaSugerida salte directo a
// una pantalla posterior a Objetivo.jsx. Sin motivoConsulta: 'vejez'
// declarado, navegar "Volver" hasta Objetivo.jsx dejaría el motivo en null
// (su valor por defecto) — "Continuar" aparecería deshabilitado para un
// caso que en realidad sí es de vejez. Si en el futuro se agrega una
// fixture que represente un caso excluido, esta prueba deberá excluirla
// explícitamente, no eliminarse.
// Cobertura nueva (2026-09-02, fusión de ExpedientePensional.jsx en CompletarExpediente.jsx):
// ninguna fixture apuntaba a 'expedientePensional', pero nada lo garantizaba como contrato —
// esta prueba lo deja explícito y evita que una vista retirada vuelva a colarse en el futuro.
describe('Coherencia de vistaSugerida en fixtures', () => {
  it('cada fixture apunta a una vista que sigue existiendo en VISTAS_CONOCIDAS', () => {
    for (const fixture of FIXTURES) {
      expect(VISTAS_CONOCIDAS).toContain(fixture.vistaSugerida)
    }
  })

  it('ninguna fixture apunta a la vista retirada "expedientePensional"', () => {
    for (const fixture of FIXTURES) {
      expect(fixture.vistaSugerida).not.toBe('expedientePensional')
    }
  })
})

describe('Coherencia de motivoConsulta en fixtures de recorrido de vejez', () => {
  it('cada fixture declara motivoConsulta: "vejez", para que el estado no quede incoherente al volver a Objetivo.jsx', () => {
    for (const fixture of FIXTURES) {
      expect(fixture.datos.motivoConsulta).toBe('vejez')
    }
  })
})

// Parametrizado sobre FIXTURES (no solo el de empleado): ninguna aserción de
// este bloque depende de valores específicos de un fixture — se generaliza
// naturalmente a cualquier fixture presente y futuro.
describe.each(FIXTURES)('aplicarFixture — reset limpio + aplicación al estado real ($id)', (fixture) => {
  function crearSettersEspia() {
    const setters = {}
    for (const clave of CLAVES_ESTADO_EDITABLE) {
      setters[clave] = vi.fn()
    }
    return setters
  }

  it('llama al setter de cada clave del fixture con el valor especificado', () => {
    const setters = crearSettersEspia()
    aplicarFixture(fixture, setters)

    for (const [clave, valor] of Object.entries(fixture.datos)) {
      expect(setters[clave]).toHaveBeenCalledWith(valor)
    }
  })

  it('llama al setter de cada clave NO especificada con su valor por defecto (reset limpio)', () => {
    const setters = crearSettersEspia()
    aplicarFixture(fixture, setters)

    const clavesOmitidas = CLAVES_ESTADO_EDITABLE.filter(
      (clave) => !Object.prototype.hasOwnProperty.call(fixture.datos, clave)
    )
    expect(clavesOmitidas.length).toBeGreaterThan(0) // el fixture aprobado no cubre todas las claves
    for (const clave of clavesOmitidas) {
      expect(setters[clave]).toHaveBeenCalledWith(VALORES_POR_DEFECTO[clave])
    }
  })

  it('llama exactamente una vez a cada setter de CLAVES_ESTADO_EDITABLE', () => {
    const setters = crearSettersEspia()
    aplicarFixture(fixture, setters)

    for (const clave of CLAVES_ESTADO_EDITABLE) {
      expect(setters[clave]).toHaveBeenCalledTimes(1)
    }
  })
})
