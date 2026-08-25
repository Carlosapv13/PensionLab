# PensionLab

PensionLab es una herramienta para **explorar y comprender escenarios pensionales**
bajo los dos regímenes del sistema colombiano — RPM (Régimen de Prima Media) y RAIS
(Régimen de Ahorro Individual). No dice "esto es lo que te conviene": construye
escenarios comparables a partir de lo que la persona declara y deja que ella decida.

## Qué es (y qué no es) PensionLab

- **El cálculo pensional es determinístico.** Cada cifra sale de fórmulas y normas
  legales versionadas, nunca de un modelo de lenguaje — ver
  `src/domain/formulas/trazabilidad-formula-RPM.md` y
  `src/domain/formulas/trazabilidad-formula-RAIS.md`.
- **La IA, donde se usa, explica resultados ya calculados — nunca los calcula ni los
  sustituye.** Si la explicación con IA falla o no está disponible, las cifras
  (caminos, proyección, gráfica) siguen siendo correctas y utilizables sin ella.
- **PensionLab no es asesoría financiera, legal ni pensional oficial**, y no emite
  recomendaciones personalizadas ("deberías", "te conviene"): compara estrategias de
  forma neutral y dejar la decisión a la persona es un principio de producto, no un
  vacío por completar.

## Estado actual

- Sprint 4 (Entregable 2 — "PensionLab responde, explora y explica") con su alcance
  funcional implementado y probado; la bitácora formal de cierre
  (`docs/gestion/cierre-sprint-4.md`) todavía no está consolidada como documento de
  cierre, aunque el código y la suite de tests ya reflejan ese alcance.
- Interfaz funcional de punta a punta: desde el objetivo inicial hasta la comparación
  de caminos, sin fixtures ni datos de desarrollo.
- Experiencia RPM completa dentro del alcance del MVP (ver "Alcance del MVP" abajo).
- Experiencia RAIS funcional, con un alcance deliberadamente más acotado que RPM.
- Explicación con IA disponible bajo demanda donde corresponde (RPM).
- Suite de **889 tests** en verde, lint sin errores, build de producción exitoso.

## Alcance del MVP

### RPM

Recorrido completo disponible desde la UI pública, sin Panel de Desarrollo:

- Proyección de pensión a partir de la historia de cotización declarada.
- Comparación de **caminos**: mantener la situación actual, un camino alternativo que
  alcanza el objetivo declarado (cuando es legalmente posible) y un camino con el
  **esfuerzo mensual personalizado** que la persona quiera explorar.
- **Orientación determinística** ("Qué podrías explorar ahora") que interpreta el
  resultado sin usar IA.
- **Horizonte temporal explícito**: desde cuándo y hasta cuándo se supone mantener el
  IBC y el esfuerzo adicional de cada camino, con duración aproximada.
- Gráfica esfuerzo↔resultado con el punto elegido por la persona marcado.
- **Explicación con IA bajo demanda** ("Entender este camino" / "Comparando tus
  caminos"), siempre opcional y siempre después de que las cifras ya existen.

### RAIS

Experiencia disponible y funcional para el perfil actualmente soportado (cotizante
independiente, cotización en Colombia, sin traslados de régimen previos) — fuera de
ese perfil, la app lo explica honestamente y nunca bloquea el recorrido general.

Su alcance es **deliberadamente menor** que el de RPM en esta versión: no incluye
esfuerzo personalizado, horizonte temporal explícito, gráfica ni explicación con IA.
Esto es una decisión de alcance del MVP, no una funcionalidad rota o a medio
terminar — la propia pantalla se lo indica brevemente a quien llega hasta ahí.

## Limitaciones conocidas del MVP

- **El estado de navegación vive en memoria del navegador.** No hay persistencia
  entre sesiones ni recuperación automática: recargar la página reinicia el
  recorrido desde el principio.
- **RAIS tiene un alcance deliberadamente acotado** frente a RPM (ver arriba), no
  una implementación incompleta de lo que sí está en alcance.
- Algunas capacidades siguen fuera de este MVP a propósito (por ejemplo, un punto de
  entrada público a la interpretación de una declaración libre en lenguaje natural).
  No se documentan aquí una por una — para explorar posibles direcciones futuras, ver
  `docs/producto/oportunidades-futuras.md` (backlog de producto, no alcance del MVP).

## Cómo correr el proyecto

```
npm install
npm run dev      # servidor de desarrollo
npm run test     # suite de Vitest
npm run build    # build de producción
npm run lint     # ESLint
```

## Explicación con IA — configuración y comportamiento

La explicación con IA es una capacidad **opcional**: el motor de cálculo, los
caminos, la gráfica y toda la comparación funcionan sin ella.

- **En desarrollo** (`npm run dev`), la app usa adaptadores simulados (sin red, sin
  credenciales) para poder revisar la experiencia de principio a fin sin necesidad de
  configurar nada. Ese código de desarrollo se elimina por completo del build de
  producción.
- **En producción**, la explicación con IA se resuelve en funciones de servidor bajo
  `api/`, que requieren las variables de entorno `OPENAI_API_KEY` y `OPENAI_MODEL`
  (ver `.env.example`). Estas variables se leen exclusivamente del lado del servidor
  y nunca llegan al navegador.
- **Si esa configuración falta en producción**, la capacidad de explicación con IA se
  degrada explícitamente (mensaje de error + botón de reintento) — el motor
  determinístico y las cifras ya calculadas siguen funcionando con normalidad.

## Documentación

- [Arquitectura del motor de decisión](docs/tecnico/arquitectura/) — detalle técnico
  completo, para quien quiera profundizar más allá de este README.
- [Trazabilidad normativa (`data/legal`)](src/data/legal/trazabilidad-normativa.md)
- [Trazabilidad de fórmula RPM](src/domain/formulas/trazabilidad-formula-RPM.md)
- [Trazabilidad de fórmula RAIS](src/domain/formulas/trazabilidad-formula-RAIS.md)
- [Oportunidades futuras (backlog de producto)](docs/producto/oportunidades-futuras.md)

## Estructura del proyecto

```
src/
├── domain/       # fórmulas puras, motor de cálculo (RPM/RAIS), contratos
├── data/         # normas legales y supuestos de modelado, versionados
├── ia/           # construcción de contexto y adaptadores de explicación con IA
├── format/       # formateo puro de fechas, dinero y duración para la UI
├── hooks/        # hooks de React reutilizados entre pantallas
├── components/   # UI compartida (formularios, gráfica, layout)
├── pages/        # pantallas del recorrido
└── dev/          # Panel de Desarrollo — eliminado del build de producción

api/              # funciones de servidor para la explicación con IA (fuera del bundle cliente)
```

## Autoría

Carlos Peraza — proyecto personal en desarrollo, construido mediante un proceso de revisión
cruzada entre asistentes de IA, bajo su dirección y decisión final en cada resultado. Ver
[Metodología de desarrollo con IA](docs/ia/metodologia-de-desarrollo-con-ia.md) para el detalle
completo de cómo se trabaja.
