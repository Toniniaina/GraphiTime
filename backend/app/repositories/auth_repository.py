from __future__ import annotations

from datetime import datetime

from psycopg_pool import ConnectionPool


class AuthRepository:
    def __init__(self, pool: ConnectionPool) -> None:
        self._pool = pool

    def create_school(self, name: str) -> tuple[str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO schools (name) VALUES (%s) RETURNING id, name",
                    (name,),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert school")
        return (str(row[0]), str(row[1]))

    def create_account(self, school_id: str, login: str, password_hash: str) -> tuple[str, str, str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO school_accounts (school_id, login, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id, school_id, login
                    """,
                    (school_id, login, password_hash),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert account")
        return (str(row[0]), str(row[1]), str(row[2]))

    def get_account_by_login(self, login: str) -> tuple[str, str, str, str, bool] | None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, school_id, login, password_hash, is_active
                    FROM school_accounts
                    WHERE login = %s
                    """,
                    (login,),
                )
                row = cur.fetchone()

        if row is None:
            return None
        return (str(row[0]), str(row[1]), str(row[2]), str(row[3]), bool(row[4]))

    def get_account_by_id(self, account_id: str) -> tuple[str, str, str, bool] | None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, school_id, login, is_active
                    FROM school_accounts
                    WHERE id = %s
                    """,
                    (account_id,),
                )
                row = cur.fetchone()

        if row is None:
            return None
        return (str(row[0]), str(row[1]), str(row[2]), bool(row[3]))

    def get_school_by_id(self, school_id: str) -> tuple[str, str] | None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name FROM schools WHERE id=%s", (school_id,))
                row = cur.fetchone()

        if row is None:
            return None
        return (str(row[0]), str(row[1]))

    def touch_last_login(self, account_id: str) -> None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE school_accounts SET last_login_at = now() WHERE id=%s",
                    (account_id,),
                )
            conn.commit()

    def create_session(
        self,
        account_id: str,
        token_hash: str,
        expires_at: datetime,
        ip: str | None,
        user_agent: str | None,
    ) -> str:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO auth_sessions (account_id, token_hash, expires_at, ip, user_agent)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (account_id, token_hash, expires_at, ip, user_agent),
                )
                row = cur.fetchone()
            conn.commit()

        if row is None:
            raise RuntimeError("Failed to insert session")
        return str(row[0])

    def get_active_session_by_hash(self, token_hash: str) -> tuple[str, str, datetime] | None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, account_id, expires_at
                    FROM auth_sessions
                    WHERE token_hash=%s
                      AND revoked_at IS NULL
                      AND expires_at > now()
                    """,
                    (token_hash,),
                )
                row = cur.fetchone()

        if row is None:
            return None
        return (str(row[0]), str(row[1]), row[2])

    def revoke_session_by_hash(self, token_hash: str) -> None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE auth_sessions SET revoked_at = now() WHERE token_hash=%s AND revoked_at IS NULL",
                    (token_hash,),
                )
            conn.commit()
