import sys
from datetime import datetime, timezone
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich import box

from .config import get_credentials, get_db_path
from .storage import Storage

console = Console()


def _get_storage() -> Storage:
    return Storage(get_db_path())


def _parse_datetime(dt_str: str) -> datetime:
    """Parse datetime string in ISO 8601 or 'YYYY-MM-DD HH:MM' format (local time)."""
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(dt_str, fmt)
            if dt.tzinfo is None:
                dt = dt.astimezone()  # assume local timezone
            return dt
        except ValueError:
            continue
    raise click.BadParameter(
        f"Cannot parse '{dt_str}'. "
        "Use format: 'YYYY-MM-DD HH:MM' or ISO 8601 (e.g. '2026-03-10T15:00:00+09:00')"
    )


def _status_color(status: str) -> str:
    colors = {"pending": "yellow", "posted": "green", "failed": "red"}
    return f"[{colors.get(status, 'white')}]{status}[/]"


@click.group()
def cli():
    """Bluesky scheduled post tool.\n
    Set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD in .env before use.
    """


@cli.command("add")
@click.argument("text")
@click.option(
    "--at",
    "scheduled_at",
    required=True,
    metavar="DATETIME",
    help="Scheduled time. e.g. '2026-03-10 15:00' or '2026-03-10T15:00:00+09:00'",
)
@click.option(
    "--image",
    "images",
    multiple=True,
    metavar="PATH",
    help="Image file path (up to 4). Can be specified multiple times.",
)
def add_post(text: str, scheduled_at: str, images: tuple):
    """Schedule a new post.

    TEXT is the content of the post (up to 300 characters).
    """
    if len(text) > 300:
        console.print("[red]Error:[/red] Post text exceeds 300 characters.")
        sys.exit(1)

    dt = _parse_datetime(scheduled_at)
    if dt <= datetime.now().astimezone():
        console.print("[red]Error:[/red] Scheduled time must be in the future.")
        sys.exit(1)

    storage = _get_storage()
    image_list = list(images) if images else None
    post = storage.add_post(text, dt, image_list)

    console.print(
        f"[green]✓ Scheduled[/green] (id={post.id})\n"
        f"  Text      : {post.text}\n"
        f"  Scheduled : {post.scheduled_at.strftime('%Y-%m-%d %H:%M %Z')}"
    )
    if image_list:
        console.print(f"  Images    : {', '.join(image_list)}")


@cli.command("list")
@click.option(
    "--status",
    type=click.Choice(["pending", "posted", "failed"]),
    default=None,
    help="Filter by status.",
)
def list_posts(status: Optional[str]):
    """List scheduled posts."""
    storage = _get_storage()
    posts = storage.list_posts(status)

    if not posts:
        console.print("No posts found.")
        return

    table = Table(box=box.ROUNDED, show_lines=True)
    table.add_column("ID", style="bold", justify="right", width=5)
    table.add_column("Status", width=9)
    table.add_column("Scheduled At", width=20)
    table.add_column("Text", max_width=50, no_wrap=False)
    table.add_column("Info", max_width=30)

    for post in posts:
        info = ""
        if post.posted_at:
            info = f"Posted: {post.posted_at.strftime('%Y-%m-%d %H:%M %Z')}"
        elif post.error:
            info = f"[red]{post.error[:40]}[/red]"

        table.add_row(
            str(post.id),
            _status_color(post.status),
            post.scheduled_at.strftime("%Y-%m-%d %H:%M %Z"),
            post.text,
            info,
        )

    console.print(table)
    console.print(f"Total: {len(posts)}")


@cli.command("delete")
@click.argument("post_id", type=int)
def delete_post(post_id: int):
    """Delete a scheduled post by ID."""
    storage = _get_storage()
    post = storage.get_post(post_id)
    if not post:
        console.print(f"[red]Error:[/red] Post id={post_id} not found.")
        sys.exit(1)
    if post.status == "posted":
        console.print("[red]Error:[/red] Cannot delete an already-posted post.")
        sys.exit(1)

    if storage.delete_post(post_id):
        console.print(f"[green]✓[/green] Deleted post id={post_id}.")
    else:
        console.print(f"[red]Error:[/red] Could not delete post id={post_id}.")
        sys.exit(1)


@cli.command("run")
@click.option(
    "--interval",
    default=60,
    show_default=True,
    metavar="SECONDS",
    help="Polling interval in seconds.",
)
def run_daemon(interval: int):
    """Start the scheduler daemon (polls for due posts and sends them)."""
    from .scheduler import run_daemon as _run

    _run(interval_seconds=interval)


@cli.command("send-due")
def send_due():
    """Immediately post all currently due posts (single-shot, no daemon)."""
    from .scheduler import post_once

    post_once()


@cli.command("verify")
def verify():
    """Verify Bluesky credentials."""
    from .client import BlueskyClient

    handle, password = get_credentials()
    try:
        client = BlueskyClient(handle, password)
        name = client.verify_credentials()
        console.print(f"[green]✓[/green] Logged in as: {name} (@{handle})")
    except Exception as exc:
        console.print(f"[red]✗ Authentication failed:[/red] {exc}")
        sys.exit(1)
