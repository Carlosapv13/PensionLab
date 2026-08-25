// Validación del cuerpo de la petición HTTP entrante a api/explicar-caminos.js — hermano de
// validarPeticion.js (S4-006), defensa en profundidad server-side (Principio 11): el
// servidor nunca confía en que el cliente ya validó, aunque
// AdaptadorExplicacionViaServidor.js (cliente) ya solo envíe exactamente esta forma.
// Rechaza explícitamente cualquier clave adicional — nunca el expediente completo, nunca
// campos que la app no pidió.

const LONGITUD_MAXIMA_DECLARACION_LIBRE = 2000
const LIMITE_ESCENARIOS = 5 // generarCaminosRPM.js produce hoy como máximo 2 (base + alternativo); margen generoso, no ilimitado

function esObjetoPlano(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
}

function escenarioTieneFormaEsperada(escenario) {
  return (
    esObjetoPlano(escenario) &&
    typeof escenario.id === 'string' &&
    escenario.id.length > 0 &&
    typeof escenario.decision === 'string' &&
    typeof escenario.tipo === 'string' &&
    (typeof escenario.cumpleObjetivo === 'boolean' || escenario.cumpleObjetivo === null)
  )
}

function hechosTienenFormaEsperada(hechos) {
  if (!esObjetoPlano(hechos)) return false
  if (!esObjetoPlano(hechos.porEscenario) || !esObjetoPlano(hechos.global)) return false
  return Object.values(hechos.porEscenario).every(
    (diccionario) => esObjetoPlano(diccionario) && Object.values(diccionario).every((v) => typeof v === 'string')
  )
}

function contextoTieneFormaEsperada(contexto) {
  if (!esObjetoPlano(contexto)) return false
  const { declaracionLibre, caminoMasAlineadoId } = contexto
  if (declaracionLibre !== null && typeof declaracionLibre !== 'string') return false
  if (typeof declaracionLibre === 'string' && declaracionLibre.length > LONGITUD_MAXIMA_DECLARACION_LIBRE) return false
  if (caminoMasAlineadoId !== null && typeof caminoMasAlineadoId !== 'string') return false
  return true
}

/**
 * @param {*} body - req.body ya parseado como JSON
 * @returns {{valido: true, escenarios: Array<Object>, hechos: Object, contexto: Object} | {valido: false, codigo: string}}
 */
export function validarPeticionExplicacion(body) {
  if (!esObjetoPlano(body)) {
    return { valido: false, codigo: 'CUERPO_INVALIDO' }
  }

  const claves = Object.keys(body)
  const clavesPermitidas = ['escenarios', 'hechos', 'contexto']
  if (claves.length !== clavesPermitidas.length || !clavesPermitidas.every((c) => claves.includes(c))) {
    return { valido: false, codigo: 'CLAVES_NO_PERMITIDAS' }
  }

  if (!Array.isArray(body.escenarios) || body.escenarios.length === 0) {
    return { valido: false, codigo: 'ESCENARIOS_INVALIDOS' }
  }
  if (body.escenarios.length > LIMITE_ESCENARIOS) {
    return { valido: false, codigo: 'DEMASIADOS_ESCENARIOS' }
  }
  if (!body.escenarios.every(escenarioTieneFormaEsperada)) {
    return { valido: false, codigo: 'ESCENARIOS_INVALIDOS' }
  }

  if (!hechosTienenFormaEsperada(body.hechos)) {
    return { valido: false, codigo: 'HECHOS_INVALIDOS' }
  }

  if (!contextoTieneFormaEsperada(body.contexto)) {
    return { valido: false, codigo: 'CONTEXTO_INVALIDO' }
  }

  return { valido: true, escenarios: body.escenarios, hechos: body.hechos, contexto: body.contexto }
}
