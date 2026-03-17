from __future__ import annotations

from ..repositories.school_repository import SchoolRepository


class SchoolService:
    def __init__(self, repo: SchoolRepository) -> None:
        self._repo = repo

    def list_classes(self):
        return self._repo.list_classes()

    def list_rooms(self):
        return self._repo.list_rooms()

    def list_subjects(self):
        return self._repo.list_subjects()

    def list_courses(self):
        return self._repo.list_courses()

    def list_professor_unavailability(self):
        return self._repo.list_professor_unavailability()

    def list_scheduled_sessions(self):
        return self._repo.list_scheduled_sessions()
