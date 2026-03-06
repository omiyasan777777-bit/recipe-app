import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def get_db_path() -> Path:
    custom = os.getenv("DB_PATH")
    if custom:
        return Path(custom)
    default_dir = Path.home() / ".bluesky_scheduler"
    default_dir.mkdir(parents=True, exist_ok=True)
    return default_dir / "posts.db"


def get_credentials() -> tuple[str, str]:
    handle = os.getenv("BLUESKY_HANDLE", "")
    password = os.getenv("BLUESKY_APP_PASSWORD", "")
    return handle, password
