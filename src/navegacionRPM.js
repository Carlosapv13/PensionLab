// UX-RPM-01 (experimental, 2026-08-24) — decide a qué vista lleva "Continuar" desde
// BaseCotizacion. RPM salta directo a ProyectaTuPensionRPM sin pasar por
// queDeterminaResultado/historiaCotizacionRPM/exploraTuProyeccionRPM: la auditoría del
// mismo día confirmó que generarCaminosRPM ya tolera historiaCotizacion=[] y que las
// cinco entradas que sí exige (regimenActual, sexo, fechaNacimiento,
// ibcAplicableSimulacion, edadJubilacionDeseada/objetivoValorMensual, estas dos últimas
// capturadas dentro de la propia ProyectaTuPensionRPM.jsx) ya están disponibles en este
// punto. Ningún otro régimen se ve afectado — conserva exactamente el recorrido previo
// (queDeterminaResultado, que a su vez bifurca a RAIS).
//
// En su propio archivo (no dentro de App.jsx) por regla de lint del proyecto
// (react-refresh/only-export-components): un archivo de componente no puede tener
// además exports nombrados de funciones sueltas, aunque sean triviales — mismo criterio
// ya aplicado en cada página con su propio *.helpers.js.
export function siguienteVistaTrasBaseCotizacion(regimenActual) {
  return regimenActual === 'RPM' ? 'proyectaTuPensionRPM' : 'queDeterminaResultado'
}

// Revisión correctiva E4-C1 (2026-09-10, segunda ronda — "Retorno controlado desde el
// resumen"): decisión pura de a dónde debe ir "Continuar" en las cuatro pantallas que
// ProyectaTuPensionRPM.jsx puede abrir desde su resumen revisable (datosIniciales,
// situacionPensional, informacionPensional, indiciosTransicion) — extraída de App.jsx (donde
// antes vivía inline) para poder probarla sin montar ningún componente, mismo criterio ya
// aplicado a siguienteVistaTrasBaseCotizacion.
//
// Regla única para las cuatro pantallas: si el contexto de edición desde el resumen está
// activo Y el expediente sigue siendo compatible con una proyección RPM (regimenActual
// todavía 'RPM' en el momento de continuar), regresa directo a 'proyectaTuPensionRPM' — sin
// atravesar ninguna pantalla intermedia. En cualquier otro caso (contexto inactivo =
// navegación normal del onboarding, o regimenActual dejó de ser 'RPM' — solo puede ocurrir
// en situacionPensional) devuelve `destinoNormal` tal cual, exactamente el mismo destino que
// esa pantalla ya usaba antes de este checkpoint.
//
// No verifica por separado "existen todos los datos imprescindibles" para el caso de fecha
// de nacimiento: ese chequeo ya existe donde corresponde (ProyectaTuPensionRPM.jsx recalcula
// edadActual en cada render y reabre su propio formulario con su propio mensaje de error si
// la nueva fecha deja edadJubilacionDeseada inválida — ese dato no se captura en ninguna otra
// pantalla, así que ProyectaTuPensionRPM.jsx YA ES la primera pantalla realmente necesaria
// para ese caso). Duplicar esa validación aquí sería una segunda fuente de verdad.
//
// IBC actual e historia de cotización no usan esta función: ya regresan directo por
// construcción propia (siguienteVistaTrasBaseCotizacion, arriba, y el mecanismo pre-existente
// de historia — regresarAProyeccionTrasHistoria en App.jsx — respectivamente), sin necesitar
// ningún contexto nuevo.
/**
 * @param {Object} params
 * @param {boolean} params.regresarAProyeccionTrasEdicionResumen - contexto transitorio de
 *   App.jsx: true únicamente mientras el usuario edita un dato abierto desde el resumen de
 *   ProyectaTuPensionRPM.jsx.
 * @param {('RPM'|'RAIS'|'desconocido'|null)} params.regimenActual - valor YA actualizado
 *   (post-edición) en el momento de llamar — la única condición que puede volver
 *   incompatible el retorno directo.
 * @param {string} params.destinoNormal - el destino que esa pantalla usaría si no viniera de
 *   una edición desde el resumen (idéntico al que ya usaba antes de este checkpoint).
 * @returns {string}
 */
export function destinoTrasEdicionDesdeResumenRPM({ regresarAProyeccionTrasEdicionResumen, regimenActual, destinoNormal }) {
  const debeRegresarAProyeccion = regresarAProyeccionTrasEdicionResumen && regimenActual === 'RPM'
  return debeRegresarAProyeccion ? 'proyectaTuPensionRPM' : destinoNormal
}
