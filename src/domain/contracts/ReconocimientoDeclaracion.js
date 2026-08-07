/**
 * Contratos de la capacidad de reconocimiento (Fase 2, Base Económica — sucesora
 * conceptual de la antigua "Capacidad C", disuelta como capacidad independiente;
 * ver docs/gestion/cierre-sprint-3.md, "Pausa de Sprint 3 — Redefinición de la
 * Capacidad C y frontera de PerfilDecision").
 *
 * Responsabilidad de esta capacidad: reconocer si una declaración libre (Capacidad
 * B) contiene materia pensional operable, sin interpretar su contenido, sin
 * decidir prioridad entre asuntos, y sin producir ningún `PerfilDecision`. Esa
 * responsabilidad se cumple en dos etapas internas — reconocimiento de aptitud y
 * resolución de estructura — orquestadas como una sola capacidad, nunca como dos
 * capacidades separadas.
 *
 * LIMITACIÓN EXPLÍCITA DE v1: esta versión no incluye resolución de estructura.
 * No existe campo `estructura` en `ResultadoReconocimiento` ni typedef
 * `ResultadoEstructura` en este archivo — es una ausencia deliberada, no una
 * omisión (ver "Diseño físico final — Sprint 3" en el cierre de este Slice). Se
 * incorporarán como extensión aditiva cuando exista evidencia real de
 * declaraciones reales que permita diseñar `resolverEstructura` sin una
 * heurística de superficie no validada.
 *
 * @typedef {Object} DeclaracionLibre
 * @property {('contenido'|'ausencia')} tipo
 * @property {string} [texto] - Presente únicamente si `tipo === 'contenido'`.
 *
 * @typedef {Object} ResultadoAptitud
 * @property {('apto'|'no_apto'|'indeterminado')} estado
 * @property {string} [regla] - Identificador estable de la condición interna del
 *   mecanismo que produjo `estado`. Nunca una frase. Catálogo cerrado en v1 (ver
 *   `reconocerAptitud.js`).
 *
 * @typedef {Object} ResultadoReconocimiento
 * @property {string} version - Versión del mecanismo completo de la capacidad
 *   (aptitud y estructura como unidad, no por etapa).
 * @property {DeclaracionLibre} declaracionOriginal - Tal como la entrega la
 *   Capacidad B, intacta.
 * @property {ResultadoAptitud} [aptitud] - Presente únicamente si
 *   `declaracionOriginal.tipo === 'contenido'`.
 */
