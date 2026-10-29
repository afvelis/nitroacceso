---
id: "F-1"
titulo: "Reparar el botón «Repetir y editar la del Día 1» en talento.html"
prioridad: "P1"
estado: "pendiente"
area: "datos"
depende_de: []
archivos:
  - "talento.html"
---

# F-1 · Reparar el botón «Repetir y editar la del Día 1» en talento.html

## Contexto

Durante la prueba en vivo del 28/10/2026 (verificación de [P0-01](P0-01-xss-escape.md)), el representante de talento pulsó el botón «Repetir y editar la del Dia 1» y la lista del Día 1 no se copió al Día 2: el usuario lo reportó como «no hace nada». Es una función del flujo del evento (pasar la lista de un día al otro) que existe justamente como ayuda manual, así que debe funcionar.

## Evidencia

- [talento.html:296](../talento.html#L296): botón «Repetir y editar la del Dia 1» (referencia; verificar el archivo actual antes de editar).
- La llamada corresponde a la RPC `f_link_talento_copiar(p_codigo_link, p_dia_origen, p_dia_destino)` (ARQUITECTURA.md §4).
- Reporte del usuario en la Sesión 13 (28/10/2026): «no hace nada».

## Objetivo

Que al pulsar el botón, las personas de la lista del Día 1 se copien a la del Día 2 y el usuario lo vea en pantalla.

## Pasos

- [ ] Pedir al usuario la definición vigente de la RPC en el SQL Editor: `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'f_link_talento_copiar';` (Consulta C de ARQUITECTURA.md §8).
- [ ] Revisar en talento.html que el botón llama a la RPC con los parámetros correctos y en el orden correcto (`p_dia_origen` = 1, `p_dia_destino` = 2).
- [ ] Pulsar el botón con la consola del navegador abierta: mirar si hay error de red, error de RPC o respuesta sin efecto visible.
- [ ] Identificar la causa: RPC que no copia, parámetros invertidos, respuesta no manejada o botón sin listener.
- [ ] Aplicar la corrección en el lado que corresponda (SQL ejecutado por el usuario en Supabase, o JS en talento.html; nunca asumir acceso a la base).
- [ ] Probar con un talento de prueba: crear lista del Día 1 con personas, pulsar el botón y verificar la copia.

## Criterios de aceptación

- [ ] El botón copia las personas del Día 1 al Día 2 y lo muestra en pantalla.
- [ ] Si la copia falla, aparece un mensaje de error visible (nunca un «no hace nada» silencioso).
- [ ] No se rompen la edición del Día 1 ni el flujo de puerta (regresión verificada).

## Verificación

Prueba manual con un talento de prueba: guardar 2-3 personas en el Día 1, pulsar «Repetir y editar la del Dia 1», y confirmar en pantalla y con `f_link_talento_ver` que el Día 2 quedó poblado. Si hay SQL, el usuario lo ejecuta en el SQL Editor y pega el resultado completo.

## Fuera de alcance

- Cambiar el botón «Cerrar esta pestaña» ni el panel azul del Día 2 (CONGELADOS según ARQUITECTURA.md §7).
- Rediseñar el flujo de listas por día.

## Notas de implementación

> Pendiente.
