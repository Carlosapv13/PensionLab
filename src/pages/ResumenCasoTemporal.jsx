// Vista temporal de Expediente pensional: destino provisional del botón
// "Continuar" de Historial laboral hasta que el Slice correspondiente
// implemente la pantalla real.

const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const REGIMEN_TEXTO = {
  RPM: 'Colpensiones',
  RAIS: 'Fondo privado',
  desconocido: 'No estoy seguro',
}

const TIPO_COTIZANTE_TEXTO = {
  empleado: 'Como empleado.',
  independiente: 'Como independiente.',
  ambos: 'De ambas formas.',
}

const LUGAR_COTIZACION_TEXTO = {
  colombia: 'Solo en Colombia.',
  exterior: 'Desde el exterior.',
  ambos: 'En Colombia y desde el exterior.',
}

const COTIZA_ACTUALMENTE_TEXTO = {
  si: 'Sí.',
  no: 'No.',
}

function formatearFecha(fecha) {
  if (!fecha) return fecha
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return `${dia} de ${MESES_LARGOS[mes - 1]} de ${anio}`
}

/**
 * @param {Object} props
 * @param {string | null} props.objetivoSeleccionado
 * @param {string} props.fechaNacimiento
 * @param {string | null} props.sexo
 * @param {string | null} props.lugarResidencia
 * @param {string | null} props.regimenActual
 * @param {string | null} props.tipoCotizante
 * @param {string | null} props.lugarCotizacion
 * @param {string | null} props.cotizaActualmente
 * @param {() => void} props.onVolver
 */
function ResumenCasoTemporal({
  objetivoSeleccionado,
  fechaNacimiento,
  sexo,
  lugarResidencia,
  regimenActual,
  tipoCotizante,
  lugarCotizacion,
  cotizaActualmente,
  onVolver,
}) {
  return (
    <div className="screen">
      <h1 className="screen__title">Expediente pensional</h1>

      <p className="screen__subtitle">
        Esta pantalla se implementará en el siguiente Slice.
      </p>

      <div className="summary">
        <section className="summary__block">
          <h2 className="summary__block-title">Objetivo</h2>
          <p>{objetivoSeleccionado}</p>
        </section>

        <section className="summary__block">
          <h2 className="summary__block-title">Datos personales</h2>
          <p>Fecha de nacimiento: {formatearFecha(fechaNacimiento)}</p>
          <p>Sexo: {sexo}</p>
          <p>Lugar de residencia: {lugarResidencia}</p>
        </section>

        <section className="summary__block">
          <h2 className="summary__block-title">Situación pensional</h2>
          <p>Régimen actual: {REGIMEN_TEXTO[regimenActual]}</p>
        </section>

        <section className="summary__block">
          <h2 className="summary__block-title">Historial laboral</h2>
          <p>Forma de cotización: {TIPO_COTIZANTE_TEXTO[tipoCotizante]}</p>
          <p>Lugar de cotización: {LUGAR_COTIZACION_TEXTO[lugarCotizacion]}</p>
          <p>Actualmente cotiza: {COTIZA_ACTUALMENTE_TEXTO[cotizaActualmente]}</p>
        </section>
      </div>

      <button type="button" className="btn btn-secondary" onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

export default ResumenCasoTemporal
