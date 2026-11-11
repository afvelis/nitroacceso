# Arranque local de pruebas — `scripts/dev-server.py` (P1-04, Fase B)

> Qué es, cómo se arranca en el equipo del usuario y qué hace exactamente.
> Complementa a `docs/seguridad-sesiones.md` y `docs/seguridad-supabase.md` en la parte de pruebas: este documento cubre cómo probar la app contra staging sin tocar el CSP publicado.

---

## 1 · Qué es y para qué sirve

`scripts/dev-server.py` es el servidor local de desarrollo de NitroSystem: sirve el repo **tal cual está en disco** y permite probar la app contra **staging** sin tocar el CSP publicado.

Es la única forma correcta de probar en local. No hace falta Docker, ni Node, ni WSL: solo **Python 3**. En Windows se lanza con `py` (y, si no existe, con `python`).

## 2 · Cómo arrancarlo (Windows, equipo del usuario)

```
cd C:\Users\afvel\nitroacceso
py scripts\dev-server.py
```

Si `py` no existe, probar con:

```
python scripts\dev-server.py
```

Después abrir en el navegador: **`http://127.0.0.1:8000/index.html`**

- **Siempre `127.0.0.1`, no `localhost`.** El navegador trata a `localhost` como otro host y el blindaje de `config.js` puede resolver distinto de lo esperado.

## 3 · Qué hace exactamente

- Solo acepta dos argumentos: `--puerto` (por defecto **8000**) y `--ip` (por defecto **127.0.0.1**). **No existe `--env`**: el entorno lo fuerza el servidor por diseño.
- Escucha en **loopback** y rechaza cualquier otra IP terminando con un error y código de salida distinto de 0 (`--ip 0.0.0.0` está prohibido por diseño).
- En cada respuesta HTTP **retira la etiqueta `<meta http-equiv="Content-Security-Policy">` solo en la respuesta** (la quita por expresión regular, incluida si viene en mayúsculas). El HTML en disco y el CSP de GitHub Pages quedan intactos, ni una coma.
- Inyecta `<script>window.__NA_ENV__ = "staging";</script>` **inmediatamente antes de la etiqueta que carga `config.js`**, para que se resuelva el entorno al cargar. Si no encuentra esa etiqueta, **no inyecta y lo avisa en el log**: esa página se quedaría en producción, así que hay que hacerlo caso.
- Añade las cabeceras `X-NA-Dev-Server: local-sin-csp` y `Cache-Control: no-store, no-cache, must-revalidate` a cada respuesta.
- **No escribe nada en disco.**

**Cómo resuelve el entorno `config.js`** (en este orden, verificado en el código):

1. Si el hostname termina en `*.github.io` (incluido `afvelis.github.io`, el sitio público real), **fuerza producción SIEMPRE**: ignora cualquier override para que un enlace mal copiado nunca conecte el sitio público con staging.
2. Después, `window.__NA_ENV__` (lo fija el servidor en local).
3. Después, el parámetro `?env=` de la URL (por ejemplo `index.html?env=staging`).
4. Si nada de lo anterior, **producción**.

Valores válidos: `staging`, `produccion` (alias `prod`). Cualquier otro valor se ignora y se usa producción.

## 4 · Cómo saber que arrancó bien

En todas las páginas debe verse el banner literal:

```
STAGING - datos ficticios (no es producción) - Supabase: adoqujnnnrlgmvwbnwbl.supabase.co
```

Y en la consola del navegador la marca:

```
NA: entorno activo: staging
```

**Si el banner no aparece, no está sirviendo la página: parar y avisar.** No seguir probando sobre lo que se vea.

## 5 · Qué NO hace y qué NO se debe hacer

- **No publica.** El repo y GitHub Pages siguen igual; este servidor solo sirve en el equipo de quien lo arranca.
- **No modifica archivos.** Cambia el HTML en memoria, en cada respuesta, y no escribe nada en disco.
- **El CSP del repo y de GitHub Pages no se toca nunca.** El cambio del CSP vive solo en la respuesta local que este servidor fabrica.
- **No se usa para desplegar.** El despliegue es el de siempre: commit a `main` y Actions.
- **No se abre con `localhost`:** siempre `127.0.0.1`.
- **No se sirve en otra IP.** `--ip 0.0.0.0` está prohibido por diseño y el servidor lo rechaza.

## 6 · Datos de prueba de staging

| Dato | Valor | Para qué |
| --- | --- | --- |
| PIN admin | `100000` | Entrar al panel de administración |
| PIN puerta | `200000` | Entrar a la puerta |
| Código talento | `TAL-DEMO01` | Prueba del link de talento |
| Código stand | `STD-DEMO01` | Prueba del registro de stand |
| Código cortesía (lista) | `COR-DEMO01` | Prueba del pase de cortesía |
| Código aliado | `ASI-DEMO01` | Prueba de la asignación de aliado |
| QR vendedor 1 | `V-DEMO01` | Escaneo de entrada |
| QR vendedor 2 | `V-DEMO02` | Escaneo de entrada (doble prueba) |

**Diferencia entre los dos proyectos Supabase** (dos bases distintas, no dos entornos de la misma):

| Proyecto | Papel | URL |
| --- | --- | --- |
| **`nitrotalentos`** | **Producción** (los datos reales del evento) | `exrbwctegkzxurzwihvh.supabase.co` |
| **`adoqujnnnrlgmvwbnwbl.supabase.co`** (20 caracteres, **con letra v**) | **Staging** (datos ficticios) | `adoqujnnnrlgmvwbnwbl.supabase.co` |

**Confirmar el proyecto antes de ejecutar cualquier SQL.** Un lote aplicado por error en el proyecto equivocado pasó por exitoso y solo lo delató una consulta de conteo (28/10, `DECISIONES.md`). Todo el SQL lo ejecuta el usuario en el SQL Editor; ningún asistente pide ni maneja claves.

## 7 · Errores conocidos y su solución

| Síntoma | Causa y solución |
| --- | --- |
| `python3` devuelve "Python was not found … Microsoft Store" | Es la ventana equivocada: en Windows se usa `py` o `python`, no `python3`. |
| `cd ~/nitroacceso` devuelve "The system cannot find the path specified" | `cmd.exe` no expande `~`; usar la ruta completa `C:\Users\afvel\nitroacceso`. |
| WSL solo muestra `docker-desktop` y no sirve | Se trabaja en Windows directamente: WSL no es parte del flujo. |
| Tras cambiar HTML o JS, el navegador muestra lo viejo | `Ctrl+Shift+R` para forzar la recarga. El servidor manda `no-store`, pero el navegador conserva el documento anterior si no se fuerza. |
| Un archivo de 0 bytes creado por el Bloc de notas bloquea un `git pull` y hace creer que el código está roto | El archivo vacío es el problema, no el código: revisar el árbol de trabajo (`git status`) antes de culpar al código. |
| El servidor no arranca porque el puerto está ocupado | Arrancarlo en otro puerto: `py scripts\dev-server.py --puerto 8001` (y abrir la URL con ese puerto). |

## 8 · Por qué existe este documento

Este documento nace de una sesión en la que el arranque del servidor se perdió por no estar escrito en el repo: hubo que volver a deducirlo desde cero, paso a paso, en plena prueba. Queda escrito para que nadie lo tenga que deducir otra vez.
