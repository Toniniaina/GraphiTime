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


schema = strawberry.Schema(query=Query)
