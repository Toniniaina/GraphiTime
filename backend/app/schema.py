import psycopg
import strawberry

from .settings import settings


@strawberry.type
class DbStatus:
    ok: bool
    db_time: str
    db_version: str
    error: str | None = None


@strawberry.type
class Professor:
    id: str
    name: str


@strawberry.input
class CreateProfessorInput:
    name: str


@strawberry.type
class Query:
    @strawberry.field
    def ping(self) -> str:
        return "pong"

    @strawberry.field
    def db_status(self) -> DbStatus:
        try:
            with psycopg.connect(settings.database_url, connect_timeout=3) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT now(), version()")
                    row = cur.fetchone()

            db_time = str(row[0]) if row and row[0] is not None else ""
            db_version = str(row[1]) if row and row[1] is not None else ""
            return DbStatus(ok=True, db_time=db_time, db_version=db_version)
        except Exception as e:
            return DbStatus(ok=False, db_time="", db_version="", error=str(e))

    @strawberry.field
    def professors(self) -> list[Professor]:
        with psycopg.connect(settings.database_url, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM professors ORDER BY id")
                rows = cur.fetchall() or []

        return [Professor(id=str(r[0]), name=str(r[1])) for r in rows]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_professor(self, input: CreateProfessorInput) -> Professor:
        with psycopg.connect(settings.database_url, connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO professors (name) VALUES (%s) RETURNING id, name",
                    (input.name,),
                )
                row = cur.fetchone()
            conn.commit()

        return Professor(id=str(row[0]), name=str(row[1]))


schema = strawberry.Schema(query=Query, mutation=Mutation)
