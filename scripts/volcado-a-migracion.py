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
  - every CREATE FUNCTION must come after every CREATE TABLE.

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
-- permission map (78 GRANT EXECUTE + 4 REVOKE EXECUTE).
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
ALTER_TABLE_RE = re.compile(r"alter table\s+(?:only\s+)?(?:public\.)?(\w+)", re.IGNORECASE)
ADD_CONSTRAINT_RE = re.compile(r"add\s+constraint\s+(\S+)\s+(.*)", re.IGNORECASE | re.DOTALL)
FOREIGN_KEY_RE = re.compile(
    r"foreign\s+key\s*\(([^)]*)\)\s*references\s+((?:public\.)?\w+)\s*(?:\(([^)]*)\))?",
    re.IGNORECASE,
)
KEY_CONSTRAINT_RE = re.compile(r"(primary\s+key|unique)\s*\(([^)]*)\)", re.IGNORECASE)


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


def prepare(rows: list[dict]) -> tuple[list[tuple[str, str, str]], int]:
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
        if stmt:
            kept.append((ord_val, objeto, stmt))
    return kept, excluded_count


def split_columns(raw: str | None) -> tuple[str, ...]:
    if raw is None:
        return ()
    return tuple(col.strip().lower() for col in raw.split(",") if col.strip())


def validate(kept: list[tuple[str, str, str]]) -> list[str]:
    """Validate statement ordering; return (errors, counts), errors empty = OK.

    Checks, in statement order:
      (a) every FOREIGN KEY references columns covered by an earlier PRIMARY
          KEY or UNIQUE constraint on the referenced table (42830 guard);
      (b) every ADD CONSTRAINT comes after the CREATE TABLE of its table;
      (c) every CREATE FUNCTION comes after all CREATE TABLE statements.

    Returns (errors, counts): errors is a list of messages (empty = OK) and
    """
    errors: list[str] = []
    counts = Counter()

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
            counts["tables"] += 1
            continue

        m = CREATE_FUNCTION_RE.search(flat)
        if m:
            counts["functions"] += 1
            missing = all_tables - created_tables
            if missing:
                errors.append(
                    f"sentencia {index} ({objeto}): la funcion {m.group(1)} aparece antes de "
                    f"crear las tablas {', '.join(sorted(missing))}"
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

    kept, excluded_count = prepare(rows)

    errors, validation_counts = validate(kept)
    if errors:
        for error in errors:
            print(f"VALIDACION FALLO: {error}", file=sys.stderr)
        print(
            f"VALIDACION FALLO: {len(errors)} problema(s) de orden; NO se escribio {output_path}",
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
        f"{validation_counts['functions']} funciones"
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
