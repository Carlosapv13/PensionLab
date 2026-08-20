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
- **Slice pequeño propio, antes de S4-002**: `fechaTrasladoRegimen` +
  `certezaFechaTraslado` en el expediente (análisis ya aprobado por Carlos/Atlas) —
  tercer consumidor de `CampoFechaDiaMesAnio.jsx` ya anticipado; ese es el momento
  natural para evaluar si además conviene un `key`/reset más genérico en el componente
  (no se generaliza por anticipación ahora).
- **Documentar formalmente**, en ese mismo Slice pequeño, la relación entre
  `fechaTrasladoRegimen` y la extensión aditiva ya reservada desde Sprint 2 en
  `UserProfile.laboralInfo.traslados` (`docs/tecnico/arquitectura/expediente-pensional.md`).
- Continuar con S4-002 (`calcularProyeccionRPM.js` — camino base con horizonte futuro)
  solo después de resolver ambos puntos anteriores.
