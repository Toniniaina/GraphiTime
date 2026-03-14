from __future__ import annotations

from ..repositories.professor_repository import ProfessorRepository


class ProfessorService:
    def __init__(self, repo: ProfessorRepository) -> None:
        self._repo = repo

    def list_professors(self) -> list[tuple[str, str]]:
        return self._repo.list()

    def create_professor(self, name: str) -> tuple[str, str]:
        name = name.strip()
        if not name:
            raise ValueError("Professor name is required")
        return self._repo.create(name)
