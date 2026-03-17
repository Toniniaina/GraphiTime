import strawberry

from ..repositories.auth_repository import AuthRepository
from ..repositories.professor_repository import ProfessorRepository
from ..services.auth_service import AuthService
from ..services.professor_service import ProfessorService
from ..services.scheduling_service import SchedulingService
from .context import GraphQLContext
from .types import (
    ApplyScheduleResult,
    AuthPayload,
    CreateProfessorInput,
    LoginInput,
    Me,
    Professor,
    RegisterSchoolInput,
    School,
)


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
        token = info.context.request.cookies.get("gt_session", "")
        me_row = AuthService(AuthRepository(info.context.db_pool)).me_from_session_token(token)
        if me_row is None:
            raise RuntimeError("Not authenticated")
        _acc_id, _login, school_id, _school_name = me_row
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        pid, name = svc.create_professor(school_id, input.name)
        return Professor(id=pid, name=name)

    @strawberry.mutation
    def apply_generated_schedule(self, info: strawberry.Info[GraphQLContext, None]) -> ApplyScheduleResult:
        try:
            token = info.context.request.cookies.get("gt_session", "")
            me_row = AuthService(AuthRepository(info.context.db_pool)).me_from_session_token(token)
            if me_row is None:
                raise RuntimeError("Not authenticated")
            _acc_id, _login, school_id, _school_name = me_row
            svc = SchedulingService(info.context.db_pool)
            generated = svc.generate_preview(school_id)
            svc.apply_generated_schedule(school_id, generated)
            return ApplyScheduleResult(ok=True, count=len(generated))
        except Exception as e:
            return ApplyScheduleResult(ok=False, count=0, error=str(e))
