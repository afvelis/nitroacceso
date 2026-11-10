#!/usr/bin/env python3
"""Convert the production DDL dump (CSV) into the initial versioned migration.

Reads docs/sql/volcado-produccion-2026-11-09.csv (columns: ord, objeto, ddl;
the ddl field contains internal newlines, so always parse it with the csv
module) and writes supabase/migrations/0001_esquema_inicial.sql.

The generated file is wrapped in an explicit BEGIN/COMMIT transaction so the
whole migration is atomic even when applied outside the Supabase SQL Editor.

Before writing anything the script validates statement ordering and aborts
with a non-zero exit code if it fails:
  - every ADD CONSTRAINT ... FOREIGN KEY must come after a PRIMARY KEY or
    UNIQUE constraint on the referenced table with exactly those columns
    (PostgreSQL raises 42830 otherwise);
  - every ADD CONSTRAINT must come after its CREATE TABLE;
  - every CREATE FUNCTION must come after every CREATE TABLE;
  - every `revoke execute ... from public` must precede its matching
    `grant execute ... to anon`;
  - every created function must have its `revoke execute ... from public`
    (PostgreSQL grants EXECUTE on new functions to PUBLIC by default);
  - every GENERATED ... AS IDENTITY column must be emitted as
    `<type> GENERATED <ALWAYS|BY DEFAULT> AS IDENTITY` with no explicit
    `not null`, no `default` and no `nextval` (identity implies both).
    This is a post-condition over the generated text driven by the
    independent EXPECTED_IDENTITY map (plus whatever the dump's `identidad`
    column declares), so an empty emission map cannot silence it.

Stdlib only. Idempotent: re-running rewrites the output file.
"""

import csv
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = REPO_ROOT / "docs" / "sql" / "volcado-produccion-2026-11-09.csv"
DEFAULT_OUTPUT = REPO_ROOT / "supabase" / "migrations" / "0001_esquema_inicial.sql"

# Event triggers owned by Supabase/PostgREST that already exist in any new
# project; creating them by hand would break the migration.
EXCLUDED_EVENT_TRIGGERS = {
    "issue_graphql_placeholder",
    "issue_pg_cron_access",
    "issue_pg_graphql_access",
    "issue_pg_net_access",
    "pgrst_ddl_watch",
    "pgrst_drop_watch",
}

# Section headers keyed by the leading ord of the block.
BLOCK_HEADERS = {
    "0": "Preparation (schema, extension, initial grants)",
    "10": "Tables",
    "20": "Constraints",
    "30": "Indexes",
    "40": "Functions",
    "50": "Row Level Security",
    "60": "Event trigger",
    "80": "Function grants",
    "90": "Table permission closure",
}

SQL_HEADER = """\
-- =============================================================================
-- 0001_esquema_inicial.sql
--
-- Initial schema for NitroAccesos, versioned from the production dump of the
-- `nitrotalentos` project taken on 2026-11-09.
--
-- Contents: 17 tables, 82 functions, 75 constraints, 1 partial unique index,
-- RLS enabled on every table, the `ensure_rls` event trigger and the real
-- permission map (82 REVOKE EXECUTE FROM PUBLIC + 78 GRANT EXECUTE TO ANON).
--
-- The whole file runs inside an explicit transaction (BEGIN ... COMMIT): if
-- anything fails, the target database is left untouched, not half-built.
--
-- How to apply: run this file once, as a single pass, in the SQL Editor of the
-- target project, against an EMPTY database (no tables, no functions).
-- Never edit this file again: future schema changes go into new migrations
-- (0002_..., 0003_...).
-- =============================================================================
"""

# Constraint classification inside ord 20. Detection order matters: a CHECK
# expression may contain the word UNIQUE, and a FOREIGN KEY contains the word
# KEY, so FOREIGN KEY is tested first, then PRIMARY KEY, then UNIQUE.
SUBTYPE_PRIMARY_OR_UNIQUE = 1
SUBTYPE_CHECK = 2
SUBTYPE_FOREIGN_KEY = 3

CREATE_TABLE_RE = re.compile(
    r"create table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(", re.IGNORECASE
)
CREATE_FUNCTION_RE = re.compile(
    r"create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)\s*\(", re.IGNORECASE
)
# Full signature (name + argument list) of a created function, used to match
# it against the ord-80 revoke/grant statements. Argument lists in this dump
# never contain nested parentheses, so a non-greedy match up to the first `)`
# is sufficient.
CREATE_FUNCTION_SIGNATURE_RE = re.compile(
    r"create\s+(?:or\s+replace\s+)?function\s+(public\.\w+\s*\(.*?\))",
    re.IGNORECASE | re.DOTALL,
)
EXECUTE_PRIVILEGE_RE = re.compile(
    r"(grant|revoke)\s+execute\s+on\s+function\s+(public\.\w+\s*\(.*?\))\s+(?:to|from)\s+(\w+)",
    re.IGNORECASE | re.DOTALL,
)
# Strips `default <token>` from a signature before matching. The token class
# excludes `,` and `)` so a trailing `null::text)` is not eaten. Only valid
# for token defaults without spaces (the dump only has `default null::text`).
FUNCTION_DEFAULT_RE = re.compile(r"\s+default\s+[^\s,)]+", re.IGNORECASE)
GRANT_ANON_RE = re.compile(
    r"grant\s+execute\s+on\s+function\s+(public\.\w+\s*\(.*?\))\s+to\s+anon\b",
    re.IGNORECASE | re.DOTALL,
)
REVOKE_PUBLIC_RE = re.compile(
    r"revoke\s+execute\s+on\s+function\s+(public\.\w+\s*\(.*?\))\s+from\s+public\b",
    re.IGNORECASE | re.DOTALL,
)
ALTER_TABLE_RE = re.compile(r"alter table\s+(?:only\s+)?(?:public\.)?(\w+)", re.IGNORECASE)
ADD_CONSTRAINT_RE = re.compile(r"add\s+constraint\s+(\S+)\s+(.*)", re.IGNORECASE | re.DOTALL)
FOREIGN_KEY_RE = re.compile(
    r"foreign\s+key\s*\(([^)]*)\)\s*references\s+((?:public\.)?\w+)\s*(?:\(([^)]*)\))?",
    re.IGNORECASE,
)
KEY_CONSTRAINT_RE = re.compile(r"(primary\s+key|unique)\s*\(([^)]*)\)", re.IGNORECASE)

# ---------------------------------------------------------------------------
# GENERATED ... AS IDENTITY support
# ---------------------------------------------------------------------------
# PostgreSQL implements identity columns via pg_attribute.attidentity, NOT via
# column_default: a dump query that only reads pg_get_expr(adbin, ...) records
# the column as plain `<type> not null`, and the generated migration then
# fails on the first insert with "null value in column id violates not-null
# constraint" (real incident of 2026-11-09: f_login broke in staging because
# login_intentos.id was created without its automatic value).
#
# Priority when resolving identity columns from the dump CSV:
#   (a) the `identidad` column written by docs/sql/extraer-esquema.sql, with
#       entries `tabla.columna=a` (ALWAYS) or `tabla.columna=d` (BY DEFAULT);
#       several entries are separated by `;`;
#   (b) the documented fallback map below.
#
# The fallback map exists because volcado-produccion-2026-11-09.csv was
# extracted BEFORE the dump query captured attidentity, so it has no usable
# `identidad` column. The user verified in production
# (information_schema.columns, is_identity / identity_generation) that
# login_intentos.id with identity_generation ALWAYS is the ONLY identity
# column of the whole schema. NEVER model identity with sequences or
# nextval(): the production DDL uses GENERATED ... AS IDENTITY.
IDENTITY_COLUMNS: dict[tuple[str, str], str] = {
    ("login_intentos", "id"): "ALWAYS",
}

# POST-CONDITION, deliberately independent from IDENTITY_COLUMNS and from the
# CSV's `identidad` column. There are two sources on purpose:
#   - emission (IDENTITY_COLUMNS / CSV `identidad`) decides what the generated
#     DDL looks like;
#   - expectation (this map) decides what the generated DDL MUST look like,
#     and only validate() reads it.
# Because validate() never consults the emission sources, emptying
# IDENTITY_COLUMNS or feeding a CSV without an `identidad` column cannot
# silence the check: the generated migration is still required to carry
# `login_intentos.id` as `GENERATED ALWAYS AS IDENTITY` (no `default`, no
# `nextval`, no explicit `not null`), otherwise the script aborts without
# writing. This is the guard for the 2026-11-09 incident where the dumped
# `id bigint not null` slipped through with exit 0.
EXPECTED_IDENTITY: dict[tuple[str, str], str] = {
    ("login_intentos", "id"): "ALWAYS",
}

IDENTITY_ENTRY_RE = re.compile(r"(\w+)\.(\w+)=(a|d)$", re.IGNORECASE)
IDENTITY_MODES = {"a": "ALWAYS", "d": "BY DEFAULT"}


def normalize_ddl(raw: str) -> str:
    """Strip surrounding whitespace and guarantee a single trailing semicolon."""
    stmt = raw.strip()
    if not stmt:
        return ""
    if not stmt.endswith(";"):
        stmt += ";"
    return stmt


def flatten(stmt: str) -> str:
    """Collapse all whitespace (including internal newlines) into single spaces."""
    return " ".join(stmt.split())


def constraint_subtype(stmt: str) -> int | None:
    """Classify an ADD CONSTRAINT statement by its constraint type.

    Returns 1 for PRIMARY KEY / UNIQUE, 2 for CHECK, 3 for FOREIGN KEY and
    None for anything unrecognised. FOREIGN KEY is tested first so a FOREIGN
    KEY (which contains the word KEY) is not mistaken for a PRIMARY KEY, and
    PRIMARY KEY is tested before UNIQUE because both share subtype 1.
    """
    upper = flatten(stmt).upper()
    if "ADD CONSTRAINT" not in upper:
        return None
    if "FOREIGN KEY" in upper:
        return SUBTYPE_FOREIGN_KEY
    if "PRIMARY KEY" in upper:
        return SUBTYPE_PRIMARY_OR_UNIQUE
    if "UNIQUE" in upper:
        return SUBTYPE_PRIMARY_OR_UNIQUE
    if "CHECK" in upper:
        return SUBTYPE_CHECK
    return None


def normalize_signature(raw: str) -> str:
    """Normalize a function signature for grant/revoke matching.

    Collapses whitespace, lowercases and strips argument DEFAULT clauses:
    PostgreSQL accepts the signature without defaults in grant/revoke, so the
    dump records `f_sesion_ok(p_token uuid, p_rol_requerido text)` while the
    CREATE says `... p_rol_requerido text default null::text`. Defaults do
    not distinguish overloads, so they carry no privilege meaning. This dump
    only contains token defaults (`default null::text`, no spaces/parens).
    """
    sig = " ".join(raw.split()).lower()
    return FUNCTION_DEFAULT_RE.sub("", sig)


def expand_function_privileges(objeto: str, stmt: str) -> list[tuple[str, str]]:
    """Turn one ord-80 dump row into the migration privilege statements.

    PostgreSQL grants EXECUTE on every new function to PUBLIC by default, and
    `anon` inherits from PUBLIC, so revoking from `anon` alone closes nothing.
    The migration therefore ALWAYS emits `revoke execute ... from public` for
    the function and, only when the dump records the grant, re-grants to
    `anon`. Rows that revoke from `anon` describe internal functions and
    produce no grant (and no redundant revoke from `anon`).
    """
    body = stmt[:-1] if stmt.rstrip().endswith(";") else stmt
    m = EXECUTE_PRIVILEGE_RE.fullmatch(body.strip())
    if not m:
        raise ValueError(
            f"permiso de funcion no interpretable para {objeto}: {flatten(stmt)}"
        )
    verb = m.group(1).lower()
    signature = normalize_signature(m.group(2))
    role = m.group(3).lower()
    revoke_public = f"revoke execute on function {signature} from public;"
    if verb == "grant" and role == "anon":
        return [
            (objeto, revoke_public),
            (f"{objeto} (grant anon)", f"grant execute on function {signature} to anon;"),
        ]
    if verb == "revoke" and role == "anon":
        return [(objeto, revoke_public)]
    raise ValueError(
        f"permiso inesperado en el volcado para {objeto}: {verb} execute sobre {role}; "
        "solo se admiten grant/revoke execute sobre anon"
    )


def sort_key(row: dict) -> tuple[int, int, str]:
    """Final ordering: (ord, subtype, objeto).

    Within ord 20 (constraints) the subtype forces three passes: first
    PRIMARY KEY / UNIQUE (the targets of the foreign keys), then CHECK, then
    FOREIGN KEY. Alphabetical order by `objeto` is preserved within each pass.
    Outside ord 20 the subtype is 0 and the order is unchanged.
    """
    if row["ord"] == "20":
        subtype = constraint_subtype(row["ddl"]) or 0
    else:
        subtype = 0
    return (int(row["ord"]), subtype, row["objeto"])


def prepare(
    rows: list[dict], identity_map: dict[tuple[str, str], str]
) -> tuple[list[tuple[str, str, str]], int]:
    """Sort, filter and normalize the dump rows into (kept, excluded_count)."""
    rows = sorted(rows, key=sort_key)

    kept: list[tuple[str, str, str]] = []  # (ord, objeto, statement)
    excluded_count = 0
    for row in rows:
        ord_val = row["ord"]
        objeto = row["objeto"]
        if ord_val == "60" and objeto in EXCLUDED_EVENT_TRIGGERS:
            excluded_count += 1
            continue
        stmt = normalize_ddl(row["ddl"])
        if not stmt:
            continue
        if ord_val == "10":
            stmt = rewrite_identity_columns(stmt, identity_map)
        if ord_val == "80":
            # Function privileges are rewritten: always revoke from PUBLIC
            # first, then grant to anon only if the dump records it. The dump
            # rows themselves (grant/revoke to/from anon) are never emitted
            # verbatim: they left PUBLIC with EXECUTE, which is the hole.
            kept.extend((ord_val, label, priv) for label, priv in expand_function_privileges(objeto, stmt))
            continue
        kept.append((ord_val, objeto, stmt))
    return kept, excluded_count


def split_columns(raw: str | None) -> tuple[str, ...]:
    if raw is None:
        return ()
    return tuple(col.strip().lower() for col in raw.split(",") if col.strip())


def split_top_level(text: str, sep: str = ",") -> list[str]:
    """Split on `sep` only outside parentheses and single-quoted strings."""
    parts: list[str] = []
    current: list[str] = []
    depth = 0
    in_quote = False
    for ch in text:
        if in_quote:
            if ch == "'":
                in_quote = False
        elif ch == "'":
            in_quote = True
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == sep and depth == 0:
            parts.append("".join(current))
            current = []
            continue
        current.append(ch)
    if current:
        parts.append("".join(current))
    return parts


def load_identity_columns(rows: list[dict]) -> tuple[dict[tuple[str, str], str], str]:
    """Resolve which (table, column) pairs are GENERATED ... AS IDENTITY.

    Priority: (a) the dump's `identidad` column when it carries at least one
    parseable entry; (b) otherwise the documented IDENTITY_COLUMNS fallback
    map. Returns (map, source-label) where source-label says which via won.
    """
    entries: dict[tuple[str, str], str] = {}
    for row in rows:
        raw = (row.get("identidad") or "").strip()
        if not raw:
            continue
        for entry in raw.split(";"):
            entry = entry.strip()
            if not entry:
                continue
            m = IDENTITY_ENTRY_RE.match(entry)
            if not m:
                raise ValueError(f"entrada de identidad no interpretable: {entry!r}")
            table = m.group(1).lower()
            column = m.group(2).lower()
            entries[(table, column)] = IDENTITY_MODES[m.group(3).lower()]
    if entries:
        return entries, "columna identidad del CSV"
    return dict(IDENTITY_COLUMNS), "mapa de respaldo IDENTITY_COLUMNS"


def rewrite_identity_columns(ddl: str, identity_map: dict[tuple[str, str], str]) -> str:
    """Rewrite the identity columns of a `create table` statement.

    A dumped identity column looks like `<name> <type> not null` (it has no
    default: the automatic value lives in attidentity, not column_default).
    This emits it as `<name> <type> GENERATED <mode> AS IDENTITY`, dropping
    the explicit `not null` and any `default` (identity implies both). Tables
    without identity columns pass through untouched.
    """
    m = CREATE_TABLE_RE.search(ddl)
    if not m:
        return ddl
    table = m.group(1).lower()
    cols = {col: mode for (tbl, col), mode in identity_map.items() if tbl == table}
    if not cols:
        return ddl
    body_start = m.end()
    body_end = ddl.rfind(")")
    if body_end < body_start:
        raise ValueError(f"create table de {table} sin cuerpo interpretable")
    parts = split_top_level(ddl[body_start:body_end])
    rebuilt: list[str] = []
    for part in parts:
        tokens = part.strip().split()
        if tokens and tokens[0].lower() in cols:
            mode = cols[tokens[0].lower()]
            # Keep the part's original leading whitespace so the rebuilt
            # statement keeps the dump's spacing (e.g. no space after "(").
            lead = part[: len(part) - len(part.lstrip())]
            # Type tokens run until the not-null marker or a default clause;
            # a `generated` token (already-rewritten input) ends them too.
            end = len(tokens)
            for i in range(1, len(tokens)):
                if re.fullmatch(r"not|default|generated", tokens[i], re.IGNORECASE):
                    end = i
                    break
            col_type = " ".join(tokens[1:end])
            if not col_type:
                raise ValueError(
                    f"columna identity {table}.{tokens[0]} sin tipo interpretable en: {part.strip()}"
                )
            rebuilt.append(f"{lead}{tokens[0]} {col_type} GENERATED {mode} AS IDENTITY")
        else:
            rebuilt.append(part)
    return ddl[:body_start] + ",".join(rebuilt) + ddl[body_end:]


def validate(kept: list[tuple[str, str, str]], expected_identity: dict[tuple[str, str], str] | None = None) -> list[str]:
    """Validate statement ordering; return (errors, counts), errors empty = OK.

    Checks, in statement order:
      (a) every FOREIGN KEY references columns covered by an earlier PRIMARY
          KEY or UNIQUE constraint on the referenced table (42830 guard);
      (b) every ADD CONSTRAINT comes after the CREATE TABLE of its table;
      (c) every CREATE FUNCTION comes after all CREATE TABLE statements;
      (d) every `grant execute ... to anon` is preceded by a matching
          `revoke execute ... from public` for the same function;
      (e) every created function has its `revoke execute ... from public`;
      (f) every identity column is emitted as `GENERATED <mode> AS IDENTITY`
          with no explicit `not null` and no `default` in its definition.

    Returns (errors, counts): errors is a list of messages (empty = OK) and
    """
    errors: list[str] = []
    counts = Counter()
    revoked_public: set[str] = set()
    created_functions: set[str] = set()
    expected_identity = expected_identity or {}
    table_defs: dict[str, str] = {}

    # Tables defined anywhere in the file: every one of them must exist before
    # the first function definition.
    all_tables = set()
    for _ord_val, _objeto, stmt in kept:
        m = CREATE_TABLE_RE.search(stmt)
        if m:
            all_tables.add(m.group(1).lower())

    created_tables: set[str] = set()
    # (table, columns) -> constraint kind ("primary key" | "unique")
    key_constraints: dict[tuple[str, tuple[str, ...]], str] = {}
    pk_columns: dict[str, tuple[str, ...]] = {}

    for index, (ord_val, objeto, stmt) in enumerate(kept, start=1):
        flat = flatten(stmt)

        m = CREATE_TABLE_RE.search(flat)
        if m:
            created_tables.add(m.group(1).lower())
            table_defs[m.group(1).lower()] = flat
            counts["tables"] += 1
            continue

        m = CREATE_FUNCTION_RE.search(flat)
        if m:
            counts["functions"] += 1
            sig_m = CREATE_FUNCTION_SIGNATURE_RE.search(flat)
            if sig_m:
                created_functions.add(normalize_signature(sig_m.group(1)))
            missing = all_tables - created_tables
            if missing:
                errors.append(
                    f"sentencia {index} ({objeto}): la funcion {m.group(1)} aparece antes de "
                    f"crear las tablas {', '.join(sorted(missing))}"
                )
            continue

        # Function privilege statements (ord 80, already rewritten by
        # expand_function_privileges): every revoke-from-public closes the
        # PUBLIC default; grants to anon are only valid after their revoke.
        m = REVOKE_PUBLIC_RE.search(flat)
        if m:
            counts["revoke_public"] += 1
            revoked_public.add(normalize_signature(m.group(1)))
            continue

        m = GRANT_ANON_RE.search(flat)
        if m:
            counts["grant_anon"] += 1
            signature = normalize_signature(m.group(1))
            if signature not in revoked_public:
                errors.append(
                    f"sentencia {index} ({objeto}): grant execute to anon sobre {signature} "
                    "sin un 'revoke execute ... from public' previo para esa funcion"
                )
            continue

        if "add constraint" not in flat.lower():
            continue

        counts["constraints"] += 1
        subtype = constraint_subtype(stmt)
        table_m = ALTER_TABLE_RE.search(flat)
        table = table_m.group(1).lower() if table_m else "<desconocida>"

        if table not in created_tables:
            errors.append(
                f"sentencia {index} ({objeto}): add constraint sobre la tabla {table} "
                "antes de su create table"
            )

        if subtype is None:
            errors.append(
                f"sentencia {index} ({objeto}): tipo de restriccion no reconocido en {table}"
            )
            continue

        if subtype == SUBTYPE_FOREIGN_KEY:
            counts["foreign_keys"] += 1
            fk_m = FOREIGN_KEY_RE.search(flat)
            if not fk_m:
                errors.append(
                    f"sentencia {index} ({objeto}): FOREIGN KEY no interpretable en {table}"
                )
                continue
            fk_cols = split_columns(fk_m.group(1))
            ref_table = fk_m.group(2).lower().removeprefix("public.")
            ref_cols = split_columns(fk_m.group(3))
            if not ref_cols:
                # Without explicit referenced columns PostgreSQL uses the PK.
                ref_cols = pk_columns.get(ref_table, ())
                if not ref_cols:
                    errors.append(
                        f"sentencia {index} ({objeto}): FOREIGN KEY de {table} ({', '.join(fk_cols)}) "
                        f"referencia {ref_table} sin columnas y {ref_table} no tiene PRIMARY KEY previa"
                    )
                    continue
            known = key_constraints.get((ref_table, ref_cols))
            if known is None:
                errors.append(
                    f"sentencia {index} ({objeto}): FOREIGN KEY de {table} ({', '.join(fk_cols)}) "
                    f"referencia {ref_table} ({', '.join(ref_cols)}) pero ninguna PRIMARY KEY o "
                    "UNIQUE sobre esas columnas aparece antes (PostgreSQL: 42830)"
                )
            continue

        if subtype == SUBTYPE_PRIMARY_OR_UNIQUE:
            kc_m = KEY_CONSTRAINT_RE.search(flat)
            kind = kc_m.group(1).lower() if kc_m else "primary key"
            cols = split_columns(kc_m.group(2)) if kc_m else ()
            key_constraints[(table, cols)] = kind
            if kind == "primary key":
                pk_columns[table] = cols
            counts["keys"] += 1
        else:
            counts["checks"] += 1

    # (e) every created function must have its revoke from PUBLIC: PostgreSQL
    # grants EXECUTE on new functions to PUBLIC by default and anon inherits
    # from PUBLIC, so a function without this revoke stays callable by anon.
    for signature in sorted(created_functions - revoked_public):
        errors.append(
            f"la funcion {signature} no tiene un 'revoke execute ... from public' en la "
            "migracion (PostgreSQL concede EXECUTE a PUBLIC por defecto y anon hereda)"
        )

    # (f) identity columns must survive as GENERATED ... AS IDENTITY with no
    # explicit not-null, no default and no nextval, otherwise the first INSERT
    # without id fails with "null value in column id violates not-null
    # constraint" (the f_login staging incident of 2026-11-09). This is a
    # post-condition over the generated text, driven by EXPECTED_IDENTITY (and
    # extended with whatever the dump's `identidad` column declares): it does
    # NOT read the emission sources (IDENTITY_COLUMNS / CSV), so an empty
    # emission map can never silence this check.
    for (table, column), mode in sorted(expected_identity.items()):
        ddl = table_defs.get(table)
        if ddl is None:
            errors.append(
                f"la columna identity {table}.{column} no tiene create table en la migracion"
            )
            continue
        m = CREATE_TABLE_RE.search(ddl)
        body = ddl[m.end():ddl.rfind(")")]
        coldef = next(
            (
                part.strip()
                for part in split_top_level(body)
                if part.strip().split() and part.strip().split()[0].lower() == column
            ),
            None,
        )
        if coldef is None:
            errors.append(
                f"la columna identity {table}.{column} no aparece en el create table de {table}"
            )
            continue
        upper = coldef.upper()
        if "GENERATED" not in upper or "AS IDENTITY" not in upper or mode.upper() not in upper:
            errors.append(
                f"la columna identity {table}.{column} no se emite como GENERATED {mode} AS IDENTITY "
                f"(definicion: {coldef})"
            )
        if "DEFAULT" in upper or "NEXTVAL" in upper:
            errors.append(
                f"la columna identity {table}.{column} no debe llevar default ni nextval "
                f"(definicion: {coldef})"
            )
        if "NOT NULL" in upper:
            errors.append(
                f"la columna identity {table}.{column} no debe llevar not null explicito "
                "(GENERATED ... AS IDENTITY ya lo implica) "
                f"(definicion: {coldef})"
            )

    return errors, counts


def build_migration(kept: list[tuple[str, str, str]], excluded_count: int) -> str:
    parts: list[str] = [SQL_HEADER]
    if excluded_count:
        # Do not enumerate the excluded trigger names here: they are Supabase/
        # PostgREST infrastructure names that must never appear in this SQL.
        parts.append(
            f"-- Excluded {excluded_count} event triggers of Supabase/PostgREST infrastructure: they\n"
            "-- already exist in any new project and recreating them by hand would break this\n"
            "-- migration, so only the application-owned trigger `ensure_rls` is kept.\n"
        )

    # Atomic migration: BEGIN right after the header comments, COMMIT at the
    # end, so a failure leaves the target database untouched.
    parts.append("\nbegin;\n")

    current_block: str | None = None
    for ord_val, objeto, stmt in kept:
        header = BLOCK_HEADERS.get(ord_val)
        if header is not None and header != current_block:
            parts.append(f"\n-- -----------------------------------------------------------------------------\n-- {header}\n-- -----------------------------------------------------------------------------\n")
            current_block = header
        parts.append(f"\n-- {objeto}\n{stmt}\n")

    parts.append("\ncommit;\n")
    return "\n".join(parts) + "\n"


def summarize(rows: list[dict]) -> Counter:
    return Counter(row["ord"] for row in rows)


def main() -> int:
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT

    with input_path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    if not rows:
        print(f"ERROR: no rows found in {input_path}", file=sys.stderr)
        return 1

    try:
        identity_map, identity_source = load_identity_columns(rows)
    except ValueError as exc:
        print(f"VALIDACION FALLO: {exc}", file=sys.stderr)
        print(f"VALIDACION FALLO: no se escribio {output_path}", file=sys.stderr)
        return 1
    print(
        f"Identity: {len(identity_map)} columna(s) GENERATED ... AS IDENTITY "
        f"[{identity_source}]"
    )
    # Post-condition map for validate(): EXPECTED_IDENTITY first (independent
    # of the emission sources), extended with any additional (table, column)
    # the dump's `identidad` column declares. Known production columns keep
    # their EXPECTED mode even if a faulty CSV declared a different one.
    expected_identity = dict(EXPECTED_IDENTITY)
    for key, mode in identity_map.items():
        expected_identity.setdefault(key, mode)

    try:
        kept, excluded_count = prepare(rows, identity_map)
    except ValueError as exc:
        print(f"VALIDACION FALLO: {exc}", file=sys.stderr)
        print(f"VALIDACION FALLO: no se escribio {output_path}", file=sys.stderr)
        return 1

    errors, validation_counts = validate(kept, expected_identity)
    if errors:
        for error in errors:
            print(f"VALIDACION FALLO: {error}", file=sys.stderr)
        print(
            f"VALIDACION FALLO: {len(errors)} problema(s) de orden o permisos; NO se escribio {output_path}",
            file=sys.stderr,
        )
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_migration(kept, excluded_count), encoding="utf-8")

    print(
        f"VALIDACION OK: {validation_counts['tables']} tablas, "
        f"{validation_counts['constraints']} restricciones "
        f"({validation_counts['keys']} PK/UNIQUE, {validation_counts['checks']} CHECK, "
        f"{validation_counts['foreign_keys']} FOREIGN KEY), "
        f"{validation_counts['functions']} funciones, "
        "permisos de funcion: "
        f"{validation_counts['revoke_public']} revoke execute from public, "
        f"{validation_counts['grant_anon']} grant execute to anon"
    )

    counts = summarize(rows)
    total = sum(counts.values())
    print(f"Written: {output_path}")
    print(f"Rows read: {total}")
    print("Counts by ord:")
    for ord_val in sorted(counts, key=int):
        print(f"  ord {ord_val}: {counts[ord_val]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
