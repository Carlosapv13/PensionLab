# Oportunidades futuras de PensionLab

Registro vivo de ideas de producto que surgen durante el desarrollo pero que
**no pertenecen al alcance actual** — ni al Sprint en curso, ni a un backlog
comprometido. Cada entrada documenta el origen y la forma que podría tomar la
idea, sin decidir todavía si ni cuándo se construye. **No es un backlog:**
nada aquí está priorizado ni aprobado para implementación — es un lugar para
no perder la idea, no una promesa de construirla.

---

## 1. PensionLab para profesionales / gestión de casos de terceros

**Origen de la idea:** surgió durante la construcción de la herramienta de
desarrollo para cargar casos de prueba (Sprint 3, `src/dev/`). Al construir
un mecanismo para que un desarrollador cargue y modifique rápidamente el
estado de un caso pensional con fines de prueba, se hizo evidente que un
mecanismo conceptualmente similar podría tener valor de producto real para
un usuario profesional — no solo para desarrollo interno.

**Posible usuario profesional:** un asesor, consultor o gestor pensional que
maneja los casos de varias personas (clientes, familiares, empleados de una
empresa) y necesita trabajarlos y compararlos, no solo el suyo propio.

**Capacidades que tendría que resolver, si se construyera:**
- **Gestión manual de casos de terceros** — personas que no usan PensionLab
  directamente; el profesional captura y mantiene el expediente en su nombre.
- **Captura y modificación de datos** de cada caso, de forma equivalente a
  como hoy lo hace la propia persona a través del recorrido normal.
- **Comparación de escenarios** entre casos, o de un mismo caso en el tiempo.
- **Orientación sobre caminos** — la misma capacidad ya construida en el
  Slice RAIS, aplicada por el profesional en nombre de un tercero.
- **Trazabilidad** — qué se calculó, con qué supuestos y en qué fecha, por
  caso.
- **Informe escrito**, entregable al cliente final del profesional.
- **Posible exportación a PDF** del informe.

**Decisión actual: no implementar.** No existe todavía validación de que
este usuario profesional exista con urgencia real, ni un caso concreto que
lo confirme — mismo Principio 9 del proyecto (generalizar solo con evidencia
real) que ya rige el resto de PensionLab.

**Condición para revisarla más adelante:** que aparezca una necesidad real y
concreta de un usuario profesional — no solo la conveniencia técnica de
reutilizar el mecanismo de fixtures. Mismo criterio de activación ya usado
para otras capacidades diferidas del proyecto (ej. el Panel de Hallazgos del
Expediente Pensional, en `docs/tecnico/arquitectura/expediente-pensional.md`:
"se diseñará formalmente solo cuando exista una segunda evidencia real").

**Relación conceptual con Caso pensional, fixtures y panel de desarrollo:**
esta oportunidad comparte una intuición estructural con la herramienta de
desarrollo recién construida, pero son conceptos distintos que no deben
confundirse:

- **Caso pensional** — concepto de producto, todavía sin contrato propio: la
  situación completa de una persona real, tal como la modela el producto. No
  existe hoy como entidad independiente; vive repartida en el estado de
  `App.jsx`.
- **Fixture** (`src/dev/fixtures.js`) — un ejemplo predefinido, exclusivamente
  para desarrollo, que precarga ese mismo estado para pruebas manuales. No es
  el modelo definitivo de Caso Pensional ni pretende serlo.
- **Panel de desarrollo** (`src/dev/PanelDesarrollo.jsx`) — herramienta
  exclusiva de desarrollo para cargar, inspeccionar y modificar fixtures, y
  saltar a una pantalla. Nunca disponible en producción.

Si "PensionLab para profesionales" se retoma alguna vez, probablemente
necesite su propio contrato de Caso Pensional — más cercano a
`ExpedientePensional`/`UserProfile` (los contratos ya dormidos descritos en
`expediente-pensional.md`) que una extensión del mecanismo de fixtures, que
seguirá siendo exclusivamente de desarrollo.

---

## 2. Objetivos sin capacidad todavía (retiro de DeclaracionLibre del MVP)

**Origen de la idea:** al simplificar el recorrido principal del MVP se
retiraron `DeclaracionLibre`/`RevisionDeclaracionTemporal` de la navegación
activa, y `Objetivo.jsx` pasó a deshabilitar dos de sus cuatro opciones
("Comparar caminos que ya conozco.", "Validar una estrategia que ya tengo.")
por no tener una capacidad real detrás. Las tres oportunidades siguientes son
lo que, si se retomara cada una, les daría contenido.

### 2.1 Comprensión semántica de texto libre

La capacidad de reconocimiento de `DeclaracionLibre` (C-v1,
`src/domain/reconocimiento/`) sigue intacta pero dormida: hoy solo distingue
`no_apto` (ruido/relleno) de `indeterminado` (cualquier contenido
sustantivo, pensional o no) — nunca clasifica `apto`, y no existe
`resolverEstructura.js`. Retomarla implicaría diseñar C-v2: qué significa
realmente "apto" (materia pensional utilizable, no solo texto
estructuralmente sustantivo — criterio ya establecido al rechazar la
primera versión de C-v1), sin recurrir a heurísticas de palabras clave o
conteo que simulen comprensión sin tenerla.

**Decisión actual: no implementar.** No hay todavía un caso de uso concreto
que dependa de interpretar texto libre — el control de alcance del MVP lo
gobierna `motivoConsulta` (ver PL-250), no por declaración libre. **Corrección
(2026-09-01):** esta sección afirmaba antes que "el MVP gobierna el flujo por
`objetivoSeleccionado`" — ese campo se eliminó del MVP tras una auditoría de
extremo a extremo (PL-250 v0.5, `docs/producto/PL-250-borde-de-la-solucion-pensionlab.md`
§20) que lo clasificó como `DECISIÓN_APARENTE`: sus opciones nunca producían
un recorrido, cálculo o texto distinto entre sí.

### 2.2 Comparación de caminos ya conocidos

El objetivo "Comparar caminos que ya conozco." asume que la persona ya trae
una o más estrategias en mente (ej. "aumentar mi IBC" vs. "trasladarme de
régimen") y quiere verlas contrastadas entre sí, no descubiertas desde cero.
Es distinto del Slice RAIS actual, que genera y ordena caminos — aquí el
usuario los aportaría él mismo, y PensionLab tendría que capturarlos de
forma estructurada (no como texto libre) para poder compararlos con el
mismo rigor que ya aplica `generarCaminosRAIS.js`.

**Decisión actual: no implementar.** Requiere definir primero cómo se
captura un "camino ya conocido" de forma estructurada — no existe ese
contrato todavía.

### 2.3 Validación de una estrategia declarada

El objetivo "Validar una estrategia que ya tengo." asume que la persona ya
decidió un curso de acción concreto (ej. "voy a subir mi IBC a $X desde tal
fecha") y quiere que PensionLab verifique sus supuestos y consecuencias,
más que explorar alternativas. Distinto de comparar caminos: aquí el punto
de partida es una única estrategia ya fija, y el trabajo es auditarla
(¿es legalmente viable?, ¿el esfuerzo declarado es correcto?, ¿qué
resultado produce?) en vez de generar o contrastar candidatas.

**Decisión actual: no implementar.** Igual que 2.2, requiere primero un
contrato para capturar "una estrategia ya decidida" de forma estructurada.

**Condición para revisar 2.1, 2.2 o 2.3:** que aparezca evidencia real de
que alguien las necesita, y que su reintroducción produzca una consecuencia
real (un recorrido, cálculo o texto distinto) — no solo la simetría de
completar opciones visibles sin comportamiento propio. Mismo Principio 9 ya
aplicado en la entrada 1, y mismo criterio que llevó a retirar
`objetivoSeleccionado` en PL-250 v0.5 por ser una `DECISIÓN_APARENTE`.

---

## 3. Estrategia pensional viva y acompañamiento proactivo

**Origen de la idea:** surgió durante el análisis de legibilidad monetaria y
de la comparación de caminos de esta sesión, al notar que hoy
`ExploraTuProyeccion` entrega una fotografía de un momento — se calcula con
los datos vigentes cuando la persona la consulta, pero no hay manera de que
adopte un camino y PensionLab la acompañe mientras lo sigue en el tiempo.

**Principios asociados:**
- **Estrategia viva:** los supuestos futuros de la estrategia elegida se
  sustituyen progresivamente por datos reales a medida que ocurren, y la
  estrategia puede recalcularse — no es una secuencia rígida de valores
  nominales fijados de una vez.
- **Acompañamiento proactivo:** cuando un cambio conocido pueda exigir una
  acción para mantener la estrategia, PensionLab podría avisar a la persona
  en vez de depender de que recuerde volver por su cuenta.

**Ejemplo ilustrativo (no un compromiso de diseño):** si una estrategia
consiste en mantener determinado nivel de IBC relativo al SMMLV, cuando se
conozca el nuevo SMMLV de un año PensionLab podría recalcular el IBC y el
aporte correspondientes al nuevo año, y comunicar a la persona el ajuste
necesario para seguir alineada con su camino.

**Traducción de una meta "en pesos de hoy" a valores nominales, con datos
reales — no proyectados.** El Motor de caminos RAIS actual (Convención
Económica v1, ver `trazabilidad-formula-RAIS.md`) expresa IBC, saldo,
objetivo, restricción de costo y resultado en pesos de hoy — un nivel
constante de poder adquisitivo, no el mismo número nominal sostenido
durante 25 años. Esa convención es correcta para la lectura de hoy, pero
no debe leerse como una instrucción de que la persona deba mantener
congelado ese valor nominal exacto durante todo el camino: el valor
nominal necesario en cada momento deberá actualizarse utilizando la
información económica efectivamente observada y vigente.

Cuando exista la capacidad de seguimiento/ejecución de un camino (ver
arriba), su responsabilidad central sería traducir periódicamente ese
objetivo — y la restricción de costo, bajo la misma convención — a un
valor nominal vigente, usando información real ya conocida en cada
momento (IPC observado, SMMLV publicado del año correspondiente), nunca
proyectando o inventando hoy un aumento futuro del SMMLV. Mismo criterio
de honestidad que ya rige hoy el tope legal de 25 SMMLV en el camino
alternativo (`TOPE_IBC_CON_SMMLV_VIGENTE`): evaluar siempre con el dato
vigente conocido, nunca con una proyección.

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
queda pendiente para cuando se diseñe el seguimiento del camino.

No implica ningún cambio en las fórmulas RAIS actuales — `formulaRAIS.js`
sigue siendo correcta bajo la Convención Económica v1 tal como está; esto
es exclusivamente sobre qué hace falta para *ejecutar* un camino elegido
a lo largo del tiempo, responsabilidad que hoy no existe en el producto.

**Capacidades que tendría que resolver, si se construyera:**
- **Actualización con datos realmente observados** — semanas cotizadas, IBC
  efectivamente utilizado, interrupciones u otros cambios relevantes que la
  persona reporte, sustituyendo los supuestos originales de la estrategia.
- **Persistencia de expediente y de la estrategia elegida** — para que haya
  algo que actualizar entre una visita y la siguiente.
- **Revisiones periódicas** — detectar cuándo un cambio conocido (como un
  nuevo SMMLV) afecta una estrategia ya adoptada.
- **Mecanismos de comunicación** — cómo y cuándo avisar a la persona de que
  su estrategia necesita un ajuste.

**Decisión actual: no implementar.** Ninguna de estas capacidades pertenece
al MVP actual para revisión de Oscar — no se implementan cuentas,
persistencia, notificaciones, automatizaciones ni seguimiento periódico
ahora.

**Relación con decisiones ya documentadas:** la persistencia de
`ExpedientePensional`/estrategias/evidencia ya está registrada en
`docs/tecnico/arquitectura/expediente-pensional.md` y en
`docs/tecnico/arquitectura/PL-230 - Arquitectura del Motor de Decisión de
PensionLab.md` como una decisión independiente y posterior, fuera de
alcance de esos documentos — esta entrada no la duplica ni la redefine, solo
registra para qué serviría esa persistencia si algún día se diseña: sostener
una estrategia viva en el tiempo, no solo guardar un expediente.

Esta idea es coherente con el principio que ya sigue el código actual —
recalcular siempre desde los datos vigentes en vez de persistir un
resultado derivado (ver el comentario de `ExploraTuProyeccion.jsx` sobre por
qué `ibcAplicableSimulacion` no se guarda en `App.jsx`). Eso no implica que
una futura implementación deba reutilizar `generarCaminosRAIS.js` tal como
existe hoy — sería prematuro comprometer una arquitectura concreta para una
capacidad que todavía no tiene ni caso de uso confirmado ni decisión de
persistencia propia.

**Condición para revisarla más adelante:** que exista evidencia real de que
alguien necesita seguir una estrategia en el tiempo (no solo la coherencia
conceptual de la idea), y que se haya tomado la decisión, todavía pendiente
e independiente, de cómo persistir el Expediente Pensional — mismo Principio
9 ya aplicado en las entradas 1 y 2.

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

---

## Posible redundancia de ExploraTuProyeccionRPM.jsx frente a ProyectaTuPensionRPM.jsx

**Origen de la idea:** identificado durante el cierre del slice de ajustes UX de
`ProyectaTuPensionRPM.jsx` (jerarquía IBC/aporte, % del objetivo, marcador "Tu
elección" del gráfico) — al revisar el recorrido completo se hizo evidente que
`ExploraTuProyeccionRPM.jsx` ("Lectura económica RPM con tu historia hasta hoy",
una fotografía sin proyección a la edad objetivo) ya no es parte del recorrido
principal: UX-RPM-01 lleva del `BaseCotizacion` directo a `ProyectaTuPensionRPM`
(ver comentario de cabecera de esa pantalla) y la única puerta de entrada real
que le queda a `ExploraTuProyeccionRPM` es la profundización opcional de
historia ("Completar mi historia de cotización", vía `HistoriaCotizacionRPM.jsx`
→ `ExploraTuProyeccionRPM.jsx` → vuelta a `ProyectaTuPensionRPM.jsx`). Con
`ProyectaTuPensionRPM.jsx` ya proyectando a la edad objetivo con la historia
disponible (parcial o vía declaración agregada, contrato GO-B), cabe preguntarse
si esta pantalla intermedia sigue aportando una lectura que la persona
realmente necesita ver por separado, o si es un paso redundante en un recorrido
que ya llegó a resolver la pregunta más adelante.

**Por qué no se resuelve ahora:** no bloquea el recorrido actual (la
profundización opcional funciona), no compromete ningún cálculo, no elimina
ninguna capacidad — el propio dominio (`calcularPensionRPM.js`) y la captura de
historia (`HistoriaCotizacionRPM.jsx`) siguen intactos y en uso. Resolver esta
pregunta (¿eliminar la pantalla?, ¿fusionarla con `ProyectaTuPensionRPM.jsx`?,
¿dejarla como está porque la lectura "solo con tu historia hasta hoy" sigue
siendo información distinta y legítima?) es una optimización de flujo, no un
requisito para publicar este MVP.

**Decisión actual: no implementar.** Queda fuera de alcance de este slice y del
MVP actual — ningún trabajo se abre sobre `ExploraTuProyeccionRPM.jsx` a partir
de este cierre.

**Condición para revisarla más adelante:** evaluar con datos reales de uso (o
con Oscar/producto) si las personas que llegan a `ExploraTuProyeccionRPM.jsx`
vía la profundización opcional encuentran valor distintivo en esa lectura
separada, o si conviene fusionarla/eliminarla — mismo Principio 9 ya aplicado
al resto de este documento: no decidir por preferencia estética o simetría
arquitectónica, sino por evidencia real de uso.
