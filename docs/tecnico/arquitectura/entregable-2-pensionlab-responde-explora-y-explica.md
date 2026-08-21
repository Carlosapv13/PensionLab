# Sprint 4 — Entregable 2: PensionLab responde, explora y explica un caso RPM real

**Versión:** 0.1
**Fecha:** 2026-08-18
**Categoría documental:** Arquitectura y plan de ejecución — acotada a un Entregable, no
Biblioteca de Conocimiento (a diferencia de PL-230/PL-240, este documento no tiene
contraparte `.docx` ni vocación atemporal — ver §1).
**Proyecto:** PensionLab

## Control de versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 0.1 | 2026-08-18 | Carlos Peraza (con asistencia de Claude, Anthropic, y revisión cruzada de Atlas — ChatGPT, OpenAI) | Versión inicial. Registra formalmente el Entregable 2, abre Sprint 4, fija los 7 Slices aprobados (S4-001 a S4-007) y los bloqueos técnicos/normativos identificados durante su análisis. |
| 0.2 | 2026-08-19 | Carlos Peraza (con asistencia de Claude, Anthropic, y revisión cruzada de Atlas — ChatGPT, OpenAI) | Incorpora el hallazgo de la revisión manual de S4-001 (Carlos, caso real trasladado de RAIS a RPM): bloqueo §8.9 (historia previa a un traslado de régimen, con investigación normativa acotada) y bloqueo §8.10 (`semanasObservadas` vs. semanas ya declaradas en el expediente); nota de UX en §7.1 sobre la ventana de 10 años (fecha de reconocimiento vs. hoy); decisiones pendientes 6 y 7 en §14. S4-001 permanece sin cerrar. |
| 0.3 | 2026-08-19 | Carlos Peraza (con asistencia de Claude, Anthropic, y revisión cruzada de Atlas — ChatGPT, OpenAI) | Agrega a §7.1 la referencia técnica al estándar permanente de captura de fechas (`CampoFechaDiaMesAnio.jsx`, regla de experiencia registrada en `PL-240` §5) — implementado en la revisión final de S4-001. |

---

## 1. Qué es este documento y por qué existe

Sprint 3 cerró con el hito "MVP público para Oscar" (`docs/gestion/cierre-sprint-3.md`,
commit `9c1ca99`, publicado en Vercel). Ese cierre fue explícito y transversal, no la
simple pausa entre dos Slices — por eso el trabajo que sigue no se agrega como más Slices
de Sprint 3, sino que abre un **Sprint 4** propio.

Este documento registra formalmente el **Entregable 2** de ese Sprint 4: el problema que
resuelve, su arquitectura, su plan de ejecución en Slices, sus exclusiones deliberadas y
los bloqueos técnicos/normativos ya identificados — todo ello surgido de un ciclo de
análisis y revisión cruzada entre Carlos Peraza, Atlas (ChatGPT, OpenAI) y Claude
(Anthropic), y aprobado explícitamente por Carlos antes de escribirse aquí.

Existe por la misma razón que exige la nueva regla de gobernanza registrada en
`docs/ia/metodologia-de-desarrollo-con-ia.md` ("Registro obligatorio de decisiones"): una
conversación, por rigurosa que haya sido su revisión cruzada, no es memoria institucional
del proyecto. Este documento es esa memoria.

**Relación con documentación existente:**

- **`PL-230 - Arquitectura del Motor de Decisión de PensionLab.md`** — este documento
  adopta su filosofía (evidencia≠decisión, ninguna comparación colapsa en una salida
  única, toda estrategia se explica, incluidas las excluidas) de forma **informal**, vía
  los patrones ya probados de `generarCaminosRAIS.js`, sin instanciar `PerfilDecision` ni
  construir los siete componentes formales de PL-230 (ver §7.6). PL-230 mismo declara,
  en su Decisión pendiente #17, que nunca se nombró el "segundo caso real" que
  justificaría empezar su implementación — este Entregable es ese caso real, y este
  documento dice explícitamente cuánto de PL-230 usa y cuánto difiere, para que esa
  pregunta quede respondida sin ambigüedad.
- **`PL-240 - Filosofía de Experiencia de PensionLab.md`** — informa la experiencia
  objetivo (§5) y la regla gráfico/IA/trazabilidad (§7.5).
- **`expediente-pensional.md`** — precedente estructural para cómo se referencia
  `historiaCotizacion` y el campo `Explanation.gradoEstimacion` (reservado desde Sprint 2,
  nunca poblado hasta ahora — ver §8).
- **`docs/gestion/cierre-sprint-3.md`** — es la "apertura formal" de Sprint 4, en la misma
  relación que PL-230 ya tiene con el cierre de Sprint 3: cada uno de los 7 Slices de
  este documento, al cerrarse, generará su propia entrada retrospectiva en un futuro
  `docs/gestion/cierre-sprint-4.md`, que no existe todavía y no se crea en este commit.
- **No incluye ningún cambio de código.** Este documento no autoriza, por sí mismo, el
  inicio de la implementación del Slice S4-001 — esa es una decisión posterior y
  separada (Principio 8: los cambios de arquitectura se documentan antes de
  implementarse, y se implementan solo después de una decisión explícita de hacerlo).

---

## 2. Problema y propósito del Entregable 2

El MVP público (Sprint 3) demuestra el producto pero no lo completa: para RPM, la propia
"Lectura económica RPM con tu historia hasta hoy" (`ExploraTuProyeccionRPM.jsx`) es
alcanzable hoy únicamente vía el Panel de Desarrollo — ningún usuario real puede
introducir su historia desde la interfaz pública. Y aun si pudiera, esa lectura es
deliberadamente solo histórica: nunca proyecta, nunca genera caminos, nunca compara
estrategias ni explica por qué una alternativa importa para esa persona.

**Propósito:** que casos RPM reales de la clase Carlos/Alex puedan expresar libremente
qué necesitan y recibir una respuesta personalizada, calculada, optimizada, visualmente
comprensible y explicable — sin que PensionLab tenga que construir código específico
para esas personas. El producto debe generalizar a cualquier caso RPM dentro del perfil
soportado (§3), usando a Carlos y Alex exclusivamente como casos de validación (§4), no
como condiciones del producto.

---

## 3. Segmento/clase inicial de casos RPM

Mismo criterio de disciplina que ya usa `generarCaminosRAIS.js` para RAIS: un **perfil
estrecho declarado por condición estructural del caso**, nunca por identidad de persona,
extensible después con evidencia real (Principio 9).

Este documento no fija todavía los límites exactos de ese perfil (ej. si se restringe a
`tipoCotizante === 'independiente'` como hace RAIS, o si RPM lo permite más amplio) — es
una decisión de diseño que corresponde a S4-001/S4-002, no a este documento de apertura.
Lo que sí fija, sin ambigüedad, es el criterio: cualquier acotación de perfil debe
expresarse sobre campos estructurales ya existentes del caso (`regimenActual`,
`tipoCotizante`, `lugarCotizacion`, `trasladoRegimen`...), nunca sobre quién es la
persona, y debe declararse explícitamente "no evaluable" fuera de ese perfil — nunca
fallar en silencio ni forzar un resultado fuera de su alcance real.

---

## 4. Carlos y Alex como casos de validación — nunca perfiles hardcodeados

Carlos será el primer caso real de validación del Entregable 2, no una condición
hardcodeada del producto. Alex es el segundo caso de validación, y su prueba de
aceptación (§12) exige explícitamente que obtenga una respuesta útil con sus propios
datos, sin código especial ni guía de Carlos — es la verificación de que el perfil de §3
generaliza de verdad y no fue, en la práctica, "el caso Carlos" disfrazado de capacidad
general.

Ningún Slice de este documento puede cerrarse citando a Carlos o a Alex por nombre en su
código, sus condiciones o sus mensajes — solo en la documentación de prueba manual.

---

## 5. Experiencia objetivo completa

```
inquietud libre
   → IA interpreta
      → usuario confirma
         → PensionLab identifica qué falta
            → pregunta solo lo necesario
               → expediente estructurado
                  → motores deterministas calculan
                     → generador/optimizador busca caminos
                        → comparación visual
                           → IA explica y permite profundizar
```

Ningún paso de esta secuencia se salta ni se colapsa en otro. En particular: "PensionLab
identifica qué falta → pregunta solo lo necesario" reemplaza, para este Entregable, la
idea de seguir ampliando indefinidamente el árbol manual de vistas de `App.jsx` — sin que
esto implique construir ya la versión completa de esa capacidad de decisión dinámica (ver
exclusiones, §9, y el mínimo de PL-230 adoptado en §7.6).

---

## 6. Frontera IA ↔ dominio determinista

Dos reglas no negociables, vigentes para todo el Entregable 2:

1. **IA ≠ motor pensional.** La IA no calcula pensiones, no inventa cifras, no determina
   normas y no decide elegibilidad. Cálculos y reglas permanecen deterministas, probados
   y trazables en `domain/`.
2. **IA = comprensión e interacción.** Interpreta lo que la persona escribe libremente
   (problema, objetivo, prioridades, restricciones). Toda interpretación que vaya a
   convertirse en dato relevante para un cálculo debe confirmarse explícitamente por el
   usuario antes de usarse.

**Lo que la IA puede entregar:**
- Interpretación estructurada de texto libre → candidatos de campos **ya definidos por
  el dominio** (objetivo, restricción), con nivel de confianza — nunca un campo nuevo que
  el dominio no sepa consumir.
- Selección de qué pregunta mostrar a continuación, eligiendo **entre preguntas ya
  definidas**, nunca inventando contenido pensional nuevo.
- Texto explicativo construido exclusivamente sobre datos que `domain/` ya produjo —
  misma restricción que PL-230 exige a su capa de Explicabilidad: "nunca resuelve,
  calcula ni infiere nada nuevo".

**Lo que el usuario debe confirmar:** cualquier interpretación de la IA que vaya a entrar
a un cálculo (IBC, semanas, fechas, objetivo cuantificado, restricciones) — sin
excepción, sin importar la confianza declarada.

**Lo que el dominio jamás acepta como verdad sin validar:**
- Ninguna cifra que "vino" de la IA — `domain/` siempre recalcula desde el dato ya
  confirmado por el usuario, nunca consume un número que pasó por la IA sin ese paso.
- Ninguna conclusión de elegibilidad o interpretación legal sugerida por la IA — eso
  sigue siendo exclusivo de `evaluarSemanasMinimas.js`/`evaluarEdadPension.js`/etc.

Es, literalmente, el Principio de Arquitectura 11 (validación en capas) extendido a un
origen de datos nuevo y no confiable: `domain/` ya nunca confía en que "la interfaz ya
validó"; tampoco confiará en que "la IA ya interpretó bien".

---

## 7. Arquitectura de la capacidad

### 7.1 Historia estructurada necesaria

El bloqueo actual no es de dominio: `seleccionarPeriodosIBL.js` y `calcularPensionRPM.js`
ya validan y consumen correctamente el contrato `PeriodoCotizacion[]`. El bloqueo es que
**no existe ninguna pantalla real de captura** — hoy `historiaCotizacion` solo se puebla
vía el Panel de Desarrollo (`ExploraTuProyeccionRPM.jsx`, comentario de cabecera).

La captura debe:
- Producir el mismo shape ya validado: `{fechaDesde, fechaHasta|null, ibc,
  diasCotizados}`.
- Heredar la misma honestidad que ya aplica `seleccionarPeriodosIBL.js`: nunca rellenar
  un hueco con un supuesto. El comportamiento actual (Slice correctivo, 2026-08-19) es que
  un hueco de calendario entre períodos declarados **no bloquea por sí mismo** — el
  selector retrocede a través de él, acumulando días efectivamente cotizados hasta
  completar la convención de 3.650 días (ver bloqueo §8.7 y
  `src/data/legal/trazabilidad-normativa.md`, sección "Convención técnica provisional —
  3.650 días efectivamente cotizados"), y el hueco queda registrado en
  `trazabilidadVentana.huecosCalendarioSaltados`, nunca relleno con un supuesto. *(Nota
  histórica: antes de ese Slice, cualquier hueco dentro de la ventana calendario fija de
  10 años se declaraba `VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS`, un comportamiento
  deliberadamente conservador que se confirmó generaba subcobertura frente a la
  jurisprudencia — bloqueo §8.7, ya resuelto.)*
- Revalidar en capas (Principio 11): la UI valida para dar mensajes usables, el dominio
  vuelve a validar sin asumir que la UI lo hizo.
- **Nunca presentar "los últimos 10 años" como si fueran los años jurídicamente
  utilizados para la pensión futura de la persona.** Hallazgo confirmado por
  investigación normativa (ver bloqueo §8.9 y `src/data/legal/trazabilidad-normativa.md`,
  sección "Traslado de régimen (RAIS→RPM) e IBL"): el Art. 21 de la Ley 100 de 1993
  ancla esa ventana a la **fecha de reconocimiento de la pensión** — una fecha futura,
  hoy desconocida. El motor actual (`calcularPensionRPM.js`) la ancla a **hoy**, por una
  limitación ya declarada (`LIMITACION_NO_ES_PROYECCION_FUTURA`), nunca porque sea la
  misma ventana que finalmente aplicará. Cualquier texto de captura debe distinguir
  explícitamente "los últimos 10 años calculados desde hoy, para esta lectura histórica"
  de "los 10 años que contarán el día que te reconozcan la pensión" — nunca presentarlos
  como si fueran lo mismo.
- **Captura de fecha mediante el estándar permanente del proyecto.** Cada fecha
  (`fechaDesde`, `fechaHasta`) se captura con `src/components/CampoFechaDiaMesAnio.jsx` —
  la implementación compartida de la regla de experiencia "Toda fecha usa el mismo patrón
  de captura" (`PL-240` §5, agregada en la revisión final de S4-001). El componente
  resuelve exclusivamente captura e interacción (tres campos día/mes/año, buffer de
  escritura del mes, aviso de día inválido); las reglas de negocio de cada fecha —fecha
  futura, orden `fechaDesde`/`fechaHasta`— permanecen en `HistoriaCotizacionRPM.helpers.js`,
  fuera del componente, mismo criterio ya aplicado en `DatosIniciales.jsx` (edad, fecha
  futura), primer consumidor y origen del patrón.

### 7.2 Generación de caminos

Contrato conceptual de un **camino RPM**, siguiendo el patrón ya probado de
`generarCaminosRAIS.js` (no las formas todavía dormidas de PL-230):

```
{
  id, tipo: 'base' | 'alternativo',
  estado: 'viable' | 'descartado' | 'no_evaluable',
  decision: texto humano (ej. "Aumentar tu IBC a $X desde hoy"),

  entradas: { ibcFuturoDecidido, edadJubilacionDeseada, resumenHistoriaUsada },

  resultado: { valor, moneda: 'COP', periodoReferencia: 'mensual',
               ibl, semanasTotales, tasaReemplazo },

  esfuerzo: {
    ibcActual, ibcPropuesto, aumentoIBC,
    aporteMensualPensionActual, aporteMensualPensionPropuesto,
    costoPensionalAdicionalMensual,
    costoAcumuladoHastaJubilacion,   // nuevo campo, exigido por la Regla 5
                                      // del Entregable — no existe hoy ni en RAIS
  },

  horizonte: { edadActual, edadJubilacionDeseada, mesesHastaJubilacion },

  distanciaObjetivo: { valorObjetivo, delta, cumple },

  supuestos: convención económica declarada (pesos de hoy, parámetros legales
             congelados a hoy — ver decisión pendiente §14.1),
  gradoEstimacion: 'alta' | 'media' | 'baja'   (cualitativo, nunca una
                    probabilidad inventada — ver Explanation.gradoEstimacion),

  limitaciones: [{codigo, mensaje}],
  razonDescartado: {codigo, mensaje, reglaAplicada} | null,
}
```

Cada camino se basta a sí mismo para alimentar cálculo, explicación y gráfico, sin que
ninguna otra capa tenga que re-derivar nada (ver §7.4).

**Sin hardcodear perfiles:** "múltiples caminos" significa la misma función de
evaluación de un camino, llamada con distintos valores candidatos de la misma variable
de decisión (IBC futuro) — nunca múltiples ramas de código por escenario o por persona.

### 7.3 Búsqueda determinista esfuerzo/resultado

A diferencia de RAIS (`resolverIBCNecesarioRAIS` — inversa algebraica cerrada, porque
`formulaRAIS` es una función suave de un único escalar), **RPM no admite una inversa
algebraica** (ver bloqueo §8.1).

- **Objetivo puntual:** búsqueda binaria/bisección determinista sobre el IBC futuro,
  acotada entre el IBC actual y el tope legal, evaluando repetidamente la función de
  proyección de un camino. Determinista, testeable, sin aprendizaje automático.
- **Relación esfuerzo-resultado (Regla 5 del Entregable):** barrido determinista de N
  candidatos de IBC entre el actual y el tope legal — no un optimizador continuo, una
  rejilla evaluada una vez cada punto.
- **Dominancia/Pareto:** con un único lever de decisión (IBC), todos los resultados se
  mueven monótonamente juntos — no hay todavía una frontera de Pareto real que
  descubrir. Se vuelve valioso solo cuando el horizonte (edad de jubilación) también sea
  una variable de decisión explorable, lo cual se difiere explícitamente a un Slice
  posterior a este Entregable, no incluido en los 7 aprobados (§9).
- **Riesgo a validar antes de confiar en la bisección:** ver bloqueo §8.5.

### 7.4 Comparación visual como parte obligatoria de la respuesta

Cuando existan dos o más caminos, el usuario debe poder comprender visualmente qué
obtiene y qué esfuerzo exige cada alternativa — no es un añadido opcional del Entregable,
es un criterio de aceptación (§12, Prueba visual).

Cada camino (§7.2) ya trae todos los campos que cualquier representación visual necesita
— la UI solo mapea, nunca deriva. El generador de caminos debe, además, marcar
explícitamente roles (`actual` / `cumple objetivo` / `menor esfuerzo` / `más cercano sin
cumplir`), igual que `calcularOrientacion` ya hace hoy en `generarCaminosRAIS.js` — la UI
colorea según esos roles ya calculados, nunca decide ella misma cuál es "el mejor".

Sobre la forma visual: dado que el resultado es una curva de compromiso continua sobre
una única variable de decisión (esfuerzo↑ → resultado↑, con retornos decrecientes cerca
del tope legal), un scatter/línea conectada comunica mejor la forma de la curva que
barras, pensadas para categorías discretas. Esta recomendación se confirma formalmente
al diseñar el Slice correspondiente (§10), no se cierra aquí.

### 7.5 Regla: gráfico = qué ocurre / IA = por qué importa / trazabilidad = cómo se calculó

Regla de reparto de responsabilidad, vinculante para todo el Entregable:

- **El gráfico** muestra los datos que el dominio ya produjo — nunca los recalcula, nunca
  los adorna con un elemento visual sin dato detrás.
- **La IA** explica, en lenguaje natural, por qué un camino importa para esa persona —
  exclusivamente sobre datos que el dominio ya produjo (misma restricción del §6).
- **La trazabilidad** (normas usadas, supuestos usados, limitaciones) dice cómo se
  calculó cada cifra — mismo patrón ya usado por toda evidencia y todo escenario de
  `generarCaminosRAIS.js`.

Ninguna de las tres capas asume el trabajo de otra.

### 7.6 Relación con PL-230 — qué mínimo se adopta

Se adopta la **filosofía**, no los contratos formales:
- Se reutilizan las funciones de evidencia ya existentes tal cual — no se construye un
  "Motor de Evidencias" genérico (Principio 9: sin abstracción sin ≥2 casos reales).
- El generador de caminos (§7.2-7.3) juega informalmente el rol de "Constructor de
  Estrategias" de PL-230 §6.3, pero **sin instanciar `PerfilDecision.js` todavía** — se
  sigue con estado plano en `App.jsx` para objetivo/restricción, igual que RAIS ya hace
  hoy con `objetivoValorMensual`/`restriccionCostoPensionalAdicionalMaximoMensual`.
- La visualización comparativa (§7.4) cumple el rol de "Comparador de Estrategias" para
  esta versión — no se construye un componente formal separado.
- **No se construye en este Entregable:** Brújula Pensional (el propio PL-230 la difiere
  explícitamente, §6.5), extensión formal de `CalculationTrace`/`Explanation` (siguen sin
  un solo consumidor real hoy — el contrato de §7.2 ya cubre trazabilidad con el patrón
  ad hoc ya probado por RAIS).

---

## 8. Bloqueos técnicos/normativos identificados

Todos verificados por lectura directa del código y la documentación existentes, no
supuestos:

1. **IBL no es invertible en forma cerrada respecto al IBC futuro.** A diferencia de
   RAIS (`formulaRAIS.js`, función suave de un escalar), RPM combina un promedio
   ponderado por tiempo sobre una ventana móvil (o toda la vida laboral) con una tasa de
   reemplazo escalonada y con clamps (`formulaRPM.js`). Requiere búsqueda numérica, no
   álgebra (ver §7.3).
2. **Ventana móvil del IBL frente a horizonte futuro.** La ventana de "últimos 10 años"
   estaba anclada a la fecha de cálculo, no a la fecha de jubilación
   (`seleccionarPeriodosIBL.js`). **Resuelto (§14.1, 2026-08-20):** el selector recibe un
   `fechaAncla` separado de `fechaCalculo` — la ventana ancla a `fechaReconocimiento` para
   la proyección, sin cambiar su algoritmo de retroceso por días efectivamente cotizados.
3. **SMLV y parámetros legales futuros desconocidos.** Mismo hallazgo ya registrado para
   RAIS (`TOPE_IBC_CON_SMMLV_VIGENTE`, `docs/producto/oportunidades-futuras.md`).
   Cualquier camino RPM proyectado necesita una limitación equivalente, nunca un SMLV
   inventado.
4. **Interpretación operativa de semanas (ancla de 1300).** El ancla del incremento de
   tasa de reemplazo es una interpretación operativa de Colpensiones (1300 semanas para
   ambos sexos), no la única lectura legal posible — existe una interpretación
   alternativa favorable a la afiliada (1250 para mujeres, Sentencia C-197/2023) ya
   documentada y decidida para Sprint 1 (`trazabilidad-formula-RPM.md`). Se vuelve más
   visible al usuario en un camino proyectado que cruza ese umbral que en una lectura
   puramente histórica.
5. **Monotonicidad aún no demostrada.** Que la pensión crezca de forma monótona respecto
   al IBC futuro es razonable pero no está probado — necesario para confiar la bisección
   de §7.3, debe validarse con casos de prueba reales antes de usarse, especialmente
   cerca de los clamps de tasa de reemplazo y del tope de 25 SMLV.
6. **Semanas futuras ligadas al calendario, no son una variable libre.** A diferencia
   del IBC (una decisión dentro de un rango legal), las semanas que se acumulan hasta el
   horizonte están determinadas por cuánto tiempo falta hasta la edad de jubilación
   declarada — el horizonte es tiempo, no un parámetro de búsqueda independiente.
7. **`calcularVentana()` es una simplificación técnica provisional, no el contrato
   jurídico del IBL — confirmado con evidencia primaria (2026-08-19).** Investigación
   normativa acotada (ver `src/data/legal/trazabilidad-normativa.md`, sección "Ventana
   temporal del IBL ordinario") cotejó directamente el texto de **SL1006-2025** (Corte
   Suprema de Justicia, Sala de Casación Laboral): ante una historia real con un vacío de
   cotización de más de una década dentro de lo que sería la ventana calendario de "10
   años", la Sala no bloqueó el cálculo — retrocedió en el calendario para completar el
   período. Esto confirma que el comportamiento actual de `seleccionarPeriodosIBL.js`
   (ventana de años calendario fijos + `VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS` ante
   cualquier hueco) **genera subcobertura**: rechaza como "no evaluable" casos que la
   jurisprudencia sí permite calcular. El futuro selector deberá construir la ventana por
   **períodos efectivamente cotizados** (retrocediendo para saltar huecos), no por
   calendario. **Criterio de corte — resuelto como decisión de producto (2026-08-19),
   no como hecho legal universal:** tras una segunda investigación acotada que no logró
   producir un segundo caso primario ni localizar SL1236-2025, Carlos/Atlas adoptaron
   **3.650 días calendario efectivamente cotizados** como convención técnica provisional
   (ver `src/data/legal/trazabilidad-normativa.md`, sección "Convención técnica
   provisional — 3.650 días efectivamente cotizados"), respaldada por la reconstrucción
   matemática verificable de SL1006-2025 (3.653 días totales, tramo inicial recortado de 3
   días → 3.650 restantes, tratamiento correcto de bisiestos). **Explícitamente no es una
   lectura del Art. 21** — es una aproximación técnica declarada como tal, sujeta a
   revisión si aparece evidencia primaria adicional (criterios exactos de reapertura
   listados en esa misma sección). El Slice correctivo que implementa esta convención se
   describe en §14.8.
8. **Falsa precisión en horizontes largos.** Un camino a 20-30 años debe declarar
   explícitamente un grado de certeza bajo (`Explanation.gradoEstimacion`, campo
   reservado desde Sprint 2 y nunca poblado hasta ahora), nunca presentarse con la
   solidez de la lectura histórica ya implementada.

9. **Tratamiento de la historia previa a un traslado de régimen (RAIS→RPM) — sin
   fundamento normativo suficiente para el IBC histórico.** Hallazgo de la revisión
   manual de S4-001 (Carlos, primer caso real de validación, se trasladó recientemente
   de RAIS a RPM), confirmado por investigación normativa acotada (ver
   `src/data/legal/trazabilidad-normativa.md`, sección "Traslado de régimen (RAIS→RPM) e
   IBL"). Con fuente oficial literal: **el tiempo cotizado en RAIS sí tiene respaldo
   normativo para computarse en RPM** (Decreto 3800 de 2003, Art. 3: "el tiempo cotizado
   en el Régimen de Ahorro Individual le será computado al del Régimen de Prima Media").
   Pero **ninguna fuente consultada — ni el Art. 21 de la Ley 100 de 1993, ni el propio
   Decreto 3800/2003 — resuelve cómo debe tratarse el IBC histórico** (los valores
   económicos cotizados, no solo el tiempo) dentro del promedio de los 10 años o de toda
   la vida laboral. Mientras no exista ese fundamento, **PensionLab no debe incluir ni
   excluir esa historia mediante una regla inventada** — ni sumarla sin más, ni
   descartarla. Esta incertidumbre **no excluye del recorrido a un usuario con
   traslado** (decisión explícita Carlos/Atlas: excluirlo vaciaría de sentido el
   Entregable 2), pero **limita lo que PensionLab puede afirmar** sobre el resultado en
   esos casos — debe declararse como limitación visible, nunca resolverse en silencio.
10. **Confusión entre "historia capturada" y "semanas reales reconocidas" del afiliado
    (`semanasObservadas`).** `calcularPensionRPM.js` deriva `semanasObservadas`
    exclusivamente de `historiaCotizacion` — la porción de la historia que el usuario ya
    alcanzó a introducir en la pantalla de captura —, nunca de
    `semanasCotizadas`/`nivelConocimientoSemanas`, ya declarados antes en el mismo
    expediente (`InformacionPensionalEsencial.jsx`). El Art. 21, inciso 2, Ley 100 de
    1993, es incondicional: quien cotizó ≥1250 semanas reales tiene derecho a que se
    calcule también la alternativa de vida laboral y se le aplique la más favorable — no
    dice "quien declaró 1250 semanas en un formulario". Si el usuario introduce solo una
    parte de su historia (ej. los últimos 10 años), `semanasObservadas` puede quedar muy
    por debajo de su total real, y el motor **nunca intentará la comparación de vida
    laboral, en silencio** — aunque el usuario ya haya declarado en otra pantalla del
    mismo expediente una cifra de semanas suficiente. Cómo debe interactuar ese dato ya
    declarado con la historia estructurada es una decisión de arquitectura todavía
    pendiente (§14), no una corrección de código ya autorizada.

Ninguno de estos diez puntos se resuelve en este documento. Se registran para que
ningún Slice los redescubra desde cero ni los resuelva implícitamente en código.

---

## 9. Qué NO construimos en este Entregable

- Soporte universal de todos los perfiles RPM (empleado, mixto, exterior, régimen de
  transición, traslados) — se mantiene un perfil estrecho inicial, extensible después
  con evidencia real.
- PL-230 completo (componentes formales, `PerfilDecision`/`ExpedientePensional`
  instanciados, extensión de `CalculationTrace`/`Explanation`) — solo su filosofía, vía
  patrones ya probados (§7.6).
- Chatbot genérico — la IA interpreta siempre hacia campos ya definidos, nunca sostiene
  conversación libre sin destino estructurado.
- Backend/servicios externos — todo cálculo sigue siendo local y determinista; el único
  servicio nuevo posible (un LLM para interpretación/explicación) es una decisión
  explícita pendiente, a tomar con Carlos/Atlas antes del Slice que lo requiera (§14.3),
  no asumida en este documento.
- Persistencia — el expediente sigue en memoria del navegador.
- Optimización basada en LLM — la búsqueda y el barrido de §7.3 son deterministas.
- Gráficos decorativos — todo elemento visual mapea 1:1 a un campo ya producido por
  dominio.
- Dominancia/Pareto formal — diferido hasta que exista un segundo lever de decisión
  (horizonte) que lo justifique.
- Reescritura general de PensionLab — se extiende el árbol de vista actual de
  `App.jsx`, no se reemplaza.
- Modelado cuantitativo de riesgo/incertidumbre — se declara cualitativamente
  (`gradoEstimacion`), nunca como probabilidad inventada: no hay fuente de varianza
  validada (SMLV/IPC futuros son desconocidos por diseño, no aleatorios con distribución
  conocida).

---

## 10. Plan de ejecución — los 7 Slices aprobados

| Slice | Capacidad que entrega | Por qué en ese orden | Dependencias | Afecta | Pruebas | Criterio de aceptación | % acum. |
|---|---|---|---|---|---|---|---|
| **S4-001** | Captura estructurada real de `historiaCotizacion` (sin Panel de Desarrollo) | Único bloqueo que impide usar hoy una capacidad **ya construida**; sin esto nada más es alcanzable por un usuario real | Ninguna | UI (+ estado en `App.jsx`) | Reutiliza tests de dominio existentes; añade tests de UI de captura/validación | **"Un usuario RPM perteneciente al perfil soportado puede introducir desde la UI una historia de cotización estructurada válida y alcanzar la lectura económica RPM existente sin utilizar fixtures ni Panel de Desarrollo."** Carlos es el primer caso real de validación, nunca una condición hardcodeada del producto. | 15% |
| **S4-002** | `calcularProyeccionRPM.js` — camino base con horizonte futuro | Requiere resolver primero la convención económica RPM (§14.1) antes de generar alternativas | S4-001 + decisión obligatoria §14.1 | `domain/pensionEngine/` (nuevo archivo) | Casos numéricos de referencia nuevos, incl. horizonte >10 años y <10 años | Pensión proyectada verificable a mano, con limitaciones declaradas (sin IPC/SMLV futuro inventado) | 30% |
| **S4-003** | Objetivo/restricción RPM capturables + búsqueda determinista del IBC necesario (camino base + alternativo) | La búsqueda solo evalúa la función de S4-002 repetidamente | S4-002 + validación de monotonicidad (§8.5) | `domain/pensionEngine/generarCaminosRPM.js`, UI (reusa `CampoMonetario`) | Tests de bisección (convergencia, casos límite en clamps/tope) + tests análogos a `generarCaminosRAIS.test.js` | Con un objetivo declarado, el sistema entrega camino base + alternativo viable (o explica honestamente por qué no es alcanzable) | 45% |
| **S4-004** | Comparación visual esfuerzo↔resultado (2 caminos) | Requiere caminos reales ya calculados; la UI solo visualiza, no recalcula | S4-003 | UI únicamente | Prueba visual manual + test de que el componente no transforma los datos recibidos | Una persona sin explicación previa identifica cuál camino exige más esfuerzo y cuál se acerca más a la meta | 60% |
| **S4-005** | Barrido de caminos intermedios (rejilla determinista) | Extiende densidad de datos sobre una capacidad ya demostrada, no cálculo nuevo | S4-003, S4-004 | Pequeña extensión de `generarCaminosRPM.js` | Determinismo/reproducibilidad del barrido | El gráfico muestra ≥4-5 puntos y una persona señala visualmente dónde el esfuerzo deja de rendir proporcionalmente | 72% |
| **S4-006** | Inquietud libre → interpretación IA → confirmación → expediente | Deliberadamente al final del núcleo determinista (Regla 1, §6): nada que interpretar hacia hasta que el motor exista y sea confiable | S4-003 (el formulario que la IA pre-llena) + decisión pendiente §14.3 (servicio de IA) | Capa nueva fuera de `domain/` + pantalla de confirmación | Casos de interpretación incorrecta corregidos por el usuario → mismo resultado final que captura manual | Alex escribe su inquietud, confirma, y llega a la misma comparación visual sin guía de Carlos — Prueba Alex | 85% |
| **S4-007** | Explicación IA de cada camino sobre datos ya producidos | Máxima dependencia de todo lo anterior; menor riesgo técnico | S4-004/S4-005 (+ S4-006 idealmente) | Capa de presentación/IA únicamente | Test de consistencia: ninguna cifra del texto difiere de lo ya calculado | Ninguna cifra mencionada por la IA contradice o inventa un número — Pruebas Carlos y Alex completas de punta a punta | 100% |

---

## 11. Definición de terminado del Entregable 2

El Entregable 2 se considera terminado cuando:

1. Los 7 Slices (S4-001 a S4-007) están cerrados y verificados (`npm run lint`, `npm
   test`, `npm run build` en verde, mismo estándar ya exigido en Sprint 3).
2. Las tres pruebas de aceptación (§12) pasan sin código específico de persona.
3. Cada uno de los ocho bloqueos de §8 está, para el alcance de este Entregable, resuelto
   con una decisión explícita documentada o declarado como limitación visible al usuario
   — ninguno queda resuelto implícitamente en código sin registro.
4. Ninguna de las exclusiones de §9 fue construida como efecto colateral de algún Slice.
5. Existe un `docs/gestion/cierre-sprint-4.md` con una entrada cerrada por cada Slice,
   siguiendo el mismo estándar de verificación ya usado en `cierre-sprint-3.md`.

---

## 12. Pruebas de aceptación

- **Prueba Carlos:** expresa su necesidad → PensionLab comprende → obtiene lo necesario →
  calcula → genera caminos → busca alternativas eficientes → compara visualmente →
  explica.
- **Prueba Alex:** hace lo mismo con sus propios datos, sin código especial ni guía de
  Carlos, y obtiene una respuesta útil.
- **Prueba visual:** una persona ve la comparación sin explicación previa y puede
  identificar correctamente qué obtiene y qué esfuerzo exige cada camino.
- **Idealmente después:** una tercera persona del mismo perfil, que no participó en el
  desarrollo, repite la Prueba Alex de forma independiente.

---

## 13. Gobernanza de esta decisión

Este documento existe, en primer lugar, porque una decisión aprobada en conversación no
es memoria institucional hasta quedar registrada — regla formalizada en
`docs/ia/metodologia-de-desarrollo-con-ia.md` ("Registro obligatorio de decisiones",
vigente desde 2026-08-18). No se repite aquí el contenido de esa regla; este documento es
uno de sus primeros efectos, no su definición.

---

## 14. Decisiones pendientes / próximos pasos

Consistente con la instrucción de no completar vacíos con supuestos, lo siguiente se
identificó durante el análisis de este Entregable y **no se resuelve en este documento**:

1. **Convención económica de proyección RPM** (bloqueo §8.2) — **resuelta (2026-08-20),
   contrato completo en `src/domain/formulas/trazabilidad-formula-RPM.md`, sección
   "Proyección RPM — Convención económica v1 (S4-002)".** Alternativa C (fecha base
   monetaria = fecha de cálculo; históricos indexados con IPC real; IBC futuro declarado en
   poder adquisitivo de esa fecha base; ningún IPC futuro inventado), aprobada
   conceptualmente el 2026-08-19 y precisada tras revisión Carlos/Atlas del 2026-08-20 con
   tres correcciones: (a) separación explícita `ibcAplicableSimulacion` (dato actual) /
   `escenarioIbcFuturo: {valor, origen}` (escenario evaluado) — S4-002 produce únicamente
   `origen: 'continuidad_ibc_actual'`, sin cerrar un enum especulativo para S4-003; (b) la
   reconfirmación de declaraciones antiguas de IBC futuro se retira del contrato mínimo —
   irrelevante sin persistencia (§9), queda registrada como decisión futura asociada a esa
   capacidad, no diseñada aquí; (c) el tope legal de IBC nunca sobrescribe en silencio —
   `escenarioIbcFuturo` conserva `valorDeclarado`, `valorAplicado`, `origen` y
   `topeAplicado` en la salida. Desbloqueada por el cierre del selector temporal ordinario
   (punto 8 de esta lista, S4-001B) — la convención económica no definía por sí sola qué
   períodos entraban a la ventana proyectada hasta que ese selector existió.
2. **Límites exactos del perfil soportado** (§3) — qué combinaciones de
   `tipoCotizante`/`lugarCotizacion`/`trasladoRegimen` quedan dentro de alcance de
   S4-001/S4-002. Se decide al diseñar esos Slices, no aquí.
3. **Si S4-006 requiere un servicio de IA externo** (LLM) y, de ser así, cuál — decisión
   explícita a tomar con Carlos/Atlas antes de ese Slice, no asumida en este documento
   (ver exclusión en §9).
4. **Si Explicabilidad (S4-007) extiende `Explanation.js` o requiere un contrato
   hermano nuevo** — misma decisión que PL-230 §10 ya deja pendiente para su propio
   Motor de Decisión; este Entregable no la resuelve por su cuenta.
5. **Relación entre este documento y un futuro `docs/gestion/cierre-sprint-4.md`** — se
   crea cuando cierre el primer Slice (S4-001), no en este commit.
6. **Si y cómo tratar el IBC histórico previo a un traslado de régimen (RAIS→RPM)
   dentro del IBL** (bloqueo §8.9) — bloqueada mientras no exista fundamento normativo
   suficiente. No se resuelve inventando una regla; requiere investigación normativa
   adicional (reglamento específico, jurisprudencia, o consulta directa a Colpensiones)
   antes de cualquier cambio de dominio.
7. **Cómo debe interactuar `semanasCotizadas`/`nivelConocimientoSemanas` (ya declarados
   en el expediente) con `historiaCotizacion`/`semanasObservadas` (derivados de la
   historia estructurada)** (bloqueo §8.10) — analizado conceptualmente durante la
   revisión de S4-001, sin cambio de motor todavía autorizado.
8. **Criterio exacto de corte del selector de "10 años efectivamente cotizados"**
   (bloqueo §8.7) — **resuelto como decisión de producto (2026-08-19), no como hallazgo
   normativo universal.** Dos rondas de investigación acotada (metodología oficial de
   Colpensiones, jurisprudencia primaria adicional, SL1236-2025, SL7061-2016, un segundo
   caso primario con tabla) no lograron producir una segunda reconstrucción verificable ni
   una formulación general de la regla en prosa. Carlos/Atlas adoptaron **3.650 días
   calendario efectivamente cotizados** como convención técnica provisional de PensionLab
   — no como constante legal — respaldada por la reconstrucción matemática de SL1006-2025
   (ver `src/data/legal/trazabilidad-normativa.md`, sección "Convención técnica
   provisional — 3.650 días efectivamente cotizados", que también lista qué evidencia
   futura obligaría a reabrir esta decisión). El Slice correctivo que la implementa
   reemplaza `calcularVentana()` como definición de la ventana ordinaria del IBL; **sigue
   bloqueando S4-002** hasta que ese Slice cierre.
