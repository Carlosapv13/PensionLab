import { useState } from 'react'
import './App.css'
import AppShell from './components/layout/AppShell.jsx'
import Bienvenida from './pages/Bienvenida.jsx'
import ObjetivoTemporal from './pages/ObjetivoTemporal.jsx'

function App() {
  const [vista, setVista] = useState('bienvenida')

  return (
    <AppShell>
      {vista === 'bienvenida' ? (
        <Bienvenida onComenzar={() => setVista('objetivo')} />
      ) : (
        <ObjetivoTemporal onVolver={() => setVista('bienvenida')} />
      )}
    </AppShell>
  )
}

export default App