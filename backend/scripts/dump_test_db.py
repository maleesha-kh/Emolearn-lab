"""Dump the schema and every row of a test database under backend/data/e2e/.

Read-only (opened with mode=ro), with the same path checks as reset_test_db.py.
Also flags anything that could hold image, audio or body data: BLOB columns or
values, very long values, base64 or data URLs, and names like "landmark".
Prints JSON.
"""
import argparse
import base64
import binascii
from contextlib import closing
import json
from pathlib import Path
import re
import sqlite3

from reset_test_db import checked_path, quote_identifier

LONG_VALUE = 1000
SUSPICIOUS_NAME = re.compile(r"landmark|keypoint|embedding|vector|image_data|pixels|audio|recording|biometric|face_data|pose_data", re.I)
DATA_URL = re.compile(r"data:[a-z]+/[a-z0-9.+-]+;base64,", re.I)
BASE64_RUN = re.compile(r"[A-Za-z0-9+/]{200,}={0,2}")


def looks_like_base64(value: str) -> bool:
    match = BASE64_RUN.search(value)
    if not match:
        return False
    try:
        base64.b64decode(match.group(0) + "=" * (-len(match.group(0)) % 4), validate=True)
        return True
    except (binascii.Error, ValueError):
        return False


def dump(connection: sqlite3.Connection) -> dict:
    tables = [
        row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        if not row[0].startswith("sqlite_")
    ]
    schema, rows, findings = {}, {}, []
    for table in tables:
        columns = [(c[1], c[2]) for c in connection.execute(f"PRAGMA table_info({quote_identifier(table)})")]
        schema[table] = [{"name": name, "type": declared} for name, declared in columns]
        for name, declared in columns:
            if "BLOB" in declared.upper():
                findings.append({"table": table, "column": name, "issue": "BLOB column"})
            if SUSPICIOUS_NAME.search(name):
                findings.append({"table": table, "column": name, "issue": "suspicious column name"})
        names = [name for name, _ in columns]
        table_rows = []
        for values in connection.execute(f"SELECT * FROM {quote_identifier(table)}"):
            row = dict(zip(names, values))
            for column, value in row.items():
                where = {"table": table, "column": column}
                if isinstance(value, bytes):
                    findings.append({**where, "issue": "binary value", "bytes": len(value)})
                    row[column] = f"<{len(value)} bytes>"
                elif isinstance(value, str):
                    if len(value) > LONG_VALUE:
                        findings.append({**where, "issue": "long value", "length": len(value)})
                    if DATA_URL.search(value):
                        findings.append({**where, "issue": "data URL"})
                    elif looks_like_base64(value):
                        findings.append({**where, "issue": "base64-like value"})
                    if SUSPICIOUS_NAME.search(value):
                        findings.append({**where, "issue": "suspicious word in value"})
            table_rows.append(row)
        rows[table] = table_rows
    return {"tables": tables, "schema": schema, "row_counts": {t: len(r) for t, r in rows.items()}, "rows": rows, "findings": findings}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path")
    args = parser.parse_args()
    try:
        resolved = checked_path(args.db_path, action="read")
        with closing(sqlite3.connect(Path(resolved).as_uri() + "?mode=ro", uri=True)) as connection:
            result = dump(connection)
    except (ValueError, sqlite3.Error, OSError) as exc:
        parser.exit(1, f"Dump refused: {exc}\n")
    print(json.dumps(result, indent=1, default=str))


if __name__ == "__main__":
    main()
