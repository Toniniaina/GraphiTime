from __future__ import annotations

from fastapi import Request
from psycopg_pool import ConnectionPool
from strawberry.fastapi import BaseContext


class GraphQLContext(BaseContext):
    def __init__(self, request: Request, db_pool: ConnectionPool) -> None:
        super().__init__()
        self.request = request
        self.db_pool = db_pool


def get_context(request: Request) -> GraphQLContext:
    pool: ConnectionPool = request.app.state.db_pool
    return GraphQLContext(request=request, db_pool=pool)
