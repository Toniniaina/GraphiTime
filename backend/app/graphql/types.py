import strawberry


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


@strawberry.type
class SchoolClass:
    id: str
    name: str


@strawberry.type
class Subject:
    id: str
    name: str


@strawberry.type
class Room:
    id: str
    name: str
    capacity: int


@strawberry.type
class Course:
    id: str
    required_hours_per_week: float
    subject: Subject
    school_class: SchoolClass
    professor: Professor


@strawberry.type
class ProfessorUnavailability:
    id: str
    professor: Professor
    day_of_week: int
    start_time: str
    end_time: str


@strawberry.type
class ScheduledSession:
    id: str
    day_of_week: int
    start_minute: int
    end_minute: int
    created_at: str
    course: Course
    room: Room


@strawberry.input
class CreateProfessorInput:
    name: str
