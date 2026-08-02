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

## Slices pendientes de Sprint 3

Por definir a medida que el sprint avance.
