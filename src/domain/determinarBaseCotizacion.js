// Determina la base actual de cotización (IBC aplicable) para alimentar las
// primeras simulaciones — Slice "Base actual de cotización".
//
// Nomenclatura de dominio, fijada explícitamente con este primer caso real
// (sin generalizar todavía una infraestructura común para futuras funciones
// `determinar*` — Principio 9):
//   - `evaluar*` (evidenciaSemanasMinimas.js, evidenciaEdadPension.js,
//     evidenciaIndiciosTransicion.js) produce un JUICIO de elegibilidad
//     contra un requisito legal — cumple/no_cumple/con_indicios/sin_indicios.
//   - `obtener*` (data/legal/index.js) CONSULTA un valor normativo ya
//     resuelto para una fecha/dimensión, sin datos de la persona.
//   - `resolverReglasVigentes` SELECCIONA qué normas aplican a una fecha —
//     el motor de más bajo nivel, tampoco conoce datos de la persona.
//   - `determinar*` (este archivo) produce un DATO APLICABLE del expediente
//     a partir de información declarada por la persona más reglas de
//     ajuste trazadas — no es un juicio de elegibilidad ni una consulta
//     pura. Se distingue deliberadamente de las tres anteriores para no
//     sugerir que esta función hace lo mismo que `resolverReglasVigentes`
//     (ambigüedad detectada durante la revisión de este Slice).
//
// Principio rector de este archivo (aprobado explícitamente durante el
// análisis del Slice): el valor original declarado NUNCA se sobrescribe. Todo
// ajuste (tope, piso) queda trazado en `ajustesAplicados`, nunca aplicado en
// silencio. Este archivo tampoco produce ni deriva `gradoEstimacionResultado`
// — esa síntesis pertenece al futuro Motor de Explicabilidad, cuando exista
// una Simulation real que combine este dato con los demás insumos (semanas,
// régimen, supuestos de la fórmula). Ver expediente-pensional.md (Bloque 2,
// Niveles de madurez) y PL-230 §6.6.
//
// Alcance deliberadamente acotado tras la investigación normativa: solo
// calcula un IBC (vía salario) para el caso empleado, con la regla general
// —que no cubre salario integral, pagos no salariales ni múltiples empleos—,
// siempre declarada como limitación. Para independiente, mixto o exterior,
// nunca calcula: solo captura el valor que la persona ya declara usar hoy.

import { obtenerTopeMaximoIBC, obtenerSmlv } from '../data/legal/index.js'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Valida que `valor` represente un número no negativo y finito — mismo
 * criterio que `validarSemanas` en evidenciaSemanasMinimas.js, pero sin
 * exigir que sea entero (un monto en pesos puede tener decimales, aunque
 * sea infrecuente). Nunca lanza, nunca asume.
 *
 * @param {string} valor
 * @returns {number | null}
 */
function validarMonto(valor) {
  if (valor === '' || valor === null || valor === undefined) return null

  const numero = Number(valor)

  if (!Number.isFinite(numero)) return null
  if (numero < 0) return null

  return numero
}

function construirNormaUsada(entrada) {
  return {
    id: entrada.id,
    fuente: entrada.fuente,
    articulo: entrada.articulo,
    estado: entrada.estado,
    listoParaProduccion: entrada.listoParaProduccion,
    vigenciaDesde: entrada.vigenciaDesde,
    vigenciaHasta: entrada.vigenciaHasta,
  }
}

/**
 * Aplica el tope de 25 SMLMV a `valor`, si lo supera. Devuelve el valor final
 * (topado o intacto) y, solo cuando hubo ajuste, la entrada trazable
 * correspondiente — puramente estructural (codigo/valorAntes/valorDespues/
 * normaUsada), sin redacción narrativa: esa responsabilidad es exclusiva de
 * la pantalla que consume este resultado (BaseCotizacion.jsx), no del
 * dominio (ambigüedad detectada y corregida durante la revisión del Slice).
 *
 * @param {number} valor
 * @param {number} topeEnPesos
 * @param {Object} normaTope
 * @returns {{ valorFinal: number, ajuste: Object | null }}
 */
function aplicarTopeMaximoIBC(valor, topeEnPesos, normaTope) {
  if (valor <= topeEnPesos) {
    return { valorFinal: valor, ajuste: null }
  }
  return {
    valorFinal: topeEnPesos,
    ajuste: {
      codigo: 'TOPE_MAXIMO_IBC',
      valorAntes: valor,
      valorDespues: topeEnPesos,
      normaUsada: normaTope,
    },
  }
}

function limitacionesFuenteLegal(tope, smlv) {
  const limitaciones = []

  if (tope.estado !== 'publicado' || !tope.listoParaProduccion) {
    limitaciones.push({
      codigo: 'FUENTE_LEGAL_NO_LISTA_PARA_PRODUCCION',
      mensaje: 'La fuente legal utilizada para el tope está marcada como borrador y no lista para producción.',
    })
  }

  if (smlv.estadoJuridico !== 'firme') {
    limitaciones.push({
      codigo: 'SMLV_TRANSITORIO',
      mensaje:
        'El salario mínimo usado para este cálculo está sujeto a un litigio activo y todavía no es firme ' +
        '— el valor podría ajustarse cuando se resuelva.',
    })
  }

  return limitaciones
}

function resultadoBase() {
  return {
    ibcActualDeclarado: null,
    ibcActualCalculado: null,
    ibcAplicableSimulacion: null,
    origenDatoIbc: null,
    certezaValorDeclarado: null,
    confianzaReglaAplicada: null,
    ajustesAplicados: [],
    limitaciones: [],
    normaUsada: null,
  }
}

/**
 * @param {Object} input
 * @param {'conocido'|'aproximado'|'desconocido'|null} input.certeza
 * @param {string} input.valorDeclarado - Monto en pesos, como string (raw de un input)
 * @param {('empleado'|'independiente'|'ambos'|null)} input.tipoCotizante
 * @param {('colombia'|'exterior'|'ambos'|null)} input.lugarCotizacion
 * @param {string} input.salarioParaEstimar - Monto en pesos, solo relevante para empleado + desconocido
 * @param {string} [input.fecha] - ISO, por defecto hoy; parametrizable para pruebas
 * @returns {{
 *   ibcActualDeclarado: number | null,
 *   ibcActualCalculado: number | null,
 *   ibcAplicableSimulacion: number | null,
 *   origenDatoIbc: 'declarado_por_usuario' | 'calculado_desde_dato_declarado' | null,
 *   certezaValorDeclarado: 'conocido' | 'aproximado' | 'desconocido' | null,
 *   confianzaReglaAplicada: 'validada_directamente_aplicable' | 'aplicable_con_supuestos' | null,
 *   ajustesAplicados: Array<{ codigo: string, valorAntes: number, valorDespues: number, normaUsada: Object }>,
 *   limitaciones: Array<{ codigo: string, mensaje: string }>,
 *   normaUsada: { id: string, fuente: string, articulo: string, estado: string, listoParaProduccion: boolean, vigenciaDesde: string | null, vigenciaHasta: string | null } | null,
 * }}
 */
export function determinarBaseCotizacion({
  certeza,
  valorDeclarado,
  tipoCotizante,
  lugarCotizacion,
  salarioParaEstimar,
  fecha = hoyISO(),
}) {
  if (certeza !== 'conocido' && certeza !== 'aproximado' && certeza !== 'desconocido') {
    return resultadoBase()
  }

  const tope = obtenerTopeMaximoIBC(fecha)
  const smlv = obtenerSmlv(fecha)
  const topeEnPesos = tope.valor * smlv.valor
  const normaTope = construirNormaUsada(tope)

  if (certeza === 'conocido' || certeza === 'aproximado') {
    const valorNumerico = validarMonto(valorDeclarado)

    if (valorNumerico === null) {
      return { ...resultadoBase(), certezaValorDeclarado: certeza }
    }

    const { valorFinal, ajuste } = aplicarTopeMaximoIBC(valorNumerico, topeEnPesos, normaTope)
    const ajustesAplicados = ajuste ? [ajuste] : []

    const limitaciones = limitacionesFuenteLegal(tope, smlv)

    if (lugarCotizacion === 'exterior') {
      limitaciones.push({
        codigo: 'PISO_EXTERIOR_NO_EVALUADO',
        mensaje:
          'No verificamos todavía si tu base cumple el mínimo legal para cotización desde el exterior — hay una ' +
          'discrepancia normativa sin resolver sobre cuál es ese mínimo. No corregimos tu valor por esto.',
      })
    } else {
      const pisoEnPesos = smlv.valor
      if (valorNumerico < pisoEnPesos) {
        limitaciones.push({
          codigo: 'VALOR_BAJO_PISO_LEGAL',
          mensaje: 'El valor que indicaste está por debajo del mínimo legal de 1 salario mínimo — verifica ese dato.',
        })
      }
    }

    return {
      ibcActualDeclarado: valorNumerico,
      ibcActualCalculado: null,
      ibcAplicableSimulacion: valorFinal,
      origenDatoIbc: 'declarado_por_usuario',
      certezaValorDeclarado: certeza,
      confianzaReglaAplicada: 'validada_directamente_aplicable',
      ajustesAplicados,
      limitaciones,
      normaUsada: normaTope,
    }
  }

  // certeza === 'desconocido'
  if (tipoCotizante === 'empleado') {
    const salarioNumerico = validarMonto(salarioParaEstimar)

    if (salarioNumerico !== null) {
      const { valorFinal, ajuste } = aplicarTopeMaximoIBC(salarioNumerico, topeEnPesos, normaTope)
      const ajustesAplicados = ajuste ? [ajuste] : []

      const limitaciones = [
        ...limitacionesFuenteLegal(tope, smlv),
        {
          codigo: 'ESTIMACION_DESDE_SALARIO_NO_CUBRE_EXCEPCIONES',
          mensaje:
            'Esta estimación usa la regla general (tu salario, con el tope legal) y no cubre salario integral, ' +
            'pagos no constitutivos de salario, ni varias relaciones laborales simultáneas — no reemplaza tu base ' +
            'verificada.',
        },
      ]

      return {
        ibcActualDeclarado: null,
        ibcActualCalculado: salarioNumerico,
        ibcAplicableSimulacion: valorFinal,
        origenDatoIbc: 'calculado_desde_dato_declarado',
        certezaValorDeclarado: 'desconocido',
        confianzaReglaAplicada: 'aplicable_con_supuestos',
        ajustesAplicados,
        limitaciones,
        normaUsada: normaTope,
      }
    }
  }

  return {
    ...resultadoBase(),
    certezaValorDeclarado: 'desconocido',
    limitaciones: [
      {
        codigo: 'BASE_COTIZACION_NO_DETERMINADA',
        mensaje:
          'Todavía no pudimos determinar tu base de cotización. Más adelante podremos confirmarla con tu historia ' +
          'de aportes o tu historia laboral oficial.',
      },
    ],
  }
}
