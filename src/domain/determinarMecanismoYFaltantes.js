// Quinta función de dominio de PensionLab, y la primera de una forma distinta a las
// cuatro anteriores. Nombre deliberadamente PROVISIONAL (decisión explícita del
// análisis de arquitectura previo a este Slice): ninguna de las categorías ya
// fijadas — evaluar* (juicio de elegibilidad), obtener* (consulta normativa pura),
// resolverReglasVigentes (selección de normas), determinar* (dato aplicable a
// partir de información declarada + reglas trazadas) — describe con precisión lo
// que este archivo hace. Se revisa el nombre durante la revisión de implementación
// de este mismo Slice, cuando la abstracción ya esté completamente visible.
//
// Responsabilidad: dado el régimen ya declarado por la persona, determinar qué
// mecanismo(s) rigen su resultado pensional y qué elemento(s) le faltan hoy a
// PensionLab para calcular una cifra responsable — sin ejecutar ningún cálculo,
// sin consultar data/legal ni data/assumptions (el contenido es estructural: qué
// insumo exige cada fórmula, ya documentado en formulaRPM.js/formulaRAIS.js y en
// trazabilidad-formula-RAIS.md, no un valor que dependa de una fecha de vigencia).
//
// Es, en la práctica, el primer caso real del vacío conceptual registrado en
// memoria del proyecto ("lectura derivada" sin componente propio en PL-230): no es
// evidencia en el sentido de PL-230 §6.2 (no compara un hecho contra un umbral
// normativo) ni es Explicabilidad pura (§6.6, no se limita a traducir algo que otro
// componente ya produjo) — resuelve algo nuevo: la relación entre lo que una
// fórmula exige y lo que el Expediente ya tiene. Se registra aquí, no se resuelve.
//
// Autónoma: valida regimenActual por sí misma, sin asumir que la interfaz ya lo
// hizo — mismo criterio que las cuatro funciones de dominio anteriores. Cualquier
// valor distinto de 'RPM' o 'RAIS' (incluidos null, undefined o un valor
// inesperado) se trata como régimen desconocido — mismo criterio ya usado en
// evidenciaSemanasMinimas.js y evidenciaEdadPension.js.
//
// No produce narrativa: los códigos que devuelve (mecanismos, elementosFaltantes)
// se traducen a lenguaje legible exclusivamente en la pantalla que consume este
// resultado — mismo patrón ya corregido en determinarBaseCotizacion.js (Slice
// "Base actual de cotización") y ya usado en PrimeraLectura.jsx.

/**
 * @param {Object} input
 * @param {('RPM'|'RAIS'|'desconocido'|null)} [input.regimenActual]
 * @returns {{
 *   caso: 'RPM' | 'RAIS' | 'desconocido',
 *   mecanismos: Array<{ regimen: 'RPM' | 'RAIS', codigo: string }>,
 *   elementosFaltantes: Array<{ regimen: 'RPM' | 'RAIS' | null, codigo: string }>,
 * }}
 */
export function determinarMecanismoYFaltantes({ regimenActual } = {}) {
  if (regimenActual === 'RPM') {
    return {
      caso: 'RPM',
      mecanismos: [{ regimen: 'RPM', codigo: 'MECANISMO_IBL_SEMANAS' }],
      elementosFaltantes: [{ regimen: 'RPM', codigo: 'FALTA_IBL' }],
    }
  }

  if (regimenActual === 'RAIS') {
    return {
      caso: 'RAIS',
      mecanismos: [{ regimen: 'RAIS', codigo: 'MECANISMO_CAPITAL_ACUMULADO' }],
      elementosFaltantes: [
        { regimen: 'RAIS', codigo: 'FALTA_CAPITAL_ACUMULADO' },
        { regimen: 'RAIS', codigo: 'FALTA_HORIZONTE_NO_SOLICITABLE' },
      ],
    }
  }

  return {
    caso: 'desconocido',
    mecanismos: [
      { regimen: 'RPM', codigo: 'MECANISMO_IBL_SEMANAS' },
      { regimen: 'RAIS', codigo: 'MECANISMO_CAPITAL_ACUMULADO' },
    ],
    elementosFaltantes: [
      { regimen: null, codigo: 'FALTA_REGIMEN' },
      { regimen: 'RPM', codigo: 'FALTA_IBL' },
      { regimen: 'RAIS', codigo: 'FALTA_CAPITAL_ACUMULADO' },
    ],
  }
}
