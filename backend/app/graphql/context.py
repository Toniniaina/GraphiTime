from __future__ import annotations

from fastapi import Request, Response
from psycopg_pool import ConnectionPool
from strawberry.fastapi import BaseContext


class GraphQLContext(BaseContext):
    def __init__(self, request: Request, response: Response, db_pool: ConnectionPool) -> None:
        super().__init__()
        self.request = request
        self.response = response
        self.db_pool = db_pool


def get_context(request: Request, response: Response) -> GraphQLContext:
    pool: ConnectionPool = request.app.state.db_pool
    return GraphQLContext(request=request, response=response, db_pool=pool)
