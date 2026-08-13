// Determina si "Una primera lectura de tu situación" (PrimeraLectura.jsx) tiene
// algo interpretable que mostrar, sin duplicar la lógica de las dos evidencias
// que consume — solo agrega su resultado ya estructurado.
//
// Deliberadamente acotado a PrimeraLectura, no un framework genérico de
// "valor de pantalla" para todo el recorrido (Principio 9) — se generaliza el
// día que exista un segundo caso real con la misma necesidad (ej.
// IndiciosRegimenTransicion, ya identificado como candidato, pero fuera de
// alcance de este cambio).
//
// La decisión se deriva exclusivamente de `estado` — nunca del texto de
// presentación que PrimeraLectura.jsx construye a partir de estos mismos
// resultados. 'cumple' y 'no_cumple' son siempre juicios sustantivos y
// accionables; 'no_evaluable' nunca lo es — no existe un estado intermedio.
//
// El OR (no AND) es intencional: ya existe hoy, dentro de RPM, el caso real
// donde una evidencia es evaluable y la otra no (ej. semanas desconocidas,
// edad evaluable) — con AND se ocultaría información que sí aporta valor.

import { evaluarSemanasMinimas } from './evidenciaSemanasMinimas.js'
import { evaluarEdadPension } from './evidenciaEdadPension.js'

/**
 * @param {Object} input
 * @param {('Mujer'|'Hombre'|null)} input.sexo
 * @param {('RPM'|'RAIS'|'desconocido'|null)} input.regimenActual
 * @param {('conocido'|'aproximado'|'desconocido'|null)} input.nivelConocimientoSemanas
 * @param {string} input.semanasCotizadas
 * @param {string} input.fechaNacimiento
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {boolean}
 */
export function tienePrimeraLecturaValor({
  sexo,
  regimenActual,
  nivelConocimientoSemanas,
  semanasCotizadas,
  fechaNacimiento,
  fecha,
}) {
  const resultadoSemanas = evaluarSemanasMinimas({
    sexo,
    regimenActual,
    nivelConocimientoSemanas,
    semanasCotizadas,
    ...(fecha !== undefined ? { fecha } : {}),
  })

  const resultadoEdad = evaluarEdadPension({
    sexo,
    regimenActual,
    fechaNacimiento,
    ...(fecha !== undefined ? { fecha } : {}),
  })

  return resultadoSemanas.estado !== 'no_evaluable' || resultadoEdad.estado !== 'no_evaluable'
}
