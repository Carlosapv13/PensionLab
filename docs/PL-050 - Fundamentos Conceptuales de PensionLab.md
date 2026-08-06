# PL-050 — Fundamentos Conceptuales de PensionLab

**Versión:** 0.4
**Fecha:** 2026-08-05
**Categoría documental:** Fundamentos conceptuales — documento fundacional, transversal a toda la
vida del proyecto, sin pertenecer a ningún Sprint
**Proyecto:** PensionLab

Este documento no describe arquitectura técnica (eso vive en `docs/tecnico/arquitectura/`), ni
experiencia de usuario (eso vive en `docs/producto/`), ni el estado de ningún Sprint (eso vive en
`docs/gestion/`). PL-050 vive en la raíz de `docs/` a propósito: no es propiedad de ninguna de esas
tres dimensiones del proyecto — es el sustrato conceptual sobre el que las tres se apoyan. Su
numeración (050, anterior a PL-230 y PL-240) refleja esa misma relación: es lógicamente previo, no
posterior, a la arquitectura y a la experiencia que PensionLab ya tiene documentadas.

## Control de versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 0.1 | 2026-08-05 | Carlos Peraza (con asistencia de Claude, Anthropic) | Diseño completo de la arquitectura documental: unidad de conocimiento, plantilla obligatoria de 16 campos, taxonomías de Estado, Nivel de Evidencia y Vigencia Conceptual, regla oficial de citación, política de evolución, índices derivados. No incluye todavía ningún Descubrimiento Conceptual redactado formalmente. |
| 0.2 | 2026-08-05 | Carlos Peraza (con asistencia de Claude, Anthropic) | Primer Descubrimiento Conceptual real incorporado (DC-001), validando la plantilla de §4 contra un caso real ya ocurrido en el proyecto. |
| 0.3 | 2026-08-05 | Carlos Peraza (con asistencia de Claude, Anthropic) | Segundo Descubrimiento Conceptual real incorporado (DC-002, origen del Principio 13). DC-001 queda cerrado y no se modifica salvo evidencia futura que justifique un DC relacionado. |
| 0.4 | 2026-08-05 | Carlos Peraza (con asistencia de Claude, Anthropic) | Cierre editorial: corrección de la versión declarada en el encabezado y de una decisión pendiente desactualizada; **arquitectura documental declarada congelada** (Decisión 9, §13). Sin cambios de contenido conceptual. |

---

## 0. Qué es este documento, y por qué existe

PensionLab, a lo largo de su desarrollo, no solo construye código — descubre, a veces por accidente
y a veces por reflexión deliberada, qué son realmente las cosas de las que habla: qué es un
Expediente, qué es una estrategia, qué es un camino, qué significa que el sistema "asesore" en vez
de "decidir". Ese conocimiento no es arquitectura (no dice cómo se construye) ni es experiencia (no
dice cómo se comunica) — es **la comprensión del dominio mismo**, y hasta ahora no tenía un lugar
propio: quedaba disperso entre conversaciones, comentarios de código y fragmentos de otros
documentos.

PL-050 existe para preservar, de forma permanente, **el razonamiento que llevó al proyecto a
comprender su propio dominio** — no solo las conclusiones a las que llegó, sino el camino que
siguió para llegar a ellas, incluyendo lo que intentó y descartó en el trayecto.

## 1. Qué NO es este documento

- **No es un glosario.** Un glosario define; no argumenta. Ninguna entrada de este documento existe
  solo para fijar un término — existe para preservar por qué el proyecto llegó a entenderlo así, y
  qué otras formas de entenderlo se probaron y no sobrevivieron.
- **No es una bitácora cronológica.** Este documento no se organiza por fecha ni por Sprint. Una
  fecha puede acompañar a un registro como metadato (§4), pero nunca es el eje que ordena el
  documento — eso volvería a fragmentar por tiempo lo que debe preservarse por idea.
- **No es un diccionario de conceptos.** La unidad de este documento no es el concepto — es el
  **Descubrimiento Conceptual** (§2). Un concepto es, casi siempre, solo una de las varias cosas que
  un descubrimiento produce.
- **No documenta código, implementación, Sprints, arquitectura técnica ni experiencia de usuario.**
  Cuando un descubrimiento de este documento produce una regla vinculante de comportamiento, esa
  regla se escribe donde ya viven las reglas — los Principios de Arquitectura o los Principios de
  PL-240 — y este documento solo la referencia (§11). Nunca la duplica.

## 2. La unidad de conocimiento: el Descubrimiento Conceptual (DC)

Un **Descubrimiento Conceptual** es un episodio cerrado de razonamiento sobre el dominio de
PensionLab: nace de una pregunta real, documenta qué se creía antes de investigarla, qué se
descubrió al investigarla, y todo lo que ese descubrimiento produjo — conceptos nuevos, conceptos
que dejaron de sostenerse, principios vinculantes (si los hubo), y las preguntas que quedaron sin
resolver.

Un DC **no es** un concepto. Un concepto es, frecuentemente, uno de varios resultados de un DC. Esta
distinción es la decisión de diseño más importante de todo el documento: organizar por concepto
fragmentaría la historia de un mismo razonamiento entre varias entradas independientes; organizar
por descubrimiento la conserva completa, en el lugar donde ocurrió.

## 3. Criterio de admisión

Ningún DC se admite solo por haber sido mencionado en una conversación. Debe cumplir **al menos una**
de estas dos condiciones:

1. **Produjo una afirmación que sobrevivió a un intento serio de refutación**, y esa afirmación tiene
   una consecuencia real en otra parte del dominio (un concepto que otro documento ya usa, un
   principio que ya rige comportamiento, una decisión de alcance que ya se tomó apoyada en ella).
2. **Identificó una tensión o pregunta genuinamente real y recurrente**, incluso sin que exista
   todavía ninguna hipótesis de respuesta — en cuyo caso el DC se admite con Estado = Pregunta
   abierta (§5), precisamente para que esa pregunta no se pierda ni se vuelva a descubrir desde cero
   más adelante.

Un DC que no cumple ninguna de las dos sigue siendo, por ahora, una idea de trabajo dentro de la
conversación o el documento donde surgió — no está listo para convertirse en conocimiento
permanente.

## 4. Plantilla obligatoria de un Descubrimiento Conceptual

Todo DC debe incluir los siguientes **dieciséis** campos. Ninguno se omite por conveniencia; los que
pueden quedar legítimamente vacíos se señalan como tales.

| # | Campo | Contenido | ¿Puede quedar vacío? |
|---|---|---|---|
| 1 | **Identificador** | `DC-NNN`, correlativo, nunca reutilizado aunque un DC se descarte. | No |
| 2 | **Resumen Ejecutivo** | Dos a cuatro frases: pregunta, hallazgo y consecuencia principal, para decidir si vale la pena leer el DC completo sin tener que abrirlo. | No |
| 3 | **Fecha de registro** | Metadato de cuándo se escribió — nunca un eje organizador del documento (§0). | No |
| 4 | **Pregunta que originó el análisis** | La pregunta concreta que disparó la reflexión. | No |
| 5 | **Qué creíamos inicialmente** | El supuesto vigente antes de investigar. | Sí, si genuinamente no existía una creencia previa articulada — debe decirlo explícitamente, no dejarse en blanco sin explicación. |
| 6 | **Qué descubrimos** | El hallazgo. Si el Estado es "Pregunta abierta", puede decir honestamente que todavía no se sabe. | No |
| 7 | **Conceptos que nacieron** | Los conceptos nuevos que este DC introdujo, con su definición vigente **completa** (este es el único lugar donde ese concepto se define — ver §9). | Sí — algunos DC solo refutan, sin proponer un reemplazo todavía. |
| 8 | **Conceptos descartados** | Qué se creía que era un concepto válido y dejó de serlo, y por qué. | Sí. |
| 9 | **Principios derivados** | Si el descubrimiento produjo una regla vinculante, su referencia exacta en el documento de Principios correspondiente (nunca su texto repetido aquí). | Sí — la mayoría de los DC no llegan a este nivel. |
| 10 | **Consecuencias sobre el producto** | Qué cambia, en el dominio, a partir de este descubrimiento — más allá de si llegó o no a convertirse en un principio. | **No debería.** Un DC con este campo vacío probablemente no cumplía el criterio de admisión (§3) y no debió registrarse. |
| 11 | **Estado** | Uno de los cuatro valores de §5. | No |
| 12 | **Nivel de Evidencia** | Uno de los cuatro valores de §6. | No |
| 13 | **Vigencia Conceptual** | Uno de los tres valores de §7. | No |
| 14 | **Intentos de refutación que sobrevivió** | Qué se intentó para demostrar que el descubrimiento era incorrecto, y por qué no lo logró. | Solo cuando el Estado es Pregunta abierta — no hay todavía una afirmación que poner a prueba. |
| 15 | **Preguntas abiertas** | Tensiones o casos de borde que sobreviven **incluso si** el descubrimiento principal ya quedó resuelto. No debe confundirse con el Estado "Pregunta abierta" — ver §5. | Sí. |
| 16 | **Relación con otros documentos y Descubrimientos Conceptuales** | Qué otros documentos del repositorio quedaron afectados, y qué otros DC tocan el mismo concepto sin redefinirlo — solo citándolo (§8). | Sí. |

## 5. Taxonomía de Estado

- **Hipótesis** — el descubrimiento propuso una respuesta y superó un primer intento de
  refutación, pero todavía no tiene un segundo caso real independiente que la confirme.
- **Consolidado** — la respuesta ya tiene evidencia suficiente (normalmente E2 o superior, ver §6,
  aunque el umbral se juzga caso por caso, no por fórmula) y el proyecto opera asumiéndola como
  cierta.
- **Descartado** — se propuso, se puso a prueba, y no sobrevivió. Se conserva a propósito, nunca se
  elimina, precisamente para que nadie vuelva a proponerlo sin saber que ya falló.
- **Pregunta abierta** — el DC completo es, en sí mismo, una pregunta real sin ninguna hipótesis de
  respuesta todavía.

**Distinción que debe quedar inequívoca:** el Estado "Pregunta abierta" describe un DC **entero** que
todavía no propone ninguna respuesta. El campo "Preguntas abiertas" (§4) es distinto: existe en
**cualquier** DC, sin importar su Estado, y registra tensiones secundarias que sobreviven aunque el
hallazgo principal ya esté Consolidado. Confundir ambos sería el error de mantenimiento más probable
de este documento a largo plazo.

El Estado es además independiente de la Vigencia Conceptual (§7) — un DC puede seguir Consolidado y
al mismo tiempo haber dejado de estar Vigente.

Ningún DC cambia de Estado en silencio. Todo cambio se anota en el propio DC (cuándo y por qué lo
motivó — incluyendo si fue otro DC posterior el que forzó la reclasificación, en cuyo caso ambos se
citan mutuamente, §8).

## 6. Nivel de Evidencia

Independiente del Estado y de la Vigencia Conceptual — un DC puede ser "Hipótesis" con nivel E1, o
(más raramente) "Consolidado" con un nivel que el propio dominio nunca podrá llevar más allá de E2,
si no existe una tercera área del dominio donde ponerlo a prueba.

- **E0 — Intuición.** Una idea plausible, sin ningún caso real todavía que la respalde.
- **E1 — Primer caso real.** Al menos un caso concreto del dominio confirma o exige el concepto.
- **E2 — Segundo caso independiente.** Un segundo caso real, de origen distinto al primero, confirma
  el mismo patrón — el mismo umbral que el proyecto ya exige en otros lugares antes de generalizar.
- **E3 — Validación transversal.** El concepto se sostiene no solo por repetición dentro de una
  misma área del dominio, sino por aparecer y confirmarse en áreas distintas entre sí. Es la forma
  más fuerte de evidencia disponible antes de cualquier implementación a gran escala — y no todos
  los conceptos, por su propia naturaleza, tendrán ocasión de alcanzarla.

## 7. Vigencia Conceptual

Un tercer eje, independiente de Estado y de Nivel de Evidencia, que responde una pregunta distinta a
las otras dos: no "¿sigue siendo cierto el razonamiento?" (Estado) ni "¿qué tan puesto a prueba
está?" (Evidencia), sino **"¿siguen existiendo hoy las condiciones bajo las cuales esta conclusión
aplica?"**

Un DC puede permanecer Consolidado —nadie refutó su razonamiento— y al mismo tiempo dejar de estar
Vigente, si el contexto que lo hacía relevante cambió (ej. una limitación que dependía de no tener
cierto dato deja de aplicar el día que ese dato se captura por primera vez).

- **Vigente** — las condiciones que sostienen la conclusión del DC siguen existiendo hoy.
- **Vigente bajo condición** — declarada explícitamente en el propio DC: la conclusión sigue
  aplicando solo mientras esa condición se mantenga.
- **Superada** — el contexto cambió. Se cita el DC o el cambio que la superó. El DC original no se
  reescribe (§9) — solo se actualiza este campo, con nota de qué lo motivó.

## 8. Regla de citación de Descubrimientos Conceptuales

Cualquier documento del proyecto —Principios de Arquitectura, PL-230, PL-240, un cierre de Sprint, u
otro DC— que necesite apoyarse en un Descubrimiento Conceptual debe citarlo con un formato único,
nunca parafraseado:

- Para citar un DC completo: **`PL-050 DC-NNN`**.
- Para citar un concepto específico nacido en un DC: **`PL-050 DC-NNN ("Nombre del concepto")`**.

Esta forma de cita es la que hace verificable y buscable el campo "Relación con otros documentos y
Descubrimientos Conceptuales" (§4) — nunca una alusión informal ("como vimos antes...").

## 9. Política de evolución de un Descubrimiento Conceptual

1. **Un DC es una unidad cerrada de razonamiento.** El relato de "qué creíamos" y "qué descubrimos"
   no se reescribe retroactivamente para que suene mejor en retrospectiva — es un registro
   histórico.
2. **Un DC nunca reescribe su propia historia. Evoluciona exclusivamente mediante nuevos DC
   relacionados** que lo citan (§8) — nunca editando su relato original. Las únicas actualizaciones
   permitidas *in situ* sobre un DC ya escrito son sus campos de estado (Estado, Nivel de Evidencia,
   Vigencia Conceptual, Preguntas abiertas, Relación con otros documentos) — siempre con nota de qué
   las motivó.
3. **Un concepto vive y se actualiza únicamente en el DC que lo originó.** Si otro DC necesita ese
   mismo concepto, lo cita (§8) — nunca lo vuelve a definir. Es lo que garantiza la fuente única de
   verdad exigida en §10.
4. **Ningún DC se elimina.** Un DC Descartado sigue siendo conocimiento — es, de hecho, uno de los
   más valiosos que este documento puede conservar.

## 10. Índices y vistas derivadas

El cuerpo de Descubrimientos Conceptuales (§14) es la única fuente de verdad. Todo lo demás es una
vista, generada a partir de los campos que ya existen — ninguna vista contiene información que no
esté ya en algún DC. Gracias al Resumen Ejecutivo (§4), cualquiera de estas vistas permite decidir si
vale la pena abrir un DC completo, sin tener que leerlo entero primero:

- **Por estado**: agrupa los DC según su campo Estado.
- **Por principios**: lista los principios vinculantes ya derivados, enlazando al DC de origen de
  cada uno (campo "Principios derivados").
- **Por conceptos**: lista todo concepto nacido o descartado en cualquier DC, enlazando a su DC de
  origen (campos "Conceptos que nacieron" / "Conceptos descartados").
- **Por Sprint**: vista secundaria y no garantizadamente completa — solo incluye los DC que, en su
  campo de relación con otros documentos, citan explícitamente un cierre de Sprint.
- **Por tema**: agrupación temática ligera, revisada cuando la cantidad de DC lo justifique — no
  fijada de antemano.

## 11. Relación con otros documentos del proyecto

| Documento | Relación con PL-050 |
|---|---|
| Principios de Arquitectura (`plan-implementacion-prerrequisitos-pension-engine.md`) | Reciben las reglas vinculantes que un DC produce. PL-050 explica *por qué* son ciertas; el documento de Principios rige *qué hacer* dado que lo son. |
| PL-240 — Filosofía de Experiencia | Misma relación, aplicada al lenguaje y la conversación en vez de al comportamiento del dominio. |
| PL-230 — Arquitectura del Motor de Decisión, `expediente-pensional.md` | Documentan cómo se construye el sistema alrededor de un concepto ya comprendido. PL-050 no los reemplaza ni compite con ellos — los antecede lógicamente. |
| `cierre-sprint-N.md` | Registra decisiones de alcance e implementación de un Slice concreto — nunca el razonamiento conceptual permanente que las sostiene. |

## 12. Riesgos

1. **Confusión entre el Estado "Pregunta abierta" y el campo "Preguntas abiertas".** Señalada en §5
   como el error de mantenimiento más probable. Mitigación: la distinción queda escrita de forma
   explícita, no solo implícita en el nombre.
2. **Confusión entre Estado y Vigencia Conceptual** — un lector apresurado podría asumir que
   "Consolidado" implica "Vigente". Mitigación: §5 y §7 declaran su independencia de forma cruzada,
   no solo en un lugar.
3. **Duplicación de la definición de un concepto entre dos DC.** Riesgo real detectado durante el
   diseño de este documento (no hipotético). Mitigado por la regla de §9.3 — un concepto se define
   una sola vez, en su DC de origen; cualquier otro lo cita (§8).
4. **Reescritura silenciosa de un DC para "mantenerlo al día".** El riesgo más probable a varios años
   de distancia, cuando quien edita el documento ya no recuerde por qué se diseñó así. Mitigado por
   §9.1 y §9.2.
5. **Que "Consecuencias sobre el producto" aparezca vacío.** Tratado explícitamente en §4 como señal
   de alerta de una admisión indebida, no como una casilla opcional más.
6. **Que el Resumen Ejecutivo se use como sustituto de leer el DC completo**, en vez de como una
   ayuda para decidir si vale la pena hacerlo. Es exactamente el riesgo que corre cualquier resumen —
   se registra para que quien redacte un DC no lo escriba de forma que invite a saltarse el
   razonamiento completo, que es lo único que este documento realmente protege (§0).
7. **Crecimiento no acotado a escala (decenas o cientos de DC).** El índice de orientación (§10) deja
   de ser una comodidad y se vuelve la única forma viable de usar el documento. Si en el futuro el
   propio índice se vuelve inmanejable, esa sería la evidencia real (no anticipada) que justificaría
   dividirlo — no se hace ahora, sin esa evidencia.

## 13. Decisiones

### Decisiones tomadas en este documento

1. La unidad de conocimiento es el Descubrimiento Conceptual, no el concepto individual.
2. La plantilla obligatoria de un DC tiene **dieciséis** campos: doce de la propuesta original, más
   **Fecha de registro** y **Relación con otros documentos y Descubrimientos Conceptuales**
   (agregados en la primera revisión, para poder registrar "documentos afectados" tal como ya se
   había anticipado), más **Resumen Ejecutivo** y **Vigencia Conceptual** (agregados en este cierre).
3. Estado, Nivel de Evidencia y Vigencia Conceptual son **tres ejes independientes**; ningún valor de
   uno determina automáticamente el valor de otro.
4. Ningún DC se reescribe retroactivamente ni se elimina; evoluciona exclusivamente mediante nuevos
   DC relacionados que lo citan (§9).
5. PL-050 vive en la raíz de `docs/`, no bajo `tecnico/arquitectura/` ni `producto/`.
6. Se formaliza una **regla oficial de citación** (§8): `PL-050 DC-NNN`, nunca una alusión informal.
7. **Simplificación aplicada durante este cierre**: las antiguas "Reglas de mantenimiento y
   evolución" (una sola sección, en la versión anterior de este documento) se disolvieron en dos
   secciones con nombre propio — Regla de citación (§8) y Política de evolución (§9) — eliminando una
   tercera sección que, tras nombrar ambas explícitamente, habría quedado redundante con las dos.
8. **Corrección aplicada durante el cierre de la arquitectura documental**: la versión anterior de
   este documento afirmaba tener "trece campos" en una tabla que en realidad tenía catorce — error
   aritmético heredado, a su vez, de contar la propuesta original como "once campos" cuando en
   realidad enumeraba doce. Corregido; el conteo actual (dieciséis) fue verificado directamente contra
   la tabla del §4.
9. **Cierre formal de la arquitectura documental** (2026-08-05, tras incorporar y consolidar DC-001 y
   DC-002, que validaron la plantilla sin exigirle ningún cambio): la estructura de PL-050 —la unidad
   de conocimiento, la plantilla de dieciséis campos, las taxonomías de Estado, Nivel de Evidencia y
   Vigencia Conceptual, la regla de citación, la política de evolución, y los índices derivados—
   queda **congelada**. A partir de aquí, los cambios a este documento deben consistir exclusivamente
   en agregar nuevos Descubrimientos Conceptuales cuando el proyecto produzca conocimiento real que
   los justifique (§3) — no en modificar su arquitectura, salvo que aparezca evidencia objetiva de que
   ya no funciona, con el mismo criterio de generalización con evidencia real que ya rige el resto del
   proyecto.

### Decisiones explícitamente pendientes

10. **Si el contenido conceptual ya existente en `expediente-pensional.md`** (los 5 Bloques, los
    Niveles de madurez de la información pensional) debe migrarse a PL-050 como Descubrimientos
    Conceptuales retroactivos, o permanecer donde está.
11. **Redacción formal del tercer Descubrimiento Conceptual real del proyecto** — DC-001 y DC-002 ya
    quedaron redactados y cerrados (§14). Pendiente: el DC de la reflexión sobre "estrategia" y el
    nacimiento del concepto de "Camino", a escribir cuando el proyecto retome ese frente, no antes.

## 14. Cuerpo de Descubrimientos Conceptuales

### Índice rápido

| ID | Resumen Ejecutivo | Estado | Evidencia | Vigencia |
|---|---|---|---|---|
| DC-001 | PensionLab no debe interpretar la motivación personal del usuario para recomendar estrategias — nace el Principio 12. | Consolidado | E2 | Vigente |
| DC-002 | "Mostrar antes de preguntar" no era una decisión local de un Slice, sino un patrón ya recurrente en el dominio — nace el Principio 13. | Consolidado | E2 | Vigente |

---

### DC-001 — ¿Debe PensionLab comprender la motivación personal del usuario para recomendar mejores estrategias?

**1. Identificador:** DC-001

**2. Resumen Ejecutivo:** Durante el análisis del Slice "Meta de jubilación deseada", el proyecto
exploró si el sistema debía descubrir la prioridad o motivación subyacente del usuario —por qué
quiere lo que quiere— para construir mejores estrategias pensionales. Se concluyó que no: PensionLab
asesora decisiones pensionales, nunca decisiones personales. Misma meta pensional, distinta
motivación personal, deben producir exactamente las mismas estrategias. De aquí nace el Principio de
Arquitectura 12.

**3. Fecha de registro:** 2026-08-05

**4. Pregunta que originó el análisis:** ¿Debe PensionLab intentar comprender la motivación profunda
del usuario —por qué quiere lo que quiere en su vida personal— para poder recomendarle mejores
estrategias pensionales?

**5. Qué creíamos inicialmente:** Se asumía, sin haberlo cuestionado todavía como principio de
producto, que cuanto mejor comprendiera PensionLab lo que realmente le importa a una persona a nivel
personal, mejor podría orientarla — que la calidad de una estrategia dependía, al menos en parte, de
entender la motivación detrás del objetivo declarado, no solo el objetivo en sí. Bajo ese supuesto,
explorar la "prioridad" o el trasfondo personal del usuario no se veía como una intromisión, sino
como una forma de ser más útil. La pregunta que se estaba resolviendo hasta ese momento era
únicamente *cuándo y cómo* capturar ese trasfondo — no *si* debía capturarse en absoluto.

**6. Qué descubrimos:** Descubrimos que el espacio de alternativas pensionales objetivamente
viables para una persona —qué caminos existen, y con qué costo, beneficio, riesgo y condiciones cada
uno— es enteramente una función de tres cosas: la normativa aplicable, los hechos pensionales de la
persona (régimen, semanas, IBC, edad, historia), y las condiciones que la persona declaró
explícitamente sobre su decisión (su objetivo y, si las declaró, sus restricciones). La motivación
personal detrás de ese objetivo —el *por qué* lo quiere— no es uno de los insumos de esa función: no
cambia qué norma aplica, no cambia ningún hecho sobre la persona, y no cambia lo que el objetivo o
las restricciones declaradas exigen para cumplirse. Por lo tanto, dos personas con el mismo objetivo
pensional, sujetas a las mismas normas y con los mismos hechos, tienen necesariamente el mismo
espacio objetivo de alternativas, sin importar cuán distintas sean sus razones personales para
quererlo.

Lo único que en principio podría variar entre dos personas con distinta motivación es cuál
alternativa termina eligiendo cada una dentro de ese mismo espacio — nunca cuáles alternativas
existen. Esa elección le pertenece enteramente a la persona. Antes de este análisis, esa frontera
—entre lo que determina el espacio de alternativas y lo que determina la elección dentro de él— no
estaba señalada como algo relevante para el diseño del producto.

**7. Conceptos que nacieron:** Ninguno con nombre propio — este descubrimiento produce directamente
un principio vinculante (campo 9), no un concepto de dominio independiente.

**8. Conceptos descartados:** La idea de que "descubrir la prioridad del usuario" (una elección
previa sobre qué dimensión de su decisión pensional le importa más) fuera una responsabilidad
legítima de un Slice temprano de captura. Esa idea ya había sido cuestionada, en el análisis
inmediatamente anterior a este descubrimiento, por razones de secuencia y de contaminación de
dominio; este DC le agrega una razón adicional y más fuerte, de principio, no solo de oportunidad de
diseño.

**9. Principios derivados:** Principio 12 —
`docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md`, numeral 12
("PensionLab asesora decisiones pensionales, no decisiones personales").

**10. Consecuencias sobre el producto:** Ninguna futura capacidad de comparación, construcción de
caminos o estrategias, u orientación (incluida cualquier eventual Brújula Pensional) puede
condicionar su resultado a una motivación inferida o declarada del usuario — solo a hechos y a
objetivos pensionales explícitos. Cualquier campo de captura futuro de `PerfilDecision`
(restricciones, preferencias) debe admitir el "qué" de una meta sin necesitar ni interpretar su
"por qué".

**11. Estado:** Consolidado.

**12. Nivel de Evidencia:** E2. Primer caso real: la propia declaración del principio durante el
análisis de "Meta de jubilación deseada". Segundo caso, independiente: el diseño de la Capacidad B
("Explorar una dirección") de la Fase 2 (Base Económica), que captura explícitamente qué quiere
explorar el usuario sin preguntar ni inferir nunca por qué — una aplicación real del principio en un
contexto de diseño distinto al que lo originó.

**13. Vigencia Conceptual:** Vigente.

**14. Intentos de refutación que sobrevivió:**
- Se verificó si el Constructor de Estrategias descrito en la arquitectura del Motor de Decisión
  —que usa las restricciones declaradas en `PerfilDecision` para filtrar, y las preferencias y
  prioridades para ordenar, las estrategias resultantes— violaba el principio. No lo hace: filtrar u
  ordenar por una condición o preferencia *declarada explícitamente* no es interpretar una
  motivación; el principio prohíbe inferir el porqué, no usar el qué.
- Se verificó si el principio, aplicado con rigor, terminaría prohibiendo preguntas legítimas sobre
  lo que el usuario quiere lograr en materia pensional. No es así: la frontera quedó confirmada entre
  "qué quieres lograr" (legítimo) y "por qué lo quieres en tu vida personal" (prohibido).

**15. Preguntas abiertas:** Los campos `restricciones` y `preferencias` de `PerfilDecision` son hoy
texto libre, sin validación. Nada impide todavía, en la práctica, que alguien redacte una restricción
que mezcle una condición legítima con una motivación personal (ej. "quiero jubilarme pronto porque
tengo problemas de salud"). El principio exige que cualquier componente futuro que consuma esos
campos use solo la condición, nunca la razón — pero ese comportamiento todavía no está garantizado
por ningún mecanismo, solo por esta declaración de principio.

**16. Relación con otros documentos y Descubrimientos Conceptuales:**
- `docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md` (Principio 12,
  numeral 12).
- `docs/gestion/cierre-sprint-3.md`, sección "Pausa de Sprint 3 — Consolidación de principios y
  reconstrucción de la Fase 2 (Base Económica)".
- `src/models/PerfilDecision.js` (contrato verificado como ya compatible, sin cambios de forma).
- Estrechamente relacionado con `PL-050 DC-002` (origen del Principio 13) — nació en la misma
  sesión, inmediatamente después de este. Ambos se distinguen explícitamente como "antes" (Principio
  13, qué hacer mientras no existe una meta) y "después" (Principio 12, qué hacer una vez que la meta
  ya fue declarada) de que exista un objetivo pensional declarado.

---

### DC-002 — ¿"Mostrar antes de preguntar" es una decisión de experiencia de usuario o un principio de arquitectura?

**1. Identificador:** DC-002

**2. Resumen Ejecutivo:** Al analizar si la idea de "mostrar antes de preguntar" —aplicada como
solución de diseño en el Slice "Meta de jubilación deseada"— merecía convertirse en regla general, se
descubrió que el mismo patrón ya existía, sin haber sido nombrado, en un componente construido antes
para un problema de dominio distinto (`PrimeraLectura.jsx`). Esa recurrencia independiente, en dos
áreas distintas del dominio, es la evidencia que la distingue de una coincidencia de diseño y da
origen al Principio 13.

**3. Fecha de registro:** 2026-08-05

**4. Pregunta que originó el análisis:** La idea de "mostrar antes de preguntar", aplicada como
decisión de diseño para el Slice "Meta de jubilación deseada", ¿es solo una buena práctica de
experiencia de usuario, local a ese Slice, o es en realidad un principio de arquitectura que debe
regir todos los Slices futuros del proyecto?

**5. Qué creíamos inicialmente:** Se creía que "mostrar antes de preguntar" era una decisión de
diseño acertada para el Slice concreto que se estaba analizando en ese momento —una elección de
experiencia de usuario, sensata pero circunscrita a ese caso— sin que existiera todavía ninguna razón
articulada para tratarla como una regla vinculante aplicable a cualquier otro Slice del proyecto. No
se había considerado si esa misma necesidad ya se había presentado antes, en otro lugar del producto,
ni bajo qué condiciones exactas debía aplicarse o dejar de aplicarse.

**6. Qué descubrimos:** Descubrimos que "mostrar antes de preguntar" no era una ocurrencia aislada
del Slice que se estaba analizando: el mismo patrón ya existía, sin haber sido nombrado ni reconocido
como tal, en un componente construido para un problema de dominio completamente distinto —
`PrimeraLectura.jsx`, que refleja evidencia de elegibilidad ya conocida (semanas, edad legal) antes
de que el recorrido pidiera cualquier dato nuevo relacionado con una meta. Que el mismo patrón
apareciera, de forma independiente, en dos áreas distintas del dominio —elegibilidad y lo
económico— sin haber sido diseñado deliberadamente como una regla compartida, es lo que distingue una
coincidencia de diseño de una necesidad genuina y recurrente del producto.

También descubrimos que esta necesidad no es la misma que ya cubría la regla de experiencia
"Explicar antes de preguntar" (PL-240, principio A): esa regla rige cómo se redacta una pregunta ya
decidida; esta otra rige si y cuándo corresponde plantear la pregunta en absoluto, en función de si
el sistema ya agotó el valor que puede entregar con lo que sabe. Son responsabilidades de naturaleza
distinta —una de lenguaje, otra de secuencia y de capacidad del dominio— y confundirlas habría
tratado como resuelto, por una simple regla de redacción, algo que en realidad exige que el propio
dominio sea capaz de producir una lectura derivada antes de avanzar.

**7. Conceptos que nacieron:** Ninguno con nombre propio — este descubrimiento produce directamente
un principio vinculante (campo 9), no un concepto de dominio independiente (mismo patrón que
`PL-050 DC-001`).

**8. Conceptos descartados:** Ninguno. Este descubrimiento no invalida ningún concepto previamente
aceptado — extiende una decisión de diseño ya tomada para un Slice específico a una regla general,
sin haber tenido que descartar nada en el proceso.

**9. Principios derivados:** Principio 13 —
`docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md`, numeral 13 ("El
sistema no pide una decisión antes de agotar lo que ya sabe").

**10. Consecuencias sobre el producto:** Reordenó la secuencia ya planeada de la Fase 2 (Base
Económica): la captura de una meta dejó de ser el segundo paso de la secuencia económica; se intercaló
una lectura derivada de lo ya conocido (Capacidad A) antes de cualquier captura orientada a una meta.
Cualquier Slice futuro que planee solicitar información destinada a orientar decisiones (Bloque 3 del
Expediente) debe, antes, demostrar que agotó el valor derivable de los hechos ya conocidos (Bloques
1-2) — esto se vuelve un requisito de diseño, no solo de redacción.

**11. Estado:** Consolidado.

**12. Nivel de Evidencia:** E2. Primer caso real: `PrimeraLectura.jsx`, ya construido antes de que
este patrón se nombrara. Segundo caso, independiente: la lectura derivada económica identificada como
necesaria para la Fase 2 (Capacidad A), en un área del dominio distinta a la del primer caso.

**13. Vigencia Conceptual:** Vigente.

**14. Intentos de refutación que sobrevivió:**
- Se verificó si este principio entraba en tensión con el Principio 9 (generalizar solo con
  evidencia real), por el riesgo de que se interpretara como un mandato para construir una
  infraestructura genérica de "lectura derivada" antes de tiempo. No es así: el principio exige un
  comportamiento y una secuencia, no una abstracción de código compartida — cada área del dominio
  construye su propia lectura derivada de forma independiente, igual que ya lo hizo
  `PrimeraLectura.jsx` sin generalizar nada.
- Se verificó si entraba en tensión con el Principio 4 (el sistema nunca decide en silencio), por el
  riesgo de que una lectura derivada usara una referencia por defecto (ej. una edad legal, a falta de
  una meta) sin decirlo. Se resuelve porque el propio principio exige declarar explícitamente
  cualquier referencia usada como tal, nunca presentarla como si fuera la meta del usuario.
- Se verificó si contradecía la arquitectura del Motor de Decisión (PL-230 §6.3), que ya asume un
  `PerfilDecision` con preferencias y prioridades completas al describir el Constructor de
  Estrategias. No hay contradicción: PL-230 nunca especificó *cuándo*, en la experiencia del usuario,
  se captura ese `PerfilDecision` — dejó esa pregunta fuera de su propio alcance a propósito. Este
  principio llena exactamente ese vacío, sin contradecir lo ya diseñado.

**15. Preguntas abiertas:**
- No existe todavía un componente o contrato formal para la "lectura derivada" que este principio
  exige mostrar antes de que exista un `PerfilDecision` — no es evidencia en el sentido de PL-230
  §6.2 (Motor de Evidencias, que compara un hecho contra un umbral normativo) ni Explicabilidad pura
  (§6.6, que solo traduce lo que otro componente ya produjo). Queda registrado como una pregunta
  abierta de arquitectura, deliberadamente sin resolver, y no bloquea el desarrollo mientras tanto.
- Si "mostrar antes de preguntar" alcanzará algún día el Nivel de Evidencia E3 (validación
  transversal). Los dos casos ya confirmados pertenecen a áreas del dominio genuinamente distintas
  (elegibilidad y lo económico), lo que hace de este DC un candidato razonable a E3 — pero eso exige
  un tercer caso real e independiente, todavía inexistente, no una inferencia a partir de los dos
  primeros.

**16. Relación con otros documentos y Descubrimientos Conceptuales:**
- `docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md` (Principio 13,
  numeral 13, junto con la nota de relación explícita con el Principio 12 en esa misma sección).
- `docs/gestion/cierre-sprint-3.md`, sección "Pausa de Sprint 3 — Consolidación de principios y
  reconstrucción de la Fase 2 (Base Económica)".
- `src/pages/PrimeraLectura.jsx` (primer caso real, construido antes de que este principio se
  nombrara).
- `PL-050 DC-001` (origen del Principio 12) — nació en la misma sesión, inmediatamente antes de este.
- PL-240, principio A ("Explicar antes de preguntar") — deslindado explícitamente de este
  descubrimiento en el campo 6, para que no se traten como la misma responsabilidad.
