---
id: "F-10"
titulo: "El contador «Disponibles» del stand no resta la lista de espera"
prioridad: "P2"
estado: "pendiente"
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
- [js/stand.js:211](../js/stand.js#L211): el texto de `msgCupo` pinta `Disponibles: <lugaresRestantes()>` directamente.
- [js/stand.js:224](../js/stand.js#L224): la validación de `btnAgregar` SÍ usa la lista (`listaPersonas.length >= lugaresRestantes()`), por eso el comportamiento real es correcto y solo el número engaña.

Reproducción medida en pantalla: stand `STD-DEMO01`, cupo 4, registrados 2, en lista 1 → el texto pinta `Disponibles: 2` cuando solo cabe 1 persona más.

## Objetivo

Que la cifra de `Disponibles` del stand signifique lo mismo que impone la validación, o que la etiqueta describa exactamente lo que muestra. Decide el usuario.

## Pasos

- [ ] Decisión del usuario: qué debe significar `Disponibles` — (a) huecos libres restantes = `lugaresRestantes() - listaPersonas.length`, o (b) cambiar la etiqueta (p. ej. «Lugares sin asignar») para que describa `lugaresRestantes()`.
- [ ] Aplicar lo decidido en `js/stand.js` (línea del `msgCupo`, `:211`), SIN tocar la validación de `btnAgregar` (`:224`), que es correcta.
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

- Qué cambió:
- Archivos tocados:
- Pruebas ejecutadas:
- Riesgos o pendientes:
