// Hook compartido — resuelve el hallazgo de navegación por teclado: al usar
// "Volver", React desmonta el <form> de la pantalla actual (incluido el botón
// enfocado) y lo remonta al regresar. El foco cae de vuelta a <body> — fuera
// de cualquier <form> — así que el envío implícito nativo de Enter deja de
// tener un control donde dispararse, aunque los datos y "Continuar" sigan
// intactos. Ver docs/gestion/cierre-sprint-3.md, estándar de navegación por
// Enter (comportamiento 100% nativo de <form>/onSubmit, sin listeners de
// teclado propios) — este hook no interfiere con ese mecanismo, solo decide
// dónde queda el foco al montar.
//
// Prioridad, deliberadamente genérica (no conoce nada específico de cada
// pantalla):
//   1. El control ya marcado (radio o checkbox `:checked`) — el caso típico
//      de "Volver" con una respuesta ya dada.
//   2. Si no hay ninguno marcado, el primer campo de texto/número/select
//      habilitado que YA tiene un valor conservado — cubre pantallas de
//      texto al regresar con datos.
//   3. Si no hay ni control marcado ni campo con valor previo, no se toca el
//      foco. Esto es intencional: una pantalla virgen (primera visita, sin
//      nada respondido todavía) debe conservar exactamente el comportamiento
//      de hoy, sin autofocus incidental — el foco nunca se pone en el botón
//      Continuar ni se intercepta la tecla Enter en ningún punto de este hook.
//
// DeclaracionLibre.jsx queda fuera de este mecanismo a propósito (no es un
// <form>, y su <textarea> ya está excluida del estándar de Enter por el
// propio HTML) — no debe usarse este hook ahí.

import { useEffect } from 'react'

const SELECTOR_CAMPO_EDITABLE =
  'input[type="text"]:not([disabled]), input[type="number"]:not([disabled]), select:not([disabled])'

/**
 * @param {import('react').RefObject<HTMLFormElement>} formRef
 */
export function useRestaurarFocoAlMontar(formRef) {
  useEffect(() => {
    const form = formRef.current
    if (!form) return

    const marcado = form.querySelector('input:checked')
    if (marcado) {
      marcado.focus()
      return
    }

    const candidatos = form.querySelectorAll(SELECTOR_CAMPO_EDITABLE)
    const conValorPrevio = Array.from(candidatos).find((el) => el.value !== '')
    if (conValorPrevio) {
      conValorPrevio.focus()
    }
  }, [formRef])
}
