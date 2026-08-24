// Validación del cuerpo de la petición HTTP entrante a api/interpretar-declaracion.js —
// defensa en profundidad server-side (Principio 11): el servidor nunca confía en que el
// cliente ya validó, aunque AdaptadorViaServidor.js (cliente) ya solo envíe {texto}.
// Rechaza explícitamente cualquier clave adicional que un cliente (o un llamador directo
// del endpoint, fuera de la app) intente enviar — nunca el expediente completo, nunca
// campos que la app no pidió.

const LONGITUD_MAXIMA_TEXTO = 2000

/**
 * @param {*} body - req.body ya parseado como JSON (o lo que sea que haya llegado)
 * @returns {{valido: true, texto: string} | {valido: false, codigo: string}}
 */
export function validarPeticion(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valido: false, codigo: 'CUERPO_INVALIDO' }
  }

  const claves = Object.keys(body)
  if (claves.length !== 1 || claves[0] !== 'texto') {
    return { valido: false, codigo: 'CLAVES_NO_PERMITIDAS' }
  }

  if (typeof body.texto !== 'string' || body.texto.trim() === '') {
    return { valido: false, codigo: 'TEXTO_INVALIDO' }
  }

  if (body.texto.length > LONGITUD_MAXIMA_TEXTO) {
    return { valido: false, codigo: 'TEXTO_DEMASIADO_LARGO' }
  }

  return { valido: true, texto: body.texto }
}
