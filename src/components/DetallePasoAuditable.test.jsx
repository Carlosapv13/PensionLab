// @vitest-environment jsdom
//
// E6.6 (PL-260 §9.1/§9.6) — pruebas del componente aislado que presenta un PasoAuditable de
// Contrato F ("Nivel completo"). Mismo criterio que ConfirmacionContinuidadCotizacion.test.jsx
// (E6.4): directiva jsdom acotada a este archivo, sin @testing-library/jest-dom.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import DetallePasoAuditable from './DetallePasoAuditable.jsx'

afterEach(() => {
  cleanup()
})

describe('DetallePasoAuditable — campos escalares conocidos, nunca recalcula', () => {
  it('DATOS_UTILIZADOS: formatea IBC en pesos, semanas con sufijo, origen traducido — literal de `datos`', () => {
    render(
      <DetallePasoAuditable
        codigo="DATOS_UTILIZADOS"
        datos={{
          valorDeclarado: 2900000,
          valorAplicado: 2900000,
          origen: 'declarado_por_usuario',
          topeAplicado: 62000000,
          semanasCotizadas: 1300,
        }}
      />
    )
    expect(screen.getByText('Datos utilizados')).toBeTruthy()
    expect(screen.getByText('IBC declarado')).toBeTruthy()
    expect(screen.getAllByText('$2.900.000').length).toBeGreaterThan(0)
    expect(screen.getByText('Declarado por ti')).toBeTruthy()
    expect(screen.getByText('$62.000.000')).toBeTruthy()
    expect(screen.getByText('1.300 semanas')).toBeTruthy()
  })

  it('COMPARACION_OBJETIVO: cumple se traduce a Sí/No, nunca "true"/"false" crudo', () => {
    render(
      <DetallePasoAuditable
        codigo="COMPARACION_OBJETIVO"
        datos={{ valorObjetivo: 1600000, delta: 50000, cumple: true }}
      />
    )
    expect(screen.getByText('¿Cumple el objetivo?')).toBeTruthy()
    expect(screen.getByText('Sí')).toBeTruthy()
    expect(screen.queryByText('true')).toBeNull()
  })

  // Auditoría adversarial (2026-09-25, validación de Carlos/Atlas sobre el Preview del Caso A
  // real, commit 759a010) — caso exacto reportado: Hombre 52 años, objetivo $5.000.000,
  // camino alternativo con pensión $5.000.001 (supera el objetivo por $1). El detalle
  // auditable mostraba "Diferencia frente al objetivo $-1" junto a "¿Cumple el objetivo? Sí"
  // — contradictorio. Nunca debe aparecer "$-1" en el DOM.
  it('caso real reportado: delta -1 (pensión $5.000.001 vs. objetivo $5.000.000) nunca muestra "$-1", muestra "$1 por encima del objetivo", coherente con "Cumple: Sí"', () => {
    render(<DetallePasoAuditable codigo="COMPARACION_OBJETIVO" datos={{ valorObjetivo: 5000000, delta: -1, cumple: true }} />)
    expect(screen.getByText('$1 por encima del objetivo')).toBeTruthy()
    expect(screen.queryByText('$-1')).toBeNull()
    expect(screen.getByText('Sí')).toBeTruthy()
  })

  it('caso simétrico: resultado por debajo del objetivo muestra la diferencia faltante, sin perder magnitud', () => {
    render(<DetallePasoAuditable codigo="COMPARACION_OBJETIVO" datos={{ valorObjetivo: 5000000, delta: 1788243, cumple: false }} />)
    expect(screen.getByText('$1.788.243 por debajo del objetivo')).toBeTruthy()
    expect(screen.getByText('No')).toBeTruthy()
  })

  // Auditoría adversarial (2026-09-25, validación de Carlos/Atlas sobre el Preview del Caso A
  // real) — caso exacto reportado: "Tasa de reemplazo inicial" con 14 decimales de precisión
  // de punto flotante ("64.35353674799146%"). Nunca debe aparecer con más de 2 decimales.
  it('caso real reportado: tasas con precisión de punto flotante se muestran con máximo 2 decimales, formato español', () => {
    render(
      <DetallePasoAuditable
        codigo="TASA_REEMPLAZO"
        datos={{ tasaInicial: 64.35353674799146, tasaFinalAplicada: 63.71520830218928, tasaMaxima: 80 }}
      />
    )
    expect(screen.getByText('64,35%')).toBeTruthy()
    expect(screen.getByText('63,72%')).toBeTruthy()
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.queryByText('64.35353674799146%')).toBeNull()
    expect(screen.queryByText('63.71520830218928%')).toBeNull()
  })
})

describe('DetallePasoAuditable — objetos anidados, recursivo', () => {
  it('AJUSTE_LEGAL: pisoEvaluado/techoEvaluado se despliegan como sub-listas con sus propios campos, sin inventar contenido', () => {
    render(
      <DetallePasoAuditable
        codigo="AJUSTE_LEGAL"
        datos={{
          pisoEvaluado: {
            evaluable: true,
            aplica: false,
            valorSMLMV: 1,
            valorPesosDeHoy: 1750905,
            fundamento: { normaId: 'L-100-1993-art-35', fuente: 'Ley 100 de 1993', articulo: '35' },
            razonNoEvaluable: null,
          },
          techoEvaluado: {
            evaluable: true,
            aplica: false,
            valorSMLMV: 25,
            valorPesosDeHoy: 43772625,
            fundamento: { normaId: 'L-100-1993-art-35', fuente: 'Ley 100 de 1993', articulo: '35' },
            razonNoEvaluable: null,
          },
        }}
      />
    )
    expect(screen.getByText('Piso legal evaluado')).toBeTruthy()
    expect(screen.getByText('Techo legal evaluado')).toBeTruthy()
    expect(screen.getAllByText('¿Se evaluó?').length).toBe(2)
    expect(screen.getAllByText('Sí').length).toBeGreaterThan(0)
    // aplica:false → 'No', nunca oculto ni confundido con evaluable:true
    expect(screen.getAllByText('No').length).toBeGreaterThan(0)
    expect(screen.getByText('$1.750.905')).toBeTruthy()
    expect(screen.getAllByText('Ley 100 de 1993').length).toBe(2)
    expect(screen.getAllByText('35').length).toBe(2)
    // Corrección de auditoría visual (2026-09-25, validación de Carlos/Atlas): el
    // identificador interno de la norma nunca aparece en el DOM — fuente/artículo (ya
    // verificados arriba) son el único texto humano para este dato, sin fila "Norma".
    expect(screen.queryByText('L-100-1993-art-35')).toBeNull()
    expect(screen.queryByText('Norma')).toBeNull()
  })

  // Corrección de auditoría visual (2026-09-25, validación de Carlos/Atlas sobre el Preview
  // del Caso A real): esta prueba afirmaba antes que un campo `null` "nunca se oculta la
  // fila" — cierto en general (`aplica`/`valorSMLMV`/`valorPesosDeHoy`/`fundamento` siguen
  // mostrando "—", verificado abajo), PERO `razonNoEvaluable: null` es un caso especial
  // verificado: significa exactamente "sí se evaluó" (ver `ajustarMesadaLegalRPM.js` — nunca
  // no-nulo salvo en las ramas donde el ajuste no se evaluó en absoluto). Mostrar la fila fija
  // "Razón: no evaluable" con un valor vacío al lado era la contradicción real reportada
  // ("¿Se evaluó? Sí" + "Razón: no evaluable —"), no una garantía a preservar.
  it('campos null distintos de razonNoEvaluable se muestran como "—", nunca "null" crudo, y nunca se ocultan', () => {
    render(
      <DetallePasoAuditable
        codigo="AJUSTE_LEGAL"
        datos={{ pisoEvaluado: { evaluable: false, aplica: null, valorSMLMV: null, valorPesosDeHoy: null, fundamento: null, razonNoEvaluable: null } }}
      />
    )
    expect(screen.getByText('¿Aplica?')).toBeTruthy()
    expect(screen.getByText('Valor en salarios mínimos (SMLMV)')).toBeTruthy()
    expect(screen.getByText('Valor en pesos de hoy')).toBeTruthy()
    expect(screen.getByText('Fundamento normativo')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.queryByText('null')).toBeNull()
  })

  it('razonNoEvaluable: null nunca muestra la fila "Razón: no evaluable" (contradiría "¿Se evaluó? Sí" cuando aplica) — nunca inventa una razón', () => {
    render(
      <DetallePasoAuditable
        codigo="AJUSTE_LEGAL"
        datos={{
          pisoEvaluado: { evaluable: true, aplica: false, valorSMLMV: 1, valorPesosDeHoy: 1750905, fundamento: { normaId: 'x', fuente: 'Ley 100', articulo: '35' }, razonNoEvaluable: null },
        }}
      />
    )
    expect(screen.getByText('¿Se evaluó?')).toBeTruthy()
    expect(screen.getByText('¿Aplica?')).toBeTruthy()
    expect(screen.queryByText('Razón: no evaluable')).toBeNull()
  })

  it('razonNoEvaluable con un código real (no nulo) SIGUE mostrando la fila tal cual — la corrección nunca oculta una razón que sí existe', () => {
    render(
      <DetallePasoAuditable
        codigo="AJUSTE_LEGAL"
        datos={{
          pisoEvaluado: { evaluable: false, aplica: null, valorSMLMV: null, valorPesosDeHoy: null, fundamento: null, razonNoEvaluable: 'ELEGIBILIDAD_NO_EVALUABLE' },
        }}
      />
    )
    expect(screen.getByText('Razón: no evaluable')).toBeTruthy()
    expect(screen.getByText('ELEGIBILIDAD_NO_EVALUABLE')).toBeTruthy()
  })
})

describe('DetallePasoAuditable — campo desconocido, nunca se oculta ni inventa una etiqueta', () => {
  it('un campo sin entrada en el diccionario de etiquetas se muestra igual, con la clave humanizada', () => {
    render(<DetallePasoAuditable codigo="RESULTADO_MATEMATICO" datos={{ valor: 1500000, campoFuturoDeContratoF: 'algo' }} />)
    expect(screen.getByText('Campo Futuro De Contrato F')).toBeTruthy()
    expect(screen.getByText('algo')).toBeTruthy()
  })

  it('un código de paso desconocido usa el código literal como título, nunca lo oculta', () => {
    render(<DetallePasoAuditable codigo="PASO_FUTURO_DESCONOCIDO" datos={{ x: 1 }} />)
    expect(screen.getByText('PASO_FUTURO_DESCONOCIDO')).toBeTruthy()
  })
})

describe('DetallePasoAuditable — auditoría: ninguna prop ausente causa una excepción evitable', () => {
  it('datos ausente (undefined) no lanza — se trata como sin campos', () => {
    expect(() => render(<DetallePasoAuditable codigo="RESULTADO_FINAL" />)).not.toThrow()
    expect(screen.getByText('Resultado final')).toBeTruthy()
  })
})

// E7 corrección (2026-09-23, PL-260 §0 punto 6/§8/§9) — prop `pendiente`: el paso sigue
// apareciendo (título visible), pero su valor calculado se reemplaza por la explicación de
// qué política lo bloquea, nunca se omite en silencio.
describe('DetallePasoAuditable — prop pendiente (E7): el paso nunca se omite, pero su valor calculado se retiene', () => {
  it('con pendiente, el título del paso sigue visible pero ningún campo de `datos` se renderiza', () => {
    render(
      <DetallePasoAuditable
        codigo="RESULTADO_FINAL"
        datos={{ valor: 1750905 }}
        pendiente='Pendiente: depende de la política jurídica "PoliticaAnclaIncrementoMujer", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
      />
    )
    expect(screen.getByText('Resultado final')).toBeTruthy()
    expect(
      screen.getByText(
        'Pendiente: depende de la política jurídica "PoliticaAnclaIncrementoMujer", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
      )
    ).toBeTruthy()
    // El valor crudo (1.750.905, formateado o no) nunca aparece cuando el paso está pendiente.
    expect(screen.queryByText('$1.750.905')).toBeNull()
    expect(screen.queryByText('1750905')).toBeNull()
  })

  it('sin pendiente (o null explícito), se comporta exactamente igual que antes — muestra `datos` normalmente', () => {
    render(<DetallePasoAuditable codigo="RESULTADO_FINAL" datos={{ valor: 1750905 }} pendiente={null} />)
    expect(screen.getByText('$1.750.905')).toBeTruthy()
  })
})
