# Protocolo de emergencia y reanudación — nitroacceso

**Ámbito:** cualquier agente con acceso de escritura a este repo.
**Autoridad:** `AGENTS.md` > este documento > `ESTADO.md` > repo > memoria del agente.

---

## 1. Señales

- **`PROTOCOLO DE EMERGENCIA`** (o `CORTE`, corte de energía, batería baja,
  pérdida de conexión) → Fase A.
- **`FIN DE LA EMERGENCIA`** → Fase B (solo lectura).
- El trabajo no se reanuda hasta que el usuario escriba **`continúa`**.

---

## 2. Modelo de riesgo REAL de este proyecto

Este protocolo **no** es el genérico de "rollback y cierra conexiones":

| Premisa genérica | Realidad aquí |
| --- | --- |
| El agente tiene transacciones abiertas | **El agente nunca ejecuta SQL.** Lo ejecuta el usuario en Supabase |
| El agente deja archivos a medio escribir | Las escrituras son **commits atómicos** de git |
| Hay conexiones que cerrar | El agente no tiene credenciales ni conexión a la base |

Riesgos que **sí** existen:
1. **`config` sin revertir**: `edicion_abierta = true` deja la puerta muerta.
2. **Base y repo divergen**: migración aplicada en staging, archivo sin commitear.
3. **Árbol de git sucio** al volver (commit a medias, `.lock`, conflicto).
4. **Instrucción al usuario a medias** con una escritura pendiente sin revertir.
5. **Documentos que mienten** al retomar y hacen perder la sesión siguiente.

---

## 3. Qué se para y qué sigue — clasificación obligatoria

Antes de parar nada, se clasifica el trabajo en curso en esta tabla.

| Trabajo | ¿Sigue en emergencia? | Motivo |
| --- | --- | --- |
| Leer el repo, diagnosticar, revisar código | **SÍ** | No necesita al usuario ni su equipo |
| Escribir docs, migraciones, tests, JS, y **commitear localmente** en una rama | **SÍ** (modo degradado) | Local a la máquina del agente, reversible, y queda a salvo con el commit |
| Redactar el SQL y las instrucciones para el usuario | **SÍ** (dejarlas listas, sin pedirlas) | Se preparan ahora, se ejecutan al volver |
| Ejecutar los tests contra staging (`node --test`) | **NO** | Muta datos y depende de la base |
| Pedir o recibir SQL del usuario, esperar su respuesta | **NO** | Depende de su presencia |
| Pruebas en navegador / `dev-server.py` en su Windows | **NO** | Depende de su máquina |
| `git push`, abrir o fusionar PR | **NO** | Requiere su revisión, y las reglas lo prohíben sin orden |
| Cualquier cosa que tarde más de lo que queda de batería | **NO** | No se empieza lo que no se puede terminar |

### Tres escenarios y qué se hace en cada uno

| Escenario | Modo | Qué ocurre |
| --- | --- | --- |
| **Afecta al equipo del usuario** (su Windows, su batería, se va, se desconecta) | **Degradado** | Se para todo lo que lo necesite. El agente **sigue** con lectura y trabajo local commiteado, sin pedirle nada |
| **Afecta a la máquina del agente** (esta Linux) o a la base de datos | **Parada total** | Checkpoint y silencio. Nada más |
| **No está claro** | **Degradado** | Se sigue con lo local y reversible; nunca se bloquea la sesión por precaución excesiva |

Regla del modo degradado: **una unidad de trabajo = un commit**. No se deja
nada escrito sin commitear entre unidades, para que un corte súbito no pierda
trabajo. Y no se empieza una unidad que no se pueda cerrar en ~10 minutos.

---

## 4. FASE A — Al recibir `PROTOCOLO DE EMERGENCIA`

Presupuesto: **3 minutos**. En este orden.

1. **Parar lo que dependa del usuario o de la base** (ver sección 3). No lanzar
   subagentes que escriban en paralelo.
2. **Detener subagentes activos** (`subagent stop <run>`): primero los que
   escriben, después los de solo lectura.
3. **Estado seguro de la base, primero de todo.** Si hay una escritura de
   `config` hecha y no revertida, entregar **una sola línea**, lista para pegar:

   ```sql
   update public.config set edicion_abierta = false where id = 1;
   ```

   Nada más. No pedir confirmación de otras cosas.
4. **Git:** `git status --porcelain`.
   - Limpio → anotarlo.
   - Con cambios → commit `[agente] WIP emergencia: <qué>` en la rama actual,
     en menos de 60 s. **Nunca** `stash`, `reset --hard`, `checkout` ni borrar.
5. **Checkpoint vivo** en `/tmp/nitroacceso-checkpoint-AAAA-MM-DD.md` con los
   9 campos de la sección 6. Se actualiza al cerrar cada unidad de trabajo,
   no solo al final.
6. **Responder** con el resumen del checkpoint, el modo elegido (degradado o
   parada total) y, si es parada total, la línea:
   `✅ PROTOCOLO DE EMERGENCIA ACTIVADO. Todo está cerrado.`
   En modo degradado **no** se dice esa línea: se sigue trabajando.

### Prohibido en Fase A (en cualquier modo)

- Migraciones, DDL, `DELETE`, `UPDATE` de datos, cambios de esquema.
- `UPDATE` de `config` sin su reversión en el mismo bloque.
- `git push`, `push --force`, fusionar PRs, borrar ramas, tocar `main`.
- Reintentar conexiones en bucle: **máximo 1 intento**; si falla, se para.
- "Arreglar" un error de conexión tocando archivos, configuración o datos.
- Inventar estado: lo no medido se escribe **NO VERIFICADO**.

---

## 5. FASE B — Al recibir `FIN DE LA EMERGENCIA`

Solo lectura. No se modifica nada ni se reactivan subagentes.

1. **Verificar salud del workspace** (≈1 minuto):
   - `git status --porcelain`, `git status -sb | head -1`
   - presencia de `.git/MERGE_HEAD`, `REBASE_HEAD`, `CHERRY_PICK_HEAD`,
     `index.lock`, `BISECT_LOG`
   - `git fsck --no-progress` (solo se reportan objetos corruptos)
   - integridad: `git hash-object <archivo>` contra el blob del árbol
   - `node --check` de los `.js`/`.mjs` tocados
   - `python3 scripts/verificar-arranque.py`
   - procesos colgados: `dev-server`, `node --test`
2. **Contrastar el checkpoint con lo medido.** Si algo no cuadra se dice; no se
   reconstruye en silencio. Las FALLAS del verificador se **reportan**, no se
   arreglan en este paso.
3. **Confirmar la base con UNA consulta de solo lectura**, la ejecuta el usuario:

   ```sql
   select id, edicion_abierta, dia_activo, dia1_cerrado, dia2_cerrado
   from public.config where id = 1;
   ```

   Una consulta por turno.
4. **Resumen:** dónde quedamos, qué se revirtió, qué quedó pendiente, si hay
   divergencia repo/base, y siguiente paso exacto.
5. **Parar y esperar `continúa`.** Los subagentes no se reactivan antes.
6. Al `continúa`: **el primer trabajo es diagnóstico** (leer), no escritura.

---

## 6. Checkpoint — 9 campos obligatorios

1. **Modo:** degradado o parada total, y por qué.
2. **Repo:** rama, HEAD, remoto de la rama, árbol limpio o no, commits sin empujar.
3. **Base (staging):** migraciones aplicadas y verificadas, valores exactos de
   `config`, y la frase "sin transacciones abiertas: el agente no ejecuta SQL".
4. **Producción:** qué migraciones tiene y cuáles **no**.
5. **Subagentes:** detenidos y fallidos, con motivo real.
6. **Tarea:** identificador, % de avance, criterios probados y pendientes.
7. **Último paso completado con éxito**, con su evidencia.
8. **Qué se revirtió o quedó pendiente**, nombrando el riesgo concreto.
9. **Siguiente paso exacto**, con comandos literales.

---

## 7. Reglas permanentes que nacen de esto

1. **Toda instrucción con escritura en `config` lleva su reversión en el mismo
   bloque**, numerada, en el mismo turno. *(Incidente 23/11/2026: la reversión
   quedó sin hacer y staging se quedó en `edicion_abierta = true`.)*
2. El agente **no ejecuta SQL** nunca; lo verifica el usuario con conteo. El
   `Success` del editor no es prueba.
3. En modo degradado: **una unidad de trabajo = un commit**.
4. Nunca `git reset --hard`, `stash` ni `checkout` para "limpiar" en una emergencia.
5. Nunca fusionar PRs, nunca `push` a `main`, nunca borrar ramas sin orden explícita.
6. Los documentos guardan solo lo que no caduca; SHAs y ramas se consultan con
   `scripts/verificar-arranque.py`.
