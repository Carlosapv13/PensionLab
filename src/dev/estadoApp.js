// Describe la forma del estado editable de App.jsx desde el punto de vista de
// las herramientas de desarrollo (src/dev/) — exclusivamente de desarrollo,
// nunca importado por ninguna pantalla productiva ni por domain/.
//
// No es un modelo de dominio ni un intento de "Caso Pensional" (ver
// docs/producto/oportunidades-futuras.md, entrada 1, para esa distinción
// explícita) — es solo un espejo de las claves y valores por defecto que
// App.jsx ya mantiene con useState, para que el cargador de fixtures pueda
// resetear y aplicar sin adivinar.

// Mismo orden y mismos valores iniciales que los useState de App.jsx — si
// App.jsx agrega un campo nuevo de estado editable, este archivo debe
// actualizarse a mano (deliberado: nada de esto se deriva automáticamente,
// para que un olvido sea visible como un campo faltante, no un error
// silencioso).
export const VALORES_POR_DEFECTO = {
  // PL-250 Bloque 1 (2026-09-01): motivo de consulta, capturado en
  // Objetivo.jsx — ver Objetivo.helpers.js#determinarSalidaMotivoConsulta.
  // `objetivoSeleccionado` ("¿en qué quieres que te ayudemos hoy?") se
  // retiró del estado activo tras la auditoría de producto: sus dos
  // opciones habilitadas nunca producían un resultado distinto
  // (`DECISIÓN_APARENTE`, PL-250 §20).
  motivoConsulta: null,
  fechaNacimiento: '',
  sexo: null,
  lugarResidencia: null,
  regimenActual: null,
  tipoCotizante: null,
  lugarCotizacion: null,
  cotizaActualmente: null,
  anioInicioCotizacion: '',
  nivelConocimientoSemanas: null,
  semanasCotizadas: '',
  infoEsencialCompletada: false,
  anioConfirmadoEdadTemprana: null,
  semanasConfirmadasPara: null,
  trasladoRegimen: null,
  detalleTraslado: null,
  // Slice S4-001A: fecha en que se hizo efectivo el traslado de régimen, con el
  // mismo patrón de certeza ya usado en el resto del proyecto — se captura y se
  // guarda en el expediente, todavía no la consume ningún cálculo.
  certezaFechaTraslado: null,
  fechaTrasladoRegimen: '',
  certezaBaseCotizacion: null,
  valorBaseCotizacionDeclarado: '',
  salarioParaEstimarBase: '',
  declaracionLibre: null,
  edadJubilacionDeseada: '',
  certezaSaldoAcumulado: null,
  saldoAcumuladoDeclarado: '',
  objetivoPensionMensual: '',
  restriccionCostoPensionalAdicionalMaximoMensual: '',
  // Historia de cotización estructurada (PeriodoCotizacion[]). Desde S4-001
  // (Entregable 2, Sprint 4) también se puebla por la pantalla real de captura
  // (HistoriaCotizacionRPM.jsx) — este archivo sigue permitiendo poblarla también vía
  // fixtures, para pruebas manuales rápidas.
  historiaCotizacion: [],
}

export const CLAVES_ESTADO_EDITABLE = Object.keys(VALORES_POR_DEFECTO)

// Vistas válidas para "saltar directamente" — mismos strings ya usados en
// los condicionales de App.jsx. Lista plana, no derivada de App.jsx en
// tiempo de ejecución, por la misma razón que VALORES_POR_DEFECTO: un olvido
// debe ser visible, no silencioso.
export const VISTAS_CONOCIDAS = [
  'bienvenida',
  'objetivo',
  'datosIniciales',
  'situacionPensional',
  'historialLaboral',
  'expedientePensional',
  'completarExpediente',
  'informacionPensional',
  'historiaPensional',
  'primeraLectura',
  'indiciosTransicion',
  'baseCotizacion',
  'queDeterminaResultado',
  'exploraTuProyeccion',
  'historiaCotizacionRPM',
  'exploraTuProyeccionRPM',
  'proyectaTuPensionRPM',
  // 'revisionDeclaracion' se retiró (precisión de producto S4-006, 2026-08-23): su
  // responsabilidad se fusionó dentro de 'declaracionLibre' — ver DeclaracionLibre.jsx.
  'declaracionLibre',
]

// Defensa mínima y pequeña, no un sistema de schemas: campos cuya ausencia
// haría que la vista destino elegida no tuviera sentido como punto de
// partida de una prueba manual. Se puebla solo para las vistas que
// realmente tienen fixtures hoy — crece campo por campo con evidencia real
// (Principio 9), nunca se completa preventivamente para las 16 vistas.
//
// exploraTuProyeccionRPM: presencia únicamente de los dos campos sin los que
// calcularPensionRPM.js ni siquiera llega a evaluar la historia (regimenActual,
// historiaCotizacion) — ver ExploraTuProyeccionRPM.jsx.
//
// exploraTuProyeccion: presencia únicamente (nunca valores/reglas de
// negocio, eso es responsabilidad exclusiva del dominio) de los campos
// estructurales sin los que generarCaminosRAIS.js ni siquiera llega a
// evaluar el perfil o directamente devuelve DATOS_INCOMPLETOS — ver
// perfilAplica en ExploraTuProyeccion.jsx y las validaciones de
// generarCaminosRAIS.js. restriccionCostoPensionalAdicionalMaximoMensual
// queda fuera a propósito: el dominio ya la trata como opcional (sin ella,
// sin límite propio, no bloquea la generación de caminos).
//
// proyectaTuPensionRPM (S4-003): mismo criterio que exploraTuProyeccion, sin
// saldoAcumulado (no aplica a RPM) — ver generarCaminosRPM.js. 'sexo' se agregó tras la
// auditoría de elegibilidad (2026-08-21): indispensable para resolver edad/semanas
// mínimas legales.
export const CAMPOS_MINIMOS_POR_VISTA = {
  declaracionLibre: ['regimenActual', 'fechaNacimiento', 'sexo'],
  exploraTuProyeccionRPM: ['regimenActual', 'historiaCotizacion'],
  proyectaTuPensionRPM: [
    'regimenActual',
    'sexo',
    'historiaCotizacion',
    'fechaNacimiento',
    'edadJubilacionDeseada',
    'certezaBaseCotizacion',
    'valorBaseCotizacionDeclarado',
    'objetivoPensionMensual',
  ],
  exploraTuProyeccion: [
    'regimenActual',
    'tipoCotizante',
    'lugarCotizacion',
    'trasladoRegimen',
    'fechaNacimiento',
    'edadJubilacionDeseada',
    'certezaBaseCotizacion',
    'valorBaseCotizacionDeclarado',
    'certezaSaldoAcumulado',
    'saldoAcumuladoDeclarado',
    'objetivoPensionMensual',
  ],
}
