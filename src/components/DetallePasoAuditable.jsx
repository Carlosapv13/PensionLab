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
//
// E7 corrección (2026-09-23, PL-260 §0 punto 6/§8/§9) — prop `pendiente`: cuando el llamador
// determina que ESTE paso depende de una política jurídica NO_RESUELTA
// (`pasoDependeDePoliticaJuridica`, nivelCompletoAuditable.helpers.js), pasa aquí el mensaje
// ya compuesto por `mensajePasoPendienteDePolitica` en vez de `datos` — el paso SIGUE
// apareciendo (nunca se omite en silencio, PL-260 §8), pero su valor calculado se reemplaza
// por la explicación de qué política lo bloquea. Este componente no decide cuáles pasos
// están afectados ni redacta el mensaje — solo lo muestra tal cual, en vez de `datos`.
//
// Corrección de auditoría visual (2026-09-25, validación de Carlos/Atlas sobre el Preview del
// Caso A real): `debeOcultarCampoAnidado` (nivelCompletoAuditable.helpers.js) filtra las dos
// únicas filas que nunca deben mostrarse (`normaId` crudo; `razonNoEvaluable` cuando es
// `null`, que solo significa "sí se evaluó") — nunca oculta un campo por falta de etiqueta
// (esa garantía sigue intacta, ver `etiquetaCampo`), solo estos dos casos verificados.

import {
  ETIQUETAS_PASO,
  etiquetaCampo,
  tipoDeValor,
  formatearValorEscalar,
  debeOcultarCampoAnidado,
} from '../pages/nivelCompletoAuditable.helpers.js'

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
        {Object.entries(valor)
          .filter(([subclave, subvalor]) => !debeOcultarCampoAnidado(subclave, subvalor))
          .map(([subclave, subvalor]) => (
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
 *   recalculado ni completado por este componente. Ignorado cuando `pendiente` está presente.
 * @param {string|null} [props.pendiente] - mensaje de "paso pendiente" (ver nota de cabecera)
 *   — cuando está presente, reemplaza la tabla de `datos` sin ocultar el paso mismo.
 */
export default function DetallePasoAuditable({ codigo, datos, pendiente = null }) {
  return (
    <div className="detalle-paso">
      <p className="camino-celda__nota detalle-paso__titulo">{ETIQUETAS_PASO[codigo] ?? codigo}</p>
      {pendiente ? (
        <p className="detalle-paso__pendiente" role="note">
          {pendiente}
        </p>
      ) : (
        <dl className="detalle-paso__campos">
          {Object.entries(datos ?? {})
            .filter(([clave, valor]) => !debeOcultarCampoAnidado(clave, valor))
            .map(([clave, valor]) => (
              <div className="detalle-paso__fila" key={clave}>
                <dt>{etiquetaCampo(clave)}</dt>
                <dd>
                  <ValorAuditable clave={clave} valor={valor} />
                </dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  )
}
