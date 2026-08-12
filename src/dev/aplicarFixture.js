// Validación y aplicación de fixtures — exclusivamente de desarrollo.
// Deliberadamente pequeño: no es un framework de schemas, solo la defensa
// mínima pedida (claves reconocidas, sin claves desconocidas, campos
// mínimos según la vista destino) para evitar fixtures imposibles o
// incompletos, sin depender únicamente de disciplina manual.

import { CLAVES_ESTADO_EDITABLE, VALORES_POR_DEFECTO, CAMPOS_MINIMOS_POR_VISTA } from './estadoApp.js'

/**
 * @param {import('./fixtures.js').Fixture} fixture
 * @param {string} vistaDestino
 * @returns {{ valido: boolean, errores: string[] }}
 */
export function validarFixture(fixture, vistaDestino) {
  const errores = []

  const clavesFixture = Object.keys(fixture.datos ?? {})
  const clavesDesconocidas = clavesFixture.filter((clave) => !CLAVES_ESTADO_EDITABLE.includes(clave))
  if (clavesDesconocidas.length > 0) {
    errores.push(`Claves no reconocidas en el estado editable: ${clavesDesconocidas.join(', ')}`)
  }

  const camposMinimos = CAMPOS_MINIMOS_POR_VISTA[vistaDestino] ?? []
  const camposFaltantes = camposMinimos.filter((clave) => {
    const valor = fixture.datos?.[clave]
    return valor === undefined || valor === null || valor === ''
  })
  if (camposFaltantes.length > 0) {
    errores.push(`Faltan campos mínimos para "${vistaDestino}": ${camposFaltantes.join(', ')}`)
  }

  return { valido: errores.length === 0, errores }
}

/**
 * Aplica un fixture al estado real de App.jsx — nunca a un estado paralelo.
 * Resetea primero TODAS las claves conocidas a su valor por defecto y luego
 * aplica las que el fixture especifica, para que cargar un fixture sea
 * siempre un punto de partida limpio, sin residuos de una carga anterior.
 *
 * Usa los setters crudos de useState (no los `actualizar*` con cascadas de
 * invalidación de App.jsx) a propósito: aplicar un fixture es una operación
 * atómica sobre el estado completo, no una edición campo por campo — usar
 * los handlers con cascada sería dependiente del orden de aplicación y
 * podría invalidar campos que el propio fixture ya fijó correctamente.
 *
 * @param {import('./fixtures.js').Fixture} fixture
 * @param {Record<string, (valor: *) => void>} setters - uno por cada clave de CLAVES_ESTADO_EDITABLE
 */
export function aplicarFixture(fixture, setters) {
  for (const clave of CLAVES_ESTADO_EDITABLE) {
    const tieneValorPropio = Object.prototype.hasOwnProperty.call(fixture.datos ?? {}, clave)
    const valor = tieneValorPropio ? fixture.datos[clave] : VALORES_POR_DEFECTO[clave]
    setters[clave](valor)
  }
}
