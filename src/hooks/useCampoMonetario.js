// Formatea un campo monetario editable con separadores de miles sin tocar el
// valor canónico (App.jsx sigue guardando una cadena de solo dígitos, y el
// dominio sigue recibiendo exactamente lo mismo que antes) y sin manejar
// posición de cursor: mientras el campo tiene foco se ve el valor crudo
// (igual que hoy), y solo se formatea al perder el foco — evita por
// construcción el salto de cursor que tendría formatear en cada tecleo,
// a costa de no ver los separadores mientras se escribe. Decisión explícita
// de cambio mínimo, no una limitación técnica sin salida (ver análisis
// aprobado: formatear en vivo es posible pero exige más lógica y más casos
// límite — paste, selección, IME — para un beneficio menor).
//
// onChange sigue limpiando con replace(/\D/g, ''), sin cambios: cualquier
// separador que aparezca en lo que el usuario ve (incluidos los que él mismo
// escriba) ya se descarta ahí, así que este hook no necesita una función de
// "parseo" propia.

import { useState } from 'react'
import { formatearMilesInput } from '../format/formatearDinero.js'

/**
 * @param {string} valorCrudo - cadena de solo dígitos, como la guarda el estado
 * @param {(valor: string) => void} onCambiar
 * @returns {{
 *   value: string,
 *   onChange: (e: import('react').ChangeEvent<HTMLInputElement>) => void,
 *   onFocus: () => void,
 *   onBlur: () => void,
 *   onKeyDown: (e: import('react').KeyboardEvent<HTMLInputElement>) => void,
 * }}
 */
export function useCampoMonetario(valorCrudo, onCambiar) {
  const [enfocado, setEnfocado] = useState(false)

  return {
    value: enfocado ? valorCrudo : formatearMilesInput(valorCrudo),
    onChange: (e) => onCambiar(e.target.value.replace(/\D/g, '')),
    onFocus: () => setEnfocado(true),
    onBlur: () => setEnfocado(false),
    // Enter termina la edición igual que salir del campo (reutiliza onBlur
    // de arriba, sin duplicar el formateo) — preventDefault es necesario
    // porque BaseCotizacion.jsx tiene un botón submit real: sin él, el
    // navegador completaría la sumisión implícita del formulario (y
    // navegaría) al mismo tiempo que este campo se desenfoca.
    onKeyDown: (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      e.currentTarget.blur()
    },
  }
}
