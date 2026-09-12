// E5.3 (sprint-4-correcciones-oscar-baldor) — Contrato F del plan PL-260
// (docs/producto/PL-260-...-baldor.md §8). Construye `EjercicioResueltoRPM` combinando A
// (elegibilidad), B (disponibilidadCuantia) y E (generarCaminosRPM) — nunca recalcula
// ninguna cifra que A-E ya resolvió, solo compone y valida. No importa
// compararAnclaIncrementoRPM.js: `politicasInvolucradas` se recibe como entrada externa ya
// evaluada (E5.4, checkpoint separado, todavía sin implementar). Sin ningún consumidor real
// todavía (mismo criterio ya usado por compararAnclaIncrementoRPM.js, E3-B) — permanece
// dormido hasta que E5.4 exista.
//
// Decisiones de diseño (Carlos/Atlas, revisión previa a esta implementación):
// - `fechaBaseMonetaria` (top-level) nunca se calcula: se reúne únicamente desde
//   `escenario.ajusteLegal.fechaBaseMonetaria` de los caminos viables. Si ninguno la trae,
//   el ejercicio queda `completo:false` (FECHA_BASE_MONETARIA_NO_DISPONIBLE) — nunca un
//   error de entrada, porque la ausencia es un estado de dominio válido, no una violación de
//   contrato. Si dos caminos viables traen fechas distintas, eso SÍ es contradictorio
//   (ENTRADA_INVALIDA, FECHAS_BASE_MONETARIA_INCONSISTENTES) — nunca se elige una en
//   silencio. Nota: cuando no hay ningún camino viable (SIN_CAMINOS_AUDITABLES), las dos
//   razones de incompletitud coexisten deliberadamente — nunca se suprime una a favor de la
//   otra.
// - `DATOS_UTILIZADOS` reexpone únicamente `valorDeclarado`/`valorAplicado`/`origen`/
//   `topeAplicado`, tal cual de E — nunca deduce ni incluye una "razón del recorte": E no la
//   produce, y compararlos para inferirla sería una interpretación nueva de F, no una
//   reexposición.
// - `IBL.valorAplicable` es un nombre de presentación de este contrato — el valor es,
//   literalmente, `escenario.ibl.aplicable` (mismo dato, distinto nombre de campo).
// - Ningún dato faltante se repara ni se sustituye por un valor por defecto: un camino
//   `'viable'` sin alguno de los campos que sus 7 pasos exigen es `ENTRADA_INVALIDA`
//   (CAMINO_VIABLE_INCOMPLETO) — nunca se construye un ejercicio parcial sobre datos
//   estructuralmente rotos.

const CODIGO_SUPUESTO_CONTINUIDAD = 'CONTINUIDAD_SIN_INTERRUPCIONES'

export const CODIGOS_ENTRADA_INVALIDA = {
  CODIGO_SUPUESTO_DESCONOCIDO: 'CODIGO_SUPUESTO_DESCONOCIDO',
  RESULTADO_GENERAR_CAMINOS_INVALIDO: 'RESULTADO_GENERAR_CAMINOS_INVALIDO',
  EDAD_JUBILACION_DESEADA_INVALIDA: 'EDAD_JUBILACION_DESEADA_INVALIDA',
  CONFIRMACIONES_SUPUESTOS_NO_ES_ARREGLO: 'CONFIRMACIONES_SUPUESTOS_NO_ES_ARREGLO',
  POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO: 'POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO',
  ESCENARIO_CON_ESTADO_DESCONOCIDO: 'ESCENARIO_CON_ESTADO_DESCONOCIDO',
  CAMINO_VIABLE_INCOMPLETO: 'CAMINO_VIABLE_INCOMPLETO',
  CAMINO_DESCARTADO_SIN_RAZON: 'CAMINO_DESCARTADO_SIN_RAZON',
  FECHAS_BASE_MONETARIA_INCONSISTENTES: 'FECHAS_BASE_MONETARIA_INCONSISTENTES',
}

export const CODIGOS_RAZON_INCOMPLETO = {
  POLITICA_JURIDICA_NO_RESUELTA: 'POLITICA_JURIDICA_NO_RESUELTA',
  SIN_CAMINOS_AUDITABLES: 'SIN_CAMINOS_AUDITABLES',
  DISPONIBILIDAD_CUANTIA_INSUFICIENTE: 'DISPONIBILIDAD_CUANTIA_INSUFICIENTE',
  FECHA_BASE_MONETARIA_NO_DISPONIBLE: 'FECHA_BASE_MONETARIA_NO_DISPONIBLE',
}

export const CODIGOS_RAZON_NO_PUBLICABLE = {
  EJERCICIO_NO_COMPLETO: 'EJERCICIO_NO_COMPLETO',
  CONFIRMACION_AUSENTE: 'CONFIRMACION_AUSENTE',
  CONFIRMACION_EDAD_NO_COINCIDE: 'CONFIRMACION_EDAD_NO_COINCIDE',
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object'
}

function esNormaRefValida(ref) {
  return (
    esObjeto(ref) &&
    typeof ref.normaId === 'string' &&
    ref.normaId.length > 0 &&
    typeof ref.fuente === 'string' &&
    ref.fuente.length > 0 &&
    typeof ref.articulo === 'string' &&
    ref.articulo.length > 0
  )
}

// Campos exigidos por los 7 PasoAuditable (PL-260 §8.2) de un camino 'viable' — cada regla
// nombra exactamente el campo que valida, para que CAMINO_VIABLE_INCOMPLETO liste con
// precisión qué faltó (Principio de "explicar todo bloqueo"). `ajusteLegal.fechaBaseMonetaria`
// NO está aquí a propósito: su ausencia es la única cubierta por FECHA_BASE_MONETARIA_NO_DISPONIBLE
// (completo:false), nunca por este chequeo estructural.
function camposFaltantesCaminoViable(escenario) {
  const reglas = [
    ['entradas.escenarioIbcFuturo.valorDeclarado', !esNumeroValido(escenario.entradas?.escenarioIbcFuturo?.valorDeclarado)],
    ['entradas.escenarioIbcFuturo.valorAplicado', !esNumeroValido(escenario.entradas?.escenarioIbcFuturo?.valorAplicado)],
    ['entradas.escenarioIbcFuturo.origen', typeof escenario.entradas?.escenarioIbcFuturo?.origen !== 'string'],
    ['entradas.escenarioIbcFuturo.topeAplicado', !esNumeroValido(escenario.entradas?.escenarioIbcFuturo?.topeAplicado)],
    ['semanasCotizadas.total', !esNumeroValido(escenario.semanasCotizadas?.total)],
    ['ibl.aplicable', !esNumeroValido(escenario.ibl?.aplicable)],
    ['ibl.esOpcionLegal', typeof escenario.ibl?.esOpcionLegal !== 'boolean'],
    ['ibl.razonVidaLaboralNoEvaluada', !esObjeto(escenario.ibl) || !('razonVidaLaboralNoEvaluada' in escenario.ibl)],
    ['trazabilidadVentana', !esObjeto(escenario.trazabilidadVentana)],
    ['ajusteLegal.estado', escenario.ajusteLegal?.estado !== 'evaluado'],
    ['ajusteLegal.tasaInicial', !esNumeroValido(escenario.ajusteLegal?.tasaInicial)],
    ['ajusteLegal.bloquesAdicionales', !esNumeroValido(escenario.ajusteLegal?.bloquesAdicionales)],
    ['ajusteLegal.incrementoPorSemanas', !esNumeroValido(escenario.ajusteLegal?.incrementoPorSemanas)],
    ['ajusteLegal.tasaFinalAplicada', !esNumeroValido(escenario.ajusteLegal?.tasaFinalAplicada)],
    ['ajusteLegal.limiteOchentaPorciento', !esObjeto(escenario.ajusteLegal?.limiteOchentaPorciento)],
    ['ajusteLegal.pisoEvaluado.fundamento', !esNormaRefValida(escenario.ajusteLegal?.pisoEvaluado?.fundamento)],
    ['ajusteLegal.techoEvaluado.fundamento', !esNormaRefValida(escenario.ajusteLegal?.techoEvaluado?.fundamento)],
    ['valorMatematico', !esNumeroValido(escenario.valorMatematico)],
    ['resultado.valor', !esNumeroValido(escenario.resultado?.valor)],
    ['distanciaObjetivo.valorObjetivo', !esNumeroValido(escenario.distanciaObjetivo?.valorObjetivo)],
    ['distanciaObjetivo.delta', !esNumeroValido(escenario.distanciaObjetivo?.delta)],
    ['distanciaObjetivo.cumple', typeof escenario.distanciaObjetivo?.cumple !== 'boolean'],
  ]
  return reglas.filter(([, invalido]) => invalido).map(([campo]) => campo)
}

function validarEntrada({ resultadoGenerarCaminos, edadJubilacionDeseada, confirmacionesSupuestos, politicasInvolucradas }) {
  const errores = []

  const escenariosValidos = esObjeto(resultadoGenerarCaminos) && Array.isArray(resultadoGenerarCaminos.escenarios)
  if (!escenariosValidos) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.RESULTADO_GENERAR_CAMINOS_INVALIDO,
      campo: 'resultadoGenerarCaminos',
      mensaje: 'resultadoGenerarCaminos ausente, no es un objeto, o su campo escenarios no es un arreglo.',
    })
  }

  if (!esNumeroValido(edadJubilacionDeseada)) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.EDAD_JUBILACION_DESEADA_INVALIDA,
      campo: 'edadJubilacionDeseada',
      mensaje: 'edadJubilacionDeseada ausente o no es un número finito.',
    })
  }

  const confirmacionesEsArregloOAusente = confirmacionesSupuestos === null || confirmacionesSupuestos === undefined || Array.isArray(confirmacionesSupuestos)
  if (!confirmacionesEsArregloOAusente) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.CONFIRMACIONES_SUPUESTOS_NO_ES_ARREGLO,
      campo: 'confirmacionesSupuestos',
      mensaje: 'confirmacionesSupuestos debe ser un arreglo cuando se proporciona.',
    })
  }

  const politicasEsArregloOAusente = politicasInvolucradas === null || politicasInvolucradas === undefined || Array.isArray(politicasInvolucradas)
  if (!politicasEsArregloOAusente) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO,
      campo: 'politicasInvolucradas',
      mensaje: 'politicasInvolucradas debe ser un arreglo cuando se proporciona.',
    })
  }

  if (confirmacionesEsArregloOAusente && Array.isArray(confirmacionesSupuestos)) {
    confirmacionesSupuestos.forEach((confirmacion, indice) => {
      if (confirmacion?.codigo !== CODIGO_SUPUESTO_CONTINUIDAD) {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.CODIGO_SUPUESTO_DESCONOCIDO,
          campo: `confirmacionesSupuestos[${indice}].codigo`,
          mensaje: `Código de supuesto desconocido: '${confirmacion?.codigo}'. Único código soportado: '${CODIGO_SUPUESTO_CONTINUIDAD}'.`,
        })
      }
    })
  }

  if (escenariosValidos) {
    resultadoGenerarCaminos.escenarios.forEach((escenario, indice) => {
      if (escenario?.estado !== 'viable' && escenario?.estado !== 'descartado') {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.ESCENARIO_CON_ESTADO_DESCONOCIDO,
          campo: `escenarios[${indice}].estado`,
          mensaje: `Estado de escenario desconocido: '${escenario?.estado}'. Se esperaba 'viable' o 'descartado'.`,
        })
        return
      }
      if (escenario.estado === 'viable') {
        const camposFaltantes = camposFaltantesCaminoViable(escenario)
        if (camposFaltantes.length > 0) {
          errores.push({
            codigo: CODIGOS_ENTRADA_INVALIDA.CAMINO_VIABLE_INCOMPLETO,
            campo: `escenarios[${indice}]`,
            mensaje: `Camino viable '${escenario.id}' sin los campos obligatorios: ${camposFaltantes.join(', ')}.`,
          })
        }
      } else if (!escenario.razonDescartado) {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.CAMINO_DESCARTADO_SIN_RAZON,
          campo: `escenarios[${indice}].razonDescartado`,
          mensaje: `Camino descartado '${escenario.id}' sin razonDescartado.`,
        })
      }
    })

    // Fechas base monetarias: solo se comparan cuando ningún camino viable ya fue marcado
    // CAMINO_VIABLE_INCOMPLETO — comparar una fecha que ya sabemos ausente/inválida no
    // aportaría una segunda causa real, solo ruido sobre un dato ya reportado como inválido.
    const huboCaminoViableIncompleto = errores.some((error) => error.codigo === CODIGOS_ENTRADA_INVALIDA.CAMINO_VIABLE_INCOMPLETO)
    if (!huboCaminoViableIncompleto) {
      const fechas = new Set(
        resultadoGenerarCaminos.escenarios
          .filter((escenario) => escenario.estado === 'viable')
          .map((escenario) => escenario.ajusteLegal.fechaBaseMonetaria)
          .filter((fecha) => typeof fecha === 'string')
      )
      if (fechas.size > 1) {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.FECHAS_BASE_MONETARIA_INCONSISTENTES,
          campo: 'escenarios',
          mensaje: `Los caminos viables declaran fechas base monetarias distintas: ${[...fechas].join(', ')}.`,
        })
      }
    }
  }

  return errores
}

function resolverFechaBaseMonetaria(caminosViables) {
  const fechas = new Set(
    caminosViables.map((escenario) => escenario.ajusteLegal.fechaBaseMonetaria).filter((fecha) => typeof fecha === 'string')
  )
  return fechas.size === 1 ? [...fechas][0] : null
}

function construirPasos(escenario) {
  return [
    {
      codigo: 'DATOS_UTILIZADOS',
      datos: {
        valorDeclarado: escenario.entradas.escenarioIbcFuturo.valorDeclarado,
        valorAplicado: escenario.entradas.escenarioIbcFuturo.valorAplicado,
        origen: escenario.entradas.escenarioIbcFuturo.origen,
        topeAplicado: escenario.entradas.escenarioIbcFuturo.topeAplicado,
        semanasCotizadas: escenario.semanasCotizadas.total,
      },
    },
    {
      codigo: 'IBL',
      datos: {
        valorAplicable: escenario.ibl.aplicable,
        esOpcionLegal: escenario.ibl.esOpcionLegal,
        razonVidaLaboralNoEvaluada: escenario.ibl.razonVidaLaboralNoEvaluada,
        trazabilidadVentana: escenario.trazabilidadVentana,
      },
    },
    {
      codigo: 'TASA_REEMPLAZO',
      datos: {
        tasaInicial: escenario.ajusteLegal.tasaInicial,
        bloquesAdicionales: escenario.ajusteLegal.bloquesAdicionales,
        incrementoPorSemanas: escenario.ajusteLegal.incrementoPorSemanas,
        tasaFinalAplicada: escenario.ajusteLegal.tasaFinalAplicada,
        limiteOchentaPorciento: escenario.ajusteLegal.limiteOchentaPorciento,
      },
    },
    { codigo: 'RESULTADO_MATEMATICO', datos: { valor: escenario.valorMatematico } },
    {
      codigo: 'AJUSTE_LEGAL',
      datos: { pisoEvaluado: escenario.ajusteLegal.pisoEvaluado, techoEvaluado: escenario.ajusteLegal.techoEvaluado },
    },
    { codigo: 'RESULTADO_FINAL', datos: { valor: escenario.resultado.valor } },
    {
      codigo: 'COMPARACION_OBJETIVO',
      datos: {
        valorObjetivo: escenario.distanciaObjetivo.valorObjetivo,
        delta: escenario.distanciaObjetivo.delta,
        cumple: escenario.distanciaObjetivo.cumple,
      },
    },
  ]
}

// I6: el orden de salida es exactamente el de entrada (map, sin sort/filter/reorder propio).
function construirCaminoResuelto(escenario) {
  if (escenario.estado === 'descartado') {
    return {
      id: escenario.id,
      tipo: escenario.tipo,
      estado: escenario.estado,
      decision: escenario.decision,
      distanciaObjetivo: null,
      esfuerzo: null,
      limitaciones: escenario.limitaciones ?? [],
      razonDescartado: escenario.razonDescartado,
      pasos: [],
    }
  }
  return {
    id: escenario.id,
    tipo: escenario.tipo,
    estado: escenario.estado,
    decision: escenario.decision,
    distanciaObjetivo: escenario.distanciaObjetivo,
    esfuerzo: escenario.esfuerzo,
    limitaciones: escenario.limitaciones ?? [],
    razonDescartado: null,
    pasos: construirPasos(escenario),
  }
}

function construirSupuestosEscenario({ elegibilidad, confirmacionesSupuestos }) {
  if (!elegibilidad?.ritmoCotizacionFutura) return []
  const confirmacionContinuidad = confirmacionesSupuestos.find((c) => c.codigo === CODIGO_SUPUESTO_CONTINUIDAD)
  return [
    {
      codigo: CODIGO_SUPUESTO_CONTINUIDAD,
      origen: 'supuesto_de_escenario',
      requiereConfirmacion: true,
      confirmacion: confirmacionContinuidad
        ? {
            confirmado: confirmacionContinuidad.confirmado === true,
            textoAceptado: typeof confirmacionContinuidad.textoAceptado === 'string' ? confirmacionContinuidad.textoAceptado : '',
            edadObjetivoConfirmada: confirmacionContinuidad.edadObjetivoConfirmada ?? null,
          }
        : null,
    },
  ]
}

function evaluarCompleto({ caminosViables, disponibilidadCuantia, politicasInvolucradas, fechaBaseMonetaria }) {
  const razonesIncompleto = []

  const politicaNoResuelta = politicasInvolucradas.find((p) => p.aplicaAEsteEjercicio && p.estado === 'NO_RESUELTA')
  if (politicaNoResuelta) {
    razonesIncompleto.push({
      codigo: CODIGOS_RAZON_INCOMPLETO.POLITICA_JURIDICA_NO_RESUELTA,
      mensaje: `La política '${politicaNoResuelta.nombre}' aplica a este ejercicio y no está resuelta: ${politicaNoResuelta.mensaje}`,
    })
  }

  if (caminosViables.length === 0) {
    razonesIncompleto.push({
      codigo: CODIGOS_RAZON_INCOMPLETO.SIN_CAMINOS_AUDITABLES,
      mensaje: 'Ningún camino viable disponible para auditar en este ejercicio.',
    })
  }

  if (disponibilidadCuantia === null || disponibilidadCuantia.estado !== 'CUANTIA_CALCULABLE') {
    razonesIncompleto.push({
      codigo: CODIGOS_RAZON_INCOMPLETO.DISPONIBILIDAD_CUANTIA_INSUFICIENTE,
      mensaje: 'La disponibilidad de cuantía no está confirmada como calculable para este ejercicio.',
    })
  }

  // Deliberadamente independiente de SIN_CAMINOS_AUDITABLES: cuando no hay caminos viables,
  // tampoco hay fecha base monetaria que reunir — ambas razones coexisten, nunca se
  // suprime una para no repetir la misma causa raíz (decisión explícita, ver cabecera).
  if (fechaBaseMonetaria === null) {
    razonesIncompleto.push({
      codigo: CODIGOS_RAZON_INCOMPLETO.FECHA_BASE_MONETARIA_NO_DISPONIBLE,
      mensaje: 'Ningún camino viable de este ejercicio trae una fecha base monetaria.',
    })
  }

  return { completo: razonesIncompleto.length === 0, razonesIncompleto }
}

function evaluarPublicable({ completo, confirmacionesSupuestos, edadJubilacionDeseada }) {
  const razonesNoPublicable = []

  if (!completo) {
    razonesNoPublicable.push({
      codigo: CODIGOS_RAZON_NO_PUBLICABLE.EJERCICIO_NO_COMPLETO,
      mensaje: 'El ejercicio no está completo — ver razonesIncompleto.',
    })
  }

  const confirmacionContinuidad = confirmacionesSupuestos.find((c) => c.codigo === CODIGO_SUPUESTO_CONTINUIDAD)
  const textoAceptadoValido =
    typeof confirmacionContinuidad?.textoAceptado === 'string' && confirmacionContinuidad.textoAceptado.trim().length > 0
  const confirmadaValidamente = confirmacionContinuidad?.confirmado === true && textoAceptadoValido

  if (!confirmadaValidamente) {
    razonesNoPublicable.push({
      codigo: CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_AUSENTE,
      mensaje: 'No existe una confirmación válida del supuesto de continuidad de cotización.',
    })
  }

  // Independiente de la validez de la confirmación (Decisión 2: nunca ocultar causas) —
  // si existe una confirmación (aunque su texto sea inválido) y su edad no coincide, esa
  // causa se reporta también, no se sustituye por CONFIRMACION_AUSENTE.
  if (confirmacionContinuidad && confirmacionContinuidad.edadObjetivoConfirmada !== edadJubilacionDeseada) {
    razonesNoPublicable.push({
      codigo: CODIGOS_RAZON_NO_PUBLICABLE.CONFIRMACION_EDAD_NO_COINCIDE,
      mensaje: 'La confirmación existente corresponde a una edad objetivo distinta de la actual.',
    })
  }

  return { publicable: razonesNoPublicable.length === 0, razonesNoPublicable }
}

/**
 * Contrato F (PL-260 §8) — compone `EjercicioResueltoRPM` a partir de A (elegibilidad),
 * B (disponibilidadCuantia) y E (generarCaminosRPM), ya resueltos. Nunca recalcula ninguna
 * cifra pensional: solo reexpone, valida forma, y decide completo/publicable con reglas
 * propias de este contrato (nunca reglas jurídicas — esas viven en `politicasInvolucradas`,
 * evaluado externamente por evaluarPoliticasEjercicioRPM.js, E5.4, no invocado aquí).
 *
 * @param {Object} input
 * @param {Object} input.resultadoGenerarCaminos - salida completa de generarCaminosRPM(...)
 * @param {number} input.edadJubilacionDeseada
 * @param {Array<{codigo: string, confirmado: boolean, textoAceptado: string, edadObjetivoConfirmada: number}>} [input.confirmacionesSupuestos]
 * @param {Array<{nombre: string, estado: ('RESUELTA'|'NO_RESUELTA'), aplicaAEsteEjercicio: boolean, mensaje: string}>} [input.politicasInvolucradas]
 * @returns {{estado: 'EJERCICIO_CONSTRUIDO', ...} | {estado: 'ENTRADA_INVALIDA', errores: Array<{codigo: string, campo: string, mensaje: string}>}}
 */
export function construirEjercicioResueltoRPM({
  resultadoGenerarCaminos,
  edadJubilacionDeseada,
  confirmacionesSupuestos,
  politicasInvolucradas,
} = {}) {
  const errores = validarEntrada({ resultadoGenerarCaminos, edadJubilacionDeseada, confirmacionesSupuestos, politicasInvolucradas })
  if (errores.length > 0) {
    return { estado: 'ENTRADA_INVALIDA', errores }
  }

  const confirmacionesEntrada = confirmacionesSupuestos ?? []
  const politicasEntrada = politicasInvolucradas ?? []
  const escenarios = resultadoGenerarCaminos.escenarios
  const caminosViables = escenarios.filter((escenario) => escenario.estado === 'viable')
  const disponibilidadCuantia = resultadoGenerarCaminos.disponibilidadCuantia ?? null

  const fechaBaseMonetaria = resolverFechaBaseMonetaria(caminosViables)

  const { completo, razonesIncompleto } = evaluarCompleto({
    caminosViables,
    disponibilidadCuantia,
    politicasInvolucradas: politicasEntrada,
    fechaBaseMonetaria,
  })

  const { publicable, razonesNoPublicable } = evaluarPublicable({
    completo,
    confirmacionesSupuestos: confirmacionesEntrada,
    edadJubilacionDeseada,
  })

  return {
    estado: 'EJERCICIO_CONSTRUIDO',
    fechaBaseMonetaria,
    edadJubilacionDeseada,
    elegibilidad: resultadoGenerarCaminos.elegibilidad ?? null,
    disponibilidadCuantia,
    caminos: escenarios.map(construirCaminoResuelto),
    supuestosEscenario: construirSupuestosEscenario({
      elegibilidad: resultadoGenerarCaminos.elegibilidad,
      confirmacionesSupuestos: confirmacionesEntrada,
    }),
    completo,
    razonesIncompleto,
    publicable,
    razonesNoPublicable,
  }
}
