import strawberry

from ..repositories.professor_repository import ProfessorRepository
from ..services.professor_service import ProfessorService
from .context import GraphQLContext
from .types import CreateProfessorInput, Professor


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_professor(
        self, info: strawberry.Info[GraphQLContext, None], input: CreateProfessorInput
    ) -> Professor:
        svc = ProfessorService(ProfessorRepository(info.context.db_pool))
        pid, name = svc.create_professor(input.name)
        return Professor(id=pid, name=name)
