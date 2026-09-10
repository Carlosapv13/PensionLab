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
  textoAjusteIBC,
  textoDistancia,
  textoResultadoMatematicoPrevioAjuste,
  textoPorcentajeObjetivo,
  textoDiferenciaFrenteABase,
  textoOrientacion,
  textoHorizonte,
  textoFuenteSemanas,
  calcularLimitacionesComunes,
  limitacionesEspecificas,
  debeOcultarRestriccion,
  validarEsfuerzoAdicionalMensualDeseado,
  ordenarCaminosParaPresentacion,
  construirSemanasReferenciaDeclaradas,
  objetivoInferiorAlPisoLegal,
  textoObjetivoInferiorAlPisoLegal,
  textoResumenSemanasDeclaradas,
  textoResumenBaseCotizacion,
  textoResumenTraslado,
  textoAccionUsarPisoLegalComoObjetivo,
  textoResumenHistoriaCotizacion,
  textoResumenLimiteEsfuerzo,
  debeMostrarBotonGeneralEdicionObjetivo,
} from './ProyectaTuPensionRPM.helpers.js'

describe('debeOcultarRestriccion — EVIDENCIA: solo se oculta cuando el resultado es semanas insuficientes (precisión de producto S4-006)', () => {
  it('código SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM → true (restricción no puede afectar ese resultado — ver generarCaminosRPM.js)', () => {
    const resultado = { orientacion: { codigo: 'SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM' } }
    expect(debeOcultarRestriccion(resultado)).toBe(true)
  })

  it.each([
    'UNICO_CUMPLE',
    'VARIOS_CUMPLEN_FALTA_PRIORIDAD',
    'NINGUNO_CUMPLE_MAS_CERCANO',
    'SIN_CAMINOS_VIABLES',
    'EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL',
    'DATOS_INCOMPLETOS',
    'PERFIL_NO_EVALUABLE',
  ])('cualquier otro código (%s) → false, restricción sigue siendo opcional y disponible', (codigo) => {
    expect(debeOcultarRestriccion({ orientacion: { codigo } })).toBe(false)
  })

  it('resultado null (todavía no se calculó nada) → false, nunca lanza', () => {
    expect(debeOcultarRestriccion(null)).toBe(false)
  })

  it('resultado sin orientacion (forma inesperada) → false, no lanza', () => {
    expect(debeOcultarRestriccion({})).toBe(false)
  })
})

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

  it('camino alternativo con costo positivo: enmarca el valor como consecuencia del cambio de IBC, no como cifra aislada', () => {
    const escenario = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 391865 } }
    expect(textoEsfuerzoAdicional(escenario)).toBe(
      'Esto representa $391.865 adicionales de aporte pensional al mes en este escenario.'
    )
  })

  it('dos escenarios con costos distintos producen textos que reflejan cada uno su propio valor, sin mezclarlos', () => {
    const a = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 100000 } }
    const b = { tipo: 'alternativo', esfuerzo: { costoPensionalAdicionalMensual: 200000 } }
    expect(textoEsfuerzoAdicional(a)).toBe('Esto representa $100.000 adicionales de aporte pensional al mes en este escenario.')
    expect(textoEsfuerzoAdicional(b)).toBe('Esto representa $200.000 adicionales de aporte pensional al mes en este escenario.')
  })
})

describe('textoAjusteIBC — ajuste UX/semántico 2026-08-26: el IBC como acción, no como dato de soporte (antes textoIBCFuturo)', () => {
  it('sin cambio de IBC: enmarca como acción de mantener, no como "(sin cambios)" pasivo', () => {
    const escenario = { esfuerzo: { ibcActual: 2900000, ibcPropuesto: 2900000 } }
    expect(textoAjusteIBC(escenario)).toBe('Mantén tu IBC actual en $2.900.000.')
  })

  it('con cambio de IBC: enmarca como acción "lleva de → a", en ese orden exacto, sin invertirlos', () => {
    const escenario = { esfuerzo: { ibcActual: 2900000, ibcPropuesto: 5345679 } }
    expect(textoAjusteIBC(escenario)).toBe('Lleva tu IBC de $2.900.000 a $5.345.679.')
  })

  it('no confunde ibcActual con ibcPropuesto entre dos escenarios distintos', () => {
    const a = { esfuerzo: { ibcActual: 1000000, ibcPropuesto: 1500000 } }
    const b = { esfuerzo: { ibcActual: 2000000, ibcPropuesto: 4000000 } }
    expect(textoAjusteIBC(a)).toBe('Lleva tu IBC de $1.000.000 a $1.500.000.')
    expect(textoAjusteIBC(b)).toBe('Lleva tu IBC de $2.000.000 a $4.000.000.')
  })
})

describe('textoDistancia', () => {
  it('cumple el objetivo, sin piso legal aplicado: mensaje fijo, ignora el valor de delta (no debería usarse cuando cumple=true)', () => {
    const escenario = { distanciaObjetivo: { cumple: true, delta: -999999 }, objetivoAlcanzadoPorPisoLegal: false }
    expect(textoDistancia(escenario)).toBe('Alcanza tu objetivo.')
  })

  it('no cumple el objetivo: muestra exactamente el delta recibido, formateado, ningún otro número', () => {
    const escenario = { distanciaObjetivo: { cumple: false, delta: 150000 }, objetivoAlcanzadoPorPisoLegal: false }
    expect(textoDistancia(escenario)).toBe('No alcanza tu objetivo — le faltarían $150.000 al mes.')
  })

  it('dos escenarios con deltas distintos producen mensajes que reflejan cada uno su propio delta', () => {
    const a = { distanciaObjetivo: { cumple: false, delta: 50000 }, objetivoAlcanzadoPorPisoLegal: false }
    const b = { distanciaObjetivo: { cumple: false, delta: 999000 }, objetivoAlcanzadoPorPisoLegal: false }
    expect(textoDistancia(a)).toBe('No alcanza tu objetivo — le faltarían $50.000 al mes.')
    expect(textoDistancia(b)).toBe('No alcanza tu objetivo — le faltarían $999.000 al mes.')
  })

  describe('checkpoint E4-C1, Decisión 3 — objetivo alcanzado por aplicación del piso legal', () => {
    it('cumple === true y objetivoAlcanzadoPorPisoLegal === true: comunica expresamente el piso legal, nunca "Alcanza tu objetivo." a secas', () => {
      const escenario = { distanciaObjetivo: { cumple: true, delta: -50000 }, objetivoAlcanzadoPorPisoLegal: true }
      expect(textoDistancia(escenario)).toBe('Alcanza tu objetivo por aplicación del piso legal.')
    })

    it('objetivoAlcanzadoPorPisoLegal ausente (undefined, defensivo) se trata como false', () => {
      const escenario = { distanciaObjetivo: { cumple: true, delta: -50000 } }
      expect(textoDistancia(escenario)).toBe('Alcanza tu objetivo.')
    })

    it('no cumple, aunque objetivoAlcanzadoPorPisoLegal fuera true (caso imposible por construcción, pero defendido): el mensaje de no-cumple manda', () => {
      const escenario = { distanciaObjetivo: { cumple: false, delta: 10000 }, objetivoAlcanzadoPorPisoLegal: true }
      expect(textoDistancia(escenario)).toBe('No alcanza tu objetivo — le faltarían $10.000 al mes.')
    })
  })
})

describe('textoResultadoMatematicoPrevioAjuste — checkpoint E4-C1, Decisión 3 (revelación progresiva del valor crudo)', () => {
  it('valorMatematico difiere del ajustado por aplicación del piso: menciona "el piso legal" y la cifra cruda exacta', () => {
    const escenario = {
      estado: 'viable',
      valorMatematico: 1200000,
      ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: 1750905, pisoEvaluado: { aplica: true }, techoEvaluado: { aplica: false } },
    }
    expect(textoResultadoMatematicoPrevioAjuste(escenario)).toBe(
      'Antes de aplicar el piso legal, el resultado matemático de la fórmula era $1.200.000 al mes — no se usa ' +
        'como tu pensión proyectada, se conserva únicamente para trazabilidad.'
    )
  })

  it('valorMatematico difiere por aplicación del techo: menciona "el techo legal"', () => {
    const escenario = {
      estado: 'viable',
      valorMatematico: 50000000,
      ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: 43772625, pisoEvaluado: { aplica: false }, techoEvaluado: { aplica: true } },
    }
    expect(textoResultadoMatematicoPrevioAjuste(escenario)).toContain('el techo legal')
  })

  it('valorMatematico === resultadoFinalAjustado (sin ajuste aplicado): null, nada que revelar', () => {
    const escenario = {
      estado: 'viable',
      valorMatematico: 3000000,
      ajusteLegal: { estado: 'evaluado', resultadoFinalAjustado: 3000000, pisoEvaluado: { aplica: false }, techoEvaluado: { aplica: false } },
    }
    expect(textoResultadoMatematicoPrevioAjuste(escenario)).toBeNull()
  })

  it('escenario descartado: null, nunca lanza', () => {
    expect(textoResultadoMatematicoPrevioAjuste({ estado: 'descartado', valorMatematico: null, ajusteLegal: null })).toBeNull()
  })

  it('ajusteLegal no evaluable (defensivo): null, nunca sustituye por el crudo', () => {
    const escenario = { estado: 'viable', valorMatematico: 1200000, ajusteLegal: { estado: 'no_evaluable', resultadoFinalAjustado: null } }
    expect(textoResultadoMatematicoPrevioAjuste(escenario)).toBeNull()
  })
})

describe('textoPorcentajeObjetivo — ajuste 2026-08-27, segunda línea secundaria junto a textoDistancia', () => {
  it('cumple el objetivo: null — nunca "100%", "Alcanza tu objetivo." ya es la respuesta completa', () => {
    const escenario = { resultado: { valor: 7000000 }, distanciaObjetivo: { cumple: true, valorObjetivo: 7000000 } }
    expect(textoPorcentajeObjetivo(escenario)).toBeNull()
  })

  it('supera el objetivo (cumple true): sigue siendo null, nunca "110%" ni "127%"', () => {
    const escenario = { resultado: { valor: 8000000 }, distanciaObjetivo: { cumple: true, valorObjetivo: 7000000 } }
    expect(textoPorcentajeObjetivo(escenario)).toBeNull()
  })

  it('no cumple: caso real (ejemplo de producto) — $6.513.703 de $7.000.000 → "93,1%", coma decimal es-CO', () => {
    const escenario = {
      resultado: { valor: 6513703 },
      distanciaObjetivo: { cumple: false, valorObjetivo: 7000000 },
    }
    expect(textoPorcentajeObjetivo(escenario)).toBe('Equivale al 93,1% de tu objetivo.')
  })

  it('dos escenarios con proporciones distintas producen porcentajes que reflejan cada uno el suyo, sin mezclarlos', () => {
    const a = { resultado: { valor: 100 }, distanciaObjetivo: { cumple: false, valorObjetivo: 200 } }
    const b = { resultado: { valor: 1 }, distanciaObjetivo: { cumple: false, valorObjetivo: 3 } }
    expect(textoPorcentajeObjetivo(a)).toBe('Equivale al 50,0% de tu objetivo.')
    expect(textoPorcentajeObjetivo(b)).toBe('Equivale al 33,3% de tu objetivo.')
  })

  it('siempre un decimal, incluso en un porcentaje exacto', () => {
    const escenario = { resultado: { valor: 3500000 }, distanciaObjetivo: { cumple: false, valorObjetivo: 7000000 } }
    expect(textoPorcentajeObjetivo(escenario)).toBe('Equivale al 50,0% de tu objetivo.')
  })
})

describe('textoDiferenciaFrenteABase — puro formato, nunca resta (decisión de producto 2026-08-24, copy revisado 2026-08-24)', () => {
  it('delta positivo → "$X más de pensión al mes frente a mantenerte como hoy." (sin signo +)', () => {
    expect(textoDiferenciaFrenteABase({ delta: 650795 })).toBe('$650.795 más de pensión al mes frente a mantenerte como hoy.')
  })

  it('delta negativo → "$X menos de pensión al mes frente a mantenerte como hoy." (sin signo −, valor absoluto formateado)', () => {
    expect(textoDiferenciaFrenteABase({ delta: -650795 })).toBe('$650.795 menos de pensión al mes frente a mantenerte como hoy.')
  })

  it('delta === 0 (camino base) → null, nunca "$0 más" ni "$0 menos"', () => {
    expect(textoDiferenciaFrenteABase({ delta: 0 })).toBeNull()
  })

  it('diferenciaFrenteABase null (escenario descartado) → null, nunca lanza', () => {
    expect(textoDiferenciaFrenteABase(null)).toBeNull()
  })

  it('nunca usa las palabras rentabilidad/retorno/ROI/ganancia en ningún caso', () => {
    for (const delta of [650795, -650795, 1419478]) {
      const texto = textoDiferenciaFrenteABase({ delta })
      expect(texto.toLowerCase()).not.toMatch(/rentabilidad|retorno|roi|ganancia/)
    }
  })

  it('nunca usa el signo +/− delante de la cifra — "más"/"menos" ya expresan la dirección', () => {
    expect(textoDiferenciaFrenteABase({ delta: 650795 })).not.toMatch(/[+−-]\$/)
    expect(textoDiferenciaFrenteABase({ delta: -650795 })).not.toMatch(/[+−-]\$/)
  })

  it('EVIDENCIA (fixture real): $200.000 y $391.309 producen exactamente "$650.795 más..." y "$1.419.478 más..."', () => {
    expect(textoDiferenciaFrenteABase({ delta: 2731318 - 2080523 })).toBe('$650.795 más de pensión al mes frente a mantenerte como hoy.')
    expect(textoDiferenciaFrenteABase({ delta: 3500001 - 2080523 })).toBe('$1.419.478 más de pensión al mes frente a mantenerte como hoy.')
  })
})

describe('textoOrientacion — mapeo código → copy de "Qué podrías explorar ahora" (decisión de producto 2026-08-24)', () => {
  it('los 7 códigos de determinarOrientacionExploracion tienen texto mapeado', () => {
    const codigos = [
      'HOY_YA_ALCANZA_OBJETIVO',
      'OBJETIVO_LEGALMENTE_INALCANZABLE',
      'VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD',
      'ELECCION_YA_ALCANZA_OBJETIVO',
      'ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE',
      'RESTRICCION_COSTO_IMPIDE_OBJETIVO',
      'SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE',
    ]
    for (const codigo of codigos) {
      expect(typeof textoOrientacion(codigo)).toBe('string')
      expect(textoOrientacion(codigo).length).toBeGreaterThan(0)
    }
  })

  it('código desconocido → null, nunca lanza', () => {
    expect(textoOrientacion('CODIGO_INVENTADO')).toBeNull()
  })

  it('EVIDENCIA (caso real $50.000): texto exacto de ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE', () => {
    expect(textoOrientacion('ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE')).toBe(
      'El esfuerzo que elegiste eleva tu proyección, pero no alcanza tu objetivo. Existe otro camino evaluado, ' +
        'con un esfuerzo mensual distinto, que sí lo alcanza.'
    )
  })

  it('EVIDENCIA (caso real objetivo $30.000.000): texto exacto de OBJETIVO_LEGALMENTE_INALCANZABLE', () => {
    expect(textoOrientacion('OBJETIVO_LEGALMENTE_INALCANZABLE')).toBe(
      'Con las condiciones actuales, aumentar tu aporte no permite alcanzar tu objetivo dentro del límite legal.'
    )
  })

  it('ningún texto usa lenguaje evaluativo/financiero prohibido (mejor, recomendado, deberías, te conviene, asequible, rentable) ni cifras', () => {
    const codigos = [
      'HOY_YA_ALCANZA_OBJETIVO',
      'OBJETIVO_LEGALMENTE_INALCANZABLE',
      'VARIOS_CAMINOS_CUMPLEN_FALTA_PRIORIDAD',
      'ELECCION_YA_ALCANZA_OBJETIVO',
      'ELECCION_NO_ALCANZA_PERO_OBJETIVO_ES_ALCANZABLE',
      'RESTRICCION_COSTO_IMPIDE_OBJETIVO',
      'SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE',
    ]
    for (const codigo of codigos) {
      const texto = textoOrientacion(codigo).toLowerCase()
      expect(texto).not.toMatch(/mejor|recomend|deber[ií]as|te conviene|asequible|rentab/)
      expect(texto).not.toMatch(/\d/)
    }
  })
})

describe('textoHorizonte', () => {
  it('fixture real rpm-empleado-proyecta-tu-pension: fechas cortas + duración calendario + edad, en el orden y separadores acordados', () => {
    const horizonte = { fechaInicio: '2026-08-22', fechaFin: '2043-02-11', diasCotizados: 6018 }
    expect(textoHorizonte(horizonte, 65)).toBe('22 ago 2026 → 11 feb 2043 · 16 años y 5 meses · hasta los 65 años')
  })

  it('nunca lee diasCotizados para la duración mostrada — solo fechaInicio/fechaFin (regresión contra reintroducir dias/365.25)', () => {
    // Mismo rango exacto que el fixture, pero con un diasCotizados deliberadamente
    // incorrecto: si la función lo usara, el texto cambiaría; como no lo usa, no cambia.
    const horizonteConDiasIncorrectos = { fechaInicio: '2026-08-22', fechaFin: '2043-02-11', diasCotizados: 999999 }
    expect(textoHorizonte(horizonteConDiasIncorrectos, 65)).toBe(
      '22 ago 2026 → 11 feb 2043 · 16 años y 5 meses · hasta los 65 años'
    )
  })

  it('horizonte corto (menos de 1 mes) — sigue componiendo el texto sin romperse', () => {
    const horizonte = { fechaInicio: '2026-08-22', fechaFin: '2026-08-22', diasCotizados: 1 }
    expect(textoHorizonte(horizonte, 62)).toBe('22 ago 2026 → 22 ago 2026 · menos de 1 mes · hasta los 62 años')
  })
})

describe('textoFuenteSemanas — contrato GO-B (UX-RPM-02A, 2026-08-25)', () => {
  it('declaracion_agregada + aproximado: reconoce las semanas conocidas, marca la certeza, nunca afirma verificación', () => {
    const semanas = {
      observadas: 0,
      futuras: 730.4,
      sustentadasPorHistoria: 730.4,
      declaradas: 1100,
      certeza: 'aproximado',
      total: 1830.4,
      fuente: 'declaracion_agregada',
    }
    const texto = textoFuenteSemanas(semanas)
    expect(texto).toBe(
      'Conocemos las aproximadamente 1100 semanas que declaraste, pero todavía no conocemos el detalle de ' +
        'los IBC de cada período de tu historia — por eso esta proyección parte de esa cifra declarada, no ' +
        'de una historia de cotización verificada. Completarla puede afinar el resultado.'
    )
    // Nunca afirma que las semanas están verificadas ni que se desconoce el pasado.
    expect(texto).not.toContain('verificadas')
    expect(texto.toLowerCase()).not.toContain('no conocemos tu pasado')
    expect(texto.toLowerCase()).not.toContain('no sabemos nada')
  })

  it('declaracion_agregada + conocido: sin el prefijo "aproximadamente"', () => {
    const semanas = {
      observadas: 0,
      futuras: 730.4,
      sustentadasPorHistoria: 730.4,
      declaradas: 1400,
      certeza: 'conocido',
      total: 2130.4,
      fuente: 'declaracion_agregada',
    }
    const texto = textoFuenteSemanas(semanas)
    expect(texto).toContain('las 1400 semanas')
    expect(texto).not.toContain('aproximadamente')
  })

  it('historia_estructurada (sin declaración) → null — ese caso lo cubre la nota de historia vacía, no esta función', () => {
    const semanas = {
      observadas: 522,
      futuras: 208.4,
      sustentadasPorHistoria: 730.4,
      declaradas: null,
      certeza: null,
      total: 730.4,
      fuente: 'historia_estructurada',
    }
    expect(textoFuenteSemanas(semanas)).toBeNull()
  })

  it('ausencia de resultado.semanas (null) → null, nunca lanza', () => {
    expect(() => textoFuenteSemanas(null)).not.toThrow()
    expect(textoFuenteSemanas(null)).toBeNull()
  })

  it('semanas undefined → null, nunca lanza (comportamiento seguro ante dato no utilizable)', () => {
    expect(() => textoFuenteSemanas(undefined)).not.toThrow()
    expect(textoFuenteSemanas(undefined)).toBeNull()
  })

  it('nunca inventa IBC, períodos ni historia detallada — el texto no menciona ninguno de esos términos como si existieran', () => {
    const semanas = {
      observadas: 0,
      futuras: 730.4,
      sustentadasPorHistoria: 730.4,
      declaradas: 1100,
      certeza: 'aproximado',
      total: 1830.4,
      fuente: 'declaracion_agregada',
    }
    const texto = textoFuenteSemanas(semanas)
    // "IBC" y "período" solo aparecen en el sentido de lo que TODAVÍA NO se conoce —
    // verificado arriba por el texto exacto — nunca se afirma un IBC o período concreto.
    expect(texto).toContain('todavía no conocemos el detalle de los IBC de cada período')
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

describe('validarEsfuerzoAdicionalMensualDeseado — validación UX del camino personalizado (decisión de producto 2026-08-23)', () => {
  it('cadena vacía → sin error todavía (la persona no ha escrito nada), valorValido null', () => {
    expect(validarEsfuerzoAdicionalMensualDeseado('')).toEqual({ valorValido: null, mensajeError: null })
  })

  it('"0" → inválido, con mensaje — no permite confirmar un esfuerzo nulo', () => {
    const { valorValido, mensajeError } = validarEsfuerzoAdicionalMensualDeseado('0')
    expect(valorValido).toBeNull()
    expect(mensajeError).toBe('Ingresa un monto mayor a $0.')
  })

  it('negativo → inválido, con mensaje', () => {
    const { valorValido, mensajeError } = validarEsfuerzoAdicionalMensualDeseado('-200000')
    expect(valorValido).toBeNull()
    expect(mensajeError).toBe('Ingresa un monto mayor a $0.')
  })

  it('no numérico → inválido, con mensaje', () => {
    const { valorValido, mensajeError } = validarEsfuerzoAdicionalMensualDeseado('abc')
    expect(valorValido).toBeNull()
    expect(mensajeError).toBe('Ingresa un monto mayor a $0.')
  })

  it('monto positivo válido → valorValido es el número, sin mensaje de error', () => {
    expect(validarEsfuerzoAdicionalMensualDeseado('200000')).toEqual({ valorValido: 200000, mensajeError: null })
  })
})

describe('ordenarCaminosParaPresentacion — orden SEMÁNTICO por id, nunca por monto (decisión de producto 2026-08-23)', () => {
  const base = { id: 'base' }
  const alternativo = { id: 'aumentar-ibc-futuro' }
  const personalizado = { id: 'esfuerzo-adicional-deseado' }

  it('[base, alternativo] → conserva el orden (sin camino personalizado, nada cambia)', () => {
    expect(ordenarCaminosParaPresentacion([base, alternativo])).toEqual([base, alternativo])
  })

  it('[base, alternativo, personalizado] → [base, personalizado, alternativo]', () => {
    expect(ordenarCaminosParaPresentacion([base, alternativo, personalizado])).toEqual([base, personalizado, alternativo])
  })

  it('solo base → conserva el orden', () => {
    expect(ordenarCaminosParaPresentacion([base])).toEqual([base])
  })

  it('nunca muta el array recibido', () => {
    const original = [base, alternativo, personalizado]
    const copia = [...original]
    ordenarCaminosParaPresentacion(original)
    expect(original).toEqual(copia)
  })

  it('devuelve un array distinto del recibido (nunca la misma referencia)', () => {
    const original = [base, alternativo, personalizado]
    expect(ordenarCaminosParaPresentacion(original)).not.toBe(original)
  })
})

describe('construirSemanasReferenciaDeclaradas — contrato GO-B (2026-08-25)', () => {
  it('conocido + cantidad válida → objeto con la certeza correcta', () => {
    expect(construirSemanasReferenciaDeclaradas('conocido', '1400')).toEqual({ cantidad: 1400, certeza: 'conocido' })
  })

  it('aproximado + cantidad válida → objeto con la certeza correcta', () => {
    expect(construirSemanasReferenciaDeclaradas('aproximado', '1100')).toEqual({ cantidad: 1100, certeza: 'aproximado' })
  })

  it('desconocido → null, nunca "0 semanas" (ausencia de dato, no un hecho sobre la persona)', () => {
    expect(construirSemanasReferenciaDeclaradas('desconocido', '')).toBeNull()
    expect(construirSemanasReferenciaDeclaradas('desconocido', '1100')).toBeNull() // certeza manda, ignora cualquier residuo
  })

  it('null/ausente → null', () => {
    expect(construirSemanasReferenciaDeclaradas(null, '1100')).toBeNull()
    expect(construirSemanasReferenciaDeclaradas(undefined, '1100')).toBeNull()
  })

  it('certeza válida pero cantidad vacía/no numérica/negativa → null (nunca inventa un número)', () => {
    expect(construirSemanasReferenciaDeclaradas('conocido', '')).toBeNull()
    expect(construirSemanasReferenciaDeclaradas('aproximado', 'no-es-un-numero')).toBeNull()
    expect(construirSemanasReferenciaDeclaradas('conocido', '-5')).toBeNull()
  })
})

describe('objetivoInferiorAlPisoLegal — checkpoint E4-C1, Decisión 2', () => {
  it('objetivo por debajo del piso → true', () => {
    expect(objetivoInferiorAlPisoLegal(1000000, 1750905)).toBe(true)
  })

  it('objetivo igual al piso → false (el piso mismo es un objetivo válido, nunca bloqueado)', () => {
    expect(objetivoInferiorAlPisoLegal(1750905, 1750905)).toBe(false)
  })

  it('objetivo superior al piso → false', () => {
    expect(objetivoInferiorAlPisoLegal(3000000, 1750905)).toBe(false)
  })

  it('piso no resuelto (null) → nunca bloquea — no se inventa una certeza legal que no existe', () => {
    expect(objetivoInferiorAlPisoLegal(500000, null)).toBe(false)
  })

  it('objetivo null/0/negativo/no numérico → false, nunca lanza (ese caso lo cubre otra validación, no esta)', () => {
    expect(objetivoInferiorAlPisoLegal(null, 1750905)).toBe(false)
    expect(objetivoInferiorAlPisoLegal(0, 1750905)).toBe(false)
    expect(objetivoInferiorAlPisoLegal(-100, 1750905)).toBe(false)
    expect(objetivoInferiorAlPisoLegal(NaN, 1750905)).toBe(false)
  })

  it('piso 0/negativo/no numérico (defensivo) → false, nunca bloquea con un piso inválido', () => {
    expect(objetivoInferiorAlPisoLegal(500000, 0)).toBe(false)
    expect(objetivoInferiorAlPisoLegal(500000, -1)).toBe(false)
    expect(objetivoInferiorAlPisoLegal(500000, NaN)).toBe(false)
  })
})

describe('textoObjetivoInferiorAlPisoLegal — checkpoint E4-C1, Decisión 2', () => {
  it('incluye el valor exacto del piso recibido, nunca un valor hardcodeado', () => {
    const texto = textoObjetivoInferiorAlPisoLegal(1750905)
    expect(texto).toContain('$1.750.905')
  })

  it('con un piso distinto, el texto refleja ESE valor — nunca $1.750.905 fijo', () => {
    const texto = textoObjetivoInferiorAlPisoLegal(2000000)
    expect(texto).toContain('$2.000.000')
    expect(texto).not.toContain('1.750.905')
  })

  it('aclara que PensionLab no predice incrementos futuros del salario mínimo', () => {
    expect(textoObjetivoInferiorAlPisoLegal(1750905).toLowerCase()).toContain('no predice')
  })
})

describe('textoResumenSemanasDeclaradas — checkpoint E4-C1, Decisión 5', () => {
  it('conocido: cifra exacta, sin prefijo "aproximadamente", documenta ausencia de fecha de referencia', () => {
    expect(textoResumenSemanasDeclaradas('conocido', '1400')).toBe(
      '1400 semanas — sin una fecha de referencia registrada todavía.'
    )
  })

  it('aproximado: prefijo "aproximadamente"', () => {
    expect(textoResumenSemanasDeclaradas('aproximado', '1100')).toBe(
      'aproximadamente 1100 semanas — sin una fecha de referencia registrada todavía.'
    )
  })

  it('desconocido: mensaje distinto, nunca "0 semanas"', () => {
    expect(textoResumenSemanasDeclaradas('desconocido', '')).toBe('No declaraste cuántas semanas tienes cotizadas.')
  })

  it('sin respuesta todavía (null): mensaje neutro, nunca lanza', () => {
    expect(textoResumenSemanasDeclaradas(null, '')).toBe('Todavía no respondiste esta pregunta.')
  })
})

describe('textoResumenBaseCotizacion — checkpoint E4-C1, Decisión 5 (revisión correctiva punto 4: lenguaje natural, nunca el enum crudo)', () => {
  it('IBC aplicable presente, certeza conocido: "Valor exacto declarado por ti", nunca "certeza: conocido"', () => {
    const baseCotizacion = { ibcAplicableSimulacion: 2900000, certezaValorDeclarado: 'conocido', origenDatoIbc: 'declarado_por_usuario' }
    expect(textoResumenBaseCotizacion(baseCotizacion, 'conocido')).toBe('$2.900.000 al mes — Valor exacto declarado por ti.')
  })

  it('certeza aproximado: "Valor aproximado declarado por ti", nunca "certeza: aproximado"', () => {
    const baseCotizacion = { ibcAplicableSimulacion: 2900000, certezaValorDeclarado: 'aproximado', origenDatoIbc: 'declarado_por_usuario' }
    expect(textoResumenBaseCotizacion(baseCotizacion, 'aproximado')).toBe(
      '$2.900.000 al mes — Valor aproximado declarado por ti.'
    )
  })

  it('estimado desde salario: "Estimado a partir del salario que declaraste"', () => {
    const baseCotizacion = { ibcAplicableSimulacion: 1500000, certezaValorDeclarado: 'desconocido', origenDatoIbc: 'calculado_desde_dato_declarado' }
    expect(textoResumenBaseCotizacion(baseCotizacion, 'desconocido')).toBe(
      '$1.500.000 al mes — Estimado a partir del salario que declaraste.'
    )
  })

  it('sin IBC aplicable, certeza desconocido: "No conocemos todavía tu IBC actual"', () => {
    const baseCotizacion = { ibcAplicableSimulacion: null, certezaValorDeclarado: null, origenDatoIbc: null }
    expect(textoResumenBaseCotizacion(baseCotizacion, 'desconocido')).toBe('No conocemos todavía tu IBC actual.')
  })

  it('sin certeza todavía: mensaje neutro', () => {
    expect(textoResumenBaseCotizacion({ ibcAplicableSimulacion: null }, null)).toBe('Todavía no respondiste esta pregunta.')
  })

  it('ningún texto expone el nombre técnico del enum como etiqueta ("certeza: X") — "aproximado"/"desconocido" solo aparecen como adjetivo natural dentro de una frase completa, nunca como token suelto', () => {
    const casos = [
      textoResumenBaseCotizacion({ ibcAplicableSimulacion: 2900000, certezaValorDeclarado: 'conocido', origenDatoIbc: 'declarado_por_usuario' }, 'conocido'),
      textoResumenBaseCotizacion({ ibcAplicableSimulacion: 2900000, certezaValorDeclarado: 'aproximado', origenDatoIbc: 'declarado_por_usuario' }, 'aproximado'),
      textoResumenBaseCotizacion({ ibcAplicableSimulacion: 1500000, certezaValorDeclarado: 'desconocido', origenDatoIbc: 'calculado_desde_dato_declarado' }, 'desconocido'),
      textoResumenBaseCotizacion({ ibcAplicableSimulacion: null, certezaValorDeclarado: null, origenDatoIbc: null }, 'desconocido'),
    ]
    for (const texto of casos) {
      // El defecto real reportado era la ETIQUETA técnica "certeza: X" — nunca aparece.
      expect(texto).not.toMatch(/certeza\s*:/i)
      // Y ninguna frase termina en el token crudo pegado tras un guion (ej. "— conocido."),
      // que sería la forma en que un enum se filtraría sin traducir.
      expect(texto).not.toMatch(/—\s*(conocido|aproximado|desconocido)\.?$/i)
    }
  })
})

describe('textoResumenTraslado — checkpoint E4-C1, Decisión 5 (revisión correctiva punto 4: sin códigos internos crudos)', () => {
  it('sin traslado declarado: null (el llamador no muestra la fila, "cuando exista")', () => {
    expect(textoResumenTraslado({ trasladoRegimen: null, detalleTraslado: null, certezaFechaTraslado: null, fechaTrasladoRegimen: '' })).toBeNull()
    expect(textoResumenTraslado({ trasladoRegimen: 'no', detalleTraslado: null, certezaFechaTraslado: null, fechaTrasladoRegimen: '' })).toBeNull()
  })

  it('con traslado, detalle y fecha conocida: detalle en lenguaje natural (nunca "rpm_a_rais" crudo), incluye la fecha, y aclara que no modifica ningún cálculo', () => {
    const texto = textoResumenTraslado({
      trasladoRegimen: 'si',
      detalleTraslado: 'rpm_a_rais',
      certezaFechaTraslado: 'conocido',
      fechaTrasladoRegimen: '2015-03-01',
    })
    expect(texto).toContain('de Colpensiones a un fondo privado')
    expect(texto).not.toContain('rpm_a_rais')
    expect(texto).not.toContain('rpm a rais')
    expect(texto).toContain('2015-03-01')
    expect(texto).toContain('no modifica ningún cálculo')
  })

  it('los 4 códigos de detalleTraslado tienen redacción natural mapeada, ninguno crudo', () => {
    for (const codigo of ['rpm_a_rais', 'rais_a_rpm', 'multiple', 'no_estoy_seguro']) {
      const texto = textoResumenTraslado({
        trasladoRegimen: 'si',
        detalleTraslado: codigo,
        certezaFechaTraslado: 'desconocido',
        fechaTrasladoRegimen: '',
      })
      expect(texto).not.toContain(codigo)
      expect(texto).not.toContain('_')
    }
  })

  it('con traslado pero sin fecha declarada: lo dice explícitamente, sin inventar una fecha', () => {
    const texto = textoResumenTraslado({ trasladoRegimen: 'si', detalleTraslado: null, certezaFechaTraslado: 'desconocido', fechaTrasladoRegimen: '' })
    expect(texto).toContain('sin fecha declarada')
  })
})

describe('textoAccionUsarPisoLegalComoObjetivo — corrección puntual E4-C1 (hallazgo 1: acción primaria + consecuencia explícita)', () => {
  it('incluye la cifra exacta recibida, formateada, nunca un valor hardcodeado', () => {
    expect(textoAccionUsarPisoLegalComoObjetivo(1750905)).toBe('Cambiar mi objetivo al mínimo legal de $1.750.905')
  })

  it('con un piso distinto, el texto refleja ESE valor — nunca $1.750.905 fijo', () => {
    const texto = textoAccionUsarPisoLegalComoObjetivo(2000000)
    expect(texto).toBe('Cambiar mi objetivo al mínimo legal de $2.000.000')
    expect(texto).not.toContain('1.750.905')
  })

  it('dos llamadas con valores distintos nunca se mezclan', () => {
    expect(textoAccionUsarPisoLegalComoObjetivo(1500000)).toContain('$1.500.000')
    expect(textoAccionUsarPisoLegalComoObjetivo(1750905)).toContain('$1.750.905')
  })
})

describe('textoResumenHistoriaCotizacion — corrección puntual E4-C1 (hallazgo 3: gramática natural, nunca "período(s)"/"agregado(s)")', () => {
  it('cero: oración distinta, sin la cifra "0" ni "(s)"', () => {
    expect(textoResumenHistoriaCotizacion(0)).toBe('No has agregado períodos de cotización.')
  })

  it('uno: singular exacto, sin "(s)"', () => {
    expect(textoResumenHistoriaCotizacion(1)).toBe('Historia de cotización estructurada: 1 período agregado.')
  })

  it('dos: plural exacto', () => {
    expect(textoResumenHistoriaCotizacion(2)).toBe('Historia de cotización estructurada: 2 períodos agregados.')
  })

  it('varios (caso general de "dos o más"): plural exacto con la cifra correcta', () => {
    expect(textoResumenHistoriaCotizacion(7)).toBe('Historia de cotización estructurada: 7 períodos agregados.')
  })

  it('ningún resultado contiene el patrón "(s)"', () => {
    for (const cantidad of [0, 1, 2, 5, 10]) {
      expect(textoResumenHistoriaCotizacion(cantidad)).not.toMatch(/\(s\)/)
    }
  })
})

describe('textoResumenLimiteEsfuerzo — corrección puntual E4-C1 (hallazgo 4: no informado ≠ cero explícito ≠ valor positivo)', () => {
  it('null (no informado): texto exacto, nunca una cifra de $0', () => {
    expect(textoResumenLimiteEsfuerzo(null)).toBe('Límite de esfuerzo mensual: no informado.')
  })

  it('0 (cero explícito): SÍ muestra $0, pero con una aclaración que lo distingue de "no informado" — un dato distinto, no una ausencia', () => {
    const texto = textoResumenLimiteEsfuerzo(0)
    expect(texto).toContain('$0')
    expect(texto).toContain('declaraste explícitamente')
    expect(texto).not.toBe('Límite de esfuerzo mensual: no informado.')
  })

  it('valor positivo: cifra exacta, sin la aclaración de "cero explícito"', () => {
    const texto = textoResumenLimiteEsfuerzo(400000)
    expect(texto).toBe('Límite de esfuerzo mensual: $400.000 adicionales al mes.')
    expect(texto).not.toContain('declaraste explícitamente')
  })

  it('los tres resultados son mutuamente distintos entre sí (ausencia, cero explícito, positivo nunca se confunden)', () => {
    const noInformado = textoResumenLimiteEsfuerzo(null)
    const ceroExplicito = textoResumenLimiteEsfuerzo(0)
    const positivo = textoResumenLimiteEsfuerzo(500000)
    expect(new Set([noInformado, ceroExplicito, positivo]).size).toBe(3)
  })

  // Evidencia de que "0" es un dato VÁLIDO y distinto en este formulario (no una entrada
  // rechazada): validarMontoNoNegativo('0') en ProyectaTuPensionRPM.jsx devuelve el número 0
  // (no null) — el mismo camino que produce este 0 explícito es alcanzable escribiendo "0" en
  // el campo opcional de límite de esfuerzo. Por eso esta función SÍ distingue los tres casos
  // en vez de documentar que "cero explícito no es válido" (si no lo fuera, restriccionCostoPensional
  // nunca podría valer 0 y esta rama sería inalcanzable — no es el caso).
  it('EVIDENCIA: cero explícito es alcanzable desde el formulario — no es un caso inalcanzable ni rechazado', () => {
    expect(textoResumenLimiteEsfuerzo(0)).not.toBeNull()
  })
})

describe('debeMostrarBotonGeneralEdicionObjetivo — corrección puntual E4-C1 (hallazgo 6: sin acción duplicada)', () => {
  it('resumen cerrado, formulario colapsado: visible (es la única vía rápida de editar)', () => {
    expect(debeMostrarBotonGeneralEdicionObjetivo({ mostrarFormulario: false, resumenAbierto: false })).toBe(true)
  })

  it('resumen abierto, formulario colapsado: oculto — los botones individuales del resumen ya cubren la misma acción', () => {
    expect(debeMostrarBotonGeneralEdicionObjetivo({ mostrarFormulario: false, resumenAbierto: true })).toBe(false)
  })

  it('formulario ya abierto (mostrarFormulario true): oculto sin importar el resumen — no hay nada que "editar", ya se está editando', () => {
    expect(debeMostrarBotonGeneralEdicionObjetivo({ mostrarFormulario: true, resumenAbierto: false })).toBe(false)
    expect(debeMostrarBotonGeneralEdicionObjetivo({ mostrarFormulario: true, resumenAbierto: true })).toBe(false)
  })
})
