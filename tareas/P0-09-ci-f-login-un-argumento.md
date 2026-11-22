---
id: "P0-09"
titulo: "El CI prueba f_login con un solo argumento y no cubre los cubos por rol"
prioridad: "P2"
estado: "en_progreso"
area: "operacion"
depende_de: []
archivos:
  - "tests/helpers.mjs"
  - "tests/login.test.mjs"
  - ".github/workflows/ci.yml"
---

# P0-09 · El CI prueba `f_login` con un solo argumento y no cubre los cubos por rol

## Contexto

**Origen (20/11/2026, cierre de [P0-08](P0-08-desbloqueo-puerta.md)):** [tests/helpers.mjs:131](../tests/helpers.mjs#L131) llama a la RPC con `rpc("f_login", { p_pin: pin })` — un solo argumento, que hoy cae en el cubo `rol_solicitado = null` (legado, ventana 15 min). Con la firma nueva de la `0005` (`f_login(p_pin text, p_rol_solicitado text default null)`), el aislamiento por rol probado en staging con la batería manual (criterio (c) de P0-08: los fallos de puerta no mueven el cubo de admin) **no tiene cobertura automatizada**: si una regresión en la SQL fusiona otra vez los contadores, la suite puede seguir en verde.

**Segundo riesgo ligado (el incidente del 20/11/2026):** una llamada de un solo argumento es exactamente la forma que quedó rota con `PGRST203` mientras vivió la sobrecarga `f_login(text)`; el CI debería confirmar que la RPC responde bien con la firma vigente y que no reaparecen sobrecargas.

## Criterios de aceptación

- [x] La helper de login llama a `f_login` con `p_rol_solicitado` explícito (admin y puerta, cada una con su rol) y no compra en el cubo legado.
- [ ] Aislamiento de 5 fallos: cubierto por prueba MANUAL en `tests/negativos-login.manual.mjs` (NO en CI, porque provoca bloqueo de puerta 90 s en staging y puede tumbar escaneo / la corrida siguiente). Pendiente de ejecución manual cuando no haya demo en curso.

## Notas de implementación

- `tests/helpers.mjs`: `login(pin)` pasó a `login(pin, rol)`. El rol es obligatorio y validado (solo `"admin"` o `"puerta"`; cualquier otro valor lanza error antes de llamar a la RPC) y se envía como `p_rol_solicitado` explícito, de modo que los tests dejan de comprar en el cubo legado `null`.
- Callers actualizados a la firma nueva: `tests/login.test.mjs` (admin y puerta), `tests/escaneo.test.mjs` (`tokenPuerta()`) y `tests/cupones.test.mjs` (login único de admin).
- `tests/login.test.mjs` suma 2 tests seguros para CI: (a) `f_login` con 1 argumento (cubo legado `null`) sigue respondiendo HTTP 200 sin `PGRST203`; (b) `f_login` con `p_rol_solicitado` inválido falla con `ERR_ROL` sin consumir cubo (el `raise` ocurre antes de insertar en `login_intentos`).
- El test de aislamiento de 5 fallos (5 fallos de puerta + login admin vivo) vive en `tests/negativos-login.manual.mjs` y NO corre en CI: provocarlo bloquea la puerta 90 s en staging y puede tumbar escaneo / la corrida siguiente (misma razón por la que los negativos ya estaban fuera del pipeline). Ver `DECISIONES.md` 2026-11-22 Sesión 33. Pendiente de ejecución manual cuando no haya demo en curso.
- Archivos tocados: `tests/helpers.mjs`, `tests/login.test.mjs`, `tests/escaneo.test.mjs`, `tests/cupones.test.mjs`, `tests/negativos-login.manual.mjs`, esta ficha y `DECISIONES.md`. No se tocó SQL.
- CI cubre: firma de 2 argumentos, compatibilidad de 1 argumento (sin `PGRST203`) y rechazo de rol inválido sin consumir cubo.
