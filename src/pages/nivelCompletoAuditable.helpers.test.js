// E6.6 — pruebas de las funciones puras de presentación del Nivel completo (sin mount de
// componente, mismo criterio ya usado por ProyectaTuPensionRPM.helpers.test.js).

import { describe, it, expect } from 'vitest'
import {
  humanizarClave,
  etiquetaCampo,
  tipoDeValor,
  formatearValorEscalar,
  formatearSemanasComoTexto,
  formatearPorcentaje,
  formatearDeltaObjetivo,
  debeOcultarCampoAnidado,
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
  })

  // Corrección de auditoría visual (2026-09-25, validación de Carlos/Atlas sobre el Preview
  // del Caso A real): `delta` ya NO usa `formatearPesos` genérico (que producía "$-1", una
  // diferencia negativa incomprensible junto a "¿Cumple el objetivo? Sí") — tiene su propio
  // formato humano, ver describe `formatearDeltaObjetivo` más abajo para el detalle completo.
  it('delta usa formatearDeltaObjetivo, nunca formatearPesos crudo (ver describe dedicado)', () => {
    expect(formatearValorEscalar('delta', -1)).toBe('$1 por encima del objetivo')
    expect(formatearValorEscalar('delta', 1788243)).toBe('$1.788.243 por debajo del objetivo')
    expect(formatearValorEscalar('delta', -1)).not.toContain('$-1')
  })

  // Corrección de auditoría visual (2026-09-25, validación de Carlos/Atlas): las tasas reales
  // traen hasta 14 decimales de precisión de punto flotante ("64.35353674799146%") — se
  // presentan con máximo 2 decimales, formato español (coma decimal, `toLocaleString('es-CO')`,
  // el mismo ya usado en todo este archivo para miles) — nunca cambia el valor real.
  it('campos de porcentaje verificados agregan "%" sobre el número, redondeado a máximo 2 decimales en formato español (coma)', () => {
    expect(formatearValorEscalar('tasaInicial', 65.5)).toBe('65,5%')
    expect(formatearValorEscalar('tasaMaxima', 80)).toBe('80%')
    expect(formatearValorEscalar('tasaInicial', 64.35353674799146)).toBe('64,35%')
    expect(formatearValorEscalar('tasaFinalAplicada', 63.71520830218928)).toBe('63,72%')
  })

  // Corrección de auditoría visual (2026-09-26, Caso B): `formatearPorcentaje` se extrajo de
  // dentro de `formatearValorEscalar` para que ExploraTuProyeccionRPM.jsx (pantalla "Lectura
  // económica RPM con tu historia hasta hoy") reutilice el mismo criterio en vez de duplicar
  // el formato — mismos valores exactos reportados por Carlos/Atlas sobre ese Preview.
  it('formatearPorcentaje: máximo 2 decimales, coma decimal, sin ceros de más', () => {
    expect(formatearPorcentaje(64.56)).toBe('64,56%')
    expect(formatearPorcentaje(80)).toBe('80%')
    expect(formatearPorcentaje(64.5)).toBe('64,5%')
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

// Auditoría adversarial (2026-09-25, validación de Carlos/Atlas sobre el Preview del Caso A
// real, commit 759a010): "Diferencia frente al objetivo $-1" con "¿Cumple el objetivo? Sí" —
// contradictorio para una persona usuaria. `delta = objetivoValorMensual - resultado.valor`
// (generarCaminosRPM.js, cerrado, sin tocar) — negativo cuando el resultado SUPERA el
// objetivo, `cumple: delta <= 0`. Caso real reportado: resultado $5.000.001 contra objetivo
// $5.000.000 → delta = -1.
describe('formatearDeltaObjetivo — expresa el signo aritmético en lenguaje humano, nunca invierte el criterio de cumplimiento', () => {
  it('caso real reportado: delta -1 (resultado $5.000.001 vs. objetivo $5.000.000) → "$1 por encima del objetivo", nunca "$-1"', () => {
    expect(formatearDeltaObjetivo(-1)).toBe('$1 por encima del objetivo')
    expect(formatearDeltaObjetivo(-1)).not.toContain('-')
  })

  it('delta negativo grande: sigue "por encima", con la magnitud absoluta correcta', () => {
    expect(formatearDeltaObjetivo(-500000)).toBe('$500.000 por encima del objetivo')
  })

  it('delta positivo (falta dinero): "por debajo del objetivo", sin perder magnitud — caso real reportado: $1.788.243', () => {
    expect(formatearDeltaObjetivo(1788243)).toBe('$1.788.243 por debajo del objetivo')
  })

  it('delta exactamente 0: caso límite explícito, nunca forzado a "por encima" ni "por debajo" con magnitud $0', () => {
    expect(formatearDeltaObjetivo(0)).toBe('Exactamente en el objetivo')
  })
})

// Auditoría adversarial (2026-09-25, validación de Carlos/Atlas): dos identificadores/valores
// que nunca deben aparecer como fila propia del Nivel completo — `normaId` (identificador
// interno de código, sin nombre humano alternativo en el contrato) y `razonNoEvaluable: null`
// (significa "sí se evaluó" — mostrar "Razón: no evaluable" al lado de un valor vacío
// contradice "¿Se evaluó? Sí" ya mostrado). Nunca oculta un campo por falta de etiqueta —
// esa garantía general sigue intacta, ver `etiquetaCampo`.
describe('debeOcultarCampoAnidado — oculta solo normaId y razonNoEvaluable:null, nunca otro campo', () => {
  it('normaId: siempre oculto, sin importar el valor', () => {
    expect(debeOcultarCampoAnidado('normaId', 'const-art48-ley100-art35-piso-pension-minima')).toBe(true)
    expect(debeOcultarCampoAnidado('normaId', null)).toBe(true)
  })

  it('razonNoEvaluable: oculto SOLO cuando es null', () => {
    expect(debeOcultarCampoAnidado('razonNoEvaluable', null)).toBe(true)
  })

  it('razonNoEvaluable: NUNCA oculto cuando trae un código real — la corrección nunca oculta una razón que sí existe', () => {
    expect(debeOcultarCampoAnidado('razonNoEvaluable', 'ELEGIBILIDAD_NO_EVALUABLE')).toBe(false)
  })

  it('cualquier otro campo, incluido null: nunca se oculta (fuente, articulo, aplica, valorSMLMV, etc.)', () => {
    for (const clave of ['fuente', 'articulo', 'descripcion', 'aplica', 'valorSMLMV', 'valorPesosDeHoy', 'evaluable']) {
      expect(debeOcultarCampoAnidado(clave, null)).toBe(false)
      expect(debeOcultarCampoAnidado(clave, 'cualquier valor')).toBe(false)
    }
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
