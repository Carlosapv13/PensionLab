# Trazabilidad de fórmula — `formulaRAIS.js`

Mismo patrón que `trazabilidad-formula-RPM.md`: documentar la metodología, sus fuentes
y el contrato de las funciones puras **antes** de escribir código. Diferencia clave
frente a RPM: **RAIS no tiene una fórmula legal única y cerrada** (Art. 34 Ley 100 es
específico de RPM). Lo que sigue es una metodología actuarial estándar de capitalización
individual, simplificada a propósito para Sprint 1 — con supuestos que necesitan tu
aprobación explícita, no solo revisión.

**Supuestos aprobados (2026-07-30)**, con los ajustes de este turno:
`rentabilidadEsperadaRAIS = 3.5%` real anual se mantiene sin cambios;
`comisionAdministracionPromedio` se renombra a `descuentoSobreAporteCapitalizable`
(ver justificación abajo); `mesesPayoutSimplificado = 240` se mantiene, reforzando que es
un supuesto explícito de producto, no un factor actuarial derivado; y el capital ya
acumulado en RAIS se mantiene fuera de Sprint 1, documentado como limitación crítica y
requisito futuro (ver sección de limitaciones).

## Por qué esto es una "proyección", no un "cálculo"

Recordatorio del nombre `calcularProyeccionRAIS` (ya decidido en turnos anteriores): a
diferencia de RPM, aquí no hay un artículo que fije una tasa de reemplazo. La pensión
depende de cuánto capital se acumule y a qué tasa se anualice — ambas cosas dependen de
supuestos (rentabilidad futura, comisión, horizonte de pago), no de mandato legal. Todo
lo marcado como "supuesto" en este documento requiere tu aprobación de producto, no
verificación jurídica — no existe una fuente oficial única para estos valores.

## Metodología (capitalización individual simplificada)

**Paso 1 — Aporte mensual neto a la cuenta individual:**

```
ibcMensual         = min(salarioActual, topeMaximoIBC × smlv)
aporteMensualNeto  = ibcMensual × tasaCotizacion × (1 − descuentoSobreAporteCapitalizable)
```

**Paso 2 — Capital proyectado al momento de jubilarse** (valor futuro de una anualidad
ordinaria, aportes mensuales constantes — ver limitación sobre `salarioConstante` abajo):

```
mesesHastaJubilacion   = (edadJubilacionDeseada − edadActual) × 12
tasaMensual            = (1 + rentabilidadEsperadaRAIS)^(1/12) − 1
capitalProyectado      = aporteMensualNeto × [((1 + tasaMensual)^mesesHastaJubilacion − 1) / tasaMensual]
```

**Paso 3 — Anualización simplificada del capital** (convierte el capital en una mesada
mensual, sin tablas de mortalidad — ver limitación correspondiente):

```
factorAnualidadMensual = tasaMensual / (1 − (1 + tasaMensual)^(−mesesPayoutSimplificado))
pensionMensual         = capitalProyectado × factorAnualidadMensual
```

## Ajuste aprobado: `factorAnualidadSimplificado` → `mesesPayoutSimplificado`

En el diseño original de `data/assumptions`, `factorAnualidadSimplificado` era un único
número precomputado. Al documentar la fórmula encontré un problema: si ese número se
precalcula por fuera y `rentabilidadEsperadaRAIS` cambia después (ej. al actualizar
supuestos el próximo año), el factor quedaría inconsistente con la nueva tasa sin que
nada lo detecte. Se guarda en su lugar `mesesPayoutSimplificado` (un horizonte de pago
asumido, ej. 240 = 20 años) y la fórmula calcula el factor de anualidad en el momento,
siempre coherente con la `rentabilidadEsperadaRAIS` vigente en ese cálculo.

**Aprobado explícitamente como supuesto de producto, no como factor actuarial**: 240
meses no se deriva de tablas de mortalidad ni de esperanza de vida real — es una
simplificación deliberada para Sprint 1, y debe seguir leyéndose como tal (ver
limitaciones). Este renombre en `data/assumptions/schema.js` todavía no se aplicó en
código — se hace junto con la implementación de `formulaRAIS.js`.

## Ajuste aprobado: `comisionAdministracionPromedio` → `descuentoSobreAporteCapitalizable`

El nombre original sugería que el 3% del IBC descontado es exclusivamente una "comisión"
que cobra la AFP por administrar el fondo. No es exacto: ese 3% cubre **dos cosas
distintas** — la comisión de administración propiamente dicha, y la prima del seguro de
invalidez y sobrevivencia (SIS), que no es una comisión sino un seguro obligatorio. Llamar
"comisión" a la prima de un seguro es engañoso para efectos de transparencia. El nuevo
nombre describe lo que el parámetro realmente representa desde la perspectiva del cálculo:
la fracción del aporte que **no queda capitalizando** en la cuenta individual, sin importar
si el motivo es comisión, seguro, u otro descuento — es agnóstico a la composición interna
del descuento, que además varía por AFP y no es el foco de este simulador.

## Supuestos aprobados para Sprint 1

| Supuesto | Valor aprobado | Investigación de respaldo | Confianza |
|---|---|---|---|
| `rentabilidadEsperadaRAIS` | 3.5% real anual | Rentabilidad histórica de fondos moderados RAIS: 7.8% histórico, 6% promedio últimos 10 años, 3% promedio últimos 5 años — tendencia decreciente, "poco probable un regreso a niveles pasados" (Banco de la República / Superfinanciera). 3.5% como punto medio conservador entre el promedio de 5 años y algo de suavizado de largo plazo. | Baja-media — es una proyección, no un hecho |
| `descuentoSobreAporteCapitalizable` | 18.75% de la cotización total (equivalente a 3% del IBC, el tope legal combinado de comisión de administración + seguro de invalidez/sobrevivencia) | Por ley, comisión + seguro previsional no puede superar 3% del IBC (Superfinanciera). Uso el tope legal como aproximación porque la distribución exacta varía por AFP y no hay un promedio único publicado. Renombrado desde `comisionAdministracionPromedio`: el descuento no es solo comisión, incluye la prima del seguro obligatorio — ver justificación arriba. | Media — el tope es verificable, el promedio real por AFP no |
| `mesesPayoutSimplificado` | 240 meses (20 años) | Horizonte de pago plano, igual para ambos sexos y cualquier edad de retiro — **no** deriva de tablas de mortalidad ni esperanza de vida real. Aprobado explícitamente como supuesto de producto, no como factor actuarial. | Baja — es la simplificación más fuerte de todo el documento |

## Parámetros de las funciones puras

Tres grupos — RAIS necesita uno más que RPM porque la mitad de sus insumos son
supuestos de modelado, no normas legales. Tres funciones puras (no dos como RPM):
`calcularAporteCapitalizableRAIS` separa explícitamente el Paso 1 de la metodología
(IBC → aporte obligatorio → descuento → aporte capitalizable) como pieza reutilizable e
individualmente trazable, en vez de dejarlo enterrado dentro de `calcularCapitalProyectadoRAIS`.

```js
/**
 * @typedef {Object} DatosUsuarioRAIS
 * @property {number} edadActual
 * @property {number} edadJubilacionDeseada
 * @property {number} salarioActual
 *
 * @typedef {Object} ParametrosLegalesRAIS
 * @property {number} smlv
 * @property {number} tasaCotizacion
 * @property {number} topeMaximoIBC
 *
 * @typedef {Object} ParametrosSupuestosRAIS
 * @property {number} rentabilidadEsperadaRAIS           - Tasa real anual (ej. 0.035)
 * @property {number} descuentoSobreAporteCapitalizable  - Fracción de la cotización que
 *   NO queda capitalizando en la cuenta individual (comisión + seguro obligatorio,
 *   ej. 0.1875) — antes llamado comisionAdministracionPromedio, ver justificación arriba
 * @property {number} mesesPayoutSimplificado             - Horizonte de pago asumido, en
 *   meses (ej. 240) — supuesto explícito de producto, no factor actuarial derivado
 */

/**
 * Separa y explica la cadena IBC → aporte obligatorio → descuento sobre aporte →
 * aporte que capitaliza. Agregada a pedido para que cada paso sea trazable por
 * separado (útil para Explanation más adelante), no solo el resultado combinado.
 *
 * @param {{datosUsuario: DatosUsuarioRAIS, parametrosLegales: ParametrosLegalesRAIS, parametrosSupuestos: ParametrosSupuestosRAIS}} params
 * @returns {number} Aporte mensual que efectivamente capitaliza en la cuenta individual, en la unidad de salarioActual. Sin redondear.
 */
function calcularAporteCapitalizableRAIS(params) {}

/**
 * @param {{datosUsuario: DatosUsuarioRAIS, parametrosLegales: ParametrosLegalesRAIS, parametrosSupuestos: ParametrosSupuestosRAIS}} params
 * @returns {number} Capital proyectado al momento de jubilación, en la unidad de salarioActual. Sin redondear.
 */
function calcularCapitalProyectadoRAIS(params) {}

/**
 * @param {{datosUsuario: DatosUsuarioRAIS, parametrosLegales: ParametrosLegalesRAIS, parametrosSupuestos: ParametrosSupuestosRAIS}} params
 * @returns {number} Pensión mensual proyectada, en la unidad de salarioActual. Sin redondear.
 */
function formulaRAIS(params) {}
```

`salarioConstante` y `continuidadCotizacion` (ya definidos en `data/assumptions`) no
aparecen como parámetros numéricos: no cambian el resultado matemático, **justifican por
qué la fórmula tiene esta forma** (aporte mensual plano, sin huecos, durante todos los
meses hasta la jubilación). Sí deben quedar en `CalculationTrace.supuestosUsadosIds`
cuando se construya el orquestador — eso es responsabilidad de
`calcularProyeccionRAIS.js`, no de esta fórmula pura.

## Ejemplos numéricos (verificados por ejecución, no a mano)

Unidades en SMLV (`smlv = 1`). Parámetros comunes: `tasaCotizacion = 0.16`,
`topeMaximoIBC = 25`, `rentabilidadEsperadaRAIS = 0.035`,
`descuentoSobreAporteCapitalizable = 0.1875`, `mesesPayoutSimplificado = 240`.

| Caso | Salario (SMLV) | Edad actual → jubilación | Meses | Capital proyectado (SMLV) | Pensión mensual (SMLV) |
|---|---|---|---|---|---|
| A — mujer, horizonte medio | 2 | 42 → 57 | 180 | 61.1623 | 0.3530 |
| B — hombre, horizonte corto, salario alto | 5 | 52 → 62 | 120 | 92.9636 | 0.5365 |
| C — horizonte largo, salario bajo | 1 | 27 → 57 | 360 | 81.8152 | 0.4722 |

El caso C ilustra el peso dominante del tiempo: con solo 1 SMLV de salario pero 30 años
de horizonte, termina con más pensión proyectada que el caso A (2 SMLV, 15 años). Los
tres casos dan una pensión **por debajo de 1 SMLV** — resultado esperable y consistente
con por qué existe la Garantía de Pensión Mínima en la vida real (ver limitaciones: este
simulador no la incluye).

## Limitaciones a declarar (para `Explanation.limitaciones`, cuando se implemente)

- **[LIMITACIÓN CRÍTICA] No incluye capital ya acumulado** en la cuenta individual antes
  de la fecha de cálculo — Sprint 1 no solicita ese dato al usuario (`UserProfile` no
  tiene un campo de saldo actual). Para alguien que ya lleva años cotizando en RAIS, esto
  **subestima significativamente** la pensión proyectada; para un usuario nuevo en el
  sistema es razonablemente representativa. Es la limitación más importante de todo el
  documento — debe mostrarse de forma prominente en la UI, no solo en el detalle de
  `Explanation.limitaciones`.
  **Requisito futuro (fuera de Sprint 1):** agregar un campo de saldo actual de la cuenta
  individual (ej. `UserProfile.laboralInfo.saldoActualCuentaIndividualRAIS`, con su propia
  `fechaCorte`) y sumarlo como capital inicial en el Paso 2 de esta fórmula. Queda anotado
  como pendiente, no implementado.
- No incluye el Fondo de Garantía de Pensión Mínima (FGPM) — en la vida real, si el
  capital no alcanza para una mesada de al menos 1 SMLV con ~1150 semanas cotizadas, el
  Estado la completa. Esta proyección no lo simula.
- No incluye bono pensional ni traslados de régimen previos.
- La anualización usa un horizonte de pago plano (`mesesPayoutSimplificado`), no tablas
  de mortalidad reales — no diferencia esperanza de vida por sexo ni por edad de retiro.
- `rentabilidadEsperadaRAIS` es una proyección de mercado, no un hecho — el resultado es
  sensible a este supuesto y puede variar sustancialmente si el escenario real difiere.
- Caso límite no manejado: si `rentabilidadEsperadaRAIS` fuera exactamente 0, la fórmula
  produce una división por cero (`tasaMensual = 0`). No se maneja explícitamente porque no
  se espera que ocurra con los supuestos propuestos — queda documentado, no defendido con
  código adicional.

## Decisiones aprobadas (2026-07-30)

1. Los 3 valores de `parametrosSupuestos` (rentabilidad 3.5%, descuento sobre aporte
   capitalizable 18.75%, horizonte 240 meses) — aprobados sin cambios de valor.
2. `comisionAdministracionPromedio` renombrado a `descuentoSobreAporteCapitalizable` —
   aplicado en este documento; pendiente de aplicar en código junto con `formulaRAIS.js`.
3. `factorAnualidadSimplificado` renombrado a `mesesPayoutSimplificado`, reafirmado como
   supuesto explícito de producto, no factor actuarial — pendiente de aplicar en
   `data/assumptions/schema.js` junto con la implementación.
4. Capital previamente acumulado en RAIS se mantiene fuera de Sprint 1, documentado como
   limitación crítica con requisito futuro explícito (ver sección de limitaciones).
5. Contrato de las dos funciones y el agrupamiento en tres parámetros (`datosUsuario` /
   `parametrosLegales` / `parametrosSupuestos`) — aprobado sin cambios.

## Fuentes consultadas

- [Desempeño financiero de los fondos de pensiones obligatorias en Colombia — Banco de la República](https://www.banrep.gov.co/sites/default/files/publicaciones/archivos/desempeno_financiero.pdf)
- [Rentabilidad y Cifras Pensiones Obligatorias — Colfondos](https://www.colfondos.com.co/dxp/personas/pensiones-obligatorias/conoce-mas/cifras)
- [Retornos reales de los fondos privados de pensiones — FCE Universidad Nacional](https://fce.unal.edu.co/media/files/CentroEditorial/documentos/documentosEACP/documentos-EACP-37.pdf)
- [Rentabilidad mínima de los fondos de pensiones obligatorias — Superfinanciera](https://www.superfinanciera.gov.co/powerbi/reportes/524/505/)
- [Aportes a pensión 2026: porcentajes y reforma — Actualícese](https://actualicese.com/aportes-a-pension-2026/)
- [Cobro de comisión administrativa — Colfondos](https://www.colfondos.com.co/dxp/personas/pensiones-obligatorias/comisiones-de-administracion)
