# Revisión de seguridad y mejoras — Nitroacceso

> Revisión estática del repositorio, sin ejecutar pruebas contra la base de datos de producción. Las conclusiones sobre el frontend están verificadas leyendo el código; las que dependen de Supabase se marcan como **a verificar** porque el esquema y las funciones RPC no están versionados en este repo.

## Resumen ejecutivo

El proyecto está bien encaminado para un evento de dos días: roles claros, uso de RPC en lugar de acceso directo a tablas, sesión en `sessionStorage`, estados de anulación y un flujo de puerta con fallback manual. No hay `service_role` ni contraseñas en el código.

Los riesgos principales son:

1. **XSS almacenado** en la puerta y el dashboard, explotable desde formularios públicos.
2. **Autorización real en Supabase** no verificable desde el repo: RLS, grants y rol por RPC.
3. **PIN de 4 dígitos y sesiones compartidas** sin rate limit visible, expiración ni revocación.
4. **Links portadores** con datos personales y capacidad de modificar registros.
5. **Integridad** de escaneos y cupones ante concurrencia, y roles de puerta demasiado amplios.
6. **Dependencias externas** para QR y lectura de cámara, sin CSP ni SRI.
7. **Operación**: limpieza destructiva sin backup probado y esquema fuera del repo.

La recomendación es no reescribir el proyecto: corregir primero lo crítico y agregar red de seguridad (staging, backups, tests) antes de tocar producción.

---

## 1. XSS almacenado — crítico y verificable

El código interpola datos de usuarios directamente en `innerHTML` sin escapar:

- [puerta.html:579-581](../puerta.html#L579-L581): nombre, apellido, cédula y empresa del vendedor.
- [puerta.html:684-690](../puerta.html#L684-L690): nombre, cédula y `data-nombre` de personas de una lista.
- [puerta.html:750-751](../puerta.html#L750-L751): nombre y cédula de una cortesía individual.
- [puerta.html:818-819](../puerta.html#L818-L819): nombre y cédula de una premiación.
- [puerta.html:986](../puerta.html#L986), [puerta.html:1009-1010](../puerta.html#L1009-L1010), [puerta.html:1040-1059](../puerta.html#L1040-L1059): listas de talento.
- [dashboard.html:291-295](../dashboard.html#L291-L295): nombre y link en las alertas del admin.
- [cortesia.html:289](../cortesia.html#L289): nombres de personas en el pase.

Los nombres se capturan desde formularios públicos sin validación de caracteres: [stand.html:355-360](../stand.html#L355-L360) solo comprueba que no estén vacíos, y [talento.html:420-431](../talento.html#L420-L431) solo exige campos completos.

Un vendedor o talento puede registrar un nombre como:

```html
<img src=x onerror=alert(1)>
```

El payload se ejecuta cuando el personal de puerta abre esa lista o cuando el admin abre el dashboard. El script puede leer `sessionStorage.na_token` y llamar a las RPC con ese token: autorizar entradas, leer datos o, si es token de admin, ejecutar `f_admin_limpiar_todo`. Sin CSP, también puede enviar el token a cualquier dominio.

**Dirección de arreglo:** un `escaparHtml()` central usado en todas las interpolaciones; para atributos, `element.dataset`/`setAttribute` en vez de concatenar HTML; `textContent` para nombres. Ver [P0-01](P0-01-xss-escape.md).

---

## 2. RLS, grants y autorización por rol — crítico, a verificar

La app llama a Supabase con la clave publicable desde [config.js:7-21](../config.js#L7-L21). Eso es normal: la clave no es un secreto. El problema sería que las tablas o las funciones estén abiertas.

Con esa URL y esa clave, cualquiera puede llamar directamente a:

```http
POST /rest/v1/rpc/f_admin_dashboard
GET  /rest/v1/personas?select=*
```

No hace falta pasar por la interfaz. Los guards de las páginas, por ejemplo [aliados.html:12-14](../aliados.html#L12-L14), solo comprueban `sessionStorage.na_rol`; cualquiera puede cambiarlo desde DevTools. Si las RPC validan el token y deducen el rol en servidor, no hay impacto. Si solo comprueban que el token exista, o confían en el rol del cliente, hay escalada de privilegios.

Consultas de diagnóstico:

```sql
-- ¿RLS activo en todas las tablas?
select relname, relrowsecurity
from pg_class
where relkind = 'r'
  and relnamespace = 'public'::regnamespace;

-- ¿Qué puede hacer anon sobre las tablas?
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated');

-- ¿Qué funciones existen y con qué permisos?
select proname, prosecdef, proacl
from pg_proc
where proname like 'f_%';
```

Si `proacl` es `NULL`, por defecto `PUBLIC` tiene `EXECUTE`. Lo correcto sería:

- RLS activo en todas las tablas y sin políticas para `anon`.
- `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;`
- `GRANT EXECUTE` solo sobre las RPC necesarias, no sobre helpers internos.
- Cada `f_*` debe validar token, expiración y rol; las de admin deben exigir rol `admin`.
- Funciones `SECURITY DEFINER` con `SET search_path = public, pg_temp`.

Prueba segura en staging: usar un token de `puerta` contra `f_admin_dashboard`. Si devuelve datos, el control de acceso está roto. Ver [P0-02](P0-02-rls-autorizacion.md).

---

## 3. PIN, sesiones y credenciales compartidas — alto

El placeholder sugiere un PIN de 4 dígitos ([index.html:46](../index.html#L46)) y `f_login` recibe solo el PIN ([index.html:86](../index.html#L86)). No hay límite de intentos en el cliente; no se puede ver si existe en el servidor. Si no existe, 10.000 combinaciones se prueban en minutos contra el endpoint público.

Además:

- Todo el personal de puerta comparte el mismo PIN: los registros no identifican a la persona, solo al rol.
- `borrarSesion()` solo limpia el navegador ([config.js:31-35](../config.js#L31-L35)); no revoca el token en servidor. Un token robado sigue vigente.
- No hay expiración visible ni “cerrar todas las sesiones”.
- No hay bloqueo por inactividad: una tablet de puerta abierta queda operativa para el siguiente que la tome.

**Dirección de arreglo:** PIN de 6-8 dígitos o passphrase para admin, rate limit por IP/dispositivo, tokens de 256 bits con hash en base de datos, expiración de 8-12 horas, revocación por dispositivo, auto-lock a los 5 minutos y auditoría de intentos. Para el admin, idealmente Supabase Auth con magic link y MFA; el PIN puede quedar para puerta. Ver [P0-03](P0-03-login-sesiones.md).

---

## 4. Links portadores con PII — alto

Los links de stand, talento, aliado y cortesía son “capacidades”: quien tiene el link puede actuar. No se ve expiración ni segundo factor.

- Un link de stand permite quitar vendedores (`f_link_stand_quitar_vendedor`, [stand.html:263](../stand.html#L263)) y registrar gente hasta llenar el cupo.
- Un link de aliado permite crear concursos y reservar cupones.
- Un link de cortesía muestra nombres y, en algunos casos, cédulas.

Si un link se reenvía por WhatsApp o se filtra, el atacante puede llenar el cupo del stand antes del verdadero negocio, borrar vendedores o reservar cupones. También expone datos personales a quien no debería.

**Dirección de arreglo:** links con expiración y un secreto adicional (últimos 4 de cédula, OTP al correo), límite de intentos y verificación de cédula en puerta para premiaciones. No confiar en que el link “solo lo tiene el interesado”. Ver [P1-03](P1-03-auditoria-privacidad.md).

---

## 5. Integridad de entradas y cupones — alto, a verificar

La UI deshabilita el botón, pero dos dispositivos pueden escanear el mismo QR a la vez. Si `f_puerta_marcar_*` no hace una actualización atómica, ambos pueden recibir “ok” y entra la misma persona dos veces.

Patrón correcto:

```sql
update personas
set estado = 'autorizado', marcado_at = now()
where id = p_persona_id
  and estado <> 'autorizado'
returning id;
```

Si no devuelve fila, rechazar. Lo mismo para cupones: descontar solo si hay saldo, dentro de una transacción y con bloqueo de fila. Añadir restricciones e índices, no solo comprobaciones en JavaScript.

Dos controles que cualquier token de puerta puede ejecutar:

- Cerrar el Día 1 y activar el Día 2 ([puerta.html:320](../puerta.html#L320)).
- Reabrir una lista cerrada ([puerta.html:1015](../puerta.html#L1015) y [puerta.html:1131](../puerta.html#L1131)).

Eso debería ser rol `supervisor` o `admin`, no cualquier operador. Además, el estado de “evento en edición” se comprueba al cargar la página, no antes de cada escaneo: si el admin reabre la edición, una puerta ya abierta podría seguir autorizando. El servidor debe rechazar toda mutación si `edicion_abierta` está activo, sin confiar en el estado cacheado del cliente.

Tampoco se ve detección global de cédulas duplicadas entre listas. La misma persona podría tener pases en dos listas y entrar dos veces.

Ver [P1-01](P1-01-integridad-escaneos-cupones.md) y [P1-02](P1-02-roles-estado-puerta.md).

---

## 6. QR de terceros, CDN y falta de CSP — medio-alto

Cada QR se pide a `api.qrserver.com` con el código del pase en la URL ([config.js:46](../config.js#L46)), con respaldo en `quickchart.io` ([config.js:52](../config.js#L52)). Eso significa que un tercero ve todos los códigos de entrada, que son credenciales portadoras. También crea dependencia de red: si el servicio falla, no hay QR.

La lectura usa `jsQR` desde jsDelivr ([puerta.html:427](../puerta.html#L427)) sin `integrity` ni una versión fijada por hash. Un CDN comprometido ejecutaría código en la puerta. Y no hay CSP ni `Referrer-Policy` en ninguna página.

Cabeceras recomendadas:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' https://<proyecto>.supabase.co; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(self)
```

GitHub Pages no permite cabeceras; usar Cloudflare/Netlify delante o, al menos, `meta` para lo que soporte. Mientras todo el JS esté inline, una CSP con `'unsafe-inline'` no evita el XSS: hay que externalizar los scripts o usar hashes/nonces.

Ver [P0-04](P0-04-qr-csp-dependencias.md).

---

## 7. Privacidad y datos personales — medio

Se almacenan cédula, correo, teléfono y nombres. El aliado ve cédula, correo y teléfono del ganador; cualquiera con un link de lista ve nombres y cédulas. No se ve aviso de privacidad, consentimiento ni política de retención.

**Dirección de arreglo:** minimizar datos (mostrar cédula enmascarada y guardar completo solo si hace falta), aviso de privacidad y finalidad, retención definida, borrado al cerrar el evento, `noindex` en páginas de pases y admin, y no enviar códigos de pase a servicios de QR de terceros.

Ver [P1-03](P1-03-auditoria-privacidad.md).

---

## 8. Limpieza destructiva y backups — alto operativo

`f_admin_limpiar_todo` borra todas las tablas de trabajo ([admin.html:641](../admin.html#L641)). Está protegido por un `confirm()` y por haber guardado un informe, pero no por re-autenticación, confirmación tipada ni un backup verificado. Un token de admin robado por XSS puede vaciar el evento.

**Dirección de arreglo:** exportación JSON/CSV obligatoria antes de limpiar, borrado lógico con ventana de gracia, re-autenticación, confirmación escribiendo el nombre del evento y un backup probado. Llevar el esquema y las migraciones al repo: hoy la lógica y las tablas viven solo en Supabase.

Ver [P0-05](P0-05-backups-limpieza.md).

---

## 9. Otros hallazgos menores

- **Errores internos en pantalla:** varios `catch` hacen `innerHTML` con `e.message` sin escapar, por ejemplo [dashboard.html:358](../dashboard.html#L358) y [stand.html:198](../stand.html#L198). Puede filtrar detalles de PostgREST o servir de self-XSS. Usar `textContent` y un mensaje genérico.
- **`onclick` con datos:** [dashboard.html:295](../dashboard.html#L295) inyecta `item.link` dentro de un atributo `onclick`; si el link tuviera una comilla, rompe el atributo. Usar `addEventListener`.
- **`config.js` hardcodeado a producción:** [config.js:5](../config.js#L5) apunta a GitHub Pages y [config.js:3-4](../config.js#L3-L4) a un único Supabase. Un despliegue de prueba puede escribir en producción. Separar configuración por entorno.
- **Sin `README`, tests, migraciones ni CI:** el proyecto se mantiene editando archivos a mano. Dificulta reproducir, probar y restaurar.
- **Caché de GitHub Pages:** el historial muestra renombrados de archivos para evitar caché. Usar assets versionados o un service worker.
- **`NOMBRE_EVENTO` sin uso:** limpieza menor en [config.js:2](../config.js#L2).

---

## Mejoras priorizadas

| Prioridad | Mejora | Por qué |
|---|---|---|
| **P0** | Escapar todo + CSP + `Referrer-Policy` | Corta el XSS y el robo de tokens |
| **P0** | RLS, grants y autorización por rol en cada RPC | Evita el bypass total del frontend |
| **P0** | Rate limit, PIN más fuerte, tokens con expiración y revocación | Fuerza bruta y dispositivos perdidos |
| **P0** | QR local y `jsQR` vendorizado | Privacidad y disponibilidad |
| **P0** | Backups, exportación y limpieza segura | Pérdida irreversible de datos |
| **P1** | Escaneo atómico, cupones transaccionales, detección de cédulas duplicadas | Doble entrada y sobreventa |
| **P1** | Roles `puerta` vs `supervisor`; re-chequear edición/día en servidor | Cierres y reaperturas indebidas |
| **P1** | Auditoría: quién autorizó, quién cambió qué, logins fallidos | Disputas y respuesta a incidentes |
| **P1** | Staging, migraciones, tests Playwright y CI | Evitar regresiones y tocar producción |
| **P2** | PWA offline + cola de escaneos + listas impresas | Caída de red el día del evento |
| **P2** | Refactor a módulos compartidos (`api.js`, `ui.js`, `escape.js`, `qr.js`) | Hoy hay ~8.000 líneas con helpers duplicados |
| **P2** | Observabilidad, runbook y accesibilidad | Operación más segura y rápida |

---

## Plan sugerido

**Días 1-2**

1. Crear el helper de escape y reemplazar todas las interpolaciones de datos de usuario.
2. Añadir CSP, `Referrer-Policy` y `noindex` en páginas sensibles.
3. Verificar RLS/grants y probar un token de puerta contra una RPC de admin.
4. Poner rate limit y bloqueo en `f_login`.

**Semana 1**

5. Tokens con hash, expiración, `revocado_at`, logout real y auto-lock.
6. QR local y `jsQR` self-hosted.
7. Backups/exportación y limpieza con re-autenticación.
8. Separar rol `supervisor` para cerrar día/reabrir listas.

**Semana 2**

9. Hacer atómicos los escaneos y los cupones.
10. Añadir auditoría y alertas de errores.
11. Montar staging con su propio Supabase y `config.js`.
12. Tests E2E de los flujos críticos y un runbook para el día del evento.

---

## Checklist de verificación del backend

Ejecutar en staging, nunca en producción:

- [ ] `select relname, relrowsecurity ...` devuelve `true` para todas las tablas.
- [ ] `select ... from information_schema.role_table_grants where grantee='anon'` no muestra tablas de trabajo.
- [ ] `f_admin_dashboard` rechaza un token de `puerta`.
- [ ] `f_admin_dashboard` rechaza un token inventado o expirado.
- [ ] `f_login` bloquea después de N intentos fallidos.
- [ ] Dos llamadas concurrentes a `f_puerta_marcar_persona` con el mismo ID: solo una devuelve éxito.
- [ ] Dos llamadas concurrentes para reservar cupones no dejan saldo negativo.
- [ ] Un nombre con `<img src=x onerror=alert(1)>` no ejecuta script en puerta/dashboard.
- [ ] Un token revocado deja de funcionar inmediatamente.
- [ ] Un backup restaurado en staging conserva los datos del evento.
