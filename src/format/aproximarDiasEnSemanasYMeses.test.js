import { describe, it, expect } from 'vitest'
import { aproximarDiasEnSemanasYMeses, formatearDiasFaltantesParaVentanaIBL } from './aproximarDiasEnSemanasYMeses.js'

describe('aproximarDiasEnSemanasYMeses — criterio de redondeo (checkpoint E4-C1, Decisión 1)', () => {
  it('EVIDENCIA (ejemplo del checkpoint): 56 días → 8 semanas exactas (ceil) y 2 meses (round)', () => {
    expect(aproximarDiasEnSemanasYMeses(56)).toEqual({ semanasAproximadas: 8, mesesAproximados: 2 })
  })

  it('semanas siempre redondea hacia ARRIBA (Math.ceil), nunca hacia abajo', () => {
    expect(aproximarDiasEnSemanasYMeses(8)).toEqual({ semanasAproximadas: 2, mesesAproximados: null }) // 8/7 = 1.14 → 2
  })

  it('nunca expone "0 meses" cuando todavía hay semanas faltantes — mesesAproximados es null en ese caso', () => {
    // 10 días: 10/7 = 1.43 → 2 semanas; 10/30 = 0.33 → redondeado a 0 → se omite (null), no "0 meses"
    expect(aproximarDiasEnSemanasYMeses(10)).toEqual({ semanasAproximadas: 2, mesesAproximados: null })
  })

  it('1 día → 1 semana, sin meses (0 tras redondeo → null)', () => {
    expect(aproximarDiasEnSemanasYMeses(1)).toEqual({ semanasAproximadas: 1, mesesAproximados: null })
  })

  it('15 días → meses redondea .5 hacia arriba (Math.round nativo de JS), nunca a 0', () => {
    expect(aproximarDiasEnSemanasYMeses(15)).toEqual({ semanasAproximadas: 3, mesesAproximados: 1 })
  })

  it('30 días exactos → 5 semanas (ceil de 4.28) y 1 mes', () => {
    expect(aproximarDiasEnSemanasYMeses(30)).toEqual({ semanasAproximadas: 5, mesesAproximados: 1 })
  })

  it('0 días → sin nada que aproximar, nunca "0 semanas o 0 meses" como cifra positiva', () => {
    expect(aproximarDiasEnSemanasYMeses(0)).toEqual({ semanasAproximadas: 0, mesesAproximados: null })
  })

  it('negativo, NaN o no numérico → nunca lanza, resultado neutro', () => {
    expect(aproximarDiasEnSemanasYMeses(-5)).toEqual({ semanasAproximadas: 0, mesesAproximados: null })
    expect(aproximarDiasEnSemanasYMeses(NaN)).toEqual({ semanasAproximadas: 0, mesesAproximados: null })
    expect(aproximarDiasEnSemanasYMeses('56')).toEqual({ semanasAproximadas: 0, mesesAproximados: null })
    expect(aproximarDiasEnSemanasYMeses(null)).toEqual({ semanasAproximadas: 0, mesesAproximados: null })
    expect(aproximarDiasEnSemanasYMeses(undefined)).toEqual({ semanasAproximadas: 0, mesesAproximados: null })
  })

  it('caso grande (ventana completa, 3650 días): nunca desborda ni produce NaN', () => {
    expect(aproximarDiasEnSemanasYMeses(3650)).toEqual({ semanasAproximadas: 522, mesesAproximados: 122 })
  })
})

describe('formatearDiasFaltantesParaVentanaIBL — frase completa (checkpoint E4-C1, Decisión 1)', () => {
  it('EVIDENCIA EXACTA del checkpoint: 3594 de 3650 → "Identificamos 3594 de los 3650 días necesarios. Faltan 56 días, equivalentes aproximadamente a 8 semanas o 2 meses de historia de cotización."', () => {
    expect(formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: 3594, diasRequeridos: 3650 })).toBe(
      'Identificamos 3594 de los 3650 días necesarios. Faltan 56 días, equivalentes aproximadamente a 8 semanas o 2 meses de historia de cotización.'
    )
  })

  it('cuando meses redondea a 0, la frase omite la cláusula "o X meses" en vez de decir "0 meses"', () => {
    const texto = formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: 3640, diasRequeridos: 3650 })
    expect(texto).toBe(
      'Identificamos 3640 de los 3650 días necesarios. Faltan 10 días, equivalentes aproximadamente a 2 semanas de historia de cotización.'
    )
    expect(texto).not.toMatch(/0 meses/)
  })

  it('singular correcto: 1 semana, 1 mes (sin "s")', () => {
    const texto = formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: 3635, diasRequeridos: 3650 })
    // 15 días faltantes → 3 semanas, 1 mes (ver caso arriba) — construir uno con exactamente 1 semana:
    expect(texto).toContain('semanas')
    const textoUnaSemana = formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: 3649, diasRequeridos: 3650 })
    expect(textoUnaSemana).toBe(
      'Identificamos 3649 de los 3650 días necesarios. Faltan 1 día, equivalentes aproximadamente a 1 semana de historia de cotización.'
    )
  })

  it('diasIdentificados/diasRequeridos no numéricos → null, nunca lanza ni inventa una cifra', () => {
    expect(formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: null, diasRequeridos: 3650 })).toBeNull()
    expect(formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: 3594, diasRequeridos: null })).toBeNull()
    expect(formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: undefined, diasRequeridos: undefined })).toBeNull()
  })

  it('nunca afirma equivalencia legal exacta — siempre incluye la palabra "aproximadamente"', () => {
    const texto = formatearDiasFaltantesParaVentanaIBL({ diasIdentificados: 3594, diasRequeridos: 3650 })
    expect(texto).toContain('aproximadamente')
  })
})
