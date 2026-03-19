from __future__ import annotations

from psycopg_pool import ConnectionPool


class SchoolRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def list_classes(self, school_id: str, query: str | None = None) -> list[tuple[str, str, str | None]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                q = (query or "").strip()
                if q:
                    cur.execute(
                        "SELECT id, name, home_room_id FROM classes WHERE school_id=%s AND name ILIKE %s ORDER BY name",
                        (school_id, f"%{q}%"),
                    )
                else:
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

    def create_room(self, school_id: str, name: str, capacity: int) -> tuple[str, str, int]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO rooms (school_id, name, capacity) VALUES (%s, %s, %s) RETURNING id, name, capacity",
                    (school_id, name, capacity),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert room")
        return (str(row[0]), str(row[1]), int(row[2]))

    def update_room(self, school_id: str, room_id: str, name: str, capacity: int) -> tuple[str, str, int]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE rooms
                    SET name=%s, capacity=%s
                    WHERE id=%s AND school_id=%s
                    RETURNING id, name, capacity
                    """,
                    (name, capacity, room_id, school_id),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Room not found")
        return (str(row[0]), str(row[1]), int(row[2]))

    def delete_room(self, school_id: str, room_id: str) -> bool:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM rooms WHERE id=%s AND school_id=%s",
                    (room_id, school_id),
                )
                if cur.fetchone() is None:
                    return False

                cur.execute(
                    "SELECT 1 FROM classes WHERE school_id=%s AND home_room_id=%s LIMIT 1",
                    (school_id, room_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete room: used as home room")

                cur.execute(
                    "SELECT 1 FROM scheduled_sessions WHERE school_id=%s AND room_id=%s LIMIT 1",
                    (school_id, room_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete room: used by scheduled sessions")

                cur.execute(
                    "DELETE FROM rooms WHERE id=%s AND school_id=%s",
                    (room_id, school_id),
                )
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0

    def list_subjects(self, school_id: str) -> list[tuple[str, str]]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name FROM subjects WHERE school_id=%s ORDER BY name",
                    (school_id,),
                )
                return [(str(r[0]), str(r[1])) for r in (cur.fetchall() or [])]

    def create_subject(self, school_id: str, name: str) -> tuple[str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO subjects (school_id, name) VALUES (%s, %s) RETURNING id, name",
                    (school_id, name),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert subject")
        return (str(row[0]), str(row[1]))

    def rename_subject(self, school_id: str, subject_id: str, new_name: str) -> tuple[str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE subjects
                    SET name=%s
                    WHERE id=%s AND school_id=%s
                    RETURNING id, name
                    """,
                    (new_name, subject_id, school_id),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Subject not found")
        return (str(row[0]), str(row[1]))

    def delete_subject(self, school_id: str, subject_id: str) -> bool:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM subjects WHERE id=%s AND school_id=%s",
                    (subject_id, school_id),
                )
                if cur.fetchone() is None:
                    return False

                cur.execute(
                    "SELECT 1 FROM courses WHERE school_id=%s AND subject_id=%s LIMIT 1",
                    (school_id, subject_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete subject: used by courses")

                cur.execute(
                    "DELETE FROM subjects WHERE id=%s AND school_id=%s",
                    (subject_id, school_id),
                )
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0

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

    def create_course(
        self,
        school_id: str,
        class_id: str,
        subject_id: str,
        professor_id: str,
        required_hours_per_week: float,
    ) -> tuple[str, float, str, str, str, str, str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name FROM classes WHERE id=%s AND school_id=%s",
                    (class_id, school_id),
                )
                cls = cur.fetchone()
                if cls is None:
                    raise RuntimeError("Class not found")

                cur.execute(
                    "SELECT id, name FROM subjects WHERE id=%s AND school_id=%s",
                    (subject_id, school_id),
                )
                sub = cur.fetchone()
                if sub is None:
                    raise RuntimeError("Subject not found")

                cur.execute(
                    "SELECT id, name FROM professors WHERE id=%s AND school_id=%s",
                    (professor_id, school_id),
                )
                prof = cur.fetchone()
                if prof is None:
                    raise RuntimeError("Professor not found")

                cur.execute(
                    """
                    INSERT INTO courses (school_id, class_id, subject_id, professor_id, required_hours_per_week)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, required_hours_per_week
                    """,
                    (school_id, class_id, subject_id, professor_id, required_hours_per_week),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert course")

        return (
            str(row[0]),
            float(row[1]),
            str(sub[0]),
            str(sub[1]),
            str(cls[0]),
            str(cls[1]),
            str(prof[0]),
            str(prof[1]),
        )

    def update_course(
        self,
        school_id: str,
        course_id: str,
        professor_id: str,
        required_hours_per_week: float,
    ) -> tuple[str, float, str, str, str, str, str, str]:
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
                    UPDATE courses
                    SET professor_id=%s, required_hours_per_week=%s
                    WHERE id=%s AND school_id=%s
                    RETURNING id, required_hours_per_week, subject_id, class_id
                    """,
                    (professor_id, required_hours_per_week, course_id, school_id),
                )
                row = cur.fetchone()
                if row is None:
                    raise RuntimeError("Course not found")

                _cid, _req, subject_id, class_id = row

                cur.execute(
                    "SELECT id, name FROM subjects WHERE id=%s AND school_id=%s",
                    (subject_id, school_id),
                )
                sub = cur.fetchone()
                if sub is None:
                    raise RuntimeError("Subject not found")

                cur.execute(
                    "SELECT id, name FROM classes WHERE id=%s AND school_id=%s",
                    (class_id, school_id),
                )
                cls = cur.fetchone()
                if cls is None:
                    raise RuntimeError("Class not found")

            conn.commit()

        return (
            str(row[0]),
            float(row[1]),
            str(sub[0]),
            str(sub[1]),
            str(cls[0]),
            str(cls[1]),
            str(prof[0]),
            str(prof[1]),
        )

    def delete_course(self, school_id: str, course_id: str) -> bool:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM courses WHERE id=%s AND school_id=%s",
                    (course_id, school_id),
                )
                if cur.fetchone() is None:
                    return False

                cur.execute(
                    "SELECT 1 FROM scheduled_sessions WHERE school_id=%s AND course_id=%s LIMIT 1",
                    (school_id, course_id),
                )
                if cur.fetchone() is not None:
                    raise RuntimeError("Cannot delete course: used by scheduled sessions")

                cur.execute(
                    "DELETE FROM courses WHERE id=%s AND school_id=%s",
                    (course_id, school_id),
                )
                deleted = cur.rowcount or 0
            conn.commit()
        return deleted > 0

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

    def get_room_by_id(self, school_id: str, room_id: str) -> tuple[str, str, int] | None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, capacity FROM rooms WHERE school_id=%s AND id=%s",
                    (school_id, room_id),
                )
                row = cur.fetchone()
        if row is None:
            return None
        return (str(row[0]), str(row[1]), int(row[2]))

    def get_room_by_name(self, school_id: str, name: str) -> tuple[str, str, int] | None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, capacity FROM rooms WHERE school_id=%s AND lower(name)=lower(%s)",
                    (school_id, name),
                )
                row = cur.fetchone()
        if row is None:
            return None
        return (str(row[0]), str(row[1]), int(row[2]))

    def get_course_by_id(self, school_id: str, course_id: str) -> tuple[str, str, str, str] | None:
        """Return (course_id, class_id, subject_id, professor_id)"""
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, class_id, subject_id, professor_id FROM courses WHERE school_id=%s AND id=%s",
                    (school_id, course_id),
                )
                row = cur.fetchone()
        if row is None:
            return None
        return (str(row[0]), str(row[1]), str(row[2]), str(row[3]))

    def get_course_by_names(
        self,
        school_id: str,
        class_name: str,
        subject_name: str,
        professor_name: str,
    ) -> tuple[str, str, str, str] | None:
        """Return (course_id, class_id, subject_id, professor_id) based on class/subject/professor names."""
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT crs.id, crs.class_id, crs.subject_id, crs.professor_id
                    FROM courses crs
                    JOIN classes c ON c.id = crs.class_id
                    JOIN subjects s ON s.id = crs.subject_id
                    JOIN professors p ON p.id = crs.professor_id
                    WHERE crs.school_id=%s
                      AND lower(c.name)=lower(%s)
                      AND lower(s.name)=lower(%s)
                      AND lower(p.name)=lower(%s)
                    """,
                    (school_id, class_name, subject_name, professor_name),
                )
                row = cur.fetchone()
        if row is None:
            return None
        return (str(row[0]), str(row[1]), str(row[2]), str(row[3]))

    def replace_scheduled_sessions(
        self,
        school_id: str,
        rows: list[tuple[str, str, str, str, str, int, int, int]],
    ) -> int:
        """Replace all scheduled sessions for school.

        rows items: (course_id, room_id, professor_id, class_id, subject_id, day_of_week, start_minute, end_minute)
        """
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM scheduled_sessions WHERE school_id=%s", (school_id,))
                for (course_id, room_id, professor_id, class_id, subject_id, dow, start_min, end_min) in rows:
                    cur.execute(
                        """
                        INSERT INTO scheduled_sessions (
                          school_id, course_id, room_id, professor_id, class_id, subject_id,
                          day_of_week, start_minute, end_minute
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            school_id,
                            course_id,
                            room_id,
                            professor_id,
                            class_id,
                            subject_id,
                            dow,
                            start_min,
                            end_min,
                        ),
                    )
            conn.commit()
        return len(rows)
