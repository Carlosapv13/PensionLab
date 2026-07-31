/**
 * Contrato de datos: CalculationTrace
 *
 * Responsabilidad: representar la traza cruda de un cálculo de pensión —
 * qué datos de entrada, qué fórmula y qué normas/supuestos se usaron —
 * antes de convertirse en una explicación legible (ver Explanation.js).
 * Es lo que devuelven calcularPensionRPM/calcularPensionRAIS.
 *
 * @typedef {Object} CalculationTrace
 * @property {('RPM'|'RAIS')} regimen      - Régimen al que corresponde este cálculo. Necesario
 *   porque un PensionCalculationResult puede vivir suelto (ej. dentro de un escenario) sin una
 *   key que lo identifique.
 * @property {Object} datosUsados          - TODOS los parámetros efectivamente pasados a la
 *   fórmula pura: datos del usuario ya resueltos (edad derivada de fechaNacimiento,
 *   semanasCotizadas, salarioActual...) + valores normativos y de supuestos ya resueltos
 *   (tasaCotizacion, smlv, rentabilidadEsperada...). No solo datos crudos del usuario.
 * @property {string} formulaId            - Referencia a la fórmula usada (ver domain/formulas/formulaMeta.js)
 * @property {string[]} normasUsadasIds    - Ids de las entradas de data/legal usadas (ver data/legal/schema.js)
 * @property {string[]} supuestosUsadosIds - Ids de las entradas de data/assumptions usadas (ver data/assumptions/schema.js)
 */
