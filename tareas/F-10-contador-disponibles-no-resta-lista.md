---
id: "F-10"
titulo: "El contador «Disponibles» del stand no resta la lista de espera"
prioridad: "P2"
estado: "en_progreso"
area: "interfaz"
depende_de: []
archivos:
  - "js/stand.js"
  - "stand.html"
---

# F-10 · El contador «Disponibles» del stand no resta la lista de espera

## Contexto

Hallazgo H-1 de la prueba en navegador de la Sesión 27 (vía B de P1-04, 13-14/11/2026). En el módulo del stand el texto de cupo pinta «Disponibles» como `cupo - registrados` sin restar la lista de espera de personas todavía no registradas, así que el número puede engañar al usuario del stand.

## Evidencia

- [js/stand.js:13-14](../js/stand.js#L13-L14): `lugaresRestantes()` devuelve `Math.max(0, cupo - vendedores.length)` — no descuenta `listaPersonas`.
- [js/stand.js:217](../js/stand.js#L217): el texto de `msgCupo` pinta `Disponibles: <lugaresRestantes()>` directamente.
- [js/stand.js:218](../js/stand.js#L218): la validación de `btnAgregar` SÍ usa la lista (`btnAgregar.disabled = (editIndex === -1 && n >= quedan)`, con `quedan = lugaresRestantes()` y la lista contada aparte; la misma comparación literal `listaPersonas.length >= lugaresRestantes()` está en el onclick, `js/stand.js:230`), por eso el comportamiento real es correcto y solo el número engaña.

Reproducción medida en pantalla: stand `STD-DEMO01`, cupo 4, registrados 2, en lista 1 → el texto pinta `Disponibles: 2` cuando solo cabe 1 persona más.

## Objetivo

Que la cifra de `Disponibles` del stand signifique lo mismo que impone la validación, o que la etiqueta describa exactamente lo que muestra. Decide el usuario.

## Pasos

- [x] Decisión del usuario: qué debe significar `Disponibles` — (a) huecos libres restantes = `lugaresRestantes() - listaPersonas.length`, o (b) cambiar la etiqueta (p. ej. «Lugares sin asignar») para que describa `lugaresRestantes()`. Elegida la opción (a) por el usuario el 14/11/2026: `Disponibles` debe decir la verdad = `cupo − registrados − en lista`; la etiqueta y el texto no cambian, solo el número.
- [x] Aplicar lo decidido en `js/stand.js` (línea del `msgCupo`, ahora `:217`), SIN tocar la validación de `btnAgregar` (ahora `:218`), que es correcta. APLICADO: la línea `textContent` de `msgCupo` está en `js/stand.js:217` y pinta `Disponibles` con `disponibles = Math.max(0, quedan - n)`; la validación de `btnAgregar` quedó intacta. Falta solo la prueba en pantalla, que corresponde al paso siguiente y a los criterios de aceptación, no a este paso.
- [ ] Probar en pantalla con el escenario de la reproducción.

## Criterios de aceptación

- [ ] El número (o la etiqueta) de `Disponibles` coincide con lo que la validación permite agregar de verdad.
- [ ] La validación de `btnAgregar` NO cambia (comportamiento actual correcto, probado en la Sesión 27).
- [ ] No se introducen regresiones en el flujo del evento.

## Verificación

Repetir la reproducción medida: cupo 4, registrados 2, en lista 1 → el texto debe reflejar que solo cabe 1 más (o decir «Lugares sin asignar: 2» si esa es la decisión). Verificar además que al registrar la lista completa el contador queda en `Disponibles: 0`.

## Fuera de alcance

- Cualquier cambio de la RPC o de la base: esto es solo del texto que pinta el frontend.
- La decisión sobre el botón «Quitar» del stand (tarea aparte, ESTADO.md §2).

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió: dentro de `actualizarCupo()` (`js/stand.js`) se añadió la constante local `disponibles = Math.max(0, quedan - n)` y la línea de `msgCupo` ahora pinta `Disponibles` con esa cifra (opción A del usuario, 14/11/2026). La etiqueta y el texto no cambian. `lugaresRestantes()` quedó EXACTAMENTE igual (se usa en 4 sitios; la validación de `btnAgregar` en otra línea cuenta la lista por su cuenta y debía quedar intacta). El manual (`docs/manual-usuario/04-stand.md`, paso 2) ganó una frase que explica qué significa `Disponibles`.
- Archivos tocados: `js/stand.js`, `docs/manual-usuario/04-stand.md`, esta tarea.
- Pruebas ejecutadas: `node --check js/stand.js` OK; `python3 scripts/verificar-arranque.py` OK. **La prueba en pantalla está PENDIENTE** (la hace el usuario: abrir `stand.html?s=STD-DEMO01`, cupo 4, registrados 2, 1 en lista → la línea debe leer `Disponibles: 1` en vez de `2`).
- Riesgos o pendientes: criterios de aceptación SIN marcar: ninguno tiene prueba de pantalla ejecutada todavía. Ambigüedad reportada (no arreglada, decisión pendiente): la tarjeta de información pinta `Quedan: <lugaresRestantes()>` (`js/stand.js:75`), que sigue contando solo lugares físicos sin descontar la lista; tras este arreglo la misma pantalla puede mostrar `Quedan: 2` y `Disponibles: 1`. A juicio del agente el usuario final puede confundirse con la discrepancia; valdría igualar `Quedan` con la misma resta o renombrarlo, pero eso es decisión del usuario y tarea aparte.
- Lección (ya conocida): añadir líneas a un `.js` desplaza las referencias numéricas del propio archivo y de los documentos que lo citan; se comprobaron con `grep -n` al cerrar.
