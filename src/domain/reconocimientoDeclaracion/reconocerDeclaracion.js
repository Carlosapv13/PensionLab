// Orquestador de la capacidad de reconocimiento (Sprint 3, Fase 2). Coordina la
// secuencia obligatoria: solo evalúa aptitud si la declaración tiene contenido, y
// ensambla el resultado final — no contiene ningún criterio de juicio propio.
//
// LIMITACIÓN EXPLÍCITA DE v1: no invoca ninguna resolución de estructura —
// `resolverEstructura` no existe todavía (ver docs/gestion/cierre-sprint-3.md,
// "Diseño físico final — Sprint 3"). El resultado nunca incluye el campo
// `estructura`, para ningún caso, hasta que esa función se implemente con
// evidencia real.

import { reconocerAptitud } from './reconocerAptitud.js'

const VERSION_RECONOCIMIENTO = 'v1'

/**
 * @param {import('../contracts/ReconocimientoDeclaracion.js').DeclaracionLibre} declaracion
 * @returns {import('../contracts/ReconocimientoDeclaracion.js').ResultadoReconocimiento}
 */
export function reconocerDeclaracion(declaracion) {
  if (!declaracion || (declaracion.tipo !== 'contenido' && declaracion.tipo !== 'ausencia')) {
    throw new Error('reconocerDeclaracion: declaracion.tipo debe ser "contenido" o "ausencia"')
  }

  if (declaracion.tipo === 'contenido' && typeof declaracion.texto !== 'string') {
    throw new Error(
      'reconocerDeclaracion: declaracion.texto es obligatorio cuando tipo es "contenido"'
    )
  }

  if (declaracion.tipo === 'ausencia') {
    return {
      version: VERSION_RECONOCIMIENTO,
      declaracionOriginal: declaracion,
    }
  }

  return {
    version: VERSION_RECONOCIMIENTO,
    declaracionOriginal: declaracion,
    aptitud: reconocerAptitud(declaracion.texto),
  }
}
