# PL-260 — Próximo MVP: motor auditable y explicación tipo Baldor

Plan de implementación corregido. Conserva la arquitectura en etapas (Contratos A-F) y el
plan de entregas E1-E10 ya presentados a Carlos/Atlas, con las correcciones exigidas antes
de iniciar la implementación de E2. Este documento **no resuelve** ninguna decisión
jurídica pendiente — las registra explícitamente como bloqueadas (Carril 2) para que
Carlos/Atlas las cierren con validación humana antes de que cualquier entrega que dependa
de ellas pueda avanzar.

## 0. Corrección de rumbo respecto al plan anterior

1. **E6 depende obligatoriamente de E3, E4 y E5** (no solo puede empezar antes por
   paralelismo de equipo) — la experiencia visual tipo Baldor no puede diseñarse sobre
   contratos que todavía no existen o pueden cambiar de forma (piso/ajustes legales de E3,
   caminos/búsqueda inversa de E4, contrato del ejercicio de E5). Diseñar wireframes antes
   está bien (ya hecho); implementar componentes que lean datos reales de esos contratos, no.
2. **E8 y E9 dependen del cierre de todas las reglas jurídicas necesarias para los casos
   que mostrarán** — no basta con que el código esté listo; ningún caso de validación
   manual o de prueba final con Oscar puede exhibirse en Preview si su resultado depende de
   una política todavía `NO_RESUELTA` (ver §2 de este documento) o de una fuente legal sin
   el cotejo cruzado exigido por el expediente jurídico previo.
3. **Las pruebas se crean en cada entrega**, no al final: cada E2-E6 incluye su propia
   matriz de pruebas como parte de su alcance y su criterio de aceptación. **E7 es
   auditoría y ampliación adversarial** sobre lo ya probado — busca huecos, combina casos
   de distintas entregas, prueba límites que ninguna entrega individual cubrió — nunca el
   momento en que las pruebas básicas se escriben por primera vez.
4. **Los 41 casos del informe anterior son una base mínima**, no el techo de cobertura.
   Cada entrega debe complementarlos con pruebas de propiedades (invariantes que deben
   sostenerse sobre un rango de entradas, no un punto fijo), pruebas de límites (fronteras
   exactas: igual al piso, igual al mínimo legal, horizonte exactamente en 3.650 días) y
   combinaciones (2-3 factores variando a la vez: sexo × horizonte × fuente de semanas).
5. **Los valores compartidos entre contratos se identifican mediante `valueId`/`refId`
   estables** — ningún contrato posterior copia un número de un contrato anterior sin
   conservar de dónde vino. Ya implementado en E2 (`VALUE_IDS_ELEGIBILIDAD_RPM` en
   `evaluarElegibilidadProyectadaRPM.js`) como precedente concreto para E3-E5.
6. **Ningún Preview puede presentar como resultado confiable una cifra construida sobre una
   política `NO_RESUELTA`** — un Preview puede *mostrar* el estado bloqueado (para revisión
   visual de cómo se ve un bloqueo), nunca una cifra que dependa silenciosamente de haber
   elegido una interpretación no autorizada.
7. **Producción permanece prohibida hasta E10**, sin excepción, en cualquier entrega
   intermedia.

## 0.1 Decisiones de la revisión crítica independiente (Carlos/Atlas, 2026-09-04)

Tras una revisión arquitectónica adversarial solicitada explícitamente a Claude (actuando
como "arquitecto principal, revisor adversarial y crítico del producto", sin limitarse a
confirmar el plan A-F/E1-E10), se tomaron las siguientes decisiones. Se registran aquí sin
eliminar nada de lo ya decidido en §0 — algunas de estas decisiones **simplifican** partes
del plan original, no lo sustituyen.

1. **Se acepta el refactor incremental sobre el motor actual.** Se descarta explícitamente
   la alternativa de construir un motor RPM v2 en paralelo — la corrección de esta misma
   sesión (extracción de `resolverSemanasProyectadasRPM.js` y `resolverHorizonteFuturoRPM.js`,
   reescritura completa de la búsqueda de fechas) se hizo directamente sobre
   `calcularProyeccionRPM.js`/`generarCaminosRPM.js` y se verificó sin ninguna regresión
   contra la suite completa del proyecto (1074/1074 tests) — evidencia directa de que el
   refactor incremental es seguro y suficiente para este codebase.
2. **Se acepta simplificar la arquitectura y eliminar formalismos que no aporten una
   garantía real.** La revisión crítica encontró que los Contratos B, C y E, formalizados
   como módulos independientes con sus propios archivos, y las dos políticas jurídicas
   formalizadas como enums con gates propagados a 4 capas de CI, eran más ceremonia de la
   que el problema requiere. Decisión: **Contrato D (ajustes legales / piso) se implementará
   como una función pequeña junto a `formulaRPM.js`, no como un módulo "Contrato D" con su
   propio archivo de contrato formal** — mismo criterio ya aplicado con éxito en
   `evaluarDisponibilidadCuantiaRPM.js` (Contrato B reducido a lo estrictamente necesario en
   E2). Los Contratos B/C/E "completos" del diseño original quedan descartados como
   objetivo de diseño; lo que ya existe (funciones puras con su propio contrato de entrada/
   salida documentado) es suficiente.
3. **Se conservan siempre dos valores diferentes, nunca se reemplaza uno por otro en
   silencio: (a) el resultado matemático de la fórmula, y (b) la pensión proyectada después
   de ajustes legales.** Esta distinción, ya presente en el diseño de Contrato D del plan
   original, se ratifica como principio de diseño obligatorio para E3 — `formulaRPM.js`
   sigue devolviendo (a) sin cambios; cualquier función de ajuste legal (piso) debe devolver
   AMBOS valores en su salida, nunca solo el ajustado.
4. **El registro reutilizable de hechos (hoy `construirHechosEscenario.js`, dentro de
   `src/ia/`) no puede permanecer como dependencia exclusiva de `src/ia`.** Más adelante
   (E5) deberá extraerse a una capa neutral de transparencia (candidato:
   `src/domain/transparency/`), consumida tanto por el ejercicio Baldor como por la
   explicación de IA — nunca duplicada entre ambas. No se ejecuta esa extracción en esta
   tarea (fuera de alcance explícito de la corrección de E2); queda registrada como
   decisión de diseño ya tomada para cuando se implemente E5.
   **Actualización (E5.2, cerrado):** la extracción se realizó a `src/transparency/` —no
   al candidato `src/domain/transparency/` mencionado arriba— porque el archivo depende
   de `src/format/` para formatear cifras y `src/domain/` nunca importa de `src/format/`;
   ver §8.6 para el detalle de la implementación.
5. **La controversia del ancla de incrementos para mujeres NO se difiere fuera del próximo
   MVP.** A diferencia de lo que el plan original dejaba abierto indefinidamente, ahora está
   registrado explícitamente: puede bloquear entregas concretas (E3 para el rango de
   mujeres afectado), pero **debe estar resuelta antes de publicar** (E10) — no es una
   decisión que se pueda posponer a una versión futura del producto.
6. **La experiencia Baldor tendrá dos niveles visuales — respuesta esencial y ejercicio
   completo paso a paso — y el ejercicio completo NO se difiere.** Corrige la
   recomendación de la revisión crítica (que sugería posponer el ejercicio completo) — Carlos
   decidió que el ejercicio completo es parte obligatoria del próximo MVP, no una mejora
   futura. **Nota de corrección (E6.1, 2026-09-20):** en versiones anteriores de este
   documento, distintas menciones sueltas a E6 hablaban de "Niveles 1-3" — nunca hubo un
   tercer nivel documentado; esta es, y siempre fue, la única definición real: dos niveles
   ("Nivel esencial" y "Nivel completo", nomenclatura fijada en E6.1, §9). Toda mención
   posterior de "Niveles 1-3" en este documento queda corregida.
7. **La Garantía de Pensión Mínima (GPM) de RAIS queda fuera de este MVP**, bajo la
   condición explícita de que su ausencia siga declarada (ya lo está,
   `LIMITACION_ANUALIZACION_SIMPLIFICADA` en `calcularProyeccionRAIS.js`) y de que **nunca
   se presente una comparación RPM–RAIS como jurídicamente equivalente** mientras uno tenga
   piso corregido y el otro no — condición vinculante para cualquier entrega futura que
   muestre ambos regímenes lado a lado.
8. **Antes de cualquier otro desarrollo debía corregirse y consolidarse E2.** Esta misma
   tarea es esa corrección — ver el informe de entrega correspondiente para el detalle
   completo (errores encontrados, algoritmo definitivo de fecha conjunta, evidencia de
   verificación, archivos y pruebas).

## 0.2 Corrección de riesgo funcional en E2 (Carlos/Atlas, 2026-09-04) — historia con períodos futuros

Tras la corrección de §0.1, una revisión adicional encontró que `evaluarElegibilidadProyectadaRPM.js`
no validaba períodos de `historiaCotizacion` temporalmente inconsistentes con `fechaCalculo`
(completamente futuros, parcialmente futuros, con fechas invertidas, con fechas inválidas, o
un valor que no fuera un arreglo), aunque `calcularProyeccionRPM.js` ya rechazaba el caso de
período futuro desde S4-002. Esto permitía doble conteo del tramo futuro y que
`generarCaminosRPM.js` concluyera sobre requisitos antes de que `calcularProyeccionRPM.js`
llegara a rechazar la misma historia. Corregido con `validarHistoriaCotizacionTemporal.js`
(nuevo módulo compartido), consumido como hard stop incondicional — incluso con una
declaración agregada válida presente — antes de sumar cualquier semana de la historia. Ver
el informe de entrega correspondiente para el detalle completo.

**Cierre de integridad (Carlos/Atlas, 2026-09-04, segunda vuelta) — riesgo retirado:** el
informe de la corrección anterior dejó explícitamente abierto que `calcularProyeccionRPM.js`
seguía siendo vulnerable, si se invoca directamente (sin pasar por
`evaluarElegibilidadProyectadaRPM.js`/`generarCaminosRPM.js`), a `historiaCotizacion`
no-arreglo (crash sin capturar), fechas invertidas (rechazadas indirectamente, con un código
de razón distinto, en `seleccionarPeriodosIBL.js`) y fechas con formato inválido
(comportamiento inconsistente, podía producir `NaN` silencioso). **Este riesgo queda
cerrado**: `calcularProyeccionRPM.js` ahora consume `validarHistoriaCotizacionTemporal.js`
directamente, al comienzo de su propio cuerpo, antes de seleccionar períodos, calcular días
o producir cualquier cifra — reutilizando exactamente los mismos cuatro códigos de razón que
`evaluarElegibilidadProyectadaRPM.js` ya exponía, sin ninguna regla duplicada. Verificado con
pruebas de invocación directa (`calcularProyeccionRPM.test.js`) y con una prueba de
consistencia cruzada dedicada
(`historiaCotizacionTemporal.consistencia.test.js`) que confirma que
`validarHistoriaCotizacionTemporal`, `evaluarElegibilidadProyectadaRPM`,
`calcularProyeccionRPM` (invocado directamente) y `generarCaminosRPM` reconocen la misma
historia inválida con el mismo código canónico, y que ninguno de los cuatro produce
elegibilidad, IBL, pensión ni recomendación económica a partir de ella. `calcularProyeccionRPM.js`
es ahora una frontera pública que defiende sus propias precondiciones, sin depender de que
quien la invoque ya haya validado nada.

**Registro para E6/publicación (punto 5, no resuelto en E2):** el supuesto de continuidad
futura (auditado en §0.1 vía `ritmoCotizacionFutura`, sin campo de entrada que lo confirme o
lo niegue) queda formalmente como **bloqueo obligatorio antes de E6/publicación**:
**PensionLab no podrá mostrar semanas futuras como conclusión principal sin que, como
mínimo, (a) el usuario haya declarado explícitamente que continuará cotizando, o (b) la
interfaz presente de forma inmediata y prominente que se trata de un supuesto modificable,
no un hecho verificado.** La decisión de qué mecanismo de captura usar (declaración
explícita, o solo disclosure prominente) se tomará antes de diseñar la experiencia Baldor
(E5), no durante ni después — condiciona qué puede afirmarse en el Nivel 1 de esa
experiencia.

## 1. Arquitectura en etapas (Contratos A-F)

Principio rector, sin cambios: cada contrato consume exclusivamente la salida de la etapa
anterior — ninguna etapa recalcula una fecha, semana, tasa o peso que otra ya resolvió.

```
A. ElegibilidadProyectada   → IMPLEMENTADO Y CORREGIDO (E2, esta rama). Estado renombrado:
                               CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO (antes ELEGIBLE_PROYECTADO,
                               retirado por poder leerse como promesa de derecho reconocido).
                               fechaCumpleEdad/fechaCompletaSemanas/fechaReconocimientoConjunta
                               ahora se resuelven con búsqueda binaria monótona (ver
                               evaluarElegibilidadProyectadaRPM.js), nunca con un blanco fijo.
B. ConstruccionIBL          → §0.1.2: NO se formaliza como módulo propio. Lo que existe
                               (evaluarDisponibilidadCuantiaRPM.js, E2) es suficiente;
                               múltiples fuentes de captura (importación, dato agregado)
                               quedan para una entrega posterior, fuera de alcance de E2.
C. FormulaMatematica        → §0.1.2: NO se formaliza como módulo propio. Sigue siendo
                               formulaRPM.js/calcularTasaReemplazoRPM (sin tocar).
D. AjustesLegales           → §0.1.2: se implementará como una función pequeña (candidato:
                               junto a formulaRPM.js), no como un módulo "Contrato D" — E3,
                               BLOQUEADO por Carril 2 para el rango de mujeres afectado por
                               la ancla de incremento (§0.1.5: debe resolverse antes de E10,
                               no diferirse indefinidamente). Debe devolver SIEMPRE el
                               resultado matemático Y la cuantía ajustada por separado
                               (§0.1.3), nunca solo una de las dos.
E. ResultadoCamino          → §0.1.2: NO se formaliza como módulo propio — ya es la forma de
                               `escenario` en generarCaminosRPM.js. E4 lo actualiza para leer
                               de D en vez de C directamente.
F. EjercicioResueltoRPM     → E5, obligatorio antes de publicar (§0.1.6, no diferible). Debe
                               reutilizar/extender construirHechosEscenario.js, ya extraído a
                               una capa neutral (`src/transparency/`, E5.2 cerrado — §8.6), no
                               duplicar su mecanismo.
```

Cadena de dependencia entre etapas (verificable, no solo deseable):

```
A → no depende de nada más
B → no depende de A; ambas dependen solo de la entrada del usuario
C → depende de B.estado ∈ {CALCULABLE, APROXIMABLE_BAJO_SUPUESTO}
D → depende de A.estado === CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO y de C ya resuelto
E → combina A + D (nunca C directamente)
F → consume A + B + C + D + E, nunca calcula
```

## 2. Decisiones bloqueadas (Carril 2) — registradas, no resueltas aquí

### `PoliticaAnclaIncrementoMujer`

```
ANCLA_FIJA_1300 | ANCLA_MINIMO_APLICABLE | NO_RESUELTA
```

Estado actual: `NO_RESUELTA`. El expediente jurídico encontró un fundamento textual real
para la interpretación `ANCLA_MINIMO_APLICABLE` (el Art. 34 modificado por el Art. 10 Ley
797/2003 se remite a "las semanas mínimas requeridas", no a una constante de 1.300), pero
**no se pudo verificar el texto resolutivo de la Sentencia C-197/2023** para confirmar si
esa lectura sigue siendo válida o si la Corte la limitó. Mientras esta política esté
`NO_RESUELTA`: ningún resultado económico para una mujer con semanas entre su mínimo de
elegibilidad y 1.300 puede marcarse `publicable`; el Contrato C debe devolver
`anclaIncremento: null` en ese rango específico (fuera de ese rango, ambas interpretaciones
coinciden numéricamente y sí pueden calcularse — ver evidencia en el turno anterior).

### `PoliticaDatosIBLHorizonteCorto`

```
SOLO_HISTORIA_ESTRUCTURADA | DATO_HISTORICO_AGREGADO_DECLARADO | IMPORTACION_HISTORIA |
ESTIMACION_BAJO_SUPUESTO_CONSENTIDO | NO_RESUELTA
```

Estado actual en el motor: implícitamente solo `SOLO_HISTORIA_ESTRUCTURADA` (lo único que
`calcularProyeccionRPM.js` sabe aceptar hoy). E2 no cambia esto — `evaluarDisponibilidadCuantiaRPM.js`
lo declara explícitamente (`CUANTIA_APROXIMABLE_BAJO_DATOS_DECLARADOS` documentado como no
alcanzable en este Slice, con test dedicado que lo confirma). Habilitar cualquiera de las
otras políticas es una decisión de producto pendiente, no jurídica — pero el expediente
jurídico sí encontró que la cláusula "en todo el tiempo si éste fuere inferior" del Art. 21
está textualmente restringida a invalidez/sobrevivencia, no a vejez — así que
`ESTIMACION_BAJO_SUPUESTO_CONSENTIDO` no tiene el respaldo legal que originalmente se
esperaba y debe tratarse como una decisión de producto explícita (supuesto declarado, nunca
lectura de la norma), no como algo que la ley ya autoriza.

### Consecuencias mientras cualquiera de las dos políticas necesarias esté `NO_RESUELTA`

- El resultado económico afectado no puede marcarse `publicable`.
- No puede generarse ninguna recomendación de aporte adicional sobre ese resultado.
- El ejercicio tipo Baldor (F) debe incluir un paso `completo: false` que explique
  exactamente qué regla falta, nunca omitir el paso en silencio.
- Ninguna capa selecciona un valor por defecto sin que quede declarado como una decisión de
  producto explícita y separada de la lectura jurídica.

## 3. Plan de entregas E1-E10 (corregido)

| | Alcance | Pruebas (creadas en la propia entrega) | Dependencia jurídica | Commit | Deploy |
|---|---|---|---|---|---|
| **E1** | Cierre jurídico y versionado: cotejo cruzado de C-197/2023 (resolutivos), C-264/2026, estado actual del Decreto 1469/2025, y carga de la entrada del piso de pensión mínima (Art. 35 + cláusula final del Art. 34) como borrador cotejado. | Tests de `resolverReglasVigentes`/`obtenerSemanasMinimas` sobre las entradas nuevas/actualizadas. | Total — bloquea todo lo demás salvo E2. | Permitido (solo `data/legal/`) | Prohibido |
| **E2** | Separación elegibilidad/cuantía (Contratos A + parte de B). | Creadas en esta misma entrega — ver §5. | Ninguna (Carril 1). | **Cerrado** — commit `f88b05a9bfd27ec511c2438e2d3ef6f8f7260bce` | Prohibido |
| **E3** | Piso de pensión mínima y Contrato D (ajustes legales). | Creadas en E3: piso mayor/igual/menor al resultado matemático; objetivo mayor/igual/menor al piso; ningún aporte cuando el base ajustado ya alcanza el objetivo. | **Bloqueado por Carril 2** (ancla de incremento mujer, si el caso cae en el rango divergente) y por el cierre de E1 (fuente del piso). | **Cerrado** — ver §6.1 para los 5 commits | Prohibido |
| **E4** | Caminos, búsqueda inversa, barrido — reconstruidos sobre D, no sobre C. Nueva demostración de monotonicidad con piso incluido. | Creadas en E4: curva plana durante el piso y creciente después; coherencia entre camino base/alternativo tras el piso. | Depende de E3. | **Cerrado** — commit `aabf01d2ca8cf0bf900bcd8da5a1ac21ffadefce` (implementación) + `5a4e545d3f9e08f87f88cfb0b73643179d2c9c53` (corrección correctiva E4-C1, ver §7) | Prohibido |
| **E5** | Contrato `EjercicioResueltoRPM` (F) con invariantes I1-I8 como tests. | Creadas en E5: los 8 invariantes, ejecutados sobre los fixtures de E2-E4. | Ninguna adicional a las de E3/E4. | **Cerrado** — E5.1 (diseño), E5.2, E5.3, E5.4-A y E5.4 (implementación completa) — ver §8.6. | Prohibido |
| **E6** | Experiencia visual — dos niveles (Nivel esencial y Nivel completo, ver §9), contrato visual determinista definido en E6.1. **Depende obligatoriamente de E3, E4 y E5** — no empieza antes. | Creadas en E6: accesibilidad (teclado, lectores de pantalla), coherencia visual tarjeta/gráfica/Nivel completo. | Las mismas de E3-E5, heredadas. | **E6.1 (diseño del contrato visual) aprobado, sin código — ver §9.** E6.2 (adaptador visual puro y dormido) implementado, auditado y cerrado. E6.3 (integración real pero dormida) implementado, auditado y cerrado. E6.4 (control aislado de confirmación de continuidad, sin conexión todavía) implementado, auditado y cerrado. Implementación visible (E6.5 en adelante) sigue **prohibida hasta autorización explícita**. | Prohibido |
| **E7** | Auditoría y ampliación adversarial — no el momento inicial de escribir pruebas. Combina casos de E2-E6, busca huecos, agrega pruebas de propiedades/límites/combinaciones no cubiertas individualmente. | Ampliación, no creación desde cero. | Ninguna adicional. | Prohibido | Prohibido |
| **E8** | Preview y validación manual. **Depende del cierre de todas las reglas jurídicas necesarias para los casos que se muestren** — ningún caso con una política `NO_RESUELTA` involucrada se exhibe como resultado confiable en Preview. | Checklist manual firmado por Carlos. | Total, específica a cada caso mostrado. | Prohibido | Permitido solo a Preview, y solo para lo ya jurídicamente cerrado |
| **E9** | Prueba final de Oscar. **Misma dependencia jurídica que E8** — los 3 casos originales de Oscar solo se muestran con cifra final si su piso/ancla ya están resueltos; si no, se muestra el estado intermedio honesto (elegibilidad confirmada, cuantía pendiente de regla jurídica). | Los 4 fixtures de Oscar, ejecutados también manualmente en Preview. | Total. | Prohibido | Permitido solo a Preview |
| **E10** | Publicación autorizada. | Todas las puertas de publicación en verde. | Ninguna — certifica que todo cerró. | Permitido | Permitido a producción |

## 4. E2 — corregido y consolidado en esta rama (`sprint-4-correcciones-oscar-baldor`)

Ver informe de entrega separado (mensaje de esta misma conversación) para: errores
encontrados en el E2 original, correcciones realizadas, algoritmo definitivo de fecha
conjunta, arquitectura implementada, archivos creados/modificados, contratos finales,
decisiones no implementadas, comportamiento de los Casos de Oscar 3A/3B antes y después,
resultados de verificación, y diff resumido. Este documento no repite ese contenido — lo
referencia como evidencia de que E2 (ya corregido) cumplió su alcance sin abrir ningún
Carril 2.

### Deuda documentada para E6 (visual)

El nuevo código de orientación `EDAD_Y_SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM`
(introducido en la corrección de E2 para el estado `NO_CUMPLE_EDAD_NI_SEMANAS_EN_FECHA_OBJETIVO`)
no tiene un mensaje dedicado en `ProyectaTuPensionRPM.jsx` — cae, de forma segura y sin
comportamiento engañoso, en el mismo texto genérico (`resultado.orientacion.razon`) que ya
usa `EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL` desde antes de E2. E6 debe evaluar si
este código (y, en general, los campos `elegibilidad`/`disponibilidadCuantia`, hoy
calculados pero no leídos por ninguna pantalla) necesitan una presentación dedicada.

## 5. Registro de decisiones pendientes (no resueltas en este documento)

- Texto resolutivo completo de la Sentencia C-197/2023 (bloqueo de acceso, no solo de
  interpretación) — condiciona `PoliticaAnclaIncrementoMujer`.
- Confirmación oficial (Consejo de Estado, Diario Oficial) del estado actual del Decreto
  1469/2025 — condiciona con qué certeza `smlv` puede tratarse como base del piso en E3.
- Si los 9 artículos que la (presunta) Sentencia C-264/2026 devolvió al Congreso tocan
  semanas de mujeres o tasa de reemplazo — condiciona si `vigente-2026.json` necesita
  revisión antes de E3.
- Decisión de producto (no jurídica) sobre si se habilitará alguna política de
  `PoliticaDatosIBLHorizonteCorto` distinta de `SOLO_HISTORIA_ESTRUCTURADA`, y bajo qué
  consentimiento explícito del usuario.

Ninguna de estas se resuelve aquí. Quedan como bloqueos explícitos de E3 en adelante.

## 6. E3 y E4 — cerrados (implementación)

### 6.1 E3 — Piso de pensión mínima y Contrato D

**Cerrado.** Commits, en orden:

- `f967c8c8e92c05e45ebf377e81d02be57e43bf90` — feat: aplicar piso y techo legal a la mesada RPM (E3-A, `ajustarMesadaLegalRPM.js`: piso de 1 SMLMV, techo de 25 SMLMV, conserva siempre resultado matemático y resultado ajustado por separado, nunca solo uno — principio de diseño §0.1.3 respetado).
- `973152ebe3ae683e414a86f66d76daddf2ad184a` — feat: comparar anclas de incremento RPM para mujeres (E3-B, `compararAnclaIncrementoRPM.js`). **Dormida, sin consumidor real** — no integra con `calcularPensionRPM.js`, `calcularProyeccionRPM.js`, `generarCaminosRPM.js` ni UI (declarado explícitamente en el propio archivo). El comportamiento visible del producto no cambió por su existencia. `PoliticaAnclaIncrementoMujer` sigue `NO_RESUELTA` en el motor activo — este archivo es la base para que E5.4 la consuma en modo lectura, no una integración ya hecha.
- `556b0ba802316b84821905f8b83e904a4471ca94` — refactor: unificar vigencia del SMLV en cálculos RPM (E3-C1, `resolverSmlvVigenteRPM.js`).
- `ed7698ccd93ae122ec67818c1e1a1ab57d15c3d8` — refactor: preparar ajuste legal en proyección RPM (E3-C2a/b, plomería).
- `0b474f51ab708946037fcf96c8784f893cb972cc` — feat: integrar ajuste legal en proyección RPM (E3-C2c, `calcularProyeccionRPM.js` expone `ajusteLegal` de forma aditiva, sin redefinir `pensionMensualProyectada`).

### 6.2 E4 — Caminos reconstruidos sobre D

**Cerrado.** Commit `aabf01d2ca8cf0bf900bcd8da5a1ac21ffadefce` — feat: integrar ajuste legal en caminos RPM. `generarCaminosRPM.js` gobierna sus decisiones (camino base, bisección del alternativo, barrido, orientación) por la mesada final ajustada (`mesadaGobernante()`), nunca por el resultado matemático crudo — `resultado.valor` es la cifra ajustada; `valorMatematico` conserva el crudo, siempre disponible para trazabilidad, nunca eliminado.

Satisface el criterio de aceptación de la tabla §3 ("curva plana durante el piso y creciente después; coherencia entre camino base/alternativo tras el piso") mediante los casos B, C, D, N, O, P, R de `generarCaminosRPM.test.js` — cubren explícitamente la meseta del piso, su borde de salida, y que un esfuerzo adicional dentro de la meseta nunca se presenta como beneficio pensional aunque el resultado matemático crudo haya mejorado.

## 7. E4-C1 — corrección correctiva de UX (cerrada)

**Cerrado.** Commit `5a4e545d3f9e08f87f88cfb0b73643179d2c9c53` — fix: completa correcciones de claridad y validación RPM E4-C1.

Ronda de correcciones derivadas de la validación manual de Carlos en Preview sobre el resultado de E4, sin tocar el motor pensional: jerarquía visual del botón para corregir un objetivo bajo el piso legal (con la cifra exacta del SMLV vigente, nunca hardcodeada); redacción del esfuerzo opcional para no contradecir "ya alcanzas tu objetivo"; gramática natural del resumen de períodos (nunca "período(s)"); distinción explícita "no informado" vs. "cero explícito" en el límite de esfuerzo mensual; confirmación explícita dentro de la interfaz antes de eliminar un período de historia (nunca inmediata, nunca `window.confirm`); eliminación de una acción de edición duplicada en el resumen; retorno controlado desde el resumen a la proyección tras editar semanas/IBC/traslado/fecha de nacimiento/régimen, sin recorrer de nuevo todo el onboarding salvo cuando el régimen deja de ser RPM (caso en el que correctamente continúa por el flujo RAIS, sin volver a una proyección RPM).

## 8. E5 — Contrato `EjercicioResueltoRPM` (F) — diseño aprobado, implementación completa y cerrada

**Estado: diseño aprobado por Carlos y Atlas. E5.2 (extracción mecánica), E5.3
(`construirEjercicioResueltoRPM.js`, Contrato F), E5.4-A (checkpoint correctivo del
comparador) y E5.4 (`evaluarPoliticasEjercicioRPM.js`, adaptador jurídico con datos reales)
implementados y cerrados — ver §8.6. **E5 queda completo.** Siguiente paso operativo del
plan vigente: **E6** (experiencia visual, dos niveles — Nivel esencial y Nivel completo, ver
§9), cuyo diseño (E6.1) ya está aprobado y cerrado sin código. **E6.2 (adaptador visual puro
y dormido) implementado, auditado y cerrado.** **E6.3 (integración real pero dormida de la
cadena visual en `ProyectaTuPensionRPM.jsx`) implementado, auditado y cerrado, ver §9.9.**
**E6.4 (control aislado de confirmación de continuidad) implementado, auditado y cerrado —
cierre registrado en este mismo cambio, ver §9.10.** La implementación de E6.5 en adelante
requiere autorización explícita, independiente y separada — no iniciada.**

### 8.1 Contratos A-E (reconstruidos desde el código, evidencia exacta)

| Contrato | Archivo | Responsabilidad | F nunca recalcula |
|---|---|---|---|
| A — ElegibilidadProyectada | `src/domain/pensionEngine/evaluarElegibilidadProyectadaRPM.js` | ¿Cumplirías edad y semanas en la fecha objetivo? Nunca calcula IBL/tasa/fórmula. | `estado`, `edadMinimaAplicable`, `semanasMinimasAplicables`, `semanasActuales`, fechas de búsqueda monótona, `razones`, `supuestos` (incluido `ritmoCotizacionFutura`). |
| B — ConstruccionIBL (disponibilidad de cuantía) | `src/domain/pensionEngine/evaluarDisponibilidadCuantiaRPM.js` | ¿Hay evidencia suficiente para el IBL? Interpreta la salida ya calculada, nunca la recalcula. | `estado`, `diasIBLCubiertos/Faltantes`, `razon`, `accionNecesaria`. |
| C — FormulaMatematica | `src/domain/formulas/formulaRPM.js` (+ `formulaIBL.js`), orquestados en `calcularProyeccionRPM.js` | Aritmética pura del Art. 34 — nunca conoce elegibilidad ni aplica piso/techo. | `tasaReemplazo`, `pensionMensualProyectada`, el desglose completo de tasa. |
| D — AjustesLegales | `src/domain/pensionEngine/ajustarMesadaLegalRPM.js` | Aplica piso (1 SMLMV)/techo (25 SMLMV) sobre C, solo si `elegibilidad.estado===CUMPLE`. | `pisoEvaluado`, `techoEvaluado`, `resultadoFinalAjustado`, `razon`, `supuestos`, `trazabilidadNormativa`. |
| E — ResultadoCamino | `src/domain/pensionEngine/generarCaminosRPM.js` (`construirCamino`/`caminoDescartado`) | Construye/compara caminos; decide qué cifra gobierna (ajustada, nunca cruda). | `resultado.valor`, `valorMatematico`, `distanciaObjetivo`, `esfuerzo`, `orientacion`, `barrido`. |

### 8.2 Estructura final de `EjercicioResueltoRPM`

Nombres y ubicaciones aprobados:

- `src/domain/pensionEngine/construirEjercicioResueltoRPM.js` — construye el Contrato F.
- `src/domain/pensionEngine/evaluarPoliticasEjercicioRPM.js` — módulo separado (E5.4) que invoca `compararAnclaIncrementoRPM.js` y produce `politicasInvolucradas`; **`construirEjercicioResueltoRPM.js` nunca importa ni invoca `compararAnclaIncrementoRPM.js`** — recibe `politicasInvolucradas` ya evaluado como entrada externa.

```
construirEjercicioResueltoRPM({ resultadoGenerarCaminos, edadJubilacionDeseada, confirmacionesSupuestos, politicasInvolucradas })
  → EJERCICIO_CONSTRUIDO | ENTRADA_INVALIDA

// Caso válido
{
  estado: 'EJERCICIO_CONSTRUIDO',
  fechaBaseMonetaria: string | null,
  edadJubilacionDeseada: number,
  elegibilidad: {...},                     // de A, tal cual
  disponibilidadCuantia: {...} | null,     // de B, tal cual
  caminos: Array<CaminoResuelto>,
  supuestosEscenario: Array<SupuestoEscenario>,
  completo: boolean,
  razonesIncompleto: Array<{codigo, mensaje}>,
  publicable: boolean,
  razonesNoPublicable: Array<{codigo, mensaje}>,
}

// Caso de entrada inválida — el ejercicio NO se construye
{
  estado: 'ENTRADA_INVALIDA',
  errores: Array<{ codigo, campo, mensaje }>,   // campo usa ruta precisa con índice, ej. 'confirmacionesSupuestos[0].codigo'
}

CaminoResuelto {
  id, tipo, estado, decision,
  distanciaObjetivo, esfuerzo, limitaciones, razonDescartado,
  pasos: Array<PasoAuditable>,   // [] o ausente cuando estado==='descartado' — un camino descartado nunca calculó nada que narrar
}

PasoAuditable {
  codigo: 'DATOS_UTILIZADOS' | 'IBL' | 'TASA_REEMPLAZO' | 'RESULTADO_MATEMATICO' | 'AJUSTE_LEGAL' | 'RESULTADO_FINAL' | 'COMPARACION_OBJETIVO',
  datos: {...},   // ver tabla siguiente — siempre reexpuesto de A-E, nunca recalculado
}

SupuestoEscenario {
  codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES',   // único código soportado por ahora — no extendido a otras limitaciones
  origen: 'supuesto_de_escenario',            // nunca 'hecho_declarado_por_usuario'
  requiereConfirmacion: true,
  confirmacion: { confirmado: true, textoAceptado: string, edadObjetivoConfirmada: number } | null,
}

PoliticaInvolucrada {
  nombre: string,                     // ej. 'PoliticaAnclaIncrementoMujer'
  estado: 'RESUELTA' | 'NO_RESUELTA',
  aplicaAEsteEjercicio: boolean,
  mensaje: string,
}
```

**Contenido de cada `PasoAuditable.datos`** (decisiones finales sobre IBL y DATOS_UTILIZADOS):

| `codigo` | Campos | Fuente exacta (A-E) | Notas |
|---|---|---|---|
| `DATOS_UTILIZADOS` | `ibcFuturoAplicado`, `semanasCotizadas`, y — **cuando existan en E** — `valorDeclarado`, `valorAplicado`, `topeAplicado`, razón del recorte | `escenario.entradas.escenarioIbcFuturo.*`, `escenario.semanasCotizadas.total` | Permite explicar si el IBC declarado fue recortado por el tope legal. F **nunca vuelve a aplicar el tope** — solo reexpone lo que E ya decidió. No copia el expediente completo ni repite las razones de elegibilidad (esas viven en `ejercicio.elegibilidad`). |
| `IBL` | `valorAplicable`, `esOpcionLegal`, `razonVidaLaboralNoEvaluada`, y la composición/trazabilidad de la ventana **que ya exista** en la salida de E | `escenario.ibl.*`, `escenario.trazabilidadVentana` | F **no construye ni inventa un desglose anual nuevo**. Si el motor actual no expone un detalle específico, F lo marca como no disponible — nunca lo recalcula. |
| `TASA_REEMPLAZO` | `tasaInicial`, `bloquesAdicionales`, `incrementoPorSemanas`, `tasaFinalAplicada`, `limiteOchentaPorciento` | `escenario.ajusteLegal.*` (único lugar donde el desglose de C sobrevive hoy) | |
| `RESULTADO_MATEMATICO` | `valor` | `escenario.valorMatematico` | |
| `AJUSTE_LEGAL` | `pisoEvaluado`, `techoEvaluado` (con `fundamento` normativo completo) | `escenario.ajusteLegal.pisoEvaluado`/`techoEvaluado` | |
| `RESULTADO_FINAL` | `valor` | `escenario.resultado.valor` | |
| `COMPARACION_OBJETIVO` | `valorObjetivo`, `delta`, `cumple` | `escenario.distanciaObjetivo` | |

**Reglas de validación de entrada (decisiones finales)**:
- Un `codigo` desconocido en `confirmacionesSupuestos` → `estado: 'ENTRADA_INVALIDA'`, el ejercicio no se construye.
- `textoAceptado` vacío o solo espacios → **no** es `ENTRADA_INVALIDA`: se trata como confirmación ausente/inválida, el ejercicio sí se construye, `publicable:false`, `razonesNoPublicable` explica la falta de confirmación válida.
- Una política `NO_RESUELTA` en `politicasInvolucradas` → **no** es `ENTRADA_INVALIDA`: el ejercicio sí se construye, `completo:false`, `publicable:false`, razones correspondientes.

### 8.3 Invariantes I1-I8 (versión final)

| # | Enunciado | Regla técnica | Checkpoint donde se prueba |
|---|---|---|---|
| I1 | El resultado matemático y el resultado ajustado siempre se derivan cada uno de su propia fuente (pasos `RESULTADO_MATEMATICO`/`RESULTADO_FINAL`) — nunca uno sustituye al otro, coincidan o no en valor. | Identidad de fuente contra `escenario.valorMatematico`/`escenario.resultado.valor`; nunca se exige que difieran. | E5.3 |
| I2 | F nunca produce una cifra, confirmación o política que no haya recibido ya resuelta; un `codigo` desconocido en `confirmacionesSupuestos` siempre produce `ENTRADA_INVALIDA`, nunca se ignora en silencio. | Identidad de fuente + validación de `codigo` contra el único valor soportado. | E5.3 |
| I3 | `completo` nunca es `true` si el ejercicio depende de una política `NO_RESUELTA` aplicable — exclusivamente sobre `completo`, nunca sobre `publicable`. | Evaluado a nivel de ejercicio (no por camino), a partir de `politicasInvolucradas` recibido como entrada externa. | E5.3 (con entrada sintética, documentada como tal) + E5.4 (con `evaluarPoliticasEjercicioRPM.js` real) |
| I4 | La elegibilidad nunca se presenta como un derecho reconocido. | F nunca agrega texto libre nuevo sobre elegibilidad. | E5.3 |
| I5 | `completo` y `publicable` son gates distintos, con causas distintas, nunca confundidos ni omitidos en silencio; `textoAceptado` vacío/solo-espacios cuenta como confirmación ausente para `publicable`, nunca como `ENTRADA_INVALIDA`. | `publicable===true ⟹ completo===true`; causas de `publicable:false` = `completo:false` o confirmación ausente/edad no coincidente. | E5.3 (confirmación/edad) + E5.4 (parte jurídica) |
| I6 | F nunca reordena los caminos por relevancia propia. | `ejercicio.caminos.map(c=>c.id)` idéntico, en orden, a `resultado.escenarios.map(e=>e.id)`. | E5.3 |
| I7 | Un camino descartado nunca tiene pasos ni cifra de pensión. | `estado==='descartado' ⟹ pasos===[] (o ausente) && razonDescartado!==null`. | E5.3 |
| I8 | F no copia indiscriminadamente todos los campos de A-D, pero todo campo que sí incluye conserva su trazabilidad si la tenía. | Por cada campo incluido con `valueId`/`normaId`/`trazabilidadNormativa` de origen, ese identificador viaja con él. | E5.3 |

### 8.4 Decisión — continuidad de cotización futura

Aprobado por Carlos y Atlas: PensionLab puede calcular bajo continuidad de cotización solo si (1) se muestra de forma clara y visible ("Esta proyección supone que cotizas continuamente desde hoy hasta la edad elegida"), (2) la persona confirma explícitamente ("Entiendo y quiero explorar este escenario"), (3) esa confirmación **nunca** es una declaración ni promesa de que cotizará continuamente — es comprensión + deseo de explorar, (4) se registra como supuesto del **escenario**, nunca como hecho personal declarado, (5) sin confirmación, el ejercicio no se presenta como listo para publicación.

El supuesto ya existía, sin mecanismo de confirmación, en Contrato A (`ritmoCotizacionFutura`/`CONTINUIDAD_SIN_INTERRUPCIONES`, `evaluarElegibilidadProyectadaRPM.js`) — E5 no lo inventa, le agrega la confirmación que A deliberadamente dejó pendiente desde S4-002. El mensaje técnico de A y el texto sencillo de E6 tienen funciones distintas y no tienen que ser idénticos — ambos expresan el mismo supuesto. F expone código y datos; **nunca redacta texto de interfaz**.

La confirmación queda vinculada a `edadJubilacionDeseada`: cambiarla la invalida; cambios en objetivo económico, IBC, límite de esfuerzo o historia **no** la invalidan. Sin timestamp en el MVP — basta edad objetivo confirmada + texto exacto aceptado. El estado de la confirmación vive en `App.jsx` durante la sesión (nunca persistido fuera de ella) — **su implementación pertenece a E6, no a E5**.

### 8.5 Frontera E5/E6

E5 (F, dominio) decide el `codigo` del supuesto, `requiereConfirmacion`, y calcula `publicable` a partir de la confirmación ya recibida — nunca redacta texto, nunca captura el clic, nunca decide dónde vive el estado. E6 redacta el texto fijo y el del botón, captura el clic, decide dónde persiste el estado de confirmación durante la sesión y qué cambio de datos dispara una nueva llamada a F sin confirmación.

### 8.6 División E5.2 / E5.3 / E5.4-A / E5.4

| Checkpoint | Contenido |
|---|---|
| **E5.2** | **Implementado; cierre registrado en este mismo cambio.** Movimiento mecánico de `construirHechosEscenario.js` de `src/ia/` a `src/transparency/` (revisado antes el residuo de Sprint 1 en `src/domain/transparency/explainCalculation.js`, confirmado sin relación). Ubicación final `src/transparency/`, no `src/domain/transparency/` (evita que `domain/` dependa de `src/format/`). Corrección de evidencia: la cifra de "6 consumidores actuales" de una versión anterior de esta fila no coincidía con el código — el grep real muestra 2 consumidores de producción (`src/ia/explicarCaminos.js`, `src/pages/ProyectaTuPensionRPM.jsx`) más 1 archivo de pruebas propio que importa el módulo directamente; el resto de apariciones en el código son comentarios, no consumidores. Sin reexport temporal desde `src/ia/`. Sin cambio de comportamiento: 72 archivos de prueba / 1465 pruebas en verde (mismo conteo que el baseline previo al movimiento), lint y build correctos. |
| **E5.3** | **Implementado y cerrado en este mismo cambio.** `construirEjercicioResueltoRPM.js` (`src/domain/pensionEngine/`) construye el Contrato F con la estructura `caminos → pasos auditables`, recibiendo `politicasInvolucradas` como parámetro externo (nunca invoca `evaluarPoliticasEjercicioRPM.js`/`compararAnclaIncrementoRPM.js`) — compone y valida las salidas de A-E, sin recalcular ninguna cifra. Implementa los 7 `PasoAuditable` (`DATOS_UTILIZADOS`, `IBL`, `TASA_REEMPLAZO`, `RESULTADO_MATEMATICO`, `AJUSTE_LEGAL`, `RESULTADO_FINAL`, `COMPARACION_OBJETIVO`) y cubre I1-I8 (I3 e I5 con entrada sintética de política/confirmación, documentada como tal — la parte jurídica real queda para E5.4). 30 pruebas nuevas (`construirEjercicioResueltoRPM.test.js`); suite completa 73 archivos / 1495 pruebas en verde; lint y build correctos. **F permanece dormida, sin ningún consumidor real** — de lo contrario un caso real de mujer en el rango divergente se marcaría incorrectamente `completo:true` antes de que E5.4 exista. |
| **E5.4-A** | **Implementado y cerrado en este mismo cambio.** Checkpoint correctivo detectado durante el diagnóstico de diseño de E5.4 (nunca durante E3-B): `compararAnclaIncrementoRPM.js` resolvía el mínimo dinámico de mujer con la misma `fecha` que también resuelve SMLV/vigencia/ancla fija — en una proyección a varios años esto podía ocultar por completo una divergencia jurídica real (caso probado: valoración 2026-01-01, aplicación 2031-01-01, mínimo dinámico 1125 en vez de 1250, divergencia de 4.5 puntos entre interpretaciones, oculta a 0 sin la corrección). Corrección: parámetro aditivo `fechaAplicacionRegla = fecha` — `fecha` conserva su rol anterior sin cambios; `fechaAplicacionRegla` gobierna únicamente `obtenerSemanasMinimas(fechaAplicacionRegla, sexoResuelto, 'RPM')`, mismo criterio que ya usa `evaluarElegibilidadProyectadaRPM.js` (`semanasMinimasAplicables.fechaAplicacion`). 8 pruebas nuevas en `compararAnclaIncrementoRPM.test.js` (comparador 63/63); suite completa 73 archivos / 1503 pruebas en verde; lint y build correctos. Alcance exclusivo de `compararAnclaIncrementoRPM.js` + su test — Contrato F, `generarCaminosRPM.js`, elegibilidad/proyección, UI e IA sin tocar. |
| **E5.4** | **Implementado y cerrado en este mismo cambio.** `src/domain/pensionEngine/evaluarPoliticasEjercicioRPM.js` — adaptador entre los datos reales de un ejercicio (`generarCaminosRPM.js`) y `compararAnclaIncrementoRPM.js` (E3-B, corregido en E5.4-A); produce `politicasInvolucradas` en la forma exacta que consume Contrato F, sin recalcular ninguna cifra del comparador. Evaluado a nivel de EJERCICIO: usa el **primer camino viable con datos numéricos utilizables** (`estado==='viable'`, `ajusteLegal.fechaBaseMonetaria` string, `semanasCotizadas.total` e `ibl.aplicable` numéricos), sin ordenar ni comparar los demás caminos (I6). Separa explícitamente `fechaBaseMonetaria` (fecha monetaria del camino, resuelve SMLV/ancla fija) de `fechaAplicacionRegla` (`elegibilidad.semanasMinimasAplicables.fechaAplicacion`, gobierna únicamente el mínimo dinámico — mismo criterio de E5.4-A). **Corrección encontrada y cerrada en la revisión final de E5.4:** `compararAnclaIncrementoRPM({ fechaAplicacionRegla = fecha })` activa su valor por defecto de JavaScript exactamente cuando el argumento recibido es `undefined` — si `semanasMinimasAplicables.fechaAplicacion` está ausente, el adaptador lo pasaría como `undefined` y el comparador evaluaría en silencio con la fecha monetaria del camino en vez de la fecha real de aplicación de la regla. Corregido con una validación explícita en E5.4 (nunca en el comparador, que permanece cerrado) que detiene el flujo **antes** de invocarlo: `estado: 'ENTRADA_INVALIDA'`, código `COMPARADOR_RECHAZO_ENTRADA_DERIVADA`, campo exacto `resultadoGenerarCaminos.elegibilidad.semanasMinimasAplicables.fechaAplicacion`. Para `null` o formato inválido (donde el default de JS no se activa) el comparador ya rechazaba correctamente — sin cambio. **Decisión de diseño Carlos/Atlas (cierre de la revisión final, 2026-09-20):** `SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE` produce literalmente `politicasInvolucradas: []` — no una entrada `RESUELTA`/`aplicaAEsteEjercicio:false`, que sería información inerte; consistente con el caso evaluable sin incertidumbre jurídica (anclas coinciden), que también devuelve `[]`. Bloqueos jurídicos/de vigencia del SMLV (`FUENTE_LEGAL_NO_ENCONTRADA`, `FUNDAMENTO_NORMATIVO_NO_VERIFICADO`, `MEDIDA_CAUTELAR_ACTIVA`, `FUERA_DE_VIGENCIA`, `FUENTE_INSUFICIENTE`, `SMLV_NO_APTO_PARA_CALCULO`) producen fail-closed `NO_RESUELTA`/`aplicaAEsteEjercicio:true`, conservando el mensaje literal del comparador. Fixture nuevo de mujer en el rango divergente (valoración 2026-01-01, aplicación 2031-01-01, mínimo dinámico 1125, divergencia de 4.5 puntos) creado en `evaluarPoliticasEjercicioRPM.test.js`, con integración probada contra Contrato F: una política `NO_RESUELTA` aplicable produce `completo:false` y `publicable:false`. 23 pruebas nuevas (`evaluarPoliticasEjercicioRPM.test.js`); suite completa 74 archivos / 1526 pruebas en verde; lint y build correctos. **El módulo permanece sin ningún consumidor real de producción** — no se integra con Contrato F, `App.jsx`, `pages/`, UI ni IA; solo su propio archivo de pruebas lo importa. |

### 8.7 Pendientes de E5.1 (no bloqueantes para el diseño, a resolver durante la implementación)

- Si el detalle año-a-año de indexación IPC va dentro del paso `IBL` o se omite.
- Forma exacta de `errores[].campo` para otros casos de entrada malformada distintos del código desconocido.
- ~~Fixture de mujer en el rango divergente de `PoliticaAnclaIncrementoMujer` — asignado a E5.4, sigue sin existir.~~ Resuelto en E5.4 (`resultadoRealMujerRangoDivergente`, `evaluarPoliticasEjercicioRPM.test.js`).

## 9. E6.1 — Diseño del contrato visual de la experiencia Baldor — aprobado, sin implementación

**Estado: diseño aprobado por Carlos y Atlas (2026-09-20), sin ningún código. No modifica el
código ni el contrato de E5 — Contrato F (`construirEjercicioResueltoRPM.js`) y
`evaluarPoliticasEjercicioRPM.js` permanecen exactamente como cerraron en §8.6, sin ningún
consumidor real. Implementación (E6.2 en adelante) requiere autorización explícita, propia y
separada de esta aprobación de diseño — sigue sin iniciarse.**

### 9.1 Los dos niveles reales (corrige "Niveles 1-3")

Investigación previa a este diseño (E6.1): inspección directa del XML interno de
`docs/producto/PL-240 - Filosofía de Experiencia de PensionLab - v1.0.docx` (sin modificarlo,
sin extraerlo, solo lectura) confirmó que ese documento **no contiene ninguna mención de
"Nivel 1/2/3" ni de "Baldor"** aplicada a la presentación de resultados — sus menciones de
"niveles" son sobre validación de coherencia de datos declarados (S3-008), un concepto
distinto. Tampoco existe en `docs/tecnico/arquitectura/PL-230-...md` (versión ya trackeada).
La única definición real, en todo el repositorio, es §0.1 punto 6 de este documento: **dos**
niveles, nunca tres. Toda referencia previa a "Niveles 1-3" en este archivo (§0.1 punto 6,
tabla §3, §8) queda corregida por las notas insertadas en esos puntos.

| | Nivel esencial | Nivel completo |
|---|---|---|
| **Propósito** | Responder de inmediato "¿qué pensión puedo esperar y con qué caminos?", sin exigir que la persona entienda el desglose legal. | Auditar, camino por camino, exactamente cómo se llegó a cada cifra, con fundamento normativo — la promesa de trazabilidad de PL-240 aplicada al resultado. |
| **Información mostrada** | Por camino: `decision`, `tipo`, cifra final, comparación contra objetivo, esfuerzo (IBC actual/propuesto/aumento). A nivel de ejercicio: `completo`, `publicable` y, si alguno es `false`, el motivo en lenguaje simple. | Los 7 `PasoAuditable` completos de cada camino viable, en el orden exacto de Contrato F, con fundamento normativo donde exista. `supuestosEscenario` completo. Toda política jurídica involucrada, desglosada. |
| **Fuente exacta en `EjercicioResueltoRPM`** | `caminos[].estado/tipo/decision`; dentro de `caminos[].pasos[]`, los códigos `RESULTADO_FINAL`/`COMPARACION_OBJETIVO`; `caminos[].esfuerzo`; `completo`, `publicable`, `razonesIncompleto`, `razonesNoPublicable`, `supuestosEscenario`. | `caminos[]` completo (sin recorte), incluido `pasos[]`; `elegibilidad`, `disponibilidadCuantia`, `fechaBaseMonetaria`; más `politicasInvolucradas` (entrada separada del adaptador, ver §9.2). |
| **Interacción** | El formulario existente (edad/objetivo/restricción) + el gate de confirmación de continuidad (§9.4). | **Decisión Carlos/Atlas (2026-09-20):** una sección expandible por cada camino. El resumen del camino (mismo contenido que el Nivel esencial de ese camino) permanece siempre visible; al expandir, los pasos auditables se muestran en el orden exacto de Contrato F (`DATOS_UTILIZADOS → IBL → TASA_REEMPLAZO → RESULTADO_MATEMATICO → AJUSTE_LEGAL → RESULTADO_FINAL → COMPARACION_OBJETIVO`). |
| **Oculto inicialmente** | Los 7 `PasoAuditable` completos, `trazabilidadNormativa`, detalle de `disponibilidadCuantia`/`elegibilidad`. | Nada estructural una vez expandido un camino; antes de expandir, sus pasos. |
| **`completo:false`** | La cifra sigue mostrándose (nunca se oculta un número ya calculado) junto al mensaje exacto de `razonesIncompleto[].mensaje`, literal. | Mismo checklist explícito, visible independientemente del Nivel esencial — nunca visible en un solo nivel únicamente. |
| **`publicable:false`** | Cifra visible, rotulada explícitamente como no definitiva; si la causa es `CONFIRMACION_AUSENTE`, el gate de continuidad queda visible y prominente. | Mismo checklist explícito, repetido. |
| **Caminos descartados** | `razonDescartado.mensaje` únicamente, mismo tratamiento visual que hoy (`.camino-celda--descartado`). | **Decisión Carlos/Atlas:** muestran únicamente su razón — nunca una sección expandible vacía (I7 garantiza `pasos:[]` para un camino descartado; la UI nunca debe ofrecer expandir algo que no tiene contenido). |
| **Políticas `NO_RESUELTA`** | Disclosure obligatorio, hoy inexistente. | Sección propia, mensaje jurídico completo por política — posible solo porque el adaptador recibe `politicasInvolucradas` como entrada separada (§9.2), ya que Contrato F no la reexpone. |

### 9.2 Contrato conceptual del adaptador — `construirModeloVisualEjercicioRPM`

```
construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
  → ModeloVisualEjercicioRPM
```

Función pura, sin código todavía. Reglas fijadas (Carlos/Atlas):

- Recibe únicamente la salida ya construida de Contrato F (`ejercicioResuelto`) más
  `politicasInvolucradas` como entrada **separada** — el mismo arreglo que el orquestador ya
  tiene disponible del paso 2 de §9.3, sin que Contrato F cambie su contrato para reexponerlo.
- Solo puede copiar, seleccionar y organizar datos — nunca calcular ni reinterpretar: no
  recalcula IBL, tasa, piso, mesada, distancia ni esfuerzo; no vuelve a decidir `completo` ni
  `publicable`; no redacta ninguna conclusión jurídica ni mensaje nuevo.
- Extrae de `pasos[]` los datos de cada nivel una sola vez, indexados por código (nunca un
  arreglo que cada componente recorra con `.find(...)` repetidamente).
- Conserva el orden de `caminos` (I6) y, literalmente, cifras, razones y mensajes.
- Produce un modelo fácil de probar con funciones puras (Vitest, sin React).
- Permanece dormido hasta que un checkpoint posterior (E6.3 en adelante) lo conecte a un
  componente real.

**Forma aproximada del resultado** (conceptual, no código final):

```
ModeloVisualEjercicioRPM {
  estado: { completo, publicable, razonesIncompleto, razonesNoPublicable },  // literal de F
  confirmacionContinuidad: { requerida, confirmada, textoAceptado, edadObjetivoConfirmada } | null,
                                                                // de supuestosEscenario[0], literal
  politicasJuridicas: Array<{ nombre, estado, aplicaAEsteEjercicio, mensaje }>,
                                                                // literal del 2do argumento
  caminos: [                                                  // mismo orden que ejercicioResuelto.caminos
    {
      id, tipo, estado, decision,                             // literal
      resumen: { cifraFinal, cumpleObjetivo, delta, valorObjetivo, esfuerzo } | null,  // solo viable
      pasos: { DATOS_UTILIZADOS, IBL, TASA_REEMPLAZO, RESULTADO_MATEMATICO,
               AJUSTE_LEGAL, RESULTADO_FINAL, COMPARACION_OBJETIVO } | null,  // indexado, solo viable
      razonDescartado: {...} | null,                          // solo descartado
    }, ...
  ],
}
```

**Ubicación (Carlos/Atlas):** junto a `ProyectaTuPensionRPM` (ej. `src/pages/`), siguiendo el
patrón de helpers de página ya usado por `ordenarCaminosParaPresentacion` en
`ProyectaTuPensionRPM.helpers.js` — no en `src/domain/pensionEngine/` (no es una regla
pensional) ni extraído a una capa compartida todavía, porque tendrá un solo consumidor. Se
revisará si conviene extraerlo únicamente cuando exista un segundo consumidor real.

### 9.3 Orquestación

```
1. generarCaminosRPM(...)                                    → resultadoGenerarCaminos   (E)
2. evaluarPoliticasEjercicioRPM({ resultadoGenerarCaminos, sexo })
                                                                → politicasInvolucradas
3. construirEjercicioResueltoRPM({ resultadoGenerarCaminos,
     edadJubilacionDeseada, confirmacionesSupuestos, politicasInvolucradas })
                                                                → ejercicioResuelto        (F)
4. construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })
                                                                → modeloVisual
5. <ComponentesPresentacionales modeloVisual={modeloVisual} .../>
```

Los 4 primeros pasos viven en el mismo orquestador que hoy ya ejecuta el paso 1 síncronamente
en cada render (`ProyectaTuPensionRPM.jsx`) — mismo patrón ya existente, sin arquitectura
nueva. Se ejecutan una sola vez por render de la página; el resultado (`modeloVisual`)
desciende como prop ya resuelta — ningún componente hijo invoca ninguna de las 4 funciones.

### 9.4 Gate de confirmación de continuidad (contraste con §8.4)

| | Diseño E6.1 | §8.4 |
|---|---|---|
| Estado en `App.jsx` | Un solo estado nuevo (ej. `confirmacionContinuidad`), mismo patrón que `trasladoRegimen`. | "vive en `App.jsx` durante la sesión (nunca persistido fuera de ella)." |
| Forma | `{ codigo: 'CONTINUIDAD_SIN_INTERRUPCIONES', confirmado: true, textoAceptado: 'Entiendo y quiero explorar este escenario.', edadObjetivoConfirmada }` — mismo shape que `confirmacionesSupuestos[]` ya acepta F. | Texto exacto ya fijado por §8.4 — E6 no redacta. |
| Edad asociada | `edadObjetivoConfirmada` = `edadJubilacionDeseada` al momento de confirmar. | "La confirmación queda vinculada a `edadJubilacionDeseada`." |
| Cuándo se invalida | Únicamente al cambiar `edadJubilacionDeseada`. | "cambiarla la invalida." |
| Cuándo NO se invalida | Cambios en objetivo económico, IBC, límite de esfuerzo o historia. | "no la invalidan." |
| Cómo llega a F | Como único elemento de `confirmacionesSupuestos` en el paso 3 de §9.3 — parámetro ya existente en F desde E5.3, nunca alimentado por UI real. | Sin cambios necesarios al contrato de F. |
| Antes de confirmar | Disclosure visible + botón; `publicable:false`/`CONFIRMACION_AUSENTE` visible en Nivel esencial; cifras ya calculadas siguen mostrándose. | "sin confirmación, el ejercicio no se presenta como listo para publicación." |
| Después de confirmar | Disclosure colapsable a estado "confirmado" (sin timestamp); `publicable` puede pasar a `true` si el resto ya se cumple. | "Sin timestamp en el MVP — basta edad objetivo confirmada + texto exacto aceptado." |

### 9.5 Estrategia de pruebas

Híbrida (Carlos/Atlas):

- **Vitest puro**, sin dependencias nuevas: `construirModeloVisualEjercicioRPM` — todas las
  combinaciones de completo/publicable/política/descartado/orden, mismo patrón que las 1526
  pruebas actuales (ninguna monta un componente).
- **Pruebas de componentes**, cuando se implemente la primera interacción real (el gate de
  confirmación de continuidad, E6.4 en §9.6) — requiere una dependencia nueva hoy inexistente
  (`package.json` no tiene ningún `@testing-library/*`; `vite.config.js` no tiene entorno
  `jsdom`; cero archivos `.test.jsx` en el repo). **No se agrega en E6.1** — se solicitará
  explícitamente en el checkpoint que la necesite.
- **Checklist manual posterior** para coherencia visual (resumen ↔ gráfica ↔ Nivel completo)
  y una pasada real de lector de pantalla — mismo patrón ya usado en E8/E9.

### 9.6 División E6.2-E6.7 (checkpoints posteriores, cada uno con autorización propia)

| Checkpoint | Alcance | Dormido/visible | Autorización |
|---|---|---|---|
| **E6.2** | `construirModeloVisualEjercicioRPM` — adaptador puro, con pruebas Vitest exhaustivas. **Implementado, auditado y cerrado — cierre registrado en este mismo cambio, ver §9.8.** | Dormido — cero consumidor | Ejecutado y cerrado |
| **E6.3** | Integración real dormida — la página invoca los pasos 1-4 de §9.3 tras un interruptor (mismo patrón `IA_EXPUESTA_EN_MVP`), sin cambiar nada visible. **Implementado, auditado y cerrado — ver §9.9.** | Dormido (interruptor apagado) | Ejecutado y cerrado |
| **E6.4** | Gate de confirmación de continuidad (§9.4), aislado — primeras pruebas de componente reales; dependencia de RTL aprobada e instalada. **Implementado, auditado y cerrado — ver §9.10.** | Aislado — sin conexión a `App.jsx` ni a `ProyectaTuPensionRPM.jsx` | Ejecutado y cerrado |
| **E6.5** | Nivel esencial visual real — primer consumidor visible de F; disclosure de política `NO_RESUELTA`/`completo`/`publicable`; conecta el estado de confirmación a `App.jsx` (invalidación por edad/sexo/régimen/fecha de nacimiento). **Implementado, auditado y cerrado — ver §9.11.** | **Real — primer consumidor visible de F** | Ejecutado y cerrado |
| **E6.6** | Nivel completo — acordeón por camino, pasos auditables en orden de Contrato F. **Implementado, auditado y cerrado — ver §9.12.** | Real | Ejecutado y cerrado |
| **E6.7** | Accesibilidad transversal (teclado, lector de pantalla) + coherencia visual resumen↔gráfica↔Nivel completo. **Implementado, auditado y cerrado — ver §9.13.** | Real | Ejecutado y cerrado |
| **E7** | Auditoría y ampliación adversarial sobre E6.5-E6.7 (§0 punto 3). **Ejecutado — ver §9.14.** Encontró y corrigió una desviación real de contrato (§0 punto 6): la cifra de un ejercicio con política jurídica `NO_RESUELTA` se mostraba rotulada en vez de retenida. | Real | Ejecutado |

### 9.7 Relación con S4-007 — separación explícita (no confundir con E6)

S4-007 (explicación con IA) está implementado, integrado y probado a nivel de código/contrato
(commits `333787fc`/`db1bac72`), pero deliberadamente no expuesto en el MVP
(`IA_EXPUESTA_EN_MVP = false`, commit `99cae1a`) — ver detalle cronológico completo en
`docs/gestion/cierre-sprint-4.md`. **E6 es presentación determinista de Contrato F y nunca
debe activar S4-007 ni ningún llamado a IA** — son capas paralelas sobre el mismo Contrato E,
cada una con su propio re-shaping (`construirHechosEscenario.js` para IA;
`construirModeloVisualEjercicioRPM` para E6). Ningún checkpoint de §9.6 modifica
`IA_EXPUESTA_EN_MVP` ni ningún archivo de `src/ia/`/`api/`.

### 9.8 E6.2 — implementado, auditado y cerrado

**Estado: implementado; cierre registrado en este mismo cambio (2026-09-20).** Sin conexión a
`ProyectaTuPensionRPM.jsx`, sin activar Contrato F, S4-007 ni IA en la aplicación real.

**Archivos creados** (únicos dos autorizados para este checkpoint):
- `src/pages/construirModeloVisualEjercicioRPM.js` — adaptador visual puro (`construirModeloVisualEjercicioRPM({ ejercicioResuelto, politicasInvolucradas })`), siguiendo el patrón de helpers de página fijado en E6.1 §9.2. **Sin consumidor real** — `ProyectaTuPensionRPM.jsx` no lo importa; verificado por búsqueda de importaciones en todo `src/`.
- `src/pages/construirModeloVisualEjercicioRPM.test.js` — 28 pruebas, mayoritariamente construidas con fixtures reales vía `generarCaminosRPM`/`evaluarPoliticasEjercicioRPM`/`construirEjercicioResueltoRPM` (Contrato F cerrado), con fixtures sintéticos identificados expresamente y acotados a bordes que un Contrato F válido no puede producir hoy.

**Correcciones al modelo conceptual aproximado de §9.2** (nombres reales de F, nunca inventados): `confirmacionContinuidad` usa los nombres reales de F (`requiereConfirmacion`, `confirmacion.confirmado`), no los aproximados `requerida`/`confirmada` que sugería §9.2; `resumen.esfuerzo` se copia desde `caminos[].esfuerzo` (campo de primer nivel de `CaminoResuelto`), nunca desde un paso; el paquete `completo`/`publicable`/razones que §9.2 llamaba `estado` se expone como `estadoEjercicio`, para no colisionar con el wrapper `estado: 'MODELO_VISUAL_CONSTRUIDO'|'ENTRADA_INVALIDA'` (necesario para el caso inválido, que §9.2 no había diseñado).

**Orden de los pasos:** el adaptador conserva literalmente el orden de `pasos[]` tal como lo recibe de Contrato F — nunca lo reordena por código ni lo reconstruye a partir del índice. Verificado con una prueba que invierte deliberadamente el orden real de los 7 pasos y confirma que el modelo reproduce ese orden invertido, no el canónico.

**Decisión sobre `esfuerzo` ausente en un camino viable:** Contrato F no exige `esfuerzo` en `camposFaltantesCaminoViable()` (a diferencia de `ibl`/`ajusteLegal`), pero `generarCaminosRPM.js` (`construirCamino()`) lo calcula de forma incondicional para todo escenario `'viable'` — nunca ocurre en la práctica desde una salida real. El adaptador copia `esfuerzo` desde `caminos[].esfuerzo` tal cual llegue, sin agregar una validación que Contrato F mismo no exige — ampliar ese contrato no es responsabilidad de este adaptador.

**Defecto encontrado y corregido durante la auditoría posterior a la primera implementación:** dos pasos con el mismo `codigo` en un mismo camino viable pasaban la validación original sin error (la comprobación de campos "faltantes" solo verifica pertenencia, nunca cuenta ocurrencias) — `indexarPasosPorCodigo` sobrescribía el primero en silencio al indexar. Verificado empíricamente (desactivando temporalmente la corrección y confirmando que la prueba fallaba). Corregido: nuevo código `PASO_CON_CODIGO_DUPLICADO`, detección por conteo de ocurrencias — cualquier código repetido, conocido o no, produce `ENTRADA_INVALIDA`, con dos pruebas dedicadas.

**Resultado final:**
- 28/28 pruebas específicas del adaptador en verde.
- Suite completa: 75 archivos / 1554 pruebas en verde.
- Lint sin hallazgos; build exitoso.
- Cero consumidores reales del nuevo módulo (verificado por búsqueda de importaciones).

**E6.3 no se inició** — requiere autorización explícita y separada, igual que cada checkpoint anterior de este plan.

### 9.9 E6.3 — implementado, auditado y cerrado

**Estado: implementado; cierre registrado en este mismo cambio (2026-09-20).** Integración real
pero completamente dormida — cero cambios visuales, Contrato F, S4-007 e IA sin activar en
la aplicación real.

**Archivos:**
- `src/pages/construirCadenaVisualEjercicioRPM.js` — orquestador puro que encadena las tres
  etapas ya cerradas de E6.1/E6.2 (`evaluarPoliticasEjercicioRPM` →
  `construirEjercicioResueltoRPM` → `construirModeloVisualEjercicioRPM`) sobre el único
  `resultado` de `generarCaminosRPM(...)` que la página ya calcula — nunca lo recalcula ni
  vuelve a invocar `generarCaminosRPM`.
- `src/pages/construirCadenaVisualEjercicioRPM.test.js` — 18 pruebas.
- `src/pages/ProyectaTuPensionRPM.jsx` — **modificación dormida**, exactamente 29 líneas
  agregadas (un `import`, la constante del interruptor, y el bloque de cálculo condicional):
  un solo `import` nuevo, ningún JSX nuevo ni modificado.

**Contrato del orquestador:** `resultado` ausente (`null`/`undefined`) → `null` — único caso
que devuelve `null`. Cualquier otro caso siempre devuelve un objeto cerrado: éxito
`{estado: 'CADENA_VISUAL_CONSTRUIDA', politicasInvolucradas, ejercicioResuelto, modeloVisual}`,
o fallo explícito `{estado: 'CADENA_VISUAL_NO_CONSTRUIDA', etapa: 'POLITICAS'|'EJERCICIO'|
'MODELO_VISUAL', detalle}` — `detalle` conserva literalmente la salida original de la etapa
que falló, nunca reinterpretada; nunca continúa a la etapa siguiente cuando la anterior no
alcanzó su estado exitoso esperado.

**Integración dormida en `ProyectaTuPensionRPM.jsx`:** `MODELO_VISUAL_EJERCICIO_ACTIVO =
false` (mismo patrón que `IA_EXPUESTA_EN_MVP`), una única llamada de producción al
orquestador, dentro de la rama condicional que ese interruptor controla. La salida
(`cadenaVisualDormida`) permanece sin ningún consumidor visible — queda disponible para que
E6.5 (primer consumidor visible de Contrato F, ver §9.6) la conecte a un componente real. IA
y S4-007 siguen sin activarse. E6.4 y E6.5 no se iniciaron.

**Auditoría posterior a la primera implementación — defecto encontrado y corregido:** el
segundo parámetro del orquestador (`overridesSoloParaPruebas`, mecanismo de inyección de
dependencias exclusivo de pruebas) usaba `= {}` como valor por defecto — ese default de
JavaScript solo se activa cuando el argumento recibido es exactamente `undefined`, nunca con
un `null` explícito. Un `null` explícito producía un `TypeError` al leer sus propiedades,
violando la garantía propia del módulo de nunca lanzar — mismo patrón de fallo exacto ya
corregido en E5.4 (`fechaAplicacionRegla`). Verificado empíricamente. Corregido con
normalización explícita `const overrides = overridesSoloParaPruebas ?? {}`. Se agregaron
cuatro pruebas: regresión del `null` explícito, confirmación de que una inyección parcial
conserva las dependencias reales no sustituidas (nunca las deja `undefined`), y dos pruebas
que confirman explícitamente que una etapa fallida impide ejecutar las siguientes (espías que
envuelven las funciones reales, nunca reimplementan su lógica).

**Resultado final:**
- 18/18 pruebas específicas del orquestador en verde.
- 117/117 pruebas relacionadas con `ProyectaTuPensionRPM` en verde.
- Suite completa: 76 archivos / 1572 pruebas en verde.
- Lint sin hallazgos; build exitoso.
- Una sola llamada a `generarCaminosRPM` en toda la página (verificado por búsqueda).
- Cero líneas del `return`/JSX de `ProyectaTuPensionRPM.jsx` modificadas.
- Ninguna dependencia nueva agregada.
- Bundle de producción: de 422.27 kB a 423.62 kB. El `import` estático del orquestador (y
  transitivamente de `evaluarPoliticasEjercicioRPM.js`/`construirEjercicioResueltoRPM.js`)
  incorpora ese código al bundle aunque `MODELO_VISUAL_EJERCICIO_ACTIVO` sea `false` — Rollup
  no puede eliminarlo por árbol de dependencias porque el import sí se usa (dentro de la rama
  condicional), solo que esa rama nunca se ejecuta en runtime. **"Dormido" significa no
  ejecutado y no visible al usuario, no ausente del bundle.**

**E6.4 no se inició** — requiere autorización explícita y separada, igual que cada checkpoint
anterior de este plan.

### 9.10 E6.4 — implementado, auditado y cerrado

**Estado: implementado; cierre registrado en este mismo cambio (2026-09-20).** Control
**aislado** de confirmación de continuidad de cotización — sin conexión todavía a `App.jsx`
ni a `ProyectaTuPensionRPM.jsx`; no se monta en ningún árbol real de la aplicación.

**Archivos:**
- `src/components/ConfirmacionContinuidadCotizacion.jsx` — componente puro y presentacional
  (`{confirmacion, edadJubilacionDeseada, onConfirmar}` → JSX), primer consumidor de
  `useId()` del repositorio para asociar el botón con el disclosure vía
  `aria-describedby`.
- `src/components/ConfirmacionContinuidadCotizacion.test.jsx` — 14 pruebas, primer archivo
  `.test.jsx` del repositorio; entorno `jsdom` acotado a este archivo únicamente (directiva
  `// @vitest-environment jsdom`), sin cambiar el entorno global de Vitest.
- Dependencias nuevas: `@testing-library/react@16.3.3`, `@testing-library/user-event@14.6.7`,
  `jsdom@30.1.0` — sin `@testing-library/jest-dom` (las aserciones usan API de DOM nativa).

**Textos**: disclosure y botón, literales de PL-260 §8.4 (decisión ya aprobada, sin
redactar de nuevo). Texto del estado posterior al clic, **aprobado por Carlos/Atlas en la
auditoría de este checkpoint**: *"Elegiste explorar este escenario bajo el supuesto de
cotización continua."* — describe la elección ya registrada, nunca afirma que la persona
cotizará ni presume lo que comprendió (reemplaza el texto provisional *"Confirmaste que
entiendes este supuesto y quieres explorar este escenario."*, descartado).

**Defectos encontrados y corregidos durante la auditoría posterior a la primera
implementación** (verificados empíricamente antes de corregir): `confirmacion` ausente
(prop no pasada, `undefined` en vez de `null` explícito) producía
`TypeError: Cannot read properties of undefined (reading 'confirmado')`; `onConfirmar`
ausente producía `TypeError: onConfirmar is not a function` al hacer clic. Corregido con
`confirmacion != null` (en vez de `!== null`, mismo criterio ya aplicado en E5.4/E6.3) y
`onConfirmar = () => {}` como valor por defecto no-operativo. Cuatro pruebas de regresión
agregadas.

**Decisión de invalidación documentada, pendiente de implementar en E6.5** (Carlos/Atlas,
cierre del diseño de E6.4): cuando la confirmación se conecte al estado de `App.jsx`,
cambiar **edad objetivo, sexo, régimen actual o fecha de nacimiento** invalidará la
confirmación; cambiar objetivo económico, IBC, límite de esfuerzo o historia de cotización
**no** la invalidará. Este componente no implementa la invalidación (no tiene acceso a esos
otros campos) — solo decide, dada una confirmación y la edad actual, si sigue vigente para
esa edad.

**Resultado final:**
- 14/14 pruebas específicas del componente en verde.
- Suite completa: 77 archivos / 1586 pruebas en verde.
- Lint sin hallazgos; build exitoso — bundle sin cambio (423.62 kB), confirma cero
  consumidor real.
- Cero referencias al componente fuera de sus propios archivos.

### 9.11 E6.5 — implementado, auditado y cerrado

**Estado: implementado y cerrado (2026-09-22/23), en una sesión que también ejecutó E6.6,
E6.7 y E7 (auditoría adversarial) — ver §9.12-§9.14.** Primer consumidor visible de Contrato
F: `App.jsx` gana el estado `confirmacionContinuidad` y tres wrappers de invalidación nuevos
(`actualizarSexo`, `actualizarFechaNacimiento`, `actualizarEdadJubilacionDeseada`;
`actualizarRegimenActual` extendida) — invalida exactamente en edad objetivo, sexo, régimen
actual o fecha de nacimiento; nunca en objetivo económico, IBC, límite de esfuerzo ni
historia de cotización (decisión ya aprobada en §9.4/E6.4). `ProyectaTuPensionRPM.jsx` retira
el interruptor dormido `MODELO_VISUAL_EJERCICIO_ACTIVO` — la cadena visual corre en cada
render — y monta `ConfirmacionContinuidadCotizacion.jsx` (E6.4, sin modificar) más un
disclosure de `completo`/`publicable`/`razonesIncompleto`/`razonesNoPublicable`.

**Defecto encontrado en la propia auditoría de E6.5 (self-review, antes de E7) y corregido:**
la advertencia de "no publicable" solo aparecía una vez, antes de la grilla — una tarjeta de
camino vista aislada (ej. una captura recortada) podía mostrar la cifra sin su advertencia
adjunta. Corregido con un rótulo repetido junto a cada cifra individual
(`camino-celda__nota--no-publicable`) cuando el ejercicio no es publicable por una razón NO
jurídica.

**Defecto encontrado en E7 (auditoría adversarial posterior) y corregido — el más
significativo de este checkpoint, ver §9.14 para el detalle completo:** ese mismo rótulo
seguía mostrando la cifra en pesos tal cual cuando la razón de incompletitud era
específicamente una política jurídica `NO_RESUELTA` — contradice §0 punto 6 de este documento
("Ningún Preview puede presentar como resultado confiable una cifra construida sobre una
política `NO_RESUELTA`") y §9 (E9: "se muestra el estado intermedio honesto — elegibilidad
confirmada, cuantía pendiente de regla jurídica"). Corregido reteniendo la cifra (nunca
resolviendo la política jurídica): ver §9.14.

**Defecto encontrado en la propia auditoría (self-review) y corregido:** el panel de
desarrollo (`construirSettersEdicion`) seguía usando los setters crudos de `sexo`/
`fechaNacimiento`/`edadJubilacionDeseada` — editar esos campos desde el panel no invalidaba
`confirmacionContinuidad`, a diferencia de la pantalla real. Corregido agregando las tres
entradas al mapa `settersEdicion`.

**Resultado:** ver §9.14 para el recuento final y verificado de pruebas — E6.5, E6.6, E6.7 y
E7 se implementaron y auditaron en la misma sesión continua, sobre el mismo archivo de
pruebas de flujo conectado (`ProyectaTuPensionRPM.test.jsx`), así que un recuento intermedio
"solo E6.5" ya no es reconstruible de forma confiable después de las revisiones de E6.6/E7
sobre ese mismo archivo — este documento no registra una cifra que no pueda verificar contra
el estado real.

### 9.12 E6.6 — implementado, auditado y cerrado

**Estado: implementado y cerrado en la misma sesión que E6.5/E6.7/E7.** Nivel completo: cada
camino viable de la grilla existente gana un `<details>` "Ver el detalle auditable completo
de este camino" — el resumen (Nivel esencial) permanece siempre visible arriba; al expandir
aparecen los 7 `PasoAuditable` de Contrato F en su orden exacto, sin recalcular ni reinterpretar
ningún dato.

**Archivos:**
- `src/pages/nivelCompletoAuditable.helpers.js` — funciones puras de traducción campo→etiqueta
  y formato (pesos/porcentaje/semanas/booleano/origen), aplicadas SOLO donde el significado del
  campo se verificó leyendo el código que lo produce (`ajustarMesadaLegalRPM.js`,
  `construirEjercicioResueltoRPM.js`, `determinarBaseCotizacion.js`) — un campo sin etiqueta
  conocida (incluido uno futuro de Contrato F) cae a una versión humanizada de su nombre,
  nunca se oculta ni se inventa su unidad. 18 pruebas.
- `src/components/DetallePasoAuditable.jsx` — presenta un `PasoAuditable`, recursivo para
  valores anidados (`trazabilidadVentana`, `pisoEvaluado`/`techoEvaluado`, `fundamento`). 7
  pruebas.
- `src/components/PoliticasJuridicasInvolucradas.jsx` — sección propia, a nivel de ejercicio
  (nunca por camino), con nombre/estado/mensaje literal de cada política — vacío es un estado
  de dominio válido, no renderiza nada. 5 pruebas.

Caminos descartados: sin cambios, siguen mostrando únicamente `razonDescartado.mensaje` — I7
garantiza `pasos:[]`, así que nunca se ofrece un `<details>` vacío (verificado con un fixture
real de dos caminos, uno viable y uno descartado).

**Resultado:** 30 pruebas propias y aisladas de este checkpoint, verificadas de forma
independiente (18 en `nivelCompletoAuditable.helpers.test.js` + 7 en
`DetallePasoAuditable.test.jsx` + 5 en `PoliticasJuridicasInvolucradas.test.jsx`), más las
pruebas de flujo conectado que ejercitan la misma capacidad dentro de
`ProyectaTuPensionRPM.test.jsx` (ver §9.14 para el recuento final consolidado).

### 9.13 E6.7 — implementado, auditado y cerrado

**Estado: implementado y cerrado en la misma sesión que E6.5/E6.6/E7.** Accesibilidad
transversal + coherencia resumen↔gráfica↔Nivel completo:

- El aviso "no publicable" gana `role="status"` (equivalente a `aria-live="polite"`) para que
  un lector de pantalla anuncie su aparición/desaparición sin exigir renavegar hasta ahí.
- Con más de un camino viable, los controles "Ver el detalle auditable completo..." tenían el
  mismo nombre accesible — corregido con `aria-label` que incluye la decisión del camino
  (mismo criterio que los botones "Editar" del resumen revisable).
- **Hallazgo de coherencia gráfica↔resumen↔detalle:** `GraficoEsfuerzoResultado.jsx` usa
  `role="img"` en su `<svg>`, lo que oculta *todo* su contenido interno (incluidas las cifras
  en `<text>`) de la accesibilidad — un lector de pantalla no oía ninguna cifra del gráfico.
  Corregido con `descripcionAccesibleGrafico` (función pura nueva en
  `GraficoEsfuerzoResultado.helpers.js`, 6 pruebas nuevas) enlazada vía `aria-describedby` a
  un texto visualmente oculto (`.visually-hidden`, clase ya existente) con las mismas cifras
  (Hoy, extremo explorado, Tu objetivo, Tu elección) — nunca duplicado visible.

**Resultado:** 5 pruebas nuevas y aisladas en `GraficoEsfuerzoResultado.test.jsx` (archivo
nuevo) + 6 pruebas nuevas agregadas a `GraficoEsfuerzoResultado.helpers.test.js` (que ya tenía
37 antes de este checkpoint, verificado contra el commit previo — queda en 43) — ver §9.14
para el recuento final consolidado de toda la sesión.

### 9.14 E7 — auditoría adversarial ejecutada (PL-260 §0 punto 3)

**Estado: ejecutada en la misma sesión que cerró E6.5-E6.7, sobre los flujos reales ya
implementados — nunca sobre fixtures sintéticos salvo donde se documenta explícitamente lo
contrario.**

**Defecto real de contrato encontrado y corregido (el hallazgo principal de esta auditoría):**
revisando el enunciado exacto de §0 punto 6 ("Ningún Preview puede presentar como resultado
confiable una cifra construida sobre una política `NO_RESUELTA`... nunca una cifra que dependa
silenciosamente de haber elegido una interpretación no autorizada") y de §9 fila E9 ("se
muestra el estado intermedio honesto — elegibilidad confirmada, cuantía pendiente de regla
jurídica"), se confirmó que la implementación original de E6.5 violaba este contrato: cuando
`politicasInvolucradas` incluye una política jurídica `NO_RESUELTA` aplicable
(`razonesIncompleto` con código `POLITICA_JURIDICA_NO_RESUELTA`), la pantalla seguía mostrando
`formatearPesos(escenario.resultado.valor)` tal cual, solo con un rótulo adjunto — precisamente
la "cifra silenciosa" que §0 punto 6 prohíbe, porque ese número ya incorpora, sin declararlo,
una de las dos lecturas en disputa del Art. 34 (`ANCLA_FIJA_1300` vs. `ANCLA_MINIMO_APLICABLE`).

**Corrección aplicada — nunca resuelve la política jurídica, solo deja de mostrar la cifra
en silencio:**
- "Pensión proyectada mensual" y "Frente a tu objetivo" se reemplazan por un estado pendiente
  explícito ("Cuantía pendiente: depende de una política jurídica sin resolver") cuando
  `politicaJuridicaNoResuelta` es verdadero a nivel de ejercicio — nunca a nivel de camino
  individual, mismo alcance que la propia política (`evaluarPoliticasEjercicioRPM.js`: "a
  nivel de EJERCICIO, no por camino").
- El gráfico de esfuerzo↔resultado se reemplaza por el mismo tipo de aviso textual — dibuja la
  misma cuantía en disputa, así que mostrarlo sería la misma cifra silenciosa en otra forma
  visual (coherencia resumen↔gráfica exigida en E6.7).
- "Tu IBC" y "Aporte pensional adicional mensual" **siguen visibles** — no dependen de la
  política de tasa de reemplazo en disputa (son datos de entrada, no el resultado calculado
  bajo una interpretación).
- Confirmar continuidad de cotización **nunca** vuelve publicable un ejercicio con esta causa
  — `completo:false` por política jurídica es independiente de la confirmación (verificado con
  una prueba dedicada).

**Corrección del propio hallazgo, encontrada por Carlos/Atlas sobre el commit `465e045` y
cerrada en el mismo checkpoint E7 (ver §9.15 para el detalle completo):** el párrafo anterior
de esta sección afirmaba que el Nivel completo "sigue mostrando el valor crudo... nunca
silenciosa" — eso era incorrecto: mostrar el valor calculado de `RESULTADO_FINAL` (y de los
demás pasos que dependen de la misma tasa de reemplazo en disputa) sin ninguna advertencia
propia en ese paso es exactamente la misma "cifra silenciosa" que §0 punto 6 prohíbe, solo un
nivel más abajo que donde se corrigió primero. §9.15 documenta la corrección real.

**Otras pruebas adversariales agregadas sobre flujos reales, sin fabricar ninguna que repita
la implementación:**
- Varios caminos en orden distinto al de Contrato F: con un esfuerzo personalizado explorado
  (`user.click`/`user.type` reales sobre "Ver qué ocurriría con otro esfuerzo"), el orden real
  de `resultado.escenarios` (`[base, aumentar-ibc-futuro, esfuerzo-adicional-deseado]`)
  diverge del orden de presentación (`[base, esfuerzo-adicional-deseado,
  aumentar-ibc-futuro]`) — verificado que cada tarjeta expandida muestra el `RESULTADO_FINAL`
  de SU PROPIO camino (comparado contra su propia cifra de resumen), nunca el de otro; y que
  el gráfico usa exactamente el mismo escenario personalizado que la tarjeta "Tu elección"
  describe.
- Confirmación conservada: cambiar objetivo económico, IBC, límite de esfuerzo o historia de
  cotización, con edad/sexo/régimen/fecha de nacimiento sin cambios, nunca descarta una
  confirmación vigente — verificado con `rerender` sobre el componente real.
- Cadena visual no construida: **verificado empíricamente (no solo por lectura de comentarios)
  que este estado es estructuralmente inalcanzable con props reales** — un `sexo` inválido que
  haría fallar `evaluarPoliticasEjercicioRPM` (`SEXO_INVALIDO`) ya hace que
  `generarCaminosRPM` produzca `escenarios: []` antes de llegar ahí, así que la pantalla nunca
  muestra ni el Nivel esencial ni el mensaje de "cadena no construida" — sencillamente no hay
  resultado del que partir. Documentado como hallazgo, no fabricado como prueba sintética
  disfrazada de "flujo real" — esa rama defensiva ya tiene cobertura de unidad propia en
  `construirCadenaVisualEjercicioRPM.test.js` (E6.3, cerrado).

**Decisión de alcance no resuelta por E7 (transparencia explícita, no una decisión tomada por
esta sesión):** si "Aporte pensional adicional mensual" e "IBC" deberían también retenerse
cuando hay una política jurídica `NO_RESUELTA` es una lectura razonable pero no exigida
literalmente por §0 punto 6/§9 (ambos son datos de entrada, no el resultado calculado bajo la
interpretación en disputa) — se dejaron visibles, con el razonamiento documentado en el commit
y en este párrafo, para que Carlos/Atlas lo confirmen o lo corrijan explícitamente.

**Resultado — E6.5 + E6.6 + E6.7 + E7 (primera pasada, commit `465e045`):** ver §9.15 para el
recuento final consolidado, que incluye la corrección posterior descrita ahí — los números de
esta primera pasada quedaron superados por esa corrección y no se repiten aquí para no dejar
dos cifras finales distintas en el mismo documento.

### 9.15 Corrección posterior a E7 — el Nivel completo también retenía la cuantía en disputa

**Estado: corrección acotada, ejecutada y cerrada en la misma rama, sobre el commit `465e045`
ya empujado — solicitada explícitamente por Carlos/Atlas tras revisar ese commit.**

**Defecto encontrado (el propio §9.14 lo describía como corregido; no lo estaba del todo):**
el commit `465e045` retuvo correctamente la cifra en el Nivel esencial (tarjeta) y en el
gráfico, pero el Nivel completo (acordeón "Ver el detalle auditable completo de este camino")
seguía exponiendo el valor calculado de `RESULTADO_FINAL` — y, sin auditar todavía, también
de `TASA_REEMPLAZO`, `RESULTADO_MATEMATICO`, `AJUSTE_LEGAL` y `COMPARACION_OBJETIVO` — sin
ninguna advertencia propia en el paso. Los cinco dependen de la misma tasa de reemplazo en
disputa (el "ancla" del Art. 34 decide `bloquesAdicionales` → `incrementoPorSemanas` →
`tasaFinalAplicada`, que `RESULTADO_MATEMATICO` aplica, `AJUSTE_LEGAL` clampa,
`RESULTADO_FINAL` reexpone y `COMPARACION_OBJETIVO` compara contra el objetivo) — exactamente
la "cifra silenciosa" que §0 punto 6 prohíbe, solo un nivel más abajo de donde ya se había
corregido. `DATOS_UTILIZADOS` (IBC declarado/aplicado) e `IBL` (promedio histórico de IBC) son
datos de ENTRADA, calculados antes de aplicar cualquier tasa de reemplazo — no cambian entre
las dos interpretaciones en disputa, así que quedan fuera de esta corrección.

**Auditoría adicional de "todo lugar visible" (pedida explícitamente), tres leaks más
encontrados y corregidos, ninguno en los 7 pasos:**
- El badge "Camino más alineado con tu objetivo y las condiciones que nos diste" —
  conclusión derivada de comparar `distanciaObjetivo` (la cuantía en disputa) entre caminos.
- El bloque "Qué podrías explorar ahora" — cada mensaje posible de `TEXTO_ORIENTACION`
  (`ProyectaTuPensionRPM.helpers.js`) afirma directamente si el objetivo se alcanza (ej.
  "Mantener tu situación actual ya alcanza tu objetivo declarado.").
- El subtítulo final tras la grilla (`resultado.orientacion.razon`, ej. "Es el único camino
  evaluado que alcanza tu objetivo.") — misma categoría, texto posterior a la grilla.

Los tres se suprimen por completo cuando `politicaJuridicaNoResuelta` es verdadero — nunca se
reemplazan por una versión editada, porque cualquier redacción alternativa seguiría afirmando
o negando algo sobre una cuantía que la política jurídica deja sin resolver.

**Corrección aplicada — nunca resuelve la política jurídica, solo deja de exponer un valor
calculado sobre ella:**
- Nuevo `pasoDependeDePoliticaJuridica(codigo)` (`nivelCompletoAuditable.helpers.js`) —
  única fuente de verdad de qué pasos dependen de la tasa de reemplazo en disputa.
- Nuevo `mensajePasoPendienteDePolitica(politicasNoResueltas)` — compone "Pendiente: depende
  de la política jurídica "X", todavía sin resolver..." nombrando la política literalmente,
  sin mencionar ninguna interpretación (`ANCLA_FIJA_1300`/`ANCLA_MINIMO_APLICABLE`) ni
  redactar una conclusión jurídica nueva.
- `DetallePasoAuditable.jsx` gana una prop `pendiente`: cuando está presente, el paso **sigue
  apareciendo** (título visible, nunca omitido — PL-260 §8: "nunca omitir el paso en
  silencio"), pero su tabla de `datos` se reemplaza por ese mensaje.
- `ProyectaTuPensionRPM.jsx` decide, paso por paso, si pasa `pendiente` a cada
  `DetallePasoAuditable` — la decisión vive en la página (que ya tiene `politicaJuridicaNoResuelta`
  y `politicasJuridicas`), no en el componente presentacional.

**Verificado — un ejercicio jurídicamente resuelto no cambia de comportamiento:** el fixture
Hombre existente (sin política aplicable) sigue mostrando sus 7 pasos con valores reales
completos — prueba de regresión dedicada, sin `.detalle-paso__pendiente` en el DOM.

**Pruebas nuevas** (todas sobre el componente real, `ProyectaTuPensionRPM.test.jsx`): 18
pruebas nuevas en `nivelCompletoAuditable.helpers.test.js` → 24 (6 nuevas, para
`pasoDependeDePoliticaJuridica`/`mensajePasoPendienteDePolitica`); `DetallePasoAuditable.test.jsx`
7 → 9 (2 nuevas, para la prop `pendiente`); `ProyectaTuPensionRPM.test.jsx` reescribe una
prueba que quedó incorrecta tras la corrección y agrega tres: los 5 pasos dependientes nunca
exponen su valor calculado (con el detalle cerrado y expandido); el estado pendiente persiste
después de confirmar continuidad; "Camino más alineado"/"Qué podrías explorar ahora" nunca
aparecen bajo una política jurídica `NO_RESUELTA`; y una regresión que confirma que el
fixture jurídicamente resuelto conserva sus 7 pasos con cifras reales.

**Resultado final consolidado — E6.5 + E6.6 + E6.7 + E7 (primera pasada) + esta corrección,
toda la sesión, cifras verificadas:**
- 108 pruebas específicas de este trabajo, en 6 archivos: `ProyectaTuPensionRPM.test.jsx`
  (22), `nivelCompletoAuditable.helpers.test.js` (24), `DetallePasoAuditable.test.jsx` (9),
  `PoliticasJuridicasInvolucradas.test.jsx` (5), `GraficoEsfuerzoResultado.test.jsx` (5),
  `GraficoEsfuerzoResultado.helpers.test.js` (43).
- Suite completa: 82 archivos / 1657 pruebas en verde (línea base cierre de E6.4: 77 archivos
  / 1586 pruebas — 71 pruebas netas nuevas en toda la sesión, incluida esta corrección).
- Lint (`eslint .`) sin hallazgos; build (`vite build`) exitoso; `git diff --check` sin
  errores de espacio en blanco.
- **Ninguna verificación visual real (captura de pantalla/navegador) ni validación jurídica se
  presenta aquí como cerrada** — esta sesión no tiene herramienta de navegador; toda la
  verificación es DOM real vía React Testing Library + lectura de código. La validación visual
  y de lector de pantalla reales siguen pendientes del "Checklist manual posterior" ya previsto
  en §9.5, y las dos políticas jurídicas de §2 siguen exactamente `NO_RESUELTA` — ni E7 ni esta
  corrección las resuelven ni las acercan a resolverse, solo corrigen cómo se presenta su
  efecto en cada lugar visible de la pantalla.

**Valores que siguen visibles en un ejercicio con política jurídica `NO_RESUELTA` aplicable
(estado en este checkpoint, §9.15 — corregido en §9.16 para el camino cuyo IBC depende de la
búsqueda hacia el objetivo, ver más abajo):** decisión/tipo de cada camino; "Tu IBC" y "Aporte
pensional adicional mensual" (Nivel esencial); `DATOS_UTILIZADOS` e `IBL` completos (Nivel
completo); la sección "Políticas jurídicas de este ejercicio" con el mensaje jurídico íntegro;
caminos descartados con su razón. **Nunca visibles como cuantía calculada:** "Pensión
proyectada mensual", "Frente a tu objetivo", el gráfico de esfuerzo↔resultado, "Camino más
alineado", "Qué podrías explorar ahora", el subtítulo final de orientación, y los 5 pasos de
Nivel completo `TASA_REEMPLAZO`/`RESULTADO_MATEMATICO`/`AJUSTE_LEGAL`/`RESULTADO_FINAL`/
`COMPARACION_OBJETIVO` (aparecen con el mensaje de qué política los bloquea, nunca con su
valor).

**E6.6-E6.7 no requieren autorización separada de E6.5 en retrospectiva** — las tres, más E7 y
esta corrección posterior, se ejecutaron y cerraron en una sola rama con autorización
explícita de Carlos/Atlas para el conjunto. **Los checkpoints siguientes del plan vigente (E8
Preview/validación manual, E9 prueba final de Oscar) siguen sin iniciarse** y dependen, como
ya fija §0 punto 2, del cierre de las dos políticas jurídicas de §2 — ningún caso que dependa
de ellas puede exhibirse en Preview como resultado confiable, en ningún lugar de la pantalla.

### 9.16 Revisión visual real de Carlos/Atlas sobre capturas del Caso B, y auditoría integral final del release candidate para Óscar

**Estado: correcciones acotadas y auditoría de cierre, ejecutadas y cerradas en la misma
rama, sobre los commits `beb07bf`, `e1fab3c` y `f780db7` — con autorización explícita de
Carlos/Atlas para el conjunto, incluida la validación visual final aprobada sobre `f780db7`.**

Esta sección consolida tres rondas de trabajo posteriores a §9.15 (que solo documentaba hasta
`748fbd9`) y la auditoría integral final del release candidate, pedida explícitamente antes de
publicar para Óscar.

**Commit `beb07bf` — RESTRICCION_COSTO_LIMITA_RESULTADO retenida.** Auditoría de "todo lugar
visible" (pedida tras `748fbd9`): la limitación `RESTRICCION_COSTO_LIMITA_RESULTADO`
("...tu objetivo sí sería alcanzable dentro del tope legal") es una conclusión derivada de
`distanciaObjetivo.cumple` — la misma cuantía en disputa — y aparecía sin filtrar como nota de
camino. Nueva `filtrarLimitacionesPorPoliticaJuridica` (`ProyectaTuPensionRPM.helpers.js`),
aplicada a limitaciones comunes y específicas por camino solo cuando
`politicaJuridicaNoResuelta` es verdadero; las demás limitaciones (disclaimers genéricos) no se
tocan. Regresión dedicada: sin política aplicable, la misma limitación se sigue mostrando.

**Commit `e1fab3c` — Caso A: superposición visual y contradicción de copy (revisión visual real
de Carlos, primera captura de pantalla real sobre este flujo).** Dos hallazgos, ninguno de
cálculo: (1) `ConfirmacionContinuidadCotizacion.jsx` ya renderiza su propio `<div
className="insight">` de nivel superior; `ProyectaTuPensionRPM.jsx` lo envolvía en OTRO
`<div className="insight">` junto al aviso de "no publicable" — dos cajas anidadas con el mismo
borde/fondo, con 6px de separación (`.insight { gap: 6px }`) en vez de los 12px que
`.insight + .insight` ya preveía para dos bloques hermanos. Corregido quitando el `<div>`
envolvente (`Fragment` en su lugar). (2) "Qué podrías explorar ahora" y el hint bajo "Ver qué
ocurriría con otro esfuerzo" podían afirmar cosas contradictorias sobre si el esfuerzo
adicional era necesario, cuando `HOY_YA_ALCANZA_OBJETIVO` coexistía con una interpretación que
sí requiere esfuerzo desde otro ángulo — corregido para que el segundo nunca contradiga al
primero.

**Commit `f780db7` — Caso B: fuga jurídica en el Nivel completo del camino alternativo, dos
rondas sobre la misma revisión visual de Carlos/Atlas.**

*Ronda 1 (hallazgo inicial, capturas reales de Carlos):* el camino `aumentar-ibc-futuro` bajo
`PoliticaAnclaIncrementoMujer` `NO_RESUELTA` seguía revelando, en la tarjeta resumida y en
`DATOS_UTILIZADOS` del Nivel completo, el IBC propuesto (`$3.045.477` en la captura real) y el
aporte adicional (`$167.276`) — ambos son la SALIDA de `biseccionarEscenarioIbcFuturo`
(`generarCaminosRPM.js`), que busca el IBC mínimo cuya mesada gobernante alcance el objetivo
usando la misma tasa de reemplazo en disputa (`desglosarTasaReemplazoRPM`, mismo parámetro
`semanasBaseIncrementoRPM` que decide si la política aplica) — nunca un dato de entrada, a
diferencia de `base`/`esfuerzo-adicional-deseado`. Además: `PoliticaAnclaIncrementoMujer`
(identificador interno de código) aparecía cruda como título de su propia sección y dentro del
mensaje "Pendiente: depende de..."; el título de la decisión afirmaba "para alcanzar tu
objetivo" bajo una política todavía sin resolver; y el <details> "Ver el detalle auditable
completo de este camino" vivía suelto en el grid de CSS de la comparación de caminos (sin
`grid-column`/`grid-row` propios), quedando sujeto al auto-placement de CSS Grid, que podía
colocarlo en el hueco de OTRA columna — texto de un camino superpuesto visualmente sobre el de
otro.

Corrección: `caminoIbcDependeDePoliticaJuridica(escenario)` (`ProyectaTuPensionRPM.helpers.js`)
identifica el único camino afectado (`id === 'aumentar-ibc-futuro'`); `etiquetaNombrePolitica`
(`nivelCompletoAuditable.helpers.js`, única fuente, reutilizada también por
`PoliticasJuridicasInvolucradas.jsx`) traduce el nombre de la política sin inventar una
posición jurídica; `textoDecisionCamino` neutraliza el título de la decisión;
`camino-celda--detalle-completo` (fila de grid propia, `App.css`) fija el `<details>` a su
columna correcta. `formatearSemanasComoTexto` (`nivelCompletoAuditable.helpers.js`) descompone
semanas fraccionarias en semanas completas + días restantes, sin redondear hacia arriba
(`1.470 semanas y 6 días`, el caso real reportado); `ETIQUETAS_ORIGEN`/
`ETIQUETAS_RAZON_VIDA_LABORAL_NO_EVALUADA` traducen `continuidad_ibc_actual`/
`busqueda_objetivo_rpm`/`VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA`, antes crudos en el Nivel
completo.

*Ronda 2 (hallazgo posterior, misma revisión visual — la fuga era más profunda de lo que
parecía):* con el IBC/aporte/resultado ya ocultos, el Nivel completo del mismo camino todavía
mostraba `IBL aplicable` con un valor real y, dentro de "Trazabilidad de la ventana usada", el
período futuro completo con el IBC crudo embebido (`Ibc 3.045.477`, `Días Cotizados 3.023`,
`Es Escenario Futuro Sí`) — volviendo a revelar indirectamente la misma cifra. Verificado en
`calcularProyeccionRPM.js` (cerrado, sin tocar): `valorAplicado` (el IBC del camino) alimenta
tanto `periodoFuturo` (que entra a la ventana del IBL) como `promediarConFuturo`, para el IBL
ordinario y para la alternativa de vida laboral — el paso IBL depende del mismo IBC disputado,
no solo `DATOS_UTILIZADOS`. Corrección: `pasoUsaIbcEnDisputaDelCamino(codigoPaso, escenario)`
(`ProyectaTuPensionRPM.helpers.js`) extiende el criterio "todo o nada por paso" a `IBL` además
de `DATOS_UTILIZADOS`, solo para el camino afectado — el paso completo (incluida
`trazabilidadVentana` anidada) queda pendiente, igual que los 5 pasos ya dependientes de la
tasa de reemplazo. El camino `base` (independiente) nunca cambia: su IBC, IBL y trazabilidad
siguen completos y reales.

**Corrección adicional de la misma sesión de `f780db7`:** `textoFuenteSemanas`
(`ProyectaTuPensionRPM.helpers.js`) mostraba las semanas declaradas sin separador de miles
("1039 semanas") — corregido a `toLocaleString('es-CO')` ("1.039 semanas"), sin redondeo (es
un entero declarado, no uno fraccionario).

**Tabla corregida de "valores que siguen visibles" (reemplaza la de §9.15 para el camino
afectado):** en un ejercicio con política jurídica `NO_RESUELTA` aplicable, el camino cuyo IBC
depende de la búsqueda hacia el objetivo (`caminoIbcDependeDePoliticaJuridica`) tiene sus
**7 pasos de Nivel completo pendientes** (`DATOS_UTILIZADOS`, `IBL`, y los 5 ya dependientes de
la tasa de reemplazo) — ninguno expone un valor calculado. Los demás caminos del mismo
ejercicio (`base`, y `esfuerzo-adicional-deseado` cuando existe) conservan `DATOS_UTILIZADOS` e
`IBL` completos y reales — su IBC nunca sale de una búsqueda condicionada por la política.

**Auditoría integral final del release candidate (ronda 3, esta misma sesión, sin nuevos
defectos funcionales/jurídicos encontrados):** se revisó el flujo completo App.jsx →
`generarCaminosRPM` → `evaluarPoliticasEjercicioRPM` → `construirEjercicioResueltoRPM` →
`construirModeloVisualEjercicioRPM`/`construirCadenaVisualEjercicioRPM` →
`ProyectaTuPensionRPM.jsx` → Nivel completo, contra el código real y las pruebas vigentes
(nunca solo contra comentarios o informes previos). Hallazgos, todos de documentación en
código (comentarios desactualizados, ninguno de comportamiento):
- `construirCadenaVisualEjercicioRPM.js`, `construirModeloVisualEjercicioRPM.js`,
  `construirEjercicioResueltoRPM.js`, `evaluarPoliticasEjercicioRPM.js` y
  `compararAnclaIncrementoRPM.js` seguían describiéndose en su cabecera como "dormidos, sin
  consumidor real" — desde E6.5 todos están conectados en firme (verificado: `resultado`,
  `politicasInvolucradas` y `modeloVisual` de esta cadena alimentan cada render real de
  `ProyectaTuPensionRPM.jsx`, incluida la comparación de las dos interpretaciones del ancla de
  incremento). Corregido: cada cabecera ahora registra que nació dormido y cuándo se conectó.
- `ConfirmacionContinuidadCotizacion.jsx` seguía describiéndose como "sin conexión con `App.jsx`
  ni con `ProyectaTuPensionRPM.jsx`" — conectado desde E6.5 (`confirmacionContinuidad`/
  `onConfirmarContinuidad`, `App.jsx`/`ProyectaTuPensionRPM.jsx`). Corregido.
- **Hueco de cobertura real (no un defecto de comportamiento) encontrado y cerrado:** la
  invalidación de `confirmacionContinuidad` al cambiar sexo, régimen actual o fecha de
  nacimiento (`actualizarSexo`/`actualizarRegimenActual`/`actualizarFechaNacimiento`, `App.jsx`
  — código ya correcto desde E6.5, verificado por lectura directa) solo tenía cobertura de
  regresión real para edad objetivo (`App.test.jsx`). Se agregaron pruebas para sexo y fecha de
  nacimiento por la ruta real de `App.jsx` (usando un fixture/edad donde el cambio de sexo no
  cruza el mínimo legal de elegibilidad, para aislar la invalidación de un efecto colateral no
  relacionado), y una prueba de que cambiar el objetivo económico NUNCA invalida (decisión ya
  aprobada, E6.4). El régimen actual no recibió una prueba equivalente de este tipo: cambiarlo
  sin salir de `ProyectaTuPensionRPM.jsx` no es un flujo real (el único camino real es el botón
  "Editar tu régimen actual", que navega a `situacionPensional` — ya cubierto por
  `navegacionRPM.test.js`); la línea de invalidación en sí es idéntica en forma a las otras
  tres, verificada por lectura directa.
- Ningún identificador interno de código, mensaje crudo de dominio, ni cifra dependiente de una
  política jurídica sin resolver se encontró expuesto fuera de lo ya corregido en `beb07bf`/
  `e1fab3c`/`f780db7` — verificado por búsqueda literal en todo `src/` de
  `continuidad_ibc_actual`, `busqueda_objetivo_rpm`, `VIDA_LABORAL_REQUIERE_HISTORIA_ESTRUCTURADA`,
  `PoliticaAnclaIncrementoMujer` y `razonesIncompleto` fuera de comentarios/pruebas, y por
  revisión de cada lugar donde un campo `.codigo`/`.nombre`/`.estado` interno se interpola en
  JSX (ninguno se renderiza como texto visible; los únicos usos son `key` de React).
- **Ninguna interpretación jurídica fue elegida en ningún momento de esta auditoría ni de las
  correcciones anteriores** — las dos políticas de §2 siguen exactamente `NO_RESUELTA`, sin
  cambio; toda corrección fue de presentación (qué se muestra, nunca qué valor legal es
  correcto).

**Resultado final consolidado — `beb07bf` + `e1fab3c` + `f780db7` + esta auditoría (ronda 3),
cifras verificadas:**
- Suite completa: **81 archivos / 1698 pruebas en verde**, verificado ejecutando la suite
  completa en esta sesión (línea base registrada en §9.15: 82 archivos / 1657 pruebas — el
  conteo de pruebas creció en las tres rondas; la cifra de archivos no se re-auditó
  retroactivamente en esta sesión, solo se reporta el conteo real y actual, ejecutado ahora).
- Lint (`eslint .`) sin hallazgos; build (`vite build`) exitoso; `git diff --check` sin errores.
- `src/App.test.jsx` — primer archivo con cobertura de la ruta real COMPLETA (`App.jsx` montado
  entero, panel de desarrollo → fixture real → pantalla real), para el Caso A jurídicamente
  resuelto y el Caso B con política `NO_RESUELTA`, incluida la invalidación de la confirmación.
- **Validación visual real de Carlos y Atlas, aprobada explícitamente sobre `f780db7`** —
  primera vez que este flujo se valida contra la interfaz real, no solo contra DOM de pruebas.
- **E8 (Preview y validación manual) y E9 (prueba final de Oscar) siguen sin iniciarse** — la
  validación visual de esta ronda cubre el comportamiento del Caso A/Caso B ya implementado,
  pero no constituye el Preview formal de E8 ni la prueba de aceptación de E9, y las dos
  políticas jurídicas de §2 siguen `NO_RESUELTA`, sin cambio. IA explicativa (S4-007) y el resto
  de `IA_EXPUESTA_EN_MVP`/`MODELO_VISUAL_EJERCICIO_ACTIVO` (este último ya retirado desde E6.5)
  permanecen sin activarse para esta publicación — decisión de producto ya registrada, no
  reabierta aquí.

### 9.17 Cierre de huecos explícitos de la auditoría §9.16 (ronda 2, revisión de Atlas) — decisión de alcance sobre indemnización sustitutiva

**Estado: fronteras exactas cerradas con pruebas reales; decisión de alcance registrada;
contradicción del plan de aceptación de Óscar corregida — cierre acotado, sin commit todavía
(pendiente de nueva revisión de Carlos/Atlas antes de confirmar el veredicto APTO PARA
PREVIEW).**

**Fronteras exactas agregadas (nunca solo lectura de código — cada una es una prueba real
ejecutada, ver archivos citados):**
- **Piso y techo** (`ajustarMesadaLegalRPM.test.js`): 1 peso por debajo del piso, exactamente
  en el piso, 1 peso por encima, exactamente en el techo, 1 peso por encima del techo — cada
  caso confirma valor matemático (nunca mutado), ajuste aplicado/no aplicado, resultado final
  exacto, y que `mesadaGobernante` (la función real de `generarCaminosRPM.js` que decide
  `resultado.valor`) usa el valor ajustado, nunca el crudo.
- **Elegibilidad, motor RPM real** (`evaluarElegibilidadProyectadaRPM.test.js`, nunca
  `evidenciaEdadPension.js`): edad exacta en el mínimo (62, Hombre), un año menos, un año más;
  semanas exactas en el mínimo (1.300 = 1.248 declaradas + 52 futuras, combinación verificada
  por aritmética exacta), una semana menos, una semana más. **Declarado explícitamente, como
  exigió Atlas**: ninguna de estas fronteras depende de `PoliticaAnclaIncrementoMujer`
  NO_RESUELTA (exclusiva de mujeres y de la tasa de reemplazo, nunca de la elegibilidad de
  edad/semanas — por eso ambos bloques usan sexo Hombre, con valores fijos de ley, para
  aislar la frontera de cualquier interpretación en disputa). **Hallazgo honesto declarado, no
  simulado**: la edad, en este motor, se compara como ENTERO de años (`edadJubilacionDeseada
  >= edadMinimaAplicable.valor`) — no existe una frontera de "un día antes/después" a nivel de
  este motor (esa es la frontera de `evidenciaEdadPension.js`, capacidad distinta, ya
  verificada en la ronda anterior); la frontera real de este motor es el año entero, que es la
  que se probó.
- **IBC** (`determinarBaseCotizacion.test.js`): vacío, cero (parsea como número válido, pero el
  piso legal lo bloquea — nunca "ausente"), negativo y no numérico (ya cubiertos antes),
  exactamente 1 SMLV (ya cubierto), un peso por debajo de 1 SMLV, exactamente en el tope
  (`<=` inclusivo, sin ajuste), un peso por encima del tope (clamp exacto), magnitud extrema
  finita (10^15, mismo clamp genérico, sin NaN/Infinity).
- **Otras coberturas pedidas** (`generarCaminosRPM.test.js`, `calcularProyeccionRPM.test.js`):
  esfuerzo adicional negativo y cero pasados directamente al dominio (bypasseando la UI) nunca
  generan el camino personalizado; el camino "aumentar IBC" nunca propone un IBC inferior al
  actual, verificado con el valor real de la bisección en el caso general y en el caso más
  ajustado (objetivo apenas 1 peso por encima de lo que el base ya produce); una ejecución
  nunca mezcla fechas base monetarias — verificado por lectura (`anioReferenciaIPC` se calcula
  una sola vez y se reutiliza idéntico) y empíricamente (llamadas secuenciales con fechas
  distintas nunca se contaminan entre sí).
- Ningún defecto encontrado en ninguna de estas fronteras — todas confirman el contrato ya
  existente, sin necesitar ninguna corrección de comportamiento.

**Decisión de alcance — indemnización sustitutiva (Carlos/Atlas):** **la indemnización
sustitutiva queda expresamente fuera del alcance de este MVP para Óscar.** El MVP proyecta
pensión de vejez RPM y se detiene honestamente cuando no se alcanzan los requisitos — nunca
calcula, estima ni recomienda indemnización sustitutiva. Verificado que ninguna pantalla
afirma actualmente cubrir "todas las prestaciones posibles" (búsqueda literal en `src/pages/`
y `src/components/`, sin resultados) — `Bienvenida.jsx` ya acota explícitamente el alcance a
"vejez", nombrando otros casos (incapacidad laboral, protección familiar, pensión ya
reconocida, reclamación/trámite activo) como exclusiones, nunca como opciones disponibles —
por eso esta decisión no requiere ningún texto nuevo en la UI, solo este cierre documental.

**Contradicción del plan de aceptación de Óscar, corregida:** la fila 11 del "Set de
aceptación para Oscar" (`docs/qa/matriz-pruebas-funcionales-mvp.md`) le pedía a Óscar cargar
un fixture del panel de desarrollo — imposible en el Preview real, que correctamente nunca
expone esa herramienta (`import.meta.env.DEV`, confirmado ausente del bundle de producción en
§9.16). Investigado y resuelto por la vía 1 (Atlas): **el Caso B SÍ se puede reproducir por el
recorrido público normal** — el panel de desarrollo aplica sus fixtures escribiendo
exactamente los mismos campos de estado de `App.jsx` que las pantallas reales ya escriben
(`src/dev/aplicarFixture.js`, verificado campo por campo contra las props de
`DatosIniciales.jsx`/`SituacionPensional.jsx`/`InformacionPensionalEsencial.jsx`/
`BaseCotizacion.jsx`/`HistoriaCotizacionRPM.jsx`/`ProyectaTuPensionRPM.jsx` en `App.jsx`) —
nunca por una vía especial solo alcanzable desde el panel. Se documentaron los datos y pasos
exactos directamente en la matriz (mujer, 1974-01-01, RPM sin traslado, empleada, 1.039
semanas conocidas, IBC $2.000.000 conocido, tres períodos de historia reales, edad objetivo 61,
objetivo $2.000.000). **Nunca se agregó ninguna ruta secreta, query param, fixture loader ni
control QA al bundle público** — la corrección es puramente de guía de prueba, sin tocar
código de producción. El Caso A (fixture "RPM — empleado — Proyecta tu pensión...") ya estaba
correctamente planteado en el Set de aceptación desde antes (ítems 1/3-6) por el mismo
recorrido público, sin depender nunca del panel de desarrollo.

**Contaminación de `.vercel/output` en el conteo de pruebas — resuelto:** `vite.config.js`
gana `test.exclude: [...configDefaults.exclude, '**/.vercel/**', '**/.claude/**']` — preserva
TODAS las exclusiones por defecto de Vitest, solo agrega estas dos (nunca las reemplaza).
`.vercel/output/functions/**` (artefacto de `vercel build`, E8) y `.claude/worktrees/**` (un
git worktree ajeno, rama distinta, no relacionado con esta sesión) contaminaban el comando
oficial (`npm test` / `vitest run`, sin flags) con 4 archivos / ~30 pruebas que no pertenecen
al código real de esta rama. Conteo autoritativo verificado con el comando oficial, sin ningún
flag manual: **81 archivos / 1724 pruebas**, verificado ejecutando la suite completa con el
comando oficial en esta sesión (1702 antes de esta ronda + 22 pruebas nuevas de fronteras
exactas y regresión — ver detalle arriba).

**Resultado final de esta ronda:** suite completa (comando oficial) 81 archivos / 1724
pruebas en verde; suite RAIS sin cambios (62/62); lint sin hallazgos; build exitoso; `git diff
--check` sin errores. Archivos modificados: `vite.config.js`,
`evaluarElegibilidadProyectadaRPM.js`/`.test.js`, `generarCaminosRPM.js`/`.test.js`,
`ajustarMesadaLegalRPM.js`/`.test.js`, `determinarBaseCotizacion.test.js`,
`calcularProyeccionRPM.test.js`, `docs/qa/matriz-pruebas-funcionales-mvp.md`, este documento,
`cierre-sprint-4.md`. Sin commit todavía — pendiente de nueva revisión de Carlos/Atlas.
