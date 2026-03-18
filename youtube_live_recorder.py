"""YouTubeライブ配信録画 Flask Blueprint"""

import json
import os
import queue
import re
import subprocess
import threading
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from flask import (
    Blueprint,
    Response,
    jsonify,
    render_template,
    request,
    send_file,
    stream_with_context,
)

youtube_recorder = Blueprint("youtube_recorder", __name__)

# 録画ジョブ管理
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()

RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(exist_ok=True)


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[\\/*?:"<>|]', "_", name)
    name = name.strip()
    return name[:80] if len(name) > 80 else name


def _parse_time_today(hhmm: str) -> datetime:
    """HH:MM を今日(または翌日)の datetime に変換"""
    h, m = map(int, hhmm.split(":"))
    now = datetime.now()
    dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if dt <= now:
        dt += timedelta(days=1)
    return dt


def _run_recording(job_id: str, url: str, fmt: str, duration: int | None,
                   scheduled_start: str | None = None):
    """バックグラウンドで録画を実行する"""
    log_q: queue.Queue = _jobs[job_id]["log_q"]

    def log(msg: str, level: str = "info"):
        _jobs[job_id]["logs"].append({"level": level, "msg": msg})
        log_q.put({"level": level, "msg": msg})

    try:
        # 予約開始時刻まで待機
        if scheduled_start:
            start_dt = _parse_time_today(scheduled_start)
            with _jobs_lock:
                _jobs[job_id]["status"] = "waiting"
                _jobs[job_id]["scheduled_start"] = start_dt.strftime("%H:%M")
            log(f"予約録画: {start_dt.strftime('%H:%M')} に録画を開始します", "info")
            while True:
                remaining = (start_dt - datetime.now()).total_seconds()
                if remaining <= 0:
                    break
                # 10秒ごとにカウントダウンログ
                interval = min(10, remaining)
                time.sleep(interval)
                remaining2 = (start_dt - datetime.now()).total_seconds()
                if remaining2 <= 0:
                    break
                mins = int(remaining2 // 60)
                secs = int(remaining2 % 60)
                log(f"開始まで {mins}分{secs}秒...", "info")
                # キャンセルチェック
                if _jobs[job_id].get("status") == "stopped":
                    return
            log("予約時刻になりました。録画を開始します", "info")
        # 情報取得
        log("ストリーム情報を取得中...")
        info_result = subprocess.run(
            ["yt-dlp", "--dump-json", "--no-playlist", "--no-warnings", url],
            capture_output=True, text=True, timeout=30,
        )
        if info_result.returncode != 0:
            raise RuntimeError(info_result.stderr.strip() or "情報取得に失敗しました")

        info = json.loads(info_result.stdout)
        title = info.get("title", "live_stream")
        channel = info.get("channel", info.get("uploader", ""))
        live_status = info.get("live_status", "unknown")

        log(f"タイトル: {title}")
        log(f"チャンネル: {channel}")
        log(f"ライブ状態: {live_status}")

        with _jobs_lock:
            _jobs[job_id]["title"] = title
            _jobs[job_id]["channel"] = channel

        # ファイル名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_title = sanitize_filename(title)
        filename = f"{safe_title}_{timestamp}.mp4"
        output_file = RECORDINGS_DIR / filename

        with _jobs_lock:
            _jobs[job_id]["filename"] = filename

        # yt-dlp コマンド
        cmd = [
            "yt-dlp",
            "--no-playlist", "--no-warnings",
            "-f", fmt,
            "--merge-output-format", "mp4",
            "-o", str(output_file),
        ]
        if duration:
            cmd += ["--downloader", "ffmpeg",
                    "--downloader-args", f"ffmpeg_i:-t {duration}"]
        cmd.append(url)

        log(f"録画開始: {filename}")
        with _jobs_lock:
            _jobs[job_id]["status"] = "recording"

        proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1,
        )
        with _jobs_lock:
            _jobs[job_id]["pid"] = proc.pid

        for line in proc.stdout:
            line = line.rstrip()
            if not line:
                continue
            if "ERROR" in line:
                log(line, "error")
            elif "WARNING" in line:
                log(line, "warn")
            elif "[download]" in line or "%" in line:
                log(line, "download")
            else:
                log(line)

        proc.wait()

        if proc.returncode == 0 and output_file.exists():
            size_mb = output_file.stat().st_size / (1024 * 1024)
            log(f"録画完了! {filename} ({size_mb:.1f} MB)", "success")
            with _jobs_lock:
                _jobs[job_id]["status"] = "done"
                _jobs[job_id]["size_mb"] = round(size_mb, 1)
        else:
            raise RuntimeError(f"録画失敗 (終了コード: {proc.returncode})")

    except Exception as e:
        log(str(e), "error")
        with _jobs_lock:
            _jobs[job_id]["status"] = "error"
    finally:
        log_q.put(None)  # ストリーム終了シグナル


@youtube_recorder.route("/youtube-recorder")
def index():
    return render_template("youtube_recorder.html")


@youtube_recorder.route("/youtube-recorder/start", methods=["POST"])
def start():
    data = request.get_json() or {}
    url = (data.get("url") or "").strip()
    fmt = data.get("format", "best")
    duration = data.get("duration")  # 秒 or None
    scheduled_start = (data.get("scheduled_start") or "").strip() or None
    scheduled_end   = (data.get("scheduled_end") or "").strip() or None

    if not url:
        return jsonify({"error": "URLを入力してください"}), 400
    if not re.match(r"https?://(www\.)?(youtube\.com|youtu\.be)/", url):
        return jsonify({"error": "YouTube の URL を入力してください"}), 400

    # HH:MM バリデーション
    time_re = re.compile(r"^\d{2}:\d{2}$")
    if scheduled_start and not time_re.match(scheduled_start):
        return jsonify({"error": "開始時刻の形式が正しくありません (HH:MM)"}), 400
    if scheduled_end and not time_re.match(scheduled_end):
        return jsonify({"error": "終了時刻の形式が正しくありません (HH:MM)"}), 400

    # 終了時刻から録画秒数を計算
    if scheduled_end:
        end_dt = _parse_time_today(scheduled_end)
        if scheduled_start:
            start_dt = _parse_time_today(scheduled_start)
            if end_dt <= start_dt:
                end_dt += timedelta(days=1)
            calc_duration = int((end_dt - start_dt).total_seconds())
        else:
            calc_duration = int((end_dt - datetime.now()).total_seconds())
        if calc_duration <= 0:
            return jsonify({"error": "終了時刻が開始時刻より前です"}), 400
        duration = calc_duration

    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _jobs[job_id] = {
            "id": job_id,
            "url": url,
            "status": "starting",
            "logs": [],
            "log_q": queue.Queue(),
            "title": "",
            "channel": "",
            "filename": None,
            "size_mb": None,
            "pid": None,
            "scheduled_start": scheduled_start,
        }

    t = threading.Thread(
        target=_run_recording,
        args=(job_id, url, fmt, int(duration) if duration else None, scheduled_start),
        daemon=True,
    )
    t.start()

    return jsonify({"job_id": job_id})


@youtube_recorder.route("/youtube-recorder/events/<job_id>")
def events(job_id: str):
    """Server-Sent Events でログをリアルタイム配信"""
    job = _jobs.get(job_id)
    if not job:
        return "job not found", 404

    @stream_with_context
    def generate():
        # 既存ログを先に送信
        for entry in list(job["logs"]):
            yield f"data: {json.dumps(entry, ensure_ascii=False)}\n\n"

        log_q: queue.Queue = job["log_q"]
        while True:
            item = log_q.get()
            if item is None:
                yield f"data: {json.dumps({'level': 'done', 'msg': ''})}\n\n"
                break
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@youtube_recorder.route("/youtube-recorder/status/<job_id>")
def status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return jsonify({"error": "job not found"}), 404
    return jsonify({
        "status": job["status"],
        "title": job["title"],
        "filename": job["filename"],
        "size_mb": job["size_mb"],
        "scheduled_start": job.get("scheduled_start"),
    })


@youtube_recorder.route("/youtube-recorder/stop/<job_id>", methods=["POST"])
def stop(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return jsonify({"error": "job not found"}), 404
    pid = job.get("pid")
    if pid:
        try:
            import signal
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    with _jobs_lock:
        _jobs[job_id]["status"] = "stopped"
    return jsonify({"ok": True})


@youtube_recorder.route("/youtube-recorder/download/<job_id>")
def download(job_id: str):
    job = _jobs.get(job_id)
    if not job or not job.get("filename"):
        return "file not found", 404
    filepath = RECORDINGS_DIR / job["filename"]
    if not filepath.exists():
        return "file not found", 404
    return send_file(
        filepath,
        as_attachment=True,
        download_name=job["filename"],
        mimetype="video/mp4",
    )
