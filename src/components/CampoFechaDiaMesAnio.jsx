// Estándar permanente de captura de fecha en PensionLab (decisión Carlos/Atlas, revisión
// final de S4-001): "toda fecha que PensionLab solicite al usuario debe utilizar el mismo
// patrón de interacción y comportamiento de captura de la fecha de nacimiento, salvo que
// exista una razón funcional explícita y documentada para apartarse de él."
//
// Comportamiento extraído literalmente de DatosIniciales.jsx (Sprint 3, S3-003 y sus
// mejoras posteriores) — tres campos día/mes/año, buffer de dígitos para escribir el mes
// por teclado en el <select> nativo, y aviso de día inválido para el mes/año elegidos.
// DatosIniciales.jsx ya consume este componente; no queda una segunda copia del
// comportamiento en ningún otro lugar.
//
// Deliberadamente NO valida negocio (edad, fecha futura, orden desde/hasta de un rango):
// solo entrega una fecha ISO ('' si está incompleta) y avisa cuando el día no es real para
// el mes/año ya elegidos (estructural, no de dominio). Cada pantalla que use este
// componente sigue siendo responsable de sus propias validaciones de negocio sobre el
// valor que recibe — mismo principio ya aplicado en evaluarNuevoPeriodo.js y
// esFechaNacimientoValida (DatosIniciales.jsx).
//
// Semi-controlado, igual que el DatosIniciales.jsx original: el estado día/mes/año vive
// localmente, inicializado una sola vez desde `valor` — no se resincroniza si `valor`
// cambia por una razón externa mientras el componente sigue montado (ej. la propia
// escritura del usuario). Si una pantalla necesita forzar un reinicio visual (ej. después
// de agregar un período en HistoriaCotizacionRPM.jsx), debe remontar este componente
// cambiando su prop `key` — no es responsabilidad de este componente resincronizarse solo.

import { useState, useRef, useEffect } from 'react'
import { MESES, construirFechaISO, parsearFechaISO, mensajeErrorDiaEnMes } from '../format/fechaDiaMesAnio.js'

// Pausa para el buffer de dígitos del campo Mes: permite escribir '07' como dos teclas, o
// un solo dígito ('7', '1') que se resuelve tras esta espera si no llega un segundo dígito.
const PAUSA_BUFFER_MES_MS = 600
const RE_DIGITO = /^[0-9]$/

function pad2(valor) {
  return String(valor).padStart(2, '0')
}

/**
 * @param {Object} props
 * @param {string} props.valor - fecha ISO (YYYY-MM-DD), o '' si está incompleta
 * @param {(fecha: string) => void} props.onCambiar
 * @param {string} [props.etiquetaDia] - por defecto 'Día'
 * @param {string} [props.etiquetaMes] - por defecto 'Mes'
 * @param {string} [props.etiquetaAnio] - por defecto 'Año'
 */
function CampoFechaDiaMesAnio({ valor, onCambiar, etiquetaDia = 'Día', etiquetaMes = 'Mes', etiquetaAnio = 'Año' }) {
  const [fechaLocal, setFechaLocal] = useState(() => parsearFechaISO(valor))
  // El mensaje de error del día no se muestra mientras se teclea el propio día
  // (interrumpiría a media escritura) — solo después de perder el foco en Día, o al
  // cambiar Mes o Año (un cambio de mes puede volver inválido un día que antes era
  // válido, ej. 31 de marzo → 31 de abril).
  const [mostrarErrorDia, setMostrarErrorDia] = useState(false)

  function actualizarFecha(campos) {
    const siguiente = { ...fechaLocal, ...campos }
    setFechaLocal(siguiente)
    onCambiar(construirFechaISO(siguiente.dia, siguiente.mes, siguiente.anio))
    if ('mes' in campos || 'anio' in campos) {
      setMostrarErrorDia(true)
    }
  }

  // Buffer de dígitos tecleados en el <select> de Mes, sin reemplazar el <select> nativo.
  // Referencias estables (useRef): no deben recrearse en cada render, ni disparar uno.
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
    // Un valor inválido (0, 00, 13+) se descarta sin tocar el mes ya seleccionado — nunca
    // se decide en silencio por un valor que no pudo interpretarse.
    if (numero >= 1 && numero <= 12) {
      actualizarFecha({ mes: pad2(numero) })
    }
    limpiarBufferMes()
  }

  function manejarTeclaMes(e) {
    if (!RE_DIGITO.test(e.key)) return
    // Solo se intercepta la tecla si es un dígito — letras, Tab, Enter, Escape, flechas,
    // Home y End nunca llegan aquí y conservan el comportamiento 100% nativo del <select>.
    e.preventDefault()

    bufferMesRef.current += e.key
    if (timeoutMesRef.current) clearTimeout(timeoutMesRef.current)

    if (bufferMesRef.current.length >= 2) {
      resolverBufferMes()
      return
    }

    timeoutMesRef.current = setTimeout(resolverBufferMes, PAUSA_BUFFER_MES_MS)
  }

  const errorDia = mensajeErrorDiaEnMes(fechaLocal.dia, fechaLocal.mes, fechaLocal.anio)

  return (
    <>
      <div className="date-fields">
        <label className="field">
          <span className="field__label">{etiquetaDia}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="field__input"
            value={fechaLocal.dia}
            onChange={(e) => actualizarFecha({ dia: e.target.value.replace(/\D/g, '').slice(0, 2) })}
            onBlur={() => setMostrarErrorDia(true)}
          />
        </label>

        <label className="field">
          <span className="field__label">{etiquetaMes}</span>
          <select
            className="field__input"
            value={fechaLocal.mes}
            onChange={(e) => {
              // Selección real por mouse o flechas: el buffer de dígitos queda obsoleto.
              limpiarBufferMes()
              actualizarFecha({ mes: e.target.value })
            }}
            onKeyDown={manejarTeclaMes}
            onBlur={limpiarBufferMes}
          >
            <option value="" disabled>
              Selecciona
            </option>
            {MESES.map(({ valor: valorMes, texto }) => (
              <option key={valorMes} value={valorMes}>
                {texto}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">{etiquetaAnio}</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="field__input"
            value={fechaLocal.anio}
            onChange={(e) => actualizarFecha({ anio: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          />
        </label>
      </div>

      {mostrarErrorDia && errorDia && (
        <div className="field__warning">
          <p>{errorDia}</p>
        </div>
      )}
    </>
  )
}

export default CampoFechaDiaMesAnio
