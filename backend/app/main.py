import csv
import io

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from strawberry.fastapi import GraphQLRouter

from .graphql.schema import schema
from .graphql.context import get_context
from .settings import settings
from .db.pool import create_pool
from .repositories.auth_repository import AuthRepository
from .repositories.school_repository import SchoolRepository
from .services.auth_service import AuthService
from .services.school_service import SchoolService


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, debug=settings.debug)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"] ,
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _startup() -> None:
        app.state.db_pool = create_pool(settings.database_url)
        with app.state.db_pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()

        if settings.debug:
            with app.state.db_pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE auth_sessions
                        SET revoked_at = now()
                        WHERE revoked_at IS NULL
                        """
                    )

    @app.on_event("shutdown")
    def _shutdown() -> None:
        pool = getattr(app.state, "db_pool", None)
        if pool is not None:
            pool.close()

    graphql_app = GraphQLRouter(schema, context_getter=get_context)
    app.include_router(graphql_app, prefix="/graphql")

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok"}

    def _require_school_id(request: Request) -> str:
        token = request.cookies.get("gt_session", "")
        me_row = AuthService(AuthRepository(request.app.state.db_pool)).me_from_session_token(token)
        if me_row is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        _acc_id, _login, school_id, _school_name = me_row
        return school_id

    @app.get("/planning/export.csv")
    def export_planning_csv(request: Request) -> StreamingResponse:
        school_id = _require_school_id(request)
        svc = SchoolService(SchoolRepository(request.app.state.db_pool))
        rows = svc.list_scheduled_sessions(school_id)

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(
            [
                "session_id",
                "day_of_week",
                "start_minute",
                "end_minute",
                "room_id",
                "room_name",
                "course_id",
                "class_id",
                "class_name",
                "subject_id",
                "subject_name",
                "professor_id",
                "professor_name",
            ]
        )

        for (
            ses_id,
            dow,
            start_min,
            end_min,
            _created_at,
            room_id,
            room_name,
            _room_cap,
            crs_id,
            _req,
            sub_id,
            sub_name,
            cls_id,
            cls_name,
            prof_id,
            prof_name,
        ) in rows:
            w.writerow(
                [
                    ses_id,
                    dow,
                    start_min,
                    end_min,
                    room_id,
                    room_name,
                    crs_id,
                    cls_id,
                    cls_name,
                    sub_id,
                    sub_name,
                    prof_id,
                    prof_name,
                ]
            )

        data = buf.getvalue().encode("utf-8")
        headers = {"Content-Disposition": 'attachment; filename="planning.csv"'}
        return StreamingResponse(io.BytesIO(data), media_type="text/csv; charset=utf-8", headers=headers)

    @app.post("/planning/import.csv")
    async def import_planning_csv(
        request: Request,
        file: UploadFile = File(...),
        mode: str = Query(default="replace", pattern="^(replace)$"),
    ) -> dict:
        _ = mode
        school_id = _require_school_id(request)
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="CSV file required")

        raw = await file.read()
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Invalid encoding (expected UTF-8)")

        repo = SchoolRepository(request.app.state.db_pool)

        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            raise HTTPException(status_code=400, detail="Missing CSV header")

        errors: list[str] = []
        out_rows: list[tuple[str, str, str, str, str, int, int, int]] = []

        def _get(row: dict[str, str], key: str) -> str:
            return (row.get(key) or "").strip()

        for idx, row in enumerate(reader, start=2):
            try:
                dow_s = _get(row, "day_of_week")
                start_s = _get(row, "start_minute")
                end_s = _get(row, "end_minute")
                if not dow_s or not start_s or not end_s:
                    raise ValueError("Missing day_of_week/start_minute/end_minute")

                dow = int(dow_s)
                start_min = int(start_s)
                end_min = int(end_s)
                if dow < 1 or dow > 7:
                    raise ValueError("day_of_week must be between 1 and 7")
                if start_min < 0 or start_min > 1439:
                    raise ValueError("start_minute must be between 0 and 1439")
                if end_min < 1 or end_min > 1440:
                    raise ValueError("end_minute must be between 1 and 1440")
                if start_min >= end_min:
                    raise ValueError("start_minute must be < end_minute")

                room_id = _get(row, "room_id")
                room_name = _get(row, "room_name")
                if room_id:
                    r = repo.get_room_by_id(school_id, room_id)
                else:
                    if not room_name:
                        raise ValueError("Missing room_id or room_name")
                    r = repo.get_room_by_name(school_id, room_name)
                if r is None:
                    raise ValueError("Room not found")
                room_id_resolved = r[0]

                course_id = _get(row, "course_id")
                if course_id:
                    c = repo.get_course_by_id(school_id, course_id)
                    if c is None:
                        raise ValueError("Course not found")
                    course_id_resolved, class_id, subject_id, professor_id = c
                else:
                    class_name = _get(row, "class_name")
                    subject_name = _get(row, "subject_name")
                    professor_name = _get(row, "professor_name")
                    if not class_name or not subject_name or not professor_name:
                        raise ValueError("Missing course_id or (class_name, subject_name, professor_name)")
                    c = repo.get_course_by_names(school_id, class_name, subject_name, professor_name)
                    if c is None:
                        raise ValueError("Course not found (by names)")
                    course_id_resolved, class_id, subject_id, professor_id = c

                out_rows.append(
                    (
                        course_id_resolved,
                        room_id_resolved,
                        professor_id,
                        class_id,
                        subject_id,
                        dow,
                        start_min,
                        end_min,
                    )
                )
            except Exception as e:
                errors.append(f"line {idx}: {e}")

        if errors:
            return {"ok": False, "count": 0, "errors": errors}

        try:
            inserted = repo.replace_scheduled_sessions(school_id, out_rows)
            return {"ok": True, "count": inserted}
        except Exception as e:
            return {"ok": False, "count": 0, "errors": [str(e)]}

    return app


app = create_app()
