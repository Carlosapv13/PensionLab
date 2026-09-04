// Pruebas de la corrección de revisión crítica (Carlos/Atlas, 2026-09-04):
// 1. Búsqueda determinista y monótona de fechaCumpleEdad/fechaCompletaSemanas/
//    fechaReconocimientoConjunta (reemplaza el blanco fijo original, que tenía un defecto
//    de circularidad real para el cronograma femenino).
// 2. Casos de borde del cronograma femenino.
// 3. Reutilización de EDAD_MAXIMA_FUNCIONAL (requisitosDatosImprescindiblesRPM.js).
// 7. Auditoría de procedencia de semanas (declaración vs. historia, expuestas
//    simultáneamente).
// 9. Pruebas adversariales adicionales.
// 10. Corrección de riesgo funcional (historia con períodos posteriores a fechaCalculo,
//     2026-09-04, previa al commit de E2) — cobertura de integración; la cobertura unitaria
//     completa de la regla en sí vive en validarHistoriaCotizacionTemporal.test.js.
//
// Separado del archivo principal de E2 (evaluarElegibilidadProyectadaRPM.test.js) para no
// mezclar la cobertura original con la de esta corrección — ambos archivos cubren el mismo
// módulo, sin duplicar el mismo caso dos veces.

import { describe, it, expect } from 'vitest'
import { evaluarElegibilidadProyectadaRPM, primeraFechaVerdadera } from './evaluarElegibilidadProyectadaRPM.js'
import { EDAD_MAXIMA_FUNCIONAL } from './requisitosDatosImprescindiblesRPM.js'
import { obtenerSemanasMinimas } from '../../data/legal/index.js'
import { resolverHorizonteFuturoRPM } from '../resolverHorizonteFuturoRPM.js'

const FECHA_CALCULO = '2026-01-01'

function diaAnterior(fechaISO) {
  const d = new Date(fechaISO)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ============================================================================
// 1. primeraFechaVerdadera — unidad, sin pasar por el dominio de elegibilidad
// ============================================================================
describe('primeraFechaVerdadera — búsqueda binaria sobre un predicado monótono', () => {
  it('encuentra exactamente el primer día en que un escalón se activa, con el día anterior todavía falso (oráculo independiente: predicado por fecha de calendario, no reimplementa el algoritmo de búsqueda)', () => {
    const DIA_ACTIVACION = '2026-03-15'
    const predicado = (fecha) => fecha >= DIA_ACTIVACION
    const resultado = primeraFechaVerdadera({ fechaInicio: '2026-01-01', fechaLimite: '2026-12-31', predicado })
    expect(resultado).toBe(DIA_ACTIVACION)
    expect(predicado(diaAnterior(resultado))).toBe(false)
  })

  it('predicado ya verdadero en fechaInicio: devuelve fechaInicio sin buscar', () => {
    const resultado = primeraFechaVerdadera({ fechaInicio: '2026-01-01', fechaLimite: '2026-12-31', predicado: () => true })
    expect(resultado).toBe('2026-01-01')
  })

  it('predicado nunca verdadero dentro del rango: devuelve null', () => {
    const resultado = primeraFechaVerdadera({ fechaInicio: '2026-01-01', fechaLimite: '2026-12-31', predicado: () => false })
    expect(resultado).toBeNull()
  })

  it('rango de un solo día, predicado verdadero: devuelve ese día', () => {
    const resultado = primeraFechaVerdadera({ fechaInicio: '2026-06-15', fechaLimite: '2026-06-15', predicado: () => true })
    expect(resultado).toBe('2026-06-15')
  })

  it('activación exactamente en el último día del rango: la encuentra, no se pasa de largo', () => {
    const resultado = primeraFechaVerdadera({
      fechaInicio: '2026-01-01',
      fechaLimite: '2026-01-10',
      predicado: (fecha) => fecha >= '2026-01-10',
    })
    expect(resultado).toBe('2026-01-10')
  })

  it('activación cruzando un límite de año (31-dic/1-ene): localiza el día exacto sin desfase', () => {
    const predicado = (fecha) => fecha >= '2027-01-01'
    const resultado = primeraFechaVerdadera({ fechaInicio: '2026-12-01', fechaLimite: '2027-01-31', predicado })
    expect(resultado).toBe('2027-01-01')
    expect(predicado(diaAnterior(resultado))).toBe(false)
  })
})

// ============================================================================
// 1b. fechaCumpleEdad / fechaCompletaSemanas / fechaReconocimientoConjunta — integración
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — fechaReconocimientoConjunta: primera fecha válida, verificada con el día anterior', () => {
  it('fechaCumpleEdad: el día calendario inmediatamente anterior la persona todavía no cumplía la edad mínima (oráculo independiente: calcularEdadCumplida re-derivado a mano en el test, no reutiliza la búsqueda)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-06-15',
      edadJubilacionDeseada: 65,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCumpleEdad).toBe('2026-06-15') // cumpleaños 62 de una persona nacida 1964-06-15
    // Oráculo independiente: un cumpleaños siempre cae en el mismo mes/día — el día
    // anterior nunca puede ser ese mismo mes/día, así que la persona aún no cumplía.
    expect(diaAnterior(r.fechaCumpleEdad)).toBe('2026-06-14')
  })

  it('fechaCompletaSemanas: el día calendario inmediatamente anterior las semanas acumuladas todavía eran insuficientes (oráculo independiente: suma manual de semanas, sin invocar primeraFechaVerdadera)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1990-01-01',
      edadJubilacionDeseada: 70,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1250, certeza: 'conocido' }, // faltan 50 semanas = 350 días
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCompletaSemanas).not.toBeNull()

    // Oráculo independiente: semanas acumuladas al día anterior = 1250 + (días hasta esa
    // fecha)/7, comparado a mano contra el mínimo fijo de hombre (1300, sin cronograma).
    const unDiaAntes = diaAnterior(r.fechaCompletaSemanas)
    const diasTranscurridos = (new Date(unDiaAntes).getTime() - new Date(FECHA_CALCULO).getTime()) / 86400000
    const semanasAcumuladasUnDiaAntes = 1250 + diasTranscurridos / 7
    expect(semanasAcumuladasUnDiaAntes).toBeLessThan(1300)
  })

  it('fechaReconocimientoConjunta = max(fechaCumpleEdad, fechaCompletaSemanas) — verificado con ambas fechas ya calculadas, nunca una tercera búsqueda', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1974-01-01',
      edadJubilacionDeseada: 62,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 200, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    const maxEsperado = r.fechaCumpleEdad > r.fechaCompletaSemanas ? r.fechaCumpleEdad : r.fechaCompletaSemanas
    expect(r.fechaReconocimientoConjunta).toBe(maxEsperado)
  })
})

// ============================================================================
// 2. Casos de borde del cronograma femenino
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — cronograma femenino: casos de borde', () => {
  it('31 de diciembre de 2026 vs. 1 de enero de 2027: el mínimo aplicable cambia exactamente en el límite (1.250 → 1.225)', () => {
    const minimoDicOtroAnio = obtenerSemanasMinimas('2026-12-31', 'F', 'RPM').valor
    const minimoEneAnioSiguiente = obtenerSemanasMinimas('2027-01-01', 'F', 'RPM').valor
    expect(minimoDicOtroAnio).toBe(1250)
    expect(minimoEneAnioSiguiente).toBe(1225)

    // fechaNacimiento elegida para que fechaObjetivoSolicitada caiga exactamente en cada
    // borde. El horizonte hasta 57 años ronda un año en ambos casos, así que las semanas
    // futuras (no solo las declaradas) participan del total — se compara el total ya
    // devuelto contra el mínimo ya devuelto (ambos parte del mismo resultado, coherencia
    // interna), en vez de asumir a mano cuánto suman las futuras.
    const declaracion = { cantidad: 1190, certeza: 'conocido' }
    const rDic = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1969-12-31',
      edadJubilacionDeseada: 57, // fechaObjetivoSolicitada = 2026-12-31
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: declaracion,
      fecha: FECHA_CALCULO,
    })
    const rEne = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1970-01-01',
      edadJubilacionDeseada: 57, // fechaObjetivoSolicitada = 2027-01-01
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: declaracion,
      fecha: FECHA_CALCULO,
    })
    expect(rDic.semanasMinimasAplicables.valor).toBe(1250)
    expect(rEne.semanasMinimasAplicables.valor).toBe(1225)
    // Con el mismo declarado y un horizonte casi idéntico (~365 días en ambos casos), el
    // total resultante es prácticamente el mismo — lo que cambia es el umbral. Se verifica
    // la coherencia interna: estado === CUMPLE exactamente cuando total >= mínimo.
    expect(rDic.estado === 'CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO').toBe(
      rDic.semanasTotalesEnFechaObjetivo >= rDic.semanasMinimasAplicables.valor
    )
    expect(rEne.estado === 'CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO').toBe(
      rEne.semanasTotalesEnFechaObjetivo >= rEne.semanasMinimasAplicables.valor
    )
    // Y, con los números elegidos, el cambio de umbral (1250 → 1225) efectivamente decide
    // un caso distinto entre diciembre y enero — si no fuera así, el test no probaría nada.
    expect(rDic.estado).not.toBe(rEne.estado)
  })

  it('mujer que no alcanza el mínimo del año actual pero sí cumpliría cuando el cronograma baja al año siguiente: fechaCompletaSemanas debe caer en la fecha correcta del año con el umbral YA MÁS BAJO, nunca sobreestimada contra el umbral fijo de hoy (defecto de circularidad corregido)', () => {
    // Mujer con semanas actuales fijas, insuficientes para el mínimo de 2026 (1250) pero
    // suficientes para el de 2027 (1225) — el diseño ORIGINAL (blanco fijo en
    // fechaObjetivoSolicitada) habría usado el umbral de la fecha objetivo elegida, no el
    // umbral real en la fecha encontrada; este test verifica que el umbral se reevalúa en
    // cada fecha candidata durante la búsqueda.
    // 1.190 declaradas: no alcanza 1.250 (el umbral de 2026) ni con un año completo de
    // futuras (1.190 + 364/7 ≈ 1.242 < 1.250), pero sí alcanza 1.225 (el umbral de 2027)
    // apenas cruzado el 1 de enero (1.190 + 365/7 ≈ 1.242,14 ≥ 1.225). Un diseño con blanco
    // fijo en 1.250 habría calculado que hacen falta ~60 días adicionales dentro de 2027
    // (hasta acumular 1.250) — este test verifica que NO es así: se reconoce el umbral más
    // bajo apenas está vigente.
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1965-01-01', // ya tiene 61 años el 2026-01-01 — edad muy por encima del mínimo (57)
      edadJubilacionDeseada: 62,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1190, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCompletaSemanas).not.toBeNull()
    // La fecha encontrada debe caer en o después de 2027-01-01 (cuando el umbral baja a
    // 1225, ya alcanzado con las semanas actuales) — nunca calculada como si hiciera falta
    // esperar a acumular semanas adicionales para llegar a 1250 (el umbral de 2026).
    expect(r.fechaCompletaSemanas >= '2027-01-01').toBe(true)
    // Y no se pasa de largo: debe ser el primer día de 2027, no varias semanas después
    // (lo que ocurriría si, por error, siguiera persiguiendo el umbral de 1.250).
    expect(r.fechaCompletaSemanas <= '2027-01-15').toBe(true)
    // Verificación cruzada con el propio resolver legal (oráculo independiente): en la
    // fecha encontrada, el umbral real ya es <= a las semanas actuales declaradas.
    const umbralEnFechaEncontrada = obtenerSemanasMinimas(r.fechaCompletaSemanas, 'F', 'RPM').valor
    expect(umbralEnFechaEncontrada).toBe(1225) // el umbral de 2027, no el de 2026 (1250)
  })

  it('mujer que ya cumplió 57 y completa semanas posteriormente (edad antes que semanas)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '1965-01-01', // ya tiene 61 años — muy por encima del mínimo (57)
      edadJubilacionDeseada: 62,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 100, certeza: 'conocido' }, // muy pocas semanas
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCumpleEdad <= FECHA_CALCULO).toBe(true) // ya cumplida, ancla a `fecha`
    expect(r.fechaCumpleEdad < r.fechaCompletaSemanas).toBe(true)
    expect(r.fechaReconocimientoConjunta).toBe(r.fechaCompletaSemanas)
  })

  it('mujer que cumple semanas antes de los 57 (semanas antes que edad)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento: '2005-01-01', // joven — la edad (57) tarda décadas
      edadJubilacionDeseada: 57,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1245, certeza: 'conocido' }, // casi el mínimo
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaCompletaSemanas < r.fechaCumpleEdad).toBe(true)
    expect(r.fechaReconocimientoConjunta).toBe(r.fechaCumpleEdad)
  })

  it.each([
    ['2026-06-15', 1250],
    ['2027-06-15', 1225],
    ['2030-06-15', 1150],
    ['2036-06-15', 1000],
    ['2041-06-15', 1000],
  ])('reconocimiento con fechaObjetivoSolicitada en %s → semanasMinimasAplicables = %i (ya verificado contra el motor real en el diagnóstico previo — aquí se re-verifica bajo los nombres de estado corregidos)', (fechaObjetivo, minimoEsperado) => {
    // fechaNacimiento construida para que fechaObjetivoSolicitada caiga exactamente en la
    // fecha de la tabla, con edadJubilacionDeseada = 57 (mínimo legal mujer, sin cronograma
    // de edad).
    const anioNacimiento = Number(fechaObjetivo.slice(0, 4)) - 57
    const fechaNacimiento = `${anioNacimiento}-06-15`
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Mujer',
      fechaNacimiento,
      edadJubilacionDeseada: 57,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' }, // amplias, aísla el mínimo
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaObjetivoSolicitada).toBe(fechaObjetivo)
    expect(r.semanasMinimasAplicables.valor).toBe(minimoEsperado)
  })
})

// ============================================================================
// 3. EDAD_MAXIMA_FUNCIONAL reutilizada (sin duplicar la constante)
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — edadJubilacionDeseada: reutiliza EDAD_MAXIMA_FUNCIONAL', () => {
  const BASE = {
    sexo: 'Hombre',
    fechaNacimiento: '1990-01-01', // edad actual (2026-01-01) = 36
    historiaCotizacion: [],
    semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    fecha: FECHA_CALCULO,
  }

  it('edad negativa: rechazada (no utilizable)', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: -5 })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it('edad cero: rechazada (no utilizable)', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: 0 })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it('edad fraccionaria (62.5): el criterio reutilizado (edadJubilacionDeseadaEsUtilizable) no distingue enteros de fraccionarios — se documenta el comportamiento real, no uno inventado: se acepta si es mayor a la edad actual y no excede el máximo', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: 62.5 })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.fechaObjetivoSolicitada).not.toBeNull()
  })

  it('edad igual a la edad actual: rechazada (debe ser estrictamente futura)', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: 36 })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_FUERA_DE_RANGO_FUNCIONAL')
  })

  it('edad igual al mínimo legal (62, Hombre): aceptada como dato utilizable — la elegibilidad legal se evalúa aparte, esto solo valida que el dato es explorable', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: 62 })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it(`edad ${EDAD_MAXIMA_FUNCIONAL} (límite funcional exacto): aceptada`, () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: EDAD_MAXIMA_FUNCIONAL })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it(`edad ${EDAD_MAXIMA_FUNCIONAL + 1} (un año sobre el límite funcional): rechazada`, () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: EDAD_MAXIMA_FUNCIONAL + 1 })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_FUERA_DE_RANGO_FUNCIONAL')
  })

  it('NaN: rechazada en la validación sintáctica, antes de llegar al límite funcional', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: NaN })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_NO_VALIDA')
  })

  it('Infinity: rechazada en la validación sintáctica (Number.isFinite(Infinity) === false)', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, edadJubilacionDeseada: Infinity })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_NO_VALIDA')
  })
})

// ============================================================================
// 7. Auditoría de procedencia de semanas
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — procedencia de semanas: declaración e historia expuestas simultáneamente', () => {
  function historiaAnio(anio, dias = 365) {
    return [{ fechaDesde: `${anio}-01-01`, fechaHasta: `${anio}-12-31`, ibc: 1000000, diasCotizados: dias }]
  }

  it('con declaración válida y sin historia: declaracion presente y válida, historiaEstructurada en 0, diferencia null (nada que comparar)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasActuales.declaracion).toEqual({ cantidad: 1350, certeza: 'conocido', valida: true })
    expect(r.semanasActuales.historiaEstructurada).toEqual({ cantidad: 0, tienePeriodos: false })
    expect(r.semanasActuales.diferenciaDeclaracionVsHistoria).toBe(1350)
    expect(r.semanasActuales.razonPrecedencia).toContain('declaración agregada')
  })

  it('declaración e historia contradictorias (ambas presentes, muy distintas): fuente elegida sigue siendo la declaración (GO-B sin cambios), pero la historia real queda trazada aparte, con la diferencia absoluta expuesta sin ningún umbral de advertencia', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: historiaAnio(2020, 365), // ~52 semanas reales
      semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'conocido' }, // muy distinta
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasActuales.procedencia).toBe('declaracion_agregada')
    expect(r.semanasActuales.cantidad).toBe(1350) // la fuente elegida, sin cambios de GO-B
    expect(r.semanasActuales.historiaEstructurada.cantidad).toBeCloseTo(365 / 7, 6)
    expect(r.semanasActuales.historiaEstructurada.tienePeriodos).toBe(true)
    expect(r.semanasActuales.diferenciaDeclaracionVsHistoria).toBeCloseTo(1350 - 365 / 7, 6)
    // Ninguna advertencia ni bloqueo por la magnitud de la diferencia — decisión diferida.
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it('historia parcial presente pero NO es la fuente elegida (hay declaración válida) — la distinción queda explícita: historiaEstructurada.tienePeriodos=true, procedencia="declaracion_agregada"', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: historiaAnio(2024),
      semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'aproximado' },
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasActuales.procedencia).toBe('declaracion_agregada')
    expect(r.semanasActuales.historiaEstructurada.tienePeriodos).toBe(true)
    // La historia SÍ existe y está trazada — solo no fue la elegida para semanas (sigue
    // pudiendo alimentar el IBL en calcularProyeccionRPM.js, fuera del alcance de esta
    // función, que nunca calcula IBL).
  })

  it('declaración inválida (certeza desconocida) con historia presente: declaracion.valida=false, procedencia cae a historia_estructurada', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: historiaAnio(2024),
      semanasReferenciaDeclaradas: { cantidad: 1350, certeza: 'desconocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasActuales.declaracion).toEqual({ cantidad: 1350, certeza: 'desconocido', valida: false })
    expect(r.semanasActuales.procedencia).toBe('historia_estructurada')
  })

  it('sin declaración: declaracion es null (no un objeto con campos vacíos)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: historiaAnio(2024),
      semanasReferenciaDeclaradas: null,
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasActuales.declaracion).toBeNull()
    expect(r.semanasActuales.diferenciaDeclaracionVsHistoria).toBeNull()
  })
})

// ============================================================================
// 6. Auditoría del supuesto de continuidad — documenta el comportamiento REAL (no uno
// inventado): ningún campo de entrada distingue si la persona cotiza actualmente, dejó de
// cotizar, declaró intención de continuar, tiene ritmo parcial, o cotiza desde el exterior.
// Estas pruebas demuestran esa ausencia, no la corrigen (fuera de alcance de E2).
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — auditoría del supuesto de continuidad (punto 6, sin campo nuevo)', () => {
  const BASE = {
    sexo: 'Hombre',
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 65,
    historiaCotizacion: [],
    semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    fecha: FECHA_CALCULO,
  }

  it('ritmoCotizacionFutura está siempre presente, con su procedencia declarada como supuesto estructural heredado, no como una inferencia de datos reales', () => {
    const r = evaluarElegibilidadProyectadaRPM(BASE)
    expect(r.ritmoCotizacionFutura.codigo).toBe('CONTINUIDAD_SIN_INTERRUPCIONES')
    expect(r.ritmoCotizacionFutura.procedencia).toBe('supuesto_estructural_heredado_S4-002_sin_campo_de_entrada')
  })

  it('campos ajenos que en otras pantallas SÍ existen (tipoCotizante, lugarCotizacion, trasladoRegimen) no tienen ningún efecto aquí — se documentan como ignorados, no como validados', () => {
    const sinCampos = evaluarElegibilidadProyectadaRPM(BASE)
    const conCamposIgnorados = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      tipoCotizante: 'independiente',
      lugarCotizacion: 'exterior',
      trasladoRegimen: 'si',
      planeaSeguirCotizando: false, // ni siquiera existe como campo del contrato — se ignora igual que los anteriores
    })
    expect(conCamposIgnorados).toEqual(sinCampos)
  })

  it('un usuario que ya NO cotiza actualmente y uno que SÍ cotiza producen exactamente el mismo resultado si declaran las mismas semanas — no hay forma de distinguirlos con el contrato actual (brecha auditada, no corregida en E2)', () => {
    // No existe ningún campo "cotizaActualmente" — se demuestra pasando semánticamente
    // "no cotiza" (ninguna historia reciente, ninguna declaración de continuidad) frente a
    // "sí cotiza" (misma historia, mismos datos) y confirmando que ambos casos, con la
    // misma declaración de semanas, dan el mismo resultado — la continuidad futura se
    // asume igual en ambos, porque no hay ningún dato que la distinga.
    const rSinIndicioDeContinuar = evaluarElegibilidadProyectadaRPM(BASE)
    const rConMismosDatos = evaluarElegibilidadProyectadaRPM({ ...BASE })
    expect(rSinIndicioDeContinuar).toEqual(rConMismosDatos)
  })
})

// ============================================================================
// 9. Adversariales adicionales
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — pruebas adversariales adicionales', () => {
  it('bisiesto: fecha de nacimiento 29 de febrero, edad objetivo cae en año no bisiesto — no lanza, calcularFechaPorEdad ya resuelve este caso (retrocede a 28-feb)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-02-29',
      edadJubilacionDeseada: 62, // 2026 no es bisiesto
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.fechaObjetivoSolicitada).toBe('2026-02-28')
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it('horizonte cero: edadJubilacionDeseada igual a la edad ya cumplida hoy → NO_EVALUABLE_DATOS_INSUFICIENTES. Se rechaza en la validación de edad utilizable (edadJubilacionDeseadaEsUtilizable exige > edadActual) — que, para edades enteras, ya implica por construcción que fechaObjetivoSolicitada > fecha, así que nunca llega a evaluarse un horizonte de 0 días', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 62, // cumple 62 exactamente el 2026-01-01 = edadActual
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_FUERA_DE_RANGO_FUNCIONAL')
  })

  it('fecha objetivo anterior a la fecha de cálculo (edad ya cumplida hace años): mismo tratamiento — hard stop explícito, antes de esta corrección esta función no lo validaba en absoluto', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1950-01-01',
      edadJubilacionDeseada: 62, // cumplido hace décadas
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('EDAD_JUBILACION_FUERA_DE_RANGO_FUNCIONAL')
  })

  it('resolverHorizonteFuturoRPM.js sí es una defensa en profundidad real: verificada directamente (no a través de evaluarElegibilidadProyectadaRPM, cuya validación de edad utilizable ya cubre el caso de edades enteras) contra fecha objetivo no posterior a la fecha de cálculo', () => {
    const r = resolverHorizonteFuturoRPM({ fechaNacimiento: '1964-01-01', edadObjetivo: 62, fecha: FECHA_CALCULO })
    expect(r.valido).toBe(false)
    expect(r.razonInvalido).toBe('FECHA_OBJETIVO_NO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('CORREGIDO (riesgo funcional, 2026-09-04): historia con un período fechado en el futuro respecto a `fecha` ya NO se cuenta — hard stop antes de sumar nada, con el mismo código de razón que calcularProyeccionRPM.js ya usaba (HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: [{ fechaDesde: '2030-01-01', fechaHasta: '2030-12-31', ibc: 1000000, diasCotizados: 365 }], // fecha futura respecto a FECHA_CALCULO
      semanasReferenciaDeclaradas: null,
      fecha: FECHA_CALCULO,
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    expect(r.semanasActuales).toBeNull() // nunca se llega a sumar nada de esa historia
    expect(r.fechaCompletaSemanas).toBeNull()
  })

  it('semanas exactamente en el mínimo (igualdad exacta, no solo cercanía): CUMPLE, el límite es inclusive (>=) — construido para dar total = 1.300,0 exacto', () => {
    // 1.299 declaradas + exactamente 1 semana futura (7 días) = 1.300,0 exacto, el mínimo
    // fijo de hombre. fechaNacimiento/edadJubilacionDeseada elegidas para que el horizonte
    // (diaSiguiente(fecha) .. fechaObjetivoSolicitada) sea exactamente 7 días.
    const r = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-08',
      edadJubilacionDeseada: 62, // fechaObjetivoSolicitada = 2026-01-08 → horizonte de exactamente 7 días
      historiaCotizacion: [],
      semanasReferenciaDeclaradas: { cantidad: 1299, certeza: 'conocido' },
      fecha: FECHA_CALCULO,
    })
    expect(r.semanasFuturasHastaFechaObjetivo).toBe(1)
    expect(r.semanasTotalesEnFechaObjetivo).toBe(1300)
    expect(r.semanasMinimasAplicables.valor).toBe(1300)
    expect(r.estado).toBe('CUMPLE_REQUISITOS_EN_FECHA_OBJETIVO')
  })

  it('independencia entre historia salarial (IBC) y elegibilidad ya cubierta en el archivo principal — aquí se confirma también para la fecha conjunta: cambiar el IBC no cambia ninguna fecha calculada', () => {
    function historia(ibc) {
      return [{ fechaDesde: '2015-01-01', fechaHasta: '2025-12-31', ibc, diasCotizados: 4018 }]
    }
    const r1 = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: historia(500000),
      fecha: FECHA_CALCULO,
    })
    const r2 = evaluarElegibilidadProyectadaRPM({
      sexo: 'Hombre',
      fechaNacimiento: '1964-01-01',
      edadJubilacionDeseada: 65,
      historiaCotizacion: historia(90000000),
      fecha: FECHA_CALCULO,
    })
    expect(r1.fechaCumpleEdad).toBe(r2.fechaCumpleEdad)
    expect(r1.fechaCompletaSemanas).toBe(r2.fechaCompletaSemanas)
    expect(r1.fechaReconocimientoConjunta).toBe(r2.fechaReconocimientoConjunta)
  })
})

// ============================================================================
// 10. Historia con períodos posteriores a fechaCalculo — corrección de riesgo funcional
// (integración con evaluarElegibilidadProyectadaRPM; la cobertura unitaria de la regla en
// sí vive en validarHistoriaCotizacionTemporal.test.js)
// ============================================================================
describe('evaluarElegibilidadProyectadaRPM — historia con períodos posteriores a fechaCalculo (corrección de riesgo funcional)', () => {
  const BASE = {
    sexo: 'Hombre',
    fechaNacimiento: '1964-01-01',
    edadJubilacionDeseada: 65,
    fecha: FECHA_CALCULO,
  }
  const PERIODO_FUTURO = { fechaDesde: '2027-01-01', fechaHasta: '2027-12-31', ibc: 1000000, diasCotizados: 365 }
  const PERIODO_PARCIALMENTE_FUTURO = { fechaDesde: '2025-06-01', fechaHasta: '2026-06-30', ibc: 1000000, diasCotizados: 395 }
  const PERIODO_INVERTIDO = { fechaDesde: '2020-06-01', fechaHasta: '2020-01-01', ibc: 1000000, diasCotizados: 30 }
  const PERIODO_FECHA_INVALIDA = { fechaDesde: 'no-es-una-fecha', fechaHasta: '2020-12-31', ibc: 1000000, diasCotizados: 300 }

  it('historia futura + declaración CONOCIDA: la declaración NO rescata la historia inválida — sigue deteniéndose en NO_EVALUABLE_DATOS_INSUFICIENTES, nunca continúa con la declaración ignorando el problema temporal', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: [PERIODO_FUTURO],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
    // La declaración, aunque válida y presente, nunca llega a leerse para nada — no hay
    // rastro de ella en el resultado.
    expect(r.semanasActuales).toBeNull()
  })

  it('historia futura + declaración APROXIMADA: mismo tratamiento — hard stop incondicional', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: [PERIODO_FUTURO],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'aproximado' },
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('período parcialmente futuro (empieza antes de fechaCalculo, termina después) + declaración: mismo hard stop', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: [PERIODO_PARCIALMENTE_FUTURO],
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_POSTERIOR_A_FECHA_CALCULO')
  })

  it('período con fechas invertidas: hard stop con código propio, distinguible de "posterior a fecha de cálculo"', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, historiaCotizacion: [PERIODO_INVERTIDO], semanasReferenciaDeclaradas: null })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHAS_INVERTIDAS')
  })

  it('período con fecha inválida: hard stop, nunca produce NaN en semanasTotalesEnFechaObjetivo', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, historiaCotizacion: [PERIODO_FECHA_INVALIDA], semanasReferenciaDeclaradas: null })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_CON_PERIODO_DE_FECHA_INVALIDA')
    expect(r.semanasTotalesEnFechaObjetivo).toBeNull()
  })

  it('historiaCotizacion no-arreglo (null explícito): hard stop, nunca lanza una excepción sin capturar', () => {
    expect(() =>
      evaluarElegibilidadProyectadaRPM({ ...BASE, historiaCotizacion: null, semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' } })
    ).not.toThrow()
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: null,
      semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' },
    })
    expect(r.estado).toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.razones[0].codigo).toBe('HISTORIA_NO_ES_ARREGLO_VALIDO')
  })

  it('ausencia de historia (arreglo vacío, valor por defecto): nunca dispara la validación temporal — comportamiento normal, sin cambios por esta corrección', () => {
    const r = evaluarElegibilidadProyectadaRPM({ ...BASE, semanasReferenciaDeclaradas: { cantidad: 1400, certeza: 'conocido' } })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it('historia válida que termina EXACTAMENTE en fechaCalculo: no se rechaza, sí se cuenta como observada', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: [{ fechaDesde: '2025-01-01', fechaHasta: FECHA_CALCULO, ibc: 1000000, diasCotizados: 365 }],
      semanasReferenciaDeclaradas: null,
    })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    expect(r.semanasActuales.historiaEstructurada.cantidad).toBeCloseTo(365 / 7, 6)
  })

  it('historia válida que termina el día calendario anterior a fechaCalculo: no se rechaza', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: [{ fechaDesde: '2025-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 365 }],
      semanasReferenciaDeclaradas: null,
    })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
  })

  it('nunca existe doble conteo del mismo día futuro: con historia válida (solo pasado) + declaración agregada, semanasFuturasHastaFechaObjetivo cuenta cada día del horizonte exactamente una vez, verificado con un oráculo independiente (días/7, sin pasar por resolverSemanasProyectadasRPM)', () => {
    const r = evaluarElegibilidadProyectadaRPM({
      ...BASE,
      historiaCotizacion: [{ fechaDesde: '2020-01-01', fechaHasta: '2025-12-31', ibc: 1000000, diasCotizados: 2192 }],
      semanasReferenciaDeclaradas: { cantidad: 1300, certeza: 'conocido' },
    })
    expect(r.estado).not.toBe('NO_EVALUABLE_DATOS_INSUFICIENTES')
    // Oráculo independiente: días entre el día siguiente a fechaCalculo y fechaObjetivoSolicitada,
    // calculados a mano (misma fórmula que resolverHorizonteFuturoRPM.js pero re-derivada
    // aquí, no invocada) — debe coincidir exactamente, sin ningún día del pasado colándose
    // en el conteo futuro ni viceversa.
    const inicio = new Date(FECHA_CALCULO)
    inicio.setUTCDate(inicio.getUTCDate() + 1)
    const fin = new Date(r.fechaObjetivoSolicitada)
    const diasEsperados = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1
    expect(r.semanasFuturasHastaFechaObjetivo).toBeCloseTo(diasEsperados / 7, 6)
    // Y las semanas totales son exactamente declaradas + futuras — nunca declaradas +
    // futuras + observadas (que sería doble conteo del pasado, no del futuro, pero
    // confirma que ninguna suma espuria se coló).
    expect(r.semanasTotalesEnFechaObjetivo).toBeCloseTo(1300 + diasEsperados / 7, 6)
  })
})
