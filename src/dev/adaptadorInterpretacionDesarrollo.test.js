import { describe, it, expect } from 'vitest'
import { crearAdaptadorInterpretacionDesarrollo } from './adaptadorInterpretacionDesarrollo.js'

describe('adaptadorInterpretacionDesarrollo — casos de revisión visual de S4-006', () => {
  const adaptador = crearAdaptadorInterpretacionDesarrollo()

  it('A. objetivo — "Quiero pensionarme con al menos 3.500.000 al mes."', async () => {
    const resultado = await adaptador({ texto: 'Quiero pensionarme con al menos 3.500.000 al mes.' })
    expect(resultado.estado).toBe('interpretado')
    expect(resultado.campos.objetivoPensionMensual).toEqual({ valorCOP: 3500000 })
    expect(resultado.campos.edadJubilacionDeseada).toBeNull()
  })

  it('B. objetivo + edad — "Quiero pensionarme a los 65 años con 3.500.000 al mes."', async () => {
    const resultado = await adaptador({ texto: 'Quiero pensionarme a los 65 años con 3.500.000 al mes.' })
    expect(resultado.estado).toBe('interpretado')
    expect(resultado.campos.objetivoPensionMensual).toEqual({ valorCOP: 3500000 })
    expect(resultado.campos.edadJubilacionDeseada).toEqual({ valorAnios: 65 })
  })

  it('C. restricción — "Puedo destinar 400.000 pesos adicionales a mi aporte pensional cada mes."', async () => {
    const resultado = await adaptador({
      texto: 'Puedo destinar 400.000 pesos adicionales a mi aporte pensional cada mes.',
    })
    expect(resultado.estado).toBe('interpretado')
    expect(resultado.campos.restriccionCostoPensionalAdicionalMaximoMensual).toEqual({ valorCOP: 400000 })
  })

  it('D. texto insuficiente — "No sé qué hacer con mi pensión."', async () => {
    const resultado = await adaptador({ texto: 'No sé qué hacer con mi pensión.' })
    expect(resultado.estado).toBe('insuficiente')
    expect(resultado.campos.objetivoPensionMensual).toBeNull()
    expect(resultado.campos.edadJubilacionDeseada).toBeNull()
    expect(resultado.campos.restriccionCostoPensionalAdicionalMaximoMensual).toBeNull()
  })

  it('D-bis. texto ambiguo forzado — "[forzar ambiguo]"', async () => {
    const resultado = await adaptador({ texto: 'Quiero pensionarme pronto. [forzar ambiguo]' })
    expect(resultado.estado).toBe('ambiguo')
    expect(resultado.camposAmbiguos).toEqual(['objetivoPensionMensual'])
  })

  it('F. error simulado del proveedor — "[forzar error]"', async () => {
    const resultado = await adaptador({ texto: 'Quiero pensionarme. [forzar error]' })
    expect(resultado.estado).toBe('error_proveedor')
    expect(resultado.errorCodigo).toBe('TIMEOUT')
  })
})

// Caso E (ruido/no apto) no se prueba aquí a propósito: se filtra en evaluarAptitud.js
// (ya probado, dominio) ANTES de invocar cualquier adaptador — ver
// interpretarDeclaracion.test.js, "EVIDENCIA: ruido rechazado antes de invocar cualquier
// adaptador". Este simulador nunca llega a ejecutarse para ese caso.
