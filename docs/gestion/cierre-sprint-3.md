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

**Estado:** ✅ Cerrado y aprobado (pendiente de commit hasta revisión funcional
y visual) en `sprint-3-mvp-headless`.

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
  futuro**: se le agrega el encabezado fijo "Lo que entendemos hasta ahora"
  (clase `.insight__label`) sobre el mensaje (`.insight__message`) — mismo
  comportamiento, sin nueva funcionalidad ni props nuevos, dejando la
  estructura lista para que en el futuro el mismo bloque muestre
  observaciones, riesgos u oportunidades sin rediseñarse (Principio 9: se
  prepara la lectura, no se generaliza el componente todavía).

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

### Pendiente para el siguiente Slice

- Definir el alcance funcional del Slice que reemplace
  `ContinuarHistoriaTemporal.jsx` — candidatos identificados: detalle del
  traslado (si `trasladoRegimen === 'si'`), salario/IBC, o semanas
  verificadas mediante historia laboral oficial. Ninguno decidido todavía.
- Diseñar formalmente la clasificación de "trayectoria pensional" (Decisión
  3) cuando exista un segundo caso real que la justifique.

---

## Slices pendientes de Sprint 3

Por definir a medida que el sprint avance.
