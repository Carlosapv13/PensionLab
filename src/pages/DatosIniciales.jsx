// Pantalla funcional de Datos iniciales: captura fecha de nacimiento, sexo para
// efectos pensionales y lugar de residencia (Slice S3-003). La fecha de
// nacimiento se captura como tres campos separados (día, mes, año) en vez de
// un selector nativo, para no obligar a navegar muchos años atrás.

import { useState, useRef, useEffect } from 'react'

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

// Pausa para el buffer de dígitos del campo Mes (ver manejarTeclaMes): permite
// escribir '07' como dos teclas, o un solo dígito ('7', '1') que se resuelve
// tras esta espera si no llega un segundo dígito. Mismo orden de magnitud que
// el typeahead nativo de un <select> usa para su propia búsqueda por letras.
const PAUSA_BUFFER_MES_MS = 600
const RE_DIGITO = /^[0-9]$/

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

// 15 años NO es un requisito legal del sistema pensional colombiano — es una
// decisión funcional del MVP para acotar el alcance actual del producto a
// casos donde el flujo pensional tiene sentido de plantear. Si el alcance de
// PensionLab cambia, este número se revisa como decisión de producto, no como
// corrección de un valor normativo.
const EDAD_MINIMA_FUNCIONAL = 15

// Calcula la edad cumplida a partir de la fecha completa (año, mes y día),
// no por resta de años — evitar `añoActual - añoNacimiento` es necesario
// porque esa resta da un valor incorrecto antes del cumpleaños del año.
function calcularEdadCumplida(fechaISO, fechaReferenciaISO) {
  const [anioNac, mesNac, diaNac] = fechaISO.split('-').map(Number)
  const [anioRef, mesRef, diaRef] = fechaReferenciaISO.split('-').map(Number)
  let edad = anioRef - anioNac
  if (mesRef < mesNac || (mesRef === mesNac && diaRef < diaNac)) edad -= 1
  return edad
}

// IMPORTANTE — estas validaciones son de capa de interfaz: ayudan a la
// persona a corregir su propia entrada y evitan que datos obviamente
// inválidos avancen en el flujo. NO son la barrera que protege el dominio.
// `fechaNacimiento` no tiene todavía ningún consumidor en `domain/` (ningún
// archivo de `pensionEngine/` está implementado), pero cuando lo tenga, esa
// función deberá validar sus propias entradas de forma autónoma —fecha real,
// no futura, formato correcto— sin asumir que este archivo ya lo hizo, con
// el mismo criterio que ya aplica `evaluarSemanasMinimas` para las semanas
// cotizadas (Principio de Arquitectura 11: validación en capas).
function esFechaNacimientoValida(fecha) {
  return (
    Boolean(fecha) &&
    esFechaReal(fecha) &&
    fecha <= HOY &&
    calcularEdadCumplida(fecha, HOY) >= EDAD_MINIMA_FUNCIONAL
  )
}

function diasMaximosEnMes(mesStr, anioStr) {
  if (!mesStr) return 31
  const mesNum = Number(mesStr)
  // Si el año todavía no está completo, se usa un año bisiesto de referencia
  // (permisivo) para no rechazar "29" en febrero antes de que el año exista.
  const anioReferencia = anioStr && anioStr.length === 4 ? Number(anioStr) : 2000
  return new Date(Date.UTC(anioReferencia, mesNum, 0)).getUTCDate()
}

function mensajeErrorDia(diaStr, mesStr, anioStr) {
  if (!diaStr) return null
  const dia = Number(diaStr)
  if (dia < 1 || dia > 31) return 'Ingresa un día entre 1 y 31.'

  const maximo = diasMaximosEnMes(mesStr, anioStr)
  if (dia <= maximo) return null

  if (mesStr === '02' && anioStr && anioStr.length === 4) {
    return `Febrero de ${anioStr} tiene máximo ${maximo} días.`
  }
  const nombreMes = mesStr ? MESES.find((m) => m.valor === mesStr).texto : null
  return nombreMes ? `${nombreMes} tiene máximo ${maximo} días.` : 'Ingresa un día entre 1 y 31.'
}

function mensajeErrorEdad(fecha) {
  if (!fecha || !esFechaReal(fecha) || fecha > HOY) return null
  return calcularEdadCumplida(fecha, HOY) < EDAD_MINIMA_FUNCIONAL
    ? 'PensionLab está diseñado actualmente para personas de 15 años o más.'
    : null
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
  // El mensaje de error del día no se muestra mientras se teclea el propio
  // día (interrumpiría a media escritura) — solo después de perder el foco
  // en Día, o al cambiar Mes o Año (un cambio de mes puede volver inválido
  // un día que antes era válido, ej. 31 de marzo → 31 de abril).
  const [mostrarErrorDia, setMostrarErrorDia] = useState(false)

  function actualizarFecha(campos) {
    const siguiente = { ...fechaLocal, ...campos }
    setFechaLocal(siguiente)
    onCambiarFechaNacimiento(construirFecha(siguiente.dia, siguiente.mes, siguiente.anio))
    if ('mes' in campos || 'anio' in campos) {
      setMostrarErrorDia(true)
    }
  }

  // Buffer de dígitos tecleados en el <select> de Mes, para permitir escribir
  // '7'/'07' y que resuelva a Julio, sin reemplazar el <select> nativo (ver
  // propuesta aprobada). Referencias estables (useRef): no deben recrearse en
  // cada render, ni disparar uno.
  const bufferMesRef = useRef('')
  const timeoutMesRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutMesRef.current) clearTimeout(timeoutMesRef.current)
    }
  }, [])

  function limpiarBufferMes() {
    if (timeoutMesRef.current) {
      clearTimeout(timeoutMesRef.current)
      timeoutMesRef.current = null
    }
    bufferMesRef.current = ''
  }

  function resolverBufferMes() {
    const numero = Number(bufferMesRef.current)
    // Un valor inválido (0, 00, 13+) se descarta sin tocar el mes ya
    // seleccionado — nunca se decide en silencio por un valor que no pudo
    // interpretarse (mismo criterio que el resto del proyecto).
    if (numero >= 1 && numero <= 12) {
      actualizarFecha({ mes: pad2(numero) })
    }
    limpiarBufferMes()
  }

  function manejarTeclaMes(e) {
    if (!RE_DIGITO.test(e.key)) return
    // Solo se intercepta la tecla si es un dígito — letras, Tab, Enter,
    // Escape, flechas, Home y End nunca llegan aquí (RE_DIGITO no las
    // acepta) y conservan el comportamiento 100% nativo del <select>.
    e.preventDefault()

    bufferMesRef.current += e.key
    if (timeoutMesRef.current) clearTimeout(timeoutMesRef.current)

    if (bufferMesRef.current.length >= 2) {
      resolverBufferMes()
      return
    }

    timeoutMesRef.current = setTimeout(resolverBufferMes, PAUSA_BUFFER_MES_MS)
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="field__input"
              value={fechaLocal.dia}
              onChange={(e) =>
                actualizarFecha({ dia: e.target.value.replace(/\D/g, '').slice(0, 2) })
              }
              onBlur={() => setMostrarErrorDia(true)}
            />
          </label>

          <label className="field">
            <span className="field__label">Mes</span>
            <select
              className="field__input"
              value={fechaLocal.mes}
              onChange={(e) => {
                // Selección real por mouse o flechas: el buffer de dígitos
                // queda obsoleto, se descarta para que no interfiera después.
                limpiarBufferMes()
                actualizarFecha({ mes: e.target.value })
              }}
              onKeyDown={manejarTeclaMes}
              onBlur={limpiarBufferMes}
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
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="field__input"
              value={fechaLocal.anio}
              onChange={(e) =>
                actualizarFecha({ anio: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
            />
          </label>
        </div>

        {mostrarErrorDia && mensajeErrorDia(fechaLocal.dia, fechaLocal.mes, fechaLocal.anio) && (
          <div className="field__warning">
            <p>{mensajeErrorDia(fechaLocal.dia, fechaLocal.mes, fechaLocal.anio)}</p>
          </div>
        )}

        {mensajeErrorEdad(fechaNacimiento) && (
          <div className="field__warning">
            <p>{mensajeErrorEdad(fechaNacimiento)}</p>
          </div>
        )}
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
