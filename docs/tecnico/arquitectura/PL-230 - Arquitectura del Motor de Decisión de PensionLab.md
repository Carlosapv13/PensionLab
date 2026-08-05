# PL-230 — Arquitectura del Motor de Decisión de PensionLab

**Versión:** 1.0
**Fecha:** 2026-08-02
**Categoría documental:** Arquitectura de dominio — Motor de Decisión
**Proyecto:** PensionLab
**Biblioteca de Conocimiento de PensionLab — Documento fundacional de arquitectura**

Este documento constituye la fuente oficial versionada de PL-230 dentro del repositorio de PensionLab.

El archivo Word correspondiente (`PL-230 - Arquitectura del Motor de Decisión de PensionLab - v1.0.docx`) es el entregable oficial para la Biblioteca de Conocimiento y debe generarse a partir de este documento, manteniendo siempre la equivalencia íntegra entre ambas versiones.

Ninguna modificación deberá realizarse directamente sobre el archivo Word. Toda evolución del documento deberá efectuarse primero sobre esta fuente en formato Markdown y posteriormente reflejarse en el entregable Word.

## Control de versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 1.0 | 2026-08-02 | Carlos Peraza (con asistencia de Claude, Anthropic) | Versión inicial. Sustituye la propuesta preliminar "Motor de Reglas" (nunca formalizada como documento) y resuelve el pendiente #2 de "Próximos pasos" de `docs/tecnico/arquitectura/expediente-pensional.md`. |

---

## 0. Filosofía del Motor de Decisión

PensionLab no existe para decirle a una persona qué hacer con su pensión. Existe para que esa persona entienda su situación, conozca las alternativas reales que tiene, y decida con información — no con opacidad ni con una recomendación que no puede auditar.

Esta distinción no es una preferencia de producto entre varias igualmente válidas. Es la razón de ser del proyecto, declarada desde su documento fundacional más visible: *"Un número sin explicación no sirve — cada resultado debe poder rastrearse hasta la norma, el supuesto o la fórmula que lo produjo"* y *"Preferimos ser honestos sobre lo que no sabemos... antes que mostrar una falsa precisión"* (`README.md`). El Motor de Decisión es la parte del sistema donde esa declaración se pone a prueba con más fuerza, porque es exactamente el lugar donde sería técnicamente más fácil —y más peligroso— que el sistema empezara a decidir por la persona sin que nadie lo hubiera decidido así de forma explícita.

Por eso el Motor de Decisión se construye alrededor de una separación que se mantiene sin excepción a lo largo de todo este documento y de la arquitectura que describe:

1. **PensionLab construye evidencia.** Antes de hablar de "qué te conviene", el sistema establece qué es cierto sobre el caso: qué requisitos se cumplen, cuáles no, y bajo qué condiciones. La evidencia no elige nada — solo constata.
2. **PensionLab genera estrategias.** A partir de esa evidencia, y de lo que la propia persona ha declarado que le importa, el sistema ensambla un conjunto de caminos concretos y viables. Genera opciones, no una opción.
3. **PensionLab compara estrategias.** Las opciones se presentan una junto a otra, con sus diferencias, costos y limitaciones visibles — nunca ocultando lo que una estrategia sacrifica para lograr lo que ofrece.
4. **PensionLab explica cada estrategia.** Cada alternativa —incluidas las que no aplican o no se recomiendan— tiene una razón visible, en lenguaje que la persona pueda entender sin ser experta en pensiones.
5. **PensionLab mantiene siempre la decisión final en manos del usuario.** El sistema puede orientar (ver §6.5, Brújula Pensional). No puede decidir. Ningún componente de esta arquitectura tiene, en ningún punto de su diseño, la responsabilidad de elegir por la persona.

Estos cinco puntos no son aspiracionales. Son restricciones de arquitectura, con la misma fuerza normativa que los Principios de Arquitectura ya vigentes desde Sprint 1 (§2). Todo el resto de este documento —cada componente, cada contrato, cada diagrama— existe para hacer estas cinco afirmaciones verificables en el sistema real, no solo enunciables en un documento.

## 1. Objetivo

Este documento define la arquitectura del **Motor de Decisión** de PensionLab: el conjunto de componentes que transforma información ya resuelta (normativa, supuestos de modelado, datos del caso) en un conjunto de estrategias pensionales explicables, comparables y trazables, sin que en ningún punto del proceso el sistema decida por el usuario.

El Motor de Decisión no es un componente único, sino una arquitectura de siete responsabilidades diferenciadas (§6), cada una con una frontera de entrada y salida explícita, que en conjunto reemplazan lo que en una etapa anterior del proyecto se planteó de forma más estrecha bajo el nombre provisional "Motor de Reglas". Ese planteamiento inicial —un componente que evaluaría condiciones legales y produciría resultados— fue descartado deliberadamente durante el diseño de este documento, no por defecto técnico, sino porque conducía a una arquitectura donde la evidencia y la decisión quedaban fusionadas en un mismo paso, lo cual es incompatible con la filosofía descrita en §0. La discusión que llevó a ese descarte, y las razones específicas, se documentan en §10 (Decisiones).

Este documento también resuelve un pendiente dejado explícitamente abierto en el cierre de Sprint 2: la sección "Próximos pasos" de `docs/tecnico/arquitectura/expediente-pensional.md` (punto 2) difirió el diseño detallado de la Brújula Pensional y de la cuantificación de Comparación "solo cuando exista evidencia suficiente (Principio 9)". Este documento no cuantifica Comparación entre estrategias en detalle (eso permanece diferido, ver §6.4 y §9), pero sí da a la Brújula Pensional su primer marco conceptual formal (§6.5), y da arquitectura completa al espacio que Sprint 2 reservó bajo los campos `viabilidad`, `estrategias` y `recomendación` de `Simulation.resultadoBase` sin diseñarlos (ver §8).

### Lo que este documento entrega

- Una arquitectura de siete componentes con responsabilidades, entradas, salidas y límites explícitos.
- La relación de cada componente con los Principios de Arquitectura ya vigentes y con los contratos de dominio ya existentes o ya reservados.
- Un flujo de datos ilustrado con un caso estructural, sin reglas legales reales.
- Los riesgos identificados y las decisiones de arquitectura tomadas, incluidas las que se dejan explícitamente pendientes por falta de evidencia suficiente.

### Lo que este documento no entrega

Se detalla con precisión en §5 (Alcance de esta versión).

## 2. Principios aplicables

Este documento no introduce principios nuevos. Aplica y extiende los Principios de Arquitectura de PensionLab, vigentes desde Sprint 1 (`docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md`) y reafirmados en cada documento de arquitectura posterior. De los diez principios, los siguientes tienen aplicación directa y explícita en el Motor de Decisión:

| Principio | Aplicación en el Motor de Decisión |
|---|---|
| **1 — Separación estricta entre lo obligatorio y lo asumido** | Ningún componente del Motor de Decisión funde una norma legal con un supuesto de modelado. La distinción que ya rige `data/legal` vs. `data/assumptions`, y `CalculationTrace.normasUsadasIds` vs. `supuestosUsadosIds`, se preserva en la evidencia que produce el Motor de Evidencias (§6.2) y en toda explicación derivada de ella (§6.6). |
| **3 — Todo resultado debe ser trazable hasta su origen** | Se extiende de "todo cálculo" a "toda evidencia y toda estrategia". Ninguna estrategia puede presentarse sin que sea posible rastrear qué evidencia la sustenta y qué normas o supuestos originaron esa evidencia (§6.7). |
| **4 — El sistema falla explícito, nunca decide en silencio** | Es el principio más directamente puesto a prueba por este documento. Se traduce en una regla concreta: cuando una regla de evidencia no puede evaluarse por falta de datos, el resultado es un estado explícito de "no evaluable", nunca un valor supuesto ni una omisión silenciosa (§6.2). |
| **5 — Las limitaciones y simplificaciones se declaran, no se ocultan** | Toda estrategia mostrada al usuario debe declarar sus limitaciones y los supuestos de los que depende, con el mismo estándar que hoy exige `Explanation.limitaciones` para un cálculo individual. Una estrategia sin limitaciones declaradas es, por definición, una forma de falsa precisión. |
| **6 — Una simulación es un snapshot inmutable y reproducible en el tiempo** | Se extiende a la evidencia y a las estrategias: el conjunto de estrategias mostrado en una `Simulation` debe seguir siendo reconstruible exactamente como se presentó, aunque las reglas de evidencia cambien después (§6.7). |
| **7 — RAIS es una proyección, nunca se presenta como cálculo definitivo** | Se extiende de "un cálculo" a "una estrategia completa": ninguna estrategia que dependa de una proyección RAIS puede presentarse con el mismo nivel de certeza que una basada en RPM ya consolidado. El Comparador de Estrategias (§6.4) y la Brújula Pensional (§6.5) deben preservar esta distinción, no promediarla ni disolverla. |
| **8 — Los cambios de arquitectura se documentan antes de implementarse** | Este documento es la aplicación directa de ese principio al Motor de Decisión — se diseña, se somete a revisión crítica, y solo después se autoriza su implementación. |
| **9 — Se generaliza cuando hay evidencia real, no por anticipación** | Es el principio que más activamente limita el alcance de este documento. Se invoca explícitamente para diferir el diseño detallado de la Brújula Pensional (§6.5) y de la cuantificación del Comparador de Estrategias (§6.4, §9), y para justificar por qué ciertas decisiones se dejan abiertas en vez de resolverse por conveniencia narrativa (§10). |

Los Principios 2 (fórmulas puras) y 10 (minimización de datos personales) no tienen aplicación directa nueva en este documento: el Principio 2 sigue rigiendo exclusivamente `domain/formulas/`, que el Motor de Decisión no modifica ni reemplaza; el Principio 10 no se ve afectado porque esta arquitectura no cambia qué datos se recolectan, solo cómo la información ya recolectada se procesa y se presenta.

## 3. Principio rector: separación entre evidencia y decisión

Este principio tiene rango equivalente a los diez Principios de Arquitectura de PensionLab (§2), aplicado específicamente al Motor de Decisión. Se enuncia aquí de forma autónoma, y no como parte de §0 (Filosofía) ni de §2 (Principios generales), porque cumple una función distinta a ambos: §0 explica *por qué* existe esta arquitectura, en términos de producto; §2 conecta esta arquitectura con reglas ya vigentes en todo el proyecto; esta sección establece la regla de comportamiento *específica y verificable* que cada componente del Motor de Decisión debe cumplir, sin excepción.

> **Ninguna regla, en ningún punto del Motor de Decisión, decide por el usuario. Una regla únicamente genera evidencia.**
>
> Las estrategias se construyen a partir de esa evidencia — nunca la evidencia se construye a partir de una estrategia ya asumida. Las estrategias se comparan entre sí de forma explícita. Cada estrategia se explica, incluidas las que no se recomiendan o no aplican. El usuario conserva, en todo momento, la decisión final.

De este enunciado se derivan cuatro consecuencias de diseño, vinculantes para cualquier componente que se incorpore al Motor de Decisión en el futuro, no solo para los siete descritos en §6:

**1. La evidencia nunca conoce las preferencias del usuario.** Un componente que produce evidencia (§6.2) evalúa hechos del caso contra normas y supuestos ya resueltos. No debe recibir, ni consultar, ni depender de `PerfilDecision.restricciones`, `preferencias` o `prioridades`. Si un componente de evidencia necesitara conocer las prioridades del usuario para producir su resultado, dejaría de ser evidencia y pasaría a ser, de hecho, una decisión disfrazada de evidencia — una violación de este principio, no una variación aceptable de él.

**2. Las preferencias del usuario nunca alteran los hechos, solo el orden y el filtro.** El componente que sí conoce `PerfilDecision` (el Constructor de Estrategias, §6.3) puede usar las restricciones para excluir estrategias inviables, y las preferencias/prioridades para ordenar o destacar estrategias — pero nunca para cambiar si un hecho de evidencia es cierto o falso. Una restricción no vuelve "falsa" una evidencia que la contradice; simplemente hace que la estrategia que depende de ella quede fuera del conjunto construido.

**3. Ninguna comparación colapsa en una única salida obligatoria.** El Comparador de Estrategias (§6.4) puede señalar diferencias, costos y tradeoffs. No puede reducir el conjunto de estrategias comparadas a una sola "ganadora" implícita. Si el diseño de un componente futuro necesitara producir una única salida a partir de una comparación, ese componente estaría operando como una decisión, no como una comparación, y debe rediseñarse o renombrarse en consecuencia — no debe permitirse que un "comparador" se convierta silenciosamente en un "decisor" por conveniencia de implementación.

**4. Orientar no es decidir.** La Brújula Pensional (§6.5) puede señalar dirección, énfasis o relevancia relativa entre estrategias ya comparadas. No puede eliminar del conjunto ninguna estrategia que el Comparador haya presentado, ni presentar una sola estrategia como "la respuesta". La diferencia entre orientar y decidir no es de grado — es de naturaleza: orientar deja todas las opciones visibles y añade una señal; decidir remueve las opciones no elegidas.

Estas cuatro consecuencias son las que se verifican, componente por componente, en la Tabla de responsabilidades (§6.0) y en cada subsección de Diseño (§6.1-§6.7). Cualquier decisión de implementación futura que entre en conflicto con alguna de ellas debe tratarse como una violación de arquitectura, no como un ajuste de diseño menor.

## 4. Diagrama general

El Motor de Decisión se compone de cinco componentes en secuencia y dos capas transversales que atraviesan a los cinco. Es una distinción deliberada: los cinco componentes en secuencia transforman datos, paso a paso, de "valor legal resuelto" a "estrategia orientada"; las dos capas transversales no transforman nada por sí mismas — registran y explican lo que cada uno de los cinco pasos hizo.

```
┌────────────┐    ┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐    ┌────────────────────┐
│            │    │                 │    │                      │    │                      │    │                    │
│ Resolvers  │───▶│ Motor de        │───▶│ Constructor de       │───▶│ Comparador de        │───▶│ Brújula Pensional  │
│(existentes)│    │ Evidencias      │    │ Estrategias          │    │ Estrategias          │    │                    │
│            │    │                 │    │        ▲             │    │                      │    │                    │
└────────────┘    └─────────────────┘    └────────│─────────────┘    └──────────────────────┘    └────────────────────┘
                                                    │
                                          ┌─────────┴──────────┐
                                          │  PerfilDecision      │
                                          │  (contrato existente,│
                                          │  Sprint 2)            │
                                          └───────────────────────┘

        ╔═══════════════════════════════ Explicabilidad (capa transversal) ═══════════════════════════════╗
        ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝

        ╔═══════════════════════════════ Trazabilidad (capa transversal)   ═══════════════════════════════╗
        ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
```

**Lectura del diagrama:**

- **Resolvers → Motor de Evidencias.** Los Resolvers (Resolver Legal, Resolver de Supuestos; ya diseñados en `resolver-legal-generico.md`) entregan valores normativos y de supuestos ya resueltos para una fecha y unas dimensiones dadas. El Motor de Evidencias es el único componente nuevo de esta arquitectura que consume directamente esa salida.
- **Motor de Evidencias → Constructor de Estrategias.** La evidencia producida (hechos aplicables, no aplicables o no evaluables, ver §6.2) es el único insumo que el Constructor recibe sobre "qué es cierto" del caso.
- **`PerfilDecision` → Constructor de Estrategias.** Es la segunda entrada del Constructor, y la única de las cinco cajas en secuencia que recibe una entrada adicional fuera de la cadena principal. Esto es intencional: es el punto exacto donde las preferencias del usuario entran al sistema, y por eso se representa explícitamente separado de la línea evidencia → estrategia → comparación → orientación, nunca mezclado con ella.
- **Constructor de Estrategias → Comparador de Estrategias.** El conjunto de estrategias ensambladas (ya filtradas por restricciones, ya ordenadas o etiquetadas por preferencias/prioridades) pasa al Comparador tal cual — el Comparador no vuelve a consultar `PerfilDecision` ni la evidencia cruda.
- **Comparador de Estrategias → Brújula Pensional.** La Brújula solo recibe el resultado ya comparado. No tiene acceso directo a la evidencia ni al conjunto de estrategias sin comparar.
- **Explicabilidad y Trazabilidad** no reciben una flecha de entrada de un componente único ni entregan una salida a otro componente único: cada una de las cinco cajas en secuencia produce su propio registro de trazabilidad y su propia explicación legible, y ambas capas son responsables de que ese registro exista en cada paso, no solo al final del proceso. Un modelo donde solo el resultado final se explica o se traza sería incompatible con el Principio 3 (todo resultado trazable hasta su origen) aplicado a cada paso intermedio, no solo al resultado visible.

## 5. Alcance de esta versión

### Sí incluye

- La arquitectura conceptual de los siete componentes del Motor de Decisión: Resolvers (referenciados, no rediseñados), Motor de Evidencias, Constructor de Estrategias, Comparador de Estrategias, Brújula Pensional, Explicabilidad y Trazabilidad.
- Las responsabilidades, entradas y salidas de cada componente a nivel cualitativo — qué tipo de información conceptual entra y sale de cada uno, no una interfaz de código ni un contrato de datos formal.
- La relación de cada componente con los Principios de Arquitectura vigentes (§2) y con los contratos de dominio ya existentes o ya reservados desde Sprint 1 y Sprint 2 (§8).
- Un flujo de datos ilustrado mediante un caso estructural, sin ninguna regla legal o pensional real.
- Los riesgos identificados durante el diseño de esta arquitectura (§9) y las decisiones de arquitectura tomadas, incluidas las que se dejan explícitamente pendientes por falta de evidencia suficiente (§10).
- El marco conceptual de la Brújula Pensional — qué es y, con la misma importancia, qué no es — sin comprometerse a su contrato detallado (§6.5).

### No incluye — queda explícitamente fuera de esta versión

- **Ninguna regla legal o pensional específica.** Ni de elegibilidad, ni de régimen de transición, ni de ningún otro criterio real del sistema pensional colombiano. Este documento diseña el marco donde esas reglas vivirán, no las reglas mismas.
- **Código de implementación de ningún componente.**
- **El contrato de datos detallado (`@typedef` JSDoc) de ningún componente nuevo.** El diseño formal de cada contrato (el equivalente de lo que `ContextoEvaluacion.js` o `PerfilDecision.js` recibieron en Sprint 2, con su propio ciclo de propuesta, revisión crítica e implementación) queda para cuando cada componente se implemente individualmente, no para este documento de arquitectura general.
- **La cuantificación exacta de diferencias entre estrategias en el Comparador.** Permanece diferida por el Principio 9, con el mismo tratamiento que ya recibió la cuantificación de la capacidad "Comparación" entre `Simulation` en `expediente-pensional.md`: se exige identificar la fuente de una diferencia, no medir cuánto aporta cada fuente.
- **La forma final y detallada de la Brújula Pensional.** Se mantiene como marcador conceptual acotado (§6.5), no como contrato — mismo tratamiento que recibió el cálculo de IBL en Sprint 1: "ubicado, no diseñado".
- **El diseño de persistencia** de evidencia, estrategias o comparaciones. Es una decisión independiente y posterior, con el mismo estatus que la persistencia del Expediente Pensional ya tiene en `expediente-pensional.md`.
- **La modificación de ningún contrato ya existente** — `UserProfile`, `Simulation`, `PerfilDecision`, `ExpedientePensional`, `CalculationTrace`, `Explanation`. Todo lo descrito en este documento se relaciona con ellos por composición o por extensión aditiva prevista (§8), nunca por reemplazo ni por modificación retroactiva de su forma ya aprobada.
- **La decisión de en qué Sprint, en qué orden o con qué prioridad se implementa cada componente.** Es planificación de proyecto, no arquitectura, y no corresponde a este documento.

## 6. Diseño

### 6.0 Tabla de responsabilidades

Esta tabla resume, componente por componente, la frontera de comportamiento fijada por el Principio rector (§3). Cada subsección de esta sección (§6.1-§6.7) desarrolla en profundidad la fila correspondiente.

| Componente | Qué hace | Qué nunca debe hacer |
|---|---|---|
| **Resolvers** | Resuelve el valor aplicable de una norma o de un supuesto, para una fecha y unas dimensiones dadas, a partir de `data/legal` y `data/assumptions`. | Nunca produce evidencia sobre el caso del usuario, ni conoce que existe un Motor de Evidencias, un Constructor de Estrategias o cualquier componente posterior. |
| **Motor de Evidencias** | Evalúa condiciones del caso contra valores ya resueltos por los Resolvers y produce evidencia — hechos aplicables, no aplicables, o no evaluables — sobre el sistema pensional. | Nunca decide, recomienda, ordena ni descarta estrategias. Nunca conoce `PerfilDecision`. Nunca resuelve directamente contra `data/legal` o `data/assumptions`. Nunca calla un resultado por falta de datos — debe declarar explícitamente "no evaluable". |
| **Constructor de Estrategias** | Ensambla un conjunto de estrategias viables combinando la evidencia del Motor de Evidencias con las restricciones, preferencias y prioridades de `PerfilDecision`. | Nunca modifica ni reinterpreta la evidencia recibida. Nunca reduce el conjunto a una sola estrategia. Nunca compara estrategias entre sí. |
| **Comparador de Estrategias** | Presenta el conjunto de estrategias construido una junto a otra, con sus diferencias, costos, certeza y limitaciones visibles. | Nunca produce una única estrategia "ganadora" implícita. Nunca oculta ni atenúa la incertidumbre de una estrategia (ej. una basada en proyección RAIS) para que se vea comparable a una de mayor certeza. Nunca excluye una estrategia que el Constructor ya incluyó. |
| **Brújula Pensional** | Señala orientación, énfasis o relevancia relativa entre estrategias ya comparadas. | Nunca elimina del conjunto ninguna estrategia. Nunca se presenta como "la respuesta" ni como una recomendación única y cerrada. Nunca opera sin que el Comparador haya actuado primero. |
| **Explicabilidad** | Traduce la evidencia, las estrategias, la comparación y la orientación de cada uno de los componentes anteriores a lenguaje legible para el usuario, incluyendo el motivo de lo que no aplica. | Nunca resuelve ni reinterpreta datos por su cuenta — solo traduce lo que otro componente ya produjo. Nunca omite la explicación de un resultado negativo o de una estrategia descartada. |
| **Trazabilidad** | Registra, para cada evidencia, estrategia, comparación y orientación, qué datos, qué reglas, qué versión y qué contexto se usaron. | Nunca permite que un resultado exista sin registro de su origen. Nunca se muta ni se sobrescribe un registro ya producido para una `Simulation` pasada. |

### 6.1 Resolvers

#### Qué hace

Resuelve el valor aplicable de una norma legal o de un supuesto de modelado, para una fecha y un conjunto de dimensiones dadas (ej. sexo, régimen), a partir de `data/legal` y `data/assumptions` respectivamente. Este componente **ya está diseñado** en `docs/tecnico/arquitectura/resolver-legal-generico.md` (Resolver Legal, `resolverValorLegal`; Resolver de Supuestos, `resolverValorSupuesto`); este documento no lo rediseña ni le agrega responsabilidades. Se incluye en esta arquitectura únicamente para fijar, sin ambigüedad, el límite de entrada del Motor de Decisión: es el único punto del sistema completo (Resolvers + Motor de Decisión) donde se toca directamente una fuente cruda de datos legales o de supuestos.

#### Qué consume

Un campo, una fecha y un conjunto de dimensiones (ej. `{campo: 'semanasMinimasPension', fecha: '2026-07-30', dimensiones: {sexo: 'F', regimen: 'RPM'}}`), y el contenido versionado de `data/legal/versions/*.json` o `data/assumptions/versions/*.json`, según corresponda.

#### Qué produce

Un valor escalar o un tramo aplicable — nunca una interpretación adicional del valor, nunca una conclusión sobre el caso del usuario. La diferencia entre "resolver un valor" y "producir evidencia" es exactamente la frontera entre este componente y el Motor de Evidencias (§6.2): el Resolver dice *cuánto es X*; el Motor de Evidencias dice *qué significa X para este caso*.

#### De qué componentes depende

De ninguno dentro del Motor de Decisión. Depende únicamente de `data/legal` y `data/assumptions`, y de sus propios manifiestos de vigencia (jurídico y de supuestos, ambos pendientes de diseño detallado según `resolver-legal-generico.md`).

#### Qué componentes dependen de él

El Motor de Evidencias (§6.2) es el único componente de esta arquitectura que consume directamente su salida. Ningún otro componente del Motor de Decisión —Constructor, Comparador, Brújula, Explicabilidad, Trazabilidad— debe invocar un Resolver directamente. Esta restricción no es incidental: es la misma disciplina que ya evitó, en Sprint 2, que `explainCalculation.js` ejecutara una segunda resolución independiente y redundante contra `data/legal`/`data/assumptions` en paralelo a `ContextoEvaluacion` (hallazgo Crítico documentado en `cierre-sprint-2.md`, corregido antes del cierre del sprint). El Motor de Decisión hereda esa misma disciplina: una sola resolución, un solo punto de entrada.

#### Qué nunca debe hacer

Nunca produce evidencia sobre el caso del usuario — un Resolver no sabe, ni debe saber, que existe un caso, una persona o una estrategia. No conoce la existencia del Motor de Evidencias, del Constructor de Estrategias, ni de ningún componente posterior de esta arquitectura. Esto ya está establecido en su propio documento de diseño (`resolver-legal-generico.md`); se reafirma aquí porque es la premisa sobre la que se apoya toda la arquitectura del Motor de Decisión: si un Resolver alguna vez empezara a "saber" para qué se usa su resultado, dejaría de ser un componente de resolución pura y se convertiría en una fuente de acoplamiento oculto entre capas que hoy están, correctamente, desacopladas.

#### Relación con los Principios de Arquitectura

Su relación con los Principios ya está descrita en detalle en `resolver-legal-generico.md` (particularmente Principio 1, en la separación estricta entre Resolver Legal y Resolver de Supuestos, y Principio 4, en la regla de conflicto que falla explícito ante ambigüedad). Este documento no repite ese análisis — lo hereda íntegro, y añade únicamente la precisión de que el Motor de Evidencias es el consumidor exclusivo de su salida dentro de esta arquitectura.

### 6.2 Motor de Evidencias

Este es el componente que sustituye, en forma y en nombre, a la propuesta preliminar "Motor de Reglas" descrita en la conversación previa a este documento (ver §10, Decisión 1). El cambio de nombre no es cosmético: "Motor de Reglas" describe qué contiene el componente (reglas); "Motor de Evidencias" describe qué produce (evidencia) — y es precisamente esa distinción, entre lo que un componente *tiene* y lo que un componente *entrega*, la que el Principio rector (§3) exige mantener visible en cada nivel de esta arquitectura.

#### Qué hace

Evalúa condiciones del caso del usuario contra valores normativos y de supuestos ya resueltos por los Resolvers (§6.1), y produce un conjunto de **hechos verificables** sobre la situación pensional de ese caso — nunca una conclusión sobre qué debería hacer el usuario. Cada hecho se expresa con un estado en tres valores (aplica / no aplica / no evaluable), nunca con un booleano forzado, siguiendo directamente el Principio 4 (el sistema falla explícito, nunca decide en silencio).

Internamente, el Motor de Evidencias no es una única pieza de lógica monolítica: es un **orquestador** que invoca un conjunto de reglas de evidencia independientes entre sí (ver "Estructura interna de una regla de evidencia", más abajo), recolecta sus resultados individuales, y entrega ese conjunto completo — sin resumirlo, sin priorizarlo, sin elegir cuáles mostrar — al Constructor de Estrategias.

#### Diagrama de evaluación

```
                    ┌─────────────────────────┐
                    │   Resolvers (§6.1)      │
                    │  valores ya resueltos    │
                    └────────────┬─────────────┘
                                 │
    ┌────────────────────┐      │      ┌──────────────────────────┐
    │ Datos del caso ya   │      │      │  Motor de Evidencias      │
    │ conocidos (Expediente│─────┼─────▶│  (orquestador)            │
    │ / UserProfile)       │      │      │                          │
    └────────────────────┘      │      │  ┌────────┐ ┌────────┐    │
                                 └─────▶│  │Regla A │ │Regla B │ ···│
                                        │  └───┬────┘ └───┬────┘    │
                                        │      │          │         │
                                        │      ▼          ▼         │
                                        │  aplica /   no evaluable  │
                                        │  no aplica  (independiente)│
                                        └──────────────┬────────────┘
                                                        │
                                                        ▼
                                        ┌────────────────────────────┐
                                        │  Conjunto de Evidencia      │
                                        │  (todos los resultados,     │
                                        │   sin resumir ni priorizar) │
                                        └──────────────┬─────────────┘
                                                        │
                                                        ▼
                                        Constructor de Estrategias (§6.3)
```

Cada regla (Regla A, Regla B, ...) se evalúa de forma independiente y no tiene visibilidad de las demás — el orquestador (el Motor de Evidencias en sí) es el único que conoce el conjunto completo de reglas disponibles y las invoca, pero no interpreta ni combina sus resultados individuales más allá de agregarlos en un conjunto.

#### Una diferencia estructural importante frente a los Resolvers

Los Resolvers (§6.1) resuelven **un único valor** para un campo dado, y por eso necesitan una regla de conflicto explícita (gana la entrada más específica; si hay empate con valores incompatibles, el Resolver falla). El Motor de Evidencias **no tiene ese problema por diseño**: cada regla de evidencia responde una pregunta distinta y produce un hecho independiente — no hay dos reglas compitiendo por el mismo valor. Por eso el Motor de Evidencias no necesita, y no debe implementar, una política de resolución de conflictos entre reglas: si dos hechos parecen estar en tensión (ej. "cumple el requisito A" y "no cumple el requisito B", ambos relacionados con la misma estrategia potencial), esa tensión no se resuelve aquí — se traslada intacta, como evidencia plural, al Constructor de Estrategias, que es quien decide qué estrategias construir a partir de esa pluralidad. Confundir estos dos niveles —resolver un valor único vs. producir hechos plurales— sería el error de diseño más probable si este componente se implementara sin esta distinción explícita.

#### Qué consume

- **Valores ya resueltos de los Resolvers**: parámetros legales y de supuestos, ya resueltos para la fecha y las dimensiones del caso (ej. un umbral, una tasa, una fecha de vigencia).
- **Datos del caso ya conocidos**: la información ya capturada sobre la situación del usuario (hoy dispersa en la UI de Sprint 3; a futuro, consolidada en `UserProfile` y en el Expediente Pensional).
- **Nunca** `PerfilDecision`. Es la aplicación directa de la primera consecuencia del Principio rector (§3): la evidencia no conoce las preferencias del usuario.

#### Qué produce

Un **Conjunto de Evidencia**: la colección completa de resultados de todas las reglas evaluadas para ese caso, en esa fecha. La siguiente tabla describe la forma conceptual de cada resultado individual — no es un contrato de datos formal (eso queda fuera de alcance, §5), es la estructura mínima que cualquier contrato futuro deberá respetar para cumplir el Principio rector.

| Campo conceptual | Contenido | Obligatoriedad |
|---|---|---|
| Identificador de la regla | Id único y estable de la regla que produjo este resultado | Obligatorio |
| Versión de la regla | Versión de la lógica evaluada, para reproducibilidad (Principio 6) | Obligatorio |
| Descripción | Qué evalúa la regla, en lenguaje humano | Obligatorio |
| Estado | `aplica` / `no aplica` / `no evaluable` | Obligatorio, sin valor por defecto |
| Motivo | Explicación legible del estado, citando los valores concretos comparados | Obligatorio |
| Datos usados | Los datos del caso efectivamente consultados por la regla | Obligatorio |
| Normas usadas | Ids de las entradas de `data/legal` referenciadas (si aplica) | Condicional — presente solo si la regla usó normativa |
| Supuestos usados | Ids de las entradas de `data/assumptions` referenciadas (si aplica) | Condicional — presente solo si la regla usó supuestos |
| Efecto o valor derivado | Un valor que la regla determina como aplicable, solo si la regla es de ese tipo | Opcional, y solo cuando corresponde a la naturaleza de la regla |

**El campo "Efecto o valor derivado" merece una precisión.** No toda regla de evidencia es puramente de sí/no — algunas reglas determinan, además de si aplican, qué valor aplica bajo esa condición (ej. qué ancla o qué tramo corresponde). Ese valor derivado sigue siendo evidencia, no decisión: la regla no está diciendo "esto es lo que deberías usar", está diciendo "esto es lo que la norma determina que aplica, dado que esta condición se cumple". La distinción es sutil pero se mantiene por el mismo criterio del Principio rector: un valor derivado por una regla es un hecho más sobre el caso, no una preferencia ni una elección.

#### Ejemplo estructural (ilustrativo, sin reglas legales reales)

Se presenta un ejemplo puramente estructural, con nombres genéricos, para ilustrar la forma sin diseñar ninguna regla legal específica — consistente con la restricción de alcance de este documento (§5).

**Caso 1 — la regla aplica:**

| Campo | Valor de ejemplo |
|---|---|
| Identificador de la regla | `EVID-EJ-001` |
| Versión | `1.0` |
| Descripción | "Verifica si el valor estructural del caso alcanza el umbral mínimo resuelto para la fecha de evaluación." |
| Estado | `aplica` |
| Motivo | "El valor del caso (42) alcanza el umbral mínimo requerido (40) para la fecha evaluada (2026-08-02)." |
| Datos usados | `{ valorCaso: 42 }` |
| Normas usadas | `['umbral-estructural-ejemplo-2026']` |
| Efecto o valor derivado | *(no aplica para esta regla — es puramente de elegibilidad)* |

**Caso 2 — la regla no es evaluable:**

| Campo | Valor de ejemplo |
|---|---|
| Identificador de la regla | `EVID-EJ-001` |
| Versión | `1.0` |
| Estado | `no evaluable` |
| Motivo | "No fue posible evaluar esta regla porque el expediente del usuario no incluye todavía el dato `valorCaso`." |
| Datos usados | `{ valorCaso: null }` |

Nótese que en el Caso 2 la regla no infiere ni asume un valor por defecto para `valorCaso` — declara explícitamente la ausencia del dato como la razón de no poder evaluarse. Esta es la aplicación más directa y más frecuente que este componente hará del Principio 4 en la práctica.

#### Estructura interna de una regla de evidencia

Para que cada regla individual sea mantenible y testeable de forma aislada —el mismo estándar que ya exige el Principio 2 para las fórmulas puras de `domain/formulas/`—, cada regla debe separar dos aspectos:

| Aspecto | Contenido | Precedente en el proyecto |
|---|---|---|
| **Metadata declarativa** | Identificador, versión, descripción, categoría o dominio al que pertenece (ej. una agrupación temática, sin diseñar aquí ningún catálogo real) | Mismo patrón que `domain/formulas/formulaMeta.js` separa metadata de la lógica de cálculo |
| **Función de evaluación** | Una función pura: `(datosResueltos) → ResultadoDeRegla`, sin fechas del sistema, sin acceso a archivos ni a red, sin conocer otras reglas | Mismo estándar que exige el Principio 2 para `domain/formulas/` |

Esta separación es lo que permite que cada regla se pruebe con casos de entrada fijos y salida esperada, de la misma manera que `formulaRPM.test.js` y `formulaRAIS.test.js` ya prueban las fórmulas puras contra casos numéricos de referencia documentados.

#### De qué componentes depende

De los Resolvers (§6.1), exclusivamente para valores normativos y de supuestos ya resueltos. De los datos del caso ya capturados, que en la arquitectura actual del proyecto viven en `UserProfile` y, a futuro, en el Expediente Pensional — una fuente de datos, no un componente de esta arquitectura. No depende de ningún otro componente del Motor de Decisión.

#### Qué componentes dependen de él

El **Constructor de Estrategias** (§6.3) es el único consumidor directo del Conjunto de Evidencia. **Explicabilidad** (§6.6) y **Trazabilidad** (§6.7) dependen de él de forma transversal, no secuencial: cada resultado de regla debe llevar ya la información mínima (motivo, datos usados, referencias) que esas dos capas necesitan para actuar — el Motor de Evidencias no les entrega un mensaje aparte, ellas leen directamente del Conjunto de Evidencia que él produce.

#### Qué nunca debe hacer

- Nunca decide, recomienda, ordena ni descarta estrategias — esa responsabilidad pertenece exclusivamente al Constructor de Estrategias (§6.3).
- Nunca conoce ni consulta `PerfilDecision` — primera consecuencia del Principio rector (§3).
- Nunca resuelve directamente contra `data/legal` o `data/assumptions` — esa es responsabilidad exclusiva de los Resolvers (§6.1); duplicarla sería repetir el mismo error que Sprint 2 ya corrigió en `Explanation.js`.
- Nunca calla un resultado por falta de datos — debe declarar explícitamente el estado `no evaluable`, nunca omitir la regla ni asumir un valor por defecto sin decirlo (Principio 4).
- Nunca permite que una regla individual conozca o invoque a otra — el desacople entre reglas es responsabilidad del diseño del Motor como orquestador, no una convención que cada regla deba respetar por su cuenta.
- Nunca tiene efectos secundarios ni depende de estado externo mutable — cada regla es una función pura (Principio 2, extendido).
- Nunca presenta un hecho derivado de una proyección RAIS con el mismo nivel de certeza que un hecho derivado de un valor ya consolidado bajo RPM — el estado y el motivo de la regla deben reflejar esa diferencia de certeza cuando corresponda (Principio 7, extendido).

#### Relación con los Principios de Arquitectura

- **Principio 1**: cada resultado de regla distingue explícitamente sus normas usadas de sus supuestos usados — nunca los funde en una sola referencia.
- **Principio 2** (extendido): cada regla es una función pura, sin conocer fechas del sistema, archivos ni red más allá de lo que recibe como entrada ya resuelta.
- **Principio 3**: cada resultado de regla es trazable hasta las normas, supuestos y datos que lo originaron — nunca un hecho "porque sí".
- **Principio 4**: el estado `no evaluable` es la materialización directa de este principio dentro del Motor de Evidencias.
- **Principio 5**: cuando una regla depende de un supuesto de modelado (no de una norma obligatoria), su motivo debe dejarlo dicho — un hecho basado en un supuesto declarado no es lo mismo que un hecho basado en una norma firme, y esa diferencia de certeza no puede quedar oculta.
- **Principio 6**: la versión de cada regla queda registrada en cada resultado, de forma que una `Simulation` pasada siga siendo explicable exactamente como se produjo, aunque la regla cambie de versión después.
- **Principio 7**: se extiende explícitamente a hechos derivados de proyecciones RAIS (ver "Qué nunca debe hacer").
- **Principio 9**: cada regla que se incorpore al Motor de Evidencias debe responder a un caso real del sistema pensional, no a una generalización anticipada de un caso hipotético — mismo criterio que ya rige la incorporación de nuevas entradas a `data/legal`.

#### Referencia rápida — Motor de Evidencias

| | |
|---|---|
| **Consume** | Valores ya resueltos de los Resolvers + datos del caso ya conocidos — nunca `PerfilDecision` |
| **Produce** | Conjunto de Evidencia: hechos con estado aplica / no aplica / no evaluable, cada uno con motivo y trazabilidad |
| **Nunca hace** | No decide ni recomienda estrategias, no resuelve contra `data/legal` o `data/assumptions`, no calla por falta de datos, no acopla reglas entre sí |

### 6.3 Constructor de Estrategias

Es el primer componente de esta arquitectura que conoce a la persona, no solo el caso. Todos los componentes anteriores —Resolvers, Motor de Evidencias— operan sobre hechos: fechas, normas, supuestos, condiciones cumplidas o no. El Constructor de Estrategias es donde, por primera vez, lo que la persona ha declarado que le importa (`PerfilDecision`) entra al proceso — y es, por eso mismo, el componente donde el Principio rector (§3) exige más disciplina en su segunda y tercera consecuencia: las preferencias del usuario nunca alteran los hechos, solo el orden y el filtro; y ninguna comparación —tampoco este ensamblaje previo a ella— colapsa en una única salida obligatoria.

#### Qué hace

Ensambla un **conjunto de estrategias** — combinaciones concretas y viables de decisiones posibles para el caso (ej., en términos estructurales, "una combinación de régimen, momento y condición determinada") — a partir de dos entradas: el Conjunto de Evidencia producido por el Motor de Evidencias (§6.2), y el `PerfilDecision` vigente del Expediente. Cada estrategia queda respaldada, de forma trazable, por los hechos concretos de evidencia que la sustentan — nunca se construye una estrategia que no pueda señalar qué evidencia la hace viable.

El Constructor cumple dos funciones distintas con las dos partes de `PerfilDecision`, y esta arquitectura exige que no se confundan entre sí:

- **Restricciones → filtran.** Una restricción es una condición obligatoria (ver `PerfilDecision.js`, Sprint 2: "condiciones obligatorias que una estrategia no debe incumplir"). Si una estrategia candidata viola una restricción, **no se incluye** en el conjunto final de estrategias viables — pero, y esto es una decisión de diseño explícita de este documento, **tampoco se descarta en silencio**: se registra como estrategia excluida, con el motivo exacto de su exclusión (ver "Qué produce", más abajo). Callar por qué una estrategia no aparece sería una violación directa del Principio 4, aplicada aquí por primera vez a nivel de estrategias y no solo de datos faltantes.
- **Preferencias y prioridades → ordenan o etiquetan, nunca descartan.** Una preferencia es deseable pero negociable; una prioridad establece el orden de importancia entre criterios (`PerfilDecision.js`: "el orden del arreglo representa su orden de importancia"). El Constructor puede usarlas para ordenar el conjunto de estrategias viables o para etiquetarlas (ej. "alineada con tu prioridad de mayor peso"), pero nunca para eliminar una estrategia del conjunto. Una estrategia que no coincide con ninguna preferencia sigue siendo una estrategia viable — solo queda ordenada de forma distinta.

#### Diagrama de ensamblaje

```
   Conjunto de Evidencia (§6.2)              PerfilDecision (existente, Sprint 2)
            │                                    │
            │                        ┌───────────┴───────────┐
            │                        │                        │
            │                 restricciones          preferencias / prioridades
            │                        │                        │
            ▼                        ▼                        │
   ┌─────────────────────────────────────────┐                │
   │        Constructor de Estrategias         │                │
   │                                            │                │
   │  1. Ensambla estrategias candidatas        │                │
   │     a partir de la evidencia                │                │
   │  2. Excluye las que violan una restricción  │◀───────────────┘
   │     (con motivo registrado, no en silencio) │
   │  3. Ordena / etiqueta las viables según      │◀── preferencias / prioridades
   │     preferencias y prioridades               │    (nunca descartan)
   └──────────────────────┬─────────────────────┘
                           │
                           ▼
        Conjunto de Estrategias (viables, ordenadas,
        + registro de las excluidas con motivo)
                           │
                           ▼
              Comparador de Estrategias (§6.4)
```

#### Qué consume

- El **Conjunto de Evidencia** completo del Motor de Evidencias (§6.2) — nunca solo un subconjunto elegido de antemano; el Constructor debe poder considerar toda la evidencia disponible, incluida la que indica "no evaluable", para decidir si una estrategia puede siquiera considerarse candidata.
- El **`PerfilDecision`** vigente del Expediente — objetivo principal, restricciones, preferencias, prioridades y horizonte temporal, si está definido.

#### Qué produce

Un **Conjunto de Estrategias**, con la siguiente forma conceptual:

| Campo conceptual | Contenido | Obligatoriedad |
|---|---|---|
| Identificador de la estrategia | Id único dentro del conjunto | Obligatorio |
| Descripción | Qué representa la estrategia, en lenguaje humano | Obligatorio |
| Evidencia de soporte | Referencias a los resultados concretos del Motor de Evidencias que sustentan esta estrategia | Obligatorio |
| Estado | `viable` / `excluida` | Obligatorio |
| Motivo de exclusión | Qué restricción específica se incumple, si el estado es `excluida` | Obligatorio si `excluida` |
| Etiquetas de alineación | Relación de la estrategia con las preferencias/prioridades declaradas, si el estado es `viable` | Opcional |

**Precisión importante de diseño**: el conjunto producido incluye tanto las estrategias viables como las excluidas. Esto es deliberado, y se explica en la Filosofía (§0): *"PensionLab explica cada estrategia. Cada alternativa —incluidas las que no aplican o no se recomiendan— tiene una razón visible."* Una estrategia excluida por una restricción sigue siendo información legítima para el usuario, especialmente si esa restricción fue una elección suya que podría reconsiderar.

#### Ejemplo estructural (ilustrativo, sin reglas legales reales)

Continuando el ejemplo estructural iniciado en §6.2 (regla `EVID-EJ-001`), con un `PerfilDecision` de ejemplo también estructural:

**`PerfilDecision` de ejemplo:**
- Objetivo principal: `{ tipo: 'objetivoEstructuralEjemplo', descripcion: 'Ejemplo ilustrativo de objetivo declarado por el usuario' }`
- Restricciones: `['No considerar estrategias que impliquen la condición estructural Z']`
- Prioridades: `['criterioEjemploA', 'criterioEjemploB']` (en ese orden de importancia)

**Conjunto de Estrategias resultante:**

| Id | Descripción | Evidencia de soporte | Estado | Motivo de exclusión | Etiquetas |
|---|---|---|---|---|---|
| `EST-EJ-001` | "Estrategia estructural A, construida sobre la evidencia de `EVID-EJ-001` (aplica)" | `EVID-EJ-001` | `viable` | — | "Alineada con `criterioEjemploA`" |
| `EST-EJ-002` | "Estrategia estructural B, que implicaría la condición Z" | `EVID-EJ-001` | `excluida` | "Incumple la restricción: 'No considerar estrategias que impliquen la condición estructural Z'" | — |

#### De qué componentes depende

Del Motor de Evidencias (§6.2), exclusivamente para el Conjunto de Evidencia. Del contrato `PerfilDecision` ya existente (Sprint 2), como fuente externa de restricciones, preferencias y prioridades — el Constructor no modifica ni reinterpreta ese contrato, solo lo consume tal como está definido en `src/models/PerfilDecision.js`.

#### Qué componentes dependen de él

El **Comparador de Estrategias** (§6.4) es el único consumidor directo del Conjunto de Estrategias. **Explicabilidad** y **Trazabilidad** dependen de él transversalmente, igual que del Motor de Evidencias.

#### Qué nunca debe hacer

- Nunca modifica ni reinterpreta la evidencia recibida — si el Motor de Evidencias indicó `no evaluable`, el Constructor no puede tratarlo como `no aplica` por conveniencia de ensamblaje.
- Nunca reduce el conjunto a una sola estrategia — producir una sola estrategia "porque es la mejor" sería, de hecho, tomar la decisión que el Principio rector reserva exclusivamente al usuario.
- Nunca compara estrategias entre sí — puede ordenarlas o etiquetarlas según `PerfilDecision`, pero no puede señalar cuál es "mejor" de forma relativa; esa es la responsabilidad exclusiva del Comparador (§6.4), que además hace esa comparación de forma visible al usuario, no implícita en un orden interno.
- Nunca descarta una estrategia excluida sin registrar el motivo — la exclusión silenciosa viola el Principio 4 aplicada a este nivel.
- Nunca deduce preferencias no declaradas — si `PerfilDecision` no define una prioridad para cierto criterio, el Constructor no debe inventar una jerarquía implícita; simplemente no ordena por ese criterio.

#### Relación con los Principios de Arquitectura

- **Principio 4** (extendido a nivel de estrategias): ninguna estrategia se descarta en silencio.
- **Principio 5**: toda estrategia debe declarar las limitaciones de la evidencia que la sustenta (ej. si depende de un hecho basado en un supuesto de modelado, no en una norma firme).
- **Principio 9**: el conjunto de restricciones/preferencias/prioridades que el Constructor sabe interpretar debe corresponder a tipos ya definidos y evidenciados en `PerfilDecision`, no a estructuras hipotéticas anticipadas sin caso real.

#### Referencia rápida — Constructor de Estrategias

| | |
|---|---|
| **Consume** | Conjunto de Evidencia (Motor de Evidencias) + `PerfilDecision` vigente (restricciones, preferencias, prioridades) |
| **Produce** | Conjunto de Estrategias: viables (ordenadas/etiquetadas) y excluidas (con motivo) |
| **Nunca hace** | No decide una única estrategia, no compara, no modifica evidencia, no descarta en silencio |

### 6.4 Comparador de Estrategias

#### Nota de desambiguación, antes de cualquier otra cosa

`expediente-pensional.md` ya documenta una capacidad llamada **"Comparación"** — la capacidad del Expediente Pensional de contrastar distintas `Simulation` realizadas en momentos distintos, con atribución obligatoria de la diferencia a su fuente (Persona/Historia, Perfil de Decisión, Contexto legal, Supuestos, fecha, o escenarios). El **Comparador de Estrategias** descrito aquí es un componente **distinto**, que compara estrategias **dentro de una misma evaluación**, en un mismo momento, bajo un mismo Contexto de Evaluación.

| | Comparación (Expediente, Sprint 2) | Comparador de Estrategias (este documento) |
|---|---|---|
| Qué compara | `Simulation` distintas, en momentos distintos | Estrategias dentro de un mismo Conjunto de Estrategias |
| Cuándo opera | Entre ejecuciones separadas del sistema | Dentro de una misma evaluación |
| Atribución exigida | Por fuente del cambio (obligatoria desde su primera versión) | Por diferencia entre estrategias (evidencia de soporte distinta) |
| Estado de diseño | Contrato mínimo definido, cuantificación diferida | Este documento (marco conceptual; cuantificación también diferida, ver §9) |

Ambos componentes deberán, en algún momento posterior a este documento, declarar explícitamente si comparten mecanismo interno o si permanecen completamente independientes — esa decisión **no se toma aquí** y queda registrada como pendiente en §10.

#### Qué hace

Presenta el Conjunto de Estrategias recibido del Constructor —tanto las viables como las excluidas— una junto a otra, haciendo visibles sus diferencias: qué evidencia las sustenta, qué certeza tiene cada una (ej. si depende de una proyección RAIS o de un valor legal ya consolidado), qué limitaciones declara cada una, y por qué las excluidas quedaron fuera. No produce una estrategia "ganadora" — produce una presentación que hace posible que el usuario, o la Brújula Pensional en su función de orientación (§6.5), distingan entre las opciones sin que ninguna quede oculta o disminuida artificialmente.

#### Diagrama de comparación

```
      Conjunto de Estrategias (§6.3)
      (viables + excluidas, ya ordenadas/etiquetadas)
                    │
                    ▼
      ┌─────────────────────────────────────┐
      │       Comparador de Estrategias        │
      │                                        │
      │  Por cada par o conjunto de estrategias:│
      │   - Diferencias de evidencia de soporte │
      │   - Diferencias de certeza (RPM vs. RAIS│
      │     proyectado, norma vs. supuesto)     │
      │   - Limitaciones declaradas de cada una │
      │   - Motivo de exclusión (si aplica)     │
      │                                        │
      │  Nunca: elige una, oculta otra,          │
      │  o promedia certezas distintas           │
      └───────────────────┬────────────────────┘
                           │
                           ▼
           Presentación comparativa completa
                           │
                           ▼
              Brújula Pensional (§6.5)
```

#### Qué consume

Exclusivamente el Conjunto de Estrategias producido por el Constructor (§6.3). No reconsulta `PerfilDecision` ni el Conjunto de Evidencia directamente — todo lo que necesita para comparar (evidencia de soporte, etiquetas de alineación, motivos de exclusión) ya viene incluido en lo que el Constructor le entrega. Esta restricción preserva el desacople establecido en el diagrama general (§4): si el Comparador necesitara volver a consultar `PerfilDecision` para comparar, estaría duplicando una lógica que ya pertenece al Constructor, con el riesgo de que ambos componentes interpreten las preferencias del usuario de forma inconsistente entre sí.

#### Qué produce

Una **presentación comparativa** de las estrategias — no un valor numérico único de "cuál es mejor". La forma exacta y cuantitativa de esta comparación (ej. cómo se pondera una diferencia de certeza contra una diferencia de alineación con prioridades) permanece explícitamente diferida (§9, §10), siguiendo el Principio 9: no existe todavía un segundo caso real que valide una fórmula de ponderación, y el proyecto ya demostró, con la capacidad "Comparación" de Sprint 2, que prefiere exigir la identificación de la fuente de una diferencia antes que cuantificarla sin evidencia suficiente.

#### Ejemplo estructural (ilustrativo, sin reglas legales reales)

Continuando el ejemplo estructural: el Comparador recibe `EST-EJ-001` (viable) y `EST-EJ-002` (excluida) del Constructor, y produce una presentación como la siguiente:

| Estrategia | Estado | Evidencia de soporte | Certeza declarada | Motivo (si excluida) |
|---|---|---|---|---|
| `EST-EJ-001` | Viable | `EVID-EJ-001` (aplica) | Alta — basada en un valor ya consolidado, no en una proyección | — |
| `EST-EJ-002` | Excluida | `EVID-EJ-001` (aplica) | — | Incumple la restricción declarada por el usuario sobre la condición estructural Z |

#### De qué componentes depende

Del Constructor de Estrategias (§6.3), exclusivamente.

#### Qué componentes dependen de él

La **Brújula Pensional** (§6.5) es el único consumidor directo de su presentación comparativa. **Explicabilidad** y **Trazabilidad** dependen de él transversalmente.

#### Qué nunca debe hacer

- Nunca produce una única estrategia "ganadora" implícita — ni siquiera mediante un orden que sugiera preferencia sin declararlo explícitamente como tal.
- Nunca oculta ni atenúa la incertidumbre de una estrategia para hacerla parecer comparable en certeza a otra que no lo es (Principio 7, extendido).
- Nunca excluye una estrategia que el Constructor ya incluyó como viable, ni oculta una estrategia excluida — ambas deben permanecer visibles en la comparación.
- Nunca reconsulta `PerfilDecision` ni el Conjunto de Evidencia directamente.
- Nunca mezcla, en una misma cifra o etiqueta comparativa, un hecho basado en norma con uno basado en supuesto sin distinguirlos (Principio 1).

#### Relación con los Principios de Arquitectura

- **Principio 5**: toda comparación debe mostrar las limitaciones de cada estrategia comparada, no solo sus fortalezas relativas.
- **Principio 7** (extendido): es, junto con la Brújula Pensional, el componente donde este principio tiene mayor riesgo de erosionarse si no se aplica con rigor — comparar una estrategia RAIS proyectada junto a una RPM consolidada exige mantener visible la diferencia de certeza, nunca presentarlas en pie de igualdad implícita.
- **Principio 9**: la cuantificación exacta de la comparación permanece diferida por este mismo principio (ver §9, §10).

#### Referencia rápida — Comparador de Estrategias

| | |
|---|---|
| **Consume** | Conjunto de Estrategias (viables + excluidas) del Constructor — nada más |
| **Produce** | Presentación comparativa: diferencias de evidencia, certeza y limitaciones entre estrategias |
| **Nunca hace** | No elige una estrategia, no oculta incertidumbre, no excluye lo que el Constructor incluyó, no reconsulta `PerfilDecision` |

### 6.5 Brújula Pensional

Esta sección requiere una advertencia previa, coherente con la instrucción de no completar vacíos con supuestos: la Brújula Pensional es, de los siete componentes de esta arquitectura, el único cuyo diseño detallado se mantiene **deliberadamente diferido** (§5, "No incluye"). Lo que sigue es su marco conceptual — su rol, sus límites, y por qué no se diseña más allá de eso en esta versión — no su contrato ni su mecanismo interno.

#### Qué es

La capa final del Motor de Decisión: la que toma la presentación comparativa ya producida por el Comparador de Estrategias (§6.4) y ayuda al usuario a orientarse dentro de ella. Su nombre no es casual — una brújula señala dirección sin caminar por la persona. Aplicado a esta arquitectura: la Brújula Pensional puede resaltar qué estrategia está más alineada con lo que el usuario ya declaró que le importa, pero no puede caminar esa estrategia por él, ni hacer que las demás desaparezcan del mapa.

Ya está nombrada y reservada desde Sprint 2, en `expediente-pensional.md`, como "el producto final del sistema... marcador reservado dentro de Resultados, sin contrato propio" — con el mismo tratamiento que recibió el cálculo de IBL en Sprint 1: "ubicado, no diseñado". Este documento mantiene esa decisión. La diferencia es que ahora tiene un lugar preciso en una arquitectura de siete componentes, en vez de ser solo un nombre reservado sin vecinos definidos.

#### Qué NO es — tan importante como lo que es

- **No es un motor de recomendación.** No calcula una puntuación que determine una estrategia superior a las demás.
- **No es un ranking cerrado.** Puede reforzar o hacer más visible el orden que el Constructor de Estrategias ya estableció según las prioridades declaradas (§6.3) — no crea un orden nuevo con criterios propios no declarados por el usuario.
- **No es el paso final del flujo de datos en el sentido de "la respuesta".** Es el paso final en el sentido de "la última capa de acompañamiento antes de que la persona decida" — la decisión misma ocurre fuera de esta arquitectura, en la persona.

#### Una hipótesis de diseño, explícitamente no comprometida

Una posibilidad conceptual, coherente con el resto de esta arquitectura, es que la Brújula Pensional no necesite calcular nada nuevo: toda la información que podría usar para orientar —evidencia de soporte, etiquetas de alineación con prioridades, diferencias señaladas por el Comparador— ya existe en lo que los componentes anteriores produjeron. Bajo esa hipótesis, la Brújula sería principalmente una capa de **énfasis y presentación**, no de cálculo. Se registra aquí como una hipótesis razonable, **no como una decisión tomada** — no existe todavía un segundo caso real (Principio 9) que confirme que esta es la forma correcta, y comprometerse a ella ahora sería exactamente el tipo de falsa precisión que este documento se propuso evitar desde §0.

#### Ejemplo estructural, acotado a lo que sí se puede afirmar

Continuando el ejemplo estructural: si la Brújula Pensional operara bajo la hipótesis anterior, su salida para el conjunto ya comparado (`EST-EJ-001` viable, `EST-EJ-002` excluida) podría consistir en resaltar que `EST-EJ-001` está alineada con `criterioEjemploA` (la prioridad de mayor peso declarada) — una afirmación que ya estaba disponible desde el Constructor (§6.3), simplemente hecha más prominente en la presentación final. Ninguna estrategia deja de mostrarse; ninguna cifra nueva se introduce.

#### De qué componentes depende

Del Comparador de Estrategias (§6.4), exclusivamente. No tiene acceso directo al Conjunto de Evidencia ni al Conjunto de Estrategias sin comparar — solo puede operar sobre lo que ya fue comparado y presentado con sus diferencias visibles.

#### Qué componentes dependen de él

Ninguno dentro de esta arquitectura. Es el último componente de la secuencia (§4). Su salida es lo que finalmente llega a la persona, a través de la capa de presentación de la aplicación — que está fuera del alcance de este documento de arquitectura de dominio.

#### Qué nunca debe hacer

- Nunca elimina del conjunto ninguna estrategia que el Comparador haya presentado.
- Nunca se presenta como "la respuesta" ni como una recomendación única y cerrada — cuarta consecuencia del Principio rector (§3).
- Nunca opera sin que el Comparador haya actuado primero — no tiene acceso a estrategias sin comparar.
- Nunca introduce un criterio de orientación que no provenga de algo ya declarado por el usuario (`PerfilDecision`) o ya señalado por el Comparador — no debe inventar una noción propia de "lo mejor".

#### Relación con los Principios de Arquitectura

- **Principio 5**: cualquier orientación que ofrezca debe venir acompañada de las mismas limitaciones ya declaradas por las estrategias que señala — orientar hacia una estrategia no puede significar callar sus limitaciones.
- **Principio 7** (extendido): si la orientación favorece una estrategia basada en una proyección RAIS, debe mantener visible que se trata de una proyección, no de un resultado consolidado.
- **Principio 9**: es el principio que gobierna esta sección completa — su diseño detallado permanece diferido hasta que exista un segundo caso real que valide su forma, exactamente como ya ocurrió con el Motor de Reglas antes de este documento, y con el cálculo de IBL en Sprint 1.

#### Referencia rápida — Brújula Pensional

| | |
|---|---|
| **Consume** | Presentación comparativa del Comparador de Estrategias — nada más |
| **Produce** | Orientación o énfasis relativo entre estrategias ya comparadas (forma exacta diferida, Principio 9) |
| **Nunca hace** | No elimina estrategias, no se presenta como respuesta única, no opera sin comparación previa, no introduce criterios no declarados |

### 6.6 Explicabilidad

A diferencia de los cinco componentes anteriores, Explicabilidad no ocupa una posición en la secuencia del Motor de Decisión — es una capa transversal, tal como ya se estableció en el diagrama general (§4). No tiene un único predecesor ni un único sucesor: lee de los cinco componentes en secuencia, y no entrega su resultado a ningún componente posterior del Motor de Decisión, sino a la capa de presentación de la aplicación, fuera del alcance de este documento.

#### Qué hace

Traduce lo que cada uno de los cinco componentes en secuencia ya produjo —evidencia, estrategias, comparación, orientación— a lenguaje legible para una persona sin formación técnica ni jurídica, sin volver a resolver, calcular o inferir nada por su cuenta. Es la extensión directa, a los cinco componentes de esta arquitectura, del patrón ya validado en Sprint 1 y reforzado en Sprint 2: `Explanation` se construye a partir de `CalculationTrace` y de `contextoEvaluacionUtilizado`, "sin volver a resolver nada directamente contra `data/legal` ni `data/assumptions`" (`Explanation.js`, comentario de responsabilidad). Explicabilidad, en este documento, generaliza ese mismo compromiso a evidencia, estrategias, comparación y orientación.

`Explanation.gradoEstimacion` (reservado desde Sprint 2, todavía sin poblar por ningún código) es el campo concreto donde Explicabilidad debe expresar esta confianza. Su contenido, cuando se implemente, debe poblarse a partir de los **Niveles de madurez de la información pensional** registrados en `expediente-pensional.md` (Bloque 2) — no como un juicio ad-hoc por cálculo. Ese mismo registro deja abierta, sin resolver todavía, si esa numeración interna (Nivel 1-4) debe traducirse a un concepto orientado a la experiencia antes de llegar a la interfaz — decisión que pertenece al diseño de Explicabilidad hacia el usuario, no a este documento.

#### Diagrama de la capa transversal

```
   Resolvers   Motor de      Constructor de   Comparador de    Brújula
              Evidencias     Estrategias      Estrategias      Pensional
      │            │               │                │              │
      │            ▼               ▼                ▼              ▼
      │      ┌──────────────────────────────────────────────────────────┐
      │      │                    Explicabilidad                         │
      │      │                                                            │
      │      │  Lee de cada componente lo que YA produjo:                 │
      │      │   - motivo de cada evidencia (§6.2)                        │
      │      │   - motivo de inclusión/exclusión de cada estrategia (§6.3)│
      │      │   - diferencias señaladas por la comparación (§6.4)        │
      │      │   - énfasis de la orientación (§6.5)                       │
      │      │                                                            │
      │      │  Nunca resuelve, calcula ni infiere nada nuevo             │
      │      └──────────────────────────────┬───────────────────────────┘
      │                                      │
      │                                      ▼
      │                        Presentación legible para el usuario
      │                        (fuera del alcance de este documento)
```

#### Qué consume

El resultado ya producido por cada uno de los cinco componentes en secuencia: el motivo y las referencias de cada resultado de evidencia (§6.2), el motivo de inclusión o exclusión de cada estrategia (§6.3), las diferencias señaladas por el Comparador (§6.4), y el énfasis de la Brújula (§6.5). No consume datos crudos de `UserProfile`, de `data/legal` ni de `data/assumptions` — todo lo que necesita ya fue resuelto, evaluado y registrado por los componentes que preceden a esta capa.

#### Qué produce

Explicaciones legibles correspondientes a cada nivel de la arquitectura — no un único texto final, sino una explicación por cada resultado que la genera: por qué una evidencia aplica, no aplica, o no fue evaluable; por qué una estrategia fue incluida o excluida; qué diferencias existen entre estrategias comparadas; por qué la orientación favorece una dirección. La siguiente tabla ilustra, de forma estructural, cómo se encadenan estas explicaciones para un mismo caso:

| Nivel | Fuente del contenido | Ejemplo estructural de explicación |
|---|---|---|
| Evidencia | Motivo de `EVID-EJ-001` (§6.2) | "El valor del caso (42) alcanza el umbral mínimo requerido (40) para la fecha evaluada." |
| Estrategia | Motivo de inclusión/exclusión de `EST-EJ-001`/`EST-EJ-002` (§6.3) | "`EST-EJ-002` no se incluye porque implica la condición estructural Z, que declaraste como restricción." |
| Comparación | Diferencias señaladas por el Comparador (§6.4) | "`EST-EJ-001` se basa en un valor ya consolidado; no depende de una proyección." |
| Orientación | Énfasis de la Brújula (§6.5) | "`EST-EJ-001` está más alineada con la prioridad que declaraste en primer lugar." |

Nótese que cada explicación de este ejemplo estructural es trazable, sin excepción, a un dato que un componente anterior ya registró — Explicabilidad no agrega ninguna afirmación que no provenga de ese registro.

#### De qué componentes depende

De los cinco componentes en secuencia (§6.1-§6.5) — no de forma jerárquica única, sino leyendo de cada uno lo que corresponde a su nivel.

#### Qué componentes dependen de él

Ninguno dentro del Motor de Decisión. Su salida se dirige a la capa de presentación de la aplicación (fuera de este documento), que es, en la arquitectura actual del proyecto, el mismo lugar al que hoy llega `Explanation` para un cálculo individual.

#### Qué nunca debe hacer

- Nunca resuelve ni reinterpreta datos por su cuenta — su única función es traducir lo que otro componente ya produjo a lenguaje legible.
- Nunca omite la explicación de un resultado negativo, de una estrategia descartada, o de una evidencia no evaluable — explicar solo lo positivo sería una forma de ocultar información, contraria al Principio 5.
- Nunca construye una explicación que no pueda señalar exactamente de qué registro proviene.

#### Relación con los Principios de Arquitectura

- **Principio 1**: cualquier explicación que involucre normas y supuestos debe mantenerlos identificables por separado, nunca fundidos en una sola frase ambigua sobre "la regla".
- **Principio 3**: es, junto con Trazabilidad (§6.7), la aplicación más directa de este principio en toda la arquitectura — todo resultado explicado debe ser rastreable hasta su origen.
- **Principio 5**: exige explicar también lo que no aplica, lo que se descartó, y las limitaciones de lo que sí se muestra.

#### Referencia rápida — Explicabilidad

| | |
|---|---|
| **Consume** | El resultado ya producido por cada uno de los cinco componentes en secuencia (§6.1-§6.5) |
| **Produce** | Explicaciones legibles por nivel: evidencia, estrategia, comparación, orientación |
| **Nunca hace** | No resuelve ni calcula nada nuevo, no omite explicaciones de resultados negativos o descartados |

### 6.7 Trazabilidad

Es la segunda capa transversal, y su relación con Explicabilidad (§6.6) merece precisarse antes de describirla por separado: Trazabilidad es el **registro persistente y crudo** de lo que cada componente produjo; Explicabilidad es la **traducción legible** de ese mismo registro. Esta es exactamente la separación que ya existe, validada, entre `CalculationTrace` (registro crudo) y `Explanation` (traducción legible) para un cálculo individual — este documento la extiende de "un cálculo" a los cuatro niveles del Motor de Decisión: evidencia, estrategia, comparación y orientación.

Una precisión que no quedó explícita en §6.6 y que corresponde fijar aquí: cuando se dijo que Explicabilidad "lee de cada componente lo que ya produjo", esa lectura ocurre, en la práctica, sobre el registro que Trazabilidad establece — no sobre una señal transitoria de la evaluación en curso. Es la misma relación que ya rige hoy entre `Explanation` y `CalculationTrace`: `explainCalculation.js` no se conecta al cálculo mientras ocurre, se construye después, a partir de lo que `CalculationTrace` dejó registrado. Trazabilidad es, en ese sentido, el componente que hace posible que Explicabilidad exista como una traducción fiel y no como una reconstrucción aproximada.

#### Qué hace

Registra, para cada evidencia, cada estrategia, cada comparación y cada orientación producida por el Motor de Decisión, qué datos, qué versión de regla, y qué `ContextoEvaluacion` se usaron — de forma que cualquier resultado del Motor de Decisión siga siendo reconstruible exactamente como se produjo, aunque las reglas del Motor de Evidencias, las condiciones del Constructor, o los criterios del Comparador cambien de versión después. Es la aplicación directa del Principio 6 (snapshot inmutable y reproducible en el tiempo) a los cuatro niveles de esta arquitectura, extendiendo el mismo compromiso que hoy sostiene `Simulation` respecto a `metadata.versionNormativa` y `metadata.versionSupuestos`.

#### Diagrama de la capa transversal

```
   Motor de       Constructor de   Comparador de    Brújula
   Evidencias     Estrategias      Estrategias      Pensional
      │                 │                │              │
      ▼                 ▼                ▼              ▼
   ┌──────────────────────────────────────────────────────────┐
   │                     Trazabilidad                           │
   │                                                              │
   │  Por cada resultado, registra:                               │
   │   - id + versión de la regla/criterio usado                  │
   │   - datos efectivamente consultados                          │
   │   - referencias a normas/supuestos (vía ContextoEvaluacion)  │
   │                                                              │
   │  Nunca se muta un registro ya asociado a una Simulation      │
   │  pasada — cada evaluación nueva genera su propio registro    │
   └────────────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
              Embebido de forma inmutable en Simulation
              (mismo criterio que ya aplica CalculationTrace)
                                 │
                                 ▼
                     Explicabilidad (§6.6) lee de aquí
```

#### Qué consume

El resultado de cada uno de los cinco componentes en secuencia (§6.1-§6.5): el id y la versión de cada regla de evidencia evaluada, los datos que efectivamente consultó, las referencias a `data/legal`/`data/assumptions` que usó (vía los valores ya resueltos por los Resolvers), el `PerfilDecision` efectivamente vigente al momento de construir el conjunto de estrategias, y los criterios que el Comparador y la Brújula aplicaron.

#### Qué produce

Un registro — conceptualmente análogo a `CalculationTrace`, pero extendido a los cuatro niveles de esta arquitectura, con nombre y contrato formal todavía por definir (ver §10) — con la siguiente forma mínima por nivel:

| Nivel | Contenido mínimo del registro |
|---|---|
| Evidencia | Id y versión de cada regla evaluada, datos usados, normas/supuestos referenciados, estado resultante |
| Estrategia | Referencias a la evidencia de soporte, `PerfilDecision` efectivamente vigente (embebido, no referenciado — mismo criterio que ya aplica `Simulation.perfilDecisionUtilizado`), motivo de inclusión/exclusión |
| Comparación | Referencias a las estrategias comparadas, criterios de diferenciación aplicados |
| Orientación | Referencia a la presentación comparativa usada como base, criterio de énfasis aplicado (si la Brújula llegara a implementarse bajo la hipótesis descrita en §6.5) |

**Sobre el `PerfilDecision` embebido en el registro de estrategia**: esta arquitectura hereda, sin modificarlo, el criterio ya establecido en Sprint 2 para `Simulation.perfilDecisionUtilizado` — el `PerfilDecision` efectivamente usado se conserva como copia completa e inmutable, nunca como una referencia que deba resolverse de nuevo. Si el `PerfilDecision` vigente del Expediente cambia después de una evaluación, el registro de esa evaluación pasada no cambia con él.

#### Ejemplo estructural (ilustrativo, sin reglas legales reales)

Continuando el ejemplo estructural: el registro de trazabilidad para la evidencia `EVID-EJ-001` conservaría, como mínimo, `{ reglaId: 'EVID-EJ-001', version: '1.0', datosUsados: { valorCaso: 42 }, normasUsadasIds: ['umbral-estructural-ejemplo-2026'] }`. El registro de la estrategia `EST-EJ-001` conservaría la referencia a ese mismo id de evidencia, más una copia completa del `PerfilDecision` de ejemplo usado (objetivo, restricciones, prioridades) tal como estaba vigente en el momento de construir el conjunto — no una referencia a "el `PerfilDecision` actual del Expediente", que podría haber cambiado para cuando alguien audite esa evaluación después.

#### De qué componentes depende

De los cinco componentes en secuencia (§6.1-§6.5), igual que Explicabilidad — leyendo de cada uno lo que corresponde registrar en su nivel.

#### Qué componentes dependen de él

Explicabilidad (§6.6) depende de su registro para construir cualquier traducción legible, según la precisión hecha al inicio de esta sección. Fuera del Motor de Decisión, `Simulation` depende de él para embeber, de forma aditiva, la evidencia usada en cada evaluación pasada — de la misma manera en que hoy ya embebe `CalculationTrace` dentro de cada `PensionCalculationResult`.

#### Qué nunca debe hacer

- Nunca permite que un resultado —evidencia, estrategia, comparación u orientación— exista sin su registro correspondiente. Un resultado sin trazabilidad no es un resultado válido dentro de esta arquitectura.
- Nunca muta o sobrescribe un registro ya asociado a una `Simulation` pasada — cada evaluación nueva genera su propio registro, inmutable desde el momento en que se produce (Principio 6).
- Nunca resume o pierde granularidad de forma silenciosa — si diez reglas de evidencia se evaluaron para un caso, el registro conserva las diez, no solo las que resultaron `aplica`. Omitir las que no aplicaron o no fueron evaluables ocultaría información que el Principio 4 exige mantener visible.
- Nunca almacena una referencia donde debería almacenar una copia — mismo criterio ya establecido para `ContextoEvaluacion` y `PerfilDecision` dentro de `Simulation`: lo que se usó se conserva completo, no como un puntero que deba resolverse de nuevo para reconstruir el pasado.

#### Relación con los Principios de Arquitectura

- **Principio 3**: es, junto con Explicabilidad, la aplicación más directa de este principio en toda la arquitectura.
- **Principio 6**: es el componente que hace cumplible este principio a nivel de evidencia y estrategias, no solo de cálculos — sin Trazabilidad, una `Simulation` sería reproducible en su resultado numérico pero no en el razonamiento que produjo sus estrategias.
- **Principio 1**: el registro debe preservar, en cada nivel, la distinción entre lo que proviene de una norma y lo que proviene de un supuesto — nunca fusionarlos en una sola referencia genérica.

#### Referencia rápida — Trazabilidad

| | |
|---|---|
| **Consume** | El resultado de los cinco componentes en secuencia: ids, versiones, datos usados, referencias normativas y `PerfilDecision` efectivamente vigente |
| **Produce** | Registro inmutable por nivel (evidencia, estrategia, comparación, orientación), embebible en `Simulation` |
| **Nunca hace** | No deja resultados sin registro, no muta registros pasados, no resume perdiendo granularidad, no almacena referencias donde corresponde copia |

## 7. Flujo de datos

Esta sección ilustra, mediante un caso estructural único y continuo —sin ninguna regla legal o pensional real—, cómo los siete componentes de esta arquitectura operan juntos de punta a punta. El caso retoma y completa el ejemplo usado a lo largo de §6: la regla de evidencia `EVID-EJ-001`, las estrategias `EST-EJ-001` y `EST-EJ-002`, y su comparación y orientación resultantes.

### Secuencia completa

```
Actor          Componente              Acción
─────          ──────────              ──────
Resolvers      Resolver Legal          Resuelve 'umbral-estructural-ejemplo-2026'
                                        para la fecha del caso → valor: 40

Motor de       Regla EVID-EJ-001       Recibe valorCaso=42 (dato del Expediente)
Evidencias                             + umbral=40 (ya resuelto)
                                        → evalúa: 42 ≥ 40
                                        → estado: 'aplica'
                                        → registra motivo + normasUsadasIds

               Motor de Evidencias     Agrega el resultado de EVID-EJ-001 (y de
               (orquestador)           cualquier otra regla evaluada) en el
                                        Conjunto de Evidencia — sin resumir

Constructor    Constructor de          Recibe Conjunto de Evidencia +
de Estrategias Estrategias             PerfilDecision de ejemplo
                                        → ensambla EST-EJ-001 (viable, apoyada
                                          en EVID-EJ-001)
                                        → ensambla EST-EJ-002 (candidata, pero
                                          viola la restricción declarada)
                                        → excluye EST-EJ-002 con motivo
                                        → etiqueta EST-EJ-001 según prioridades

Comparador     Comparador de           Recibe el Conjunto de Estrategias
de Estrategias Estrategias             completo (viable + excluida)
                                        → presenta ambas, con su evidencia de
                                          soporte, certeza y motivo de exclusión
                                          visibles lado a lado

Brújula        Brújula Pensional       Recibe la presentación comparativa
Pensional                              → resalta que EST-EJ-001 está alineada
                                          con la prioridad de mayor peso
                                        → no elimina EST-EJ-002 de la vista

En cada paso:  Trazabilidad            Registra id, versión, datos y
                                        referencias usadas en ese paso

En cada paso:  Explicabilidad          Traduce el resultado de ese paso a
                                        lenguaje legible, a partir del
                                        registro de Trazabilidad
```

### Lectura del caso

Tres observaciones se desprenden de este recorrido, y son las que este documento considera más importantes de retener sobre el comportamiento real de la arquitectura, más allá de la estructura ya descrita en §6:

**1. Ninguna estrategia desaparece silenciosamente.** `EST-EJ-002` se excluye en el Constructor, pero sigue siendo visible —con su motivo— hasta el final del flujo, incluida en lo que la Brújula finalmente presenta. Si en algún punto de una implementación futura una estrategia excluida dejara de ser visible para el usuario, eso sería una desviación de esta arquitectura, no una simplificación aceptable de ella.

**2. `PerfilDecision` entra una sola vez, en un solo punto.** Ni el Motor de Evidencias, ni el Comparador, ni la Brújula lo consultan directamente — todos operan sobre lo que el Constructor ya derivó de él. Esto es lo que hace posible, en principio, recalcular una comparación distinta si el `PerfilDecision` cambia, sin tener que reevaluar la evidencia desde cero — una propiedad relevante para la futura capacidad de Comparación entre `Simulation` (ver §8), aunque su implementación exacta permanece fuera de este documento.

**3. Trazabilidad y Explicabilidad no son un paso final, son un acompañamiento continuo.** El diagrama las representa "en cada paso", no después del último. Una implementación que solo generara explicación y trazabilidad al final del flujo, resumiendo lo ya ocurrido, no cumpliría con el diseño de esta arquitectura — perdería precisamente la granularidad que el Principio 3 y el Principio 4 exigen conservar en cada nivel, no solo en el resultado visible.

## 8. Mapa de relación con contratos existentes

| Componente / capacidad de este documento | Contrato u objeto relacionado | Tipo de relación | Ubicación existente o propuesta |
|---|---|---|---|
| Resolvers | Resolver Legal, Resolver de Supuestos | Ya materializados, sin cambios | `resolver-legal-generico.md`; implementación futura en `domain/` |
| Motor de Evidencias | *(sin contrato propio todavía)* | Nuevo — candidato a alimentar `Simulation.resultadoBase.viabilidad` (extensión aditiva reservada desde Sprint 2) | Propuesta: `domain/` (ubicación exacta a definir cuando se implemente) |
| Constructor de Estrategias | *(sin contrato propio todavía)* | Nuevo — candidato a alimentar `Simulation.resultadoBase.estrategias` (extensión aditiva reservada desde Sprint 2) | Propuesta: `domain/` |
| Comparador de Estrategias | Capacidad "Comparación" (`expediente-pensional.md`) | Relacionado pero distinto — ver nota de desambiguación en §6.4. No reemplaza ni redefine "Comparación" | Sin ubicación propuesta; pendiente de decidir si comparte mecanismo con "Comparación" (ver §9, §10) |
| Brújula Pensional | Marcador reservado en `Simulation.resultadoBase` / Bloque 5 de `expediente-pensional.md` | Ya reservado, sin contrato — este documento le da marco conceptual (§6.5), no contrato | Sin cambio de ubicación; sigue "ubicada, no diseñada" |
| Explicabilidad | `Explanation` (`domain/contracts/Explanation.js`) | Extiende el mismo patrón, de un cálculo a los cuatro niveles de esta arquitectura — extensión aditiva o contrato hermano, a decidir | `domain/contracts/` (a definir si extiende `Explanation` o crea uno nuevo) |
| Trazabilidad | `CalculationTrace` (`domain/contracts/CalculationTrace.js`) | Extiende el mismo patrón — extensión aditiva o contrato hermano, a decidir | `domain/contracts/` (misma indefinición que Explicabilidad) |
| `PerfilDecision` (entrada del Constructor) | `src/models/PerfilDecision.js` | Consumido sin cambios | Existente, Sprint 2 |
| Datos ya resueltos (entrada del Motor de Evidencias) | `ContextoEvaluacion` (`domain/contracts/ContextoEvaluacion.js`) | El Motor de Evidencias consume los mismos valores que `ContextoEvaluacion` ya conserva embebidos en `Simulation` — no lo reemplaza ni lo duplica | Existente, Sprint 2 |
| Datos del caso (entrada del Motor de Evidencias) | `UserProfile` | Consumido sin cambios | Existente, Sprint 1 |
| Agregador del Expediente | `ExpedientePensional` (`src/models/ExpedientePensional.js`) | Sin relación directa — este documento no agrega campos a `ExpedientePensional`; el resultado de una evaluación completa del Motor de Decisión sigue viviendo dentro de una `Simulation` individual, como evidencia histórica, no en el agregador mínimo | Existente, Sprint 2, sin cambios |

### Nota sobre una tensión detectada: el campo "recomendación"

`expediente-pensional.md` (Sprint 2) reserva tres campos como extensión aditiva prevista de `Simulation.resultadoBase`: `viabilidad`, `estrategias` y **`recomendación`**. Los dos primeros se corresponden con naturalidad a la salida del Motor de Evidencias y del Constructor de Estrategias, respectivamente. El tercero exige una precisión que este documento no puede resolver por sí solo sin salirse de su propio alcance (§5): el nombre "recomendación" sugiere, en su lectura más natural, una sugerencia única del sistema — exactamente lo que el Principio rector de este documento (§3) prohíbe que cualquier componente del Motor de Decisión produzca.

Ninguna salida de esta arquitectura —ni la Brújula Pensional, que es la más cercana en posición a ese campo— produce una recomendación en el sentido de una elección cerrada. Existen, sin resolverlas aquí, al menos tres formas de conciliar esta tensión:

1. Reinterpretar el campo `recomendación` para que contenga la salida de la Brújula Pensional tal como se definió en §6.5 — orientación, no una elección cerrada —, sin cambiar su nombre.
2. Proponer, en un futuro documento de extensión de `Simulation`, un renombramiento del campo (ej. a `orientacion`) que refleje con precisión lo que efectivamente contendría.
3. Mantener el campo `recomendación` reservado para un uso distinto y todavía no definido, y ubicar la salida de la Brújula Pensional en un campo nuevo.

Este documento no elige entre estas tres alternativas — hacerlo excedería su alcance, que excluye explícitamente la modificación de contratos existentes (§5). Se deja registrada como decisión pendiente en §10, y como riesgo en §9.

## 9. Riesgos

**1. Tensión entre el campo `recomendación` (Sprint 2) y el Principio rector de este documento.** Ya descrita en detalle en §8. Es el riesgo de mayor prioridad de este documento porque no es un riesgo de implementación futura — es una inconsistencia de nomenclatura ya existente entre un contrato aprobado en Sprint 2 y la filosofía que este documento formaliza. Mitigación parcial: se ha dejado documentada la tensión y las alternativas, en vez de resolverla por conveniencia narrativa.

**2. Colisión conceptual entre "Comparador de Estrategias" (este documento) y "Comparación" (`expediente-pensional.md`).** Ya descrita en §6.4 con una tabla de desambiguación. El riesgo remanente no es que un lector de este documento los confunda —la tabla lo previene— sino que una implementación futura, bajo presión de tiempo, termine construyendo un solo mecanismo para ambos sin evaluar si eso es correcto, simplemente porque comparten la palabra "comparar". Mitigación: la decisión de si comparten mecanismo interno queda explícitamente pendiente (§10), no asumida.

**3. Erosión de la frontera entre evidencia y estrategia en la implementación real.** Los ejemplos estructurales de §6.2 y §6.3 ilustran una frontera clara en un caso simple. Reglas legales reales del sistema pensional colombiano (régimen de transición, por ejemplo) pueden producir hechos que se sienten, en la práctica, muy cercanos a una recomendación (ej. "cumples los requisitos pero el resultado esperado es desfavorable"). Sin una regla de estilo explícita al momento de implementar cada regla real, esta frontera puede erosionarse silenciosamente. Mitigación: ninguna todavía — se señala como algo que el primer conjunto de reglas legales reales deberá resolver con al menos un caso documentado que ponga a prueba la frontera, no solo con este ejemplo estructural.

**4. Sobre-diseño de la Brújula Pensional sin un segundo caso real.** Ya mitigado por diseño: §6.5 deja su contrato explícitamente diferido, y este documento se abstiene de comprometerse a una forma exacta (Principio 9).

**5. Duplicidad de fuentes de verdad entre `PerfilDecision`, `simulacionInput` y el nuevo Conjunto de Estrategias.** Mismo tipo de riesgo que `expediente-pensional.md` ya señaló, sin resolverlo, entre `Simulation.simulacionInput` y `PerfilDecision` — este documento agrega un tercer punto de tensión potencial: si el Conjunto de Estrategias llegara a almacenar una copia de las prioridades usadas (para trazabilidad, §6.7) además de la copia que ya vive en `Simulation.perfilDecisionUtilizado`, existiría una duplicación que un futuro contrato formal deberá resolver explícitamente indicando cuál es la fuente única — no se resuelve en este documento, que no diseña contratos (§5).

**6. Riesgo de acoplamiento indebido del Motor de Evidencias con `data/legal`/`data/assumptions`.** El diseño de §6.2 prohíbe explícitamente que el Motor de Evidencias resuelva directamente contra esas fuentes — pero es, en la práctica, el tipo de atajo más tentador de tomar durante la implementación, porque evitaría una llamada adicional a los Resolvers. Mitigación: la prohibición está declarada con la misma fuerza que ya tuvo la corrección equivalente aplicada a `Explanation.js` en Sprint 2 — un precedente real de que este tipo de atajo ya ocurrió una vez en el proyecto y fue corregido, no una preocupación hipotética.

**7. Crecimiento no acotado del Conjunto de Evidencia sin categorización.** §6.2 menciona una "categoría o dominio" como parte de la metadata declarativa de una regla, sin definir un catálogo. A medida que el número de reglas de evidencia crezca, la ausencia de una organización por categoría podría dificultar tanto el mantenimiento como la presentación ordenada de la evidencia al Constructor. No se resuelve aquí — es candidato a su propio documento de diseño cuando exista un número de reglas reales suficiente para evidenciar la necesidad (Principio 9).

**8. Riesgo de percepción del usuario, no solo de arquitectura.** Aunque la Brújula Pensional esté diseñada, con rigor, para orientar y no decidir, nada garantiza que una persona sin formación técnica perciba esa distinción de la misma forma que este documento la define. Es un riesgo de producto y de diseño de interfaz, no de arquitectura de dominio — pero se registra aquí porque una implementación de UI que presente la salida de la Brújula de forma visualmente equivalente a una recomendación cerrada violaría la intención de esta arquitectura sin violar ninguno de sus contratos técnicos. Mitigación futura: corresponde al diseño de interfaz, no a este documento, pero debe quedar como criterio de aceptación cuando se implemente.

## 10. Decisiones

### Decisiones tomadas en este documento

1. La propuesta preliminar "Motor de Reglas" —evaluada en la conversación previa a este documento— se descarta como arquitectura. Se reemplaza por una arquitectura de siete componentes: Resolvers (existentes), Motor de Evidencias, Constructor de Estrategias, Comparador de Estrategias, Brújula Pensional, Explicabilidad y Trazabilidad.
2. Se establece el Principio rector (§3), con rango equivalente a los diez Principios de Arquitectura vigentes: ninguna regla decide; una regla únicamente genera evidencia. Las estrategias se construyen a partir de esa evidencia; se comparan; se explican; el usuario conserva siempre la decisión final.
3. El Motor de Evidencias nunca conoce `PerfilDecision`. Las restricciones declaradas por el usuario excluyen estrategias inviables; las preferencias y prioridades ordenan o etiquetan, pero nunca descartan.
4. Las estrategias excluidas por una restricción se registran junto con su motivo — nunca se eliminan en silencio del conjunto producido por el Constructor de Estrategias.
5. El Comparador de Estrategias nunca produce una única estrategia "ganadora" implícita, y opera exclusivamente sobre lo que el Constructor le entrega — no reconsulta `PerfilDecision` ni la evidencia cruda.
6. La Brújula Pensional mantiene su contrato detallado diferido (Principio 9), consistente con el tratamiento que ya recibió en Sprint 2. Este documento le fija únicamente su marco conceptual y sus límites de comportamiento (§6.5).
7. Explicabilidad y Trazabilidad se definen como capas transversales, no como pasos secuenciales del flujo — ambas deben cubrir los cinco componentes en secuencia en cada uno de sus niveles, no únicamente el resultado final visible al usuario.
8. Trazabilidad conserva copias completas —nunca referencias— del `PerfilDecision` efectivamente usado en cada evaluación, replicando el mismo criterio que ya rige `Simulation.perfilDecisionUtilizado` desde Sprint 2.
9. Ningún contrato ya existente (`UserProfile`, `Simulation`, `PerfilDecision`, `ExpedientePensional`, `CalculationTrace`, `Explanation`) se modifica como parte de este documento. Toda relación descrita en §8 es de composición o de extensión aditiva prevista, nunca de reemplazo.
10. Este documento no diseña reglas legales o pensionales específicas, ni el contrato de datos formal de ningún componente nuevo. Ambos quedan para documentos de diseño posteriores, uno por componente, siguiendo el mismo ciclo de propuesta-revisión-implementación que ya recibieron `ContextoEvaluacion` y `PerfilDecision` en Sprint 2.

### Decisiones explícitamente pendientes

Consistentes con la instrucción de no completar vacíos con supuestos, las siguientes decisiones se identificaron durante la redacción de este documento y **no se resuelven aquí**. Cada una queda con su alternativa documentada, no inventada:

11. **Nombre y contrato del registro extendido de Trazabilidad** (análogo a `CalculationTrace`, §6.7) — sin nombre ni forma definitiva todavía.
12. **Si Explicabilidad extiende el contrato `Explanation` ya existente, o si requiere un contrato hermano nuevo** — ambas alternativas son técnicamente viables (§8); no se ha elegido entre ellas.
13. **La relación exacta entre el campo `recomendación`, reservado en Sprint 2, y la salida de la Brújula Pensional** — tres alternativas documentadas en §8 (reinterpretar el campo, renombrarlo en un futuro documento de extensión de `Simulation`, o reservarlo para otro uso distinto), ninguna seleccionada.
14. **Si el Comparador de Estrategias comparte mecanismo interno con la capacidad "Comparación"** del Expediente Pensional (`expediente-pensional.md`), o si ambos permanecen completamente independientes pese a operar sobre conceptos relacionados (§6.4, §9).
15. **La categorización o catálogo de reglas de evidencia a escala** (§6.2, §9) — diferida explícitamente hasta que exista un número real de reglas suficiente para evidenciar la necesidad, siguiendo el Principio 9.
16. **La ubicación exacta en el árbol de carpetas del proyecto** (`domain/...`) de cada componente nuevo — no se fija en este documento; es una decisión de implementación, no de arquitectura conceptual.
17. **Cuál es, concretamente, el "segundo caso real" (Principio 9) que justifica proceder ahora con el diseño de esta arquitectura**, más allá de la existencia teórica de `PerfilDecision` desde Sprint 2. Esta pregunta se planteó explícitamente durante la fase de propuesta de este documento y no llegó a responderse con un caso nombrado (ej. régimen de transición, u otro). Se registra aquí, sin inventar una respuesta, porque condiciona directamente cuándo es razonable iniciar la implementación de cualquiera de los componentes descritos.

## 11. Relación con documentos anteriores y próximos pasos

### Relación con documentos anteriores

Este documento se relaciona con tres documentos ya existentes en la Biblioteca de Conocimiento de PensionLab, y con ninguno de ellos por sustitución de su contenido aprobado:

- **`docs/tecnico/arquitectura/resolver-legal-generico.md`** (Sprint 1) — su Decisión 5 estableció que "Motor de Reglas: se difiere, no se descarta... hasta que exista un segundo caso real de lógica condicional compleja". Este documento es la respuesta arquitectónica a ese diferimiento, con dos precisiones que deben quedar explícitas: primero, el componente resultante no se llama "Motor de Reglas" sino "Motor de Evidencias", por las razones desarrolladas en §3 y §6.2; segundo, la condición que originalmente justificaba proceder —un segundo caso real de lógica condicional compleja— no quedó nombrada con un caso concreto durante el diseño de este documento (ver Decisión pendiente 17). Este documento no da por cumplida esa condición; la deja como verificación pendiente antes de implementar.
- **`docs/tecnico/arquitectura/expediente-pensional.md`** (Sprint 2) — su sección "Próximos pasos" (punto 2) difirió "el contrato de Brújula Pensional y la cuantificación de Comparación" hasta que existiera evidencia suficiente. Este documento avanza parcialmente sobre ese pendiente: da marco conceptual a la Brújula Pensional (§6.5) sin diseñar su contrato, y da arquitectura completa al espacio ya reservado como `viabilidad`/`estrategias` en `Simulation.resultadoBase` (§8) — pero no cuantifica la capacidad "Comparación" del Expediente, que permanece diferida, ahora con una relación explícitamente sin resolver frente al nuevo Comparador de Estrategias (Decisión pendiente 14).
- **`docs/gestion/cierre-sprint-3.md`** — este documento se origina en una pausa deliberada del desarrollo de pantallas de Sprint 3 para abordar una decisión de arquitectura de mayor alcance. No modifica ningún Slice ya cerrado de Sprint 3.

### Próximos pasos

1. **Confirmar explícitamente el caso real** (Principio 9) que justifica iniciar la implementación de cualquiera de los siete componentes de esta arquitectura — pendiente 17, sin resolver en este documento.
2. **Diseñar, en documentos separados y con el mismo estándar documental**, el contrato formal de cada componente nuevo en el momento en que se decida implementarlo: Motor de Evidencias, Constructor de Estrategias, Comparador de Estrategias, el registro extendido de Trazabilidad, y la extensión (o el contrato hermano) de Explicabilidad.
3. **Resolver la tensión del campo `recomendación`** (§8, pendiente 13) antes de que cualquier implementación futura escriba datos reales en `Simulation.resultadoBase`.
4. **Decidir la relación entre el Comparador de Estrategias y la capacidad "Comparación"** del Expediente (pendiente 14), antes de diseñar el contrato formal de cualquiera de los dos.
5. **Definir el orden de implementación** de los componentes — la dependencia estricta ya documentada en §6 sugiere Resolvers (ya listos) → Motor de Evidencias → Constructor de Estrategias → Comparador de Estrategias → Brújula Pensional, con Explicabilidad y Trazabilidad desarrollándose junto a cada uno. Esta secuencia es una observación de dependencia técnica, no una decisión de planificación de Sprints, que queda fuera del alcance de este documento (§5).
6. **Mantener la Brújula Pensional diferida** hasta que su propio segundo caso real aparezca — este documento no debe reabrirse únicamente para especular sobre su forma exacta.
7. **Revisar este documento cuando `pensionEngine`** (todavía sin implementar, prerrequisito documentado desde Sprint 1) alcance un estado que permita alimentar al Motor de Evidencias con datos reales — en ese momento, los ejemplos estructurales usados aquí (`EVID-EJ-001`, `EST-EJ-001`, `EST-EJ-002`) deberán contrastarse por primera vez con un caso legal real, y esta arquitectura deberá confirmarse o ajustarse a la luz de ese contraste.

La aprobación de este documento establece PL-230 como referencia de arquitectura de la Biblioteca de Conocimiento de PensionLab. No autoriza, por sí misma, el inicio de la implementación de ningún componente — esa es una decisión posterior y separada, consistente con el Principio 8 (los cambios de arquitectura se documentan antes de implementarse, y se implementan solo después de una decisión explícita de hacerlo).
