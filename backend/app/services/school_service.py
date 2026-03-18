from __future__ import annotations

from ..repositories.school_repository import SchoolRepository


class SchoolService:
    def __init__(self, repo: SchoolRepository) -> None:
        self._repo = repo

    def list_classes(self, school_id: str, query: str | None = None):
        return self._repo.list_classes(school_id, query)

    def create_class(self, school_id: str, name: str):
        name = name.strip()
        if not name:
            raise ValueError("Class name is required")
        return self._repo.create_class(school_id, name)

    def rename_class(self, school_id: str, class_id: str, new_name: str):
        new_name = new_name.strip()
        if not new_name:
            raise ValueError("Class name is required")
        return self._repo.rename_class(school_id, class_id, new_name)

    def delete_class(self, school_id: str, class_id: str) -> bool:
        return self._repo.delete_class(school_id, class_id)

    def set_class_home_room(self, school_id: str, class_id: str, room_id: str | None):
        return self._repo.set_class_home_room(school_id, class_id, room_id)

    def list_rooms(self, school_id: str):
        return self._repo.list_rooms(school_id)

    def list_subjects(self, school_id: str):
        return self._repo.list_subjects(school_id)

    def create_subject(self, school_id: str, name: str) -> tuple[str, str]:
        name = name.strip()
        if not name:
            raise ValueError("Subject name is required")
        return self._repo.create_subject(school_id, name)

    def rename_subject(self, school_id: str, subject_id: str, new_name: str) -> tuple[str, str]:
        new_name = new_name.strip()
        if not new_name:
            raise ValueError("Subject name is required")
        return self._repo.rename_subject(school_id, subject_id, new_name)

    def delete_subject(self, school_id: str, subject_id: str) -> bool:
        return self._repo.delete_subject(school_id, subject_id)

    def list_courses(self, school_id: str):
        return self._repo.list_courses(school_id)

    def list_professor_unavailability(self, school_id: str):
        return self._repo.list_professor_unavailability(school_id)

    def list_scheduled_sessions(self, school_id: str):
        return self._repo.list_scheduled_sessions(school_id)
