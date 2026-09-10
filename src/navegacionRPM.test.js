import { describe, it, expect } from 'vitest'
import { siguienteVistaTrasBaseCotizacion, destinoTrasEdicionDesdeResumenRPM } from './navegacionRPM.js'

describe('siguienteVistaTrasBaseCotizacion — UX-RPM-01', () => {
  it('RPM salta directo a proyectaTuPensionRPM, sin pasar por queDeterminaResultado/historiaCotizacionRPM/exploraTuProyeccionRPM', () => {
    expect(siguienteVistaTrasBaseCotizacion('RPM')).toBe('proyectaTuPensionRPM')
  })

  it('RAIS conserva el recorrido existente sin cambios (queDeterminaResultado, que a su vez bifurca a RAIS)', () => {
    expect(siguienteVistaTrasBaseCotizacion('RAIS')).toBe('queDeterminaResultado')
  })

  it('regimenActual desconocido o sin declarar sigue el mismo recorrido que RAIS — esta función solo especializa RPM', () => {
    expect(siguienteVistaTrasBaseCotizacion('desconocido')).toBe('queDeterminaResultado')
    expect(siguienteVistaTrasBaseCotizacion(null)).toBe('queDeterminaResultado')
  })

  it('EVIDENCIA (checkpoint E4-C1, revisión correctiva): para RPM, baseCotizacion.onContinuar ya es incondicionalmente proyectaTuPensionRPM — por eso "editar IBC actual" desde el resumen regresa directo SIN necesitar destinoTrasEdicionDesdeResumenRPM ni ningún contexto nuevo', () => {
    expect(siguienteVistaTrasBaseCotizacion('RPM')).toBe('proyectaTuPensionRPM')
  })
})

describe('destinoTrasEdicionDesdeResumenRPM — checkpoint E4-C1, revisión correctiva "Retorno controlado desde el resumen" (2026-09-10)', () => {
  describe('navegación normal del onboarding (contexto inactivo) — comportamiento bit-idéntico al de antes de este checkpoint, para cualquier pantalla', () => {
    it.each([
      ['situacionPensional (destino normal de datosIniciales)', 'situacionPensional'],
      ['historialLaboral (destino normal de situacionPensional)', 'historialLaboral'],
      ['historiaPensional (destino normal de informacionPensional)', 'historiaPensional'],
      ['baseCotizacion (destino normal de indiciosTransicion)', 'baseCotizacion'],
    ])('con regresarAProyeccionTrasEdicionResumen=false, devuelve destinoNormal sin tocarlo: %s', (_, destinoNormal) => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: false,
          regimenActual: 'RPM',
          destinoNormal,
        })
      ).toBe(destinoNormal)
    })

    it('contexto inactivo, incluso con regimenActual RPM: nunca salta a proyectaTuPensionRPM por sí solo', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: false,
          regimenActual: 'RPM',
          destinoNormal: 'baseCotizacion',
        })
      ).toBe('baseCotizacion')
    })
  })

  describe('edición de semanas declaradas (informacionPensional) — retorno directo', () => {
    it('contexto activo + RPM: regresa directo a proyectaTuPensionRPM, saltando historiaPensional/primeraLectura/indiciosTransicion/baseCotizacion', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: 'RPM',
          destinoNormal: 'historiaPensional',
        })
      ).toBe('proyectaTuPensionRPM')
    })
  })

  describe('edición de información de traslado (indiciosTransicion) — retorno directo', () => {
    it('contexto activo + RPM: regresa directo a proyectaTuPensionRPM, saltando baseCotizacion', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: 'RPM',
          destinoNormal: 'baseCotizacion',
        })
      ).toBe('proyectaTuPensionRPM')
    })
  })

  describe('cambio de fecha de nacimiento (datosIniciales) — retorno directo y recálculo', () => {
    it('contexto activo + RPM: regresa directo a proyectaTuPensionRPM — esa pantalla recalcula edadActual/horizonte/elegibilidad en cada render, sin necesitar ningún chequeo adicional aquí', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: 'RPM',
          destinoNormal: 'situacionPensional',
        })
      ).toBe('proyectaTuPensionRPM')
    })
  })

  describe('cambio de régimen actual (situacionPensional) — caso especial: puede invalidar el retorno', () => {
    it('sigue siendo RPM: regresa directo a proyectaTuPensionRPM con los datos compatibles', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: 'RPM',
          destinoNormal: 'historialLaboral',
        })
      ).toBe('proyectaTuPensionRPM')
    })

    it('EVIDENCIA CRÍTICA: cambia a RAIS — NUNCA regresa a proyectaTuPensionRPM (que ni siquiera sabe calcular RAIS); continúa por el flujo RAIS correspondiente (destinoNormal)', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: 'RAIS',
          destinoNormal: 'historialLaboral',
        })
      ).toBe('historialLaboral')
    })

    it('cambia a un valor no reconocido ("desconocido" o null): tampoco regresa a la proyección RPM — mismo criterio defensivo que siguienteVistaTrasBaseCotizacion', () => {
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: 'desconocido',
          destinoNormal: 'historialLaboral',
        })
      ).toBe('historialLaboral')
      expect(
        destinoTrasEdicionDesdeResumenRPM({
          regresarAProyeccionTrasEdicionResumen: true,
          regimenActual: null,
          destinoNormal: 'historialLaboral',
        })
      ).toBe('historialLaboral')
    })
  })

  describe('pureza — no depende de nada más que sus tres argumentos, mismo resultado siempre ante la misma entrada (proxy de "no toca otros datos del expediente")', () => {
    it('llamadas repetidas con los mismos argumentos devuelven siempre el mismo resultado', () => {
      const args = { regresarAProyeccionTrasEdicionResumen: true, regimenActual: 'RPM', destinoNormal: 'baseCotizacion' }
      const primeraLlamada = destinoTrasEdicionDesdeResumenRPM(args)
      const segundaLlamada = destinoTrasEdicionDesdeResumenRPM(args)
      expect(primeraLlamada).toBe(segundaLlamada)
      expect(primeraLlamada).toBe('proyectaTuPensionRPM')
    })
  })

  describe('limpieza del contexto — simulación de "ya se consumió" (App.jsx limpia regresarAProyeccionTrasEdicionResumen inmediatamente después de leer este resultado)', () => {
    it('una segunda llamada con el contexto ya en false (como quedaría tras limpiarlo) vuelve a la navegación normal, incluso con el mismo destinoNormal de una edición anterior', () => {
      const destinoConEdicion = destinoTrasEdicionDesdeResumenRPM({
        regresarAProyeccionTrasEdicionResumen: true,
        regimenActual: 'RPM',
        destinoNormal: 'historiaPensional',
      })
      expect(destinoConEdicion).toBe('proyectaTuPensionRPM')

      // Tras "limpiar" el contexto (regresarAProyeccionTrasEdicionResumen: false, como hace
      // App.jsx inmediatamente después), la MISMA pantalla vuelve a comportarse como
      // navegación normal del onboarding — el contexto nunca queda "colgado".
      const destinoTrasLimpiar = destinoTrasEdicionDesdeResumenRPM({
        regresarAProyeccionTrasEdicionResumen: false,
        regimenActual: 'RPM',
        destinoNormal: 'historiaPensional',
      })
      expect(destinoTrasLimpiar).toBe('historiaPensional')
    })
  })
})
