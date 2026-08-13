// Pantalla funcional de Expediente pensional: primera versión real de esta
// vista (Slice S3-006). Presenta el resumen de lo capturado hasta ahora,
// organizado por bloques, y da paso a continuar completando el expediente.
// No captura datos nuevos, no modifica estados existentes y no implementa
// reglas ni cálculos pensionales.

import { useRef } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'

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
 * @param {() => void} props.onComenzarExpediente
 * @param {() => void} props.onVolver
 */
function ExpedientePensional({
  objetivoSeleccionado,
  fechaNacimiento,
  sexo,
  lugarResidencia,
  regimenActual,
  tipoCotizante,
  lugarCotizacion,
  cotizaActualmente,
  onComenzarExpediente,
  onVolver,
}) {
  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
    onComenzarExpediente()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title">Expediente pensional</h1>

      <p className="screen__subtitle">
        Ya conocemos la información básica de tu caso.
      </p>

      <p className="screen__subtitle">
        A partir de ahora comenzaremos a construir tu expediente pensional.
      </p>

      <p className="screen__subtitle">
        No necesitas tener toda la información desde el principio. PensionLab
        te indicará paso a paso qué información hace falta y por qué es
        importante.
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

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button type="submit" className="btn btn-primary">
          Comenzar expediente
        </button>
      </div>
    </form>
  )
}

export default ExpedientePensional
