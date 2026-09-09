// E3-B (sprint-4-correcciones-oscar-baldor) — capa comparativa, neutral y auditable que
// expone las DOS interpretaciones en disputa sobre el ancla del incremento de tasa de
// reemplazo RPM (Art. 34 Ley 100 de 1993, modificado por Art. 10 Ley 797 de 2003) para
// mujeres bajo el cronograma decreciente de la Sentencia C-197 de 2023.
//
// Decisión Carlos/Atlas que fija el contrato de este archivo:
//
// 1. NO sustituye el ancla actual de 1.300 semanas por el mínimo dinámico. NO integra
//    todavía con calcularPensionRPM.js, calcularProyeccionRPM.js, generarCaminosRPM.js ni
//    UI — esta función no tiene consumidores reales todavía. El comportamiento visible del
//    producto no cambia por la existencia de este archivo.
// 2. Ninguna interpretación se presenta como posición oficial demostrada — `caracter`
//    ('base_conservadora' / 'interpretacion_juridica_no_resuelta') y `referenciaInterpretativa
//    .certeza` lo dejan explícito en cada resultado, nunca implícito por el nombre "principal".
// 3. Reutiliza `desglosarTasaReemplazoRPM` (formulaRPM.js) como ÚNICA fuente aritmética — la
//    fórmula base, el incremento por bloques y el límite del 80% nunca se reimplementan aquí.
// 4. Cierre de diseño, segunda ronda (2026-09-08) — TODOS los parámetros legales, incluida la
//    ancla fija y el SMLV, se resuelven INTERNAMENTE con la MISMA `fecha`, vía
//    `obtenerParametrosTasaReemplazoRPM(fecha)` y `obtenerSmlv(fecha)`. El contrato público
//    no declara ningún parámetro legal (no existe `parametrosLegalesBase`) — cualquier
//    propiedad adicional que un llamador incluya en la llamada es simplemente ignorada, como
//    con cualquier función de JavaScript (no hay una validación que la "rechace"; la garantía
//    real es que ningún camino de este archivo lee esa propiedad para resolver las anclas ni
//    los parámetros legales, que siempre se resuelven aquí adentro). Esto elimina dos riesgos
//    reales encontrados en la primera ronda: (a) usar `sexo: 'M'` como atajo para llegar a
//    1.300 —ANCLA_FIJA_1300 no es una regla de sexo, es la parametrización fija de la
//    fórmula—, y (b) que un consumidor externo mezclara parámetros legales resueltos para una
//    fecha distinta a la que se está comparando.
// 5. El mínimo dinámico SÍ se resuelve con el sexo REAL de la persona, vía
//    `obtenerSemanasMinimas(fecha, sexo, 'RPM')` — el sexo nunca se usa para nada más que
//    esto: nunca para derivar la ancla fija.
// 6. Cierre de diseño, tercera ronda (2026-09-08) — el SMLV resuelto vía `obtenerSmlv(fecha)`
//    NUNCA se usa directamente: se interpreta primero con `evaluarVigenciaSmlv(smlvResuelto,
//    fecha)` (mismo contrato de E3-A, `ajustarMesadaLegalRPM.js`) y solo se calcula alguna
//    tasa cuando `aptoParaCalculoEnFechaBase === true`. Sin este chequeo, este archivo podría
//    calcular una tasa (ambas interpretaciones) usando un SMLV que E3-A clasificó como
//    `fundamento_no_verificado` (ventana 2026-02-12 a 2026-02-18) y que
//    `ajustarMesadaLegalRPM.js` bloquea para piso/techo en esa misma ventana — el mismo valor
//    de SMLV no puede ser "apto" aquí e "inapto" allá: el criterio de vigencia debe ser
//    idéntico en todo el motor. Mismo orden de comprobación que ya usa
//    `ajustarMesadaLegalRPM.js`: elegibilidad (semanas) primero, vigencia del SMLV después.
// 7. Separación elegibilidad/cuantía (Principio ya establecido en E2): esta función NUNCA
//    afirma que existe un derecho pensional reconocido. Antes de comparar tasas, verifica
//    ÚNICAMENTE el componente de semanas (semanasCotizadas >= mínimo aplicable dinámico) —
//    deliberadamente NO evalúa edad, esa es responsabilidad de
//    `evaluarElegibilidadProyectadaRPM.js`, no de este archivo.
// 8. `interpretacionPrincipal` es una SELECCIÓN PROVISIONAL DE PRODUCTO (revisable si aparece
//    fuente oficial), nunca una verdad jurídica superior a `interpretacionAlternativa`.
//    `incertidumbreJuridica` permanece presente siempre que las dos anclas jurídicas sean
//    distintas para ese sexo/fecha, incluso cuando el caso concreto no produce diferencia
//    numérica — la ambigüedad legal no desaparece porque, para estas semanas puntuales, ambas
//    interpretaciones coincidan.
// 9. "Pura" en el sentido relevante de este dominio: determinista, sin efectos secundarios,
//    sin React, sin IA, sin red, sin estado mutable — misma llamada con los mismos argumentos
//    siempre produce el mismo resultado. SÍ resuelve datos legales VERSIONADOS del propio
//    repositorio (`data/legal`, archivos JSON bajo control de versiones) — nunca red, nunca
//    E/S externa, nunca un valor que pueda cambiar entre dos llamadas con el mismo código
//    desplegado.
// 10. `FUENTE_LEGAL_NO_ENCONTRADA` se reserva EXCLUSIVAMENTE para ausencia real de una regla
//    o dato (ej. no hay SMLV cargado para una fecha anterior a 2026 — `obtenerSmlv` lanza).
//    Un SMLV que SÍ existe pero que `evaluarVigenciaSmlv` clasifica como no apto
//    (`fundamento_no_verificado`, `suspendido`, `fuera_de_vigencia`, `fuente_insuficiente`)
//    NUNCA se reporta con este código — se propaga tal cual la `advertencia` estructurada de
//    E3-A, para no perder ni disfrazar la razón jurídica real detrás del bloqueo.

import { desglosarTasaReemplazoRPM } from '../formulas/formulaRPM.js'
import { obtenerSemanasMinimas, obtenerParametrosTasaReemplazoRPM, obtenerSmlv, evaluarVigenciaSmlv } from '../../data/legal/index.js'
import { esFechaValida } from './validarHistoriaCotizacionTemporal.js'

export const CODIGO_ANCLA_FIJA_1300 = 'ANCLA_FIJA_1300'
export const CODIGO_ANCLA_MINIMO_DINAMICO = 'ANCLA_MINIMO_DINAMICO'

const CARACTER_BASE_CONSERVADORA = 'base_conservadora'
const CARACTER_INTERPRETACION_NO_RESUELTA = 'interpretacion_juridica_no_resuelta'

// --- Trazabilidad normativa (E3-B) — nunca cita prensa, blogs ni firmas de abogados como
// fundamento: esas fuentes se usaron solo para orientar la investigación (ver informe E3-B
// entregado a Carlos/Atlas), jamás como respaldo del resultado jurídico del motor.
const REFERENCIA_ART34_LEY100_ANCLA_FIJA = {
  campo: 'interpretacionPrincipal',
  fuente: 'Ley 100 de 1993, Art. 34, modificado por Art. 10 Ley 797 de 2003',
  articulo:
    'Art. 34 Ley 100 de 1993 (mod. Art. 10 Ley 797 de 2003): "por cada cincuenta (50) semanas ' +
    'adicionales a las mínimas requeridas" incrementa la tasa de reemplazo en 1.5 puntos por ' +
    'bloque. La ancla fija de 1.300 semanas reproduce la metodología operacional reportada de ' +
    'Colpensiones en fuentes secundarias — la investigación E3-B no localizó concepto oficial, ' +
    'circular ni jurisprudencia que confirme esta lectura como posición oficial primaria.',
}

const REFERENCIA_ART34_C197_ANCLA_DINAMICA = {
  campo: 'interpretacionAlternativa',
  fuente: 'Ley 100 de 1993, Art. 34 (mod. Art. 10 Ley 797 de 2003) + Sentencia C-197 de 2023, Corte Constitucional',
  articulo:
    'C-197/2023 declaró inexequible el requisito de 1.300 semanas para mujeres (Art. 9 Ley 797 ' +
    'de 2003, que modifica el Art. 33 Ley 100 de 1993 — requisito de ACCESO), con cronograma ' +
    'decreciente desde 2026-01-01 (1.250 semanas, −25/año, piso 1.000 en 2036). La sentencia no ' +
    'se pronunció expresamente sobre el Art. 34 (monto/tasa de reemplazo) — leer "las mínimas ' +
    'requeridas" del Art. 34 como remisión dinámica a este cronograma es una interpretación ' +
    'jurídica, no un hecho normativo confirmado por texto expreso ni por jurisprudencia ' +
    'posterior localizada.',
}

const ADVERTENCIA_INTERACCION_NO_RESUELTA = {
  codigo: 'INTERACCION_ART34_C197_SIN_INTERPRETACION_OFICIAL',
  mensaje:
    'PensionLab no localizó, en la investigación E3-B (2026-09-08), un concepto oficial de ' +
    'Colpensiones, Ministerio del Trabajo, Ministerio de Hacienda o UGPP, ni jurisprudencia ' +
    'posterior a C-197/2023, que resuelva expresamente si el ancla del incremento de tasa de ' +
    'reemplazo (Art. 34) debe leerse fija en 1.300 semanas o dinámica según el mínimo ' +
    'aplicable por sexo y fecha. Ambas interpretaciones se presentan sin afirmar cuál es la ' +
    'posición oficial.',
}

// referenciaInterpretativa por interpretación — vive DENTRO de cada resultado (nunca en un
// arreglo aparte indexado por posición), para que el consumidor sepa qué referencia
// corresponde a cada tasa sin tener que inferirlo. Estáticas (una sola vez por módulo): la
// fuente/artículo no varía por caso, solo el `semanasBaseIncremento` numérico varía.
const REFERENCIA_INTERPRETATIVA_ANCLA_FIJA = {
  codigo: CODIGO_ANCLA_FIJA_1300,
  fuente: REFERENCIA_ART34_LEY100_ANCLA_FIJA.fuente,
  articulo: REFERENCIA_ART34_LEY100_ANCLA_FIJA.articulo,
  alcance:
    'Ancla fija para el cálculo de cuantía — el incremento de tasa de reemplazo se cuenta desde ' +
    'la cifra actualmente parametrizada en la fórmula, no desde el requisito de acceso vigente ' +
    'para cada persona.',
  certeza:
    'Selección provisional conservadora del producto (Carlos/Atlas, E3-B) — no es una postura ' +
    'oficial comprobada de Colpensiones ni de ninguna autoridad.',
}

const REFERENCIA_INTERPRETATIVA_ANCLA_DINAMICA = {
  codigo: CODIGO_ANCLA_MINIMO_DINAMICO,
  fuente: REFERENCIA_ART34_C197_ANCLA_DINAMICA.fuente,
  articulo: REFERENCIA_ART34_C197_ANCLA_DINAMICA.articulo,
  alcance:
    'Remisión dinámica a "las mínimas requeridas" (Art. 34) — el incremento se cuenta desde el ' +
    'mismo mínimo que exige el acceso a la pensión para ese sexo y fecha (cronograma C-197/2023).',
  certeza:
    'Interpretación jurídica no resuelta — ninguna fuente oficial primaria ni jurisprudencia ' +
    'posterior localizada la confirma ni la descarta.',
}

function esNumeroValido(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function esSexoValido(sexo) {
  return sexo === 'Mujer' || sexo === 'Hombre'
}

function esSemanasValida(semanas) {
  return esNumeroValido(semanas) && semanas >= 0
}

function esIblValido(ibl) {
  return esNumeroValido(ibl) && ibl > 0
}

// Tabla declarativa de validación — mismo patrón ya usado en ajustarMesadaLegalRPM.js
// (`primerCampoInvalido`), un único punto que enumera qué hace inválida cada entrada. Sin
// parametrosLegalesBase: el contrato público ya no acepta parámetros legales, así que no hay
// nada que validar ni que rechazar en ese frente — la ausencia misma del campo en la firma
// es la protección, no una validación en tiempo de ejecución.
function primerCampoInvalido({ fecha, sexo, semanasCotizadas, ibl }) {
  const reglas = [
    ['sexo', !esSexoValido(sexo), "sexo ausente o no reconocido — se esperaba 'Mujer' u 'Hombre'; nunca se asume un sexo por defecto."],
    ['fecha', !esFechaValida(fecha), 'fecha ausente o con formato inválido.'],
    ['semanasCotizadas', !esSemanasValida(semanasCotizadas), 'semanasCotizadas ausente, no numérica o negativa.'],
    ['ibl', !esIblValido(ibl), 'ibl ausente, no numérico o no positivo.'],
  ]
  const fallo = reglas.find(([, invalido]) => invalido)
  return fallo ? { campo: fallo[0], mensaje: fallo[2] } : null
}

function resultadoNoEvaluable({ fecha, sexo, semanasCotizadas, ibl, razon }) {
  return {
    evaluable: false,
    fecha: typeof fecha === 'string' ? fecha : null,
    sexo: esSexoValido(sexo) ? sexo : null,
    sexoResuelto: null,
    semanasCotizadas: esSemanasValida(semanasCotizadas) ? semanasCotizadas : null,
    ibl: esIblValido(ibl) ? ibl : null,
    minimoAplicable: null,
    semanasFaltantesParaMinimo: null,
    interpretacionPrincipal: null,
    interpretacionAlternativa: null,
    diferencia: null,
    incertidumbreJuridica: { existe: false, codigo: null, mensaje: null },
    razon,
    trazabilidadNormativa: [],
  }
}

function construirInterpretacion({ codigo, caracter, referenciaInterpretativa, anclaValor, semanasCotizadas, ibl, parametrosLegalesComunes }) {
  // Nunca duplica la fórmula, el incremento por bloques ni el límite del 80% — la única
  // decisión de este archivo es qué `semanasBaseIncrementoRPM` pasarle a la MISMA función
  // pura que ya usa formulaRPM.js/calcularPensionRPM.js/calcularProyeccionRPM.js.
  const parametrosLegales = { ...parametrosLegalesComunes, semanasBaseIncrementoRPM: anclaValor }
  const desglose = desglosarTasaReemplazoRPM({ datosUsuario: { ibl, semanasCotizadas }, parametrosLegales })

  return {
    codigo,
    semanasBaseIncremento: anclaValor,
    semanasAdicionales: Math.max(0, semanasCotizadas - anclaValor),
    bloquesAdicionales: desglose.bloquesAdicionales,
    incrementoPorSemanas: desglose.incrementoPorSemanas,
    tasaInicial: desglose.tasaInicial,
    tasaFinalAplicada: desglose.tasaFinalAplicada,
    limiteOchentaPorcientoAplicado: desglose.limiteOchentaPorcientoAplicado,
    caracter,
    referenciaInterpretativa,
  }
}

// Factoriza la construcción de `incertidumbreJuridica`, idéntica en las dos ramas donde se
// necesita (no evaluable por semanas / evaluable) — antes duplicada literalmente.
function construirIncertidumbreJuridica(anclasDifieren) {
  return {
    existe: anclasDifieren,
    codigo: anclasDifieren ? ADVERTENCIA_INTERACCION_NO_RESUELTA.codigo : 'ANCLAS_COINCIDEN_SIN_CONTROVERSIA_PRACTICA',
    mensaje: anclasDifieren
      ? ADVERTENCIA_INTERACCION_NO_RESUELTA.mensaje
      : 'Para este sexo y fecha, el mínimo aplicable dinámico coincide con el ancla fija actualmente parametrizada ' +
        'para el incremento — ambas interpretaciones producen el mismo resultado numérico aquí, sin que eso ' +
        'implique que la controversia jurídica esté resuelta en general.',
  }
}

/**
 * Compara, sin decidir cuál es correcta, las dos interpretaciones en disputa del ancla del
 * incremento de tasa de reemplazo RPM (Art. 34 Ley 100/1993) para un caso concreto. Todos los
 * parámetros legales (parametrización de la fórmula, SMLV, mínimo aplicable por sexo) se
 * resuelven internamente con la MISMA `fecha` — el contrato público no acepta ningún
 * parámetro legal externo, precisamente para que no pueda mezclarse una fecha de cálculo con
 * parámetros legales resueltos para otra fecha.
 *
 * Consume el contrato de vigencia creado en E3-A (`evaluarVigenciaSmlv`,
 * `ajustarMesadaLegalRPM.js`): el SMLV resuelto nunca se usa para calcular ninguna tasa
 * (ninguna de las dos interpretaciones) salvo que `aptoParaCalculoEnFechaBase === true` para
 * esa `fecha` — el mismo criterio de vigencia del SMLV en todo el motor, nunca uno más laxo
 * aquí que el que ya aplica el piso/techo legal.
 *
 * @param {Object} params
 * @param {string} params.fecha - ISO. Fecha en la que se resuelven TODAS las reglas legales
 *   (parametrización de la tasa de reemplazo, SMLV, mínimo aplicable por sexo).
 * @param {('Mujer'|'Hombre')} params.sexo - Nunca se asume 'Hombre' por defecto si falta. Se
 *   usa EXCLUSIVAMENTE para resolver el mínimo aplicable de la interpretación dinámica —
 *   nunca para la ancla fija.
 * @param {number} params.semanasCotizadas - Semanas totales de la persona en `fecha`.
 * @param {number} params.ibl - Ingreso Base de Liquidación, mismas unidades que el SMLV
 *   resuelto internamente (ver formulaRPM.js).
 * @returns {{
 *   evaluable: boolean,
 *   fecha: string|null,
 *   sexo: ('Mujer'|'Hombre')|null,
 *   sexoResuelto: ('F'|'M')|null,
 *   semanasCotizadas: number|null,
 *   ibl: number|null,
 *   minimoAplicable: {valor: number, normaId: string, fuente: string, articulo: string}|null,
 *   semanasFaltantesParaMinimo: number|null,
 *   interpretacionPrincipal: {
 *     codigo: string, semanasBaseIncremento: number, semanasAdicionales: number,
 *     bloquesAdicionales: number, incrementoPorSemanas: number, tasaInicial: number,
 *     tasaFinalAplicada: number, limiteOchentaPorcientoAplicado: boolean, caracter: string,
 *     referenciaInterpretativa: {codigo: string, fuente: string, articulo: string, alcance: string, certeza: string},
 *   }|null,
 *   interpretacionAlternativa: (mismo shape que interpretacionPrincipal)|null,
 *   diferencia: {puntosPorcentuales: number, existeDiferencia: boolean}|null,
 *   incertidumbreJuridica: {existe: boolean, codigo: string|null, mensaje: string|null},
 *   razon: {codigo: string, mensaje: string, detalle?: Object}|null,
 *   trazabilidadNormativa: Array<Object>,
 * }}
 */
export function compararAnclaIncrementoRPM({ fecha, sexo, semanasCotizadas, ibl } = {}) {
  const campoInvalido = primerCampoInvalido({ fecha, sexo, semanasCotizadas, ibl })
  if (campoInvalido) {
    return resultadoNoEvaluable({
      fecha,
      sexo,
      semanasCotizadas,
      ibl,
      razon: { codigo: 'ENTRADA_INVALIDA', mensaje: campoInvalido.mensaje, detalle: { campo: campoInvalido.campo } },
    })
  }

  const sexoResuelto = sexo === 'Mujer' ? 'F' : 'M'

  // Nunca lanza: mismo criterio "detención segura, sin throw" ya establecido en
  // ajustarMesadaLegalRPM.js. Las tres resoluciones legales SÍ pueden lanzar (fecha fuera de
  // la vigencia de cualquier entrada cargada) — esta función captura eso como un caso de
  // datos insuficientes, no como un error de programación. Las tres se resuelven con la
  // MISMA `fecha` — ninguna se difiere ni se cachea entre llamadas.
  let parametrosPrincipalesResueltos
  let smlvResuelto
  let minimoAplicableResuelto
  try {
    parametrosPrincipalesResueltos = obtenerParametrosTasaReemplazoRPM(fecha)
    smlvResuelto = obtenerSmlv(fecha)
    minimoAplicableResuelto = obtenerSemanasMinimas(fecha, sexoResuelto, 'RPM')
  } catch (error) {
    return resultadoNoEvaluable({
      fecha,
      sexo,
      semanasCotizadas,
      ibl,
      razon: {
        codigo: 'FUENTE_LEGAL_NO_ENCONTRADA',
        mensaje: `No se encontró una regla legal vigente para la fecha ${fecha}: ${error.message}`,
      },
    })
  }

  // Base común para ambas interpretaciones (idéntica para las dos, misma fecha) —
  // `semanasBaseIncrementoRPM` incluida aquí es la de la interpretación fija; se sobrescribe
  // explícitamente para la alternativa dentro de construirInterpretacion(). `idsUsados`
  // (trazabilidad interna de data/legal) viaja sin usarse — desglosarTasaReemplazoRPM solo
  // lee los campos que declara, el resto se ignora sin riesgo.
  const parametrosLegalesComunes = { ...parametrosPrincipalesResueltos, smlv: smlvResuelto.valor }
  const anclaFijaValor = parametrosPrincipalesResueltos.semanasBaseIncrementoRPM

  const minimoAplicable = {
    valor: minimoAplicableResuelto.valor,
    normaId: minimoAplicableResuelto.id,
    fuente: minimoAplicableResuelto.fuente,
    articulo: minimoAplicableResuelto.articulo,
  }
  const trazabilidadNormativa = [REFERENCIA_ART34_LEY100_ANCLA_FIJA, REFERENCIA_ART34_C197_ANCLA_DINAMICA, ADVERTENCIA_INTERACCION_NO_RESUELTA]
  const anclasDifieren = anclaFijaValor !== minimoAplicableResuelto.valor

  // Separación elegibilidad/cuantía: solo el componente de semanas, nunca edad — esta
  // función no fabrica ni infiere elegibilidad general, solo decide si tiene sentido
  // comparar una tasa de reemplazo. Si no se alcanza el mínimo legal real de acceso (el
  // dinámico — la cifra que efectivamente exige la ley para esta persona, no el ancla), no
  // se fabrica ningún incremento evaluable, en ninguna de las dos interpretaciones.
  if (semanasCotizadas < minimoAplicableResuelto.valor) {
    return {
      evaluable: false,
      fecha,
      sexo,
      sexoResuelto,
      semanasCotizadas,
      ibl,
      minimoAplicable,
      semanasFaltantesParaMinimo: minimoAplicableResuelto.valor - semanasCotizadas,
      interpretacionPrincipal: null,
      interpretacionAlternativa: null,
      diferencia: null,
      incertidumbreJuridica: construirIncertidumbreJuridica(anclasDifieren),
      razon: {
        codigo: 'SEMANAS_INSUFICIENTES_PARA_MINIMO_APLICABLE',
        mensaje:
          `Con ${semanasCotizadas} semanas no se alcanza el mínimo aplicable (${minimoAplicableResuelto.valor}) para ` +
          `sexo=${sexo} en la fecha ${fecha} — no se compara tasa de reemplazo porque no hay evidencia de que exista ` +
          'siquiera un requisito de semanas cumplido que cuantificar. No es una afirmación de que la persona no tiene ' +
          'derecho a pensión (esta función no evalúa edad ni otros requisitos).',
      },
      trazabilidadNormativa,
    }
  }

  // Vigencia del SMLV (cierre de diseño, tercera ronda) — segundo chequeo, después de
  // elegibilidad, mismo orden que ajustarMesadaLegalRPM.js (E3-A). evaluarVigenciaSmlv()
  // nunca lanza (contrato ya establecido en E3-A) — no hace falta try/catch aquí. Si el SMLV
  // no está apto para esta fecha, ninguna de las dos interpretaciones calcula una tasa: el
  // mismo SMLV que E3-A bloquea para piso/techo no puede usarse aquí para tasaInicial.
  const vigenciaSmlv = evaluarVigenciaSmlv(smlvResuelto, fecha)
  if (!vigenciaSmlv.aptoParaCalculoEnFechaBase) {
    return {
      evaluable: false,
      fecha,
      sexo,
      sexoResuelto,
      semanasCotizadas,
      ibl,
      minimoAplicable,
      semanasFaltantesParaMinimo: 0,
      interpretacionPrincipal: null,
      interpretacionAlternativa: null,
      diferencia: null,
      incertidumbreJuridica: construirIncertidumbreJuridica(anclasDifieren),
      // Se propaga TAL CUAL la advertencia estructurada de evaluarVigenciaSmlv() — nunca se
      // reinterpreta como FUENTE_LEGAL_NO_ENCONTRADA (ese código es exclusivo de una regla o
      // dato realmente ausente) ni se sustituye por un mensaje propio que perdería el
      // tipoVigencia/código real (FUNDAMENTO_NORMATIVO_NO_VERIFICADO, MEDIDA_CAUTELAR_ACTIVA,
      // FUERA_DE_VIGENCIA, FUENTE_INSUFICIENTE, según corresponda).
      razon: vigenciaSmlv.advertencia ?? {
        codigo: 'SMLV_NO_APTO_PARA_CALCULO',
        mensaje: `El SMLMV de ${fecha} no está apto para calcular la tasa de reemplazo (tipoVigencia='${vigenciaSmlv.tipoVigencia ?? 'desconocido'}').`,
      },
      trazabilidadNormativa,
    }
  }

  const interpretacionPrincipal = construirInterpretacion({
    codigo: CODIGO_ANCLA_FIJA_1300,
    caracter: CARACTER_BASE_CONSERVADORA,
    referenciaInterpretativa: REFERENCIA_INTERPRETATIVA_ANCLA_FIJA,
    anclaValor: anclaFijaValor,
    semanasCotizadas,
    ibl,
    parametrosLegalesComunes,
  })
  const interpretacionAlternativa = construirInterpretacion({
    codigo: CODIGO_ANCLA_MINIMO_DINAMICO,
    caracter: CARACTER_INTERPRETACION_NO_RESUELTA,
    referenciaInterpretativa: REFERENCIA_INTERPRETATIVA_ANCLA_DINAMICA,
    anclaValor: minimoAplicableResuelto.valor,
    semanasCotizadas,
    ibl,
    parametrosLegalesComunes,
  })

  const puntosPorcentuales = interpretacionAlternativa.tasaFinalAplicada - interpretacionPrincipal.tasaFinalAplicada
  const existeDiferencia = Math.abs(puntosPorcentuales) > 1e-9

  return {
    evaluable: true,
    fecha,
    sexo,
    sexoResuelto,
    semanasCotizadas,
    ibl,
    minimoAplicable,
    semanasFaltantesParaMinimo: 0,
    interpretacionPrincipal,
    interpretacionAlternativa,
    diferencia: { puntosPorcentuales, existeDiferencia },
    incertidumbreJuridica: construirIncertidumbreJuridica(anclasDifieren),
    razon: null,
    trazabilidadNormativa,
  }
}
