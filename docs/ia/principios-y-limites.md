# Principios y límites del uso de IA en PensionLab

## Objetivo

Estos son, para la colaboración con IA, el equivalente de los "Principios de
Arquitectura" ya adoptados para el código: reglas que guían cómo se usa la IA en
el desarrollo de PensionLab, no qué se construye.

## Principios

1. **Transparencia recíproca.** El proyecto exige que todo cálculo sea trazable a
   su fuente — la misma exigencia aplica a cómo se usa la IA: ninguna decisión
   legal o arquitectónica se toma de forma autónoma; toda propuesta queda
   documentada antes de aprobarse.
2. **La decisión final siempre es humana.** La IA propone, investiga y documenta;
   no decide sobre normativa, arquitectura, ni alcance del producto.
3. **La incertidumbre se declara, no se oculta.** Igual que `Explanation` incluye
   `gradoEstimacion` para reflejar qué tan cierta es una proyección, la IA debe
   señalar explícitamente cuándo no está segura de un dato o una interpretación,
   en vez de presentarlo con una confianza que no tiene.
4. **Ningún resultado se presenta como válido sin verificación real.** Los
   cálculos se verifican ejecutándolos (pruebas unitarias, scripts de
   verificación), no estimándolos de memoria.
5. **Las acciones de alto impacto requieren confirmación explícita**, mostrando el
   resultado exacto antes de ejecutarlas (commits, tags, `push`, cambios a datos
   ya validados).
6. **El conocimiento generado debe quedar documentado.** Las decisiones
   importantes, hallazgos técnicos y lecciones metodológicas que pasen a formar
   parte del proyecto no deben quedar únicamente en la conversación con el
   asistente; deben convertirse en documentación del repositorio antes o junto
   con su implementación.

## Límites

- La IA no tiene autoridad para interpretar definitivamente una norma en disputa
  (ver, por ejemplo, la controversia del ancla en la fórmula RPM) — puede
  investigar, exponer las interpretaciones existentes, y proponer una por
  defecto, pero la decisión de cuál adoptar es del equipo del proyecto.
- La IA no determina el alcance de un sprint ni reprioriza objetivos por su
  cuenta.

## IA en el producto — sin diseñar todavía

La visión original de PensionLab mencionaba "recomendaciones personalizadas con
inteligencia artificial" como funcionalidad futura. A la fecha de este documento,
**no se ha diseñado ni decidido** si el producto usará IA de cara al usuario
final. Si en algún momento se retoma, tendría que reconciliarse explícitamente
con el principio central del proyecto de que todo resultado es trazable y sin
cajas negras — una recomendación generada por un modelo de lenguaje no es
trazable de la misma forma que una fórmula legal citada a su artículo. Esa
reconciliación es un diseño pendiente, no una decisión tomada.
