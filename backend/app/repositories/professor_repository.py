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

    def rename(self, school_id: str, professor_id: str, new_name: str) -> tuple[str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE professors
                    SET name=%s
                    WHERE id=%s AND school_id=%s
                    RETURNING id, name
                    """,
                    (new_name, professor_id, school_id),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Professor not found")
        return (str(row[0]), str(row[1]))

    def delete(self, school_id: str, professor_id: str) -> bool:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM professors WHERE id=%s AND school_id=%s",
                    (professor_id, school_id),
                )
                if cur.fetchone() is None:
                    return False

                cur.execute(
                    "SELECT 1 FROM courses WHERE school_id=%s AND professor_id=%s LIMIT 1",
                    (school_id, professor_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete professor: used by courses")

                cur.execute(
                    "SELECT 1 FROM professor_unavailability WHERE school_id=%s AND professor_id=%s LIMIT 1",
                    (school_id, professor_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete professor: has unavailability")

                cur.execute(
                    "SELECT 1 FROM scheduled_sessions WHERE school_id=%s AND professor_id=%s LIMIT 1",
                    (school_id, professor_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete professor: used by scheduled sessions")

                cur.execute(
                    "DELETE FROM professors WHERE id=%s AND school_id=%s",
                    (professor_id, school_id),
                )
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0

    def create_unavailability(
        self,
        school_id: str,
        professor_id: str,
        day_of_week: int,
        start_time: str,
        end_time: str,
    ) -> tuple[str, str, str, int, str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name FROM professors WHERE id=%s AND school_id=%s",
                    (professor_id, school_id),
                )
                prof = cur.fetchone()
                if prof is None:
                    raise RuntimeError("Professor not found")

                cur.execute(
                    """
                    INSERT INTO professor_unavailability (school_id, professor_id, day_of_week, start_time, end_time)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (school_id, professor_id, day_of_week, start_time, end_time),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert unavailability")

        return (str(row[0]), str(prof[0]), str(prof[1]), int(day_of_week), str(start_time), str(end_time))

    def delete_unavailability(self, school_id: str, unavailability_id: str) -> bool:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM professor_unavailability WHERE id=%s AND school_id=%s",
                    (unavailability_id, school_id),
                )
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0
