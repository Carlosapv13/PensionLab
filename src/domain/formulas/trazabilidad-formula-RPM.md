# Trazabilidad de fórmula — `formulaRPM.js`

Documenta la fórmula legal exacta, sus fuentes y el contrato de las funciones puras
**antes** de escribir código. Complementa (no reemplaza) `data/legal/trazabilidad-normativa.md`:
ese archivo traza los *valores* legales; este traza la *fórmula* que los combina.

## Fórmula legal

**Fuente:** Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003. Mismos
artículos ya validados en `data/legal/trazabilidad-normativa.md` para los campos
`tasaReemplazoConstante`, `tasaReemplazoPendiente`, `tasaReemplazoMinima`,
`tasaReemplazoMaxima`, `semanasPorIncrementoAdicional`, `incrementoPorcentualPorTramo`
(entradas correspondientes ya cargadas en `data/legal/versions/vigente-2026.json`).

**Tasa de reemplazo base:**

```
s    = IBL / SMLV
base = tasaReemplazoConstante − tasaReemplazoPendiente × s     (65.5 − 0.5·s)
base = clamp(base, tasaReemplazoMinima, tasaReemplazoMaxima)    (clamp a [55, 80])
```

**Incremento por semanas adicionales:**

```
tramos     = floor(max(0, semanasCotizadas − ANCLA) / semanasPorIncrementoAdicional)   (bloques de 50)
incremento = tramos × incrementoPorcentualPorTramo                                      (1.5 pts c/u)
```

**Tasa final y pensión:**

```
tasaFinal = clamp(base + incremento, tasaReemplazoMinima, tasaReemplazoMaxima)
pension   = IBL × (tasaFinal / 100)
```

## Punto de controversia encontrado — ancla del incremento (`ANCLA`)

Investigando la fórmula del incremento encontré una disputa real, no resuelta de forma
uniforme: **Colpensiones interpreta que el ancla de "semanas adicionales" es siempre
1300** (lectura textual del Art. 34, que menciona "1300 semanas" explícitamente),
**incluso para mujeres que ya son elegibles desde 1250 semanas** (Sentencia C-197/2023).
Existe una interpretación alternativa, favorable a la afiliada, que argumenta que el
ancla debería ser el mínimo aplicable a cada quien (1250 en 2026 para mujeres), pero no
es la interpretación que Colpensiones aplica en la práctica.

**Decisión adoptada para Sprint 1:** seguir la interpretación de Colpensiones (ancla fija
en 1300 semanas, para ambos sexos) por ser la que efectivamente se paga hoy — mostrar la
interpretación favorable sin advertencia sería sobre-prometer un monto que el sistema real
no reconocería. Esto se implementa **reutilizando el valor ya validado
`semanasMinimasPensionHombre` (1300)** como ancla para ambos sexos, en vez de crear un
campo legal nuevo — es explícitamente un parámetro distinto de
`semanasMinimasRequeridas` (que sigue siendo específico de sexo/fecha, pero solo se usa
para elegibilidad vía `obtenerSemanasMinimas`, no para este incremento).

**Esto debe declararse en `Explanation.limitaciones`**, especialmente para mujeres: *"El
incremento de la tasa de reemplazo por semanas adicionales se calcula desde 1300 semanas
(interpretación de Colpensiones), no desde el mínimo de elegibilidad de 1250 semanas
vigente para mujeres en 2026 — existe una interpretación alternativa en disputa que
podría resultar en una tasa mayor."* Esto no se implementa en este documento, solo queda
señalado como requisito para cuando se construya `explainCalculation.js`.

> **Nota de alcance (Sprint 1):** `semanasBaseIncrementoRPM` reproduce la metodología
> *operacional* que Colpensiones aplica hoy en la práctica administrativa, no una
> interpretación jurídica definitiva ni una posición legal de PensionLab sobre cuál
> lectura del Art. 34 es la correcta. Es una decisión de producto para que el resultado
> del simulador sea consistente con lo que un usuario recibiría si tramitara su pensión
> hoy — no un pronunciamiento sobre la disputa interpretativa, que sigue abierta y sin
> resolver por vía judicial. Si esa disputa se resuelve formalmente (ej. jurisprudencia
> unificada o cambio de criterio de Colpensiones), este valor debe revisarse.

## Contrato de funciones

Parámetros separados en `datosUsuario` (lo que aporta el usuario) y `parametrosLegales`
(lo que resuelve `data/legal`), por decisión de este ajuste.

```js
/**
 * @typedef {Object} DatosUsuarioRPM
 * @property {number} ibl               - Ingreso Base de Liquidación
 * @property {number} semanasCotizadas  - Semanas efectivamente cotizadas por el usuario
 *
 * @typedef {Object} ParametrosLegalesRPM
 * @property {number} smlv                          - SMLV vigente, para el ratio ibl/smlv
 * @property {number} tasaReemplazoConstante          - Coeficiente base (65.5)
 * @property {number} tasaReemplazoPendiente          - Coeficiente que pondera ibl/smlv (0.5)
 * @property {number} tasaReemplazoMinima             - Piso legal % (55)
 * @property {number} tasaReemplazoMaxima             - Techo legal % (80)
 * @property {number} semanasBaseIncrementoRPM         - Ancla del incremento (1300 — ver
 *   "Punto de controversia" arriba; NO usar semanasMinimasRequeridas aquí)
 * @property {number} semanasPorIncrementoAdicional    - Tamaño del tramo (50)
 * @property {number} incrementoPorcentualPorTramo     - Incremento por tramo, en puntos (1.5)
 */

/**
 * @param {{datosUsuario: DatosUsuarioRPM, parametrosLegales: ParametrosLegalesRPM}} params
 * @returns {number} Tasa de reemplazo aplicada, en % (ej. 68.5). Sin redondear.
 */
function calcularTasaReemplazoRPM(params) {}

/**
 * @param {{datosUsuario: DatosUsuarioRPM, parametrosLegales: ParametrosLegalesRPM}} params
 * @returns {number} Pensión mensual estimada, en la unidad de `datosUsuario.ibl`. Sin redondear.
 */
function formulaRPM(params) {}
```

Se mantiene el doble acotamiento acordado: clamp del `base` (paso 1) y clamp de
`base + incremento` (paso 3) — ambos a `[tasaReemplazoMinima, tasaReemplazoMaxima]`.
Ninguna función lee JSON, conoce `data/legal`, ni redondea — eso es responsabilidad de
capas superiores.

## Ejemplos numéricos (para validar contra los tests unitarios cuando se implemente)

| Caso | IBL (en SMLV) | Semanas cotizadas | s | base (clamp) | tramos | tasa final | pensión (en SMLV) |
|---|---|---|---|---|---|---|---|
| Hombre, justo en el mínimo | 1 | 1300 | 1 | 65.5−0.5=65 | 0 | 65 | 0.65 |
| Hombre, con semanas extra | 5 | 1500 | 5 | 65.5−2.5=63 | 4 | 69 | 3.45 |
| Ingreso alto, en el tope IBC | 25 | 1300 | 25 | 65.5−12.5=53 → clamp 55 | 0 | 55 | 13.75 |
| Mujer 2026, elegible pero bajo el ancla del incremento | 3 | 1250 | 3 | 65.5−1.5=64 | 0 (1250 < ancla 1300) | 64 | 1.92 |

El último caso es el que ilustra directamente el punto de controversia: la mujer ya es
elegible para pensionarse (1250 ≥ 1250 requeridas), pero no recibe ningún incremento por
semanas adicionales porque 1250 < 1300 (ancla).

## Limitaciones a declarar (para `Explanation.limitaciones`, cuando se implemente)

- Ancla del incremento fija en 1300 semanas para ambos sexos (interpretación Colpensiones,
  no la única interpretación legal posible — ver sección de controversia).
- No incluye régimen de transición.
- No incluye bono pensional ni traslados de régimen previos.
- Asume que `ibl` ya viene correctamente calculado (indexación de IBC históricos) desde
  una capa anterior — esta fórmula no calcula el IBL, solo lo consume.

## Proyección RPM — Convención económica v1 (S4-002, aprobada 2026-08-20)

Resuelve el bloqueo §8.2 y la decisión pendiente §14.1 de
`entregable-2-pensionlab-responde-explora-y-explica.md`, condicionada — y ahora
desbloqueada — por el cierre del selector temporal ordinario (S4-001B, 3.650 días
efectivamente cotizados). Documenta la metodología **antes** de `calcularProyeccionRPM.js`,
mismo criterio que el resto de este archivo. `formulaRPM.js`, `calcularTasaReemplazoRPM` y
`seleccionarVentanaEfectivamenteCotizada` no se modifican — toda la novedad vive en la
orquestación nueva y en una extensión mínima de firma de `seleccionarPeriodosIBL.js`.

### Principio rector

Todo el resultado se expresa en **pesos reales de la fecha de cálculo** (`fechaBaseMonetaria`
= `fecha`, por defecto hoy) — nunca pesos nominales futuros. Mismo principio que la
Convención Económica v1 ya aprobada para RAIS (`trazabilidad-formula-RAIS.md`, "RAIS en
términos reales"), aplicado aquí sobre una fórmula distinta: RPM promedia historia real
indexada por IPC, RAIS capitaliza aportes futuros a una tasa real. La consecuencia
estructural es la misma en ambos casos: **cero inflación futura inventada**.

### Procedencia del IBC futuro — nunca disfrazada de decisión

Separación aprobada explícitamente (revisión previa a este documento, 2026-08-20), para no
presentar un supuesto de producto como si fuera algo que la persona decidió:

- `ibcAplicableSimulacion` — dato/base económica actual, ya resuelto (el mismo valor que
  usa RAIS hoy). Un hecho, no una proyección.
- **Escenario de continuidad** — supuesto explícito: "mantener en términos reales el IBC
  actual hasta la jubilación". Es el único escenario que S4-002 construye y evalúa.
- `escenarioIbcFuturo: { valor, origen }` — lo que efectivamente entra al cálculo.
  `origen` es un string abierto, opaco para la aritmética (nunca cambia el resultado, solo
  viaja hasta la salida para trazabilidad/UI). S4-002 produce exclusivamente
  `origen: 'continuidad_ibc_actual'`, con `valor = ibcAplicableSimulacion`. No se cierra un
  enum con valores especulativos de S4-003 (ej. `'decision_usuario'`, candidatos de
  bisección) — ese diseño le corresponde a esa Slice cuando exista; el campo ya admite
  cualquier string sin cambiar de forma.

Esta separación es lo que permite que S4-003 reutilice `calcularProyeccionRPM.js` sin
modificarlo: su búsqueda determinista (§7.3 del Entregable 2) evaluará la misma función
repetidamente con distintos `escenarioIbcFuturo.valor`, exactamente como
`generarCaminosRAIS.js` ya reevalúa `calcularProyeccionRAIS` con distintos candidatos de
IBC sin que esa función sepa si el valor es "el actual" o "un candidato de búsqueda".

### Tope legal de IBC — trazabilidad completa, nunca sobrescritura silenciosa

Si `escenarioIbcFuturo.valor` supera el tope legal vigente (`topeMaximoIBC × smlv`,
resueltos a `fecha`), el cálculo usa el valor capado — pero el resultado conserva ambos
valores, nunca solo el capado:

```
escenarioIbcFuturo: {
  valorDeclarado,   // lo que la persona/escenario quiso evaluar
  valorAplicado,    // min(valorDeclarado, topeAplicado) — lo que entra a la aritmética
  origen,
  topeAplicado,     // topeMaximoIBC × smlv, siempre presente, capado o no
}
```

El cálculo usa exclusivamente `valorAplicado`; la explicación (S4-007) puede mostrar ambos
para que la persona entienda por qué su cifra proyectada no refleja literalmente lo que
declaró, si el tope se activó.

### Período futuro — constante, sin indexación, nunca pasa por IPC

Se construye un único período sintético `{fechaDesde: fecha+1, fechaHasta:
fechaReconocimiento, ibc: valorAplicado, diasCotizados: díasCalendario(fecha+1,
fechaReconocimiento)}` — continuidad futura sin huecos, supuesto explícito (mismo criterio
que `continuidadCotizacion`/`salarioConstante` de RAIS), y se antepone a
`historiaCotizacion` antes de llamar al selector.

Este período **nunca se pasa a `calcularPromedioIBL`/`dividirPeriodoPorAnio`**: la garantía
de "cero IPC futuro inventado" es estructural, no una validación — la función que indexa por
IPC real jamás recibe una fecha futura como argumento. El promedio final combina el tramo
observado (indexado, sin cambios respecto a S4-001B) con el tramo futuro (valor constante,
sin indexar) mediante un promedio ponderado por días, calculado en el orquestador, no dentro
de `formulaIBL.js`:

```
IBL = (promedioObservado × díasObservados + valorAplicado × díasFuturos) / 3650
```

### `fechaAncla` — separada de `fechaCalculo` en el selector

`seleccionarPeriodosIBL.js` distinguía un único parámetro `fechaCalculo` para dos roles
distintos: resolver períodos abiertos (`fechaHasta: null` → "sigo cotizando") y anclar la
ventana de 3.650 días. Para la proyección esos roles se separan — extensión mínima de firma,
sin tocar el algoritmo:

- `fechaCalculo` sigue resolviendo períodos abiertos a **hoy** (nunca al futuro — lo
  contrario inventaría que el IBC actual declarado se sostiene sin cambios hasta la
  jubilación, exactamente lo que la separación de arriba prohíbe).
- `fechaAncla` (nuevo parámetro opcional, default = `fechaCalculo`, preserva sin cambios el
  comportamiento de S4-001B) ancla la ventana. Para la lectura histórica sigue siendo hoy;
  para la proyección, `fechaReconocimiento`.

### `fechaReconocimiento` — derivada, nunca capturada

Nueva función pura `calcularFechaPorEdad(fechaNacimiento, edadObjetivo)`, simétrica a
`calcularEdadCumplida.js` ya existente — la fecha en la que la persona cumple
`edadJubilacionDeseada`.

### Prueba de convergencia — horizonte ≥10 años

Cuando el horizonte hasta `fechaReconocimiento` alcanza o supera 3.650 días, la ventana
ordinaria queda compuesta al 100% por el período futuro — ningún período histórico entra.
El promedio ponderado de arriba se reduce algebraicamente:

```
IBL = (promedioObservado × 0 + valorAplicado × 3650) / 3650 = valorAplicado
```

Convergencia exacta al valor **aplicado** (ya capado si el declarado excedía el tope) — el
único "efecto jurídico adicional" que puede separar el IBL ordinario proyectado del valor
que la persona declaró es precisamente el tope legal de IBC, ya trazado explícitamente
arriba. Sin ese efecto, converge al valor declarado tal cual.

### Semanas — total, no solo observadas

`semanasCotizadas = { observadas, futuras, total }`. `futuras` se deriva del calendario
(días del horizonte / 7), no es una variable libre (bloqueo §8.6). La alternativa de vida
laboral (umbral de 1250 semanas, Art. 21 inciso 2) se evalúa aquí contra `total` — a
diferencia de `calcularPensionRPM.js` (lectura histórica), que la evalúa solo contra
`semanasObservadas`, correctamente, porque esa función no proyecta nada. La proyección sí
proyecta, y Art. 21 inciso 2 no distingue semanas ya cotizadas de semanas que se cotizarán
según lo planeado — es una decisión de alcance de S4-002, no una resolución del bloqueo
§8.10 (que sigue abierto, sobre semanas declaradas vs. historia estructurada).

### Parámetros legales — congelados a `fecha`, nunca a `fechaReconocimiento`

`obtenerSmlv`, `obtenerParametrosTasaReemplazoRPM`, `obtenerTopeMaximoIBC` y
`obtenerSemanasHabilitanAlternativaIBL` se resuelven todos con `fecha` (hoy), nunca con
`fechaReconocimiento`. Decisión deliberada, no accidental: `resolverReglasVigentes` no
lanzaría error con una fecha futura (devolvería en silencio el valor vigente hoy, por
ausencia de `vigencia.hasta` en `vigente-2026.json`) — pedir explícitamente `fecha` deja sin
ambigüedad que PensionLab no afirma conocer la ley vigente el día de la jubilación.
Limitación declarada: `PARAMETROS_LEGALES_CONGELADOS_A_FECHA_CALCULO`.

### Composición de la ventana — trazabilidad objetiva, sin umbral de "dominado"

```
composicionVentanaOrdinaria: { diasObservados, diasFuturos, fraccionFutura }
```

Expone objetivamente cuánto del IBL ordinario depende de historia real vs. del escenario —
sin ninguna limitación categórica tipo "dominado por supuesto" con un umbral arbitrario. La
lectura cualitativa (20%, 50%, 100%) es responsabilidad de la explicación posterior
(S4-004/S4-007), no del dominio.

### Contrato de `calcularProyeccionRPM.js`

```
Entradas:
  historiaCotizacion, fechaNacimiento, edadJubilacionDeseada
  escenarioIbcFuturo: { valor, origen }
  ibcAplicableSimulacion
  fecha = hoy (fechaBaseMonetaria)

Salida (estado: 'calculado' | 'no_evaluable'):
  razonNoEvaluable: (las de seleccionarPeriodosIBL/calcularPensionRPM) |
    'EDAD_JUBILACION_NO_DECLARADA' | 'EDAD_JUBILACION_NO_POSTERIOR_A_HOY' |
    'IBC_FUTURO_NO_VALIDO'

  fechaBaseMonetaria, fechaReconocimiento
  escenarioIbcFuturo: { valorDeclarado, valorAplicado, origen, topeAplicado }
  ibl: { ordinario, vidaLaboral, aplicable, esOpcionLegal, razonVidaLaboralNoEvaluada }
  composicionVentanaOrdinaria: { diasObservados, diasFuturos, fraccionFutura }
  semanasCotizadas: { observadas, futuras, total }
  tasaReemplazo, pensionMensualProyectada
  trazabilidadVentana, datosFaltantes
  limitaciones: [NO_ES_TU_PENSION_FINAL, PARAMETROS_LEGALES_CONGELADOS_A_FECHA_CALCULO,
                 CONTINUIDAD_FUTURA_ASUMIDA_SIN_HUECOS]
```

`pensionMensualProyectada` — nunca "tu pensión" en la UI mientras dependa de un escenario;
mismo criterio ya usado por `calcularProyeccionRAIS`.

### Fuera de alcance de S4-002 (queda para S4-003 o después)

- Búsqueda/bisección de `escenarioIbcFuturo.valor` para alcanzar un objetivo declarado.
- Reconfirmación/versionamiento de una declaración de IBC futuro entre ejecuciones —
  irrelevante mientras PensionLab no tenga persistencia (§9 del Entregable 2);
  `fechaBaseMonetaria` queda expuesta en cada resultado precisamente para que esa Slice,
  cuando exista, tenga con qué construir su propia política sin rediseñar este contrato.
- Traslado de régimen (`trasladoRegimen`/`fechaTrasladoRegimen`) sigue sin efecto
  económico — bloqueo §8.9 sin cambios, no resuelto por esta convención.

## Monotonicidad de la proyección respecto de `escenarioIbcFuturo.valor` (§8.5, resuelta 2026-08-20)

Prerrequisito explícito de S4-003 (Entregable 2 §10, fila S4-003: "Dependencias: S4-002 +
validación de monotonicidad (§8.5)"), resuelto **antes** de implementar
`generarCaminosRPM.js` — mismo criterio metodológico que el resto de este documento.
Registra únicamente la propiedad demostrada; no implementa la bisección misma.

### Propiedad demostrada dentro del dominio legal

`pensionMensualProyectada` es **estrictamente creciente** respecto de
`escenarioIbcFuturo.valor` en el intervalo `[ibcActual, topeAplicado)`, manteniendo fijos
todos los demás parámetros (historia, `fecha`, `fechaReconocimiento`) — sin mesetas, sin
inversiones, en ningún punto del dominio legal alcanzable.

### Derivación analítica

Con `s = IBL/SMLV`:
```
pensión(IBL) = IBL × tasaFinal(IBL) / 100
tasaFinal(IBL) = clamp(65.5 − 0.5·s + incremento, 55, 80)   (incremento fijo: no depende de IBL)
```
Sin clamps, `pensión` en función de `IBL` es una parábola:
```
pensión(IBL) = [(65.5+incremento)·IBL − 0.5·IBL²/SMLV] / 100
```
con coeficiente cuadrático **negativo** — vértice en `IBL* = (65.5+incremento)×SMLV`, es
decir `s* = 65.5+incremento` (mínimo 65.5, solo crece con `incremento`, nunca lo reduce).
El piso de tasa (55%) se activa en `s = 21`, muy por debajo del vértice; el tope legal
acota `s` a un máximo de 25. **El dominio alcanzable (`s ≤ 25`) queda enteramente del lado
ascendente de la parábola** — nunca se alcanza el vértice con datos reales. Los clamps de
piso y techo solo pueden aplanar la pendiente de `tasaFinal`, nunca invertirla; con
`tasaFinal` constante, `pensión = IBL(x) × constante` sigue creciendo porque `IBL(x)` es
afín estrictamente creciente en `x` (`IBL(x) = A + B·x`, con `B = díasFuturos/díasTotales
> 0` siempre que el horizonte sea válido). El máximo entre IBL ordinario y vida laboral
(`iblAplicable`) preserva la propiedad: el máximo de dos funciones afines crecientes es
continuo y estrictamente creciente, sin caída en el punto de cruce.

### Comportamiento antes y después del tope

- **`[ibcActual, topeAplicado)`**: estrictamente creciente, sin mesetas — ni en la zona de
  piso de tasa (55%) ni en la de techo (80%) ni al cruzar entre IBL ordinario y vida
  laboral.
- **`[topeAplicado, ∞)`**: **constante**, no decreciente — `valorAplicado = min(x,
  topeAplicado)` se satura en el tope, así que `IBL(x)` y por tanto la pensión dejan de
  cambiar. Verificado explícitamente: `pensión(tope) = pensión(tope+5.000.000) =
  pensión(tope+50.000.000)`.

### Evidencia empírica

`src/domain/pensionEngine/monotonicidadProyeccionRPM.test.js` (prueba permanente, 6
tests) — barre `calcularProyeccionRPM` con secuencias crecientes de
`escenarioIbcFuturo.valor` y verifica cada par consecutivo, no solo los extremos:

- Ventana 100% futura, barrido amplio con resolución fina alrededor de `s=21` (piso).
- Frontera exacta del tope: estrictamente creciente antes, constante después.
- Ventana mixta (historia real + horizonte de 2 años).
- Horizonte extremo (1 día).
- Historia de 40 años + IBC bajo, para forzar y confirmar el clamp de techo (80%).
- Historia + horizonte que fuerza el cruce `esOpcionLegal` (ordinario ↔ vida laboral),
  confirmando que la pensión sigue subiendo con normalidad a ambos lados del cruce.

Búsqueda activa de contraejemplo (exploración adicional, no persistida como test — los
resultados quedan registrados aquí): barridos de hasta 5.000 puntos alrededor de las
zonas analíticamente más sensibles (piso de tasa, frontera del tope, cruce
ordinario/vida laboral) — peor caída detectada: **0**, en ningún caso. Ningún par
`IBC1 < IBC2` con `pensión(IBC1) > pensión(IBC2)` encontrado.

### Consecuencia para S4-003

La bisección de §7.3 queda **habilitada, acotada estrictamente a `[ibcActual,
topeAplicado]`** — dentro de ese intervalo no hay mesetas que la puedan atascar ni
inversiones que la puedan confundir. **Si el objetivo declarado no se alcanza evaluando
`escenarioIbcFuturo.valor = topeAplicado`, debe tratarse como no alcanzable** (camino
alternativo `descartado`, no como un caso a resolver ampliando el rango de búsqueda) —
más allá del tope la función es plana por diseño (el escenario se satura), así que no
hay nada nuevo que un rango más amplio pudiera encontrar.

## Bisección de S4-003 — `generarCaminosRPM.js` (contrato aprobado 2026-08-20)

Documenta el diseño **antes** del código, mismo criterio que el resto de este archivo.
No implementa búsqueda genérica ni reabre §8.5 (ya resuelta, arriba) — solo fija el
contrato exacto que `generarCaminosRPM.js` debe cumplir.

### Reutilización — caja negra, sin duplicar lógica pensional

`generarCaminosRPM.js` nunca reimplementa IBL, tasa de reemplazo, ventana ni indexación.
Llama a `calcularProyeccionRPM` una vez para el camino base y N veces (bisección) para el
alternativo — mismo patrón ya probado por `generarCaminosRAIS.js` con
`calcularProyeccionRAIS`. `formulaIBL.js`, `formulaRPM.js`, `calcularProyeccionRPM.js` y
la convención de 3.650 días permanecen intactos.

### Ancla inferior de la búsqueda

`ibcAplicableSimulacion` (mismo valor que S4-002 usa para `origen:
'continuidad_ibc_actual'` en el camino base) — nunca se reconcilia ni se fuerza a
coincidir con el último `ibc` observado en `historiaCotizacion`: son datos de naturaleza
distinta (lo ya cotizado, un hecho pasado, vs. la declaración vigente hoy) que
`calcularProyeccionRPM` ya trata como entradas independientes.

### Rango de búsqueda

Exclusivamente `[ibcAplicableSimulacion, topeAplicado]` — `topeAplicado` se obtiene del
propio resultado del camino base (`calcularProyeccionRPM(...).escenarioIbcFuturo.topeAplicado`),
nunca recalculado por separado. **Nunca se busca fuera de este rango** — la propiedad
demostrada en §8.5 confirma que no hay nada que un rango más amplio pudiera encontrar
(la función es plana más allá del tope).

### Criterio de convergencia

Iteraciones calculadas dinámicamente a partir del rango real de cada caso, no una
constante hardcodeada — el resultado se expresa en pesos colombianos, sin unidad más
fina con sentido que 1 peso:

```
rango = topeAplicado − ibcAplicableSimulacion
iteraciones = Math.ceil(Math.log2(rango))
```

Bisección estándar sobre `escenarioIbcFuturo.valor`, evaluando
`calcularProyeccionRPM(...).pensionMensualProyectada` en cada punto medio, acotando el
intervalo según si el resultado queda por debajo o por encima del objetivo — válido
porque §8.5 ya demostró que la función es estrictamente creciente en todo este rango, sin
mesetas que puedan confundir la bisección.

Al terminar las iteraciones: el IBC encontrado se **redondea hacia arriba a peso entero**
(`Math.ceil`, acotado por `topeAplicado`) y se **reevalúa una última vez** con
`calcularProyeccionRPM` — el camino alternativo nunca se construye a partir del punto
medio fraccionario de la última iteración, siempre de esa reevaluación final con el valor
ya redondeado. **Corrección durante implementación (2026-08-20):** la primera versión
redondeaba al peso más cercano (`Math.round`), lo que podía dejar el resultado una
fracción de peso por debajo del objetivo exacto — confirmado empíricamente en un test que
falló con `distanciaObjetivo.cumple === false` para una búsqueda que sí había convergido.
Una búsqueda cuyo propio resultado redondeado no alcanza el objetivo que fue a buscar
derrota su propio propósito — se corrigió a redondeo hacia arriba, que ofrece un IBC
como máximo 1 peso mayor al estrictamente necesario, nunca insuficiente.

### Precondiciones antes de biseccionar

1. Si el camino base (`origen: 'continuidad_ibc_actual'`) ya cumple el objetivo
   (`distanciaObjetivo.cumple`), no se genera camino alternativo — no hay brecha que
   cerrar.
2. Si `ibcAplicableSimulacion >= topeAplicado`, no hay margen legal — camino alternativo
   `descartado` con `razonDescartado.codigo: 'YA_EN_TOPE_LEGAL'`, sin intentar bisección.
3. Se evalúa `calcularProyeccionRPM` con `escenarioIbcFuturo.valor = topeAplicado` antes
   de biseccionar: si ni así se alcanza el objetivo, camino alternativo `descartado` con
   `razonDescartado.codigo: 'OBJETIVO_NO_ALCANZABLE_NI_EN_TOPE'` — la bisección nunca se
   ejecuta en este caso, coherente con "no extender la búsqueda más allá del tope".

### `origen` del escenario encontrado

`'busqueda_objetivo_rpm'` — ya aprobado, distinto de `'continuidad_ibc_actual'`.

### `costoAcumuladoHastaJubilacion` — diferido, no asignado a ningún Slice

El campo `esfuerzo.costoAcumuladoHastaJubilacion` que el boceto de §7.2 del Entregable 2
anticipaba ("nuevo campo, exigido por la Regla 5 del Entregable") **queda fuera de
S4-003**. Se investigó exhaustivamente y **"Regla 5 del Entregable" no está definida en
ningún documento accesible del proyecto** — la frase aparece únicamente citándose a sí
misma en §7.2/§7.3, sin una lista de "Reglas del Entregable" en ningún lugar que la
respalde. No se inventa su contenido. **Tampoco se asigna a S4-005 ni a ningún otro
Slice como obligación futura** — queda diferida hasta que exista una definición
explícita de producto/arquitectura, decisión de Carlos/Atlas (2026-08-20).
`esfuerzo.costoPensionalAdicionalMensual` sí se calcula (no depende de la Regla 5) —
mismo criterio que `generarCaminosRAIS.js`: `aporteMensualPensionPropuesto -
aporteMensualPensionActual`, vía `obtenerTasaCotizacion` (regime-agnóstico, sin cambios).

### Contrato de entrada/salida de `generarCaminosRPM`

```
generarCaminosRPM({
  regimenActual,
  historiaCotizacion,
  fechaNacimiento,
  edadJubilacionDeseada,
  ibcAplicableSimulacion,
  objetivoValorMensual,
  restriccionCostoPensionalAdicionalMaximoMensual = null,
  fecha = hoy,
})
→ {
  escenarios: [{
    id: 'base' | 'aumentar-ibc-futuro',
    tipo: 'base' | 'alternativo',
    estado: 'viable' | 'descartado',
    decision: string,
    entradas: { escenarioIbcFuturo: {valor, origen}, edadJubilacionDeseada },
    resultado: { valor: pensionMensualProyectada, moneda: 'COP', periodoReferencia: 'mensual' },
    ibl, tasaReemplazo, semanasCotizadas, composicionVentanaOrdinaria, trazabilidadVentana,
    esfuerzo: { ibcActual, ibcPropuesto, aumentoIBC, aporteMensualPensionActual,
                aporteMensualPensionPropuesto, costoPensionalAdicionalMensual },
    distanciaObjetivo: { valorObjetivo, delta, cumple },
    limitaciones: [...],
    razonDescartado: { codigo, mensaje, reglaAplicada } | null,
  }],
  orientacion: { caminoMasAlineadoId, codigo, razon },
}
```

Cuando el perfil o los datos no son evaluables, mismo patrón que `generarCaminosRAIS.js`:
`{ escenarios: [], orientacion: { caminoMasAlineadoId: null, codigo, razon } }`, con
`codigo` uno de `PERFIL_NO_EVALUABLE` (únicamente `regimenActual !== 'RPM'` — sin
restricción de `tipoCotizante`/`lugarCotizacion`/`trasladoRegimen`, confirmado por
S4-001), `DATOS_INCOMPLETOS`, o `SIN_CAMINOS_VIABLES` (el camino base resulta
`no_evaluable` vía `calcularProyeccionRPM` — se propaga, no se reinterpreta).

## Corrección de auditoría — elegibilidad legal RPM y causa de la restricción (2026-08-21)

Dos hallazgos de una auditoría adversarial de S4-003 (posterior al cierre de S4-002,
`9af03c0`), que dejaron S4-003 **NO APTO PARA CIERRE** hasta resolverse. Documenta la
corrección **antes** de implementarla, mismo criterio que el resto de este archivo.

### Hallazgo 1 — proyección sin verificar elegibilidad legal RPM

`generarCaminosRPM.js`/`calcularProyeccionRPM.js` no verificaban en ningún punto si
`edadJubilacionDeseada` cumplía la edad mínima legal (Art. 33 Ley 100 de 1993) ni si la
historia+horizonte proyectados alcanzaban las semanas mínimas — ni siquiera recibían
`sexo`, dato indispensable para resolver ambos requisitos (diferenciados por sexo). Una
persona podía proyectar una pensión concreta a una edad sin ningún sustento legal de
reconocimiento bajo RPM, sin ninguna advertencia. **Decisión de producto (Carlos/Atlas,
2026-08-21): PensionLab nunca presenta una cifra de pensión proyectada a una fecha en la
que el usuario no cumpliría las condiciones legales de reconocimiento.**

**Fuente legal reutilizada, sin hardcodear:** `obtenerEdadPension(fecha, sexo)` y
`obtenerSemanasMinimas(fecha, sexo, 'RPM')` (`data/legal/index.js`) — ya parametrizados,
ya usados en `evidenciaEdadPension.js`/`evidenciaSemanasMinimas.js`. Se llaman aquí
directamente (mismo patrón que `calcularProyeccionRPM.js` ya usa con
`obtenerSmlv`/`obtenerTopeMaximoIBC`), no a través de las funciones de evidencia de
página — sus contratos están pensados para "hoy" (edad actual, semanas declaradas por el
usuario), no para una fecha de reconocimiento futura ni para semanas proyectadas.

**Fecha de resolución — distinción explícita, no un relajamiento del principio ya
establecido:**

- `obtenerSmlv`, `obtenerTopeMaximoIBC`, `obtenerParametrosTasaReemplazoRPM`,
  `obtenerSemanasHabilitanAlternativaIBL` — **siguen congelados a `fecha`** (hoy). Sus
  valores futuros son legalmente desconocidos (el SMLV lo fija el gobierno año a año,
  sin cronograma) — proyectarlos sería inventar ley futura.
- `obtenerEdadPension`, `obtenerSemanasMinimas` — **se resuelven a `fechaReconocimiento`**.
  No es el mismo caso: `semanasMinimasPensionMujer` en `vigente-2026.json` es un
  `cronograma-lineal` **ya vigente y jurídicamente parametrizado** (Sentencia C-197 de
  2023: base 1250, decremento 25/año, piso 1000, desde 2026-01-01) — leer su valor en
  `fechaReconocimiento` no es proyectar nada desconocido, es aplicar una regla que la ley
  ya fijó para esa fecha. `edadPensionMujer`/`Hombre` son constantes sin cronograma (57/62,
  `vigencia.hasta: null`), así que en la práctica de hoy esta distinción no cambia su
  valor numérico — pero el criterio se aplica igual a ambos por consistencia, y protege
  automáticamente el día en que exista un cronograma de edad. **No se infiere ni se
  inventa ningún cambio legal distinto de los cronogramas ya vigentes en
  `data/legal`** — si no hay cronograma, el valor resuelto en `fechaReconocimiento` es
  idéntico al de `fecha`.

**Dónde vive el chequeo:** enteramente en `generarCaminosRPM.js` (S4-003) — nunca en
`calcularProyeccionRPM.js` (S4-002, ya cerrado). El chequeo de edad ocurre **antes** de
la primera llamada a `calcularProyeccionRPM` (solo depende de `edadJubilacionDeseada` +
`sexo` + `fechaReconocimiento`, calculable de inmediato vía `calcularFechaPorEdad`, ya
exportado). El chequeo de semanas ocurre **después** de calcular el camino base (necesita
`resultadoBase.semanasCotizadas.total`) — una sola vez: `semanasCotizadas.total` no
depende de `escenarioIbcFuturo.valor` (invariante ya establecida en S4-002/S4-003), así
que si el base cumple, cualquier alternativo de la bisección también cumple.

**Nuevos códigos**, ambos vía `resultadoVacio` — `escenarios: []`, ninguna cifra de
pensión se calcula ni se muestra:
- `EDAD_JUBILACION_INFERIOR_A_EDAD_MINIMA_LEGAL`
- `SEMANAS_INSUFICIENTES_PARA_RECONOCIMIENTO_RPM`

**`detalleElegibilidad`** — nuevo campo, opcional, en la salida de `generarCaminosRPM`
(aditivo, no rompe ningún consumidor existente):
```
detalleElegibilidad: {
  edadMinima, edadElegida, aniosFaltantes,                    // caso edad
  semanasMinimas, semanasProyectadas, semanasFaltantes,        // caso semanas
} | null
```

**Lenguaje de UI (decisión Carlos/Atlas):** nunca presentar la proyección como un hecho
absoluto — distinguir explícitamente requisito legal de resultado de una proyección. Ej.:
*"Con la historia y el escenario de cotización utilizados, a esa fecha proyectamos X
semanas. El requisito legal aplicable es Y; faltarían Z semanas."*

### Hallazgo 2 — restricción de costo no comunicada como causa

El motor ya respeta correctamente la restricción de costo declarada (nunca la excede),
pero cuando ella —no el objetivo en sí— es la causa de que un camino no cumpla, la UI
solo mostraba "no alcanza tu objetivo", indistinguible de un objetivo genuinamente
inalcanzable.

**Corrección:** nueva limitación, `RESTRICCION_COSTO_LIMITA_RESULTADO`, agregada al
array `limitaciones` del camino alternativo — calculable con datos que
`generarCaminosRPM.js` ya tiene en memoria (`limiteIBCPorRestriccion < topeAplicado`,
más `!distanciaObjetivo.cumple`), sin llamada adicional a `calcularProyeccionRPM`. Se
renderiza automáticamente: `ProyectaTuPensionRPM.jsx` ya recorre `escenario.limitaciones`
en la sección de notas — no requiere cambio de JSX, solo el nuevo dato.

### Contrato de entrada actualizado

```
generarCaminosRPM({
  regimenActual,
  sexo,                    // NUEVO — 'Mujer' | 'Hombre'
  historiaCotizacion,
  fechaNacimiento,
  edadJubilacionDeseada,
  ibcAplicableSimulacion,
  objetivoValorMensual,
  restriccionCostoPensionalAdicionalMaximoMensual,
  fecha,
})
```

### Impacto sobre S4-002 y motores ya cerrados

Ninguno. `calcularProyeccionRPM.js`, `formulaIBL.js`, `formulaRPM.js`,
`seleccionarPeriodosIBL.js`, `evidenciaEdadPension.js`, `evidenciaSemanasMinimas.js`
permanecen intactos. Límite de alcance declarado: si en el futuro algo llamara a
`calcularProyeccionRPM` directamente sin pasar por `generarCaminosRPM` (hoy no ocurre —
es su único consumidor real), no heredaría este gate automáticamente.
