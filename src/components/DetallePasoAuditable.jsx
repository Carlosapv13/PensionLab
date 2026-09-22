// E6.6 (sprint-4-correcciones-oscar-baldor, PL-260 §9.1/§9.6) — "Nivel completo": presenta un
// único `PasoAuditable` (uno de los 7 que Contrato F produce por camino viable) de forma
// recursiva y genérica, sin calcular, redondear ni redactar nada nuevo — reexpone literalmente
// `datos`, con etiquetas legibles (`nivelCompletoAuditable.helpers.js`) y formato conocido
// (pesos/porcentaje/semanas/booleano/origen) solo donde ese formato ya se verificó contra el
// código que produce el dato. Un campo sin etiqueta conocida (incluido uno futuro de Contrato
// F) nunca se oculta: cae al formato genérico (clave humanizada + valor literal) — ver
// `nivelCompletoAuditable.helpers.js` para el detalle de esa garantía.
//
// Presentacional puro: no decide si debe mostrarse (eso lo decide el llamador, típicamente
// dentro de un `<details>` — ver ProyectaTuPensionRPM.jsx), no recibe ni dispara ningún
// evento, no depende de estado propio.

import { ETIQUETAS_PASO, etiquetaCampo, tipoDeValor, formatearValorEscalar } from '../pages/nivelCompletoAuditable.helpers.js'

// Recursivo: un valor "objeto" se despliega como una sub-lista de definición con las mismas
// reglas de etiqueta/formato (mismo diccionario, a cualquier profundidad — ver cabecera del
// archivo de helpers); un valor "lista" recorre cada elemento; un escalar se formatea según
// el campo (`clave`) al que pertenece.
function ValorAuditable({ clave, valor }) {
  const tipo = tipoDeValor(valor)

  if (tipo === 'vacio') {
    return <span className="detalle-paso__valor">—</span>
  }

  if (tipo === 'objeto') {
    return (
      <dl className="detalle-paso__anidado">
        {Object.entries(valor).map(([subclave, subvalor]) => (
          <div className="detalle-paso__fila" key={subclave}>
            <dt>{etiquetaCampo(subclave)}</dt>
            <dd>
              <ValorAuditable clave={subclave} valor={subvalor} />
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  if (tipo === 'lista') {
    if (valor.length === 0) return <span className="detalle-paso__valor">—</span>
    return (
      <ul className="detalle-paso__lista">
        {valor.map((elemento, indice) => (
          <li key={indice}>
            <ValorAuditable clave={clave} valor={elemento} />
          </li>
        ))}
      </ul>
    )
  }

  return <span className="detalle-paso__valor">{formatearValorEscalar(clave, valor)}</span>
}

/**
 * @param {Object} props
 * @param {('DATOS_UTILIZADOS'|'IBL'|'TASA_REEMPLAZO'|'RESULTADO_MATEMATICO'|'AJUSTE_LEGAL'|'RESULTADO_FINAL'|'COMPARACION_OBJETIVO')} props.codigo
 * @param {Object} props.datos - literal de `camino.pasos[codigo]` (modeloVisual, E6.2) — nunca
 *   recalculado ni completado por este componente.
 */
export default function DetallePasoAuditable({ codigo, datos }) {
  return (
    <div className="detalle-paso">
      <p className="camino-celda__nota detalle-paso__titulo">{ETIQUETAS_PASO[codigo] ?? codigo}</p>
      <dl className="detalle-paso__campos">
        {Object.entries(datos ?? {}).map(([clave, valor]) => (
          <div className="detalle-paso__fila" key={clave}>
            <dt>{etiquetaCampo(clave)}</dt>
            <dd>
              <ValorAuditable clave={clave} valor={valor} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
