import { useState } from 'react'
import './App.css'
import AppShell from './components/layout/AppShell.jsx'
import Bienvenida from './pages/Bienvenida.jsx'
import DatosIniciales from './pages/DatosIniciales.jsx'
import SituacionPensional from './pages/SituacionPensional.jsx'
import HistorialLaboral from './pages/HistorialLaboral.jsx'
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
import { siguienteVistaTrasBaseCotizacion, destinoTrasEdicionDesdeResumenRPM } from './navegacionRPM.js'

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
  // PL-250 (2026-09-01, Bloque 1; retirado el control interactivo en Bloque 4,
  // 2026-09-03): motivoConsulta declara explícitamente que el recorrido es de
  // vejez. Bienvenida.jsx lo establece a 'vejez' al pulsar su único botón —
  // ya no existe una pantalla ni una decisión que pueda dejarlo en otro valor.
  // Se conserva como estado (y en las fixtures, `dev/fixtures.js`) por
  // decisión explícita de producto — ningún cálculo de dominio lo consume
  // hoy, pero la declaración en sí sigue siendo necesaria.
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

  // Revisión correctiva E4-C1 (2026-09-10) — "Retorno controlado desde el resumen": mismo
  // patrón exacto que regresarAProyeccionTrasHistoria (arriba), generalizado a los cuatro
  // datos que SÍ necesitan un atajo (semanas, traslado, fecha de nacimiento, régimen actual —
  // IBC actual y historia ya no lo necesitan, ver comentarios junto a onVolver/
  // onProfundizarHistoria más abajo). Contexto de navegación PURAMENTE transitorio: no es un
  // dato del expediente pensional, nunca se persiste más allá de esta sesión de edición, no
  // interviene en ningún cálculo (ni generarCaminosRPM ni ninguna otra función de dominio lo
  // reciben), y se limpia SIEMPRE al salir de la pantalla propietaria del dato — ya sea
  // completando (continuarTrasEdicionDesdeResumenRPM) o cancelando
  // (volverCancelandoEdicionDesdeResumenRPM), nunca queda "colgado" para una navegación
  // posterior no relacionada. Distingue navegación normal del onboarding (false — el
  // comportamiento de cada onContinuar/onVolver es exactamente el de antes de este
  // checkpoint) de una edición iniciada desde "Revisar la información que estamos usando
  // para esta proyección" (true).
  const [regresarAProyeccionTrasEdicionResumen, setRegresarAProyeccionTrasEdicionResumen] = useState(false)

  // Única función que decide el destino de "Continuar" en las cuatro pantallas editables
  // desde el resumen (datosIniciales, situacionPensional, informacionPensional,
  // indiciosTransicion) — centraliza la decisión en un solo lugar en vez de repetir el mismo
  // condicional cuatro veces (piden explícitamente evitar condicionales dispersos).
  //
  // Regla, igual para las cuatro pantallas (cubre los 6 datos del checkpoint: las 4 que
  // pasan por aquí, más IBC actual y historia, que ya regresaban directo por su cuenta): si
  // el contexto de edición desde el resumen está activo Y el expediente sigue siendo
  // compatible con una proyección RPM (regimenActual === 'RPM' en el momento de continuar —
  // la única condición estructural que puede volverse incompatible; ver
  // actualizarRegimenActual, sin cambios, para la única invalidación real que existe),
  // regresa directo a 'proyectaTuPensionRPM'. Si regimenActual dejó de ser 'RPM' (única
  // pantalla donde eso puede ocurrir: situacionPensional), NUNCA regresa ahí — cae a
  // `destinoNormal`, que para esa pantalla ya es 'historialLaboral' (el flujo RAIS
  // correspondiente, sin ninguna regla de invalidación nueva).
  //
  // Fecha de nacimiento (caso especial documentado en el checkpoint): esta función NO
  // verifica por separado "existen todos los datos imprescindibles" — ese chequeo ya existe,
  // en el único lugar donde tiene sentido: ProyectaTuPensionRPM.jsx recalcula edadActual
  // (calcularEdadCumplida) en cada render y ya reabre su propio formulario con su propio
  // mensaje de error específico (validarEdadJubilacionDeseada) si la nueva fecha de
  // nacimiento deja edadJubilacionDeseada inválida — ese campo no se captura en ninguna otra
  // pantalla, así que ProyectaTuPensionRPM.jsx YA ES "la primera pantalla realmente
  // necesaria" para ese caso. No se duplica esa validación aquí.
  //
  // `destinoNormal` es siempre el mismo `setVista('literal')` que esa pantalla ya usaba antes
  // de este checkpoint — la navegación normal del onboarding (contexto false) es bit-idéntica
  // a como era antes, nunca afectada por esta función.
  function continuarTrasEdicionDesdeResumenRPM(destinoNormal) {
    const destino = destinoTrasEdicionDesdeResumenRPM({
      regresarAProyeccionTrasEdicionResumen,
      regimenActual,
      destinoNormal,
    })
    setRegresarAProyeccionTrasEdicionResumen(false)
    setVista(destino)
  }

  // "Volver" desde cualquiera de esas mismas cuatro pantallas cancela la edición en curso —
  // nunca deja el contexto activo para una navegación posterior no relacionada (ej. abandonar
  // la edición, retroceder más en el onboarding, y luego volver a avanzar sin haber pasado de
  // nuevo por el resumen). No altera ningún dato: solo limpia el contexto transitorio y sigue
  // el destino normal de "Volver" de esa pantalla, exactamente como antes de este checkpoint.
  function volverCancelandoEdicionDesdeResumenRPM(destinoNormal) {
    setRegresarAProyeccionTrasEdicionResumen(false)
    setVista(destinoNormal)
  }

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
      {/* Objetivo.jsx se retiró del recorrido (2026-09-03, feedback de usuaria real): la
          divulgación progresiva de dos pasos no resolvía el problema, solo escondía las 4
          categorías no atendidas detrás de un clic extra. El control de alcance ahora es
          informativo, no interactivo — vive en Bienvenida.jsx, que establece motivoConsulta
          directamente al pulsar su único botón, sin ninguna selección intermedia. */}
      {vista === 'bienvenida' && (
        <Bienvenida
          onComenzar={() => {
            setMotivoConsulta('vejez')
            setVista('datosIniciales')
          }}
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
          onContinuar={() => continuarTrasEdicionDesdeResumenRPM('situacionPensional')}
          onVolver={() => volverCancelandoEdicionDesdeResumenRPM('bienvenida')}
        />
      )}

      {vista === 'situacionPensional' && (
        <SituacionPensional
          regimenActual={regimenActual}
          onCambiarRegimenActual={actualizarRegimenActual}
          onContinuar={() => continuarTrasEdicionDesdeResumenRPM('historialLaboral')}
          onVolver={() => volverCancelandoEdicionDesdeResumenRPM('datosIniciales')}
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
          onContinuar={() => setVista('completarExpediente')}
          onVolver={() => setVista('situacionPensional')}
        />
      )}

      {/* ExpedientePensional.jsx se eliminó (2026-09-02, feedback de usuaria real): era una
          introducción sin datos, decisiones ni función técnica indispensable, seguida
          inmediatamente por otra introducción (CompletarExpediente.jsx) — dos pantallas
          consecutivas sin ninguna decisión real entre ellas. Su contenido útil (qué sigue, para
          qué, que se avanza paso a paso) ya vive en CompletarExpediente.jsx. */}
      {vista === 'completarExpediente' && (
        <CompletarExpediente
          infoEsencialCompletada={infoEsencialCompletada}
          onContinuar={() => setVista('informacionPensional')}
          onVolver={() => setVista('historialLaboral')}
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
          onVolver={() => volverCancelandoEdicionDesdeResumenRPM('completarExpediente')}
          onContinuar={() => {
            setInfoEsencialCompletada(true)
            continuarTrasEdicionDesdeResumenRPM('historiaPensional')
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
          onVolver={() =>
            volverCancelandoEdicionDesdeResumenRPM(vistaSegunValorDePrimeraLectura('primeraLectura', 'historiaPensional'))
          }
          onContinuar={() => continuarTrasEdicionDesdeResumenRPM('baseCotizacion')}
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
          // checkpoint E4-C1, Decisión 5 (2026-09-10): solo para el resumen revisable —
          // nunca se usan en ningún cálculo aquí tampoco (mismo criterio ya establecido en
          // IndiciosRegimenTransicion.jsx).
          trasladoRegimen={trasladoRegimen}
          detalleTraslado={detalleTraslado}
          certezaFechaTraslado={certezaFechaTraslado}
          fechaTrasladoRegimen={fechaTrasladoRegimen}
          // Revisión correctiva E4-C1 (2026-09-10, segunda ronda — "Retorno controlado desde
          // el resumen"): la primera versión de esta corrección asumía que la cadena normal
          // de onContinuar ya bastaba para volver a 'proyectaTuPensionRPM' — cierto en
          // términos de destino final, pero obligaba a recorrer TODAS las pantallas
          // intermedias de nuevo (informacionPensional → historiaPensional → [primeraLectura?]
          // → indiciosTransicion → baseCotizacion), lo que Atlas/Carlos señalaron
          // correctamente que NO es un retorno controlado. Las cuatro navegaciones de abajo
          // ahora activan `regresarAProyeccionTrasEdicionResumen` — contexto puramente
          // transitorio (ver su declaración, arriba) — para que el `onContinuar` de la
          // pantalla propietaria del dato regrese DIRECTO a 'proyectaTuPensionRPM' (vía
          // continuarTrasEdicionDesdeResumenRPM), sin atravesar ninguna pantalla intermedia
          // no relacionada.
          //
          // IBC actual y historia de cotización NO se tocan aquí — ya regresan directo por
          // construcción propia, sin necesitar este contexto: baseCotizacion.onContinuar ya
          // era incondicionalmente 'proyectaTuPensionRPM' para RPM (siguienteVistaTrasBaseCotizacion,
          // sin cambios), y la historia ya usa su propio mecanismo equivalente
          // (regresarAProyeccionTrasHistoria, sin cambios) vía onProfundizarHistoria más abajo.
          onEditarFechaNacimiento={() => {
            setRegresarAProyeccionTrasEdicionResumen(true)
            setVista('datosIniciales')
          }}
          onEditarRegimenActual={() => {
            setRegresarAProyeccionTrasEdicionResumen(true)
            setVista('situacionPensional')
          }}
          onEditarSemanasDeclaradas={() => {
            setRegresarAProyeccionTrasEdicionResumen(true)
            setVista('informacionPensional')
          }}
          onEditarTraslado={() => {
            setRegresarAProyeccionTrasEdicionResumen(true)
            setVista('indiciosTransicion')
          }}
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
