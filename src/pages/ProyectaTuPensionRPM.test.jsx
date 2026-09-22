// @vitest-environment jsdom
//
// E6.5 (PL-260 §9.5/§9.6) — pruebas del flujo conectado: Nivel esencial real (cadena visual
// ya no dormida) + confirmación de continuidad montada dentro de ProyectaTuPensionRPM.jsx.
// Mismo criterio que ConfirmacionContinuidadCotizacion.test.jsx (E6.4, primer archivo
// `.test.jsx` del repositorio): directiva `@vitest-environment jsdom` acotada a este archivo,
// sin `@testing-library/jest-dom`, aserciones con la API de DOM nativa.
//
// `fecha` (hoyISO(), dentro del propio componente) nunca es inyectable desde fuera — a
// diferencia de los `.test.js` de dominio (evaluarPoliticasEjercicioRPM.test.js,
// construirEjercicioResueltoRPM.test.js), que sí pueden fijar `fecha: '2026-01-01'` porque
// llaman a generarCaminosRPM directamente. Este archivo monta el componente real, así que
// usa siempre la fecha real del sistema en el momento de ejecutar las pruebas — mismo
// comportamiento que la pantalla en producción. Los fixtures de este archivo (edades,
// objetivo, fechas de nacimiento) se verificaron empíricamente (2026-09-22) para producir los
// estados de dominio que cada prueba necesita (completo/publicable/política jurídica
// NO_RESUELTA) de forma robusta frente al paso del tiempo: la ventana divergente del
// cronograma C-197/2023 usada en el caso jurídico no publicable abarca varios años de edad y
// de año de nacimiento (verificado con un barrido, no un único punto frágil) — un desfase de
// días/semanas entre la verificación y la ejecución real de la prueba no la cambia. Si algún
// día esa ventana se desplazara lo suficiente para invalidar el fixture, esta prueba
// empezaría a fallar de forma visible (nunca en falso positivo silencioso) y necesitaría un
// nuevo fixture verificado del mismo modo.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { obtenerSmlv } from '../data/legal/index.js'
import ProyectaTuPensionRPM from './ProyectaTuPensionRPM.jsx'
import { TEXTO_BOTON_CONFIRMAR_CONTINUIDAD, TEXTO_DISCLOSURE_CONTINUIDAD } from '../components/ConfirmacionContinuidadCotizacion.jsx'

afterEach(() => {
  cleanup()
})

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}
function periodoAnioCompleto(anio, ibc) {
  return { fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc, diasCotizados: esBisiesto(anio) ? 366 : 365 }
}
function historiaAnios(desde, hasta) {
  const periodos = []
  for (let anio = desde; anio <= hasta; anio++) periodos.push(periodoAnioCompleto(anio, 1000000 + anio))
  return periodos
}

// Handlers no-operativos para las props obligatorias que ninguna de estas pruebas ejercita
// (navegación desde el resumen revisable, profundizar historia, volver) — mismo criterio que
// el resto del dominio: nunca se omite una prop obligatoria por comodidad.
const NOOP = () => {}

// --- Fixture Hombre (verificado empíricamente, 2026-09-22): historia real, ejercicio
// completo, sin ninguna política jurídica involucrada (PoliticaAnclaIncrementoMujer solo
// puede aplicar con sexo 'Mujer') — único bloqueo real antes de confirmar es
// CONFIRMACION_AUSENTE (Contrato F la exige siempre, sin importar
// elegibilidad.ritmoCotizacionFutura — comportamiento ya cerrado de Contrato F, no de este
// checkpoint). objetivoPensionMensual deliberadamente por encima del SMLV vigente (piso legal
// — ver objetivoInferiorAlPisoLegal en ProyectaTuPensionRPM.helpers.js): un objetivo por
// debajo del piso legal bloquea la generación de caminos por completo, antes de llegar
// siquiera a la cadena visual.
function propsHombreCompleto(overrides = {}) {
  return {
    historiaCotizacion: historiaAnios(1990, 2025),
    regimenActual: 'RPM',
    sexo: 'Hombre',
    fechaNacimiento: '1964-01-01',
    certezaBaseCotizacion: 'conocido',
    valorBaseCotizacionDeclarado: '2000000',
    tipoCotizante: 'empleado',
    lugarCotizacion: 'colombia',
    salarioParaEstimarBase: '',
    nivelConocimientoSemanas: 'desconocido',
    semanasCotizadas: '',
    onEditarFechaNacimiento: NOOP,
    onEditarRegimenActual: NOOP,
    onEditarSemanasDeclaradas: NOOP,
    onEditarTraslado: NOOP,
    onProfundizarHistoria: NOOP,
    edadJubilacionDeseada: '64',
    onCambiarEdadJubilacionDeseada: NOOP,
    objetivoPensionMensual: '2500000',
    onCambiarObjetivoPensionMensual: NOOP,
    restriccionCostoPensionalAdicionalMaximoMensual: '',
    onCambiarRestriccionCostoPensionalAdicionalMaximoMensual: NOOP,
    onVolver: NOOP,
    ...overrides,
  }
}

// --- Fixture Mujer (verificado empíricamente, 2026-09-22): mismo patrón, pero con
// edad/fecha de nacimiento dentro de la ventana en que C-197/2023 no resuelve expresamente
// si el ancla del incremento de tasa de reemplazo es fija (1.300 semanas) o dinámica por
// sexo/fecha — PoliticaAnclaIncrementoMujer queda NO_RESUELTA/aplicaAEsteEjercicio:true, lo
// que Contrato F traduce en completo:false (POLITICA_JURIDICA_NO_RESUELTA) y, en cascada,
// publicable:false (EJERCICIO_NO_COMPLETO) — el caso "jurídico no publicable" pedido para
// este checkpoint. objetivoPensionMensual = SMLV vigente exacto (no por debajo: el piso legal
// bloquea con < estricto, nunca con ==).
function propsMujerJuridicoNoPublicable(overrides = {}) {
  const smlv = obtenerSmlv(hoyISO()).valor
  return propsHombreCompleto({
    sexo: 'Mujer',
    fechaNacimiento: '1974-01-01',
    edadJubilacionDeseada: '61',
    nivelConocimientoSemanas: 'conocido',
    semanasCotizadas: '1039',
    valorBaseCotizacionDeclarado: String(smlv),
    objetivoPensionMensual: String(smlv),
    ...overrides,
  })
}

// --- Fixture Mujer, jurídico NO_RESUELTA + RESTRICCION_COSTO_LIMITA_RESULTADO (verificado
// empíricamente, 2026-09-23, corrección posterior de auditoría "todo lugar visible"): mismo
// perfil que propsMujerJuridicoNoPublicable, con un objetivo muy alto (fuerza bisección →
// camino 'aumentar-ibc-futuro') y una restricción de costo baja (50000, más estricta que el
// tope legal) — produce el camino alternativo con la limitación
// RESTRICCION_COSTO_LIMITA_RESULTADO ("...tu objetivo sí sería alcanzable dentro del tope
// legal"), una conclusión derivada de la misma cuantía en disputa que la política jurídica
// NO_RESUELTA de este mismo ejercicio deja sin resolver.
function propsMujerJuridicoConRestriccion(overrides = {}) {
  const smlv = obtenerSmlv(hoyISO()).valor
  return propsMujerJuridicoNoPublicable({
    objetivoPensionMensual: String(smlv * 5),
    restriccionCostoPensionalAdicionalMaximoMensual: '50000',
    ...overrides,
  })
}

// --- Fixture Mujer, jurídico NO_RESUELTA + camino alternativo VIABLE, sin restricción
// (verificado empíricamente, 2026-09-25, ronda 2 de la revisión visual de Carlos/Atlas sobre
// el Caso B): mismo perfil que propsMujerJuridicoNoPublicable, con un objetivo moderadamente
// más alto (fuerza bisección → camino 'aumentar-ibc-futuro') pero SIN restricción de costo —
// a diferencia de propsMujerJuridicoConRestriccion (que fuerza el descarte del alternativo por
// RESTRICCION_COSTO_LIMITA_RESULTADO), aquí el alternativo queda `estado: 'viable'`, con su
// propio control de Nivel completo — el caso exacto de la captura de Carlos: la tarjeta
// resumida oculta el IBC/aporte/resultado, pero el Nivel completo del camino alternativo debía
// seguir ocultando también IBL aplicable y trazabilidadVentana (antes de esta corrección, no
// lo hacía). `objetivoPensionMensual = smlv * 1.3` verificado con el barrido de este archivo:
// produce exactamente 2 columnas (base + aumentar-ibc-futuro), ambas viables, ninguna
// descartada.
function propsMujerJuridicoConAlternativoViable(overrides = {}) {
  const smlv = obtenerSmlv(hoyISO()).valor
  return propsMujerJuridicoNoPublicable({
    objetivoPensionMensual: String(Math.round(smlv * 1.3)),
    ...overrides,
  })
}

// --- Fixture Hombre con un camino descartado (verificado empíricamente, 2026-09-22): mismo
// perfil que propsHombreCompleto, con un objetivo tan alto que ni el tope legal lo alcanza —
// produce un camino 'base' viable Y un camino 'aumentar-ibc-futuro' descartado
// (OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE) en el mismo ejercicio. Único fixture de este archivo con
// dos caminos — necesario para probar que Nivel completo nunca ofrece un <details> vacío sobre
// un camino descartado (I7: pasos:[] para un descartado, ver construirEjercicioResueltoRPM.js).
function propsHombreConCaminoDescartado(overrides = {}) {
  return propsHombreCompleto({ objetivoPensionMensual: '6000000', ...overrides })
}

// --- "Caso A": reproducción exacta del fixture real del panel de desarrollo "RPM — empleado
// — Proyecta tu pensión, objetivo alcanzable mediante bisección (S4-003)" (src/dev/fixtures.js)
// — el mismo que revisó Carlos por captura de pantalla (2026-09-24). Verificado
// empíricamente: el camino 'base' NO alcanza el objetivo por sí solo; solo
// 'aumentar-ibc-futuro' lo alcanza — orientacionExploracion.codigo ===
// 'SIN_CAMINO_PERSONALIZADO_OBJETIVO_ALCANZABLE' ("Tu objetivo es alcanzable con un esfuerzo
// adicional mensual"), sin política jurídica involucrada (sexo Hombre).
function propsCasoA(overrides = {}) {
  return {
    historiaCotizacion: [
      { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
      { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
    ],
    regimenActual: 'RPM',
    sexo: 'Hombre',
    fechaNacimiento: '1978-02-11',
    certezaBaseCotizacion: 'conocido',
    valorBaseCotizacionDeclarado: '2900000',
    tipoCotizante: 'empleado',
    lugarCotizacion: 'colombia',
    salarioParaEstimarBase: '',
    nivelConocimientoSemanas: 'aproximado',
    semanasCotizadas: '527',
    onEditarFechaNacimiento: NOOP,
    onEditarRegimenActual: NOOP,
    onEditarSemanasDeclaradas: NOOP,
    onEditarTraslado: NOOP,
    onProfundizarHistoria: NOOP,
    edadJubilacionDeseada: '65',
    onCambiarEdadJubilacionDeseada: NOOP,
    objetivoPensionMensual: '3500000',
    onCambiarObjetivoPensionMensual: NOOP,
    restriccionCostoPensionalAdicionalMaximoMensual: '',
    onCambiarRestriccionCostoPensionalAdicionalMaximoMensual: NOOP,
    onVolver: NOOP,
    ...overrides,
  }
}

describe('ProyectaTuPensionRPM — Nivel esencial conectado (E6.5, PL-260 §9.5/§9.6)', () => {
  it('sin confirmación: muestra el disclosure, el botón de confirmar, y advierte que la cifra todavía no es publicable — sin ocultar la cifra', () => {
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)

    expect(screen.getByText(TEXTO_DISCLOSURE_CONTINUIDAD)).toBeTruthy()
    expect(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeTruthy()

    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()
    expect(screen.getByText('No existe una confirmación válida del supuesto de continuidad de cotización.')).toBeTruthy()

    // La cifra sigue visible — invalidar/advertir nunca oculta el resultado, solo aclara que
    // todavía no es confiable (decisión explícita de E6.5, ver comentario del bloque JSX).
    expect(screen.getAllByText('Pensión proyectada mensual (pesos de hoy)').length).toBeGreaterThan(0)
  })

  it('clic en confirmar emite exactamente el objeto que Contrato F espera (edad ya validada, no el texto crudo)', async () => {
    const user = userEvent.setup()
    const onConfirmarContinuidad = vi.fn()
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} onConfirmarContinuidad={onConfirmarContinuidad} />)

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))

    expect(onConfirmarContinuidad).toHaveBeenCalledTimes(1)
    expect(onConfirmarContinuidad).toHaveBeenCalledWith({
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    })
  })

  it('con una confirmación vigente para la edad actual: oculta la advertencia de no publicable, muestra el estado confirmado', () => {
    const confirmacion = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    }
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={confirmacion} />)

    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()
    expect(screen.queryByText('Este resultado todavía no es una cifra confiable para publicar')).toBeNull()
    expect(screen.queryByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeNull()
  })
})

describe('ProyectaTuPensionRPM — invalidación de la confirmación (E6.5, PL-260 §9.4) vista desde el flujo conectado', () => {
  // App.jsx invalida (vuelve a null) confirmacionContinuidad cuando cambia edad objetivo,
  // sexo, régimen actual o fecha de nacimiento — la consecuencia observable de esa
  // invalidación, en esta pantalla, es que una confirmación para una edad distinta a la
  // actual nunca se trata como vigente: vuelve a pedirse, y Contrato F reporta
  // CONFIRMACION_EDAD_NO_COINCIDE en vez de aceptarla en silencio. Esta prueba verifica esa
  // consecuencia con la edad YA cambiada (equivalente a lo que ve la persona justo después de
  // que App.jsx invalidó y ella vuelve a confirmar para la nueva edad).
  it('una confirmación existente para una edad objetivo distinta de la actual no se trata como vigente, y Contrato F reporta CONFIRMACION_EDAD_NO_COINCIDE', () => {
    const confirmacionParaOtraEdad = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 60,
    }
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} edadJubilacionDeseada="64" confirmacionContinuidad={confirmacionParaOtraEdad} />)

    // Vuelve a mostrarse el botón — la confirmación obsoleta nunca se presenta como vigente.
    expect(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeTruthy()
    expect(screen.queryByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeNull()

    // Contrato F distingue esta causa de una confirmación simplemente ausente — ambas razones
    // coexisten (ver evaluarPublicable, construirEjercicioResueltoRPM.js): la confirmación
    // existe, pero para una edad que ya no es la actual.
    expect(
      screen.getByText('La confirmación existente corresponde a una edad objetivo distinta de la actual.')
    ).toBeTruthy()
  })

  // E7 (auditoría adversarial, PL-260 §9.4): el reverso del caso anterior — objetivo
  // económico, IBC/base de cotización, límite de esfuerzo e historia de cotización NUNCA
  // invalidan la confirmación (decisión ya aprobada, E6.4). App.jsx ya lo implementa así (sus
  // setters crudos, sin wrapper de invalidación) — esta prueba verifica el otro extremo de la
  // cadena: que ProyectaTuPensionRPM.jsx tampoco descarta la confirmación por su cuenta
  // cuando estos datos cambian entre renders (no reimplementa ni duplica la regla de
  // invalidación con un criterio propio y potencialmente distinto).
  it('cambiar objetivo económico, IBC/base de cotización, límite de esfuerzo o historia de cotización, con la misma edad/sexo/régimen/fecha de nacimiento, NUNCA descarta una confirmación vigente', () => {
    const confirmacion = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    }
    const { rerender } = render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={confirmacion} />)
    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()

    rerender(
      <ProyectaTuPensionRPM
        {...propsHombreCompleto({
          objetivoPensionMensual: '3200000',
          valorBaseCotizacionDeclarado: '2600000',
          restriccionCostoPensionalAdicionalMaximoMensual: '150000',
          historiaCotizacion: historiaAnios(1995, 2025),
        })}
        confirmacionContinuidad={confirmacion}
      />
    )

    // Misma confirmación (misma referencia, App.jsx nunca la tocó) — sigue vigente. Nunca
    // vuelve a mostrarse el botón de confirmar tras este cambio.
    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeNull()
  })
})

describe('ProyectaTuPensionRPM — caso jurídico no publicable (E6.5/E7, PL-260 §0.6/§9 E9)', () => {
  it('con una política jurídica NO_RESUELTA aplicable, el ejercicio queda incompleto/no publicable y la pantalla lo declara explícitamente, sin filtrar vocabulario interno', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)

    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()

    // Corrección de auditoría visual (2026-09-25): el aviso principal ya no repite el
    // identificador interno de la política ni el nombre del campo "razonesIncompleto" —
    // apunta a la sección propia, que sí desglosa cada política con su nombre traducido.
    expect(
      screen.getByText(
        'Una política jurídica aplicable a este ejercicio no está resuelta — ver "Políticas jurídicas de este ejercicio", abajo.'
      )
    ).toBeTruthy()
    expect(screen.queryByText((contenido) => contenido.includes('PoliticaAnclaIncrementoMujer'))).toBeNull()
    // EJERCICIO_NO_COMPLETO era puramente redundante con el mensaje anterior (Contrato F solo
    // lo agrega cuando razonesIncompleto ya no está vacío) y nombraba el campo interno
    // "razonesIncompleto" — se suprime, sin perder ninguna información real.
    expect(screen.queryByText('El ejercicio no está completo — ver razonesIncompleto.')).toBeNull()
  })

  // E7 (auditoría adversarial, 2026-09-23): PL-260 §0 punto 6 ("Ningún Preview puede
  // presentar como resultado confiable una cifra construida sobre una política NO_RESUELTA")
  // y §9 E9 ("se muestra el estado intermedio honesto — elegibilidad confirmada, cuantía
  // pendiente de regla jurídica") exigen retener el número, no solo rotularlo. La versión
  // anterior de E6.5 seguía mostrando el $ tal cual junto a un aviso — corregido aquí.
  it('E7: la cifra de "Pensión proyectada mensual" NUNCA se muestra como número cuando la razón es una política jurídica NO_RESUELTA — se reemplaza por el estado pendiente, nunca se oculta el hecho de que existe un camino', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)

    expect(screen.getAllByText('Pensión proyectada mensual (pesos de hoy)').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText('Cuantía pendiente: depende de una política jurídica sin resolver (ver Nivel completo).').length
    ).toBeGreaterThan(0)
    // Ningún $ de pensión proyectada visible en la celda de proyección — nunca una cifra que
    // dependa en silencio de la interpretación jurídica todavía no elegida. Se acota a esta
    // celda porque "Tu IBC" (otra celda) sí sigue mostrando su propia cifra en pesos —
    // deliberadamente, ver la prueba de más abajo.
    const celdasProyeccion = document.querySelectorAll('.camino-celda--proyeccion')
    expect(celdasProyeccion.length).toBeGreaterThan(0)
    celdasProyeccion.forEach((celda) => {
      expect(celda.textContent).not.toMatch(/\$[\d.]+/)
    })
    // "Frente a tu objetivo" depende de la misma cuantía — también pendiente, nunca afirmado.
    expect(screen.getAllByText('Pendiente de la misma cuantía.').length).toBeGreaterThan(0)
  })

  // E7 corrección posterior (2026-09-23, sobre el commit 465e045): la primera versión de
  // esta corrección retenía la cifra en la tarjeta/gráfica pero el Nivel completo seguía
  // exponiendo el valor crudo de RESULTADO_FINAL (y los demás pasos derivados de la tasa de
  // reemplazo en disputa) sin ninguna advertencia — la misma cifra silenciosa que PL-260 §0
  // punto 6 prohíbe, un nivel más abajo. Esta prueba verifica la corrección: los 5 pasos que
  // dependen de la tasa de reemplazo en disputa (TASA_REEMPLAZO en adelante) NUNCA exponen
  // su valor calculado — el paso sigue apareciendo (nunca se omite en silencio, PL-260 §8),
  // pero con el mensaje de qué política lo bloquea. DATOS_UTILIZADOS e IBL, en cambio, son
  // datos de entrada (no el resultado en disputa) y siguen mostrando su valor real completo.
  it('E7: el Nivel completo NUNCA expone el valor calculado de los 5 pasos que dependen de la tasa de reemplazo en disputa — el paso aparece con el mensaje de qué política lo bloquea, nunca se omite', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)

    await user.click(screen.getAllByText('Ver el detalle auditable completo de este camino')[0])

    // Los 7 pasos siguen apareciendo — nunca se omite ninguno en silencio.
    for (const titulo of [
      'Datos utilizados',
      'Cálculo del IBL',
      'Tasa de reemplazo',
      'Resultado matemático (antes del ajuste legal)',
      'Ajuste legal (piso y techo)',
      'Resultado final',
      'Comparación contra tu objetivo',
    ]) {
      expect(screen.getAllByText(titulo).length).toBeGreaterThan(0)
    }

    // Los 5 pasos dependientes muestran el mensaje de "pendiente" — nunca su valor calculado.
    const mensajesPendientes = screen.getAllByText(
      'Pendiente: depende de la política jurídica "Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
    )
    expect(mensajesPendientes.length).toBe(5)
    // Ninguna cifra en pesos dentro de un bloque .detalle-paso__pendiente.
    document.querySelectorAll('.detalle-paso__pendiente').forEach((bloque) => {
      expect(bloque.textContent).not.toMatch(/\$[\d.]+/)
    })

    // DATOS_UTILIZADOS e IBL (datos de entrada, no el resultado en disputa) SÍ muestran su
    // valor real — verificado con un campo conocido de cada uno.
    expect(screen.getByText('IBC declarado')).toBeTruthy()
    expect(screen.getByText('IBL aplicable')).toBeTruthy()
    expect(document.querySelectorAll('.detalle-paso__valor').length).toBeGreaterThan(0)

    expect(screen.getByText('Políticas jurídicas de este ejercicio')).toBeTruthy()
  })

  // Corrección de auditoría visual, RONDA 2 (2026-09-25, revisión visual de Carlos/Atlas sobre
  // el Caso B, posterior a la ronda anterior): la ronda anterior ocultó el IBC/aporte/
  // resultado en la tarjeta resumida y DATOS_UTILIZADOS en el Nivel completo del camino
  // 'aumentar-ibc-futuro' — pero el paso "Cálculo del IBL" (IBL aplicable, y sobre todo
  // trazabilidadVentana, que embebe el período futuro con el IBC crudo disputado dentro de un
  // objeto anidado) seguía mostrando su valor real, volviendo a filtrar indirectamente la
  // misma cifra ($3.045.477 en la captura real de Carlos). Este fixture (objetivo = smlv*1.3,
  // sin restricción) produce el alternativo VIABLE — no descartado — para poder expandir su
  // Nivel completo y verificar la corrección completa.
  it('RONDA 2 — regresión (Caso B): el camino alternativo VIABLE bajo política NO_RESUELTA oculta también IBL aplicable y trazabilidadVentana (incluido el período futuro anidado) — los 7 pasos quedan pendientes, ninguno expone una cifra', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoConAlternativoViable()} confirmacionContinuidad={null} />)

    // Confirma que este fixture realmente combina las tres condiciones que motivaron la
    // corrección — si dejara de hacerlo, esta prueba debe fallar de forma visible, nunca pasar
    // vacía sin haber ejercitado el caso real.
    expect(screen.getByText('Políticas jurídicas de este ejercicio')).toBeTruthy()
    const columnas = document.querySelectorAll('.camino-columna')
    expect(columnas.length).toBe(2)

    for (const control of screen.getAllByText('Ver el detalle auditable completo de este camino')) {
      await user.click(control)
    }

    // Localiza la columna del camino alternativo por su título ya traducido (textoDecisionCamino)
    // — nunca por posición, que no está garantizada por ordenarCaminosParaPresentacion.
    const columnaAlternativa = Array.from(columnas).find((c) =>
      c.querySelector('.camino-celda--encabezado')?.textContent.includes('Aumentar tu IBC futuro.')
    )
    expect(columnaAlternativa).toBeTruthy()
    const columnaBase = Array.from(columnas).find((c) => c !== columnaAlternativa)

    // Los 7 pasos del camino alternativo quedan pendientes — incluidos DATOS_UTILIZADOS e IBL,
    // que para los demás caminos son datos de entrada visibles (ver E7, arriba). Ninguno
    // expone su tabla de campos real (`.detalle-paso__campos`/`.detalle-paso__valor`).
    expect(columnaAlternativa.querySelectorAll('.detalle-paso__pendiente').length).toBe(7)
    expect(columnaAlternativa.querySelectorAll('.detalle-paso__valor').length).toBe(0)
    expect(columnaAlternativa.querySelectorAll('.detalle-paso__campos').length).toBe(0)

    // Ninguna cifra en pesos (ni la del IBC/aporte/resultado, ni la del IBL, ni ninguna otra)
    // aparece en ningún lugar del DOM de la columna alternativa — ni en la tarjeta resumida ni
    // en el Nivel completo expandido.
    expect(columnaAlternativa.textContent).not.toMatch(/\$[\d.]+/)

    // El paso "Cálculo del IBL" específicamente muestra el mensaje de pendiente — nunca "IBL
    // aplicable" con un valor, nunca "Trazabilidad de la ventana usada" con el período futuro
    // anidado (Fecha Desde/Fecha Hasta/Ibc/Días Cotizados/Es Escenario Futuro).
    const bloqueIblAlternativo = Array.from(columnaAlternativa.querySelectorAll('.detalle-paso')).find(
      (b) => b.querySelector('.detalle-paso__titulo')?.textContent === 'Cálculo del IBL'
    )
    expect(bloqueIblAlternativo).toBeTruthy()
    expect(bloqueIblAlternativo.querySelector('.detalle-paso__pendiente')).toBeTruthy()
    expect(bloqueIblAlternativo.textContent).not.toContain('IBL aplicable')
    expect(bloqueIblAlternativo.textContent).not.toContain('Trazabilidad de la ventana usada')
    expect(bloqueIblAlternativo.textContent).not.toContain('Es Escenario Futuro')
    expect(bloqueIblAlternativo.textContent).not.toContain('Fecha Desde')

    // El camino BASE es independiente de la política (caminoIbcDependeDePoliticaJuridica lo
    // confirma false) — sigue mostrando su IBC actual, su IBL real y su trazabilidadVentana
    // completa, sin ningún cambio por esta corrección.
    expect(columnaBase.textContent).toContain('IBL aplicable')
    expect(columnaBase.textContent).toContain('Trazabilidad de la ventana usada')
    expect(columnaBase.querySelectorAll('.detalle-paso__valor').length).toBeGreaterThan(0)
    // El camino base SÍ tiene cifras en pesos visibles (su propio IBC/IBL/resultado, ninguno
    // en disputa) — confirma que la corrección no oculta de más.
    expect(columnaBase.textContent).toMatch(/\$[\d.]+/)
  })

  // Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B): el campo
  // `origen` de DATOS_UTILIZADOS (dato de entrada, nunca en disputa para el camino 'base' —
  // caminoIbcDependeDePoliticaJuridica lo confirma false) mostraba literalmente
  // `continuidad_ibc_actual` (generarCaminosRPM.js) en vez de una frase legible. Se verifica
  // aquí, y de paso que ningún identificador interno de código conocido (origen del camino,
  // razón de vida laboral no evaluada) escape a texto crudo en ningún lugar de la pantalla.
  it('regresión (Caso B): "Origen del dato" muestra una frase legible, nunca el identificador interno crudo del camino', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)
    await user.click(screen.getAllByText('Ver el detalle auditable completo de este camino')[0])

    expect(screen.getByText('Mismo IBC que tu situación actual, sin cambio')).toBeTruthy()

    const texto = document.body.textContent
    for (const identificadorInterno of [
      'continuidad_ibc_actual',
      'busqueda_objetivo_rpm',
      'VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA',
      'SEMANAS_TOTALES_INSUFICIENTES',
      'DATOS_LEGALES_INSUFICIENTES',
    ]) {
      expect(texto).not.toContain(identificadorInterno)
    }
  })

  it('E7: el mensaje de "paso pendiente" sigue presente tanto con el detalle cerrado como expandido, y después de confirmar continuidad', async () => {
    const user = userEvent.setup()
    const onConfirmarContinuidad = vi.fn()
    render(
      <ProyectaTuPensionRPM
        {...propsMujerJuridicoNoPublicable()}
        confirmacionContinuidad={null}
        onConfirmarContinuidad={onConfirmarContinuidad}
      />
    )

    // Con el detalle cerrado, el <details> sigue montado (oculto por el navegador, no por
    // React) — el mensaje ya está en el DOM antes de expandir.
    expect(
      screen.getAllByText(
        'Pendiente: depende de la política jurídica "Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
      ).length
    ).toBe(5)

    await user.click(screen.getAllByText('Ver el detalle auditable completo de este camino')[0])
    expect(
      screen.getAllByText(
        'Pendiente: depende de la política jurídica "Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
      ).length
    ).toBe(5)

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))
    const confirmacionEmitida = onConfirmarContinuidad.mock.calls[0][0]
    cleanup()
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={confirmacionEmitida} />)

    // Confirmar continuidad nunca resuelve la política jurídica — los 5 pasos siguen
    // pendientes exactamente igual.
    expect(
      screen.getAllByText(
        'Pendiente: depende de la política jurídica "Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres", todavía sin resolver — ver "Políticas jurídicas de este ejercicio", abajo.'
      ).length
    ).toBe(5)
  })

  // E7 corrección: "Camino más alineado", "Qué podrías explorar ahora" y el subtítulo final
  // de orientación son conclusiones derivadas de comparar la cuantía en disputa entre
  // caminos — nunca deben afirmarse bajo una política jurídica NO_RESUELTA.
  it('E7: "Camino más alineado" y "Qué podrías explorar ahora" nunca aparecen cuando hay una política jurídica NO_RESUELTA aplicable', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)
    expect(screen.queryByText('Camino más alineado con tu objetivo y las condiciones que nos diste.')).toBeNull()
    expect(screen.queryByText('Qué podrías explorar ahora')).toBeNull()
  })

  // Corrección posterior (2026-09-24, revisión integral del caso jurídico NO_RESUELTA): con
  // el objetivo declarado exactamente en el piso legal, el camino 'base' de este mismo
  // fixture "ya alcanza" el objetivo bajo la interpretación con la que generarCaminosRPM.js
  // calculó (verificado empíricamente: orientacionExploracion.codigo ===
  // 'HOY_YA_ALCANZA_OBJETIVO', coexistiendo con la política NO_RESUELTA) — el hint bajo "Ver
  // qué ocurriría con otro esfuerzo" (corregido en la ronda anterior por una contradicción de
  // copy distinta) seguía afirmando "no es necesaria para alcanzar tu objetivo" en este
  // estado, la misma cifra silenciosa que el resto de la pantalla ya retiene.
  it('corrección: el hint de "Ver qué ocurriría con otro esfuerzo" nunca afirma "no es necesaria para alcanzar tu objetivo" bajo una política jurídica NO_RESUELTA, ni siquiera cuando HOY_YA_ALCANZA_OBJETIVO coincide', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)

    // Confirma que este fixture realmente combina ambas condiciones — si dejara de hacerlo,
    // esta prueba debe fallar de forma visible, nunca pasar vacía sin haber ejercitado el
    // caso real que motivó la corrección.
    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()

    expect(screen.queryByText(/no es necesaria para alcanzar tu objetivo/)).toBeNull()
    expect(
      screen.getByText('Es una simulación opcional, independiente de los caminos ya comparados arriba — nunca una recomendación de aportar más.')
    ).toBeTruthy()
  })

  it('regresión: sin política jurídica NO_RESUELTA, HOY_YA_ALCANZA_OBJETIVO sigue mostrando el hint original exacto — la corrección no lo oculta siempre', () => {
    // Reutiliza el mismo fixture/objetivo ya verificado para HOY_YA_ALCANZA_OBJETIVO sin
    // política jurídica (ver describe "corrección de auditoría visual... Caso A", abajo).
    render(<ProyectaTuPensionRPM {...propsCasoA({ objetivoPensionMensual: '2000000' })} confirmacionContinuidad={null} />)
    expect(
      screen.getByText('Es una simulación opcional — no es necesaria para alcanzar tu objetivo ni una recomendación de aportar más.')
    ).toBeTruthy()
  })

  it('E7: el gráfico de esfuerzo↔resultado tampoco se dibuja — traza la misma cuantía pendiente (coherencia resumen↔gráfica)', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)
    expect(document.querySelector('.grafico-esfuerzo-resultado__svg')).toBeNull()
    expect(
      screen.getByText('No mostramos el gráfico de esfuerzo↔resultado: la cuantía que dibujaría depende de la misma política jurídica sin resolver — ver el aviso arriba y el Nivel completo de cada camino.')
    ).toBeTruthy()
  })

  it('E7: "Tu IBC" y "Aporte pensional adicional mensual" siguen visibles — no dependen de la política de tasa de reemplazo en disputa', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)
    expect(screen.getAllByText('Tu IBC').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Aporte pensional adicional mensual').length).toBeGreaterThan(0)
  })

  // Corrección posterior (2026-09-23) — hallazgo de la auditoría "todo lugar visible donde
  // pueda aparecer un dato derivado" pedida explícitamente por Carlos/Atlas:
  // RESTRICCION_COSTO_LIMITA_RESULTADO ("...tu objetivo sí sería alcanzable dentro del tope
  // legal") es una conclusión derivada de la misma cuantía en disputa, y aparecía sin filtrar
  // como nota específica de un camino. Este fixture combina, con datos reales, la política
  // jurídica NO_RESUELTA con una restricción de costo que dispara esa limitación.
  it('corrección: RESTRICCION_COSTO_LIMITA_RESULTADO ("tu objetivo sí sería alcanzable...") nunca aparece bajo una política jurídica NO_RESUELTA — ni como nota común ni como nota específica de un camino', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoConRestriccion()} confirmacionContinuidad={null} />)

    // Confirma que este fixture realmente combina ambas condiciones — si dejara de hacerlo
    // (ej. por un cambio futuro en generarCaminosRPM.js), esta prueba debe fallar de forma
    // visible, nunca pasar vacía sin haber ejercitado el caso real.
    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()

    expect(
      screen.queryByText(
        'El límite que declaraste para tu aporte pensional adicional impidió alcanzar tu objetivo — sin esa restricción, tu objetivo sí sería alcanzable dentro del tope legal.'
      )
    ).toBeNull()
  })

  it('regresión: sin política jurídica NO_RESUELTA, la misma limitación de restricción de costo SÍ se muestra — la corrección no la oculta siempre', () => {
    render(
      <ProyectaTuPensionRPM
        {...propsHombreCompleto({
          objetivoPensionMensual: '5000000',
          restriccionCostoPensionalAdicionalMaximoMensual: '50000',
        })}
        confirmacionContinuidad={null}
      />
    )
    expect(
      screen.getByText(
        'El límite que declaraste para tu aporte pensional adicional impidió alcanzar tu objetivo — sin esa restricción, tu objetivo sí sería alcanzable dentro del tope legal.'
      )
    ).toBeTruthy()
  })

  it('confirmar continuidad en el caso jurídico NO_RESUELTA nunca alcanza para volverlo publicable (completo:false es independiente de la confirmación), y la cifra sigue retenida', async () => {
    const user = userEvent.setup()
    const onConfirmarContinuidad = vi.fn()
    render(
      <ProyectaTuPensionRPM
        {...propsMujerJuridicoNoPublicable()}
        confirmacionContinuidad={null}
        onConfirmarContinuidad={onConfirmarContinuidad}
      />
    )

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))
    expect(onConfirmarContinuidad).toHaveBeenCalledTimes(1)

    const confirmacionEmitida = onConfirmarContinuidad.mock.calls[0][0]
    cleanup()
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={confirmacionEmitida} />)

    // CONFIRMACION_AUSENTE ya no aplica (sí se confirmó), pero la advertencia se mantiene por
    // la razón jurídica, que ninguna confirmación de continuidad puede resolver.
    expect(screen.getByText('Este resultado todavía no es una cifra confiable para publicar')).toBeTruthy()
    expect(
      screen.getByText(
        'Una política jurídica aplicable a este ejercicio no está resuelta — ver "Políticas jurídicas de este ejercicio", abajo.'
      )
    ).toBeTruthy()
    expect(screen.queryByText('El ejercicio no está completo — ver razonesIncompleto.')).toBeNull()
    expect(screen.queryByText('No existe una confirmación válida del supuesto de continuidad de cotización.')).toBeNull()
    expect(
      screen.getAllByText('Cuantía pendiente: depende de una política jurídica sin resolver (ver Nivel completo).').length
    ).toBeGreaterThan(0)
  })
})

describe('ProyectaTuPensionRPM — revisión de auditoría E6.5 (2026-09-22): rótulo inline junto a la cifra', () => {
  it('sin confirmación, la cifra misma queda rotulada como no confiable — no solo el aviso separado de arriba', () => {
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)
    // propsHombreCompleto puede producir más de un camino viable (bisección) — el rótulo debe
    // aparecer en CADA tarjeta de cifra, nunca solo en una.
    expect(screen.getAllByText('Todavía no es un resultado confiable para publicar — ver aviso arriba.').length).toBeGreaterThan(0)
  })

  it('con confirmación vigente y ejercicio publicable, el rótulo inline desaparece de la cifra', () => {
    const confirmacion = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    }
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={confirmacion} />)
    expect(screen.queryByText('Todavía no es un resultado confiable para publicar — ver aviso arriba.')).toBeNull()
  })

  it('caso jurídico NO_RESUELTA: el rótulo inline nunca aparece — la cifra ya no se muestra en absoluto, así que "rotular un número visible" ya no aplica (ver describe de E7, arriba)', () => {
    render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)
    expect(screen.queryByText('Todavía no es un resultado confiable para publicar — ver aviso arriba.')).toBeNull()
  })
})

describe('ProyectaTuPensionRPM — Nivel completo conectado (E6.6, PL-260 §9.1/§9.6)', () => {
  it('un camino viable ofrece "Ver el detalle auditable completo" y, al expandir, muestra los 7 pasos en el orden de Contrato F — el resumen sigue visible', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)

    // Antes de expandir: los pasos no están en el DOM (contenido de <details> cerrado, pero
    // React igual los monta — <details> oculta por CSS nativo, no por condicional de React;
    // se verifica el título del control y el resumen, que sí deben estar siempre presentes).
    expect(screen.getAllByText('Pensión proyectada mensual (pesos de hoy)').length).toBeGreaterThan(0)
    const controles = screen.getAllByText('Ver el detalle auditable completo de este camino')
    expect(controles.length).toBeGreaterThan(0)

    await user.click(controles[0])

    // propsHombreCompleto() puede producir más de un camino viable (bisección) — cada uno
    // trae su propio <details>, así que cada título de paso puede aparecer más de una vez en
    // el DOM (el contenido de un <details> cerrado sigue montado, solo oculto por el
    // navegador — no se elimina del árbol). Se verifica presencia (>0), no unicidad.
    for (const titulo of [
      'Datos utilizados',
      'Cálculo del IBL',
      'Tasa de reemplazo',
      'Resultado matemático (antes del ajuste legal)',
      'Ajuste legal (piso y techo)',
      'Resultado final',
      'Comparación contra tu objetivo',
    ]) {
      expect(screen.getAllByText(titulo).length).toBeGreaterThan(0)
    }

    // El resumen (Nivel esencial de ese mismo camino) sigue visible tras expandir — nunca se
    // pierde el contexto al pasar al detalle.
    expect(screen.getAllByText('Pensión proyectada mensual (pesos de hoy)').length).toBeGreaterThan(0)

    // E7 corrección (regresión): un ejercicio SIN política jurídica NO_RESUELTA (este
    // fixture, sexo Hombre) nunca muestra el mensaje de "paso pendiente" — sus 7 pasos
    // exponen su valor calculado real, sin excepción.
    expect(document.querySelectorAll('.detalle-paso__pendiente').length).toBe(0)
    expect(document.querySelectorAll('.detalle-paso__valor').length).toBeGreaterThan(0)
  })

  // Corrección de auditoría visual (2026-09-25, capturas reales de Carlos, Caso B): este
  // <details> vivía suelto, sin grid-column/grid-row propios — con .camino-columna en
  // display:contents, quedaba sujeto al auto-placement de CSS Grid, que podía colocarlo en el
  // hueco de OTRA columna (ej. la fila de notas de un camino sin notas específicas),
  // superponiendo su texto sobre el de otro camino. Se verifica aquí que cada control tenga
  // su propia celda de grid (`camino-celda camino-celda--detalle-completo`, App.css) — nunca
  // solo `legal-detail` suelto.
  it('regresión (superposición entre columnas): cada control de Nivel completo tiene su propia celda de grid, nunca un <details> suelto sin grid-column/grid-row', () => {
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)
    const detalles = document.querySelectorAll('.camino-celda--detalle-completo')
    expect(detalles.length).toBeGreaterThan(0)
    for (const detalle of detalles) {
      expect(detalle.tagName).toBe('DETAILS')
      expect(detalle.classList.contains('camino-celda')).toBe(true)
      expect(detalle.querySelector('summary').textContent).toBe('Ver el detalle auditable completo de este camino')
    }
  })

  it('un camino descartado nunca ofrece un control de Nivel completo — I7 garantiza que no tiene pasos que mostrar', () => {
    render(<ProyectaTuPensionRPM {...propsHombreConCaminoDescartado()} confirmacionContinuidad={null} />)

    // El camino descartado muestra únicamente su razón (mensaje, no el código crudo — el
    // código se afirma solo en el comentario del fixture, arriba).
    expect(screen.getByText((contenido) => contenido.length > 0, { selector: '.camino-celda--descartado' })).toBeTruthy()
    // Solo debe existir UN control de Nivel completo (el del camino viable) — nunca dos.
    expect(screen.getAllByText('Ver el detalle auditable completo de este camino').length).toBe(1)
  })

  it('políticas jurídicas involucradas: la sección aparece con el mensaje literal cuando hay una política NO_RESUELTA, y no aparece cuando no hay ninguna', () => {
    const { unmount } = render(<ProyectaTuPensionRPM {...propsMujerJuridicoNoPublicable()} confirmacionContinuidad={null} />)
    expect(screen.getByText('Políticas jurídicas de este ejercicio')).toBeTruthy()
    // Corrección de auditoría visual (2026-09-25): el nombre visible ya no es el identificador
    // interno de código ("PoliticaAnclaIncrementoMujer") sino su traducción legible
    // (etiquetaNombrePolitica) — se verifica que la sección propia de Nivel completo (E6.6)
    // exista, buscando su nodo dedicado (.politicas-juridicas__nombre) y su texto traducido.
    expect(document.querySelector('.politicas-juridicas__nombre').textContent).toContain(
      'Ancla del incremento de la tasa de reemplazo (Art. 34) — mujeres'
    )
    expect(document.querySelector('.politicas-juridicas__nombre').textContent).not.toContain('PoliticaAnclaIncrementoMujer')
    unmount()

    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)
    expect(screen.queryByText('Políticas jurídicas de este ejercicio')).toBeNull()
  })
})

describe('ProyectaTuPensionRPM — E7 (auditoría adversarial, PL-260 §0 punto 3): varios caminos en orden distinto al de Contrato F', () => {
  // Verificado empíricamente (2026-09-23): con un esfuerzo personalizado explorado, el orden
  // de `resultado.escenarios` (I6, el que usa cadenaVisual.modeloVisual.caminos) es
  // [base, aumentar-ibc-futuro, esfuerzo-adicional-deseado], pero
  // ordenarCaminosParaPresentacion (la grilla real) lo reordena a
  // [base, esfuerzo-adicional-deseado, aumentar-ibc-futuro] — un caso real, no fabricado, de
  // los dos órdenes divergiendo. Si `caminosVisualesPorId` (ProyectaTuPensionRPM.jsx) buscara
  // por índice en vez de por id, esto haría que un camino mostrara el Nivel completo de otro.
  it('cada tarjeta expandida muestra el RESULTADO_FINAL de SU PROPIO camino, nunca el de otro — coherencia resumen↔detalle bajo reordenamiento real', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)

    await user.click(screen.getByRole('button', { name: 'Ver qué ocurriría con otro esfuerzo' }))
    await user.type(document.querySelector('.exploracion-esfuerzo__panel .campo-monetario__input'), '300000')
    await user.click(screen.getByRole('button', { name: 'Explorar este esfuerzo' }))

    const columnas = document.querySelectorAll('.camino-columna')
    // Los tres caminos reales de este fixture (base, aumentar-ibc-futuro, esfuerzo-adicional-deseado).
    expect(columnas.length).toBe(3)

    let columnasConDetalleVerificadas = 0
    for (const columna of columnas) {
      const cifraResumen = columna.querySelector('.camino-celda--proyeccion .camino-celda__valor--enfasis')
      if (!cifraResumen) continue // camino descartado o con cuantía pendiente por política jurídica — no aplica aquí

      const detalles = Array.from(columna.querySelectorAll('.legal-detail'))
      const detalleCompleto = detalles.find((d) => d.querySelector('summary').textContent.includes('detalle auditable completo'))
      expect(detalleCompleto).toBeTruthy()

      await user.click(detalleCompleto.querySelector('summary'))

      const bloquePasoFinal = Array.from(columna.querySelectorAll('.detalle-paso')).find(
        (bloque) => bloque.querySelector('.detalle-paso__titulo')?.textContent === 'Resultado final'
      )
      expect(bloquePasoFinal).toBeTruthy()
      const cifraDetalle = bloquePasoFinal.querySelector('.detalle-paso__valor')

      // Misma cifra en Nivel esencial (resumen de ESTA tarjeta) y en RESULTADO_FINAL de SU
      // PROPIO Nivel completo — nunca la de otra tarjeta (lo que ocurriría si el lookup por
      // id estuviera roto y cayera en el primer/último camino del Map por accidente).
      expect(cifraDetalle.textContent).toBe(cifraResumen.textContent)
      columnasConDetalleVerificadas += 1
    }

    // Al menos dos caminos viables con cifra (base + esfuerzo-adicional-deseado, ambos
    // alcanzan el objetivo con este fixture) — si esto fuera 0, la prueba pasaría vacía sin
    // verificar nada, así que se exige explícitamente un mínimo.
    expect(columnasConDetalleVerificadas).toBeGreaterThanOrEqual(2)
  })

  it('el gráfico sigue usando exactamente el mismo escenario personalizado que la tarjeta "Tu elección" describe — mismo id, mismo dato, sin recalcular', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsHombreCompleto()} confirmacionContinuidad={null} />)

    await user.click(screen.getByRole('button', { name: 'Ver qué ocurriría con otro esfuerzo' }))
    await user.type(document.querySelector('.exploracion-esfuerzo__panel .campo-monetario__input'), '300000')
    await user.click(screen.getByRole('button', { name: 'Explorar este esfuerzo' }))

    // El SVG existe (sin política jurídica NO_RESUELTA en este fixture) y su descripción
    // accesible (E6.7) menciona "Tu elección" — misma fuente de datos que la tarjeta
    // (resultado.escenarios.find(e => e.id === 'esfuerzo-adicional-deseado'), nunca un
    // segundo cálculo independiente).
    const svg = document.querySelector('.grafico-esfuerzo-resultado__svg')
    expect(svg).toBeTruthy()
    const idDescripcion = svg.getAttribute('aria-describedby')
    expect(document.getElementById(idDescripcion).textContent).toContain('Tu elección')
  })
})

describe('ProyectaTuPensionRPM — E7 (auditoría adversarial): cadena visual no construida', () => {
  // Verificado empíricamente (2026-09-23, ver informe de este checkpoint): con `sexo`
  // inválido, generarCaminosRPM.js produce `escenarios: []` — el mismo valor de `sexo` que
  // haría fallar evaluarPoliticasEjercicioRPM.js (SEXO_INVALIDO) ya impide que `resultado`
  // tenga escenarios que mostrar, así que el bloque `CADENA_VISUAL_NO_CONSTRUIDA` de esta
  // página es estructuralmente inalcanzable con props reales (mismo hallazgo que ya
  // documentan construirCadenaVisualEjercicioRPM.js/construirModeloVisualEjercicioRPM.js
  // para sus propias ramas defensivas). No se fabrica aquí una prueba sintética que finja ser
  // un "flujo real" — esa rama defensiva ya está cubierta a nivel de unidad en
  // construirCadenaVisualEjercicioRPM.test.js (E6.3, cerrado), que si sí inyecta un doble de
  // prueba a propósito para ese caso. Esta prueba documenta y fija el hallazgo de
  // inalcanzabilidad en sí: con sexo inválido, la pantalla no muestra ni el bloque de Nivel
  // esencial ni el mensaje de "no pudimos construir el resultado auditable" — sencillamente
  // no hay resultado del que partir, comportamiento idéntico al de antes de E6.5.
  it('con sexo inválido, no hay escenarios que mostrar — ni Nivel esencial ni el mensaje de cadena no construida aparecen (nunca una pantalla a medio construir)', () => {
    render(<ProyectaTuPensionRPM {...propsHombreCompleto({ sexo: null })} confirmacionContinuidad={null} />)
    expect(screen.queryByText('Este resultado todavía no es una cifra confiable para publicar')).toBeNull()
    expect(screen.queryByText('No pudimos construir el resultado auditable de este ejercicio en este momento.')).toBeNull()
    expect(document.querySelectorAll('.camino-columna').length).toBe(0)
  })
})

describe('ProyectaTuPensionRPM — corrección de auditoría visual sobre capturas de Carlos (2026-09-24, "Caso A")', () => {
  // Hallazgo 1: ConfirmacionContinuidadCotizacion.jsx ya renderiza su propio <div
  // className="insight"> de nivel superior — envolverlo en OTRO <div className="insight">
  // anidaba dos cajas (mismo borde/fondo) una dentro de otra, con solo 6px de separación
  // (.insight { gap: 6px }) hacia el aviso de "no publicable", en vez de los 12px que
  // .insight + .insight (App.css) ya preveía para dos bloques .insight hermanos.
  it('corrección: ConfirmacionContinuidadCotizacion y el aviso de "no publicable" son bloques .insight HERMANOS, nunca uno anidado dentro del otro', () => {
    render(<ProyectaTuPensionRPM {...propsCasoA()} confirmacionContinuidad={null} />)

    // Nunca un .insight dentro de otro .insight — la causa raíz de la superposición reportada.
    expect(document.querySelectorAll('.insight .insight').length).toBe(0)

    // El disclosure (de ConfirmacionContinuidadCotizacion) y el aviso de "no publicable" son
    // ambos elementos .insight, hermanos entre sí.
    const cajasInsight = document.querySelectorAll('.insight')
    expect(cajasInsight.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Esta proyección supone que cotizas continuamente desde hoy hasta la edad elegida').closest('.insight')).toBeTruthy()
    const cajaAviso = screen.getByText('Este resultado todavía no es una cifra confiable para publicar').closest('.insight')
    expect(cajaAviso).toBeTruthy()
    expect(cajaAviso.getAttribute('role')).toBe('status')
  })

  it('al confirmar continuidad, la caja completa del aviso de "no publicable" desaparece del DOM (no solo su texto)', async () => {
    const user = userEvent.setup()
    const onConfirmarContinuidad = vi.fn()
    render(<ProyectaTuPensionRPM {...propsCasoA()} confirmacionContinuidad={null} onConfirmarContinuidad={onConfirmarContinuidad} />)

    expect(document.querySelector('.comparacion-caminos__supuestos[role="status"]')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))
    expect(onConfirmarContinuidad).toHaveBeenCalledTimes(1)

    // Componente controlado: confirmar solo emite el evento — App.jsx (aquí, el test) es
    // quien vuelve a renderizar con la confirmación ya aplicada, mismo patrón que el resto
    // de este archivo.
    const confirmacionEmitida = onConfirmarContinuidad.mock.calls[0][0]
    cleanup()
    render(<ProyectaTuPensionRPM {...propsCasoA()} confirmacionContinuidad={confirmacionEmitida} />)

    // Este fixture (Caso A) es jurídicamente resuelto y completo — confirmar continuidad
    // basta para volverlo publicable, así que el aviso desaparece por completo.
    expect(screen.queryByText('Este resultado todavía no es una cifra confiable para publicar')).toBeNull()
    expect(document.querySelector('.comparacion-caminos__supuestos[role="status"]')).toBeNull()
  })

  // Hallazgo 2: el hint bajo "Ver qué ocurriría con otro esfuerzo" afirmaba
  // incondicionalmente "no es necesaria para alcanzar tu objetivo" — en el Caso A, el
  // objetivo SOLO es alcanzable vía el camino "Aumentar tu IBC futuro para alcanzar tu
  // objetivo.", así que esa frase contradecía directamente lo que "Qué podrías explorar
  // ahora" ya decía en la misma pantalla ("Tu objetivo es alcanzable con un esfuerzo
  // adicional mensual").
  it('corrección: el hint de "Ver qué ocurriría con otro esfuerzo" nunca contradice "Qué podrías explorar ahora" en el Caso A', () => {
    render(<ProyectaTuPensionRPM {...propsCasoA()} confirmacionContinuidad={null} />)

    // Confirma que este fixture realmente reproduce el estado reportado — si dejara de
    // hacerlo, esta prueba debe fallar de forma visible, nunca pasar vacía.
    expect(screen.getByText('Tu objetivo es alcanzable con un esfuerzo adicional mensual. Puedes explorar un nivel de esfuerzo que sea relevante para ti.')).toBeTruthy()

    // La contradicción reportada nunca vuelve a aparecer.
    expect(screen.queryByText(/no es necesaria para alcanzar tu objetivo/)).toBeNull()
    expect(
      screen.getByText('Es una simulación opcional, independiente de los caminos ya comparados arriba — nunca una recomendación de aportar más.')
    ).toBeTruthy()
  })

  it('regresión: con el objetivo ya alcanzado hoy (sin ningún esfuerzo adicional), el hint original ("no es necesaria...") se mantiene sin cambios', () => {
    // Verificado empíricamente (2026-09-24): con este mismo fixture, un objetivo de
    // $2.000.000 ya lo alcanza el camino 'base' por sí solo (resultado ≈ $2.081.006) —
    // orientacionExploracion.codigo === 'HOY_YA_ALCANZA_OBJETIVO'.
    render(<ProyectaTuPensionRPM {...propsCasoA({ objetivoPensionMensual: '2000000' })} confirmacionContinuidad={null} />)
    expect(
      screen.getByText('Es una simulación opcional — no es necesaria para alcanzar tu objetivo ni una recomendación de aportar más.')
    ).toBeTruthy()
  })

  // Pedido explícito de revisión: los DOS caminos del Caso A (base y aumentar-ibc-futuro)
  // siguen mostrando sus 7 pasos auditables completos, con cifras reales — la corrección de
  // esta ronda no tocó Nivel completo ni la política jurídica (aquí, inexistente).
  it('los dos caminos del Caso A (base y aumentar-ibc-futuro) muestran, cada uno, sus 7 pasos auditables con cifras reales al expandir', async () => {
    const user = userEvent.setup()
    render(<ProyectaTuPensionRPM {...propsCasoA()} confirmacionContinuidad={null} />)

    const columnas = document.querySelectorAll('.camino-columna')
    expect(columnas.length).toBe(2)

    for (const columna of columnas) {
      const detalleCompleto = Array.from(columna.querySelectorAll('.legal-detail')).find((d) =>
        d.querySelector('summary').textContent.includes('detalle auditable completo')
      )
      expect(detalleCompleto).toBeTruthy()
      await user.click(detalleCompleto.querySelector('summary'))

      for (const titulo of [
        'Datos utilizados',
        'Cálculo del IBL',
        'Tasa de reemplazo',
        'Resultado matemático (antes del ajuste legal)',
        'Ajuste legal (piso y techo)',
        'Resultado final',
        'Comparación contra tu objetivo',
      ]) {
        expect(columna.querySelectorAll('.detalle-paso').length).toBeGreaterThan(0)
        const bloque = Array.from(columna.querySelectorAll('.detalle-paso')).find(
          (b) => b.querySelector('.detalle-paso__titulo')?.textContent === titulo
        )
        expect(bloque).toBeTruthy()
      }

      // Sin política jurídica NO_RESUELTA en este fixture — ningún paso queda "pendiente".
      expect(columna.querySelectorAll('.detalle-paso__pendiente').length).toBe(0)
    }
  })
})
