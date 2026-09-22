// E6.3 (sprint-4-correcciones-oscar-baldor) — orquestador puro, aprobado en E6.1 (PL-260 §9.3)
// e implementado en E6.3. Encadena los tres pasos que E6.1/E6.2 ya cerraron
// (`evaluarPoliticasEjercicioRPM` → `construirEjercicioResueltoRPM` →
// `construirModeloVisualEjercicioRPM`) sobre un `resultado` de `generarCaminosRPM(...)` ya
// calculado — nunca invoca `generarCaminosRPM` (paso 1 de §9.3, responsabilidad exclusiva del
// llamador, que ya lo ejecuta una sola vez por render en `ProyectaTuPensionRPM.jsx`).
//
// Nació dormido (sin consumidor visible en E6.3) — conectado en firme desde E6.5 (PL-260
// §9.5): `ProyectaTuPensionRPM.jsx` lo invoca en cada render (`cadenaVisual`, sin ningún
// interruptor local) y su salida (`modeloVisual`) alimenta el "Nivel esencial" y el "Nivel
// completo" reales de esa pantalla — mismo patrón que `compararAnclaIncrementoRPM.js`
// (E3-B→E5.4) y `construirModeloVisualEjercicioRPM.js` (E6.1→E6.2), ambos conectados desde
// entonces.
//
// Contrato de salida (Carlos/Atlas, cierre de E6.3):
// - `resultado` ausente (`null`/`undefined`) → `null`. Es el único caso que devuelve `null`
//   — la ausencia de un ejercicio que evaluar no es un fallo, es un estado de dominio válido
//   (mismo criterio que la propia página ya aplica a `resultado`).
// - Cualquier otro caso SIEMPRE devuelve un objeto cerrado, nunca `null` ni una excepción:
//   ninguna de las tres etapas internas lanza (`evaluarPoliticasEjercicioRPM`,
//   `construirEjercicioResueltoRPM` y `construirModeloVisualEjercicioRPM` ya son "detención
//   segura, sin throw" por diseño cerrado) — este orquestador hereda esa garantía y nunca la
//   rompe envolviendo una etapa fallida en `null` (eso "ocultaría" el fallo en vez de
//   reportarlo).
// - Éxito: `{ estado: 'CADENA_VISUAL_CONSTRUIDA', politicasInvolucradas, ejercicioResuelto,
//   modeloVisual }` — los tres valores son exactamente los que cada etapa produjo, nunca
//   copias ni reconstrucciones.
// - Fallo en cualquier etapa: `{ estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa: 'POLITICAS' |
//   'EJERCICIO' | 'MODELO_VISUAL', detalle: <salida completa de esa etapa> }` — nunca se
//   avanza a la etapa siguiente cuando la anterior no alcanzó su estado exitoso esperado
//   (`POLITICAS_EVALUADAS`, `EJERCICIO_CONSTRUIDO`, `MODELO_VISUAL_CONSTRUIDO`
//   respectivamente). `detalle` es la salida ORIGINAL de la etapa que falló (incluida su
//   propia forma `{estado, errores}`), nunca reinterpretada ni resumida.
//
// `confirmacionesSupuestos` se recibe tal cual del llamador — este archivo nunca inventa,
// completa ni infiere una confirmación. En E6.3 (sin gate de confirmación real todavía, ver
// PL-260 §9.4), `ProyectaTuPensionRPM.jsx` lo invocaba siempre con `[]`. Desde E6.4/E6.5, ese
// gate existe (`confirmacionContinuidad`, estado real de `App.jsx`) y el llamador pasa
// `confirmacionContinuidad ? [confirmacionContinuidad] : []` — exactamente el arreglo real,
// tal como esta nota ya anticipaba: este orquestador no cambió.
//
// Segundo parámetro `overridesSoloParaPruebas` (mecanismo de inyección de dependencias
// mínimo, exclusivo de pruebas): permite sustituir una de las tres funciones de etapa por un
// doble de prueba, para ejercitar la rama defensiva `MODELO_VISUAL` — estructuralmente
// inalcanzable con las tres funciones reales encadenadas (si `POLITICAS` y `EJERCICIO`
// tuvieron éxito con datos reales, `ejercicioResuelto` y `politicasInvolucradas` ya satisfacen
// por construcción todo lo que `construirModeloVisualEjercicioRPM` exige — E6.2 lo cierra sin
// ninguna validación alcanzable desde una salida real de F). `ProyectaTuPensionRPM.jsx` NUNCA
// debe pasar este segundo parámetro — su sola existencia es para pruebas.

import { evaluarPoliticasEjercicioRPM } from '../domain/pensionEngine/evaluarPoliticasEjercicioRPM.js'
import { construirEjercicioResueltoRPM } from '../domain/pensionEngine/construirEjercicioResueltoRPM.js'
import { construirModeloVisualEjercicioRPM } from './construirModeloVisualEjercicioRPM.js'

export const ETAPAS_CADENA_VISUAL = {
  POLITICAS: 'POLITICAS',
  EJERCICIO: 'EJERCICIO',
  MODELO_VISUAL: 'MODELO_VISUAL',
}

function fallo(etapa, detalle) {
  return { estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa, detalle }
}

/**
 * Orquestador puro y dormido (E6.3, PL-260 §9.3) — encadena las tres etapas ya cerradas de
 * E6.1/E6.2 sobre un `resultado` de `generarCaminosRPM(...)` ya calculado, sin recalcularlo.
 *
 * @param {Object} params
 * @param {Object|null|undefined} params.resultado - salida completa de `generarCaminosRPM(...)`,
 *   reutilizada literalmente — este archivo nunca la recalcula ni vuelve a invocar
 *   `generarCaminosRPM`.
 * @param {('Mujer'|'Hombre')} params.sexo
 * @param {number} params.edadJubilacionDeseada - debe ser el mismo valor ya usado para
 *   producir `resultado` (ej. `edadValida` en `ProyectaTuPensionRPM.jsx`), nunca uno distinto.
 * @param {Array<{codigo: string, confirmado: boolean, textoAceptado: string, edadObjetivoConfirmada: number}>} params.confirmacionesSupuestos -
 *   recibido tal cual, nunca inventado por este archivo.
 * @param {{
 *   evaluarPoliticasEjercicioRPM?: Function,
 *   construirEjercicioResueltoRPM?: Function,
 *   construirModeloVisualEjercicioRPM?: Function,
 * }} [overridesSoloParaPruebas] - inyección de dependencias mínima, exclusiva de pruebas.
 * @returns {
 *   null
 *   | {estado: 'CADENA_VISUAL_CONSTRUIDA', politicasInvolucradas: Array, ejercicioResuelto: Object, modeloVisual: Object}
 *   | {estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa: ('POLITICAS'|'EJERCICIO'|'MODELO_VISUAL'), detalle: Object}
 * }
 */
export function construirCadenaVisualEjercicioRPM(
  { resultado, sexo, edadJubilacionDeseada, confirmacionesSupuestos } = {},
  overridesSoloParaPruebas = {}
) {
  if (resultado === null || resultado === undefined) return null

  // Blindaje (auditoría de E6.3, 2026-09-20): el parámetro por defecto `= {}` de JavaScript
  // solo se activa cuando el argumento recibido es EXACTAMENTE `undefined` — un `null`
  // explícito lo deja en `null`, y acceder a sus propiedades lanzaría un TypeError. Nunca
  // ocurre desde `ProyectaTuPensionRPM.jsx` (nunca pasa un segundo argumento), pero este
  // orquestador nunca lanza por contrato — mismo criterio ya aplicado a `fechaAplicacionRegla`
  // en E5.4 (`compararAnclaIncrementoRPM.js`/`evaluarPoliticasEjercicioRPM.js`).
  const overrides = overridesSoloParaPruebas ?? {}

  const evaluarPoliticasFn = overrides.evaluarPoliticasEjercicioRPM ?? evaluarPoliticasEjercicioRPM
  const construirEjercicioFn = overrides.construirEjercicioResueltoRPM ?? construirEjercicioResueltoRPM
  const construirModeloVisualFn = overrides.construirModeloVisualEjercicioRPM ?? construirModeloVisualEjercicioRPM

  const resultadoPoliticas = evaluarPoliticasFn({ resultadoGenerarCaminos: resultado, sexo })
  if (resultadoPoliticas.estado !== 'POLITICAS_EVALUADAS') {
    return fallo(ETAPAS_CADENA_VISUAL.POLITICAS, resultadoPoliticas)
  }
  const { politicasInvolucradas } = resultadoPoliticas

  const ejercicioResuelto = construirEjercicioFn({
    resultadoGenerarCaminos: resultado,
    edadJubilacionDeseada,
    confirmacionesSupuestos,
    politicasInvolucradas,
  })
  if (ejercicioResuelto.estado !== 'EJERCICIO_CONSTRUIDO') {
    return fallo(ETAPAS_CADENA_VISUAL.EJERCICIO, ejercicioResuelto)
  }

  const modeloVisual = construirModeloVisualFn({ ejercicioResuelto, politicasInvolucradas })
  if (modeloVisual.estado !== 'MODELO_VISUAL_CONSTRUIDO') {
    return fallo(ETAPAS_CADENA_VISUAL.MODELO_VISUAL, modeloVisual)
  }

  return { estado: 'CADENA_VISUAL_CONSTRUIDA', politicasInvolucradas, ejercicioResuelto, modeloVisual }
}
