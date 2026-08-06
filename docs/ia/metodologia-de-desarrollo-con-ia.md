# Metodología de desarrollo con IA en PensionLab

## Objetivo

Formalizar el patrón de trabajo que se ha usado de facto a lo largo del proyecto,
para que cualquier persona (incluido un futuro colaborador humano) entienda cómo se
toman las decisiones cuando hay IA involucrada.

## El patrón: proponer → documentar → aprobar → implementar

Ninguna decisión de arquitectura, dato legal o fórmula se escribe primero en
código. El ciclo repetido durante todo el proyecto fue:

1. **Proponer** — el asistente de IA presenta una propuesta concreta (estructura,
   contrato, fórmula, plan), nunca código de una vez.
2. **Documentar** — la propuesta se escribe como documento (contratos JSDoc,
   `trazabilidad-*.md`, documentos de arquitectura con diagramas Mermaid) antes de
   convertirse en código ejecutable.
3. **Aprobar** — el humano revisa, ajusta, o rechaza. Ningún archivo de código se
   crea sin una aprobación explícita previa sobre su diseño.
4. **Implementar** — solo después de la aprobación se escribe el código, y se
   verifica con pruebas ejecutadas de verdad, no con cálculos estimados a mano.

## Roles

- **El humano decide y aprueba.** Toda decisión legal, arquitectónica o de
  producto requiere aprobación explícita — el asistente de IA nunca asume una
  decisión de este tipo por su cuenta, incluso cuando tiene una recomendación
  clara.
- **El asistente de IA investiga, propone, documenta e implementa bajo
  aprobación.** Incluye investigar fuentes oficiales (ej. la matriz de
  trazabilidad normativa), señalar hallazgos inesperados en vez de resolverlos en
  silencio, y verificar resultados con ejecución real antes de presentarlos como
  válidos.

## Revisión cruzada entre asistentes de IA

En muchas decisiones importantes del proyecto —particularmente las de arquitectura y de
consolidación conceptual— el patrón de trabajo no fue "un asistente propone, el humano aprueba" de
forma directa, sino un ciclo adicional de contraste entre dos asistentes de IA distintos:

1. Un asistente desarrollaba una propuesta concreta.
2. Esa propuesta se sometía a revisión crítica por parte de otro asistente, con instrucción
   explícita de intentar refutarla, no de confirmarla.
3. Ambas posiciones —la propuesta original y la crítica— se contrastaban entre sí.
4. Carlos Peraza, responsable del proyecto, analizaba la evidencia resultante de ese contraste y
   tomaba la decisión final.
5. Solo el conocimiento que sobrevivía a ese proceso completo se documentaba como parte del
   proyecto.

Durante Sprint 3, los dos asistentes involucrados en este patrón fueron ChatGPT (OpenAI) y Claude
(Anthropic).

### Qué es, y qué nunca fue, esta práctica

- **Fue** una práctica metodológica para aumentar el rigor del análisis — una forma deliberada de
  someter cada propuesta a un intento genuino de refutación antes de aceptarla, en vez de confiar en
  una sola fuente de razonamiento.
- **Nunca sustituyó** la validación normativa, jurídica o técnica. Que dos asistentes de IA
  coincidieran sobre una interpretación no la convertía en correcta frente a la ley, los datos o el
  comportamiento real del sistema — esa verificación siguió dependiendo siempre de fuentes primarias
  y de ejecución real (ver "Validación desde el origen", más abajo en este mismo documento).
- **Nunca reemplazó** la decisión humana. Ningún acuerdo entre asistentes se tradujo en una decisión
  de arquitectura, de producto o de alcance sin pasar antes por la aprobación explícita de Carlos
  Peraza, bajo el mismo criterio ya descrito en "Roles".
- **Nunca convirtió el consenso entre modelos en un criterio de verdad.** Si ambos asistentes
  coincidían, eso no bastaba por sí solo para considerar algo correcto; si discrepaban, la
  discrepancia era información para el responsable del proyecto, no un empate a resolver por
  votación.

### Lo que tiene valor permanente

Los nombres concretos de las herramientas usadas —ChatGPT, Claude— forman parte de la historia del
proyecto y se registran aquí con esa honestidad. Pero lo que tiene valor permanente, más allá de qué
herramientas existan o se sigan usando en el futuro, es la **metodología de revisión cruzada en sí
misma**: proponer, someter a refutación independiente, contrastar, decidir con evidencia, y
documentar solo lo que sobrevive. Esa disciplina es reproducible con cualquier combinación de
herramientas —incluida ninguna— y es ella, no las marcas involucradas, lo que este documento existe
para preservar.

## Cómo se manejan los hallazgos inesperados

Varias veces durante el proyecto, investigar antes de codificar sacó a la luz
problemas que no se habían anticipado: una controversia legal real (el ancla del
incremento de tasa de reemplazo en RPM), un vacío de diseño (el cálculo de IBL, que
no existe todavía), o una norma bajo litigio activo (el SMLV 2026). El patrón
adoptado fue siempre el mismo: señalar el hallazgo explícitamente, explicar sus
implicaciones, y pedir una decisión — sin resolverlo unilateralmente ni ocultarlo
para no interrumpir el avance.

## Estándares de documentación adoptados

- Todo documento de arquitectura importante sigue la estructura: Principios,
  Diagrama general, Objetivo, Diseño, Riesgos, Decisiones, Próximos pasos.
- Los diagramas se hacen en Mermaid — un buen diagrama suele explicar la
  arquitectura mejor que varias páginas de texto.
- Ningún cambio de arquitectura se implementa sin su documento de diseño aprobado
  primero.

## Validación desde el origen (vigente desde 2026-08-03)

Adoptada tras detectar, en revisión funcional, que `DatosIniciales.jsx` (Sprint
3) permitía escribir días imposibles (`13245`, negativos, decimales) y no
imponía una edad mínima funcional — casos que debieron anticiparse en el
diseño, no descubrirse probando.

Toda pantalla, formulario o componente que capture información del usuario se
diseña, desde la fase de propuesta y antes de escribir código, considerando
explícitamente:

- formato permitido, longitud máxima y mínima, rango de valores válido,
  caracteres permitidos;
- coherencia con otros campos, fechas imposibles, números negativos sin
  sentido, valores futuros o pasados según corresponda;
- validaciones dependientes de otros campos, casos límite y valores extremos;
- mensajes claros para la persona cuando un dato es inválido.

Cada propuesta de pantalla nueva que capture datos incluye una sección
**"Validaciones consideradas"**: qué se implementó, qué se decidió no
implementar y por qué, y qué debe implementarse después en `domain/`. Si una
validación es discutible o depende de una decisión de negocio, se presenta
para decisión explícita — no se implementa unilateralmente. Solo se
implementan validaciones que aportan calidad real o previenen errores
concretos, no complejidad por si acaso (Principio 9).

Antes de cerrar cualquier Slice que capture información del usuario, se hace
una revisión crítica explícita: qué datos inválidos podrían ingresar, qué
entradas podrían romper un cálculo futuro, qué inconsistencias podrían
aparecer entre campos, qué errores podría cometer la persona por accidente, y
qué validaciones faltan antes de dar la pantalla por terminada.

Esta regla se apoya en el Principio de Arquitectura 11 (validación en capas,
`plan-implementacion-prerrequisitos-pension-engine.md`): las validaciones de
interfaz mejoran la experiencia y evitan capturar basura obvia, pero nunca
reemplazan la validación de dominio — cuando un dato llega por primera vez a
un componente de `domain/`, ese componente valida de nuevo sus entradas y
falla de forma explícita, sin asumir que la UI ya lo hizo.

## Explicar todo bloqueo (vigente desde 2026-08-03)

Adoptada tras detectar que `DatosIniciales.jsx` bloqueaba "Continuar" ante una
edad fuera del rango funcional del MVP —y, se descubrió en la misma
revisión, ante una fecha futura— sin mostrar ningún mensaje: la persona veía
el botón deshabilitado sin ninguna pista de qué dato revisar.

**Toda validación que impida continuar debe mostrar un mensaje visible,
específico y accionable**: qué dato revisar y por qué. Nunca un mensaje
genérico ("Dato inválido", "Error de validación"), y nunca dejar a la persona
adivinar cuál fue el problema. Cuando sea posible, el mensaje repite el valor
o la cifra derivada que causó el bloqueo (ej. la edad calculada), no solo la
regla abstracta que se incumplió.

Al proponer o revisar cualquier pantalla que capture datos, se audita
explícitamente cada condición que pueda dejar "Continuar" deshabilitado, y se
confirma que cada una tiene su propio mensaje visible — o se deja registrado,
con su razón, por qué esa condición en particular no lo necesita (ej. un campo
todavía vacío mientras la persona edita no es un error que explicar, es
incompletitud normal). Esta regla se aplica junto con "Validación desde el
origen" (arriba): una no sustituye a la otra — una decide *qué* se valida,
esta decide *cómo se comunica* cuando la validación bloquea el avance.

## Operaciones sensibles (git, datos legales)

Las acciones difíciles de revertir o visibles fuera del entorno local (commits,
tags, `git push`, cambios a datos ya validados) se ejecutan solo tras confirmación
explícita, mostrando primero el resultado exacto de la operación (diff, log,
mensaje de commit propuesto) antes de ejecutarla.
