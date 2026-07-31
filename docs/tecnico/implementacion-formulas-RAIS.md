# Implementación de fórmulas RAIS (Sprint 1)

## Objetivo del módulo
Calcular una proyección simplificada de la pensión mensual bajo RAIS (Régimen de
Ahorro Individual), a partir de datos del usuario, parámetros legales resueltos y
supuestos de modelado explícitos — como funciones matemáticas puras, sin acceso a
datos externos ni conocimiento de normativa.

## Archivos creados o modificados
- `src/domain/formulas/formulaRAIS.js` — las tres funciones puras.
- `src/domain/formulas/formulaRAIS.test.js` — pruebas unitarias.
- `src/domain/formulas/trazabilidad-formula-RAIS.md` — metodología, fuentes de los
  supuestos y decisiones de diseño (documento previo a este).

## Las tres funciones

1. **`calcularAporteCapitalizableRAIS`** — de cuánto gana el usuario, cuánto es
   obligatorio cotizar, y cuánto de eso realmente queda invertido en su cuenta
   individual (descontando comisión + seguro obligatorio).
2. **`calcularCapitalProyectadoRAIS`** — proyecta cuánto capital se acumula, con
   interés compuesto, entre hoy y la edad de jubilación deseada.
3. **`formulaRAIS`** — convierte ese capital en una mesada mensual estimada, usando
   un horizonte de pago simplificado.

## Flujo de cálculo

```
IBC mensual → aporte obligatorio (16%) → aporte capitalizable (después del descuento)
   → capital proyectado (interés compuesto hasta la jubilación)
   → pensión mensual proyectada (capital ÷ horizonte de pago, con rendimiento)
```

## Parámetros legales (`parametrosLegales`)
`smlv`, `tasaCotizacion`, `topeMaximoIBC` — resueltos desde `data/legal` (no
implementado todavía en este módulo; hoy se pasan directamente en los tests).

## Supuestos de modelado (`parametrosSupuestos`)
- `rentabilidadEsperadaRAIS = 3.5%` real anual
- `descuentoSobreAporteCapitalizable = 18.75%` (equivalente al tope legal de 3% del
  IBC en comisión + seguro obligatorio)
- `mesesPayoutSimplificado = 240` (20 años, supuesto de producto, no factor actuarial)

Fuentes y nivel de confianza de cada uno en `trazabilidad-formula-RAIS.md`.

## Fórmula financiera utilizada
Valor futuro de una anualidad ordinaria (aportes mensuales constantes con interés
compuesto) para proyectar el capital; anualización simplificada por horizonte plano
(no tablas de mortalidad) para convertir el capital en mesada mensual. Detalle
matemático completo en `trazabilidad-formula-RAIS.md`.

## Pruebas creadas
`formulaRAIS.test.js`: 3 casos de referencia (mujer 15 años de horizonte, hombre 10
años con salario alto, horizonte largo con salario bajo) probados contra cada una de
las 3 funciones, más una prueba de coherencia (las 3 pensiones proyectadas quedan por
debajo de 1 SMLV, consistente con por qué existe la Garantía de Pensión Mínima en la
vida real).

## Resultados de la suite
18/18 pruebas pasan (8 de `formulaRPM.test.js` + 10 de `formulaRAIS.test.js`),
`npm run test`.

## Limitaciones conocidas
- **[Crítica] No incluye capital ya acumulado** en la cuenta individual antes de la
  fecha de cálculo — subestima la pensión de cualquier usuario que ya lleve años
  cotizando en RAIS.
- No incluye el Fondo de Garantía de Pensión Mínima.
- No incluye bono pensional ni traslados de régimen previos.
- Horizonte de pago plano (240 meses), no diferenciado por sexo ni esperanza de vida.
- `rentabilidadEsperadaRAIS` es una proyección de mercado, no un hecho verificable.
- Casos límite matemáticos sin manejar todavía (ver análisis de casos límite): tasa de
  rentabilidad igual a 0%, horizonte de pago igual a 0, edades de jubilación anteriores
  a la edad actual, y valores negativos en salario/tasas/SMLV.

## Decisiones de diseño
- Tres funciones puras, no una sola, para que cada paso intermedio sea explicable por
  separado (ligado al módulo de Transparencia ya aprobado en la arquitectura).
- Parámetros agrupados en `datosUsuario` / `parametrosLegales` / `parametrosSupuestos`
  — tres capas, no dos como RPM, porque la mitad de los insumos de RAIS son supuestos
  de producto, no normas legales.
- `comisionAdministracionPromedio` renombrado a `descuentoSobreAporteCapitalizable`
  porque el descuento real incluye seguro obligatorio, no solo comisión de la AFP.
- `factorAnualidadSimplificado` (número precalculado) reemplazado por
  `mesesPayoutSimplificado` (horizonte en meses), para que el factor de anualidad se
  recalcule siempre coherente con la rentabilidad vigente, en vez de poder quedar
  desincronizado.

## Responsabilidades que todavía no corresponden a este módulo
- Resolver `parametrosLegales`/`parametrosSupuestos` desde `data/legal`/
  `data/assumptions` — responsabilidad de `domain/pensionEngine/calcularProyeccionRAIS.js`,
  no implementado todavía.
- Construir el `CalculationTrace` y la `Explanation` (incluidas las limitaciones
  listadas arriba) — responsabilidad de `domain/transparency/explainCalculation.js`.
- Validar datos de entrada del usuario (edades, salario) — responsabilidad de la capa
  de formularios / `UserProfile`.
- Validar invariantes de `parametrosLegales`/`parametrosSupuestos` — responsabilidad
  propuesta para `pensionEngine`, al resolver esos valores.

## Próximos pasos
1. Decidir e implementar el manejo del caso `rentabilidadEsperadaRAIS = 0` dentro de
   la fórmula pura (única validación propuesta como parte de la fórmula misma).
2. Implementar `domain/pensionEngine/calcularPensionRPM.js` y
   `calcularProyeccionRAIS.js`.
3. Implementar las validaciones de capa superior identificadas en el análisis de
   casos límite.
4. Agregar el campo de saldo actual de cuenta individual RAIS como requisito futuro
   (fuera de Sprint 1).
