from __future__ import annotations

import re

from ..repositories.professor_repository import ProfessorRepository


class ProfessorService:
    def __init__(self, repo: ProfessorRepository) -> None:
        self._repo = repo

    def list_professors(self, school_id: str) -> list[tuple[str, str]]:
        return self._repo.list(school_id)

    def create_professor(self, school_id: str, name: str) -> tuple[str, str]:
        name = name.strip()
        if not name:
            raise ValueError("Professor name is required")
        return self._repo.create(school_id, name)

    def rename_professor(self, school_id: str, professor_id: str, new_name: str) -> tuple[str, str]:
        new_name = new_name.strip()
        if not new_name:
            raise ValueError("Professor name is required")
        return self._repo.rename(school_id, professor_id, new_name)

    def delete_professor(self, school_id: str, professor_id: str) -> bool:
        return self._repo.delete(school_id, professor_id)

    def create_unavailability(
        self,
        school_id: str,
        professor_id: str,
        day_of_week: int,
        start_time: str,
        end_time: str,
    ) -> tuple[str, str, str, int, str, str]:
        if day_of_week < 1 or day_of_week > 7:
            raise ValueError("day_of_week must be between 1 and 7")

        start_time = start_time.strip()
        end_time = end_time.strip()

        if not re.fullmatch(r"\d{2}:\d{2}", start_time) or not re.fullmatch(r"\d{2}:\d{2}", end_time):
            raise ValueError("Time format must be HH:MM")

        sh, sm = start_time.split(":")
        eh, em = end_time.split(":")
        start_min = int(sh) * 60 + int(sm)
        end_min = int(eh) * 60 + int(em)
        if start_min >= end_min:
            raise ValueError("start_time must be < end_time")

        return self._repo.create_unavailability(school_id, professor_id, day_of_week, start_time, end_time)

    def delete_unavailability(self, school_id: str, unavailability_id: str) -> bool:
        return self._repo.delete_unavailability(school_id, unavailability_id)
