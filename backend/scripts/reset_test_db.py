"""Clear an existing SQLite test database under backend/data/e2e/."""
import argparse
from contextlib import closing
from graphlib import TopologicalSorter
import os
from pathlib import Path
import sqlite3


def checked_path(path: str) -> str:
    backend = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    allowed = os.path.realpath(os.path.join(backend, "data", "e2e"))
    normal = os.path.realpath(os.path.join(backend, "data", "emolearn.db"))
    resolved = os.path.realpath(path)
    if not os.path.isfile(resolved):
        raise ValueError("Database must be an existing file.")
    if os.path.normcase(resolved) == os.path.normcase(normal) or (
        os.path.exists(normal) and os.path.samefile(resolved, normal)
    ):
        raise ValueError("Refusing to reset the normal emolearn.db database.")
    try:
        inside = os.path.normcase(os.path.commonpath([allowed, resolved])) == os.path.normcase(allowed)
    except ValueError:
        inside = False
    if not inside:
        raise ValueError("Database must resolve inside backend/data/e2e/.")
    if os.stat(resolved).st_nlink > 1:
        raise ValueError("Refusing to reset a database with hard links.")
    return resolved


def quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def reset_database(path: str) -> int:
    resolved = checked_path(path)
    uri = Path(resolved).as_uri() + "?mode=rw"
    with closing(sqlite3.connect(uri, uri=True)) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            tables = [
                row[0] for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
                ) if not row[0].startswith("sqlite_")
            ]
            names = {name.casefold(): name for name in tables}
            dependencies = {}
            for table in tables:
                parents = set()
                for foreign_key in connection.execute(
                    f"PRAGMA foreign_key_list({quote_identifier(table)})"
                ):
                    parent = names.get(foreign_key[2].casefold())
                    if parent is not None:
                        parents.add(parent)
                dependencies[table] = parents
            order = list(TopologicalSorter(dependencies).static_order())
            for table in reversed(order):
                connection.execute(f"DELETE FROM {quote_identifier(table)}")
            if connection.execute(
                "SELECT 1 FROM sqlite_master WHERE name = 'sqlite_sequence'"
            ).fetchone():
                connection.execute("DELETE FROM sqlite_sequence")
            if connection.execute("PRAGMA foreign_key_check").fetchone():
                raise ValueError("Foreign key check failed; reset rolled back.")
    return len(tables)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", help="Existing database path; stop its backend before resetting.")
    args = parser.parse_args()
    try:
        count = reset_database(args.db_path)
    except (ValueError, sqlite3.Error, OSError) as exc:
        parser.exit(1, f"Reset refused: {exc}\n")
    print(f"Cleared {count} tables in {os.path.realpath(args.db_path)}")


if __name__ == "__main__":
    main()
