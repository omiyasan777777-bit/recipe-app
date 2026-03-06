import mimetypes
from pathlib import Path
from typing import Optional

from atproto import Client
from atproto_client.models.app.bsky.embed.images import Image, Main as ImagesEmbed
from atproto_client.models.app.bsky.feed.post import Record

from .storage import Post


class BlueskyClient:
    def __init__(self, handle: str, app_password: str):
        if not handle or not app_password:
            raise ValueError(
                "BLUESKY_HANDLE and BLUESKY_APP_PASSWORD must be set in .env"
            )
        self._handle = handle
        self._password = app_password
        self._client: Optional[Client] = None

    def _ensure_logged_in(self):
        if self._client is None:
            self._client = Client()
            self._client.login(self._handle, self._password)

    def post(self, post: Post) -> str:
        self._ensure_logged_in()

        image_embed = None
        if post.image_paths:
            paths = [p.strip() for p in post.image_paths.split(",") if p.strip()]
            if paths:
                image_embed = self._build_image_embed(paths)

        if image_embed:
            response = self._client.send_post(text=post.text, embed=image_embed)
        else:
            response = self._client.send_post(text=post.text)

        return response.uri

    def _build_image_embed(self, paths: list[str]) -> ImagesEmbed:
        images = []
        for path_str in paths[:4]:  # Bluesky allows up to 4 images
            path = Path(path_str)
            if not path.exists():
                raise FileNotFoundError(f"Image file not found: {path_str}")
            mime_type, _ = mimetypes.guess_type(str(path))
            if mime_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
                raise ValueError(f"Unsupported image type: {mime_type} ({path_str})")
            with open(path, "rb") as f:
                data = f.read()
            upload = self._client.upload_blob(data)
            images.append(
                Image(
                    image=upload.blob,
                    alt=path.stem,
                )
            )
        return ImagesEmbed(images=images)

    def verify_credentials(self) -> str:
        self._ensure_logged_in()
        profile = self._client.get_profile(self._handle)
        return profile.display_name or self._handle
