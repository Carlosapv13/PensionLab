import { describe, it, expect } from 'vitest'
import { siguienteVistaTrasBaseCotizacion } from './navegacionRPM.js'

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
})
