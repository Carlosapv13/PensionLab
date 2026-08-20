// Pantalla funcional de Datos iniciales: captura fecha de nacimiento, sexo para
// efectos pensionales y lugar de residencia (Slice S3-003). La fecha de
// nacimiento se captura como tres campos separados (día, mes, año) en vez de
// un selector nativo, para no obligar a navegar muchos años atrás.
//
// Captura de fecha extraída a CampoFechaDiaMesAnio.jsx en la revisión final de S4-001
// (Entregable 2): es el origen del estándar permanente de captura de fechas en
// PensionLab — este archivo consume ese componente en vez de mantener su propia copia
// del comportamiento (buffer de dígitos del mes, aviso de día inválido). Lo que
// permanece aquí es exclusivamente la validación de NEGOCIO de esta pantalla (edad,
// fecha futura), que el componente compartido nunca conoce ni valida.
//
// Diferencia deliberada frente al comportamiento anterior a esta extracción: antes,
// un año tecleado por encima del año actual hacía que `fechaNacimiento` quedara en ''
// (silencio, sin mensaje — mensajeErrorFecha('') no dice nada). Con
// CampoFechaDiaMesAnio.jsx (misma función construirFechaISO ya usada y probada en
// HistoriaCotizacionRPM.jsx) ese año sí se propaga como fecha ISO, y mensajeErrorFecha
// (abajo) ya lo captura con un mensaje específico ("está en el futuro"). Es un cambio de
// comportamiento, no solo de implementación — documentado aquí a propósito para que
// Carlos/Atlas puedan confirmarlo o pedir que se revierta.

import { useRef } from 'react'
import { useRestaurarFocoAlMontar } from '../hooks/useRestaurarFocoAlMontar.js'
import CampoFechaDiaMesAnio from '../components/CampoFechaDiaMesAnio.jsx'
import { esFechaDiaMesAnioReal } from '../format/fechaDiaMesAnio.js'

const HOY = new Date().toISOString().slice(0, 10)

const OPCIONES_SEXO = ['Mujer', 'Hombre']
const OPCIONES_LUGAR_RESIDENCIA = ['Colombia', 'Exterior']

// 15 años NO es un requisito legal del sistema pensional colombiano — es una
// decisión funcional del MVP para acotar el alcance actual del producto a
// casos donde el flujo pensional tiene sentido de plantear. Si el alcance de
// PensionLab cambia, este número se revisa como decisión de producto, no como
// corrección de un valor normativo.
const EDAD_MINIMA_FUNCIONAL = 15

// 100 años tampoco es un límite legal ni biológico — es la misma clase de
// decisión funcional del MVP que EDAD_MINIMA_FUNCIONAL, y reemplaza al
// antiguo límite fijo por año de nacimiento (ANIO_MINIMO = 1900): ese límite
// dejaba pasar edades extremadamente improbables porque comparaba contra un
// año fijo, no contra la edad real de la persona. Se revisa como decisión de
// producto si el alcance de PensionLab cambia, no como corrección de un
// valor normativo.
const EDAD_MAXIMA_FUNCIONAL = 100

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
  if (!fecha || !esFechaDiaMesAnioReal(fecha) || fecha > HOY) return false
  const edad = calcularEdadCumplida(fecha, HOY)
  return edad >= EDAD_MINIMA_FUNCIONAL && edad <= EDAD_MAXIMA_FUNCIONAL
}

// Cubre los dos casos en que una fecha completa y real todavía bloquea
// "Continuar" sin que CampoFechaDiaMesAnio.jsx diga nada al respecto (ese
// componente solo conoce el día frente al mes/año, no la fecha completa
// frente a hoy): fecha futura, y edad fuera del rango funcional del MVP.
// Regla de UX: ningún bloqueo se deja sin explicar — ver "Explicar todo
// bloqueo" en metodologia-de-desarrollo-con-ia.md.
function mensajeErrorFecha(fecha) {
  if (!fecha || !esFechaDiaMesAnioReal(fecha)) return null

  if (fecha > HOY) {
    return 'La fecha de nacimiento que ingresaste está en el futuro. Por favor verifica ese dato antes de continuar.'
  }

  const edad = calcularEdadCumplida(fecha, HOY)
  if (edad < EDAD_MINIMA_FUNCIONAL) {
    return (
      `La fecha de nacimiento que ingresaste indica una edad aproximada de ${edad} años. ` +
      'PensionLab está diseñado para personas de 15 años o más — verifica ese dato antes de continuar.'
    )
  }
  if (edad > EDAD_MAXIMA_FUNCIONAL) {
    return (
      `La fecha de nacimiento que ingresaste indica una edad aproximada de ${edad} años. ` +
      'PensionLab está diseñado para personas de hasta 100 años — verifica ese dato antes de continuar.'
    )
  }
  return null
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
  const puedeContinuar =
    esFechaNacimientoValida(fechaNacimiento) && Boolean(sexo) && Boolean(lugarResidencia)

  const formRef = useRef(null)
  useRestaurarFocoAlMontar(formRef)

  function manejarEnvio(e) {
    e.preventDefault()
    onContinuar()
  }

  return (
    <form className="screen" onSubmit={manejarEnvio} ref={formRef}>
      <h1 className="screen__title">Datos iniciales</h1>

      <fieldset className="field-group">
        <legend className="field__label">Fecha de nacimiento</legend>

        <CampoFechaDiaMesAnio valor={fechaNacimiento} onCambiar={onCambiarFechaNacimiento} />

        {mensajeErrorFecha(fechaNacimiento) && (
          <div className="field__warning">
            <p>{mensajeErrorFecha(fechaNacimiento)}</p>
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
        <button type="submit" className="btn btn-primary" disabled={!puedeContinuar}>
          Continuar
        </button>
      </div>
    </form>
  )
}

export default DatosIniciales
