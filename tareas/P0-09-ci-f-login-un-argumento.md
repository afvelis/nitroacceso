---
id: "P0-09"
titulo: "El CI prueba f_login con un solo argumento y no cubre los cubos por rol"
prioridad: "P2"
estado: "pendiente"
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

## Criterios de aceptación (propuestos, sin implementar)

- [ ] La helper de login llama a `f_login` con `p_rol_solicitado` explícito (admin y puerta, cada una con su rol) y no compra en el cubo legado.
- [ ] Existe un test automatizado de aislamiento: 5 fallos de puerta no bloquean el siguiente login de admin (y ventanas: puerta 90 s, admin 15 min en el mensaje BLOQUEADO).
