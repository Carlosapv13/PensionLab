// Función serverless (convención Vercel: export default (req, res)) — único punto de
// entrada HTTP de S4-007. Hermano de api/interpretar-declaracion.js (S4-006), misma
// responsabilidad exclusiva: validar la forma de la petición y delegar en el adaptador
// inyectado — nunca decide nada de dominio, nunca calcula, nunca escribe al expediente
// (no hay nada que escribir: S4-007 no produce ningún dato que un cálculo consuma).
//
// crearHandler(adaptador) permite testear el enrutamiento con un adaptador falso, sin tocar
// process.env ni fetch — el export default es la instancia real que Vercel invoca, con
// adaptadorOpenAIExplicacion ya inyectado.

import { validarPeticionExplicacion } from './_lib/validarPeticionExplicacion.js'
import { adaptadorOpenAIExplicacion } from './_lib/AdaptadorOpenAIExplicacion.js'

/**
 * @param {import('../src/ia/adaptadores/AdaptadorExplicacionIA.js').AdaptadorExplicacionIA} adaptador
 */
export function crearHandler(adaptador) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ errorCodigo: 'METODO_NO_PERMITIDO' })
      return
    }

    const peticion = validarPeticionExplicacion(req.body)
    if (!peticion.valido) {
      res.status(400).json({ errorCodigo: 'PETICION_INVALIDA', detalle: peticion.codigo })
      return
    }

    const resultado = await adaptador({ escenarios: peticion.escenarios, hechos: peticion.hechos, contexto: peticion.contexto })

    if (resultado.estado === 'error_proveedor' && resultado.errorCodigo === 'CONFIGURACION_SERVIDOR_INCOMPLETA') {
      res.status(503).json(resultado)
      return
    }

    res.status(200).json(resultado)
  }
}

export default crearHandler(adaptadorOpenAIExplicacion)
