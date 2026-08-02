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

## Slices pendientes de Sprint 3

Por definir a medida que el sprint avance.
