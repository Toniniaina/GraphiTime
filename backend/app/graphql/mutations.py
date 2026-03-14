import strawberry
from psycopg_pool import ConnectionPool

from ..repositories.professor_repository import ProfessorRepository
from ..services.professor_service import ProfessorService
from .types import CreateProfessorInput, Professor


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_professor(self, info: strawberry.Info, input: CreateProfessorInput) -> Professor:
        pool: ConnectionPool = info.context["db_pool"]  # type: ignore[assignment]
        svc = ProfessorService(ProfessorRepository(pool))
        pid, name = svc.create_professor(input.name)
        return Professor(id=pid, name=name)
