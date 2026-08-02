// Pantalla funcional de Datos iniciales: captura fecha de nacimiento, sexo para
// efectos pensionales y lugar de residencia (Slice S3-003). La fecha de
// nacimiento se captura como tres campos separados (día, mes, año) en vez de
// un selector nativo, para no obligar a navegar muchos años atrás.

import { useState } from 'react'

const HOY = new Date().toISOString().slice(0, 10)
const ANIO_ACTUAL = Number(HOY.slice(0, 4))
const ANIO_MINIMO = 1900

const MESES = [
  { valor: '01', texto: 'Enero' },
  { valor: '02', texto: 'Febrero' },
  { valor: '03', texto: 'Marzo' },
  { valor: '04', texto: 'Abril' },
  { valor: '05', texto: 'Mayo' },
  { valor: '06', texto: 'Junio' },
  { valor: '07', texto: 'Julio' },
  { valor: '08', texto: 'Agosto' },
  { valor: '09', texto: 'Septiembre' },
  { valor: '10', texto: 'Octubre' },
  { valor: '11', texto: 'Noviembre' },
  { valor: '12', texto: 'Diciembre' },
]

const OPCIONES_SEXO = ['Mujer', 'Hombre']
const OPCIONES_LUGAR_RESIDENCIA = ['Colombia', 'Exterior']

function pad2(valor) {
  return String(valor).padStart(2, '0')
}

function esFechaReal(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaObj = new Date(`${fecha}T00:00:00`)
  return (
    !Number.isNaN(fechaObj.getTime()) &&
    fechaObj.getFullYear() === anio &&
    fechaObj.getMonth() + 1 === mes &&
    fechaObj.getDate() === dia
  )
}

function esFechaNacimientoValida(fecha) {
  return Boolean(fecha) && esFechaReal(fecha) && fecha <= HOY
}

function construirFecha(dia, mes, anio) {
  if (!dia || !mes || anio.length !== 4) return ''
  if (Number(anio) < ANIO_MINIMO || Number(anio) > ANIO_ACTUAL) return ''
  return `${anio}-${mes}-${pad2(dia)}`
}

function parsearFecha(fecha) {
  if (!fecha) return { dia: '', mes: '', anio: '' }
  const [anio, mes, dia] = fecha.split('-')
  return { dia: String(Number(dia)), mes, anio }
}

/**
 * @param {Object} props
 * @param {string} props.fechaNacimiento
 * @param {(fecha: string) => void} props.onCambiarFechaNacimiento
 * @param {string | null} props.sexo
 * @param {(sexo: string) => void} props.onCambiarSexo
 * @param {string | null} props.lugarResidencia
 * @param {(lugar: string) => void} props.onCambiarLugarResidencia
 * @param {() => void} props.onContinuar
 * @param {() => void} props.onVolver
 */
function DatosIniciales({
  fechaNacimiento,
  onCambiarFechaNacimiento,
  sexo,
  onCambiarSexo,
  lugarResidencia,
  onCambiarLugarResidencia,
  onContinuar,
  onVolver,
}) {
  const [fechaLocal, setFechaLocal] = useState(() => parsearFecha(fechaNacimiento))

  function actualizarFecha(campos) {
    const siguiente = { ...fechaLocal, ...campos }
    setFechaLocal(siguiente)
    onCambiarFechaNacimiento(construirFecha(siguiente.dia, siguiente.mes, siguiente.anio))
  }

  const puedeContinuar =
    esFechaNacimientoValida(fechaNacimiento) && Boolean(sexo) && Boolean(lugarResidencia)

  return (
    <div className="screen">
      <h1 className="screen__title">Datos iniciales</h1>

      <fieldset className="field-group">
        <legend className="field__label">Fecha de nacimiento</legend>

        <div className="date-fields">
          <label className="field">
            <span className="field__label">Día</span>
            <input
              type="number"
              className="field__input"
              min="1"
              max="31"
              value={fechaLocal.dia}
              onChange={(e) => actualizarFecha({ dia: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="field__label">Mes</span>
            <select
              className="field__input"
              value={fechaLocal.mes}
              onChange={(e) => actualizarFecha({ mes: e.target.value })}
            >
              <option value="" disabled>
                Selecciona
              </option>
              {MESES.map(({ valor, texto }) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Año</span>
            <input
              type="number"
              className="field__input"
              min={ANIO_MINIMO}
              max={ANIO_ACTUAL}
              value={fechaLocal.anio}
              onChange={(e) => actualizarFecha({ anio: e.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="options">
        <legend>Sexo para efectos pensionales</legend>

        <p className="option__hint">
          Este dato es necesario porque algunos requisitos pensionales pueden
          variar.
        </p>

        {OPCIONES_SEXO.map((opcion) => (
          <label key={opcion} className="option">
            <input
              type="radio"
              name="sexo"
              value={opcion}
              checked={sexo === opcion}
              onChange={() => onCambiarSexo(opcion)}
            />
            <span>{opcion}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="options">
        <legend>Lugar de residencia</legend>

        {OPCIONES_LUGAR_RESIDENCIA.map((opcion) => (
          <label key={opcion} className="option">
            <input
              type="radio"
              name="lugarResidencia"
              value={opcion}
              checked={lugarResidencia === opcion}
              onChange={() => onCambiarLugarResidencia(opcion)}
            />
            <span>{opcion}</span>
          </label>
        ))}
      </fieldset>

      <div className="screen__actions">
        <button type="button" className="btn btn-secondary" onClick={onVolver}>
          Volver
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onContinuar}
          disabled={!puedeContinuar}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default DatosIniciales
