# Oportunidades futuras de PensionLab

Registro vivo de ideas de producto que surgen durante el desarrollo pero que
**no pertenecen al alcance actual** — ni al Sprint en curso, ni a un backlog
comprometido. Cada entrada documenta el origen y la forma que podría tomar la
idea, sin decidir todavía si ni cuándo se construye. **No es un backlog:**
nada aquí está priorizado ni aprobado para implementación — es un lugar para
no perder la idea, no una promesa de construirla.

---

## Ejecución temporal de un camino: pesos de hoy, valores nominales y SMMLV

**Origen del hallazgo:** surgió durante el cierre del Slice "Motor de
caminos RAIS", al analizar qué significa ejecutar en el tiempo un camino
calculado bajo la Convención Económica v1 (ver
`trazabilidad-formula-RAIS.md`). El Motor expresa IBC, saldo, objetivo,
restricción de costo y resultado en pesos de hoy — un nivel constante de
poder adquisitivo, no el mismo número nominal sostenido durante todo el
horizonte. Esa convención es correcta para la lectura de hoy, pero no debe
leerse como una instrucción de que la persona deba mantener ese valor
nominal exacto congelado a lo largo del camino.

**Conclusión:** el valor nominal necesario en cada momento deberá
actualizarse utilizando la información económica efectivamente observada y
vigente en ese momento (IPC, SMMLV publicado del año correspondiente) —
nunca proyectando o inventando hoy un aumento futuro del SMMLV. Mismo
criterio de honestidad que ya rige hoy el tope legal de 25 SMMLV en el
camino alternativo (`TOPE_IBC_CON_SMMLV_VIGENTE`): evaluar siempre con el
dato vigente conocido, nunca con una proyección. Esta traducción periódica
— del objetivo, y también de la restricción de costo, capturados bajo la
misma convención — sería responsabilidad de una futura capacidad de
seguimiento/ejecución de caminos, todavía inexistente en el producto.

**Distinción a resolver, si se retoma: meta en pesos de hoy vs. meta en
múltiplos de SMMLV.** Son dos convenciones de "términos reales" distintas
que representan compromisos económicos diferentes a través del tiempo — el
SMMLV no necesariamente crece al mismo ritmo que el IPC general (su
ajuste anual es una decisión propia, no una indexación automática a la
inflación). Una persona cuyo objetivo es "2.5 SMMLV mensuales" tiene un
compromiso distinto, año a año, de una persona cuyo objetivo es "el poder
adquisitivo actual de $4.500.000" — aunque hoy, al capturar el dato, ambas
cifras puedan coincidir numéricamente. El Motor actual no distingue entre
ambas porque solo captura un monto en pesos; esa distinción explícita
queda pendiente.

No implica ningún cambio en las fórmulas RAIS actuales — `formulaRAIS.js`
sigue siendo correcta bajo la Convención Económica v1 tal como está; esto
es exclusivamente sobre qué hace falta para *ejecutar* un camino elegido
a lo largo del tiempo, responsabilidad que hoy no existe en el producto.

**Decisión actual: no implementar.** No existe hoy ninguna capacidad de
seguimiento/ejecución de caminos en el producto — esta traducción
periódica solo tendría sentido cuando esa capacidad se construya.

**Condición para revisarla más adelante:** que se diseñe una capacidad
real de seguimiento/ejecución de un camino elegido (persistencia de
expediente y estrategia, actualización con datos observados) — mismo
Principio 9 ya aplicado en el resto de este documento: no generalizar sin
evidencia real.

---

## Caminos "equilibrados" adicionales en el Motor de caminos RAIS

**Origen de la idea:** surgió durante la revisión de cierre del Slice
"Motor de caminos RAIS", al preguntarse si, además del camino base y el
camino que alcanza exactamente el objetivo declarado, debería existir un
tercer camino "intermedio" — por ejemplo, uno que alcance el 90% del
objetivo con una fracción menor del esfuerzo.

**Hallazgo matemático (análisis dedicado, con las fórmulas reales del
proyecto y el fixture `rais-independiente-colombia` como caso de estudio):**
manteniendo constantes el capital inicial, el horizonte y los supuestos de
`data/assumptions`, el resultado proyectado es una función **afín (lineal)**
del IBC — la eficiencia marginal (resultado adicional por peso adicional de
costo) es exactamente constante en todo el tramo entre el camino base y el
camino que cumple el objetivo (verificado numéricamente en 0%, 25%, 50%,
75% y 100% del incremento: la misma eficiencia hasta el sexto decimal). El
único quiebre real de esa recta es el tope legal de 25 SMMLV, que el
dominio ya maneja correctamente.

**Conclusiones de producto a conservar:**
- No existe, hoy, un punto intermedio objetivamente más eficiente que otro
  — cualquier punto sobre esa recta tiene la misma relación
  beneficio/costo. Un "camino equilibrado" no es algo que el modelo actual
  pueda descubrir; sería una preferencia arbitraria disfrazada de hallazgo.
- Por eso, PensionLab **no debe fabricar ni mostrar siempre** un camino
  "equilibrado" adicional junto al base y al que cumple el objetivo.
- Un camino adicional solo debería aparecer cuando exista una **ventaja
  material, cuantificable y explicable** — nunca como una opción de
  relleno para dar sensación de variedad.
- PensionLab puede señalar que **modificar la meta declarada** merece
  explorarse cuando exista evidencia objetiva de que vale la pena (ej. una
  meta ligeramente distinta que resulte desproporcionadamente más
  alcanzable) — pero **nunca debe cambiar la meta original sin una
  decisión expresa de la persona**: mostrar la posibilidad no es lo mismo
  que decidir por ella.
- La restricción de costo adicional ya existente
  (`restriccionCostoPensionalAdicionalMaximoMensual`) **ya resuelve** la
  necesidad real detrás de esta pregunta: dado que la relación es lineal,
  el mejor resultado alcanzable dentro de cualquier presupuesto que la
  persona declare es exactamente lo que esa restricción ya calcula hoy —
  no hace falta ningún camino nuevo para responder "¿qué logro con menos
  esfuerzo?".

**Dimensiones que sí podrían producir relaciones distintas (no lineales) —
pendientes de estudio, no de implementación:** duración del esfuerzo
(aumentar el IBC solo durante una parte del horizonte), momento en que
comienza el esfuerzo, y el horizonte elegido (`edadJubilacionDeseada`) en
sí mismo — este último entra en la fórmula de forma exponencial/compuesta,
a diferencia del IBC, así que podría tener una curvatura genuina que el eje
IBC no tiene. Ninguna de estas dimensiones tiene soporte real en el Motor
actual (que asume un aporte mensual constante durante todo el horizonte,
fijado desde hoy) — estudiarlas pertenece al futuro Motor de decisión, no
a una extensión menor del Motor de caminos RAIS actual.

**Decisión actual: no implementar.** El modelo actual no ofrece fundamento
matemático para un camino intermedio nuevo, y el mecanismo que resolvería
la necesidad real (explorar con menos esfuerzo) ya existe.

**Condición para revisarla más adelante:** que se investiguen las
dimensiones no lineales señaladas arriba (duración, momento de inicio,
horizonte) y se encuentre evidencia real de curvatura aprovechable en
alguna de ellas — no la sola preferencia estética de mostrar una tercera
opción.

---

## Formateo monetario en vivo mientras se escribe

**Origen de la idea:** surgió durante el mini-Slice "Formato monetario
consistente en campos de entrada" (revisión UX del MVP): los 5 campos
monetarios de PensionLab (`BaseCotizacion.jsx` ×2, `ExploraTuProyeccion.jsx`
×3, todos vía `useCampoMonetario.js`) hoy solo muestran separadores de miles
al perder el foco — mientras la persona escribe, ve dígitos sin formato
(ej. `7000000`). La idea es que, eventualmente, se vea formateado durante
toda la edición (ej. `$ 7.000.000`), no solo al terminar.

**Decisión adoptada para el MVP actual:** se implementa únicamente el
prefijo visual `$` fijo (fuera del valor editable), conservando el
comportamiento actual de separadores solo al perder el foco. El formateo en
vivo se pospone deliberadamente — no por ser inviable, sino para no
introducir esa complejidad y ese riesgo adicional en el cierre del MVP
actual.

**Hallazgos de la revisión previa a conservar, si se retoma:**
- El valor interno debe seguir siendo exclusivamente una cadena de dígitos
  — el contrato de `onCambiar` no debe cambiar; es lo que hoy garantiza que
  ningún separador ni el símbolo `$` lleguen al dominio.
- Manejo explícito de la posición del cursor al insertar o eliminar un
  dígito en medio del valor (cada dígito nuevo puede desplazar la cantidad
  de separadores a la izquierda del cursor).
- Backspace/Delete inmediatamente junto a un separador — el caso más
  delicado: hay que saltar el separador y borrar el dígito, no dejar la
  tecla "sin efecto visual".
- Selección de un rango que cruce un separador y su reemplazo por tecleo.
- Pegado de valores (ya cubierto hoy por el saneamiento genérico de
  `onChange`, pero debe seguir verificándose con el formateo en vivo).
- Ceros iniciales — decidir explícitamente si se recortan en cada tecleo o
  se conservan hasta perder el foco (hoy no hay una regla explícita).
- Comportamiento móvil: el riesgo más alto de los evaluados — el
  reposicionamiento programático del cursor es más frágil en navegadores
  móviles, sumado a la imprecisión táctil ya existente al seleccionar
  dentro de un campo.
- Accesibilidad: el símbolo `$` debe permanecer fuera del valor editable
  del `<input>` (prefijo visual separado, ya adoptado como arquitectura del
  MVP) — nunca dentro del texto que un lector de pantalla anuncia como el
  valor del campo.
- El proyecto no tiene hoy infraestructura de test de DOM/componentes
  (sin `jsdom`/`happy-dom`, sin `@testing-library/react`) — retomar esto
  exige extraer la lógica de cursor/formateo como funciones puras
  testeables sin DOM, o agregar esa infraestructura como decisión aparte.

**Relación con la arquitectura ya adoptada:** el prefijo visual `$` fijo
(fuera del input) que se implementa ahora para el MVP es la misma base
arquitectónica sobre la que se construiría el formateo en vivo más
adelante — no es un diseño que haya que descartar ni rehacer, solo
extender.

**Condición para revisarla más adelante:** que exista evidencia real de que
la ausencia de formateo en vivo genera errores de magnitud, fricción de uso
o una degradación relevante en la comprensión/confianza durante la
captura — no únicamente una preferencia estética.
