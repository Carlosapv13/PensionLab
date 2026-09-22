// @vitest-environment jsdom
//
// Revisión integral post-e1fab3c (2026-09-24) — primer archivo de este repositorio que monta
// <App /> completo (hueco documentado repetidamente en docs/qa/matriz-pruebas-funcionales-mvp.md
// y en varios checkpoints de PL-260: "no existe App.test.jsx"). Se agrega específicamente
// porque esta revisión pide "usar la ruta real de la aplicación... no limitarse a probar una
// función aislada" — este archivo conduce el panel de desarrollo exactamente como lo haría
// Carlos en el navegador: seleccionar fixture → Cargar → Ir, nunca construye props a mano
// para ProyectaTuPensionRPM.jsx (eso ya lo cubre ProyectaTuPensionRPM.test.jsx).
//
// import.meta.env.DEV es `true` bajo Vitest (verificado empíricamente en este checkpoint) —
// PanelDesarrollo.jsx se monta exactamente igual que en `npm run dev`.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { TEXTO_BOTON_CONFIRMAR_CONTINUIDAD } from './components/ConfirmacionContinuidadCotizacion.jsx'

afterEach(() => {
  cleanup()
})

// El panel de desarrollo tiene dos <select> (Fixture / Ir a vista) sin <label> que los
// envuelva (span hermano, no implícitamente asociable — ver PanelDesarrollo.jsx) y varios
// campos de edición individuales con el mismo patrón (span con el nombre de la clave, input
// hermano) — mismo motivo por el que ProyectaTuPensionRPM.test.jsx ya usa querySelector en
// vez de getByLabelText para CampoMonetario. Selectores por posición/contenido, no por label.
async function cargarFixtureYNavegar(user, fixtureId) {
  const selects = document.querySelectorAll('select')
  await user.selectOptions(selects[0], fixtureId)
  await user.click(screen.getByRole('button', { name: 'Cargar' }))
  await user.click(screen.getByRole('button', { name: 'Ir' }))
}

function campoDevPanel(clave) {
  const span = Array.from(document.querySelectorAll('span')).find((s) => s.textContent === clave)
  return span?.parentElement?.querySelector('input')
}

describe('App — Caso A (RPM jurídicamente resuelto) por la ruta real: panel de desarrollo → Proyecta tu pensión', () => {
  it('fixture real "RPM — empleado — Proyecta tu pensión..." (S4-003): cifras visibles antes de confirmar, aviso desaparece al confirmar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await cargarFixtureYNavegar(user, 'rpm-empleado-proyecta-tu-pension')

    expect(screen.getByRole('heading', { name: 'Proyecta tu pensión' })).toBeTruthy()
    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()
    expect(screen.getAllByText('Pensión proyectada mensual (pesos de hoy)').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))

    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()
    expect(screen.queryByText('Este resultado todavía no es una cifra confiable para publicar')).toBeNull()
    expect(document.querySelector('.comparacion-caminos__supuestos[role="status"]')).toBeNull()
  })
})

describe('App — Caso B (política jurídica NO_RESUELTA) por la ruta real: panel de desarrollo → Proyecta tu pensión', () => {
  it('antes de confirmar: "cuantía pendiente" explícita; sin cifras/afirmaciones derivadas en tarjetas, gráfica, orientación ni límites; datos no dependientes visibles', async () => {
    const user = userEvent.setup()
    render(<App />)

    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    expect(screen.getByRole('heading', { name: 'Proyecta tu pensión' })).toBeTruthy()

    // "Cuantía pendiente", claramente indicada — tanto el aviso general como el rótulo por camino.
    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()
    expect(
      screen.getAllByText('Cuantía pendiente: depende de una política jurídica sin resolver (ver Nivel completo).').length
    ).toBeGreaterThan(0)

    // Tarjetas: ninguna cifra en pesos en las celdas de proyección u objetivo, de ningún camino.
    const celdasDisputadas = document.querySelectorAll('.camino-celda--proyeccion, .camino-celda--objetivo')
    expect(celdasDisputadas.length).toBeGreaterThan(0)
    celdasDisputadas.forEach((celda) => {
      expect(celda.textContent).not.toMatch(/\$[\d.]+/)
    })

    // Gráfica: nunca se dibuja.
    expect(document.querySelector('.grafico-esfuerzo-resultado__svg')).toBeNull()
    expect(
      screen.getByText(
        'No mostramos el gráfico de esfuerzo↔resultado: la cuantía que dibujaría depende de la misma política jurídica sin resolver — ver el aviso arriba y el Nivel completo de cada camino.'
      )
    ).toBeTruthy()

    // Orientación: "Qué podrías explorar ahora" y "Camino más alineado" nunca aparecen.
    expect(screen.queryByText('Qué podrías explorar ahora')).toBeNull()
    expect(screen.queryByText('Camino más alineado con tu objetivo y las condiciones que nos diste.')).toBeNull()

    // Limitaciones: ninguna nota deriva una conclusión sobre alcanzar el objetivo.
    expect(screen.queryByText(/sí sería alcanzable/)).toBeNull()

    // Políticas jurídicas: sección propia, visible, con el mensaje jurídico completo — el
    // nombre mostrado es la traducción legible, nunca el identificador interno de código
    // (corrección de auditoría visual 2026-09-25, defecto 2).
    expect(screen.getByText('Políticas jurídicas de este ejercicio')).toBeTruthy()
    expect(document.querySelector('.politicas-juridicas__nombre').textContent).toContain(
      'Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres'
    )
    expect(document.querySelector('.politicas-juridicas__nombre').textContent).not.toContain('PoliticaAnclaIncrementoMujer')

    // Corrección de auditoría visual (2026-09-25, defecto 4) — Tu IBC / Aporte pensional
    // adicional mensual de 'aumentar-ibc-futuro' son la SALIDA de la búsqueda de objetivo
    // (biseccionarEscenarioIbcFuturo), condicionada por la misma tasa de reemplazo en
    // disputa — nunca "Lleva tu IBC de... a..." con esa cifra. 'base' repite el IBC actual
    // (dato de entrada) y permanece visible.
    const columnaBase = screen.getByText('Mantener, en términos reales, tu base de cotización actual hasta tu jubilación.').closest(
      '.camino-columna'
    )
    const columnaAlternativo = screen.getByText('Aumentar tu IBC futuro.').closest('.camino-columna')
    expect(columnaBase).toBeTruthy()
    expect(columnaAlternativo).toBeTruthy()

    expect(columnaBase.querySelector('.camino-celda--ibc').textContent).toMatch(/\$[\d.]+/)
    expect(columnaAlternativo.querySelector('.camino-celda--ibc').textContent).not.toMatch(/\$[\d.]+/)
    expect(columnaAlternativo.querySelector('.camino-celda--ibc').textContent).toContain(
      'IBC propuesto pendiente: depende de una política jurídica sin resolver (ver Nivel completo).'
    )
    expect(columnaAlternativo.querySelector('.camino-celda--esfuerzo').textContent).toContain('Pendiente de la misma cuantía.')
    expect(columnaAlternativo.querySelector('.camino-celda--esfuerzo').textContent).not.toMatch(/\$[\d.]+/)

    // Siete pasos auditables: al expandir cada camino, los 5 dependientes de la tasa de
    // reemplazo en disputa quedan "pendientes" (nunca su valor calculado). DATOS_UTILIZADOS es
    // un dato de entrada real para 'base' — pero para 'aumentar-ibc-futuro' también queda
    // pendiente, porque su valorDeclarado/valorAplicado son exactamente el mismo IBC propuesto
    // condicionado (defecto 4, misma corrección que la tarjeta de arriba).
    //
    // Corrección de auditoría visual, RONDA 2 (2026-09-25, revisión visual de Carlos/Atlas):
    // IBL NO siempre permanece real — para 'aumentar-ibc-futuro' específicamente, ese mismo IBC
    // condicionado alimenta también el cálculo del IBL (valorAplicado, calcularProyeccionRPM.js
    // — cerrado, sin tocar), así que su "IBL aplicable" y su trazabilidadVentana (que embebía
    // el período futuro con el IBC crudo, ej. "Ibc 3.045.477") quedan pendientes también —
    // mismo criterio ya verificado por Carlos/Atlas en la interfaz real (pasoUsaIbcEnDisputaDelCamino,
    // ProyectaTuPensionRPM.helpers.js). Para 'base', en cambio, IBL sí es un dato de entrada
    // real (su propio IBC no depende de ninguna búsqueda) y permanece completo.
    const detallesCompletos = Array.from(document.querySelectorAll('.legal-detail')).filter((d) =>
      d.querySelector('summary')?.textContent.includes('detalle auditable completo')
    )
    expect(detallesCompletos.length).toBeGreaterThan(0)
    for (const detalle of detallesCompletos) {
      await user.click(detalle.querySelector('summary'))
    }
    const pasosPendientes = document.querySelectorAll('.detalle-paso__pendiente')
    expect(pasosPendientes.length).toBeGreaterThan(0)
    pasosPendientes.forEach((p) => expect(p.textContent).not.toMatch(/\$[\d.]+/))

    const pasosBase = Array.from(columnaBase.querySelectorAll('.detalle-paso'))
    const datosUtilizadosBase = pasosBase.find((p) => p.querySelector('.detalle-paso__titulo')?.textContent === 'Datos utilizados')
    expect(datosUtilizadosBase.querySelector('.detalle-paso__pendiente')).toBeNull()
    expect(datosUtilizadosBase.textContent).toMatch(/\$[\d.]+/)

    const iblBase = pasosBase.find((p) => p.querySelector('.detalle-paso__titulo')?.textContent === 'Cálculo del IBL')
    expect(iblBase.querySelector('.detalle-paso__pendiente')).toBeNull()
    expect(iblBase.textContent).toContain('IBL aplicable')
    expect(iblBase.textContent).toContain('Trazabilidad de la ventana usada')
    expect(iblBase.textContent).toMatch(/\$[\d.]+/)

    const pasosAlternativo = Array.from(columnaAlternativo.querySelectorAll('.detalle-paso'))
    const datosUtilizadosAlternativo = pasosAlternativo.find(
      (p) => p.querySelector('.detalle-paso__titulo')?.textContent === 'Datos utilizados'
    )
    expect(datosUtilizadosAlternativo.querySelector('.detalle-paso__pendiente')).toBeTruthy()
    expect(datosUtilizadosAlternativo.textContent).not.toMatch(/\$[\d.]+/)

    // RONDA 2: el paso IBL del camino alternativo también queda pendiente — nunca revela
    // "IBL aplicable" ni la trazabilidadVentana con su período futuro anidado.
    const iblAlternativo = pasosAlternativo.find((p) => p.querySelector('.detalle-paso__titulo')?.textContent === 'Cálculo del IBL')
    expect(iblAlternativo.querySelector('.detalle-paso__pendiente')).toBeTruthy()
    expect(iblAlternativo.textContent).not.toContain('IBL aplicable')
    expect(iblAlternativo.textContent).not.toContain('Trazabilidad de la ventana usada')
    expect(iblAlternativo.textContent).not.toMatch(/\$[\d.]+/)

    expect(screen.getAllByText('IBC declarado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('IBL aplicable').length).toBeGreaterThan(0)

    // Datos NO dependientes de la política: IBC actual y aporte adicional siguen visibles.
    expect(screen.getAllByText('Tu IBC').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Aporte pensional adicional mensual').length).toBeGreaterThan(0)
  })

  it('después de confirmar continuidad: el aviso jurídico permanece (confirmar nunca resuelve una política) y siguen sin aparecer cifras/afirmaciones derivadas', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))

    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()
    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()
    expect(
      screen.getAllByText('Cuantía pendiente: depende de una política jurídica sin resolver (ver Nivel completo).').length
    ).toBeGreaterThan(0)
    expect(document.querySelector('.grafico-esfuerzo-resultado__svg')).toBeNull()
    expect(screen.queryByText('Qué podrías explorar ahora')).toBeNull()

    const celdasDisputadas = document.querySelectorAll('.camino-celda--proyeccion, .camino-celda--objetivo')
    celdasDisputadas.forEach((celda) => {
      expect(celda.textContent).not.toMatch(/\$[\d.]+/)
    })

    // Defecto 4: confirmar continuidad tampoco resuelve la política jurídica — el IBC
    // propuesto y el aporte adicional de 'aumentar-ibc-futuro' siguen pendientes.
    const columnaAlternativo = screen.getByText('Aumentar tu IBC futuro.').closest('.camino-columna')
    expect(columnaAlternativo.querySelector('.camino-celda--ibc').textContent).not.toMatch(/\$[\d.]+/)
    expect(columnaAlternativo.querySelector('.camino-celda--esfuerzo').textContent).not.toMatch(/\$[\d.]+/)
  })

  it('cambiar la edad objetivo invalida una confirmación ya dada — App.jsx real, no un fixture de props aislado', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))
    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()

    const campoEdad = campoDevPanel('edadJubilacionDeseada')
    expect(campoEdad).toBeTruthy()
    await user.clear(campoEdad)
    await user.type(campoEdad, '63')

    // El botón de confirmar vuelve a aparecer — la confirmación se invalidó (actualizarEdadJubilacionDeseada, App.jsx real).
    expect(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeTruthy()
    expect(screen.queryByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeNull()
  })
})

// Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B) — cuatro
// defectos puntuales de presentación (nunca de cálculo): un identificador interno filtrado en
// el aviso general, el nombre crudo de la política jurídica en su propia sección, un título de
// camino que afirma alcanzar el objetivo bajo una política todavía NO_RESUELTA, y (hallazgo
// posterior, misma ronda) el IBC propuesto/aporte adicional del camino 'aumentar-ibc-futuro' —
// salida de una búsqueda condicionada por la misma tasa de reemplazo en disputa, nunca un dato
// de entrada (ver caminoIbcDependeDePoliticaJuridica, ProyectaTuPensionRPM.helpers.js, para la
// trazabilidad completa verificada contra generarCaminosRPM.js/formulaRPM.js). Estas pruebas
// fijan el comportamiento corregido directamente en la ruta real de App — no en una función
// aislada — y confirman que el Caso A jurídicamente resuelto no sufrió regresión.
describe('App — corrección de auditoría visual 2026-09-25: los cuatro defectos de Caso B, y regresión de Caso A', () => {
  it('defecto 1: el aviso general nunca filtra el nombre de campo interno "razonesIncompleto"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()
    expect(screen.queryByText((contenido) => contenido.includes('razonesIncompleto'))).toBeNull()
    expect(screen.queryByText('El ejercicio no está completo — ver razonesIncompleto.')).toBeNull()
    // El reemplazo explícito apunta a la sección real de políticas jurídicas, sin jerga interna.
    expect(
      screen.getByText(
        'Una política jurídica aplicable a este ejercicio no está resuelta — ver "Políticas jurídicas de este ejercicio", abajo.'
      )
    ).toBeTruthy()
  })

  it('defecto 2: en ningún lugar de la pantalla aparece el identificador interno "PoliticaAnclaIncrementoMujer" — solo su traducción legible', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    expect(screen.queryByText((contenido) => contenido.includes('PoliticaAnclaIncrementoMujer'))).toBeNull()
    expect(
      screen.getAllByText('Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres', { exact: false }).length
    ).toBeGreaterThan(0)

    // La misma traducción se usa en el mensaje "pendiente" de Nivel completo por cada paso
    // dependiente de la política — ambos lugares comparten una única fuente de traducción.
    const detalles = Array.from(document.querySelectorAll('.legal-detail')).filter((d) =>
      d.querySelector('summary')?.textContent.includes('detalle auditable completo')
    )
    for (const detalle of detalles) {
      await user.click(detalle.querySelector('summary'))
    }
    expect(
      screen.getAllByText((contenido) => contenido.includes('Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres'))
        .length
    ).toBeGreaterThan(0)
  })

  it('defecto 3: el camino "aumentar-ibc-futuro" nunca afirma alcanzar el objetivo mientras la política jurídica siga NO_RESUELTA (título visible y aria-label)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    expect(screen.queryByText('Aumentar tu IBC futuro para alcanzar tu objetivo.')).toBeNull()
    expect(screen.getByText('Aumentar tu IBC futuro.')).toBeTruthy()
    expect(
      screen.queryByLabelText('Ver el detalle auditable completo del camino: Aumentar tu IBC futuro para alcanzar tu objetivo.')
    ).toBeNull()
    expect(screen.getByLabelText('Ver el detalle auditable completo del camino: Aumentar tu IBC futuro.')).toBeTruthy()
  })

  it('defecto 4: el IBC propuesto y el aporte adicional de "aumentar-ibc-futuro" quedan pendientes (son la salida de la búsqueda de objetivo, no un dato de entrada) — "esfuerzo-adicional-deseado" no existe en este fixture, así que el contraste se verifica contra "base"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-mujer-politica-juridica-no-resuelta')

    const columnaBase = screen
      .getByText('Mantener, en términos reales, tu base de cotización actual hasta tu jubilación.')
      .closest('.camino-columna')
    const columnaAlternativo = screen.getByText('Aumentar tu IBC futuro.').closest('.camino-columna')

    // 'base' repite el IBC actual, un dato declarado — nunca pendiente.
    expect(columnaBase.querySelector('.camino-celda--ibc').textContent).toMatch(/^Tu IBCMantén tu IBC actual en \$[\d.]+\.$/)
    expect(columnaBase.querySelector('.camino-celda--esfuerzo').textContent).toContain('Sin cambios respecto a hoy.')

    // 'aumentar-ibc-futuro': ni "Lleva tu IBC de... a..." ni ningún monto en pesos — la cifra
    // condicionada por la política queda rotulada como pendiente, igual que la pensión.
    expect(columnaAlternativo.querySelector('.camino-celda--ibc').textContent).not.toMatch(/Lleva tu IBC/)
    expect(columnaAlternativo.querySelector('.camino-celda--ibc').textContent).not.toMatch(/\$[\d.]+/)
    expect(columnaAlternativo.querySelector('.camino-celda--esfuerzo').textContent).not.toMatch(/adicionales de aporte/)
    expect(columnaAlternativo.querySelector('.camino-celda--esfuerzo').textContent).not.toMatch(/\$[\d.]+/)
  })

  it('regresión Caso A (jurídicamente resuelto): ninguna de las cuatro correcciones de presentación de Caso B lo afecta — sigue con sus 7 pasos, cifras reales, e IBC/aporte propuestos visibles', async () => {
    const user = userEvent.setup()
    render(<App />)
    await cargarFixtureYNavegar(user, 'rpm-empleado-proyecta-tu-pension')

    // Defecto 4, regresión: el Caso A alcanza su objetivo únicamente vía 'aumentar-ibc-futuro'
    // (sin política jurídica NO_RESUELTA aplicable) — su IBC propuesto y aporte adicional
    // deben seguir siendo cifras reales y visibles, nunca "pendiente".
    const columnaAlternativoA = screen.getByText('Aumentar tu IBC futuro para alcanzar tu objetivo.').closest('.camino-columna')
    expect(columnaAlternativoA.querySelector('.camino-celda--ibc').textContent).toMatch(/Lleva tu IBC de \$[\d.]+ a \$[\d.]+\./)
    expect(columnaAlternativoA.querySelector('.camino-celda--esfuerzo').textContent).toMatch(
      /\$[\d.]+ adicionales de aporte pensional al mes/
    )
    expect(columnaAlternativoA.querySelector('.camino-celda--ibc').textContent).not.toContain('pendiente')
    expect(columnaAlternativoA.querySelector('.camino-celda--esfuerzo').textContent).not.toContain('pendiente')

    // Caso A no tiene política jurídica NO_RESUELTA aplicable — la sección de políticas
    // jurídicas y el mensaje "pendiente" de Nivel completo nunca aparecen.
    expect(screen.queryByText('Políticas jurídicas de este ejercicio')).toBeNull()
    expect(screen.queryByText(/Pendiente: depende de la política jurídica/)).toBeNull()
    expect(screen.queryByText((contenido) => contenido.includes('razonesIncompleto'))).toBeNull()

    // Las cifras siguen visibles y reales — el defecto 3 (neutralizar la decisión de un
    // camino) solo aplica bajo política NO_RESUELTA, nunca aquí.
    expect(screen.getAllByText('Pensión proyectada mensual (pesos de hoy)').length).toBeGreaterThan(0)
    const celdas = document.querySelectorAll('.camino-celda--proyeccion, .camino-celda--objetivo')
    expect(celdas.length).toBeGreaterThan(0)
    const algunaConCifra = Array.from(celdas).some((celda) => /\$[\d.]+/.test(celda.textContent))
    expect(algunaConCifra).toBe(true)

    // Los 7 pasos auditables de Contrato F siguen presentes y con valor real (nunca "pendiente").
    const detalles = Array.from(document.querySelectorAll('.legal-detail')).filter((d) =>
      d.querySelector('summary')?.textContent.includes('detalle auditable completo')
    )
    expect(detalles.length).toBeGreaterThan(0)
    await user.click(detalles[0].querySelector('summary'))
    expect(document.querySelectorAll('.detalle-paso__pendiente').length).toBe(0)
  })
})
