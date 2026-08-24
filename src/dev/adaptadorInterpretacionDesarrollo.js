// SOLO DESARROLLO. Simulador de interpretación IA basado en coincidencias de patrones
// simples sobre el texto — permite recorrer y revisar visualmente S4-006 (Declaración
// libre → filtro previo → interpretación → confirmación → escritura en el expediente) sin
// consumir la API real de OpenAI ni necesitar OPENAI_API_KEY. No es una interpretación
// real: es determinista, basada en expresiones regulares, y solo reconoce los patrones de
// los casos de prueba de la revisión visual de S4-006 (ver el fixture
// 'rpm-empleado-declaracion-libre-s4-006' en fixtures.js para las frases exactas
// recomendadas).
//
// Nunca se importa desde ninguna pantalla fuera del árbol import.meta.env.DEV (ver
// App.jsx) — mismo mecanismo ya usado por PanelDesarrollo.jsx: Vite sustituye ese flag por
// `false` en `vite build`, y Rollup elimina por dead-code-elimination todo este árbol,
// incluido este archivo, del bundle de producción (verificado en la auditoría de dist/ del
// cierre de este Slice).
//
// Usa exclusivamente el mismo puerto AdaptadorInterpretacionIA que AdaptadorViaServidor.js
// y AdaptadorOpenAI.js — DeclaracionLibre.jsx no sabe ni le importa cuál de los tres
// recibió; nunca se sustituye el adaptador de producción, solo se inyecta este en su lugar
// exclusivamente cuando App.jsx corre en modo desarrollo.

import { crearAdaptadorSimulado } from '../ia/adaptadores/AdaptadorSimulado.js'
import { camposVacios, resultadoError } from '../ia/adaptadores/AdaptadorInterpretacionIA.js'

// Frases-disparador explícitas para forzar estados difíciles de alcanzar con una
// heurística de patrones simple (ambiguo / error del proveedor) — documentadas en el
// fixture de desarrollo correspondiente, nunca coinciden por accidente con lenguaje
// pensional real.
const DISPARADOR_ERROR = '[forzar error]'
const DISPARADOR_AMBIGUO = '[forzar ambiguo]'

function extraerNumero(texto, patrones) {
  for (const patron of patrones) {
    const coincidencia = texto.match(patron)
    if (coincidencia) return Number(coincidencia[1].replace(/\./g, ''))
  }
  return null
}

function interpretarTextoDesarrollo(texto) {
  if (texto.includes(DISPARADOR_ERROR)) {
    return resultadoError('TIMEOUT')
  }

  if (texto.includes(DISPARADOR_AMBIGUO)) {
    return {
      estado: 'ambiguo',
      campos: camposVacios(),
      camposAmbiguos: ['objetivoPensionMensual'],
      razonCodigo: 'MULTIPLES_LECTURAS_POSIBLES',
    }
  }

  const objetivoValor = extraerNumero(texto, [
    /(\d[\d.]{5,})\s*(?:al mes|mensuales?|de pensi[oó]n)/i,
    /pension(?:arme)?\D{0,15}(\d[\d.]{5,})/i,
  ])
  const edadMatch = texto.match(/(?:a los|edad de)\s*(\d{2})\s*años/i)
  const restriccionValor = extraerNumero(texto, [
    /(?:aportar|destinar|adicional(?:es)?)\D{0,20}(\d[\d.]{4,})/i,
  ])

  const campos = {
    objetivoPensionMensual: objetivoValor ? { valorCOP: objetivoValor } : null,
    restriccionCostoPensionalAdicionalMaximoMensual: restriccionValor ? { valorCOP: restriccionValor } : null,
    edadJubilacionDeseada: edadMatch ? { valorAnios: Number(edadMatch[1]) } : null,
  }

  const algunCampoEncontrado = Object.values(campos).some((c) => c !== null)

  if (!algunCampoEncontrado) {
    return {
      estado: 'insuficiente',
      campos: camposVacios(),
      camposAmbiguos: [],
      razonCodigo: 'SIN_INFORMACION_CUANTIFICABLE',
    }
  }

  return { estado: 'interpretado', campos, camposAmbiguos: [], razonCodigo: null }
}

export function crearAdaptadorInterpretacionDesarrollo() {
  return crearAdaptadorSimulado(({ texto }) => interpretarTextoDesarrollo(texto))
}
