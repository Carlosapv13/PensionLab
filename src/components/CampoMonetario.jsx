// Prefijo visual "$" fijo, fuera del valor editable del input — el símbolo
// nunca entra al texto seleccionable/editable, así que nunca puede llegar al
// dominio ni a la cadena de dígitos que guarda App.jsx. `aria-hidden` porque
// es decorativo: la etiqueta del campo ya declara "(en pesos)" o equivalente.
//
// No hace formateo en vivo — recibe tal cual las props que ya devuelve
// useCampoMonetario.js (value/onChange/onFocus/onBlur/onKeyDown), sin
// modificarlas. El formateo en vivo mientras se escribe queda registrado
// como oportunidad futura (ver docs/producto/oportunidades-futuras.md,
// entrada 4) — deliberadamente no implementado en este Slice.

/**
 * @param {Object} props - exactamente lo que devuelve useCampoMonetario()
 */
function CampoMonetario(props) {
  return (
    <span className="campo-monetario">
      <span className="campo-monetario__prefijo" aria-hidden="true">
        $
      </span>
      <input type="text" inputMode="numeric" className="campo-monetario__input field__input" {...props} />
    </span>
  )
}

export default CampoMonetario
