# PL-250 — Borde de la solución y contrato de alcance

**Versión:** 0.5 (borrador para decisión de producto — no congelado)
**Fecha:** 2026-09-01
**Categoría documental:** Alcance de producto — borde de la solución
**Proyecto:** PensionLab
**Estado:** Borrador para decisión de producto.

Este documento sigue sin estatus de "documento fundacional de la Biblioteca
de Conocimiento" ni entregable `.docx` asociado. Las secciones de diseño
(§15-§17) documentan la intención; §20 registra qué de eso ya tiene una
primera entrega vertical real (código + pruebas) y qué sigue pendiente.

## Control de versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 0.1 | 2026-09-01 | Equipo de producto de PensionLab, con asistencia de Claude (Anthropic) | Primer borrador: formaliza el borde resuelve/orienta/detiene y lo contrasta contra el repositorio. |
| 0.2 | 2026-09-01 | Equipo de producto de PensionLab, con asistencia de Claude (Anthropic) | Renombrado a `PL-250`. Agrega horizonte único (V1/POST-V1/FUERA DE ALCANCE) y distingue cobertura de resolución vs. detección. |
| 0.3 | 2026-09-01 | Equipo de producto de PensionLab, con asistencia de Claude (Anthropic) | Define tres salidas de control de entrada con falla cerrada real (elimina "continuar bajo advertencia"). Audita los 8 bloqueadores individualmente y propone una divulgación progresiva en dos pasos (Paso A + Paso B, este último como pantalla nueva). Separa horizonte de detección/resolución en las 30 filas. |
| 0.4 | 2026-09-01 | Equipo de producto de PensionLab, con asistencia de Claude (Anthropic) | Revisión de cierre antes de congelar. (1) Corrige un error de navegación: `trasladoRegimen` se declara en `HistoriaPensional.jsx`, no en `IndiciosRegimenTransicion.jsx` — corregido en la matriz y en §14. (2) Elimina el `Paso B` como pantalla nueva: las cuatro comprobaciones que antes vivían ahí se redistribuyen en pantallas ya existentes (`Objetivo.jsx`, `SituacionPensional.jsx`, `HistorialLaboral.jsx`, `IndiciosRegimenTransicion.jsx`), verificado contra el código real de cada una — camino feliz sin pantallas ni clics de navegación adicionales. (3) Resuelve la contradicción de `B-10` (aparecía en dos lugares a la vez): queda únicamente como pregunta condicional en `IndiciosRegimenTransicion.jsx`. (4) Amplía la redacción de la opción 4 de `Objetivo.jsx` para que cubra `B-13` completo (antes solo cubría "me negaron", dejando "proceso activo" sin mecanismo) — reduce a 4, no 3, los bloqueadores resueltos en la primera pantalla. (5) Agrega secuencia de cierre de V1 en 4 bloques. Verificada la integridad estructural del archivo: título único, versión única, 30 filas de matriz sin duplicados, encabezados únicos. No implementa nada.|
| 0.5 | 2026-09-01 | Equipo de producto de PensionLab, con asistencia de Claude (Anthropic) | Primera entrega vertical real del Bloque 1 (§17): motivo de consulta en `Objetivo.jsx`, cerrando `B-01`, `B-02`, `B-03` y `B-13`. Agrega §20 con el detalle de implementación, archivos y pruebas. Registra explícitamente por qué `B-03` y `B-13` son opciones separadas (remisiones distintas) y qué queda pendiente del Bloque 1 (régimen especial `B-04`, alto riesgo `B-05`, traslado discutido `B-10`, mensaje `B-12`). **Corrección posterior, misma versión:** la revisión visual de esa entrega encontró que mostrar simultáneamente las 6 opciones de motivo y las 4 de objetivo hacía la pantalla demasiado larga en móvil — se rediseñó como divulgación progresiva en dos pasos dentro de la misma vista (sin pantalla global nueva), aceptando +1 clic de progresión en el camino de vejez; corregida la afirmación de "0 clics adicionales" en §18 (era válida para pantallas, no para clics de progresión dentro de una misma pantalla dividida en pasos). **Segunda corrección posterior, misma versión:** auditoría de extremo a extremo de `objetivoSeleccionado` (el Paso 2) clasificó la pregunta como `DECISIÓN_APARENTE` — sus dos opciones habilitadas nunca producían un resultado distinto. Se eliminó el Paso 2 completo (Alternativa A, sin construir una consecuencia artificial): `Objetivo.jsx` vuelve a una sola pregunta; se retiró `objetivoSeleccionado` de `App.jsx`, `estadoApp.js`, `fixtures.js` y el bloque de resumen en `ExpedientePensional.jsx`; se eliminaron `OPCIONES_OBJETIVO_VEJEZ`/`objetivoEstaDisponible`/`manejarEnvioObjetivo` y sus 15 pruebas; se retiró `.btn-link` de `App.css` sin consumidores. Costo final del camino de vejez: 0 pantallas y 0 clics adicionales frente al `Objetivo.jsx` previo a PL-250 — la única selección nueva y obligatoria es el motivo de consulta, con consecuencia real. Corregida además la afirmación de `docs/producto/oportunidades-futuras.md` sobre qué gobierna el flujo. **Tercera corrección, misma versión:** se precisó §15.1 (el límite de "tercer intento" es sobre avance automático/silencioso, no sobre corrección voluntaria) y se implementó `volverDesdeDetencion` con sus dos ramas. Sigue como borrador, sin congelar.|

## Trazabilidad con el resto del proyecto

Sin cambios: este documento complementa, sin duplicar, `README.md`, PL-230,
PL-240, `docs/qa/matriz-pruebas-funcionales-mvp.md` y
`docs/producto/oportunidades-futuras.md`.

---

## 0. Qué cambia en esta versión (0.4)

Revisión de cierre antes de congelar, con dos hallazgos que corregir y uno
que agregar:

1. **Error de navegación (corregido):** la v0.3 afirmaba, en varios lugares,
   que `trasladoRegimen` (la pregunta "¿te has trasladado alguna vez de
   régimen?") se capturaba en `IndiciosRegimenTransicion.jsx`. Verificado
   contra el código real: se captura en `HistoriaPensional.jsx` (pantalla
   9 del recorrido, ver §13). `IndiciosRegimenTransicion.jsx` (pantalla 11)
   recibe ese valor ya decidido como prop y solo muestra, condicionalmente,
   los detalles del traslado (dirección, fecha) cuando ya es `'si'`. La
   propuesta de integrar ahí el seguimiento de disputa sigue siendo correcta
   —es, de hecho, el mismo patrón condicional que la pantalla ya usa para sus
   otros dos campos— pero la descripción de *dónde vive la pregunta base*
   estaba mal y queda corregida en toda la matriz y el diseño.
2. **Fricción innecesaria (corregida):** la v0.3 proponía una pantalla nueva
   ("Paso B") para las cuatro comprobaciones de régimen especial, alto
   riesgo, traslado discutido y proceso activo. Verificado contra el código
   real de `SituacionPensional.jsx`, `HistorialLaboral.jsx` e
   `IndiciosRegimenTransicion.jsx` (§13-15): las cuatro caben, sin excepción,
   en pantallas que la persona ya visita, como una opción o un campo
   adicional dentro del mismo formulario y el mismo botón "Continuar" que ya
   existe. No hace falta ninguna pantalla nueva. Esto también resuelve, de
   paso, la contradicción de `B-10` que aparecía simultáneamente en el "Paso
   B" general y como pregunta condicional — ahora aparece en un único lugar.
3. **Simplificación adicional:** ampliar la redacción de la opción 4 de
   `Objetivo.jsx` para cubrir explícitamente "un trámite o reclamación en
   curso" (no solo "me negaron") cierra `B-13` por completo en esa misma
   pantalla, sin necesitar ninguna comprobación adicional en otro lugar. El
   número de bloqueadores resueltos en la primera pantalla sube de 3 a 4.
4. **Nuevo:** secuencia de cierre de V1 en 4 bloques (§17), para que este
   diagnóstico se pueda ejecutar sin convertirse todavía en un plan técnico.

## 1. Propósito de PensionLab

(Sin cambios.) PensionLab existe para que una persona sepa si existe un
camino pensional viable, cuánto podría exigir, qué incertidumbres quedan, y
por qué no es alcanzable cuando no lo es.

## 2. Criterio general de entrada

(Sin cambios.) Hechos suficientemente determinados, norma identificable,
variables futuras evaluables por la persona.

## 3. Tres niveles de respuesta (marco de producto, sin cambios de etiqueta)

- **RESUELVE** — calcula y compara caminos con evidencia suficiente.
- **ORIENTA_CON_LIMITACIONES** — lectura preliminar útil pero incompleta,
  con la brecha señalada.
- **SE_DETIENE_Y_REMITE** — no es seguro calcular; explica el motivo y el
  siguiente paso recomendado.

Estos tres niveles clasifican **el caso en abstracto** dentro de la matriz
(§8). Las salidas de §4-bis describen **la decisión de enrutamiento en tiempo
real** para una persona concreta, antes de que el motor ordinario reciba un
dato. Son dos capas distintas — ver v0.3 para la discusión completa de esta
distinción, no repetida aquí.

## 4. Dos preguntas distintas: ¿puede resolverse?, y ¿se detecta que llegó?

(Sin cambios.) `COBERTURA_DE_RESOLUCION` — capacidad de calcular u orientar
el caso. `COBERTURA_DE_DETECCION` — capacidad de reconocer que el caso entró
y dirigirlo. PensionLab no necesita resolver invalidez en V1, pero sí debe
detectar que la consulta no es de vejez.

## 4-bis. Las tres salidas del control de entrada

(Sin cambios respecto a v0.3 — se mantienen intactas las tres salidas y la
regla de falla cerrada.)

- **`CONTINUAR_FLUJO_VEJEZ`** — los hechos permiten aplicar el motor
  ordinario cubierto.
- **`ORIENTAR_ANTES_DE_CONTINUAR`** — incertidumbre resoluble con un dato
  adicional o una aclaración puntual; nunca un estado permanente.
- **`DETENER_Y_REMITIR`** — caso confirmado fuera del alcance, o
  incertidumbre material que persiste tras la aclaración mínima. Final real:
  la única acción disponible, además de leer la explicación, es volver y
  corregir la selección — nunca "continuar de todas formas".

**Regla sobre "No estoy seguro":** nunca es una salida por sí sola — es una
entrada a `ORIENTAR_ANTES_DE_CONTINUAR` que (a) explica brevemente las
categorías; (b) pide solo la aclaración mínima necesaria; (c) permite
corregir la selección; y (d) si la incertidumbre persiste, resuelve en
`DETENER_Y_REMITIR` — nunca en `CONTINUAR_FLUJO_VEJEZ` por defecto.

## 5. Casos que PensionLab debería poder resolver

(Sin cambios de contenido — ver matriz §8, filas `A-01`…`A-16`.)

## 6. Casos que deben detenerse o remitirse

(Sin cambios de contenido — ver matriz §8, filas `B-01`…`B-14`.)

## 7. Principios que no pueden romperse

(Sin cambios — diez principios citados, no redefinidos.)

---

## 8. Matriz mínima de casos — horizonte de detección y de resolución por separado

Dos columnas separadas de horizonte, sin mezclar cuándo debe estar lista la
detección con cuándo la resolución. *Nivel sin cambios de etiqueta.*

### Bloque A — casos que PensionLab debería poder resolver

| ID | Persona/caso | Nivel | Horizonte de detección | Horizonte de resolución | Cobertura resolución | Cobertura detección | Evidencia | Brecha | Prioridad |
|---|---|---|---|---|---|---|---|---|---|
| A-01 | Semanas suficientes, edad pendiente | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide con resolución) | `generarCaminosRPM.js`; QA `RPM-002/013/021` | Ninguna material | Baja |
| A-02 | Semanas faltantes pero alcanzables | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | `generarCaminosRPM.js` (bisección); QA `RPM-014` | Ninguna | Baja |
| A-03 | Llega a la edad sin completar semanas | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | `generarCaminosRPM.js:575-599`; test elegibilidad 6/6b | No orienta hacia alternativas (`B-14`, POST_V1) | Media |
| A-04 | Objetivo alcanzable | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | QA `RPM-014`, `RAIS-004` | Ninguna | Baja |
| A-05 | Objetivo no alcanzable (ni al tope) | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | QA `RPM-018`, `RAIS-004` | Ninguna | Baja |
| A-06 | Mantener IBC actual | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | QA `RPM-013`, `RAIS-002` | Ninguna | Baja |
| A-07 | Explorar esfuerzo adicional | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA (RPM) / POST_V1_PRIORITARIA (ampliar RAIS) | COMPLETA (RPM) / PARCIAL (RAIS) | COMPLETA | QA `RPM-020`; `generarCaminosRAIS.js` | RAIS solo una palanca — límite declarado, no bloqueante | Media |
| A-08 | Empleado que no controla su IBC | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA (mensaje ya vigente) / POST_V1_PRIORITARIA (mejorar copy/alternativas) | PARCIAL | COMPLETA (`tipoCotizante` siempre capturado) | `determinarBaseCotizacion.js`, QA `RPM-008`; `generarCaminosRAIS.js:219-224` | RAIS-empleado sin alternativa; copy no enmarca la restricción | Media |
| A-09 | Independiente o colombiano en el exterior | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA (RPM, sujeto a verificación §17 Bloque 2) / POST_V1_PRIORITARIA (ampliar RAIS-exterior) | PARCIAL (RPM) / AUSENTE (RAIS caminos) | COMPLETA | `BaseCotizacion.jsx`; `generarCaminosRAIS.js:225-227`; `trazabilidad-normativa.md` | Sin verificar si la limitación del piso legal exterior se declara al usuario — candidato a bloqueador | **Alta** |
| A-10 | Historia detallada disponible | RESUELVE | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | `calcularPensionRPM.js`; QA `RPM-027` | Ninguna | Baja |
| A-11 | Información aproximada → preliminar | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | QA `RPM-003/010` | Ninguna | Baja |
| A-12 | Dato esencial ausente | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | QA `RPM-009/028`; `generarCaminosRAIS.js` | Ninguna | Baja |
| A-13 | Datos contradictorios | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA | PARCIAL | PARCIAL (coincide — mismo mecanismo) | `InformacionPensionalEsencial.jsx` | Sin test dedicado — candidato a bloqueador | **Alta** |
| A-14 | Indicios de régimen de transición | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA (screening honesto) / POST_V1_PRIORITARIA (modelarlo en el cálculo) | PARCIAL (no afecta el cálculo, `RPM-005`) | COMPLETA | `evidenciaIndiciosTransicion.js`/`.test.js`; QA `RPM-006` | Limitación ya declarada — no bloqueante | Media |
| A-15 | RAIS con información suficiente | RESUELVE (perfil estrecho) | V1_OBLIGATORIA | V1_OBLIGATORIA | COMPLETA | COMPLETA (coincide) | `generarCaminosRAIS.js`; QA `RAIS-002..008` | Ninguna dentro del perfil | Baja |
| A-16 | RAIS insuficiente / fuera de perfil | ORIENTA_CON_LIMITACIONES | V1_OBLIGATORIA | V1_OBLIGATORIA (mensaje ya vigente) / POST_V1_PRIORITARIA ("siguiente paso" formal) | PARCIAL | COMPLETA | `generarCaminosRAIS.js`; QA `RAIS-001` | Sin siguiente paso recomendado — polish, no bloqueante | Media |

### Bloque B — casos que deben detenerse o remitirse

*Nivel = `SE_DETIENE_Y_REMITE` (deseado) para las 14 filas. La resolución
del dominio permanece `FUERA_DE_ALCANCE_ACTUAL` en todas — construir un
motor de invalidez, sobrevivientes, etc. no es parte de V1 ni de la
siguiente versión. `B-12` se marca igual por convención (nota bajo la
tabla).*

| ID | Persona/caso | Horizonte detección | Horizonte resolución | Cobertura detección | Cobertura resolución | Evidencia | Justificación | Prioridad |
|---|---|---|---|---|---|---|---|---|
| B-01 | Invalidez | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | `Objetivo.jsx` no pregunta motivo de consulta | Riesgo directo de dar lectura de vejez a un caso de invalidez | **Alta — bloqueador** |
| B-02 | Sobrevivientes / sustitución | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Ídem | Mismo riesgo | **Alta — bloqueador** |
| B-03 | Ya pensionado, reliquidación | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Sin estado "ya pensionado" en `App.jsx` | Podría recorrer todo el flujo de vejez sin advertencia | **Alta — bloqueador** |
| B-04 | Régimen especial/exceptuado | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | `SituacionPensional.jsx` (`OPCIONES_REGIMEN`) solo admite RPM/RAIS/"no estoy seguro" | Forzado a elegir un régimen que no es el suyo | **Alta — bloqueador** |
| B-05 | Actividad de alto riesgo | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | `HistorialLaboral.jsx` no pregunta tipo de actividad | **Puede corromper un cálculo RPM legítimo** (edad mínima real distinta), no solo dejarlo sin detectar | **Alta — bloqueador, el más severo** |
| B-06 | Convenciones o beneficios especiales | POST_V1_PRIORITARIA | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Sin campo relacionado | No invalida el cálculo ordinario — bajo daño si no se detecta | Baja |
| B-07 | Historia laboral controvertida | POST_V1_PRIORITARIA | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Sin noción de "disputa" en el modelo | Edge case de calidad, puede esperar | Media |
| B-08 | Omisión patronal | POST_V1_PRIORITARIA | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Sin campo relacionado | Mismo criterio que B-07 | Media |
| B-09 | Cálculos actuariales / aportes retroactivos | FUERA_DE_ALCANCE_ACTUAL | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Motor no calcula retroactivos; supuesto de payout ya declarado "sin sustento actuarial" | Solicitud claramente distinguible de una consulta ordinaria | Baja |
| B-10 | Traslado de régimen discutido | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE (el hecho simple sí se captura; la disputa no) | FUERA_DE_ALCANCE_ACTUAL | `trasladoRegimen` se declara en `HistoriaPensional.jsx` (pantalla 9); `IndiciosRegimenTransicion.jsx` (pantalla 11) recibe ese valor y solo detalla dirección/fecha cuando es `'si'` — la disputa nunca se pregunta; RAIS excluye cualquier traslado; RPM lo captura sin efecto en la fórmula (`RPM-005`) | Ya atraviesa hoy el flujo ordinario y recibe una cifra que ignora la disputa | **Alta — bloqueador** |
| B-11 | Bono pensional controvertido | POST_V1_PRIORITARIA | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Bono pensional ya declarado como limitación general en 5+ archivos | La limitación general ya cubre el caso con honestidad suficiente | Baja |
| B-12 | Datos que no permiten identificar régimen/norma | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL (no es un dominio a resolver — ver nota) | PARCIAL | N/A | `SituacionPensional.jsx` ya tiene la opción "No estoy seguro" (`regimenActual = 'desconocido'`); `generarCaminosRAIS.js` la resuelve como `PERFIL_NO_EVALUABLE` genérico | El dato ya se detecta hoy — falta un mensaje propio, no una pregunta nueva | **Alta — bloqueador (de mensaje, no de pregunta nueva)** |
| B-13 | Reconocimiento negado o proceso activo | **V1_OBLIGATORIA** | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Sin capacidad ni campo relacionado | Mismo riesgo de fondo que B-01/B-02/B-04 | **Alta — bloqueador** |
| B-14 | Indemnización sustitutiva / devolución de saldos / BEPS | POST_V1_PRIORITARIA | FUERA_DE_ALCANCE_ACTUAL | AUSENTE | FUERA_DE_ALCANCE_ACTUAL | Sin mención en `src/` | Solo se activa después de que `A-03`/`A-05` ya concluyeron "no alcanzable" — mejora del siguiente paso, no de intake | Media |

**Nota sobre `B-12`:** no describe una prestación distinta que alguien
busque — describe un caso donde no hay información suficiente para saber en
qué régimen se está (más cercano al criterio de entrada §2 que a una
exclusión de dominio). Por eso su horizonte y cobertura de resolución se
marcan por convención (`FUERA_DE_ALCANCE_ACTUAL`/`N/A`), no porque exista un
motor que construir.

---

## 9. Borde actual frente a visión futura

(Sin cambios de contenido — ver v0.2/v0.3 §9.)

## 10. Criterio de terminación de V1

(Sin cambios respecto a v0.3 — nueve condiciones ancladas a filas de la
matriz; el punto 3 ["ningún caso fuera del alcance puede recibir
silenciosamente una proyección ordinaria de vejez"] se verifica contra la
salida `DETENER_Y_REMITIR` de §4-bis como final real.)

---

## 11. Bloqueadores reales de V1

Recategorizados según el mecanismo real de detección verificado en §13-15
(ya no "Paso A/Paso B" — esa distinción desaparece junto con la pantalla
nueva que quedó descartada):

**A. Resueltos en `Objetivo.jsx`, sin comprobación adicional — 4:** `B-01`
(invalidez), `B-02` (sobrevivientes), `B-03` (ya pensionado/reliquidación),
`B-13` (reconocimiento negado/proceso activo — con la redacción ampliada de
§15).

**B. Requieren una pregunta nueva en una pantalla ya existente — 2:** `B-04`
(régimen especial, en `SituacionPensional.jsx`), `B-05` (alto riesgo, en
`HistorialLaboral.jsx`).

**C. Requiere una pregunta condicional en una pantalla ya existente — 1:**
`B-10` (traslado discutido, en `IndiciosRegimenTransicion.jsx`, solo cuando
`trasladoRegimen === 'si'`).

**D. No requiere pregunta nueva, solo corregir un mensaje — 1:** `B-12`
(identificación de régimen/norma, en `SituacionPensional.jsx`).

**E. Verificaciones de cierre sobre capacidad ya construida — 2:** `A-09`,
`A-13`.

**F. No son bloqueadores de V1 — 6:** `B-06, B-07, B-08, B-09, B-11, B-14`.

**Total de bloqueadores reales: 10** (4+2+1+1+2 = 10, categorías A-E).
Ninguno requiere una pantalla nueva ni un motor de dominio nuevo — los 8 de
detección (A+B+C+D) se resuelven, en su totalidad, con contenido de intake y
mensajes distribuidos en cuatro pantallas ya existentes.

---

## 12. Revisión controlada vs. apertura pública

(Sin cambios respecto a v0.2/v0.3: la publicación actual en revisión
controlada puede seguir así; antes de cualquier apertura pública debe existir
el control de alcance de §15, que detiene los casos confirmados sin
construir ningún motor excluido.)

---

## 13. Orden real del recorrido de pantallas (verificado en `App.jsx`)

Verificado directamente contra `src/App.jsx` en esta revisión (no contra la
v0.3, que tenía un error puntual — ver §0). Orden exacto de las vistas
principales, antes de llegar a `baseCotizacion`:

1. `bienvenida` — `Bienvenida.jsx`
2. `objetivo` — `Objetivo.jsx`
3. `datosIniciales` — `DatosIniciales.jsx`
4. `situacionPensional` — `SituacionPensional.jsx` (`regimenActual`)
5. `historialLaboral` — `HistorialLaboral.jsx` (`tipoCotizante`,
   `lugarCotizacion`, `cotizaActualmente`)
6. `expedientePensional` — `ExpedientePensional.jsx`
7. `completarExpediente` — `CompletarExpediente.jsx`
8. `informacionPensional` — `InformacionPensionalEsencial.jsx`
9. `historiaPensional` — `HistoriaPensional.jsx` (**aquí se declara
   `trasladoRegimen`**: "sí" / "no" / "no estoy seguro")
10. `primeraLectura` (condicional) — `PrimeraLectura.jsx`
11. `indiciosTransicion` — `IndiciosRegimenTransicion.jsx` (recibe
    `trasladoRegimen` ya decidido; muestra condicionalmente dirección y fecha
    del traslado solo cuando es `'si'`)
12. `baseCotizacion` en adelante — sin cambios relevantes para este documento.

**Corrección aplicada:** la v0.3 ubicaba la pregunta de `trasladoRegimen` en
la pantalla 11 en vez de la 9. La propuesta de integración de `B-10` (§15)
seguía siendo correcta en cuanto a *dónde* debía vivir el seguimiento de
disputa (pantalla 11, condicional), pero la descripción de dónde vive la
pregunta base estaba equivocada. Ya corregida en la matriz (§8) y en esta
sección.

---

## 14. Mecanismo de detección de cada uno de los 8 bloqueadores estructurales

Auditoría fila por fila, contra el código real de cada pantalla (`Objetivo.jsx`,
`SituacionPensional.jsx`, `HistorialLaboral.jsx`, `IndiciosRegimenTransicion.jsx`
leídos íntegros en esta revisión). Ninguna fila asume una pantalla que no
exista hoy.

| ID | Qué pregunta/dato lo detecta | ¿Con el motivo de consulta? | ¿Requiere 2ª comprobación? | Pantalla real de integración | Salida | Clics/pantallas que agrega al camino feliz | Riesgo de falso positivo | Riesgo de dejar pasar el caso |
|---|---|---|---|---|---|---|---|---|
| **B-01** Invalidez | Selección directa: "Una prestación por pérdida de capacidad para trabajar" | **Sí, directo** | No | `Objetivo.jsx` (fieldset nuevo, mismo formulario/submit ya existente) | `DETENER_Y_REMITIR` | 0 pantallas, 0 clics; +1 selección | Bajo | Bajo, mitigable con ejemplos en el texto de ayuda |
| **B-02** Sobrevivientes | Selección directa: "La protección de mi familia si llego a faltar" | **Sí, directo** | No | `Objetivo.jsx` (mismo fieldset) | `DETENER_Y_REMITIR` | 0 pantallas, 0 clics (comparte selección con B-01) | Bajo | Bajo-medio: alguien que piensa en "proteger a su familia" en sentido genérico podría dudar |
| **B-03** Ya pensionado / reliquidación | Selección directa, opción ampliada: "Una pensión que ya recibo, que ya me negaron, o un trámite en curso" | **Sí, directo** | No | `Objetivo.jsx` (mismo fieldset) | `DETENER_Y_REMITIR` | 0 pantallas, 0 clics | Bajo | Medio — alguien ya pensionado que busca "otra estrategia" podría no reconocerse; mitigable con ejemplo explícito |
| **B-04** Régimen especial | Nueva opción en el fieldset ya existente `OPCIONES_REGIMEN` de `SituacionPensional.jsx` (hoy tiene RPM/RAIS/"no estoy seguro" — se agrega una cuarta) | **No** — quien tiene régimen especial normalmente cree que su consulta "es sobre su vejez" | No, se detecta en el mismo lugar donde hoy se pregunta el régimen | `SituacionPensional.jsx` — mismo `<fieldset>`, mismo `<form>`, mismo botón "Continuar" | `DETENER_Y_REMITIR` si se elige | 0 pantallas, 0 clics de navegación; una opción más dentro del mismo grupo de radios ya existente (sin decisión adicional para quien ya iba a elegir RPM o RAIS) | Medio — depende de los ejemplos (fuerzas militares, magisterio, Ecopetrol); alguien podría marcarla por duda | Medio-alto si se usa solo el término técnico sin ejemplos |
| **B-05** Alto riesgo | Nuevo `<fieldset>` en `HistorialLaboral.jsx`, junto a los tres que ya existen (`tipoCotizante`, `lugarCotizacion`, `cotizaActualmente`) | **No** | No, se detecta en la misma pantalla donde ya se captura la forma de cotización | `HistorialLaboral.jsx` — mismo `<form>`, mismo botón "Continuar" | `DETENER_Y_REMITIR` si confirma | 0 pantallas, 0 clics de navegación; +1 selección (radio sí/no) | Bajo-medio con ejemplos concretos (minería subterránea, explosivos) | **Alto si no se pregunta** — el único de los 8 que puede producir una cifra *incorrecta*, no solo ausente |
| **B-10** Traslado discutido | Nuevo `<fieldset>` condicional en `IndiciosRegimenTransicion.jsx`, mismo patrón que sus dos fieldsets condicionales ya existentes (`trasladoRegimen === 'si'`) | **No** | Sí, pero **condicional** — solo aparece para quien ya declaró traslado en `HistoriaPensional.jsx` (pantalla 9) | `IndiciosRegimenTransicion.jsx` (pantalla 11) — único lugar; **no** se duplica en ninguna otra pantalla (corrige la contradicción de v0.3) | `DETENER_Y_REMITIR` si confirma disputa; si no, continúa con la limitación ya declarada (`RPM-005`) | 0 pantallas, 0 clics para quien nunca se trasladó (mayoría); +1 selección solo para quien ya iba a responder esa pantalla por haberse trasladado | Bajo — pregunta específica ("¿está siendo revisada por una demanda, reclamación o proceso formal?") | Medio si no se pregunta — hoy el traslado se captura pero la disputa nunca se indaga |
| **B-12** Identificación de régimen/norma | Ya detectado hoy por la opción "No estoy seguro" de `SituacionPensional.jsx` (`regimenActual = 'desconocido'`) | No aplica — es un problema de dato, no de motivo | **No** — el gap es de mensaje, no de detección | `SituacionPensional.jsx` (corregir el mensaje que se muestra cuando el régimen queda desconocido, en vez del `PERFIL_NO_EVALUABLE` genérico de RAIS) | `ORIENTAR_ANTES_DE_CONTINUAR` (ayuda para identificarlo) → `DETENER_Y_REMITIR` si persiste | 0 pantallas, 0 clics — cambio de contenido, no de flujo | No aplica | Bajo — el dato ya se captura, solo falta el mensaje correcto |
| **B-13** Reconocimiento negado / proceso activo | Cubierto íntegramente por la opción ampliada de `Objetivo.jsx` (ver `B-03`) | **Sí, directo, con la redacción ampliada** | No (a diferencia de la v0.3, ya no requiere una comprobación separada) | `Objetivo.jsx` | `DETENER_Y_REMITIR` | 0 pantallas, 0 clics (comparte selección con B-03) | Bajo | Bajo — la redacción ampliada cubre explícitamente "trámite en curso", el subcaso que antes se perdía |

**Conclusión de esta auditoría:** los 8 bloqueadores se cierran con **cero
pantallas nuevas**. Cuatro se resuelven en `Objetivo.jsx` con una sola
selección (ampliando la redacción de una opción ya propuesta), dos requieren
una opción/campo nuevo en una pantalla que la persona ya visita
(`SituacionPensional.jsx`, `HistorialLaboral.jsx`), uno es una pregunta
condicional en una pantalla existente que la mayoría nunca ve
(`IndiciosRegimenTransicion.jsx`), y uno no requiere pregunta alguna, solo
corregir un mensaje (`SituacionPensional.jsx`, caso `B-12`).

---

## 15. Diseño documental del control de alcance — distribuido en pantallas existentes

Sin código. Estructura inicial para evaluar, no texto final de UI. Ninguna
pantalla nueva.

### 15.1 — `Objetivo.jsx`: motivo de consulta

Se agrega un `<fieldset>` nuevo a la misma pantalla y el mismo `<form>` que
ya tiene la pregunta "¿en qué quieres que te ayudemos hoy?" (mismo patrón que
`HistorialLaboral.jsx`, que ya combina tres fieldsets en un solo formulario).

**Pregunta (estructura inicial):** "¿Qué situación quieres entender?"

**Opciones (estructura inicial, no copy final):**
1. Mi pensión de vejez.
2. Una prestación por pérdida de capacidad para trabajar.
3. La protección de mi familia si llego a faltar.
4. Una pensión que ya recibo, que ya me negaron, o un trámite/reclamación en
   curso sobre mi caso. *(redacción ampliada respecto a v0.3, para cubrir
   `B-13` completo, no solo "me negaron")*
5. No estoy seguro.

**Mapeo a salidas:** opción 1 → continúa (sujeto a las comprobaciones de
§15.2-15.3 más adelante en el recorrido); opciones 2-4 → `DETENER_Y_REMITIR`
directo; opción 5 → `ORIENTAR_ANTES_DE_CONTINUAR` (se muestran las 4
categorías con un ejemplo cotidiano cada una, se pide elegir de nuevo sin la
opción "no estoy seguro" disponible una segunda vez; si persiste,
`DETENER_Y_REMITIR`).

**Regla de reintentos (corrección 2026-09-02 — precisa "nunca un tercer
intento ni un paso silencioso a vejez"):** lo prohibido es que el sistema
reabra la aclaración por su cuenta o que una incertidumbre no resuelta
avance a vejez sin una elección explícita. No está prohibido que la persona,
voluntariamente, pulse "Volver a las opciones" para corregir su respuesta
(misma garantía de §4-bis) — eso nunca invoca `onContinuar`, solo mueve
`pasoObjetivo`.

**Dos ramas de recuperación desde `'detenido'`** (`Objetivo.helpers.js#volverDesdeDetencion`):
1. `NO_SEGURO_PERSISTE` → vuelve a `'aclaracion'`, y `motivoConsulta` pasa a
   `NO_SEGURO` (conserva el "no estoy seguro" original, deja "Continuar"
   deshabilitado hasta elegir de nuevo).
2. Cualquiera de los 4 casos directos → vuelve a `'motivo'`, sin tocar
   `motivoConsulta`.

### 15.2 — `SituacionPensional.jsx`: régimen especial

Se agrega una cuarta entrada al arreglo `OPCIONES_REGIMEN` ya existente —
mismo componente, mismo `<fieldset>`, mismo patrón de `texto`/`ayuda` que las
tres opciones actuales (Colpensiones / fondo privado / no estoy seguro).

**Opción nueva (estructura inicial):** "Mi régimen es distinto —por ejemplo,
fuerzas militares o de policía, magisterio, Ecopetrol, u otro con reglas
propias." → `DETENER_Y_REMITIR`.

No se necesita una pregunta aparte: es una opción más dentro del grupo de
radios que la persona ya debe responder para continuar.

### 15.3 — `HistorialLaboral.jsx`: actividad de alto riesgo

Se agrega un cuarto `<fieldset>` a la misma pantalla que ya tiene tres
(`tipoCotizante`, `lugarCotizacion`, `cotizaActualmente`).

**Pregunta (estructura inicial):** "¿Tu actividad laboral está clasificada
oficialmente como de alto riesgo? —por ejemplo, minería subterránea, manejo
de explosivos, entre otras." Opciones sí/no, con "no estoy seguro" siguiendo
el mismo patrón de aclaración mínima de §4-bis si hace falta.

**Mapeo:** "sí" confirmado → `DETENER_Y_REMITIR`. "No estoy seguro" →
aclaración mínima con más ejemplos → si persiste, `DETENER_Y_REMITIR`
(dado el riesgo de corrupción del cálculo si se deja pasar, ver §14).

### 15.4 — `IndiciosRegimenTransicion.jsx`: traslado discutido (condicional)

Se agrega un tercer `<fieldset>` condicional, con el mismo patrón
`{trasladoRegimen === 'si' && (...)}` que ya usan los otros dos fieldsets de
esta pantalla (dirección del traslado, fecha del traslado). **No aparece
para nadie que no haya declarado un traslado** en `HistoriaPensional.jsx`.

**Pregunta (estructura inicial, solo si `trasladoRegimen === 'si'`):**
"¿Esa decisión está siendo revisada o discutida formalmente —por ejemplo,
una demanda, una reclamación, u otro proceso?" → si confirma,
`DETENER_Y_REMITIR`; si no, continúa con la limitación ya declarada
(`RPM-005`: el traslado se registra pero no afecta la fórmula).

**Por qué no vive en ningún otro lugar:** integrarla aquí, condicionada al
mismo valor que ya gobierna los otros dos campos condicionales de esta
misma pantalla, es el único diseño que no duplica la pregunta base de
traslado (ya hecha en `HistoriaPensional.jsx`) ni le agrega fricción a quien
nunca se trasladó.

### 15.5 — `B-12`: sin pregunta nueva

No hay diseño de intake que agregar — `SituacionPensional.jsx` ya ofrece "No
estoy seguro" para el régimen. El trabajo pendiente es de mensaje, no de UX
de captura: cuando `regimenActual === 'desconocido'` y el recorrido llega a
un punto donde eso importa, mostrar una ayuda específica ("te ayudamos a
identificarlo: revisa tu certificado de semanas cotizadas de Colpensiones o
el estado de cuenta de tu fondo privado") en vez del mensaje genérico de
perfil no evaluado.

### Por qué no se necesita ninguna pantalla nueva

Las cuatro pantallas usadas (`Objetivo.jsx`, `SituacionPensional.jsx`,
`HistorialLaboral.jsx`, `IndiciosRegimenTransicion.jsx`) ya existen, ya
tienen un `<form>` con un único botón "Continuar", y ya usan el patrón de
uno o varios `<fieldset>` de opciones por pantalla —`HistorialLaboral.jsx`
ya combina tres preguntas en una sola pantalla hoy mismo. Agregar un
`<fieldset>` más, o una opción más dentro de uno ya existente, no es
arquitectónicamente distinto de lo que esas pantallas ya hacen. No se
encontró ningún caso, de los 8 bloqueadores, que exigiera una pantalla
dedicada para poder preguntarse con claridad.

---

## 16. Criterios de aceptación del control de alcance

1. **Un caso confirmado fuera del alcance nunca llega al motor ordinario** —
   verificable con un caso de prueba por cada bloqueador de las categorías
   A-D de §11.
2. **"No estoy seguro" no se convierte silenciosamente en RPM o RAIS** —
   ninguna ruta de código trata el silencio o el abandono como "vejez
   confirmada".
3. **El camino feliz de vejez agrega el mínimo de fricción justificable** —
   cero pantallas nuevas (§14-15); cada selección nueva corresponde a un
   bloqueador real de §11, ninguna se agrega "por si acaso".
4. **Puede corregirse la selección y regresar**, en cualquier punto de
   `Objetivo.jsx`, `SituacionPensional.jsx`, `HistorialLaboral.jsx` o
   `IndiciosRegimenTransicion.jsx`, incluso desde la pantalla de
   `DETENER_Y_REMITIR` — mismo patrón "Volver" que ya usan las cuatro.
5. **Foco y lectura accesible** — mismo patrón ya usado en las cuatro
   pantallas (`useRestaurarFocoAlMontar`, opciones sin depender de color).
6. **No se pierden datos ya ingresados** — se cumple por construcción: las
   cuatro integraciones de §15 son campos adicionales dentro de pantallas
   que ya forman parte del recorrido, en el mismo orden ya existente (§13),
   nunca una reestructuración que reordene capturas previas.
7. **Cada detención explica motivo, alcance actual y siguiente paso** — el
   mensaje de `DETENER_Y_REMITIR` nombra la categoría en lenguaje común,
   aclara que PensionLab hoy no cubre ese caso con el rigor necesario, y
   sugiere a quién acudir.
8. **No se presenta la remisión como asesoría jurídica personalizada** — el
   mensaje describe qué PensionLab no puede calcular y a qué tipo de
   entidad/profesional acudir en general, nunca interpreta la norma
   aplicable al caso concreto ni predice el resultado de un trámite (PL-240
   §0).

---

## 17. Secuencia de cierre de V1

Sin convertirse en plan técnico: cuatro bloques de trabajo, en orden, con la
evidencia que permitiría considerar cada uno terminado.

**Bloque 1 — Detección y salida segura de casos excluidos.**
Implementar las cuatro integraciones de §15 (`Objetivo.jsx`,
`SituacionPensional.jsx`, `HistorialLaboral.jsx`, `IndiciosRegimenTransicion.jsx`)
y el mensaje corregido de `B-12`.
*Evidencia de terminado:* un caso de prueba por cada uno de los 8
bloqueadores estructurales (§11, categorías A-D) que confirme que termina en
`DETENER_Y_REMITIR` (o en `ORIENTAR_ANTES_DE_CONTINUAR → DETENER_Y_REMITIR`
para `B-12`) sin que ningún dato llegue al motor ordinario; verificación
explícita de que "No estoy seguro" nunca resuelve en `CONTINUAR_FLUJO_VEJEZ`
por defecto.

**Bloque 2 — Verificación de `A-09` y prueba dedicada de `A-13`.**
Confirmar si la limitación del piso legal para cotización en el exterior se
declara realmente al usuario (`A-09`); si no, agregarla. Escribir el archivo
de test dedicado para la validación de coherencia de datos de
`InformacionPensionalEsencial.jsx` (`A-13`).
*Evidencia de terminado:* `A-09` con una cita de dónde se muestra la
limitación en la UI (no solo en un comentario de código); `A-13` con un
archivo de test citable en `docs/qa/matriz-pruebas-funcionales-mvp.md`.

**Bloque 3 — Pruebas funcionales de borde y revisión con usuarios.**
Recorrido manual de punta a punta de cada uno de los 8 casos de detección,
más los casos límite ya conocidos de RPM/RAIS (matriz de QA), con personas
reales en revisión controlada (§12).
*Evidencia de terminado:* al menos un registro de prueba real por cada
bloqueador de detección, documentando si la persona comprendió el mensaje de
`DETENER_Y_REMITIR` sin necesitar ayuda externa (condición 8 del Criterio de
terminación de V1, §10).

**Bloque 4 — Decisión de congelación de la V1.**
Revisión conjunta de que las nueve condiciones de §10 se cumplen, sin
contradicciones entre código, pruebas y documentación (condición 9), y
decisión explícita de producto de congelar este documento.
*Evidencia de terminado:* registro explícito de esa decisión, con fecha, y
este documento actualizado de "borrador" a un estado vigente/congelado —
ninguno de los dos ocurre dentro de esta sesión ni de este documento.

---

## 18. Resumen cuantitativo

**Por nivel de respuesta (sin cambios):** RESUELVE 8, ORIENTA_CON_LIMITACIONES
8, SE_DETIENE_Y_REMITE (deseado) 14.

**Por horizonte de detección (30 filas):** V1_OBLIGATORIA 24 (16 del Bloque A
+ `B-01,02,03,04,05,10,12,13`), POST_V1_PRIORITARIA 5 (`B-06,07,08,11,14`),
FUERA_DE_ALCANCE_ACTUAL 1 (`B-09`).

**Por horizonte de resolución (30 filas):** V1_OBLIGATORIA 16 (Bloque A
completo, con las salvedades ya anotadas en `A-07/08/09/14/16`),
FUERA_DE_ALCANCE_ACTUAL 14 (Bloque B completo, incluido `B-12` por
convención).

**Cobertura de resolución:** COMPLETA 10, PARCIAL 6, AUSENTE 13, N/A 1
(`B-12`). **Cobertura de detección:** COMPLETA 14, PARCIAL 2 (`A-13`, `B-12`),
AUSENTE 13, N/A 1 (`A-13`, contado una sola vez en PARCIAL — ver matriz para
el detalle por fila).

**Bloqueadores reales de V1: 10**, en 5 categorías activas (§11): A. resueltos
en `Objetivo.jsx` (4), B. pregunta nueva en pantalla existente (2), C.
pregunta condicional en pantalla existente (1), D. solo mensaje (1), E.
verificaciones de cierre (2).

**Costo neto del control de alcance sobre el camino feliz (persona sin
ninguna condición especial), estado final tras la auditoría de
`objetivoSeleccionado` (§20):** **0 pantallas adicionales y 0 clics
adicionales** frente al recorrido de `Objetivo.jsx` anterior a PL-250 (el
que solo preguntaba "¿en qué quieres que te ayudemos hoy?"). Sí existe una
**nueva selección obligatoria con consecuencia real**: el motivo de
consulta — reemplaza, no se suma a, la pregunta original, porque esa
pregunta original resultó ser una `DECISIÓN_APARENTE` (§20) y se retiró.

**Historial de esta cifra, para que quede trazable (no se repite el error de
declarar una métrica sin haberla verificado dos veces):**
1. Diseño original (§15.1): se asumió que la pregunta de motivo de consulta
   podía convivir en la misma pantalla que la pregunta original de objetivo,
   sin costo adicional — nunca verificado visualmente.
2. Primera entrega real (§20): la revisión visual mostró que mostrar ambas a
   la vez (6 + 4 opciones) hacía la pantalla demasiado larga en móvil. Se
   corrigió con un Paso 2 interno (divulgación progresiva), aceptando +1
   clic de progresión — una fricción real, pero todavía sobre una pregunta
   (`objetivoSeleccionado`) cuya utilidad nunca se había auditado.
3. **Auditoría de extremo a extremo (§20, esta versión):** se encontró que
   `objetivoSeleccionado` era una `DECISIÓN_APARENTE` — sus dos opciones
   habilitadas nunca produjeron un recorrido, cálculo, texto u orientación
   distintos. Se eliminó por completo, sin sustituirla por ninguna
   consecuencia artificial. El Paso 2 desaparece con ella, y el clic de
   progresión que costaba también desaparece: `Objetivo.jsx` vuelve a tener
   una sola pregunta con un solo "Continuar".

Para las demás integraciones de §15 (`B-04` en `SituacionPensional.jsx`,
`B-05` en `HistorialLaboral.jsx`, `B-10` condicional en
`IndiciosRegimenTransicion.jsx`), el análisis de §14 sigue vigente sin
cambios — ninguna de ellas se implementó todavía (§20).

---

## 19. Nota metodológica de la auditoría

Auditoría por lectura directa del repositorio en `sprint-3-mvp-headless`
(commit `99cae1a`), sin ejecutar la aplicación ni la suite de tests. Para
esta revisión (v0.4) se leyeron íntegros, además de lo ya citado en v0.1-0.3:
`src/App.jsx` (orden de vistas, vía búsqueda de todas las ocurrencias de
`vista === '...'`), `src/pages/HistoriaPensional.jsx`,
`src/pages/IndiciosRegimenTransicion.jsx`, `src/pages/SituacionPensional.jsx`,
`src/pages/HistorialLaboral.jsx` y `src/pages/Objetivo.jsx` completos —
específicamente para verificar dónde vive cada dato y corregir el error de
navegación de la v0.3. Se verificó también, mediante búsqueda de patrones
sobre el propio archivo de este documento, que existe un solo título, una
sola versión vigente, una sola fila de control de cambios por versión, cada
encabezado principal una sola vez, y las 30 filas de la matriz (`A-01`-`A-16`,
`B-01`-`B-14`) exactamente una vez cada una.

---

## 20. Implementación real — Bloque 1, primera entrega vertical (v0.5)

Primera entrega de código real de PL-250, dentro del diseño de §15.1: motivo
de consulta en `Objetivo.jsx`, cerrando `B-01`, `B-02`, `B-03` y `B-13`.
Régimen especial (`B-04`), alto riesgo (`B-05`), traslado discutido (`B-10`)
y el mensaje propio de `B-12` **no** se tocaron en esta entrega — siguen
pendientes del Bloque 1 (§17).

**Por qué `B-03` y `B-13` son opciones separadas, no una sola:** aunque
ambas terminan en `DETENER_Y_REMITIR`, exigen una remisión distinta. `B-03`
(pensión ya reconocida, quiere reliquidación) se remite a la entidad que ya
le reconoció la pensión, sobre la revisión de un derecho ya otorgado. `B-13`
(negado o trámite/proceso en curso) se remite a hacer seguimiento de un
trámite que todavía no tiene una decisión firme a su favor. Fusionarlas
habría producido un mensaje de remisión incorrecto para una de las dos
situaciones — la separación no es una preferencia de redacción, es un
requisito de que la remisión sea específica, no genérica (PL-250 §16,
criterio 7).

### Auditoría de `objetivoSeleccionado` y su eliminación (misma versión 0.5)

La pregunta original de `Objetivo.jsx` ("¿en qué quieres que te ayudemos
hoy?", campo `objetivoSeleccionado`) se conservó primero como Paso 2, tras
el motivo de consulta, cuando la revisión visual encontró que mostrar las 6
opciones de motivo y las 4 de objetivo a la vez hacía la pantalla demasiado
larga en móvil. Antes de aceptar ese Paso 2 como definitivo, se auditó de
extremo a extremo: se buscaron todas las lecturas de `objetivoSeleccionado`
en `src/` (navegación, cálculo, generación de escenarios, textos,
orientación, resultado final, panel de desarrollo, pruebas).

**Hallazgo:** cero ramificación. Las dos opciones habilitadas
("Descubrir mis opciones pensionales." / "No estoy seguro, quiero que
PensionLab me guíe.") llevaban exactamente a la misma vista
(`DatosIniciales`), el mismo motor, los mismos caminos y los mismos textos
en todo el recorrido posterior — el único lugar donde el valor influía en
algo visible era `ExpedientePensional.jsx`, que solo reimprimía el mismo
texto ya elegido, sin interpretarlo. Clasificación:
**`DECISIÓN_APARENTE`** — la persona elegía, pero la aplicación hacía
exactamente lo mismo en ambos casos.

**Decisión de producto: Alternativa A — eliminar el Paso 2**, en vez de
inventarle una consecuencia artificial (Alternativa B) solo para justificar
la pregunta — coherente con el Principio 9 del proyecto (generalizar/
construir solo con evidencia real) y con PL-250 §16 criterio 3 (ninguna
pregunta se agrega "por si acaso"). `Objetivo.jsx` vuelve a tener una sola
pregunta — el motivo de consulta — con una sola salida "Continuar" por paso.

### Archivos (estado final de esta entrega)

- **`src/pages/Objetivo.helpers.js`** — catálogo de opciones
  (`OPCIONES_MOTIVO_CONSULTA`, `OPCIONES_ACLARACION_MOTIVO_CONSULTA`),
  decisión pura `determinarSalidaMotivoConsulta` (mismo vocabulario de
  salidas que §4-bis), `manejarEnvioMotivoConsulta` (invoca exactamente una
  de tres callbacks — extraída para que fuera testeable con espías sin
  DOM), los mensajes de remisión por caso
  (`MENSAJES_DETENCION_MOTIVO_CONSULTA`) y el aviso de "no es asesoría
  jurídica personalizada". `OPCIONES_OBJETIVO_VEJEZ`,
  `objetivoEstaDisponible` y `manejarEnvioObjetivo` (Paso 2) **se
  eliminaron** junto con la pregunta que servían.
- **`src/pages/Objetivo.helpers.test.js`** — 27 pruebas (ver más abajo); se
  retiraron las 15 que solo probaban el Paso 2 eliminado.
- **`src/pages/Objetivo.jsx`** — una sola pregunta de motivo de consulta,
  dentro del mismo `<form>`, sin objetivo ni Paso 2. Estado local
  `pasoObjetivo` reducido a `'motivo'` | `'aclaracion'` | `'detenido'`.
  Vejez confirmada invoca `onContinuar` (la prop real que avanza a
  `DatosIniciales`) directamente, sin paso intermedio.
- **`src/App.jsx`** — `objetivoSeleccionado`/`setObjetivoSeleccionado`
  eliminados del estado, de `estadoEditableDev`/`settersEstadoEditableDev`
  y de las props pasadas a `Objetivo`/`ExpedientePensional`.
  `motivoConsulta`/`setMotivoConsulta` se mantienen sin cambios.
- **`src/dev/estadoApp.js`** — `objetivoSeleccionado` eliminado de
  `VALORES_POR_DEFECTO` (y por lo tanto de `CLAVES_ESTADO_EDITABLE`).
- **`src/dev/fixtures.js`** — eliminada la línea `objetivoSeleccionado:
  'Descubrir mis opciones pensionales.'` de las 10 fixtures (las 10 usaban
  el mismo valor exacto; quitarla no cambia el significado de ninguna).
- **`src/pages/ExpedientePensional.jsx`** — eliminado el bloque de resumen
  "Objetivo" (`<h2>` + `<p>{objetivoSeleccionado}</p>`) completo, sin dejar
  encabezado huérfano. No se sustituyó por `motivoConsulta`: para toda
  persona que llega a `ExpedientePensional`, el motivo ya es "vejez"
  (cualquier otro motivo se detiene antes, en `Objetivo.jsx`) — mostrarlo
  ahí repetiría la misma frase para todas las personas, sin aportar
  información nueva al resumen.
- **`src/App.css`** — eliminada la clase `.btn-link` (agregada para el
  botón "Cambiar" del Paso 2, ya sin ningún consumidor en `src/`,
  confirmado por búsqueda antes de retirarla).

**Por qué la decisión de alcance nunca queda obsoleta:** `manejarEnvio`
recalcula `determinarSalidaMotivoConsulta(motivoConsulta)` en cada envío,
nunca guarda el resultado como una bandera aparte — corregir la selección a
`vejez` y reenviar recalcula limpio, sin rastro del caso anterior (mismo
criterio que `tienePrimeraLecturaValor` ya aplica en `App.jsx`). "Volver"
nunca limpia `motivoConsulta`.

### Pruebas (`Objetivo.helpers.test.js`, 27 casos)

Sobre la capa de decisión pura (sin DOM — el proyecto no tiene
infraestructura de test de componentes):

- **Decisión (`determinarSalidaMotivoConsulta`, 11 casos):** motivo
  obligatorio, vejez → `CONTINUAR_FLUJO_VEJEZ`, cada uno de
  `B-01`/`B-02`/`B-03`/`B-13` → `DETENER_Y_REMITIR` con su caso exacto, que
  `B-03` y `B-13` nunca comparten valor ni caso, "no estoy seguro" →
  `ORIENTAR_ANTES_DE_CONTINUAR`, "sigo sin saber" → `DETENER_Y_REMITIR`
  general, determinismo de la decisión.
- **Catálogo (6 casos):** integridad de las opciones de motivo y de
  aclaración, que ningún mensaje sea genérico ni use vocabulario de
  asesoría jurídica personalizada.
- **Integración con espías (`manejarEnvioMotivoConsulta`, 10 casos):**
  vejez es la única entrada, de 8 posibles, que invoca `onContinuar`
  (exactamente una vez); cada uno de los 4 casos directos y la remisión
  general **nunca** invocan `onContinuar` (solo `onDetener`); "no estoy
  seguro" tampoco (solo `onOrientar`); valores inválidos no invocan
  ninguna callback.

**Nota de alcance de las pruebas:** igual que el resto del proyecto (sin
`jsdom`/`@testing-library/react`), verifican la **decisión y el cableado de
callbacks**, no el **renderizado** (radio marcado, foco visible, longitud
real en móvil). Esos comportamientos requieren la revisión visual pedida
para esta misma entrega.

### Qué sigue pendiente del Bloque 1

`B-04` (régimen especial, `SituacionPensional.jsx`), `B-05` (alto riesgo,
`HistorialLaboral.jsx`), `B-10` (traslado discutido, condicional en
`IndiciosRegimenTransicion.jsx`) y el mensaje propio de `B-12`
(`SituacionPensional.jsx`) — diseñados en §15.2-15.5, sin ningún código
todavía. El Bloque 1 (§17) no se considera terminado hasta que los 8
bloqueadores estructurales de detección (§11) tengan la misma cobertura que
`B-01`/`B-02`/`B-03`/`B-13` alcanzan en esta entrega.
