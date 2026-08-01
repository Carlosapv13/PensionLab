# PL-102 – Historia Técnica de PensionLab – Sprint 02 – Expediente Pensional

## 1. Objetivo del Sprint 2

El objetivo del Sprint 2 fue formalizar el Expediente Pensional como concepto central del dominio de PensionLab: definir su arquitectura, someterla a revisión crítica formal, y materializar sus primeros contratos de datos dentro del código, preservando en todo momento la compatibilidad con los contratos ya validados en el Sprint 1.

El sprint se guio por la misma disciplina adoptada desde el Sprint 1 y reafirmada explícitamente en cada etapa: documentar antes de implementar, generalizar solo cuando existe evidencia real, declarar las limitaciones en vez de ocultarlas, y no decidir en silencio ante una ambigüedad. Estos principios, ya recogidos como Principios de Arquitectura de PensionLab, gobernaron cada decisión tomada durante el sprint y se citan explícitamente a lo largo de este documento cuando resultan relevantes.

## 2. Estado inicial del proyecto

Al iniciar el Sprint 2, PensionLab se encontraba en el estado dejado por el cierre del Sprint 1 (commit `4f27f8b`):

- Las fórmulas puras de cálculo de pensión, `formulaRPM.js` y `formulaRAIS.js`, estaban implementadas, documentadas y probadas (18/18 tests en verde).
- El resolver legal de primera versión (`resolverReglasVigentes`, `obtenerSemanasMinimas`) estaba implementado, pero era específico por campo, no genérico.
- Los contratos de datos `CalculationTrace`, `Explanation`, `PensionCalculationResult`, `UserProfile` y `Simulation` existían únicamente como definiciones JSDoc (`@typedef`), sin ningún código ejecutable que los instanciara.
- `data/assumptions` (supuestos de modelado) no tenía resolver implementado ni datos poblados.
- El motor de orquestación, `domain/pensionEngine/` (`calcularPensionRPM`, `calcularProyeccionRAIS`, `calcularSemanasFaltantes`), no contenía ninguna lógica — únicamente comentarios de responsabilidad.
- El cálculo del Ingreso Base de Liquidación (IBL) no tenía módulo, ni diseño, ni ubicación asignada — bloqueo ya identificado como prerrequisito directo de `formulaRPM`.
- Ningún componente de interfaz de usuario tenía implementación — todos eran archivos de una a tres líneas con un comentario de responsabilidad.
- No existía ninguna estrategia de persistencia en ningún punto del sistema.
- El repositorio tenía historia lineal, working tree limpio, y estaba sincronizado con `origin/main`.

Una auditoría técnica realizada al comienzo del Sprint 2 confirmó este estado con precisión: ningún archivo del repositorio importaba o instanciaba `Simulation.js`, ningún test dependía de su forma, y los únicos "consumidores" detectados eran comentarios de intención dentro de componentes de interfaz igualmente vacíos.

## 3. Objetivos aprobados

El roadmap heredado del cierre del Sprint 1 proponía continuar directamente con los diez pasos de prerrequisitos de `pensionEngine` ya planificados. El Sprint 2 reorientó esa prioridad: antes de continuar construyendo el motor de cálculo, se decidió formalizar un concepto de dominio que hasta entonces solo existía de forma implícita — la relación entre un `UserProfile` y el historial de `Simulation` que produce a lo largo del tiempo — bajo el nombre de Expediente Pensional.

Se aprobaron explícitamente los siguientes objetivos para el sprint:

1. Definir arquitectónicamente el Expediente Pensional como raíz de agregado del dominio, sin implementación de código en una primera etapa.
2. Validar esa arquitectura mediante revisión crítica formal antes de aprobarla como referencia oficial.
3. Implementar únicamente los contratos mínimos derivados de esa arquitectura, en fases pequeñas, verificables y reversibles.
4. Integrar esos contratos con `Simulation`, el contrato de Sprint 1 más directamente afectado por el nuevo concepto, resolviendo primero las decisiones arquitectónicas que esa integración exigía.
5. Auditar la coherencia del conjunto completo de contratos del dominio antes de dar por cerrado el sprint.

La implementación del motor de cálculo (`pensionEngine`), del módulo de IBL y de la interfaz de usuario quedó explícitamente fuera de alcance, como continuación natural para sprints posteriores.

## 4. Trabajo realizado

El sprint se ejecutó en cuatro etapas sucesivas, cada una condicionada a la aprobación explícita de la etapa anterior:

**Diagnóstico y propuesta arquitectónica.** Se realizó un diagnóstico ejecutivo completo del proyecto y se propuso una primera arquitectura de integración del Expediente Pensional con los contratos existentes. Esa propuesta inicial fue redefinida por decisión de producto en cinco bloques conceptuales — Persona, Historia Pensional, Perfil de Decisión, Contexto de Evaluación y Resultados — y se validó mediante tres hipótesis de arquitectura antes de proceder al diseño formal.

**Documento de diseño arquitectónico.** Se redactó `docs/tecnico/arquitectura/expediente-pensional.md`, siguiendo el estándar de documentación ya adoptado en el Sprint 1 (Principios, Diagrama general, Objetivo, Diseño, Riesgos, Decisiones, Próximos pasos). El documento fue sometido a dos rondas de revisión crítica formal antes de aprobarse como referencia oficial del sprint.

**Fase A — Línea base documental.** Se verificó el estado del repositorio, se ejecutaron las pruebas y el linter, y se integró el documento de arquitectura mediante un commit aislado.

**Fase B — Contratos mínimos.** Se implementaron los tres contratos nuevos definidos por la arquitectura (`ContextoEvaluacion`, `PerfilDecision`, `ExpedientePensional`), cada uno en su propia tarea, con verificación y revisión crítica conjunta antes de comitearlos como una unidad.

**Fase C — Integración con Simulation y cierre.** Se auditó `Simulation.js` antes de modificarlo, se resolvieron tres decisiones arquitectónicas pendientes, se integraron los nuevos contratos en `Simulation`, y se ejecutaron dos auditorías de coherencia sobre el conjunto completo de contratos del dominio, que derivaron en dos correcciones adicionales antes del cierre del sprint.

## 5. Arquitectura del Expediente Pensional

El Expediente Pensional se estableció como la raíz de agregado y unidad conceptual central del dominio de PensionLab: el caso completo que el sistema analiza para una persona, no un objeto físico monolítico ni una simple relación entre `UserProfile` y `Simulation`. Se estructura en cinco bloques conceptuales, cada uno materializado por un contrato existente, extendido o nuevo:

| Bloque | Contenido conceptual | Materializado por |
|---|---|---|
| 1. Persona | Información estable del afiliado | `UserProfile.personalInfo` (sin cambios) |
| 2. Historia Pensional | Semanas, IBC, régimen, traslados, bonos, historia laboral | `UserProfile.laboralInfo` (extensión aditiva aprobada conceptualmente, pendiente de forma detallada) |
| 3. Perfil de Decisión | Objetivo, restricciones, preferencias, prioridades, horizonte temporal | `PerfilDecision` (contrato nuevo) |
| 4. Contexto de Evaluación | Legislación y supuestos vigentes, ya resueltos | `ContextoEvaluacion` (contrato nuevo) |
| 5. Resultados | Viabilidad, escenarios, estrategias, recomendación, Brújula Pensional | `Simulation.resultadoBase` (extensión aditiva pendiente de diseño) |

PensionLab modela conceptualmente un expediente principal por persona, que evoluciona durante toda su relación con el sistema. La forma técnica de identificar a la persona, garantizar unicidad y prevenir duplicados quedó explícitamente pendiente de una decisión posterior — el Expediente Pensional no asume ni inventa esa clave.

La Comparación entre `Simulation` de distintos momentos se estableció como una capacidad del Expediente, separada de `escenarios[]` (que sigue representando alternativas dentro de una misma `Simulation`, bajo un mismo Contexto de Evaluación). Su contrato mínimo exige, desde la primera versión, identificar si una diferencia observada entre dos `Simulation` proviene de cambios en Persona o Historia Pensional, Perfil de Decisión, Contexto legal, Supuestos, Fecha de evaluación, o Escenarios y estrategias analizados — sin cuantificar todavía cuánto aporta cada fuente, lo cual queda diferido a una versión posterior. La Brújula Pensional se reconoció como el producto final del sistema, mencionada como marcador reservado dentro de Resultados, sin contrato propio.

Ningún contrato validado en el Sprint 1 fue reemplazado. Todas las extensiones se diseñaron y ejecutaron de forma aditiva.

## 6. Nuevos contratos incorporados

### ContextoEvaluacion

Ubicado en `src/domain/contracts/ContextoEvaluacion.js`, representa el Bloque 4. Es el puente ya resuelto entre `data/legal` y `data/assumptions` —vía sus resolvers— y el motor de cálculo; explícitamente no pertenece al usuario.

Su forma final conserva, para una fecha determinada, dos colecciones separadas: `normas` (`ContextoEvaluacionNorma[]`) y `supuestos` (`ContextoEvaluacionSupuesto[]`), cada una con el valor ya resuelto y aplicado —no solo su identificador—, preservando en todo momento la separación entre lo legal y lo asumido. Cada entrada conserva su fuente, artículo (nulo en supuestos sin sustento normativo) y ventana de vigencia, en la misma forma que ya usan `data/legal/schema.js` y `data/assumptions/schema.js`, contra los que se verificó campo por campo sin encontrar contradicciones de tipo, nulabilidad ni opcionalidad.

Su responsabilidad quedó acotada con precisión durante la revisión: conserva una copia completa de los valores efectivamente utilizados; puede incluir identificadores y metadatos de trazabilidad, pero la reproducción de una `Simulation` nunca debe depender exclusivamente de referencias, identificadores de versión o información que deba resolverse nuevamente.

### PerfilDecision

Ubicado en `src/models/PerfilDecision.js`, representa el Bloque 3. Un Expediente mantiene un único `PerfilDecision` vigente a la vez, compuesto por un objetivo principal (`PerfilDecisionObjetivo`, con `tipo`, `descripcion`, `valorObjetivo` y `unidad` opcionales) y tres colecciones de cadenas con semántica declarada: restricciones (condiciones obligatorias que una estrategia no debe incumplir), preferencias (condiciones deseables pero negociables) y prioridades (criterios para ordenar alternativas, donde el orden del arreglo representa su orden de importancia). Incluye opcionalmente un horizonte temporal (`PerfilDecisionHorizonteTemporal`), con la misma estructura abierta de `tipo`/`valor`/`unidad`, sin catálogo cerrado todavía.

Las alternativas que se quieran explorar simultáneamente —por ejemplo, pensionarse a los 62 años frente a los 65— se representan como escenarios o estrategias derivadas de ese mismo perfil vigente, nunca como varios perfiles vigentes en paralelo.

### ExpedientePensional

Ubicado en `src/models/ExpedientePensional.js`, es el contrato agregador: deliberadamente mínimo y compositivo. Contiene un identificador propio (`id`), una referencia por identificador al `UserProfile` existente (`userProfileId`), el `PerfilDecision` vigente embebido completo (`perfilDecisionVigente`) y una colección de referencias por identificador a las `Simulation` asociadas (`simulationIds`). No embebe la estructura interna de `UserProfile` ni de `Simulation`, no incorpora persistencia, documentos ni archivos adjuntos, y no asume ninguna clave técnica de identidad de persona.

## 7. Evolución de Simulation

`Simulation` se definió originalmente en el Sprint 1 como el snapshot inmutable de una corrida del motor de cálculo para un `UserProfile`. Durante el Sprint 2 se resolvió explícitamente qué representa `Simulation` dentro del dominio, evaluando dos alternativas: tratarla como la ejecución técnica del motor, o tratarla como evidencia histórica del Expediente Pensional.

Se adoptó la segunda alternativa. `Simulation` se trata conceptualmente como evidencia histórica del Expediente Pensional: su responsabilidad dominante es conservar de forma inmutable y auditable qué información se utilizó, bajo qué contexto se evaluó, qué perfil de decisión estaba vigente y qué resultados produjo el sistema en un momento determinado. Técnicamente sigue siendo producida por una ejecución de `pensionEngine`, pero eso se estableció como un detalle de implementación, no como su identidad de dominio. Esta decisión se sostiene en que el Expediente Pensional evoluciona durante toda la relación del sistema con la persona, y en que la capacidad de Comparación necesita tratar las `Simulation` pasadas como hechos fijos y comparables entre sí — ambas premisas exigen que cada `Simulation` sea, por diseño, una pieza de evidencia inmutable y no solo la salida desechable de una función.

Esta decisión no implica resolver persistencia, corrección o anulación de simulaciones, gobernanza del historial, versionado del esquema, Comparación ni Brújula Pensional — todos permanecen explícitamente fuera de alcance.

Sobre esa base se incorporaron dos campos obligatorios:

- **`perfilDecisionUtilizado`** (`PerfilDecision`): copia completa e inmutable del `PerfilDecision` efectivamente vigente al momento de la ejecución — nunca una referencia. `PerfilDecision` es la fuente conceptual de la intención del usuario; `simulacionInput` es su proyección tipada y ya resuelta, consumida directamente por `pensionEngine`. Ambos campos coexisten con responsabilidades distintas, no como fuentes de verdad en competencia.
- **`contextoEvaluacionUtilizado`** (`ContextoEvaluacion`): copia completa e inmutable de los valores legales y de supuestos efectivamente resueltos para la evaluación. Es la fuente autoritativa de esos valores dentro de la `Simulation`. `metadata.versionNormativa` y `metadata.versionSupuestos` identifican las versiones de los conjuntos de datos de origen y complementan su trazabilidad, sin derivarse de `contextoEvaluacionUtilizado` ni resumirlo. Los campos `CalculationTrace.normasUsadasIds` y `CalculationTrace.supuestosUsadosIds`, dentro de cada resultado embebido en `resultadoBase`, indican qué entradas de ese mismo contexto utilizó específicamente cada fórmula.

Ningún campo preexistente de `Simulation` —`id`, `userProfileId`, `simulacionInput`, `resultadoBase`, `escenarios`, `metadata`— cambió de nombre, tipo u obligatoriedad. La integración fue estrictamente aditiva.

## 8. Evolución de Explanation

El contrato `Explanation`, definido en el Sprint 1, describía en su documentación que la futura función `domain/transparency/explainCalculation.js` construiría cada explicación resolviendo `normasUsadasIds` y `supuestosUsadosIds` directamente contra `data/legal` y `data/assumptions`. Una auditoría de coherencia realizada al cierre del Sprint 2 detectó que esa descripción entraba en contradicción con la autoridad que el propio sprint ya le había asignado a `ContextoEvaluacion` como fuente resuelta de esos mismos valores: de implementarse tal como estaba documentado, `explainCalculation.js` habría ejecutado una segunda resolución independiente y redundante de la misma información.

Se corrigió la documentación de `Explanation` para establecer que `explainCalculation.js` debe construirse a partir de dos fuentes ya resueltas, sin volver a resolver nada directamente contra los datos crudos: el `CalculationTrace` correspondiente, para saber qué entradas utilizó una fórmula, y el `contextoEvaluacionUtilizado` de esa misma `Simulation`, para obtener los valores y metadatos ya resueltos de esas entradas. La estructura del `@typedef` y sus seis campos —`datosUsados`, `formula`, `normas`, `supuestos`, `limitaciones` y `gradoEstimacion`— permanecieron intactos; el cambio fue exclusivamente de documentación.

## 9. Auditorías arquitectónicas realizadas

Durante el Sprint 2 se realizaron tres auditorías formales, cada una con hallazgos clasificados en Crítico, Recomendación u Observación.

**Auditoría técnica de `Simulation.js`, previa a su modificación.** Confirmó que ningún código ejecutable ni ninguna prueba dependía de ese archivo, identificó los riesgos de duplicidad ya conocidos entre `simulacionInput`, `PerfilDecision`, `metadata` y `ContextoEvaluacion`, y estableció el marco de decisiones que debían resolverse antes de tocar el contrato. No arrojó hallazgos clasificados por severidad, por tratarse de una auditoría preparatoria; sus conclusiones se convirtieron directamente en tres de las decisiones arquitectónicas documentadas en la sección 10.

**Primera auditoría de coherencia de los ocho contratos del dominio.** Encontró un hallazgo Crítico: `ExpedientePensional.js` afirmaba que `ContextoEvaluacion` todavía no había sido incorporado a `Simulation`, lo cual había dejado de ser cierto tras la integración descrita en la sección 7. Se corrigió de inmediato. Como Recomendaciones quedaron registradas, sin corregirse de inmediato: la asimetría entre `Simulation.js` (que referencia `PerfilDecision` y `ContextoEvaluacion` mediante `import()` de JSDoc, resoluble por herramientas de tipos) y `ExpedientePensional.js` (que referencia `PerfilDecision` solo por nombre, sin `import()`); y la ausencia de una relación declarada entre `ContextoEvaluacion.fecha` y `Simulation.metadata.fechaCalculo`. Como Observaciones quedaron anotadas la mezcla, todavía no separada, de datos de usuario y valores legales o de supuestos dentro de `CalculationTrace.datosUsados`, y una nota desactualizada en `PensionCalculationResult.js`.

**Segunda auditoría de coherencia**, organizada alrededor de ocho preguntas específicas —duplicidad de responsabilidades, conocimiento indebido entre contratos, ciclos conceptuales, campos redundantes, ruptura del modelo de agregado, contradicciones entre Sprint 1 y Sprint 2, ambigüedades de implementación, y vigencia de la documentación JSDoc—. Encontró un segundo hallazgo Crítico: la contradicción entre `Explanation.js` y la autoridad de `ContextoEvaluacion`, descrita en la sección 8, visible simultáneamente desde cuatro de las ocho preguntas de la auditoría. Se corrigió de inmediato.

Confirmó, sin resolverla, la Recomendación sobre `ContextoEvaluacion.fecha`, que en ese mismo cierre de sprint se resolvió mediante una decisión explícita de responsabilidades diferenciadas (ver sección 10), y añadió una nueva Recomendación: la relación de pertenencia transaccional entre `ExpedientePensional` y `Simulation` —si `Simulation` debe comportarse como una entidad interna del agregado del Expediente o como un agregado propio referenciado desde afuera— quedó explícitamente pendiente hasta que se diseñe la persistencia. No se detectaron ciclos conceptuales ni acoplamientos innecesarios entre los ocho contratos.

## 10. Decisiones de arquitectura consolidadas

Al cierre del Sprint 2 quedaron oficialmente establecidas las siguientes decisiones:

1. El Expediente Pensional es la raíz de agregado conceptual del dominio, compuesta por cinco bloques, y no un objeto físico monolítico.
2. Existe un expediente principal por persona, que evoluciona durante su relación con el sistema; la clave técnica de identidad de esa persona queda pendiente de una decisión posterior.
3. `PerfilDecision` mantiene un único perfil vigente por Expediente; las alternativas se exploran como escenarios o estrategias derivadas de ese mismo perfil, nunca como perfiles paralelos.
4. `ContextoEvaluacion` es la fuente autoritativa de los valores legales y de supuestos resueltos para una evaluación, preservando siempre la separación entre normas y supuestos.
5. Cada `Simulation` conserva copias completas e inmutables tanto del `PerfilDecision` como del `ContextoEvaluacion` efectivamente utilizados, nunca referencias que deban resolverse de nuevo.
6. `Simulation` se trata conceptualmente como evidencia histórica del Expediente Pensional, no únicamente como la salida técnica de una ejecución del motor de cálculo.
7. `simulacionInput` es la proyección tipada y resuelta de `PerfilDecision`, consumida directamente por `pensionEngine`; `PerfilDecision` es su fuente conceptual.
8. `metadata.versionNormativa` y `metadata.versionSupuestos` complementan la trazabilidad de `contextoEvaluacionUtilizado` sin derivarse de él ni resumirlo.
9. `CalculationTrace` conserva la evidencia específica de lo que cada fórmula utilizó; `Explanation` se construye a partir de `CalculationTrace` y de `contextoEvaluacionUtilizado`, sin volver a resolver información directamente contra `data/legal` ni `data/assumptions`.
10. `Simulation.metadata.fechaCalculo` representa la fecha y hora en que se ejecutó la simulación; `ContextoEvaluacion.fecha` representa la fecha efectiva para la cual se resolvieron la normativa y los supuestos. Ambas pueden coincidir en una simulación corriente y diferir legítimamente en una simulación retroactiva.
11. Comparación es una capacidad del Expediente, separada de `escenarios[]`, con atribución por fuente obligatoria desde su primera versión; su contrato y ubicación de archivo quedan sin asignar.
12. Brújula Pensional es el producto final del sistema, sin contrato propio todavía.
13. La relación de pertenencia transaccional entre `ExpedientePensional` y `Simulation` queda explícitamente pendiente hasta el diseño de la persistencia.
14. Ningún contrato validado en el Sprint 1 fue reemplazado; toda extensión fue aditiva.
15. La persistencia del Expediente Pensional permanece fuera de alcance, como decisión independiente y posterior.

## 11. Commits realizados

| Commit | Mensaje | Aporte |
|---|---|---|
| `7e2b9a7` | `docs: agregar arquitectura del Expediente Pensional` | Incorpora `docs/tecnico/arquitectura/expediente-pensional.md` como referencia arquitectónica oficial del sprint, tras dos rondas de revisión crítica. |
| `46d4aa1` | `domain: agregar contratos mínimos del Expediente Pensional` | Incorpora los tres contratos nuevos —`ContextoEvaluacion`, `PerfilDecision`, `ExpedientePensional`— como JSDoc puro, sin lógica ejecutable. |
| `4331a1c` | `domain: integrar contexto y perfil en Simulation` | Redefine `Simulation` como evidencia histórica del Expediente Pensional e incorpora `perfilDecisionUtilizado` y `contextoEvaluacionUtilizado`, preservando intactos todos los campos preexistentes. |
| `84dd13f` | `docs: sincronizar ExpedientePensional con Simulation` | Corrige el hallazgo Crítico de la primera auditoría de coherencia: actualiza la documentación de `ExpedientePensional.js` para reflejar que `ContextoEvaluacion` ya está incorporado a `Simulation`. |
| `a831cb0` | `docs: alinear Explanation con ContextoEvaluacion` | Corrige el hallazgo Crítico de la segunda auditoría de coherencia: elimina de `Explanation.js` la descripción de una segunda resolución independiente contra `data/legal` y `data/assumptions`. |

Cada commit se preparó de forma aislada por archivo o conjunto de archivos directamente relacionado, se verificó con `npm run lint` y `npm run test` antes de comitear, y se publicó en `origin/main` solo después de revisión y aprobación explícitas.

## 12. Estado final del dominio

Al cierre del Sprint 2, el dominio de PensionLab está compuesto por ocho contratos coherentes entre sí:

- **`UserProfile`** (`src/models/UserProfile.js`) — sin cambios respecto al Sprint 1.
- **`PerfilDecision`** (`src/models/PerfilDecision.js`) — nuevo.
- **`ExpedientePensional`** (`src/models/ExpedientePensional.js`) — nuevo, contrato agregador mínimo.
- **`Simulation`** (`src/models/Simulation.js`) — extendido de forma aditiva; redefinido conceptualmente como evidencia histórica del Expediente Pensional.
- **`ContextoEvaluacion`** (`src/domain/contracts/ContextoEvaluacion.js`) — nuevo.
- **`CalculationTrace`** (`src/domain/contracts/CalculationTrace.js`) — sin cambios respecto al Sprint 1.
- **`Explanation`** (`src/domain/contracts/Explanation.js`) — documentación actualizada; estructura sin cambios.
- **`PensionCalculationResult`** (`src/domain/contracts/PensionCalculationResult.js`) — sin cambios respecto al Sprint 1.

El grafo de dependencias conceptuales entre ellos es acíclico. `Simulation` es el contrato con mayor acoplamiento —embebe `PerfilDecision`, `ContextoEvaluacion` y dos `PensionCalculationResult`, y referencia `UserProfile` por identificador—, lo cual es coherente con su rol de evidencia histórica completa de una evaluación. `ExpedientePensional` mantiene el acoplamiento mínimo que su diseño compositivo exige: referencias por identificador a `UserProfile` y `Simulation`, y un único embebido, `PerfilDecision`.

Todos los contratos siguen siendo definiciones JSDoc puras, sin lógica ejecutable, sin validaciones en tiempo de ejecución y sin ninguna dependencia de código real entre ellos más allá de las referencias de tipo. Ningún archivo del repositorio instancia todavía un `UserProfile`, una `Simulation` o un `ExpedientePensional` reales: el dominio quedó completamente diseñado y documentado, a la espera de que `pensionEngine` lo ponga en movimiento. La suite de pruebas se mantiene en 18/18 tests en verde durante todo el sprint, sin ninguna regresión, y el linter se mantiene limpio en cada commit.

## 13. Trabajo pendiente para Sprint 3

Los siguientes pendientes quedaron identificados y documentados explícitamente durante el Sprint 2, sin resolverse:

- Definir la clave técnica de identidad de persona necesaria para que "un expediente por persona" pueda hacerse cumplir por el sistema, no solo modelarse conceptualmente.
- Resolver la relación de pertenencia transaccional entre `ExpedientePensional` y `Simulation`, como parte del diseño de persistencia.
- Diseñar la estrategia de persistencia del Expediente Pensional.
- Diseñar el módulo de cálculo del IBL, prerrequisito directo de `formulaRPM` dentro de `pensionEngine`.
- Diseñar la forma detallada de `viabilidad`, `estrategias` y `recomendación` dentro de `Simulation.resultadoBase`.
- Diseñar el contrato y asignar la ubicación de la capacidad de Comparación, incluida su futura cuantificación por fuente.
- Diseñar en detalle el contrato de Brújula Pensional.
- Diseñar la forma detallada de `traslados` y `bonos` dentro de `UserProfile.laboralInfo`, aprobados conceptualmente pero sin forma técnica todavía.
- Sincronizar la redacción de la Decisión 7 en `docs/tecnico/arquitectura/expediente-pensional.md` con la versión final, más precisa, adoptada en `ContextoEvaluacion.js`.
- Homologar la convención de referencias JSDoc entre contratos: `ExpedientePensional.perfilDecisionVigente` sigue referenciando `PerfilDecision` por nombre, sin `import()`, a diferencia del patrón ya establecido en `Simulation.js`.
- Reconciliar la forma de `Explanation.normas`/`Explanation.supuestos` con la de `ContextoEvaluacionNorma`/`ContextoEvaluacionSupuesto` antes de implementar `explainCalculation.js`.
- Revisar `CalculationTrace.datosUsados`, que continúa mezclando datos de usuario y valores legales o de supuestos en un único objeto plano, en tensión con la separación que el resto del dominio ya aplica.
- Implementar `pensionEngine` (`calcularPensionRPM`, `calcularProyeccionRAIS`, `calcularSemanasFaltantes`), que sigue sin ninguna lógica ejecutable.
- Implementar la interfaz de usuario, sin ninguna pieza funcional desde el cierre del Sprint 1.

## 14. Lecciones aprendidas

**Auditar antes de modificar reduce el riesgo real, no solo el percibido.** La auditoría previa a `Simulation.js` confirmó que ningún código ni prueba dependía de ese contrato, lo que permitió modificarlo con una exigencia de rigor conceptual alta pero un riesgo técnico de regresión prácticamente nulo — una distinción que solo la auditoría hizo visible.

**Distinguir "duplicación física" de "responsabilidades distintas" cambia cómo se diseña, no solo cómo se documenta.** La corrección de ese encuadre condujo a un patrón de diseño repetible, aplicado dos veces de forma consistente: una fuente conceptual junto a una proyección tipada de consumo directo (`PerfilDecision`/`simulacionInput`), y una fuente autoritativa junto a evidencia específica de uso (`ContextoEvaluacion`/`CalculationTrace`).

**La documentación técnica se degrada silenciosamente cuando el código a su alrededor cambia.** Los dos hallazgos Críticos del sprint —en `ExpedientePensional.js` y en `Explanation.js`— no fueron errores de diseño original: fueron afirmaciones ciertas en el momento en que se escribieron que dejaron de serlo cuando otro contrato evolucionó a su alrededor. Ninguna de las dos habría aparecido en una revisión de sintaxis; ambas aparecieron en una auditoría de coherencia deliberada.

**Un contrato puede volverse correcto sin editarse.** La afirmación de `PerfilDecision.js` sobre cómo `Simulation` conservaría su copia era, en el momento en que se escribió, una anticipación. Dejó de serlo, y se volvió exacta, en el instante en que `Simulation.js` se integró — sin que `PerfilDecision.js` necesitara ningún cambio propio.

**Comitear por responsabilidad aislada facilita la reversión y la revisión independiente.** Cada commit del sprint correspondió a una unidad de cambio coherente por sí sola, verificada y revisada antes de integrarse, lo que mantuvo el historial legible y cada paso auditable de forma independiente.

## 15. Conclusión

El Sprint 2 representa un cambio de madurez arquitectónica en PensionLab porque, por primera vez, el proyecto formalizó su concepto de dominio central —el Expediente Pensional— antes de tener presión de implementación para hacerlo, y sometió ese diseño a un ciclo completo de revisión crítica, corrección e integración, sin comprometer ni una sola línea de lo ya validado en el Sprint 1.

El sprint no produjo un sistema funcional: ningún cálculo de pensión es todavía posible de punta a punta, y esa limitación se mantiene igual de vigente que al cierre del Sprint 1. Lo que produjo fue algo distinto y necesario en esta etapa del proyecto — un dominio coherente, trazable y auditado, capaz de sostener la implementación de `pensionEngine` sin que esa implementación tenga que redescubrir, sobre la marcha, decisiones que ya deberían estar tomadas. Las dos auditorías de cierre, y los dos hallazgos Críticos que corrigieron antes de declarar el sprint terminado, son la evidencia de que esa coherencia no se asumió: se verificó.
