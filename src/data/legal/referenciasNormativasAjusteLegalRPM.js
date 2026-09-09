// Citas normativas canónicas del piso/techo legal RPM — fuente maestra única, cierre E3-A
// (2026-09-07, segunda ronda). Movida de src/domain/pensionEngine a data/legal: el motor
// (pensionEngine) puede CONSUMIR estas referencias, pero no debe ser su fuente maestra —
// artículo 48 de la Constitución, artículo 35 de la Ley 100 y el Acto Legislativo 01 de
// 2005 son hechos jurídicos, no comportamiento del motor. Vive aquí, junto al resto de
// data/legal, para que la experiencia Baldor y cualquier auditoría futura consuman
// exactamente la misma referencia — nunca una copia mantenida por separado en el dominio.
//
// Constitucionales/legales, sin versionar por año (a diferencia de smlv): no pasan por
// resolverReglasVigentes/LINEA_DE_TIEMPO_VIGENTE (ese mecanismo resuelve valores que
// cambian por decreto anual; estas citas no cambian salvo reforma constitucional). Se
// exportan como una constante plana, mismo criterio que ipc-historico.json tiene su propio
// resolver fuera del patrón `obtener*` — no forzarlas a encajar en un patrón que no
// necesitan. ajustarMesadaLegalRPM.js sigue siendo neutral: acepta cualquier objeto
// compatible como `referenciasNormativas`, esta constante es la fuente única lista para usar.

export const REFERENCIAS_NORMATIVAS_AJUSTE_LEGAL_RPM = {
  piso: {
    normaId: 'const-art48-ley100-art35-piso-pension-minima',
    fuente: 'Constitución Política de Colombia, Art. 48; Ley 100 de 1993, Art. 35',
    articulo:
      'Art. 48 CP ("Ninguna pensión podrá ser inferior al salario mínimo legal mensual vigente"); ' +
      'Art. 35 Ley 100 de 1993 ("El monto mensual de la pensión mínima de vejez... no podrá ser ' +
      'inferior al valor del salario mínimo legal mensual vigente")',
    descripcion:
      'Piso legal: ninguna pensión de vejez reconocida bajo RPM puede ser inferior a 1 SMLMV ' +
      'vigente en la fecha de causación, una vez cumplidos los requisitos de edad y semanas.',
  },
  techo: {
    normaId: 'al01-2005-techo-25-smlmv',
    fuente: 'Acto Legislativo 01 de 2005, parágrafo transitorio 9° del Art. 48 CP',
    articulo:
      'Acto Legislativo 01 de 2005: "A partir del 31 de julio de 2010, no podrán causarse pensiones ' +
      'superiores a veinticinco (25) salarios mínimos legales mensuales vigentes, con cargo a ' +
      'recursos de naturaleza pública"',
    descripcion:
      'Techo constitucional: ninguna pensión con cargo a recursos públicos puede superar 25 SMLMV ' +
      'vigentes en la fecha de causación. Regla de cierre independiente del tope de IBC — bajo la ' +
      'fórmula ordinaria del Art. 34 (máximo 80% del IBL, con IBC topado a 25 SMLMV) el máximo ' +
      'matemático posible es 20 SMLMV, así que este techo nunca se activa en RPM puro, pero debe ' +
      'existir como regla explícita, no como coincidencia aritmética.',
  },
}
