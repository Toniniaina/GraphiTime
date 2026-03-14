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
