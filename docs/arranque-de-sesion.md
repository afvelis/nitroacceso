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

## 2 · La receta (tres pasos, siempre igual)

1. **Abre el agente nuevo** en el mismo sitio desde donde hablas habitualmente, en el proyecto nitroacceso.
2. **Pega como primer mensaje el bloque «PROMPT DE RELEVO»** que imprimió la última ejecución de `py scripts\verificar-arranque.py`. Está al final de la salida, entre líneas de `====`.
3. **No añadas nada más.** El agente ejecuta el verificador, lee `AGENTS.md` y `ESTADO.md` §4, y te pide lo primero que necesita.

**Regla dura:** el bloque **no se escribe de memoria ni se copia de un documento viejo**. Se copia de la salida del script, que lo genera con el SHA del día.

**Excepción — modo chat gratuito (sin acceso al repo).** Si el agente que usas no puede leer archivos ni ejecutar comandos (es el «Modo chat gratuito» de AGENTS.md, declarado modo principal), haz además dos cosas: **pega primero `AGENTS.md` completo y `ESTADO.md` completo**, y **ejecuta tú el verificador** en cmd pegándole después la salida. En ese modo no es el agente quien comprueba el estado: eres tú.

## 3 · Qué hace el agente en el primer minuto

1. `py scripts\verificar-arranque.py` y comprueba que la rama, el SHA, el árbol y el PR cuadran.
2. Lee `AGENTS.md` completo y `ESTADO.md` (estado real y §4, siguiente paso numerado).
3. Te pide **una sola acción**, con su prueba del objetivo.

Si en vez de eso pregunta «¿qué proyecto es?», te pide que le resumas la historia, o no ejecuta el verificador: **está mal arrancado**. Se para y se vuelve al paso 2.

En modo chat gratuito este apartado no aplica: el verificador lo ejecutas tú y le pegas la salida, porque ese agente no puede ejecutar nada.

## 4 · Checklist del usuario antes de empezar

- [ ] La copia de Windows está en la rama de trabajo, no en `main` (lo dice el verificador).
- [ ] `git pull` sin errores.
- [ ] `py scripts\verificar-arranque.py` termina con `0 FALLAS`.
- [ ] Si vas a probar en el navegador: `py scripts\dev-server.py` arrancado y la URL `http://127.0.0.1:8000/...` con el parámetro correcto (ver `docs/dev-local.md` §9).

## 5 · Al cerrar la sesión

Escribe **«CERRAR SESIÓN»** o **«handoff»**. El agente entrega, en la misma rama:

1. `ESTADO.md` con la versión +1, los datos de navegación medidos y fechados, el estado del PR y la separación entre verificado y pendiente.
2. Las líneas nuevas de `DECISIONES.md`.
3. Los cambios de `estado:` de las tareas tocadas, con la evidencia.
4. **El prompt de relevo**: vuelve a ejecutar `py scripts\verificar-arranque.py` y copia el bloque **recién impreso**, no la salida del arranque — el SHA ha cambiado con el trabajo de la sesión.
5. La referencia a esta receta (`docs/arranque-de-sesion.md`), para que la sigas sin buscar nada.

Ningún criterio se marca cumplido sin la prueba ejecutada.

El Protocolo de cierre de `AGENTS.md` exige además dos cosas que conviene comprobar antes de dar la sesión por cerrada: el capítulo de `docs/manual-usuario/` afectado, actualizado en el mismo PR, y la verificación final con `git status` vacío y `HEAD` igual al `origin` de la rama.

## 6 · Forma del bloque (referencia, NO para copiar)

El bloque real lo imprime el script. Su forma es esta, con los valores del día:

    ================================================================
     PROMPT DE RELEVO (copiar y pegar al siguiente agente)
    ================================================================
    Sesion nueva del proyecto nitroacceso. Antes de nada, lee AGENTS.md COMPLETO.

    Estado medido el <fecha>:
      rama de trabajo : <rama>
      HEAD de la rama : <SHA medido>
      HEAD de main    : <SHA medido>
      contiene main   : <si/no> (N commits de retraso)
      actualizada     : <si/no> (respecto a origin/<rama>)

    Primera accion obligatoria:
      py scripts\verificar-arranque.py
    Su salida es la fuente de verdad sobre rama, SHA, arbol limpio y PR.
    No confies en los SHA ni en los contadores escritos en ESTADO.md: caducan.
    Receta de arranque: docs/arranque-de-sesion.md
    ================================================================
