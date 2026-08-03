import { useState } from 'react'
import './App.css'
import AppShell from './components/layout/AppShell.jsx'
import Bienvenida from './pages/Bienvenida.jsx'
import Objetivo from './pages/Objetivo.jsx'
import DatosIniciales from './pages/DatosIniciales.jsx'
import SituacionPensional from './pages/SituacionPensional.jsx'
import HistorialLaboral from './pages/HistorialLaboral.jsx'
import ExpedientePensional from './pages/ExpedientePensional.jsx'
import CompletarExpedienteTemporal from './pages/CompletarExpedienteTemporal.jsx'

function App() {
  const [vista, setVista] = useState('bienvenida')
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState(null)
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState(null)
  const [lugarResidencia, setLugarResidencia] = useState(null)
  const [regimenActual, setRegimenActual] = useState(null)
  const [tipoCotizante, setTipoCotizante] = useState(null)
  const [lugarCotizacion, setLugarCotizacion] = useState(null)
  const [cotizaActualmente, setCotizaActualmente] = useState(null)

  return (
    <AppShell>
      {vista === 'bienvenida' && (
        <Bienvenida onComenzar={() => setVista('objetivo')} />
      )}

      {vista === 'objetivo' && (
        <Objetivo
          objetivoSeleccionado={objetivoSeleccionado}
          onSeleccionarObjetivo={setObjetivoSeleccionado}
          onContinuar={() => setVista('datosIniciales')}
          onVolver={() => setVista('bienvenida')}
        />
      )}

      {vista === 'datosIniciales' && (
        <DatosIniciales
          fechaNacimiento={fechaNacimiento}
          onCambiarFechaNacimiento={setFechaNacimiento}
          sexo={sexo}
          onCambiarSexo={setSexo}
          lugarResidencia={lugarResidencia}
          onCambiarLugarResidencia={setLugarResidencia}
          onContinuar={() => setVista('situacionPensional')}
          onVolver={() => setVista('objetivo')}
        />
      )}

      {vista === 'situacionPensional' && (
        <SituacionPensional
          regimenActual={regimenActual}
          onCambiarRegimenActual={setRegimenActual}
          onContinuar={() => setVista('historialLaboral')}
          onVolver={() => setVista('datosIniciales')}
        />
      )}

      {vista === 'historialLaboral' && (
        <HistorialLaboral
          tipoCotizante={tipoCotizante}
          onCambiarTipoCotizante={setTipoCotizante}
          lugarCotizacion={lugarCotizacion}
          onCambiarLugarCotizacion={setLugarCotizacion}
          cotizaActualmente={cotizaActualmente}
          onCambiarCotizaActualmente={setCotizaActualmente}
          onContinuar={() => setVista('expedientePensional')}
          onVolver={() => setVista('situacionPensional')}
        />
      )}

      {vista === 'expedientePensional' && (
        <ExpedientePensional
          objetivoSeleccionado={objetivoSeleccionado}
          fechaNacimiento={fechaNacimiento}
          sexo={sexo}
          lugarResidencia={lugarResidencia}
          regimenActual={regimenActual}
          tipoCotizante={tipoCotizante}
          lugarCotizacion={lugarCotizacion}
          cotizaActualmente={cotizaActualmente}
          onComenzarExpediente={() => setVista('completarExpediente')}
          onVolver={() => setVista('historialLaboral')}
        />
      )}

      {vista === 'completarExpediente' && (
        <CompletarExpedienteTemporal
          onVolver={() => setVista('expedientePensional')}
        />
      )}
    </AppShell>
  )
}

export default App
