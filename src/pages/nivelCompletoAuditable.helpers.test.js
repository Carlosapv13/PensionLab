// E6.6 — pruebas de las funciones puras de presentación del Nivel completo (sin mount de
// componente, mismo criterio ya usado por ProyectaTuPensionRPM.helpers.test.js).

import { describe, it, expect } from 'vitest'
import {
  humanizarClave,
  etiquetaCampo,
  tipoDeValor,
  formatearValorEscalar,
  ETIQUETAS_PASO,
  pasoDependeDePoliticaJuridica,
  mensajePasoPendienteDePolitica,
} from './nivelCompletoAuditable.helpers.js'

describe('humanizarClave — traducción mecánica camelCase → "Con espacios", nunca inventa significado', () => {
  it('separa por mayúsculas y capitaliza solo la primera letra', () => {
    expect(humanizarClave('valorPesosDeHoy')).toBe('Valor Pesos De Hoy')
    expect(humanizarClave('razonNoEvaluable')).toBe('Razon No Evaluable')
  })

  it('una clave de una sola palabra queda solo capitalizada', () => {
    expect(humanizarClave('origen')).toBe('Origen')
  })
})

describe('etiquetaCampo — dictionary conocido vs. fallback mecánico', () => {
  it('campos conocidos usan la etiqueta explícita del dominio, no el fallback mecánico', () => {
    expect(etiquetaCampo('valorDeclarado')).toBe('IBC declarado')
    expect(etiquetaCampo('cumple')).toBe('¿Cumple el objetivo?')
  })

  it('un campo desconocido (ej. uno futuro de Contrato F) nunca se oculta — usa el fallback humanizado', () => {
    expect(etiquetaCampo('campoFuturoDeContratoF')).toBe('Campo Futuro De Contrato F')
  })
})

describe('tipoDeValor — decide la forma de renderizado, nunca el contenido', () => {
  it('null y undefined son "vacio"', () => {
    expect(tipoDeValor(null)).toBe('vacio')
    expect(tipoDeValor(undefined)).toBe('vacio')
  })
  it('un arreglo es "lista"', () => {
    expect(tipoDeValor([1, 2])).toBe('lista')
  })
  it('un objeto plano es "objeto"', () => {
    expect(tipoDeValor({ a: 1 })).toBe('objeto')
  })
  it('número/string/booleano son "escalar"', () => {
    expect(tipoDeValor(5)).toBe('escalar')
    expect(tipoDeValor('x')).toBe('escalar')
    expect(tipoDeValor(true)).toBe('escalar')
  })
})

describe('formatearValorEscalar — nunca recalcula, solo presenta', () => {
  it('campos de pesos verificados usan formatearPesos (mismo formato que el resto de la pantalla)', () => {
    expect(formatearValorEscalar('valorDeclarado', 2900000)).toBe('$2.900.000')
    expect(formatearValorEscalar('valorPesosDeHoy', 1750905)).toBe('$1.750.905')
    // formatearPesos (formatearDinero.js, sin cambios en este checkpoint) antepone el signo $
    // al número ya formateado — para negativos, produce "$-50.000", no "-$50.000". Mismo
    // formato que ya usa el resto de la pantalla (ej. textoDiferenciaFrenteABase).
    expect(formatearValorEscalar('delta', -50000)).toBe('$-50.000')
  })

  it('campos de porcentaje verificados agregan "%" sobre el número literal, sin dividir/multiplicar', () => {
    expect(formatearValorEscalar('tasaInicial', 65.5)).toBe('65.5%')
    expect(formatearValorEscalar('tasaMaxima', 80)).toBe('80%')
  })

  it('semanasCotizadas agrega el sufijo "semanas" sobre el número literal', () => {
    expect(formatearValorEscalar('semanasCotizadas', 1300)).toBe('1.300 semanas')
  })

  it('campos booleanos conocidos se traducen a Sí/No', () => {
    expect(formatearValorEscalar('cumple', true)).toBe('Sí')
    expect(formatearValorEscalar('esOpcionLegal', false)).toBe('No')
    expect(formatearValorEscalar('aplica', true)).toBe('Sí')
  })

  it('origen: los dos códigos conocidos de determinarBaseCotizacion.js se traducen; uno desconocido se muestra literal (nunca se inventa una traducción)', () => {
    expect(formatearValorEscalar('origen', 'declarado_por_usuario')).toBe('Declarado por ti')
    expect(formatearValorEscalar('origen', 'calculado_desde_dato_declarado')).toBe('Calculado desde el dato que declaraste')
    expect(formatearValorEscalar('origen', 'codigo_futuro_desconocido')).toBe('codigo_futuro_desconocido')
  })

  it('un código sin traducción conocida (ej. razonVidaLaboralNoEvaluada) se muestra literal — nunca se inventa una explicación jurídica', () => {
    expect(formatearValorEscalar('razonVidaLaboralNoEvaluada', 'DATOS_LEGALES_INSUFICIENTES')).toBe(
      'DATOS_LEGALES_INSUFICIENTES'
    )
  })

  it('un número sin campo conocido usa separador de miles genérico, nunca $ (no se inventa que es dinero)', () => {
    expect(formatearValorEscalar('campoDesconocido', 1234567)).toBe('1.234.567')
  })

  it('un booleano sin campo conocido igual se traduce a Sí/No (nunca "true"/"false" crudo)', () => {
    expect(formatearValorEscalar('campoBooleanoDesconocido', true)).toBe('Sí')
  })

  it('un string sin campo conocido se muestra literal, tal cual', () => {
    expect(formatearValorEscalar('campoDesconocido', 'texto-cualquiera')).toBe('texto-cualquiera')
  })
})

describe('ETIQUETAS_PASO — los 7 códigos de Contrato F, cada uno con un título', () => {
  it('cubre exactamente los 7 códigos que construirPasos() de Contrato F produce', () => {
    expect(Object.keys(ETIQUETAS_PASO)).toEqual([
      'DATOS_UTILIZADOS',
      'IBL',
      'TASA_REEMPLAZO',
      'RESULTADO_MATEMATICO',
      'AJUSTE_LEGAL',
      'RESULTADO_FINAL',
      'COMPARACION_OBJETIVO',
    ])
  })
})

// E7 corrección (2026-09-23, PL-260 §0 punto 6/§8/§9) — qué pasos de Contrato F dependen de
// la interpretación jurídica en disputa (PoliticaAnclaIncrementoMujer, Art. 34).
describe('pasoDependeDePoliticaJuridica — exactamente los 5 pasos que la tasa de reemplazo en disputa afecta', () => {
  it('DATOS_UTILIZADOS e IBL son datos de entrada — nunca dependen de la política', () => {
    expect(pasoDependeDePoliticaJuridica('DATOS_UTILIZADOS')).toBe(false)
    expect(pasoDependeDePoliticaJuridica('IBL')).toBe(false)
  })

  it('TASA_REEMPLAZO, RESULTADO_MATEMATICO, AJUSTE_LEGAL, RESULTADO_FINAL y COMPARACION_OBJETIVO sí dependen', () => {
    expect(pasoDependeDePoliticaJuridica('TASA_REEMPLAZO')).toBe(true)
    expect(pasoDependeDePoliticaJuridica('RESULTADO_MATEMATICO')).toBe(true)
    expect(pasoDependeDePoliticaJuridica('AJUSTE_LEGAL')).toBe(true)
    expect(pasoDependeDePoliticaJuridica('RESULTADO_FINAL')).toBe(true)
    expect(pasoDependeDePoliticaJuridica('COMPARACION_OBJETIVO')).toBe(true)
  })

  it('un código de paso desconocido nunca se trata como dependiente por accidente', () => {
    expect(pasoDependeDePoliticaJuridica('PASO_FUTURO_DESCONOCIDO')).toBe(false)
  })
})

describe('mensajePasoPendienteDePolitica — nunca elige una interpretación, solo nombra la política pendiente', () => {
  it('con una sola política NO_RESUELTA, la nombra literalmente entre comillas', () => {
    const mensaje = mensajePasoPendienteDePolitica([{ nombre: 'PoliticaAnclaIncrementoMujer' }])
    expect(mensaje).toBe(
      'Pendiente: depende de la política jurídica "PoliticaAnclaIncrementoMujer", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
    )
  })

  it('con varias políticas NO_RESUELTA, las une con "y" — nunca omite ninguna', () => {
    const mensaje = mensajePasoPendienteDePolitica([{ nombre: 'PoliticaA' }, { nombre: 'PoliticaB' }])
    expect(mensaje).toContain('"PoliticaA" y "PoliticaB"')
  })

  it('nunca menciona ANCLA_FIJA_1300 ni ANCLA_MINIMO_APLICABLE ni ninguna interpretación — solo el nombre de la política', () => {
    const mensaje = mensajePasoPendienteDePolitica([{ nombre: 'PoliticaAnclaIncrementoMujer' }])
    expect(mensaje).not.toMatch(/ANCLA_FIJA|ANCLA_MINIMO|fija en 1.300|dinámica/)
  })
})
