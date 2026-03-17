from __future__ import annotations

from psycopg_pool import ConnectionPool


class SchoolRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def list_classes(self) -> list[tuple[str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM classes ORDER BY name")
                return [(str(r[0]), str(r[1])) for r in (cur.fetchall() or [])]

    def list_rooms(self) -> list[tuple[str, str, int]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, capacity FROM rooms ORDER BY name")
                return [(str(r[0]), str(r[1]), int(r[2])) for r in (cur.fetchall() or [])]

    def list_subjects(self) -> list[tuple[str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM subjects ORDER BY name")
                return [(str(r[0]), str(r[1])) for r in (cur.fetchall() or [])]

    def list_courses(self) -> list[tuple[str, float, str, str, str, str, str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                      crs.id,
                      crs.required_hours_per_week,
                      s.id AS subject_id,
                      s.name AS subject_name,
                      c.id AS class_id,
                      c.name AS class_name,
                      p.id AS professor_id,
                      p.name AS professor_name
                    FROM courses crs
                    JOIN subjects s ON s.id = crs.subject_id
                    JOIN classes c ON c.id = crs.class_id
                    JOIN professors p ON p.id = crs.professor_id
                    ORDER BY c.name, s.name
                    """
                )
                return [
                    (
                        str(r[0]),
                        float(r[1]),
                        str(r[2]),
                        str(r[3]),
                        str(r[4]),
                        str(r[5]),
                        str(r[6]),
                        str(r[7]),
                    )
                    for r in (cur.fetchall() or [])
                ]

    def list_professor_unavailability(self) -> list[tuple[str, str, str, int, str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                      u.id,
                      p.id AS professor_id,
                      p.name AS professor_name,
                      u.day_of_week,
                      u.start_time,
                      u.end_time
                    FROM professor_unavailability u
                    JOIN professors p ON p.id = u.professor_id
                    ORDER BY p.name, u.day_of_week, u.start_time
                    """
                )
                return [
                    (
                        str(r[0]),
                        str(r[1]),
                        str(r[2]),
                        int(r[3]),
                        str(r[4]),
                        str(r[5]),
                    )
                    for r in (cur.fetchall() or [])
                ]

    def list_scheduled_sessions(
        self,
    ) -> list[tuple[str, int, int, int, str, str, str, int, str, float, str, str, str, str, str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                      ses.id,
                      ses.day_of_week,
                      ses.start_minute,
                      ses.end_minute,
                      ses.created_at,
                      r.id AS room_id,
                      r.name AS room_name,
                      r.capacity AS room_capacity,

                      crs.id AS course_id,
                      crs.required_hours_per_week,

                      s.id AS subject_id,
                      s.name AS subject_name,
                      c.id AS class_id,
                      c.name AS class_name,
                      p.id AS professor_id,
                      p.name AS professor_name
                    FROM scheduled_sessions ses
                    JOIN rooms r ON r.id = ses.room_id
                    JOIN courses crs ON crs.id = ses.course_id
                    JOIN subjects s ON s.id = crs.subject_id
                    JOIN classes c ON c.id = crs.class_id
                    JOIN professors p ON p.id = crs.professor_id
                    ORDER BY ses.day_of_week, ses.start_minute, c.name
                    """
                )
                return [
                    (
                        str(r[0]),
                        int(r[1]),
                        int(r[2]),
                        int(r[3]),
                        str(r[4]),
                        str(r[5]),
                        str(r[6]),
                        int(r[7]),
                        str(r[8]),
                        float(r[9]),
                        str(r[10]),
                        str(r[11]),
                        str(r[12]),
                        str(r[13]),
                        str(r[14]),
                        str(r[15]),
                    )
                    for r in (cur.fetchall() or [])
                ]
