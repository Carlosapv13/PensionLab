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
