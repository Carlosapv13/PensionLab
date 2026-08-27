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
| RPM-010 | Proyección preliminar | `historiaCotizacion = []`, con o sin semanas declaradas | Llegar a ProyectaTuPensionRPM directo desde BaseCotizacion (UX-RPM-01) | Proyección se calcula igual, con limitación visible si aplica | Proyección preliminar sin historia detallada | ✅ VALIDADO | Automatizado | `generarCaminosRPM.test.js` (`UX-RPM-01: historia vacía + horizonte largo...`); `calcularProyeccionRPM.test.js` (`contrato GO-B`, CASO A/D) | — | MVP Oscar | — |
| RPM-011 | GO-B | `semanasReferenciaDeclaradas` válida | Proyectar | Semanas declaradas alimentan `semanasCotizadas.total` → elegibilidad + tasa de reemplazo | Semanas declaradas alimentan elegibilidad/tasa | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (CASO A "continuación": "la misma cifra que alimenta elegibilidad también mueve la tasa de reemplazo"); `generarCaminosRPM.test.js` (`contrato GO-B: semanas declaradas propagadas hasta la elegibilidad y la tasa`) | — | MVP Oscar | — |
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
| RPM-024 | Explicación IA | Camino(s) viable(s) presentes | Pedir "Entender este camino"/"Comparando tus caminos" | Explicación generada solo sobre escenarios viables, nunca inventa cifras | Explicación IA de caminos RPM | 🟡 PARCIAL/LIMITADO | Automatizado | Ver sección IA (`IA-001`…`IA-005`) | Recorrido real en producción: manual pendiente, depende de configuración de servidor | MVP Oscar | Lógica y contrato validados al 100%; la disponibilidad real en el entorno de revisión depende de configuración de servidor (ver `IA-005`). Ver corrección de alcance en la introducción de la sección IA — es capacidad **nueva** del MVP actual, integrada a la UI en `db1bac7`. |
| RPM-025 | Profundización opcional | `historiaCotizacion = []` en ProyectaTuPensionRPM | Clic "Completar mi historia de cotización" → agregar períodos → Continuar → "Proyectar hacia el futuro" | Vuelve a ProyectaTuPensionRPM con `historiaCotizacion` actualizada, recalculado automáticamente | Profundización opcional (Historia + lectura histórica) sin afectar el camino rápido | 🟡 PARCIAL/LIMITADO | Manual únicamente | Sub-piezas automatizadas: `HistoriaCotizacionRPM.helpers.test.js`, `evidenciaIndicioVidaLaboral.test.js`; navegación completa no tiene test propio | **Manual pendiente** — recorrido completo Caso B nunca ejercitado con automatización de navegador en esta sesión (sin herramienta disponible) | MVP Oscar | Implementado en `aa0e2c6`. Riesgo menor conocido: estado transitorio de UI (ej. borrador de esfuerzo personalizado) se pierde al ir y volver — no es un dato declarado. |
| RPM-026 | Historia parcial | Algunos períodos reales cargados, historia incompleta | Ver ExploraTuProyeccionRPM | Lectura calcula si alcanza la ventana de 3.650 días; si no, código estructurado, no error | Historia parcial manejada honestamente | ✅ VALIDADO | Automatizado | `calcularPensionRPM.test.js` (`Caso 5: no evaluable`; `Caso 7: suficiencia temporal vs. cobertura IPC`) | — | MVP Oscar | — |
| RPM-027 | Historia suficiente | Historia cubre ≥3.650 días efectivos | Ver ExploraTuProyeccionRPM | IBL/tasa/resultado económico actual calculados, con comparación de vida laboral si aplica | Lectura histórica calculada (`calcularPensionRPM.js`) | ✅ VALIDADO | Automatizado | `calcularPensionRPM.test.js` (`Caso 1`, `Caso 6`, `Caso 6b`) | — | MVP Oscar | — |
| RPM-028 | Estados no_evaluable | Datos insuficientes (edad, fecha nacimiento, IBC futuro, historia, etc.) | Proyectar con datos incompletos | Código estructurado de `razonNoEvaluable`, nunca una excepción sin capturar | Estados `no_evaluable` cubiertos | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (`no evaluable`); `calcularPensionRPM.test.js` (`Caso 5`) | — | MVP Oscar | — |
| RPM-029 | Navegación/Volver | Camino rápido y camino de profundización | "Volver" desde cada pantalla RPM | Rápido: Volver → `baseCotizacion`. Profundización: Volver desde HistoriaCotizacionRPM → `proyectaTuPensionRPM`, nunca `queDeterminaResultado` | Navegación coherente en ambos recorridos | 🟡 PARCIAL/LIMITADO | Manual + parcial automatizado | `navegacionRPM.test.js` (decisión pura `siguienteVistaTrasBaseCotizacion`) | **Manual pendiente** — el cableado de `onVolver` en `App.jsx` no tiene test de integración (no existe `App.test.jsx`); verificado solo por lectura directa del código en esta sesión | MVP Oscar | — |
| RPM-030 | Resultado con/sin historia | Mismo perfil, con y sin `historiaCotizacion` | Comparar proyección | Sin historia: IBL depende solo del escenario futuro sintético. Con historia: IBL más preciso, puede habilitar vida laboral | Diferencia de evidencia entre resultado preliminar y resultado con historia | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (comparación dentro de CASO A "continuación"; `horizonte ≥10 años: convergencia al escenario futuro` vs. `horizonte corto: mezcla real`) | — | MVP Oscar | — |
| RPM-031 | IBL alternativo protegido | Declaración cruza el umbral de semanas, pero `historiaCotizacion` no lo sustenta | Proyectar | `razonVidaLaboralNoEvaluada = 'VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA'`; el alternativo de vida laboral **no** se fabrica | IBL alternativo protegido por semanas sustentadas por historia | ✅ VALIDADO | Automatizado | `calcularProyeccionRPM.test.js` (`contrato GO-B: el gate del IBL alternativo SOLO usa semanas sustentadas por historia`, casos A/B) | — | MVP Oscar | Mismo comportamiento verificado como invariante — ver `RPM-NEG-004`. |

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
| EXP-001 | ExpedientePensional | Datos ya capturados en bloques previos | Ver ExpedientePensional | Resumen fiel por bloque, sin datos nuevos ni cálculos | Resumen del expediente capturado | ✅ VALIDADO | Manual (componente sin test dedicado) | — | Validado en el cierre del Slice S3-006 (`docs/gestion/cierre-sprint-3.md`, commit `3c2e867`) — no re-verificado manualmente en esta sesión | MVP Oscar | Pantalla puramente presentacional, sin `.helpers.js` propio que testear; archivo no tocado en ningún commit de esta sesión (sin riesgo de regresión reciente). |
| EXP-002 | CompletarExpediente | Progreso variable del expediente | Ver checklist | Bloques registrados vs. bloque siguiente, según `infoEsencialCompletada` real, no una etiqueta fija | Checklist de progreso del expediente | ✅ VALIDADO | Manual (sin test dedicado) | — | Validado en el cierre del Slice S3-007 (`docs/gestion/cierre-sprint-3.md`, commit `c4c13b1`) — no re-verificado manualmente en esta sesión | MVP Oscar | Archivo no tocado en ningún commit de esta sesión (sin riesgo de regresión reciente). |
| EXP-003 | PrimeraLectura | Semanas mínimas y/o edad de pensión evaluables | Completar HistoriaPensional | Se muestra solo si al menos una evidencia es interpretable; se omite completamente si ninguna aporta valor | PrimeraLectura condicional (nunca vacía) | ✅ VALIDADO | Automatizado | `src/domain/tienePrimeraLecturaValor.test.js` (8 escenarios: ambas evaluables, una sola, ninguna, navegación adelante/atrás, recálculo sin bandera obsoleta) | — | MVP Oscar | — |
| EXP-004 | Continuidad del expediente | Recorrido completo Bienvenida → BaseCotizacion | Navegar el flujo completo | Cada "Continuar"/"Volver" lleva a la vista correcta, sin pantallas huérfanas antes de BaseCotizacion | Continuidad del expediente | 🟡 PARCIAL/LIMITADO | Manual únicamente | — | **Manual pendiente** — no existe `App.test.jsx`; verificado solo por lectura de código en esta y sesiones previas | MVP Oscar | Mismo hueco estructural que RPM-029. |
| EXP-005 | Vida útil de capacidades ya construidas | `HistoriaCotizacionRPM`/`ExploraTuProyeccionRPM` | — | — | Reintegradas como profundización opcional (no permanecen huérfanas) | Preservación de capacidad sobre preservación de pantalla | ✅ VALIDADO | Ver RPM-025 | Ver RPM-025 | Ver RPM-025 | MVP Oscar | Cerrado en `aa0e2c6`, tras haber quedado inaccesibles por UX-RPM-01 (`6a435ef`) — historial completo en esta conversación. |

---

## IA

**Corrección de alcance (importante):** la IA visible desde la UI de
`ProyectaTuPensionRPM.jsx` (S4-007, integrada en `db1bac7`) se clasifica aquí
como capacidad **nueva del MVP actual**, no como algo ya disponible en un MVP
público anterior. `d39f329` (usado como referencia de comparación en una
auditoría previa de esta sesión) es solo la punta de la rama de desarrollo
`sprint-3-mvp-headless` — no hay tag ni marca de release que confirme que la
IA visible ya formaba parte de una versión efectivamente publicada y revisada
antes. El único tag del repositorio (`sprint-1-completo`) es muy anterior a
esta capacidad.

| ID | Área | Escenario | Precondiciones/datos clave | Acción | Resultado esperado | Capacidad demostrada | Estado | Automatización | Tests automáticos relacionados | Validación manual | Entrega | Observaciones/limitaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IA-001 | Explicación IA | Escenarios viables calculados | Pedir "Entender este camino"/"Comparando tus caminos" | La IA solo explica cifras ya calculadas por dominio, nunca las produce | IA explica resultados ya calculados | ✅ VALIDADO | Automatizado | `explicarCaminos.test.js` (`construcción de la entrada al adaptador`); `validarConsistenciaExplicacion.test.js` | — | MVP Oscar (capacidad nueva) | — |
| IA-002 | Explicación IA | Idem | Idem | Ninguna cifra pensional (IBC, pensión, tasa) se calcula ni se modifica dentro de la capa de IA | IA no calcula cifras pensionales (invariante protegida) | 🚫 NO DEBE OCURRIR | Automatizado | `validarConsistenciaExplicacion.test.js` (`ninguna cifra inventada o alterada llega al usuario como hecho`) | — | MVP Oscar (capacidad nueva) | Misma evidencia que `RPM-NEG-006` — fila duplicada a propósito, una como invariante RPM y otra como capacidad de la sección IA. |
| IA-003 | Explicación IA | Hechos construidos desde el escenario (`construirHechosEscenario`) | Generar explicación | El texto de la IA es consistente con los hechos estructurados que se le pasaron, verificado antes de mostrarse | Respuesta consistente con hechos | ✅ VALIDADO | Automatizado | `src/ia/construirHechosEscenario.test.js`; `validarConsistenciaExplicacion.test.js` | — | MVP Oscar (capacidad nueva) | — |
| IA-004 | Explicación IA | Proveedor de IA falla o no responde | Pedir explicación | `resultadoExplicacion.estado === 'error_proveedor'`; las cifras ya calculadas siguen exactamente igual de utilizables | Fallback/error cuando IA no está disponible | ✅ VALIDADO | Automatizado | `src/ia/adaptadores/AdaptadorExplicacionViaServidor.test.js` | Manual pendiente: forzar el fallo real en un entorno desplegado | MVP Oscar (capacidad nueva) | — |
| IA-005 | Explicación IA | Build de producción | Desplegar y usar "Entender este camino" | La explicación depende de que la función de servidor esté configurada; si falta, se degrada visiblemente sin romper la pantalla | Recorrido visible real desde la UI | 🟡 PARCIAL/LIMITADO | Manual únicamente | `src/pages/ProyectaTuPensionRPM.jsx` (`adaptadorExplicacionProduccion = crearAdaptadorExplicacionViaServidor()`, default de producción, ver también `adaptadorExplicacionDesarrollo` solo bajo `import.meta.env.DEV`) | **Manual pendiente** — depende de la configuración real del entorno donde se revise con Oscar (README, sección "Explicación con IA — configuración y comportamiento") | MVP Oscar (capacidad nueva) | Antes de la revisión con Oscar, confirmar explícitamente si el entorno de despliegue tiene la función de servidor configurada — si no, la IA se degradará silenciosamente ahí, y eso debe explicarse, no descubrirse en vivo. |

---

## Set de aceptación para Oscar

Guía de prueba de producto — no técnica. Recorre estos 10 escenarios para
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
   proyección, usa "Completar mi historia de cotización", agrega uno o dos
   períodos reales, y confirma que vuelves a la proyección con la cifra
   posiblemente distinta — y que nunca fue obligatorio para llegar hasta
   ahí.
7. **Explicación con IA** (`IA-001`/`IA-005`) — pide "Entender este camino"
   y confirma que la explicación describe la cifra ya mostrada, sin
   contradecirla ni inventar una nueva.
8. **Un caso RAIS completo** (`RAIS-002`/`RAIS-003`) — repite un recorrido
   equivalente en fondo privado, para confirmar que RAIS no cambió con
   nada de lo anterior.
9. **Navegación — Volver en el camino rápido** (`RPM-029`) — desde la
   proyección, pulsa "Volver": debe regresar a Base de cotización, nunca a
   una pantalla vacía o desconectada.
10. **Navegación — Volver durante la profundización** (`RPM-029`) — entra a
    completar historia y pulsa "Volver" sin agregar nada: debe regresar
    exactamente a la proyección, nunca a una pantalla que no visitaste.

---

## Capacidades pendientes conocidas (Roadmap funcional)

Solo capacidades ya decididas o documentadas — ninguna es una idea nueva de
este documento.

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
  de test de DOM, relevante también para `RPM-022`/`EXP-001`/`EXP-002`).
  Entrega: `Futuro`.
