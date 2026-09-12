# Matriz Funcional PensionLab — V1

Documento vivo de pruebas funcionales, inspirado en la disciplina de matrices de
pruebas de SAP. No es una auditoría puntual: se actualiza en cada Slice/entrega
que agregue, modifique o retire una capacidad real del producto.

**Filosofía que esta matriz protege:** PensionLab suma capacidades
progresivamente. Una capacidad existente solo se elimina si su valor queda
cubierto de forma igual o mejor por otra — nunca se conserva una pantalla por
nostalgia, se conserva la **capacidad**. Cuando una fila de esta matriz pasa de
`✅ VALIDADO` a `⏳ PENDIENTE` sin que exista una fila de reemplazo que la
cubra, es una alarma de regresión, no un detalle cosmético.

**Método de verificación de esta V1:** cada fila marcada `✅ VALIDADO` fue
contrastada contra un test automático real (nombre de archivo + `describe`
citado) o, cuando no existe automatización, se marca explícitamente como
`manual pendiente` en la columna correspondiente — nunca se asume que algo
funciona porque "se ve bien" o porque otra sesión lo mencionó.

---

## Leyenda

**Estados:**
- `✅ VALIDADO` — comportamiento confirmado por test automático real y/o
  verificación manual explícita ya realizada.
- `🟡 PARCIAL / LIMITADO` — funciona, pero con una limitación conocida y
  documentada (no es un bug oculto).
- `⏳ PENDIENTE` — capacidad existente sin verificación automática ni manual
  registrada todavía, o explícitamente diferida.
- `🚫 NO DEBE OCURRIR` — invariante que PensionLab nunca debe violar; la fila
  describe el comportamiento prohibido y la evidencia de que hoy no ocurre.
- `⚫ RETIRADA` — la pantalla o capacidad que la fila describía se eliminó
  porque su valor quedó cubierto de forma igual o mejor por otra fila (nunca
  por nostalgia) — ver la fila de reemplazo citada en Observaciones.

**Entrega:**
- `MVP Oscar` — ya integrado en la rama de revisión (`sprint-3-mvp-headless`).
- `Post-MVP` — decidido y diferido conscientemente, con registro de la
  decisión.
- `Futuro` — idea registrada en `docs/producto/oportunidades-futuras.md`, sin
  compromiso de calendario.

**IDs:** `RPM-0xx` (capacidades RPM), `RPM-NEG-0xx` (invariantes RPM),
`RAIS-0xx`, `EXP-0xx` (expediente/experiencia transversal), `IA-0xx`.

---

## RPM

| ID | Área | Escenario | Precondiciones/datos clave | Acción | Resultado esperado | Capacidad demostrada | Estado | Automatización | Tests automáticos relacionados | Validación manual | Entrega | Observaciones/limitaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RPM-001 | Captura esencial | Persona declara semanas y año de inicio de cotización | `InformacionPensionalEsencial.jsx` alcanzado tras el expediente | Completar el formulario | Datos quedan en expediente, alimentan PrimeraLectura y GO-B | Captura de información pensional esencial | ✅ VALIDADO | Automatizado (dominio) | `src/domain/evidenciaSemanasMinimas.test.js` (`evaluarSemanasMinimas — casos evaluables`), `src/domain/evidenciaEdadPension.test.js` | — | MVP Oscar | — |
| RPM-002 | Semanas | `nivelConocimientoSemanas = 'conocido'` | Semanas capturadas como cifra exacta | Continuar hacia BaseCotizacion/ProyectaTuPensionRPM | Cifra se usa tal cual, sin prefijo "aproximadamente" | Semanas conocidas | ✅ VALIDADO | Automatizado | `evidenciaSemanasMinimas.test.js`; `ProyectaTuPensionRPM.helpers.test.js` (`construirSemanasReferenciaDeclaradas — contrato GO-B`, caso `conocido`) | — | MVP Oscar | — |
| RPM-003 | Semanas | `nivelConocimientoSemanas = 'aproximado'` | Idem | Idem | Cifra se usa con prefijo "aproximadamente" en la limitación/copy | Semanas aproximadas | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (`contrato GO-B`, CASO A/B); `ProyectaTuPensionRPM.helpers.test.js` (`construirSemanasReferenciaDeclaradas`, caso `aproximado`; `textoFuenteSemanas`, prefijo) | — | MVP Oscar | — |
| RPM-004 | Semanas | `nivelConocimientoSemanas = 'desconocido'` o ausente | Idem | Idem | `semanasReferenciaDeclaradas = null`; proyección cae a historia estructurada, nunca "0 semanas" | Semanas desconocidas tratadas como ausencia de dato, no como hecho | ✅ VALIDADO | Automatizado | `ProyectaTuPensionRPM.helpers.test.js` (`construirSemanasReferenciaDeclaradas`, caso `desconocido → null, nunca "0 semanas"`); `calcularProyeccionRPM.test.js` (CASO D) | — | MVP Oscar | — |
| RPM-005 | Traslado de régimen | `trasladoRegimen = 'si'` | Fecha/certeza de traslado capturadas en IndiciosRegimenTransicion/HistoriaPensional | Continuar | Se captura y se advierte, pero **sin efecto en la fórmula RPM** | Traslado de régimen (captura + advertencia) | 🟡 PARCIAL/LIMITADO | Automatizado (captura) | `src/domain/evidenciaIndiciosTransicion.test.js` | Advertencia visible: manual pendiente (sin `App.test.jsx`) | MVP Oscar | Limitación explícita y documentada: `trazabilidad-formula-RPM.md`, bloqueo §8.9 — el motor no distingue `trasladoRegimen` (verificado: `generarCaminosRPM.js` no lo filtra). No es un bug, es un vacío normativo declarado. |
| RPM-006 | Indicios de transición | Régimen de transición potencialmente aplicable | Completar IndiciosRegimenTransicion | Indicios capturados, sin inferir elegibilidad no verificada | Indicios de régimen de transición | ✅ VALIDADO | Automatizado | `evidenciaIndiciosTransicion.test.js` (`casos evaluables` / `no evaluable`) | — | MVP Oscar | — |
| RPM-007 | Base de cotización | Base declarada como conocida/aproximada | `BaseCotizacion.jsx` | Declarar valor | `ibcAplicableSimulacion` resuelto con el valor declarado | Base de cotización conocida/aproximada | ✅ VALIDADO | Automatizado | `src/domain/determinarBaseCotizacion.test.js` (`valor declarado (conocido/aproximado)`) | — | MVP Oscar | — |
| RPM-008 | Base de cotización | Base desconocida, con ayuda de salario (empleado) | Datos de salario disponibles | Usar la ruta de ayuda | Base estimada a partir del salario | Base de cotización aproximada vía ayuda | ✅ VALIDADO | Automatizado | `determinarBaseCotizacion.test.js` (`desconocido, empleado con ayuda de salario`) | — | MVP Oscar | — |
| RPM-009 | Base de cotización | Base desconocida sin ruta de ayuda, o sin respuesta todavía | — | Continuar | `ibcAplicableSimulacion = null`; proyección no se calcula sin bloquear con error | Base no disponible/no válida tratada honestamente | ✅ VALIDADO | Automatizado | `determinarBaseCotizacion.test.js` (`desconocido, sin ruta de ayuda disponible`; `sin respuesta todavía`) | — | MVP Oscar | — |
| RPM-010 | Proyección preliminar | `historiaCotizacion = []`, con o sin semanas declaradas, **horizonte ≥3.650 días** | Llegar a ProyectaTuPensionRPM directo desde BaseCotizacion (UX-RPM-01) | Proyección se calcula igual, con limitación visible si aplica | Proyección preliminar sin historia detallada | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`UX-RPM-01: historia vacía + horizonte largo...`); `calcularProyeccionRPM.test.js` (`contrato GO-B`, CASO A/D) | — | MVP Oscar | Acotado explícitamente a horizonte ≥3.650 días — el caso contrario (horizonte corto) tiene su propio escenario, `RPM-032`, a raíz de un hallazgo real de prueba manual (2026-08-27). |
| RPM-011 | GO-B | `semanasReferenciaDeclaradas` válida | Proyectar | Semanas declaradas alimentan `semanasCotizadas.total` → elegibilidad + tasa de reemplazo | Semanas declaradas alimentan elegibilidad/tasa | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (CASO A "continuación": "la misma cifra que alimenta elegibilidad también mueve la tasa de reemplazo"); `generarCaminosRPM.test.js` (`contrato GO-B: semanas declaradas propagadas hasta la elegibilidad y la tasa`) | — | MVP Oscar | GO-B nunca interviene en el gate, anterior e independiente, de suficiencia de la ventana del IBL — confirmado explícitamente en `RPM-032` ("B con semanas declaradas, GO-B"): una declaración válida no rescata un horizonte corto sin historia. |
| RPM-012 | GO-B | Historia parcial real **y** declaración válida presentes a la vez | Proyectar | `total ≠ declaradas + observadas + futuras`; nunca se suman ambas fuentes | No doble conteo semanas declaradas/observadas | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (CASO C: "historia parcial + declaración: NO hay doble conteo"); `generarCaminosRPM.test.js` (CASO C equivalente) | — | MVP Oscar | — |
| RPM-013 | Objetivo no alcanzado | Objetivo por encima del camino base | Proyectar | Camino base se muestra como no-cumple, con delta visible | Camino base (objetivo no alcanzado) | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`objetivo alcanzable mediante otro IBC futuro`, escenario `base`) | — | MVP Oscar | — |
| RPM-014 | Objetivo no alcanzado | Objetivo alcanzable subiendo IBC futuro dentro del tope | Proyectar | Camino alternativo por bisección determinista alcanza el objetivo | Camino alternativo (bisección) | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`objetivo alcanzable mediante otro IBC futuro`); `monotonicidadProyeccionRPM.test.js` (fundamento de la bisección) | — | MVP Oscar | — |
| RPM-015 | Objetivo no alcanzado | Camino con delta frente al objetivo | Comparar caminos | `diferenciaFrenteABase.delta` se muestra en pesos, "más"/"menos", nunca con signo ni lenguaje de rentabilidad | Diferencia frente al objetivo | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`diferenciaFrenteABase`); `ProyectaTuPensionRPM.helpers.test.js` (`textoDiferenciaFrenteABase`, "nunca usa rentabilidad/retorno/ROI") | — | MVP Oscar | — |
| RPM-016 | Objetivo ya alcanzado | `distanciaObjetivo.cumple = true` en el camino base | Proyectar | Código `HOY_YA_ALCANZA_OBJETIVO`; mensaje honesto, sin CTA vacío | Estado "objetivo ya alcanzado" reconocido | ✅ VALIDADO | Automatizado | `determinarOrientacionExploracion.test.js` (`HOY_YA_ALCANZA_OBJETIVO...`) | — | MVP Oscar | Corregido en `8bdaf75` — antes de ese commit el estado existía pero sin acción ofrecida (ver RPM-017). |
| RPM-017 | Objetivo ya alcanzado | Idem RPM-016 | Ver "Qué podrías explorar ahora" | Se ofrece `EXPLORAR_ESFUERZO_PERSONALIZADO` (reutiliza el control existente, sin botón duplicado) | Exploración de esfuerzo personalizado incluso ya cumplido el objetivo | ✅ VALIDADO | Automatizado | `determinarOrientacionExploracion.test.js` (mismo test que RPM-016, verifica `acciones`) | Manual pendiente: confirmar visualmente que el botón bajo el mensaje es el mismo control (sin `App.test.jsx`) | MVP Oscar | — |
| RPM-018 | Objetivo legalmente inalcanzable | Objetivo por encima del tope legal (25 SMLV) incluso al máximo | Proyectar | Código `OBJETIVO_LEGALMENTE_INALCANZABLE`; ningún camino "casi cumple" se presenta como viable | Objetivo legalmente inalcanzable reconocido | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`objetivo no alcanzable ni en el tope`; `IBC actual ya en el tope legal`); `determinarOrientacionExploracion.test.js` (`OBJETIVO_LEGALMENTE_INALCANZABLE`) | — | MVP Oscar | — |
| RPM-019 | Restricción de costo | `restriccionCostoPensionalAdicionalMaximoMensual` declarada | Proyectar | Restricción limita el IBC explorable; si es la causa real, código `RESTRICCION_COSTO_LIMITA_RESULTADO`/`RESTRICCION_COSTO_IMPIDE_OBJETIVO`, nunca confundida con inalcanzable legal | Restricción de costo declarada por el usuario | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`restricción de costo pensional adicional`); `determinarOrientacionExploracion.test.js` (`RESTRICCION_COSTO_IMPIDE_OBJETIVO`, con y sin la limitación explícita) | — | MVP Oscar | — |
| RPM-020 | Esfuerzo personalizado | `esfuerzoAdicionalMensualDeseado` declarado | Explorar otro esfuerzo mensual | Evaluación única (sin búsqueda), costo real puede ser menor al pedido si el tope recorta el IBC | Esfuerzo personalizado (aditivo) | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`camino personalizado (esfuerzoAdicionalMensualDeseado)`); `ProyectaTuPensionRPM.helpers.test.js` (`validarEsfuerzoAdicionalMensualDeseado`) | — | MVP Oscar | Solo permite explorar **más** esfuerzo, nunca menos (ver RPM-NEG-004 e IBC menor en Roadmap). |
| RPM-021 | Horizonte temporal | Proyección calculada | Ver bloque "Horizonte de esta proyección" | Fechas + duración calendario + edad, en el orden acordado | Horizonte temporal explícito | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`horizonte (§14 punto 9)`); `ProyectaTuPensionRPM.helpers.test.js` (`textoHorizonte`) | — | MVP Oscar | — |
| RPM-022 | Gráfica/barrido | Objetivo alcanzable o no | Ver `GraficoEsfuerzoResultado` | Rango depende de si el objetivo es alcanzable (`×1.25` acotado por tope, o tope directo); eje Y no se estira con un objetivo inalcanzable | Barrido de caminos intermedios + gráfico esfuerzo↔resultado | 🟡 PARCIAL/LIMITADO | Automatizado (lógica pura) | `generarCaminosRPM.test.js` (`barrido esfuerzo↔resultado`); `GraficoEsfuerzoResultado.helpers.test.js` (`calcularDominioEje`, `calcularDominioYConObjetivo`, `construirPuntosSvg`) | Render SVG real: manual pendiente (sin infraestructura de test de DOM, decisión documentada) | MVP Oscar | Lógica de escalado/dominio validada al 100%; solo el render SVG final queda sin cobertura automática. Proyecto sin `jsdom`/RTL — decisión explícita, ver `oportunidades-futuras.md` ("Formateo monetario en vivo"). |
| RPM-023 | Orientación determinista | Cualquiera de los 7 estados de `determinarOrientacionExploracion` | Ver "Qué podrías explorar ahora" | Mapeo código→acción→copy, sin vocabulario evaluativo prohibido | Orientación determinista de exploración | ✅ VALIDADO | Automatizado | `determinarOrientacionExploracion.test.js` (los 7 estados + precedencia); `ProyectaTuPensionRPM.helpers.test.js` (`textoOrientacion`, vocabulario prohibido) | — | MVP Oscar | — |
| RPM-024 | Explicación IA | Camino(s) viable(s) presentes | Pedir "Entender este camino"/"Comparando tus caminos" | Explicación generada solo sobre escenarios viables, nunca inventa cifras | Explicación IA de caminos RPM | 🟡 PARCIAL/LIMITADO | Automatizado | Ver sección IA (`IA-001`…`IA-005`) | No aplica — fuera del alcance que Oscar debe probar en esta publicación | Post-MVP (funcional y probada; alcance de exposición al usuario sujeto a decisión futura de producto) | Lógica y contrato validados al 100% (S4-007, integrada en `db1bac7`). Ver nota de alcance en la introducción de la sección IA (2026-08-27): existe y está probada, pero queda fuera del alcance de esta publicación del MVP — no una capacidad que Oscar deba encontrar o probar. |
| RPM-025 | Profundización opcional | `historiaCotizacion = []` en ProyectaTuPensionRPM | Clic "Agregar períodos de mi historia de cotización" → agregar períodos → Continuar → "Proyectar hacia el futuro" | Vuelve a ProyectaTuPensionRPM con `historiaCotizacion` actualizada, recalculado automáticamente | Profundización opcional (Historia + lectura histórica) sin afectar el camino rápido | 🟡 PARCIAL/LIMITADO | Manual únicamente | Sub-piezas automatizadas: `HistoriaCotizacionRPM.helpers.test.js`, `evidenciaIndicioVidaLaboral.test.js`; precondición de reachability del CTA validada en `generarCaminosRPM.test.js` (ver `RPM-032`); navegación/render JSX completos no tienen test propio | **Manual pendiente** — recorrido completo Caso B nunca ejercitado con automatización de navegador en esta sesión (sin herramienta disponible) | MVP Oscar | Implementado en `aa0e2c6`. **Corrección 2026-08-27:** una prueba manual real encontró que el CTA dependía exclusivamente de `resultado.escenarios.length > 0`, quedando inalcanzable exactamente cuando la ausencia de historia impedía calcular cualquier escenario — corregido (ver `RPM-032`). Riesgo menor conocido, sin cambios: estado transitorio de UI (ej. borrador de esfuerzo personalizado) se pierde al ir y volver — no es un dato declarado. **Etiqueta del CTA actualizada 2026-09-02** (feedback de usuaria real): "Completar mi historia de cotización" → "Agregar períodos de mi historia de cotización", verificado en sus dos apariciones en `ProyectaTuPensionRPM.jsx`. |
| RPM-026 | Historia parcial | Algunos períodos reales cargados, historia incompleta | Ver ExploraTuProyeccionRPM | Lectura calcula si alcanza la ventana de 3.650 días; si no, código estructurado, no error | Historia parcial manejada honestamente | ✅ VALIDADO | Automatizado | `calcularPensionRPM.test.js` (`Caso 5: no evaluable`; `Caso 7: suficiencia temporal vs. cobertura IPC`) | — | MVP Oscar | — |
| RPM-027 | Historia suficiente | Historia cubre ≥3.650 días efectivos | Ver ExploraTuProyeccionRPM | IBL/tasa/resultado económico actual calculados, con comparación de vida laboral si aplica | Lectura histórica calculada (`calcularPensionRPM.js`) | ✅ VALIDADO | Automatizado | `calcularPensionRPM.test.js` (`Caso 1`, `Caso 6`, `Caso 6b`) | — | MVP Oscar | — |
| RPM-028 | Estados no_evaluable | Datos insuficientes (edad, fecha nacimiento, IBC futuro, historia, etc.) | Proyectar con datos incompletos | Código estructurado de `razonNoEvaluable`, nunca una excepción sin capturar | Estados `no_evaluable` cubiertos | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (`no evaluable`); `calcularPensionRPM.test.js` (`Caso 5`) | — | MVP Oscar | — |
| RPM-029 | Navegación/Volver | Camino rápido y camino de profundización | "Volver" desde cada pantalla RPM | Rápido: Volver → `baseCotizacion`. Profundización: Volver desde HistoriaCotizacionRPM → `proyectaTuPensionRPM`, nunca `queDeterminaResultado` | Navegación coherente en ambos recorridos | 🟡 PARCIAL/LIMITADO | Manual + parcial automatizado | `navegacionRPM.test.js` (decisión pura `siguienteVistaTrasBaseCotizacion`) | **Manual pendiente** — el cableado de `onVolver` en `App.jsx` no tiene test de integración (no existe `App.test.jsx`); verificado solo por lectura directa del código en esta sesión | MVP Oscar | — |
| RPM-030 | Resultado con/sin historia | Mismo perfil, con y sin `historiaCotizacion` | Comparar proyección | Sin historia: IBL depende solo del escenario futuro sintético. Con historia: IBL más preciso, puede habilitar vida laboral | Diferencia de evidencia entre resultado preliminar y resultado con historia | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (comparación dentro de CASO A "continuación"; `horizonte ≥10 años: convergencia al escenario futuro` vs. `horizonte corto: mezcla real`) | — | MVP Oscar | — |
| RPM-031 | IBL alternativo protegido | Declaración cruza el umbral de semanas, pero `historiaCotizacion` no lo sustenta | Proyectar | `razonVidaLaboralNoEvaluada = 'VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA'`; el alternativo de vida laboral **no** se fabrica | IBL alternativo protegido por semanas sustentadas por historia | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (`contrato GO-B: el gate del IBL alternativo SOLO usa semanas sustentadas por historia`, casos A/B) | — | MVP Oscar | Mismo comportamiento verificado como invariante — ver `RPM-NEG-004`. |
| RPM-032 | Proyección preliminar — caso límite | `historiaCotizacion = []`, horizonte **corto** (<3.650 días efectivos), con o sin `semanasReferenciaDeclaradas` válida | Proyectar desde el camino rápido (BaseCotizacion → ProyectaTuPensionRPM) | `orientacion.codigo = 'HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA'` (nunca el genérico `SIN_CAMINOS_VIABLES`), con días efectivos/requeridos exactos y el CTA "Agregar períodos de mi historia de cotización" ofrecido aunque `escenarios.length === 0`; al completar historia suficiente, recalcula y produce un camino viable | Razón específica propagada + profundización ofrecida incluso sin escenarios | 🟡 PARCIAL/LIMITADO | Automatizado (dominio) | `generarCaminosRPM.test.js` (describe `HISTORIA_INSUFICIENTE_PARA_VENTANA_IBL_EFECTIVA propagada hasta la orientación`, casos B/B-GO-B/D/E; actualiza también el test preexistente `camino base no evaluable...`) | **Manual pendiente** — la aparición real del CTA en el JSX (`ProyectaTuPensionRPM.jsx`) no tiene test de componente (sin `jsdom`/RTL); recomendado como primera repetición de la prueba manual que originó este hallazgo | MVP Oscar | Hallazgo de prueba manual real (caso RPM/Colpensiones, 2026-08-27): antes de esta corrección, este caso mostraba un mensaje genérico sin ninguna acción, y el CTA de profundización dependía exclusivamente de `escenarios.length > 0` — corregido en la capa de resultado/orientación de `generarCaminosRPM.js` y en `ProyectaTuPensionRPM.jsx`, sin tocar `calcularProyeccionRPM.js`, `seleccionarPeriodosIBL.js` ni ninguna fórmula. Esta corrección resultó necesaria pero **no suficiente** — ver `RPM-033`, el segundo hueco que solo apareció al completar el recorrido real de punta a punta. |
| RPM-033 | Profundización opcional — retomar la proyección original | Usuario completó `RPM-032` (agregó historia real suficiente) y viene de "Agregar períodos de mi historia de cotización" (origen = ProyectaTuPensionRPM) | Continuar desde HistoriaCotizacionRPM → ExploraTuProyeccionRPM → volver | El usuario recupera su pregunta original (misma edad/objetivo/IBC/semanas/restricción) y `generarCaminosRPM` se re-ejecuta con la historia ya actualizada — nunca queda atrapado en la lectura histórica independiente ni pierde el contexto | Preservación de intención/origen al completar información solicitada | 🟡 PARCIAL/LIMITADO | Automatizado (dominio) | `generarCaminosRPM.test.js` (describe `regresión: retomar la proyección original tras completar historia suficiente (caso real, 2026-08-27)` — 3 casos: bloqueado sin historia, desbloqueado con 181 días reales del caso reportado, conteo actualizado dinámicamente con historia aún insuficiente) | **Manual pendiente** — el recorrido de navegación completo (App.jsx/ExploraTuProyeccionRPM.jsx: nuevo estado `regresarAProyeccionTrasHistoria` + botón "Volver a tu proyección") no tiene test de componente (sin `jsdom`/RTL); es la repetición exacta de la prueba manual que originó este hallazgo | MVP Oscar | Hallazgo de segunda vuelta de prueba manual (caso real RPM/Colpensiones, 2026-08-27): el usuario agregó exactamente la historia que `RPM-032` pedía, pero la navegación lo enviaba siempre a "Lectura económica RPM con tu historia hasta hoy" (`ExploraTuProyeccionRPM.jsx`/`calcularPensionRPM.js` — capacidad independiente, con su propio umbral de 3.650 días de historia real *sola*, sin tramo futuro), cuyo propio botón de avance dependía de que ESA lectura calculara — acoplamiento incorrecto entre dos preguntas distintas. Corregido preservando el origen (`App.jsx`) y desacoplando el botón de avance de `ExploraTuProyeccionRPM` de su propio resultado cuando el origen es la profundización — sin eliminar ni alterar esa capacidad independiente, que sigue funcionando igual cuando se llega a ella por su recorrido normal. |

---

## RPM — Casos negativos / invariantes

Estas filas describen comportamientos que PensionLab **nunca** debe mostrar.
Estado `🚫 NO DEBE OCURRIR` significa: "verificado que hoy no ocurre" — no que
sea deseable, sino que es la línea roja protegida por test.

| ID | Área | Escenario prohibido | Precondiciones/datos clave | Acción | Resultado esperado (invariante) | Capacidad demostrada | Estado | Automatización | Tests automáticos relacionados | Validación manual | Entrega | Observaciones/limitaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RPM-NEG-001 | GO-B | Sumar semanas declaradas + semanas observadas del mismo pasado | Declaración válida + historia parcial real simultáneas | Proyectar | `total ≠ declaradas + observadas + futuras` | Nunca doble conteo del mismo pasado | 🚫 NO DEBE OCURRIR | Automatizado | `calcularProyeccionRPM.test.js` (CASO C, assert `not.toBe(sumaProhibida)`) | — | MVP Oscar | — |
| RPM-NEG-002 | GO-B | Presentar historia ausente como "0 semanas conocidas" cuando sí existen semanas declaradas | `nivelConocimientoSemanas` desconocido/ausente | Construir `semanasReferenciaDeclaradas` | Resultado es `null` (ausencia de dato), nunca `{cantidad: 0, ...}` | Ausencia de historia ≠ cero semanas conocidas | 🚫 NO DEBE OCURRIR | Automatizado | `ProyectaTuPensionRPM.helpers.test.js` (`construirSemanasReferenciaDeclaradas`, `desconocido → null, nunca "0 semanas"`) | — | MVP Oscar | — |
| RPM-NEG-003 | GO-B | Semanas declaradas fabrican IBC o períodos históricos inexistentes | Declaración válida, `historiaCotizacion = []` | Proyectar | `historiaCotizacion` nunca se modifica por la declaración; IBL ordinario depende solo de historia real + futuro sintético | Semanas declaradas nunca fabrican historia/IBC | 🚫 NO DEBE OCURRIR | Automatizado | `calcularProyeccionRPM.js` (revisado: `semanasReferenciaDeclaradas` nunca toca `historiaCotizacion`/`seleccionarPeriodosIBL`); `calcularProyeccionRPM.test.js` (CASO A: `ibl.aplicable` no cambia entre con/sin declaración) | — | MVP Oscar | — |
| RPM-NEG-004 | GO-B | Semanas declaradas, por sí solas, habilitan el IBL alternativo de vida laboral | Declaración cruza el umbral, historia insuficiente/vacía | Proyectar | `VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA`, `ibl.vidaLaboral = null` | Nunca fabricar el IBL alternativo solo con declaración | 🚫 NO DEBE OCURRIR | Automatizado | `calcularProyeccionRPM.test.js` (`gate del IBL alternativo SOLO usa semanas sustentadas por historia`, casos A/B) | — | MVP Oscar | — |
| RPM-NEG-005 | Elegibilidad | Mostrar un camino legalmente imposible como viable | Objetivo por encima del tope de 25 SMLV incluso al máximo | Proyectar | Camino descartado (`YA_EN_TOPE_LEGAL`/`OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE`), nunca presentado como "viable" | Nunca un camino legalmente imposible como viable | 🚫 NO DEBE OCURRIR | Automatizado | `generarCaminosRPM.test.js` (`IBC actual ya en el tope legal`; `objetivo no alcanzable ni en el tope`) | — | MVP Oscar | — |
| RPM-NEG-006 | IA | Trasladar cálculos pensionales a la IA | Cualquier escenario | Pedir explicación IA | El adaptador de IA recibe hechos ya calculados; ninguna cifra pensional se calcula ni se altera en la capa de IA | Nunca trasladar cálculos pensionales a la IA | 🚫 NO DEBE OCURRIR | Automatizado | `src/ia/validarConsistenciaExplicacion.test.js` (`ninguna cifra inventada o alterada llega al usuario como hecho`); `src/ia/explicarCaminos.test.js` (`sin escenarios viables, el adaptador nunca se invoca`) | — | MVP Oscar | — |
| RPM-NEG-007 | RAIS | Cambios exclusivos de RPM alteran RAIS | Cualquier commit de alcance RPM (GO-B, UX-RPM-01/02A, HOY_YA_ALCANZA_OBJETIVO, profundización opcional) | Revisar diff de cada commit | Ningún archivo de `generarCaminosRAIS.js`, `calcularProyeccionRAIS.js`, `ExploraTuProyeccion.jsx` aparece modificado | Nunca alterar RAIS por cambios exclusivos de RPM | 🚫 NO DEBE OCURRIR | **Sin automatización** | — | Verificado manualmente por `git diff` en cada commit de esta sesión (`6094406`, `6a435ef`, `8bdaf75`, `aa0e2c6`) — **no existe una prueba automática que lo proteja hacia adelante** | MVP Oscar | **Hueco de cobertura detectado** — ver reporte final. Recomendación: test de regresión que verifique que `generarCaminosRAIS`/`calcularProyeccionRAIS` producen el mismo resultado ante un fixture fijo, ejecutado en cada suite. |

---

## RAIS

Recorridos y capacidades realmente alcanzables hoy (ninguna tocada por los
commits RPM de esta sesión).

| ID | Área | Escenario | Precondiciones/datos clave | Acción | Resultado esperado | Capacidad demostrada | Estado | Automatización | Tests automáticos relacionados | Validación manual | Entrega | Observaciones/limitaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RAIS-001 | Captura | `regimenActual = 'RAIS'` | Recorrido completo desde Bienvenida | Completar `ExploraTuProyeccion.jsx` | Datos capturados (saldo, certeza, restricción, objetivo) | Captura RAIS | 🟡 PARCIAL/LIMITADO | Automatizado (dominio) | `calcularProyeccionRAIS.test.js` | Recorrido de captura en la pantalla misma: manual pendiente, sin cita de cierre de Slice verificada en esta pasada | MVP Oscar | Lógica de dominio que consume la captura, validada; la pantalla de captura en sí (`ExploraTuProyeccion.jsx`) no tiene test propio ni verificación manual registrada en esta auditoría. |
| RAIS-002 | Proyección | Perfil dentro de alcance (`tipoCotizante = 'independiente'`, `lugarCotizacion = 'colombia'`, `trasladoRegimen = 'no'`) | Proyectar | Camino base calculado bajo Convención Económica v1 (pesos de hoy) | Proyección RAIS camino base | ✅ VALIDADO | Automatizado | `calcularProyeccionRAIS.test.js` (`caso calculado`; `capitalInicial`) | — | MVP Oscar | — |
| RAIS-003 | Objetivo alcanzado | Objetivo ya cumplido con continuidad del saldo | Proyectar | Solo camino base, sin alternativo inventado | Objetivo ya cumplido reconocido (RAIS) | ✅ VALIDADO | Automatizado | `generarCaminosRAIS.test.js` (`objetivo ya cumplido con el camino base`) | — | MVP Oscar | — |
| RAIS-004 | Camino alternativo | Objetivo no cumplido, alternativo viable o descartado por tope | Proyectar | Bisección o descarte explícito por tope de 25 SMLV | Camino alternativo / tope legal RAIS | ✅ VALIDADO | Automatizado | `generarCaminosRAIS.test.js` (`objetivo no cumplido, alternativo viable`; `alternativo descartado por tope legal`) | — | MVP Oscar | — |
| RAIS-005 | Restricción de costo | Restricción declarada por el usuario | Proyectar | Semántica de esfuerzo (IBC vs. costo pensional real) correcta bajo restricción | Restricción de costo RAIS | ✅ VALIDADO | Automatizado | `generarCaminosRAIS.test.js` (`restricción económica declarada por el usuario`; `semántica de esfuerzo`) | — | MVP Oscar | — |
| RAIS-006 | Limitaciones | Saldo tratado como actual, u otras limitaciones | Proyectar | Limitaciones explícitas y estructuradas, sin ocultar supuestos | Limitaciones RAIS conocidas | ✅ VALIDADO | Automatizado | `generarCaminosRAIS.test.js` (`SALDO_TRATADO_COMO_ACTUAL`); `calcularProyeccionRAIS.test.js` (`limitación crítica`) | — | MVP Oscar | — |
| RAIS-007 | Navegación | `regimenActual ≠ 'RPM'` en BaseCotizacion | Continuar | `siguienteVistaTrasBaseCotizacion` devuelve `'queDeterminaResultado'`, recorrido sin cambios desde antes de UX-RPM-01 | Navegación RAIS intacta | ✅ VALIDADO | Automatizado | `navegacionRPM.test.js` (`RAIS conserva el recorrido existente sin cambios`) | — | MVP Oscar | — |
| RAIS-008 | Convención económica | Cualquier proyección RAIS | Leer resultado | Todo expresado en pesos de hoy (poder adquisitivo constante), nunca valores nominales futuros | Convención Económica v1 (RAIS en términos reales) | ✅ VALIDADO | Automatizado | `generarCaminosRAIS.test.js` (`Convención Económica v1`) | — | MVP Oscar | — |

---

## Expediente / Experiencia

| ID | Área | Escenario | Precondiciones/datos clave | Acción | Resultado esperado | Capacidad demostrada | Estado | Automatización | Tests automáticos relacionados | Validación manual | Entrega | Observaciones/limitaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EXP-001 | ExpedientePensional (retirada 2026-09-02) | — | — | — | — | ⚫ RETIRADA | — | — | — | — | Pantalla fusionada en `CompletarExpediente.jsx` (feedback de usuaria real): era una introducción sin datos, decisiones ni función técnica indispensable, seguida inmediatamente de otra introducción (`CompletarExpediente.jsx`) sin ninguna decisión real entre ambas. `ExpedientePensional.jsx` eliminado; el eco de datos ya capturados (fecha de nacimiento, sexo, régimen, etc.) no se migró — su capacidad real (explicar qué sigue y para qué) ya la cubre EXP-002. Ver PL-250 v0.6, §13. |
| EXP-002 | CompletarExpediente (única pantalla introductoria, tras la fusión con ExpedientePensional) | Progreso variable del expediente | Ver checklist | Bloques registrados vs. bloque siguiente, según `infoEsencialCompletada` real, no una etiqueta fija; sin badge con apariencia de botón para el bloque siguiente (solo resaltado de borde/fondo) | Checklist de progreso del expediente + introducción única (qué sigue, para qué, avance paso a paso) | ✅ VALIDADO | Manual (sin test dedicado) | `src/dev/aplicarFixture.test.js` (`Coherencia de vistaSugerida en fixtures`, cubre que ninguna fixture apunte a la vista retirada) | Validado visualmente en la fusión de 2026-09-02 (ver PL-250 v0.6, §13); cierre original del Slice S3-007 en `docs/gestion/cierre-sprint-3.md`, commit `c4c13b1` | MVP Oscar | Badge "Siguiente paso" (imitaba `.btn-primary` sin acción real) eliminado junto con `.badge--siguiente` de `App.css`. |
| EXP-003 | PrimeraLectura | Semanas mínimas y/o edad de pensión evaluables | Completar HistoriaPensional | Se muestra solo si al menos una evidencia es interpretable; se omite completamente si ninguna aporta valor | PrimeraLectura condicional (nunca vacía) | ✅ VALIDADO | Automatizado | `src/domain/tienePrimeraLecturaValor.test.js` (8 escenarios: ambas evaluables, una sola, ninguna, navegación adelante/atrás, recálculo sin bandera obsoleta) | — | MVP Oscar | — |
| EXP-004 | Continuidad del expediente | Recorrido completo Bienvenida → BaseCotizacion | Navegar el flujo completo | Cada "Continuar"/"Volver" lleva a la vista correcta, sin pantallas huérfanas antes de BaseCotizacion | Continuidad del expediente | 🟡 PARCIAL/LIMITADO | Manual únicamente | — | **Manual pendiente** — no existe `App.test.jsx`; verificado solo por lectura de código en esta y sesiones previas | MVP Oscar | Mismo hueco estructural que RPM-029. |
| EXP-005 | Vida útil de capacidades ya construidas | `HistoriaCotizacionRPM`/`ExploraTuProyeccionRPM` | — | — | Reintegradas como profundización opcional (no permanecen huérfanas) | Preservación de capacidad sobre preservación de pantalla | ✅ VALIDADO | Ver RPM-025 | Ver RPM-025 | Ver RPM-025 | MVP Oscar | Cerrado en `aa0e2c6`, tras haber quedado inaccesibles por UX-RPM-01 (`6a435ef`) — historial completo en esta conversación. |
| EXP-006 | Objetivo.jsx (retirada 2026-09-03) | — | — | — | — | ⚫ RETIRADA | — | — | — | — | Pantalla interactiva "¿Qué situación quieres entender?" eliminada por completo (feedback de usuaria real): dos rediseños previos (6 opciones directas, luego divulgación progresiva de 2 pasos) seguían sin resolver el problema — solo escondían las 4 categorías no atendidas detrás de más clics, sin que dejaran de terminar sin respuesta de PensionLab. `Objetivo.jsx`/`Objetivo.helpers.js` y sus 45 pruebas eliminados, sin consumidores fuera de la pantalla retirada. Su capacidad real (comunicar el alcance) ahora la cubre EXP-007. Ver PL-250 v0.7, §21. |
| EXP-007 | Bienvenida — control de alcance informativo | Pantalla inicial del recorrido | Pulsar "Proyectar mi pensión de vejez" | Establece `motivoConsulta = 'vejez'` y navega directo a `DatosIniciales`, sin ninguna selección ni clic adicional; la advertencia de exclusión (incapacidad laboral, protección familiar, pensión ya reconocida, reclamación/trámite activo) es texto informativo — sin radios, sin botón propio, sin desplegable que la esconda | Control de alcance honesto: solo vejez se presenta como capacidad calculada; los demás casos se nombran como exclusiones, nunca como opciones disponibles | 🟡 PARCIAL/LIMITADO | Automatizado (parcial, solo contrato de fixtures) + **manual pendiente** | `src/dev/aplicarFixture.test.js` cubre únicamente que las 10 fixtures declaran `motivoConsulta: 'vejez'` y que `'objetivo'` ya no es una vista conocida (`VISTAS_CONOCIDAS`) ni sugerida por ninguna fixture. **No cubre** el handler `onComenzar` de `Bienvenida.jsx` (que fija `motivoConsulta = 'vejez'` y navega a `datosIniciales` al pulsar el botón) ni el renderizado de la advertencia — ninguno de los dos tiene test automatizado (sin `jsdom`/`@testing-library/react`). | **Manual pendiente** — el handler, la navegación y el compacto/legible de la advertencia en móvil se verificaron solo por lectura directa de `App.jsx`/`Bienvenida.jsx` en esta sesión; la revisión visual todavía no se ejecutó | MVP Oscar | PL-250 v0.7, §21. Camino de vejez: 1 pantalla y 1 clic menos que el baseline pre-PL-250, según lectura de código (no verificado interactivamente todavía). |
| EXP-008 | "Volver" desde DatosIniciales | En `DatosIniciales`, cualquier estado | Pulsar "Volver" | Regresa a `Bienvenida` — ya no existe ninguna ruta normal hacia una pantalla `Objetivo` | Ausencia de rutas hacia una pantalla retirada | 🟡 PARCIAL/LIMITADO | Manual — **sin test automatizado** (navegación de `App.jsx` sin `jsdom`/RTL, mismo hueco que EXP-004) | — (ningún test automático ejercita este `onVolver`) | **Manual pendiente** — confirmado solo por lectura directa de `App.jsx` (`onVolver` de `DatosIniciales` apunta a `'bienvenida'`, sin ninguna rama que renderice una vista `'objetivo'`); no se ejecutó todavía el clic real en el navegador | MVP Oscar | PL-250 v0.7, §21. |

---

## IA

**Nota de alcance (decisión de producto, 2026-08-27):** la explicación con IA
visible desde la UI de `ProyectaTuPensionRPM.jsx` (S4-007, integrada en
`db1bac7`) está funcionalmente completa y probada, pero **no forma parte de la
publicación de este MVP para Oscar** — no debe encontrarla ni probarla en esta
ronda. La capacidad existe técnicamente y está probada, pero queda fuera del
alcance de esta publicación del MVP; su incorporación a una experiencia futura
de usuario queda sujeta a una decisión posterior de producto, todavía no
tomada. Las filas `IA-001`…`IA-005` y `RPM-024` se conservan íntegras — mismos
tests, misma evidencia — por su valor de trazabilidad técnica, reclasificadas
como `Post-MVP` en la columna Entrega.

| ID | Área | Escenario | Precondiciones/datos clave | Acción | Resultado esperado | Capacidad demostrada | Estado | Automatización | Tests automáticos relacionados | Validación manual | Entrega | Observaciones/limitaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IA-001 | Explicación IA | Escenarios viables calculados | Pedir "Entender este camino"/"Comparando tus caminos" | La IA solo explica cifras ya calculadas por dominio, nunca las produce | IA explica resultados ya calculados | ✅ VALIDADO | Automatizado | `explicarCaminos.test.js` (`construcción de la entrada al adaptador`); `validarConsistenciaExplicacion.test.js` | — | Post-MVP (funcional y probada; alcance de exposición al usuario sujeto a decisión futura de producto) | — |
| IA-002 | Explicación IA | Idem | Idem | Ninguna cifra pensional (IBC, pensión, tasa) se calcula ni se modifica dentro de la capa de IA | IA no calcula cifras pensionales (invariante protegida) | 🚫 NO DEBE OCURRIR | Automatizado | `validarConsistenciaExplicacion.test.js` (`ninguna cifra inventada o alterada llega al usuario como hecho`) | — | Post-MVP (funcional y probada; alcance de exposición al usuario sujeto a decisión futura de producto) | Misma evidencia que `RPM-NEG-006` — fila duplicada a propósito, una como invariante RPM y otra como capacidad de la sección IA. |
| IA-003 | Explicación IA | Hechos construidos desde el escenario (`construirHechosEscenario`) | Generar explicación | El texto de la IA es consistente con los hechos estructurados que se le pasaron, verificado antes de mostrarse | Respuesta consistente con hechos | ✅ VALIDADO | Automatizado | `src/transparency/construirHechosEscenario.test.js`; `validarConsistenciaExplicacion.test.js` | — | Post-MVP (funcional y probada; alcance de exposición al usuario sujeto a decisión futura de producto) | — |
| IA-004 | Explicación IA | Proveedor de IA falla o no responde | Pedir explicación | `resultadoExplicacion.estado === 'error_proveedor'`; las cifras ya calculadas siguen exactamente igual de utilizables | Fallback/error cuando IA no está disponible | ✅ VALIDADO | Automatizado | `src/ia/adaptadores/AdaptadorExplicacionViaServidor.test.js` | Manual pendiente: forzar el fallo real en un entorno desplegado | Post-MVP (funcional y probada; alcance de exposición al usuario sujeto a decisión futura de producto) | — |
| IA-005 | Explicación IA | Build de producción | Desplegar y usar "Entender este camino" | La explicación depende de que la función de servidor esté configurada; si falta, se degrada visiblemente sin romper la pantalla | Recorrido visible real desde la UI | 🟡 PARCIAL/LIMITADO | Manual únicamente | `src/pages/ProyectaTuPensionRPM.jsx` (`adaptadorExplicacionProduccion = crearAdaptadorExplicacionViaServidor()`, default de producción, ver también `adaptadorExplicacionDesarrollo` solo bajo `import.meta.env.DEV`) | No aplica — fuera del alcance que Oscar debe probar en esta publicación | Post-MVP (funcional y probada; alcance de exposición al usuario sujeto a decisión futura de producto) | `OPENAI_API_KEY`/`OPENAI_MODEL` no son requisito de esta publicación — Oscar no debe necesitar ni verificar esa configuración. Queda como referencia técnica para una eventual publicación futura de esta capacidad. |

---

## Set de aceptación para Oscar

Guía de prueba de producto — no técnica. Recorre estos 9 escenarios para
formarte una opinión representativa del MVP sin necesitar conocer el sistema
por dentro. Cada uno remite a la fila completa de arriba si quieres el
detalle técnico.

1. **RPM con información parcial** (`RPM-010`) — declara solo lo esencial
   (sin cargar historia de cotización) y llega directo a la proyección.
   Debe verse una cifra y una explicación honesta de en qué se basa.
2. **Semanas aproximadas, no exactas** (`RPM-003`) — declara que "más o
   menos" sabes cuántas semanas llevas cotizadas. El resultado debe
   reconocerlo como aproximado, no como un hecho verificado.
3. **Objetivo no alcanzado con el aporte actual** (`RPM-013`/`RPM-014`) —
   pon un objetivo alto: debe aparecer un camino alternativo que sí lo
   alcance, con el esfuerzo mensual adicional claramente indicado.
4. **Objetivo ya alcanzado hoy** (`RPM-016`/`RPM-017`) — pon un objetivo
   bajo: debe decir explícitamente que ya lo alcanzas, y ofrecerte explorar
   otro esfuerzo si quieres, no dejarte en un callejón sin salida.
5. **Caso legalmente imposible** (`RPM-018`) — pon un objetivo desmedido:
   debe explicarte que ni el máximo legal alcanza, nunca mostrarlo como si
   fuera viable.
6. **Profundizar la historia, opcionalmente** (`RPM-025`) — desde la
   proyección, usa "Agregar períodos de mi historia de cotización", agrega uno o dos
   períodos reales, y confirma que vuelves a la proyección con la cifra
   posiblemente distinta — y que nunca fue obligatorio para llegar hasta
   ahí.
7. **Un caso RAIS completo** (`RAIS-002`/`RAIS-003`) — repite un recorrido
   equivalente en fondo privado, para confirmar que RAIS no cambió con
   nada de lo anterior.
8. **Navegación — Volver en el camino rápido** (`RPM-029`) — desde la
   proyección, pulsa "Volver": debe regresar a Base de cotización, nunca a
   una pantalla vacía o desconectada.
9. **Navegación — Volver durante la profundización** (`RPM-029`) — entra a
   completar historia y pulsa "Volver" sin agregar nada: debe regresar
   exactamente a la proyección, nunca a una pantalla que no visitaste.

---

## Capacidades pendientes conocidas (Roadmap funcional)

Solo capacidades ya decididas o documentadas — ninguna es una idea nueva de
este documento.

- **Explicación con IA en la experiencia de usuario** — funcionalmente
  completa y probada (`IA-001`…`IA-005`, `RPM-024`), deliberadamente excluida
  de esta publicación del MVP para Oscar (decisión de producto, 2026-08-27).
  La capacidad existe técnicamente y está probada, pero queda fuera del
  alcance de esta publicación; su incorporación a una experiencia futura de
  usuario queda sujeta a una decisión posterior de producto, todavía no
  tomada — no hay compromiso de que se publique en la siguiente versión.
  Si se retoma, requiere confirmar la configuración de servidor
  (`OPENAI_API_KEY`/`OPENAI_MODEL`) en el entorno de despliegue
  correspondiente. Entrega: `Post-MVP`.
- **Explorar un IBC menor** (caso `HOY_YA_ALCANZA_OBJETIVO`) — diseño
  conceptual y contrato funcional mínimo ya discutidos y aprobados como
  `Post-MVP` en esta misma sesión de trabajo (ver también el anexo de la
  auditoría estratégica RPM). Complementa simétricamente `RPM-014`/`RPM-020`
  (hoy solo se puede explorar "más esfuerzo", nunca "menos"). No debe
  construirse sin cerrar antes el umbral de materialidad y el copy de
  advertencia de asimetría de riesgo ya identificados.
- **Reactivación o retiro formal de `DeclaracionLibre`** — entrada
  alternativa por IA libre, funcionalmente terminada pero sin ningún botón
  real que lleve ahí desde el recorrido público (solo Panel de Desarrollo).
  Documentado en `docs/producto/oportunidades-futuras.md`, entrada 2
  ("Objetivos sin capacidad todavía"), junto con las tres capacidades que le
  darían contenido si se retoma (comprensión semántica C-v2, comparación de
  caminos ya conocidos, validación de una estrategia declarada). Entrega:
  `Futuro`.
- **PensionLab para profesionales / gestión de casos de terceros** —
  `docs/producto/oportunidades-futuras.md`, entrada 1. Sin validación de
  usuario real todavía. Entrega: `Futuro`.
- **Estrategia pensional viva y acompañamiento proactivo** (seguimiento de
  un camino elegido en el tiempo, con datos reales sustituyendo supuestos) —
  `oportunidades-futuras.md`, entrada 3. Requiere antes una decisión de
  persistencia del Expediente Pensional, todavía pendiente e independiente.
  Entrega: `Futuro`.
- **Caminos "equilibrados" adicionales en RAIS** — investigado y
  **descartado explícitamente** para el modelo actual (la relación
  resultado↔IBC es afín; la restricción de costo ya resuelve la necesidad
  real). Queda documentado como decisión cerrada, no como pendiente activo —
  `oportunidades-futuras.md`, sección correspondiente. Entrega: `Futuro`
  (solo si aparece evidencia de curvatura real en duración/momento/horizonte).
- **Formateo monetario en vivo mientras se escribe** — pospuesto
  deliberadamente para el MVP actual (se implementó solo el prefijo `$`
  fijo). `oportunidades-futuras.md`, última entrada, con la lista completa de
  hallazgos a conservar si se retoma (incluye la ausencia de infraestructura
  de test de DOM, relevante también para `RPM-022`/`EXP-002`).
  Entrega: `Futuro`.
