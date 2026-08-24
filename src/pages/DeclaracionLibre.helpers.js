// Lógica pura de DeclaracionLibre.jsx (precisión de producto S4-006, 2026-08-23) — mismo
// criterio ya usado en el resto del proyecto: separada del archivo de página para poder
// testear sin montar el componente.
//
// confirmarCamposInterpretados es el ÚNICO punto de esta pantalla que invoca los setters
// compartidos de App.jsx (onCambiarObjetivoPensionMensual, etc.) — y solo se llama desde el
// manejador de clic del CTA final ("Usar estos datos y explorar mis opciones"), nunca
// automáticamente al recibir o fusionar una interpretación. Relocada tal cual desde
// RevisionDeclaracionTemporal.helpers.js (retirado: su pantalla se fusionó dentro de
// DeclaracionLibre.jsx en esta ronda — "revisión embebida en DeclaracionLibre").

const CAMPOS_INTERPRETABLES_LOCAL = [
  'objetivoPensionMensual',
  'restriccionCostoPensionalAdicionalMaximoMensual',
  'edadJubilacionDeseada',
]

export function camposBorradorVacios() {
  return {
    objetivoPensionMensual: null,
    restriccionCostoPensionalAdicionalMaximoMensual: null,
    edadJubilacionDeseada: null,
  }
}

function valorNumericoDeCampo(campo, valorObjeto) {
  return campo === 'edadJubilacionDeseada' ? valorObjeto.valorAnios : valorObjeto.valorCOP
}

/**
 * Punto de partida de un borrador nuevo a partir de un ResultadoInterpretacion —
 * exclusivamente los tres campos que el dominio ya sabe consumir (S4-003).
 *
 * @param {import('../ia/adaptadores/AdaptadorInterpretacionIA.js').ResultadoInterpretacion} resultado
 */
export function borradorDesdeResultado(resultado) {
  const campos = {}
  for (const campo of CAMPOS_INTERPRETABLES_LOCAL) {
    const valorObjeto = resultado.campos[campo]
    campos[campo] = valorObjeto ? valorNumericoDeCampo(campo, valorObjeto) : null
  }
  return campos
}

/**
 * Fusiona una nueva interpretación sobre un borrador ya existente — regla única y
 * simétrica en los dos sentidos que exige el flujo reactivo:
 *   - Un campo que la nueva interpretación SÍ encontró (no null) siempre gana: puede venir
 *     de una redacción distinta que corrige o contradice lo que había antes, y esa
 *     corrección debe reflejarse para que la persona la revise antes de confirmar (nunca
 *     se escribe sola en el expediente — eso lo sigue haciendo solo el CTA).
 *   - Un campo que la nueva interpretación NO encontró (null) nunca borra lo que ya había
 *     en el borrador — ni lo interpretado antes, ni lo que la persona completó a mano en un
 *     control de "dato faltante". Es la misma propiedad de "un olvido no borra un dato
 *     previo" ya exigida para el expediente, aplicada aquí al borrador todavía sin
 *     confirmar.
 *
 * @param {{objetivoPensionMensual: (number|null), restriccionCostoPensionalAdicionalMaximoMensual: (number|null), edadJubilacionDeseada: (number|null)}} borradorActual
 * @param {import('../ia/adaptadores/AdaptadorInterpretacionIA.js').ResultadoInterpretacion} resultadoNuevo
 */
export function fusionarBorrador(borradorActual, resultadoNuevo) {
  const fusionado = { ...borradorActual }
  for (const campo of CAMPOS_INTERPRETABLES_LOCAL) {
    const valorObjeto = resultadoNuevo.campos[campo]
    if (valorObjeto !== null) {
      fusionado[campo] = valorNumericoDeCampo(campo, valorObjeto)
    }
  }
  return fusionado
}

/**
 * @param {{objetivoPensionMensual: number|null, restriccionCostoPensionalAdicionalMaximoMensual: number|null, edadJubilacionDeseada: number|null}} campos -
 *   valores finales del borrador en el momento del clic en el CTA — pueden venir de la
 *   interpretación IA, editados por la persona, completados a mano como "dato faltante", o
 *   dejados en null si no aplica.
 * @param {Object} setters
 * @param {(valor: string) => void} setters.onCambiarObjetivoPensionMensual
 * @param {(valor: string) => void} setters.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual
 * @param {(valor: string) => void} setters.onCambiarEdadJubilacionDeseada
 */
export function confirmarCamposInterpretados(campos, setters) {
  if (campos.objetivoPensionMensual !== null) {
    setters.onCambiarObjetivoPensionMensual(String(campos.objetivoPensionMensual))
  }
  if (campos.restriccionCostoPensionalAdicionalMaximoMensual !== null) {
    setters.onCambiarRestriccionCostoPensionalAdicionalMaximoMensual(
      String(campos.restriccionCostoPensionalAdicionalMaximoMensual)
    )
  }
  if (campos.edadJubilacionDeseada !== null) {
    setters.onCambiarEdadJubilacionDeseada(String(campos.edadJubilacionDeseada))
  }
}

// Convierte el valor crudo (string, como lo guarda App.jsx) de un campo ya confirmado del
// expediente a number|null — mismo criterio de validación mínima ya usado en
// ProyectaTuPensionRPM.jsx/ExploraTuProyeccion.jsx (validarMontoNoNegativo): cadena vacía o
// no numérica se trata como "no hay valor todavía", nunca como 0 ni como error.
export function numeroDesdeExpediente(valorTexto) {
  if (valorTexto === '' || valorTexto === null || valorTexto === undefined) return null
  const numero = Number(valorTexto)
  return Number.isFinite(numero) ? numero : null
}
