// E6.2 (sprint-4-correcciones-oscar-baldor) — adaptador visual puro y DORMIDO, aprobado en
// E6.1 (PL-260 §9.2). Traduce `EjercicioResueltoRPM` (Contrato F,
// `construirEjercicioResueltoRPM.js`) + `politicasInvolucradas` (salida de
// `evaluarPoliticasEjercicioRPM.js`) a una forma lista para presentación — nunca calcula,
// nunca decide, nunca redacta. Sin consumidor real todavía: `ProyectaTuPensionRPM.jsx` no lo
// invoca hasta E6.3 en adelante (mismo patrón ya usado por `compararAnclaIncrementoRPM.js`,
// dormido de E3-B a E5.4).
//
// Ubicación (Carlos/Atlas, E6.1 §9.2): junto a `ProyectaTuPensionRPM.jsx`, patrón de helpers
// de página (`ordenarCaminosParaPresentacion` en `ProyectaTuPensionRPM.helpers.js`) — no en
// `src/domain/pensionEngine/` (no es una regla pensional) ni extraído a una capa compartida
// todavía, porque tiene un solo consumidor previsto.
//
// Correcciones al modelo conceptual aproximado de PL-260 §9.2 (nombres reales de Contrato F,
// nunca inventados — documentadas aquí y en el informe de este checkpoint):
// 1. `confirmacionContinuidad` NO se reconstruye con los nombres aproximados
//    `requerida`/`confirmada` que sugería §9.2 — esos campos no existen en
//    `EjercicioResueltoRPM`. Se copia literalmente `supuestosEscenario[0]` tal cual F lo
//    produce (`{codigo, origen, requiereConfirmacion, confirmacion:
//    {confirmado, textoAceptado, edadObjetivoConfirmada}|null}`), sin renombrar ni inferir
//    ningún campo — "tomada únicamente de supuestosEscenario, sin inferencias".
// 2. `resumen.esfuerzo` NO sale de ningún paso — `caminos[].esfuerzo` es un campo de primer
//    nivel de `CaminoResuelto` (literal `escenario.esfuerzo`), nunca envuelto en un
//    `PasoAuditable`. Confirmado por lectura directa de `construirEjercicioResueltoRPM.js`
//    (`construirCaminoResuelto`) y por PL-260 §9.1 ("Fuente exacta... caminos[].esfuerzo").
//    Hallazgo colateral (no corregido aquí, fuera de alcance de E6.2 — ampliar el contrato
//    de F no es responsabilidad de este adaptador): F no incluye `esfuerzo` entre los campos
//    que `camposFaltantesCaminoViable()` exige — a diferencia de `ibl`/`ajusteLegal`/etc., un
//    camino viable con `esfuerzo` ausente NO produce `CAMINO_VIABLE_INCOMPLETO` en F.
//    Auditoría (2026-09-20), evidencia adicional: en la práctica esto nunca ocurre desde una
//    salida real de `generarCaminosRPM.js` — `construirCamino()` calcula
//    `esfuerzo: construirEsfuerzo(...)` de forma incondicional para todo escenario `'viable'`
//    (nunca `undefined`, nunca condicionado); el hueco es una ausencia de blindaje explícito
//    en el contrato ya cerrado de F, no un caso alcanzable hoy. Decisión: este adaptador
//    reexpone `esfuerzo` tal cual llegue (incluido `undefined`, si algún día ocurriera) —
//    nunca lo sustituye por `null` ni agrega una validación nueva que F mismo no exige, para
//    no ampliar unilateralmente su contrato.
// 3. El wrapper `estado: 'MODELO_VISUAL_CONSTRUIDO'|'ENTRADA_INVALIDA'` (mismo vocabulario que
//    `EJERCICIO_CONSTRUIDO`/`ENTRADA_INVALIDA` de F y `POLITICAS_EVALUADAS`/`ENTRADA_INVALIDA`
//    de `evaluarPoliticasEjercicioRPM.js`) no estaba en el boceto de §9.2, que no diseñó el
//    caso inválido. Para evitar la colisión de nombre con ese wrapper, el paquete
//    `completo`/`publicable`/razones que §9.2 llamaba `estado` se expone aquí como
//    `estadoEjercicio` — mismos campos, mismos valores, solo el nombre contenedor cambia.
//
// Política de entrada inválida (mínima, sin taxonomía extensa — solo lo que el propio
// adaptador necesita para no indexar sobre una estructura que no puede confiar; nunca revalida
// el resto del contrato de F, que no es su responsabilidad reparar):
// - `ejercicioResuelto` ausente, no objeto, o `estado !== 'EJERCICIO_CONSTRUIDO'`.
// - `ejercicioResuelto.caminos` ausente o no arreglo.
// - `politicasInvolucradas` ausente/null o no arreglo — nunca se asume `[]` por defecto: a
//   diferencia de Contrato F (que sí puede recibir esta entrada como genuinamente opcional),
//   el orquestador de E6 siempre tiene un arreglo real disponible en este punto (paso 2 de
//   PL-260 §9.3) — su ausencia aquí es señal de un llamador mal cableado, nunca "cero
//   políticas".
// - Un camino con `estado` fuera de `'viable'`/`'descartado'`.
// - Un camino `'viable'` sin los 7 códigos de paso exigidos por Contrato F, cada uno
//   exactamente una vez — defensivo: por construcción, `construirPasos()` de F siempre
//   produce los 7, así que esta rama no es alcanzable desde una salida real de F, solo desde
//   entradas sintéticas o futuras inconsistencias de contrato (mismo criterio ya documentado
//   en E5.4 para su propia rama defensiva).
// - Un paso con `codigo` fuera de los 7 conocidos — fail-closed: nunca se descarta en
//   silencio un dato que el adaptador no reconoce (mismo principio ya usado en
//   `evaluarPoliticasEjercicioRPM.js`: "la dirección segura es la misma — nunca resolver en
//   silencio ante una causa desconocida").
// - Dos o más pasos con el mismo `codigo` en el mismo camino — corrección de auditoría
//   (2026-09-20): la comprobación de "faltantes" por sí sola usa `.includes()` (pertenencia),
//   nunca cuenta ocurrencias — un camino con un código duplicado Y otro código realmente
//   ausente pasaba sin error, y `indexarPasosPorCodigo` sobrescribía el primero en silencio
//   (`indexados[paso.codigo] = paso.datos` — último que gana). Detectado y cerrado en la
//   auditoría de E6.2: cualquier código repetido, conocido o no, es `ENTRADA_INVALIDA` —
//   mismo criterio fail-closed que el punto anterior.
// Nunca lanza (throw) — mismo criterio "detención segura" de todo el dominio
// (`ajustarMesadaLegalRPM.js`, `compararAnclaIncrementoRPM.js`, etc.).
//
// Garantía de orden de `pasos` (requisito explícito de E6.2): `pasos` se expone como objeto
// indexado por código (nunca un arreglo que un componente recorra con `.find(...)`), pero
// JavaScript conserva el orden de inserción de claves string no numéricas — como se inserta
// cada código en el mismo orden en que `construirPasos()` de F ya los produce
// (`DATOS_UTILIZADOS → IBL → TASA_REEMPLAZO → RESULTADO_MATEMATICO → AJUSTE_LEGAL →
// RESULTADO_FINAL → COMPARACION_OBJETIVO`), `Object.keys(pasos)`/`Object.entries(pasos)`
// reproducen exactamente ese orden — no hace falta un arreglo paralelo para el Nivel completo.

export const CODIGOS_ENTRADA_INVALIDA = {
  EJERCICIO_RESUELTO_INVALIDO: 'EJERCICIO_RESUELTO_INVALIDO',
  CAMINOS_NO_ES_ARREGLO: 'CAMINOS_NO_ES_ARREGLO',
  POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO: 'POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO',
  CAMINO_CON_ESTADO_DESCONOCIDO: 'CAMINO_CON_ESTADO_DESCONOCIDO',
  CAMINO_VIABLE_SIN_PASOS_COMPLETOS: 'CAMINO_VIABLE_SIN_PASOS_COMPLETOS',
  PASO_CON_CODIGO_DESCONOCIDO: 'PASO_CON_CODIGO_DESCONOCIDO',
  PASO_CON_CODIGO_DUPLICADO: 'PASO_CON_CODIGO_DUPLICADO',
}

// Los 7 códigos que `construirPasos()` de Contrato F produce, en su mismo orden — única
// fuente de verdad de "qué código es válido" para este adaptador. Nunca se amplía aquí sin
// que Contrato F también lo haga primero.
const CODIGOS_PASO_CONOCIDOS = [
  'DATOS_UTILIZADOS',
  'IBL',
  'TASA_REEMPLAZO',
  'RESULTADO_MATEMATICO',
  'AJUSTE_LEGAL',
  'RESULTADO_FINAL',
  'COMPARACION_OBJETIVO',
]

function esObjeto(valor) {
  return valor !== null && typeof valor === 'object'
}

function validarEntrada({ ejercicioResuelto, politicasInvolucradas }) {
  const errores = []

  const ejercicioValido = esObjeto(ejercicioResuelto) && ejercicioResuelto.estado === 'EJERCICIO_CONSTRUIDO'
  if (!ejercicioValido) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.EJERCICIO_RESUELTO_INVALIDO,
      campo: 'ejercicioResuelto',
      mensaje: "ejercicioResuelto ausente, no es un objeto, o su estado no es 'EJERCICIO_CONSTRUIDO'.",
    })
  }

  const caminosValidos = ejercicioValido && Array.isArray(ejercicioResuelto.caminos)
  if (ejercicioValido && !caminosValidos) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.CAMINOS_NO_ES_ARREGLO,
      campo: 'ejercicioResuelto.caminos',
      mensaje: 'ejercicioResuelto.caminos no es un arreglo.',
    })
  }

  if (!Array.isArray(politicasInvolucradas)) {
    errores.push({
      codigo: CODIGOS_ENTRADA_INVALIDA.POLITICAS_INVOLUCRADAS_NO_ES_ARREGLO,
      campo: 'politicasInvolucradas',
      mensaje: 'politicasInvolucradas ausente o no es un arreglo — nunca se asume "sin políticas" por defecto.',
    })
  }

  if (caminosValidos) {
    ejercicioResuelto.caminos.forEach((camino, indice) => {
      if (camino?.estado !== 'viable' && camino?.estado !== 'descartado') {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.CAMINO_CON_ESTADO_DESCONOCIDO,
          campo: `caminos[${indice}].estado`,
          mensaje: `Estado de camino desconocido: '${camino?.estado}'. Se esperaba 'viable' o 'descartado'.`,
        })
        return
      }

      if (camino.estado !== 'viable') return

      const pasos = Array.isArray(camino.pasos) ? camino.pasos : []
      const codigosPresentes = pasos.map((p) => p?.codigo)
      const faltantes = CODIGOS_PASO_CONOCIDOS.filter((c) => !codigosPresentes.includes(c))
      if (faltantes.length > 0) {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.CAMINO_VIABLE_SIN_PASOS_COMPLETOS,
          campo: `caminos[${indice}].pasos`,
          mensaje: `Camino viable '${camino.id}' no trae los 7 pasos exigidos por Contrato F. Faltan: ${faltantes.join(', ')}.`,
        })
      }

      // Detección de duplicados (corrección de auditoría, ver nota de cabecera): cuenta
      // ocurrencias de cada código presente — `faltantes` (arriba) solo verifica pertenencia,
      // nunca cantidad, así que por sí solo no detecta un código repetido. Un código repetido,
      // conocido o no, nunca puede indexarse de forma segura (el segundo pisaría al primero).
      const conteoPorCodigo = new Map()
      for (const c of codigosPresentes) {
        conteoPorCodigo.set(c, (conteoPorCodigo.get(c) ?? 0) + 1)
      }
      const duplicados = [...conteoPorCodigo.entries()].filter(([, cantidad]) => cantidad > 1).map(([c]) => c)
      if (duplicados.length > 0) {
        errores.push({
          codigo: CODIGOS_ENTRADA_INVALIDA.PASO_CON_CODIGO_DUPLICADO,
          campo: `caminos[${indice}].pasos`,
          mensaje: `Camino viable '${camino.id}' trae códigos de paso repetidos: ${duplicados.join(', ')}. Cada código debe aparecer exactamente una vez — nunca se indexa sobrescribiendo uno en silencio.`,
        })
      }

      pasos.forEach((paso, indicePaso) => {
        if (!CODIGOS_PASO_CONOCIDOS.includes(paso?.codigo)) {
          errores.push({
            codigo: CODIGOS_ENTRADA_INVALIDA.PASO_CON_CODIGO_DESCONOCIDO,
            campo: `caminos[${indice}].pasos[${indicePaso}].codigo`,
            mensaje: `Código de paso desconocido: '${paso?.codigo}'. Códigos válidos: ${CODIGOS_PASO_CONOCIDOS.join(', ')}.`,
          })
        }
      })
    })
  }

  return errores
}

// Indexa por código — construye un objeto NUEVO (nunca muta `pasos`), asignando
// `datos` literal de cada paso (misma referencia, nunca clonada). El orden de inserción
// reproduce el orden original de F (ver nota de garantía de orden, cabecera del archivo).
function indexarPasosPorCodigo(pasos) {
  const indexados = {}
  for (const paso of pasos) {
    indexados[paso.codigo] = paso.datos
  }
  return indexados
}

// Extrae del paso RESULTADO_FINAL y del paso COMPARACION_OBJETIVO los cuatro datos del
// resumen esencial — nunca recalcula ninguno, solo los lee de los pasos exactos aprobados
// (PL-260 §9.1, columna "Fuente exacta"). `esfuerzo` no viene de ningún paso (ver nota #2 de
// la cabecera) — se recibe ya resuelto desde `caminos[].esfuerzo`.
function construirResumenCamino(pasosIndexados, esfuerzo) {
  const { valor: cifraFinal } = pasosIndexados.RESULTADO_FINAL
  const { cumple: cumpleObjetivo, delta, valorObjetivo } = pasosIndexados.COMPARACION_OBJETIVO
  return { cifraFinal, cumpleObjetivo, delta, valorObjetivo, esfuerzo }
}

function construirConfirmacionContinuidad(supuestosEscenario) {
  if (!Array.isArray(supuestosEscenario) || supuestosEscenario.length === 0) return null
  // Literal, sin reconstruir campos (ver nota #1 de la cabecera) — "sin inferencias".
  return supuestosEscenario[0]
}

// I6 (heredado de Contrato F): el orden de `caminos` en el modelo visual es exactamente el
// de `ejercicioResuelto.caminos` — `.map()` nunca reordena.
function construirCaminoVisual(camino) {
  const identidad = { id: camino.id, tipo: camino.tipo, estado: camino.estado, decision: camino.decision }

  if (camino.estado === 'descartado') {
    return { ...identidad, resumen: null, pasos: null, razonDescartado: camino.razonDescartado }
  }

  const pasosIndexados = indexarPasosPorCodigo(camino.pasos)
  return {
    ...identidad,
    resumen: construirResumenCamino(pasosIndexados, camino.esfuerzo),
    pasos: pasosIndexados,
    razonDescartado: null,
  }
}

/**
 * Adaptador visual puro (E6.2, PL-260 §9.2) — traduce `EjercicioResueltoRPM` (Contrato F) +
 * `politicasInvolucradas` a un modelo listo para presentación, sin calcular, decidir ni
 * redactar nada nuevo. Dormido: ningún componente lo invoca todavía.
 *
 * @param {Object} params
 * @param {Object} params.ejercicioResuelto - salida de `construirEjercicioResueltoRPM(...)`
 *   con `estado: 'EJERCICIO_CONSTRUIDO'`.
 * @param {Array<{nombre: string, estado: ('RESUELTA'|'NO_RESUELTA'), aplicaAEsteEjercicio: boolean, mensaje: string}>} params.politicasInvolucradas -
 *   la misma salida de `evaluarPoliticasEjercicioRPM(...)` que el orquestador ya usó para
 *   construir `ejercicioResuelto` — entrada separada, nunca derivada de F (F no la reexpone).
 * @returns {
 *   {
 *     estado: 'MODELO_VISUAL_CONSTRUIDO',
 *     estadoEjercicio: {completo: boolean, publicable: boolean, razonesIncompleto: Array, razonesNoPublicable: Array},
 *     confirmacionContinuidad: {codigo: string, origen: string, requiereConfirmacion: boolean, confirmacion: Object|null} | null,
 *     politicasJuridicas: Array<Object>,
 *     caminos: Array<{
 *       id: string, tipo: string, estado: ('viable'|'descartado'), decision: string,
 *       resumen: {cifraFinal: number, cumpleObjetivo: boolean, delta: number, valorObjetivo: number, esfuerzo: Object} | null,
 *       pasos: Record<string, Object> | null,
 *       razonDescartado: Object | null,
 *     }>,
 *   }
 *   | {estado: 'ENTRADA_INVALIDA', errores: Array<{codigo: string, campo: string, mensaje: string}>}
 * }
 */
export function construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas } = {}) {
  const errores = validarEntrada({ ejercicioResuelto, politicasInvolucradas })
  if (errores.length > 0) {
    return { estado: 'ENTRADA_INVALIDA', errores }
  }

  return {
    estado: 'MODELO_VISUAL_CONSTRUIDO',
    estadoEjercicio: {
      completo: ejercicioResuelto.completo,
      publicable: ejercicioResuelto.publicable,
      razonesIncompleto: ejercicioResuelto.razonesIncompleto,
      razonesNoPublicable: ejercicioResuelto.razonesNoPublicable,
    },
    confirmacionContinuidad: construirConfirmacionContinuidad(ejercicioResuelto.supuestosEscenario),
    politicasJuridicas: [...politicasInvolucradas],
    caminos: ejercicioResuelto.caminos.map(construirCaminoVisual),
  }
}
