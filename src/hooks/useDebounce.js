// Utilidad genérica mínima — no es un motor de formularios ni de estado, solo retrasa
// cuándo un valor cambiante (ej. texto que la persona sigue escribiendo) se considera
// "estable" para disparar un efecto costoso (ej. interpretación IA). Mismo criterio de
// alcance mínimo ya aplicado en useCampoMonetario.js/useRestaurarFocoAlMontar.js.

import { useEffect, useState } from 'react'

/**
 * @template T
 * @param {T} valor
 * @param {number} retrasoMs
 * @returns {T} el último valor, retrasado hasta que `valor` deja de cambiar por `retrasoMs`
 */
export function useDebounce(valor, retrasoMs) {
  const [valorDebounced, setValorDebounced] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setValorDebounced(valor), retrasoMs)
    return () => clearTimeout(temporizador)
  }, [valor, retrasoMs])

  return valorDebounced
}
