// Función serverless (convención Vercel: export default (req, res)) — único punto de
// entrada HTTP de S4-006. Vive fuera de src/, así que Vite nunca la empaqueta en el bundle
// del navegador (verificado en la auditoría de dist/ del cierre de este Slice).
//
// Responsabilidad exclusiva: validar la forma de la petición (defensa en profundidad,
// nunca confía en que AdaptadorViaServidor.js del cliente ya validó) y delegar en el
// adaptador inyectado — nunca decide nada de dominio, nunca calcula, nunca escribe al
// expediente (eso es responsabilidad del cliente, después de la confirmación humana).
//
// crearHandler(adaptador) permite testear el enrutamiento (método, validación, códigos de
// estado HTTP) con un adaptador falso, sin tocar process.env ni fetch — el export default
// es la instancia real que Vercel invoca, con adaptadorOpenAI ya inyectado.

import { validarPeticion } from './_lib/validarPeticion.js'
import { adaptadorOpenAI } from './_lib/AdaptadorOpenAI.js'

/**
 * @param {import('../src/ia/adaptadores/AdaptadorInterpretacionIA.js').AdaptadorInterpretacionIA} adaptador
 */
export function crearHandler(adaptador) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ errorCodigo: 'METODO_NO_PERMITIDO' })
      return
    }

    const peticion = validarPeticion(req.body)
    if (!peticion.valido) {
      res.status(400).json({ errorCodigo: 'PETICION_INVALIDA', detalle: peticion.codigo })
      return
    }

    const resultado = await adaptador({ texto: peticion.texto })

    if (resultado.estado === 'error_proveedor' && resultado.errorCodigo === 'CONFIGURACION_SERVIDOR_INCOMPLETA') {
      res.status(503).json(resultado)
      return
    }

    res.status(200).json(resultado)
  }
}

export default crearHandler(adaptadorOpenAI)
