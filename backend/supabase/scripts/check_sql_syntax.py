"""Parse every committed Supabase migration and SQL test with PostgreSQL's grammar."""

from pathlib import Path

from pglast import parse_sql


ROOT = Path(__file__).resolve().parents[3]
SQL_ROOT = ROOT / "backend" / "supabase"


def sql_files() -> list[Path]:
    files = sorted(SQL_ROOT.glob("*.sql"))
    for directory in (SQL_ROOT / "migrations", SQL_ROOT / "tests"):
        files.extend(sorted(directory.glob("*.sql")))
    return files


def main() -> None:
    files = sql_files()
    if not files:
        raise SystemExit("No Supabase SQL files were found")

    failures: list[str] = []
    for path in files:
        try:
            parse_sql(path.read_text(encoding="utf-8"))
        except Exception as error:  # pglast exposes parser detail in the message.
            failures.append(f"{path.relative_to(ROOT)}: {error}")

    if failures:
        raise SystemExit("SQL syntax validation failed:\n" + "\n".join(failures))

    print(f"Parsed {len(files)} Supabase SQL files successfully.")


if __name__ == "__main__":
    main()
