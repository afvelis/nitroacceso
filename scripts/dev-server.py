#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dev-server.py — servidor de desarrollo LOCAL para nitroacceso.

¿Para qué sirve?
    El repo y GitHub Pages mantienen un CSP estricto (connect-src solo apunta
    al Supabase de producción). Ese CSP NO se toca en el repo. Para probar con
    datos ficticios del entorno de staging hace falta, en local, retirar el CSP
    y forzar window.__NA_ENV__ = "staging" antes de cargar config.js. Este
    servidor hace ambas cosas SOLO EN LA RESPUESTA HTTP, nunca en disco:
    el repo permanece intacto byte a byte.

Cómo consigue staging sin tocar el repo:
    config.js resuelve el entorno leyendo window.__NA_ENV__ (la variable tiene
    prioridad después del blindaje github.io). Como en local el host es
    127.0.0.1/localhost, el blindaje no aplica y la variable decide. Por eso
    este servidor inyecta <script>window.__NA_ENV__ = "staging";</script>
    inmediatamente ANTES de la etiqueta que carga config.js.

Garantías:
    - Solo biblioteca estándar de Python 3 (http.server, socketserver, argparse,
      re y utilidades de la stdlib). Sin dependencias externas.
    - Solo escucha en loopback (127.0.0.1 por defecto); rechaza cualquier otra
      interfaz con un mensaje claro: es una herramienta local.
    - Sirve archivos desde la raíz del repo sin salir de ella (protección
      frente a rutas traversal).
"""

import argparse
import mimetypes
import posixpath
import re
import socket
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

# ---------------------------------------------------------------------------
# Raíz del repo: este script vive en <raiz>/scripts/, así que la raíz es su
# directorio padre. Todo lo servido se resuelve relativo a esa raíz.
# ---------------------------------------------------------------------------
RAIZ = Path(__file__).resolve().parent.parent

# Meta CSP del repo (producción). Se retira la etiqueta COMPLETA, sea de una
# línea o de varias. La regex tolera comillas simples o dobles, atributos en
# cualquier orden, mayúsculas/minúsculas y saltos de línea dentro de la
# etiqueta, y no toca nada más del documento.
RE_META_CSP = re.compile(
    r"<meta\b[^>]*http-equiv\s*=\s*[\"']content-security-policy[\"'][^>]*>",
    re.IGNORECASE | re.DOTALL,
)

# Etiqueta que carga config.js. La inyección va INMEDIATAMENTE antes de ella
# para que config.js lea window.__NA_ENV__ en el momento de su carga.
RE_SCRIPT_CONFIG = re.compile(
    r"<script\b[^>]*\bsrc\s*=\s*[\"']config\.js[\"'][^>]*>",
    re.IGNORECASE,
)

# Inyección del entorno para las páginas servidas en local.
SCRIPT_ENTORNO = '<script>window.__NA_ENV__ = "staging";</script>'

# Content-Type fijados aparte: no conviene fiarse del registro del sistema
# para las fuentes web (algunas plataformas devuelven octet-stream).
TIPOS_EXTRA = {
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
}


def preparar_html(cuerpo: bytes, ruta_log, log):
    """Prepara la RESPUESTA de un HTML: sin CSP y con entorno staging.

    Trabaja sobre los bytes que se van a enviar, nunca sobre el archivo del
    repo. `log` es el objeto de registro del handler (ovillo: se pasa aquí
    para que la línea de log quede en un solo sitio).
    """
    texto = cuerpo.decode("utf-8", errors="replace")

    # a) Retirar la meta CSP completa (una o varias líneas).
    texto, num_csp = RE_META_CSP.subn("", texto)
    retirado_csp = num_csp > 0

    # b) Inyectar window.__NA_ENV__ justo antes de la carga de config.js.
    inyectado = False
    borde_carga = RE_SCRIPT_CONFIG.search(texto)
    if borde_carga:
        texto = (texto[: borde_carga.start()] + SCRIPT_ENTORNO
                 + texto[borde_carga.start():])
        inyectado = True
    else:
        # Si no hay etiqueta de config.js no hay nada que inyectar: la página
        # quedaría en producción. Se advierte por consola, no se rompe nada.
        log.aviso(f"{ruta_log}: no se encontró la etiqueta que carga config.js; "
                  "NO se inyectó window.__NA_ENV__")

    log.cabecera_retirada_csp = retirado_csp
    log.entorno_inyectado = inyectado
    log.registrar_html(ruta_log)
    return texto.encode("utf-8")


class ManejadorLocal(SimpleHTTPRequestHandler):
    """Handler con raíz fija en la raíz del repo y HTML preparado para local."""

    EXTENSIONES_HTML = {".html"}

    def do_GET(self):  # noqa: N802 (es la API de http.server)
        self._servir()

    def do_HEAD(self):  # noqa: N802
        self._servir()

    # --- Núcleo común de GET y HEAD -----------------------------------------
    def _servir(self):
        ruta_url = urlparse(self.path).path
        ruta_limpia = posixpath.normpath(unquote(ruta_url))
        if ruta_limpia in ("", ".", "/"):
            ruta_limpia = "/index.html"
        # Protección frente a traversal: la ruta final debe quedar DENTRO de
        # la raíz del repo, sin excepciones.
        candidato = (RAIZ / ruta_limpia.lstrip("/\\")).resolve()
        try:
            candidato.relative_to(RAIZ)
        except ValueError:
            self.send_error(403, "Fuera de la raiz del repo")
            return

        # Comportamiento tipo GitHub Pages: /carpeta/ -> /carpeta/index.html
        if candidato.is_dir():
            candidato = candidato / "index.html"

        es_html = candidato.suffix.lower() in self.EXTENSIONES_HTML
        if not candidato.is_file():
            self.send_error(404, "No existe: " + ruta_url)
            return

        try:
            contenido = candidato.read_bytes()
        except OSError as exc:
            self.send_error(500, "No se pudo leer %s: %s" % (ruta_url, exc))
            return

        if es_html:
            contenido = preparar_html(contenido, ruta_url, self)
            self.enviar(contenido, 200, "text/html; charset=utf-8")
        else:
            self.enviar(contenido, 200, self.tipo_contenido(candidato))

    def enviar(self, contenido: bytes, codigo: int, ctype: str):
        # SIEMPRE sin caché, y con una cabecera que delata que la página viene
        # del servidor de desarrollo (al abrir el inspector se ve clarísimo).
        self.send_response(codigo)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(contenido)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("X-NA-Dev-Server", "local-sin-csp")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(contenido)

    # --- Log -----------------------------------------------------------------
    # Atributos de estado que preparar_html() rellena antes de registrar.
    cabecera_retirada_csp = False
    entorno_inyectado = False

    def registrar_html(self, ruta_log: str) -> None:
        """Una línea por HTML servido: ruta, CSP y entorno."""
        csp = "CSP retirado" if self.cabecera_retirada_csp else "CSP no hallado"
        ent = ("entorno staging inyectado" if self.entorno_inyectado
               else "entorno NO inyectado")
        sys.stdout.write("DEV  %-30s  %s  %s\n" % (ruta_log, csp, ent))
        sys.stdout.flush()

    def aviso(self, mensaje: str) -> None:
        sys.stderr.write("DEV  AVISO  %s\n" % mensaje)
        sys.stderr.flush()

    @staticmethod
    def tipo_contenido(ruta: Path) -> str:
        tipo = (TIPOS_EXTRA.get(ruta.suffix.lower())
                or mimetypes.guess_type(str(ruta))[0])
        if tipo is None:
            tipo = "application/octet-stream"
        # Añadimos charset a los tipos textuales que lo aceptan.
        if tipo.startswith("text/") or tipo in ("application/javascript",
                                                "application/json"):
            tipo += "; charset=utf-8"
        return tipo

    # --- Silenciar el log por defecto de http.server -------------------------
    # Cada estático ya lo cubre registrar_html(); para el resto (js, css, img)
    # el detalle por archivo solo ensucia la consola. Los errores siguen.
    def log_message(self, fmt, *args):  # noqa: D102 (API de http.server)
        return

    def log_error(self, fmt, *args):  # noqa: D102 (API de http.server)
        super().log_message(fmt, *args)


def validar_loopback(ip: str) -> None:
    """Rechaza cualquier dirección que no sea de loopback, con mensaje claro."""
    try:
        info = socket.getaddrinfo(ip, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        sys.exit("ERROR: no se puede resolver la dirección '%s': %s" % (ip, exc))

    es_loopback = False
    for familia, _, _, _, sockaddr in info:
        dir_ip = sockaddr[0]
        if familia == socket.AF_INET and dir_ip.startswith("127."):
            es_loopback = True
        if familia == socket.AF_INET6 and dir_ip == "::1":
            es_loopback = True
    if ip in ("localhost",):  # localhost por nombre, resuelto o no, es local
        es_loopback = True

    if not es_loopback:
        sys.exit(
            "ERROR: este servidor SOLO sirve en loopback (127.0.0.1 o ::1).\n"
            "       Es una herramienta de desarrollo local, no un servidor web:\n"
            "       no puede estar expuesta a la red ni a otros equipos.\n"
            "       No arranques con --ip 0.0.0.0 ni con la IP local de la red."
        )


def validar_raiz() -> None:
    """Comprueba que la raíz calculada parece la raíz del repo."""
    if not (RAIZ / "config.js").is_file():
        sys.exit("ERROR: la raíz calculada (%s) no contiene config.js;\n"
                 "       ejecuta este script desde la copia local del repo."
                 % RAIZ)


def aviso_arranque(host: str, puerto: int) -> None:
    """Aviso visible de arranque: qué entornos hay, qué cambia y qué no."""
    url = "http://%s:%d/index.html" % (host, puerto)
    print("=" * 78)
    print("  SERVIDOR DE DESARROLLO LOCAL (nitroacceso)  —  LEER ANTES DE USAR")
    print()
    print("  * Entornos disponibles: STAGING (datos ficticios) forzado aquí;")
    print("    producción solo si quitas el servidor y abres GitHub Pages.")
    print("  * En local se RETIRA el CSP de cada HTML servido y se FUERZA")
    print('    window.__NA_ENV__ = "staging" ANTES de cargar config.js.')
    print("  * Todo esto ocurre SOLO EN LA RESPUESTA HTTP: el repo y GitHub")
    print("    Pages NO cambian ni una coma (el CSP del repo queda intacto).")
    print()
    print("  * Abre:  %s" % url)
    print("  * Para parar el servidor: pulsa Ctrl+C.")
    print("=" * 78)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Servidor de desarrollo local para nitroacceso: retira el "
                    "CSP y fuerza window.__NA_ENV__ = \"staging\" SOLO en la "
                    "respuesta HTTP, sin tocar el repo ni GitHub Pages.")
    parser.add_argument("--puerto", type=int, default=8000,
                        help="puerto de escucha (por defecto 8000)")
    parser.add_argument("--ip", default="127.0.0.1",
                        help="dirección de loopback (por defecto 127.0.0.1; "
                             "SOLO loopback)")
    args = parser.parse_args()

    validar_raiz()
    validar_loopback(args.ip)

    servidor = ThreadingHTTPServer(
        (args.ip, args.puerto),
        partial(ManejadorLocal, directory=str(RAIZ)),
    )
    aviso_arranque(args.ip, args.puerto)
    print("Sirviendo la raíz del repo: %s" % RAIZ)

    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServidor detenido por el usuario (Ctrl+C). El repo y "
              "GitHub Pages siguen intactos.")
        servidor.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
