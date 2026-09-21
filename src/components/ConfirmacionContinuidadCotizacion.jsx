// E6.4 (sprint-4-correcciones-oscar-baldor) — control AISLADO de confirmación de
// continuidad de cotización (PL-260 §8.4/§9.4). Puro y presentacional: no calcula nada, no
// decide nada de dominio, no se conecta a `App.jsx` ni a `ProyectaTuPensionRPM.jsx` en este
// checkpoint — esa conexión (estado en `App.jsx`, wrapper de invalidación,
// `MODELO_VISUAL_EJERCICIO_ACTIVO`) pertenece a E6.5. Se prueba montado en aislamiento
// (`ConfirmacionContinuidadCotizacion.test.jsx`), sin renderizar la página real.
//
// Decisión Carlos/Atlas (cierre del diseño de E6.4, documentada aquí — se implementa recién
// en E6.5, no en este archivo): cuando la confirmación se conecte al estado de `App.jsx`,
// cambiar `edadJubilacionDeseada`, `sexo`, `regimenActual` o `fechaNacimiento` invalidará la
// confirmación; cambiar objetivo económico, IBC, límite de esfuerzo o historia de
// cotización NO la invalidará. Este componente no implementa esa invalidación por sí mismo
// (no tiene acceso a esos otros campos) — solo decide, dada una `confirmacion` y la
// `edadJubilacionDeseada` actual, si la confirmación recibida sigue siendo vigente para ESA
// edad (ver `vigente`, más abajo) — la primera mitad de esa regla, la única que este control
// puede verificar con la información que recibe.
//
// Textos: el disclosure y el texto del botón son literales de PL-260 §8.4 (decisión ya
// aprobada) — este archivo no los redacta, los reproduce tal cual. `TEXTO_CONFIRMACION_VIGENTE`
// es texto aprobado por Carlos/Atlas en la auditoría de este checkpoint (2026-09-20) —
// describe la ELECCIÓN ya registrada, nunca afirma que la persona cotizará ni presume lo que
// comprendió — mismo principio que ya rige el disclosure ("nunca es una declaración ni
// promesa de que cotizará continuamente").
//
// Forma del objeto emitido por `onConfirmar`: exactamente la que exige Contrato F
// (`construirEjercicioResueltoRPM.js`, `CODIGO_SUPUESTO_DESCONOCIDO` es el único código
// soportado) — `{codigo, confirmado, textoAceptado, edadObjetivoConfirmada}`, verificado en
// este checkpoint contra el contrato real, no solo por inspección.
//
// Blindaje (auditoría de E6.4, 2026-09-20): ninguna prop ausente debe lanzar. `confirmacion`
// se trata como "sin confirmación" tanto si es `null` como si está simplemente ausente
// (`undefined`) — comparación `== null` en vez de `!== null`, mismo criterio ya aplicado
// repetidas veces en este proyecto (E5.4/E6.3) para no depender de que el llamador pase
// siempre `null` explícito en vez de omitir la prop. `onConfirmar` tiene un valor por
// defecto no-operativo — un llamador que todavía no cableó el callback (legítimo en un
// componente aislado como este, sin consumidor real todavía) no debe hacer que el botón
// lance una excepción al hacer clic.

import { useId } from 'react'

export const TEXTO_DISCLOSURE_CONTINUIDAD =
  'Esta proyección supone que cotizas continuamente desde hoy hasta la edad elegida'

export const TEXTO_BOTON_CONFIRMAR_CONTINUIDAD = 'Entiendo y quiero explorar este escenario.'

// Aprobado por Carlos/Atlas (auditoría de E6.4, 2026-09-20) — reemplaza el texto provisional
// "Confirmaste que entiendes este supuesto y quieres explorar este escenario."
export const TEXTO_CONFIRMACION_VIGENTE = 'Elegiste explorar este escenario bajo el supuesto de cotización continua.'

const CODIGO_SUPUESTO_CONTINUIDAD = 'CONTINUIDAD_SIN_INTERRUPCIONES'

function esEdadValida(edad) {
  return typeof edad === 'number' && Number.isFinite(edad)
}

/**
 * @param {Object} props
 * @param {{codigo: string, confirmado: boolean, textoAceptado: string, edadObjetivoConfirmada: number} | null | undefined} props.confirmacion -
 *   confirmación ya existente (misma forma que un elemento de `confirmacionesSupuestos` de
 *   Contrato F). `null` y `undefined` (prop ausente) se tratan por igual: "sin confirmación".
 * @param {number | null} props.edadJubilacionDeseada - edad YA VALIDADA (ej. `edadValida` en
 *   `ProyectaTuPensionRPM.jsx`), nunca el texto crudo del campo — debe ser el mismo valor que
 *   se usa para invocar `generarCaminosRPM`/`construirEjercicioResueltoRPM`.
 * @param {(confirmacionNueva: {codigo: string, confirmado: boolean, textoAceptado: string, edadObjetivoConfirmada: number}) => void} [props.onConfirmar] -
 *   invocado únicamente cuando `edadJubilacionDeseada` es válida. Por defecto, no-operativo
 *   (un componente sin consumidor todavía no debe lanzar si el callback no se cableó).
 */
export default function ConfirmacionContinuidadCotizacion({ confirmacion, edadJubilacionDeseada, onConfirmar = () => {} }) {
  const disclosureId = useId()
  const edadValida = esEdadValida(edadJubilacionDeseada)

  // "Para otra edad se trata visualmente como no vigente" (diseño de E6.4): una confirmación
  // cuya `edadObjetivoConfirmada` ya no coincide con la edad actual nunca se muestra como
  // confirmada — vuelve a pedir confirmación, nunca afirma algo que ya no es cierto para esta
  // edad. Sin edad válida, tampoco puede haber una confirmación vigente. `== null` (no
  // `!== null`) trata `undefined` igual que `null` — ver "Blindaje" en la cabecera.
  const vigente =
    edadValida && confirmacion != null && confirmacion.confirmado === true && confirmacion.edadObjetivoConfirmada === edadJubilacionDeseada

  function manejarClicConfirmar() {
    if (!edadValida) return
    onConfirmar({
      codigo: CODIGO_SUPUESTO_CONTINUIDAD,
      confirmado: true,
      textoAceptado: TEXTO_BOTON_CONFIRMAR_CONTINUIDAD,
      edadObjetivoConfirmada: edadJubilacionDeseada,
    })
  }

  return (
    <div className="insight">
      <p id={disclosureId} className="insight__message">
        {TEXTO_DISCLOSURE_CONTINUIDAD}
      </p>
      {vigente ? (
        <p className="insight__message" role="status">
          {TEXTO_CONFIRMACION_VIGENTE}
        </p>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          aria-describedby={disclosureId}
          disabled={!edadValida}
          onClick={manejarClicConfirmar}
        >
          {TEXTO_BOTON_CONFIRMAR_CONTINUIDAD}
        </button>
      )}
    </div>
  )
}
