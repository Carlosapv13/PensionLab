import { describe, it, expect } from 'vitest'
import { construirTextoConfirmacion } from './construirTextoConfirmacion.js'
import { SIN_DECLARACION, TEXTO_DESCARTADO_COMO_RUIDO } from './interpretarDeclaracion.js'

const CAMPOS_VACIOS = {
  objetivoPensionMensual: null,
  restriccionCostoPensionalAdicionalMaximoMensual: null,
  edadJubilacionDeseada: null,
}

describe('construirTextoConfirmacion — EVIDENCIA: construcción determinista, nunca prosa del modelo', () => {
  it('interpretado con un solo campo — resumen construido a partir del valor estructurado, no de ningún texto libre', () => {
    const resultado = {
      estado: 'interpretado',
      campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } },
      camposAmbiguos: [],
      razonCodigo: null,
    }
    const texto = construirTextoConfirmacion(resultado)

    expect(texto.resumen).toBe('Entendimos lo siguiente en tu mensaje: objetivo de pensión mensual — $3.500.000.')
    expect(texto.mensaje).toBeNull()
  })

  it('interpretado con los tres campos — el resumen los enumera todos', () => {
    const resultado = {
      estado: 'interpretado',
      campos: {
        objetivoPensionMensual: { valorCOP: 3500000 },
        restriccionCostoPensionalAdicionalMaximoMensual: { valorCOP: 500000 },
        edadJubilacionDeseada: { valorAnios: 65 },
      },
      camposAmbiguos: [],
      razonCodigo: null,
    }
    const texto = construirTextoConfirmacion(resultado)
    expect(texto.resumen).toContain('$3.500.000')
    expect(texto.resumen).toContain('$500.000')
    expect(texto.resumen).toContain('65 años')
  })

  it('camposParaMostrar siempre trae los tres campos, con presente:false para los no interpretados', () => {
    const resultado = {
      estado: 'interpretado',
      campos: { ...CAMPOS_VACIOS, objetivoPensionMensual: { valorCOP: 3500000 } },
      camposAmbiguos: [],
      razonCodigo: null,
    }
    const { camposParaMostrar } = construirTextoConfirmacion(resultado)
    expect(camposParaMostrar).toHaveLength(3)
    expect(camposParaMostrar.find((c) => c.campo === 'objetivoPensionMensual')).toEqual({
      campo: 'objetivoPensionMensual',
      etiqueta: 'Objetivo de pensión mensual',
      valor: 3500000,
      presente: true,
    })
    expect(camposParaMostrar.find((c) => c.campo === 'edadJubilacionDeseada')).toEqual({
      campo: 'edadJubilacionDeseada',
      etiqueta: 'Edad de jubilación deseada',
      valor: null,
      presente: false,
    })
  })
})

describe('construirTextoConfirmacion — razones del modelo (RAZONES_CODIGO_MODELO)', () => {
  it('insuficiente / SIN_INFORMACION_CUANTIFICABLE', () => {
    const texto = construirTextoConfirmacion({
      estado: 'insuficiente',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: [],
      razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
    })
    expect(texto.mensaje).toMatch(/no encontramos ninguna cifra/)
  })

  it('ambiguo / MULTIPLES_LECTURAS_POSIBLES', () => {
    const texto = construirTextoConfirmacion({
      estado: 'ambiguo',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: ['objetivoPensionMensual'],
      razonCodigo: 'MULTIPLES_LECTURAS_POSIBLES',
    })
    expect(texto.mensaje).toMatch(/más de una interpretación/)
  })

  it('no_pertinente / SIN_MATERIA_PENSIONAL', () => {
    const texto = construirTextoConfirmacion({
      estado: 'no_pertinente',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: [],
      razonCodigo: 'SIN_MATERIA_PENSIONAL',
    })
    expect(texto.mensaje).toMatch(/ningún asunto pensional/)
  })
})

describe('construirTextoConfirmacion — razones del filtro previo (nunca llegaron al modelo)', () => {
  it(`SIN_DECLARACION`, () => {
    const texto = construirTextoConfirmacion({ estado: 'insuficiente', campos: CAMPOS_VACIOS, camposAmbiguos: [], razonCodigo: SIN_DECLARACION })
    expect(texto.mensaje).toBe('Todavía no escribiste nada que podamos interpretar.')
  })

  it(`TEXTO_DESCARTADO_COMO_RUIDO`, () => {
    const texto = construirTextoConfirmacion({
      estado: 'insuficiente',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: [],
      razonCodigo: TEXTO_DESCARTADO_COMO_RUIDO,
    })
    expect(texto.mensaje).toMatch(/no parece contener una declaración suficientemente sustantiva/)
  })
})

describe('construirTextoConfirmacion — errores de transporte, mensaje neutral por código', () => {
  const codigos = [
    'TIMEOUT',
    'ERROR_RED',
    'RESPUESTA_INVALIDA',
    'RESPUESTA_INCONSISTENTE',
    'RECHAZADO_POR_PROVEEDOR',
    'CONFIGURACION_SERVIDOR_INCOMPLETA',
  ]

  it.each(codigos)('%s produce un mensaje no vacío, sin detalles internos del proveedor', (errorCodigo) => {
    const texto = construirTextoConfirmacion({
      estado: 'error_proveedor',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: [],
      razonCodigo: null,
      errorCodigo,
    })
    expect(typeof texto.mensaje).toBe('string')
    expect(texto.mensaje.length).toBeGreaterThan(0)
    expect(texto.mensaje).not.toMatch(/OpenAI|api\.openai\.com|401|500|stack/i)
  })

  it('código de error desconocido no lanza excepción — cae a un mensaje genérico', () => {
    const texto = construirTextoConfirmacion({
      estado: 'error_proveedor',
      campos: CAMPOS_VACIOS,
      camposAmbiguos: [],
      razonCodigo: null,
      errorCodigo: 'ALGO_NO_PREVISTO',
    })
    expect(typeof texto.mensaje).toBe('string')
  })
})
