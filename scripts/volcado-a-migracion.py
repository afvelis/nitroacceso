#!/usr/bin/env python3
"""Convert the production DDL dump (CSV) into the initial versioned migration.

Reads docs/sql/volcado-produccion-2026-11-09.csv (columns: ord, objeto, ddl;
the ddl field contains internal newlines, so always parse it with the csv
module) and writes supabase/migrations/0001_esquema_inicial.sql.

Stdlib only. Idempotent: re-running rewrites the output file.
"""

import csv
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
-- How to apply: run this file once, as a single pass, in the SQL Editor of the
-- target project, against an EMPTY database (no tables, no functions).
-- Never edit this file again: future schema changes go into new migrations
-- (0002_..., 0003_...).
-- =============================================================================
"""


def normalize_ddl(raw: str) -> str:
    """Strip surrounding whitespace and guarantee a single trailing semicolon."""
    stmt = raw.strip()
    if not stmt:
        return ""
    if not stmt.endswith(";"):
        stmt += ";"
    return stmt


def build_migration(rows: list[dict]) -> str:
    rows = sorted(rows, key=lambda r: (int(r["ord"]), r["objeto"]))

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

    parts: list[str] = [SQL_HEADER]
    if excluded_count:
        # Do not enumerate the excluded trigger names here: they are Supabase/
        # PostgREST infrastructure names that must never appear in this SQL.
        parts.append(
            f"-- Excluded {excluded_count} event triggers of Supabase/PostgREST infrastructure: they\n"
            "-- already exist in any new project and recreating them by hand would break this\n"
            "-- migration, so only the application-owned trigger `ensure_rls` is kept.\n"
        )

    current_block: str | None = None
    for ord_val, objeto, stmt in kept:
        header = BLOCK_HEADERS.get(ord_val)
        if header is not None and header != current_block:
            parts.append(f"\n-- -----------------------------------------------------------------------------\n-- {header}\n-- -----------------------------------------------------------------------------\n")
            current_block = header
        parts.append(f"\n-- {objeto}\n{stmt}\n")

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

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_migration(rows), encoding="utf-8")

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
