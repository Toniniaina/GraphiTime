from __future__ import annotations

from fastapi import Request
from psycopg_pool import ConnectionPool


GraphQLContext = dict[str, object]


def get_context(request: Request) -> GraphQLContext:
    pool: ConnectionPool = request.app.state.db_pool
    return {"request": request, "db_pool": pool}
