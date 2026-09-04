// Fuente única de verdad para "semanas actuales + semanas futuras = semanas proyectadas",
// con la precedencia del contrato GO-B (declaración agregada > historia estructurada) —
// extraída de calcularProyeccionRPM.js (S4-002/GO-B) para que
// evaluarElegibilidadProyectadaRPM.js (E2) pueda resolver la misma pregunta sin
// reimplementarla ni arriesgar que ambas fuentes de verdad diverjan (Principio 11).
//
// Comportamiento idéntico al que calcularProyeccionRPM.js ya tenía inline antes de esta
// extracción — verificado con la suite existente de calcularProyeccionRPM.test.js y
// generarCaminosRPM.test.js, que no cambian sus valores esperados por este cambio.

/**
 * @typedef {Object} SemanasReferenciaDeclaradasEntrada
 * @property {number} cantidad
 * @property {('conocido'|'aproximado')} certeza
 */

/**
 * @param {Object} params
 * @param {Array<{diasCotizados: number}>} [params.historiaCotizacion]
 * @param {SemanasReferenciaDeclaradasEntrada | null} [params.semanasReferenciaDeclaradas]
 * @param {number} params.diasFuturos - días del horizonte futuro (periodoFuturo.diasCotizados
 *   en calcularProyeccionRPM.js) — ya resuelto por quien llama, nunca recalculado aquí.
 * @returns {{
 *   observadas: number,
 *   futuras: number,
 *   sustentadasPorHistoria: number,
 *   declaradas: number | null,
 *   certeza: ('conocido'|'aproximado') | null,
 *   total: number,
 *   fuente: ('declaracion_agregada'|'historia_estructurada'),
 * }}
 */
export function resolverSemanasProyectadasRPM({
  historiaCotizacion = [],
  semanasReferenciaDeclaradas = null,
  diasFuturos,
}) {
  const diasObservadosTotal = historiaCotizacion.reduce((acc, p) => acc + p.diasCotizados, 0)
  const semanasObservadas = diasObservadosTotal / 7
  const semanasFuturas = diasFuturos / 7
  // Única magnitud sustentada por evidencia (historiaCotizacion + el período futuro
  // sintético) — nunca incluye una declaración. Es la única que puede habilitar el IBL
  // alternativo de vida laboral completa (contrato GO-B): las semanas declaradas jamás
  // fabrican cobertura salarial que no existe.
  const semanasSustentadasPorHistoria = semanasObservadas + semanasFuturas

  // Contrato GO-B: cuando hay una declaración válida, tiene precedencia TOTAL sobre la
  // historia para elegibilidad/tasa — nunca se suman ambas fuentes (representan el mismo
  // pasado), y la sola presencia de historia parcial NO la reemplaza automáticamente (sin
  // heurística de "historia suficientemente completa" — decisión explícita).
  const declaracionValida =
    semanasReferenciaDeclaradas !== null &&
    Number.isFinite(semanasReferenciaDeclaradas.cantidad) &&
    semanasReferenciaDeclaradas.cantidad >= 0 &&
    (semanasReferenciaDeclaradas.certeza === 'conocido' || semanasReferenciaDeclaradas.certeza === 'aproximado')
      ? semanasReferenciaDeclaradas
      : null

  const fuente = declaracionValida !== null ? 'declaracion_agregada' : 'historia_estructurada'
  const total = declaracionValida !== null ? declaracionValida.cantidad + semanasFuturas : semanasSustentadasPorHistoria

  return {
    observadas: semanasObservadas,
    futuras: semanasFuturas,
    sustentadasPorHistoria: semanasSustentadasPorHistoria,
    declaradas: declaracionValida !== null ? declaracionValida.cantidad : null,
    certeza: declaracionValida !== null ? declaracionValida.certeza : null,
    total,
    fuente,
  }
}
