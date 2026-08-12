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
  objetivoSeleccionado: null,
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
  certezaBaseCotizacion: null,
  valorBaseCotizacionDeclarado: '',
  salarioParaEstimarBase: '',
  declaracionLibre: null,
  edadJubilacionDeseada: '',
  // Slice "Primera lectura económica RPM desde historia estructurada": historia de
  // cotización estructurada (PeriodoCotizacion[]) — en este Slice solo se puebla vía
  // fixtures de desarrollo, nunca por una pantalla real de captura (fuera de alcance).
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
  'exploraTuProyeccionRPM',
  'declaracionLibre',
  'revisionDeclaracion',
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
export const CAMPOS_MINIMOS_POR_VISTA = {
  declaracionLibre: ['regimenActual', 'fechaNacimiento', 'sexo'],
  exploraTuProyeccionRPM: ['regimenActual', 'historiaCotizacion'],
}
