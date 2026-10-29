---
id: "P0-03"
titulo: "Endurecer PIN, rate limit, tokens y bloqueo de sesión"
prioridad: "P0"
estado: "en_progreso"
area: "seguridad"
depende_de: []
archivos:
  - "index.html"
  - "puerta.html"
  - "config.js"
  - "admin.html"
---

# P0-03 · Endurecer PIN, rate limit, tokens y bloqueo de sesión

## Contexto

El acceso se reduce a un PIN. El placeholder sugiere 4 dígitos, el cliente no limita intentos y todo el personal de puerta comparte el mismo PIN. Los tokens se guardan en `sessionStorage` y `borrarSesion()` solo limpia el navegador: no hay logout real, expiración visible ni revocación. Una tablet de puerta abierta queda operativa para el siguiente.

## Evidencia

- [index.html:46](../index.html#L46): input de PIN con placeholder de 4 puntos.
- [index.html:86](../index.html#L86): `f_login` recibe solo el PIN.
- [config.js:24-35](../config.js#L24-L35): guardar/leer/borrar sesión solo en `sessionStorage`.
- [puerta.html:367-389](../puerta.html#L367-L389): login de puerta reutiliza el mismo PIN.
- [puerta.html:1015](../puerta.html#L1015): un token de puerta puede reabrir listas.
- [puerta.html:320](../puerta.html#L320): un token de puerta puede cerrar el día.

## Objetivo

Reducir la probabilidad y el impacto de un acceso no autorizado: PIN más fuerte, límite de intentos, tokens expirables y revocables, logout real, bloqueo por inactividad y trazabilidad por dispositivo.

## Pasos

- [ ] Subir el PIN de admin a 6-8 dígitos o passphrase; mantener uno distinto para puerta. Si se puede, usar Supabase Auth + MFA para admin y dejar el PIN solo para puerta.
- [ ] Implementar rate limit en servidor por IP y por dispositivo: N intentos fallidos → bloqueo temporal con `Retry-After`, y alerta tras varios bloqueos.
- [ ] Añadir tabla/campos de sesiones: `token_hash`, `rol`, `device_label`, `creado_at`, `expira_at`, `revocado_at`, `ultimo_uso_at`.
- [ ] Guardar solo el hash del token (SHA-256 o similar), nunca el token en claro.
- [ ] Validar en cada RPC: hash existe, no revocado, no expirado, rol correcto.
- [ ] Implementar logout real: RPC que marque `revocado_at`; el botón de salir debe llamarla además de limpiar `sessionStorage`.
- [ ] Añadir “cerrar todas las sesiones” y “rotar PIN” en el panel admin.
- [ ] Añadir auto-lock por inactividad (5-10 minutos) en admin y puerta; pedir PIN de nuevo.
- [ ] Registrar intentos fallidos y sesiones creadas/revocadas en la auditoría.
- [ ] No mostrar el token en la UI ni en logs.

## Criterios de aceptación

- [ ] Tras N intentos fallidos, `f_login` responde con bloqueo temporal y no permite seguir probando.
- [ ] Un token expira y deja de funcionar; un token revocado falla inmediatamente.
- [ ] “Salir” invalida el token en servidor, no solo en el navegador.
- [ ] Admin y puerta pueden revocar todas las sesiones activas.
- [ ] La sesión se bloquea tras el tiempo de inactividad configurado.
- [ ] La base de datos no almacena tokens en texto plano.
- [ ] El login exitoso registra dispositivo/fecha/hora y el fallido también.

## Verificación

En staging:

1. Probar 20 PIN incorrectos y comprobar el bloqueo.
2. Iniciar sesión, copiar el token, hacer logout y reutilizar el token; debe fallar.
3. Esperar la expiración configurada (o manipular `expira_at` en staging) y comprobar que falla.
4. Dejar una pestaña inactiva y comprobar el auto-lock.
5. Revisar la tabla de sesiones: no debe haber tokens en claro.

## Fuera de alcance

- Rediseñar todos los roles (ver [P1-02](P1-02-roles-estado-puerta.md)).
- Auditar RLS/grants (ver [P0-02](P0-02-rls-autorizacion.md)).

## Notas de implementación

> Pendiente.
