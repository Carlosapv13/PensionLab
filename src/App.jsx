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
import ExploraTuProyeccionRPM from './pages/ExploraTuProyeccionRPM.jsx'

// Import estático, pero solo se monta bajo import.meta.env.DEV (ver el
// return más abajo) — Vite sustituye ese flag por el literal `false` en
// `vite build` para producción, y Rollup elimina por dead-code-elimination
// todo lo que quede dentro del `&&` correspondiente, incluido este import y
// su árbol de dependencias (src/dev/**). Exclusivamente de desarrollo.
import PanelDesarrollo from './dev/PanelDesarrollo.jsx'
import { construirSettersEdicion } from './dev/construirSettersEdicion.js'

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
  // Slice "Motor de caminos RAIS": saldo acumulado (mismo patrón de certeza ya
  // usado para la base de cotización), objetivo de pensión mensual y la
  // restricción opcional de esfuerzo máximo que el propio usuario declara.
  const [certezaSaldoAcumulado, setCertezaSaldoAcumulado] = useState(null)
  const [saldoAcumuladoDeclarado, setSaldoAcumuladoDeclarado] = useState('')
  const [objetivoPensionMensual, setObjetivoPensionMensual] = useState('')
  // Cuánto más puede destinar la persona exclusivamente a su aporte pensional
  // (no a IBC, no a seguridad social total — ver generarCaminosRAIS.js).
  const [restriccionCostoPensionalAdicionalMaximoMensual, setRestriccionCostoPensionalAdicionalMaximoMensual] =
    useState('')
  // Slice "Primera lectura económica RPM desde historia estructurada": historia de
  // cotización estructurada (PeriodoCotizacion[]) — en este Slice solo se puebla vía el
  // panel de desarrollo, nunca por una pantalla real de captura (fuera de alcance).
  const [historiaCotizacion, setHistoriaCotizacion] = useState([])

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

  function actualizarCertezaSaldoAcumulado(valor) {
    // Mismo criterio que actualizarCertezaBaseCotizacion: saldoAcumuladoDeclarado
    // solo tiene sentido con 'conocido'/'aproximado' — cambiar la certeza invalida
    // el valor que ya no aplica.
    if (valor !== 'conocido' && valor !== 'aproximado') {
      setSaldoAcumuladoDeclarado('')
    }
    setCertezaSaldoAcumulado(valor)
  }

  // Agrupa el estado editable existente y sus setters crudos, exclusivamente
  // para el panel de desarrollo (src/dev/) — no crea estado nuevo, solo
  // referencia el que ya existe arriba. Mismo criterio de "un olvido debe
  // ser visible" que src/dev/estadoApp.js: si se agrega un campo nuevo de
  // estado aquí arriba, este objeto debe actualizarse a mano.
  const estadoEditableDev = {
    objetivoSeleccionado,
    fechaNacimiento,
    sexo,
    lugarResidencia,
    regimenActual,
    tipoCotizante,
    lugarCotizacion,
    cotizaActualmente,
    anioInicioCotizacion,
    nivelConocimientoSemanas,
    semanasCotizadas,
    infoEsencialCompletada,
    anioConfirmadoEdadTemprana,
    semanasConfirmadasPara,
    trasladoRegimen,
    detalleTraslado,
    certezaBaseCotizacion,
    valorBaseCotizacionDeclarado,
    salarioParaEstimarBase,
    declaracionLibre,
    edadJubilacionDeseada,
    certezaSaldoAcumulado,
    saldoAcumuladoDeclarado,
    objetivoPensionMensual,
    restriccionCostoPensionalAdicionalMaximoMensual,
    historiaCotizacion,
  }

  const settersEstadoEditableDev = {
    objetivoSeleccionado: setObjetivoSeleccionado,
    fechaNacimiento: setFechaNacimiento,
    sexo: setSexo,
    lugarResidencia: setLugarResidencia,
    regimenActual: setRegimenActual,
    tipoCotizante: setTipoCotizante,
    lugarCotizacion: setLugarCotizacion,
    cotizaActualmente: setCotizaActualmente,
    anioInicioCotizacion: setAnioInicioCotizacion,
    nivelConocimientoSemanas: setNivelConocimientoSemanas,
    semanasCotizadas: setSemanasCotizadas,
    infoEsencialCompletada: setInfoEsencialCompletada,
    anioConfirmadoEdadTemprana: setAnioConfirmadoEdadTemprana,
    semanasConfirmadasPara: setSemanasConfirmadasPara,
    trasladoRegimen: setTrasladoRegimen,
    detalleTraslado: setDetalleTraslado,
    certezaBaseCotizacion: setCertezaBaseCotizacion,
    valorBaseCotizacionDeclarado: setValorBaseCotizacionDeclarado,
    salarioParaEstimarBase: setSalarioParaEstimarBase,
    declaracionLibre: setDeclaracionLibre,
    edadJubilacionDeseada: setEdadJubilacionDeseada,
    certezaSaldoAcumulado: setCertezaSaldoAcumulado,
    saldoAcumuladoDeclarado: setSaldoAcumuladoDeclarado,
    objetivoPensionMensual: setObjetivoPensionMensual,
    restriccionCostoPensionalAdicionalMaximoMensual: setRestriccionCostoPensionalAdicionalMaximoMensual,
    historiaCotizacion: setHistoriaCotizacion,
  }
  return (
    <>
      {import.meta.env.DEV && (
        <PanelDesarrollo
          valores={estadoEditableDev}
          // Carga de fixture (aplicarFixture.js) vs. edición manual posterior
          // son operaciones distintas y usan setters distintos, a propósito:
          //   - Cargar un fixture es atómico sobre el estado completo —
          //     siempre setters crudos, para que un reset+aplicar no dispare
          //     cascadas pensadas para una única interacción de usuario.
          //   - Editar un campo después de cargarlo debe comportarse igual
          //     que si ocurriera en la pantalla productiva real: usa la misma
          //     función `actualizar*` que esa pantalla ya usa cuando existe
          //     (preserva sus invariantes — ej. cambiar regimenActual
          //     invalida trasladoRegimen), y el setter crudo cuando el campo
          //     no tiene una. No es un sistema de dependencias nuevo:
          //     construirSettersEdicion solo selecciona cuál función de las
          //     que ya existen arriba usar por campo.
          // Calculado aquí adentro, no como constante del cuerpo de App, para
          // que la llamada misma quede dentro del bloque eliminado del build
          // de producción — no solo el componente que la consume.
          settersCarga={settersEstadoEditableDev}
          settersEdicion={construirSettersEdicion(settersEstadoEditableDev, {
            regimenActual: actualizarRegimenActual,
            trasladoRegimen: actualizarTrasladoRegimen,
            anioInicioCotizacion: actualizarAnioInicioCotizacion,
            nivelConocimientoSemanas: actualizarNivelConocimientoSemanas,
            semanasCotizadas: actualizarSemanasCotizadas,
            tipoCotizante: actualizarTipoCotizante,
            lugarCotizacion: actualizarLugarCotizacion,
            certezaBaseCotizacion: actualizarCertezaBaseCotizacion,
            certezaSaldoAcumulado: actualizarCertezaSaldoAcumulado,
          })}
          vistaActual={vista}
          onIrAVista={setVista}
        />
      )}
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
          onContinuar={() =>
            setVista(regimenActual === 'RPM' ? 'exploraTuProyeccionRPM' : 'exploraTuProyeccion')
          }
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
          trasladoRegimen={trasladoRegimen}
          edadJubilacionDeseada={edadJubilacionDeseada}
          onCambiarEdadJubilacionDeseada={setEdadJubilacionDeseada}
          certezaSaldoAcumulado={certezaSaldoAcumulado}
          onCambiarCertezaSaldoAcumulado={actualizarCertezaSaldoAcumulado}
          saldoAcumuladoDeclarado={saldoAcumuladoDeclarado}
          onCambiarSaldoAcumuladoDeclarado={setSaldoAcumuladoDeclarado}
          objetivoPensionMensual={objetivoPensionMensual}
          onCambiarObjetivoPensionMensual={setObjetivoPensionMensual}
          restriccionCostoPensionalAdicionalMaximoMensual={restriccionCostoPensionalAdicionalMaximoMensual}
          onCambiarRestriccionCostoPensionalAdicionalMaximoMensual={
            setRestriccionCostoPensionalAdicionalMaximoMensual
          }
          onVolver={() => setVista('queDeterminaResultado')}
        />
      )}

      {vista === 'exploraTuProyeccionRPM' && (
        <ExploraTuProyeccionRPM
          historiaCotizacion={historiaCotizacion}
          onVolver={() => setVista('queDeterminaResultado')}
        />
      )}
      </AppShell>
    </>
  )
}

export default App
