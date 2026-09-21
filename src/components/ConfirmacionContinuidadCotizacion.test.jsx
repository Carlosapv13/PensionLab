// @vitest-environment jsdom
//
// E6.4 — pruebas del control aislado de confirmación de continuidad (PL-260 §8.4/§9.4).
// Directiva `@vitest-environment jsdom` (primera línea, exigida por Vitest): acota el entorno
// DOM exclusivamente a ESTE archivo — el resto de la suite (1572 pruebas, funciones puras de
// dominio) sigue corriendo en el entorno por defecto de Vitest, sin cambios en
// `vite.config.js`. Primer archivo `.test.jsx` de este repositorio — usa
// `@testing-library/react`/`@testing-library/user-event` (nuevas dependencias de desarrollo,
// autorizadas para este checkpoint). No se agregó `@testing-library/jest-dom`: todas las
// aserciones se expresan con la API de DOM nativa (`.disabled`, `.getAttribute(...)`,
// `document.activeElement`) y con las propias utilidades de Vitest — suficientes para lo que
// este archivo necesita comprobar.
//
// Convención de este archivo (mismo criterio que el resto del dominio): los casos que
// contrastan contra Contrato F usan una llamada REAL a `generarCaminosRPM`/
// `construirEjercicioResueltoRPM` (fixture propio, nunca importado de otro `.test.js`) — no
// se reimplementa la validación de Contrato F aquí, solo se confirma que el objeto emitido
// por este componente es aceptado tal cual por el contrato real y cerrado.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { generarCaminosRPM } from '../domain/pensionEngine/generarCaminosRPM.js'
import { construirEjercicioResueltoRPM } from '../domain/pensionEngine/construirEjercicioResueltoRPM.js'
import ConfirmacionContinuidadCotizacion, {
  TEXTO_DISCLOSURE_CONTINUIDAD,
  TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
  TEXTO_CONFIRMACION_VIGENTE,
} from './ConfirmacionContinuidadCotizacion.jsx'

afterEach(() => {
  cleanup()
})

describe('ConfirmacionContinuidadCotizacion — texto exacto de PL-260 §8.4 (siempre visible)', () => {
  // Aserciones contra el STRING LITERAL, no solo contra la constante importada — una prueba
  // que solo comparara la constante contra sí misma pasaría igual si el texto cambiara sin
  // que nadie lo autorizara. Bloquea los tres textos aprobados (disclosure, botón, estado
  // posterior al clic) contra su redacción exacta.
  it('muestra el disclosure exacto de PL-260 §8.4, sin importar el estado de confirmación', () => {
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} onConfirmar={() => {}} />)
    expect(screen.getByText('Esta proyección supone que cotizas continuamente desde hoy hasta la edad elegida')).toBeTruthy()
    expect(TEXTO_DISCLOSURE_CONTINUIDAD).toBe('Esta proyección supone que cotizas continuamente desde hoy hasta la edad elegida')
  })

  it('muestra el botón con el texto exacto de PL-260 §8.4 cuando no hay confirmación vigente', () => {
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} onConfirmar={() => {}} />)
    expect(screen.getByRole('button', { name: 'Entiendo y quiero explorar este escenario.' })).toBeTruthy()
    expect(TEXTO_BOTON_CONFIRMAR_CONTINUIDAD).toBe('Entiendo y quiero explorar este escenario.')
  })

  it('muestra el texto aprobado del estado posterior al clic — describe la elección, nunca afirma que cotizará ni presume lo comprendido', () => {
    const confirmacion = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    }
    render(<ConfirmacionContinuidadCotizacion confirmacion={confirmacion} edadJubilacionDeseada={64} onConfirmar={() => {}} />)
    expect(screen.getByText('Elegiste explorar este escenario bajo el supuesto de cotización continua.')).toBeTruthy()
    expect(TEXTO_CONFIRMACION_VIGENTE).toBe('Elegiste explorar este escenario bajo el supuesto de cotización continua.')
  })
})

describe('ConfirmacionContinuidadCotizacion — objeto emitido y edad ausente', () => {
  it('al hacer clic con edad válida, emite exactamente el objeto que Contrato F acepta', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} onConfirmar={onConfirmar} />)

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))

    expect(onConfirmar).toHaveBeenCalledTimes(1)
    expect(onConfirmar).toHaveBeenCalledWith({
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    })
  })

  it('con edad ausente (null), el botón está deshabilitado y el clic nunca invoca onConfirmar', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={null} onConfirmar={onConfirmar} />)

    const boton = screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })
    expect(boton.disabled).toBe(true)

    await user.click(boton)
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  it('con edad ausente por prop no pasada (undefined, no null), el botón también queda deshabilitado', () => {
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} onConfirmar={() => {}} />)
    const boton = screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })
    expect(boton.disabled).toBe(true)
  })
})

describe('ConfirmacionContinuidadCotizacion — auditoría: ninguna prop ausente causa una excepción evitable', () => {
  it('regresión: confirmacion ausente (prop no pasada, undefined) no lanza — se trata igual que null', () => {
    expect(() => render(<ConfirmacionContinuidadCotizacion edadJubilacionDeseada={64} onConfirmar={() => {}} />)).not.toThrow()
    expect(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeTruthy()
    expect(screen.queryByText(TEXTO_CONFIRMACION_VIGENTE)).toBeNull()
  })

  it('regresión: onConfirmar ausente (prop no pasada) no lanza al hacer clic con edad válida', async () => {
    const user = userEvent.setup()
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} />)
    const boton = screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })
    // Si el valor por defecto de onConfirmar no fuera no-operativo, este await propagaría la
    // excepción y la prueba fallaría — no hace falta ninguna aserción adicional.
    await user.click(boton)
    expect(boton).toBeTruthy()
  })
})

describe('ConfirmacionContinuidadCotizacion — confirmación vigente y obsoleta', () => {
  it('confirmación vigente (misma edad): muestra el estado confirmado, oculta el botón', () => {
    const confirmacion = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 64,
    }
    render(<ConfirmacionContinuidadCotizacion confirmacion={confirmacion} edadJubilacionDeseada={64} onConfirmar={() => {}} />)

    // role="status" (equivalente a aria-live="polite"): un lector de pantalla debe anunciar
    // el cambio de estado sin que la persona tenga que volver a navegar hasta él.
    const estadoAnunciado = screen.getByRole('status')
    expect(estadoAnunciado.textContent).toBe(TEXTO_CONFIRMACION_VIGENTE)
    expect(screen.queryByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeNull()
  })

  it('confirmación para otra edad (obsoleta): se trata visualmente como no vigente, vuelve a mostrar el botón', () => {
    const confirmacionParaOtraEdad = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: 60,
    }
    render(<ConfirmacionContinuidadCotizacion confirmacion={confirmacionParaOtraEdad} edadJubilacionDeseada={64} onConfirmar={() => {}} />)

    expect(screen.queryByText(TEXTO_CONFIRMACION_VIGENTE)).toBeNull()
    expect(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeTruthy()
  })

  it('confirmación con confirmado:false: nunca se trata como vigente, aunque la edad coincida', () => {
    const confirmacionNoConfirmada = {
      codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',
      confirmado: false,
      textoAceptado: '',
      edadObjetivoConfirmada: 64,
    }
    render(<ConfirmacionContinuidadCotizacion confirmacion={confirmacionNoConfirmada} edadJubilacionDeseada={64} onConfirmar={() => {}} />)

    expect(screen.queryByText(TEXTO_CONFIRMACION_VIGENTE)).toBeNull()
    expect(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })).toBeTruthy()
  })
})

describe('ConfirmacionContinuidadCotizacion — teclado y asociación accesible', () => {
  it('Tab alcanza el botón y Enter lo activa (comportamiento nativo, sin manejadores de teclado propios)', async () => {
    const user = userEvent.setup()
    const onConfirmar = vi.fn()
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} onConfirmar={onConfirmar} />)

    const boton = screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })
    await user.tab()
    expect(document.activeElement).toBe(boton)

    await user.keyboard('{Enter}')
    expect(onConfirmar).toHaveBeenCalledTimes(1)
  })

  it('el botón referencia el disclosure vía aria-describedby (mismo id que el párrafo del disclosure)', () => {
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} onConfirmar={() => {}} />)

    const boton = screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD })
    const disclosure = screen.getByText(TEXTO_DISCLOSURE_CONTINUIDAD)

    expect(boton.getAttribute('aria-describedby')).toBe(disclosure.id)
    expect(disclosure.id).toBeTruthy()
  })
})

describe('ConfirmacionContinuidadCotizacion — integración con Contrato F real (fixture real)', () => {
  function historiaAnios(desde, hasta) {
    const periodos = []
    for (let anio = desde; anio <= hasta; anio++) {
      const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
      periodos.push({ fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc: 1000000 + anio, diasCotizados: bisiesto ? 366 : 365 })
    }
    return periodos
  }

  function resultadoReal() {
    return generarCaminosRPM({
      regimenActual: 'RPM',
      sexo: 'Hombre',
      historiaCotizacion: historiaAnios(1990, 2025),
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 64,
      ibcAplicableSimulacion: 2000000,
      objetivoValorMensual: 1600000,
      fecha: '2026-01-01',
    })
  }

  it('el objeto emitido por el clic es aceptado tal cual por construirEjercicioResueltoRPM real — nunca CODIGO_SUPUESTO_DESCONOCIDO', async () => {
    const user = userEvent.setup()
    let confirmacionEmitida = null
    const onConfirmar = (c) => {
      confirmacionEmitida = c
    }
    render(<ConfirmacionContinuidadCotizacion confirmacion={null} edadJubilacionDeseada={64} onConfirmar={onConfirmar} />)

    await user.click(screen.getByRole('button', { name: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD }))
    expect(confirmacionEmitida).not.toBeNull()

    const resultado = resultadoReal()
    const ejercicio = construirEjercicioResueltoRPM({
      resultadoGenerarCaminos: resultado,
      edadJubilacionDeseada: 64,
      confirmacionesSupuestos: [confirmacionEmitida],
      politicasInvolucradas: [],
    })

    expect(ejercicio.estado).toBe('EJERCICIO_CONSTRUIDO')
    expect(ejercicio.publicable).toBe(true)
    expect(ejercicio.razonesNoPublicable).toEqual([])
  })
})
