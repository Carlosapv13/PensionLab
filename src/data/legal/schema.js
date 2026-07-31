/**
 * Esquema de data/legal/versions/*.json
 *
 * Cada archivo de versión representa un paquete normativo (ej. reforma-2024) y contiene
 * una lista de entradas individualmente trazables: cada valor legal usado en un cálculo
 * debe poder citarse por sí solo (id, artículo, fuente, vigencia propios), sin depender
 * de metadata compartida a nivel de archivo.
 *
 * IMPORTANTE — `vigente-2026.json` debe representar únicamente la normativa efectivamente
 * aplicable. La reforma pensional 2024 (Ley 2381 de 2024) está suspendida por la Corte
 * Constitucional (Auto 841 de 2025) y NO debe mezclarse en `vigente-2026.json`; sus
 * entradas, si se necesitan, van en su propio archivo de versión (ej. reforma-2024.json),
 * separado y sin resolverse como vigente hasta que exista fallo definitivo.
 *
 * @typedef {Object} LegalRuleEntry
 * @property {string} id       - Id único, referenciado desde CalculationTrace.normasUsadasIds
 *   y desde Explanation.normas[].id
 * @property {string} campo    - Qué concepto regula (ej. 'tasaCotizacion', 'edadPensionMujer',
 *   'edadPensionHombre', 'semanasMinimasPensionHombre', 'semanasMinimasPensionMujer', 'smlv').
 *   Nota: 'semanasMinimas' NO existe como campo único — ver semanasMinimasPensionHombre/Mujer.
 * @property {*} valor         - Valor normativo (número o string, según el campo)
 * @property {string} unidad   - Unidad del valor (ej. 'COP', '%', 'semanas', 'años')
 * @property {string} fuente   - Fuente legal (ej. 'Ley 100 de 1993')
 * @property {string} articulo - Artículo específico que sustenta el valor
 * @property {{desde: string, hasta: (string|null)}} vigencia - Ventana de validez legal
 * @property {number} [periodo] - Año al que corresponde el valor, solo para campos que se
 *   actualizan periódicamente (ej. smlv se decreta cada año; edadPensionMujer no lo necesita
 *   porque no cambia anualmente). Distinto de `vigencia`: `vigencia` es la ventana legal en la
 *   que el valor rige; `periodo` identifica a qué año específico corresponde ese valor.
 * @property {('firme'|'transitorio'|'suspendido')} [estadoJuridico] - Solo para campos bajo
 *   incertidumbre jurídica activa (ej. un decreto suspendido provisionalmente por el Consejo
 *   de Estado, como el SMLV 2026). Si el campo está ausente se asume 'firme'.
 *   `resolverReglasVigentes()` EXCLUYE por defecto cualquier entrada que no sea 'firme' —
 *   debe pasarse `{ permitirTransitorio: true }` explícitamente para incluirlas, a sabiendas
 *   del riesgo. Este mecanismo es general, no exclusivo de SMLV: cualquier campo futuro bajo
 *   litigio o vigencia transitoria debe usar este campo en vez de inventar un manejo ad-hoc.
 *
 * Semanas mínimas de pensión — campo dividido por sexo, y para mujeres con cronograma
 * progresivo (Sentencia C-197 de 2023): en vez de forzar un solo número en `valor`, la
 * entrada vigente desde 2026-01-01 para `semanasMinimasPensionMujer` usa un `valor`
 * estructurado:
 *
 *   { tipo: 'cronograma-lineal', base: number, decrementoAnual: number, piso: number, fechaInicio: string }
 *
 * La entrada anterior a 2026-01-01 (antes de que la sentencia surtiera efectos) sigue
 * usando un `valor` numérico plano (1300, igual que hombres) con su propia `vigencia.hasta`.
 * `resolverReglasVigentes(fecha)` ya elige la entrada correcta por `vigencia`; no hace falta
 * lógica especial ahí — el único cálculo real (interpolar el cronograma) vive en
 * `obtenerSemanasMinimas`, ver data/legal/index.js.
 *
 * @typedef {Object} LegalVersionFile
 * @property {string} id            - Id de la versión (ej. 'vigente-2026')
 * @property {string} descripcion
 * @property {LegalRuleEntry[]} entradas
 * @property {('borrador'|'publicado')} [estado] - 'borrador' marca el archivo como no
 *   definitivo (ej. mientras algún campo sigue bajo revisión); 'publicado' u omitido implica
 *   listo para usarse sin reservas.
 * @property {boolean} [listoParaProduccion] - false mientras el archivo tenga campos
 *   pendientes de resolver (ver `notas`).
 * @property {string} [notas] - Explicación libre de qué falta para pasar a 'publicado'.
 */
