from __future__ import annotations

from ..repositories.school_repository import SchoolRepository


class SchoolService:
    def __init__(self, repo: SchoolRepository) -> None:
        self._repo = repo

    def list_classes(self, school_id: str):
        return self._repo.list_classes(school_id)

    def list_rooms(self, school_id: str):
        return self._repo.list_rooms(school_id)

    def list_subjects(self, school_id: str):
        return self._repo.list_subjects(school_id)

    def list_courses(self, school_id: str):
        return self._repo.list_courses(school_id)

    def list_professor_unavailability(self, school_id: str):
        return self._repo.list_professor_unavailability(school_id)

    def list_scheduled_sessions(self, school_id: str):
        return self._repo.list_scheduled_sessions(school_id)
