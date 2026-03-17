from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from passlib.context import CryptContext

from ..repositories.auth_repository import AuthRepository


_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, repo: AuthRepository) -> None:
        self._repo = repo

    def _validate_password_length(self, password: str) -> None:
        # bcrypt ne prend en compte que les 72 premiers bytes.
        # On refuse au-delà pour éviter un comportement de tronquage implicite.
        password_bytes_len = len(password.encode("utf-8"))
        if password_bytes_len > 72:
            raise ValueError(f"Password cannot be longer than 72 bytes (got {password_bytes_len} bytes)")

    def hash_password(self, password: str) -> str:
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        self._validate_password_length(password)
        return _pwd.hash(password)

    def verify_password(self, password: str, password_hash: str) -> bool:
        self._validate_password_length(password)
        try:
            return bool(_pwd.verify(password, password_hash))
        except Exception:
            return False

    def new_session_token(self) -> str:
        return secrets.token_urlsafe(32)

    def hash_session_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def default_session_expiry(self) -> datetime:
        return datetime.now(timezone.utc) + timedelta(days=30)

    def register_school(self, school_name: str, login: str, password: str) -> tuple[str, str, str, str]:
        school_name = school_name.strip()
        login = login.strip().lower()
        if not school_name:
            raise ValueError("School name is required")
        if not login:
            raise ValueError("Login is required")
        self._validate_password_length(password)
        school_id, _school_name = self._repo.create_school(school_name)
        pw_hash = self.hash_password(password)
        account_id, _sid, _login = self._repo.create_account(school_id, login, pw_hash)
        return (school_id, school_name, account_id, login)

    def login(self, login: str, password: str) -> tuple[str, str]:
        login = login.strip().lower()
        if not login:
            raise ValueError("Login is required")
        self._validate_password_length(password)
        row = self._repo.get_account_by_login(login)
        if row is None:
            raise ValueError("Invalid credentials")
        account_id, _school_id, _login, password_hash, is_active = row
        if not is_active:
            raise ValueError("Account is disabled")
        if not self.verify_password(password, password_hash):
            raise ValueError("Invalid credentials")
        self._repo.touch_last_login(account_id)
        return (account_id, _school_id)

    def create_session(self, account_id: str, ip: str | None, user_agent: str | None) -> tuple[str, datetime]:
        token = self.new_session_token()
        token_hash = self.hash_session_token(token)
        expires_at = self.default_session_expiry()
        self._repo.create_session(account_id, token_hash, expires_at, ip, user_agent)
        return (token, expires_at)

    def me_from_session_token(self, token: str) -> tuple[str, str, str, str] | None:
        token = token.strip()
        if not token:
            return None
        token_hash = self.hash_session_token(token)
        ses = self._repo.get_active_session_by_hash(token_hash)
        if ses is None:
            return None
        _session_id, account_id, _expires_at = ses
        acc = self._repo.get_account_by_id(account_id)
        if acc is None:
            return None
        acc_id, school_id, login, is_active = acc
        if not is_active:
            return None
        sch = self._repo.get_school_by_id(school_id)
        if sch is None:
            return None
        sch_id, sch_name = sch
        return (acc_id, login, sch_id, sch_name)

    def logout(self, token: str) -> None:
        token = token.strip()
        if not token:
            return
        token_hash = self.hash_session_token(token)
        self._repo.revoke_session_by_hash(token_hash)
