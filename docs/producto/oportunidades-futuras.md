# Oportunidades futuras de PensionLab

Registro vivo de ideas de producto que surgen durante el desarrollo pero que
**no pertenecen al alcance actual** — ni al Sprint en curso, ni a un backlog
comprometido. Cada entrada documenta el origen y la forma que podría tomar la
idea, sin decidir todavía si ni cuándo se construye. **No es un backlog:**
nada aquí está priorizado ni aprobado para implementación — es un lugar para
no perder la idea, no una promesa de construirla.

---

## Formateo monetario en vivo mientras se escribe

**Origen de la idea:** surgió durante el mini-Slice "Formato monetario
consistente en campos de entrada" (revisión UX del MVP): los 5 campos
monetarios de PensionLab (`BaseCotizacion.jsx` ×2, `ExploraTuProyeccion.jsx`
×3, todos vía `useCampoMonetario.js`) hoy solo muestran separadores de miles
al perder el foco — mientras la persona escribe, ve dígitos sin formato
(ej. `7000000`). La idea es que, eventualmente, se vea formateado durante
toda la edición (ej. `$ 7.000.000`), no solo al terminar.

**Decisión adoptada para el MVP actual:** se implementa únicamente el
prefijo visual `$` fijo (fuera del valor editable), conservando el
comportamiento actual de separadores solo al perder el foco. El formateo en
vivo se pospone deliberadamente — no por ser inviable, sino para no
introducir esa complejidad y ese riesgo adicional en el cierre del MVP
actual.

**Hallazgos de la revisión previa a conservar, si se retoma:**
- El valor interno debe seguir siendo exclusivamente una cadena de dígitos
  — el contrato de `onCambiar` no debe cambiar; es lo que hoy garantiza que
  ningún separador ni el símbolo `$` lleguen al dominio.
- Manejo explícito de la posición del cursor al insertar o eliminar un
  dígito en medio del valor (cada dígito nuevo puede desplazar la cantidad
  de separadores a la izquierda del cursor).
- Backspace/Delete inmediatamente junto a un separador — el caso más
  delicado: hay que saltar el separador y borrar el dígito, no dejar la
  tecla "sin efecto visual".
- Selección de un rango que cruce un separador y su reemplazo por tecleo.
- Pegado de valores (ya cubierto hoy por el saneamiento genérico de
  `onChange`, pero debe seguir verificándose con el formateo en vivo).
- Ceros iniciales — decidir explícitamente si se recortan en cada tecleo o
  se conservan hasta perder el foco (hoy no hay una regla explícita).
- Comportamiento móvil: el riesgo más alto de los evaluados — el
  reposicionamiento programático del cursor es más frágil en navegadores
  móviles, sumado a la imprecisión táctil ya existente al seleccionar
  dentro de un campo.
- Accesibilidad: el símbolo `$` debe permanecer fuera del valor editable
  del `<input>` (prefijo visual separado, ya adoptado como arquitectura del
  MVP) — nunca dentro del texto que un lector de pantalla anuncia como el
  valor del campo.
- El proyecto no tiene hoy infraestructura de test de DOM/componentes
  (sin `jsdom`/`happy-dom`, sin `@testing-library/react`) — retomar esto
  exige extraer la lógica de cursor/formateo como funciones puras
  testeables sin DOM, o agregar esa infraestructura como decisión aparte.

**Relación con la arquitectura ya adoptada:** el prefijo visual `$` fijo
(fuera del input) que se implementa ahora para el MVP es la misma base
arquitectónica sobre la que se construiría el formateo en vivo más
adelante — no es un diseño que haya que descartar ni rehacer, solo
extender.

**Condición para revisarla más adelante:** que exista evidencia real de que
la ausencia de formateo en vivo genera errores de magnitud, fricción de uso
o una degradación relevante en la comprensión/confianza durante la
captura — no únicamente una preferencia estética.
