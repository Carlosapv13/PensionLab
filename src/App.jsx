import { useState } from 'react'
import './App.css'
import AppShell from './components/layout/AppShell.jsx'
import Bienvenida from './pages/Bienvenida.jsx'
import Objetivo from './pages/Objetivo.jsx'
import DatosIniciales from './pages/DatosIniciales.jsx'
import SituacionPensional from './pages/SituacionPensional.jsx'
import HistorialLaboral from './pages/HistorialLaboral.jsx'
import ExpedientePensional from './pages/ExpedientePensional.jsx'
import CompletarExpediente from './pages/CompletarExpediente.jsx'
import InformacionPensionalEsencial from './pages/InformacionPensionalEsencial.jsx'
import HistoriaPensional from './pages/HistoriaPensional.jsx'
import PrimeraLectura from './pages/PrimeraLectura.jsx'
import SiguientePasoTemporal from './pages/SiguientePasoTemporal.jsx'

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
  const [anioInicioCotizacion, setAnioInicioCotizacion] = useState('')
  const [nivelConocimientoSemanas, setNivelConocimientoSemanas] = useState(null)
  const [semanasCotizadas, setSemanasCotizadas] = useState('')
  const [infoEsencialCompletada, setInfoEsencialCompletada] = useState(false)
  const [anioConfirmadoEdadTemprana, setAnioConfirmadoEdadTemprana] = useState(null)
  const [semanasConfirmadasPara, setSemanasConfirmadasPara] = useState(null)
  const [trasladoRegimen, setTrasladoRegimen] = useState(null)

  function actualizarRegimenActual(valor) {
    // trasladoRegimen depende semánticamente de regimenActual (S3-009): la
    // opción "No" y su redacción están ancladas al régimen actual, así que
    // un cambio real de régimen invalida cualquier respuesta ya dada.
    if (valor !== regimenActual) {
      setTrasladoRegimen(null)
    }
    setRegimenActual(valor)
  }

  function actualizarAnioInicioCotizacion(valor) {
    setAnioInicioCotizacion(valor)
    setInfoEsencialCompletada(false)
    setAnioConfirmadoEdadTemprana(null)
    // Cambiar el año también invalida la coherencia ya evaluada de las
    // semanas, porque el máximo/la referencia se calculan a partir de él.
    setSemanasConfirmadasPara(null)
  }

  function actualizarNivelConocimientoSemanas(valor) {
    setNivelConocimientoSemanas(valor)
    setInfoEsencialCompletada(false)
    setSemanasConfirmadasPara(null)
  }

  function actualizarSemanasCotizadas(valor) {
    setSemanasCotizadas(valor)
    setInfoEsencialCompletada(false)
    setSemanasConfirmadasPara(null)
  }

  function confirmarEdadTemprana(confirmado) {
    setAnioConfirmadoEdadTemprana(confirmado ? anioInicioCotizacion : null)
  }

  function confirmarSemanasExtraordinarias(confirmado) {
    setSemanasConfirmadasPara(
      confirmado
        ? `${nivelConocimientoSemanas}||${semanasCotizadas}||${anioInicioCotizacion}`
        : null
    )
  }

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
          onCambiarRegimenActual={actualizarRegimenActual}
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
        <CompletarExpediente
          infoEsencialCompletada={infoEsencialCompletada}
          onContinuar={() => setVista('informacionPensional')}
          onVolver={() => setVista('expedientePensional')}
        />
      )}

      {vista === 'informacionPensional' && (
        <InformacionPensionalEsencial
          fechaNacimiento={fechaNacimiento}
          anioInicioCotizacion={anioInicioCotizacion}
          onCambiarAnioInicioCotizacion={actualizarAnioInicioCotizacion}
          anioConfirmadoEdadTemprana={anioConfirmadoEdadTemprana}
          onConfirmarEdadTemprana={confirmarEdadTemprana}
          nivelConocimientoSemanas={nivelConocimientoSemanas}
          onCambiarNivelConocimientoSemanas={actualizarNivelConocimientoSemanas}
          semanasCotizadas={semanasCotizadas}
          onCambiarSemanasCotizadas={actualizarSemanasCotizadas}
          semanasConfirmadasPara={semanasConfirmadasPara}
          onConfirmarSemanasExtraordinarias={confirmarSemanasExtraordinarias}
          onVolver={() => setVista('completarExpediente')}
          onContinuar={() => {
            setInfoEsencialCompletada(true)
            setVista('historiaPensional')
          }}
        />
      )}

      {vista === 'historiaPensional' && (
        <HistoriaPensional
          regimenActual={regimenActual}
          tipoCotizante={tipoCotizante}
          nivelConocimientoSemanas={nivelConocimientoSemanas}
          anioInicioCotizacion={anioInicioCotizacion}
          trasladoRegimen={trasladoRegimen}
          onCambiarTrasladoRegimen={setTrasladoRegimen}
          onVolver={() => setVista('informacionPensional')}
          onContinuar={() => setVista('primeraLectura')}
        />
      )}

      {vista === 'primeraLectura' && (
        <PrimeraLectura
          sexo={sexo}
          regimenActual={regimenActual}
          nivelConocimientoSemanas={nivelConocimientoSemanas}
          semanasCotizadas={semanasCotizadas}
          fechaNacimiento={fechaNacimiento}
          onVolver={() => setVista('historiaPensional')}
          onContinuar={() => setVista('siguientePaso')}
        />
      )}

      {vista === 'siguientePaso' && (
        <SiguientePasoTemporal
          onVolver={() => setVista('primeraLectura')}
        />
      )}
    </AppShell>
  )
}

export default App
