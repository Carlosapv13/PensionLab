// E6.6 — pruebas de las funciones puras de presentación del Nivel completo (sin mount de
// componente, mismo criterio ya usado por ProyectaTuPensionRPM.helpers.test.js).

import { describe, it, expect } from 'vitest'
import {
  humanizarClave,
  etiquetaCampo,
  tipoDeValor,
  formatearValorEscalar,
  formatearSemanasComoTexto,
  ETIQUETAS_PASO,
  pasoDependeDePoliticaJuridica,
  mensajePasoPendienteDePolitica,
  etiquetaNombrePolitica,
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

  // Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B):
  // semanasCotizadas puede traer decimales reales (diasCotizados / 7) — se muestran como
  // semanas completas + días restantes, nunca como un decimal crudo.
  it('semanasCotizadas con decimales se descompone en semanas completas + días restantes, sin redondear las semanas hacia arriba', () => {
    // 1470 semanas y 6 días = 10.296 días / 7 = 1470.857142857142857...
    expect(formatearValorEscalar('semanasCotizadas', 10296 / 7)).toBe('1.470 semanas y 6 días')
  })

  it('semanasCotizadas con un decimal exacto entero (sin residuo) no agrega "y 0 días"', () => {
    expect(formatearValorEscalar('semanasCotizadas', 1300.0000000000002)).toBe('1.300 semanas')
  })

  it('semanasCotizadas con 1 semana completa usa singular, y con 1 día restante usa singular', () => {
    expect(formatearValorEscalar('semanasCotizadas', 1)).toBe('1 semana')
    expect(formatearValorEscalar('semanasCotizadas', 8 / 7)).toBe('1 semana y 1 día')
  })

  it('campos booleanos conocidos se traducen a Sí/No', () => {
    expect(formatearValorEscalar('cumple', true)).toBe('Sí')
    expect(formatearValorEscalar('esOpcionLegal', false)).toBe('No')
    expect(formatearValorEscalar('aplica', true)).toBe('Sí')
  })

  it('origen: los códigos conocidos (determinarBaseCotizacion.js y generarCaminosRPM.js) se traducen; uno desconocido se muestra literal (nunca se inventa una traducción)', () => {
    expect(formatearValorEscalar('origen', 'declarado_por_usuario')).toBe('Declarado por ti')
    expect(formatearValorEscalar('origen', 'calculado_desde_dato_declarado')).toBe('Calculado desde el dato que declaraste')
    // Corrección de auditoría visual (2026-09-25, Caso B): escenarioIbcFuturo.origen
    // (generarCaminosRPM.js) reusa el mismo campo `origen` — sus dos códigos aparecían crudos
    // en el Nivel completo antes de esta corrección.
    expect(formatearValorEscalar('origen', 'continuidad_ibc_actual')).toBe('Mismo IBC que tu situación actual, sin cambio')
    expect(formatearValorEscalar('origen', 'busqueda_objetivo_rpm')).toBe('Calculado para alcanzar tu objetivo')
    expect(formatearValorEscalar('origen', 'codigo_futuro_desconocido')).toBe('codigo_futuro_desconocido')
  })

  // Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B):
  // VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA apareció crudo en una captura real del Nivel
  // completo — reemplaza el criterio anterior (mostrar literal) por el mismo patrón ya usado
  // para `origen`/`etiquetaNombrePolitica`: traducir los códigos conocidos, sin inventar
  // ninguna posición jurídica, y caer al literal para un código futuro sin traducción.
  it('razonVidaLaboralNoEvaluada: los tres códigos conocidos de calcularProyeccionRPM.js se traducen a una explicación operativa, nunca jurídica', () => {
    expect(formatearValorEscalar('razonVidaLaboralNoEvaluada', 'SEMANAS_TOTALES_INSUFICIENTES')).toBe(
      'No alcanzas las semanas mínimas para que esta alternativa se evalúe'
    )
    expect(formatearValorEscalar('razonVidaLaboralNoEvaluada', 'DATOS_LEGALES_INSUFICIENTES')).toBe(
      'Faltan datos legales (índice de precios) para calcular esta alternativa'
    )
    expect(formatearValorEscalar('razonVidaLaboralNoEvaluada', 'VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA')).toBe(
      'Tu declaración agregada de semanas no aporta historia salarial real con la que calcular esta alternativa — se requiere historia de cotización estructurada'
    )
    expect(formatearValorEscalar('razonVidaLaboralNoEvaluada', 'VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA')).not.toContain(
      'VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA'
    )
  })

  it('razonVidaLaboralNoEvaluada: un código futuro sin traducción conocida se muestra literal — nunca se inventa una explicación', () => {
    expect(formatearValorEscalar('razonVidaLaboralNoEvaluada', 'CODIGO_FUTURO_DESCONOCIDO')).toBe(
      'CODIGO_FUTURO_DESCONOCIDO'
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

// Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B): unidad
// dedicada de la descomposición semanas/días, más allá de su uso vía formatearValorEscalar —
// nunca redondea las semanas hacia arriba, nunca modifica el dato real recibido (solo
// Math.round(valor * 7) para corregir ruido de punto flotante del propio valor, no para
// cambiarlo).
describe('formatearSemanasComoTexto — semanas completas + días restantes, calculados desde el valor real, sin redondear hacia arriba', () => {
  it('un entero exacto no agrega días (0 días restantes se omite)', () => {
    expect(formatearSemanasComoTexto(1300)).toBe('1.300 semanas')
  })

  it('1.470 semanas y 6 días — mismo caso real reportado (10.296 días / 7)', () => {
    expect(formatearSemanasComoTexto(10296 / 7)).toBe('1.470 semanas y 6 días')
  })

  it('nunca redondea las semanas hacia arriba, ni con un residuo grande (6 de 7 días)', () => {
    // 999 semanas y 6 días, nunca "1.000 semanas".
    expect(formatearSemanasComoTexto((999 * 7 + 6) / 7)).toBe('999 semanas y 6 días')
  })

  it('singular de "semana" y "día" cuando la cantidad es exactamente 1', () => {
    expect(formatearSemanasComoTexto(1)).toBe('1 semana')
    expect(formatearSemanasComoTexto(8 / 7)).toBe('1 semana y 1 día')
  })

  it('0 semanas con residuo sigue mostrando la etiqueta de semanas en plural, más los días', () => {
    expect(formatearSemanasComoTexto(3 / 7)).toBe('0 semanas y 3 días')
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

// Corrección de auditoría visual (2026-09-25, hallazgo de revisión con capturas reales de
// Carlos, Caso B): `politica.nombre` es un identificador interno de código
// (evaluarPoliticasEjercicioRPM.js — contrato cerrado, sin tocar), nunca pensado para
// mostrarse tal cual a una persona usuaria.
describe('etiquetaNombrePolitica — traduce el identificador interno, nunca lo muestra crudo', () => {
  it('la política conocida hoy usa su etiqueta explícita, citando el mismo fundamento legal (Art. 34) que su propio mensaje', () => {
    expect(etiquetaNombrePolitica('PoliticaAnclaIncrementoMujer')).toBe(
      'Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres'
    )
  })

  it('una política futura sin traducción conocida nunca se oculta — cae al nombre humanizado, nunca al identificador crudo', () => {
    expect(etiquetaNombrePolitica('OtraPoliticaFutura')).toBe('Otra Politica Futura')
    expect(etiquetaNombrePolitica('OtraPoliticaFutura')).not.toBe('OtraPoliticaFutura')
  })
})

describe('mensajePasoPendienteDePolitica — nunca elige una interpretación, nunca muestra el identificador interno de la política', () => {
  it('con una sola política NO_RESUELTA, la nombra con su etiqueta traducida (nunca el identificador interno)', () => {
    const mensaje = mensajePasoPendienteDePolitica([{ nombre: 'PoliticaAnclaIncrementoMujer' }])
    expect(mensaje).toBe(
      'Pendiente: depende de la política jurídica "Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
    )
    expect(mensaje).not.toContain('PoliticaAnclaIncrementoMujer')
  })

  it('con varias políticas NO_RESUELTA, las une con "y" — nunca omite ninguna; una sin traducción conocida usa su nombre humanizado', () => {
    const mensaje = mensajePasoPendienteDePolitica([{ nombre: 'PoliticaAnclaIncrementoMujer' }, { nombre: 'OtraPoliticaFutura' }])
    expect(mensaje).toContain('"Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres" y "Otra Politica Futura"')
  })

  it('nunca menciona ANCLA_FIJA_1300 ni ANCLA_MINIMO_APLICABLE ni ninguna interpretación — solo el nombre traducido de la política', () => {
    const mensaje = mensajePasoPendienteDePolitica([{ nombre: 'PoliticaAnclaIncrementoMujer' }])
    expect(mensaje).not.toMatch(/ANCLA_FIJA|ANCLA_MINIMO|fija en 1.300|dinámica/)
  })
})
