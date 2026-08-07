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
import IndiciosRegimenTransicion from './pages/IndiciosRegimenTransicion.jsx'
import BaseCotizacion from './pages/BaseCotizacion.jsx'
import QueDeterminaTuResultado from './pages/QueDeterminaTuResultado.jsx'
import ExploraTuProyeccion from './pages/ExploraTuProyeccion.jsx'
import DeclaracionLibre from './pages/DeclaracionLibre.jsx'
import RevisionDeclaracionTemporal from './pages/RevisionDeclaracionTemporal.jsx'

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
  const [detalleTraslado, setDetalleTraslado] = useState(null)
  const [certezaBaseCotizacion, setCertezaBaseCotizacion] = useState(null)
  const [valorBaseCotizacionDeclarado, setValorBaseCotizacionDeclarado] = useState('')
  const [salarioParaEstimarBase, setSalarioParaEstimarBase] = useState('')
  const [declaracionLibre, setDeclaracionLibre] = useState(null)
  const [edadJubilacionDeseada, setEdadJubilacionDeseada] = useState('')

  function actualizarRegimenActual(valor) {
    // trasladoRegimen depende semánticamente de regimenActual (S3-009): la
    // opción "No" y su redacción están ancladas al régimen actual, así que
    // un cambio real de régimen invalida cualquier respuesta ya dada.
    if (valor !== regimenActual) {
      setTrasladoRegimen(null)
      setDetalleTraslado(null)
    }
    setRegimenActual(valor)
  }

  function actualizarTrasladoRegimen(valor) {
    // detalleTraslado (IndiciosRegimenTransicion) depende semánticamente de trasladoRegimen:
    // solo tiene sentido cuando la respuesta es 'si'. Cualquier cambio que la
    // aleje de 'si' invalida un detalle ya dado — mismo criterio ya aplicado a
    // trasladoRegimen respecto de regimenActual.
    if (valor !== 'si') {
      setDetalleTraslado(null)
    }
    setTrasladoRegimen(valor)
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

  function invalidarBaseCotizacion() {
    setCertezaBaseCotizacion(null)
    setValorBaseCotizacionDeclarado('')
    setSalarioParaEstimarBase('')
  }

  function actualizarTipoCotizante(valor) {
    // certezaBaseCotizacion (Base actual de cotización) depende semánticamente
    // de tipoCotizante: decide qué ayuda contextual aplica y si existe la ruta
    // de estimación desde salario (solo empleado). Un cambio real invalida
    // cualquier respuesta ya dada — mismo criterio ya usado en
    // actualizarRegimenActual.
    if (valor !== tipoCotizante) {
      invalidarBaseCotizacion()
    }
    setTipoCotizante(valor)
  }

  function actualizarLugarCotizacion(valor) {
    // Mismo criterio que actualizarTipoCotizante: lugarCotizacion decide la
    // ayuda contextual (exterior tiene la suya propia) y si el piso legal se
    // valida o se declara como limitación no evaluada.
    if (valor !== lugarCotizacion) {
      invalidarBaseCotizacion()
    }
    setLugarCotizacion(valor)
  }

  function actualizarCertezaBaseCotizacion(valor) {
    // valorBaseCotizacionDeclarado y salarioParaEstimarBase dependen
    // semánticamente de certezaBaseCotizacion: el primero solo tiene sentido
    // con 'conocido'/'aproximado', el segundo solo con 'desconocido'. Cambiar
    // la certeza invalida el campo que ya no aplica — mismo criterio ya usado
    // en actualizarTrasladoRegimen.
    if (valor !== 'conocido' && valor !== 'aproximado') {
      setValorBaseCotizacionDeclarado('')
    }
    if (valor !== 'desconocido') {
      setSalarioParaEstimarBase('')
    }
    setCertezaBaseCotizacion(valor)
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
          onCambiarTipoCotizante={actualizarTipoCotizante}
          lugarCotizacion={lugarCotizacion}
          onCambiarLugarCotizacion={actualizarLugarCotizacion}
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
          onCambiarTrasladoRegimen={actualizarTrasladoRegimen}
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
          onContinuar={() => setVista('indiciosTransicion')}
        />
      )}

      {vista === 'indiciosTransicion' && (
        <IndiciosRegimenTransicion
          sexo={sexo}
          fechaNacimiento={fechaNacimiento}
          trasladoRegimen={trasladoRegimen}
          detalleTraslado={detalleTraslado}
          onCambiarDetalleTraslado={setDetalleTraslado}
          onVolver={() => setVista('primeraLectura')}
          onContinuar={() => setVista('baseCotizacion')}
        />
      )}

      {vista === 'baseCotizacion' && (
        <BaseCotizacion
          tipoCotizante={tipoCotizante}
          lugarCotizacion={lugarCotizacion}
          certezaBaseCotizacion={certezaBaseCotizacion}
          onCambiarCertezaBaseCotizacion={actualizarCertezaBaseCotizacion}
          valorBaseCotizacionDeclarado={valorBaseCotizacionDeclarado}
          onCambiarValorBaseCotizacionDeclarado={setValorBaseCotizacionDeclarado}
          salarioParaEstimarBase={salarioParaEstimarBase}
          onCambiarSalarioParaEstimarBase={setSalarioParaEstimarBase}
          onVolver={() => setVista('indiciosTransicion')}
          onContinuar={() => setVista('queDeterminaResultado')}
        />
      )}

      {vista === 'queDeterminaResultado' && (
        <QueDeterminaTuResultado
          regimenActual={regimenActual}
          onVolver={() => setVista('baseCotizacion')}
          onContinuar={() => setVista(regimenActual === 'RAIS' ? 'exploraTuProyeccion' : 'declaracionLibre')}
        />
      )}

      {vista === 'exploraTuProyeccion' && (
        <ExploraTuProyeccion
          regimenActual={regimenActual}
          fechaNacimiento={fechaNacimiento}
          certezaBaseCotizacion={certezaBaseCotizacion}
          valorBaseCotizacionDeclarado={valorBaseCotizacionDeclarado}
          tipoCotizante={tipoCotizante}
          lugarCotizacion={lugarCotizacion}
          salarioParaEstimarBase={salarioParaEstimarBase}
          edadJubilacionDeseada={edadJubilacionDeseada}
          onCambiarEdadJubilacionDeseada={setEdadJubilacionDeseada}
          onVolver={() => setVista('queDeterminaResultado')}
          onContinuar={() => setVista('declaracionLibre')}
        />
      )}

      {vista === 'declaracionLibre' && (
        <DeclaracionLibre
          declaracion={declaracionLibre}
          onCambiarDeclaracion={setDeclaracionLibre}
          onVolver={() => setVista('queDeterminaResultado')}
          onContinuar={() => setVista('revisionDeclaracion')}
        />
      )}

      {vista === 'revisionDeclaracion' && (
        <RevisionDeclaracionTemporal onVolver={() => setVista('declaracionLibre')} />
      )}
    </AppShell>
  )
}

export default App
