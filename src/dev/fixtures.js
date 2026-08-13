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
]
