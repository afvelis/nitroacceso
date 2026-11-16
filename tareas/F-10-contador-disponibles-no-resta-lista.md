---
id: "F-10"
titulo: "El contador «Disponibles» del stand no resta la lista de espera"
prioridad: "P2"
estado: "hecho"
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
- [x] Probar en pantalla con el escenario de la reproducción. HECHO 14/11/2026 (usuario, con el arreglo ya en la copia): antes de agregar, `Cupo total: 4 · Registrados: 3 · En lista: 0 · Disponibles: 1.`; después de agregar UNA persona a la lista (sin registrar), `Cupo total: 4 · Registrados: 3 · En lista: 1 · Disponibles: 0.` — el número pasó de 1 a 0, igual que lo que la validación permite agregar.

## Criterios de aceptación

- [x] El número (o la etiqueta) de `Disponibles` coincide con lo que la validación permite agregar de verdad. HECHO 14/11/2026, medido en pantalla: `Disponibles` pasó de `1` (4/3/0 en lista) a `0` (4/3/1 en lista) al agregar una persona a la lista.
- [x] La validación de `btnAgregar` NO cambia (comportamiento actual correcto, probado en la Sesión 27). Verificado en el diff: la línea `document.getElementById('btnAgregar').disabled = (editIndex === -1 && n >= quedan);` (`js/stand.js:218`) quedó intacta y `lugaresRestantes()` (`js/stand.js:13`) no se tocó.
- [x] No se introducen regresiones en el flujo del evento. Acotado con precisión: el flujo de la lista de espera (cargar la pantalla, leer la línea, agregar una persona, ver cómo se actualiza) se ejercitó en pantalla; el registro con QR y el escaneo NO se ejercitaron, y no hacía falta porque el diff no toca esos caminos (botón «Registrar», RPC y validación sin cambios, verificado en el diff).

## Verificación

Repetir la reproducción medida: cupo 4, registrados 2, en lista 1 → el texto debe reflejar que solo cabe 1 más (o decir «Lugares sin asignar: 2» si esa es la decisión). Verificar además que al registrar la lista completa el contador queda en `Disponibles: 0`.

## Fuera de alcance

- Cualquier cambio de la RPC o de la base: esto es solo del texto que pinta el frontend.
- La decisión sobre el botón «Quitar» del stand (tarea aparte, ESTADO.md §2).

## Notas de implementación

> El agente completa esta sección al terminar o bloquearse.

- Qué cambió: dentro de `actualizarCupo()` (`js/stand.js`) se añadió la constante local `disponibles = Math.max(0, quedan - n)` y la línea de `msgCupo` ahora pinta `Disponibles` con esa cifra (opción A del usuario, 14/11/2026). La etiqueta y el texto no cambian. `lugaresRestantes()` quedó EXACTAMENTE igual (se usa en 4 sitios; la validación de `btnAgregar` en otra línea cuenta la lista por su cuenta y debía quedar intacta). El manual (`docs/manual-usuario/04-stand.md`, paso 2) ganó una frase que explica qué significa `Disponibles`.
- Archivos tocados: `js/stand.js`, `docs/manual-usuario/04-stand.md`, esta tarea.
- Pruebas ejecutadas: `node --check js/stand.js` OK; `python3 scripts/verificar-arranque.py` OK. **Prueba en pantalla EJECUTADA el 14/11/2026** (ver bloque de cierre más abajo).
- Riesgos o pendientes: Ambigüedad reportada (no arreglada, decisión pendiente): la tarjeta de información pinta `Quedan: <lugaresRestantes()>` (`js/stand.js:75`), que sigue contando solo lugares físicos sin descontar la lista; tras este arreglo la misma pantalla puede mostrar `Quedan: 2` y `Disponibles: 1`.
- Lección (ya conocida): añadir líneas a un `.js` desplaza las referencias numéricas del propio archivo y de los documentos que lo citan; se comprobaron con `grep -n` al cerrar.

### Cierre (14/11/2026)

- **Evidencia de pantalla** (usuario, sobre `http://127.0.0.1:8000/stand.html?s=STD-DEMO01`, con el arreglo ya en su copia): antes de agregar, `Cupo total: 4 · Registrados: 3 · En lista: 0 · Disponibles: 1.`; después de agregar UNA persona a la lista (sin registrar), `Cupo total: 4 · Registrados: 3 · En lista: 1 · Disponibles: 0.` Antes del arreglo, con `En lista: 1` el número se quedaba en `1` (comprobado en la misma pantalla antes de fusionar).
- **La tarjeta de arriba siguió diciendo `Cupo: 4 | Registrados: 3 | Quedan: 1`** (no cambia al agregar a la lista, es correcto para esta tarea): `Quedan` sigue mostrando los lugares físicos (`lugaresRestantes()`). **Sigue pendiente decidir si `Quedan` se iguala con la resta de la lista** — decisión del usuario, tarea aparte.
- **Hallazgo operativo:** al hacer `git pull` en su copia de Windows, saltó 19 archivos de golpe: la copia de trabajo llevaba retraso desde antes de empezar la sesión, así que las primeras pruebas en navegador de la sesión corrieron sobre código viejo (incluida una prueba de esta misma tarea, que dio el número viejo y se confundió con un fallo de caché). La regla de arranque ya incluye `git pull`, pero no estaba cumplida; lección registrada en `DECISIONES.md`.
