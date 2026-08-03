// Pantalla funcional de "Información pensional esencial" (Slice S3-008):
// captura, en una conversación de dos pasos (no un formulario tradicional),
// el año de inicio de cotización y el nivel de conocimiento de las semanas
// cotizadas. Ningún dato bloquea el flujo si el usuario declara
// explícitamente que no lo conoce. Incluye una validación de coherencia
// cronológica mínima entre los dos datos — no reglas legales ni cálculos de
// dominio.

import { useState } from 'react'

const HOY = new Date().toISOString().slice(0, 10)
const ANIO_ACTUAL = Number(HOY.slice(0, 4))

const OPCIONES_SEMANAS = [
  { valor: 'conocido', texto: 'Sí, conozco el número.' },
  { valor: 'aproximado', texto: 'Tengo una idea aproximada.' },
  { valor: 'desconocido', texto: 'No las conozco.' },
]

// ---------------------------------------------------------------------------
// Validación de coherencia cronológica (año de inicio ↔ fecha de nacimiento
// ↔ semanas cotizadas).
//
// NOTA DE ARQUITECTURA: esta lógica vive aquí de forma TEMPORAL, como primer
// caso real y acotado de una necesidad más amplia. S3-008 identificó que
// PensionLab necesitará, más adelante, un "Motor de Coherencia del
// Expediente" — un componente de dominio responsable de evaluar relaciones
// entre datos del expediente (no solo dentro de una misma pantalla), que
// deberá ejecutarse antes del Motor de Decisión. Las constantes y funciones
// de esta sección son candidatas directas a migrar a ese componente cuando
// se diseñe formalmente — no se extraen todavía porque este es su único
// caso de uso real (Principio 9: generalizar con evidencia, no por
// anticipación). Este archivo no debe seguir acumulando reglas de
// coherencia adicionales sin revisar primero si ya es momento de esa
// migración.

// Constantes de la regla de coherencia — agrupadas para facilitar su
// ampliación o su migración conjunta al futuro Motor de Coherencia.
const ANIO_MINIMO = 1900
const EDAD_MINIMA_ADVERTENCIA = 15
const MS_POR_DIA = 86400000

/**
 * Evalúa el año de inicio de cotización contra el año de nacimiento (cuando
 * se conoce) y el año actual. No impone una edad mínima fija de 18 años —
 * solo distingue lo cronológicamente imposible (antes de nacer, o en el
 * futuro) de lo extraordinario (antes de los 15 años, que requiere
 * confirmación explícita del usuario, sin bloquear).
 *
 * @returns {'desconocido'|'incompleto'|'futuro'|'anteriorNacimiento'|'edadTemprana'|'valido'}
 */
function calcularEstadoAnio(valor, anioNacimiento) {
  if (valor === 'desconocido') return 'desconocido'
  if (!/^\d{4}$/.test(valor)) return 'incompleto'

  const anio = Number(valor)
  if (anio > ANIO_ACTUAL) return 'futuro'
  if (anioNacimiento !== null && anio < anioNacimiento) return 'anteriorNacimiento'
  if (anioNacimiento !== null && anio < anioNacimiento + EDAD_MINIMA_ADVERTENCIA) {
    return 'edadTemprana'
  }
  return 'valido'
}

function esSemanasValida(valor) {
  return /^\d+$/.test(valor)
}

// Fechas normalizadas en UTC (Date.UTC) para que el cálculo de días no varíe
// por zona horaria ni por cambios de horario.
function fechaUTC(anio, mes, dia) {
  return Date.UTC(anio, mes - 1, dia)
}

function hoyUTC() {
  const [anio, mes, dia] = HOY.split('-').map(Number)
  return fechaUTC(anio, mes, dia)
}

// Semanas transcurridas desde una fecha dada hasta hoy, con un margen de una
// semana adicional para absorber errores de redondeo (ver documento de
// coherencia aprobado).
function semanasTranscurridasDesde(anio, mes, dia) {
  const diffDias = Math.floor((hoyUTC() - fechaUTC(anio, mes, dia)) / MS_POR_DIA)
  return Math.floor(diffDias / 7) + 1
}

function calcularSemanasMaximasSegunInicio(anioInicioCotizacion) {
  if (!/^\d{4}$/.test(anioInicioCotizacion)) return null
  return semanasTranscurridasDesde(Number(anioInicioCotizacion), 1, 1)
}

function calcularSemanasDesdeLos15(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const [anioNac, mesNac, diaNac] = fechaNacimiento.split('-').map(Number)
  return semanasTranscurridasDesde(anioNac + EDAD_MINIMA_ADVERTENCIA, mesNac, diaNac)
}

/**
 * Clasifica la coherencia cronológica de las semanas cotizadas frente al año
 * de inicio declarado (o, si es desconocido, frente a la fecha de
 * nacimiento). No se llama si el formato de `semanasCotizadas` ya es
 * inválido — eso se valida por separado.
 *
 * @returns {'valido'|'imposible'|'extraordinario'}
 */
function calcularEstadoSemanas(semanasCotizadas, anioInicioCotizacion, fechaNacimiento) {
  const semanas = Number(semanasCotizadas)

  if (/^\d{4}$/.test(anioInicioCotizacion)) {
    const maximo = calcularSemanasMaximasSegunInicio(anioInicioCotizacion)
    return semanas > maximo ? 'imposible' : 'valido'
  }

  if (anioInicioCotizacion === 'desconocido') {
    const referencia = calcularSemanasDesdeLos15(fechaNacimiento)
    if (referencia === null) return 'valido'
    return semanas > referencia ? 'extraordinario' : 'valido'
  }

  return 'valido'
}
// --- Fin de la sección de coherencia cronológica (ver nota de arquitectura arriba) ---

// Textos visibles de las advertencias de coherencia. Se extraen a constantes
// para no incrustarlos directamente en el JSX — sin introducir todavía un
// sistema de mensajes compartido, que no tiene aún un segundo caso real.
const MENSAJE_EDAD_TEMPRANA =
  'Este año indica que empezaste a cotizar antes de cumplir 15 años. Es poco habitual, aunque puede ocurrir en situaciones especiales. Verifica el año o continúa si aparece así en tu historia laboral oficial.'
const TEXTO_CONFIRMAR_EDAD_TEMPRANA = 'Confirmo que el año es correcto'

const MENSAJE_SEMANAS_IMPOSIBLE =
  'El número de semanas ingresado no es compatible con el año en que indicaste que empezaste a cotizar. Revisa alguno de los dos datos antes de continuar.'
const MENSAJE_SEMANAS_EXTRAORDINARIO =
  'El número de semanas ingresado es mayor que el tiempo aproximado transcurrido desde que cumpliste 15 años. Es un caso poco habitual y necesitamos que verifiques el dato. Si aparece así en tu historia laboral oficial, puedes confirmarlo y continuar.'
const TEXTO_CONFIRMAR_SEMANAS = 'Confirmo que el número de semanas es correcto'

/**
 * @param {Object} props
 * @param {string} props.fechaNacimiento
 * @param {string} props.anioInicioCotizacion
 * @param {(valor: string) => void} props.onCambiarAnioInicioCotizacion
 * @param {string | null} props.anioConfirmadoEdadTemprana
 * @param {(confirmado: boolean) => void} props.onConfirmarEdadTemprana
 * @param {string | null} props.nivelConocimientoSemanas
 * @param {(valor: string) => void} props.onCambiarNivelConocimientoSemanas
 * @param {string} props.semanasCotizadas
 * @param {(valor: string) => void} props.onCambiarSemanasCotizadas
 * @param {string | null} props.semanasConfirmadasPara
 * @param {(confirmado: boolean) => void} props.onConfirmarSemanasExtraordinarias
 * @param {() => void} props.onVolver
 * @param {() => void} props.onContinuar
 */
function InformacionPensionalEsencial({
  fechaNacimiento,
  anioInicioCotizacion,
  onCambiarAnioInicioCotizacion,
  anioConfirmadoEdadTemprana,
  onConfirmarEdadTemprana,
  nivelConocimientoSemanas,
  onCambiarNivelConocimientoSemanas,
  semanasCotizadas,
  onCambiarSemanasCotizadas,
  semanasConfirmadasPara,
  onConfirmarSemanasExtraordinarias,
  onVolver,
  onContinuar,
}) {
  const [paso, setPaso] = useState(() => (anioInicioCotizacion ? 2 : 1))

  const anioNacimiento = fechaNacimiento ? Number(fechaNacimiento.slice(0, 4)) : null
  const noRecuerdaAnio = anioInicioCotizacion === 'desconocido'
  const estadoAnio = calcularEstadoAnio(anioInicioCotizacion, anioNacimiento)
  const requiereConfirmacionEdadTemprana = estadoAnio === 'edadTemprana'
  const confirmaEdadTemprana =
    requiereConfirmacionEdadTemprana && anioConfirmadoEdadTemprana === anioInicioCotizacion
  const puedeContinuarPaso1 =
    estadoAnio === 'desconocido' || estadoAnio === 'valido' || confirmaEdadTemprana

  const requiereNumeroSemanas =
    nivelConocimientoSemanas === 'conocido' || nivelConocimientoSemanas === 'aproximado'
  const semanasConFormatoValido = requiereNumeroSemanas && esSemanasValida(semanasCotizadas)
  const estadoSemanas = semanasConFormatoValido
    ? calcularEstadoSemanas(semanasCotizadas, anioInicioCotizacion, fechaNacimiento)
    : null

  const claveConfirmacionSemanas = `${nivelConocimientoSemanas}||${semanasCotizadas}||${anioInicioCotizacion}`
  const confirmaSemanasExtraordinarias =
    estadoSemanas === 'extraordinario' && semanasConfirmadasPara === claveConfirmacionSemanas

  const puedeContinuarPaso2 =
    nivelConocimientoSemanas === 'desconocido' ||
    (semanasConFormatoValido &&
      (estadoSemanas === 'valido' || (estadoSemanas === 'extraordinario' && confirmaSemanasExtraordinarias)))

  function manejarNoRecuerdaAnio(marcado) {
    onCambiarAnioInicioCotizacion(marcado ? 'desconocido' : '')
  }

  return (
    <div className="screen">
      <h1 className="screen__title screen__title--informacion-pensional">
        Información pensional esencial
      </h1>

      {paso === 1 && (
        <>
          <p className="screen__subtitle">
            Vamos a construir juntos tu historia pensional. Solo te
            preguntaremos lo esencial y siempre te explicaremos para qué lo
            necesitamos.
          </p>

          <div className="field">
            <span className="field__label">
              ¿En qué año empezaste a cotizar a pensión?
            </span>

            <p className="screen__subtitle">
              Este dato nos ayuda a comprender desde cuándo se ha construido
              tu historia pensional y a identificar qué información
              necesitaremos revisar más adelante.
            </p>

            <input
              type="number"
              className="field__input"
              min={anioNacimiento ?? ANIO_MINIMO}
              max={ANIO_ACTUAL}
              value={noRecuerdaAnio ? '' : anioInicioCotizacion}
              disabled={noRecuerdaAnio}
              onChange={(e) => onCambiarAnioInicioCotizacion(e.target.value)}
            />

            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={noRecuerdaAnio}
                onChange={(e) => manejarNoRecuerdaAnio(e.target.checked)}
              />
              <span>No lo recuerdo con exactitud</span>
            </label>

            {requiereConfirmacionEdadTemprana && (
              <div className="field__warning">
                <p>{MENSAJE_EDAD_TEMPRANA}</p>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={confirmaEdadTemprana}
                    onChange={(e) => onConfirmarEdadTemprana(e.target.checked)}
                  />
                  <span>{TEXTO_CONFIRMAR_EDAD_TEMPRANA}</span>
                </label>
              </div>
            )}
          </div>

          <div className="screen__actions">
            <button type="button" className="btn btn-secondary" onClick={onVolver}>
              Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setPaso(2)}
              disabled={!puedeContinuarPaso1}
            >
              Continuar
            </button>
          </div>
        </>
      )}

      {paso === 2 && (
        <>
          <fieldset className="options">
            <legend>¿Sabes aproximadamente cuántas semanas has cotizado?</legend>

            <p className="screen__subtitle">
              Las semanas cotizadas son uno de los principales indicadores de
              tu avance hacia la pensión. Si no conoces el número exacto, no
              te preocupes. Más adelante podremos validarlo utilizando tu
              historia laboral oficial.
            </p>

            {OPCIONES_SEMANAS.map(({ valor, texto }) => (
              <label key={valor} className="option">
                <input
                  type="radio"
                  name="nivelConocimientoSemanas"
                  value={valor}
                  checked={nivelConocimientoSemanas === valor}
                  onChange={() => onCambiarNivelConocimientoSemanas(valor)}
                />
                <span>{texto}</span>
              </label>
            ))}
          </fieldset>

          {requiereNumeroSemanas && (
            <label className="field">
              <span className="field__label">Semanas cotizadas</span>
              <input
                type="number"
                className="field__input"
                min="0"
                step="1"
                value={semanasCotizadas}
                onChange={(e) => onCambiarSemanasCotizadas(e.target.value)}
              />
            </label>
          )}

          {estadoSemanas === 'imposible' && (
            <div className="field__warning">
              <p>{MENSAJE_SEMANAS_IMPOSIBLE}</p>
            </div>
          )}

          {estadoSemanas === 'extraordinario' && (
            <div className="field__warning">
              <p>{MENSAJE_SEMANAS_EXTRAORDINARIO}</p>
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={confirmaSemanasExtraordinarias}
                  onChange={(e) => onConfirmarSemanasExtraordinarias(e.target.checked)}
                />
                <span>{TEXTO_CONFIRMAR_SEMANAS}</span>
              </label>
            </div>
          )}

          <div className="screen__actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPaso(1)}>
              Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onContinuar}
              disabled={!puedeContinuarPaso2}
            >
              Continuar con mi expediente
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default InformacionPensionalEsencial
