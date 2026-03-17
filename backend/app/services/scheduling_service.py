from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterable

from ortools.sat.python import cp_model
from psycopg_pool import ConnectionPool


@dataclass(frozen=True)
class CourseRow:
    id: str
    required_hours_per_week: float
    subject_id: str
    subject_name: str
    class_id: str
    class_name: str
    professor_id: str
    professor_name: str


@dataclass(frozen=True)
class RoomRow:
    id: str
    name: str
    capacity: int


@dataclass(frozen=True)
class UnavailabilityRow:
    id: str
    professor_id: str
    professor_name: str
    day_of_week: int
    start_time: str
    end_time: str


@dataclass(frozen=True)
class GeneratedSessionRow:
    id: str
    day_of_week: int
    start_minute: int
    end_minute: int
    created_at: str
    room: RoomRow
    course: CourseRow


def _time_to_minute(t: str) -> int:
    parts = t.split(":")
    if len(parts) < 2:
        raise ValueError(f"Invalid time format: {t!r}")
    hh = parts[0]
    mm = parts[1]
    return int(hh) * 60 + int(mm)


def _overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and a_end > b_start


class SchedulingService:
    """Simple constraint-based timetable generation.

    This is a greedy coloring-like assignment over fixed time slots.
    """

    START_MINUTE = 6 * 60
    MORNING_SLOTS = [420, 480, 540, 600, 660]  # start minutes
    AFTERNOON_SLOTS = [840, 900, 960]

    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def _list_courses(self, school_id: str) -> list[CourseRow]:
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
                rows = cur.fetchall() or []

        out: list[CourseRow] = []
        for r in rows:
            out.append(
                CourseRow(
                    id=str(r[0]),
                    required_hours_per_week=float(r[1]),
                    subject_id=str(r[2]),
                    subject_name=str(r[3]),
                    class_id=str(r[4]),
                    class_name=str(r[5]),
                    professor_id=str(r[6]),
                    professor_name=str(r[7]),
                )
            )
        return out

    def _list_rooms(self, school_id: str) -> list[RoomRow]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, name, capacity FROM rooms WHERE school_id=%s ORDER BY name",
                    (school_id,),
                )
                rows = cur.fetchall() or []
        return [RoomRow(id=str(i), name=str(n), capacity=int(c)) for (i, n, c) in rows]

    def _list_class_home_rooms(self, school_id: str) -> dict[str, str]:
        """Return mapping class_id -> room_id for the class main room."""
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT c.id, c.home_room_id
                    FROM classes c
                    WHERE c.school_id = %s
                    ORDER BY c.name
                    """,
                    (school_id,),
                )
                rows = cur.fetchall() or []

        out: dict[str, str] = {}
        for cid, rid in rows:
            if rid is None:
                continue
            out[str(cid)] = str(rid)
        return out

    def _list_unavailability(self, school_id: str) -> list[UnavailabilityRow]:
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
                rows = cur.fetchall() or []

        out: list[UnavailabilityRow] = []
        for r in rows:
            out.append(
                UnavailabilityRow(
                    id=str(r[0]),
                    professor_id=str(r[1]),
                    professor_name=str(r[2]),
                    day_of_week=int(r[3]),
                    start_time=str(r[4]),
                    end_time=str(r[5]),
                )
            )
        return out

    def _pick_room(self, rooms: list[RoomRow], subject_name: str) -> RoomRow:
        subj = subject_name.lower()
        if "eps" in subj or "sport" in subj or "gym" in subj:
            for r in rooms:
                if "gym" in r.name.lower():
                    return r
        for r in rooms:
            if "salle" in r.name.lower():
                return r
        return rooms[0]

    def _pick_room_for_class(
        self,
        rooms: list[RoomRow],
        subject_name: str,
        class_id: str,
        class_home_room_id: dict[str, str],
    ) -> RoomRow:
        subj = subject_name.lower()
        if "eps" in subj or "sport" in subj or "gym" in subj:
            return self._pick_room(rooms, subject_name)
        room_id = class_home_room_id.get(class_id)
        if room_id:
            for r in rooms:
                if r.id == room_id:
                    return r
        return self._pick_room(rooms, subject_name)

    def _is_prof_available(self, unv: list[UnavailabilityRow], prof_id: str, dow: int, start: int, end: int) -> bool:
        for u in unv:
            if u.professor_id != prof_id:
                continue
            if u.day_of_week != dow:
                continue
            u_start = _time_to_minute(u.start_time)
            u_end = _time_to_minute(u.end_time)
            if _overlaps(start, end, u_start, u_end):
                return False
        return True

    def generate_preview(self, school_id: str) -> list[GeneratedSessionRow]:
        courses = self._list_courses(school_id)
        rooms = self._list_rooms(school_id)
        unv = self._list_unavailability(school_id)
        if not rooms:
            raise RuntimeError("No rooms found")

        class_home_room_id = self._list_class_home_rooms(school_id)

        # Quick feasibility check (approx): total teaching hours per professor must fit in the week's capacity.
        # Weekly capacity per professor (by our allowed windows): 5 days * (6h morning + 4h afternoon) = 50h.
        prof_load: dict[str, float] = {}
        prof_name: dict[str, str] = {}
        for c in courses:
            prof_load[c.professor_id] = prof_load.get(c.professor_id, 0.0) + float(c.required_hours_per_week)
            prof_name[c.professor_id] = c.professor_name
        overload = [(pid, h) for pid, h in prof_load.items() if h > 50.0 + 1e-9]
        if overload:
            details = ", ".join(f"{prof_name.get(pid, pid)}={h}h" for pid, h in sorted(overload, key=lambda x: -x[1]))
            raise RuntimeError(f"CP-SAT: impossible (charge prof > 50h/semaine): {details}")

        courses_by_class: dict[str, list[CourseRow]] = {}
        for c in courses:
            courses_by_class.setdefault(c.class_id, []).append(c)

        # Validate home room presence for all classes being scheduled.
        missing_home = [cid for cid in courses_by_class.keys() if cid not in class_home_room_id]
        if missing_home:
            names = ", ".join(sorted({c.class_name for c in courses if c.class_id in missing_home}))
            raise RuntimeError(
                f"CP-SAT: home_room_id manquant pour la/les classe(s): {names}. Renseigne classes.home_room_id (ex: Salle 01, Salle 02)."
            )

        def _decompose_required_hours(course: CourseRow) -> list[int]:
            """Decompose required hours into session blocks.

            Rules:
              - Étude can be 1h blocks.
              - Other subjects are scheduled only as 2h or 3h blocks.
            """

            total = int(
                Decimal(str(course.required_hours_per_week)).to_integral_value(rounding="ROUND_HALF_UP")
            )
            if total <= 0:
                return []
            if course.subject_name.lower() in {"étude", "etude"}:
                return [1] * total

            blocks: list[int] = []
            remaining = total
            while remaining > 0:
                if remaining in (2, 4):
                    blocks.append(2)
                    remaining -= 2
                    continue
                if remaining >= 3:
                    blocks.append(3)
                    remaining -= 3
                    continue
                # leftover 1h cannot be scheduled for non-Étude
                break
            return blocks

        @dataclass(frozen=True)
        class _Task:
            id: int
            class_id: str
            course: CourseRow
            duration_h: int

        @dataclass(frozen=True)
        class _Slot:
            id: int
            class_id: str
            day_of_week: int
            start_minute: int
            end_minute: int
            duration_h: int
            cost: int

        tasks: list[_Task] = []
        task_id = 0
        for class_id, class_courses in courses_by_class.items():
            for crs in class_courses:
                for dur in _decompose_required_hours(crs):
                    tasks.append(_Task(id=task_id, class_id=class_id, course=crs, duration_h=dur))
                    task_id += 1

        # Fixed slots per day per class.
        # We offer all possible 1h/2h/3h slots inside allowed time windows:
        #   - morning: 06:00-12:00 (360-720)
        #   - afternoon: 14:00-18:00 (840-1080)
        # CP-SAT will decide which slots are used.
        slots: list[_Slot] = []
        slot_id = 0
        for class_id in courses_by_class.keys():
            for dow in range(1, 6):
                windows = [(360, 720), (840, 1080)]
                for win_start, win_end in windows:
                    for dur_h in (1, 2, 3):
                        dur_min = dur_h * 60
                        start = win_start
                        while start + dur_min <= win_end:
                            end = start + dur_min
                            # Base cost packs earlier slots first (lower is better), but we strongly
                            # penalize using tolerance hours outside the normal day:
                            #   - normal: 07:00-12:00 and 14:00-17:00
                            #   - tolerance: 06:00-07:00 and 17:00-18:00
                            penalty = 0
                            if start < 420:  # before 07:00
                                penalty += 1_000_000
                            if end > 1020:  # after 17:00
                                penalty += 1_000_000
                            cost = penalty + (dow - 1) * 100000 + start
                            slots.append(
                                _Slot(
                                    id=slot_id,
                                    class_id=class_id,
                                    day_of_week=dow,
                                    start_minute=start,
                                    end_minute=end,
                                    duration_h=dur_h,
                                    cost=cost,
                                )
                            )
                            slot_id += 1
                            start += 60

        model = cp_model.CpModel()

        # x[(task_id, slot_id)] = 1 if task assigned to slot.
        x: dict[tuple[int, int], cp_model.IntVar] = {}

        tasks_by_class: dict[str, list[_Task]] = {}
        for t in tasks:
            tasks_by_class.setdefault(t.class_id, []).append(t)

        slots_by_class: dict[str, list[_Slot]] = {}
        for s in slots:
            slots_by_class.setdefault(s.class_id, []).append(s)

        # Create variables only when durations match + professor available.
        for t in tasks:
            for s in slots_by_class.get(t.class_id, []):
                if s.duration_h != t.duration_h:
                    continue
                if not self._is_prof_available(
                    unv, t.course.professor_id, s.day_of_week, s.start_minute, s.end_minute
                ):
                    continue
                x[(t.id, s.id)] = model.NewBoolVar(f"x_t{t.id}_s{s.id}")

        # Each task must be assigned exactly once.
        for t in tasks:
            vars_for_task = [v for (tid, _sid), v in x.items() if tid == t.id]
            if not vars_for_task:
                raise RuntimeError(
                    f"No feasible slot for task course={t.course.subject_name} class={t.course.class_name} dur={t.duration_h}h"
                )
            model.Add(sum(vars_for_task) == 1)

        # Each slot can host at most one task for that class.
        for s in slots:
            vars_for_slot = [v for (_tid, sid), v in x.items() if sid == s.id]
            if vars_for_slot:
                model.Add(sum(vars_for_slot) <= 1)

        # Class conflict constraints: for each class/day, overlapping slots cannot both be chosen.
        by_class_day: dict[tuple[str, int], list[tuple[_Slot, cp_model.IntVar]]] = {}
        for (tid, sid), var in x.items():
            t = tasks[tid]
            s = slots[sid]
            key = (t.class_id, s.day_of_week)
            by_class_day.setdefault(key, []).append((s, var))

        for (_class_id, _dow), items in by_class_day.items():
            for i in range(len(items)):
                s1, v1 = items[i]
                for j in range(i + 1, len(items)):
                    s2, v2 = items[j]
                    if _overlaps(s1.start_minute, s1.end_minute, s2.start_minute, s2.end_minute):
                        model.Add(v1 + v2 <= 1)

        # Max 4h per subject per day (per class), excluding Étude.
        by_class_day_subject: dict[tuple[str, int, str], list[tuple[int, cp_model.IntVar]]] = {}
        for (tid, sid), var in x.items():
            t = tasks[tid]
            s = slots[sid]
            subj_name = t.course.subject_name.lower()
            if subj_name in {"étude", "etude"}:
                continue
            key = (t.class_id, s.day_of_week, t.course.subject_id)
            by_class_day_subject.setdefault(key, []).append((t.duration_h, var))

        for (_class_id, _dow, _subj_id), items in by_class_day_subject.items():
            model.Add(sum(dur * var for (dur, var) in items) <= 4)

        # Professor conflict constraints across classes.
        # For each professor and each time-window, only one assigned.
        by_prof_day: dict[tuple[str, int], list[tuple[_Slot, cp_model.IntVar]]] = {}
        for (tid, sid), var in x.items():
            t = tasks[tid]
            s = slots[sid]
            key = (t.course.professor_id, s.day_of_week)
            by_prof_day.setdefault(key, []).append((s, var))

        for (_prof_id, dow), items in by_prof_day.items():
            # slots are standard; we just ensure non-overlap by checking all pairs that overlap.
            for i in range(len(items)):
                s1, v1 = items[i]
                for j in range(i + 1, len(items)):
                    s2, v2 = items[j]
                    if _overlaps(s1.start_minute, s1.end_minute, s2.start_minute, s2.end_minute):
                        model.Add(v1 + v2 <= 1)

        # Objective: pack earlier slots, minimizing "holes".
        objective_terms: list[cp_model.LinearExpr] = []
        for (tid, sid), var in x.items():
            s = slots[sid]
            objective_terms.append(var * s.cost)
        model.Minimize(sum(objective_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 20.0
        solver.parameters.num_search_workers = 8

        status = solver.Solve(model)
        if status == cp_model.UNKNOWN:
            raise RuntimeError("CP-SAT: timeout (aucune solution trouvée dans le temps imparti)")
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise RuntimeError("CP-SAT: no feasible schedule found (contraintes incompatibles)")

        now = datetime.now(tz=timezone.utc).isoformat()
        preview: list[GeneratedSessionRow] = []
        sid_out = 1

        # Build preview sessions from chosen assignments.
        # Sort by day/start for nicer output.
        chosen: list[tuple[_Slot, _Task]] = []
        for (tid, sid), var in x.items():
            if solver.Value(var) != 1:
                continue
            chosen.append((slots[sid], tasks[tid]))

        chosen.sort(key=lambda it: (it[0].class_id, it[0].day_of_week, it[0].start_minute))

        for s, t in chosen:
            room = self._pick_room_for_class(rooms, t.course.subject_name, t.class_id, class_home_room_id)
            preview.append(
                GeneratedSessionRow(
                    id=f"PRE{sid_out:05d}",
                    day_of_week=s.day_of_week,
                    start_minute=s.start_minute,
                    end_minute=s.end_minute,
                    created_at=now,
                    room=room,
                    course=t.course,
                )
            )
            sid_out += 1

        return preview

    def apply_generated_schedule(self, school_id: str, generated: Iterable[GeneratedSessionRow]) -> None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM scheduled_sessions WHERE school_id=%s", (school_id,))
                for ses in generated:
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
                            ses.course.id,
                            ses.room.id,
                            ses.course.professor_id,
                            ses.course.class_id,
                            ses.course.subject_id,
                            ses.day_of_week,
                            ses.start_minute,
                            ses.end_minute,
                        ),
                    )
            conn.commit()
