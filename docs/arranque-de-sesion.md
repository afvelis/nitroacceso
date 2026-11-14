# Arranque de una sesión con un agente nuevo

> Receta única y corta. Si algo de este documento contradice a `AGENTS.md`, manda `AGENTS.md`. Los SHA concretos no viven aquí: los imprime `scripts/verificar-arranque.py`.
>
> **Por qué existe:** cada sesión empezaba con fricción —en qué rama estoy, si está actualizado, qué se pega al agente nuevo— y eso ya provocó errores reales: un prompt escrito a mano metió `?e=` donde el código lee `?s=` (`js/stand.js:2`) y una copia de trabajo quedó en una rama vieja, fusionada y sin los cambios de la tarea en curso. Este documento cierra esa fricción.

---

## 1 · Dos ventanas, dos funciones (no se mezclan)

| Ventana | Para qué sirve | Qué se escribe en ella |
| --- | --- | --- |
| **Donde hablas con el agente** | Conversar, pegar el prompt, decidir | El bloque de arranque. **Ningún comando de consola.** |
| **cmd de Windows** (en `C:\Users\afvel\nitroacceso`) | Tocar el repo y probar en local | Solo `git`, `py scripts\verificar-arranque.py` y `py scripts\dev-server.py` |

El agente **no** se arranca en el `cmd` de Windows. Esa ventana es la copia de trabajo y el navegador de pruebas; el agente vive donde se conversa.

**Ojo con la carpeta:** si abres el `cmd` en otra carpeta (por ejemplo `C:\Users\afvel`, un nivel por encima del repo), los comandos de la columna de la derecha fallarán con `can't open file`. Usa los bloques de la sección 4.1, que llevan el `cd` dentro.

## 2 · La receta (tres pasos, siempre igual)

1. **Abre el agente nuevo** en el mismo sitio desde donde hablas habitualmente, en el proyecto nitroacceso.
2. **Pega como primer mensaje el bloque «PROMPT DE RELEVO»** que imprimió la última ejecución de `py scripts\verificar-arranque.py`. Está al final de la salida, entre líneas de `====`.
3. **No añadas nada más.** El agente ejecuta el verificador, lee `AGENTS.md` y `ESTADO.md` §4, y te pide lo primero que necesita.

**Regla dura:** el bloque **no se escribe de memoria ni se copia de un documento viejo**. Se copia de la salida del script, que lo genera con el SHA del día.

**Excepción — modo chat gratuito (sin acceso al repo).** Si el agente que usas no puede leer archivos ni ejecutar comandos (es el «Modo chat gratuito» de AGENTS.md, declarado modo principal), haz además dos cosas: **pega primero `AGENTS.md` completo y `ESTADO.md` completo**, y **ejecuta tú el verificador** en cmd pegándole después la salida. En ese modo no es el agente quien comprueba el estado: eres tú.

## 3 · Qué hace el agente en el primer minuto

1. `python3 scripts/verificar-arranque.py`.
2. Leer la sección «Siguiente paso» de `ESTADO.md`.
3. Elegir una tarea `pendiente` y trabajar.

Si un agente nuevo pregunta «¿qué proyecto es?», audita ramas, o corrige SHAs en documentos en vez de trabajar: está mal arrancado. El protocolo completo vive en `AGENTS.md`, sección «Protocolo de relevo sin fricción».


## 4 · Checklist del usuario antes de empezar

- [ ] La copia de Windows está en la rama de trabajo, no en `main` (lo dice el verificador).
- [ ] `git pull` sin errores.
- [ ] `py scripts\verificar-arranque.py` termina con `0 FALLAS`.
- [ ] Si vas a probar en el navegador: `py scripts\dev-server.py` arrancado y la URL `http://127.0.0.1:8000/...` con el parámetro correcto (ver `docs/dev-local.md` §9).

### 4.1 · Comandos listos para copiar

**Cada bloque lleva el `cd` dentro.** Si copias solo la segunda línea, Python buscará el archivo en la carpeta equivocada y fallará con `can't open file '...\scripts\dev-server.py'`.

**Verificador** (siempre el primero):

    cd C:\Users\afvel\nitroacceso
    py scripts\verificar-arranque.py

Debe terminar con `RESULTADO: ... 0 FALLAS`. Si sale alguna `[FALLA]` que mencione `git pull`, ejecuta `git pull` y repite.

**Servidor de pruebas**:

    cd C:\Users\afvel\nitroacceso
    py scripts\dev-server.py

Debe imprimir el recuadro de `====` y la línea `Sirviendo la raíz del repo: C:\Users\afvel\nitroacceso`, y después **la ventana se queda colgada sin devolver el símbolo del sistema**. Eso significa que está escuchando: **no la cierres**. Esa ventana no se usa para nada más.

**Qué hacer según el síntoma:**

| Síntoma en la ventana | Causa | Arreglo |
| --- | --- | --- |
| `can't open file 'C:\Users\afvel\scripts\dev-server.py'` | Se ejecutó desde `C:\Users\afvel`, un nivel por encima del repo | Repetir el bloque COMPLETO, incluido el `cd` |
| `OSError: [WinError 10048]` u `Only one usage of each socket address` | El puerto 8000 lo tiene otra ventana | Cerrar esa otra ventana, o `py scripts\dev-server.py --puerto 8001` y abrir la URL con `:8001` |
| `'py' no se reconoce como un comando` | Falta el lanzador `py` | Probar con `python scripts\verificar-arranque.py` |
| Vuelve al símbolo del sistema sin mensajes | El servidor no llegó a escuchar | Copiar TODO lo que imprime la ventana, no solo el final |

Las URLs que se abren en el navegador, con su parámetro exacto, están en `docs/dev-local.md` sección 9. **El servidor no las imprime: él solo sirve.**

## 5 · Al cerrar la sesión

El agente escribe en la misma rama los estados de `tareas/` con su evidencia, las decisiones nuevas y el «Siguiente paso» de `ESTADO.md`, sube su versión, y ejecuta el verificador para copiar de su salida el bloque «PROMPT DE RELEVO». Nada de ramas, SHAs ni estado de PR escritos a mano: eso lo mide el script.


## 6 · El prompt de la sesión siguiente

Se COPIA de la sección «PROMPT DE RELEVO» de `scripts/verificar-arranque.py`. No se redacta de memoria ni se reutiliza uno viejo: un prompt escrito a mano ya metió un parámetro de URL equivocado (`?e=` en vez de `?s=`) y una referencia de proyecto con una letra cambiada.
