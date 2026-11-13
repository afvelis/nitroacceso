# -*- coding: utf-8 -*-
"""
verificar-arranque.py — La verdad del repo nitroacceso, medida en el momento.

QUE HACE
  Imprime el estado real del repositorio leyendo git y los archivos del repo:
  rama actual, HEAD, origin/main, si la rama contiene a main, si la copia
  local esta al dia con origin/<rama> (commits por detras o sin empujar),
  arbol limpio, archivos obligatorios (entre ellos la receta de arranque
  docs/arranque-de-sesion.md), coherencia del ID de staging en la documentacion,
  rutas muertas en documentos, el marcador 'main-medido' de ESTADO.md
  (comparado con el main real: AVISA si envejece, nunca FALLA), parametros
  de URL documentados (incluida la
  tabla de la seccion 9 de docs/dev-local.md, verificada contra el codigo),
  PR de la rama (solo si hay red) y pendientes de prueba de la tarea F-7.
  Al final imprime un bloque "PROMPT DE RELEVO" con datos reales, listo para
  copiar y pegar como arranque del siguiente agente.

COMO SE USA
  Windows :  py scripts\verificar-arranque.py
  Linux   :  python3 scripts/verificar-arranque.py
  Solo biblioteca estandar de Python 3. Sin dependencias externas.
  No escribe nada en disco ni modifica el repositorio.
  Toda la salida es ASCII puro (sin acentos, sin enies, sin emojis) para que
  cmd.exe de Windows no la corrompa.

CODIGOS DE SALIDA
  0  no hay ninguna FALLA (los AVISO no cuentan)
  1  hay al menos una FALLA
  2  no se encontro la raiz del repo (falta .git o config.js)
"""

import json
import os
import re
import socket
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

# ----------------------------------------------------------------------
# 1) Localizar la raiz del repo: subir desde el script (o el cwd) hasta
#    encontrar un directorio que tenga .git y config.js.
# ----------------------------------------------------------------------
PRODUCCION_ID = "exrbwctegkzxurzwihvh"
STAGING_PREFIJO = "adoqujnnn"
VARIANTE_STAGING_RE = r"adoqu[a-z0-9]{15}"  # 20 chars que empiezan por 'adoqu'
RUTA_MUERTA = "Supabase Snippet Untitled query.csv"
ARCHIVOS_OBLIGATORIOS = [
    "AGENTS.md",
    "ESTADO.md",
    "ARQUITECTURA.md",
    "DECISIONES.md",
    "config.js",
    "stand.html",
    "dashboard.html",
    "index.html",
    "js/stand.js",
    "js/dashboard.js",
    "scripts/dev-server.py",
    "tareas/README.md",
    "supabase/seed.sql",
    "supabase/migrations/0001_esquema_inicial.sql",
    "docs/manual-usuario/00-indice.md",
    "docs/dev-local.md",
    "docs/arranque-de-sesion.md",
    ".github/workflows/keep-supabase-alive.yml",
]
PARAMETROS_ESPERADOS = {
    "js/stand.js": "s",
    "js/cortesia.js": "c",
    "js/aliado.js": "a",
    "js/coord.js": "c",
}
ARCHIVOS_CONTAR_ID = ["ESTADO.md", "docs/dev-local.md", "ARQUITECTURA.md"]
ARCHIVO_F7 = "tareas/F-7-modales-nativos.md"


def localizar_raiz():
    """Sube desde el dir del script y desde el cwd hasta hallar .git + config.js."""
    candidatos = [
        os.path.dirname(os.path.abspath(__file__)),
        os.path.abspath(os.getcwd()),
    ]
    for inicio in candidatos:
        actual = inicio
        while True:
            if os.path.isdir(os.path.join(actual, ".git")) and \
               os.path.isfile(os.path.join(actual, "config.js")):
                return actual
            padre = os.path.dirname(actual)
            if padre == actual:
                break
            actual = padre
    return None


# ----------------------------------------------------------------------
# 2) Helpers de salida y de git.
# ----------------------------------------------------------------------
_resultados = []  # lista de (estado, etiqueta, detalle)


def _imprimir(estado, etiqueta, detalle):
    if estado == "OK":
        prefijo = "[ OK ]  "
    elif estado == "FALLA":
        prefijo = "[FALLA] "
    else:
        prefijo = "[AVISO] "
    base = prefijo + etiqueta[:34].ljust(34)
    puntos = "." * max(1, 54 - len(base))
    linea = base + puntos + " " + detalle
    _resultados.append((estado, etiqueta, detalle))
    print(linea)


def marca(ok, etiqueta, detalle):
    """Estado 'ok' es 'OK', 'FALLA' o 'AVISO': acumula e imprime una linea."""
    _imprimir(ok, etiqueta, detalle)


def detalle_extra(texto):
    """Linea adicional (sin marca) con sangria de 4 espacios."""
    print("    " + texto)


def git(raiz, *args):
    """Ejecuta git -C <raiz> <args>. Nunca lanza: devuelve (codigo, out, err)."""
    try:
        proc = subprocess.run(
            ["git", "-C", raiz] + list(args),
            capture_output=True,
            text=True,
            timeout=30,
        )
        return proc.returncode, proc.stdout.strip(), proc.stderr.strip()
    except Exception as exc:  # git ausente, timeout, etc.
        return 1, "", str(exc)


def leer_archivo(raiz, ruta_rel):
    ruta = os.path.join(raiz, ruta_rel.replace("/", os.sep))
    try:
        with open(ruta, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return None


def _a_ascii(texto):
    """Reduce un texto a ASCII puro quitando acentos (para la salida del script)."""
    return unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")


def _formas_parametro(param):
    """Formas EXACTAS con las que el codigo puede nombrar un parametro de
    URL, evaluadas sobre el trozo de lineas citado y siempre con el nombre
    del parametro completo (nunca una letra o subcadena suelta).
    Lista CERRADA: es la definicion de "forma valida de leer un parametro"
    del chequeo de la seccion 9 de docs/dev-local.md. Ampliarla es una
    decision, no un parche.
    """
    return (
        "'" + param + "'",
        '"' + param + '"',
        "?" + param + "=",
        "[?&]" + param + "=",
        ".get('" + param + "')",
        ".has('" + param + "')",
    )


def listar_archivos(raiz, extensiones, excluir_dirs):
    """Recorre el repo y devuelve rutas relativas con las extensiones dadas."""
    encontrados = []
    for dirpath, dirnames, filenames in os.walk(raiz):
        dirnames[:] = [d for d in dirnames if d not in excluir_dirs]
        for nombre in filenames:
            if any(nombre.endswith(ext) for ext in extensiones):
                rel = os.path.relpath(os.path.join(dirpath, nombre), raiz)
                encontrados.append(rel.replace(os.sep, "/"))
    encontrados.sort()
    return encontrados


def extraer_owner_repo(url_remote):
    """Saca (owner, repo) de una URL de origin, SSH o https."""
    texto = url_remote.strip()
    texto = re.sub(r"\.git$", "", texto)
    m = re.search(r"git@github\.com:([^/]+)/([^/]+)$", texto)
    if m:
        return m.group(1), m.group(2)
    m = re.search(r"https?://[^/]*github\.com[^/]*/([^/]+)/([^/]+)$", texto)
    if m:
        return m.group(1), m.group(2)
    return None, None


# ----------------------------------------------------------------------
# 3) Programa principal.
# ----------------------------------------------------------------------
def main():
    raiz = localizar_raiz()
    if raiz is None:
        print("[FALLA] No se encontro la raiz del repo nitroacceso.")
        print("        Se necesita un directorio con .git y config.js,")
        print("        buscado hacia arriba desde el script y desde el cwd.")
        print("        Ejecuta el script dentro del repo clonado.")
        return 2

    cwd = os.path.abspath(os.getcwd())

    # a. rama actual ------------------------------------------------------
    codigo, out, err = git(raiz, "rev-parse", "--abbrev-ref", "HEAD")
    rama = out if codigo == 0 and out else "(desconocida)"
    if codigo != 0:
        marca("FALLA", "rama actual", "git fallo: " + (err or "sin detalle"))
    elif rama == "HEAD":
        marca("FALLA", "rama actual",
              "detached HEAD: no hay rama, haz checkout de la rama de trabajo")
    else:
        marca("OK", "rama actual", rama)

    # b. HEAD -------------------------------------------------------------
    codigo, out, _ = git(raiz, "rev-parse", "--short", "HEAD")
    sha_head = out if codigo == 0 and out else "(desconocido)"
    marca("OK" if codigo == 0 else "FALLA", "HEAD", "commit actual: " + sha_head)

    # c. origin/main presente ---------------------------------------------
    codigo, out, _ = git(raiz, "rev-parse", "--verify", "--quiet", "origin/main")
    sha_main = out if codigo == 0 and out else ""
    if codigo == 0 and sha_main:
        marca("OK", "origin/main presente", sha_main)
    else:
        marca("FALLA", "origin/main presente",
              "no existe origin/main local; ejecuta: git fetch origin --prune")

    # d. raiz del repo ----------------------------------------------------
    if cwd == raiz:
        marca("OK", "raiz del repo", "el cwd es la raiz")
    else:
        marca("AVISO", "raiz del repo",
              "el cwd no es la raiz; usa: " + raiz)

    # e. arbol limpio ------------------------------------------------------
    codigo, out, _ = git(raiz, "status", "--porcelain")
    if codigo != 0:
        marca("AVISO", "arbol limpio", "git status fallo; no se pudo verificar")
    elif out == "":
        marca("OK", "arbol limpio", "sin cambios ni archivos sin trackear")
    else:
        sucios = [l for l in out.splitlines() if l.strip()]
        marca("AVISO", "arbol limpio",
              str(len(sucios)) + " archivo(s) con cambios sin commit")
        for linea in sucios:
            # El strip() global de git() puede quitar el espacio inicial de la
            # primera linea; el regex tolera ambas formas (" M x" y "M  x").
            m_st = re.match(r"^(.{1,2})\s+(.+)$", linea)
            if not m_st:
                detalle_extra(linea)
                continue
            estado, ruta = m_st.group(1).strip(), m_st.group(2).strip()
            etiqueta = "(sin trackear)" if estado == "??" else "(modificado)"
            detalle_extra(ruta + " " + etiqueta)

    # f. contiene main -----------------------------------------------------
    commits_retraso = None
    if sha_main:
        codigo, _, _ = git(raiz, "merge-base", "--is-ancestor", "origin/main", "HEAD")
        if codigo == 0:
            marca("OK", "contiene main", "0 commits de retraso")
            contiene_main_ok = True
        else:
            _, out_c, _ = git(raiz, "rev-list", "--count", "HEAD..origin/main")
            try:
                commits_retraso = int(out_c)
            except ValueError:
                commits_retraso = None
            texto = ("falta commit(s) de origin/main: " + out_c) if out_c else \
                    "la rama no contiene a origin/main"
            marca("FALLA", "contiene main", texto)
            contiene_main_ok = False
    else:
        marca("FALLA", "contiene main",
              "no verificable sin origin/main; ejecuta: git fetch origin --prune")
        contiene_main_ok = False

    # f2. actualizado con origin (la propia rama remota) -------------------
    # Detecta el caso mas frecuente de "no esta actualizado": la copia local
    # va por detras de SU PROPIA rama remota (otro empujo y aqui no se hizo
    # git pull). Nunca dar OK si la comprobacion no se pudo completar.
    actualizada_txt = "no verificable (sin origin/" + rama + ")"
    if rama == "(desconocida)" or rama == "HEAD":
        marca("AVISO", "actualizado con origin",
              "no verificable: rama desconocida o detached HEAD")
    else:
        nombre_remoto = "origin/" + rama
        codigo, out_or, _ = git(raiz, "rev-parse", "--verify", "--quiet",
                                nombre_remoto)
        if codigo != 0 or not out_or:
            marca("AVISO", "actualizado con origin",
                  "la rama no existe en origin (nunca se ha empujado)")
        else:
            codigo_f, out_f, err_f = git(raiz, "rev-list", "--count",
                                         "HEAD.." + nombre_remoto)
            codigo_s, out_s, err_s = git(raiz, "rev-list", "--count",
                                         nombre_remoto + "..HEAD")
            if codigo_f != 0 or codigo_s != 0:
                motivo = (err_f if codigo_f != 0 else err_s) or "sin detalle"
                marca("AVISO", "actualizado con origin",
                      "git rev-list fallo: " + motivo)
            elif not (out_f.isdigit() and out_s.isdigit()):
                marca("AVISO", "actualizado con origin",
                      "git rev-list devolvio una salida no numerica")
            else:
                faltan = int(out_f)
                sobran = int(out_s)
                if faltan > 0:
                    plural = "" if faltan == 1 else "s"
                    marca("FALLA", "actualizado con origin",
                          "tu copia esta " + str(faltan) + " commit" + plural +
                          " por detras de " + nombre_remoto +
                          "; ejecuta: git pull")
                    actualizada_txt = ("no (" + str(faltan) + " commit" +
                                       plural + " de retraso respecto a " +
                                       nombre_remoto + ")")
                elif sobran > 0:
                    plural = "" if sobran == 1 else "s"
                    marca("AVISO", "actualizado con origin",
                          str(sobran) + " commit" + plural +
                          " locales sin empujar (git push)")
                    actualizada_txt = "si (al dia con " + nombre_remoto + ")"
                else:
                    marca("OK", "actualizado con origin",
                          "al dia con " + nombre_remoto)
                    actualizada_txt = "si (al dia con " + nombre_remoto + ")"

    # g. commits propios sobre main ----------------------------------------
    if sha_main:
        codigo, out_c, err_c = git(raiz, "rev-list", "--count", "origin/main..HEAD")
        if codigo != 0:
            marca("AVISO", "commits propios sobre main",
                  "git rev-list fallo: " + (err_c or "sin detalle"))
        else:
            marca("OK", "commits propios sobre main", out_c or "0")
    else:
        marca("AVISO", "commits propios sobre main",
              "no verificable sin origin/main")

    # h. archivos obligatorios ---------------------------------------------
    faltantes = [r for r in ARCHIVOS_OBLIGATORIOS
                 if not os.path.isfile(os.path.join(raiz, r.replace("/", os.sep)))]
    if not faltantes:
        marca("OK", "archivos obligatorios",
              str(len(ARCHIVOS_OBLIGATORIOS)) + " de " +
              str(len(ARCHIVOS_OBLIGATORIOS)))
    else:
        for ruta in faltantes:
            marca("FALLA", "archivos obligatorios", "falta: " + ruta)

    # i. id de staging coherente -------------------------------------------
    texto_config = leer_archivo(raiz, "config.js")
    id_staging = None
    if texto_config:
        # URLs https://<20 chars>.supabase.co que NO sean las de produccion.
        urls = re.findall(r"https://([a-z0-9]{20})\.supabase\.co", texto_config)
        candidatas = [u for u in urls if u != PRODUCCION_ID]
        con_prefijo = [u for u in candidatas if u.startswith(STAGING_PREFIJO)]
        if len(con_prefijo) == 1:
            id_staging = con_prefijo[0]
        elif len(candidatas) == 1:
            id_staging = candidatas[0]
    if id_staging is None:
        marca("FALLA", "id de staging coherente",
              "no se pudo leer el ID de staging de config.js")
    else:
        conteos = []
        for rel in ARCHIVOS_CONTAR_ID:
            texto = leer_archivo(raiz, rel)
            n = texto.count(id_staging) if texto else 0
            conteos.append(rel + "=" + str(n))
        marca("OK", "id de staging coherente",
              "ID " + id_staging + " (" + ", ".join(conteos) + ")")
        # Variante mal escrita: cualquier cadena de 20 caracteres que empiece
        # por 'adoqu' y NO coincida exactamente con el ID de config.js. Asi se
        # detecta una errata en cualquier posicion, no solo tras el prefijo.
        # FALLA solo si la variante forma una URL usable (alguien podria
        # copiarla y usarla). Suelta en prosa o entre backticks es AVISO,
        # porque puede ser una cita historica deliberada (p. ej. la nota (r)
        # de P1-04 que documenta la correccion de la ref mal transcrita).
        MARCAS_CITA = ("sin la v", "mal transcrita", "correccion")
        fallas_url = []
        avisos_suelta = []
        for rel in listar_archivos(raiz, [".md", ".js", ".py"],
                                   {".git", "historico", "vendor", "node_modules"}):
            texto = leer_archivo(raiz, rel)
            if not texto or "adoqu" not in texto:
                continue
            for num_linea, linea in enumerate(texto.splitlines(), 1):
                for cand in re.findall(VARIANTE_STAGING_RE, linea):
                    if cand == id_staging:
                        continue
                    # URL usable: https://<candidato>.supabase.co o http://.
                    es_url = re.search(
                        r"https?://" + re.escape(cand) + r"\.supabase\.co",
                        linea) is not None
                    if es_url:
                        fallas_url.append(rel + ":" + str(num_linea)
                                          + "  URL con '" + cand + "'")
                    else:
                        # AVISO: archivo:linea + fragmento de ~60 caracteres
                        # alrededor de la aparicion, en ASCII puro.
                        pos = linea.find(cand)
                        frag = _a_ascii(
                            linea[max(0, pos - 20):pos + len(cand) + 20])[:60]
                        linea_plana = _a_ascii(linea.lower())
                        es_cita = any(m in linea_plana for m in MARCAS_CITA)
                        avisos_suelta.append(
                            rel + ":" + str(num_linea) + " '" + cand + "'"
                            + (" (cita historica)" if es_cita else "")
                            + "  ..." + frag + "...")
        if fallas_url:
            marca("FALLA", "id de staging coherente",
                  "variante mal escrita del ID dentro de una URL")
            for v in fallas_url:
                detalle_extra(v)
            for v in avisos_suelta:
                detalle_extra("(suelta, AVISO) " + v)
        elif avisos_suelta:
            marca("AVISO", "id de staging coherente",
                  "variante suelta del ID sin formar URL (posible cita historica)")
            for v in avisos_suelta:
                detalle_extra(v)
        else:
            marca("OK", "id de staging coherente",
                  "sin variantes mal escritas del prefijo 'adoqu'")

    # j. rutas muertas en documentos ---------------------------------------
    # FALLA solo si la ruta muerta se cita como archivo consultable. Si la
    # linea la menciona en un registro historico (un renombrado ya HECHO,
    # una correccion), es AVISO: borrarlo destruiria el registro.
    MARCAS_RUTA_HISTORICA = ("renombrar", "renombrado", "renombrar a",
                             "higiene", "hecho", "registro historico",
                             "correccion")
    fallas_ruta = []
    avisos_ruta = []
    for rel in listar_archivos(raiz, [".md"], {".git", "historico"}):
        texto = leer_archivo(raiz, rel)
        if not texto or RUTA_MUERTA not in texto:
            continue
        for num_linea, linea in enumerate(texto.splitlines(), 1):
            if RUTA_MUERTA not in linea:
                continue
            linea_plana = _a_ascii(linea.lower())
            if any(m in linea_plana for m in MARCAS_RUTA_HISTORICA):
                avisos_ruta.append(rel + ":" + str(num_linea)
                                   + " (registro historico)  ..."
                                   + _a_ascii(linea.strip())[:60] + "...")
            else:
                fallas_ruta.append(rel + ":" + str(num_linea))
    if fallas_ruta:
        marca("FALLA", "rutas muertas en documentos",
              "'" + RUTA_MUERTA + "' aparece en " + str(len(fallas_ruta)) + " sitio(s)")
        for a in fallas_ruta:
            detalle_extra(a)
    if avisos_ruta:
        marca("AVISO", "rutas muertas en documentos",
              "menciones historicas de la ruta (renombrados/correcciones): "
              + str(len(avisos_ruta)))
        for a in avisos_ruta:
            detalle_extra(a)
    if not fallas_ruta and not avisos_ruta:
        marca("OK", "rutas muertas en documentos",
              "0 apariciones de la ruta muerta")

    # j2. marcador 'main-medido' de ESTADO.md ------------------------------
    # ESTADO.md ya no afirma el SHA de main: lo lleva un comentario HTML
    # ('main-medido = <sha>') que este script compara con el main REAL.
    # Desajuste o marcador ausente es AVISO, nunca FALLA: un documento
    # desactualizado no empeora el estado del repositorio.
    texto_estado = leer_archivo(raiz, "ESTADO.md")
    m_marcador = (re.search(r"main-medido\s*=\s*([0-9a-fA-F]{7,40})",
                            texto_estado) if texto_estado else None)
    if not m_marcador:
        marca("AVISO", "sha de main en documentos",
              "falta el marcador main-medido en ESTADO.md")
    else:
        marcador = m_marcador.group(1).lower()
        if sha_main:
            sha_referencia = sha_main
        else:
            # Mismo criterio que el script usa para origin/main: si no
            # existe, se cae a la ref local main; no se inventan refs.
            _, out_m, _ = git(raiz, "rev-parse", "--verify", "--quiet", "main")
            sha_referencia = out_m if out_m else ""
        if not sha_referencia:
            marca("AVISO", "sha de main en documentos",
                  "no verificable: ni origin/main ni main existen")
        elif sha_referencia.startswith(marcador):
            marca("OK", "sha de main en documentos",
                  "ESTADO.md declara main en " + marcador + " y coincide")
        else:
            marca("AVISO", "sha de main en documentos",
                  "ESTADO.md declara main en " + marcador +
                  " y el real es " + sha_referencia[:40] +
                  ": actualiza el marcador main-medido o quita el dato; "
                  "un dato rancio no se deja callado")

    # k. parametros de url documentados ------------------------------------
    avisos_params = []
    param_leido = {}
    for rel, esperado in PARAMETROS_ESPERADOS.items():
        texto = leer_archivo(raiz, rel)
        if texto is None:
            avisos_params.append(rel + ": archivo no encontrado")
            continue
        # Dos formas posibles: params.get('X') y
        # new URLSearchParams(window.location.search).get('X')
        m = re.search(r"(?:params\.get|search\)\.get)\('([^']+)'\)", texto)
        if not m:
            avisos_params.append(rel + ": no se halla params.get() ni search).get()")
            continue
        param = m.group(1)
        param_leido[rel] = param
        if param != esperado:
            avisos_params.append(rel + ": codigo lee '?param=" + param +
                                 "', se esperaba " + esperado)
        texto_arq = leer_archivo(raiz, "ARQUITECTURA.md")
        if texto_arq is None:
            avisos_params.append("ARQUITECTURA.md: archivo no encontrado")
        elif ("?" + param + "=") not in texto_arq:
            avisos_params.append(rel + ": el literal '?" + param +
                                 "=\' no aparece en ARQUITECTURA.md")
    if avisos_params:
        marca("AVISO", "parametros de url documentados",
              "el documento no refleja el codigo en " +
              str(len(avisos_params)) + " punto(s)")
        for a in avisos_params:
            detalle_extra(a)
    else:
        leidos = ", ".join(k + "=?" + v for k, v in sorted(param_leido.items()))
        marca("OK", "parametros de url documentados", leidos)

    # k2. tabla de la seccion 9 de docs/dev-local.md ------------------------
    # Comprueba que la tabla de datos de referencia de docs/dev-local.md §9
    # sigue siendo verdad: para cada fila, cada (parametro, archivo.js:linea)
    # debe cumplirse en el codigo. Filas sin parametro ("ninguno") se ignoran.
    texto_dev = leer_archivo(raiz, "docs/dev-local.md")
    if texto_dev is None:
        marca("AVISO", "seccion 9 de dev-local", "docs/dev-local.md no encontrado")
    else:
        m9 = re.search(r"(?m)^##\s*9\b[^\n]*$", texto_dev)
        seccion9 = ""
        if m9:
            resto = texto_dev[m9.end():]
            m_sig = re.search(r"(?m)^##\s", resto)
            seccion9 = resto[:m_sig.start()] if m_sig else resto
        if not seccion9:
            marca("AVISO", "seccion 9 de dev-local",
                  "no se localiza la seccion '## 9' en docs/dev-local.md")
        else:
            fallas9 = []
            filas_ok = 0
            for linea in seccion9.splitlines():
                linea = linea.strip()
                if not linea.startswith("|"):
                    continue
                params = re.findall(r"`\?([a-zA-Z_]+)=`", linea)
                if not params:
                    continue  # fila sin parametro (p. ej. "ninguno"): ignorar
                # La fila declara "lector generico" (sin mayusculas ni tildes):
                # solo en esa fila se acepta el lector generico del codigo.
                lector_generico = "lector generico" in _a_ascii(linea).lower()
                refs = re.findall(
                    r"`([a-zA-Z0-9_/-]+\.js):(\d+)(?:-(\d+))?`", linea)
                if not refs:
                    fallas9.append("fila con " + ",".join(params) +
                                   " sin referencia `archivo.js:linea` interpretable")
                    continue
                filas_ok += 1
                for param in params:
                    for js_rel, l_ini, l_fin in refs:
                        inicio = int(l_ini)
                        fin = int(l_fin) if l_fin else inicio
                        texto_js = leer_archivo(raiz, js_rel)
                        if texto_js is None:
                            fallas9.append(js_rel + ":" + l_ini +
                                           " (parametro ?" + param +
                                           "=): el archivo no existe")
                            continue
                        lineas_js = texto_js.splitlines()
                        if inicio < 1 or fin > len(lineas_js):
                            fallas9.append(js_rel + ":" + l_ini +
                                           " (parametro ?" + param +
                                           "=): linea fuera de rango (el archivo tiene "
                                           + str(len(lineas_js)) + " lineas)")
                            continue
                        trozo = "\n".join(lineas_js[inicio - 1:fin])
                        # El parametro debe aparecer como TOKEN exacto (ver
                        # _formas_parametro); un 'in' de subcadena plana se
                        # dejaria enganar por una letra suelta en la linea.
                        lee_param = any(f in trozo
                                        for f in _formas_parametro(param))
                        lee_generico = ("location.search" in trozo
                                        or "URLSearchParams" in trozo)
                        if not (lee_param or (lector_generico and lee_generico)):
                            fallas9.append(js_rel + ":" + l_ini +
                                           " (parametro ?" + param +
                                           "=): la linea no lee el parametro "
                                           "con una forma valida")
            if fallas9:
                marca("FALLA", "seccion 9 de dev-local",
                      "la tabla de la seccion 9 no coincide con el codigo en " +
                      str(len(fallas9)) + " punto(s)")
                for f in fallas9:
                    detalle_extra(f)
            elif filas_ok == 0:
                marca("FALLA", "seccion 9 de dev-local",
                      "la seccion 9 no aporta ninguna fila verificable")
            else:
                marca("OK", "seccion 9 de dev-local",
                      str(filas_ok) + " filas de la seccion 9 verificadas")

    # l. PR de la rama (solo si hay red; nunca FALLA) -----------------------
    pr_verificado = False
    codigo, out_url, _ = git(raiz, "remote", "get-url", "origin")
    owner, repo = (None, None)
    if codigo == 0 and out_url:
        owner, repo = extraer_owner_repo(out_url)
    tiene_red = False
    try:
        socket.create_connection(("api.github.com", 443), timeout=3).close()
        tiene_red = True
    except OSError:
        tiene_red = False
    if rama == "(desconocida)" or rama == "HEAD":
        marca("AVISO", "PR de la rama", "no verificado: rama desconocida")
    elif owner and repo and tiene_red:
        head_filtro = owner + ":" + rama
        api = ("https://api.github.com/repos/" + owner + "/" + repo +
               "/pulls?state=all&head=" + urllib.parse.quote(head_filtro, safe="") +
               "&per_page=100")
        try:
            req = urllib.request.Request(api, headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "verificar-arranque",
            })
            with urllib.request.urlopen(req, timeout=6) as resp:
                datos = json.loads(resp.read().decode("utf-8"))
            if not isinstance(datos, list):
                marca("AVISO", "PR de la rama", "respuesta inesperada de la API")
            elif len(datos) == 0:
                marca("OK", "PR de la rama", "no existe PR para esta rama")
            else:
                marca("AVISO", "PR de la rama",
                      str(len(datos)) + " PR asociado(s) a esta rama")
                for pr in datos:
                    num = pr.get("number", "?")
                    estado = pr.get("state", "?")
                    url = pr.get("html_url", "(sin url)")
                    detalle_extra("#" + str(num) + " " + estado + " " + url)
            pr_verificado = True
        except urllib.error.HTTPError as exc:
            marca("AVISO", "PR de la rama",
                  "no verificado: HTTP " + str(exc.code) + " de la API de GitHub")
        except (urllib.error.URLError, socket.timeout):
            marca("AVISO", "PR de la rama", "no verificado (sin red)")
        except Exception as exc:
            marca("AVISO", "PR de la rama",
                  "no verificado: error inesperado (" + type(exc).__name__ + ")")
    else:
        marca("AVISO", "PR de la rama", "no verificado (sin red)")

    # m. que esta pendiente de probar (F-7) --------------------------------
    texto_f7 = leer_archivo(raiz, ARCHIVO_F7)
    if texto_f7 is None:
        marca("AVISO", "pendiente de probar",
              ARCHIVO_F7 + " no existe en este repo")
    else:
        # Solo la seccion de criterios de aceptacion.
        seccion = texto_f7
        m = re.search(r"(?im)^\s*#+.*criterios\s+de\s+acepta", texto_f7)
        if m:
            resto = texto_f7[m.end():]
            m_sig = re.search(r"(?m)^\s*#+\s", resto)
            seccion = resto[:m_sig.start()] if m_sig else resto
        pend = len(re.findall(r"(?m)^\s*-\s\[\s\]", seccion))
        hechos = len(re.findall(r"(?m)^\s*-\s\[[xX]\]", seccion))
        marca("OK", "pendiente de probar",
              "F-7 criterios: " + str(hechos) + " probados, " +
              str(pend) + " pendientes")

    # ----------------------------------------------------------------------
    # 4) RESUMEN FINAL + bloque de relevo.
    # ----------------------------------------------------------------------
    ok_n = sum(1 for e, _, _ in _resultados if e == "OK")
    aviso_n = sum(1 for e, _, _ in _resultados if e == "AVISO")
    falla_n = sum(1 for e, _, _ in _resultados if e == "FALLA")
    print("")
    print("RESULTADO: " + str(ok_n) + " OK, " + str(aviso_n) + " AVISOS, " +
          str(falla_n) + " FALLAS")
    print("")
    print("=" * 64)
    print(" PROMPT DE RELEVO (copiar y pegar al siguiente agente)")
    print("=" * 64)
    print("Sesion nueva del proyecto nitroacceso. Antes de nada, lee AGENTS.md COMPLETO.")
    print("")
    fecha = time.strftime("%Y-%m-%d")
    if contiene_main_ok:
        contiene_txt = "si (0 commits de retraso)"
    elif commits_retraso is not None:
        contiene_txt = "no (" + str(commits_retraso) + " commits de retraso)"
    else:
        contiene_txt = "no (sin origin/main local)"
    print("Estado medido el " + fecha + ":")
    print("  rama de trabajo : " + rama)
    print("  HEAD de la rama : " + sha_head)
    print("  HEAD de main    : " + (sha_main if sha_main else "(n/d)"))
    print("  contiene main   : " + contiene_txt)
    print("  actualizada     : " + actualizada_txt)
    print("")
    print("Primera accion obligatoria:")
    print("  py scripts\\verificar-arranque.py")
    print("Su salida es la fuente de verdad sobre rama, SHA, arbol limpio y PR.")
    print("No confies en los SHA ni en los contadores escritos en ESTADO.md: caducan.")
    print("Receta de arranque: docs/arranque-de-sesion.md")
    print("=" * 64)

    return 0 if falla_n == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
