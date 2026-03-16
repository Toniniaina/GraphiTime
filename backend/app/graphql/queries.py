import strawberry

from ..repositories.professor_repository import ProfessorRepository
from ..repositories.school_repository import SchoolRepository
from ..services.professor_service import ProfessorService
from ..services.school_service import SchoolService
from ..services.scheduling_service import SchedulingService
from .context import GraphQLContext
from .types import (
    Course,
    DbStatus,
    Professor,
    ProfessorUnavailability,
    Room,
    ScheduledSession,
    SchoolClass,
    Subject,
    TeacherSchedule,
    TeacherUnavailabilityBlock,
)


@strawberry.type
class Query:
    @strawberry.field
    def ping(self) -> str:
        return "pong"

    @strawberry.field
    def db_status(self, info: strawberry.Info[GraphQLContext, None]) -> DbStatus:
        try:
            with info.context.db_pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT now(), version()")
                    row = cur.fetchone()

            db_time = str(row[0]) if row and row[0] is not None else ""
            db_version = str(row[1]) if row and row[1] is not None else ""
            return DbStatus(ok=True, db_time=db_time, db_version=db_version)
        except Exception as e:
            return DbStatus(ok=False, db_time="", db_version="", error=str(e))

    @strawberry.field
    def professors(self, info: strawberry.Info[GraphQLContext, None]) -> list[Professor]:
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        return [Professor(id=i, name=n) for (i, n) in svc.list_professors()]

    @strawberry.field
    def classes(self, info: strawberry.Info[GraphQLContext, None]) -> list[SchoolClass]:
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return [SchoolClass(id=i, name=n) for (i, n) in svc.list_classes()]

    @strawberry.field
    def rooms(self, info: strawberry.Info[GraphQLContext, None]) -> list[Room]:
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return [Room(id=i, name=n, capacity=cap) for (i, n, cap) in svc.list_rooms()]

    @strawberry.field
    def subjects(self, info: strawberry.Info[GraphQLContext, None]) -> list[Subject]:
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return [Subject(id=i, name=n) for (i, n) in svc.list_subjects()]

    @strawberry.field
    def courses(self, info: strawberry.Info[GraphQLContext, None]) -> list[Course]:
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        out: list[Course] = []
        for (crs_id, req, sub_id, sub_name, cls_id, cls_name, prof_id, prof_name) in svc.list_courses():
            out.append(
                Course(
                    id=crs_id,
                    required_hours_per_week=req,
                    subject=Subject(id=sub_id, name=sub_name),
                    school_class=SchoolClass(id=cls_id, name=cls_name),
                    professor=Professor(id=prof_id, name=prof_name),
                )
            )
        return out

    @strawberry.field
    def generate_schedule_preview(self, info: strawberry.Info[GraphQLContext, None]) -> list[ScheduledSession]:
        svc = SchedulingService(info.context.db_pool)
        generated = svc.generate_preview()

        out: list[ScheduledSession] = []
        for ses in generated:
            room = Room(id=ses.room.id, name=ses.room.name, capacity=ses.room.capacity)
            course = Course(
                id=ses.course.id,
                required_hours_per_week=ses.course.required_hours_per_week,
                subject=Subject(id=ses.course.subject_id, name=ses.course.subject_name),
                school_class=SchoolClass(id=ses.course.class_id, name=ses.course.class_name),
                professor=Professor(id=ses.course.professor_id, name=ses.course.professor_name),
            )
            out.append(
                ScheduledSession(
                    id=ses.id,
                    day_of_week=ses.day_of_week,
                    start_minute=ses.start_minute,
                    end_minute=ses.end_minute,
                    created_at=ses.created_at,
                    course=course,
                    room=room,
                )
            )
        return out

    @strawberry.field
    def professor_unavailability(
        self, info: strawberry.Info[GraphQLContext, None]
    ) -> list[ProfessorUnavailability]:
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        out: list[ProfessorUnavailability] = []
        for (u_id, prof_id, prof_name, dow, start, end) in svc.list_professor_unavailability():
            out.append(
                ProfessorUnavailability(
                    id=u_id,
                    professor=Professor(id=prof_id, name=prof_name),
                    day_of_week=dow,
                    start_time=start,
                    end_time=end,
                )
            )
        return out

    @strawberry.field
    def scheduled_sessions(self, info: strawberry.Info[GraphQLContext, None]) -> list[ScheduledSession]:
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        out: list[ScheduledSession] = []
        for (
            ses_id,
            dow,
            start_min,
            end_min,
            created_at,
            room_id,
            room_name,
            room_cap,
            crs_id,
            req,
            sub_id,
            sub_name,
            cls_id,
            cls_name,
            prof_id,
            prof_name,
        ) in svc.list_scheduled_sessions():
            room = Room(id=room_id, name=room_name, capacity=room_cap)
            course = Course(
                id=crs_id,
                required_hours_per_week=req,
                subject=Subject(id=sub_id, name=sub_name),
                school_class=SchoolClass(id=cls_id, name=cls_name),
                professor=Professor(id=prof_id, name=prof_name),
            )
            out.append(
                ScheduledSession(
                    id=ses_id,
                    day_of_week=dow,
                    start_minute=start_min,
                    end_minute=end_min,
                    created_at=created_at,
                    course=course,
                    room=room,
                )
            )
        return out

    @strawberry.field
    def teacher_schedule(self, info: strawberry.Info[GraphQLContext, None], professor_id: str) -> TeacherSchedule:
        svc = SchoolService(SchoolRepository(info.context.db_pool))

        sessions_raw: list[ScheduledSession] = []
        for (
            ses_id,
            dow,
            start_min,
            end_min,
            created_at,
            room_id,
            room_name,
            room_cap,
            crs_id,
            req,
            sub_id,
            sub_name,
            cls_id,
            cls_name,
            prof_id,
            prof_name,
        ) in svc.list_scheduled_sessions():
            if prof_id != professor_id:
                continue
            room = Room(id=room_id, name=room_name, capacity=room_cap)
            course = Course(
                id=crs_id,
                required_hours_per_week=req,
                subject=Subject(id=sub_id, name=sub_name),
                school_class=SchoolClass(id=cls_id, name=cls_name),
                professor=Professor(id=prof_id, name=prof_name),
            )
            sessions_raw.append(
                ScheduledSession(
                    id=ses_id,
                    day_of_week=dow,
                    start_minute=start_min,
                    end_minute=end_min,
                    created_at=created_at,
                    course=course,
                    room=room,
                )
            )

        sessions_raw.sort(key=lambda s: (s.day_of_week, s.start_minute, s.end_minute, s.course.id, s.room.id))

        merged_sessions: list[ScheduledSession] = []
        cur: ScheduledSession | None = None
        for s in sessions_raw:
            if cur is None:
                cur = s
                continue

            same_identity = (
                cur.day_of_week == s.day_of_week
                and cur.course.subject.id == s.course.subject.id
                and cur.course.school_class.id == s.course.school_class.id
                and cur.room.id == s.room.id
            )
            if same_identity and cur.end_minute == s.start_minute:
                cur = ScheduledSession(
                    id=cur.id,
                    day_of_week=cur.day_of_week,
                    start_minute=cur.start_minute,
                    end_minute=s.end_minute,
                    created_at=cur.created_at,
                    course=cur.course,
                    room=cur.room,
                )
                continue

            merged_sessions.append(cur)
            cur = s

        if cur is not None:
            merged_sessions.append(cur)

        unv_raw: list[TeacherUnavailabilityBlock] = []
        for (u_id, prof_id, _prof_name, dow, start, end) in svc.list_professor_unavailability():
            if prof_id != professor_id:
                continue
            try:
                hh_s, mm_s, *_ = str(start).split(":")
                hh_e, mm_e, *_ = str(end).split(":")
                start_min = int(hh_s) * 60 + int(mm_s)
                end_min = int(hh_e) * 60 + int(mm_e)
            except Exception:
                continue
            unv_raw.append(TeacherUnavailabilityBlock(day_of_week=dow, start_minute=start_min, end_minute=end_min))

        unv_raw.sort(key=lambda u: (u.day_of_week, u.start_minute, u.end_minute))
        merged_unv: list[TeacherUnavailabilityBlock] = []
        curu: TeacherUnavailabilityBlock | None = None
        for u in unv_raw:
            if curu is None:
                curu = u
                continue
            if curu.day_of_week == u.day_of_week and curu.end_minute >= u.start_minute:
                curu = TeacherUnavailabilityBlock(
                    day_of_week=curu.day_of_week,
                    start_minute=curu.start_minute,
                    end_minute=max(curu.end_minute, u.end_minute),
                )
                continue
            merged_unv.append(curu)
            curu = u

        if curu is not None:
            merged_unv.append(curu)

        return TeacherSchedule(sessions=merged_sessions, unavailability=merged_unv)
