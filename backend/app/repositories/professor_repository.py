from __future__ import annotations

from psycopg_pool import ConnectionPool


class ProfessorRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def list(self) -> list[tuple[str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM professors ORDER BY id")
                return [(str(r[0]), str(r[1])) for r in (cur.fetchall() or [])]

    def create(self, name: str) -> tuple[str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO professors (name) VALUES (%s) RETURNING id, name",
                    (name,),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert professor")

        return (str(row[0]), str(row[1]))
