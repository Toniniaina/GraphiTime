import strawberry

from ..repositories.auth_repository import AuthRepository
from ..repositories.professor_repository import ProfessorRepository
from ..repositories.school_repository import SchoolRepository
from ..services.auth_service import AuthService
from ..services.professor_service import ProfessorService
from ..services.scheduling_service import SchedulingService
from ..services.school_service import SchoolService
from .context import GraphQLContext
from .types import (
    ApplyScheduleResult,
    AuthPayload,
    CreateClassInput,
    CreateCourseInput,
    CreateRoomInput,
    CreateProfessorInput,
    CreateProfessorUnavailabilityInput,
    CreateSubjectInput,
    DeleteCourseInput,
    DeleteProfessorInput,
    DeleteClassInput,
    DeleteProfessorUnavailabilityInput,
    DeleteRoomInput,
    DeleteSubjectInput,
    LoginInput,
    Me,
    Professor,
    ProfessorUnavailability,
    RenameClassInput,
    RenameProfessorInput,
    RenameSubjectInput,
    RegisterSchoolInput,
    Room,
    School,
    SchoolClass,
    SetClassHomeRoomInput,
    Subject,
    Course,
    UpdateCourseInput,
    UpdateRoomInput,
)


def _require_school_id(info: strawberry.Info[GraphQLContext, None]) -> str:
    token = info.context.request.cookies.get("gt_session", "")
    me_row = AuthService(AuthRepository(info.context.db_pool)).me_from_session_token(token)
    if me_row is None:
        raise RuntimeError("Not authenticated")
    _acc_id, _login, school_id, _school_name = me_row
    return school_id


@strawberry.type
class Mutation:
    @strawberry.mutation
    def register_school(self, info: strawberry.Info[GraphQLContext, None], input: RegisterSchoolInput) -> AuthPayload:
        try:
            svc = AuthService(AuthRepository(info.context.db_pool))
            _school_id, _school_name, account_id, login = svc.register_school(
                input.school_name, input.login, input.password
            )

            ip = info.context.request.client.host if info.context.request.client else None
            user_agent = info.context.request.headers.get("user-agent")
            token, expires_at = svc.create_session(account_id, ip, user_agent)

            info.context.response.set_cookie(
                key="gt_session",
                value=token,
                httponly=True,
                samesite="lax",
                secure=False,
                expires=int(expires_at.timestamp()),
                path="/",
            )

            me = Me(account_id=account_id, login=login, school=School(id=_school_id, name=_school_name))
            return AuthPayload(ok=True, me=me)
        except Exception as e:
            return AuthPayload(ok=False, error=str(e))

    @strawberry.mutation
    def login(self, info: strawberry.Info[GraphQLContext, None], input: LoginInput) -> AuthPayload:
        try:
            svc = AuthService(AuthRepository(info.context.db_pool))
            account_id, school_id = svc.login(input.login, input.password)

            ip = info.context.request.client.host if info.context.request.client else None
            user_agent = info.context.request.headers.get("user-agent")
            token, expires_at = svc.create_session(account_id, ip, user_agent)

            info.context.response.set_cookie(
                key="gt_session",
                value=token,
                httponly=True,
                samesite="lax",
                secure=False,
                expires=int(expires_at.timestamp()),
                path="/",
            )

            sch = AuthRepository(info.context.db_pool).get_school_by_id(school_id)
            if sch is None:
                raise RuntimeError("School not found")
            _sid, _sname = sch
            me = Me(account_id=account_id, login=input.login.strip().lower(), school=School(id=_sid, name=_sname))
            return AuthPayload(ok=True, me=me)
        except Exception as e:
            return AuthPayload(ok=False, error=str(e))

    @strawberry.mutation
    def logout(self, info: strawberry.Info[GraphQLContext, None]) -> bool:
        token = info.context.request.cookies.get("gt_session", "")
        try:
            svc = AuthService(AuthRepository(info.context.db_pool))
            svc.logout(token)
        finally:
            info.context.response.delete_cookie(key="gt_session", path="/")
        return True

    @strawberry.mutation
    def create_professor(
        self, info: strawberry.Info[GraphQLContext, None], input: CreateProfessorInput
    ) -> Professor:
        school_id = _require_school_id(info)
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        pid, name = svc.create_professor(school_id, input.name)
        return Professor(id=pid, name=name)

    @strawberry.mutation
    def rename_professor(
        self, info: strawberry.Info[GraphQLContext, None], input: RenameProfessorInput
    ) -> Professor:
        school_id = _require_school_id(info)
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        pid, name = svc.rename_professor(school_id, input.id, input.name)
        return Professor(id=pid, name=name)

    @strawberry.mutation
    def delete_professor(
        self, info: strawberry.Info[GraphQLContext, None], input: DeleteProfessorInput
    ) -> bool:
        school_id = _require_school_id(info)
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        return svc.delete_professor(school_id, input.id)

    @strawberry.mutation
    def create_professor_unavailability(
        self, info: strawberry.Info[GraphQLContext, None], input: CreateProfessorUnavailabilityInput
    ) -> ProfessorUnavailability:
        school_id = _require_school_id(info)
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        uid, pid, pname, dow, start, end = svc.create_unavailability(
            school_id, input.professor_id, input.day_of_week, input.start_time, input.end_time
        )
        return ProfessorUnavailability(
            id=uid,
            professor=Professor(id=pid, name=pname),
            day_of_week=dow,
            start_time=start,
            end_time=end,
        )

    @strawberry.mutation
    def delete_professor_unavailability(
        self, info: strawberry.Info[GraphQLContext, None], input: DeleteProfessorUnavailabilityInput
    ) -> bool:
        school_id = _require_school_id(info)
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        return svc.delete_unavailability(school_id, input.id)

    @strawberry.mutation
    def create_class(self, info: strawberry.Info[GraphQLContext, None], input: CreateClassInput) -> SchoolClass:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        cid, name, hr = svc.create_class(school_id, input.name)
        return SchoolClass(id=cid, name=name, home_room_id=hr)

    @strawberry.mutation
    def rename_class(self, info: strawberry.Info[GraphQLContext, None], input: RenameClassInput) -> SchoolClass:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        cid, name, hr = svc.rename_class(school_id, input.id, input.name)
        return SchoolClass(id=cid, name=name, home_room_id=hr)

    @strawberry.mutation
    def delete_class(self, info: strawberry.Info[GraphQLContext, None], input: DeleteClassInput) -> bool:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return svc.delete_class(school_id, input.id)

    @strawberry.mutation
    def set_class_home_room(
        self, info: strawberry.Info[GraphQLContext, None], input: SetClassHomeRoomInput
    ) -> SchoolClass:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        cid, name, hr = svc.set_class_home_room(school_id, input.class_id, input.room_id)
        return SchoolClass(id=cid, name=name, home_room_id=hr)

    @strawberry.mutation
    def create_room(self, info: strawberry.Info[GraphQLContext, None], input: CreateRoomInput) -> Room:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        rid, name, cap = svc.create_room(school_id, input.name, input.capacity)
        return Room(id=rid, name=name, capacity=cap)

    @strawberry.mutation
    def update_room(self, info: strawberry.Info[GraphQLContext, None], input: UpdateRoomInput) -> Room:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        rid, name, cap = svc.update_room(school_id, input.id, input.name, input.capacity)
        return Room(id=rid, name=name, capacity=cap)

    @strawberry.mutation
    def delete_room(self, info: strawberry.Info[GraphQLContext, None], input: DeleteRoomInput) -> bool:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return svc.delete_room(school_id, input.id)

    @strawberry.mutation
    def create_subject(self, info: strawberry.Info[GraphQLContext, None], input: CreateSubjectInput) -> Subject:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        sid, name = svc.create_subject(school_id, input.name)
        return Subject(id=sid, name=name)

    @strawberry.mutation
    def rename_subject(self, info: strawberry.Info[GraphQLContext, None], input: RenameSubjectInput) -> Subject:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        sid, name = svc.rename_subject(school_id, input.id, input.name)
        return Subject(id=sid, name=name)

    @strawberry.mutation
    def delete_subject(self, info: strawberry.Info[GraphQLContext, None], input: DeleteSubjectInput) -> bool:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return svc.delete_subject(school_id, input.id)

    @strawberry.mutation
    def create_course(self, info: strawberry.Info[GraphQLContext, None], input: CreateCourseInput) -> Course:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        (
            crs_id,
            req,
            sub_id,
            sub_name,
            cls_id,
            cls_name,
            prof_id,
            prof_name,
        ) = svc.create_course(
            school_id,
            input.class_id,
            input.subject_id,
            input.professor_id,
            input.required_hours_per_week,
        )
        return Course(
            id=crs_id,
            required_hours_per_week=req,
            subject=Subject(id=sub_id, name=sub_name),
            school_class=SchoolClass(id=cls_id, name=cls_name),
            professor=Professor(id=prof_id, name=prof_name),
        )

    @strawberry.mutation
    def update_course(self, info: strawberry.Info[GraphQLContext, None], input: UpdateCourseInput) -> Course:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        (
            crs_id,
            req,
            sub_id,
            sub_name,
            cls_id,
            cls_name,
            prof_id,
            prof_name,
        ) = svc.update_course(
            school_id,
            input.id,
            input.professor_id,
            input.required_hours_per_week,
        )
        return Course(
            id=crs_id,
            required_hours_per_week=req,
            subject=Subject(id=sub_id, name=sub_name),
            school_class=SchoolClass(id=cls_id, name=cls_name),
            professor=Professor(id=prof_id, name=prof_name),
        )

    @strawberry.mutation
    def delete_course(self, info: strawberry.Info[GraphQLContext, None], input: DeleteCourseInput) -> bool:
        school_id = _require_school_id(info)
        svc = SchoolService(SchoolRepository(info.context.db_pool))
        return svc.delete_course(school_id, input.id)

    @strawberry.mutation
    def apply_generated_schedule(self, info: strawberry.Info[GraphQLContext, None]) -> ApplyScheduleResult:
        try:
            school_id = _require_school_id(info)
            svc = SchedulingService(info.context.db_pool)
            generated = svc.generate_preview(school_id)
            svc.apply_generated_schedule(school_id, generated)
            return ApplyScheduleResult(ok=True, count=len(generated))
        except Exception as e:
            return ApplyScheduleResult(ok=False, count=0, error=str(e))
