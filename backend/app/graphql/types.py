import strawberry


@strawberry.type
class DbStatus:
    ok: bool
    db_time: str
    db_version: str
    database_name: str = ""
    database_user: str = ""
    error: str | None = None


@strawberry.type
class Professor:
    id: str
    name: str


@strawberry.type
class School:
    id: str
    name: str


@strawberry.type
class Me:
    account_id: str
    login: str
    school: School


@strawberry.type
class AuthPayload:
    ok: bool
    me: Me | None = None
    error: str | None = None


@strawberry.type
class SchoolClass:
    id: str
    name: str
    home_room_id: str | None = None


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


@strawberry.type
class TeacherUnavailabilityBlock:
    day_of_week: int
    start_minute: int
    end_minute: int


@strawberry.type
class TeacherSchedule:
    sessions: list[ScheduledSession]
    unavailability: list[TeacherUnavailabilityBlock]


@strawberry.type
class ApplyScheduleResult:
    ok: bool
    count: int
    error: str | None = None


@strawberry.input
class CreateProfessorInput:
    name: str


@strawberry.input
class RenameProfessorInput:
    id: str
    name: str


@strawberry.input
class DeleteProfessorInput:
    id: str


@strawberry.input
class CreateProfessorUnavailabilityInput:
    professor_id: str
    day_of_week: int
    start_time: str
    end_time: str


@strawberry.input
class DeleteProfessorUnavailabilityInput:
    id: str


@strawberry.input
class CreateClassInput:
    name: str


@strawberry.input
class RenameClassInput:
    id: str
    name: str


@strawberry.input
class DeleteClassInput:
    id: str


@strawberry.input
class SetClassHomeRoomInput:
    class_id: str
    room_id: str | None = None


@strawberry.input
class CreateSubjectInput:
    name: str


@strawberry.input
class RenameSubjectInput:
    id: str
    name: str


@strawberry.input
class DeleteSubjectInput:
    id: str


@strawberry.input
class CreateRoomInput:
    name: str
    capacity: int


@strawberry.input
class UpdateRoomInput:
    id: str
    name: str
    capacity: int


@strawberry.input
class DeleteRoomInput:
    id: str


@strawberry.input
class CreateCourseInput:
    class_id: str
    subject_id: str
    professor_id: str
    required_hours_per_week: float


@strawberry.input
class UpdateCourseInput:
    id: str
    professor_id: str
    required_hours_per_week: float


@strawberry.input
class DeleteCourseInput:
    id: str


@strawberry.input
class RegisterSchoolInput:
    school_name: str
    login: str
    password: str


@strawberry.input
class LoginInput:
    login: str
    password: str
