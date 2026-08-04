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

## Operaciones sensibles (git, datos legales)

Las acciones difíciles de revertir o visibles fuera del entorno local (commits,
tags, `git push`, cambios a datos ya validados) se ejecutan solo tras confirmación
explícita, mostrando primero el resultado exacto de la operación (diff, log,
mensaje de commit propuesto) antes de ejecutarla.
