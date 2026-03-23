import csv
import io

from fastapi import FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
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
    def export_planning_csv(request: Request) -> Response:
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
        return Response(content=data, media_type="text/csv; charset=utf-8", headers=headers)

    @app.get("/planning/export.pdf")
    def export_planning_pdf(request: Request) -> Response:
        school_id = _require_school_id(request)
        svc = SchoolService(SchoolRepository(request.app.state.db_pool))

        classes = svc.list_classes(school_id)
        sessions = svc.list_scheduled_sessions(school_id)

        def _to_hhmm(minute: int) -> str:
            m = max(0, int(minute))
            hh = m // 60
            mm = m % 60
            return f"{hh:02d}:{mm:02d}"

        def _hex_color(value: str) -> colors.Color:
            s = (value or "").strip().lstrip("#")
            if len(s) != 6:
                return colors.HexColor("#1a3a5c")
            try:
                return colors.HexColor(f"#{s}")
            except Exception:
                return colors.HexColor("#1a3a5c")

        subject_colors: dict[str, colors.Color] = {
            "Mathématiques": _hex_color("#1a3a5c"),
            "Physique-Chimie": _hex_color("#c8922a"),
            "Français": _hex_color("#2d6a4f"),
            "Histoire-Géo": _hex_color("#7b3f6e"),
            "Anglais": _hex_color("#c0392b"),
            "SVT": _hex_color("#1a6b8a"),
            "EPS": _hex_color("#e67e22"),
            "Philosophie": _hex_color("#5d4e75"),
            "Informatique": _hex_color("#2c7873"),
        }

        days = [
            (1, "Lundi"),
            (2, "Mardi"),
            (3, "Mercredi"),
            (4, "Jeudi"),
            (5, "Vendredi"),
            (6, "Samedi"),
        ]

        start_minute = 6 * 60
        end_minute = 18 * 60
        hour_step = 60

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=landscape(A4))
        page_w, page_h = landscape(A4)
        margin = 28
        header_h = 34

        time_col_w = 56
        day_col_w = (page_w - margin * 2 - time_col_w) / len(days)
        hours = list(range(start_minute, end_minute + 1, hour_step))
        grid_h = 28 * (len(hours) - 1)
        grid_top = page_h - margin - header_h
        grid_bottom = grid_top - grid_h

        def _y_for_minute(m: int) -> float:
            mm = max(start_minute, min(end_minute, int(m)))
            frac = (mm - start_minute) / 60
            return grid_top - frac * 28

        sessions_by_class: dict[str, list[tuple]] = {}
        for row in sessions:
            (
                _ses_id,
                _dow,
                _start,
                _end,
                _created_at,
                _room_id,
                _room_name,
                _room_cap,
                _crs_id,
                _req,
                _sub_id,
                _sub_name,
                cls_id,
                _cls_name,
                _prof_id,
                _prof_name,
            ) = row
            sessions_by_class.setdefault(cls_id, []).append(row)

        for cls_id, cls_name, _home_room_id in classes:
            c.setFillColor(colors.HexColor("#0d1f35"))
            c.setFont("Helvetica-Bold", 14)
            c.drawString(margin, page_h - margin - 14, f"Planning — {cls_name}")

            c.setStrokeColor(colors.Color(0.05, 0.12, 0.2, alpha=0.16))
            c.setLineWidth(1)
            c.roundRect(margin, grid_bottom - 8, page_w - margin * 2, grid_h + header_h + 16, 10, stroke=1, fill=0)

            c.setFillColor(colors.white)
            c.rect(margin, grid_top, page_w - margin * 2, header_h, stroke=0, fill=1)

            c.setStrokeColor(colors.Color(0.05, 0.12, 0.2, alpha=0.10))
            c.line(margin + time_col_w, grid_bottom, margin + time_col_w, grid_top + header_h)
            for i in range(len(days) + 1):
                x = margin + time_col_w + i * day_col_w
                c.line(x, grid_bottom, x, grid_top + header_h)

            c.setFont("Helvetica-Bold", 9)
            c.setFillColor(colors.HexColor("#0d1f35"))
            for i, (_d, label) in enumerate(days):
                x0 = margin + time_col_w + i * day_col_w
                c.drawCentredString(x0 + day_col_w / 2, grid_top + header_h / 2 + 2, label)

            c.setFont("Helvetica", 8)
            c.setFillColor(colors.Color(0.05, 0.12, 0.2, alpha=0.55))
            c.setStrokeColor(colors.Color(0.05, 0.12, 0.2, alpha=0.12))
            for idx, h in enumerate(hours[:-1]):
                y = grid_top - idx * 28
                c.setDash(2, 2)
                c.line(margin, y, page_w - margin, y)
                c.setDash()
                c.drawRightString(margin + time_col_w - 8, y - 10, _to_hhmm(h))

            rows = sessions_by_class.get(cls_id, [])
            for r in rows:
                (
                    ses_id,
                    dow,
                    start_m,
                    end_m,
                    _created_at,
                    _room_id,
                    room_name,
                    _room_cap,
                    _crs_id,
                    _req,
                    _sub_id,
                    subject_name,
                    _cls_id,
                    _cls_name2,
                    _prof_id,
                    professor_name,
                ) = r

                if dow < 1 or dow > len(days):
                    continue
                if end_m <= start_minute or start_m >= end_minute:
                    continue

                x0 = margin + time_col_w + (dow - 1) * day_col_w + 6
                x1 = x0 + day_col_w - 12
                y_top = _y_for_minute(start_m) - 3
                y_bottom = _y_for_minute(end_m) + 3
                h = max(14, y_top - y_bottom)

                fill = subject_colors.get(subject_name, colors.HexColor("#1a3a5c"))
                c.setFillColor(fill)
                c.setStrokeColor(colors.Color(1, 1, 1, alpha=0.16))
                c.roundRect(x0, y_bottom, x1 - x0, h, 7, stroke=1, fill=1)

                c.setFillColor(colors.white)
                c.setFont("Helvetica-Bold", 8.5)
                c.drawString(x0 + 6, y_top - 12, subject_name[:40])
                c.setFont("Helvetica", 7.5)
                c.drawString(x0 + 6, y_top - 24, professor_name[:44])
                c.drawString(x0 + 6, y_top - 34, room_name[:44])
                c.drawString(x0 + 6, y_bottom + 6, f"{_to_hhmm(start_m)}–{_to_hhmm(end_m)}")

            c.showPage()

        c.save()
        data = buf.getvalue()
        if len(data) < 100:
            raise HTTPException(status_code=500, detail="PDF generation failed")
        headers = {"Content-Disposition": 'attachment; filename="planning.pdf"'}
        return Response(content=data, media_type="application/pdf", headers=headers)

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
