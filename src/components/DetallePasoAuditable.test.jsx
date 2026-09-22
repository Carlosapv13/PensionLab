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
  })

  it('un campo null (ej. razonNoEvaluable) se muestra como "—", nunca "null" crudo ni se oculta la fila', () => {
    render(
      <DetallePasoAuditable
        codigo="AJUSTE_LEGAL"
        datos={{ pisoEvaluado: { evaluable: false, aplica: null, valorSMLMV: null, valorPesosDeHoy: null, fundamento: null, razonNoEvaluable: null } }}
      />
    )
    expect(screen.getByText('Razón: no evaluable')).toBeTruthy()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.queryByText('null')).toBeNull()
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
