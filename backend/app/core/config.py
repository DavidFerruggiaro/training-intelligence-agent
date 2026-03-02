from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    chroma_persist_dir: str = "./data/chroma"
    model_name: str = "claude-sonnet-4-20250514"
    # Comma-separated list of allowed CORS origins.
    # Override in production: ALLOWED_ORIGINS=https://your-app.onrender.com
    allowed_origins: str = (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:5173,"
        "http://127.0.0.1:3000"
    )

    class Config:
        env_file = ".env"


settings = Settings()
