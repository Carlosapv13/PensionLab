# Matriz de trazabilidad normativa — data/legal

Cubre únicamente los campos de `data/legal` (normas obligatorias). Los campos de
`data/assumptions` no tienen fuente oficial por diseño — quedan fuera de esta matriz.

**Objetivo inmediato:** validar fuentes para `vigente-2026.json`. Cuando se trabajen
`reforma-2024.json` y `ley100-1993.json`, cada uno necesitará su propia validación
por campo contra la norma vigente en ese período.

Investigación realizada por búsqueda web (fecha de consulta: 2026-07-30). Ningún
valor fue cargado en archivos JSON — esto sigue siendo solo documentación de
trazabilidad.

## Decisiones aprobadas (2026-07-30)

1. **`vigente-2026.json` representa únicamente normativa efectivamente aplicable.**
   La reforma pensional 2024 (Ley 2381 de 2024) sigue suspendida por la Corte
   Constitucional (Auto 841 de 2025, vicio de trámite) y se mantiene separada — sus
   entradas, si llegan a necesitarse, van en su propio archivo de versión
   (`reforma-2024.json`), nunca mezcladas en `vigente-2026.json`, hasta que exista
   fallo definitivo de la Corte. `data/legal/index.js` excluye `reforma-2024.json`
   de su línea de tiempo de forma explícita, no por omisión accidental.
2. **`semanasMinimasPension` queda dividido en `semanasMinimasPensionHombre` y
   `semanasMinimasPensionMujer`** — reflejado en `data/legal/schema.js` y en
   `vigente-2026.json` (la entrada de mujeres usa un `valor` estructurado tipo
   `cronograma-lineal`, no un número fijo).
3. **Implementado `obtenerSemanasMinimas(fecha, sexo, regimen)`** en
   `data/legal/index.js`, junto con `resolverReglasVigentes(fecha, opts)`. Probado
   contra los casos límite: hombre (1300 fijo), mujer 2026 (1250), mujer 2027 (1225),
   mujer en el piso 2036+ (1000), mujer antes de 2026-01-01 (1300, aplica la entrada
   pre-sentencia). Para `regimen === 'RAIS'` lanza un error explícito en vez de asumir
   un valor — la proyección RAIS simplificada de Sprint 1 no tiene un requisito
   equivalente de semanas mínimas.
4. **Mecanismo general para incertidumbre jurídica**: se agregó el campo opcional
   `estadoJuridico` (`'firme' | 'transitorio' | 'suspendido'`) a `LegalRuleEntry`.
   `resolverReglasVigentes()` excluye por defecto cualquier entrada que no sea
   `'firme'`; solo se incluye pasando `{ permitirTransitorio: true }` explícitamente.
   El SMLV 2026 se cargó en `vigente-2026.json` con `estadoJuridico: 'transitorio'`
   — está documentado y trazable, pero el motor no lo usará por defecto hasta que
   quede firme. Este mecanismo queda disponible para cualquier campo futuro bajo
   litigio, no es exclusivo de SMLV.
5. **`topeMaximoIBC` confirmado en 25 SMLMV.** Se verificó la condición del Decreto
   2322 de 2022 (crecimiento económico > 4% en los últimos 3 años fiscales): según
   el DANE, el PIB de Colombia creció 0.8% (2023), 2.5% (2024) y 2.6% (2025) — ningún
   año supera el 4%, así que la ampliación a 45 SMLMV no está activa. Pasa a
   **Validado**.
6. **`vigente-2026.json` se creó como borrador bloqueado** (`estado: 'borrador'`,
   `listoParaProduccion: false`), con las 13 entradas ya validadas más `smlv`
   (presente pero inerte por `estadoJuridico: 'transitorio'`). No se marca
   `'publicado'` hasta verificar el texto oficial contra Diario Oficial/SUIN-Juriscol
   y hasta que el SMLV quede firme.

## Hallazgos de la investigación

1. **La reforma pensional 2024 (Ley 2381 de 2024) está suspendida.** La Corte
   Constitucional, mediante Auto 841 de 2025, suspendió su entrada en vigencia por
   un vicio de trámite (deliberación insuficiente en la Cámara de Representantes).
   Aunque el Congreso volvió a debatirla, a la fecha de consulta sigue sin fallo
   definitivo de la Corte.
2. **La Sentencia C-197 de 2023** declaró inexequible exigir el mismo número de
   semanas a hombres y mujeres, con efectos diferidos desde 2026-01-01: hombres
   mantienen 1300 semanas, mujeres bajan a 1250 en 2026 y siguen reduciéndose 25
   semanas cada año hasta llegar a 1000 (~2036). Es un hallazgo estructural, no solo
   un dato — motivó la decisión 2 y 3 de arriba.
3. **El SMLV 2026 está en litigio activo.** El Decreto 1469 de 2025 fijó el SMLMV
   2026 en $1.750.905 (+23%), pero el Consejo de Estado suspendió provisionalmente
   ese decreto (auto del 12-feb-2026); el Gobierno lo reemplazó transitoriamente con
   el Decreto 0159 de 2026 mientras se resuelve el litigio de fondo.
4. **El tope de IBC de 25 SMLMV tiene una ampliación condicional a 45 SMLMV**
   (Decreto 2322 de 2022), pero solo se activa si se cumplen simultáneamente
   crecimiento económico > 4% en los últimos 3 años fiscales y gasto pensional
   < 2% del PIB — no verifiqué si esas condiciones macroeconómicas ya se cumplen
   en 2026.

## Campos compartidos RPM / Proyección RAIS

| Campo | Fuente oficial confirmada | Artículo/decreto confirmado | Valor hallado (referencia, no cargado) | Fecha de vigencia | ¿Aplica a vigente-2026? | Estado |
|---|---|---|---|---|---|---|
| `edadPensionMujer` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 33 Ley 100 de 1993, modificado por Art. 9 Ley 797 de 2003 | 57 años | Vigente desde 2003, sin cambio (C-197/2023 solo tocó semanas, no edad) | Sí — reforma 2024 suspendida | Validado |
| `edadPensionHombre` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 33 Ley 100 de 1993, modificado por Art. 9 Ley 797 de 2003 | 62 años | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `semanasMinimasPensionHombre` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 33 Ley 100 de 1993, modificado por Art. 9 Ley 797 de 2003 | 1300 semanas (sin cambio, C-197/2023 no modificó el requisito de hombres) | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `semanasMinimasPensionMujer` | Ley 100 de 1993 / Ley 797 de 2003, modulado por Sentencia C-197 de 2023 (Corte Constitucional) | Art. 9 Ley 797 de 2003 (pre-2026, entrada separada); Sentencia C-197 de 2023 (desde 2026-01-01) | 1300 semanas antes de 2026-01-01; desde entonces 1250 en 2026, -25/año hasta piso de 1000 (~2036) — **se consume vía `obtenerSemanasMinimas(fecha, sexo, regimen)`, cargado en vigente-2026.json como dos entradas (plana + cronograma)** | Pre-2026: vigente 2003–2025-12-31. Desde 2026-01-01: cronograma progresivo | Sí, a través del resolver — implementado y probado | Validado |
| `smlv` | Decreto del Gobierno Nacional (Ministerio del Trabajo), anual | Decreto 1469 de 2025 (29-dic-2025), suspendido provisionalmente por el Consejo de Estado (auto 12-feb-2026); reemplazado transitoriamente por Decreto 0159 de 2026 (19-feb-2026) | $1.750.905 (cargado en vigente-2026.json con `estadoJuridico: 'transitorio'`) | Desde 2026-01-01, valor no firme | Cargado pero **inerte por defecto** (`resolverReglasVigentes` lo excluye salvo `permitirTransitorio: true`) | Requiere revisión |
| `tasaCotizacion` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 20 Ley 100 de 1993, modificado por Art. 7 Ley 797 de 2003 | 16% (fase final de incrementos graduales 2003-2006) | Vigente desde 2006, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `topeMaximoIBC` | Ley 100 de 1993, modificada por Ley 797 de 2003; Decreto Reglamentario 510 de 2003; Decreto 2322 de 2022 (ampliación condicional, no activa) | Art. 18 Ley 100 de 1993, modificado por Art. 5 Ley 797 de 2003 | 25 SMLMV — condición del Decreto 2322/2022 (crecimiento PIB > 4% en 3 años fiscales) NO se cumple: PIB DANE 0.8%/2.5%/2.6% en 2023/2024/2025 | 25 SMLMV vigente | Sí — condición de ampliación a 45 SMLMV confirmada como no activa | Validado |

## Campos específicos RPM (fórmula de tasa de reemplazo)

| Campo | Fuente oficial confirmada | Artículo/decreto confirmado | Valor hallado (referencia, no cargado) | Fecha de vigencia | ¿Aplica a vigente-2026? | Estado |
|---|---|---|---|---|---|---|
| `tasaReemplazoConstante` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 65.5 (fórmula: r = 65.5 − 0.5·s, s = IBL/SMLV) | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `tasaReemplazoPendiente` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 0.5 | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `tasaReemplazoMinima` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 55% | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `tasaReemplazoMaxima` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 80% | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `semanasPorIncrementoAdicional` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 50 semanas por tramo adicional | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |
| `incrementoPorcentualPorTramo` | Ley 100 de 1993, modificada por Ley 797 de 2003 | Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003 | 1.5 puntos porcentuales por tramo | Vigente desde 2003, sin cambio | Sí — reforma 2024 suspendida | Validado |

## Resumen de estados

- **Validado**: 12 campos (edad × 2, `semanasMinimasPensionHombre`, `semanasMinimasPensionMujer`, tasaCotizacion, topeMaximoIBC, los 6 de la fórmula de reemplazo).
- **Requiere revisión**: 1 campo (`smlv` — litigio activo ante el Consejo de Estado; cargado en el borrador pero inerte por `estadoJuridico: 'transitorio'`).
- **Pendiente**: 0 campos.
- Total de campos legales: 13. `vigente-2026.json` (borrador) contiene 14 entradas — `semanasMinimasPensionMujer` se representa con dos entradas (plana pre-2026 + cronograma desde 2026).
- **`vigente-2026.json` existe como borrador bloqueado** (`estado: 'borrador'`, `listoParaProduccion: false`) — no publicado en firme hasta verificar texto oficial y resolver el litigio del SMLV.

## Leyenda de estado de validación

- **Pendiente** — sin verificar contra fuente oficial.
- **Requiere revisión** — fuente localizada y con evidencia razonable, pero con una
  ambigüedad, litigio activo, o implicación de diseño sin resolver antes de poder
  cargarse en `vigente-2026.json`.
- **Validado** — confirmado contra fuente con evidencia consistente, listo para
  cargarse en `vigente-2026.json` (sujeto a verificación final contra el texto
  oficial en Diario Oficial / SUIN-Juriscol antes de publicar).

## Fuentes consultadas

- [Corte Constitucional suspende entrada en vigencia de la reforma pensional — Asofondos](https://asofondos.org.co/comunicados/corte-constitucional-suspende-entrada-vigencia-reforma-pensional/)
- [Auto 841/25 — Corte Constitucional](https://www.corteconstitucional.gov.co/relatoria/autos/2025/a841-25.htm)
- [Ley 2381 de 2024 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=246356)
- [Reforma pensional en Colombia 2026: qué está suspendido — 60Más Pensiones](https://www.60maspensiones.com/blog/reformapensional)
- [Pensión de vejez en 2026: semanas mínimas requeridas en Colombia — Actualícese](https://actualicese.com/semanas-minimas-para-pension-de-vejez-en-2026/)
- [Ley 100 de 1993 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=5248)
- [Ley 797 de 2003 — Gestor Normativo, Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=7223)
- [Sentencia C-197 de 2023 — Corte Constitucional](https://www.corteconstitucional.gov.co/relatoria/2023/c-197-23.htm)
- [Fundamentos e interrogantes de la reducción de semanas para mujeres (C-197/2023) — U. Externado](https://derlaboral.uexternado.edu.co/uncategorized/fundamentos-e-interrogantes-de-la-reduccion-de-las-semanas-de-cotizacion-para-la-pension-de-vejez-en-el-caso-de-las-mujeres-sentencia-c-197-de-2023/)
- [Colombia decreta aumento del salario mínimo para 2026 — Holland & Knight](https://www.hklaw.com/en/insights/publications/2025/12/colombia-decreta-aumento-del-salario-minimo-y-auxilio-de-transporte)
- [Suspensión provisional del decreto que fijó el salario mínimo 2026 — Holland & Knight](https://www.hklaw.com/en/insights/publications/2026/02/suspension-provisional-del-decreto-que-fijo-el-salario-minimo)
- [Decreto 159 de 2026 — Alcaldía de Bogotá](https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=192181&dt=S)
- [Límites a la base de aportes a seguridad social — Gerencie.com](https://www.gerencie.com/limites-a-la-base-de-aportes-al-sistema-de-seguridad-social.html)
- [Aumento en el tope máximo de cotización: de 25 a 45 SMLMV — CMS Law](https://cms.law/es/col/publication/aumento-en-el-tope-maximo-para-efectos-de-cotizacion-al-sistema-de-seguridad-social-integral-pasara-de-25-smlmv-a-45-smlmv)
- [Decreto 2322 de 2022 — SUIN-Juriscol](https://suin-juriscol.gov.co/viewDocument.asp?ruta=Decretos/30044946)
- [¿Qué es la tasa de reemplazo y cómo se calcula? — Gerencie.com](https://www.gerencie.com/que-es-la-tasa-de-reemplazo-y-como-se-calcula.html)
- [PIB de Colombia creció 2,6% en 2025, según el Dane — LaFM](https://www.lafm.com.co/economia/crecimiento-economico-colombia-dane-390680)
- [Economía colombiana creció 2,6% en 2025 — Minhacienda](https://www.minhacienda.gov.co/w/econom%C3%ADa-colombiana-creci%C3%B3-2-6-en-2025-impulsada-por-comercio-y-servicios)
- [Seguridad social y pensiones en Colombia 2026 — Buk](https://www.buk.co/blog/seguridad-social-y-pensiones-en-2025)
