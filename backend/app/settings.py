from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "GraphiTime"
    debug: bool = True


settings = Settings()
