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
| **E6** | Experiencia visual — dos niveles (Nivel esencial y Nivel completo, ver §9), wireframes ya diseñados. **Depende obligatoriamente de E3, E4 y E5** — no empieza antes. | Creadas en E6: accesibilidad (teclado, lectores de pantalla), coherencia visual tarjeta/gráfica/Nivel completo. | Las mismas de E3-E5, heredadas. | **E6.1 (diseño del contrato visual) aprobado, sin código — ver §9.** Implementación (E6.2 en adelante) sigue **prohibida hasta autorización explícita**. | Prohibido |
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
§9), cuyo diseño (E6.1) ya está aprobado y cerrado sin código — la implementación (E6.2 en
adelante) requiere autorización explícita, independiente y separada — no iniciada.**

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
| **E6.2** | `construirModeloVisualEjercicioRPM` — adaptador puro, con pruebas Vitest exhaustivas. | Dormido — cero consumidor | Propia, explícita — **único siguiente checkpoint operativo, sigue sin autorizarse** |
| **E6.3** | Integración real dormida — la página invoca los pasos 1-4 de §9.3 tras un interruptor (mismo patrón `IA_EXPUESTA_EN_MVP`), sin cambiar nada visible. | Dormido (interruptor apagado) | Propia, explícita |
| **E6.4** | Gate de confirmación de continuidad (§9.4), aislado — primeras pruebas de componente reales, aquí se solicita la dependencia de RTL. | Real, tras activar E6.5 | Propia, explícita — incluye aprobar la dependencia nueva |
| **E6.5** | Nivel esencial visual real — primer consumidor visible de F; disclosure de política `NO_RESUELTA`/`completo`/`publicable`. | **Real — primer consumidor visible de F** | Propia, explícita |
| **E6.6** | Nivel completo — acordeón por camino, pasos auditables en orden de Contrato F. | Real | Propia, explícita |
| **E6.7** | Accesibilidad transversal (teclado, lector de pantalla) + coherencia visual resumen↔gráfica↔Nivel completo. | Real | Propia, explícita |

### 9.7 Relación con S4-007 — separación explícita (no confundir con E6)

S4-007 (explicación con IA) está implementado, integrado y probado a nivel de código/contrato
(commits `333787fc`/`db1bac72`), pero deliberadamente no expuesto en el MVP
(`IA_EXPUESTA_EN_MVP = false`, commit `99cae1a`) — ver detalle cronológico completo en
`docs/gestion/cierre-sprint-4.md`. **E6 es presentación determinista de Contrato F y nunca
debe activar S4-007 ni ningún llamado a IA** — son capas paralelas sobre el mismo Contrato E,
cada una con su propio re-shaping (`construirHechosEscenario.js` para IA;
`construirModeloVisualEjercicioRPM` para E6). Ningún checkpoint de §9.6 modifica
`IA_EXPUESTA_EN_MVP` ni ningún archivo de `src/ia/`/`api/`.
