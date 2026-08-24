import { describe, it, expect, vi } from 'vitest'
import {
  camposBorradorVacios,
  borradorDesdeResultado,
  fusionarBorrador,
  confirmarCamposInterpretados,
  numeroDesdeExpediente,
} from './DeclaracionLibre.helpers.js'

const CAMPOS_VACIOS_RESULTADO = {
  objetivoPensionMensual: null,
  restriccionCostoPensionalAdicionalMaximoMensual: null,
  edadJubilacionDeseada: null,
}

function resultadoInterpretado(camposParciales) {
  return {
    estado: 'interpretado',
    campos: { ...CAMPOS_VACIOS_RESULTADO, ...camposParciales },
    camposAmbiguos: [],
    razonCodigo: null,
  }
}

describe('borradorDesdeResultado', () => {
  it('extrae valorCOP/valorAnios de los campos presentes, null para los ausentes', () => {
    const resultado = resultadoInterpretado({ objetivoPensionMensual: { valorCOP: 3500000 } })
    expect(borradorDesdeResultado(resultado)).toEqual({
      objetivoPensionMensual: 3500000,
      restriccionCostoPensionalAdicionalMaximoMensual: null,
      edadJubilacionDeseada: null,
    })
  })
})

describe('fusionarBorrador — EVIDENCIA: una interpretación nueva nunca borra un dato ya presente en el borrador', () => {
  it('campo nuevo con valor → reemplaza al valor anterior (incluida una posible contradicción, que queda visible para revisión)', () => {
    const borradorActual = { ...camposBorradorVacios(), edadJubilacionDeseada: 65 }
    const resultadoNuevo = resultadoInterpretado({ edadJubilacionDeseada: { valorAnios: 60 } })
    expect(fusionarBorrador(borradorActual, resultadoNuevo).edadJubilacionDeseada).toBe(60)
  })

  it('campo no encontrado en la interpretación nueva (null) → conserva lo que ya había en el borrador (interpretado antes, o completado a mano)', () => {
    const borradorActual = { ...camposBorradorVacios(), edadJubilacionDeseada: 65, objetivoPensionMensual: 2000000 }
    const resultadoNuevo = resultadoInterpretado({ objetivoPensionMensual: { valorCOP: 3500000 } }) // no menciona edad
    const fusionado = fusionarBorrador(borradorActual, resultadoNuevo)
    expect(fusionado.edadJubilacionDeseada).toBe(65) // intacto
    expect(fusionado.objetivoPensionMensual).toBe(3500000) // el nuevo sí se aplica
  })

  it('interpretación vieja que llega después de una nueva: el caller es responsable de descartarla por completo (esta función no distingue orden) — se documenta la EVIDENCIA de que aplicar una fusión vieja sobre una más nueva sí la pisaría, por eso DeclaracionLibre.jsx debe filtrar por token antes de llamar a esta función', () => {
    const borradorTrasLaNueva = fusionarBorrador(camposBorradorVacios(), resultadoInterpretado({ objetivoPensionMensual: { valorCOP: 5000000 } }))
    const siFusionaraLaVieja = fusionarBorrador(borradorTrasLaNueva, resultadoInterpretado({ objetivoPensionMensual: { valorCOP: 1000000 } }))
    expect(siFusionaraLaVieja.objetivoPensionMensual).toBe(1000000) // por eso el guard de token en el componente es obligatorio, no cosmético
  })

  it('interpretación insuficiente/ambigua (los tres campos en null) → no modifica el borrador en absoluto', () => {
    const borradorActual = { objetivoPensionMensual: 3500000, restriccionCostoPensionalAdicionalMaximoMensual: null, edadJubilacionDeseada: 62 }
    const resultadoNuevo = { estado: 'ambiguo', campos: CAMPOS_VACIOS_RESULTADO, camposAmbiguos: ['objetivoPensionMensual'], razonCodigo: 'MULTIPLES_LECTURAS_POSIBLES' }
    expect(fusionarBorrador(borradorActual, resultadoNuevo)).toEqual(borradorActual)
  })
})

describe('confirmarCamposInterpretados — EVIDENCIA: confirmación humana antes de escribir en el expediente', () => {
  function settersEspiados() {
    return {
      onCambiarObjetivoPensionMensual: vi.fn(),
      onCambiarRestriccionCostoPensionalAdicionalMaximoMensual: vi.fn(),
      onCambiarEdadJubilacionDeseada: vi.fn(),
    }
  }

  it('los tres campos presentes → invoca los tres setters con cadenas de dígitos', () => {
    const setters = settersEspiados()
    confirmarCamposInterpretados(
      { objetivoPensionMensual: 3500000, restriccionCostoPensionalAdicionalMaximoMensual: 500000, edadJubilacionDeseada: 65 },
      setters
    )
    expect(setters.onCambiarObjetivoPensionMensual).toHaveBeenCalledWith('3500000')
    expect(setters.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual).toHaveBeenCalledWith('500000')
    expect(setters.onCambiarEdadJubilacionDeseada).toHaveBeenCalledWith('65')
  })

  it('un campo en null (ej. restricción, opcional y nunca completada) → su setter nunca se invoca, no sobrescribe con un valor inventado', () => {
    const setters = settersEspiados()
    confirmarCamposInterpretados(
      { objetivoPensionMensual: 3500000, restriccionCostoPensionalAdicionalMaximoMensual: null, edadJubilacionDeseada: 65 },
      setters
    )
    expect(setters.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual).not.toHaveBeenCalled()
  })

  it('EVIDENCIA end-to-end: un campo no interpretado (null) NUNCA sobrescribe un valor previo del expediente compartido', () => {
    const expediente = {
      objetivoPensionMensual: '2000000',
      restriccionCostoPensionalAdicionalMaximoMensual: '150000',
      edadJubilacionDeseada: '62',
    }
    const setters = {
      onCambiarObjetivoPensionMensual: (valor) => { expediente.objetivoPensionMensual = valor },
      onCambiarRestriccionCostoPensionalAdicionalMaximoMensual: (valor) => {
        expediente.restriccionCostoPensionalAdicionalMaximoMensual = valor
      },
      onCambiarEdadJubilacionDeseada: (valor) => { expediente.edadJubilacionDeseada = valor },
    }

    confirmarCamposInterpretados(
      { objetivoPensionMensual: 3500000, restriccionCostoPensionalAdicionalMaximoMensual: null, edadJubilacionDeseada: null },
      setters
    )

    expect(expediente.objetivoPensionMensual).toBe('3500000')
    expect(expediente.restriccionCostoPensionalAdicionalMaximoMensual).toBe('150000') // valor previo intacto
    expect(expediente.edadJubilacionDeseada).toBe('62') // valor previo intacto — nunca null ni ''
  })
})

describe('numeroDesdeExpediente', () => {
  it('cadena vacía, null o undefined → null (no hay valor todavía, nunca 0)', () => {
    expect(numeroDesdeExpediente('')).toBeNull()
    expect(numeroDesdeExpediente(null)).toBeNull()
    expect(numeroDesdeExpediente(undefined)).toBeNull()
  })

  it('cadena numérica → number', () => {
    expect(numeroDesdeExpediente('3500000')).toBe(3500000)
    expect(numeroDesdeExpediente('62')).toBe(62)
  })

  it('cadena no numérica → null, nunca NaN', () => {
    expect(numeroDesdeExpediente('abc')).toBeNull()
  })
})
