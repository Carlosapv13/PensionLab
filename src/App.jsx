import { useState } from 'react'
import './App.css'
import AppShell from './components/layout/AppShell.jsx'
import Bienvenida from './pages/Bienvenida.jsx'
import Objetivo from './pages/Objetivo.jsx'
import DatosInicialesTemporal from './pages/DatosInicialesTemporal.jsx'

function App() {
  const [vista, setVista] = useState('bienvenida')
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState(null)

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
        <DatosInicialesTemporal
          objetivoSeleccionado={objetivoSeleccionado}
          onVolver={() => setVista('objetivo')}
        />
      )}
    </AppShell>
  )
}

export default App