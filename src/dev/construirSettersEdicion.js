// Selección de setter para la edición manual en el panel de desarrollo — no
// crea ninguna cascada de invalidación nueva, solo elige cuál función ya
// existente de App.jsx usar por campo: la semántica (`actualizar*`, con sus
// invariantes ya definidos) cuando existe, la cruda de useState cuando no.
//
// Distinto de aplicarFixture.js a propósito: cargar un fixture es una
// operación atómica sobre el estado completo (siempre setters crudos, ver
// aplicarFixture.js); editar un campo después de cargarlo es una interacción
// puntual que debe comportarse igual que si ocurriera en la pantalla
// productiva real — de ahí la necesidad de este segundo mapa de setters.

import { CLAVES_ESTADO_EDITABLE } from './estadoApp.js'

/**
 * @param {Record<string, (valor: *) => void>} settersCrudos - uno por cada CLAVES_ESTADO_EDITABLE
 * @param {Record<string, (valor: *) => void>} settersSemanticos - subconjunto: las funciones `actualizar*` que App.jsx ya expone
 * @returns {Record<string, (valor: *) => void>} un setter por cada CLAVES_ESTADO_EDITABLE — el semántico cuando existe, el crudo en caso contrario
 */
export function construirSettersEdicion(settersCrudos, settersSemanticos) {
  const resultado = {}
  for (const clave of CLAVES_ESTADO_EDITABLE) {
    resultado[clave] = settersSemanticos[clave] ?? settersCrudos[clave]
  }
  return resultado
}
