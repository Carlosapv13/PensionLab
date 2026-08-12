// Panel exclusivo de desarrollo — carga fixtures en el estado real de
// App.jsx, permite inspeccionarlo/modificarlo, y saltar a una vista. Nunca
// se renderiza en producción (App.jsx solo lo monta bajo
// import.meta.env.DEV — ver comentario en App.jsx).
//
// Deliberadamente sin estado propio de datos: `valores` y los dos mapas de
// setters son el estado real de App.jsx, pasado tal cual. Este componente
// nunca mantiene una copia paralela.
//
// Dos mapas de setters distintos, a propósito (ver App.jsx para el porqué):
//   - `settersCarga`: setters crudos, usados únicamente al aplicar un
//     fixture completo — operación atómica sobre el estado completo.
//   - `settersEdicion`: usados por los campos editables de este panel —
//     reutiliza las funciones `actualizar*` productivas de App.jsx cuando
//     existen (preservan sus invariantes/cascadas), el setter crudo cuando
//     no. Así, editar un campo desde el panel nunca deja el estado en algo
//     que el recorrido normal no podría producir.
//
// Sin interfaz elaborada a propósito (alcance mínimo aprobado): un input
// genérico por campo, sin componentes de edición especializados por tipo.

import { useState } from 'react'
import { FIXTURES } from './fixtures.js'
import { CLAVES_ESTADO_EDITABLE, VISTAS_CONOCIDAS, VALORES_POR_DEFECTO } from './estadoApp.js'
import { validarFixture, aplicarFixture } from './aplicarFixture.js'

const estilo = {
  contenedor: {
    background: '#1a1a1a',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: '10px 14px',
    borderBottom: '2px solid #f0a020',
  },
  fila: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px' },
  campos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '4px 12px',
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '8px',
    background: '#111',
    borderRadius: '4px',
  },
  campo: { display: 'flex', gap: '6px', alignItems: 'center' },
  label: { minWidth: '110px', color: '#999' },
  input: { flex: 1, background: '#222', color: '#e0e0e0', border: '1px solid #444', padding: '2px 4px' },
  error: { color: '#ff6b6b' },
}

/**
 * @param {Object} props
 * @param {Record<string, *>} props.valores - estado real editable de App.jsx
 * @param {Record<string, (valor: *) => void>} props.settersCarga - setters crudos, solo para aplicar un fixture completo
 * @param {Record<string, (valor: *) => void>} props.settersEdicion - setter semántico o crudo por campo, para edición manual
 * @param {string} props.vistaActual
 * @param {(vista: string) => void} props.onIrAVista
 */
function PanelDesarrollo({ valores, settersCarga, settersEdicion, vistaActual, onIrAVista }) {
  const [fixtureId, setFixtureId] = useState(FIXTURES[0]?.id ?? '')
  const [vistaDestino, setVistaDestino] = useState(VISTAS_CONOCIDAS[0])
  const [errores, setErrores] = useState([])
  const [abierto, setAbierto] = useState(true)

  const fixtureSeleccionado = FIXTURES.find((f) => f.id === fixtureId) ?? null

  function manejarCargar() {
    if (!fixtureSeleccionado) return

    const destino = fixtureSeleccionado.vistaSugerida ?? vistaDestino
    const { valido, errores: erroresValidacion } = validarFixture(fixtureSeleccionado, destino)

    if (!valido) {
      setErrores(erroresValidacion)
      return
    }

    setErrores([])
    aplicarFixture(fixtureSeleccionado, settersCarga)
    setVistaDestino(destino)
  }

  function manejarIr() {
    onIrAVista(vistaDestino)
  }

  return (
    <div style={estilo.contenedor}>
      <div style={estilo.fila}>
        <strong>🛠 Panel de desarrollo</strong>
        <span>(exclusivo de dev — vista actual: {vistaActual})</span>
        <button type="button" onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {abierto && (
        <>
          <div style={estilo.fila}>
            <label>
              Fixture:{' '}
              <select value={fixtureId} onChange={(e) => setFixtureId(e.target.value)}>
                {FIXTURES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={manejarCargar} disabled={!fixtureSeleccionado}>
              Cargar
            </button>

            <label>
              Ir a vista:{' '}
              <select value={vistaDestino} onChange={(e) => setVistaDestino(e.target.value)}>
                {VISTAS_CONOCIDAS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={manejarIr}>
              Ir
            </button>
          </div>

          {errores.length > 0 && (
            <div style={estilo.fila}>
              {errores.map((e) => (
                <p key={e} style={estilo.error}>
                  {e}
                </p>
              ))}
            </div>
          )}

          <div style={estilo.campos}>
            {CLAVES_ESTADO_EDITABLE.map((clave) => {
              const valor = valores[clave]
              const esBooleano = typeof valor === 'boolean'
              return (
                <div style={estilo.campo} key={clave}>
                  <span style={estilo.label}>{clave}</span>
                  {esBooleano ? (
                    <input
                      type="checkbox"
                      checked={valor}
                      onChange={(e) => settersEdicion[clave](e.target.checked)}
                    />
                  ) : (
                    <input
                      style={estilo.input}
                      type="text"
                      value={valor ?? ''}
                      onChange={(e) =>
                        settersEdicion[clave](e.target.value === '' ? VALORES_POR_DEFECTO[clave] : e.target.value)
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default PanelDesarrollo
