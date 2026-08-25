import { describe, it, expect } from 'vitest'
import { crearAdaptadorExplicacionDesarrollo } from './adaptadorExplicacionDesarrollo.js'
import { esExplicacionConsistente } from '../ia/validarConsistenciaExplicacion.js'

const HECHOS = {
  porEscenario: {
    base: {
      pensionProyectada: '$3.100.000',
      ibcActual: '$2.900.000',
      ibcPropuesto: '$2.900.000',
      edadExploracion: '65 años',
      objetivoDeclarado: '$3.500.000',
      distanciaAlObjetivo: '$400.000',
      costoPensionalAdicionalMensual: '$0',
    },
    'aumentar-ibc-futuro': {
      pensionProyectada: '$3.500.001',
      ibcActual: '$2.900.000',
      ibcPropuesto: '$5.345.679',
      edadExploracion: '65 años',
      objetivoDeclarado: '$3.500.000',
      distanciaAlObjetivo: '$1',
      costoPensionalAdicionalMensual: '$391.309',
    },
    'esfuerzo-adicional-deseado': {
      pensionProyectada: '$2.731.318',
      ibcActual: '$2.900.000',
      ibcPropuesto: '$4.150.000',
      edadExploracion: '65 años',
      objetivoDeclarado: '$3.500.000',
      distanciaAlObjetivo: '$768.682',
      costoPensionalAdicionalMensual: '$200.000',
    },
  },
  global: { diasHorizonte: '6018', horizonteResumen: '16 años y 5 meses' },
}
const ESCENARIOS_2 = [
  { id: 'base', decision: 'Mantener tu aporte actual.', tipo: 'base', cumpleObjetivo: false },
  { id: 'aumentar-ibc-futuro', decision: 'Aumentar tu aporte.', tipo: 'alternativo', cumpleObjetivo: true },
]
const ESCENARIOS_3 = [
  ...ESCENARIOS_2,
  { id: 'esfuerzo-adicional-deseado', decision: 'Con el esfuerzo mensual que elegiste.', tipo: 'alternativo', cumpleObjetivo: false },
]

describe('adaptadorExplicacionDesarrollo — revisión visual de S4-007, contrato compactado (2026-08-24)', () => {
  const adaptador = crearAdaptadorExplicacionDesarrollo()

  it('genera una explicación por escenario, con tokens que resuelven contra los hechos reales', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_2, hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(resultado.explicaciones).toHaveLength(2)
    expect(resultado.comparacion).not.toBeNull()
  })

  it('cada explicación solo trae los dos campos vigentes del contrato compactado — nunca queRepresenta ni porQueAlcanzaONo', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_2, hechos: HECHOS, contexto: { declaracionLibre: null } })
    for (const explicacion of resultado.explicaciones) {
      expect(Object.keys(explicacion).sort()).toEqual(['escenarioId', 'preguntaSugerida', 'queCambia'])
    }
  })

  it('EVIDENCIA: la salida pasa la misma validación de consistencia que se aplicaría a una respuesta real del modelo (2 caminos)', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_2, hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(esExplicacionConsistente(resultado, HECHOS, ESCENARIOS_2.map((e) => e.id))).toBe(true)
  })

  it('EVIDENCIA: la salida pasa la misma validación de consistencia con 3 caminos', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_3, hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(esExplicacionConsistente(resultado, HECHOS, ESCENARIOS_3.map((e) => e.id))).toBe(true)
  })

  it('EVIDENCIA de sostenibilidad: el camino con esfuerzo relaciona el costo mensual con horizonteResumen (tiempo que hay que sostenerlo), no solo el monto', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_2, hechos: HECHOS, contexto: { declaracionLibre: null } })
    const explicacionAlternativo = resultado.explicaciones.find((e) => e.escenarioId === 'aumentar-ibc-futuro')
    expect(explicacionAlternativo.queCambia).toContain('{{aumentar-ibc-futuro:costoPensionalAdicionalMensual}}')
    expect(explicacionAlternativo.queCambia).toContain('{{global:horizonteResumen}}')
    expect(explicacionAlternativo.preguntaSugerida).toContain('{{global:horizonteResumen}}')
  })

  it('el camino personalizado nunca sugiere "explorar un punto intermedio" sobre sí mismo (ya lo está viendo)', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_3, hechos: HECHOS, contexto: { declaracionLibre: null } })
    const explicacionPersonalizado = resultado.explicaciones.find((e) => e.escenarioId === 'esfuerzo-adicional-deseado')
    expect(explicacionPersonalizado.preguntaSugerida).not.toMatch(/punto intermedio/)
  })

  it('un camino distinto del personalizado (aumentar-ibc-futuro) sí puede sugerir explorar un punto intermedio', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_3, hechos: HECHOS, contexto: { declaracionLibre: null } })
    const explicacionAlternativo = resultado.explicaciones.find((e) => e.escenarioId === 'aumentar-ibc-futuro')
    expect(explicacionAlternativo.preguntaSugerida).toMatch(/punto intermedio/)
  })

  it('cumpleObjetivo null (defensivo) → preguntaSugerida (rama sin esfuerzo) queda null, nunca adivina una dirección', async () => {
    const escenarioSinSenal = [{ id: 'base', decision: 'x', tipo: 'base', cumpleObjetivo: null }]
    const resultado = await adaptador({ escenarios: escenarioSinSenal, hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(resultado.explicaciones[0].preguntaSugerida).toBeNull()
  })

  it('costoPensionalAdicionalMensual "$0" (camino base, sin esfuerzo) → queCambia queda null (nada que sostener)', async () => {
    const resultado = await adaptador({ escenarios: [ESCENARIOS_2[0]], hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(resultado.explicaciones[0].queCambia).toBeNull()
  })

  it('un solo escenario → comparacion queda null (nada que comparar)', async () => {
    const resultado = await adaptador({ escenarios: [ESCENARIOS_2[0]], hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(resultado.comparacion).toBeNull()
  })

  it('EVIDENCIA (2 caminos): la comparación conecta el esfuerzo del alternativo con la sostenibilidad (horizonteResumen) y con si alcanza el objetivo', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_2, hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(resultado.comparacion).toContain('{{aumentar-ibc-futuro:costoPensionalAdicionalMensual}}')
    expect(resultado.comparacion).toContain('{{global:horizonteResumen}}')
    expect(resultado.comparacion).toMatch(/sí alcanza tu objetivo/)
  })

  it('DEFECTO CORREGIDO — EVIDENCIA (3 caminos, base + esfuerzo-adicional-deseado + aumentar-ibc-futuro): ninguno de los dos caminos con esfuerzo queda ignorado en la comparación', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_3, hechos: HECHOS, contexto: { declaracionLibre: null } })
    // Antes del arreglo, construirComparacion tomaba solo conEsfuerzo[0] y el segundo
    // camino con esfuerzo (el personalizado) desaparecía en silencio de la comparación.
    expect(resultado.comparacion).toContain('{{aumentar-ibc-futuro:costoPensionalAdicionalMensual}}')
    expect(resultado.comparacion).toContain('{{esfuerzo-adicional-deseado:costoPensionalAdicionalMensual}}')
  })

  it('EVIDENCIA (3 caminos): la comparación distingue cuál camino con esfuerzo alcanza el objetivo y cuál no, sin inventar la dirección', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_3, hechos: HECHOS, contexto: { declaracionLibre: null } })
    expect(resultado.comparacion).toMatch(/sí alcanza tu objetivo/) // aumentar-ibc-futuro, cumpleObjetivo: true
    expect(resultado.comparacion).toMatch(/no alcanza tu objetivo/) // esfuerzo-adicional-deseado, cumpleObjetivo: false
  })

  it('generaliza: funciona igual con ids de escenario distintos, sin ningún texto hardcodeado a un fixture específico, y con más de dos caminos con esfuerzo', async () => {
    const escenariosOtroCaso = [
      { id: 'continuidad', decision: 'Seguir igual.', tipo: 'base', cumpleObjetivo: false },
      { id: 'subir-aporte', decision: 'Subir el aporte.', tipo: 'alternativo', cumpleObjetivo: false },
      { id: 'subir-aporte-mas', decision: 'Subir más el aporte.', tipo: 'alternativo', cumpleObjetivo: true },
    ]
    const hechosOtroCaso = {
      porEscenario: {
        continuidad: { pensionProyectada: '$5.000.000', objetivoDeclarado: '$8.000.000', distanciaAlObjetivo: '$3.000.000', costoPensionalAdicionalMensual: '$0' },
        'subir-aporte': { pensionProyectada: '$6.000.000', objetivoDeclarado: '$8.000.000', distanciaAlObjetivo: '$2.000.000', costoPensionalAdicionalMensual: '$200.000' },
        'subir-aporte-mas': { pensionProyectada: '$8.500.000', objetivoDeclarado: '$8.000.000', distanciaAlObjetivo: '$1', costoPensionalAdicionalMensual: '$500.000' },
      },
      global: { diasHorizonte: '365', horizonteResumen: '1 año' },
    }
    const resultado = await adaptador({ escenarios: escenariosOtroCaso, hechos: hechosOtroCaso, contexto: { declaracionLibre: null } })
    const ids = escenariosOtroCaso.map((e) => e.id)
    expect(esExplicacionConsistente(resultado, hechosOtroCaso, ids)).toBe(true)
    expect(resultado.comparacion).toContain('{{subir-aporte:costoPensionalAdicionalMensual}}')
    expect(resultado.comparacion).toContain('{{subir-aporte-mas:costoPensionalAdicionalMensual}}')
  })

  it('disparador "[forzar error]" en declaracionLibre → estado error_proveedor / TIMEOUT, mismo mecanismo que S4-006', async () => {
    const resultado = await adaptador({ escenarios: ESCENARIOS_2, hechos: HECHOS, contexto: { declaracionLibre: 'algo [forzar error]' } })
    expect(resultado.estado).toBe('error_proveedor')
    expect(resultado.errorCodigo).toBe('TIMEOUT')
  })
})
