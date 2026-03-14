import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel


_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_ENV_PATH)


class Settings(BaseModel):
    app_name: str = "GraphiTime"
    debug: bool = True
    database_url: str = os.environ["DATABASE_URL"]
    cors_origins: str = os.environ["CORS_ORIGINS"]


settings = Settings()
