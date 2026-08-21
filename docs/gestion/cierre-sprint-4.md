# Sprint 4 — PensionLab (en curso)

## Metodología

Sprint 4 abre formalmente el Entregable 2
(`docs/tecnico/arquitectura/entregable-2-pensionlab-responde-explora-y-explica.md`),
tras el cierre transversal del MVP público de Sprint 3
(`docs/gestion/cierre-sprint-3.md`). Mismo enfoque de Vertical Slices ya usado en
Sprint 3: cada Slice entrega un incremento pequeño, consistente y verificable de punta
a punta, aprobado explícitamente antes de implementarse y cerrado formalmente aquí una
vez verificado. Este documento se actualiza Slice por Slice y se consolida como cierre
de Sprint 4 cuando el Entregable 2 termine.

---

## Slice S4-001 — Captura de historia RPM estructurada real

**Estado:** ✅ Cerrado y aprobado — commit de cierre de este mismo Slice en
`sprint-3-mvp-headless` (el identificador definitivo queda registrado en el historial
Git, ya que este documento forma parte de ese mismo commit).

### Objetivo

Cerrar el único bloqueo que impedía usar, desde la UI pública y sin Panel de
Desarrollo ni fixtures, una capacidad ya construida en Sprint 3: la "Lectura económica
RPM con tu historia hasta hoy" (`ExploraTuProyeccionRPM.jsx`, `calcularPensionRPM.js`).
Primer Slice del Entregable 2 (Sprint 4).

### Criterio de aceptación aprobado

> "Un usuario RPM perteneciente al perfil soportado puede introducir desde la UI una
> historia de cotización estructurada válida y alcanzar la lectura económica RPM
> existente sin utilizar fixtures ni Panel de Desarrollo."

Carlos fue el primer caso real de validación — nunca una condición hardcodeada del
producto (verificado explícitamente durante el análisis técnico: ni
`seleccionarPeriodosIBL.js` ni `calcularPensionRPM.js` filtran por `tipoCotizante`,
`lugarCotizacion` ni `trasladoRegimen`; el único gate real es `regimenActual === 'RPM'`,
ya impuesto por la navegación).

### Archivos creados

- `src/pages/HistoriaCotizacionRPM.jsx` — la pantalla de captura.
- `src/pages/HistoriaCotizacionRPM.helpers.js` — evaluación y construcción de período
  (`evaluarNuevoPeriodo`, `construirPeriodoCotizacion`, `borradorVacio`), sin
  `diasCotizados` como campo crudo (se deriva siempre de las fechas).
- `src/format/fechaDiaMesAnio.js` — funciones puras de captura de fecha día/mes/año.
- `src/domain/evidenciaIndicioVidaLaboral.js` — evidencia (`evaluarIndicioVidaLaboral`)
  que compara semanas ya declaradas en el expediente contra el umbral legal de la
  alternativa de vida laboral, con vocabulario deliberadamente distinto al de evidencia
  verificada (`indicio_probable` / `sin_indicio_suficiente` / `no_evaluable` — nunca
  `cumple`/`no_cumple`).
- `src/components/CampoFechaDiaMesAnio.jsx` — estándar permanente de captura de fecha
  del proyecto (ver "Estandarización del patrón de captura de fechas", abajo).
- Tests correspondientes a los cuatro archivos anteriores.

### Archivos modificados

- `src/App.jsx` — nueva vista `historiaCotizacionRPM` entre `queDeterminaResultado` y
  `exploraTuProyeccionRPM` (solo para `regimenActual === 'RPM'`); props nuevas
  (`regimenActual`, `nivelConocimientoSemanas`, `semanasCotizadas`, `trasladoRegimen`)
  cableadas a ambas pantallas.
- `src/App.css` — clase de título nueva, mismo patrón que cada pantalla existente.
- `src/dev/estadoApp.js` — nueva vista agregada a `VISTAS_CONOCIDAS`.
- `src/domain/pensionEngine/calcularPensionRPM.js` — ver "Hallazgo: excepción no
  capturada", abajo.
- `src/domain/seleccionarPeriodosIBL.js` — `diasCalendarioEnRango` y `calcularVentana`
  pasan de privadas a exportadas (sin cambio de comportamiento), para que la UI
  reutilice la misma aritmética de fechas del dominio en vez de reimplementarla.
- `src/pages/ExploraTuProyeccionRPM.jsx` — nuevas props, mensajes de indicio de vida
  laboral pendiente, advertencia de traslado, explicación de indexación del IBL.
- `src/pages/DatosIniciales.jsx` — refactorizado para consumir
  `CampoFechaDiaMesAnio.jsx` (ver "Estandarización del patrón de captura de fechas").

### Hallazgos de la revisión manual real y ajustes derivados

La revisión funcional con Carlos (primer caso real de validación, trasladado
recientemente de RAIS a RPM) produjo tres rondas de hallazgos, todas resueltas antes
de cerrar el Slice:

**1. Tratamiento de la historia previa a un traslado de régimen.** Carlos preguntó qué
historia debía introducir, dado su traslado reciente. Investigación normativa acotada
(fuentes primarias: Art. 21 Ley 100 de 1993, Decreto 3800 de 2003 — registrada en
`src/data/legal/trazabilidad-normativa.md`, sección "Traslado de régimen (RAIS→RPM) e
IBL") confirmó que el **tiempo** cotizado en RAIS sí tiene respaldo normativo para
computarse en RPM (Decreto 3800/2003, Art. 3), pero **ninguna fuente consultada
resuelve cómo debe tratarse el IBC histórico** de ese período. Decisión Carlos/Atlas:
no incluir ni excluir esa historia mediante una regla inventada; no excluir a Carlos
del perfil soportado; declarar la incertidumbre de forma visible. Registrado como
bloqueo §8.9 del Entregable 2. Un segundo hallazgo relacionado —`semanasObservadas`
(derivada exclusivamente de la historia ya capturada) puede diferir silenciosamente de
las semanas ya declaradas en el expediente, ocultando que la alternativa de vida
laboral podría aplicar— quedó registrado como bloqueo §8.10 y resuelto parcialmente en
este Slice mediante `evidenciaIndicioVidaLaboral.js` (el indicio se comunica, nunca se
usa para calcular).

**2. Tres ajustes pequeños de UX**, autorizados tras clasificar cada hallazgo de la
prueba manual (bloqueante / ajuste pequeño / deuda posterior / correcto y solo
necesita explicación):
   - Nota breve, no obligatoria, invitando a consultar la historia laboral oficial
     antes de capturar.
   - Precisión de "los últimos 10 años" a "años calendario completos", con el porqué
     técnico (indexación diciembre-a-diciembre, el año en curso no tiene IPC de cierre
     todavía) movido al detalle colapsado.
   - `textoIBL()` (`ExploraTuProyeccionRPM.jsx`) ampliado para explicar que los IBC
     históricos se actualizan por IPC antes de promediarse — un IBC nominal constante
     no produce un IBL igual a ese mismo valor, y eso sorprendió en la prueba real
     (verificado numéricamente: $3.000.000 constante 2016-2025 con la tabla IPC real
     produce ≈$4.230.664, coincidente con el $4.230.137 observado).

**Hallazgo: excepción no capturada en `calcularPensionRPM.js`.** Al verificar si
`ibl.vidaLaboral === null` ya tenía una razón estructurada expuesta (antes de construir
el indicio de arriba), se encontró que no era el único mecanismo: con ≥1250 semanas
(~24 años), es esperable que la historia declarada toque años fuera de la cobertura de
`ipc-historico.json` (hoy 2015-2025), y `construirTablaIPC`/`calcularPromedioIBL`
lanzaban una excepción no capturada en ese caso. Corregido con un `try/catch` mínimo
(sin alterar el cálculo) y un nuevo campo `ibl.razonVidaLaboralNoEvaluada:
'SEMANAS_OBSERVADAS_INSUFICIENTES' | 'DATOS_LEGALES_INSUFICIENTES' | null`, para que la
UI nunca tenga que inferir el motivo de un `null`. Reproducido y probado
(`calcularPensionRPM.test.js`, "Caso 6b").

**3. Estandarización del patrón de captura de fechas.** Decisión Carlos/Atlas, con
rango de principio permanente: *"Toda fecha que PensionLab solicite al usuario debe
utilizar el mismo patrón de interacción y comportamiento de captura de la fecha de
nacimiento, salvo que exista una razón funcional explícita y documentada para
apartarse de él."* Documentada en `PL-240` §5 (v1.0 → v1.1). Implementación:
`CampoFechaDiaMesAnio.jsx` extrae el comportamiento completo de `DatosIniciales.jsx`
(tres campos día/mes/año, buffer de escritura numérica del mes, aviso de día inválido)
como componente único; `DatosIniciales.jsx` se refactorizó para consumirlo
(-190 líneas de comportamiento duplicado, validaciones de negocio —edad, fecha
futura— intactas); `HistoriaCotizacionRPM.jsx`/`.helpers.js` migraron su borrador de 6
campos día/mes/año sueltos a `fechaDesde`/`fechaHasta` en ISO. Decisión explícita
documentada dentro del propio código: se adoptó `construirFechaISO` sin el guardián
"año futuro → cadena vacía" que tenía el `construirFecha` original de
`DatosIniciales.jsx` — un año futuro ahora se propaga como fecha ISO y recibe un
mensaje específico (`mensajeErrorFecha`/`evaluarNuevoPeriodo`, según la pantalla) en
vez de bloquear en silencio. Aprobado explícitamente por Carlos/Atlas tras señalarse
como hallazgo, no decidido unilateralmente.

Revisión manual final (Carlos/Atlas) confirmó, en un recorrido corto y dirigido:
captura de mes por teclado (`07`, `12`) correcta en las tres pantallas; comportamiento
idéntico al de fecha de nacimiento; fecha imposible (31/04) señalada correctamente;
fecha futura señalada con el mensaje específico correcto; período agregado
correctamente; campos de fecha limpios tras agregar (mediante `key` sobre el
componente, remontado por cada período agregado — sin resincronización implícita).

### Verificación

- `npm run lint` — sin errores, en cada ronda de este Slice.
- `npm test` — **395/395** en verde (24 archivos de test iniciales + 4 nuevos).
- `npm run build` — build de producción exitoso en cada ronda.
- Revisión manual confirmó, en tres rondas sucesivas: recorrido completo desde
  `bienvenida` hasta `exploraTuProyeccionRPM` sin Panel de Desarrollo; captura de
  historia real con IBC constante, contraste numérico contra el resultado esperado;
  caso de traslado de régimen con advertencia visible; estandarización de fechas
  verificada en las tres pantallas que la usan.

### Decisiones tomadas en este Slice

1. El perfil soportado de S4-001 es `regimenActual === 'RPM'`, sin restricción
   adicional de `tipoCotizante`/`lugarCotizacion` — verificado contra el dominio real,
   no asumido (responde, para el alcance de este Slice, la decisión pendiente §14.2 del
   Entregable 2).
2. `diasCotizados` nunca se captura como campo crudo — se deriva siempre de las fechas,
   bajo la premisa de que esta versión solo admite períodos de cotización continua y
   completa.
3. No se incluye ni se excluye la historia previa a un traslado de régimen mediante
   una regla inventada — se declara la incertidumbre, nunca se resuelve por
   conveniencia (bloqueo §8.9 del Entregable 2).
4. `CampoFechaDiaMesAnio.jsx` es, desde este Slice, el estándar permanente de captura
   de fechas de PensionLab (`PL-240` §5) — toda fecha nueva debe justificar por qué no
   lo usa, no al revés.
5. La extracción de `CampoFechaDiaMesAnio.jsx` para `DatosIniciales.jsx` se hizo en dos
   tiempos, deliberadamente: primero una copia de la lógica pura sin tocar
   `DatosIniciales.jsx` (Principio 9 — sin evidencia suficiente todavía), y solo
   después, con el estándar permanente ya aprobado, la extracción completa del
   componente y el refactor de `DatosIniciales.jsx`.

### Pendiente para el siguiente Slice

- **Decisión obligatoria previa a S4-002** (Entregable 2 §14.1): convención económica
  de proyección RPM — cómo tratar la ventana de 10 años del IBL cuando queda parcial o
  totalmente en el futuro. No se inventa en este cierre.
- ~~Slice pequeño propio, antes de S4-002: `fechaTrasladoRegimen` +
  `certezaFechaTraslado` en el expediente~~ — resuelto en el Slice S4-001A, abajo.
- Continuar con S4-002 (`calcularProyeccionRPM.js` — camino base con horizonte futuro)
  solo después de resolver la decisión obligatoria de convención económica (arriba).

---

## Slice S4-001A — Fecha de traslado de régimen

**Estado:** ✅ Cerrado y aprobado — commit de cierre de este mismo Slice en
`sprint-3-mvp-headless` (el identificador definitivo queda registrado en el historial
Git, ya que este documento forma parte de ese mismo commit).

### Objetivo

Incorporar al expediente la fecha del traslado de régimen y su nivel de certeza, sin
usar todavía ese dato para modificar ningún cálculo pensional — Slice complementario a
S4-001, previo a S4-002, aprobado a partir del análisis de "dónde insertar la
captura" ya realizado.

### Alcance aprobado

- `fechaTrasladoRegimen` (ISO) + `certezaFechaTraslado`
  (`'conocido' | 'aproximado' | 'desconocido'`), captura únicamente cuando
  `trasladoRegimen === 'si'`.
- Uso obligatorio de `CampoFechaDiaMesAnio.jsx` — tercer consumidor real del estándar
  permanente de captura de fechas (`PL-240` §5), tras `DatosIniciales.jsx` y
  `HistoriaCotizacionRPM.jsx`.
- `detalleTraslado` permanece exactamente como estaba — sin tocar.
- `PeriodoCotizacion` sin modificar. Ningún motor RPM ni fórmula tocados.
- La pantalla nunca asume que la fecha efectiva del traslado equivale a la fecha de
  primera cotización bajo el régimen actual, ni infiere de ella derechos, elegibilidad
  o consecuencias económicas — declarado explícitamente en el propio texto visible
  ("Por ahora PensionLab la guarda como parte de tu expediente, pero no la utiliza
  para modificar ningún cálculo...").
- Precisión de UX explícitamente pedida: la razón visible para pedir el dato no se
  presenta como una necesidad técnica futura del proyecto — se explica en lenguaje
  breve ("Esta fecha nos ayuda a ubicar correctamente tu cambio de régimen dentro de
  tu historia pensional"); el detalle técnico/normativo completo (bloqueo §8.9 del
  Entregable 2, investigación normativa pendiente) permanece exclusivamente en
  documentación, nunca en la conversación principal.

### Archivos modificados

- `src/pages/IndiciosRegimenTransicion.jsx` — nuevo bloque de captura (certeza +
  `CampoFechaDiaMesAnio` condicional), inmediatamente después del bloque ya existente
  de `detalleTraslado` — misma pantalla, mismo gate, sin nueva vista de navegación
  (PL-240 §5, "cuándo agrupar": misma naturaleza que `detalleTraslado`).
- `src/App.jsx` — dos estados nuevos (`certezaFechaTraslado`, `fechaTrasladoRegimen`);
  `actualizarTrasladoRegimen` extendida para invalidar ambos en cascada, mismo
  criterio ya usado para `detalleTraslado`; nueva `actualizarCertezaFechaTraslado`
  (mismo patrón que `actualizarCertezaBaseCotizacion`/`actualizarCertezaSaldoAcumulado`);
  cableado a `IndiciosRegimenTransicion` y al Panel de Desarrollo.
- `src/dev/estadoApp.js` — los dos campos nuevos agregados a `VALORES_POR_DEFECTO`.
- `src/dev/fixtures.js` — nuevo fixture exclusivo de desarrollo
  (`rpm-trasladada-indicios-transicion`), caso ficticio con `trasladoRegimen: 'si'` y
  `vistaSugerida: 'indiciosTransicion'`, para agilizar la revisión manual de este Slice
  y de futuros Slices sin recorrer todas las pantallas previas — confirmado ausente del
  bundle de producción (mismo mecanismo de dead-code-elimination ya usado por los
  fixtures existentes).

### Validaciones

- Certeza obligatoria (`trasladoRegimen === 'si'` exige una respuesta entre las tres
  opciones) — "No la conozco" nunca bloquea.
- Fecha (solo si certeza es conocido/aproximado): real (`esFechaDiaMesAnioReal`,
  reutilizada sin cambios) y no futura — mensaje específico, mismo criterio de
  "Explicar todo bloqueo" ya vigente.
- Cambiar `trasladoRegimen` a una opción distinta de `'si'` invalida `fechaTrasladoRegimen`
  y `certezaFechaTraslado` en cascada.
- Cambiar `certezaFechaTraslado` a `'desconocido'` (o a cualquier valor distinto de
  conocido/aproximado) elimina cualquier fecha ya introducida.

### Verificación

- `npm run lint` — sin errores, en cada ronda del Slice.
- `npm test` — **398/398** en verde (395 del cierre de S4-001 + 3 nuevas, generadas
  automáticamente por `src/dev/aplicarFixture.test.js`, que valida dinámicamente cada
  entrada de `FIXTURES` — ninguna función pura nueva propia de S4-001A: se reutilizan
  `CampoFechaDiaMesAnio.jsx` y `esFechaDiaMesAnioReal` sin modificarlos; la validación
  nueva es inline, mismo tratamiento que `mensajeErrorFecha` en `DatosIniciales.jsx`).
- `npm run build` — build de producción exitoso en cada ronda; el bundle final quedó
  con hash idéntico al de antes de agregar el fixture de desarrollo
  (`index-BguWsDgl.js`, mismo tamaño exacto), y se confirmó por `grep` directo sobre
  `dist/assets/*.js` que ni el id/nombre del fixture ni ningún identificador de
  `src/dev/` aparecen en el bundle de producción.
- Diff revisado explícitamente: 4 archivos de código tocados
  (`IndiciosRegimenTransicion.jsx`, `App.jsx`, `estadoApp.js`, `fixtures.js`) + 1
  archivo documental (este mismo `cierre-sprint-4.md`) — ningún archivo de `domain/`
  ni `PeriodoCotizacion` tocado, confirmando que el alcance aprobado se respetó sin
  ampliaciones.

### Revisión manual

Ubicación, copy, captura de fecha (día/mes/año, comportamiento idéntico al estándar
ya validado en S4-001) y comportamiento general confirmados directamente por Carlos y
Atlas, usando el fixture de desarrollo agregado para esta revisión.

Los cuatro casos funcionales restantes del checklist —fecha futura, "No la conozco",
limpieza de una fecha ya introducida al cambiar la certeza, e invalidación en cascada
al cambiar `trasladoRegimen`— se verificaron por **trazabilidad exacta del código**
implementado (`IndiciosRegimenTransicion.jsx` líneas 169-174,
`actualizarCertezaFechaTraslado`/`actualizarTrasladoRegimen` en `App.jsx`), no por un
clic real adicional en navegador: esta sesión no contó con automatización de
navegador disponible. Los cuatro casos resultan correctos según esa traza, sin
ninguna discrepancia encontrada entre el comportamiento esperado y el implementado.
Con esa combinación (revisión visual real + trazabilidad explícita de los cuatro
comportamientos funcionales restantes + suite completa/lint/build en verde +
confirmación de que el fixture de desarrollo no llega al bundle de producción),
Carlos y Atlas autorizaron el cierre y el commit de este Slice.

### Decisiones tomadas en este Slice

1. La captura vive en `IndiciosRegimenTransicion.jsx`, no en una pantalla nueva —
   mismo criterio de agrupación ya usado para `detalleTraslado`.
2. No se agregó validación de coherencia entre la fecha de traslado y otros datos del
   expediente (ej. posterior a la fecha de nacimiento) — sin evidencia de que haga
   falta todavía (Principio 9); queda como posible mejora futura, no resuelta aquí.
3. `fechaTrasladoRegimen`/`certezaFechaTraslado` materializan, por primera vez con
   código real, la extensión `traslados` que `expediente-pensional.md` ya reservó en
   `UserProfile.laboralInfo` desde Sprint 2 — todavía como estado plano, `UserProfile`
   sigue sin instanciar.

### Pendiente para el siguiente Slice

- **Decisión obligatoria previa a S4-002** (Entregable 2 §14.1, sin cambios): convención
  económica de proyección RPM.
- Continuar con S4-002 (`calcularProyeccionRPM.js`) solo después de resolverla.

---

## Slice correctivo — Selector de ventana del IBL por días efectivamente cotizados

**Estado:** ✅ Cerrado y aprobado — pendiente de commit.

### Objetivo

Corregir la subcobertura del selector de ventana del IBL frente a la jurisprudencia: la
ventana calendario fija de los últimos 10 años (`calcularVentana()`) bloqueaba por
completo el cálculo ante cualquier hueco de cotización dentro de ese rango
(`VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS`), aun en un caso real donde la Corte Suprema de
Justicia, Sala de Casación Laboral (SL1006-2025), ante una historia con un vacío de más
de una década dentro de esa misma ventana, no bloqueó el cálculo — retrocedió en el
calendario para completarlo. Investigación normativa acotada, registrada en
`src/data/legal/trazabilidad-normativa.md`, sección "Ventana temporal del IBL ordinario".

### Convención provisional de 3.650 días — evidencia, interpretación y decisión, distinguidas

`calcularVentana()` se reemplaza por selección retrospectiva de **3.650 días calendario
efectivamente cotizados**. La redacción de esta convención distingue explícitamente tres
niveles, para no confundir evidencia con decisión:

- **Evidencia primaria observada:** el texto de SL1006-2025 muestra que, ante un vacío de
  cotización de más de una década dentro de la ventana de "10 años", la Sala retrocedió en
  el calendario para completar el período en vez de bloquear el cálculo — un único caso
  real, reconstruido matemáticamente de forma verificable (3.653 días totales, tramo límite
  recortado 3 días → 3.650 restantes, tratamiento correcto de bisiestos).
- **Interpretación técnica derivada:** ese caso confirma que un mecanismo de "retroceder
  por días efectivamente cotizados, saltando huecos" es compatible con la jurisprudencia
  revisada — pero una segunda investigación acotada (metodología de Colpensiones,
  SL1236-2025, SL7061-2016, un segundo caso primario con tabla) no logró producir una
  segunda reconstrucción verificable ni una formulación general de la regla en prosa.
- **Decisión de producto de PensionLab:** **PensionLab adopta provisionalmente un umbral
  técnico de 3.650 días efectivamente cotizados para esta selección. La decisión es
  consistente con la evidencia primaria analizada y con la reconstrucción del caso
  SL1006-2025, pero se registra expresamente como convención técnica revisable de
  PensionLab, no como una constante legal universal demostrada del artículo 21.**
- **Carácter revisable:** sujeta a reapertura si aparece evidencia primaria adicional
  (un segundo caso reconstruible, o una formulación general de la regla en fuente
  primaria) — criterios exactos de reapertura listados en
  `trazabilidad-normativa.md`, sección "Convención técnica provisional — 3.650 días
  efectivamente cotizados".

### Separación suficiencia temporal / cobertura IPC / cálculo

Un hallazgo posterior a la implementación de la convención anterior mostró que una
historia temporalmente suficiente (alcanza los 3.650 días) podía seguir fallando porque
`ipc-historico.json` no cubre alguno de los años que esa ventana requiere. Se separaron
explícitamente tres preguntas que antes quedaban confundidas bajo una sola excepción:

- **Suficiencia temporal** (`seleccionarPeriodosIBL.js`) → no evaluable con
  `HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA` cuando toda la historia declarada,
  sumada y retrocediendo por huecos, no alcanza 3.650 días.
- **Cobertura económica IPC** (`calcularPensionRPM.js`, vía el nuevo `tieneIPC()` de
  `src/data/legal/index.js`) → no evaluable con `COBERTURA_IPC_INSUFICIENTE_PARA_IBL_ORDINARIO`
  cuando la ventana temporal sí se completó pero falta IPC real para alguno de los años que
  toca. Comprobación explícita **antes** de calcular, no un `try/catch` alrededor del
  cálculo — para no convertir en "falta de IPC" cualquier excepción del cálculo ordinario,
  incluido un error real de programación (verificado con test dedicado: una excepción no
  relacionada con IPC sigue propagándose sin interceptarse).
- **Cálculo del IBL** propiamente dicho, que ya no se confunde con ninguno de los dos
  casos anteriores.

### Mejora de cobertura frente a huecos

Los huecos de calendario entre períodos declarados ya no bloquean el cálculo — el
selector retrocede a través de ellos acumulando días efectivamente cotizados, y cada
hueco saltado queda registrado en `trazabilidadVentana.huecosCalendarioSaltados`, sin
inventar cuáles días concretos estuvieron cotizados dentro de él.

### Limitaciones vigentes

- La convención de 3.650 días sigue siendo provisional y técnica, no una constante legal
  universal — ver distinción de niveles arriba.
- `ipc-historico.json` no se amplió en este Slice — la cobertura económica real del
  proyecto no cambió, solo cómo se comunica su ausencia cuando falta.
- La decisión obligatoria de convención económica de proyección RPM (Entregable 2 §14.1)
  sigue sin resolver.

### Tests y verificación

- `npm test` — suite completa en verde (403/403, 25 archivos), incluyendo regresión
  directa contra SL1006-2025, casos de huecos (6 meses, varios años, huecos previos al
  punto donde ya se completaron los 3.650 días), y el caso dedicado de separación
  temporal/IPC (`calcularPensionRPM.test.js`, "Caso 7: suficiencia temporal vs. cobertura
  económica (IPC), separadas").
- `npm run lint` — sin errores.
- `npm run build` — build de producción exitoso.

### Pendiente para el siguiente Slice

- **S4-002 todavía no ha comenzado.** Sigue bloqueado por la decisión obligatoria de
  convención económica de proyección RPM (Entregable 2 §14.1), sin cambios respecto al
  cierre de S4-001A — este Slice correctivo no la resuelve, solo corrige el selector de
  ventana que esa decisión también necesitará.

---

## Slice S4-002 — Proyección RPM en escenario de continuidad

**Estado:** ✅ Implementado, revisado y aprobado — pendiente de commit de cierre.

### Objetivo

Proyectar una lectura económica RPM a una fecha de reconocimiento futura (horizonte de
jubilación), combinando historia observada real con un escenario de ingreso futuro
declarado — sin inventar IPC futuro en ningún punto del cálculo. Cierra la decisión
pendiente §14.1 del Entregable 2 (convención económica de proyección RPM), desbloqueada
por el selector temporal ordinario ya cerrado en S4-001B.

### Convención económica — fechaBaseMonetaria y escenario de continuidad

Todo el resultado se expresa en pesos reales de `fecha` (**`fechaBaseMonetaria`**, por
defecto hoy) — nunca pesos nominales futuros, mismo principio que la Convención Económica
v1 ya aprobada para RAIS.

Separación explícita, para no presentar un supuesto de producto como si fuera una decisión
que la persona nunca tomó: `ibcAplicableSimulacion` (dato/base económica actual, ya
resuelto) es distinto de `escenarioIbcFuturo: {valor, origen}` (lo que efectivamente entra
al cálculo). S4-002 construye únicamente el **escenario base de continuidad**
(`origen: 'continuidad_ibc_actual'`, `valor = ibcAplicableSimulacion` — "si sigues
ganando, en términos reales, lo mismo que ganas hoy, hasta tu jubilación"). El campo
`origen` queda abierto (no es un enum cerrado) para que S4-003 agregue sus propios valores
sin cambiar la forma del contrato.

### Tope legal de IBC — trazabilidad completa

Si el escenario supera el tope legal (`topeMaximoIBC × smlv`, resueltos a `fecha`), el
cálculo usa el valor capado — pero nunca sobrescribe en silencio. La salida conserva los
cuatro valores: `escenarioIbcFuturo: {valorDeclarado, valorAplicado, origen,
topeAplicado}`. El cálculo usa exclusivamente `valorAplicado`; `valorDeclarado` y
`topeAplicado` quedan disponibles para que la explicación (S4-007) muestre ambos cuando el
tope se activa.

### Ventana de 3.650 días anclada a fechaReconocimiento

`seleccionarPeriodosIBL.js` recibió una extensión mínima de firma: `fechaAncla` (nuevo
parámetro opcional, default `fechaCalculo`, preserva sin cambios el comportamiento de
S4-001B) separa el punto desde el que la ventana retrocede de la resolución de períodos
abiertos (que sigue anclada a `fechaCalculo`, siempre hoy — nunca a una fecha futura, para
no inventar que el IBC actual declarado se sostiene sin cambios hasta la jubilación). Un
período sintético `{fechaDesde: fecha+1, fechaHasta: fechaReconocimiento, ibc:
valorAplicado, diasCotizados: días del horizonte}` se antepone a la historia real antes de
llamar al selector con `fechaAncla = fechaReconocimiento` — el mismo algoritmo de
retroceso de S4-001B, sin modificarlo, resuelve la mezcla.

### Separación estructural historia observada / escenario futuro — `esEscenarioFuturo`

Hallazgo crítico de la revisión (2026-08-20, ver más abajo): clasificar el tramo
observado/futuro comparando `fechaDesde > fecha` permitía que un período de
`historiaCotizacion` mal fechado en el futuro perdiera su propio IBC en silencio,
sustituido por `valorAplicado`. Corregido con dos mecanismos, no uno solo: (1) rechazo
explícito y previo de cualquier período de `historiaCotizacion` posterior a `fecha`
(`HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO`, ver hallazgos abajo); (2) el período
sintético se marca con `esEscenarioFuturo: true` — un campo opcional del `typedef
PeriodoCotizacion`, ausente en toda historia real, preservado por
`seleccionarPeriodosIBL.js` solo cuando el período de entrada lo trae (no-op para
`calcularPensionRPM.js` y cualquier otro consumidor existente). La clasificación
observado/futuro ya no compara fechas en ningún punto.

El promedio final combina el tramo observado (indexado con IPC real, vía
`calcularPromedioIBL`, sin cambios) con el tramo futuro (`valorAplicado` constante, sin
indexar — nunca pasa por `dividirPeriodoPorAnio` ni `obtenerIPC`) mediante un promedio
ponderado por días, calculado en el orquestador. Cuando el horizonte alcanza o supera
3.650 días, la ventana queda 100% futura y el IBL ordinario converge exactamente a
`valorAplicado` — verificado en los bordes exactos (3.650 y 3.649 días).

### composicionVentanaOrdinaria y semanas

`composicionVentanaOrdinaria: {diasObservados, diasFuturos, fraccionFutura}` expone
objetivamente cuánto del IBL ordinario depende de historia real vs. del escenario, sin
ningún umbral categórico de "dominado" — la lectura cualitativa queda para la explicación
posterior.

`semanasCotizadas: {observadas, futuras, total}` — `futuras` se deriva del calendario del
horizonte (bloqueo §8.6: semanas futuras no son una variable libre). El umbral de 1.250
semanas para la alternativa de vida laboral se evalúa contra `total`, a diferencia de
`calcularPensionRPM.js` (lectura histórica, solo `semanasObservadas`) — decisión de
alcance de S4-002 consistente con el Art. 21 inciso 2, que no distingue semanas ya
cotizadas de semanas que se cotizarán según lo planeado.

### Parámetros legales congelados a fecha de cálculo

`obtenerSmlv`, `obtenerTopeMaximoIBC`, `obtenerParametrosTasaReemplazoRPM` y
`obtenerSemanasHabilitanAlternativaIBL` se resuelven todos con `fecha` (hoy), nunca con
`fechaReconocimiento` — declarado como limitación explícita
(`PARAMETROS_LEGALES_CONGELADOS_A_FECHA_CALCULO`), para no afirmar conocer la ley vigente
el día de la jubilación.

### Hallazgos críticos de la revisión (2026-08-20) y su corrección

Auditoría independiente previa al cierre encontró y verificó empíricamente dos hallazgos
críticos, ambos corregidos antes de aprobar el Slice:

1. **`fechaNacimiento` inválida o ausente lanzaba `RangeError: Invalid time value` sin
   capturar** (`calcularFechaPorEdad.js`, vía `.toISOString()` sobre una fecha inválida).
   Corregido guardando el propio contrato de `calcularProyeccionRPM` (Principio 11, no se
   modificó `calcularFechaPorEdad.js`): nueva razón **`FECHA_NACIMIENTO_NO_VALIDA`**.
2. **Un período "histórico" fechado después de `fecha` perdía su propio IBC en silencio**
   — confirmado con una prueba definitiva (variar su IBC de 999.999.999 a 1 no cambiaba el
   resultado). Corregido con rechazo explícito previo (nueva razón
   **`HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO`**) más la separación estructural
   `esEscenarioFuturo` descrita arriba — defensa en profundidad, no solo el rechazo.

La auditoría también fortaleció la cobertura de pruebas: bordes exactos (horizonte de 1
día, exactamente 3.650 y 3.649 días, cumpleaños 29 de febrero, IBC exactamente en el
tope), vida laboral con falta de IPC histórico en la proyección, y un test de blend con un
período genuinamente parcial que distingue ponderación por `diasCotizados` de ponderación
por días calendario (el original, con solo períodos completos, no podía distinguirlas).

### Tests y verificación

- `npm test` — **436/436** en verde (27 archivos).
- `npm run lint` — sin errores.
- `npm run build` — build de producción exitoso.

### Fuera de alcance de este Slice

- Búsqueda/bisección de `escenarioIbcFuturo.valor` para alcanzar un objetivo declarado —
  **S4-003 todavía no ha comenzado.**
- Reconfirmación/versionamiento de una declaración de IBC futuro entre ejecuciones —
  irrelevante sin persistencia (§9 del Entregable 2); `fechaBaseMonetaria` queda expuesta
  para que esa Slice futura construya su propia política.
- Traslado de régimen (`trasladoRegimen`/`fechaTrasladoRegimen`) sigue sin efecto
  económico — bloqueo §8.9 sin cambios.
- `formulaIBL.js`, `formulaRPM.js` y la convención de 3.650 días permanecen intactos.

---

## Slice S4-004 — Comparación visual esfuerzo ↔ resultado (2 caminos)

**Estado:** ✅ Implementado, validado visualmente por el usuario y aprobado — pendiente de
commit de cierre.

### Objetivo

Presentar los dos caminos ya calculados por S4-003 (`generarCaminosRPM.js`: base +
alternativo) en una comparación visual que permita a una persona, sin explicación previa,
identificar cuál camino exige más esfuerzo y cuál se acerca más a la meta. Slice
exclusivamente de UI: "la UI visualiza; no recalcula" — ningún archivo de `domain/` se
modificó.

### Diagnóstico previo a implementar

La mayor parte de los criterios de aceptación ya estaban satisfechos incidentalmente por la
pantalla que dejó S4-003 (`ProyectaTuPensionRPM.jsx`, grid `comparacion-caminos` heredado de
RAIS). La brecha real no era de contenido sino de infraestructura de pruebas: el proyecto no
tiene precedente de testear componentes (sin `@testing-library/react`, `jsdom` ni
`happy-dom` en `package.json` — solo `vitest`). Se resolvió replicando exactamente el
precedente ya usado por RAIS: extraer la lógica pura de presentación a un archivo
`.helpers.js` hermano de la pantalla (`ExploraTuProyeccion.helpers.js` →
`ProyectaTuPensionRPM.helpers.js`), testeable con Vitest normal, sin montar el componente ni
agregar infraestructura nueva.

### Ronda 1 — extracción de funciones de presentación

Nuevo archivo `src/pages/ProyectaTuPensionRPM.helpers.js`: `textoEsfuerzoAdicional`,
`textoIBCFuturo`, `textoDistancia` — cada una recibe un `escenario` ya construido por
`generarCaminosRPM.js` y solo decide qué texto mostrar (formato/comparaciones de
igualdad-signo, nunca aritmética de dominio). 11 tests en
`ProyectaTuPensionRPM.helpers.test.js`, incluyendo casos límite (costo cero/negativo en el
camino base, para confirmar que ni se lee).

### Ronda 2 — ajuste de jerarquía visual y deduplicación de limitaciones

Revisión visual manual del usuario detectó una brecha menor. Ajustes, todos sin tocar
textos, cálculos, dominio, selección de `caminoMasAlineadoId` ni contratos:

1. Mayor jerarquía visual del valor de "Aporte pensional adicional mensual" y de "Pensión
   proyectada mensual" — nueva clase `.camino-celda__valor--enfasis` (`font-size: 20px`,
   `font-weight: 600`), sin modificar reglas CSS existentes.
2. Refuerzo visual de "Alcanza tu objetivo" en el camino que cumple, sin convertirlo en una
   recomendación nueva — nueva clase `.camino-celda__valor--cumple` (`color: var(--accent)`,
   `font-weight: 600`), aplicada solo cuando `escenario.distanciaObjetivo.cumple === true`
   (dato de dominio ya existente, no una decisión nueva de la UI).
3. Deduplicación de limitaciones idénticas repetidas en ambas columnas: `calcularLimitacionesComunes`
   y `limitacionesEspecificas`, duplicadas a propósito de `ExploraTuProyeccion.helpers.js`
   (mismo criterio de duplicación ya usado entre `generarCaminosRAIS.js`/
   `generarCaminosRPM.js`, Principio 9). Agrupan **exclusivamente por `codigo`**, nunca
   reinterpretan `mensaje` — restricción explícita del usuario: si eliminar la duplicación
   hubiera requerido lógica que alterara o interpretara el contrato de dominio, debía
   reportarse y conservarse la duplicación en su lugar; no fue necesario, la agrupación por
   `codigo` fue suficiente. Las comunes se muestran una única vez debajo del grid
   (reutilizando las clases `.comparacion-caminos__supuestos*` ya existentes de RAIS, sin
   CSS nuevo); las específicas de cada camino permanecen dentro de su columna. 8 tests
   nuevos cubren: sin escenarios viables, un solo escenario viable, limitaciones realmente
   comunes a ambos, una limitación presente en un solo camino (no se considera común), y el
   caso real completo (base + alternativo comparten tres, el alternativo conserva la suya).

### Tests y verificación

- `npm test` — **487/487** en verde (30 archivos).
- `npm run lint` — sin errores.
- `npm run build` — build de producción exitoso.
- Validación visual manual del usuario (sin automatización de navegador disponible en esta
  sesión): confirmada, los cuatro criterios de aceptación del Slice quedan satisfechos.

### Fuera de alcance de este Slice

- `calcularProyeccionRPM.js`, `generarCaminosRPM.js` y el resto de `domain/pensionEngine/`
  permanecen intactos — ningún valor, cálculo ni contrato cambió.
- Gráficos y cualquier infraestructura de testing de componentes (RTL/jsdom) — deliberadamente
  fuera, no había brecha funcional que los requiriera.
- **Hallazgo de proceso, no de este Slice:** `docs/gestion/cierre-sprint-4.md` no tenía
  entrada de cierre para S4-003 (commit `dc113de215ad575db545543d29ae368f95c36950`) antes de
  esta edición — descubierto al preparar el cierre de S4-004. No se corrige aquí porque
  hacerlo agregaría al inventario de este commit contenido que no pertenece exclusivamente a
  S4-004; queda reportado para que el usuario decida cómo cerrarlo.
