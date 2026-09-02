import { describe, it, expect, vi } from 'vitest'
import {
  MOTIVO_CONSULTA,
  OPCIONES_MOTIVO_CONSULTA,
  OPCIONES_ACLARACION_MOTIVO_CONSULTA,
  determinarSalidaMotivoConsulta,
  manejarEnvioMotivoConsulta,
  volverALasOpciones,
  MENSAJES_DETENCION_MOTIVO_CONSULTA,
} from './Objetivo.helpers.js'

describe('determinarSalidaMotivoConsulta — PL-250 §4-bis', () => {
  it('vejez → CONTINUAR_FLUJO_VEJEZ, sin caso asociado', () => {
    expect(determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.VEJEZ)).toEqual({
      salida: 'CONTINUAR_FLUJO_VEJEZ',
      caso: null,
    })
  })

  it('incapacidad laboral (B-01) → DETENER_Y_REMITIR con ese caso exacto', () => {
    expect(determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.INCAPACIDAD_LABORAL)).toEqual({
      salida: 'DETENER_Y_REMITIR',
      caso: MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
    })
  })

  it('protección familiar (B-02) → DETENER_Y_REMITIR con ese caso exacto', () => {
    expect(determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.PROTECCION_FAMILIAR)).toEqual({
      salida: 'DETENER_Y_REMITIR',
      caso: MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
    })
  })

  it('pensión ya reconocida (B-03) → DETENER_Y_REMITIR con ese caso exacto', () => {
    expect(determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA)).toEqual({
      salida: 'DETENER_Y_REMITIR',
      caso: MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
    })
  })

  it('reclamo o proceso activo (B-13) → DETENER_Y_REMITIR con ese caso exacto', () => {
    expect(determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO)).toEqual({
      salida: 'DETENER_Y_REMITIR',
      caso: MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
    })
  })

  it('B-03 y B-13 nunca comparten el mismo valor ni el mismo caso — deben poder distinguirse siempre', () => {
    expect(MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA).not.toBe(MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO)
    const salidaB03 = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA)
    const salidaB13 = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO)
    expect(salidaB03.caso).not.toBe(salidaB13.caso)
  })

  it('"no estoy seguro" → ORIENTAR_ANTES_DE_CONTINUAR, nunca CONTINUAR_FLUJO_VEJEZ', () => {
    const resultado = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.NO_SEGURO)
    expect(resultado.salida).toBe('ORIENTAR_ANTES_DE_CONTINUAR')
    expect(resultado.salida).not.toBe('CONTINUAR_FLUJO_VEJEZ')
  })

  it('"sigo sin saber" tras la aclaración → DETENER_Y_REMITIR general, nunca CONTINUAR_FLUJO_VEJEZ', () => {
    const resultado = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.NO_SEGURO_PERSISTE)
    expect(resultado.salida).toBe('DETENER_Y_REMITIR')
    expect(resultado.salida).not.toBe('CONTINUAR_FLUJO_VEJEZ')
    expect(resultado.caso).toBe(MOTIVO_CONSULTA.NO_SEGURO_PERSISTE)
  })

  it('null o valor no reconocido → sin salida (formulario incompleto), nunca un valor por defecto hacia vejez', () => {
    expect(determinarSalidaMotivoConsulta(null)).toEqual({ salida: null, caso: null })
    expect(determinarSalidaMotivoConsulta(undefined)).toEqual({ salida: null, caso: null })
    expect(determinarSalidaMotivoConsulta('algo_no_reconocido')).toEqual({ salida: null, caso: null })
  })

  it('la decisión es pura y determinista: mismo valor, mismo resultado, sin importar cuántas veces se invoque (nunca queda un estado de remisión obsoleto)', () => {
    const primeraLlamada = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.INCAPACIDAD_LABORAL)
    const segundaLlamada = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.INCAPACIDAD_LABORAL)
    expect(primeraLlamada).toEqual(segundaLlamada)

    // Corregir la selección a vejez recalcula limpio, sin rastro del caso anterior.
    const trasCorregir = determinarSalidaMotivoConsulta(MOTIVO_CONSULTA.VEJEZ)
    expect(trasCorregir).toEqual({ salida: 'CONTINUAR_FLUJO_VEJEZ', caso: null })
  })
})

describe('Catálogo de opciones — integridad', () => {
  it('la pregunta inicial tiene exactamente 6 opciones, una por cada valor de MOTIVO_CONSULTA salvo NO_SEGURO_PERSISTE', () => {
    expect(OPCIONES_MOTIVO_CONSULTA).toHaveLength(6)
    const valores = OPCIONES_MOTIVO_CONSULTA.map((o) => o.valor)
    expect(valores).toEqual([
      MOTIVO_CONSULTA.VEJEZ,
      MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
      MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
      MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
      MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
      MOTIVO_CONSULTA.NO_SEGURO,
    ])
  })

  it('la pregunta inicial nunca fusiona pensión ya reconocida con reclamo/proceso activo en una sola opción', () => {
    const textos = OPCIONES_MOTIVO_CONSULTA.map((o) => o.texto)
    const opcionReconocida = textos.find((t) => t.includes('Ya recibo una pensión'))
    const opcionReclamo = textos.find((t) => t.includes('Me negaron'))
    expect(opcionReconocida).toBeDefined()
    expect(opcionReclamo).toBeDefined()
    expect(opcionReconocida).not.toBe(opcionReclamo)
  })

  it('la aclaración tiene exactamente 6 opciones (las 5 categorías sustantivas + "sigo sin saber"), nunca repite "No estoy seguro"', () => {
    expect(OPCIONES_ACLARACION_MOTIVO_CONSULTA).toHaveLength(6)
    const valores = OPCIONES_ACLARACION_MOTIVO_CONSULTA.map((o) => o.valor)
    expect(valores).not.toContain(MOTIVO_CONSULTA.NO_SEGURO)
    expect(valores).toContain(MOTIVO_CONSULTA.NO_SEGURO_PERSISTE)
  })

  it('cada opción de aclaración, salvo "sigo sin saber", resuelve en una salida definida (nunca queda huérfana)', () => {
    for (const { valor } of OPCIONES_ACLARACION_MOTIVO_CONSULTA) {
      const resultado = determinarSalidaMotivoConsulta(valor)
      expect(resultado.salida).not.toBeNull()
    }
  })

  it('existe un mensaje de detención específico para cada uno de los 4 casos directos y para "sigo sin saber" — nunca un mensaje genérico compartido', () => {
    const claves = [
      MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
      MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
      MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
      MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
      MOTIVO_CONSULTA.NO_SEGURO_PERSISTE,
    ]
    const mensajesVistos = new Set()
    for (const clave of claves) {
      const entrada = MENSAJES_DETENCION_MOTIVO_CONSULTA[clave]
      expect(entrada).toBeDefined()
      expect(entrada.titulo).toBeTruthy()
      expect(entrada.mensaje).toBeTruthy()
      expect(entrada.siguientePaso).toBeTruthy()
      expect(mensajesVistos.has(entrada.titulo)).toBe(false)
      mensajesVistos.add(entrada.titulo)
    }
  })

  it('ningún mensaje de detención usa vocabulario de asesoría jurídica personalizada ("debes", "tu derecho es", "te corresponde legalmente")', () => {
    const vocabularioProhibido = /\b(debes|deberías|tu derecho es|te corresponde legalmente)\b/i
    for (const entrada of Object.values(MENSAJES_DETENCION_MOTIVO_CONSULTA)) {
      expect(entrada.mensaje).not.toMatch(vocabularioProhibido)
      expect(entrada.siguientePaso).not.toMatch(vocabularioProhibido)
    }
  })
})

describe('manejarEnvioMotivoConsulta — integración mínima con espías (sin DOM)', () => {
  // Construye tres espías nuevos por caso, para poder afirmar no solo qué se
  // llamó, sino también qué NO se llamó — la garantía que importa proteger
  // es justamente que onContinuar nunca se invoque fuera de vejez.
  function invocarConEspias(motivoConsulta) {
    const onContinuar = vi.fn()
    const onOrientar = vi.fn()
    const onDetener = vi.fn()
    manejarEnvioMotivoConsulta({ motivoConsulta, onContinuar, onOrientar, onDetener })
    return { onContinuar, onOrientar, onDetener }
  }

  it('vejez: invoca onContinuar exactamente una vez, y nunca onOrientar/onDetener', () => {
    const { onContinuar, onOrientar, onDetener } = invocarConEspias(MOTIVO_CONSULTA.VEJEZ)
    expect(onContinuar).toHaveBeenCalledTimes(1)
    expect(onOrientar).not.toHaveBeenCalled()
    expect(onDetener).not.toHaveBeenCalled()
  })

  it.each([
    ['B-01 incapacidad laboral', MOTIVO_CONSULTA.INCAPACIDAD_LABORAL],
    ['B-02 protección familiar', MOTIVO_CONSULTA.PROTECCION_FAMILIAR],
    ['B-03 pensión ya reconocida', MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA],
    ['B-13 reclamo o proceso activo', MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO],
    ['remisión general tras "sigo sin saber"', MOTIVO_CONSULTA.NO_SEGURO_PERSISTE],
  ])('%s: onContinuar NUNCA se invoca — solo onDetener', (_nombre, motivo) => {
    const { onContinuar, onOrientar, onDetener } = invocarConEspias(motivo)
    expect(onContinuar).not.toHaveBeenCalled()
    expect(onOrientar).not.toHaveBeenCalled()
    expect(onDetener).toHaveBeenCalledTimes(1)
  })

  it('"no estoy seguro": onContinuar NUNCA se invoca — solo onOrientar', () => {
    const { onContinuar, onOrientar, onDetener } = invocarConEspias(MOTIVO_CONSULTA.NO_SEGURO)
    expect(onContinuar).not.toHaveBeenCalled()
    expect(onOrientar).toHaveBeenCalledTimes(1)
    expect(onDetener).not.toHaveBeenCalled()
  })

  it.each([[null], [undefined], ['valor_invalido_no_reconocido']])(
    'valor inválido (%s): ninguna callback se invoca — onContinuar NUNCA por defecto',
    (motivoInvalido) => {
      const { onContinuar, onOrientar, onDetener } = invocarConEspias(motivoInvalido)
      expect(onContinuar).not.toHaveBeenCalled()
      expect(onOrientar).not.toHaveBeenCalled()
      expect(onDetener).not.toHaveBeenCalled()
    }
  )

  it('de las 8 entradas posibles de motivoConsulta, onContinuar solo se invoca en exactamente 1 (vejez)', () => {
    const todosLosValores = [
      MOTIVO_CONSULTA.VEJEZ,
      MOTIVO_CONSULTA.INCAPACIDAD_LABORAL,
      MOTIVO_CONSULTA.PROTECCION_FAMILIAR,
      MOTIVO_CONSULTA.PENSION_YA_RECONOCIDA,
      MOTIVO_CONSULTA.RECLAMO_O_PROCESO_ACTIVO,
      MOTIVO_CONSULTA.NO_SEGURO,
      MOTIVO_CONSULTA.NO_SEGURO_PERSISTE,
      null,
    ]
    const vecesQueContinuo = todosLosValores.filter((motivo) => {
      const { onContinuar } = invocarConEspias(motivo)
      return onContinuar.mock.calls.length > 0
    }).length
    expect(vecesQueContinuo).toBe(1)
  })
})

// Nota (2026-09-01): esta suite tenía tres bloques adicionales
// (`objetivoEstaDisponible`, `manejarEnvioObjetivo`, "Cadena completa Paso 1
// → Paso 2") que probaban el Paso 2 ("¿en qué quieres que te ayudemos hoy?",
// `objetivoSeleccionado`). Se eliminaron junto con el código que probaban:
// la auditoría de producto encontró que ninguna de sus dos opciones
// habilitadas producía un resultado distinto (`DECISIÓN_APARENTE`, PL-250
// §20) — se retiró el Paso 2 en vez de inventarle una prueba que solo
// confirmaría una decisión sin consecuencia real. `manejarEnvioMotivoConsulta`
// (arriba) ahora invoca `onContinuar` directamente para vejez, sin paso
// intermedio, y las pruebas de esta suite ya cubren esa garantía completa.

describe('volverALasOpciones — única acción de recuperación (aclaración y detención, ajuste de UX 2026-09-01)', () => {
  it('invoca el setter de paso exactamente una vez, con "motivo"', () => {
    const setPasoObjetivo = vi.fn()
    volverALasOpciones(setPasoObjetivo)
    expect(setPasoObjetivo).toHaveBeenCalledTimes(1)
    expect(setPasoObjetivo).toHaveBeenCalledWith('motivo')
  })

  it('su firma solo acepta el setter de paso — no puede recibir ni invocar un setter de motivoConsulta, por lo que la selección nunca se borra al volver', () => {
    // Prueba de contrato, no de comportamiento interno: si esta función alguna
    // vez necesitara limpiar motivoConsulta, tendría que aceptar ese segundo
    // parámetro explícitamente — su ausencia es, en sí misma, la garantía.
    expect(volverALasOpciones).toHaveLength(1)
  })

  it('llamadas repetidas son idempotentes: siempre piden el mismo paso "motivo", nunca uno distinto ni ninguno', () => {
    const setPasoObjetivo = vi.fn()
    volverALasOpciones(setPasoObjetivo)
    volverALasOpciones(setPasoObjetivo)
    expect(setPasoObjetivo).toHaveBeenNthCalledWith(1, 'motivo')
    expect(setPasoObjetivo).toHaveBeenNthCalledWith(2, 'motivo')
  })
})
