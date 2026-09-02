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
import HistoriaCotizacionRPM from './pages/HistoriaCotizacionRPM.jsx'
import ExploraTuProyeccionRPM from './pages/ExploraTuProyeccionRPM.jsx'
import ProyectaTuPensionRPM from './pages/ProyectaTuPensionRPM.jsx'
import DeclaracionLibre from './pages/DeclaracionLibre.jsx'
import { tienePrimeraLecturaValor } from './domain/tienePrimeraLecturaValor.js'
import { siguienteVistaTrasBaseCotizacion } from './navegacionRPM.js'

// Import estático, pero solo se monta bajo import.meta.env.DEV (ver el
// return más abajo) — Vite sustituye ese flag por el literal `false` en
// `vite build` para producción, y Rollup elimina por dead-code-elimination
// todo lo que quede dentro del `&&` correspondiente, incluido este import y
// su árbol de dependencias (src/dev/**). Exclusivamente de desarrollo.
import PanelDesarrollo from './dev/PanelDesarrollo.jsx'
import { construirSettersEdicion } from './dev/construirSettersEdicion.js'
import { crearAdaptadorInterpretacionDesarrollo } from './dev/adaptadorInterpretacionDesarrollo.js'
import { crearAdaptadorExplicacionDesarrollo } from './dev/adaptadorExplicacionDesarrollo.js'

// Misma instancia reutilizada en cada render — nunca sustituye el adaptador de producción
// de DeclaracionLibre.jsx (AdaptadorViaServidor, su valor por defecto): solo se pasa como
// prop explícita más abajo, exclusivamente dentro del árbol import.meta.env.DEV, para poder
// revisar S4-006 en el navegador sin consumir la API real de OpenAI.
const adaptadorInterpretacionDesarrollo = import.meta.env.DEV ? crearAdaptadorInterpretacionDesarrollo() : null

// Mismo criterio, para S4-007 — nunca sustituye el adaptador de producción de
// ProyectaTuPensionRPM.jsx (AdaptadorExplicacionViaServidor, su valor por defecto).
const adaptadorExplicacionDesarrollo = import.meta.env.DEV ? crearAdaptadorExplicacionDesarrollo() : null

function App() {
  const [vista, setVista] = useState('bienvenida')
  // PL-250 Bloque 1 (2026-09-01): motivo de consulta — decide, junto con
  // Objetivo.helpers.js#determinarSalidaMotivoConsulta, si el recorrido de
  // vejez continúa o se detiene con una remisión (B-01/B-02/B-03/B-13 en esta
  // entrega). Se recalcula siempre desde este valor, nunca se guarda un
  // booleano de "está detenido" aparte.
  const [motivoConsulta, setMotivoConsulta] = useState(null)
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
  // Slice S4-001A (complementario a S4-001, previo a S4-002): fecha en que se hizo
  // efectivo el traslado de régimen, con el mismo patrón de certeza ya usado en el
  // resto del proyecto. Se captura y se guarda en el expediente — todavía no la
  // consume ningún cálculo (ver IndiciosRegimenTransicion.jsx).
  const [certezaFechaTraslado, setCertezaFechaTraslado] = useState(null)
  const [fechaTrasladoRegimen, setFechaTrasladoRegimen] = useState('')
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
  // Historia de cotización estructurada (PeriodoCotizacion[]). Introducida en Sprint 3
  // (poblada solo vía panel de desarrollo); S4-001 (Entregable 2, Sprint 4) agrega su
  // captura real desde la UI pública — ver HistoriaCotizacionRPM.jsx.
  const [historiaCotizacion, setHistoriaCotizacion] = useState([])

  // Profundización opcional — preservar intención/origen (2026-08-27, hallazgo de prueba
  // manual): true únicamente mientras el usuario está en la sub-jornada
  // HistoriaCotizacionRPM/ExploraTuProyeccionRPM abierta DESDE ProyectaTuPensionRPM (vía
  // onProfundizarHistoria, más abajo). Permite que ExploraTuProyeccionRPM ofrezca volver a
  // la proyección original sin que eso dependa de si SU PROPIA lectura histórica (una
  // capacidad independiente, con su propio umbral) logró calcularse — dos preguntas
  // distintas que antes quedaban acopladas por error. No es un returnTo genérico: un solo
  // booleano, exclusivamente para este par de pantallas.
  const [regresarAProyeccionTrasHistoria, setRegresarAProyeccionTrasHistoria] = useState(false)

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
    // detalleTraslado y la fecha de traslado (IndiciosRegimenTransicion) dependen
    // semánticamente de trasladoRegimen: solo tienen sentido cuando la respuesta es
    // 'si'. Cualquier cambio que la aleje de 'si' invalida lo ya dado — mismo
    // criterio ya aplicado a trasladoRegimen respecto de regimenActual.
    if (valor !== 'si') {
      setDetalleTraslado(null)
      setCertezaFechaTraslado(null)
      setFechaTrasladoRegimen('')
    }
    setTrasladoRegimen(valor)
  }

  function actualizarCertezaFechaTraslado(valor) {
    // fechaTrasladoRegimen depende semánticamente de certezaFechaTraslado: solo
    // tiene sentido con 'conocido'/'aproximado' — mismo criterio ya usado en
    // actualizarCertezaBaseCotizacion/actualizarCertezaSaldoAcumulado.
    if (valor !== 'conocido' && valor !== 'aproximado') {
      setFechaTrasladoRegimen('')
    }
    setCertezaFechaTraslado(valor)
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

  // PrimeraLectura se omite cuando ninguna de sus dos evidencias tiene algo
  // interpretable que mostrar (ej. régimen RAIS: ambas devuelven
  // 'regimen_no_rpm') — el criterio se deriva exclusivamente del resultado
  // estructurado del dominio, nunca de texto. No se guarda como bandera de
  // estado: se recalcula en cada transición con los datos vigentes, para que
  // un cambio posterior (ej. de régimen) nunca deje una decisión obsoleta.
  function vistaSegunValorDePrimeraLectura(siConValor, siSinValor) {
    return tienePrimeraLecturaValor({
      sexo,
      regimenActual,
      nivelConocimientoSemanas,
      semanasCotizadas,
      fechaNacimiento,
    })
      ? siConValor
      : siSinValor
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
    motivoConsulta,
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
    certezaFechaTraslado,
    fechaTrasladoRegimen,
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
    motivoConsulta: setMotivoConsulta,
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
    certezaFechaTraslado: setCertezaFechaTraslado,
    fechaTrasladoRegimen: setFechaTrasladoRegimen,
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
            certezaFechaTraslado: actualizarCertezaFechaTraslado,
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
          motivoConsulta={motivoConsulta}
          onCambiarMotivoConsulta={setMotivoConsulta}
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
          onContinuar={() => setVista(vistaSegunValorDePrimeraLectura('primeraLectura', 'indiciosTransicion'))}
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
          certezaFechaTraslado={certezaFechaTraslado}
          onCambiarCertezaFechaTraslado={actualizarCertezaFechaTraslado}
          fechaTrasladoRegimen={fechaTrasladoRegimen}
          onCambiarFechaTrasladoRegimen={setFechaTrasladoRegimen}
          onVolver={() => setVista(vistaSegunValorDePrimeraLectura('primeraLectura', 'historiaPensional'))}
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
          onContinuar={() => setVista(siguienteVistaTrasBaseCotizacion(regimenActual))}
        />
      )}

      {vista === 'queDeterminaResultado' && (
        <QueDeterminaTuResultado
          regimenActual={regimenActual}
          onVolver={() => setVista('baseCotizacion')}
          onContinuar={() =>
            setVista(regimenActual === 'RPM' ? 'historiaCotizacionRPM' : 'exploraTuProyeccion')
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

      {vista === 'historiaCotizacionRPM' && (
        <HistoriaCotizacionRPM
          historiaCotizacion={historiaCotizacion}
          onCambiarHistoriaCotizacion={setHistoriaCotizacion}
          regimenActual={regimenActual}
          nivelConocimientoSemanas={nivelConocimientoSemanas}
          semanasCotizadas={semanasCotizadas}
          trasladoRegimen={trasladoRegimen}
          // Profundización opcional (2026-08-26): hoy la única ruta real que llega aquí es
          // el botón "Completar mi historia de cotización" de ProyectaTuPensionRPM (vía
          // onProfundizarHistoria, más abajo) — la rama RPM de queDeterminaResultado.onContinuar
          // (arriba) es alcance muerto de hecho, porque UX-RPM-01 ya no deja llegar a
          // queDeterminaResultado para RPM. Volver debe regresar exactamente a la pantalla
          // desde la que se entró, nunca a una que el usuario no visitó en este recorrido.
          // Sale de la sub-jornada por completo → limpia el flag de origen (2026-08-27).
          onVolver={() => {
            setRegresarAProyeccionTrasHistoria(false)
            setVista('proyectaTuPensionRPM')
          }}
          onContinuar={() => setVista('exploraTuProyeccionRPM')}
        />
      )}

      {vista === 'exploraTuProyeccionRPM' && (
        <ExploraTuProyeccionRPM
          historiaCotizacion={historiaCotizacion}
          regimenActual={regimenActual}
          nivelConocimientoSemanas={nivelConocimientoSemanas}
          semanasCotizadas={semanasCotizadas}
          trasladoRegimen={trasladoRegimen}
          // Preservar intención/origen (2026-08-27): permite ofrecer "Volver a tu
          // proyección" sin que dependa de si ESTA lectura histórica independiente logró
          // calcularse — ver comentario junto al estado, arriba.
          permitirVolverAProyeccion={regresarAProyeccionTrasHistoria}
          onVolver={() => setVista('historiaCotizacionRPM')}
          onContinuar={() => {
            setRegresarAProyeccionTrasHistoria(false)
            setVista('proyectaTuPensionRPM')
          }}
        />
      )}

      {vista === 'proyectaTuPensionRPM' && (
        <ProyectaTuPensionRPM
          historiaCotizacion={historiaCotizacion}
          regimenActual={regimenActual}
          sexo={sexo}
          fechaNacimiento={fechaNacimiento}
          certezaBaseCotizacion={certezaBaseCotizacion}
          valorBaseCotizacionDeclarado={valorBaseCotizacionDeclarado}
          tipoCotizante={tipoCotizante}
          lugarCotizacion={lugarCotizacion}
          salarioParaEstimarBase={salarioParaEstimarBase}
          // Contrato GO-B (2026-08-25): ya declaradas en InformacionPensionalEsencial.jsx —
          // se conectan aquí para la proyección preliminar, sin volver a preguntarlas.
          nivelConocimientoSemanas={nivelConocimientoSemanas}
          semanasCotizadas={semanasCotizadas}
          // Profundización opcional (2026-08-26): reutiliza HistoriaCotizacionRPM.jsx /
          // ExploraTuProyeccionRPM.jsx tal cual, sin ningún estado de navegación nuevo —
          // mismo `vista` de siempre. onVolver de historiaCotizacionRPM (arriba) regresa
          // aquí; onContinuar de exploraTuProyeccionRPM ya apuntaba aquí sin cambios.
          // Marca el origen (2026-08-27, hallazgo de prueba manual) para que
          // ExploraTuProyeccionRPM pueda ofrecer volver aquí sin depender de su propia
          // lectura histórica independiente.
          onProfundizarHistoria={() => {
            setRegresarAProyeccionTrasHistoria(true)
            setVista('historiaCotizacionRPM')
          }}
          edadJubilacionDeseada={edadJubilacionDeseada}
          onCambiarEdadJubilacionDeseada={setEdadJubilacionDeseada}
          objetivoPensionMensual={objetivoPensionMensual}
          onCambiarObjetivoPensionMensual={setObjetivoPensionMensual}
          restriccionCostoPensionalAdicionalMaximoMensual={restriccionCostoPensionalAdicionalMaximoMensual}
          onCambiarRestriccionCostoPensionalAdicionalMaximoMensual={
            setRestriccionCostoPensionalAdicionalMaximoMensual
          }
          // UX-RPM-01: única ruta real hoy hacia esta vista para RPM es directa desde
          // BaseCotizacion (ver siguienteVistaTrasBaseCotizacion) — Volver debe regresar
          // ahí, no a exploraTuProyeccionRPM, que ya no se recorrió.
          onVolver={() => setVista('baseCotizacion')}
          declaracionLibre={declaracionLibre}
          {...(import.meta.env.DEV ? { adaptadorExplicacion: adaptadorExplicacionDesarrollo } : {})}
        />
      )}

      {/* Precisión de producto S4-006 (2026-08-23): DeclaracionLibre.jsx ahora embebe
          interpretación reactiva + revisión + solo los controles de lo que realmente falta
          + CTA final ("Usar estos datos y explorar mis opciones") — RevisionDeclaracionTemporal.jsx
          se retiró, su responsabilidad se fusionó aquí. onVolver conserva el mismo destino
          que ya tenía (queDeterminaResultado). onContinuar avanza a proyectaTuPensionRPM —
          la capacidad determinista que consume exactamente edadJubilacionDeseada/
          objetivoPensionMensual/restricción — solo tras el clic explícito en el CTA, nunca
          antes. Sigue sin haber, a propósito, ningún botón del recorrido real que lleve
          HASTA declaracionLibre (ver diagnóstico previo): alcanzable hoy únicamente vía
          Panel de Desarrollo / fixtures. */}
      {vista === 'declaracionLibre' && (
        <DeclaracionLibre
          declaracion={declaracionLibre}
          onCambiarDeclaracion={setDeclaracionLibre}
          onVolver={() => setVista('queDeterminaResultado')}
          onContinuar={() => setVista('proyectaTuPensionRPM')}
          objetivoPensionMensual={objetivoPensionMensual}
          onCambiarObjetivoPensionMensual={setObjetivoPensionMensual}
          edadJubilacionDeseada={edadJubilacionDeseada}
          onCambiarEdadJubilacionDeseada={setEdadJubilacionDeseada}
          fechaNacimiento={fechaNacimiento}
          onCambiarRestriccionCostoPensionalAdicionalMaximoMensual={
            setRestriccionCostoPensionalAdicionalMaximoMensual
          }
          {...(import.meta.env.DEV ? { adaptador: adaptadorInterpretacionDesarrollo } : {})}
        />
      )}
      </AppShell>
    </>
  )
}

export default App
