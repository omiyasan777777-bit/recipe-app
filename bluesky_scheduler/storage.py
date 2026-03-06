import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional


class Post:
    def __init__(
        self,
        id: int,
        text: str,
        scheduled_at: datetime,
        status: str,
        created_at: datetime,
        posted_at: Optional[datetime] = None,
        error: Optional[str] = None,
        image_paths: Optional[str] = None,
    ):
        self.id = id
        self.text = text
        self.scheduled_at = scheduled_at
        self.status = status  # pending | posted | failed
        self.created_at = created_at
        self.posted_at = posted_at
        self.error = error
        self.image_paths = image_paths  # comma-separated file paths


class Storage:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scheduled_posts (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    text        TEXT NOT NULL,
                    scheduled_at TEXT NOT NULL,
                    status      TEXT NOT NULL DEFAULT 'pending',
                    created_at  TEXT NOT NULL,
                    posted_at   TEXT,
                    error       TEXT,
                    image_paths TEXT
                )
            """)
            conn.commit()

    @staticmethod
    def _dt_to_str(dt: datetime) -> str:
        return dt.isoformat()

    @staticmethod
    def _str_to_dt(s: str) -> datetime:
        return datetime.fromisoformat(s)

    def add_post(
        self,
        text: str,
        scheduled_at: datetime,
        image_paths: Optional[list[str]] = None,
    ) -> Post:
        now = datetime.now().astimezone()
        images_str = ",".join(image_paths) if image_paths else None
        with self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO scheduled_posts (text, scheduled_at, status, created_at, image_paths)
                VALUES (?, ?, 'pending', ?, ?)
                """,
                (
                    text,
                    self._dt_to_str(scheduled_at),
                    self._dt_to_str(now),
                    images_str,
                ),
            )
            conn.commit()
            return self.get_post(cur.lastrowid)

    def get_post(self, post_id: int) -> Optional[Post]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM scheduled_posts WHERE id = ?", (post_id,)
            ).fetchone()
        return self._row_to_post(row) if row else None

    def list_posts(self, status: Optional[str] = None) -> list[Post]:
        with self._connect() as conn:
            if status:
                rows = conn.execute(
                    "SELECT * FROM scheduled_posts WHERE status = ? ORDER BY scheduled_at",
                    (status,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM scheduled_posts ORDER BY scheduled_at"
                ).fetchall()
        return [self._row_to_post(r) for r in rows]

    def get_pending_due(self) -> list[Post]:
        now = self._dt_to_str(datetime.now().astimezone())
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT * FROM scheduled_posts
                WHERE status = 'pending' AND scheduled_at <= ?
                ORDER BY scheduled_at
                """,
                (now,),
            ).fetchall()
        return [self._row_to_post(r) for r in rows]

    def mark_posted(self, post_id: int):
        now = self._dt_to_str(datetime.now().astimezone())
        with self._connect() as conn:
            conn.execute(
                "UPDATE scheduled_posts SET status='posted', posted_at=? WHERE id=?",
                (now, post_id),
            )
            conn.commit()

    def mark_failed(self, post_id: int, error: str):
        with self._connect() as conn:
            conn.execute(
                "UPDATE scheduled_posts SET status='failed', error=? WHERE id=?",
                (error, post_id),
            )
            conn.commit()

    def delete_post(self, post_id: int) -> bool:
        with self._connect() as conn:
            cur = conn.execute(
                "DELETE FROM scheduled_posts WHERE id=?", (post_id,)
            )
            conn.commit()
        return cur.rowcount > 0

    def _row_to_post(self, row: sqlite3.Row) -> Post:
        return Post(
            id=row["id"],
            text=row["text"],
            scheduled_at=self._str_to_dt(row["scheduled_at"]),
            status=row["status"],
            created_at=self._str_to_dt(row["created_at"]),
            posted_at=self._str_to_dt(row["posted_at"]) if row["posted_at"] else None,
            error=row["error"],
            image_paths=row["image_paths"],
        )
