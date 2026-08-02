import { useState } from 'react'
import './App.css'
import AppShell from './components/layout/AppShell.jsx'
import Bienvenida from './pages/Bienvenida.jsx'
import Objetivo from './pages/Objetivo.jsx'
import DatosIniciales from './pages/DatosIniciales.jsx'
import SituacionPensionalTemporal from './pages/SituacionPensionalTemporal.jsx'

function App() {
  const [vista, setVista] = useState('bienvenida')
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState(null)
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState(null)
  const [lugarResidencia, setLugarResidencia] = useState(null)

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
        <SituacionPensionalTemporal
          objetivoSeleccionado={objetivoSeleccionado}
          fechaNacimiento={fechaNacimiento}
          sexo={sexo}
          lugarResidencia={lugarResidencia}
          onVolver={() => setVista('datosIniciales')}
        />
      )}
    </AppShell>
  )
}

export default App
