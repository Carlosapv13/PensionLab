// Fixtures de desarrollo — ejemplos predefinidos exclusivamente para probar
// PensionLab manualmente sin recorrer las ~15 pantallas previas cada vez.
//
// Un "fixture" NO es un "Caso Pensional" del producto (concepto todavía sin
// contrato propio — ver docs/producto/oportunidades-futuras.md, entrada 1,
// para la distinción explícita). Este archivo nunca debe convertirse en el
// modelo definitivo de caso pensional del producto — es solo tooling de
// desarrollo, y vive exclusivamente en src/dev/.
//
// Cada `datos` es un subconjunto de CLAVES_ESTADO_EDITABLE (estadoApp.js) —
// las claves omitidas se resetean a su valor por defecto al cargar (ver
// aplicarFixture.js), nunca se conserva un residuo de un fixture anterior.

/**
 * @typedef {Object} Fixture
 * @property {string} id
 * @property {string} nombre
 * @property {string} vistaSugerida - una de VISTAS_CONOCIDAS (estadoApp.js)
 * @property {Object} datos - subconjunto de CLAVES_ESTADO_EDITABLE
 */

// diasCotizados de historiaCotizacion, más abajo (caso QA RPM objetivo 7M), se deriva
// siempre con diasCalendarioEnRango — mismo helper canónico que ya usa
// HistoriaCotizacionRPM.helpers.js (construirPeriodoCotizacion) para no aceptar un
// diasCotizados distinto de los días calendario completos del rango. Importarlo aquí es
// seguro: src/dev/fixtures.js solo se alcanza desde PanelDesarrollo.jsx (montado
// exclusivamente bajo import.meta.env.DEV, ver App.jsx) o desde tests — nunca desde una
// pantalla productiva, así que esto no abre un segundo camino hacia domain/ en el bundle
// de producción; es una función pura, sin estado, sin efectos.
import { diasCalendarioEnRango } from '../domain/seleccionarPeriodosIBL.js'

/** @type {Fixture[]} */
export const FIXTURES = [
  {
    id: 'rais-empleado-colombia',
    nombre: 'RAIS — empleado — Colombia',
    // 'declaracionLibre' fue retirada del recorrido principal (ver
    // docs/producto/oportunidades-futuras.md, entrada 2) y App.jsx ya no la
    // renderiza — 'queDeterminaResultado' es la vista activa más coherente
    // para este perfil sin necesitar datos adicionales: solo depende de
    // regimenActual, que este fixture ya declara.
    vistaSugerida: 'queDeterminaResultado',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1974-07-13',
      regimenActual: 'RAIS',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '1350',
      anioInicioCotizacion: '1994',
      certezaBaseCotizacion: 'aproximado',
      valorBaseCotizacionDeclarado: '7000000',
      infoEsencialCompletada: true,
    },
  },
  {
    id: 'rais-independiente-colombia',
    nombre: 'RAIS — independiente — Colombia (perfil soportado)',
    // Único perfil para el que ExploraTuProyeccion.jsx genera y compara
    // caminos (perfilAplica === true): RAIS, independiente, cotización en
    // Colombia, sin traslados de régimen — ver generarCaminosRAIS.js. Los
    // valores de objetivoPensionMensual/valorBaseCotizacionDeclarado están
    // elegidos para que aparezcan ambos caminos (base y "aumentar tu base
    // de cotización"), no solo el base.
    vistaSugerida: 'exploraTuProyeccion',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Mujer',
      fechaNacimiento: '1986-03-10',
      regimenActual: 'RAIS',
      trasladoRegimen: 'no',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '850',
      anioInicioCotizacion: '2010',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '7000000',
      infoEsencialCompletada: true,
      edadJubilacionDeseada: '65',
      certezaSaldoAcumulado: 'conocido',
      saldoAcumuladoDeclarado: '80000000',
      objetivoPensionMensual: '4500000',
      restriccionCostoPensionalAdicionalMaximoMensual: '500000',
    },
  },
  {
    id: 'rpm-empleada-historia-evaluable',
    nombre: 'RPM — empleada — historia evaluable (10 años, sin alternativa de vida laboral)',
    // Slice "Primera lectura económica RPM desde historia estructurada": única historia de
    // cotización con la que hoy calcularPensionRPM.js produce 'calculado' — los 10 años
    // calendario anteriores a hoy (2016-2025, mientras 'hoy' caiga en 2026, ver notas de
    // ipc-historico.json) cubiertos sin huecos por 3 períodos completos. Con ~522 semanas
    // observadas (muy por debajo de 1250), no habilita la alternativa de vida laboral.
    // La alternativa de vida laboral (≥1250 semanas ≈ 24 años) necesitaría IPC real de más
    // años de los que ipc-historico.json cubre hoy (2015-2025, todos verificados por
    // búsqueda web) — no se amplió esa tabla con datos no verificados solo para tener un
    // fixture con alternativa (ver informe de la ronda de corrección de IPC). La propiedad
    // de que esa alternativa puede resultar mayor O menor según la historia queda probada
    // con datos sintéticos en formulaIBL.test.js, no con un fixture visible en la UI.
    //
    // semanasCotizadas: '522' — coherente con totalDiasCotizados/7 de historiaCotizacion
    // (3653/7 = 521.857..., redondeado: PrimeraLectura.jsx exige un entero — ver
    // evidenciaSemanasMinimas.js). Antes decía '1350', un valor autorreportado
    // contradictorio con la historia estructurada de este mismo fixture: cargarlo y
    // recorrer manualmente PrimeraLectura → ... → la lectura RPM mostraba primero "1.350
    // semanas" (autorreportadas) y después "521,9 semanas" (observadas) para la misma
    // persona — mismo hallazgo reportado y corregido en la ronda de revisión de este Slice.
    vistaSugerida: 'exploraTuProyeccionRPM',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Mujer',
      fechaNacimiento: '1975-04-20',
      regimenActual: 'RPM',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '522',
      anioInicioCotizacion: '1996',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '3400000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        { fechaDesde: '2016-01-01', fechaHasta: '2019-12-31', ibc: 2200000, diasCotizados: 1461 },
        { fechaDesde: '2020-01-01', fechaHasta: '2022-12-31', ibc: 2800000, diasCotizados: 1096 },
        { fechaDesde: '2023-01-01', fechaHasta: '2025-12-31', ibc: 3400000, diasCotizados: 1096 },
      ],
    },
  },
  {
    id: 'rpm-empleado-historia-con-hueco',
    nombre: 'RPM — empleado — historia con hueco de 6 meses (Slice correctivo, ventana por días efectivamente cotizados)',
    // Demuestra el comportamiento central del Slice correctivo (2026-08-19): un hueco real
    // de cotización (jul-dic 2019, 184 días sin período declarado) ya NO vuelve la historia
    // no evaluable — el selector retrocede hasta enero de 2016 para completar los 3.650 días
    // de la convención técnica provisional (ver src/data/legal/trazabilidad-normativa.md).
    //
    // Total declarado: 1277 (2016-01-01 a 2019-06-30) + 2414 (2020-01-01 a 2026-08-10) =
    // 3691 días — 41 días por encima de los 3.650 necesarios, así que el tramo de 2016 queda
    // recortado a sus últimos 1236 días (no se toca 2015, fuera del rango de
    // ipc-historico.json). Antes de este Slice, este mismo hueco habría bloqueado la
    // evaluación por completo (VACIOS_EN_VENTANA_IBL_NO_SOPORTADOS).
    vistaSugerida: 'exploraTuProyeccionRPM',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1978-02-11',
      regimenActual: 'RPM',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '527',
      anioInicioCotizacion: '2016',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '2900000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
        // Hueco real: 2019-07-01 a 2019-12-31 (184 días) — sin período declarado a propósito.
        { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
      ],
    },
  },
  {
    id: 'rpm-empleado-proyecta-tu-pension',
    nombre: 'RPM — empleado — Proyecta tu pensión, objetivo alcanzable mediante bisección (S4-003)',
    // Misma historia de rpm-empleado-historia-con-hueco (arriba) — reutilizada a
    // propósito para no duplicar un segundo caso de historia real, ya validado. Objetivo
    // deliberadamente por encima de lo que el camino base (continuidad_ibc_actual)
    // alcanza, para ejercitar la bisección de generarCaminosRPM.js con datos reales al
    // revisar esta pantalla manualmente.
    vistaSugerida: 'proyectaTuPensionRPM',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1978-02-11',
      regimenActual: 'RPM',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '527',
      anioInicioCotizacion: '2016',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '2900000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
        { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
      ],
      // 65, no 62 (el mínimo legal): a los 62 la historia + el horizonte todavía no
      // completan las 1300 semanas mínimas (auditoría 2026-08-21) — este fixture
      // demuestra el camino de bisección exitoso, no el rechazo por elegibilidad.
      edadJubilacionDeseada: '65',
      objetivoPensionMensual: '3500000',
    },
  },
  {
    id: 'rpm-empleado-proyecta-tu-pension-sin-margen-barrido',
    nombre: 'RPM — empleado — Proyecta tu pensión, IBC actual ya en el tope legal (S4-005, infraestructura de desarrollo)',
    // Infraestructura de desarrollo exclusiva de S4-005: mismo perfil/historia de
    // rpm-empleado-proyecta-tu-pension (arriba), con valorBaseCotizacionDeclarado
    // deliberadamente muy por encima del tope legal (25 SMLV) para ejercitar en la
    // revisión visual el caso barrido.estado === 'sin_margen' — ni el gráfico ni el
    // camino alternativo tienen margen de IBC futuro que explorar. No demuestra ningún
    // caso nuevo de dominio (mismo camino YA_EN_TOPE_LEGAL ya cubierto por tests de
    // S4-003), solo facilita verlo sin construir el caso a mano.
    //
    // objetivoPensionMensual deliberadamente absurdo (verificado, 2026-08-21, tercera
    // iteración de S4-005): con el IBC ya capado al tope legal, la pensión de continuidad
    // ronda los $24.7M — cualquier objetivo módico cae en 'objetivo_ya_alcanzado' antes de
    // llegar siquiera a evaluar el tope. Se necesita un objetivo que ni el tope legal
    // alcance para ejercitar realmente 'sin_margen'/SIN_MARGEN_TOPE_LEGAL.
    vistaSugerida: 'proyectaTuPensionRPM',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1978-02-11',
      regimenActual: 'RPM',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '527',
      anioInicioCotizacion: '2016',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '50000000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
        { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
      ],
      edadJubilacionDeseada: '65',
      objetivoPensionMensual: '900000000',
    },
  },
  {
    id: 'rpm-empleado-declaracion-libre-s4-006',
    nombre: 'RPM — empleado — Declaración libre → interpretación IA (S4-006, infraestructura de desarrollo)',
    // Infraestructura de desarrollo exclusiva de S4-006 — mismo perfil/historia real de
    // rpm-empleado-proyecta-tu-pension, para llegar directo a 'declaracionLibre' sin
    // recorrer las pantallas previas. En modo desarrollo (import.meta.env.DEV), App.jsx ya
    // inyecta el adaptador simulado de src/dev/adaptadorInterpretacionDesarrollo.js en vez
    // del adaptador de producción — ninguna llamada real a OpenAI al usar este fixture.
    //
    // objetivoPensionMensual/restriccionCostoPensionalAdicionalMaximoMensual/
    // edadJubilacionDeseada quedan con valores YA existentes, deliberadamente distintos de
    // lo que producen los casos de prueba de la revisión visual (ver más abajo) — para
    // poder confirmar a simple vista que antes de "Confirmar" el expediente no cambia, y
    // que después de "Confirmar" solo cambia el/los campo(s) efectivamente interpretados
    // (los demás conservan estos mismos valores, nunca se borran).
    //
    // Frases recomendadas para escribir en el textarea de "Declaración libre", una a la
    // vez (volviendo a este mismo fixture entre intento e intento si se quiere repetir
    // desde cero):
    //   A. "Quiero pensionarme con al menos 3.500.000 al mes."
    //      → interpretado, solo objetivoPensionMensual (3.500.000).
    //   B. "Quiero pensionarme a los 65 años con 3.500.000 al mes."
    //      → interpretado, objetivoPensionMensual (3.500.000) y edadJubilacionDeseada (65).
    //   C. "Puedo destinar 400.000 pesos adicionales a mi aporte pensional cada mes."
    //      → interpretado, solo restriccionCostoPensionalAdicionalMaximoMensual (400.000).
    //   D. "No sé qué hacer con mi pensión." → insuficiente (sin cifras reconocibles).
    //      Variante ambigua: agregar literalmente "[forzar ambiguo]" al texto → ambiguo,
    //      con objetivoPensionMensual señalado en camposAmbiguos.
    //   E. "blablabla" o "jajajaja" → descartado por evaluarAptitud.js ANTES de invocar
    //      cualquier adaptador (ni siquiera el simulado se ejecuta para este caso).
    //   F. Agregar literalmente "[forzar error]" a cualquier texto → estado
    //      error_proveedor / TIMEOUT, simula una falla del proveedor.
    vistaSugerida: 'declaracionLibre',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1978-02-11',
      regimenActual: 'RPM',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '527',
      anioInicioCotizacion: '2016',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '2900000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
        { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
      ],
      edadJubilacionDeseada: '62',
      objetivoPensionMensual: '2000000',
      restriccionCostoPensionalAdicionalMaximoMensual: '150000',
    },
  },
  {
    id: 'rpm-empleado-declaracion-libre-s4-006-sin-datos-previos',
    nombre:
      'RPM — empleado — Declaración libre, sin objetivo/edad previos (precisión de producto S4-006, ' +
      'campos faltantes)',
    // Mismo perfil e historia real que 'rpm-empleado-declaracion-libre-s4-006', pero con
    // edadJubilacionDeseada/objetivoPensionMensual/restricción vacíos — para poder probar a
    // simple vista el flujo "PensionLab determina qué falta" desde cero, sin necesitar
    // editar el expediente a mano en el Panel de Desarrollo antes de escribir la
    // declaración.
    //
    // Guion recomendado para la revisión visual:
    //   B1. Escribe "Quiero pensionarme con al menos 3.500.000 al mes." → tras el debounce,
    //       se interpreta objetivoPensionMensual; como edadJubilacionDeseada no está en el
    //       expediente ni se interpretó, aparece el control estructurado "¿Hasta qué edad
    //       quieres proyectar tus aportes?" — el CTA final no aparece todavía.
    //   B2. Completa esa edad a mano (ej. 62) → el CTA "Usar estos datos y explorar mis
    //       opciones" aparece de inmediato (reactivo, sin volver a escribir nada).
    //   B3. Vuelve a este fixture y escribe "Quiero pensionarme a los 65 años con 3.500.000
    //       al mes." → los dos campos requeridos se interpretan juntos, el CTA aparece sin
    //       pedir nada estructurado.
    vistaSugerida: 'declaracionLibre',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1978-02-11',
      regimenActual: 'RPM',
      trasladoRegimen: 'no',
      tipoCotizante: 'empleado',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '527',
      anioInicioCotizacion: '2016',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '2900000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        { fechaDesde: '2016-01-01', fechaHasta: '2019-06-30', ibc: 2100000, diasCotizados: 1277 },
        { fechaDesde: '2020-01-01', fechaHasta: '2026-08-10', ibc: 2900000, diasCotizados: 2414 },
      ],
      edadJubilacionDeseada: '',
      objetivoPensionMensual: '',
      restriccionCostoPensionalAdicionalMaximoMensual: '',
    },
  },
  {
    id: 'rpm-trasladada-indicios-transicion',
    nombre: 'RPM — trasladado de RAIS — hasta Indicios de régimen de transición (ficticio, S4-001A)',
    // Caso ficticio, representativo de la clase de validación del Entregable 2 —
    // no es el caso personal de Carlos. Reutilizable para revisión manual de
    // S4-001A y, más adelante, de S4-002/S4-003: certezaBaseCotizacion ya
    // resuelta ('conocido') y semanasCotizadas altas (~1500) para poder ejercitar
    // el indicio de vida laboral (evidenciaIndicioVidaLaboral.js) sin tener que
    // recapturar todo el expediente cada vez. tipoCotizante: 'independiente' —
    // no introduce ninguna restricción adicional para RPM (ni
    // seleccionarPeriodosIBL.js ni calcularPensionRPM.js filtran por él).
    //
    // detalleTraslado, certezaFechaTraslado y fechaTrasladoRegimen deliberadamente
    // ausentes de `datos` — aplicarFixture los deja en su valor por defecto
    // (null/''), exactamente lo que S4-001A necesita probar desde "Posibles
    // indicios de régimen de transición".
    vistaSugerida: 'indiciosTransicion',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Colombia',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1974-05-14',
      regimenActual: 'RPM',
      trasladoRegimen: 'si',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'colombia',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '1500',
      anioInicioCotizacion: '1996',
      certezaBaseCotizacion: 'conocido',
      valorBaseCotizacionDeclarado: '3200000',
      infoEsencialCompletada: true,
    },
  },
  {
    id: 'qa-rpm-objetivo-7m',
    nombre: 'Caso QA — RPM objetivo 7M',
    // Caso real de QA manual reutilizado repetidamente en la revisión de ProyectaTuPensionRPM
    // (jerarquía IBC/aporte, "% de tu objetivo") — sin este fixture, recrearlo exigía
    // recorrer ~15 pantallas cada vez para una microcorrección visual. Deliberadamente sin
    // esfuerzo personalizado precargado (decisión de producto, 2026-08-27): el fixture
    // representa el expediente y la pregunta base, no una decisión posterior de exploración
    // — cargar $200.000/$100.000/etc. ya es una acción de 3 clics sobre la pantalla real
    // (ver guion más abajo), nunca una responsabilidad del fixture.
    //
    // tipoCotizante: 'independiente' (no 'empleado') — decisión explícita: lugarCotizacion
    // ya cubre "desde el exterior", pero tipoCotizante responde una pregunta distinta ("¿quién
    // hizo los aportes?", ver HistorialLaboral.jsx) que el caso original no especificaba.
    // 'independiente' es el patrón real más común para alguien que sostiene su cotización a
    // Colpensiones desde el exterior sin un empleador que reporte por él (aportante
    // voluntario/independiente) — no afecta el cálculo con certezaBaseCotizacion:'aproximado'
    // (determinarBaseCotizacion.js solo lee tipoCotizante en la rama 'desconocido'), pero el
    // fixture debe representar el caso fielmente, no solo lo que el motor necesita.
    //
    // historiaCotizacion: un solo período reciente y parcial (6 meses, ~181 días de los 3.650
    // de la ventana IBL) — a propósito: representa "historia real parcial", no una historia
    // completa. diasCotizados nunca hardcodeado: se deriva con diasCalendarioEnRango
    // (import de arriba), el mismo helper que HistoriaCotizacionRPM.helpers.js usa para
    // construir cualquier PeriodoCotizacion real.
    //
    // Guion rápido para probar el camino personalizado (no forma parte del fixture — acción
    // manual sobre la pantalla real, mismo criterio que el guion de frases del fixture
    // 'rpm-empleado-declaracion-libre-s4-006'): tras cargar y llegar a proyectaTuPensionRPM,
    // clic en "Explorar otro esfuerzo mensual" → escribir 200000 (o 100000/250000/...) → clic
    // en "Explorar este esfuerzo".
    vistaSugerida: 'proyectaTuPensionRPM',
    datos: {
      objetivoSeleccionado: 'Descubrir mis opciones pensionales.',
      lugarResidencia: 'Exterior',
      cotizaActualmente: 'si',
      sexo: 'Hombre',
      fechaNacimiento: '1974-07-13',
      regimenActual: 'RPM',
      trasladoRegimen: 'si',
      detalleTraslado: 'rais_a_rpm',
      certezaFechaTraslado: 'aproximado',
      fechaTrasladoRegimen: '2026-07-01',
      tipoCotizante: 'independiente',
      lugarCotizacion: 'exterior',
      nivelConocimientoSemanas: 'aproximado',
      semanasCotizadas: '1350',
      certezaBaseCotizacion: 'aproximado',
      valorBaseCotizacionDeclarado: '7000000',
      infoEsencialCompletada: true,
      historiaCotizacion: [
        {
          fechaDesde: '2026-01-01',
          fechaHasta: '2026-06-30',
          ibc: 1850000,
          diasCotizados: diasCalendarioEnRango('2026-01-01', '2026-06-30'),
        },
      ],
      edadJubilacionDeseada: '62',
      objetivoPensionMensual: '7000000',
    },
  },
]
