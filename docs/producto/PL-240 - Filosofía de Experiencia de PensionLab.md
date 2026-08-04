# PL-240 — Filosofía de Experiencia de PensionLab

**Versión:** 1.0
**Fecha:** 2026-08-03
**Categoría documental:** Filosofía de Producto — Documento fundacional de experiencia
**Proyecto:** PensionLab
**Biblioteca de Conocimiento de PensionLab — Documento fundacional de producto**

Este documento constituye la fuente oficial versionada de PL-240 dentro del repositorio de PensionLab.

El archivo Word correspondiente (`PL-240 - Filosofía de Experiencia de PensionLab - v1.0.docx`) es el entregable oficial para la Biblioteca de Conocimiento y debe generarse a partir de este documento, manteniendo siempre la equivalencia íntegra entre ambas versiones.

Ninguna modificación deberá realizarse directamente sobre el archivo Word. Toda evolución del documento deberá efectuarse primero sobre esta fuente en formato Markdown y posteriormente reflejarse en el entregable Word.

Este documento no describe arquitectura técnica ni implementación. Describe cómo debe comportarse PensionLab como producto — el complemento, a nivel de experiencia, de lo que PL-230 ya estableció a nivel de arquitectura del Motor de Decisión.

## Control de versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 1.0 | 2026-08-03 | Carlos Peraza (con asistencia de Claude, Anthropic) | Versión inicial. Documento fundacional de Filosofía de Experiencia de PensionLab. Se origina en una pausa deliberada del desarrollo de Sprint 3 (antes de iniciar el Slice S3-009) para fijar, antes de continuar con nuevas pantallas, los principios que guían toda interacción entre PensionLab y sus usuarios. |

---

## 0. La Promesa de PensionLab

Decidir sobre la propia pensión es una de las decisiones más importantes que una persona toma en su vida —y, casi siempre, una de las que enfrenta peor equipada. La información relevante está dispersa en normas legales que solo un experto interpreta con soltura, en simuladores que exigen datos técnicos (semanas, IBC, régimen de transición) antes de explicar para qué sirven, o en asesores cuyo incentivo comercial no siempre coincide con el interés de la persona que los consulta. La persona promedio no tiene el vocabulario, el tiempo ni el acceso para descifrar su propia historia pensional —y termina decidiendo tarde, con información incompleta, o sin decidir en absoluto, dejando que el sistema decida por ella mediante la inacción.

El mercado no carece de calculadoras de pensión. Existen simuladores, hojas de cálculo y asesores que, dado un conjunto de datos técnicos, devuelven un número. Lo que no existe —o no existe con el mismo cuidado— es una herramienta que ayude a la persona a entender, antes que nada, su propia historia: cuánto tiempo ha cotizado, bajo qué régimen, con qué interrupciones, y qué significa realmente cada uno de esos hechos para las alternativas que tiene hoy. Un número sin esa comprensión previa no es información útil —es una cifra que la persona no sabe cómo interpretar, cuestionar, ni defender frente a quien se la entregó.

Ese es el problema que da origen a PensionLab: no la ausencia de una calculadora más precisa, sino la ausencia de una herramienta que ayude a una persona a comprender su propia historia pensional antes de pedirle que decida sobre ella. La mayoría de las instituciones actuales tratan esa decisión como un trámite técnico, cuando en realidad es una decisión de vida que empieza por entenderse a uno mismo, no por obtener un resultado.

> Una persona no necesita saber de pensiones para tomar una buena decisión sobre su pensión. Necesita entender su propia historia.

Antes de explicar cómo debe comportarse PensionLab (§1) o qué principios rigen esa conducta (§3), hay una pregunta más simple y más importante que cualquiera de las anteriores, y que este documento entero existe para responder: **¿por qué existe PensionLab?**

> PensionLab existe para que esa comprensión sea posible. Le prometemos a cada persona que lo use que va a entender su situación real, que va a conocer las alternativas que de verdad tiene, y que va a poder confiar en cada número y cada explicación que le mostremos, porque puede rastrearlos hasta su origen. No le prometemos decidir por ella. Le prometemos que, cuando decida, lo hará sabiendo lo que antes no sabía.

Esta es la promesa. Todo lo demás en este documento —y, en última instancia, en el producto— es la forma en que esa promesa se cumple pantalla por pantalla, palabra por palabra.

### Lo que prometemos, en concreto

| Prometemos | Qué significa en la práctica | Dónde ya se cumple hoy |
|---|---|---|
| **Entender su situación real** | Explicar antes de preguntar, nunca un formulario ciego que recolecta datos sin decir para qué | S3-007 y S3-008 explican, antes de cada dato solicitado, por qué PensionLab lo necesita |
| **Conocer las alternativas que de verdad tiene** | El sistema construye y compara estrategias; nunca colapsa el resultado en una única respuesta cerrada | Principio rector del Motor de Decisión (PL-230 §3) |
| **Confiar en lo que ve** | Todo resultado —y toda pregunta que lo antecede— es trazable hasta su origen | Principio 3 de Arquitectura; `CalculationTrace`, `Explanation` |
| **Ser acompañada, no interrogada** | Tono conversacional, una pregunta a la vez cuando el dato lo justifica, nunca un cuestionario impersonal | Decisión explícita de S3-008: *"PensionLab debe conversar con la persona, no interrogarla"* |
| **Saber lo que no se sabe** | La incertidumbre y las limitaciones se declaran de forma visible, nunca se disimulan con falsa precisión | Principio 5 de Arquitectura; `Explanation.limitaciones` |

### Lo que no prometemos — con la misma claridad

- **No prometemos un resultado favorable.** Prometemos claridad sobre las alternativas reales, no un desenlace mejor que el que la normativa y la historia laboral de la persona permiten.
- **No reemplazamos la asesoría profesional ni la decisión de la persona.** Es, de hecho, el texto legal que ya acompaña a la aplicación desde su primera pantalla: *"PensionLab ofrece orientación informativa para comprender alternativas pensionales. No reemplaza la asesoría profesional ni las decisiones del usuario"* (footer, S3-001).
- **No prometemos tener toda la información desde el primer día.** El Expediente Pensional se construye progresivamente y se dice explícitamente: *"no es necesario tener toda la información desde el principio"* (S3-006).

### Por qué esta sección existe por separado

La Promesa no es un eslogan de mercadeo ni una aspiración vaga de "buena experiencia de usuario" — es el contrato implícito que cada pantalla, cada pregunta y cada palabra de PensionLab debe cumplir. Se declara aquí, antes de la Filosofía (§1) y de los Principios (§3), porque responde una pregunta distinta a la de ambas: la Filosofía explica *cómo* se comporta PensionLab para sostener esta promesa; los Principios fijan reglas *verificables* que hacen posible auditar ese comportamiento. La Promesa, en cambio, es la razón de ser que antecede a las dos — de la misma manera en que PL-230 §0 antecede a su Principio rector (PL-230 §3): primero se declara por qué existe el sistema, después se convierte esa declaración en reglas de diseño.

---

## 1. Filosofía de PensionLab

PL-230 ya estableció, para el Motor de Decisión, una separación que no admite excepciones: PensionLab construye evidencia, genera estrategias, las compara, las explica, y deja la decisión final siempre en manos de la persona (PL-230 §0). Ese principio no nació en PL-230 — ya estaba en el README del proyecto desde antes de que existiera una sola pantalla: *"un número sin explicación no sirve"*, *"preferimos ser honestos sobre lo que no sabemos... antes que mostrar una falsa precisión"*. Lo que PL-230 hizo fue convertir esa declaración en arquitectura verificable para el componente que calcula.

Este documento hace el mismo trabajo para el componente que **habla**: la interfaz, el lenguaje, la secuencia de preguntas, el tono de cada advertencia. Porque una arquitectura que separa evidencia de decisión con total rigor puede, sin darse cuenta, deshacer esa separación en la superficie —si una pantalla presenta una sola opción destacada, si una pregunta suena a interrogatorio, si una advertencia se redacta como si fuera la opinión del sistema y no un hecho verificable—, la promesa de PensionLab se rompe en el lugar exacto donde la persona la experimenta: no en el motor, sino en la conversación.

### El punto medio que PensionLab elige deliberadamente

La mayoría de las herramientas financieras o pensionales caen en uno de dos extremos, y PensionLab rechaza ambos de forma explícita:

1. **El extremo del formulario burocrático.** Una sucesión de campos técnicos, sin explicación de por qué se piden ni para qué sirven, que trata a la persona como una fuente de datos que hay que completar. Es el extremo que Sprint 3 evitó desde el inicio: cada pantalla que solicita un dato explica antes por qué lo necesita (S3-007, S3-008).
2. **El extremo de la caja negra que recomienda.** Un sistema que oculta la complejidad detrás de un único número o una única sugerencia ("esto es lo que te conviene"), presentado con una confianza que no está justificada por la evidencia disponible. Es exactamente lo que el Principio rector del Motor de Decisión prohíbe (PL-230 §3), y lo que este documento prohíbe también en el lenguaje: ninguna pantalla puede sonar como si la decisión ya estuviera tomada.

PensionLab existe en el punto medio: una conversación guiada, honesta sobre lo que sabe y lo que no sabe, que acompaña a la persona hacia sus propias alternativas sin caminar el camino por ella. Ese punto medio no es una posición cómoda de mantener —es más fácil, en la práctica de cada Slice, deslizarse hacia el formulario (porque es más rápido de construir) o hacia la recomendación cerrada (porque se siente más "útil" a corto plazo). Este documento existe para que ese deslizamiento no ocurra sin que alguien lo decida de forma explícita.

### Qué significa esto para el resto del documento

La Filosofía no es, por sí sola, verificable — es la razón de fondo. Su función en esta arquitectura documental es idéntica a la que cumple PL-230 §0 respecto de PL-230 §3: fijar el *por qué*, para que los Principios fundamentales (§3) y cada sección "Cómo..." (§4-§9) puedan fijar el *qué*, en términos que sea posible auditar contra una pantalla real. Este documento no introduce una filosofía nueva y distinta de la que ya rige el proyecto —la extiende, de la arquitectura del cálculo a la experiencia de la conversación.

---

## 2. Propósito del documento

### Objetivo

Definir los principios que guían toda interacción entre PensionLab y sus usuarios: cómo habla, cómo pregunta, cómo genera confianza, y cómo comunica lo que sabe con certeza, lo que solo estima, y lo que implica un riesgo o una oportunidad para la persona. Este documento no diseña ninguna pantalla específica ni sustituye el proceso de aprobación de redacción que ya se sigue Slice por Slice en Sprint 3 (propuesta → revisión → aprobación → implementación) — establece el criterio con el que esas redacciones futuras, y las ya aprobadas, deben evaluarse.

### Lo que este documento entrega

- Principios fundamentales de experiencia (§3), con rango equivalente —dentro de su propio dominio— al de los Principios de Arquitectura ya vigentes desde Sprint 1.
- Reglas de comportamiento verificables sobre cómo PensionLab habla, pregunta, genera confianza, y comunica incertidumbre, riesgos y oportunidades (§4-§9).
- Principios de diseño conversacional aplicables a cualquier flujo, no solo a los ya construidos (§10).
- Ejemplos concretos de interacciones deseables y no deseables, anclados en pantallas y decisiones ya aprobadas del producto, no en casos hipotéticos (§11).
- Un checklist de evaluación aplicable a cualquier pantalla nueva antes de aprobarla, incluida la que retome S3-009 (§12).
- La relación explícita de este documento con PL-230 y con los Principios de Arquitectura, para que ambos conjuntos de principios —de arquitectura y de experiencia— se lean como una sola voz coherente, no como dos documentos paralelos que podrían entrar en tensión (§13).

### Lo que este documento no entrega

- **Ninguna arquitectura técnica ni contrato de datos.** Eso ya vive en PL-230 y en los contratos de dominio existentes (`UserProfile`, `Simulation`, `PerfilDecision`, `Explanation`, `CalculationTrace`). Este documento no los modifica ni los sustituye.
- **El copy definitivo de ninguna pantalla específica.** No reemplaza el proceso de propuesta y aprobación de redacción que cada Slice de Sprint 3 ya sigue de forma individual — le da a ese proceso un criterio compartido, no un texto final ya escrito.
- **Ninguna decisión sobre IA de cara al usuario final.** Esa pregunta permanece explícitamente sin diseñar, como ya lo declara `docs/ia/principios-y-limites.md`: *"no se ha diseñado ni decidido si el producto usará IA de cara al usuario final"*. Este documento no la resuelve ni la anticipa.
- **La modificación de ningún Slice ya cerrado de Sprint 3.** Las pantallas S3-001 a S3-008 se usan aquí como ejemplos y como evidencia de principios ya aplicados en la práctica —no como objeto de rediseño retroactivo. Si algún ejemplo revela una inconsistencia menor, esa corrección es una decisión separada y posterior, no un efecto automático de este documento.

---

## 3. Principios fundamentales

Estos son los principios que rigen toda interacción entre PensionLab y sus usuarios. No son una lista de buenas prácticas genéricas de UX —cada uno se deriva directamente de la Promesa (§0) y de la Filosofía (§1), y cada uno ya tiene al menos una aplicación concreta y aprobada en el producto, no solo una intención declarada. Cada principio recibe un nombre memorable, para que sea fácil invocarlo durante la revisión de una pantalla nueva sin tener que citar su enunciado completo.

| # | Nombre | Principio | Origen concreto ya aplicado |
|---|---|---|---|
| **A** | **Conversar, no interrogar** | PensionLab conversa con la persona; no la somete a un cuestionario impersonal. Pregunta lo necesario, una idea a la vez cuando el tema lo justifica, y explica el propósito de cada dato antes de pedirlo. | Decisión explícita de S3-008: *"PensionLab debe conversar con la persona, no interrogarla"*; rediseño de "¿Conoces...?" a "¿Sabes...?" por ese mismo criterio. |
| **B** | **Brújula, no piloto automático** | El lenguaje de PensionLab nunca presenta una alternativa como si el sistema ya la hubiera ejecutado por la persona. Puede señalar dirección o relevancia relativa —como una brújula señala el norte—, pero nunca decide ni actúa en su lugar —como sí lo haría un piloto automático. La decisión final permanece siempre, visible e inequívocamente, en manos de la persona. | Principio rector del Motor de Decisión (PL-230 §3); rol de la Brújula Pensional (PL-230 §6.5) como quien orienta sin caminar por la persona. |
| **C** | **Sin certezas fingidas** | PensionLab declara explícitamente los límites de lo que sabe —tanto cuando es la persona quien no conoce un dato, como cuando es el propio sistema quien no tiene una certeza consolidada (una proyección, un supuesto de modelado, una interpretación normativa en disputa). Ninguno de los dos casos se disimula con una respuesta genérica o una falsa precisión. | Opción "No lo recuerdo con exactitud" en S3-008 (incertidumbre de la persona); Principios 5 y 7 de Arquitectura — RAIS como proyección, nunca cálculo definitivo (incertidumbre del sistema); Principio 3 de `docs/ia/principios-y-limites.md`: *"la incertidumbre se declara, no se oculta"*. |
| **D** | **Progreso sin maquillaje** | Una etiqueta de progreso solo dice lo que es verificablemente cierto. PensionLab prefiere una etiqueta exacta pero menos vistosa a una etiqueta más satisfactoria pero imprecisa. | Decisión explícita de S3-007: los bloques ya recorridos se etiquetan "Información básica registrada", no "Completado", precisamente para no sugerir un cierre que la información capturada no garantiza. |
| **E** | **Ninguna puerta sin salida** | Toda pantalla ofrece una forma de continuar y una forma de volver atrás. Ninguna respuesta —incluida "no lo sé"— bloquea el flujo sin ofrecer una salida explícita hacia adelante. | Patrón repetido en todos los Slices de Sprint 3 (botón "Volver" presente desde S3-001); "no lo sé" nunca bloquea en S3-008. |
| **F** | **El idioma de la persona** | PensionLab habla en los términos que la persona reconoce de su propia vida ("Colpensiones", "fondo privado"), reservando la nomenclatura técnica (RPM/RAIS) para lo que el dominio necesita internamente. | Decisión explícita de S3-004: el régimen se presenta en lenguaje cotidiano, guardando RPM/RAIS como valor interno, no como texto visible. |
| **G** | **Cuidar la coherencia** | PensionLab protege a la persona detectando inconsistencias entre lo que ella misma ha declarado, explicándolas en lenguaje claro, y permitiendo continuar mediante una confirmación explícita únicamente cuando se trate de un caso genuinamente excepcional —nunca bloqueando automáticamente algo simplemente inusual, ni dejando pasar en silencio algo cronológicamente imposible. | Validación de coherencia de tres niveles en S3-008 (imposible / extraordinario con confirmación / válido); futuro "Motor de Coherencia del Expediente" anticipado en la Decisión 7 de S3-008. |

**Sobre la diferencia entre C y G**, que a primera vista podrían parecer el mismo principio: *Sin certezas fingidas* (C) rige lo que ocurre cuando algo —un dato de la persona o una estimación del propio sistema— no se conoce con certeza, y exige decirlo en vez de disimularlo. *Cuidar la coherencia* (G) rige un caso distinto y más específico: cuando dos o más datos, cada uno perfectamente conocido y declarado por la propia persona, resultan matemática o cronológicamente incompatibles entre sí. C protege contra la falsa precisión de algo incierto; G protege contra un error que ni siquiera la persona misma habría notado, sin convertir esa protección en una acusación ni en un bloqueo desproporcionado.

Estos siete principios no son independientes entre sí — se refuerzan mutuamente, y la mayoría de las secciones siguientes (§4-§10) son, en realidad, el desarrollo en detalle de dos o tres de ellos aplicados a un aspecto específico de la experiencia (cómo se habla, cómo se pregunta, cómo se comunica un riesgo). Ninguna sección posterior de este documento introduce un principio nuevo que no se derive de esta tabla — las secciones siguientes lo aplican, lo detallan y lo ejemplifican, no lo amplían con criterios adicionales no declarados aquí.

Estos siete principios no son una lista de sugerencias de estilo — son la identidad de PensionLab convertida en algo que se puede verificar en cada pantalla. Ninguna decisión de diseño futura debería contradecirlos sin que alguien lo decida así, de forma consciente y por escrito —porque una promesa que se traiciona en silencio deja de ser una promesa. Mientras eso no ocurra, esta tabla es la vara con la que se mide si una pantalla nueva sigue siendo, todavía, PensionLab.

---

## 4. Cómo habla PensionLab

El lenguaje de PensionLab no es un detalle de redacción que se ajusta al final de cada Slice — es donde la Promesa (§0) se cumple o se rompe en la práctica. Esta sección fija las reglas de tono y voz que aplican a cualquier texto visible en la interfaz, derivadas directamente de los Principios fundamentales (§3).

| Regla | Qué significa | Ya aplicado en |
|---|---|---|
| **Segunda persona, tono cercano** | PensionLab se dirige siempre a "tú", nunca a "usted" ni a construcciones impersonales ("el afiliado", "el usuario deberá"). | *"¿Dónde estás afiliado actualmente?"* (S3-004); *"Cuéntanos, de forma general, cómo has realizado tus cotizaciones"* (S3-005) |
| **PensionLab se nombra a sí mismo, no dice "nosotros"** | Cuando el producto habla de lo que hace, lo hace en tercera persona con su propio nombre —como un acompañante identificable—, no como un "nosotros" corporativo genérico detrás del cual nadie responde. | *"PensionLab te acompañará paso a paso para registrar únicamente la información necesaria"* (S3-007) |
| **Vocabulario cotidiano por defecto** (Principio F) | El término técnico se reserva para lo que el dominio necesita internamente; lo que ve la persona es el término que ya reconoce de su propia vida. | "Colpensiones" / "fondo privado", nunca "RPM/RAIS" visible (S3-004) |
| **Oraciones cortas, voz activa** | Se evita la construcción pasiva o burocrática ("se requiere que el usuario ingrese...") a favor de una instrucción directa y activa. | *"Cuéntanos..."*, *"Indícanos..."*, nunca *"Debe proporcionarse..."* |
| **Ninguna certeza absoluta sobre lo que "conviene"** (Principio B) | Ninguna pantalla usa expresiones como "lo mejor para ti es" o "deberías elegir" — esas palabras pertenecen a una decisión, no a una orientación. | Ninguna opción se marca como "recomendada" en `Objetivo.jsx` (S3-002) ni en `SituacionPensional.jsx` (S3-004) |
| **Ningún tono de corrección punitiva** (Principio G) | Ante un dato inconsistente o inválido, el lenguaje explica y acompaña — nunca corrige como si la persona hubiera cometido una falta. | Advertencias de coherencia en S3-008 redactadas como observación, no como error del usuario |

Estas reglas no son exhaustivas de todo lo que puede decirse en una pantalla —son el filtro mínimo que cualquier texto nuevo debe pasar antes de aprobarse, consistente con el criterio ya usado en Sprint 3 de ajustar la redacción en rondas explícitas de revisión (S3-002, S3-004, S3-007, S3-008).

---

## 5. Cómo hace preguntas

PensionLab construye el Expediente Pensional pregunta por pregunta, no con un formulario único. Cómo se agrupan o se separan esas preguntas no es una decisión de diseño visual — es una decisión que afecta directamente si la persona siente que está teniendo una conversación (Principio A) o llenando un trámite.

### Cuándo agrupar y cuándo separar

- **Se agrupan** preguntas de la misma naturaleza, rápidas de responder y sin carga emocional o ambigüedad propia, en una sola pantalla — como los tres campos de "Datos iniciales" (fecha de nacimiento, sexo, lugar de residencia; S3-003) o las tres preguntas de "Historial laboral" (S3-005).
- **Se separan**, una a la vez dentro de la misma pantalla, las preguntas donde cada una necesita su propia explicación de propósito, o donde la respuesta puede ser incierta y merece su propio espacio para declararlo — como el año de inicio de cotización y el conocimiento de semanas cotizadas en "Información pensional esencial" (S3-008), el primer caso de este patrón en el proyecto.

Ninguno de los dos criterios es "más correcto" que el otro en abstracto — la decisión depende de si agrupar ahorra tiempo sin perder claridad, o si separar es necesario para que cada pregunta reciba la explicación y el espacio que merece. Agrupar preguntas que necesitaban explicación propia sería tratar la conversación como formulario; separar preguntas triviales que no la necesitan sería, sin razón, hacer más lento un trámite legítimamente simple.

### Reglas que aplican sin excepción, agrupada o no la pregunta

| Regla | Qué significa | Ya aplicado en |
|---|---|---|
| **Explicar antes de preguntar** (Principio A) | Ninguna pregunta se presenta sin que la persona sepa antes por qué PensionLab la necesita. | Explicación de propósito en cada pregunta de S3-008 |
| **Ofrecer "no lo sé" cuando puede ser cierto** (Principio C) | Si es razonable que la persona no conozca el dato con exactitud, la opción de decirlo explícitamente existe y no bloquea el avance. | "No lo recuerdo con exactitud" (año de inicio); "No las conozco" (semanas), ambas en S3-008 |
| **Bloquear solo lo imposible, advertir lo excepcional** (Principio G) | La validación distingue con rigor entre un dato que no puede ser cierto y un dato que simplemente es inusual. | Los tres niveles de validación de coherencia de S3-008 (imposible / extraordinario con confirmación / válido) |
| **El botón de avanzar refleja la validez real, no un progreso simulado** | "Continuar" permanece deshabilitado hasta que la respuesta sea válida — nunca se habilita antes solo para no frustrar a la persona. | Patrón constante desde S3-002 |

---

## 6. Cómo genera confianza

La confianza no se construye con una frase que diga "confía en nosotros" — se construye con que cada cosa que PensionLab hace sea consistente con lo que dijo que haría. Esta sección conecta la experiencia visible con lo que la arquitectura ya garantiza por debajo (PL-230 §6.6-§6.7), porque una promesa de trazabilidad que el motor cumple pero que la interfaz no muestra no genera ninguna confianza real en la persona que la usa.

### De dónde viene la confianza en PensionLab

- **De la explicación, no de la autoridad.** PensionLab no pide que se le crea porque es un sistema — explica el motivo de cada dato solicitado (S3-007, S3-008) y, cuando el Motor de Decisión esté implementado, explicará el origen de cada resultado (PL-230 §6.6, Explicabilidad). La confianza se gana mostrando el razonamiento, no ocultándolo detrás de una respuesta que "simplemente funciona".
- **De la honestidad sobre el progreso.** Una etiqueta de progreso que exagera lo que realmente se sabe (Principio D) erosiona la confianza en cuanto la persona descubre la exageración —por eso "Información básica registrada" y no "Completado" (S3-007).
- **De la consistencia entre pantallas.** El mismo dato se llama siempre igual, en el mismo lenguaje, en cualquier pantalla donde aparezca (el régimen actual se muestra como "Colpensiones"/"fondo privado" tanto en la pregunta original como en cualquier resumen posterior, nunca como "RPM"/"RAIS" en un lugar y en lenguaje cotidiano en otro).
- **De declarar el límite del producto desde el principio, no al final.** El texto legal *"PensionLab ofrece orientación informativa... No reemplaza la asesoría profesional ni las decisiones del usuario"* está presente desde la primera pantalla (S3-001), no escondido en un lugar que la persona nunca visita. Declarar un límite temprano genera más confianza que descubrirlo tarde.
- **De nunca sorprender con un requisito oculto.** Ninguna validación aparece por primera vez como un error después de que la persona ya invirtió tiempo respondiendo — las condiciones (ej. fecha no futura, formato del dato) se comunican junto con la pregunta, no como una sorpresa posterior.

### De reconocer sus propios cambios, no solo de no cometerlos

La confianza no depende únicamente de que PensionLab tenga razón la primera vez — depende, con la misma fuerza, de que sea capaz de reconocer y explicar cuándo una interpretación, un resultado o una estrategia cambia, y por qué cambió. Un sistema que corrige silenciosamente lo que mostró antes, sin decir que lo hizo ni por qué, genera exactamente la sospecha que este documento busca evitar: si el número de ayer y el número de hoy son distintos y nadie lo explica, la persona no sabe cuál de los dos creer, ni si puede confiar en el próximo.

Cuando un resultado cambia porque apareció información nueva o porque la persona corrigió un dato que ya había declarado, PensionLab debe decirlo de forma explícita —qué cambió, y por qué cambió—, nunca reemplazar en silencio lo que mostró antes por algo distinto. Esta no es una idea nueva en el proyecto: ya es una exigencia arquitectónica de la capacidad "Comparación" del Expediente Pensional (`expediente-pensional.md`), que obliga a atribuir toda diferencia entre dos `Simulation` a su fuente concreta —Persona/Historia, Perfil de Decisión, Contexto legal, Supuestos, fecha o escenarios— nunca a un cambio sin explicación. Lo que este documento agrega es que esa misma disciplina debe sentirse en el lenguaje de la interfaz, no solo existir en el registro técnico: la persona debe poder leer, en sus propias palabras, *qué cambió y por qué*, sin tener que inferirlo de un número distinto.

Ya existe, en la implementación actual, una primera versión técnica de este mismo criterio: en S3-008, cuando la persona edita un dato ya confirmado como excepcional, la confirmación anterior se invalida explícitamente, en vez de quedar vigente por descuido. Falta todavía —y queda como trabajo futuro de la capa de Explicabilidad (PL-230 §6.6)— que esa invalidación se traduzca en una explicación visible para la persona, no solo en un cambio de estado interno.

### La relación con la arquitectura

Esta sección no le pide nada nuevo al Motor de Decisión — lo que le pide es que, cuando sus capas de Explicabilidad y Trazabilidad (PL-230 §6.6, §6.7) entreguen su resultado a la interfaz, ese resultado se muestre siguiendo las mismas reglas de lenguaje que ya rigen el resto de la experiencia (§4): en el idioma de la persona, sin ocultar limitaciones, sin sonar a una decisión ya tomada. La confianza generada por la arquitectura y la confianza generada por la conversación son, en la experiencia real de quien usa PensionLab, la misma confianza — no dos cosas separadas que el usuario deba reconciliar por su cuenta.

---

## 7. Cómo comunica incertidumbre

*Sin certezas fingidas* (Principio C) es, de los siete principios, el que exige el desarrollo más cuidadoso, porque la incertidumbre en PensionLab tiene más de una fuente, y confundirlas sería tan dañino como ocultarlas.

### Las tres fuentes de incertidumbre, y por qué no se comunican igual

| Fuente | Qué es | Cómo se comunica | Ejemplo ya existente |
|---|---|---|---|
| **Incertidumbre de la persona** | La persona no conoce un dato de su propia historia con exactitud. | Se ofrece una opción explícita para declararlo, sin obligarla a inventar un valor ni a adivinar. | "No lo recuerdo con exactitud" / "No las conozco" (S3-008) |
| **Incertidumbre del sistema (estructural)** | El propio cálculo depende de una proyección, no de un valor ya consolidado (ej. RAIS proyectado a futuro). | Se etiqueta visiblemente como proyección, nunca como resultado definitivo, en cualquier pantalla donde aparezca. | Principio 7 de Arquitectura; extensión prevista a través de `Explanation` y su `gradoEstimacion` (PL-230 §6.6) |
| **Incertidumbre normativa** | Una norma tiene más de una interpretación válida y el proyecto no ha tomado partido definitivo por ninguna. | Se expone la existencia de interpretaciones distintas, sin presentar una de ellas como la única verdad legal. | Documentada como límite explícito en `docs/ia/principios-y-limites.md`: *"la IA no tiene autoridad para interpretar definitivamente una norma en disputa"* (ej. controversia del ancla en la fórmula RPM) |

Ninguna de las tres se resuelve "escondiéndola en una nota pequeña" ni difuminándola en el resto del texto —cada una se declara en el lugar donde la persona la necesita para entender qué tan firme es lo que está viendo, no en un lugar donde tenga que buscarla.

### Reglas de lenguaje para comunicar incertidumbre

- **Nunca presentar una estimación con la misma seguridad que un hecho consolidado.** Si un resultado depende de una proyección, la palabra "proyección" (o su equivalente en lenguaje cotidiano) debe estar en la misma oración que el número, no en un lugar aparte.
- **La incertidumbre no desaparece al resumir.** Si un dato se declaró como "no lo recuerdo con exactitud" o como una proyección, cualquier resumen o pantalla posterior que muestre ese dato debe conservar la misma calificación —igual que la Trazabilidad de PL-230 (§6.7) exige que ningún resultado pierda granularidad al agregarse.
- **Declarar una incertidumbre no es un fracaso del sistema.** El lenguaje nunca se disculpa en exceso ni trata la incertidumbre como una falla ("lamentablemente no podemos calcular esto con precisión") — la presenta como parte normal y esperable de trabajar con información real, consistente con el tono de acompañamiento del resto del producto (Principio A).

### La incertidumbre no es un defecto del expediente

Nada de lo anterior debe leerse como si la incertidumbre fuera un problema que PensionLab debería resolver desde la primera pantalla. Reconstruir una historia pensional de varias décadas —con cambios de régimen, interrupciones, aportes en distintos países— es, por naturaleza, un proceso que empieza incompleto. Eso ya lo anticipó el propio Expediente Pensional desde su primera versión: *"no es necesario tener toda la información desde el principio"* (S3-006). La incertidumbre en un dato no es un defecto del expediente en ese momento —es una característica esperable de un expediente que todavía se está construyendo.

El objetivo de PensionLab no es eliminar toda incertidumbre en la primera conversación, sino reducirla progresivamente, a medida que la persona aporta más información y esa información se vuelve verificable. Un expediente con varios datos declarados como inciertos hoy no es un expediente fallido —es un expediente honesto sobre en qué punto de ese proceso se encuentra. Lo que sí sería un defecto —y lo que este documento existe para prevenir— es que esa incertidumbre se oculte, se disuelva sin explicación en un resumen posterior, o se trate como un obstáculo a superar cuanto antes en vez de como una parte legítima y temporal del proceso.

---

## 8. Cómo comunica riesgos

Un riesgo, en PensionLab, es cualquier hecho que puede tener una consecuencia significativa y en muchos casos difícil de revertir sobre la situación pensional de una persona: una inconsistencia entre datos que ella misma declaró, una condición que no se cumple todavía, o —cuando el Motor de Decisión esté implementado— una estrategia cuya viabilidad depende de una proyección incierta. Comunicar un riesgo mal —minimizándolo, exagerándolo, o escondiéndolo en letra pequeña— es tan dañino como no comunicarlo.

### Reglas para comunicar un riesgo

| Regla | Qué significa | Ya aplicado en |
|---|---|---|
| **El riesgo se muestra en el momento de la decisión, no después** | Ninguna advertencia relevante queda relegada a un texto legal que la persona lee al final o nunca lee. | Advertencias de coherencia cronológica visibles junto al campo que las origina, no en un resumen aparte (S3-008) |
| **Se describe el hecho, no se dramatiza** | El lenguaje declara qué ocurre y por qué importa, sin recurrir a alarmismo ni a un tono que induzca pánico. | Las advertencias "extraordinarias" de S3-008 se redactan como observación factual, no como alerta roja |
| **Todo riesgo señalado viene acompañado de qué puede hacer la persona al respecto** (o de por qué, en este caso, no hay nada que hacer todavía) | Un riesgo sin ninguna acción posible asociada dificulta más de lo que ayuda. | Confirmación explícita como camino de avance ante un caso extraordinario (S3-008), en vez de un bloqueo sin salida |
| **Ningún riesgo se oculta para "proteger" a la persona de una mala noticia** | PensionLab respeta la capacidad de la persona para manejar información real sobre su propia situación — ocultar un riesgo por paternalismo contradice la Promesa (§0). | Coherente con la Filosofía (§1): PensionLab rechaza tanto el formulario que no explica como la caja negra que decide qué mostrar |
| **Toda advertencia señala su origen con claridad** | Ninguna advertencia importante aparece sin que la persona entienda exactamente qué dato o situación la generó — nunca una alerta genérica y desconectada de su causa. | Las advertencias de coherencia de S3-008 citan los valores concretos en tensión (ej. el año de inicio de cotización y las semanas declaradas), no un mensaje genérico de "hay un problema con tus datos" |

### Riesgo estructural frente a riesgo de dato

Es útil distinguir dos niveles de riesgo que este documento no debe confundir. El **riesgo de dato** —una inconsistencia entre dos respuestas de la persona, como los casos de S3-008— ya tiene un mecanismo maduro: se explica, y se resuelve con una confirmación cuando es genuinamente excepcional (Principio G). El **riesgo estructural** —por ejemplo, que una estrategia dependa de una decisión difícil de revertir, como un traslado de régimen— todavía no tiene una implementación real en el producto, porque el Motor de Decisión que lo produciría permanece, en este momento, en fase de diseño (PL-230). Este documento fija el estándar de comunicación al que ese riesgo estructural deberá responder cuando se implemente —no anticipa su contenido, consistente con el Principio 9 de Arquitectura (se generaliza cuando hay evidencia real, no por anticipación).

---

## 9. Cómo comunica oportunidades

Si un riesgo es un hecho con una consecuencia adversa posible, una oportunidad es un hecho con una consecuencia favorable posible —y merece exactamente el mismo cuidado para no cruzar la línea que separa *orientar* de *decidir* (Principio B).

### Reglas para comunicar una oportunidad

- **Una oportunidad se presenta como relevancia, no como instrucción.** El lenguaje correcto es de la forma "esto podría ser relevante para ti, dado lo que nos has contado" — nunca "deberías hacer esto" o "esto es lo que te conviene". Es la traducción, a nivel de lenguaje, de lo que la Brújula Pensional hace a nivel de arquitectura (PL-230 §6.5): señala dirección sin caminar por la persona.
- **Ninguna oportunidad se presenta con más certeza de la que realmente tiene.** Si una oportunidad depende de una proyección (ej. una estimación RAIS a futuro), esa oportunidad lleva la misma calificación de incertidumbre que exige el Principio C — una oportunidad "probable" nunca se redacta como una oportunidad "segura".
- **PensionLab nunca fabrica urgencia artificial.** Frases como "aprovecha antes de que cambie" o "solo por tiempo limitado" no tienen lugar en PensionLab, salvo que exista un plazo legal real, verificable y con fecha citable —y aun en ese caso, se comunica como un hecho con fecha, no como una técnica de persuasión. Generar una sensación de urgencia que no corresponde a un hecho real sería exactamente el tipo de manipulación que la Promesa (§0) existe para prevenir.
- **Ninguna estrategia u oportunidad se presenta aislada de las demás.** Igual que el Comparador de Estrategias nunca oculta ni atenúa una alternativa frente a otra (PL-230 §6.4), el lenguaje de la interfaz nunca hace que una oportunidad "brille" a costa de invisibilizar las alternativas junto a las que debería compararse.

### Una oportunidad que se promete deja de ser una oportunidad

Existe una línea fina, y fácil de cruzar sin darse cuenta, entre señalar una oportunidad y prometer un resultado. En el momento en que el lenguaje de una oportunidad empieza a sonar a garantía —"esto te va a beneficiar", "vas a lograr..."—, deja de ser una oportunidad y se convierte en una promesa que PensionLab no está en posición de cumplir, porque ningún resultado pensional real depende únicamente del sistema: depende de la normativa vigente, de la historia de la persona, y de decisiones que ella misma tomará después. Toda oportunidad señalada por PensionLab debe poder leerse en modo condicional —"podría", "dado lo que sabemos hasta ahora"— nunca en modo garantizado. Si una oportunidad no puede formularse en modo condicional sin perder sentido, probablemente no debería comunicarse todavía.

Como con el riesgo estructural (§8), la comunicación real de oportunidades específicas —estrategias, alineación con prioridades— depende de un Motor de Decisión todavía no implementado. Esta sección fija el estándar que esa comunicación deberá cumplir cuando exista, no un ejemplo ya construido en el producto.

---

## 10. Principios de diseño conversacional

Esta sección no introduce reglas nuevas — reúne, en forma de reglas de flujo aplicables a cualquier pantalla, lo que las secciones anteriores ya establecieron sobre lenguaje (§4), preguntas (§5), confianza (§6) e incertidumbre (§7-§9). Es la capa de diseño que hace posible auditar, pantalla por pantalla, si esos principios se están cumpliendo en la práctica —y sirve de base directa al checklist de evaluación (§12).

| Principio de flujo | Qué exige | Principio(s) del que se deriva |
|---|---|---|
| **Progresión con sentido** | Cada pantalla avanza el Expediente Pensional un paso reconocible; ninguna pantalla existe solo para "rellenar" el flujo sin agregar algo que la persona entienda como progreso real. | D (Progreso sin maquillaje) |
| **Reversibilidad siempre disponible** | Toda pantalla ofrece una forma de volver atrás sin perder lo ya capturado. | E (Ninguna puerta sin salida) |
| **Ninguna respuesta obliga a inventar un dato** | Si es razonable no saber algo, existe una salida explícita distinta de forzar un valor arbitrario. | C (Sin certezas fingidas) |
| **Validar sin acusar** | Una respuesta inconsistente se señala y se explica; nunca se trata como un error de la persona. | G (Cuidar la coherencia) |
| **Un patrón visual por tipo de decisión** | Una pregunta de selección única siempre se presenta con el mismo patrón accesible (`<fieldset>`/`<legend>` + `input radio`), sin variarlo de pantalla a pantalla sin una razón real. | Consistencia derivada de A y F; patrón ya establecido desde `Objetivo.jsx` (S3-002) y reutilizado en cada Slice posterior |
| **Ninguna pantalla es un callejón sin salida conversacional** | Incluso cuando una respuesta es "no lo sé" o revela una inconsistencia, la conversación siempre ofrece un siguiente paso claro. | A, E, G combinados |
| **Orientación constante en el recorrido** | En cualquier punto del flujo, la persona puede entender fácilmente qué ya hizo, qué está haciendo ahora, y qué sigue después — sin tener que reconstruirlo por su cuenta. | D (Progreso sin maquillaje) y A (Conversar, no interrogar); ya materializado, aunque todavía sin un componente compartido, en el checklist de "Completemos tu expediente" (S3-007) y en los resúmenes por bloques de cada vista temporal (S3-005, S3-006) |
| **Generalizar solo con evidencia real** | Ningún componente conversacional (ej. un patrón de wizard genérico, un sistema de mensajes compartido) se extrae antes de que exista un segundo caso real que lo justifique. | Principio 9 de Arquitectura, ya aplicado explícitamente en S3-007 (decisión de no implementar `ProgressStepper.jsx` sin un segundo caso) y S3-008 (decisión de no extraer un componente de wizard genérico) |

Este último punto merece una precisión: los Principios de diseño conversacional de esta sección rigen *cómo debe comportarse* una conversación nueva —no obligan a construir, de forma anticipada, la infraestructura técnica que la sostendría. La disciplina de "generalizar solo con evidencia real", ya vigente en la arquitectura del proyecto, aplica exactamente igual a los componentes de experiencia conversacional que a cualquier otro componente del sistema.

---

## 11. Ejemplos prácticos de buenas y malas interacciones

Los ejemplos "✅" de esta sección son textos reales, ya aprobados en Sprint 3 — no se inventan para este documento. Los ejemplos "❌" son contraejemplos ilustrativos: ninguno de ellos representa un problema real del producto actual; existen para mostrar, de forma concreta, qué aspecto tendría violar cada principio.

| Situación | ✅ Cómo lo hace PensionLab | ❌ Cómo NO debe hacerlo | Principio |
|---|---|---|---|
| Preguntar el régimen actual | *"¿Dónde estás afiliado actualmente?"*, con opciones en lenguaje cotidiano ("Colpensiones", "fondo privado") y la opción "No estoy seguro" (S3-004) | "Seleccione su régimen pensional (RPM/RAIS)", sin explicación y sin opción para quien no lo sabe | F, C |
| Preguntar semanas cotizadas | *"¿Sabes cuántas semanas has cotizado?"*, con tres niveles de respuesta y explicación previa de por qué se pregunta (S3-008) | Un campo numérico obligatorio ("Semanas cotizadas: ___") sin explicación, que obliga a inventar un número para poder continuar | A, C |
| Etiquetar el progreso | *"Información básica registrada"* (S3-007) | "¡Completado! ✅" para un bloque que podría necesitar más información más adelante | D |
| Advertir una inconsistencia | Mensaje que cita los valores concretos en tensión, en tono factual, con opción de confirmar (S3-008) | "Error: los datos no coinciden", bloqueando el avance sin explicación ni salida | G, regla de §8 sobre origen de la advertencia |
| Comunicar una oportunidad (hipotético — el Motor de Decisión aún no está implementado) | "Esta alternativa podría ajustarse a lo que nos dijiste que te importa más, dado lo que sabemos hasta ahora." | "Esta es la mejor opción para ti. Recomendamos que la elijas." | B, reflexión de §9 sobre oportunidad vs. promesa |
| Permitir corregir una respuesta anterior | "Volver" presente junto a "Continuar" en toda pantalla, desde S3-001 | Un flujo que solo permite avanzar, sin posibilidad de corregir una respuesta anterior | E |
| Reconocer un cambio (hipotético, ligado a §6) | "Actualizamos esta estrategia porque corregiste el año en que empezaste a cotizar." | Mostrar un nuevo resultado distinto al anterior sin ninguna nota de que cambió, ni de por qué | Nueva subsección de §6, "De reconocer sus propios cambios" |

Un ejemplo adicional merece mencionarse aparte, porque no es hipotético sino un caso real de autocorrección durante el propio desarrollo: la pregunta sobre semanas cotizadas en S3-008 se redactó inicialmente como *"¿Conoces...?"* y se cambió a *"¿Sabes...?"* durante la revisión del Slice, por decisión explícita de que *"PensionLab debe conversar con la persona, no interrogarla"*. Es, en sí mismo, el mejor ejemplo de que estos principios no son una imposición externa al proceso de Sprint 3 — son una descripción de un criterio que el propio equipo ya venía aplicando antes de que este documento existiera.

---

## 12. Checklist de evaluación para cualquier nueva pantalla

Este checklist es el instrumento de verificación de este documento — la forma concreta en que se audita si una pantalla nueva (incluida la que retome S3-009) cumple los principios de las secciones anteriores, antes de aprobarla.

**Lenguaje y tono**
- [ ] ¿La pantalla usa "tú", nunca "usted" ni construcciones impersonales?
- [ ] ¿El vocabulario visible es el que la persona reconoce de su vida diaria, no la nomenclatura técnica del dominio?
- [ ] ¿Ninguna frase presenta una alternativa como "la mejor" o "la recomendada", de forma implícita o explícita?

**Preguntas**
- [ ] ¿Cada dato solicitado tiene una explicación visible de por qué se necesita, antes o junto con la pregunta?
- [ ] Si el dato puede ser razonablemente desconocido por la persona, ¿existe una opción explícita para decirlo, sin forzar un valor inventado?
- [ ] ¿Las preguntas están agrupadas o separadas según si comparten naturaleza y necesidad de explicación, y no solo por conveniencia visual?

**Validación y coherencia**
- [ ] ¿La validación distingue lo imposible (bloquea) de lo simplemente inusual (advierte y permite confirmar)?
- [ ] ¿Toda advertencia identifica con claridad qué dato o situación la originó?
- [ ] ¿Ninguna advertencia usa un tono de corrección punitiva hacia la persona?

**Progreso y navegación**
- [ ] ¿La etiqueta de progreso describe solo lo que es verificablemente cierto?
- [ ] ¿Existe siempre una forma de volver atrás sin perder los datos ya capturados?
- [ ] ¿La persona puede entender, en cualquier momento, qué ya hizo, qué está haciendo, y qué sigue?

**Incertidumbre, riesgos y oportunidades**
- [ ] ¿Toda estimación o proyección está calificada como tal, y no presentada como un hecho consolidado?
- [ ] ¿Todo riesgo relevante se muestra en el momento de la decisión, no oculto ni diferido?
- [ ] ¿Ninguna oportunidad se comunica en modo garantizado ("vas a lograr...") en vez de modo condicional ("podría...")?

**Consistencia con la arquitectura**
- [ ] ¿La pantalla evita introducir un componente genérico nuevo sin evidencia de un segundo caso real que lo justifique (Principio 9 de Arquitectura)?
- [ ] Si la pantalla presenta un resultado o cálculo, ¿es trazable hasta su origen (Principio 3 de Arquitectura; PL-230 §6.6-§6.7)?

Este checklist no reemplaza la revisión editorial humana —está diseñado para guiarla, no para automatizarla. Ninguna prueba automatizada puede verificar tono o intención; quien aprueba un Slice sigue siendo responsable de aplicar este criterio con juicio, no solo de marcar casillas.

---

## 13. Relación con el resto de la arquitectura de PensionLab

| Documento / concepto | Relación con PL-240 | Qué NO hace este documento respecto a él |
|---|---|---|
| **PL-230 — Arquitectura del Motor de Decisión** | PL-230 rige qué se calcula y cómo se estructura (evidencia, estrategias, comparación, orientación); PL-240 rige cómo se dice todo eso en la interfaz. La Brújula Pensional (PL-230 §6.5) y la capa de Explicabilidad (PL-230 §6.6) son, en la práctica, el punto exacto donde ambos documentos se encuentran. | No modifica ningún componente, contrato ni responsabilidad definida en PL-230. |
| **Principios de Arquitectura (Sprint 1, 10 principios)** | Los siete Principios fundamentales de PL-240 (§3) son el equivalente, en el dominio de experiencia, de estos diez principios en el dominio de arquitectura — cada uno extiende directamente uno o más de ellos (C extiende los Principios 5 y 7; D y G extienden el Principio 4; B extiende el Principio rector de PL-230). | No reemplaza ni reinterpreta los diez Principios de Arquitectura — los dos conjuntos coexisten, cada uno en su propio dominio. |
| **`docs/ia/principios-y-limites.md`** | Comparte la misma exigencia de declarar la incertidumbre en vez de ocultarla (su Principio 3, citado en §7 de este documento) y la misma convicción de que la decisión final es siempre humana. | No decide si PensionLab usará IA de cara al usuario final — esa pregunta permanece, explícitamente, sin diseñar. |
| **Metodología de Sprint 3 (Vertical Slices)** | El checklist de §12 se aplica dentro del mismo ciclo ya vigente de propuesta → revisión → aprobación → implementación de cada Slice — le da a ese ciclo un criterio compartido de experiencia. | No cambia la metodología de Slices ni exige un paso adicional distinto a los que ya existen. |
| **README — "Filosofía del proyecto"** | Las cuatro afirmaciones del README ("un número sin explicación no sirve", "lo legal, lo asumido y lo calculado se mantienen separados", "preferimos ser honestos sobre lo que no sabemos", "se documenta antes de construir") son el origen de todo lo que este documento desarrolla en detalle para la experiencia. | No reemplaza esas afirmaciones ni las vuelve obsoletas — las hace operativas a nivel de conversación. |

La aprobación de este documento establece PL-240 como referencia de Filosofía de Experiencia de la Biblioteca de Conocimiento de PensionLab, con el mismo estatus que PL-230 ya tiene para la arquitectura del Motor de Decisión. No autoriza, por sí misma, ningún cambio retroactivo sobre los Slices ya cerrados de Sprint 3 (S3-001 a S3-008). Sí es, a partir de su aprobación, el criterio obligatorio de revisión para cualquier pantalla nueva —incluida la reanudación de S3-009, que este documento pausó deliberadamente para poder existir.

---

## 14. Riesgos

**1. Que estos principios queden como aspiración sin verificación real.** Mitigado por diseño: el checklist de §12 existe precisamente para que cada Slice futuro se audite contra ellos de forma explícita, no solo se les invoque en la conversación.

**2. Tensión entre "Progreso sin maquillaje" (D) y presión futura de negocio o mercadeo por mostrar más avance del que existe.** Es un riesgo real de producto, no una preocupación hipotética —muchas herramientas financieras exageran el progreso del usuario para mejorar métricas de retención. Se registra aquí para que cualquier decisión futura que se aparte de este principio sea consciente y documentada, no una erosión gradual sin decisión (consistente con el cierre de §3).

**3. Que "Cuidar la coherencia" (G) se vuelva más estricto de lo previsto a medida que crezcan las reglas reales de validación.** Mismo tipo de riesgo que PL-230 §9 (riesgo 7) señala para el Motor de Evidencias: sin categorización, la lógica de coherencia puede crecer sin orden. El futuro Motor de Coherencia del Expediente, ya anticipado en la Decisión 7 de S3-008, deberá heredar el mismo criterio de "advertir, no bloquear salvo lo imposible" cuando se diseñe formalmente.

**4. Que alguna pantalla ya cerrada (S3-001 a S3-008) no cumpla plenamente algún principio de este documento al revisarse en retrospectiva.** No se resuelve aquí —está fuera del alcance de este documento (§2)— y no invalida su aprobación: es trabajo de auditoría posterior, a decidir por el equipo del proyecto, no un bloqueo de este documento.

**5. Que "ninguna urgencia artificial" (§9) entre en tensión con futuros objetivos comerciales de crecimiento o retención.** Se registra explícitamente para que cualquier excepción futura sea una decisión consciente y documentada, no una erosión progresiva del principio sin que nadie la decida así.

**6. Riesgo de percepción, no solo de intención.** Igual que PL-230 §9 (riesgo 8) señala para la Brújula Pensional, ninguna prueba automatizada puede verificar si el tono real de una pantalla se percibe como acompañamiento o como imposición —el checklist de §12 depende, en última instancia, del juicio humano de quien revisa cada Slice, no de una regla mecánica.

## 15. Decisiones

### Decisiones tomadas en este documento

1. Se establece PL-240 como documento fundacional de Filosofía de Experiencia, con rango equivalente —dentro de su propio dominio— al de PL-230 dentro del suyo.
2. Se declara la Promesa de PensionLab (§0) como la razón de ser que antecede a la Filosofía (§1) y a los Principios fundamentales (§3).
3. Se fijan siete Principios fundamentales de experiencia (§3): Conversar no interrogar, Brújula no piloto automático, Sin certezas fingidas, Progreso sin maquillaje, Ninguna puerta sin salida, El idioma de la persona, y Cuidar la coherencia.
4. Se establece que ninguna decisión de diseño futura puede contradecir estos principios sin una decisión explícita y documentada (cierre de §3).
5. Se fija el checklist de §12 como criterio obligatorio de revisión para cualquier pantalla nueva, incluida la que retome S3-009.
6. Se declara explícitamente que este documento no modifica ningún contrato de dominio, ningún Slice ya cerrado de Sprint 3, ni decide sobre IA de cara al usuario final.

### Decisiones explícitamente pendientes

7. **El mecanismo concreto** (no solo el criterio) para que la interfaz refleje "reconocer sus propios cambios" (§6) cuando el Motor de Decisión produzca resultados distintos entre una `Simulation` y otra — depende de que la capacidad "Comparación" (`expediente-pensional.md`) y el Comparador de Estrategias resuelvan su propia relación pendiente (PL-230 §10, pendiente 14).
8. **Si el checklist de §12 debe formalizarse** como plantilla de aprobación de Slice (ej. una sección fija en `cierre-sprint-3.md`) o si permanece como criterio de referencia sin formato obligatorio.
9. **Cuándo se justifica migrar** la lógica de coherencia hoy contenida en `InformacionPensionalEsencial.jsx` a un Motor de Coherencia del Expediente propiamente dicho — este documento reafirma el criterio de comunicación que ese futuro componente deberá cumplir (§8, principio G), pero no resuelve cuándo se construye, consistente con el Principio 9 de Arquitectura.
10. **Si una auditoría retrospectiva** de S3-001 a S3-008 contra los principios de este documento es necesaria antes de retomar S3-009, o si basta con aplicar el checklist hacia adelante — queda como decisión del equipo del proyecto, no de este documento.

---

## Epílogo

La tecnología detrás de PensionLab cambiará. El Motor de Decisión se terminará de implementar, se corregirá, tal vez se rediseñará por completo. La normativa pensional colombiana seguirá reformándose, como lo ha hecho antes. Los componentes que hoy son diseño —el Motor de Evidencias, el Comparador de Estrategias, la Brújula Pensional— eventualmente se construirán, y algún día también ellos serán reemplazados por algo mejor.

Nada de eso debería cambiar la forma en que PensionLab acompaña a una persona que intenta entender su propia historia.

Este documento no existe para fijar un estilo de redacción ni una lista de reglas de interfaz. Existe para proteger algo más difícil de recuperar una vez que se pierde: la manera en que una persona se siente tratada cuando le pregunta a PensionLab por su pensión. Esa manera no depende de qué motor de cálculo corre por debajo, de qué framework construye la pantalla, ni de qué reforma legal esté vigente ese año. Depende de si PensionLab sigue conversando en vez de interrogar, sigue señalando el camino en vez de caminarlo por la persona, y sigue diciendo la verdad sobre lo que no sabe.

Mientras esa promesa se sostenga, PensionLab seguirá siendo PensionLab — sin importar cuánto cambie todo lo demás.
