# Trazabilidad de fórmula — `formulaIBL.js`

Documenta la fórmula legal exacta, sus fuentes y el contrato de las funciones puras
**antes** de escribir código. Complementa `data/legal/trazabilidad-normativa.md` (valores)
y `trazabilidad-formula-RPM.md` (fórmula que consume el resultado de este archivo).

## Alcance de este documento

Traza la investigación normativa ya cerrada del IBL (Ingreso Base de Liquidación, Art. 21
Ley 100 de 1993) — no reabre esa investigación. En particular:

- La regla de selección de períodos cuando existen interrupciones de cotización dentro de
  los últimos 10 años **no está confirmada en fuente primaria** (ver sesión de
  investigación previa). Esta fórmula NO decide esa regla — la frontera de evaluabilidad
  que la sortea vive en `domain/seleccionarPeriodosIBL.js`, no aquí. `formulaIBL.js` solo
  recibe períodos que YA fueron seleccionados como utilizables.
- El mecanismo de indexación anual (diciembre-a-diciembre) sí tiene respaldo
  jurisprudencial de certeza media-alta (Corte Suprema, Sala Laboral) — es la fórmula que
  se implementa aquí.
- La regla de las 1.250 semanas (Art. 21, inciso 2) para la alternativa de vida laboral sí
  tiene respaldo textual directo — este archivo implementa el promedio, no la condición de
  habilitación (que vive en `seleccionarPeriodosIBL.js`).

## Fórmula legal — indexación

**Fuente:** Art. 21 Ley 100 de 1993; mecanismo de indexación con respaldo jurisprudencial
(Corte Suprema, Sala Laboral — certeza media-alta, ver investigación normativa previa).

```
IBC_indexado = IBC × (IPC_diciembre_del_año_anterior_a_la_fecha_de_cálculo
                       / IPC_diciembre_del_año_anterior_al_año_del_IBC)
```

La indexación es **anual** (diciembre a diciembre), aunque el dato de IBC pueda venir de un
período de duración arbitraria — un período que cruza un límite de año calendario se divide
internamente en tramos por año antes de indexar cada tramo con el factor de su propio año.

## Fórmula legal — promedio

**Ordinario:** promedio ponderado por tiempo cotizado de los IBC indexados de los períodos
dentro de la ventana relevante (últimos 10 años calendario antes de la fecha de cálculo, ya
filtrados y validados como evaluables por `seleccionarPeriodosIBL.js`).

**Vida laboral** (cuando aplica — ver condición de habilitación en `seleccionarPeriodosIBL.js`):
mismo promedio ponderado, pero sobre todos los períodos válidos de la carrera, sin acotar a
los últimos 10 años.

**Ponderación:** por `diasCotizados` de cada período (evidencia observada, nunca duración
calendario asumida — decisión ya cerrada en el diseño del Slice). Cuando un período cruza un
límite de año calendario, `diasCotizados` se distribuye entre sus tramos anuales en
proporción a la participación calendario de cada tramo dentro del período completo. Para
períodos que llegan al cálculo ordinario (evaluables, por tanto sin cotización parcial —
`diasCotizados` ya es igual a los días calendario de su rango), esta distribución coincide
exactamente con los días calendario de cada tramo — no hay diferencia práctica en ese caso,
pero la función usa `diasCotizados`, no los días calendario, porque el dato debe seguir
siendo la evidencia observada, no una reconstrucción a partir de fechas.

```
IBL = Σ(IBC_indexado_tramo × diasCotizados_tramo) / Σ(diasCotizados_tramo)
```

## Contrato de funciones

```js
/**
 * @param {Object} params
 * @param {number} params.ibc
 * @param {number} params.ipcOrigen       - IPC de diciembre del año anterior al año del tramo
 * @param {number} params.ipcReferencia   - IPC de diciembre del año anterior a la fecha de cálculo
 * @returns {number} IBC indexado. Sin redondear.
 */
function indexarIBC(params) {}

/**
 * Divide un rango de fechas en tramos por año calendario, con los días calendario
 * (inclusive en ambos extremos) que caen dentro de cada año. Detalle mecánico interno de
 * la indexación anual — no una exigencia sobre el modelo de datos de entrada.
 *
 * @param {string} fechaDesde - ISO
 * @param {string} fechaHasta - ISO
 * @returns {Array<{anio: number, dias: number}>}
 */
function dividirPeriodoPorAnio(fechaDesde, fechaHasta) {}

/**
 * @param {Object} params
 * @param {Array<{fechaDesde: string, fechaHasta: string, ibc: number, diasCotizados: number}>} params.periodos
 * @param {Record<number, number>} params.tablaIPC - IPC de diciembre por año, ya resuelto
 * @param {number} params.anioReferenciaIPC - año cuyo IPC de diciembre es el numerador (año anterior a la fecha de cálculo)
 * @returns {{
 *   promedio: number,
 *   detalle: Array<{anio: number, ibcIndexado: number, ipcOrigen: number, ipcReferencia: number, dias: number}>
 * }}
 */
function calcularPromedioIBL(params) {}
```

Ninguna función conoce `data/legal` ni lee JSON — reciben `tablaIPC` ya resuelta, mismo
criterio que `formulaRPM.js`/`formulaRAIS.js` reciben `parametrosLegales` ya resueltos.

## Casos numéricos de referencia (usados en `formulaIBL.test.js`)

| Caso | Período(s) | IBC | diasCotizados | tablaIPC | año referencia | resultado esperado |
|---|---|---|---|---|---|---|
| A — un solo año, sin indexación real | 2025-01-01 a 2025-12-31 | 1000 | 365 | {2024:100, 2025:105} | 2025 | 1050 (indexado, promedio = valor único) |
| B — período que cruza año | 2024-07-01 a 2025-06-30 | 1000 | 365 (completo) | {2023:90, 2024:100, 2025:105} | 2025 | ≈1108.81 (promedio ponderado de dos tramos indexados a tasas distintas) |
| C — solo mecánica de partición (sin IPC) | 2023-11-15 a 2024-02-10 | — | — | — | — | tramos: {2023, 47 días}, {2024, 41 días} |

Ver `formulaIBL.test.js` para el cálculo exacto de B.

## Limitaciones a declarar (para `Explanation.limitaciones`, cuando se implemente la UI/explicación completa)

- No resuelve historias con interrupciones dentro de la ventana relevante — esa evaluación
  vive en `seleccionarPeriodosIBL.js`, no aquí.
- No proyecta IPC futuro — solo indexa con años ya conocidos.
- Asume que los períodos recibidos ya fueron validados (sin solapamientos, sin
  inconsistencias de días) por la capa anterior — esta fórmula no valida, solo calcula.
