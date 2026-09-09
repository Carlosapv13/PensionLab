# Matriz de trazabilidad normativa — data/legal

Cubre únicamente los campos de `data/legal` (normas obligatorias). Los campos de
`data/assumptions` no tienen fuente oficial por diseño — quedan fuera de esta matriz.

**Objetivo inmediato:** validar fuentes para `vigente-2026.json`. Cuando se trabajen
`reforma-2024.json` y `ley100-1993.json`, cada uno necesitará su propia validación
por campo contra la norma vigente en ese período.

Investigación realizada por búsqueda web (fecha de consulta: 2026-07-30). Ningún
valor fue cargado en archivos JSON — esto sigue siendo solo documentación de
trazabilidad.

## Decisiones aprobadas (2026-07-30)

1. **`vigente-2026.json` representa únicamente normativa efectivamente aplicable.**
   La reforma pensional 2024 (Ley 2381 de 2024) sigue suspendida por la Corte
   Constitucional (Auto 841 de 2025, vicio de trámite) y se mantiene separada — sus
   entradas, si llegan a necesitarse, van en su propio archivo de versión
   (`reforma-2024.json`), nunca mezcladas en `vigente-2026.json`, hasta que exista
   fallo definitivo de la Corte. `data/legal/index.js` excluye `reforma-2024.json`
   de su línea de tiempo de forma explícita, no por omisión accidental.
2. **`semanasMinimasPension` queda dividido en `semanasMinimasPensionHombre` y
   `semanasMinimasPensionMujer`** — reflejado en `data/legal/schema.js` y en
   `vigente-2026.json` (la entrada de mujeres usa un `valor` estructurado tipo
   `cronograma-lineal`, no un número fijo).
3. **Implementado `obtenerSemanasMinimas(fecha, sexo, regimen)`** en
   `data/legal/index.js`, junto con `resolverReglasVigentes(fecha, opts)`. Probado
   contra los casos límite: hombre (1300 fijo), mujer 2026 (1250), mujer 2027 (1225),
   mujer en el piso 2036+ (1000), mujer antes de 2026-01-01 (1300, aplica la entrada
   pre-sentencia). Para `regimen === 'RAIS'` lanza un error explícito en vez de asumir
   un valor — la proyección RAIS simplificada de Sprint 1 no tiene un requisito
   equivalente de semanas mínimas.
4. **Mecanismo general para incertidumbre jurídica**: se agregó el campo opcional
   `estadoJuridico` (`'firme' | 'transitorio' | 'suspendido'`) a `LegalRuleEntry`.
   `resolverReglasVigentes()` excluye por defecto cualquier entrada que no sea
   `'firme'`; solo se incluye pasando `{ permitirTransitorio: true }` explícitamente.
   El SMLV 2026 se cargó en `vigente-2026.json` con `estadoJuridico: 'transitorio'`
   — está documentado y trazable, pero el motor no lo usará por defecto hasta que
   quede firme. Este mecanismo queda disponible para cualquier campo futuro bajo
   litigio, no es exclusivo de SMLV.
5. **`topeMaximoIBC` confirmado en 25 SMLMV.** Se verificó la condición del Decreto
   2322 de 2022 (crecimiento económico > 4% en los últimos 3 años fiscales): según
   el DANE, el PIB de Colombia creció 0.8% (2023), 2.5% (2024) y 2.6% (2025) — ningún
   año supera el 4%, así que la ampliación a 45 SMLMV no está activa. Pasa a
   **Validado**.
6. **`vigente-2026.json` se creó como borrador bloqueado** (`estado: 'borrador'`,
   `listoParaProduccion: false`), con las 13 entradas ya validadas más `smlv`
   (presente pero inerte por `estadoJuridico: 'transitorio'`). No se marca
   `'publicado'` hasta verificar el texto oficial contra Diario Oficial/SUIN-Juriscol
   y hasta que el SMLV quede firme.

## Hallazgos de la investigación

1. **La reforma pensional 2024 (Ley 2381 de 2024) está suspendida.** La Corte
   Constitucional, mediante Auto 841 de 2025, suspendió su entrada en vigencia por
   un vicio de trámite (deliberación insuficiente en la Cámara de Representantes).
   Aunque el Congreso volvió a debatirla, a la fecha de consulta sigue sin fallo
   definitivo de la Corte.
2. **La Sentencia C-197 de 2023** declaró inexequible exigir el mismo número de
   semanas a hombres y mujeres, con efectos diferidos desde 2026-01-01: hombres
   mantienen 1300 semanas, mujeres bajan a 1250 en 2026 y siguen reduciéndose 25
   semanas cada año hasta llegar a 1000 (~2036). Es un hallazgo estructural, no solo
   un dato — motivó la decisión 2 y 3 de arriba.
3. **El SMLV 2026 está en litigio activo.** El Decreto 1469 de 2025 fijó el SMLMV
   2026 en $1.750.905 (+23%), pero el Consejo de Estado suspendió provisionalmente
   ese decreto (auto del 12-feb-2026); el Gobierno lo reemplazó transitoriamente con
   el Decreto 0159 de 2026 mientras se resuelve el litigio de fondo.
   **Actualización 2026-09-07 (auditoría previa a E3-A):** la Sección Segunda del
   Consejo de Estado REVOCÓ esa suspensión provisional mediante auto del 17-jul-2026
   (recurso de súplica del Gobierno), reactivando el Decreto 1469 de 2025 como norma
   operativa vigente — el Decreto 0159/2026 quedó sin efecto. El valor ($1.750.905)
   no cambió en ningún momento. El litigio de FONDO (nulidad del decreto) sigue
   abierto y sin fallo a la fecha de consulta.
   **Fuente oficial (no prensa):** índice de noticias oficiales del Consejo de Estado
   (consejodeestado.gov.co/noticias/index.php), entrada del 2026-07-17 07:49:33,
   título "Decreto que impuso el alza del salario mínimo permanecerá vigente hasta
   que se juzgue su legalidad" — Sección Segunda, revocatoria por recurso de súplica
   del Gobierno Nacional; PDF del comunicado:
   linkce.consejodeestado.gov.co/docum/prensa/PQRSDFeb986e.pdf.
   **Revocatoria confirmada por comunicación oficial del Consejo de Estado; texto
   íntegro del auto no localizado** (el PDF del comunicado no pudo abrirse — error de
   red — y no se ubicó el número de radicado del proceso de nulidad). Prensa jurídica
   especializada (La República, Portafolio, Vanguardia, El Colombiano, LaFM) queda
   como fuente auxiliar convergente, nunca como fundamento principal.
   **Cierre 2026-09-07 (segunda ronda):** `estadoJuridico: 'transitorio'` se mantiene
   sin cambios en `vigente-2026.json` — el mecanismo genérico de exclusión de
   `resolverReglasVigentes` no se toca. Se agregó, en cambio, un modelo de vigencia
   explícito (`litigioPendiente`/`medidaCautelarActiva` en la entrada,
   `evaluarVigenciaSmlv()` en `data/legal/index.js`) que separa "existe una demanda de
   fondo sin resolver" (no impide el uso) de "hay una suspensión provisional vigente
   ahora mismo" (si impide el uso) — el propio comunicado oficial confirma que hoy no
   hay ninguna suspensión activa: `litigioPendiente: true`, `medidaCautelarActiva:
   false`. Riesgo de vigencia, sin afirmar categóricamente retroactividad (la fuente
   oficial no se pronuncia sobre eso): el comunicado del Consejo de Estado aclara
   textualmente que "el examen sobre su legalidad debe producirse cuando se tome la
   decisión final dentro de este proceso de nulidad" — un fallo de fondo desfavorable
   podría modificar el marco aplicable, sin que esta investigación pueda establecer si
   ese efecto sería retroactivo.
4. **El tope de IBC de 25 SMLMV tiene una ampliación condicional a 45 SMLMV**
   (Decreto 2322 de 2022), pero solo se activa si se cumplen simultáneamente
   crecimiento económico > 4% en los últimos 3 años fiscales y gasto pensional
   < 2% del PIB — no verifiqué si esas condiciones macroeconómicas ya se cumplen
   en 2026.

## Campos compartidos RPM / Proyección RAIS

| Campo | Fuente oficial confirmada | Artículo/decreto confirmado | Valor hallado (referencia, no cargado) | Fecha de vigencia | ¿Aplica a vigente-2026? | Estado |
|---|---|---|---|---|---|---|
| `edadPensionMujer` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 33 Ley 100 de 1993, modificado por Art. 9 Ley 797 de 2003 | 57 años | Vigente desde 2003, sin cambio (C-197/2023 solo tocó semanas, no edad) | Sí — reforma 2024 suspendida | Validado |
| `edadPensionHombre` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 33 Ley 100 de 1993, modificado por Art. 9 Ley 797 de 2003 | 62 años | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `semanasMinimasPensionHombre` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 33 Ley 100 de 1993, modificado por Art. 9 Ley 797 de 2003 | 1300 semanas (sin cambio, C-197/2023 no modificó el requisito de hombres) | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `semanasMinimasPensionMujer` | Ley 100 de 1993 / Ley 797 de 2003, modulado por Sentencia C-197 de 2023 (Corte Constitucional) | Art. 9 Ley 797 de 2003 (pre-2026, entrada separada); Sentencia C-197 de 2023 (desde 2026-01-01) | 1300 semanas antes de 2026-01-01; desde entonces 1250 en 2026, -25/año hasta piso de 1000 (~2036) — **se consume vía `obtenerSemanasMinimas(fecha, sexo, regimen)`, cargado en vigente-2026.json como dos entradas (plana + cronograma)** | Pre-2026: vigente 2003–2025-12-31. Desde 2026-01-01: cronograma progresivo | Sí, a través del resolver — implementado y probado | Validado |
| `smlv` | Decreto del Gobierno Nacional (Ministerio del Trabajo), anual | Decreto 1469 de 2025 (29-dic-2025); suspendido provisionalmente (auto 12-feb-2026), suspensión REVOCADA por el Consejo de Estado, Sección Segunda — comunicado oficial 17-jul-2026 (consejodeestado.gov.co/noticias, texto íntegro del auto no localizado) — Decreto 1469/2025 reactivado, Decreto 0159/2026 sin efecto. Litigio de fondo (nulidad) sigue abierto, sin medida cautelar activa hoy | $1.750.905 (`estadoJuridico: 'transitorio'`, `litigioPendiente: true`, `medidaCautelarActiva: false`) | Desde 2026-01-01, operativamente vigente (medida cautelar revocada; fondo pendiente) | `estadoJuridico` sigue excluido por defecto de `resolverReglasVigentes` (mecanismo genérico sin cambios). Aptitud real para cálculo resuelta por `evaluarVigenciaSmlv()` (data/legal/index.js): `aptoParaCalculoEnFechaBase: true`, `tipoVigencia: 'vigente_con_litigio'` — apto con advertencia, no bloqueado | Requiere revisión (modelo de vigencia cerrado 2026-09-07) |
| `tasaCotizacion` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 20 Ley 100 de 1993, modificado por Art. 7 Ley 797 de 2003 | 16% (fase final de incrementos graduales 2003-2006) | Vigente desde 2006, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `topeMaximoIBC` | Ley 100 de 1993, modificada por Ley 797 de 2003; Decreto Reglamentario 510 de 2003; Decreto 2322 de 2022 (ampliación condicional, no activa) | Art. 18 Ley 100 de 1993, modificado por Art. 5 Ley 797 de 2003 | 25 SMLMV — condición del Decreto 2322/2022 (crecimiento PIB > 4% en 3 años fiscales) NO se cumple: PIB DANE 0.8%/2.5%/2.6% en 2023/2024/2025 | 25 SMLMV vigente | Sí — condición de ampliación a 45 SMLMV confirmada como no activa | Validado |

## Campos específicos RPM (fórmula de tasa de reemplazo)

| Campo | Fuente oficial confirmada | Artículo/decreto confirmado | Valor hallado (referencia, no cargado) | Fecha de vigencia | ¿Aplica a vigente-2026? | Estado |
|---|---|---|---|---|---|---|
| `tasaReemplazoConstante` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 65.5 (fórmula: r = 65.5 − 0.5·s, s = IBL/SMLV) | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `tasaReemplazoPendiente` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 0.5 | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `tasaReemplazoMinima` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 55% | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `tasaReemplazoMaxima` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 80% | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `semanasPorIncrementoAdicional` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 50 semanas por tramo adicional | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `incrementoPorcentualPorTramo` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 1.5 puntos porcentuales por tramo | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |

## Resumen de estados

- **Validado**: 12 campos (edad × 2, `semanasMinimasPensionHombre`, `semanasMinimasPensionMujer`, tasaCotizacion, topeMaximoIBC, los 6 de la fórmula de reemplazo).
- **Requiere revisión**: 1 campo (`smlv` — litigio activo ante el Consejo de Estado; cargado en el borrador pero inerte por `estadoJuridico: 'transitorio'`).
- **Pendiente**: 0 campos.
- Total de campos legales: 13. `vigente-2026.json` (borrador) contiene 14 entradas — `semanasMinimasPensionMujer` se representa con dos entradas (plana pre-2026 + cronograma desde 2026).
- **`vigente-2026.json` existe como borrador bloqueado** (`estado: 'borrador'`, `listoParaProduccion: false`) — no publicado en firme hasta verificar texto oficial y resolver el litigio del SMLV.

## Leyenda de estado de validación

- **Pendiente** — sin verificar contra fuente oficial.
- **Requiere revisión** — fuente localizada y con evidencia razonable, pero con una
  ambigüedad, litigio activo, o implicación de diseño sin resolver antes de poder
  cargarse en `vigente-2026.json`.
- **Verificado en una fuente oficial** — texto literal cotejado contra una fuente
  oficial primaria (ej. Función Pública/Gestor Normativo, relatoría oficial de la
  Corte Constitucional), pero **sin verificación cruzada todavía contra una segunda
  fuente primaria independiente** (ej. SUIN-Juriscol, Diario Oficial). No equivale a
  "Validado" — el campo puede cargarse como borrador, nunca como `publicado`.
- **Validado** — confirmado contra fuente con evidencia consistente, listo para
  cargarse en `vigente-2026.json` (sujeto a verificación final contra el texto
  oficial en Diario Oficial / SUIN-Juriscol antes de publicar).

---

# Régimen de transición — Screening por edad (ley100-1993.json)

Investigación realizada por búsqueda web y cotejo directo de fuentes oficiales
primarias (fecha de consulta: 2026-08-04), en el marco del análisis de un Slice de
Sprint 3 (indicios de régimen de transición). Alcance explícitamente acotado a un
**screening preliminar por edad**, aprobado con ese límite — no cubre la vía de
tiempo de servicio ni la vigencia posterior del régimen (ver "Alcance usado" y
"Aspectos no evaluados" de cada fila).

## Matriz

| Campo | Regla | Texto normativo (resumen) | Fuente oficial | Artículo/parágrafo | Fecha histórica de evaluación | Vigencia | Alcance usado por este Slice | Aspectos expresamente NO evaluados | Estado de validación |
|---|---|---|---|---|---|---|---|---|---|
| `fechaEntradaVigenciaSistemaPensional` | Fecha de referencia fija para el screening | El Sistema General de Pensiones entra en vigencia el 1994-04-01 para sector privado y servidores públicos nacionales | Función Pública — Gestor Normativo (hallazgo por búsqueda, texto de Art. 151 no cotejado literalmente en esta sesión) | Art. 151, Ley 100 de 1993 | — (es la fecha misma) | Desde 1994-04-01, sin cambio conocido | Constante normativa trazable, cargada como entrada propia — nunca un literal embebido en código | Excepción territorial: servidores públicos departamentales/municipales/distritales tienen fecha distinta (1995-06-30, Art. 151 + Decreto 1296 de 1994) — **no evaluada; esta versión aplica 1994-04-01 a todos los casos por igual** | Requiere revisión (hallazgo de búsqueda; falta cotejo literal directo del Art. 151 y del Decreto 1296/1994) |
| `edadTransicionMujer` | Umbral de edad, vía mujer | 35 años o más al momento de entrar en vigencia el Sistema | Función Pública — Gestor Normativo (texto literal cotejado) | Art. 36, inciso 2, Ley 100 de 1993 | `fechaEntradaVigenciaSistemaPensional` | Desde 1994-04-01, sin cambio (Ley 797/2003 y Sentencia C-197/2023 solo modificaron edad/semanas de pensión, no este umbral) | Único criterio evaluado por la evidencia `evaluarIndiciosTransicion` | Vía de 15 años de servicio (limitación permanente); efecto del traslado a RAIS (Art. 36 inciso 4, misma fuente); vigencia posterior 2010/2014 (Parágrafo Transitorio 4, Acto Legislativo 01/2005) | Verificado en una fuente oficial (falta cotejo cruzado en SUIN-Juriscol, no accesible por error de certificado en esta sesión) |
| `edadTransicionHombre` | Umbral de edad, vía hombre | 40 años o más al momento de entrar en vigencia el Sistema | Función Pública — Gestor Normativo (texto literal cotejado) | Art. 36, inciso 2, Ley 100 de 1993 | `fechaEntradaVigenciaSistemaPensional` | Igual que arriba | Igual que arriba | Igual que arriba | Verificado en una fuente oficial (mismas condiciones) |
| *(no se carga — solo referencia documentada para etapa futura)* `añosServicioTransicion` | Umbral de tiempo de servicio, ambos sexos | 15 años o más de servicios cotizados al momento de entrar en vigencia el Sistema | Función Pública — Gestor Normativo (texto literal cotejado) | Art. 36, inciso 2, Ley 100 de 1993 | `fechaEntradaVigenciaSistemaPensional` | Igual que arriba | **Ninguno — vía excluida del cálculo en esta versión**, por decisión de producto: evitar inferir años de servicio a partir de `anioInicioCotizacion` (dato autorreportado y sensible a interrupciones laborales) sin evidencia real que lo respalde | Toda la vía queda fuera del cálculo; se declara como limitación permanente (`REGIMEN_TRANSICION_TIEMPO_SERVICIO_NO_EVALUADO`) en cada resultado evaluable | Verificado en una fuente oficial (registrado para una etapa futura, no para esta implementación) |
| *(no se carga — solo texto de limitación)* | Vigencia posterior del régimen | No podrá extenderse más allá de 2010-07-31, salvo 750 semanas (o su equivalente en tiempo de servicio) al 2005-07-25 → hasta 2014-12-31 | Función Pública — Gestor Normativo (texto literal) + Sentencia SU-023 de 2018, Corte Constitucional (relatoría oficial, sentencia de unificación) | Parágrafo Transitorio 4, Art. 1, Acto Legislativo 01 de 2005 | No aplica (límite temporal posterior a 1994, no un umbral de esa fecha) | Desde 2005-07-25 | **Ninguno — no se calcula**; se declara como limitación permanente (`REGIMEN_TRANSICION_VIGENCIA_NO_EVALUADA`), con lenguaje de "expectativa legítima" (término usado explícitamente por SU-023/2018), nunca "derecho adquirido" | Cálculo de si la persona alcanzó a consolidar los requisitos del régimen anterior antes de la fecha límite que le aplicaba | Verificado en una fuente oficial (norma y sentencia de unificación cotejadas directamente; falta cotejo cruzado en SUIN-Juriscol) |
| *(no se carga — solo texto de limitación)* | Efecto del traslado a RAIS | Los umbrales de edad de este artículo no aplican a quien se acoja voluntariamente al régimen de ahorro individual (RAIS) | Función Pública — Gestor Normativo (texto literal, mismo artículo) | Art. 36, inciso 4, Ley 100 de 1993 | No aplica | Desde 1994-04-01, sin cambio | **Ninguno — no se calcula**; se declara como limitación (`REGIMEN_TRANSICION_TRASLADO_NO_EVALUADO` o equivalente) solo cuando la pantalla sabe que hubo traslado | Excepciones de retorno a RPM y jurisprudencia sobre validez del traslado ("doble asesoría") — no investigadas, este alcance no las necesita | Verificado en una fuente oficial (texto literal confirmado; jurisprudencia de excepciones no investigada) |

## Observación arquitectónica (diferida a Sprint 4, no implementada ahora)

`fechaEntradaVigenciaSistemaPensional` se carga en esta versión como una fecha
única (1994-04-01) aplicada a todos los casos, aunque la investigación confirmó que
la fecha real varía según el tipo de afiliado (servidores públicos territoriales
tienen 1995-06-30). Este dato **deberá tratarse, en una versión futura, como un dato
normativo trazable potencialmente resoluble según el tipo de afiliado** — de forma
análoga a como `semanasMinimasPensionMujer` ya resuelve por sexo mediante un `valor`
estructurado. No se implementa esa capacidad en Sprint 3: ni el resolver legal ni el
esquema de `LegalRuleEntry` se modifican para soportarla todavía, por decisión
explícita de mantener el Vertical Slice de Sprint 3 enfocado en su objetivo
funcional (screening por edad) sin sobre-diseñar una generalización sin un segundo
caso real que la justifique (Principio 9). Queda registrado aquí como intención de
diseño para Sprint 4, no como trabajo pendiente de esta implementación.

## Fuentes consultadas (régimen de transición)

- [Artículo 36, Ley 100 de 1993 — Función Pública, Gestor Normativo](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5248)
- [Acto Legislativo 01 de 2005, Art. 1 y parágrafos transitorios — Función Pública, Gestor Normativo](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=17236)
- [Sentencia SU-023 de 2018 — Corte Constitucional, relatoría oficial](https://www.corteconstitucional.gov.co/relatoria/2018/su023-18.htm)
- [Régimen de Transición — Colpensiones, preguntas frecuentes](https://www.colpensiones.gov.co/preguntas-frecuentes/280/regimen-de-transicion/) (fuente secundaria, usada solo para orientación inicial, no como sustento de ningún campo)
- Ley 100 de 1993 en SUIN-Juriscol: intentado, error de certificado en esta sesión — pendiente de reintento antes de marcar cualquier campo como "Validado".

## Fuentes consultadas

- [Corte Constitucional suspende entrada en vigencia de la reforma pensional — Asofondos](https://asofondos.org.co/comunicados/corte-constitucional-suspende-entrada-vigencia-reforma-pensional/)
- [Auto 841/25 — Corte Constitucional](https://www.corteconstitucional.gov.co/relatoria/autos/2025/a841-25.htm)
- [Ley 2381 de 2024 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=246356)
- [Reforma pensional en Colombia 2026: qué está suspendido — 60Más Pensiones](https://www.60maspensiones.com/blog/reformapensional)
- [Pensión de vejez en 2026: semanas mínimas requeridas en Colombia — Actualícese](https://actualicese.com/semanas-minimas-para-pension-de-vejez-en-2026/)
- [Ley 100 de 1993 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5248)
- [Ley 797 de 2003 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=7223)
- [Sentencia C-197 de 2023 — Corte Constitucional](https://www.corteconstitucional.gov.co/relatoria/2023/c-197-23.htm)
- [Fundamentos e interrogantes de la reducción de semanas para mujeres (C-197/2023) — U. Externado](https://derlaboral.uexternado.edu.co/uncategorized/fundamentos-e-interrogantes-de-la-reduccion-de-las-semanas-de-cotizacion-para-la-pension-de-vejez-en-el-caso-de-las-mujeres-sentencia-c-197-de-2023/)
- [Colombia decreta aumento del salario mínimo para 2026 — Holland & Knight](https://www.hklaw.com/en/insights/publications/2025/12/colombia-decreta-aumento-del-salario-minimo-y-auxilio-de-transporte)
- [Suspensión provisional del decreto que fijó el salario mínimo 2026 — Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/02/suspension-provisional-del-decreto-que-fijo-el-salario-minimo)
- [Decreto 159 de 2026 — Alcaldía de Bogotá](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=192181&dt=S)
- [Límites a la base de aportes a seguridad social — Gerencie.com](https://www.gerencie.com/limites-a-la-base-de-aportes-al-sistema-de-seguridad-social.html)
- [Aumento en el tope máximo de cotización: de 25 a 45 SMLMV — CMS Law](https://cms.law/es/col/publication/aumento-en-el-tope-maximo-para-efectos-de-cotizacion-al-sistema-de-seguridad-social-integral-pasara-de-25-smlmv-a-45-smlmv)
- [Decreto 2322 de 2022 — SUIN-Juriscol](https://suin-juriscol.gov.co/viewDocument.asp?ruta=Decretos/30044946)
- [¿Qué es la tasa de reemplazo y cómo se calcula? — Gerencie.com](https://www.gerencie.com/que-es-la-tasa-de-reemplazo-y-como-se-calcula.html)
- [PIB de Colombia creció 2,6% en 2025, según el Dane — LaFM](https://www.lafm.com.co/economia/crecimiento-economico-colombia-dane-390680)
- [Economía colombiana creció 2,6% en 2025 — Minhacienda](https://www.minhacienda.gov.co/w/econom%C3%ADa-colombiana-creci%C3%B3-2-6-en-2025-impulsada-por-comercio-y-servicios)
- [Seguridad social y pensiones en Colombia 2026 — Buk](https://www.buk.co/blog/seguridad-social-y-pensiones-en-2025)

---

# Traslado de régimen (RAIS→RPM) e IBL — investigación S4-001 (Entregable 2, Sprint 4)

Investigación realizada por búsqueda web y cotejo directo de fuentes oficiales
primarias (fecha de consulta: 2026-08-19), a raíz de un hallazgo de revisión manual de
S4-001: Carlos (primer caso real de validación del Entregable 2) se trasladó
recientemente de RAIS a RPM y la pantalla de captura no podía explicarle qué historia
introducir. Alcance explícitamente **acotado**, no exhaustivo — mismo criterio ya usado
en la sección "Régimen de transición" de este archivo. No cubre la validez jurídica del
traslado en sí (doble asesoría, nulidad) — solo el tratamiento de la historia de
cotización para efectos del IBL.

## Matriz

| Campo | Regla | Texto normativo (resumen) | Fuente oficial | Artículo/parágrafo | Fecha histórica de evaluación | Vigencia | Alcance usado por este Slice | Aspectos expresamente NO evaluados | Estado de validación |
|---|---|---|---|---|---|---|---|---|---|
| *(no se carga — solo referencia)* `ventanaIBLAnclaFechaReconocimiento` | Ancla temporal de la ventana de 10 años del IBL | "el promedio de los salarios o rentas sobre los cuales ha cotizado el afiliado durante los diez (10) años anteriores al reconocimiento de la pensión, o en todo el tiempo si éste fuere inferior" | Función Pública — Gestor Normativo (texto literal cotejado) | Art. 21, inciso 1, Ley 100 de 1993 | No aplica (es la fecha misma) | Vigente desde 1993, sin cambio conocido en este punto | `calcularPensionRPM.js` usa `fecha = hoy` en su lugar, ya declarado como `LIMITACION_NO_ES_PROYECCION_FUTURA` — decisión de producto ya tomada, no una lectura de esta norma | Proyección a la fecha real de reconocimiento — exigiría IPC/SMLV futuro, ya excluido por decisión del proyecto | Verificado en fuente oficial (texto literal); la fecha usada por el código es una simplificación declarada, no una interpretación de esta norma |
| *(no se carga — referencia)* `iblAlternativaVidaLaboralUmbral` | Umbral de semanas para optar por el promedio de toda la vida laboral | "el trabajador podrá optar por este sistema, siempre y cuando haya cotizado 1250 semanas como mínimo" | Función Pública — Gestor Normativo (texto literal cotejado) | Art. 21, inciso 2, Ley 100 de 1993 | No aplica | Vigente desde 1993 | `obtenerSemanasHabilitanAlternativaIBL` ya resuelve un valor equivalente en `data/legal` — esta fila documenta su respaldo literal, no agrega un campo nuevo | Si el umbral de 1250 de este artículo y el de la Sentencia C-197/2023 (registrada arriba, sección "Régimen de transición", sobre el requisito de *pensión*, no de esta alternativa del IBL) son el mismo umbral o dos umbrales distintos — no cotejado en esta sesión | Verificado en fuente oficial (texto literal); relación con C-197/2023 pendiente de cotejo cruzado |
| *(no se carga — solo texto de limitación)* | Ausencia de mecanismo legal para huecos de cotización | El Art. 21 no contiene ningún mecanismo de relleno ni reducción porcentual para períodos sin cotización dentro de los 10 años | Función Pública — Gestor Normativo (verificado por ausencia — artículo leído íntegro) | Art. 21, Ley 100 de 1993 (texto completo revisado) | No aplica | Vigente desde 1993 | `seleccionarPeriodosIBL.js` ya rechaza evaluar historias con huecos en la ventana en vez de inventar un relleno | Si existe una regla de relleno en una fuente distinta al Art. 21 (reglamento, jurisprudencia) — no investigado | **Corregido (2026-08-19):** la ausencia de un mecanismo de relleno en el texto del Art. 21 sigue confirmada, pero la conclusión previa de que bloquear con `VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS` era "jurídicamente prudente" queda **superada por evidencia primaria** — ver sección "Ventana temporal del IBL ordinario" más abajo. El artículo no rellena huecos, pero tampoco exige un intervalo calendario continuo; la jurisprudencia muestra que un hueco no vuelve la historia no evaluable, la ventana simplemente retrocede para completarse. |
| *(no se carga — solo texto de limitación)* | Reconocimiento del tiempo cotizado en RAIS al volver a RPM | "el tiempo cotizado en el Régimen de Ahorro Individual le será computado al del Régimen de Prima Media" | Colpensiones — Normativa (Decreto 3800 de 2003, texto literal cotejado) | Art. 3, Decreto 3800 de 2003 | No aplica | Vigente desde 2003, sin cambio conocido | Confirma que las semanas de un traslado RAIS→RPM sí tienen respaldo normativo para reconocerse — ninguna función del dominio las descarta hoy, pero tampoco documentaba explícitamente este respaldo hasta ahora | Si "tiempo cotizado" reconocido equivale a "IBC histórico utilizable para el IBL" — el propio decreto no lo dice (ver fila siguiente) | Verificado en fuente oficial (texto literal del artículo 3) |
| *(no se carga — cuestión pendiente, sin fundamento normativo suficiente)* | Tratamiento del IBC histórico cotizado en RAIS dentro del promedio del IBL en RPM | Ninguna fuente encontrada (Art. 21; Art. 36; Decreto 3800/2003, Art. 3 y 4) resuelve si el IBC —no solo el tiempo— cotizado en RAIS debe incorporarse al promedio de los 10 años o de toda la vida laboral | — (ausencia confirmada en las fuentes ya revisadas) | — | — | — | **Ninguno — PensionLab no incluye ni excluye esta historia mediante una regla propia**; `historiaCotizacion` se trata igual sin distinguir régimen de origen, sin que eso sea una afirmación normativa | Todo el mecanismo de integración del IBC histórico de un traslado — requiere investigación adicional (reglamento específico, jurisprudencia, o consulta directa a Colpensiones) antes de poder resolverse | **Cuestión pendiente — no demostrable con las fuentes consultadas hasta ahora** |

## Cuestión pendiente, no resuelta (relevante para S4-001 y S4-002)

A diferencia de la sección "Régimen de transición" de este archivo (donde lo diferido es
una capacidad todavía no construida), aquí lo pendiente es un **vacío normativo real**,
no solo de implementación: la fuente más específica encontrada sobre el mecanismo de
traslado (Decreto 3800 de 2003) reconoce expresamente el **tiempo** cotizado en RAIS
(Art. 3), pero ni ese decreto ni el Art. 21 de la Ley 100 dicen si el **valor económico**
(IBC) de esa historia debe entrar al promedio del IBL en RPM, o si el traslado se resuelve
únicamente por la vía del capital (bono pensional / traslado de saldos, Art. 4 del mismo
decreto), dejando el IBL a cargo exclusivamente de la historia cotizada ya en RPM.

**Consecuencia para el producto, ya aprobada por Carlos/Atlas:** mientras esta pregunta
no tenga fundamento normativo suficiente, PensionLab no debe incluir ni excluir la
historia previa a un traslado mediante una regla inventada. Esto no excluye del
recorrido a un usuario trasladado — Carlos es precisamente uno de los casos reales de
validación del Entregable 2 —, pero sí limita lo que PensionLab puede afirmar sobre el
resultado en esos casos, y esa limitación debe quedar visible, nunca en silencio (ver
`docs/tecnico/arquitectura/entregable-2-pensionlab-responde-explora-y-explica.md`,
bloqueo §8.9).

Existe además un indicio, no verificado a fondo en esta sesión, de que el propio
mecanismo de traslado de recursos del RAIS al RPM administrado por Colpensiones **sigue
sin estar completamente reglamentado**: el Ministerio de Trabajo tiene, a la fecha de
esta consulta, un proyecto de decreto en trámite específicamente sobre ese traslado de
recursos (ver fuentes). No se investigó su contenido ni su estado de avance — se registra
solo como indicio de que esta pregunta puede seguir sin resolverse por vía reglamentaria
durante un tiempo.

## Fuentes consultadas (traslado de régimen e IBL)

- [Ley 100 de 1993, Art. 21 — Función Pública, Gestor Normativo](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5248)
- [Decreto 3800 de 2003 — Colpensiones, Normativa](https://normativa.colpensiones.gov.co/colpens/docs/decreto_3800_2003.htm)
- [Decreto 3800 de 2003 — SUIN-Juriscol](https://www.suin-juriscol.gov.co/viewDocument.asp?id=1537201)
- [¿Qué se requiere para trasladarse de régimen? — Colpensiones](https://www.colpensiones.gov.co/publicaciones/123/que-se-requiere-para-trasladarse-de-regimen/)
- [Consultar y entender la Historia Laboral — Colpensiones](https://www.colpensiones.gov.co/pensiones/publicaciones/127/consultar-y-entender-la-historia-laboral/)
- [Traslado — Preguntas frecuentes, Colpensiones](https://www.colpensiones.gov.co/preguntas-frecuentes/276/traslado/)
- [Ministerio de Trabajo publica proyecto de decreto sobre traslado de recursos del RAIS al RPM — Colpensiones](https://www.colpensiones.gov.co/publicaciones/5149/ministerio-de-trabajo-publica-proyecto-de-decreto-que-reglamenta-el-traslado-de-recuros-del-rais-al-rpm-administrado-por-colpensiones/) (indicio de reglamentación en trámite, contenido no investigado)

---

# Ventana temporal del IBL ordinario — selección por períodos efectivamente cotizados (investigación previa a S4-002, Entregable 2, Sprint 4)

Investigación realizada por cotejo directo de fuente primaria (fecha de consulta:
2026-08-19), a raíz de la decisión obligatoria de convención económica de proyección
RPM previa a S4-002. Motivada por la necesidad de verificar si `calcularVentana()`
(`seleccionarPeriodosIBL.js`) — que modela "los últimos 10 años" como un intervalo de
años calendario completos — representa correctamente el Art. 21 de la Ley 100 de 1993,
o si es una simplificación técnica no confirmada. Alcance explícitamente acotado: esta
sección resuelve la pregunta macro (¿la ventana es calendario fija o retrospectiva por
cotización efectiva?), **no** el criterio exacto de corte al día — ver "Bloqueo" abajo.

## Fuente normativa

**Art. 21, inciso 1, Ley 100 de 1993** (texto ya cotejado en la sección "Traslado de
régimen" de este mismo archivo): *"el promedio de los salarios o rentas sobre los
cuales ha cotizado el afiliado durante los diez (10) años anteriores al reconocimiento
de la pensión, o en todo el tiempo si éste fuere inferior para el caso de las pensiones
de invalidez o sobrevivencia"*. El texto no distingue expresamente entre años calendario
y años efectivamente cotizados — de ahí la necesidad de esta investigación.

## Evidencia jurisprudencial primaria

**SL1006-2025**, Corte Suprema de Justicia, Sala de Casación Laboral. Magistrado
ponente: Luis Benedicto Herrera Díaz. Radicación n.° 05001-31-05-016-2019-00476-01.
Bogotá D.C., 12 de febrero de 2025. Texto completo obtenido y cotejado directamente del
archivo digital oficial de la Corte
(`archivodigitalapi.cortesuprema.gov.co/share/2025/5/Sentencias/SL1006-2025.pdf`).

Aplicando expresamente el artículo 21 de la Ley 100 de 1993 ("le es aplicable el
artículo 21 de la norma en cita"), la Sala construye el IBL de la demandante (María
Ruth Moncada Marín) con una tabla titulada literalmente:

> *"1. INGRESO BASE DE LIQUIDACIÓN CORRESPONDIENTE A LOS 10 ÚLTIMOS AÑOS EFECTIVAMENTE
> COTIZADOS"*

El párrafo introductorio de la tabla dice, también literalmente: *"...se realizará la
liquidación de la prestación teniendo en cuenta las semanas cotizadas que aparecen en
la documental... que corresponde a los últimos diez años de cotización de la actora..."*

**El hallazgo central:** la tabla recorre los períodos de cotización reales de la
afiliada desde el 28/11/1983 hasta el 28/02/2005, pero entre el 3/10/1991 y el
1/04/2002 hay un **vacío de cotización de más de 10 años calendario** — ningún registro,
ningún IBC, ninguna declaración de "no evaluable". La tabla **salta ese vacío por
completo** y retoma los períodos reales de 2002-2005, sumando al final: *"TOTALES 3.653
[días] 521,86 [semanas]"*.

Es decir: ante una interrupción real de más de una década dentro de lo que sería la
ventana calendario de "últimos 10 años antes del reconocimiento" (27-nov-2005), la Sala
**no** aplicó un intervalo cronológico fijo — retrocedió en el calendario hasta 1983
para completar aproximadamente 10 años de cotización efectivamente reportada.

Como referencia adicional, de menor peso porque no se obtuvo su texto literal: el
resumen oficial de la propia Sala de Casación Laboral sobre **SL7061-2016** (magistrado
ponente Gerardo Botero Zuluaga, "Precisiones y cambios de criterio, Edición n.° 3",
publicación institucional de la Corte) describe una lógica análoga —"transpolando desde
la última cotización... hacia atrás"— para el IBL de Ley 33 de 1985 en un subcaso de
régimen de transición. No es el mismo artículo que el que usa PensionLab (Ley 33/1985,
no Art. 21 de la Ley 100/1993), así que se registra como refuerzo del mismo principio en
un régimen distinto, no como evidencia directa.

**SL1236-2025 no se cotejó en fuente primaria en esta investigación** — el PDF oficial
localizado no tiene una capa de texto extraíble con las herramientas disponibles. Solo
existe evidencia de fuentes secundarias (Gerencie.com) que describe, para ese caso,
"514,29 semanas cotizadas" a partir de "123 cotizaciones" — un número compatible con la
misma lógica de acumulación retrospectiva, pero no verificado literalmente.

## Interpretación técnica que PensionLab deriva (macro, confirmada)

La ventana de "los últimos 10 años" del Art. 21 **no se modela correctamente como un
intervalo fijo de años calendario**. La evidencia primaria confirma que:

1. Los huecos de cotización dentro de lo que sería la ventana calendario **no** vuelven
   el IBL no evaluable.
2. La ventana relevante se construye retrocediendo en el calendario, a partir del
   período efectivamente cotizado más reciente antes del reconocimiento, hasta acumular
   el equivalente a 10 años de cotización real — saltando los períodos sin cotización
   sin que estos "cuenten" ni "bloqueen".

Esto confirma y precisa la limitación que `seleccionarPeriodosIBL.js` ya declaraba
sobre sí mismo desde su creación ("esta frontera la sortea exigiendo cobertura completa
en vez de resolverla; no es una interpretación legal ni una regla permanente de
PensionLab") — con evidencia primaria concreta de cuál sería la regla correcta, no solo
con la sospecha de que la simplificación calendario era insuficiente.

## Reconstrucción matemática del corte inicial (2026-08-19)

Revisando fila por fila la tabla completa de SL1006-2025, solo una fila afecta el límite
**inicial** de la ventana de 10 años sin corresponder a un mes calendario completo:

> `28/11/1983  30/11/1983   3 $ 1.758,90   0,43     $ 69.761,77        $ 57,29`

3 días, 0,43 semanas (3/7) — el **primer tramo** de toda la tabla. El total impreso es
*"TOTALES 3.653 [días] 521,86 [semanas]"*. **3.653 − 3 = 3.650 — exactamente 365 × 10.**

Dentro de los meses completos de la tabla, los años bisiestos se cuentan con su día real
(ej. `1/02/1988 29/02/1988 29 ... 4,14` — febrero de 1988 con sus 29 días correctos), así
que el ajuste de 3 días no es un artefacto de redondeo de bisiestos.

**Lectura de Carlos/Atlas sobre esta reconstrucción (2026-08-19):** la combinación de (a)
un tramo inicial parcial de exactamente 3 días, (b) un total que sin ese tramo cae en un
número redondo (3.650 = 365×10), y (c) el tratamiento correcto de bisiestos en el resto de
la tabla, es **suficientemente fuerte para cerrar la hipótesis de que el 28/11/1983 fuera
solo el comienzo accidental de la documentación disponible en ese expediente** — hay un
corte deliberado a nivel de día en este caso. Sigue siendo, sin embargo, **un solo caso
primario**, no una formulación general de la regla declarada en prosa por la Corte.

## Segunda investigación — búsqueda de un segundo caso primario (2026-08-19)

Investigación adicional, extremadamente acotada, buscando un segundo caso primario que
confirmara o refutara 3.650 días como patrón reproducible (no solo el resultado particular
de SL1006-2025). Resultado:

- **SL1236-2025 no localizada** ni por número de sentencia (intentado en la investigación
  anterior) ni por radicación/partes/otros metadatos — la única fuente que la cita
  (Gerencie.com) no aporta esos datos, y no apareció en el archivo oficial ni en ninguna
  búsqueda dirigida.
- **Segunda sentencia primaria real localizada: SL1378-2025** (Corte Suprema, Sala de
  Casación Laboral, magistrada ponente Ana María Muñoz Segura, radicación
  05001-31-05-006-2020-00228-01, Bogotá, 6 de mayo de 2025), con su propia tabla de IBL
  (columnas paralelas "toda la vida" / "últimos 10 años", mismo patrón de fracciones
  semanales por mes parcial que SL1006-2025). **No se pudo reconstruir su total**: el PDF
  original dispone esas dos columnas lado a lado, y las herramientas de extracción de
  texto disponibles en esta sesión no logran separarlas de forma confiable. Confirma el
  formato recurrente de tabla día/semana de la Sala, pero no aporta un segundo dato
  numérico verificado.
- **Hallazgo colateral relevante**: comunicado oficial de la Corte Suprema
  (`cortesuprema.gov.co`, no un blog) sobre **SL138-2024** (16-feb-2024): *"Semanas de
  cotización a pensión se deben contabilizar con días calendario, no con meses de 30
  días"* — cambio de criterio de una convención previa de 360 días/año (30 días/mes) a
  días calendario reales (28-31 según el mes; 365 o 366 según el año). Esta sentencia
  trata el **requisito mínimo de semanas del Art. 33** (elegibilidad), no la ventana del
  Art. 21 (IBL) — no se puede extender automáticamente su alcance al selector del IBL. Sí
  es coherente con, y refuerza indirectamente, que SL1006-2025 (posterior, feb-2025) haya
  usado días calendario reales y no la convención de 360 días.

**Conclusión de esta segunda investigación:** no apareció un segundo caso primario que
permita confirmar 3.650 días como metodología reproducible más allá de SL1006-2025.

## Bloqueo explícito: criterio exacto de corte

**Sigue sin poder demostrarse un algoritmo general, declarado en prosa por la Corte, para
determinar exactamente cuándo se completan los "10 años efectivamente cotizados".** Lo que
sí está demostrado es que en SL1006-2025 el corte fue deliberado y aritméticamente
consistente con 3.650 días — pero es un solo caso, y la relación entre ese número y
cualquier cifra distinta atribuida secundariamente a SL1236-2025 (514,29 semanas / 3.600
días, no verificada en fuente primaria) permanece sin resolver.

## Fuentes consultadas (ventana temporal del IBL)

- [SL1006-2025 — Corte Suprema de Justicia, Sala de Casación Laboral, archivo digital oficial](https://archivodigitalapi.cortesuprema.gov.co/share/2025/5/Sentencias/SL1006-2025.pdf) (texto completo cotejado)
- ["Precisiones y cambios de criterio, Edición n.° 3" — Corte Suprema de Justicia, Sala de Casación Laboral, publicación institucional](https://cortesuprema.gov.co/corte/wp-content/uploads/relatorias/la/Publicacion/precisiones%20y%20criterios.pdf) (resumen oficial de SL7061-2016 cotejado)
- [Semanas de cotización a pensión se deben contabilizar con días calendario, no con meses de 30 días — Corte Suprema de Justicia, comunicado oficial](https://cortesuprema.gov.co/semanas-de-cotizacion-a-pension-se-deben-contabilizar-con-dias-calendario-no-con-meses-de-30-dias/) (sobre SL138-2024; alcance limitado al Art. 33, no al Art. 21)
- [¿Cómo se contabilizan los últimos 10 años cotizados a pensión? — Gerencie.com](https://www.gerencie.com/como-se-contabilizan-los-ultimos-10-anos-cotizados-a-pension.html) (fuente secundaria, usada solo para localizar la referencia a SL1236-2025, no como sustento de ningún valor)

---

# Convención técnica provisional — 3.650 días efectivamente cotizados (decisión de producto, 2026-08-19)

**Decisión Carlos/Atlas (2026-08-19): PensionLab adopta 3.650 días calendario
efectivamente cotizados como convención técnica provisional para la ventana ordinaria del
IBL, en reemplazo de la ventana de años calendario que usa hoy `calcularVentana()`.**

**Esto NO es una constante legal universal del Art. 21 de la Ley 100 de 1993.** No debe
documentarse ni codificarse como tal en ningún punto del sistema — es una decisión de
producto de PensionLab, respaldada por evidencia primaria fuerte de un solo caso, no una
regla que la Corte haya declarado en esos términos generales.

## Fundamento

1. Reconstrucción matemática verificable de SL1006-2025 (ver sección anterior): 3.653 días
   totales, de los cuales 3 corresponden a un tramo inicial recortado → 3.650 días
   completos restantes.
2. El tramo inicial parcial (3 días, no un mes completo) es compatible con un corte
   deliberado a nivel de día, no con un artefacto de qué documentación existía en el
   expediente.
3. Tratamiento correcto de años bisiestos dentro de la tabla (no hay redondeo oculto que
   explique el ajuste de otra forma).
4. Coherencia indirecta con el criterio oficial posterior de la Corte (SL138-2024) de
   contabilizar semanas con días calendario reales, no con la convención de 360 días.

## Qué NO demuestra esta evidencia

- Que 3.650 sea la cifra que aplicaría en cualquier otro caso — es la reconstrucción de
  **un solo expediente**.
- Que la Corte haya declarado esta cifra como regla general en ninguna sentencia — nunca
  aparece en prosa, solo se deduce aritméticamente de una tabla.
- Que resuelva la discrepancia con los 514,29 semanas/3.600 días atribuidos
  secundariamente (no en fuente primaria) a SL1236-2025.

## Qué evidencia futura obligaría a reabrir esta decisión

- Texto primario de SL1236-2025 que confirme una cifra distinta a 3.650 para el mismo tipo
  de cálculo.
- Un segundo caso primario (por ejemplo, una reconstrucción confiable de SL1378-2025, si en
  el futuro se logra separar sus columnas, u otra sentencia con un tramo inicial parcial)
  que arroje una cifra distinta.
- Una sentencia de unificación de la Sala de Casación Laboral, o una circular/manual
  oficial de Colpensiones, que declare explícitamente el criterio de corte del Art. 21.
- Cualquier hallazgo que muestre que el ajuste de 3 días en SL1006-2025 responde a una
  causa distinta a completar 3.650 días (por ejemplo, si se lograra el texto primario y
  este explicara el corte por otra razón).

Mientras ninguna de estas condiciones se cumpla, 3.650 días permanece como la convención
técnica activa de PensionLab, revisable, no como hecho normativo cerrado.
