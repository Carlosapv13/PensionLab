// Orquesta formulaRAIS + reglas legales vigentes (data/legal) + supuestos vigentes
// (data/assumptions) para un UserProfile dado. Devuelve un PensionCalculationResult
// (valor + trace), sin construir todavía la Explanation legible.
//
// Nombrado "Proyección" (no "Cálculo") a propósito: a diferencia de RPM, en Sprint 1
// RAIS se resuelve con supuestos simplificados (rentabilidadEsperadaRAIS,
// comisionAdministracionPromedio, factorAnualidadSimplificado) en vez de tablas
// actuariales completas. El resultado debe leerse como una proyección estimativa, no
// como un cálculo normativo cerrado — su Explanation.limitaciones debe dejarlo explícito.
