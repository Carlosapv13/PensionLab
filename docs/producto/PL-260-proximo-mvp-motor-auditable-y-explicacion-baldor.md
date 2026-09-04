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
5. **La controversia del ancla de incrementos para mujeres NO se difiere fuera del próximo
   MVP.** A diferencia de lo que el plan original dejaba abierto indefinidamente, ahora está
   registrado explícitamente: puede bloquear entregas concretas (E3 para el rango de
   mujeres afectado), pero **debe estar resuelta antes de publicar** (E10) — no es una
   decisión que se pueda posponer a una versión futura del producto.
6. **La experiencia Baldor tendrá dos niveles visuales — respuesta esencial y ejercicio
   completo paso a paso — y el ejercicio completo NO se difiere.** Corrige la
   recomendación de la revisión crítica (que sugería posponer el Nivel 3 completo) — Carlos
   decidió que el ejercicio completo es parte obligatoria del próximo MVP, no una mejora
   futura.
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
                               reutilizar/extender construirHechosEscenario.js una vez
                               extraído a una capa neutral (§0.1.4), no duplicar su mecanismo.
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
| **E2** | Separación elegibilidad/cuantía (Contratos A + parte de B). | Creadas en esta misma entrega — ver §5. | Ninguna (Carril 1). | **Pendiente de autorización de Carlos/Atlas tras este informe** | Prohibido |
| **E3** | Piso de pensión mínima y Contrato D (ajustes legales). | Creadas en E3: piso mayor/igual/menor al resultado matemático; objetivo mayor/igual/menor al piso; ningún aporte cuando el base ajustado ya alcanza el objetivo. | **Bloqueado por Carril 2** (ancla de incremento mujer, si el caso cae en el rango divergente) y por el cierre de E1 (fuente del piso). | Prohibido hasta autorización | Prohibido |
| **E4** | Caminos, búsqueda inversa, barrido — reconstruidos sobre D, no sobre C. Nueva demostración de monotonicidad con piso incluido. | Creadas en E4: curva plana durante el piso y creciente después; coherencia entre camino base/alternativo tras el piso. | Depende de E3. | Prohibido | Prohibido |
| **E5** | Contrato `EjercicioResueltoRPM` (F) con invariantes I1-I8 como tests. | Creadas en E5: los 8 invariantes, ejecutados sobre los fixtures de E2-E4. | Ninguna adicional a las de E3/E4. | Prohibido | Prohibido |
| **E6** | Experiencia visual (Niveles 1-3, wireframes ya diseñados). **Depende obligatoriamente de E3, E4 y E5** — no empieza antes. | Creadas en E6: accesibilidad (teclado, lectores de pantalla), coherencia visual tarjeta/gráfica/Baldor. | Las mismas de E3-E5, heredadas. | Prohibido | Prohibido |
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
