# Método de bitácora de proyecto (v1)

Método portable para que ninguna sesión de trabajo (agente con acceso al repo, o chat gratuito sin él) pierda la secuencia del proyecto ni el flujo de trabajo.

- **Versión:** 1
- **Fecha:** 12/11/2026
- **Cómo se actualiza este documento:** se sube la versión (+1), se anota en la lista de cambios qué se cambió y por qué, y nada de lo anterior se reescribe: la historia de versiones es la prueba de por qué existe cada regla.

## 0 · Qué resuelve y qué no

El problema es simple y recurrente: una sesión nueva no sabe dónde está el proyecto. Llega, lee documentos que afirman cosas (un SHA, un estado de PR, un recuento de líneas), y no tiene forma de comprobarlas. Lo que no puede comprobar, lo adivina. Lo adivinado se apoya en lo siguiente adivinado, y el error se propaga hasta que alguien lo detecta a mano, tarde. Hoy ocurrió aquí: un cierre dejó dos afirmaciones que ya sabía falsas y la sesión siguiente gastó su primer tramo averiguándolo.

Este método resuelve eso: define dónde vive el estado (la bitácora), qué datos se miden con una máquina y qué datos nunca se escriben a mano, cómo se cierra una sesión para que la siguiente arrancue sin adivinar, y cómo un verificador automático contradice al documento cuando el documento miente — avisando, nunca bloqueando. Incluye las plantillas y el verificador, listos para copiar a otro proyecto.

No resuelve todo: no sustituye a los tests (un test que pasa no prueba que la función sea correcta), no arregla código roto (el método dice cómo evidenciar el fallo, no cómo ocultarlo), y no decide prioridades (eso lo decide el usuario o el responsable del proyecto; la bitácora solo registra la decisión).

## 1 · Los siete invariantes

Estas siete reglas valen para cualquier proyecto y cualquier asistente. Cada una es comprobable; si una no se puede comprobar, no es una regla, es un deseo.

1. **Una sola fuente de verdad por dato.** Si dos archivos pueden afirmar lo mismo, uno manda y el otro remite (dice «ver X», no repite X).
   *Por qué:* dos fuentes que afirman lo mismo son, en el primer desacuerdo, cero fuentes.

2. **Ningún dato volátil se escribe a mano sin marcador.** Ramas, SHAs y contadores los mide el verificador con un script; los estados de PR, que aporta una medición fechada del panel del anfitrión o de su API; si nadie lo miró, se escribe «sin medir» y no se afirma nada.
   *Por qué:* lo que se escribe de memoria no se puede distinguir de lo que se recuerda mal.

3. **Un dato que el propio commit de cierre cambia se escribe medido, fechado y marcado como caducable.** Nunca se afirma lo que ya se sabe falso.
   *Por qué:* escribir «PR: inexistente» sabiendo que el commit lo va a crear es mentirle al relevo con la mejor intención.

4. **Un chequeo de documentación nunca bloquea.** Avisa, no falla: un documento viejo no puede impedir arrancar. FALLA se reserva a la integridad del montaje (raíz git y archivos declarados obligatorios); un documento desactualizado o contradictorio es siempre AVISO.
   *Por qué:* si el chequeo bloquea, la presión de arrancar lo convierte en ruido que se ignora o en trámite que se salta.

5. **Ningún criterio se marca cumplido sin su prueba ejecutada.** Sin prueba, se escribe PENDIENTE, aunque el código esté escrito y parezca perfecto.
   *Por qué:* un criterio marcado sin evidencia es peor que uno sin marcar: enseña al relevo a fiarse de lo que no se probó.

6. **El que escribe no es el que valida lo delicado.** Verificación independiente, con evidencia literal (salida del comando, `ruta:línea`, recuento).
   *Por qué:* quien escribió el código comparte el seso del autor: ve lo que quiso escribir, no lo que está escrito.

7. **Un solo escritor a la vez.** Los procesos que solo leen pueden ir en paralelo; los que escriben, en serie, cada uno en su rama.
   *Por qué:* dos escritores sobre el mismo repo producen cambios que nadie recuerda haber hecho, y un cambio inexplicado es un incidente.

## 2 · Los archivos y quién manda

Cinco archivos sostienen el método. Cada dato vive en uno solo de ellos.

| Archivo | Papel | Cuándo cambia |
|---|---|---|
| `AGENTS.md` (o equivalente) | Reglas del proyecto y de trato | Casi nunca; cambia por decisión explícita |
| `ESTADO.md` (bitácora, o equivalente) | Estado volátil: dónde está el proyecto | Cada sesión; es el único volátil |
| `ARQUITECTURA.md` | Esquema de datos, interfaz del backend, manifiesto de archivos | Solo si cambia el esquema |
| `DECISIONES.md` | Los porqués; append-only | Cuando se toma una decisión nueva |
| `tareas/` | Backlog accionable con `estado:` | Con cada tarea tocada |

La jerarquía de fuentes, en una línea: **reglas > bitácora > repo > memoria del asistente.** Si la memoria del asistente y el repo discrepan, manda el repo; si el repo y la bitácora discrepan, decide la regla (ver invariantes 1 y 2 para saber cuál de los dos miente).

La regla de oro, aparte porque es la que más se olvida: **si el verificador y un documento discrepan, manda el verificador y se corrige el documento en esa misma sesión.** El documento describe la realidad; no la proclama.

## 3 · El ciclo de sesión en cinco fases

### 3.1 Arranque

- Primer comando: el verificador (`python3 scripts/verificar_bitacora.py` o el equivalente del proyecto). Su salida es la única fuente de verdad sobre rama, SHAs, árbol y marcador. El estado del PR no lo da el script: lo aporta quien lo mire en el anfitrión, con fecha; si nadie lo miró, se escribe «sin medir».
- Leer las reglas (`AGENTS.md`) y la bitácora (`ESTADO.md`).
- Comprobar que lo que dicen cuadra con el repo: si un documento afirma algo y el repo dice otra cosa, manda el verificador (regla de oro del capítulo 2).
- Si algo no cuadra y el verificador no lo explica: **DETENERSE y avisar en español llano.** No reconstruir en silencio, no asumir, no desechar. Un documento y la realidad deben reconciliarse mirando ambos, no borrando uno.
- Copiar el prompt de relevo impreso por el verificador, nunca redactarlo de memoria: un prompt escrito de memoria ya metió parámetros equivocados.

**Criterio de salida:** la salida del verificador está delante, los SHAs con los que se va a trabajar son los medidos en esa salida, y ninguna discrepancia quedó sin explicar o sin avisar al usuario.

### 3.2 Trabajo

- Una tarea a la vez. Antes de empezar, su `estado:` pasa a `en_progreso` — la bitácora siempre dice en qué se está trabajando.
- Si hay que escribir dos cosas distintas, en serie, nunca en paralelo (invariante 7). Los procesos de solo lectura sí pueden ir en paralelo.
- Antes de proponer un arreglo, la causa debe estar confirmada con evidencia: código citado (`ruta:línea`) o dato medido (salida literal, consulta de conteo). Nada de parches a ciegas: un parche sin causa confirmada arregla el síntoma y deja la causa.
- Cada cambio lleva su informe: qué se cambió y por qué. Quien paga entiende; quien solo obedece, repite errores sin darse cuenta.

**Criterio de salida:** la tarea tocada está `en_progreso` o `hecho` en la bitácora, su causa estaba confirmada antes del arreglo, y no hay ningún cambio en el repo que no se sepa explicar.

### 3.3 Verificación

Tres clases de verificación, cada una con lo que exige.

**(a) Prueba funcional en dos sentidos.** El caso bueno da bien y el caso malo da mal. Si el caso malo no falla, la prueba no vale: un test que solo prueba el camino feliz valida el código y al mismo tiempo lo invalida como prueba, porque ignora la mitad de los comportamientos. Ejemplo: un verificador que avisa cuando el marcador está mal debe probarse con un marcador mal puesto, no solo con uno correcto.

**(b) Revisión independiente por lectura.** Otro proceso (o el humano) lee el diff y cita lo que encuentra con `ruta:línea`. No es «me parece bien»: es «esta línea en este archivo hace X y X es lo que se pedía». El que escribió no valida lo delicado (invariante 6).

**(c) Toda prueba que escriba se ejecuta en `/tmp` o en un clon desechable.** Nunca en el repo de trabajo. Un clon desechable cuesta un comando (`git clone -q <repo> /tmp/nombre`); un repo de trabajo sucio con artefactos de prueba cuesta una sesión entera de averiguar qué cambió y por qué.

**Criterio de salida:** cada criterio de aceptación tiene su prueba con salida literal pegada, o está escrito como PENDIENTE con el texto exacto de la prueba que falta (invariante 5).

### 3.4 Cierre

El cierre es una fase de escritura, no de cortesía. Lo que hay que dejar escrito (el detalle de la bitácora, en el capítulo 4):

- La bitácora nueva versión (+1) con los cuatro datos de navegación medidos y fechados.
- El estado del PR: abierto, fusionado o inexistente. Medido, no recordado. Si se ignoran los pendientes de medirlo, se escribe «sin medir» con la fecha.
- Qué está VERIFICADO y qué PENDIENTE, con las pruebas pendientes numeradas y su texto literal.
- El siguiente paso, numerado y en orden.
- Anexo de decisiones nuevas (si las hubo), en la misma rama del trabajo, nunca en `main`.

**Criterio de salida:** el relevo no necesita preguntar nada: todo lo que sepa averiguarse leyendo los archivos está en los archivos, no en la conversación que se va a cerrar.

### 3.5 Relevo

- El prompt de relevo se copia de la sección que imprime el verificador al final de su ejecución. Incluye rama, SHA de HEAD, SHA de la base, si la rama contiene la base, y el estado del PR, únicamente si alguien lo midió (con fecha); si no, el relevo dice expresamente que no se midió.
- Se dice también qué está PENDIENTE y con qué texto exacto: «prueba 2 pendiente: ejecutar X y esperar Y», no «falta probar algo del formulario».
- La advertencia va dentro del prompt: los SHAs del documento caducan con el siguiente commit; no se citan de memoria, se vuelven a medir.

**Criterio de salida:** el prompt de relevo en la mano es una copia literal de la salida del verificador, corregido solo para añadir lo que el verificador no puede medir (pendientes con su texto, siguiente paso).

## 4 · El cierre, en detalle

El cierre escribe un documento: la bitácora nueva versión. Contiene, en este orden:

1. **Versión y fecha.** Versión anterior +1. Fecha de la medición en la que se apoya lo escrito.
2. **Cuatro datos de navegación, medidos y fechados:** la rama de trabajo; el SHA de la rama (HEAD); el SHA de la base; y si la rama contiene la base, verificado con `git merge-base --is-ancestor`, no por intuición ni por `git diff`. Cada uno con la fecha y el SHA en que se midió.
3. **Estado del PR:** abierto, fusionado o inexistente. Se mide en el anfitrión (panel o API) y se anota con fecha; si no se midió, se escribe «sin medir». Nunca se afirma de memoria.
4. **Lo que está VERIFICADO** (con la evidencia: salida literal, comando, ruta) **y lo que está PENDIENTE** (pruebas numeradas, con el texto exacto de la prueba y lo que debe verse). Ningún criterio depende de una prueba que no se ejecutó: si no se ejecutó, va como PENDIENTE aunque el código parezca perfecto.
5. **El siguiente paso, numerado y en orden.** Uno, no una lista de seis: el relevo hace una cosa a la vez.
6. **Los SHAs caducan.** Cualquier dato volátil que el propio commit de cierre vaya a cambiar se escribe con la fecha y SHA de medición y la nota «caduca con el siguiente commit». Nunca se afirma lo que ya se sabe falso (invariante 3): si el cierre crea el PR, no escribe «PR: inexistente».

Después de escribir, antes de decir «sesión cerrada», cinco comprobaciones finales:

1. `git status` — árbol limpio.
2. HEAD igual al remoto de la rama (`git rev-parse HEAD` contra `git rev-parse origin/<rama>`): lo escrito está subido.
3. Lista exacta de archivos cambiados (`git diff --stat`), y que son los que se querían cambiar.
4. Ningún archivo inesperado en la lista: si aparece algo que no se recuerda haber tocado, no es ruido.
5. Ningún cambio que no se recuerde haber hecho: cada cambio tiene dueño y motivo.

Y la frase que resume las cinco y el capítulo entero, en la que no se transige: **un cambio inexplicado en el repo no se asume, no se commitea y no se descarta en silencio: se revisa con `git diff` y se avisa.**

## 5 · El marcador y el verificador

La bitácora lleva, en su cabecera, un comentario invisible al renderizado de markdown:

```html
<!-- verificador:main-medido = <sha> · <fecha> -->
```

Lo escribe el cierre de cada sesión, con el SHA de `main` medido en ese momento. El verificador lo compara con la base real y **valida por pertenencia a la historia, no por igualdad**: un marcador viejo pero verdadero es OK (con «N commits por detrás»); un SHA inventado, un tag o un commit de otra rama es AVISO.

Por qué no igualdad es la decisión importante: **cada fusión mueve la base, así que exigir igualdad produce un aviso garantizado en cada sesión; un aviso garantizado deja de ser un aviso y se convierte en ruido que se ignora.** Esa frase va literal porque es la única razón técnica del criterio y conviene no parafrasearla: si el aviso suena siempre, nadie lo lee.

Consecuencias prácticas del criterio:

- El marcador **nunca FALLA.** Es un chequeo de documentación (invariante 4): emite `[ OK ]` si el SHA está en la historia de la base y `[AVISO]` en cualquier otro caso.
- `git merge-base --is-ancestor` devuelve 0 / 1 / **128**; el 128 también avisa, porque «no se puede demostrar» no es «está bien». Un verificador que calla ante el código 128 está ocultando el caso más peligroso.
- El SHA se comprueba primero con `cat-file -t`: si no es `commit` (no existe, es un tag, es texto inventado), un solo AVISO, y no se emite además el de «apunta a otra rama». Un caso, un mensaje; dos mensajes para el mismo problema son dos oportunidades de leerlo mal.
- Si el marcador falta, un AVISO: falta. No se inventa, no se autocompleta, no se deja pasar en silencio.

## 6 · Plantilla de bitácora (copiar y pegar)

Cortar y pegar en `ESTADO.md` del proyecto nuevo, y rellenar. Sin nada de este proyecto: es genérica a propósito.

```markdown
# ESTADO del proyecto (bitácora)

> Una línea: qué es este proyecto y para quién.

- Versión: 1
- Fecha: AAAA-MM-DD
<!-- verificador:main-medido = <sha-de-la-base> · AAAA-MM-DD -->

## Estado por módulo

| Módulo | Estado | Nota |
|---|---|---|
| (módulo) | estable / en obra | (una línea) |

## Verificación de arranque

- Rama de trabajo: (medida, con fecha)
- HEAD de la rama: (medido, con fecha; caduca con el siguiente commit)
- SHA de la base: (medido, con fecha)
- ¿Contiene la base?: sí / no / no se pudo demostrar (medido con merge-base)
- Árbol limpio: sí / no
- Estado del PR: abierto / fusionado / inexistente (medido, con fecha)

## Qué está verificado

1. (hecho — evidencia: comando o salida literal, con ruta:línea si aplica)

## Qué está pendiente

1. Prueba 1: (texto exacto de la prueba y qué debe verse)

## Siguiente paso

1. (una acción, con su prueba del objetivo dato a dato)
```

## 7 · Plantilla de prompt de relevo

Lo que la sesión siguiente necesita, en un bloque. Se copia de la salida del verificador. Esta plantilla muestra la forma de ese bloque; el prompt real siempre viene del verificador, y su propia primera acción obligatoria es volver a ejecutarlo.

```text
Eres la sesión de relevo de este proyecto. Lee AGENTS.md primero: las
reglas mandan sobre lo que creas recordar.

Estado medido por git (no de memoria: caduca con el siguiente commit):
- Rama de trabajo: <rama>
- HEAD de la rama: <sha>
- Base (<rama-base>): <sha>
- ¿La rama contiene la base?: <sí / no / no se pudo demostrar>
- Árbol limpio: <sí / qué archivos>
- Estado del PR: <abierto / fusionado / inexistente>

Primera acción obligatoria: ejecutar el verificador
(python3 scripts/verificar_bitacora.py) y trabajar solo con los SHAs
que él imprima. Los SHAs de este prompt son una foto: si discrepan
con el verificador, manda el verificador.

Pendientes con su texto exacto:
1. <prueba pendiente y qué debe verse>

Siguiente paso (uno solo):
1. <acción, con su prueba del objetivo>
```

## 8 · Catálogo de anti-patrones

Los seis que motivaron este método, con el síntoma, la causa real y la regla que lo impide.

| Síntoma | Causa real | Regla que lo impide |
|---|---|---|
| «El cierre dejó datos que ya sabía falsos» | Se escribió el estado antes de fusionar y nadie volvió a medirlo | Invariantes 2 y 3 (capítulo 1) |
| «El agente nuevo arrancó creyendo un dato viejo» | El documento afirmaba un hecho sin fecha ni SHA de medición | Invariante 3 (capítulo 1) |
| «El aviso salta siempre» | Criterio de igualdad sobre un valor que cambia en cada fusión | Capítulo 5 (pertenencia, no igualdad) |
| «La prueba pasó pero no probaba nada» | Solo se probó el caso bueno | 3.3 (a): el caso malo debe fallar |
| «Funcionaba en el clon y rompió el repo» | La prueba escribió en el repo de trabajo | 3.3 (c): toda prueba en `/tmp` o clon desechable |
| «El volcado decía ser literal y traía una línea inventada» | Se escribió sobre una copia sin medir el archivo real | Invariante 6, más: **antes de escribir basándose en un volcado ajeno, se mide con `wc`, `grep` y `git show`; un recuento auto-declarado en un documento no es evidencia de nada** |

Cada fila de esta tabla nació de un incidente real y fechado (Anexo A). Cuando ocurra uno nuevo, se añade su fila: el catálogo crece con el método.

## 9 · Anexo A — El caso real (12/11/2026)

Cuatro hechos del mismo día, fehacientes. Cada regla anterior existe por alguno de estos; ninguna es teórica.

- **(a) El cierre dejó dos afirmaciones falsas.** El cierre de la Sesión 24 escribió en la bitácora v14 el SHA de `main` y el estado del PR («inexistente») justo antes de crear el PR. Lo supo porque iba a crearlo, y lo escribió igual. La sesión siguiente arrancó creyendo que había errores de alcance desconocido, y el usuario gastó su primera sesión de trabajo averiguando que no había nada. → Muta en: invariantes 2 y 3, y el capítulo 4 entero.
- **(b) El primer chequeo exigía igualdad.** El primer verificador del marcador comparaba el SHA del marcador con el `main` real por igualdad. Como cada fusión mueve a `main`, el aviso iba a saltar en todas las sesiones: ruido garantizado. Se detectó al cerrar esa misma sesión y se corrigió al criterio de pertenencia a la historia. → Muta en: capítulo 5.
- **(c) El volcado «literal» traía una línea inventada.** Un subagente entregó un volcado presentado como literal de un archivo, con un recuento de líneas que no existía en el archivo real. El escritor no lo aceptó: detuvo el paso y pidió decisión en vez de inventar el contenido. → Muta en: la celda del anti-patrón del capítulo 8 (`wc`, `grep`, `git show`) y el invariante 6.
- **(d) Dos avisos para el mismo caso, uno falso.** Un fallo de despacho hacía que una comprobación fallida emitiera dos avisos, y el segundo tenía un diagnóstico equivocado (decía «apunta a otra rama» cuando el SHA directamente no existía). Se corrigió con una cadena `if/elif/else` exclusiva: un caso, exactamente un mensaje. → Muta en: capítulo 5 y la cadena `if/elif/else` equivalente del Anexo B.

Cada una de estas reglas existe porque algo de esto ocurrió; ninguna es teórica.

## 10 · Anexo B — El verificador, completo y genérico

Script completo en Python, solo biblioteca estándar, listo para copiar a `scripts/verificar_bitacora.py` en cualquier proyecto. Se editan las cuatro constantes de arriba y nada más. Probadlo con los tres casos del Anexo C antes de fiarte de él.

```python
#!/usr/bin/env python3
"""Verificador de bitacora de proyecto (metodo de bitacora, v1).

Comprueba, con git como unica autoridad, el estado que la bitacora del
proyecto declara: rama actual, HEAD, presencia de la base remota, si
HEAD contiene la base, arbol limpio, archivos obligatorios y el marcador
"<clave> = <sha>" de la bitacora, validado por pertenencia a la historia
de la base y nunca por igualdad: cada fusion mueve la base y la igualdad
produciria un aviso garantizado en cada sesion.
No mide el estado del PR: eso lo aporta quien lo mire en el anfitrion.

Se copia tal cual a otros proyectos como scripts/verificar_bitacora.py.
La configuracion entera son las cuatro constantes de abajo. Si la
bitacora y git discrepan, manda git y se corrige el documento en esa
misma sesion.

Solo biblioteca estandar, sin dependencias. Codigos de salida:
  0 = sin FALLAS
  1 = con FALLAS
  2 = no se encontro la raiz del repositorio
El bloque del marcador nunca emite FALLA y ningun camino lanza
excepciones: todo fallo se informa, no se propaga.
"""

import os
import re
import subprocess
import sys

# --- configuracion: la unica zona que se edita en otro proyecto ---------
RAMA_BASE = "main"              # rama base del proyecto
BITACORA = "ESTADO.md"          # archivo de bitacora (estado volatil)
CLAVE_MARCADOR = "main-medido"  # clave del marcador dentro de la bitacora
ARCHIVOS_OBLIGATORIOS = []      # rutas que deben existir; vacia = no exige

# --- utilidades ---------------------------------------------------------

def git(raiz, *args):
    """Ejecuta git y devuelve (codigo, stdout, stderr). Nunca lanza."""
    try:
        p = subprocess.run(
            ["git", "-C", raiz] + list(args),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        return (
            p.returncode,
            p.stdout.decode("utf-8", "replace"),
            p.stderr.decode("utf-8", "replace"),
        )
    except Exception as e:  # cualquier fallo es un dato que informa, no un crash
        return (1, "", str(e))


def encontrar_raiz(desde):
    """Sube desde 'desde' hasta el directorio que contiene .git."""
    actual = os.path.abspath(desde)
    while True:
        if os.path.isdir(os.path.join(actual, ".git")):
            return actual
        padre = os.path.dirname(actual)
        if padre == actual:
            return None
        actual = padre


ETIQUETAS = {"OK": "[ OK ]", "AVISO": "[AVISO]", "FALLA": "[FALLA]"}
_conteo = {"OK": 0, "AVISO": 0, "FALLA": 0}


def emitir(estado, texto):
    _conteo[estado] += 1
    sys.stdout.write("%s %s\n" % (ETIQUETAS[estado], texto))


# --- comprobaciones -----------------------------------------------------

def ejecutar():
    datos = {
        "rama": "?", "head": "?", "base": "?", "contiene": "no se pudo demostrar",
        "arbol": "?", "marcador": "sin datos",
    }
    try:
        cwd = os.getcwd()
    except Exception:
        emitir("FALLA", "no se pudo leer el directorio actual")
        return (2, datos)
    raiz = encontrar_raiz(cwd)
    if raiz is None:
        emitir("FALLA", "no se encontro la raiz del repositorio (no hay .git aqui arriba)")
        return (2, datos)

    # 1. rama actual (informativa: la rama de trabajo no tiene por que ser la base)
    codigo, salida, _ = git(raiz, "rev-parse", "--abbrev-ref", "HEAD")
    datos["rama"] = salida.strip() if codigo == 0 else "?"
    if codigo == 0:
        emitir("OK", "rama actual: %s" % datos["rama"])
    else:
        emitir("AVISO", "no se pudo determinar la rama actual")

    # 2. HEAD
    codigo, salida, _ = git(raiz, "rev-parse", "HEAD")
    datos["head"] = salida.strip() if codigo == 0 else "?"
    if codigo == 0:
        emitir("OK", "HEAD: %s" % datos["head"])
    else:
        emitir("AVISO", "no se pudo determinar HEAD")

    # 3. base remota presente
    ref_base = "origin/%s" % RAMA_BASE
    codigo, _, _ = git(raiz, "rev-parse", "--verify", "--quiet", ref_base)
    hay_base = (codigo == 0)
    if hay_base:
        c, salida, _ = git(raiz, "rev-parse", ref_base)
        datos["base"] = salida.strip() if c == 0 else "?"
        emitir("OK", "la base remota %s existe (%s)" % (ref_base, datos["base"]))
    else:
        datos["base"] = "ausente"
        emitir("AVISO", "no existe %s; no se puede comparar nada con la base" % ref_base)

    # 4. HEAD contiene la base (solo si la base existe; un caso, un mensaje)
    if hay_base:
        codigo, _, _ = git(raiz, "merge-base", "--is-ancestor", ref_base, "HEAD")
        if codigo == 0:
            datos["contiene"] = "si"
            emitir("OK", "HEAD contiene a %s" % ref_base)
        elif codigo == 1:
            datos["contiene"] = "no"
            emitir("AVISO", "HEAD NO contiene a %s" % ref_base)
        else:
            datos["contiene"] = "no se pudo demostrar (codigo %d)" % codigo
            emitir("AVISO", "no se puede demostrar si HEAD contiene la base (codigo %d)" % codigo)

    # 5. arbol limpio
    codigo, salida, _ = git(raiz, "status", "--porcelain")
    if codigo != 0:
        datos["arbol"] = "?"
        emitir("AVISO", "no se pudo leer el estado del arbol")
    elif salida.strip() == "":
        datos["arbol"] = "limpio"
        emitir("OK", "arbol limpio (sin cambios sin commitear)")
    else:
        sucios = salida.strip().splitlines()
        datos["arbol"] = "sucio (%d)" % len(sucios)
        visibles = ", ".join(sucios[:5])
        if len(sucios) > 5:
            visibles += " (y %d mas)" % (len(sucios) - 5)
        emitir("AVISO", "arbol sucio (%d archivos): %s" % (len(sucios), visibles))

    # 6. archivos obligatorios
    if not ARCHIVOS_OBLIGATORIOS:
        emitir("OK", "archivos obligatorios: no hay lista configurada")
    else:
        faltan = [r for r in ARCHIVOS_OBLIGATORIOS
                  if not os.path.isfile(os.path.join(raiz, r))]
        if faltan:
            emitir("FALLA", "faltan archivos obligatorios: %s" % ", ".join(faltan))
        else:
            emitir("OK", "archivos obligatorios: %d/%d presentes"
                   % (len(ARCHIVOS_OBLIGATORIOS), len(ARCHIVOS_OBLIGATORIOS)))

    # 7. bitacora y marcador (nunca FALLA; un caso, exactamente un mensaje)
    ruta_bitacora = os.path.join(raiz, BITACORA)
    texto = None
    leido = False
    if os.path.isfile(ruta_bitacora):
        try:
            with open(ruta_bitacora, "r", encoding="utf-8", errors="replace") as f:
                texto = f.read()
            leido = True
        except Exception as e:
            emitir("AVISO", "no se pudo leer %s (%s)" % (BITACORA, e))
    else:
        emitir("AVISO", "no se encontro %s; no hay marcador que validar" % BITACORA)

    if leido and hay_base:
        m = re.search(re.escape(CLAVE_MARCADOR) + r"\s*=\s*([0-9a-fA-F]{7,40})", texto)
        if m is None:
            datos["marcador"] = "falta"
            emitir("AVISO", "falta el marcador '%s = <sha>' en %s" % (CLAVE_MARCADOR, BITACORA))
        else:
            sha = m.group(1)
            # cadena if/elif/else exclusiva: exactamente un mensaje por caso
            c_tipo, tipo, _ = git(raiz, "cat-file", "-t", sha)
            c_anc, _, _ = git(raiz, "merge-base", "--is-ancestor", sha, ref_base)
            if c_tipo != 0 or tipo.strip() != "commit":
                datos["marcador"] = "%s (no es un commit)" % sha
                emitir("AVISO", "el sha %s del marcador no existe en el repositorio o no es un commit" % sha)
            elif c_anc == 0:
                c_cnt, salida_cnt, _ = git(raiz, "rev-list", "--count", "%s..%s" % (sha, ref_base))
                if c_cnt == 0:
                    n = salida_cnt.strip()
                    datos["marcador"] = "%s (%s commits por detras)" % (sha, n)
                    emitir("OK", "el marcador (%s) esta en la historia de la base (%s commits por detras)" % (sha, n))
                else:
                    datos["marcador"] = "%s (? commits por detras)" % sha
                    emitir("OK", "el marcador (%s) esta en la historia de la base (? commits por detras)" % sha)
            elif c_anc == 1:
                datos["marcador"] = "%s (fuera de la historia de la base)" % sha
                emitir("AVISO", "el marcador (%s) NO esta en la historia de la base (apunta a otra rama?)" % sha)
            else:
                datos["marcador"] = "%s (no se pudo demostrar, codigo %d)" % (sha, c_anc)
                emitir("AVISO", "no se puede demostrar donde esta el marcador (codigo %d)" % c_anc)

    return (0 if _conteo["FALLA"] == 0 else 1, datos)


def imprimir_relevo(datos):
    """Imprime el bloque PROMPT DE RELEVO con los datos medidos."""
    lineas = [
        "=" * 72,
        "PROMPT DE RELEVO (copiar y pegar)",
        "=" * 72,
        "Eres la sesion de relevo de este proyecto. Lee las reglas del",
        "proyecto (AGENTS.md o equivalente) antes de tocar nada.",
        "",
        "Primera accion obligatoria: vuelve a ejecutar este verificador y",
        "trabaja solo con los datos que el imprima. Los sha de aqui son",
        "una foto de este momento: caducan con el siguiente commit.",
        "",
        "Estado medido por git en esta ejecucion:",
        "- rama actual       : %s" % datos["rama"],
        "- HEAD              : %s" % datos["head"],
        "- base remota       : origin/%s = %s" % (RAMA_BASE, datos["base"]),
        "- contiene la base  : %s" % datos["contiene"],
        "- arbol             : %s" % datos["arbol"],
        "- marcador          : %s" % datos["marcador"],
        "- estado del PR     : no lo mide este script (lo aporta quien cierre, medido y fechado)",
        "=" * 72,
    ]
    sys.stdout.write("\n".join(lineas) + "\n")


def principal():
    codigo, datos = ejecutar()
    if codigo == 2:
        print("RESULTADO: 0 OK, 0 AVISOS, 1 FALLAS")
        sys.exit(2)
    print("RESULTADO: %d OK, %d AVISOS, %d FALLAS"
          % (_conteo["OK"], _conteo["AVISO"], _conteo["FALLA"]))
    imprimir_relevo(datos)
    sys.exit(codigo)


if __name__ == "__main__":
    principal()
```

## 11 · Anexo C — Adaptarlo a un proyecto nuevo en 15 minutos

1. Crea los cinco archivos del capítulo 2 (`AGENTS.md`, `ESTADO.md`, `ARQUITECTURA.md`, `DECISIONES.md`, `tareas/`) aunque estén casi vacíos: la estructura es la mitad del hábito.
2. Pega la plantilla de bitácora del capítulo 6 en `ESTADO.md` y rellénala con lo que sepa hoy (nada está bien; «sin datos» es honesto, lo inventado no).
3. Antes de copiar el verificador, crea la carpeta destino: `mkdir -p scripts`.
4. Y asegúrate de que el repo tiene remoto de la base: `git remote add origin <url>` (o clona directamente desde él). Sin `origin/<base>` el marcador no se puede validar y las pruebas negativas no probarían nada: sin remoto el método se puede usar, pero el marcador queda sin validar (AVISO, nunca FALLA).
5. Copia el script del Anexo B a `scripts/verificar_bitacora.py` y rellena sus cuatro constantes: `RAMA_BASE`, `BITACORA`, `CLAVE_MARCADOR`, `ARCHIVOS_OBLIGATORIOS` (deja la lista vacía si aún no tienes archivos que exigir).
6. Añade el marcador a la bitácora con el SHA real de la base: `git rev-parse origin/<base>` y pégalo en el comentario.
7. Ejecuta `python3 scripts/verificar_bitacora.py` y comprueba que da `0 FALLAS`. Si hay algún FALLA, arréglalo antes de empezar a trabajar; si hay un AVISO, léelo y decide: para eso avisa.
8. Prueba los casos negativos (marcador con `deadbee`, y sin marcador): el verificador debe avisar y no fallar. Un verificador probado solo en el caso bueno está medio probado (3.3 (a)).
9. **Nota:** si el proyecto no usa git, este método no aplica tal cual. Lo trasladable sin git es la disciplina de versiones, criterios con evidencia y cierre con relevo; el verificador se convierte en una lista de comprobaciones manuales que la sesión nueva ejecuta a mano.
