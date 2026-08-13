# Sprint 3 — PensionLab (en curso)

## Metodología

Sprint 3 adopta un enfoque de **Vertical Slices**: cada Slice entrega un incremento
pequeño, consistente y verificable de punta a punta (UI + navegación mínima),
aprobado explícitamente antes de implementarse y cerrado formalmente aquí una vez
verificado. Este documento se actualiza Slice por Slice y se consolida como cierre
de Sprint 3 cuando el sprint termine.

---

## Slice S3-001 — Pantalla de Bienvenida

**Estado:** ✅ Cerrado y aprobado — commit `44a8131` en `sprint-3-mvp-headless`.

### Objetivo

Implementar la primera pantalla de la aplicación (Bienvenida), como punto de
entrada mínimo y consistente con la arquitectura existente, sin adelantar
funcionalidad de slices posteriores.

### Alcance aprobado

- Pantalla de Bienvenida con título, subtítulo y botón "Comenzar".
- `AppShell` implementado en su forma mínima (header, contenedor, footer) dentro
  de este mismo Slice, sin abrir un Slice separado de layout.
- Navegación mínima sin librería de ruteo: estado local en `App.jsx` alternando
  entre `Bienvenida` y una vista temporal `ObjetivoTemporal`, destino provisional
  del botón "Comenzar" hasta que el Slice correspondiente implemente la pantalla
  real de Objetivo.
- Reutilización de las variables CSS ya existentes en `index.css`; sin limpieza
  general de estilos ni refactor fuera de alcance.
- Sin uso de `hero.png` ni de ningún asset gráfico en este Slice.

### Archivos creados

- `src/pages/Bienvenida.jsx`
- `src/pages/ObjetivoTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — estado local (`vista`) y composición de `AppShell` + vista activa.
- `src/App.css` — estilos nuevos para `.app-shell*`, `.screen*` y `.btn*`, con una
  regla responsive; nada del contenido previo (residuo de plantilla Vite) fue
  modificado ni eliminado.
- `src/components/layout/AppShell.jsx` — implementación mínima del layout base.

Sin cambios en `domain/`, `models/`, `data/`, `context/` ni en ningún otro
componente. Sin dependencias nuevas instaladas.

### Corrección aplicada durante el Slice

Se detectó y corrigió un problema visual: el título "Bienvenido a PensionLab"
aparecía superpuesto al envolver en dos líneas. Causa raíz: `index.css` define
`line-height: 145%` en `:root`, un valor porcentual que se calcula una única vez
sobre el `font-size` del `:root` (18px) y se hereda como longitud fija (~26px) en
lugar de recalcularse sobre el `font-size` de 56px del `h1`. La corrección se
aplicó de forma escoped —clase `screen__title--bienvenida`, exclusiva de
`Bienvenida.jsx`— para no afectar `ObjetivoTemporal.jsx` ni ningún otro título que
comparte `.screen__title`.

### Verificación

- `npm run lint` — sin errores.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso, sin advertencias.

### Commit

```
44a8131 ui: implementar pantalla de Bienvenida (Slice S3-001)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. El botón "Comenzar" nunca queda vacío ni deshabilitado: navega a una vista
   temporal de Objetivo con mensaje explícito de que se implementará en el
   siguiente Slice.
2. `AppShell` se implementa dentro de S3-001 en su forma mínima; no se abre un
   Slice de layout independiente.
3. No se instala librería de ruteo todavía — se difiere hasta que exista
   evidencia real de necesitar más de dos vistas navegables, siguiendo el
   principio ya establecido del proyecto de "generalizar solo cuando existe
   evidencia real".
4. El texto legal del footer se fijó como: *"PensionLab ofrece orientación
   informativa para comprender alternativas pensionales. No reemplaza la
   asesoría profesional ni las decisiones del usuario."*

### Pendiente para el siguiente Slice

- Implementar la pantalla real de Objetivo (S3-002), reemplazando
  `ObjetivoTemporal.jsx`.
- Decidir si la navegación basada en estado local en `App.jsx` sigue siendo
  suficiente a partir de S3-002 o si ya se justifica introducir una librería de
  ruteo.

---

## Slice S3-002 — Pantalla de Objetivo

**Estado:** ✅ Cerrado y aprobado — commit `6529f53` en `sprint-3-mvp-headless`.

### Objetivo

Reemplazar la vista temporal de Objetivo por una pantalla funcional donde el
usuario indique qué quiere obtener del análisis.

### Alcance aprobado

- Pantalla funcional "¿En qué quieres que te ayudemos hoy?" con 4 opciones de
  selección única, implementadas con `<fieldset>`/`<legend>` y `input type="radio"`
  (semántica nativa y accesible, sin componente custom).
- Cada opción incluye una ayuda breve y discreta debajo de su texto, sin marcar
  ninguna como "recomendada" visualmente.
- Botón "Continuar" deshabilitado hasta seleccionar exactamente una opción;
  botón "Volver" con estilo secundario nuevo (`.btn-secondary`) para
  diferenciarse de la acción primaria.
- `objetivoSeleccionado` como estado en `App.jsx` (no en `context/`), pasado por
  props a `Objetivo` y a `DatosInicialesTemporal`; persiste al navegar entre
  ambas vistas durante el Slice.
- `DatosInicialesTemporal.jsx` reemplaza a `ObjetivoTemporal.jsx` como vista
  temporal, mostrando "Objetivo seleccionado: [texto de la opción]".
- Sin librería de ruteo nueva, sin dependencias instaladas, sin cambios en
  `domain/`, `models/`, `data/`, `context/` ni componentes compartidos.

### Archivos creados

- `src/pages/Objetivo.jsx`
- `src/pages/DatosInicialesTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — tercer valor de `vista` (`'datosIniciales'`) y estado
  `objetivoSeleccionado` levantado y compartido entre `Objetivo` y
  `DatosInicialesTemporal`.
- `src/App.css` — estilos nuevos: `.options`, `.option`, `.option__hint`,
  `.screen__actions`, `.btn-secondary`, `.btn:disabled`, `.visually-hidden`,
  y las clases exclusivas `.screen__title--objetivo` y `.screen--objetivo`
  (ver correcciones visuales más abajo).

### Archivos eliminados

- `src/pages/ObjetivoTemporal.jsx` — reemplazado por `Objetivo.jsx`.

### Correcciones y ajustes aplicados durante el Slice

- **Mejoras de UX**: subtítulo explicando cómo elegir una opción y ayuda breve
  bajo cada una de las 4 opciones (inicialmente solo bajo la opción de guía,
  luego extendida a las cuatro por decisión de producto).
- **Ajustes de redacción**: título final "¿En qué quieres que te ayudemos hoy?"
  (con el `<legend>` accesible sincronizado al mismo texto); primera opción
  renombrada a "Descubrir mis opciones pensionales."; subtítulo final fijado.
- **Corrección visual — título superpuesto**: mismo bug de herencia de
  `line-height: 145%` ya identificado en S3-001 (`index.css`). Corregido con
  una clase exclusiva `screen__title--objetivo` (`line-height: 1.15`), sin
  tocar `.screen__title` compartido — mismo patrón que
  `screen__title--bienvenida`.
- **Corrección visual — subtítulo demasiado angosto**: el subtítulo ocupaba 4
  líneas dentro del contenedor `.screen` (520px). Corregido ampliando el ancho
  solo para esta pantalla con la clase `screen--objetivo` (`max-width: 640px`),
  sin modificar `.screen` base ni afectar a `Bienvenida` o
  `DatosInicialesTemporal`.

### Verificación

- `npm run lint` — sin errores, en cada iteración del Slice.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones en
  ningún punto del Slice.
- `npm run build` — build de producción exitoso en cada verificación, sin
  advertencias.

### Commit

```
6529f53 ui: implementar pantalla de Objetivo (Slice S3-002)
```

El commit fue creado inicialmente como `86cf7ce` y actualizado mediante
`git commit --amend` a `6529f53` para incorporar los ajustes de UX, redacción y
correcciones visuales realizados después de la aprobación inicial, por decisión
explícita de mantener un único commit para todo el Slice en vez de
fragmentarlo. Sin push realizado — el commit permanece local en
`sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. `objetivoSeleccionado` se mantiene en `App.jsx`, sin introducir todavía
   `context/`, porque el estado solo se utiliza dentro de este flujo local y
   aún no justifica una solución global.
2. Ninguna opción se marca como "recomendada" automáticamente; las cuatro
   reciben el mismo tratamiento visual de ayuda (`.option__hint`).
3. Los ajustes visuales de título y ancho de subtítulo se resuelven con clases
   exclusivas por pantalla (`screen__title--objetivo`, `screen--objetivo`), sin
   tocar las clases compartidas `.screen__title` / `.screen` — mismo patrón ya
   establecido en S3-001, ahora confirmado como convención repetible del
   proyecto.
4. Los ajustes posteriores a la aprobación inicial se integraron en el mismo
   commit vía `--amend`, en vez de generar commits adicionales, por instrucción
   explícita.

### Pendiente para el siguiente Slice

- Implementar la pantalla real de "Datos iniciales" (S3-003), reemplazando
  `DatosInicialesTemporal.jsx`.
- Evaluar si `objetivoSeleccionado` en `App.jsx` sigue siendo suficiente a
  medida que se agreguen más campos capturados, o si ya se justifica introducir
  `context/` o una librería de ruteo.

---

## Slice S3-003 — Pantalla de Datos iniciales

**Estado:** ✅ Cerrado y aprobado — commit `64960d8` en `sprint-3-mvp-headless`.

### Objetivo

Reemplazar la vista temporal de Datos iniciales por una pantalla funcional que
capture la fecha de nacimiento, el sexo para efectos pensionales y el lugar de
residencia del usuario.

### Alcance aprobado

- Pantalla funcional "Datos iniciales" con tres campos: fecha de nacimiento
  (`input type="date"`), sexo para efectos pensionales (Mujer/Hombre) y lugar
  de residencia (Colombia/Exterior), estos dos últimos implementados como
  grupos de selección única (`<fieldset>`/`<legend>` + `input type="radio"`,
  mismo patrón accesible ya usado en `Objetivo.jsx`).
- Ayuda breve bajo "Sexo para efectos pensionales": *"Este dato es necesario
  porque algunos requisitos pensionales pueden variar."*
- Sin captura ni cálculo de edad, sin ciudad, régimen, semanas, IBC, historial
  laboral ni aportes — explícitamente fuera de alcance de este Slice.
- Campos construidos directamente dentro de `DatosIniciales.jsx`; no se
  implementaron `InputField.jsx` ni `SelectField.jsx`, ni se modificó ningún
  componente compartido existente.
- `fechaNacimiento`, `sexo` y `lugarResidencia` como estado en `App.jsx` (mismo
  patrón que `objetivoSeleccionado`), sin usar `context/` todavía; los tres
  valores persisten al navegar entre "Datos iniciales" y "Situación
  pensional".
- "Continuar" deshabilitado hasta que los tres campos sean válidos; la fecha de
  nacimiento no puede ser futura.
- `SituacionPensionalTemporal.jsx` reemplaza a `DatosInicialesTemporal.jsx`
  como vista temporal, mostrando el resumen de los cuatro datos capturados
  hasta ahora (objetivo, fecha de nacimiento, sexo, lugar de residencia).
- Sin dependencias instaladas, sin cambios en `domain/`, `models/`, `data/`,
  `context/` ni en `PersonalInfoForm.jsx`.

### Archivos creados

- `src/pages/DatosIniciales.jsx`
- `src/pages/SituacionPensionalTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — nuevos estados `fechaNacimiento`, `sexo`, `lugarResidencia` y
  cuarto valor de `vista` (`'situacionPensional'`).
- `src/App.css` — estilos nuevos: `.field`, `.field__label`, `.field__input`,
  `.options legend` (leyendas visibles, a diferencia de la leyenda oculta de
  `Objetivo.jsx`) y `.summary`.

### Archivos eliminados

- `src/pages/DatosInicialesTemporal.jsx` — reemplazado por `DatosIniciales.jsx`.

### Correcciones y ajustes realizados durante el Slice

Ninguno — a diferencia de S3-001 y S3-002, este Slice se aprobó en su primera
versión implementada, sin rondas adicionales de ajuste visual o de redacción.

### Verificación

- `npm run lint` — sin errores.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso, sin advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).
- Revisión manual confirmó: sin imports ni componentes duplicados, un solo
  `export default App`, `DatosInicialesTemporal.jsx` eliminado, fecha futura
  bloqueada (`max` del input + validación en `esFechaNacimientoValida`), y los
  tres datos conservados al avanzar y volver.

### Commit

```
64960d8 ui: implementar pantalla de Datos iniciales (Slice S3-003)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. Sexo y lugar de residencia se capturan como grupos de radio buttons
   (`<fieldset>`/`<legend>`), reutilizando el mismo patrón accesible de
   `Objetivo.jsx`, en vez de usar `<select>` — consistencia visual y de
   interacción entre pantallas de selección única.
2. A diferencia de `Objetivo.jsx` (donde el `<legend>` se oculta porque
   duplica la pregunta ya mostrada en el `<h1>`), aquí los `<legend>` quedan
   visibles porque cada uno es la única etiqueta de su campo — no hay
   duplicación con el título de la pantalla ("Datos iniciales").
3. La validación de fecha futura se implementa en dos capas: el atributo
   `max` del input (restricción a nivel de UI/navegador) y una función pura
   `esFechaNacimientoValida` (restricción explícita en el estado de
   habilitación de "Continuar"), sin depender únicamente del control nativo
   del navegador.
4. `fechaNacimiento`, `sexo` y `lugarResidencia` se mantienen en `App.jsx`, sin
   introducir todavía `context/`, por la misma razón que
   `objetivoSeleccionado` en S3-002: el estado solo se utiliza dentro de este
   flujo local y aún no justifica una solución global.

### Pendiente para el siguiente Slice

- Implementar la pantalla real de "Situación pensional" (S3-004), reemplazando
  `SituacionPensionalTemporal.jsx`.
- Evaluar si los cuatro valores de estado acumulados en `App.jsx`
  (`objetivoSeleccionado`, `fechaNacimiento`, `sexo`, `lugarResidencia`) siguen
  siendo manejables ahí a medida que se agreguen más campos, o si ya se
  justifica introducir `context/` o una librería de ruteo.

### Mejora posterior al cierre — captura de fecha por Día/Mes/Año

**Commit:** `b101a10` en `sprint-3-mvp-headless`.

Tras el cierre de S3-003 (y ya con S3-004 también cerrado), se identificó un
problema de usabilidad en el único `input type="date"` original: el selector
nativo del navegador obliga a navegar mes a mes (o año a año, según el
navegador) para llegar a la fecha de nacimiento, lo cual es especialmente
costoso para usuarios de mayor edad que deben retroceder varias décadas —
justo el perfil de usuario para quien el año de nacimiento suele estar más
lejos del presente. Es una mejora de accesibilidad y usabilidad, no un cambio
de alcance funcional: el dato capturado y su significado no cambian.

**Cambio realizado**: el `input type="date"` se reemplazó por tres campos
independientes y explícitos —Día (`input type="number"`, 1-31), Mes
(`<select>` con los 12 meses en español) y Año (`input type="number"`
editable directamente, sin lista larga, entre 1900 y el año actual)—,
dispuestos en una sola fila en escritorio y apilados en pantallas pequeñas
(`.date-fields`, con `flex-direction: column` bajo `max-width: 600px`).

**Validación**: la combinación de los tres campos debe representar una fecha
real (se valida reconstruyendo un objeto `Date` y comparando año/mes/día
resultantes contra los ingresados, para detectar desbordamientos como el 30 de
febrero o el 31 de abril) y no puede ser futura. "Continuar" permanece
deshabilitado mientras la fecha no sea completa y válida — mismo criterio que
ya regía con el selector nativo.

**Persistencia y contrato**: `fechaNacimiento` en `App.jsx` no cambió de
forma ni de tipo — sigue siendo un único string `YYYY-MM-DD`. `DatosIniciales.jsx`
mantiene un estado local `{ dia, mes, anio }`, inicializado a partir de ese
mismo string; como solo es posible avanzar con una fecha completa y válida,
al volver a la pantalla los tres campos se reconstruyen correctamente desde
`fechaNacimiento`.

**Verificación**: `npm run lint`, `npm test` (18/18) y `npm run build`
exitosos; `git diff --check` sin errores de contenido. Se verificaron
manualmente los casos límite: 29 de febrero de 2024 (válido, año bisiesto),
29 de febrero de 2023 (inválido), 31 de abril de 1970 (inválido, abril tiene
30 días), fecha futura (inválida), 1 de enero de 1900 (válido, límite
inferior) y año 1899 (inválido, fuera del límite inferior).

Alcance estrictamente limitado a `src/pages/DatosIniciales.jsx` y
`src/App.css`; sin cambios en sexo, lugar de residencia, navegación, ninguna
otra pantalla, ni en `domain/`, `models/`, `data/` o `context/`. Sin
dependencias instaladas.

### Segunda mejora posterior al cierre — escritura numérica del mes y validación estricta de día/año

Detectadas en revisión funcional durante el trabajo de S3-009/Primera
Lectura, sin relación con esas pantallas — ambas viven exclusivamente en
`src/pages/DatosIniciales.jsx`.

**1. Escritura numérica del mes.** El `<select>` de Mes solo aceptaba
selección por mouse o por el typeahead nativo del navegador (que busca por
texto de la opción — "Enero", "Julio" — nunca por dígitos). Se agregó un
buffer de dígitos vía `onKeyDown` (referencias estables con `useRef`, pausa
de 600 ms, `event.preventDefault()` solo sobre teclas numéricas) que permite
escribir `7` o `07` y que el `<select>` salte a "Julio" — sin reemplazar el
elemento nativo ni afectar su navegación por teclado, mouse o typeahead por
letra. El buffer se limpia al perder el foco, al seleccionar con
mouse/flechas, y al desmontar el componente.

**2. Validación estricta de Día y Año.** Ambos campos pasaron de
`type="number"` (que no impide `-`, `.`, `e`, ni longitudes arbitrarias) a
`type="text"` + `inputMode="numeric"`, con el valor filtrado en `onChange`
para aceptar solo dígitos y truncado a la longitud máxima (2 para Día, 4 para
Año) — nunca se corrige el valor a otra cosa, solo se descarta lo que no es
dígito. Se agregó `diasMaximosEnMes` (vía `Date.UTC`, respeta bisiestos sin
tabla manual) con dos mensajes visibles y específicos ("Ingresa un día entre
1 y 31.", "Febrero de {año} tiene máximo {N} días.") que nunca corrigen el
día ya escrito. Se agregó también una edad mínima funcional de 15 años
(`EDAD_MINIMA_FUNCIONAL`, documentada explícitamente en el código como
decisión de producto del MVP, no como requisito legal), calculada con
`calcularEdadCumplida` a partir de la fecha completa —nunca
`añoActual - añoNacimiento`, que falla antes del cumpleaños—, con su propio
mensaje visible.

**Origen de una regla permanente.** Esta corrección expuso que las
validaciones de captura no se estaban considerando sistemáticamente desde el
diseño de cada pantalla, sino descubriéndose en pruebas manuales. Se adoptó,
a partir de este momento, la regla **"Validación desde el origen"** —
documentada en `docs/ia/metodologia-de-desarrollo-con-ia.md`— y el
**Principio de Arquitectura 11** ("validación en capas") en
`plan-implementacion-prerrequisitos-pension-engine.md`: toda pantalla que
capture datos analiza sus validaciones desde la propuesta, no después de
probarla, y ningún componente de `domain/` puede asumir que la interfaz ya
validó lo que recibe. Se dejó registrado, en `UserProfile.js` y en el
"Pendiente" de la sección de evidencia de este mismo documento, que
`fechaNacimiento` deberá validarse de nuevo, de forma autónoma, en cuanto
tenga su primer consumidor real en `domain/`.

**Verificación**: `npm run lint`, `npm test` (47/47) y `npm run build`
exitosos en cada ronda; `git diff --check` sin errores de contenido.
Alcance limitado a `src/pages/DatosIniciales.jsx`, más las tres ediciones de
documentación ya referenciadas (`UserProfile.js`,
`plan-implementacion-prerrequisitos-pension-engine.md`,
`metodologia-de-desarrollo-con-ia.md`) y la nota pendiente en este cierre.
Sin cambios en `domain/`, `data/`, `context/`, ni en ninguna otra pantalla.

### Tercera mejora posterior al cierre — edad máxima funcional, reemplazando el año mínimo fijo

Detectada aplicando la propia regla "Validación desde el origen" recién
adoptada: `ANIO_MINIMO = 1900` permitía registrar personas con edades
extremadamente improbables (ej. nacidas en 1900, ~126 años hoy), porque
comparaba contra un año fijo en vez de contra la edad real de la persona.

**Revierte, de forma explícita, una decisión anterior de esta misma sesión**:
al diseñar la edad mínima funcional se decidió deliberadamente *no*
establecer todavía una edad máxima bloqueante ("una edad avanzada puede ser
poco habitual, pero no necesariamente imposible"). Esa decisión se revisa
aquí, no se oculta: se reemplaza `ANIO_MINIMO` por `EDAD_MAXIMA_FUNCIONAL =
100`, documentada en el código con el mismo criterio que
`EDAD_MINIMA_FUNCIONAL` — decisión funcional de alcance del MVP, no un
límite legal ni biológico.

`construirFecha` deja de rechazar años "muy antiguos"; el límite inferior
ahora vive exclusivamente en `esFechaNacimientoValida` (edad entre 15 y 100
años, inclusive), con su propio mensaje visible ("PensionLab está diseñado
actualmente para personas de hasta 100 años.") que nunca corrige el año ya
escrito. Comportamiento verificado sin romper casos existentes: un año
estructuralmente absurdo (ej. `0001`) sigue quedando bloqueado, ahora por
edad excesiva en vez de por año mínimo — mismo resultado final, mecanismo
más preciso.

**Verificación**: `npm run lint`, `npm test` (47/47) y `npm run build`
exitosos; `git diff --check` sin errores de contenido. Alcance limitado a
`src/pages/DatosIniciales.jsx`.

### Cuarta mejora posterior al cierre — explicar todo bloqueo (edad y fecha futura)

Detectada al pedir explícitamente que la edad fuera del rango funcional
mostrara un mensaje más específico: al revisar, se confirmó que el mensaje
existente para edad ya era visible pero no citaba la edad calculada, y —
hallazgo nuevo durante esa misma auditoría— una fecha de nacimiento futura
deshabilitaba "Continuar" **sin ningún mensaje**, dejando a la persona sin
ninguna pista de qué revisar.

`mensajeErrorEdad` se reemplaza por `mensajeErrorFecha`, que cubre ambos
casos con mensajes específicos y accionables: para edad fuera de rango, cita
la edad aproximada calculada ("...indica una edad aproximada de {X} años.
PensionLab está diseñado para personas de 15 años o más / de hasta 100 años
— verifica ese dato antes de continuar."); para fecha futura, un mensaje
propio ("La fecha de nacimiento que ingresaste está en el futuro..."). Se
auditaron el resto de condiciones que pueden bloquear "Continuar" en esta
pantalla (sexo y lugar de residencia sin seleccionar) y se decidió, con su
razón, no agregarles mensaje: un radio sin marcar es incompletitud normal
mientras la persona todavía no responde, no un dato inconsistente que
explicar — mismo criterio que ya regía para día/mes/año vacíos.

**Origen de una segunda regla permanente.** Se adoptó la regla **"Explicar
todo bloqueo"** (`docs/ia/metodologia-de-desarrollo-con-ia.md`): toda
validación que impida continuar debe mostrar un mensaje visible, específico
y accionable — nunca genérico, nunca silencioso. Complementa, sin
reemplazar, "Validación desde el origen": una decide qué se valida, esta
decide cómo se comunica cuando la validación bloquea el avance.

**Verificación**: `npm run lint`, `npm test` (47/47) y `npm run build`
exitosos; `git diff --check` sin errores de contenido. Alcance limitado a
`src/pages/DatosIniciales.jsx` y a la nueva sección de metodología.

---

## Slice S3-004 — Pantalla de Situación pensional

**Estado:** ✅ Cerrado y aprobado — commit `bd2852b` en `sprint-3-mvp-headless`.

### Objetivo

Implementar la primera pantalla funcional de "Situación pensional",
reemplazando `SituacionPensionalTemporal.jsx`. Con este Slice comienza la
construcción del expediente pensional, sin asumir todavía semanas, IBC,
salario, aportes ni ningún cálculo pensional.

### Alcance aprobado

- Pantalla funcional "Situación pensional" con una única pregunta —"¿Dónde
  estás afiliado actualmente?"— y un texto de apoyo, implementada como grupo
  de selección única (`<fieldset>`/`<legend>` visible + `input type="radio"`),
  mismo patrón accesible ya usado en `Objetivo.jsx` y `DatosIniciales.jsx`.
- Tres opciones: "Colpensiones" (con ayuda "Régimen público de prima media
  (RPM)."), "Estoy afiliado a un fondo privado (Porvenir, Protección,
  Colfondos o Skandia)" (con ayuda "Régimen de ahorro individual (RAIS).") y
  "No estoy seguro" (con ayuda "No te preocupes si no lo sabes. PensionLab te
  ayudará a identificarlo.").
- Los valores se almacenan internamente como `'RPM'`, `'RAIS'` y
  `'desconocido'`, desacoplados del texto mostrado al usuario.
- Sin captura de fecha de inicio de cotización, semanas cotizadas, salario,
  IBC, aportes, historial laboral, traslados ni cálculos pensionales —
  explícitamente fuera de alcance de este Slice.
- `regimenActual` como estado en `App.jsx` (mismo patrón que los campos
  anteriores), sin usar `context/` todavía; persiste al navegar entre
  "Situación pensional" y "Historial laboral".
- "Continuar" deshabilitado hasta seleccionar exactamente una opción; botón
  "Volver" presente.
- `HistorialLaboralTemporal.jsx` reemplaza a `SituacionPensionalTemporal.jsx`
  como vista temporal, mostrando el resumen de los cinco datos capturados
  hasta ahora (objetivo, fecha de nacimiento, sexo, lugar de residencia,
  régimen actual — este último traducido a su texto comprensible para el
  usuario).
- Sin dependencias instaladas, sin componentes compartidos nuevos, sin
  cambios en `domain/`, `models/`, `data/`, `context/` ni en
  `LaborHistoryForm.jsx`.

### Archivos creados

- `src/pages/SituacionPensional.jsx`
- `src/pages/HistorialLaboralTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — nuevo estado `regimenActual` y quinto valor de `vista`
  (`'historialLaboral'`).

`src/App.css` no requirió cambios — se reutilizaron `.options legend` y
`.screen__subtitle` ya existentes.

### Archivos eliminados

- `src/pages/SituacionPensionalTemporal.jsx` — reemplazado por
  `SituacionPensional.jsx`.

### Correcciones y ajustes realizados durante el Slice

- **Ajustes de redacción** (previos a la aprobación final): texto de la
  opción "Fondo privado" ampliado a "Estoy afiliado a un fondo privado
  (Porvenir, Protección, Colfondos o Skandia)"; ayuda de la opción "No estoy
  seguro" cambiada a "No te preocupes si no lo sabes. PensionLab te ayudará a
  identificarlo." Sin cambios de arquitectura, estado ni comportamiento.

### Verificación

- `npm run lint` — sin errores, en cada iteración del Slice.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso en cada verificación, sin
  advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).
- Revisión manual confirmó: sin imports duplicados, un solo componente
  `SituacionPensional` en `App.jsx`, `HistorialLaboralTemporal` con un único
  `onVolver`, un solo `export default App`,
  `SituacionPensionalTemporal.jsx` eliminado, `regimenActual` conservado al
  avanzar y volver, y "Continuar" deshabilitado hasta seleccionar una opción.

### Commit

```
bd2852b ui: implementar pantalla de Situación pensional (Slice S3-004)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. Del Bloque 2 (Historia Pensional) del Expediente Pensional
   (`docs/tecnico/arquitectura/expediente-pensional.md`), este Slice captura
   únicamente el régimen actual — el resto del bloque (semanas, IBC, salario,
   fecha de inicio de cotización, traslados, bonos) queda explícitamente
   diferido a slices posteriores.
2. El régimen se presenta al usuario en lenguaje cotidiano ("Colpensiones",
   "fondo privado") en vez de la nomenclatura técnica (RPM/RAIS), reservando
   esta última para el valor interno almacenado en el estado — separación
   entre lo que el usuario reconoce y lo que el dominio necesita.
3. A diferencia de `Objetivo.jsx` (donde el `<legend>` se oculta porque
   duplica la pregunta ya mostrada en el `<h1>`), aquí el título ("Situación
   pensional") y la pregunta ("¿Dónde estás afiliado actualmente?") son
   textos distintos, por lo que el `<legend>` queda visible — mismo criterio
   ya aplicado en `DatosIniciales.jsx`.
4. `regimenActual` se mantiene en `App.jsx`, sin introducir todavía
   `context/`, por la misma razón que los campos de los Slices anteriores: el
   estado solo se utiliza dentro de este flujo local y aún no justifica una
   solución global.

### Pendiente para el siguiente Slice

- Implementar la pantalla real de "Historial laboral" (S3-005), reemplazando
  `HistorialLaboralTemporal.jsx`.
- Evaluar si los cinco valores de estado acumulados en `App.jsx`
  (`objetivoSeleccionado`, `fechaNacimiento`, `sexo`, `lugarResidencia`,
  `regimenActual`) siguen siendo manejables ahí a medida que se agreguen más
  campos, o si ya se justifica introducir `context/` o una librería de
  ruteo.

---

## Slice S3-005 — Pantalla de Historial laboral

**Estado:** ✅ Cerrado y aprobado — commit `9bb0631` en `sprint-3-mvp-headless`.

### Objetivo

Reemplazar la vista temporal de Historial laboral por una pantalla funcional
que capture información estructural sobre la forma en que el usuario ha
cotizado, sin asumir todavía fecha de inicio de cotización, semanas, salario,
IBC, aportes ni ningún cálculo pensional.

### Alcance aprobado

- Pantalla funcional "Historial laboral" con tres preguntas de selección
  única, mismo patrón accesible (`<fieldset>`/`<legend>` visible +
  `input type="radio"`) ya usado en `Objetivo.jsx`, `DatosIniciales.jsx` y
  `SituacionPensional.jsx`:
  1. "¿Cómo has realizado tus cotizaciones?" — Como empleado / Como
     independiente / De ambas formas (valores internos `empleado` /
     `independiente` / `ambos`), cada opción con su ayuda.
  2. "¿Dónde has realizado cotizaciones?" — Solo en Colombia / Desde el
     exterior / En Colombia y desde el exterior (valores internos `colombia`
     / `exterior` / `ambos`), cada opción con su ayuda.
  3. "¿Actualmente realizas aportes al sistema pensional colombiano?" — Sí /
     No (valores internos `si` / `no`).
- Sin captura de fecha de inicio de cotización, semanas, salario, IBC,
  aportes ni historia salarial — explícitamente fuera de alcance.
- `tipoCotizante`, `lugarCotizacion` y `cotizaActualmente` como estado en
  `App.jsx` (mismo patrón que los campos anteriores), sin usar `context/`
  todavía; los tres persisten al navegar entre "Historial laboral" y la
  vista siguiente.
- "Continuar" deshabilitado hasta responder las tres preguntas; botón
  "Volver" presente.
- Sin componentes compartidos nuevos, sin dependencias instaladas, sin
  cambios en `domain/`, `models/`, `data/`, `context/` ni en
  `LaborHistoryForm.jsx`.

### Archivos creados

- `src/pages/HistorialLaboral.jsx`
- `src/pages/ResumenCasoTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — tres nuevos estados (`tipoCotizante`, `lugarCotizacion`,
  `cotizaActualmente`) y sexto valor de `vista` (`'resumenCaso'`).
- `src/App.css` — clases nuevas `.summary__block` y `.summary__block-title`
  para la reorganización del resumen en bloques (ver correcciones más abajo);
  ajuste de `gap` en `.summary` (4px → 20px) para separar los bloques.

### Archivos eliminados

- `src/pages/HistorialLaboralTemporal.jsx` — reemplazado por
  `HistorialLaboral.jsx`.

### Correcciones y ajustes realizados durante el Slice

- **Ajustes de redacción en `HistorialLaboral.jsx`**: subtítulo final fijado
  a *"Cuéntanos, de forma general, cómo has realizado tus cotizaciones. Más
  adelante podrás ingresar información más detallada."*; la tercera pregunta
  se reescribió de "¿Actualmente estás cotizando?" a "¿Actualmente realizas
  aportes al sistema pensional colombiano?"; se eliminó la opción "No estoy
  seguro" de esa pregunta, dejando únicamente Sí/No.
- **Placeholder "Expediente pensional"**: el título de la vista temporal
  siguiente cambió de "Resumen del caso" a "Expediente pensional".
- **Reorganización del resumen en bloques**: la lista continua de párrafos de
  `ResumenCasoTemporal.jsx` se reestructuró en cuatro bloques con subtítulo
  (`<h2 className="summary__block-title">`) — Objetivo, Datos personales,
  Situación pensional, Historial laboral —, sin agregar ni quitar ningún dato
  ya capturado; solo se retiró el prefijo redundante "Objetivo seleccionado:"
  del bloque Objetivo, ya que el subtítulo del bloque cumple esa función.
- **Formato amigable de fecha**: la fecha de nacimiento se presenta en
  `ResumenCasoTemporal.jsx` como "13 de septiembre de 1972" en vez de
  `YYYY-MM-DD`, mediante una función pura de formateo (`formatearFecha`) que
  no modifica el valor almacenado en `App.jsx`.

### Verificación

- `npm run lint` — sin errores, en cada iteración del Slice.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso en cada verificación, sin
  advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).
- Revisión manual confirmó, en dos rondas: sin imports duplicados, un solo
  componente `HistorialLaboral` en `App.jsx`, `ResumenCasoTemporal` con un
  único `onVolver`, un solo `export default App`,
  `HistorialLaboralTemporal.jsx` eliminado, los tres campos conservados al
  avanzar y volver, "Continuar" deshabilitado hasta responder las tres
  preguntas, selección única por pregunta (un `name` de grupo distinto por
  `fieldset`), un solo `<h1>` con el texto correcto, ausencia de la lista
  antigua de párrafos, los cuatro bloques exactos y en orden, cada dato
  mostrado una sola vez, y sin referencias obsoletas al valor `"desconocido"`
  ya inalcanzable desde `HistorialLaboral.jsx`.

### Commit

```
9bb0631 ui: implementar pantalla de Historial laboral (Slice S3-005)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. Del Bloque 2 (Historia Pensional) del Expediente Pensional, este Slice
   captura únicamente información estructural sobre la forma de cotización
   (tipo de cotizante, lugar de cotización, si cotiza actualmente) — no la
   fecha de inicio de cotización, que había sido la propuesta inicial y se
   descartó explícitamente a favor de este alcance distinto.
2. Las tres preguntas se presentan en lenguaje cotidiano, con ayuda breve en
   las dos primeras; la tercera se simplificó a una decisión binaria (Sí/No)
   tras retirar la opción "No estoy seguro", por ser menos ambigua para el
   usuario que para el régimen actual (donde sí tiene sentido no saberlo).
3. `tipoCotizante`, `lugarCotizacion` y `cotizaActualmente` se mantienen en
   `App.jsx`, sin introducir todavía `context/`, por la misma razón que los
   campos de los Slices anteriores: el estado solo se utiliza dentro de este
   flujo local y aún no justifica una solución global.
4. El resumen temporal se organiza en bloques temáticos en vez de una lista
   plana, anticipando la estructura que tendrá el Expediente Pensional real,
   sin implementar todavía ese contrato. Se trata únicamente de una mejora de
   legibilidad de una vista temporal, no de una decisión de dominio.
5. No se extrajo un componente compartido de captura de fecha ni de bloque de
   resumen — cada pantalla y vista temporal sigue construyendo su propio
   marcado, consistente con el criterio ya aplicado de generalizar solo ante
   evidencia clara de reutilización.

### Pendiente para el siguiente Slice

- Implementar la pantalla real de "Expediente pensional" (S3-006),
  reemplazando `ResumenCasoTemporal.jsx`.
- Continuar evaluando si el crecimiento del estado en `App.jsx` sigue siendo
  manejable o si ya se justifica introducir `context/` o una solución de
  gestión de estado.
- Decidir si la fecha de inicio de cotización, aplazada en este Slice, se
  incorpora en un Slice posterior y bajo qué pantalla.

---

## Slice S3-006 — Pantalla de Expediente pensional

**Estado:** ✅ Cerrado y aprobado — commit `3c2e867` en `sprint-3-mvp-headless`.

### Objetivo

Reemplazar la vista temporal `ResumenCasoTemporal.jsx` por la primera versión
real de la pantalla "Expediente pensional", sin capturar datos nuevos y sin
introducir lógica de negocio, reglas o cálculos pensionales.

### Alcance aprobado

- Título "Expediente pensional" (sin cambios respecto al placeholder).
- Mensaje introductorio de tres párrafos que explica que ya se conoce la
  información básica del caso, que a partir de aquí se construye el
  expediente, y que no es necesario tener toda la información desde el
  principio.
- Resumen mantenido tal cual, organizado en los mismos cuatro bloques con
  subtítulo ya definidos en S3-005 —Objetivo, Datos personales, Situación
  pensional, Historial laboral—, sin agregar ni quitar ningún dato.
- El botón único "Volver" se reemplaza por dos botones: "Volver" (secundario)
  y "Comenzar expediente" (primario, siempre habilitado, sin validación,
  porque esta pantalla no captura datos nuevos).
- "Comenzar expediente" navega a un nuevo placeholder temporal,
  `CompletarExpedienteTemporal.jsx`, con título "Completemos tu expediente".
- Sin `context/`, sin dependencias instaladas, sin cambios en `domain/`,
  `models/`, `data/` ni componentes compartidos.

### Archivos creados

- `src/pages/ExpedientePensional.jsx`
- `src/pages/CompletarExpedienteTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — swap de import (`ResumenCasoTemporal` →
  `ExpedientePensional`), nuevo import de `CompletarExpedienteTemporal`, el
  valor de `vista` `'resumenCaso'` renombrado a `'expedientePensional'` y
  séptimo valor nuevo `'completarExpediente'`.

`src/App.css` no requirió cambios — se reutilizaron `.screen`,
`.screen__subtitle`, `.summary*`, `.screen__actions`, `.btn-secondary` y
`.btn-primary` ya existentes.

### Archivos eliminados

- `src/pages/ResumenCasoTemporal.jsx` — reemplazado por
  `ExpedientePensional.jsx`.

### Correcciones y ajustes realizados durante el Slice

- **Nombre del placeholder siguiente**: se descartó `PerfilDecisionTemporal.jsx`
  (nombre orientado a la estructura interna del dominio, propuesto
  inicialmente) en favor de `CompletarExpedienteTemporal.jsx` con título
  "Completemos tu expediente" — nombre orientado al proceso desde la
  perspectiva del usuario, sin comprometer contenido específico de slices
  futuros, por decisión explícita.
- **Ajustes de redacción en `CompletarExpedienteTemporal.jsx`**: el texto
  placeholder genérico ("Esta pantalla se implementará en el siguiente
  Slice.") se reemplazó, en dos rondas sucesivas, por un mensaje de tres
  párrafos orientado al usuario, con la frase final ajustada de "identificar
  todas las estrategias pensionales que podrían aplicar para ti" a "construir
  las estrategias pensionales que mejor se adapten a tu situación".

### Verificación

- `npm run lint` — sin errores, en cada iteración del Slice.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso en cada verificación, sin
  advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).

### Commit

```
3c2e867 ui: implementar pantalla de Expediente pensional (Slice S3-006)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. `ExpedientePensional.jsx` es únicamente una vista de UI que resume los
   datos ya capturados — no instancia ni implementa el contrato de dominio
   `src/models/ExpedientePensional.js` (Sprint 2). La coincidencia de nombre
   entre la página y el contrato fue evaluada explícitamente como riesgo
   conceptual antes de aprobarse; se decidió mantenerla porque no genera
   colisión técnica (carpetas distintas) y el propósito de cada archivo es
   inequívoco por su ubicación.
2. El nombre y contenido del placeholder que sucede a "Comenzar expediente"
   se decide desde la experiencia del usuario, no desde la arquitectura
   interna del dominio — un placeholder llamado por su estructura de dominio
   (ej. `PerfilDecisionTemporal`) habría anticipado contenido de un Slice
   futuro sin evidencia todavía de que ese sea el orden correcto.
3. "Comenzar expediente" no tiene condición de validación, a diferencia de
   "Continuar" en las pantallas de captura de datos — esta pantalla no
   recoge información nueva, solo confirma y da paso a continuar.
4. El mensaje introductorio se redactó evitando implicar capacidades que el
   sistema todavía no tiene (el sistema todavía no implementa el motor de
   evaluación pensional ni una instancia real del expediente) — se mantiene
   coherente con la
   filosofía del proyecto de no mostrar falsa precisión ni prometer más de
   lo que el sistema puede hacer hoy.

### Pendiente para el siguiente Slice

- Implementar la pantalla real de "Completemos tu expediente" (S3-007),
  reemplazando `CompletarExpedienteTemporal.jsx`, una vez definido su alcance
  funcional.
- Continuar evaluando si el crecimiento del estado en `App.jsx` sigue siendo
  manejable o si ya se justifica introducir `context/` o una solución de
  gestión de estado.

---

## Slice S3-007 — Pantalla "Completemos tu expediente"

**Estado:** ✅ Cerrado y aprobado — commit `c4c13b1` en `sprint-3-mvp-headless`.

### Objetivo

Reemplazar la vista temporal `CompletarExpedienteTemporal.jsx` por la primera
versión funcional de esa pantalla, sin capturar datos nuevos y sin introducir
lógica de negocio, reglas ni cálculos pensionales.

### Alcance aprobado

- Pantalla funcional "Completemos tu expediente" que muestra un **checklist de
  progreso** del expediente pensional — no repite el detalle de datos ya
  mostrado en `ExpedientePensional.jsx` (S3-006), sino que resume qué bloques
  ya tienen información y cuál es el siguiente.
- Cuatro bloques ya recorridos —Objetivo, Datos personales, Situación
  pensional, Historial laboral— marcados con la etiqueta "Información básica
  registrada" (deliberadamente no "Completado", para no sugerir que esos
  bloques no podrían requerir más información más adelante).
- Un quinto elemento, "Información pensional esencial", marcado como
  "Siguiente paso" con tratamiento visual diferenciado (borde y fondo de
  acento), sin anticipar todavía si su contenido detallado será fecha de
  inicio de cotización, Perfil de Decisión, u otro — esa definición queda
  explícitamente para S3-008.
- Dos botones: "Volver" (a `ExpedientePensional`) y "Continuar con mi
  expediente" (a un nuevo placeholder temporal).
- `CompletarExpediente.jsx` no recibe los 8 valores de estado capturados
  hasta ahora como props — no los muestra ni los necesita para ninguna
  validación real, y pasarlos habría sido *prop drilling* sin propósito.
- `InformacionPensionalTemporal.jsx` reemplaza a `CompletarExpedienteTemporal.jsx`
  como vista temporal, con título "Información pensional esencial".
- Sin tocar `ProgressStepper.jsx` (todavía sin evidencia de un segundo caso
  real que justifique implementarlo), sin dependencias instaladas, sin
  cambios en `domain/`, `models/`, `data/`, `context/` ni en Slices
  anteriores.

### Archivos creados

- `src/pages/CompletarExpediente.jsx`
- `src/pages/InformacionPensionalTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — swap de import (`CompletarExpedienteTemporal` →
  `CompletarExpediente`), nuevo import de `InformacionPensionalTemporal`,
  octavo valor de `vista` (`'informacionPensional'`), y eliminación del paso
  de los 8 valores de estado como props a `CompletarExpediente` (ya no
  aplica: recibe únicamente `onVolver` y `onContinuar`).
- `src/App.css` — clases nuevas: `.checklist`, `.checklist__item`,
  `.checklist__item--siguiente`, `.checklist__label`, `.badge`,
  `.badge--registrado`, `.badge--siguiente`; y dos clases exclusivas de
  título (`.screen__title--completar-expediente`,
  `.screen__title--informacion-pensional`) para la corrección de
  superposición descrita abajo.

### Archivos eliminados

- `src/pages/CompletarExpedienteTemporal.jsx` — reemplazado por
  `CompletarExpediente.jsx`.

### Correcciones y ajustes realizados durante el Slice

- **Corrección visual — títulos superpuestos**: mismo bug de herencia de
  `line-height: 145%` ya identificado y corregido en S3-001 y S3-002
  (`index.css`), presente esta vez en `CompletarExpediente.jsx` e
  `InformacionPensionalTemporal.jsx`. Corregido con dos clases exclusivas
  (`screen__title--completar-expediente`, `screen__title--informacion-pensional`,
  ambas `line-height: 1.15`), sin tocar `.screen__title` compartido — mismo
  patrón ya usado en `Bienvenida.jsx` y `Objetivo.jsx`.
- **Ajuste de redacción en `InformacionPensionalTemporal.jsx`**: el texto
  placeholder genérico ("Esta pantalla se implementará en el siguiente
  Slice.") se reemplazó por dos párrafos específicos: *"En este bloque
  comenzaremos a construir la historia pensional que servirá de base para
  evaluar tus alternativas."* y *"PensionLab te acompañará paso a paso para
  registrar únicamente la información necesaria."*

### Verificación

- `npm run lint` — sin errores, en cada iteración del Slice.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso en cada verificación, sin
  advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).
- Revisión manual confirmó: sin imports duplicados, cada componente
  renderizado una sola vez, `InformacionPensionalTemporal` con un único
  `onVolver`, `CompletarExpediente` con únicamente `onContinuar`/`onVolver`,
  `CompletarExpedienteTemporal.jsx` eliminado, y la navegación completa
  (adelante y atrás) verificada contra el flujo esperado.

### Commit

```
c4c13b1 ui: implementar pantalla Completemos tu expediente (Slice S3-007)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. El nombre del siguiente bloque se fija como "Información pensional
   esencial", sin comprometerse todavía a su contenido detallado (fecha de
   inicio de cotización, Perfil de Decisión, u otro) — esa definición se
   difiere explícitamente a S3-008.
2. Los cuatro bloques ya recorridos se etiquetan "Información básica
   registrada", no "Completado", por decisión explícita de producto: evita
   sugerir que esos bloques no podrían requerir más información más
   adelante, coherente con el Principio 5 del proyecto (declarar
   limitaciones, no ocultarlas).
3. `CompletarExpediente.jsx` no recibe los 8 valores de estado capturados
   como props — al no mostrarlos ni usarlos para validación real, pasarlos
   habría sido *prop drilling* sin propósito; llegar a esta pantalla ya
   implica que los pasos anteriores completaron su propia validación.
4. La pantalla no queda solo con "Volver": incluye "Continuar con mi
   expediente" hacia un nuevo placeholder temporal, en vez de convertirse en
   un punto muerto del flujo — mantiene el mismo patrón de avance progresivo
   ya usado en todos los Slices anteriores.
5. `ProgressStepper.jsx` no se implementa en este Slice pese a ser
   conceptualmente afín (checklist de progreso) — se mantiene el criterio ya
   aplicado en Sprint 3 de generalizar solo con evidencia de un segundo caso
   real, no en el primer uso.
6. Se consolida el cambio de enfoque del flujo del MVP: a partir de este
   Slice el usuario deja de recorrer únicamente pantallas y comienza a
   construir progresivamente su Expediente Pensional. Las pantallas
   posteriores deberán priorizar la explicación del propósito de cada dato
   solicitado, evitando formularios sin contexto.

### Pendiente para el siguiente Slice

- Implementar la primera versión funcional de "Información pensional
  esencial", iniciando la construcción guiada de la historia pensional y
  explicando al usuario por qué cada dato solicitado es necesario para
  evaluar posteriormente sus alternativas pensionales.
- Continuar evaluando si el crecimiento del estado en `App.jsx` (8 valores
  más `vista`) sigue siendo manejable o si ya se justifica introducir
  `context/` o una solución de gestión de estado.
- Evaluar, con un segundo caso real, si `ProgressStepper.jsx` debe
  implementarse para unificar la representación de progreso entre
  `CompletarExpediente.jsx` y el resto del flujo.

---

## Slice S3-008 — Pantalla "Información pensional esencial"

**Estado:** ✅ Cerrado y aprobado — commit `d586750` en `sprint-3-mvp-headless`.

### Objetivo

Implementar la primera versión funcional de "Información pensional
esencial", con una experiencia conversacional (no un formulario tradicional)
que capture como máximo dos datos, explicando siempre al usuario por qué se
necesitan y sin bloquear el flujo cuando declara explícitamente que no los
conoce.

### Alcance aprobado

- Pantalla funcional con dos preguntas presentadas **una a la vez** dentro de
  la misma pantalla (estado interno de paso, sin nuevo valor de `vista` por
  pregunta): (1) año en que empezó a cotizar, con opción "No lo recuerdo con
  exactitud"; (2) nivel de conocimiento de las semanas cotizadas ("Sí,
  conozco el número." / "Tengo una idea aproximada." / "No las conozco."),
  con campo numérico condicional para las dos primeras opciones.
- Cada pregunta incluye una explicación de por qué PensionLab la necesita y
  cómo ayuda a evaluar estrategias más adelante — texto aprobado
  explícitamente antes de implementar.
- **Validación básica de formato**: año de 4 dígitos entre el año de
  nacimiento y el año actual (o `'desconocido'`); semanas como entero no
  negativo, sin decimales ni negativos, sin tope máximo artificial.
- **Validación de coherencia cronológica** entre los dos datos, incorporada
  durante la revisión del Slice, con tres niveles:
  - *Imposible* (bloquea sin excepción): año anterior al de nacimiento, año
    futuro, o semanas que exceden el máximo cronológicamente posible según el
    año de inicio declarado.
  - *Extraordinario* (requiere confirmación explícita, no bloquea): año de
    inicio antes de los 15 años; o, cuando el año de inicio es
    `'desconocido'`, semanas que exceden el tiempo aproximado transcurrido
    desde los 15 años de edad.
  - *Válido*: cualquier combinación que no caiga en los dos casos anteriores.
- Los cálculos de días usan `Date.UTC(...)` y diferencia en milisegundos,
  para no depender de zona horaria ni horario de verano.
- Las confirmaciones de casos extraordinarios (edad temprana, semanas
  extraordinarias) se conservan en `App.jsx` mientras el dato correspondiente
  no cambie, y se **invalidan explícitamente** (no solo por comparación
  derivada) ante cualquier edición relacionada — evita que una confirmación
  antigua reviva al volver a escribir un valor ya editado antes.
- `CompletarExpediente.jsx` (Slice S3-007) se modifica de forma autorizada y
  acotada para que su checklist refleje el estado real capturado
  (`infoEsencialCompletada`), no una etiqueta fija — antes de completar
  S3-008 muestra "Información pensional esencial" como "Siguiente paso";
  después, la marca como "Información básica registrada" y muestra "Historia
  pensional" como el nuevo "Siguiente paso".
- `HistoriaPensionalTemporal.jsx` reemplaza a `InformacionPensionalTemporal.jsx`
  como vista temporal, con título "Continuemos con tu historia pensional".
- Sin componentes compartidos genéricos nuevos (ni de wizard/conversación, ni
  de mensajes), sin dependencias instaladas, sin cambios en `domain/`,
  `models/`, `data/`, `context/`, ni en traslados de régimen, edad de
  pensión, o si la persona ya está pensionada — explícitamente fuera de
  alcance.

### Archivos creados

- `src/pages/InformacionPensionalEsencial.jsx`
- `src/pages/HistoriaPensionalTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — seis estados nuevos (`anioInicioCotizacion`,
  `nivelConocimientoSemanas`, `semanasCotizadas`, `infoEsencialCompletada`,
  `anioConfirmadoEdadTemprana`, `semanasConfirmadasPara`), wrappers que
  invalidan `infoEsencialCompletada` y las confirmaciones de coherencia ante
  cualquier edición relacionada, y el nuevo valor de `vista`
  (`'historiaPensional'`).
- `src/App.css` — clases nuevas: `.checkbox-option`, `.field__warning`,
  `.field__input:disabled`, y las clases exclusivas de título
  `screen__title--historia-pensional` (corrección proactiva de superposición,
  mismo patrón ya usado en Slices anteriores).
- `src/pages/CompletarExpediente.jsx` — checklist dinámico según
  `infoEsencialCompletada`, en vez de una lista fija (cambio autorizado
  explícitamente sobre un Slice ya cerrado, ver Decisión 5).

### Archivos eliminados

- `src/pages/InformacionPensionalTemporal.jsx` — reemplazado por
  `InformacionPensionalEsencial.jsx`.

### Correcciones y ajustes realizados durante el Slice

- **Corrección de consistencia**: se detectó que `infoEsencialCompletada`
  podía quedar en `true` aunque el usuario modificara una respuesta ya
  registrada después de completar el bloque. Se corrigió envolviendo los
  setters de los tres datos capturados para que cualquier edición reinicie
  `infoEsencialCompletada` a `false` — el checklist de `CompletarExpediente`
  nunca queda desactualizado.
- **Ajuste de redacción**: la pregunta de semanas cambió de "¿Conoces...?" a
  "¿Sabes...?", y su explicación se reescribió para un tono más
  conversacional, por decisión explícita de UX ("PensionLab debe conversar
  con la persona, no interrogarla").
- **Incorporación de la validación cronológica** (año vs. fecha de
  nacimiento, con advertencia no bloqueante antes de los 15 años): agregada
  tras la aprobación inicial, a partir de una observación explícita sobre no
  imponer una edad mínima de 18 años.
- **Incorporación de la validación de coherencia de semanas**: propuesta en
  dos iteraciones — la primera versión usaba una resta de años que
  sobreestimaba el máximo (contaba el año en curso como completo); se
  corrigió a un cálculo basado en fechas exactas con `Date.UTC`. La
  clasificación también se ajustó: el caso de año desconocido pasó de
  "máximo absoluto bloqueante" a "extraordinario con confirmación", para no
  contradecir la decisión ya aprobada de permitir, con confirmación, inicios
  de cotización antes de los 15 años.
- **Corrección de persistencia de confirmaciones**: la primera versión
  dependía solo de comparación derivada (`valorConfirmado === valorActual`),
  lo que permitía que una confirmación antigua "reviviera" si el usuario
  volvía a escribir un valor ya editado antes. Se corrigió agregando
  invalidación explícita en cada wrapper de `App.jsx`, además de la
  comparación derivada.
- **Refactor de arquitectura previo al cierre**: se agregó una nota técnica
  explícita marcando la lógica de coherencia como temporal (candidata a
  migrar a un futuro "Motor de Coherencia del Expediente"), se agruparon las
  constantes de la regla de coherencia en un solo bloque, y se extrajeron los
  textos visibles de las advertencias de coherencia a constantes nombradas
  dentro del mismo archivo — sin crear todavía un sistema de mensajes
  compartido.

### Verificación

- `npm run lint` — sin errores, en cada iteración del Slice.
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones.
- `npm run build` — build de producción exitoso en cada verificación, sin
  advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).

### Commit

```
d586750 ui: implementar pantalla Información pensional esencial con validación de coherencia (Slice S3-008)
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. La captura se limita a dos datos, presentados en una conversación de dos
   pasos dentro de una misma pantalla (estado interno del componente), no un
   formulario con ambos campos visibles a la vez — primer caso de este
   patrón en el MVP; no se extrae un componente de wizard genérico (Principio
   9).
2. Ningún dato bloquea el flujo por sí solo cuando el usuario declara
   explícitamente que no lo conoce (`'desconocido'` para el año, "No las
   conozco." para las semanas) — pero sí se valida la **coherencia entre
   ambos datos**, porque dos respuestas del usuario no pueden contradecirse
   matemáticamente sin que el sistema lo señale.
3. No se impone una edad mínima fija de 18 años para el año de inicio de
   cotización — se distingue lo cronológicamente imposible (antes de nacer,
   en el futuro) de lo extraordinario (antes de los 15 años), que solo
   requiere confirmación explícita, nunca bloqueo automático.
4. La validación de coherencia de semanas se limita a dos niveles (imposible
   / extraordinario), sin introducir todavía un umbral legal o estadístico de
   "muchas semanas" — eso pertenece a una etapa posterior con evidencia real,
   no a este Slice.
5. `CompletarExpediente.jsx`, de un Slice ya cerrado (S3-007), se modifica de
   forma explícita y acotada para que su checklist deje de depender de una
   etiqueta fija y refleje el estado real capturado — autorizado
   explícitamente como integración necesaria de S3-008, no como una
   reapertura general de Slices cerrados.
6. Las confirmaciones de casos extraordinarios se persisten en `App.jsx`
   (sin `context/` ni reducer) mediante un valor que registra exactamente
   qué se confirmó, comparado por igualdad contra el valor actual, **más**
   una invalidación explícita en cada wrapper de edición — la comparación
   derivada por sí sola no bastaba, porque permitía revivir una confirmación
   antigua al volver a escribir un valor ya editado.
7. La lógica de coherencia permanece temporalmente dentro de
   `InformacionPensionalEsencial.jsx`, con una nota de arquitectura explícita
   marcándola como candidata a migrar a un futuro **Motor de Coherencia del
   Expediente** — un componente de dominio responsable de evaluar relaciones
   entre datos del expediente, que deberá ejecutarse antes del Motor de
   Decisión (`PL-230`). No se implementa como componente separado en este
   Slice, consistente con el Principio 9 (este es su primer caso real y
   acotado).

### Pendiente para el siguiente Slice

- Definir el alcance funcional de "Historia pensional" (siguiente Slice),
  reemplazando `HistoriaPensionalTemporal.jsx`.
- Diseñar formalmente el "Motor de Coherencia del Expediente" identificado en
  la Decisión 7, cuando exista un segundo caso real de validación de
  coherencia entre datos del expediente (Principio 9) — en ese momento,
  migrar la lógica hoy temporal en `InformacionPensionalEsencial.jsx`.
- Continuar evaluando si el crecimiento del estado en `App.jsx` (15 valores
  entre `vista` y los datos capturados) sigue siendo manejable o si ya se
  justifica introducir `context/` o una solución de gestión de estado.

---

## Pausa de Sprint 3 — PL-240 (Filosofía de Experiencia de PensionLab)

**Estado:** ✅ Cerrada — PL-240 v1.0 aprobado. Documento fuente en
`docs/producto/PL-240 - Filosofía de Experiencia de PensionLab.md`, entregable
Word en `docs/producto/PL-240 - Filosofía de Experiencia de PensionLab - v1.0.docx`.

### Objetivo de la pausa

Antes de iniciar el Slice S3-009, se detuvo deliberadamente el desarrollo de
nuevas pantallas para construir un documento fundacional de producto —PL-240—
que definiera los principios que guían toda interacción entre PensionLab y sus
usuarios: cómo habla, cómo pregunta, cómo genera confianza, y cómo comunica
incertidumbre, riesgos y oportunidades. A diferencia de PL-230, PL-240 no
describe arquitectura técnica ni implementación — describe comportamiento de
producto.

### Contenido aprobado

PL-240 se construyó y aprobó por partes (propuesta → revisión → aprobación),
siguiendo el mismo método ya usado para PL-230:

- **§0** La Promesa de PensionLab — por qué existe el producto.
- **§1-§3** Filosofía, Propósito del documento, y siete Principios
  fundamentales con nombre memorable (Conversar no interrogar; Brújula no
  piloto automático; Sin certezas fingidas; Progreso sin maquillaje; Ninguna
  puerta sin salida; El idioma de la persona; Cuidar la coherencia).
- **§4-§9** Cómo habla, cómo hace preguntas, cómo genera confianza, cómo
  comunica incertidumbre, riesgos y oportunidades.
- **§10** Principios de diseño conversacional.
- **§11-§13** Ejemplos prácticos de buenas y malas interacciones (anclados en
  pantallas reales de S3-001 a S3-008, no en casos hipotéticos), checklist de
  evaluación para cualquier pantalla nueva, y relación explícita con PL-230,
  con los Principios de Arquitectura y con `docs/ia/principios-y-limites.md`.
- Cierre con Riesgos, Decisiones (tomadas y pendientes), y un epílogo breve.

### Decisiones tomadas en esta pausa

1. PL-240 queda establecido como documento fundacional de Filosofía de
   Experiencia, con rango equivalente —dentro de su propio dominio— al de
   PL-230 dentro del suyo.
2. El checklist de PL-240 §12 se adopta como criterio obligatorio de revisión
   para cualquier pantalla nueva de Sprint 3, empezando por S3-009.
3. Ningún Slice ya cerrado (S3-001 a S3-008) se modifica como parte de esta
   pausa — se usan como fuente de ejemplos ya aprobados, no como objeto de
   rediseño retroactivo.
4. El `.docx` de PL-240 sigue el mismo estándar de encabezado y pie de página
   (código, título y versión del documento; numeración de página) ya usado en
   el entregable Word de PL-230, para mantener consistencia visual dentro de
   la Biblioteca de Conocimiento. El `.docx`, igual que el de PL-230, no se
   versiona en el repositorio — solo el `.md` fuente.

### Pendiente para cuando se retome Sprint 3

- Reanudar S3-009 aplicando el checklist de PL-240 §12 antes de aprobar
  cualquier redacción o flujo nuevo.
- Las decisiones explícitamente pendientes de PL-240 (§15) —en particular el
  mecanismo concreto para que la interfaz "reconozca sus propios cambios" y la
  eventual migración de la lógica de coherencia de S3-008 a un Motor de
  Coherencia del Expediente— quedan abiertas y no bloquean la reanudación de
  Sprint 3.

---

## Slice S3-009 — Pantalla "Esto es lo que ya sabemos de tu historia"

**Estado:** ✅ Cerrado y aprobado — commit local en `sprint-3-mvp-headless`,
sin push.

### Objetivo

Reemplazar la vista temporal `HistoriaPensionalTemporal.jsx` por la primera
pantalla que representa, según PL-240, "el primer momento en que PensionLab
devuelve valor al usuario" — no una pantalla de resumen aislada ni un
formulario más, sino una sola conversación continua de tres tiempos:
comprender lo ya contado, devolver un valor personalizado derivado solo de
esos datos, y abrir desde ese mismo contexto la siguiente pregunta real del
expediente.

### Alcance aprobado

- **Tiempo 1 — Comprensión:** refleja, en lenguaje específico a la persona
  (no genérico), el régimen actual, la forma de cotizar y el nivel de
  conocimiento de sus semanas cotizadas — distinguiendo explícitamente los
  tres niveles (`conocido` / `aproximado` / `desconocido`) sin agrupar
  `conocido` y `aproximado` como si fueran la misma certeza.
- **Tiempo 2 — Valor personalizado (destacado visualmente):** calcula
  `añoActual - anioInicioCotizacion` y lo presenta como el tiempo
  transcurrido desde que la persona empezó a cotizar —nunca como años
  efectivamente cotizados, porque el dato no permite afirmar eso (pudo haber
  interrupciones)—, con redacción distinta para 0, 1 y 2+ años. Si el año es
  `'desconocido'`, reconoce la incertidumbre y explica cómo se reducirá más
  adelante, sin frases genéricas de relleno.
- **Tiempo 3 — Transición + pregunta:** desde ese mismo contexto, abre la
  pregunta "¿Te has trasladado alguna vez entre Colpensiones y un fondo
  privado, o viceversa?", con tres opciones (`'si'` / `'no'` /
  `'no_estoy_seguro'`). La opción "No" se redacta dinámicamente según el
  régimen actual ya conocido ("No, siempre he cotizado en Colpensiones." /
  "...en un fondo privado." / "...en el mismo régimen." si el régimen es
  desconocido).
- `trasladoRegimen` como nuevo estado en `App.jsx`, con invalidación
  semántica: cambiar `regimenActual` reinicia `trasladoRegimen` a `null`
  (porque la opción "No" y su redacción dependen de él); navegar sin
  modificar `regimenActual`, o cambiar `tipoCotizante`/
  `nivelConocimientoSemanas`, conserva la respuesta ya dada.
- `ContinuarHistoriaTemporal.jsx` reemplaza a `HistoriaPensionalTemporal.jsx`
  como vista temporal, con título "Sigamos construyendo tu historia".
- Sin captura de detalle de traslado (fechas, cuántas veces), sin
  salario/IBC, sin semanas verificadas — explícitamente fuera de alcance.
- Sin cambios en `domain/`, `models/`, `data/` ni `context/`. El cálculo de
  años y la resolución de textos son funciones puras locales a
  `HistoriaPensional.jsx`, sin persistirse como dato nuevo del expediente.

### Archivos creados

- `src/pages/HistoriaPensional.jsx`
- `src/pages/ContinuarHistoriaTemporal.jsx`

### Archivos modificados

- `src/App.jsx` — nuevo estado `trasladoRegimen`; wrapper
  `actualizarRegimenActual` que invalida `trasladoRegimen` solo ante un
  cambio real de `regimenActual`; swap de import
  (`HistoriaPensionalTemporal` → `HistoriaPensional`), nuevo import de
  `ContinuarHistoriaTemporal`; nuevo valor de `vista` (`'continuarHistoria'`).
- `src/App.css` — clase nueva `.insight` para el destacado visual del Tiempo
  2, y clase exclusiva de título `screen__title--continuar-historia`
  (corrección proactiva de superposición, mismo patrón ya usado en Slices
  anteriores).

### Archivos eliminados

- `src/pages/HistoriaPensionalTemporal.jsx` — reemplazado por
  `HistoriaPensional.jsx`.

### Correcciones y ajustes realizados durante el Slice

- **Ajuste de redacción del Tiempo 2**: de *"tu historia pensional comenzó
  hace aproximadamente X años"* a *"llevas aproximadamente X años
  construyendo tu historia pensional"* (y su equivalente para 0 y 1 año) —
  un tono más natural y cercano, detectado en la revisión funcional. Se
  verificó explícitamente que "construir tu historia pensional" sigue sin
  implicar años efectivamente cotizados (no reabre el problema ya corregido
  de falsa precisión).
- **El bloque destacado del Tiempo 2 se prepara como componente reutilizable
  futuro**: se le agrega el encabezado fijo (clase `.insight__label`) sobre
  el mensaje (`.insight__message`) — mismo comportamiento, sin nueva
  funcionalidad ni props nuevos, dejando la estructura lista para que en el
  futuro el mismo bloque muestre observaciones, riesgos u oportunidades sin
  rediseñarse (Principio 9: se prepara la lectura, no se generaliza el
  componente todavía).
- **Segunda ronda de ajustes de lenguaje**, detectada en una revisión
  funcional posterior, sin cambiar lógica, cálculo, navegación ni alcance:
  - Tiempo 1: de *"Hasta ahora sabemos que..."* a *"Hasta ahora hemos
    comprendido que..."* — evita repetir "sabemos" (ya usado en el título) y
    refuerza que PensionLab comprende la historia, no solo registra datos.
  - Encabezado del bloque destacado: de "Lo que hemos comprendido" a **"Lo
    que esto nos dice"** — el bloque no resume información, interpreta lo
    que significan los datos ya compartidos; este título también evita
    repetir "comprendido", ya usado en el Tiempo 1.
  - Transición hacia la pregunta del Tiempo 3: de *"Esa trayectoria puede
    haber pasado por un solo camino o por más de uno. Para entenderla
    mejor:"* a *"Hay algo más que nos ayudará a comprender mejor esa
    historia."* — transición más natural hacia la pregunta de traslado, que
    no cambia.

### Decisiones tomadas en este Slice

1. El dato que abre la siguiente pregunta del expediente es el traslado de
   régimen, no salario/IBC — decisión revisada explícitamente durante la
   propuesta: aunque salario/IBC ya tiene campo reservado en
   `UserProfile.laboralInfo`, ese argumento de "listo arquitectónicamente"
   no era real (ningún Slice ha instanciado todavía un `UserProfile`), y
   narrativamente el traslado sigue siendo un hecho de trayectoria —igual
   que régimen, tipo de cotizante y año de inicio—, mientras que salario es
   la primera magnitud financiera orientada a un cálculo futuro.
2. El valor del Tiempo 2 se interpreta estrictamente como *tiempo
   transcurrido desde el inicio declarado*, no como *años efectivamente
   cotizados* — el dato disponible no permite esa segunda afirmación, porque
   pudo haber interrupciones entre el año de inicio y hoy.
3. `trasladoRegimen` captura únicamente si la persona se trasladó alguna vez
   entre Colpensiones y un fondo privado (`'si'` / `'no'` /
   `'no_estoy_seguro'`), suficiente para el alcance de S3-009. Se deja
   registrado, sin implementar, que el concepto que PensionLab necesitará
   modelar más adelante no es el traslado como evento aislado, sino la
   **trayectoria pensional completa** entre regímenes — con al menos las
   siguientes categorías candidatas: siempre en Colpensiones; siempre en
   fondo privado; fondo privado → Colpensiones; Colpensiones → fondo
   privado; más de un traslado; trayectoria desconocida. No se implementa en
   S3-009 (Principio 9: sin un segundo caso real que lo justifique) — queda
   pendiente para cuando el detalle de traslados se aborde en un Slice
   futuro.
4. `trasladoRegimen` se invalida (`null`) únicamente cuando `regimenActual`
   cambia de verdad, no en cualquier llamada a su setter — la opción "No" de
   S3-009 depende semánticamente del régimen actual, así que un cambio real
   de régimen vuelve obsoleta cualquier respuesta ya dada; navegar sin
   editar, o cambiar otros datos no relacionados (`tipoCotizante`,
   `nivelConocimientoSemanas`), no la afecta.
5. Este Slice se evalúa contra el checklist de PL-240 §12 antes de su
   aprobación, siguiendo la decisión ya tomada en la pausa de Sprint 3 previa
   a este Slice.

### Verificación

- `npm run lint` — sin errores, en cada una de las tres rondas de ajuste
  (implementación inicial, refinamiento de Tiempo 2/bloque destacado,
  segunda ronda de lenguaje).
- `npm test` — 2 archivos de test, 18/18 pruebas en verde, sin regresiones en
  ninguna ronda.
- `npm run build` — build de producción exitoso en cada ronda, sin
  advertencias.
- `git diff --check` — sin errores de contenido (solo advertencias de
  conversión de line-ending LF→CRLF, normales en Windows).

### Pendiente para el siguiente Slice

- Definir el alcance funcional del Slice que reemplace
  `ContinuarHistoriaTemporal.jsx` — candidatos identificados: detalle del
  traslado (si `trasladoRegimen === 'si'`), salario/IBC, o semanas
  verificadas mediante historia laboral oficial. Ninguno decidido todavía.
- Diseñar formalmente la clasificación de "trayectoria pensional" (Decisión
  3) cuando exista un segundo caso real que la justifique.
- **Observación de producto registrada para el futuro Motor de Coherencia
  del Expediente** (mismo componente todavía sin diseñar formalmente, ya
  anticipado en la Decisión 7 de S3-008): evaluar la coherencia entre lugar
  de residencia (`lugarResidencia`), lugar de cotización (`lugarCotizacion`)
  y la condición de colombiano en el exterior — por ejemplo, una persona que
  declara residir en Colombia pero cotiza exclusivamente desde el exterior,
  o viceversa. No cambia el alcance de S3-009 ni se implementa ahora; queda
  registrada como candidata para cuando ese componente se diseñe
  formalmente, con el mismo criterio ya establecido de advertir explicando,
  no bloquear salvo lo imposible.

---

## Pausa de Sprint 3 — Primera evidencia ejecutable: semanas mínimas RPM

**Estado:** ✅ Implementado y probado — commit local en `sprint-3-mvp-headless`,
sin push.

### Por qué se pausó S3-010

Antes de continuar con S3-010 (salario/IBC), se hizo un análisis crítico del
MVP desde la perspectiva del usuario, usando PL-230 y PL-240 como referencia.
El hallazgo central: después de 9 Slices y al menos 6 pantallas de captura
real, el sistema nunca había producido una observación evaluativa —solo
comprensión narrativa (S3-009)—, porque `pensionEngine` y el Motor de
Decisión de PL-230 siguen sin implementarse. Al revisar el código (no solo
los documentos), se encontró que `data/legal/versions/vigente-2026.json` ya
tiene, con fuente y artículo citados, los parámetros necesarios para una
primera lectura estructural (edad legal de pensión, semanas mínimas por
sexo, incluido el cronograma decreciente para mujeres de la Sentencia
C-197/2023) — el cuello de botella no era falta de dato, era la ausencia
total de un componente que lo interpretara. Se decidió pausar la cadena de
captura y construir, antes de seguir agregando preguntas, la primera
evidencia real y ejecutable del sistema.

### Qué se construyó

- `obtenerSemanasMinimas` (`src/data/legal/index.js`) modificada para
  devolver trazabilidad completa (`id`, `fuente`, `articulo`, `vigenciaDesde`,
  `vigenciaHasta`, `estado`, `listoParaProduccion`) en vez de un número
  suelto — sin consumidores previos, cambio seguro y verificado antes de
  aplicarlo.
- `resolverReglasVigentes` ahora propaga `metadataFuente` (`estado`,
  `listoParaProduccion`) desde el archivo de versión de origen hacia cada
  entrada individual, ya que esos campos viven a nivel de archivo, no de
  entrada (`schema.js`).
- Pruebas nuevas para `obtenerSemanasMinimas` (`src/data/legal/index.test.js`),
  que no tenía cobertura pese a estar implementada desde antes de Sprint 3.
- `evaluarSemanasMinimas` (`src/domain/evidenciaSemanasMinimas.js`): compara
  las semanas cotizadas declaradas contra el requisito legal general de
  semanas mínimas en RPM, con estados `cumple` / `no_cumple` / `no_evaluable`
  y razones explícitas (`regimen_no_rpm`, `regimen_desconocido`,
  `semanas_desconocidas`, `semanas_invalidas`, `sexo_no_valido`), separación
  entre semanas faltantes y excedentes (nunca negativos), propagación de la
  certeza declarada por la persona (`certezaSemanas`), limitaciones
  estructuradas que viajan con la evidencia, y validación propia del formato
  de semanas (no depende de que la UI ya haya validado correctamente).
- 29 pruebas nuevas (6 del resolver legal, 23 de la evidencia); 47/47 en
  total en el proyecto.

### Decisiones tomadas

1. Deliberadamente no se construye un "Motor de Evidencias" genérico —un
   solo archivo, una sola regla— hasta que exista un segundo caso real que
   lo justifique (Principio 9).
2. `estado` de la evidencia describe si la regla es aplicable al caso
   (`cumple`/`no_cumple`), nunca si la persona "aprueba" algo — distinción
   semántica revisada explícitamente durante el diseño.
3. Ninguna cifra de semanas se presenta con signo negativo —
   `semanasFaltantes`/`semanasExcedentes` siempre `≥ 0`— para que ninguna
   interfaz futura tenga que interpretar el signo de un campo cuyo nombre ya
   implica una dirección.
4. Las limitaciones son estructurales, no responsabilidad de que una
   pantalla las recuerde — viajan con la evidencia: la de régimen de
   transición está siempre presente en resultados evaluables; la de fuente
   legal no lista para producción aparece solo cuando los metadatos reales
   del archivo lo ameritan, nunca como texto fijo.
5. La función es autónoma: valida su propio formato de entrada (semanas) y
   nunca descarta información válida (certeza declarada, fecha de
   evaluación) solo porque otra parte de la evaluación no pudo completarse.
6. **Límite de uso mientras la fuente legal siga en borrador:** mientras la
   fuente legal utilizada (`vigente-2026.json`) conserve
   `estado: 'borrador'` o `listoParaProduccion: false`, esta evidencia puede
   utilizarse para desarrollo, pruebas y demostraciones controladas, pero no
   debe presentarse públicamente como una orientación legal definitiva. La
   interfaz que la consuma deberá mostrar esa limitación de forma visible —
   no basta con que exista en el dato devuelto, tiene que llegar a la
   persona.

### Pendiente

- Diseñar e implementar la pantalla que consume esta evidencia, reemplazando
  `ContinuarHistoriaTemporal.jsx` — sin captura de datos nuevos, mostrando la
  comparación de semanas, el nivel de certeza, la norma utilizada, las
  limitaciones visibles, y una explicación honesta para el caso no
  evaluable.
- S3-010 (salario/IBC) permanece pausado; se retoma después de que esta
  primera orientación esté visible para el usuario.
- Cuando `fechaNacimiento` tenga su primer consumidor real en `domain/` (el
  candidato más probable: una futura evidencia de edad mínima de pensión,
  análoga a esta de semanas mínimas, comparando contra `edadPensionMujer`/
  `edadPensionHombre` ya presentes en `data/legal`), esa función deberá
  validar la fecha de forma autónoma —real, no futura, con su propio
  `no_evaluable` explícito— sin asumir que `DatosIniciales.jsx` ya la validó
  (Principio de Arquitectura 11, ver nota en `UserProfile.js`).

---

## Pausa de Sprint 3 — Segunda evidencia ejecutable: edad de pensión en RPM

**Estado:** ✅ Implementado y probado — commit local en `sprint-3-mvp-headless`,
sin push.

### Objetivo

Resuelve el pendiente dejado por la primera evidencia: `fechaNacimiento`
tiene ahora su primer consumidor real en `domain/`. Antes de proponer una
tercera pantalla de captura, se analizó si el siguiente momento de valor
requería un dato nuevo — no lo requería: `edadPensionMujer`/
`edadPensionHombre` ya estaban citadas en `data/legal`, y `fechaNacimiento` y
`sexo` ya estaban capturados desde S3-003. Se extendió `PrimeraLectura.jsx`
con una segunda evidencia (edad legal general de pensión en RPM) en vez de
crear una pantalla nueva o pedir un dato adicional.

### Qué se construyó

- `obtenerEdadPension(fecha, sexo)` (`src/data/legal/index.js`) — **sin
  parámetro `regimen`**, a diferencia de `obtenerSemanasMinimas`: su
  responsabilidad se limita a resolver qué dice la norma para un sexo y una
  fecha, con trazabilidad completa. La decisión de si esa norma aplica a un
  caso concreto (régimen RPM vs. RAIS) vive en `evidenciaEdadPension.js`, no
  en el resolver — separación de responsabilidades explícitamente más
  estricta que la ya existente en `obtenerSemanasMinimas` (ver "Decisiones
  arquitectónicas" más abajo).
- `evaluarEdadPension` (`src/domain/evidenciaEdadPension.js`) — segundo
  archivo de evidencia independiente, mismo criterio que la primera: sin
  Motor de Evidencias genérico. Valida de forma autónoma su propia
  `fechaNacimiento` (formato ISO, fecha real, no futura), con una
  implementación propia de la validación de fecha —no importada de
  `DatosIniciales.jsx`—, consistente con que un componente de `domain/`
  nunca depende de `pages/`. Sin dimensión de certeza (a diferencia de
  `certezaSemanas`): la fecha de nacimiento no es un dato aproximado.
- `PrimeraLectura.jsx` reestructurada con dos bloques de evidencia
  ("Lo que esto nos dice sobre tus semanas" / "...sobre tu edad"),
  limitaciones deduplicadas por `codigo` en un bloque compartido con
  encabezado propio ("Lo que todavía no hemos podido revisar"), y un cierre
  explícito que previene que cumplir ambos requisitos generales a la vez se
  lea como una determinación de derecho pensional.
- 22 pruebas nuevas (3 del resolver, 19 de la evidencia); 69/69 en total en
  el proyecto.

### Refinamientos posteriores a la primera implementación

- Corrección de una frase que afirmaba "la legislación... aplicable a este
  caso" cuando precisamente una de las limitaciones declara que eso todavía
  no se evaluó — reemplazada por "la regla general que hoy podemos evaluar".
- Bloque combinado: cuando ambas evidencias son `no_evaluable` por la misma
  causa compartida (régimen o sexo, nunca por una razón específica de una
  sola evidencia), la interfaz consolida un único mensaje en vez de repetir
  casi la misma explicación dos veces.
- Eliminada la línea "Basado en la regla general que hoy podemos evaluar"
  del bloque de edad, donde era redundante con su propia oración de
  evidencia; conservada en el bloque de semanas, donde es la única vez que
  aparece.
- Encabezado propio para el bloque de limitaciones compartidas, sin cambiar
  colores, para que no se lea como una tercera evidencia.
- Separación visual adicional (`margin-top: 12px`) entre bloques `.insight`
  consecutivos, acotada con el selector `.insight + .insight` para no
  afectar pantallas con un solo bloque.

### Decisiones arquitectónicas registradas en esta revisión

1. **Límite de alcance de `PrimeraLectura.jsx`.** Queda limitada a
   comparaciones estructurales generales (semanas y edad) en RPM, sin
   cálculos de monto ni captura de información adicional. Se verificó
   contra los campos reales de `data/legal/versions/vigente-2026.json`: no
   existe hoy una tercera comparación de umbral simple disponible sin
   captura nueva o sin construir `formulaRPM`/`pensionEngine` — el resto de
   campos (`tasaCotizacion`, `topeMaximoIBC`, `tasaReemplazo*`, etc.) son
   parámetros de cálculo de monto, no de elegibilidad. No se agregará una
   tercera evidencia a esta pantalla; la siguiente capacidad de valor
   pertenece a un momento posterior del recorrido.
2. **Consolidación visual sin fusión de dominio.** Cuando varias evidencias
   resultan `no_evaluable` por exactamente la misma causa compartida, la
   interfaz puede consolidar el mensaje — la consolidación ocurre
   únicamente a partir de los resultados ya producidos por el dominio,
   nunca modificando ni fusionando las evidencias mismas.
3. **El dominio sigue produciendo evidencias independientes.** Cualquier
   combinación, agrupación o jerarquía visual pertenece exclusivamente a la
   interfaz — `evaluarSemanasMinimas` y `evaluarEdadPension` no se conocen
   entre sí ni comparten estado.
4. **El Motor de Evidencias sigue diferido.** Con dos evidencias reales ya
   comparadas en código, se identificó un candidato pequeño y probado para
   compartir (`construirLimitaciones` y la forma de `normaUsada`, casi
   idénticos entre los dos archivos) — pero no una base suficiente para un
   contrato genérico u orquestador: la dimensión de certeza, las razones de
   no evaluación, y la asimetría de firma entre `obtenerSemanasMinimas`
   (recibe `regimen`) y `obtenerEdadPension` (no lo recibe) siguen siendo
   reales. Esa asimetría queda pendiente de un análisis de impacto propio
   antes de tocar `obtenerSemanasMinimas`, que pertenece a un bloque ya
   cerrado.

### Verificación

`npm run lint`, `npm test` (69/69) y `npm run build` exitosos en cada ronda;
`git diff --check` sin errores de contenido. Verificación visual manual del
bloque combinado (régimen `RAIS`), los dos bloques separados (régimen
`RPM`), el encabezado de limitaciones, ambos "Ver fundamento legal", y
navegación Volver/Continuar sin pérdida de datos.

### Pendiente

- Análisis de impacto específico para alinear la firma de
  `obtenerSemanasMinimas` con la de `obtenerEdadPension` (quitarle
  `regimen`), antes de considerar cualquier extracción de lógica común.
- S3-010 (salario/IBC) permanece pausado.

---

## Pausa de Sprint 3 — Tercera evidencia ejecutable: indicios de régimen de transición

**Estado:** ✅ Cerrado y aprobado — commits `20d0be4` (evidencia, pantalla y
resolvers) y `1b8e8a5` (refinamiento de redacción y jerarquía visual, posterior a
la revisión de producto) en `sprint-3-mvp-headless`, sin push.

### Objetivo

Tras la primera y segunda evidencia (semanas mínimas, edad de pensión en RPM), se
analizó críticamente cuál era el siguiente candidato de valor. De los tres
identificados en el pendiente de S3-009 (detalle de traslado, salario/IBC, semanas
verificadas), se eligió el detalle de traslado porque resuelve —parcialmente y de
forma honesta— una limitación que `PrimeraLectura.jsx` ya le mostraba a la persona
en cada lectura (`REGIMEN_TRANSICION_NO_EVALUADO`), en vez de añadir una capacidad
aislada. El análisis crítico previo a la implementación (candidatos de salario/IBC
bloqueado por el módulo de IBL sin diseñar, y detalle de traslado bloqueado por
`ley100-1993.json` vacío) siguió el mismo patrón ya establecido en las dos pausas
anteriores.

### Alcance aprobado

- **Evidencia limitada exclusivamente a la vía de edad** al 1994-04-01 (Art. 36,
  inciso 2, Ley 100 de 1993) — la vía de 15 años de tiempo de servicio se descartó
  explícitamente para no inferirla desde `anioInicioCotizacion` (autorreportado,
  sensible a interrupciones laborales sin evidencia real que lo respalde).
- **Ningún resultado concluye** "tienes" o "no tienes" régimen de transición:
  estados `con_indicios` / `sin_indicios` / `no_evaluable`, terminología revisada
  explícitamente para evitar lenguaje de determinación en dominio, UI y nombres de
  archivo.
- Vigencia posterior del régimen (Acto Legislativo 01 de 2005, expiración
  2010/2014) y efecto del traslado a RAIS: declarados como limitaciones
  permanentes, nunca calculados.
- `detalleTraslado` (dirección del traslado, con opción "No estoy seguro") se
  captura solo si `trasladoRegimen === 'si'`, en la pantalla nueva —
  `HistoriaPensional.jsx` (S3-009) permanece cerrado y sin modificar.
- Sin tercera evidencia agregada a `PrimeraLectura.jsx` — decisión ya registrada en
  su propio cierre; esta evidencia requiere pantalla propia.

### Investigación normativa

Cotejo directo contra fuentes oficiales primarias (Función Pública/Gestor
Normativo para Art. 36 y Acto Legislativo 01/2005; relatoría oficial de la Corte
Constitucional para la Sentencia de unificación SU-023 de 2018), documentado en
`src/data/legal/trazabilidad-normativa.md`. Estados de validación usan
**"Verificado en una fuente oficial"**, reservando "Validado" para cuando se
complete el cotejo cruzado contra SUIN-Juriscol (intentado sin éxito por error de
certificado en esta sesión).

**Hallazgo relevante no anticipado**: la fecha de entrada en vigencia del Sistema
General de Pensiones no es universal — 1994-04-01 para sector privado y
servidores públicos nacionales, pero 1995-06-30 para servidores públicos
territoriales (Art. 151 Ley 100/1993 + Decreto 1296 de 1994). Se aplica hoy
1994-04-01 a todos los casos por igual, y se registró como observación
arquitectónica: `fechaEntradaVigenciaSistemaPensional` deberá tratarse, en una
versión futura, como un dato normativo trazable potencialmente resoluble según
tipo de afiliado — diferido a Sprint 4, sin enriquecer la interfaz del resolver
legal en esta versión.

### Qué se construyó

- `src/data/legal/versions/ley100-1993.json` — 3 entradas
  (`fechaEntradaVigenciaSistemaPensional`, `edadTransicionMujer`,
  `edadTransicionHombre`), `estado: 'borrador'`, `listoParaProduccion: false`.
- `src/data/legal/index.js` — `obtenerFechaEntradaVigenciaSistema` y
  `obtenerEdadTransicion`, aditivos, mismo shape que los resolvers existentes.
- `src/domain/evidenciaIndiciosTransicion.js` — tercera evidencia real y
  ejecutable, mismo patrón autónomo que `evidenciaSemanasMinimas.js` y
  `evidenciaEdadPension.js`; sin Motor de Evidencias genérico todavía.
- `src/pages/IndiciosRegimenTransicion.jsx` — pantalla nueva, reemplaza
  `SiguientePasoTemporal.jsx` (eliminado).
- `src/pages/SiguienteEtapaTemporal.jsx` — nuevo placeholder temporal siguiente.
- `src/App.jsx` — estado `detalleTraslado`, wrapper `actualizarTrasladoRegimen`
  (invalida el detalle si `trasladoRegimen` deja de ser `'si'`), nuevo valor de
  `vista` (`'indiciosTransicion'`).
- `src/App.css` — clase de título exclusiva y `.field__warning summary` para la
  divulgación progresiva de limitaciones.
- 22 pruebas nuevas (6 de los resolvers en `index.test.js`, 16 de la evidencia en
  `evidenciaIndiciosTransicion.test.js`); 91/91 en total en el proyecto.

### Decisiones de producto y arquitectura tomadas en este ciclo

1. **Ubicación en el recorrido principal, no en un futuro resumen de hallazgos.**
   Evaluada explícitamente como decisión de UX, no solo técnica: se mantiene
   dentro del flujo lineal (Principio 9 — un único caso real no basta para
   diseñar un componente nuevo), preservando la coherencia conversacional de la
   pregunta de traslado abierta en S3-009.
2. **Panel de Hallazgos del Expediente Pensional** queda registrado como
   **hipótesis arquitectónica formal** (no un pendiente suelto) en
   `docs/tecnico/arquitectura/expediente-pensional.md` (Bloque 5 — Resultados,
   Decisión 14), mismo tratamiento que ya recibe Brújula Pensional: se nombra el
   lugar, no se diseña su forma. Se activará su diseño solo ante una **segunda
   evidencia real** que produzca la misma tensión de ubicación — no antes.
3. **Divulgación progresiva de limitaciones**: el bloque "Lo que todavía no
   hemos podido revisar" pasó de `<div>` siempre visible a `<details>` colapsado
   por defecto, reutilizando el mismo patrón nativo ya usado en "Ver fundamento
   legal" — sin generalizarlo ni tocar `PrimeraLectura.jsx`.
4. **Separación entre limitaciones funcionales y estado de la fuente
   normativa**: el contador del `<summary>` solo cuenta aspectos que el análisis
   no evalúa (tiempo de servicio, vigencia, traslado); el estado de la fuente
   (borrador/no lista para producción) se reubicó dentro de "Ver fundamento
   legal", donde pertenece semánticamente.
5. **Nomenclatura revisada en tres rondas** para evitar cualquier lenguaje de
   determinación: la evidencia se llama `evidenciaIndiciosTransicion.js`
   (`evaluarIndiciosTransicion`, estados `con_indicios`/`sin_indicios`), y la
   pantalla se renombró de "Una segunda lectura de tu situación" (demasiado
   genérica) a **"Posibles indicios de régimen de transición"** — nombra el
   tema sin afirmar un resultado.

### Ronda de refinamiento tras revisión visual y de producto

Tras la implementación inicial (commit `20d0be4`), se hizo una revisión visual
manual completa y, después, una revisión crítica del Slice desde una perspectiva
de Product Designer/Arquitecto ajena a la implementación — explícitamente
buscando problemas de narrativa, jerarquía visual y percepción de valor, no
mejoras cosméticas. De esa revisión salieron cinco ajustes aprobados e
implementados (commit `1b8e8a5`):

1. Redacción de `sin_indicios` reescrita para no sonar a descarte definitivo —
   deja explícito que la ausencia de indicios por la vía de edad no descarta la
   otra vía que la ley contempla.
2. Subtítulo reescrito para explicar en una frase qué es el régimen de
   transición y por qué puede importarle a la persona (antes asumía que el
   término ya se entendía), sin agregar detalle jurídico adicional.
3. Texto de ayuda de "No estoy seguro" corregido — antes podía leerse como "esta
   pregunta es opcional" cuando lo opcional es solo conocer la dirección exacta.
4. Línea de vigencia agregada a "Ver fundamento legal", igualando el criterio ya
   usado en `PrimeraLectura.jsx`.
5. Nueva clase `.options--secundario`: reduce el protagonismo visual del bloque
   de detalle de traslado (legend más liviano, menos espacio interno) sin
   cambiar el orden de la conversación (se decidió explícitamente mantener la
   pregunta de traslado antes del hallazgo, por sentirse más natural
   conversacionalmente aunque el cálculo no dependa de ella), las opciones
   disponibles, ni el componente/estilo compartido `.option`.

### Observaciones registradas para el futuro (sin implementar)

De la revisión visual:

1. **Botón "Volver" sin contexto explícito.** Patrón transversal a las ~10
   pantallas del recorrido, no específico de este Slice. Antes del MVP, revisar
   si el texto necesita mayor especificidad (ej. "Volver a Historia pensional").
2. **`SiguienteEtapaTemporal.jsx` se percibe como transición, no como
   progreso.** Cumple su función de placeholder, pero antes del MVP se debe
   revisar si debe transmitir una sensación más clara de avance. Nota dejada
   también en el propio archivo.

De la revisión crítica de producto (perspectiva Product Designer/Arquitecto):

3. **El checklist de `CompletarExpediente.jsx` queda desactualizado.** Solo
   conoce los cuatro bloques base y `infoEsencialCompletada` — no refleja
   Historia pensional, Primera lectura ni Posibles indicios. Un usuario que
   retrocede varias pantallas puede ver *"Siguiente paso: Historia pensional"*
   habiendo ya completado las tres. **Decisión explícita: no se resuelve con
   otro booleano puntual** — es la misma señal que ya motivó, en varios cierres
   anteriores, evaluar si se justifica `context/` o una gestión de estado real;
   arreglarlo bien depende de resolver esa deuda de fondo, no de repetir el
   parche.
4. **Sin puente narrativo entre Primera Lectura e Indicios.** Primera Lectura
   cierra sin reconocer que la siguiente pantalla es otra lectura relacionada.
   Evaluado y **decidido explícitamente no implementar ahora** — tras revisar
   el flujo de nuevo, se consideró que la continuidad ya es suficiente para
   cerrar el Slice; queda registrada solo como posible mejora futura, sin
   reabrir la pantalla otra vez.
5. **`objetivoSeleccionado` (capturado en S3-002) nunca vuelve a aparecer** en
   ninguna lectura ni evidencia — las lecturas se sienten genéricas, no
   ancladas al objetivo que la persona declaró al empezar. Alcance mayor al de
   cualquier Slice individual; probablemente pertenece al mismo momento en que
   se diseñe el Motor de Decisión (PL-230).
6. **Riesgo de fatiga a vigilar**: van 11 pantallas desde Bienvenida sin que el
   sistema entregue todavía un resultado accionable (solo lecturas parciales).
   Coherente con la filosofía de no fingir certezas, pero es una tensión a
   observar según crezca el número de evidencias — no accionable hoy.

### Verificación

`npm run lint`, `npm test` (91/91) y `npm run build` exitosos en cada ronda,
incluida la ronda de refinamiento; `git diff --check` sin errores de contenido.
Revisión visual manual en servidor de desarrollo, cubriendo `con_indicios`,
`sin_indicios`, traslado sin detalle, traslado con detalle concreto, "No estoy
seguro", ventana de escritorio y ventana estrecha (quiebre `max-width: 600px`).
El estado `no_evaluable` no es alcanzable desde la interfaz actual —
`DatosIniciales.jsx` ya garantiza `sexo` válido y `fechaNacimiento` real y no
futura antes de permitir avanzar— por lo que queda cubierto únicamente por las
pruebas automatizadas de dominio, no por revisión manual en navegador.

### Pendiente para el siguiente Slice

- Definir el alcance funcional del Slice que reemplace
  `SiguienteEtapaTemporal.jsx` — candidatos sin decidir: salario/IBC, semanas
  verificadas mediante historia laboral oficial, u otro bloque del Expediente
  Pensional.
- Vigilar la aparición de una segunda evidencia real que produzca la misma
  tensión de ubicación en el recorrido lineal (Decisión 2 de este Slice) —
  cuando ocurra, diseñar formalmente el Panel de Hallazgos del Expediente
  Pensional.
- Resolver, cuando se justifique una solución de gestión de estado real (no
  antes), la desactualización del checklist de `CompletarExpediente.jsx`
  (Observación 3 arriba) — explícitamente no como otro parche puntual.
- Revisar antes del MVP: botón "Volver" sin contexto (Observación 1), sensación
  de progreso de las pantallas de transición (Observación 2), y el puente
  narrativo entre Primera Lectura e Indicios (Observación 4).
- Registrado para una etapa de diseño mayor (Motor de Decisión / PL-230): que
  las lecturas y evidencias se anclen al objetivo declarado por el usuario
  (Observación 5).
- Análisis de impacto pendiente para alinear la firma de `obtenerSemanasMinimas`
  con la de `obtenerEdadPension`/`obtenerEdadTransicion` (heredado de la segunda
  evidencia, sigue sin abordarse).
- S3-010 (salario/IBC) permanece pausado.

---

## Pausa de Sprint 3 — Primer Slice de la secuencia económica: Base actual de cotización

**Estado:** ✅ Cerrado y aprobado — commits `6f5373f` (dominio, resolvers,
pantalla, documentación de arquitectura) y `13fe732` (correcciones de la
ronda final de revisión crítica) en `sprint-3-mvp-headless`, sin push. Este
cierre documental se comitea por separado, mismo criterio ya usado en
Slices anteriores.

### Contexto: de la brecha económica a este Slice

Antes de este Slice se hizo un análisis de brecha hacia el primer resultado
económico de PensionLab (motivado porque, tras nueve Slices y tres evidencias
de elegibilidad, el sistema nunca había producido un número). Ese análisis
concluyó: (1) `formulaRPM.js`/`formulaRAIS.js` ya existen y están probadas
desde Sprint 1, pero sus orquestadores están vacíos; (2) el Camino B —una
cuarta función de dominio con la misma forma liviana que las tres evidencias
ya construidas, en vez de instanciar `UserProfile`/`Simulation` por primera
vez— es la vía más consistente con lo que Sprint 3 ya demostró tres veces;
(3) la secuencia recomendada es salario/IBC → meta de jubilación → RAIS
mínimo → RPM mínimo → viabilidad. Antes de iniciar esa secuencia, se hizo una
segunda pausa para registrar los **Niveles de madurez de la información
pensional** (commit `99bf900`) — el marco que hoy da contenido a
`origenDatoIbc`/`certezaValorDeclarado` de este Slice.

### Objetivo, revisado durante el propio análisis

La propuesta inicial encuadraba el Slice como "capturar salario/IBC". Un
análisis posterior ("¿cuál es el dato que realmente necesita el motor
pensional?") encontró que `formulaRAIS.js` ya asumía, desde Sprint 1 y sin
decirlo, que alguien resolvería un IBC antes de llegar a ella
(`Math.min(salarioActual, topeMaximoIBC * smlv)`). El objetivo final quedó
reencuadrado: obtener el IBC aplicable, trazable, para alimentar las
simulaciones — no conocer el ingreso general de la persona.

### Investigación normativa

Se investigaron cinco casos jurídicos reales (dependiente, independiente por
contrato de prestación de servicios, independiente por cuenta propia, mixto,
colombiano residente en el exterior con afiliación voluntaria) contra fuentes
oficiales primarias (Función Pública/Gestor Normativo, UGPP, Ministerio de
Trabajo, Colpensiones). Hallazgos clave:

- El **Decreto 682 de 2014** (Art. 2) es el fundamento confirmado de la
  afiliación voluntaria de colombianos en el exterior — el IBC debe
  corresponder a ingresos reales (no es una elección arbitraria), con un
  techo de 25 SMLMV confirmado y un piso con **discrepancia sin resolver**
  (el texto de 2014 dice 2 SMLMV; fuentes recientes de Colpensiones dicen 1).
- La cita legal que se había asumido para el 40% del contrato de prestación
  de servicios (Art. 244, Ley 1955 de 2019) **está anulada** — la Corte
  Constitucional la declaró inexequible (Sentencia C-068 de 2020), y las
  resoluciones que la desarrollaban carecen de efectos legales. El
  fundamento vigente exacto de esa regla no quedó identificado con certeza.
- El **Decreto 379 de 2026** (vigente desde 2026-04-07) regula el IBC de
  independientes por cuenta propia, con un esquema de presunción de costos
  por actividad económica que la UGPP ahora define por resolución — más
  volátil que un decreto.

Esta investigación, junto con un análisis posterior de UX ("¿un colombiano
promedio realmente conoce su IBC?"), llevó a **descartar el cálculo de IBC
para cualquier caso distinto de empleado** — la inestabilidad normativa
confirmada reforzó, no solo simplificó, esa decisión.

### Modelo de datos final

```
ibcActualDeclarado        // lo que la persona afirma usar hoy — nunca sobrescrito
ibcActualCalculado         // derivado de otro dato declarado, solo cuando hay regla confiable
ibcAplicableSimulacion     // valor final, después de ajustes — el único que ve el motor
origenDatoIbc               // declarado_por_usuario | calculado_desde_dato_declarado | verificado_en_fuente
certezaValorDeclarado       // conocido | aproximado | desconocido
confianzaReglaAplicada      // validada_directamente_aplicable | aplicable_con_supuestos | pendiente_de_revision
ajustesAplicados             // ej. tope de 25 SMLMV — trazado, nunca aplicado en silencio
limitaciones
```

Decisión de separación explícita (corrigiendo un intento inicial de
mezclarlos): **calidad del dato** (`origenDatoIbc`/`certezaValorDeclarado`) y
**solidez de la regla aplicada** (`confianzaReglaAplicada`) son ejes
independientes — un salario autodeclarado puede alimentar una regla legal
sólida, y viceversa. `gradoEstimacionResultado` se evaluó explícitamente
como candidato y se **descartó de este Slice**: pertenece a una síntesis de
toda una `Simulation` (todos los insumos combinados), no a un dato aislado —
producirlo aquí habría adelantado una responsabilidad del futuro Motor de
Explicabilidad (PL-230 §6.6).

### Alcance aprobado — captura universal simplificada

- Mismo patrón de tres niveles ya validado en semanas cotizadas ("Lo
  conozco" / "Tengo una idea aproximada" / "No lo conozco"), para los cinco
  casos por igual — sin bifurcar la mecánica de captura por tipo de
  cotizante.
- **Solo empleado** tiene una ruta de ayuda opcional (estimar desde salario),
  siempre etiquetada como reconstrucción aproximada, nunca como cálculo
  exacto, con sus excepciones (salario integral, pagos no salariales,
  múltiples empleos) declaradas.
- Independiente, mixto y exterior: **nunca se calcula** — solo se captura el
  valor que la persona ya declara usar hoy.
- Caso mixto: una sola captura del IBC total declarado, sin desglose por
  fuente (diferido explícitamente — evita construir complejidad sin un caso
  real que la use).
- Techo de 25 SMLMV: se aplica siempre, trazado en `ajustesAplicados`, sin
  sobrescribir el valor original.
- Piso doméstico (1 SMLMV): advertencia si el valor está por debajo, nunca
  corrección silenciosa.
- Piso para exterior: **no se aplica** mientras la discrepancia normativa
  siga sin resolver — se declara como limitación explícita.
- `smlv` se resuelve activando conscientemente `permitirTransitorio: true`,
  con su estado jurídico expuesto en el resultado, nunca oculto.
- Cambio de fase (de elegibilidad a estimación económica) reconocido dentro
  del propio subtítulo de la pantalla, sin pantalla de pausa aparte — el
  riesgo de fatiga ya registrado pesó más que la ganancia narrativa de una
  vista sin captura ni resultado propio.

### Qué se construyó

- `src/domain/determinarBaseCotizacion.js` + `determinarBaseCotizacion.test.js`
  (16 pruebas) — cuarta función de dominio, primera de una nueva familia
  (`determinar*`).
- `src/data/legal/index.js` — `obtenerTopeMaximoIBC` y `obtenerSmlv`
  (aditivos), con 6 pruebas nuevas en `index.test.js`.
- `src/pages/BaseCotizacion.jsx` — pantalla "El valor sobre el que cotizas
  hoy", reemplaza a `SiguientePasoEconomicoTemporal.jsx` (antes
  `SiguienteEtapaTemporal.jsx`, eliminado).
- `src/pages/SiguientePasoEconomicoTemporal.jsx` — nuevo placeholder
  temporal siguiente.
- `src/App.jsx` — tres estados nuevos, wrapper de invalidación, nueva vista
  `baseCotizacion`.
- `src/App.css` — clase de título exclusiva.
- `src/models/UserProfile.js` — nota registrando que `salarioActual` (campo
  documentado desde Sprint 1, nunca instanciado) queda superado por el
  modelo real construido aquí.
- `docs/tecnico/arquitectura/expediente-pensional.md` — Niveles de madurez
  actualizados: Nivel 1 pasa de "previsto" a "capturado" para la base de
  cotización, y se corrige la formulación anterior sobre `gradoEstimacion`
  para reflejar que nunca se deriva a nivel de un dato aislado.
- 22 pruebas nuevas; **112/112** en el proyecto.

### Decisiones arquitectónicas consolidadas

1. **Nomenclatura de dominio fijada con este primer caso real**: `evaluar*`
   (juicio de elegibilidad) / `obtener*` (consulta normativa pura) /
   `resolverReglasVigentes` (motor de selección de normas) / `determinar*`
   (dato aplicable del expediente, a partir de información declarada + reglas
   trazadas) — cuatro categorías distintas, sin generalizar todavía una
   infraestructura común (Principio 9).
2. **Separación entre el contrato del Expediente y el contrato del motor**:
   los datos de origen (`salarioMensual`, futuro `valorMensualContrato`)
   permanecen en el Expediente para explicar, recalcular y detectar
   inconsistencias; el motor solo consume `ibcAplicableSimulacion` +
   `origenDatoIbc` + `certezaValorDeclarado`.
3. **Responsabilidad de la fórmula acotada**: el tope se aplica en el Slice
   (donde vive la complejidad jurídica), se entrega ya resuelto al
   orquestador bajo un nombre de parámetro corregido (`ibcMensual`, no
   `salarioActual`), y la fórmula conserva el tope solo como defensa
   adicional, nunca como el lugar donde se decide el significado jurídico
   del dato — pendiente de aplicar en código cuando se construya el
   orquestador de RAIS/RPM.
4. **`gradoEstimacionResultado` diferido en firme** al Motor de
   Explicabilidad — ningún Slice de captura debe producirlo, sin importar
   cuántos datos combine.
5. **Nombre final**: "Base actual de cotización" — evolucionó desde
   "Salario/IBC" (S3-009) → "Capacidad económica actual" (podía sugerir
   patrimonio o gastos) → "Ingreso e IBC actual" (sobreprometía que siempre
   se captura ingreso) → nombre final, el único que describe con precisión
   lo que el Slice captura en los cinco casos.

### Limitaciones explícitamente diferidas

- Cálculo de IBC para independiente (ambas modalidades), mixto y exterior —
  solo captura, nunca cálculo, mientras la normativa siga inestable.
- Desglose de fuentes para el caso mixto.
- Resolución de la discrepancia normativa del piso para exterior (1 vs. 2
  SMLMV).
- Identificación del fundamento legal vigente y preciso del 40% para
  contrato de prestación de servicios (la cita anterior quedó anulada).
- Esquema de presunción de costos por actividad económica para cuenta
  propia.
- Verificación cruzada del IBC declarado contra PILA/UGPP (Nivel 2 del marco
  de madurez).
- Renombrar `salarioActual` a `ibcMensual` dentro de `formulaRAIS.js` — se
  hará junto con la construcción del orquestador, no en este Slice.

### Ronda final — revisión crítica como arquitecto principal

Antes del cierre formal, se hizo una última revisión buscando exclusivamente
problemas que impidieran considerar el Slice un referente de calidad —no
redacción ni preferencias— releyendo `determinarBaseCotizacion.js`,
`BaseCotizacion.jsx` y el cableado de `App.jsx` línea por línea. Encontró dos
problemas reales, corregidos antes de cerrar:

1. **Duplicidad de responsabilidades**: `ajustesAplicados` producía una
   `descripcion` narrativa en el dominio que ningún consumidor leía —
   `BaseCotizacion.jsx` reconstruía su propio mensaje desde los números
   crudos, ignorándola. Se eliminó `descripcion` del dominio;
   `ajustesAplicados` queda puramente estructural (`codigo`, `valorAntes`,
   `valorDespues`, `normaUsada`), igual que un `CalculationTrace` — toda la
   redacción narrativa vive exclusivamente en la pantalla, mismo patrón ya
   usado en `IndiciosRegimenTransicion.jsx`/`PrimeraLectura.jsx`. Se
   aprovechó para extraer `aplicarTopeMaximoIBC`, que reemplaza dos bloques
   casi idénticos de aplicación del tope.
2. **Inconsistencia arquitectónica real**: `tipoCotizante` y
   `lugarCotizacion` (Historial laboral, S3-005) no invalidaban el estado de
   Base actual de cotización al cambiar, a diferencia de cada otro caso
   semánticamente dependiente ya cubierto en el proyecto
   (`regimenActual`→`trasladoRegimen`, `trasladoRegimen`→`detalleTraslado`,
   `certezaBaseCotizacion`→sus propios dependientes). Se agregaron
   `actualizarTipoCotizante`/`actualizarLugarCotizacion` en `App.jsx`, que
   invalidan `certezaBaseCotizacion`/`valorBaseCotizacionDeclarado`/
   `salarioParaEstimarBase` únicamente cuando el valor cambia realmente —
   mismo criterio exacto ya establecido, sin introducir una solución global
   de gestión de estado.

1 prueba nueva verificando el shape sin `descripcion` y la preservación del
valor original; **113/113** pruebas en el proyecto tras esta ronda.

### Qué cambia en la secuencia completa del MVP

Slice 1 de 5 de la secuencia económica, completado. Resuelve explícitamente
el pendiente que quedó abierto como "S3-010 (salario/IBC) permanece
pausado" en cierres anteriores de este documento. Próximo: meta de
jubilación deseada (Slice 2), seguido de RAIS mínimo, RPM mínimo, y una
lectura de viabilidad de la meta declarada.

### Verificación

`npm run lint`, `npm test` (112/112, luego 113/113 tras la ronda final) y
`npm run build` exitosos en cada ronda; `git diff --check` sin errores de
contenido; sin referencias residuales a nombres descartados
(`resolverBaseCotizacion`, `SiguienteEtapaTemporal.jsx`) ni a `descripcion`
en `ajustesAplicados`; sin setters directos para `tipoCotizante`/
`lugarCotizacion` en el cableado de `App.jsx`. Revisión visual manual
cubriendo los cinco casos jurídicos, ajuste de techo, advertencia de piso
doméstico, limitación de piso no evaluado para exterior, ruta de ayuda para
empleado con y sin uso, casos sin ruta de ayuda, validación de "Continuar",
fundamento legal simplificado, eliminación de mensajes duplicados, y los
recorridos de invalidación al cambiar tipo/lugar de cotización (incluido el
caso de responder con el mismo valor, que no debe invalidar nada).

### Pendiente para el siguiente Slice

- Meta de jubilación deseada (`edadJubilacionDeseada`) — Slice 2 de la
  secuencia económica.
- Los asuntos normativos diferidos arriba siguen bloqueando, específicamente,
  cualquier intento futuro de **calcular** (no solo capturar) el IBC de
  independientes o exterior.
- Análisis de impacto pendiente para alinear la firma de
  `obtenerSemanasMinimas` con `obtenerEdadPension`/`obtenerEdadTransicion`
  (heredado de Slices anteriores, sigue sin abordarse).
- Observaciones de UX ya registradas (botón "Volver" sin contexto,
  desactualización del checklist de `CompletarExpediente.jsx`) siguen
  vigentes, sin resolver.

---

## Pausa de Sprint 3 — Consolidación de principios y reconstrucción de la Fase 2 (Base Económica)

**Estado:** ✅ Cerrado y aprobado — commit `3dfb35f` en `sprint-3-mvp-headless`, sin
push. Cierre documental comiteado por separado, mismo criterio ya usado en la
pausa anterior.

### Contexto

Tras cerrar el Slice "Base actual de cotización" (Slice 1 de 5 de la secuencia
económica original), el siguiente paso previsto era "Meta de jubilación deseada"
(edad de jubilación deseada). Antes de implementarlo, una revisión arquitectónica en
profundidad —comprender el problema, revisar la arquitectura existente, cuestionar
el alcance hasta agotarlo— concluyó que ese planteamiento arrastraba varios
supuestos no examinados: que el dato buscado era necesariamente una edad, que
capturar una prioridad del usuario era admisible, y que RAIS y RPM podían tratarse
como responsabilidades paralelas y simétricas. Ninguno sobrevivió al análisis.

### Principios de Arquitectura 12 y 13 (adoptados)

Registrados formalmente en
`docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md`:

- **Principio 12 — PensionLab asesora decisiones pensionales, no decisiones
  personales.** El sistema nunca interpreta la motivación del usuario ni deduce qué
  debería querer realmente. Prueba de consistencia: mismo objetivo pensional,
  distinta motivación personal → mismas estrategias.
- **Principio 13 — El sistema no pide una decisión antes de agotar lo que ya
  sabe.** Antes de solicitar información destinada a orientar decisiones futuras
  (Bloque 3 del Expediente), PensionLab debe mostrar todo el valor que ya puede
  entregar con los hechos que ya conoce (Bloques 1-2).

### Reconstrucción de la Fase 2 — de 5 Slices por fórmula a 4 capacidades por responsabilidad

La secuencia original ("salario/IBC → meta de jubilación → RAIS mínimo → RPM
mínimo → viabilidad") organizaba los Slices por régimen y por fórmula — un reflejo
de la estructura del código (`formulaRAIS.js`/`formulaRPM.js`), no del recorrido
real de la persona. Reconstruida desde los problemas del usuario, la Fase 2 (Base
Económica) queda en cuatro capacidades:

- **A — Lectura estructural de la situación económica**: qué determina el
  resultado bajo el régimen ya conocido, y qué falta para calcularlo. Sin cifra de
  pensión.
- **B — Explorar una dirección**: qué le gustaría a la persona explorar, en sus
  propias palabras — no todavía un `objetivoPrincipal` comprometido.
- **C — Explorar esa dirección con lo que el sistema sabe hoy**: responde a la
  dirección declarada, por régimen, declarando "todavía no evaluable" donde
  corresponda.
- **D — Lectura de distancia y madurez de la información**: nunca un veredicto
  binario de viabilidad.

RAIS y RPM dejan de ser Slices paralelos — cada capacidad produce respuestas
distintas por régimen dentro de una misma responsabilidad, mismo patrón que ya
usa `PrimeraLectura.jsx`.

### Vacío conceptual registrado, deliberadamente sin resolver

Ningún componente de PL-230 (Motor de Evidencias, Explicabilidad) describe con
precisión la responsabilidad de determinar qué le falta a una fórmula dado lo que
el Expediente ya tiene — no es evidencia en el sentido de PL-230 §6.2 (no compara
un hecho contra un umbral normativo) ni es Explicabilidad pura (§6.6, no se limita
a traducir algo ya producido). Se registra como pregunta abierta de arquitectura,
sin bloquear el desarrollo — mismo tratamiento que ya recibieron la Brújula
Pensional y el cálculo de IBL en etapas anteriores del proyecto ("ubicado, no
diseñado").

---

## Slice — Fase 2 (Base Económica), Capacidad A: "Qué determina tu resultado"

**Estado:** ✅ Cerrado y aprobado.

### Objetivo

Explicar, a partir del régimen ya declarado por la persona, qué determina su
resultado pensional y cuál es la causa exacta por la que PensionLab todavía no
puede estimarlo con la confianza suficiente — sin capturar ningún dato nuevo, sin
mostrar ninguna cifra, y sin comparar regímenes entre sí.

### Alcance aprobado

- Reutiliza exclusivamente `regimenActual` — ningún otro hecho del Expediente es
  necesario para esta responsabilidad.
- Tres casos: RPM (falta el IBL — historia de cotización, no el dato actual), RAIS
  (falta el capital ya acumulado, y además un horizonte que todavía no corresponde
  pedir — Principio 13) y régimen desconocido (ambos mecanismos en modo
  condicional, declarando primero que el régimen mismo es la pieza faltante).
- Explícitamente fuera de alcance: cualquier cifra de pensión, el aporte mensual
  (exige investigación normativa propia, no realizada), continuidad futura de
  cotización, comparación entre regímenes, y cualquier veredicto de viabilidad.
- No repite contenido ya cubierto por `PrimeraLectura.jsx` (semanas, edad legal,
  indicios de transición) ni por `BaseCotizacion.jsx` (IBC como cifra).
- "Continuar" siempre habilitado — esta pantalla no captura datos nuevos, mismo
  criterio ya usado en `ExpedientePensional.jsx`.

### Archivos creados

- `src/domain/determinarMecanismoYFaltantes.js` — nombre **provisional**, señalado
  así deliberadamente: ninguna de las categorías ya fijadas (`evaluar*`,
  `obtener*`, `resolverReglasVigentes`, `determinar*`) describe con precisión esta
  responsabilidad. Es, en la práctica, el primer caso real del vacío conceptual
  registrado arriba. No consulta `data/legal` ni `data/assumptions` — su contenido
  es estructural (qué insumo exige cada fórmula), no normativo.
- `src/domain/determinarMecanismoYFaltantes.test.js` — 16 pruebas: los tres casos
  de régimen, régimen nulo/ausente/inesperado (tratados como desconocido, mismo
  criterio que las evidencias existentes), y verificación de que el resultado es
  puramente estructural (sin narrativa).
- `src/pages/QueDeterminaTuResultado.jsx` — título también provisional. Reutiliza
  el patrón visual de `PrimeraLectura.jsx` (bloques `.insight`); toda la redacción
  vive en la página, el dominio solo entrega códigos.
- `src/pages/ExplorarDireccionTemporal.jsx` — nuevo placeholder temporal,
  reemplaza a `SiguientePasoEconomicoTemporal.jsx`. Redactado desde cero,
  deliberadamente sin heredar la promesa de "definiremos hasta cuándo quieres
  seguir cotizando" del placeholder anterior — esa suposición ya se había
  descartado.

### Archivos modificados

- `src/App.jsx` — nuevas vistas `queDeterminaResultado` y `explorarDireccion`;
  `BaseCotizacion` ahora continúa hacia `queDeterminaResultado` en vez de hacia el
  placeholder anterior.
- `src/App.css` — dos clases de título exclusivas (`screen__title--que-determina-resultado`,
  `screen__title--explorar-direccion`), agregadas preventivamente dado que el bug
  de superposición por herencia de `line-height: 145%` ya se repitió en casi todos
  los Slices anteriores.
- `docs/tecnico/arquitectura/plan-implementacion-prerrequisitos-pension-engine.md`
  — Principios 12 y 13 (ver arriba).

### Archivos eliminados

- `src/pages/SiguientePasoEconomicoTemporal.jsx` — retirado únicamente después de
  confirmar que el nuevo recorrido (`BaseCotizacion` → `QueDeterminaTuResultado` →
  `ExplorarDireccionTemporal`) ya estaba conectado y verificado — orden explícito
  pedido antes de implementar: primero reemplazar, después retirar.

### Correcciones aplicadas durante la revisión crítica de coherencia narrativa (PL-240)

Antes del cierre, una revisión activa (no solo confirmatoria) del texto completo
encontró y corrigió tres problemas reales:

1. **Lenguaje técnico innecesario**: se nombraba la sigla "Ingreso Base de
   Liquidación (IBL)" en el mensaje de RPM, inconsistente con la propia decisión
   de este Slice de evitar siglas técnicas de régimen (RPM/RAIS) a favor de
   "Colpensiones"/"fondo privado". Se eliminó la sigla; la frase en lenguaje
   corriente que ya la explicaba se mantuvo intacta.
2. **Presuposición de continuidad futura de cotización**: la frase "hasta cuándo
   piensas seguir cotizando" (mensaje de RAIS) presuponía que la persona sigue
   cotizando activamente, en tensión directa con el caso `cotizaActualmente =
   'no'` ya capturado en Historial laboral (S3-005), y rozando la "continuidad
   futura de cotización" que el alcance de este Slice excluye explícitamente.
   Reemplazada por "el horizonte de tiempo que tienes en mente para tu retiro",
   que nombra el mismo vacío sin presuponer continuidad.
3. **Promesa implícita de secuencia**: "antes de pedirte esa decisión, queríamos
   mostrarte esto primero" daba a entender que el Slice siguiente preguntaría
   puntualmente por ese horizonte, cuando "Explorar una dirección" (Capacidad B)
   es deliberadamente abierto y no se compromete a esa pregunta específica.
   Reemplazada por "eso lo construiremos contigo más adelante, no todavía".

Revisado y conservado sin cambios: la repetición de "todavía" a lo largo de la
pantalla (consistencia terminológica, no ruido); la ausencia de un bloque
expandible de fundamento legal (el contenido es metodológico, no una cita
normativa); "en tus propias palabras" en el placeholder siguiente (refleja una
conclusión ya establecida sobre evitar categorías rígidas de dominio).

### Verificación

`npm run lint`, `npm test` (129/129, sin regresiones) y `npm run build` exitosos
en cada ronda, incluida la ronda final tras las correcciones de coherencia
narrativa. Revisión visual realizada personalmente por el autor del proyecto sobre
el servidor de desarrollo, cubriendo los tres casos de régimen, navegación
Volver/Continuar, conservación de estado, jerarquía visual y ausencia de cifras,
comparaciones y afirmaciones prohibidas.

### Commit

```
3dfb35f feat: agregar Capacidad A de la Fase 2 — Qué determina tu resultado
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

### Decisiones tomadas en este Slice

1. El nombre de la función de dominio y el título de la pantalla quedan
   **provisionales**, revisables sin necesidad de reabrir el diseño funcional ni
   el alcance — decisión explícita para no bautizar prematuramente un concepto
   que corresponde al vacío arquitectónico ya registrado.
2. El placeholder anterior se retira solo después de confirmar el nuevo recorrido
   conectado y verificado, nunca antes — para no dejar, ni siquiera
   transitoriamente, el flujo principal sin una ruta de continuación válida.
3. La función de dominio no consulta `data/legal` ni `data/assumptions` — su
   contenido es estructural (qué exige cada fórmula), no normativo, y no depende
   de ninguna fecha de vigencia.
4. Cualquier valor de `regimenActual` distinto de `'RPM'`/`'RAIS'` (incluido
   `null` o un valor inesperado) se trata como régimen desconocido — mismo
   criterio ya usado en `evidenciaSemanasMinimas.js` y `evidenciaEdadPension.js`.

### Pendiente para el siguiente Slice

- Capacidad B — "Explorar una dirección": capturar, en el lenguaje de la persona,
  qué le gustaría explorar, sin producir todavía un `objetivoPrincipal`
  comprometido de `PerfilDecision`.
- El vacío conceptual sobre dónde vive, formalmente, la responsabilidad de
  `determinarMecanismoYFaltantes.js` sigue abierto — no bloquea, pero cada nuevo
  caso real que lo confirme acerca el momento de resolverlo.
- Nombre definitivo de la función de dominio y del título de la pantalla, a
  decidir sin presión, cuando exista un segundo caso real que ayude a confirmar
  la categoría correcta.

---

## Pausa de Sprint 3 — Nace PL-050, Fundamentos Conceptuales de PensionLab

**Estado:** ✅ Cerrado — commit pendiente de registrar (ver "Commit" más abajo).

### Qué se creó

`docs/PL-050 - Fundamentos Conceptuales de PensionLab.md` — nuevo documento fundacional, permanente
y transversal a los Sprints, sin pertenecer a ninguno de ellos. Vive en la raíz de `docs/`, no bajo
`tecnico/arquitectura/` ni `producto/`, porque no es arquitectura técnica ni experiencia de
usuario — es el sustrato conceptual sobre el que ambas se apoyan.

### Por qué se creó

Antes de PL-050, el razonamiento detrás de decisiones como los Principios 12 y 13 vivía disperso
entre la conversación de diseño y los documentos de Principios ya existentes — sin un lugar
permanente que conservara, además de la regla final, la incertidumbre original, las alternativas
descartadas y los intentos de refutación que esa regla tuvo que superar. PL-050 existe para cerrar
exactamente esa brecha: preserva el razonamiento, no solo la conclusión.

### Arquitectura documental

Unidad de conocimiento: el **Descubrimiento Conceptual (DC)** — un episodio cerrado de
razonamiento, no un concepto individual (un solo DC puede producir varios conceptos, varios
principios y varias preguntas abiertas a la vez, sin fragmentar su historia entre ellos). Cada DC
sigue una plantilla obligatoria de 16 campos, con tres ejes independientes de clasificación (Estado,
Nivel de Evidencia, Vigencia Conceptual), una regla oficial de citación (`PL-050 DC-NNN`), y una
política de evolución explícita: ningún DC se reescribe ni se elimina — evoluciona exclusivamente
mediante nuevos DC relacionados que lo citan.

### Validación

La arquitectura se validó escribiendo dos Descubrimientos Conceptuales reales, ambos ya cerrados y
consolidados:

- **DC-001** — origen del Principio 12 ("PensionLab asesora decisiones pensionales, no decisiones
  personales").
- **DC-002** — origen del Principio 13 ("El sistema no pide una decisión antes de agotar lo que ya
  sabe").

Ninguno de los dos exigió modificar la plantilla original más allá de dos rondas de ajuste editorial
(Fecha de registro y Relación con otros documentos, en la primera revisión; Resumen Ejecutivo y
Vigencia Conceptual, en el cierre). Tras esa validación, la arquitectura documental de PL-050 queda
**declarada congelada**: los próximos cambios al documento deben consistir exclusivamente en agregar
nuevos DC cuando el proyecto produzca conocimiento real que los justifique, no en modificar su
estructura, salvo evidencia objetiva de que ya no funciona.

### Pendiente

- Redacción del tercer Descubrimiento Conceptual real (la reflexión sobre "estrategia" y el
  nacimiento del concepto de "Camino"), cuando el proyecto retome ese frente.
- Decidir si el contenido conceptual ya existente en `expediente-pensional.md` (los 5 Bloques, los
  Niveles de madurez de la información pensional) se migra a PL-050 de forma retroactiva.

### Commit

```
ee6b81b docs: crear PL-050 y formalizar metodologia de revision cruzada con IA
```

Sin push realizado — el commit permanece local en `sprint-3-mvp-headless`.

---

## Slice — Fase 2 (Base Económica), Capacidad B: Declaración libre

**Estado:** ✅ Cerrado y aprobado.

### Objetivo y responsabilidad aprobada

Permitir que la persona exprese, en sus propias palabras, algo que le gustaría resolver
sobre su futuro pensional —una "decisión pensional pendiente", tratada en todo momento
como hipótesis de dominio, no como concepto consolidado— o declarar explícitamente que
no tiene nada puntual por ahora. La capacidad no interpreta, no clasifica, ni reacciona a
lo declarado; esa responsabilidad pertenece a la Capacidad C.

### Alcance final

- Produce una **declaración sin clasificar** (contenido libre, conservado verbatim) o una
  **ausencia explícitamente declarada** — nunca ambas, nunca inferida de un campo vacío.
- No consume ningún dato del Expediente, ni siquiera `regimenActual`.
- No valida contenido por relevancia, pertenencia al dominio, especificidad, ni presencia
  de motivación personal mezclada — todo se conserva sin examinar.
- Captura exactamente una declaración por paso; puede contener uno o varios asuntos
  entrelazados, sin que la capacidad los cuente ni los separe.
- Sin ejemplos en esta primera versión.
- No gestiona vigencia, historial, caminos, objetivos, restricciones ni preferencias.

### Archivos creados

- `src/pages/DeclaracionLibre.jsx`
- `src/pages/RevisionDeclaracionTemporal.jsx` — nuevo placeholder temporal para la
  Capacidad C, redactado desde cero.

### Archivos modificados

- `src/App.jsx` — nuevo estado `declaracionLibre` (única variable con tres valores
  mutuamente excluyentes: `null` | `{ tipo: 'contenido', texto }` | `{ tipo: 'ausencia' }`);
  nuevas vistas; `onContinuar` de `QueDeterminaTuResultado` (Capacidad A) ahora apunta a
  esta capacidad.
- `src/App.css` — clases de título, `.field__textarea`, `.btn-secondary--activo`.

### Archivos eliminados

- `src/pages/ExplorarDireccionTemporal.jsx` — retirado solo después de confirmar el nuevo
  recorrido conectado y verificado.

### Decisiones de arquitectura

1. La capacidad no consume `regimenActual` ni ningún otro dato del Expediente —
   corregido durante la revisión de arquitectura al no encontrar ninguna razón objetiva
   que lo justificara (el régimen no cambia ni la responsabilidad ni la forma de lo
   capturado).
2. No se creó ninguna función de dominio: toda la lógica es una comparación estructural
   trivial (¿hay contenido? ¿hay ausencia declarada?), sin ninguna regla de negocio que
   aislar, probar o reutilizar por separado.
3. No se modificó ni se creó ningún contrato. Se reconoce explícitamente un vacío:
   ningún campo de `PerfilDecision.js` representa hoy "una decisión sin resolver,
   declarada pero no comprometida" — el vacío queda registrado, no resuelto, hasta que
   `PerfilDecision` tenga su primera instanciación real.
4. La gestión de vigencia e historial (qué ocurre si la declaración se actualiza
   después) se reconoció como responsabilidad del futuro modelo que almacene el dato,
   no de esta capacidad de captura.

### Las tres contradicciones resueltas durante el diseño funcional

1. **La capacidad no puede llamar "decisión pensional pendiente" a cualquier texto.**
   Se corrigió nombrando el resultado como una **declaración sin clasificar** — nunca
   como una decisión ya confirmada — dejando que la Capacidad C determine qué contiene
   realmente.
2. **Vacío no equivale a ausencia explícita.** Se distinguieron tres estados: contenido
   declarado, ausencia explícitamente declarada (un acto deliberado de la persona), y
   falta de respuesta (que no es un resultado, sino que la capacidad simplemente no ha
   concluido).
3. **Una sola decisión pendiente no estaba demostrada por la existencia de un único
   `PerfilDecision` vigente.** Se encontró la razón funcional propia: exigir que el
   contenido se limite a una sola decisión, o permitir varias independientes, requeriría
   que la capacidad interprete el contenido — exactamente lo que su responsabilidad
   prohíbe. Se captura exactamente una declaración por paso, que puede contener uno o
   varios asuntos sin que la capacidad los separe.

### Representación de estado

Una única variable con tres valores mutuamente excluyentes (sin definir / contenido /
ausencia), en vez de dos datos independientes sincronizados manualmente — la
simultaneidad de contenido y ausencia queda excluida por construcción, no por
vigilancia. Escribir contenido siempre reemplaza una ausencia previa; declarar ausencia
siempre reemplaza y descarta el contenido previo; ningún borrador paralelo se conserva.

### Ausencia de ejemplos

Se decidió no incluir ejemplos de lo que se podría declarar, por falta de evidencia
dentro del proyecto de que la expresión libre bloquee a las personas — sería la primera
captura de texto verdaderamente libre de todo el proyecto, y no existe ningún caso real
que justifique anticipar esa solución (Principio 9). Se incorporarán solo si la
validación real demuestra la necesidad, bajo las tres condiciones ya definidas en el
diseño de UX (variados en naturaleza, explícitamente ilustrativos, en un lugar
secundario).

### Ajustes finales de coherencia narrativa

- Título ajustado para anclar el dominio pensional sin introducir categorías: "¿Hay algo
  sobre tu futuro pensional que te gustaría resolver?".
- El reconocimiento de recepción se redactó centrado en el acto de recibir, no en el
  acto administrativo de archivar: "Recibimos lo que nos compartiste" / "Tomamos nota de
  que, por ahora, no tienes nada puntual que plantear" — reemplazando una redacción
  inicial ("quedó registrado como parte de tu expediente") que desplazaba el foco hacia
  el expediente en vez de hacia la persona.
- Se eliminó la palabra "exactamente" del placeholder de la Capacidad C, que prometía
  una precisión que esa capacidad todavía no puede garantizar.
- Se corrigió la misma inconsistencia administrativa en el placeholder de la Capacidad
  C, alineándolo con el mismo criterio narrativo ya aplicado en el reconocimiento.
- Se eliminó una repetición mecánica de la palabra "puntual" en el subtítulo,
  conservándola donde sí aporta consistencia terminológica (botón, reconocimiento de
  ausencia, mensaje de bloqueo).
- Se retiró la palabra "todavía" del botón de declarar ausencia, por reintroducir
  sutilmente una expectativa de que "vendrá algo después" — contrario a la decisión de
  tratar la ausencia como una afirmación legítima del momento presente, no como algo
  pendiente.

### Verificación

`npm run lint`, `npm test` (129/129, sin regresiones) y `npm run build` exitosos en cada
ronda, incluidas las rondas de ajuste narrativo posteriores a la revisión visual.

### Revisión visual

Realizada personalmente por el autor del proyecto sobre el servidor de desarrollo.
Aprobada sin encontrar problemas de arquitectura, recorrido, implementación ni
funcionamiento — confirmó específicamente la transición limpia entre contenido y
ausencia sin residuos, el bloqueo de "Continuar" con mensaje visible, y la ausencia de
categorías o comparaciones en el texto.

### Pendiente para la Capacidad C

- Determinar si la declaración contiene una decisión procesable, una pregunta
  informativa, varios asuntos entrelazados, motivación personal mezclada, o contenido
  fuera de alcance.
- El vacío ya reconocido en `PerfilDecision.js` sigue sin resolver.
- Redacción formal, todavía pendiente, del Descubrimiento Conceptual sobre "decisión
  pensional pendiente" en PL-050, una vez exista un segundo caso real que lo confirme.

---

## Pausa de Sprint 3 — Redefinición de la Capacidad C y frontera de PerfilDecision

**Estado:** ✅ Cerrado y aprobado — análisis conceptual puro (2026-08-06), sin ningún
cambio de código.

### Contexto

Tras cerrar la Capacidad B ("Declaración libre"), el siguiente trabajo previsto era
"Capacidad C": interpretar esa declaración. Antes de diseñarla, una revisión
arquitectónica en profundidad —con el mismo rigor que la pausa que produjo los
Principios 12 y 13— cuestionó si "Capacidad C" tenía, en realidad, una
responsabilidad propia que justificara su existencia como capacidad independiente.
No la tenía, en su formulación original.

**Resultado de este documento**: "Capacidad C" deja de usarse como nombre. El
trabajo que se le atribuía queda redistribuido entre una **capacidad de
reconocimiento** (también referida abajo como "zona de mediación" — los dos
términos designan la misma pieza) y un flujo de formulación y confirmación que
pertenece al Bloque 3 (`PerfilDecision`). Ambos se definen en detalle en
"Frontera aprobada", más abajo.

### Recorrido del análisis — tres intentos de justificación, los tres rechazados

1. **Capacidad C como clasificador de texto** (¿decisión procesable? ¿pregunta
   informativa? ¿varios asuntos? ¿motivación mezclada? ¿fuera de alcance?).
   Rechazado: reduce la capacidad a taxonomía de datos, sin fundamentar por qué el
   negocio necesita esa taxonomía en sí misma.
2. **Capacidad C como gestor de flujo** (¿qué debe reconocer o decir PensionLab
   antes de continuar el recorrido, dado lo declarado?). Rechazado: convierte la
   capacidad en un gestor de mensajes de experiencia, no en una responsabilidad de
   negocio.
3. **Prueba de conocimiento de negocio concreto**: "¿qué sabe PensionLab después de
   esta capacidad que no sabía antes, en términos de negocio (hechos o
   decisiones)?" No se pudo responder con precisión sin caer en uno de dos lugares:
   territorio de `PerfilDecision` (fuera de alcance por decisión explícita de
   diseñar esta capacidad por completo antes de decidir cualquier cambio al
   contrato de `PerfilDecision`) o en una de las dos abstracciones ya rechazadas.

### Ejercicio contrario — asumir que la Capacidad C no existe

Se analizó qué pasaría si, tras B, el siguiente paso fuera directamente el diseño
del Bloque 3 (`PerfilDecision`). Conclusión: **eliminar el nombre no elimina las
responsabilidades reales.** Sin un lugar explícito que las asuma, quedan sin dueño
—qué hacer con ambigüedad, con varios asuntos entrelazados, con contenido fuera de
dominio, cómo preservar la declaración cruda— y terminan filtrándose, sin ser
reconocidas, dentro del propio contrato de `PerfilDecision`, contaminándolo con
preocupaciones de interpretación de lenguaje que no le corresponden. La
arquitectura no se simplifica al quitar el nombre: la complejidad solo se mueve a
un lugar sin dueño, lo cual es peor que tenerla en una capacidad explícita.

### Frontera aprobada (hipótesis de trabajo, no verdad definitiva)

- **B sigue siendo una captura completamente fiel** — nunca interpreta, nunca se
  modifica después de capturada.
- **`PerfilDecision` sigue siendo un contrato puro de decisiones ya confirmadas** —
  nunca representa ambigüedad, nunca se llena a medias, nunca admite estados
  intermedios.
- Entre ambos existe una **zona de mediación**, con dos etapas internas:
  - **(a) Reconocimiento de aptitud** — ¿hay materia pensional operable? Tres
    estados posibles (apto / no_apto / indeterminado), autoridad exclusiva del
    sistema, de naturaleza cercana a una validación (Principio 11) aplicada a
    pertinencia de dominio en vez de a formato.
  - **(b) Resolución de estructura** — ¿cuántos asuntos contiene la declaración y
    tienen precisión suficiente para formularse? Autoridad compartida: el sistema
    constata la forma, pero nunca decide cuál asunto es prioritario ni rellena lo
    que falta (Principio 12).
- Se evaluaron tres alternativas de agrupación —una capacidad fusionada, dos
  capacidades separadas, una capacidad con dos etapas internas— contra ocho
  criterios (cohesión, autoridad, interacción, pruebas, trazabilidad, riesgo de
  sobrearquitectura, evolución con evidencia real, impacto en el recorrido).
  **Ganó la tercera**: una sola capacidad de reconocimiento con dos etapas
  internas, coherente con un patrón que el proyecto ya usa (`determinarBaseCotizacion`,
  `determinarMecanismoYFaltantes`: una función de dominio, varios casos internos
  diferenciados) y que evita tanto la pérdida de precisión de fusionar como la
  sobrearquitectura de separar un flujo que nunca ocurre de forma independiente.
- **(c) Formulación propuesta + (d) Confirmación de la persona NO son parte de
  esta capacidad** — son el mecanismo mismo por el que nace un `PerfilDecision`, y
  pertenecen conceptualmente al Bloque 3. La confirmación explícita de la persona
  es el único acto legítimo que puede crear `objetivoPrincipal` sin violar el
  Principio 12; el sistema puede proponer una traducción a vocabulario de dominio,
  nunca imponerla.

### Matriz de escenarios — resumen

Se analizaron diez escenarios, cada uno evaluado contra: entrada de ejemplo,
resultado de aptitud, resultado de estructura, autoridad del sistema vs. de la
persona, si avanza al Bloque 3, qué queda pendiente, qué no debe hacer PensionLab,
y un criterio de aceptación verificable. El detalle campo por campo de cada
escenario no se transcribe en este documento — lo que sigue es el resultado ya
consolidado, suficiente para las decisiones registradas aquí:

1. Ausencia explícita — estado terminal, no entra al ciclo aptitud/estructura.
2. Contenido pensional preciso — apto, un asunto, listo para el Bloque 3.
3. Contenido pensional ambiguo — apto, estructura incompleta.
4. Contenido pensional con información faltante — apto, estructura incompleta.
5. Varios asuntos entrelazados — apto, múltiples asuntos sin jerarquizar por el
   sistema; **sin destino posterior definido** (vacío, ver abajo).
6. Mezcla de contenido pensional y no pensional — aptitud mixta; exige operar
   sobre fragmentos, no sobre la declaración completa (vacío, ver abajo).
7. Contenido fuera de alcance — no apto, explícito, nunca en silencio.
8. Aptitud indeterminada — tercer estado honesto, distinto de apto/no_apto.
9. Texto muy corto o de baja información — tratamiento equivalente a 8.
10. Declaración que coincide con evidencia ya conocida por el sistema (ej. "cuántas
    semanas me faltan") — apto y preciso, pero **sin destino claro** en el modelo:
    ni es candidato al Bloque 3 ni es fuera de alcance (vacío, ver abajo).

**Agrupables**: 3+4 (mismo tratamiento: apto/estructura incompleta); 8+9 (mismo
tratamiento: información insuficiente para juzgar).
**Exigen tratamiento independiente**: 5, 6, 7, 10.

**Alcance mínimo recomendado para Sprint 3**: cubrir 1, 2, 3+4 (agrupados), 7, 8+9
(agrupados). **Diferir explícitamente** 5, 6 y 10 hasta resolver los vacíos que
exponen — no implementarlos por presión de completitud.

### Vacíos identificados en la definición aprobada

1. El escenario 10 no tiene destino en el modelo: la definición asume que todo lo
   "apto y preciso" es candidato al Bloque 3, pero una pregunta ya respondible con
   evidencia existente no es una decisión pendiente.
2. El escenario 6 exige que la capacidad opere sobre fragmentos de una
   declaración, no sobre ella como unidad — no contemplado en la definición
   original de "entrada" (ver "Frontera aprobada", que sigue hablando de "la
   declaración" como una sola unidad de entrada).
3. El escenario 5 se reconoce pero no se resuelve: no está definido qué ocurre
   después de detectar varios asuntos sin jerarquía.

(El tercer estado de aptitud, "indeterminado", que en una versión anterior de este
análisis figuraba como vacío, ya quedó incorporado como parte de la definición en
"Frontera aprobada" — no es, a esta altura, un vacío pendiente.)

### Revisión crítica — hallazgos que sobreviven y no deben olvidarse

- **El mecanismo real para juzgar "aptitud" sobre texto libre nunca se validó.**
  Todo el análisis es conceptual, construido sobre diez escenarios hipotéticos, sin
  una sola declaración real observada — riesgo directo de que la propia
  arquitectura de esta capacidad viole el Principio 9 ("generalizar solo con
  evidencia real").
- **"Resolución de estructura" ya roza interpretación semántica**: distinguir "un
  asunto compuesto" de "varios asuntos distintos" no es una operación puramente
  formal. La tensión con el Principio 12 está mitigada por el diseño, no eliminada
  por completo.
- **Riesgo de experiencia real**: si "indeterminado" termina siendo, en la
  práctica, el resultado dominante, la invitación de B ("cuéntanoslo con tus
  propias palabras") quedaría desmentida por una respuesta frecuente de "no
  pudimos determinar esto" — peor que no tener la capacidad.
- **Señal de sobreingeniería reconocida explícitamente**: varias rondas sucesivas
  de diseño puramente conceptual, sin código, sin declaraciones reales, sin
  validar si el mecanismo es siquiera viable con las herramientas actuales del
  proyecto (JS determinista, sin NLP en el stack).

### Decisión de método para lo que sigue

Se declara **agotado el límite útil del análisis conceptual con escenarios
hipotéticos**. El siguiente paso no es más generalización: es diseñar un
**mecanismo mínimo viable** y contrastarlo con **declaraciones reales** capturadas
vía la Capacidad B durante el desarrollo del producto — la aplicación ya permite
generar esa evidencia. La siguiente sesión debe comenzar directamente en la etapa
de **arquitectura técnica** de esta capacidad mínima, respetando todo lo aprobado
en este documento, sin repetir el análisis de negocio ya cerrado.

### Verificación

No aplica a código — ninguna línea de `src/` se modificó durante este análisis. Se
confirmó al inicio que el estado previo del repositorio seguía vigente: `npm run
lint`, `npm test` (129/129) y `npm run build` en verde, working tree limpio salvo
dos `.docx` sin trackear (PL-230, PL-240), ajenos a este análisis.

### Commit

Pendiente de crear.

### Pendiente para la etapa de arquitectura técnica

- Diseñar el mecanismo concreto de juicio de aptitud/estructura (reglas,
  heurísticas u otra aproximación — sin comprometerse todavía a ninguna).
- Recolectar u observar declaraciones reales de la Capacidad B antes de cerrar el
  mecanismo, en vez de seguir razonando sobre ejemplos hipotéticos.
- Resolver, o decidir conscientemente diferir con su propia justificación, los
  tres vacíos señalados arriba.
- Actualizar `src/pages/RevisionDeclaracionTemporal.jsx` solo cuando exista diseño
  técnico aprobado — no antes.
- El vacío en `PerfilDecision.js` (ninguna forma de representar una decisión
  declarada pero no comprometida) sigue sin resolver — se resuelve al diseñar el
  Bloque 3, coordinado con esta capacidad, no antes de eso.

---

## Slice — Motor de proyección RAIS y su integración al recorrido (ExploraTuProyeccion)

**Estado:** ✅ Cerrado y aprobado.

### Objetivo

Construir el primer motor de cálculo real de todo el proyecto — hasta este Slice,
PensionLab nunca había mostrado una cifra pensional a una persona, solo evidencias
de elegibilidad (semanas, edad) y explicaciones de mecanismo. Conectar `formulaRAIS.js`
(ya pura y probada desde un Sprint anterior, nunca invocada) con los datos ya
capturados en el recorrido, y mostrar el resultado en una pantalla nueva, mínima,
condicional a régimen RAIS.

### Alcance aprobado

**Dominio:**
- `data/assumptions/index.js` — resolver propio de supuestos (`resolverSupuestosVigentes`,
  `obtenerSupuesto`), replicando el patrón de `data/legal` sin importarlo (Principio 1).
- `data/assumptions/versions/supuestos-v1.json` — poblado con los 3 supuestos ya
  aprobados de RAIS (`rentabilidadEsperadaRAIS` 0.035, `descuentoSobreAporteCapitalizable`
  0.1875, `mesesPayoutSimplificado` 240), sin cambios de valor respecto a
  `trazabilidad-formula-RAIS.md`.
- `data/legal/index.js` — nuevo wrapper `obtenerTasaCotizacion(fecha)`.
- `domain/pensionEngine/calcularProyeccionRAIS.js` — orquestador real. Consume
  `ibcAplicableSimulacion` (nunca el valor declarado crudo); estados `'calculado'`
  / `'no_evaluable'` (`regimen_no_rais`, `edad_jubilacion_no_declarada`), sin inventar
  una edad de jubilación por defecto; la limitación de que el capital ya acumulado
  no está incluido viaja estructuralmente en todo resultado calculado.
- `domain/calcularEdadCumplida.js` — extraída de `calcularProyeccionRAIS.js` para
  que la pantalla nueva no duplicara la misma lógica una quinta vez (el proyecto ya
  tenía cuatro copias independientes de esta función; esta extracción resuelve solo
  la duplicación nueva entre dominio y esta pantalla, no las cuatro preexistentes,
  fuera de alcance de este Slice).

**UI:**
- `pages/ExploraTuProyeccion.jsx` — nueva pantalla, condicional a régimen RAIS,
  insertada entre `QueDeterminaTuResultado` y `DeclaracionLibre`. Captura una edad
  hipotética de jubilación (explícitamente distinguida de la edad legal ya vista en
  `PrimeraLectura`), recalcula `ibcAplicableSimulacion` invocando `determinarBaseCotizacion`
  con los datos crudos ya existentes en `App.jsx` (sin persistir el resultado derivado),
  y muestra el resultado de `calcularProyeccionRAIS` en la misma pantalla — cifra,
  horizonte usado, y la limitación de capital acumulado no incluido, siempre visible.
- `App.jsx` — nuevo estado `edadJubilacionDeseada`; nueva vista condicional
  (`regimenActual !== 'RAIS'` salta directo a `declaracionLibre`, mismo patrón ya
  usado para el caso `ausencia` en un Slice anterior, hoy revertido).
- `App.css` — clase de título exclusiva (`screen__title--explora-tu-proyeccion`) y
  modificador `screen__subtitle--secundario` para diferenciar el peso visual del
  texto de apoyo del texto principal.

**Ajuste de cierre (pulido menor, mismo Slice) — estándar oficial de navegación por Enter:**

Lo que empezó como un ajuste puntual en `Bienvenida.jsx` (Enter vía `autoFocus`) se
generalizó, dentro del mismo Slice, a las 14 pantallas de captura del recorrido
completo: `Bienvenida`, `Objetivo`, `DatosIniciales`, `SituacionPensional`,
`HistorialLaboral`, `ExpedientePensional`, `CompletarExpediente`,
`InformacionPensionalEsencial`, `HistoriaPensional`, `PrimeraLectura`,
`IndiciosRegimenTransicion`, `BaseCotizacion`, `QueDeterminaTuResultado`,
`ExploraTuProyeccion`.

**Mecanismo adoptado, ahora estándar oficial de PensionLab para toda pantalla de
captura futura**: el contenedor principal de cada pantalla pasa de
`<div className="screen">` a `<form className="screen" onSubmit={...}>`; el botón
principal pasa de `type="button" onClick={...}` a `type="submit"` (sin `onClick`,
para que nunca haya doble disparo); "Volver" se mantiene como `type="button"`. Es
comportamiento 100% nativo del navegador — Enter en cualquier campo de texto,
radio, select o checkbox dispara el envío del formulario; un botón deshabilitado
nunca participa en ese envío, ni explícito ni implícito; un `<textarea>` está
excluido de esa regla por el propio HTML, así que `DeclaracionLibre` no requirió
ningún cambio ni tratamiento especial para conservar Enter como salto de línea.
`InformacionPensionalEsencial` usa dos `<form>` independientes (uno por paso), ya
que solo uno está montado a la vez.

**Revisión arquitectónica previa a la adopción como estándar**, verificada contra
ocho criterios (autofill, navegación con Tab, radios/checkboxes, selects,
validaciones HTML nativas, móvil, lectores de pantalla, y cualquier otra
interacción nativa) — sin ningún riesgo bloqueante encontrado. Se verificó
explícitamente, y no se dio por supuesto, que ningún campo con `min`/`max`/`pattern`
nativos pueda entrar en conflicto con la validación propia de la app (todo campo
con restricción nativa ya tiene una validación de app al menos igual de estricta
gatillando el `disabled` del botón, y un botón deshabilitado nunca dispara
validación nativa porque nunca intenta enviarse), y que `AppShell.jsx` no anida
ningún `<form>` propio (habría roto el mecanismo en silencio, por ser HTML
inválido). Tres puntos quedan registrados explícitamente como mejora futura, no
bloqueante: agregar `autoComplete="off"` donde el autocompletado del navegador no
tenga sentido; esta funcionalidad tiene alcance limitado en teclados numéricos
móviles (sin tecla "Enter" propia en la mayoría de los casos); y agregar
`aria-label` a cada `<form>` para que se anuncie como región de navegación
(landmark) a lectores de pantalla.

### Decisiones tomadas en este Slice

1. RAIS, no RPM, es el único camino de cálculo alcanzable hoy — RPM sigue bloqueado
   por la ausencia total del módulo de IBL (nunca ubicado siquiera como stub) y por
   la falta de historial de IBC, que ninguna pantalla captura todavía.
2. `ibcAplicableSimulacion` se recalcula en cada render dentro de la pantalla nueva,
   sin persistirse en `App.jsx` — es barato de recalcular y evita mantener un dato
   derivado sincronizado con su origen.
3. Validado reproduciendo los tres casos de referencia (A, B, C) ya documentados en
   `trazabilidad-formula-RAIS.md`, ejecutados a través del orquestador completo (no
   solo la fórmula pura), con diferencias del orden de 10⁻⁵ — margen de redondeo de
   la tabla publicada, no discrepancias de cálculo.
4. Se revisó y descartó parcialmente el camino de "MVP corto" explorado antes en este
   mismo Sprint (recorte temporal de pantallas para una demo de minutos) — decisión
   explícita de Product Owner de mantener la visión completa del producto; este
   Slice se integró al recorrido existente sin ocultar ni reordenar ninguna pantalla.

### Verificación

`npm test` (156/156), `npm run lint` y `npm run build` exitosos en cada ronda.
Verificación numérica adicional: los tres casos de referencia de `trazabilidad-formula-RAIS.md`
reproducidos a través de `calcularProyeccionRAIS` completo, fuera de la suite
automatizada, ejecutados directamente contra el código real del proyecto.

Verificación manual del estándar de Enter en las 14 pantallas: confirmada por el
usuario en navegador antes del cierre de este Slice. El asistente no contó con
herramienta de navegador disponible en esta sesión, así que la verificación en
vivo la realizó directamente el usuario — la implementación se apoya en
comportamiento nativo de HTML ya bien establecido (envío de formulario vía Enter,
excepción nativa de `<textarea>`), no en lógica nueva escrita para este proyecto.

### Revisión de UX (producto, no arquitectura)

Se recorrieron las 16 pantallas del recorrido completo desde la perspectiva de una
persona usando PensionLab por primera vez (qué siente, qué entiende, qué duda,
densidad de texto, emoción/confianza, qué cambiaría). Ningún hallazgo de esa
revisión se implementó en este Slice — quedan registrados como deuda de UX para una
futura ronda de pulido, sin bloquear este Sprint:

1. **Cierre débil del recorrido** — `RevisionDeclaracionTemporal` termina la
   experiencia justo después de sus dos momentos más fuertes (`ExploraTuProyeccion`,
   `DeclaracionLibre`) con un mensaje de placeholder genérico.
2. **Redundancia percibida entre `ExpedientePensional` y `CompletarExpediente`** —
   dos pantallas de resumen consecutivas sin información nueva entre sí.
3. **Jerarquía visual de la cifra en `ExploraTuProyeccion`** — el primer resultado
   pensional real de todo el producto hoy pesa visualmente igual que cualquier otro
   bloque de evidencia ya mostrado antes.
4. **Jerarquía visual de `PrimeraLectura`** — el impacto emocional de las dos
   lecturas personales llega mezclado con el detalle jurídico, sin jerarquía entre
   ambos.
5. **Falta de "por qué te pregunto esto" en varias capturas** — lugar de residencia
   (`DatosIniciales`), el conjunto de `HistorialLaboral`, y la relación entre "base
   de cotización" y "salario" (`BaseCotizacion`). Patrón repetido, no un caso
   aislado.

### Deuda arquitectónica registrada (no implementada, no bloqueante)

Documentada con detalle en `plan-implementacion-prerrequisitos-pension-engine.md`
("Riesgos generales del plan"):

- El manifiesto de vigencia jurídica pendiente (`LINEA_DE_TIEMPO_VIGENTE`
  hardcodeada) ahora también aplica a `data/assumptions` (`LINEA_DE_TIEMPO_SUPUESTOS`),
  replicado deliberadamente con la misma limitación al construir el resolver de
  supuestos de este Slice.
- El sistema no tiene todavía una representación estructural para dos
  interpretaciones jurídicas simultáneamente razonables (distinto del caso ya
  cubierto de un valor transitorio) — ejemplo real ya presente en
  `evidenciaIndiciosTransicion.js`.

### Commits

```
d170314 domain: implementar calcularProyeccionRAIS - primer motor de calculo real
```

Commit de UI + ajuste de Enter + esta documentación: pendiente de aprobación final
antes de crearse. Sin push en ningún caso — ambos commits permanecen locales en
`sprint-3-mvp-headless`.

### Pendiente para la siguiente ronda

- Confirmación manual del usuario de que Enter en `Bienvenida` funciona como se
  espera, y de que el resto del recorrido no sufrió ninguna regresión visual.
- Los cinco hallazgos de UX registrados arriba.
- Los dos puntos de deuda arquitectónica registrados arriba.
- `edadJubilacionDeseada` sigue siendo, hasta este Slice, el único dato que este
  motor necesita y que ninguna otra capacidad del proyecto reutiliza todavía.

---

## Slice RPM — Lectura económica RPM con historia estructurada (ExploraTuProyeccionRPM)

**Estado:** ✅ Implementación completada. Revisión técnica completada. Revisión visual
manual completada. Revisión narrativa completada. Staging técnico limpio y verificado de
forma aislada. Cierre aprobado para commit.

### Objetivo

Construir la primera lectura económica del régimen RPM, basada exclusivamente en la
historia de cotización observada hasta hoy — nunca proyectada hacia una edad futura de
retiro, y nunca presentada como la pensión que la persona recibirá al pensionarse. Mismo
criterio de honestidad ya aplicado en `ExploraTuProyeccion.jsx` (RAIS) y
`QueDeterminaTuResultado.jsx`.

### Capacidades implementadas

- Selección de períodos para el IBL (`seleccionarPeriodosIBL.js`), incluida la frontera de
  evaluabilidad frente a huecos, solapamientos y cotización parcial dentro de la ventana.
- Cálculo del IBL ordinario (`formulaIBL.js`), indexado año a año contra IPC histórico.
- Soporte de la alternativa legal de vida laboral (Art. 21, inciso 2, Ley 100 de 1993)
  cuando la condición de habilitación se cumple, comparada numéricamente contra el
  ordinario sin asumir de antemano cuál resulta mayor.
- Cálculo de semanas observadas (a partir de `diasCotizados`, nunca de duración calendario
  asumida).
- Cálculo de la tasa de reemplazo RPM sobre el IBL aplicable.
- Cálculo del resultado económico sobre la historia observada hasta hoy
  (`calcularPensionRPM.js`, orquestador completo).
- Pantalla `ExploraTuProyeccionRPM.jsx`.
- Integración de la ruta normal hacia esa pantalla desde `QueDeterminaTuResultado`
  (`regimenActual === 'RPM'`), sin retirar ninguna ruta existente.
- Fixture de desarrollo `rpm-empleada-historia-evaluable` para verificación manual.
- Infraestructura mínima de desarrollo (`src/dev/`: `PanelDesarrollo.jsx`,
  `aplicarFixture.js`, `construirSettersEdicion.js`, `estadoApp.js`, `fixtures.js`)
  necesaria para cargar y verificar el caso — no existe todavía una pantalla real de
  captura de historia laboral estructurada (fuera de alcance de este Slice).
- Respaldo legal (`data/legal/versions/vigente-2026.json`, entrada 15) y estructura de IPC
  histórico (`data/legal/versions/ipc-historico.json`) incorporados en este Slice.

### Archivos en el staging de este cierre

**Creados:** `domain/seleccionarPeriodosIBL.js` (+ test), `domain/formulas/formulaIBL.js`
(+ test), `domain/formulas/trazabilidad-formula-IBL.md`,
`domain/pensionEngine/calcularPensionRPM.test.js`, `pages/ExploraTuProyeccionRPM.jsx`,
`data/legal/versions/ipc-historico.json`, `format/formatearDinero.js` (+ test),
`hooks/useCampoMonetario.js`, `hooks/useRestaurarFocoAlMontar.js`, `dev/PanelDesarrollo.jsx`,
`dev/aplicarFixture.js` (+ test), `dev/construirSettersEdicion.js` (+ test),
`dev/estadoApp.js`, `dev/fixtures.js`.

**Modificados:** `domain/pensionEngine/calcularPensionRPM.js` (de stub del Sprint 1 a
implementación completa), `data/legal/index.js` (+ test), `data/legal/versions/vigente-2026.json`,
`pages/BaseCotizacion.jsx` (fix monetario, ver más abajo), `App.jsx` y `App.css`
(ruteo hacia RPM y estilos exclusivos — ver "Decisiones de alcance" para lo que
deliberadamente NO se incluyó de estos dos archivos, que en el working tree tienen más
cambios que los staged).

### Salvaguarda de producto

Queda explícito, tanto en el código como en esta documentación, que el resultado mostrado:

- **No** es una proyección futura.
- **No** incluye los años que todavía faltan por cotizar.
- **No** proyecta IBL ni semanas hacia la edad de retiro.
- **No** debe presentarse como "tu pensión".
- Representa únicamente una lectura económica de la historia observada hasta hoy — un
  punto de partida, no una proyección futura.

### Revisión manual realizada

La revisión visual manual confirmó, con el fixture `rpm-empleada-historia-evaluable`:

- IBL: $3.762.588.
- Semanas observadas: 521,9.
- Tasa de reemplazo: 64,43%.
- Resultado económico actual: $2.424.068 mensuales.
- Título corregido, sin superposición.
- Explicaciones narrativas incorporadas para IBL y tasa de reemplazo (qué representan, no
  solo cómo se calcularon).
- Salvaguarda inline incorporada junto al resultado económico, para que ese bloque no
  dependa únicamente del subtítulo superior o del bloque de limitaciones.

`totalDiasCotizados` no se expone como dato de UI: el dominio lo calcula (es la base de
`semanasObservadas`), pero se decidió no mostrarlo por ahora.

### Decisiones de alcance — qué queda fuera de este cierre

Quedaron explícitamente fuera del staging y de este cierre, por pertenecer a otros
trabajos en curso o a decisiones arquitectónicas separadas — nada de esto se perdió,
permanece sin staging en el working tree:

- El Motor de caminos RAIS (`generarCaminosRAIS.js`, la expansión de
  `ExploraTuProyeccion.jsx`, `ExploraTuProyeccion.helpers.js`,
  `ExploraTuProyeccion.limitaciones.test.js`, y los cambios asociados en
  `determinarBaseCotizacion.js`, `formulaRAIS.js`, `data/assumptions/`).
- La capacidad de reconocimiento (`domain/reconocimiento/evaluarAptitud.js`,
  `evaluarDeclaracion.js`) y su wiring en `RevisionDeclaracionTemporal.jsx`.
- `tienePrimeraLecturaValor.js` y su integración en `App.jsx`.
- La retirada de `DeclaracionLibre`/`RevisionDeclaracionTemporal` del recorrido principal —
  el staged de este cierre las conserva exactamente como estaban, sin retirarlas ni
  restaurarlas.
- El rollout transversal de `useRestaurarFocoAlMontar` a las otras 12 pantallas del
  recorrido — el staged conserva únicamente el archivo del hook y su uso en
  `ExploraTuProyeccionRPM.jsx`.
- La validación de `BaseCotizacion.jsx` para valor declarado por debajo del piso legal —
  capacidad distinta, con revisión y cierre propios.
- Los otros 3 inputs monetarios (`saldoAcumuladoDeclarado`, `objetivoPensionMensual`,
  `restriccionCostoPensionalAdicionalMaximoMensual`), ubicados en
  `ExploraTuProyeccion.jsx`: **el fix monetario de este cierre corresponde únicamente a
  los 2 campos de `BaseCotizacion.jsx`** (`valorBaseCotizacionDeclarado`,
  `salarioParaEstimarBase`); los otros 3 se cerrarán junto con el Slice del Motor de
  caminos RAIS.
- `docs/producto/oportunidades-futuras.md`.
- Los dos `.docx` sin trackear (PL-230, PL-240).

**Siguiente decisión arquitectónica pendiente, inmediatamente después de este cierre**: qué
hacer con la retirada de `DeclaracionLibre`/`RevisionDeclaracionTemporal` del recorrido
principal — detectada durante el cierre de este Slice, sin documentar ni autorizar
todavía.

### Limitaciones conocidas

- `data/legal/versions/ipc-historico.json` es, según su propio campo `estado`, un
  **borrador** (`listoParaProduccion: false`), no una fuente oficial definitiva: `valor`
  es un índice **autoconstruido** por PensionLab (acumulando variaciones anuales oficiales
  de DANE verificadas por búsqueda web, desde una base propia dic-2015=100), no el nivel de
  índice bruto que publica el DANE. Cubre únicamente 2015-2025. Pendiente antes de
  publicarse: reemplazar `valor` por los niveles oficiales exactos, y extender la serie
  hacia años anteriores a 2015 cuando una historia real lo exija, siempre con la misma
  disciplina de verificación por fuente oficial (nunca con cifras recordadas de memoria).
- La entrada legal 15 (`semanas-habilitan-alternativa-ibl`, `vigente-2026.json`) tiene
  respaldo textual directo del propio artículo, pero **todavía no pasó la misma revisión
  cruzada formal** que las 13 entradas originales ya validadas contra
  `trazabilidad-normativa.md` — así lo registra la propia nota del archivo.
- La alternativa de vida laboral no tiene, hoy, un fixture visible en la UI que la active:
  requeriría ≈1.250 semanas (≈24 años) de historia, y eso a su vez requeriría IPC real de
  más años de los que `ipc-historico.json` cubre actualmente (2015-2025). La propiedad de
  que esa alternativa puede resultar mayor o menor según la historia queda probada con
  datos sintéticos en `formulaIBL.test.js`, no con un caso visible en pantalla.

Estas limitaciones ya estaban identificadas durante el desarrollo del Slice; se registran
aquí tal como están, sin abrir trabajo nuevo en esta ronda de cierre.

### Verificación técnica final del staged

Verificado de forma aislada (worktree temporal sobre un commit "dangling" construido desde
el árbol del índice staged, nunca referenciado por ninguna rama, ya eliminado tras la
verificación) — no contra el working tree completo, que todavía mezcla otros trabajos:

- 17 archivos de tests, **221/221 en verde**.
- `npm run lint` — sin errores.
- `npm run build` — build de producción exitoso.
- El staged es autosuficiente: no depende de ningún archivo que permanece sin staging.

### Estado al cierre

- Slice RPM implementado.
- Revisión técnica completada.
- Revisión visual manual completada.
- Revisión narrativa completada.
- Staging técnico limpio y verificado de forma aislada.
- Cierre aprobado para commit.

### Commit

Este documento forma parte del commit de cierre del Slice RPM; el identificador
definitivo queda registrado en el historial Git.

---

## Slice — Simplificación del recorrido MVP (retiro de DeclaracionLibre/RevisionDeclaracionTemporal)

**Estado:** Implementación completada. Revisión técnica completada. Revisión manual
completada (con Atlas). Staging técnico limpio y verificado de forma aislada. Cierre
aprobado para commit.

### Contexto y decisión previa

Retoma la decisión arquitectónica que quedó explícitamente pendiente al cerrar el Slice
RPM. `DeclaracionLibre.jsx`/`RevisionDeclaracionTemporal.jsx` habían sido retiradas de la
navegación activa en el working tree sin pasar por el proceso formal de cierre — la única
justificación existente vivía informalmente en `docs/producto/oportunidades-futuras.md`
(entrada 2), no en un Slice aprobado. Un análisis dedicado (arquitectura, reconstrucción de
la decisión desde evidencia del repositorio, cinco alternativas de producto evaluadas)
concluyó y recomendó la **Alternativa D — retirar ambas pantallas del recorrido principal,
conservando su código y la capacidad de reconocimiento sin borrar ni conectar** — aprobada
con Atlas antes de implementar nada.

Hallazgos clave del análisis que motivan esta decisión:
- Ningún archivo de `domain/` ni `models/` lee jamás el estado `declaracionLibre` — la
  declaración se capturaba pero no alimentaba ninguna decisión real.
- `DeclaracionLibre` nunca explicaba para qué se usaría lo declarado (Principio A de
  PL-240, "Explicar antes de preguntar") y, para regímenes distintos de RAIS, se
  preguntaba antes de haber mostrado ningún valor calculado (Principio de Arquitectura
  13, "el sistema no pide una decisión antes de agotar lo que ya sabe").
- La capacidad de reconocimiento (`domain/reconocimiento/`) fue diseñada como "zona de
  mediación" entre la Capacidad B (`DeclaracionLibre`) y `PerfilDecision` (Bloque 3) — con
  ambos extremos inactivos hoy, no tiene consumidor alcanzable, pero sigue siendo el
  diseño correcto si se retoma texto libre más adelante.

### Alcance aprobado

**`src/App.jsx`:**
- Se retiran los imports de `DeclaracionLibre` y `RevisionDeclaracionTemporal`.
- Se retiran sus dos bloques de render (`vista === 'declaracionLibre'`,
  `vista === 'revisionDeclaracion'`).
- `QueDeterminaTuResultado.onContinuar` queda en dos ramas, sin fallback a
  `declaracionLibre`: `RPM → exploraTuProyeccionRPM`; cualquier otro caso →
  `exploraTuProyeccion`. (El segundo caso solo es alcanzable con `regimenActual === 'RAIS'`
  porque `QueDeterminaTuResultado.jsx` ya no renderiza el botón "Continuar" para ningún
  otro régimen — ver más abajo; ambos cambios se aprobaron y comitean como una unidad
  correcta, no por separado.)
- `<ExploraTuProyeccion>` deja de recibir `onContinuar={() => setVista('declaracionLibre')}`.
- Se conserva sin cambios: el estado `declaracionLibre`/`setDeclaracionLibre` (sigue
  formando parte del espejo del panel de desarrollo), y todo lo demás del archivo.

**`src/pages/QueDeterminaTuResultado.jsx`:**
- Nueva constante `TEXTO_CIERRE_SIN_CAPACIDAD_POSTERIOR`.
- Nueva variable derivada `tieneCapacidadPosterior = regimenActual === 'RAIS' ||
  regimenActual === 'RPM'`.
- `manejarEnvio` solo invoca `onContinuar()` cuando `tieneCapacidadPosterior`.
- El subtítulo final y el botón "Continuar" se renderizan condicionalmente: con
  capacidad posterior, el texto y botón ya existentes; sin ella, el texto de cierre
  honesto y ningún botón "Continuar" — solo "Volver".

**Explícitamente conservado, sin borrar ni conectar:**
- `src/pages/DeclaracionLibre.jsx` — el archivo sigue existiendo íntegro. Solo se retiró
  del recorrido; no fue eliminado.
- `src/pages/RevisionDeclaracionTemporal.jsx` — mismo criterio: archivo íntegro,
  únicamente inalcanzable desde `App.jsx`.
- `src/domain/reconocimiento/` (`evaluarAptitud.js`, `evaluarDeclaracion.js` + tests) —
  completo, sin tocar, sin conectar a ningún consumidor.
- `PerfilDecision` (`src/models/PerfilDecision.js`) — sigue siendo un contrato dormido, sin
  desarrollo nuevo; pospuesto para después del MVP de Oscar.

### Recorrido resultante (confirmado en revisión manual)

- **RAIS**: `QueDeterminaTuResultado → ExploraTuProyeccion`, sin pasar por
  `DeclaracionLibre` ni `RevisionDeclaracionTemporal`; termina ahí mientras esa sea la
  última capacidad real disponible.
- **RPM**: `QueDeterminaTuResultado → ExploraTuProyeccionRPM`, mismo criterio.
- **Sin régimen/capacidad posterior**: el recorrido termina en `QueDeterminaTuResultado`
  mismo — sin botón "Continuar", con el texto honesto de cierre, "Volver" funcional.

### Explícitamente fuera de este cierre

No se mezcló con este Slice, y permanece sin staging en el working tree:
- El Motor de caminos RAIS (`generarCaminosRAIS.js`, la expansión de
  `ExploraTuProyeccion.jsx`, `determinarBaseCotizacion.js`, `formulaRAIS.js`,
  `data/assumptions/`).
- `tienePrimeraLecturaValor.js` y su integración en `App.jsx` — analizado y confirmado
  como mejora independiente, pero con revisión y aprobación propias, todavía pendientes.
- El rollout transversal de `useRestaurarFocoAlMontar` a las demás pantallas (incluida su
  adopción parcial en `QueDeterminaTuResultado.jsx`, deliberadamente excluida de este
  Slice).
- La validación de `BaseCotizacion.jsx` para valor bajo el piso legal.
- El cambio de `Objetivo.jsx` (deshabilitar "Comparar caminos que ya conozco." y "Validar
  una estrategia que ya tengo.") y su CSS asociado (`.option:has(input:disabled)` en
  `App.css`) — analizado y confirmado como decisión independiente, no necesaria para la
  coherencia de este Slice; queda para su propia Slice.
- `docs/producto/oportunidades-futuras.md` y los dos `.docx` sin trackear.

### Verificación técnica

Verificado de forma aislada (worktree temporal sobre un commit "dangling" construido desde
el árbol del índice staged, nunca referenciado por ninguna rama, ya eliminado tras la
verificación) — no contra el working tree completo:
- 17 archivos de tests, **221/221 en verde**.
- `npm run lint` — sin errores.
- `npm run build` — build de producción exitoso.

### Revisión manual

Confirmada con Atlas: los tres recorridos (RAIS, RPM, sin capacidad posterior) se
comportan exactamente como se documenta arriba. Sin defectos visuales o narrativos
bloqueantes.

### Commit

Este documento forma parte del commit de cierre de este Slice; el identificador
definitivo queda registrado en el historial Git.

---

## Slice — Motor de caminos RAIS (ExploraTuProyeccion)

**Estado:** ✅ Implementación completada. Revisión técnica completada. Revisión manual
completada. Revisión narrativa/rotulado completada. Staging técnico limpio y
verificado de forma aislada. Cierre aprobado para commit.

### Objetivo

Transformar `ExploraTuProyeccion.jsx` de mostrar una cifra pensional aislada (Sprint
3, primera versión) a construir y comparar caminos pensionales reales — responder
"¿con cuánto podría pensionarme, y qué tendría que hacer distinto?" en vez de un
único número sin alternativas. Perfil aprobado para esta primera versión: RAIS,
independiente, cotización en Colombia, sin traslados de régimen previos. Fuera de
ese perfil, la pantalla lo explica honestamente y permite continuar — nunca bloquea
el recorrido general de la app. La comparación nunca impone una decisión: expone los
caminos y su distancia al objetivo, la elección queda en la persona.

### Capacidades implementadas

- **Camino base** — mantener la base de cotización actual, siempre calculable.
- **Camino alternativo** — aumentar la base de cotización, generado solo cuando el
  camino base no alcanza el objetivo declarado (nunca se inventa una alternativa
  cuando no hace falta).
- **Resolución algebraica del IBC necesario** (`resolverIBCNecesarioRAIS`) — inversa
  de `formulaRAIS`, sin investigación normativa nueva.
- **Cálculo de tiempo necesario para alcanzar el objetivo** (`resolverMesesNecesariosRAIS`)
  — dato complementario del camino base, nunca un tercer camino.
- **Capital inicial / saldo acumulado** — `calcularProyeccionRAIS.js` y `formulaRAIS.js`
  ahora capitalizan el saldo ya acumulado, resolviendo la limitación crítica que
  Sprint 1 había dejado documentada y pendiente.
- **Distancia al objetivo** (`distanciaObjetivo`) — delta y cumplimiento, nunca
  ambiguo.
- **Orientación determinista** (`calcularOrientacion`) — reglas explícitas, nunca
  texto generativo; nunca selecciona un camino con estado `potencial`.
- **Restricción económica opcional** del usuario, convertida correctamente a un
  límite de IBC (dividiendo por la tasa de cotización, nunca sumando directamente).
- **Tope legal de IBC** (25 SMMLV) — el camino alternativo nunca lo excede; si el IBC
  actual ya está en el tope, se declara descartado con razón explícita, no se
  oculta.
- **Convención Económica v1** — todas las cifras (IBC, saldo, objetivo, resultado) se
  interpretan en pesos de hoy, nunca como pesos nominales futuros; decisión
  registrada en `trazabilidad-formula-RAIS.md` y como supuesto explícito
  (`ibcConstanteEnTerminosReales`) en `data/assumptions/versions/supuestos-v1.json`.
- **Separación entre aumento de IBC y aporte pensional adicional real** — el esfuerzo
  mostrado es siempre `costoPensionalAdicionalMensual` (16% del aumento de IBC),
  nunca el aumento de IBC en sí mismo.

### Revisión manual

Realizada con el fixture `rais-independiente-colombia` (`src/dev/fixtures.js`).
Datos del fixture: IBC actual $7.000.000, saldo acumulado $80.000.000, objetivo
$4.500.000 mensuales, horizonte hasta los 65 años.

Resultados observados y confirmados en pantalla:
- **Camino base**: $3.585.045 mensuales — no alcanza el objetivo.
- **Camino alternativo**: IBC propuesto aproximado $9.568.135; aporte pensional
  adicional mensual aproximado $410.902; alcanza exactamente $4.500.000 mensuales.
- **Orientación**: el camino alternativo queda marcado como el único que cumple el
  objetivo (`UNICO_CUMPLE`).

Ninguna de estas cifras se produjo por inspección visual únicamente — se verificaron
también de forma analítica, ejecutando `determinarBaseCotizacion` y
`generarCaminosRAIS` directamente contra los datos reales del fixture, coincidiendo
exactamente con lo mostrado en pantalla.

### Ajustes finales de comunicación aprobados

Tres hallazgos de una revisión crítica dedicada, los tres de redacción/rotulado —
ningún cálculo ni dato de dominio cambió:
- Etiqueta `"Esfuerzo adicional mensual"` → **`"Aporte pensional adicional mensual"`**,
  para no sugerir que la cifra cubre el costo económico total (salud, riesgos
  laborales quedan fuera, ya declarado en `COSTO_SOLO_PENSIONAL`).
- Etiqueta `"Proyección mensual (pesos de hoy)"` → **`"Proyección parcial mensual
  (pesos de hoy)"`**, para que el calificador "parcial" viaje con la cifra en vez de
  vivir solo en el párrafo introductorio.
- La nota temporal del camino base se reescribió para aclarar explícitamente que
  continuar cotizando después del horizonte elegido **no determina la edad de
  pensión** — evita que una persona confunda ese dato (calculado bajo un mecanismo
  distinto al de la comparación principal) con una edad legal de retiro.
- Para esa última redacción, `textoProyeccionTemporal` recibió un tercer parámetro
  (`edadJubilacionDeseada`), alimentado con `edadValida` —el mismo valor ya validado
  que gobierna el resto de la pantalla— **únicamente para construir el texto**; sin
  cambiar dominio, cálculos, ni ningún otro comportamiento.

### Principios de producto

El Motor cumple, con disciplina verificada durante su revisión, los principios ya
establecidos de PensionLab:
- Muestra múltiples caminos cuando existen — nunca colapsa a una única respuesta.
- No inventa alternativas — el camino alternativo solo se genera cuando el base no
  alcanza el objetivo.
- No impone una decisión — la orientación marca el camino más alineado sin obligar a
  elegirlo; ambos quedan visibles.
- Distingue hechos, supuestos y proyecciones — `parametrosLegalesUsados` vs.
  `parametrosSupuestosUsados` estructuralmente separados; la UI separa "lo que el
  dominio determinó" de "supuestos y limitaciones de esta proyección".
- Comunica las limitaciones — cada escenario viable declara sus limitaciones,
  ninguna cifra se muestra sin advertencia.
- No confunde aumento de IBC con costo económico total — separación ya verificada en
  Capacidades implementadas y en los Ajustes finales de comunicación.

### Dependencias

La validación de piso legal (`determinarBaseCotizacion.js`) ya fue cerrada
previamente, en el commit `9e3ac22`. Este Slice la **consume sin modificarla** — no
forma parte de este staging ni de este commit.

### Limitaciones conocidas

Documentadas con detalle en `trazabilidad-formula-RAIS.md` y ya declaradas
estructuralmente en cada escenario viable, no solo en este documento:
- Perfil estrecho: RAIS, independiente, Colombia, sin traslados — cualquier otra
  combinación queda fuera de esta primera versión.
- `rentabilidadEsperadaRAIS` (3.5% real anual), `descuentoSobreAporteCapitalizable`
  (18.75%) y `mesesPayoutSimplificado` (240 meses) son supuestos de producto de
  confianza baja-media, no hechos verificados.
- Sin Garantía de Pensión Mínima (FGPM).
- Sin tablas de mortalidad reales — horizonte de pago plano, igual para cualquier
  sexo o edad de retiro.
- Sin bono pensional.
- Todavía no verifica la viabilidad legal de retiro a la edad elegida.
- El saldo acumulado se trata como si correspondiera a hoy (`SALDO_TRATADO_COMO_ACTUAL`),
  aunque el extracto real pueda tener semanas o meses de antigüedad.
- El tope de 25 SMMLV se evalúa con el SMMLV vigente en la fecha de la simulación,
  no proyectado (`TOPE_IBC_CON_SMMLV_VIGENTE`).
- Sin camino de aporte voluntario — investigación normativa/producto pendiente.
- Convención Económica v1: todas las cifras en términos reales (pesos de hoy), nunca
  nominales — el valor nominal futuro no se calcula todavía.

### Fuera de alcance

Explícitamente no mezclado con este Slice, y sin staging:
- `tienePrimeraLecturaValor` y su integración en `App.jsx`.
- El rollout transversal de `useRestaurarFocoAlMontar` a las 11 pantallas restantes.
- `Objetivo.jsx` y su CSS asociado (`.option:has(input:disabled)`).
- La capacidad de reconocimiento (`domain/reconocimiento/`).
- `docs/producto/oportunidades-futuras.md`.
- Los dos `.docx` sin trackear.
- Ampliación del perfil a empleados, cotización desde el exterior, o traslados de
  régimen — deliberadamente pospuesta, no parte de esta primera versión.

### Verificación técnica

Verificado de forma aislada (worktree temporal sobre un commit "dangling"
construido desde el árbol del índice staged, nunca referenciado por ninguna rama,
ya eliminado tras la verificación) — no contra el working tree completo, que
todavía mezcla el trabajo fuera de alcance listado arriba:
- 19 archivos de tests, **312/312 en verde**.
- `npm run lint` — sin errores.
- `npm run build` — build de producción exitoso.
- El staged es autosuficiente: no depende de ningún archivo que permanece sin
  staging.

### Commit

Este documento forma parte del commit de cierre del Slice Motor de caminos RAIS; el
identificador definitivo queda registrado en el historial Git.

---

## Slices pendientes de Sprint 3

Por definir a medida que el sprint avance.
