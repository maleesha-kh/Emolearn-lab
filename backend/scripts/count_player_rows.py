"""Count rows linked to one player in a test database under backend/data/e2e/.

Read-only (opened with mode=ro), with the same path checks as reset_test_db.py.
Every table with a foreign-key path to players is counted, and dangling
foreign keys are reported too, so rows left behind by a delete show up.
Prints JSON.
"""
import argparse
from collections import deque
from contextlib import closing
import json
from pathlib import Path
import sqlite3

from reset_test_db import checked_path, quote_identifier


def paths_to_players(connection: sqlite3.Connection) -> dict:
    """For each table, the chain of (column, parent table) hops that leads to players."""
    tables = [
        row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
        if not row[0].startswith("sqlite_")
    ]
    parents = {
        table: [(fk[3], fk[2]) for fk in connection.execute(f"PRAGMA foreign_key_list({quote_identifier(table)})")]
        for table in tables
    }
    paths = {"players": []}
    queue = deque(["players"])
    while queue:
        target = queue.popleft()
        for table in tables:
            if table in paths:
                continue
            for column, parent in parents[table]:
                if parent == target:
                    paths[table] = [(column, parent)] + paths[target]
                    queue.append(table)
                    break
    return {"linked": paths, "unlinked": sorted(set(tables) - set(paths))}


def count_rows(connection: sqlite3.Connection, table: str, path: list, player_id: str) -> int:
    if not path:
        sql = f"SELECT COUNT(*) FROM {quote_identifier(table)} WHERE id = ?"
    else:
        joins, alias = [], "t0"
        for i, (column, parent) in enumerate(path[:-1]):
            next_alias = f"t{i + 1}"
            joins.append(f"JOIN {quote_identifier(parent)} {next_alias} ON {alias}.{quote_identifier(column)} = {next_alias}.id")
            alias = next_alias
        last_column = path[-1][0]
        sql = (
            f"SELECT COUNT(*) FROM {quote_identifier(table)} t0 {' '.join(joins)} "
            f"WHERE {alias}.{quote_identifier(last_column)} = ?"
        )
    return connection.execute(sql, (player_id,)).fetchone()[0]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path")
    parser.add_argument("player_id", nargs="+")
    args = parser.parse_args()
    try:
        resolved = checked_path(args.db_path, action="read")
        with closing(sqlite3.connect(Path(resolved).as_uri() + "?mode=ro", uri=True)) as connection:
            graph = paths_to_players(connection)
            result = {
                "players": {
                    player_id: {
                        table: count_rows(connection, table, path, player_id)
                        for table, path in sorted(graph["linked"].items())
                    }
                    for player_id in args.player_id
                },
                "unlinked_tables": graph["unlinked"],
                "dangling_foreign_keys": len(connection.execute("PRAGMA foreign_key_check").fetchall()),
            }
    except (ValueError, sqlite3.Error, OSError) as exc:
        parser.exit(1, f"Count refused: {exc}\n")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
