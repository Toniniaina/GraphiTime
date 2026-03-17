from __future__ import annotations

from psycopg_pool import ConnectionPool


class SchoolRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def list_classes(self, school_id: str) -> list[tuple[str, str, str | None]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, home_room_id FROM classes WHERE school_id=%s ORDER BY name",
                    (school_id,),
                )
                return [(str(r[0]), str(r[1]), str(r[2]) if r[2] is not None else None) for r in (cur.fetchall() or [])]

    def create_class(self, school_id: str, name: str) -> tuple[str, str, str | None]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO classes (school_id, name) VALUES (%s, %s) RETURNING id, name, home_room_id",
                    (school_id, name),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert class")
        return (str(row[0]), str(row[1]), str(row[2]) if row[2] is not None else None)

    def rename_class(self, school_id: str, class_id: str, new_name: str) -> tuple[str, str, str | None]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE classes
                    SET name=%s
                    WHERE id=%s AND school_id=%s
                    RETURNING id, name, home_room_id
                    """,
                    (new_name, class_id, school_id),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Class not found")
        return (str(row[0]), str(row[1]), str(row[2]) if row[2] is not None else None)

    def delete_class(self, school_id: str, class_id: str) -> bool:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM classes WHERE id=%s AND school_id=%s",
                    (class_id, school_id),
                )
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0

    def set_class_home_room(self, school_id: str, class_id: str, room_id: str | None) -> tuple[str, str, str | None]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                if room_id is not None:
                    cur.execute(
                        "SELECT 1 FROM rooms WHERE id=%s AND school_id=%s",
                        (room_id, school_id),
                    )
                    if cur.fetchone() is None:
                        raise RuntimeError("Room not found")

                cur.execute(
                    """
                    UPDATE classes
                    SET home_room_id=%s
                    WHERE id=%s AND school_id=%s
                    RETURNING id, name, home_room_id
                    """,
                    (room_id, class_id, school_id),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Class not found")
        return (str(row[0]), str(row[1]), str(row[2]) if row[2] is not None else None)

    def list_rooms(self, school_id: str) -> list[tuple[str, str, int]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, capacity FROM rooms WHERE school_id=%s ORDER BY name",
                    (school_id,),
                )
                return [(str(r[0]), str(r[1]), int(r[2])) for r in (cur.fetchall() or [])]

    def list_subjects(self, school_id: str) -> list[tuple[str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name FROM subjects WHERE school_id=%s ORDER BY name",
                    (school_id,),
                )
                return [(str(r[0]), str(r[1])) for r in (cur.fetchall() or [])]

    def list_courses(self, school_id: str) -> list[tuple[str, float, str, str, str, str, str, str]]:
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
                    WHERE crs.school_id = %s
                    ORDER BY c.name, s.name
                    """,
                    (school_id,),
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

    def list_professor_unavailability(self, school_id: str) -> list[tuple[str, str, str, int, str, str]]:
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
                    WHERE u.school_id = %s
                    ORDER BY p.name, u.day_of_week, u.start_time
                    """,
                    (school_id,),
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
        school_id: str,
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
                    WHERE ses.school_id = %s
                    ORDER BY ses.day_of_week, ses.start_minute, c.name
                    """,
                    (school_id,),
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
