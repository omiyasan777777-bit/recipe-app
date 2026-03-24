import logging
import signal
import time
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from rich.console import Console

from .client import BlueskyClient
from .config import get_credentials, get_db_path
from .storage import Storage

console = Console()
logger = logging.getLogger(__name__)


def _process_due_posts(storage: Storage, client: BlueskyClient):
    due = storage.get_pending_due()
    if not due:
        return

    for post in due:
        logger.info("Posting scheduled post id=%d", post.id)
        try:
            uri = client.post(post)
            storage.mark_posted(post.id)
            console.print(
                f"[green]✓[/green] Posted (id={post.id}): {post.text[:60]}...\n"
                f"  URI: {uri}"
            )
        except Exception as exc:
            error_msg = str(exc)
            storage.mark_failed(post.id, error_msg)
            console.print(
                f"[red]✗[/red] Failed (id={post.id}): {error_msg}"
            )
            logger.exception("Failed to post id=%d", post.id)


def run_daemon(interval_seconds: int = 60):
    handle, password = get_credentials()
    db_path = get_db_path()

    storage = Storage(db_path)
    client = BlueskyClient(handle, password)

    console.print(
        f"[bold cyan]Bluesky Scheduler[/bold cyan] started\n"
        f"  DB   : {db_path}\n"
        f"  Check: every {interval_seconds}s\n"
        f"  Press Ctrl+C to stop"
    )

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _process_due_posts,
        "interval",
        seconds=interval_seconds,
        args=[storage, client],
        id="check_posts",
        next_run_time=datetime.now(),
    )
    scheduler.start()

    stop_event = [False]

    def _shutdown(sig, frame):
        stop_event[0] = True

    signal.signal(signal.SIGINT, _shutdown)
    try:
        signal.signal(signal.SIGTERM, _shutdown)
    except (AttributeError, OSError):
        pass  # SIGTERM is not available on Windows

    try:
        while not stop_event[0]:
            time.sleep(1)
    finally:
        scheduler.shutdown(wait=False)
        console.print("[yellow]Scheduler stopped.[/yellow]")


def post_once():
    """Process all due posts immediately (single-shot, no daemon loop)."""
    handle, password = get_credentials()
    db_path = get_db_path()
    storage = Storage(db_path)
    client = BlueskyClient(handle, password)
    _process_due_posts(storage, client)
