// Validación SEMÁNTICA de una respuesta del modelo — deliberadamente distinta y adicional
// al JSON Schema de interpretacionDeclaracion.schema.js. El schema (con strict:true)
// garantiza la FORMA (tipos, enums, claves requeridas); nunca garantiza COHERENCIA
// (relaciones entre campos que un JSON Schema no puede expresar). Mismo Principio 11 ya
// aplicado en todo el proyecto: nunca se confía en una etiqueta sola sin verificar que el
// resto de la respuesta es consistente con ella — un payload puede ser 100% válido contra
// el schema y aun así ser semánticamente incoherente (p. ej. estado:'interpretado' con los
// tres campos en null).
//
// No corrige ni adivina nada — una respuesta inconsistente se descarta por completo, nunca
// se "arregla" quedándose con la parte que sí parece razonable (mismo criterio que
// evaluarDeclaracion.js: nunca inventar una declaración a partir de datos que no llegaron
// bien).

import { CAMPOS_INTERPRETABLES, ESTADOS_INTERPRETACION } from './contratos/interpretacionDeclaracion.schema.js'

const EDAD_MINIMA_RAZONABLE = 1
// Mismo orden de magnitud que EDAD_MAXIMA_FUNCIONAL de ProyectaTuPensionRPM.jsx —
// deliberadamente no importada desde ahí, para no acoplar esta capa de IA (que no sabe
// nada de RPM/RAIS) a una pantalla concreta de un régimen.
const EDAD_MAXIMA_RAZONABLE = 100

function campoMonetarioValido(campo) {
  if (campo === null) return true
  return typeof campo.valorCOP === 'number' && Number.isFinite(campo.valorCOP) && campo.valorCOP > 0
}

function campoEdadValido(campo) {
  if (campo === null) return true
  return (
    Number.isInteger(campo.valorAnios) && campo.valorAnios >= EDAD_MINIMA_RAZONABLE && campo.valorAnios <= EDAD_MAXIMA_RAZONABLE
  )
}

// Guarda de forma, defensiva y barata — nunca asume que un payload ya pasó por el JSON
// Schema del proveedor solo porque "debería" haberlo hecho (Principio 11: esta función no
// confía en ninguna capa anterior, incluida la propia validación de OpenAI). No sustituye
// al JSON Schema — solo evita que un valor con forma inesperada llegue a los chequeos
// semánticos de abajo y produzca un resultado incorrecto o una excepción.
function tieneFormaEsperada(bruto) {
  if (bruto === null || typeof bruto !== 'object') return false
  if (!ESTADOS_INTERPRETACION.includes(bruto.estado)) return false
  if (bruto.campos === null || typeof bruto.campos !== 'object') return false
  if (!CAMPOS_INTERPRETABLES.every((c) => c in bruto.campos)) return false
  if (!Array.isArray(bruto.camposAmbiguos)) return false
  if (typeof bruto.razonCodigo !== 'string' && bruto.razonCodigo !== null) return false
  return true
}

/**
 * @param {Object} bruto - payload que se espera válido contra el JSON Schema (estado,
 *   campos, camposAmbiguos, razonCodigo) — nunca se asume, se verifica también aquí.
 * @returns {boolean}
 */
export function esInterpretacionConsistente(bruto) {
  if (!tieneFormaEsperada(bruto)) return false

  const { estado, campos, camposAmbiguos, razonCodigo } = bruto

  if (!campoMonetarioValido(campos.objetivoPensionMensual)) return false
  if (!campoMonetarioValido(campos.restriccionCostoPensionalAdicionalMaximoMensual)) return false
  if (!campoEdadValido(campos.edadJubilacionDeseada)) return false

  const algunCampoPresente = CAMPOS_INTERPRETABLES.some((c) => campos[c] !== null)

  if (estado === 'interpretado') {
    // "Interpreté" pero no trajo ningún campo — contradictorio, no se acepta.
    if (!algunCampoPresente) return false
    if (razonCodigo !== null) return false
  } else {
    // insuficiente / ambiguo / no_pertinente: ningún campo debería traer un valor que
    // pudiera colarse a un formulario como si fuera una interpretación real.
    if (algunCampoPresente) return false
    if (razonCodigo === null) return false
  }

  if (estado === 'ambiguo') {
    if (camposAmbiguos.length === 0) return false
  } else if (camposAmbiguos.length > 0) {
    // Solo 'ambiguo' puede señalar campos ambiguos — cualquier otro estado con esta lista
    // no vacía contradice su propio estado.
    return false
  }

  return true
}
