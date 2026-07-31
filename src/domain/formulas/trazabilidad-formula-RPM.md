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
