import strawberry

from ..repositories.professor_repository import ProfessorRepository
from ..services.professor_service import ProfessorService
from ..services.scheduling_service import SchedulingService
from .context import GraphQLContext
from .types import ApplyScheduleResult, CreateProfessorInput, Professor


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_professor(
        self, info: strawberry.Info[GraphQLContext, None], input: CreateProfessorInput
    ) -> Professor:
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        pid, name = svc.create_professor(input.name)
        return Professor(id=pid, name=name)

    @strawberry.mutation
    def apply_generated_schedule(self, info: strawberry.Info[GraphQLContext, None]) -> ApplyScheduleResult:
        try:
            svc = SchedulingService(info.context.db_pool)
            generated = svc.generate_preview()
            svc.apply_generated_schedule(generated)
            return ApplyScheduleResult(ok=True, count=len(generated))
        except Exception as e:
            return ApplyScheduleResult(ok=False, count=0, error=str(e))
