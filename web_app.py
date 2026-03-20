#!/usr/bin/env python3
"""
Bluesky 予約投稿 Web アプリ
起動: python web_app.py
"""
import os
import uuid
import threading
import time
import smtplib
import webbrowser
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from pathlib import Path

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
)
from dotenv import load_dotenv, set_key

from bluesky_scheduler.config import get_db_path, get_credentials
from bluesky_scheduler.storage import Storage, Template

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

UPLOAD_DIR = Path.home() / ".bluesky_scheduler" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ENV_PATH = Path(".env")

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}


def get_storage() -> Storage:
    return Storage(get_db_path())


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def credentials_set() -> bool:
    handle, password = get_credentials()
    return bool(handle and password)


# ── ルーティング ────────────────────────────────────────────────

@app.route("/")
def index():
    if not credentials_set():
        flash("まず設定画面でBlueskyのIDとパスワードを入力してください。", "warning")
        return redirect(url_for("settings"))
    storage = get_storage()
    status_filter = request.args.get("status")
    posts = storage.list_posts(status_filter)
    now = datetime.now().astimezone()
    return render_template("index.html", posts=posts, now=now, status_filter=status_filter)


@app.route("/add", methods=["GET", "POST"])
def add():
    if not credentials_set():
        flash("まず設定画面でBlueskyのIDとパスワードを入力してください。", "warning")
        return redirect(url_for("settings"))

    if request.method == "POST":
        text = request.form.get("text", "").strip()
        scheduled_at_str = request.form.get("scheduled_at", "").strip()
        images = request.files.getlist("images")

        # バリデーション
        errors = []
        if not text:
            errors.append("投稿テキストを入力してください。")
        if len(text) > 300:
            errors.append("テキストは300文字以内にしてください。")
        if not scheduled_at_str:
            errors.append("投稿日時を選択してください。")

        scheduled_at = None
        if scheduled_at_str:
            try:
                scheduled_at = datetime.fromisoformat(scheduled_at_str).astimezone()
                if scheduled_at <= datetime.now().astimezone():
                    errors.append("投稿日時は現在より未来の時刻を指定してください。")
            except ValueError:
                errors.append("日時の形式が正しくありません。")

        if errors:
            for e in errors:
                flash(e, "danger")
            now_str = datetime.now().strftime("%Y-%m-%dT%H:%M")
            return render_template("add.html", form=request.form, now_str=now_str)

        # 画像保存
        saved_paths = []
        for f in images:
            if f and f.filename and allowed_file(f.filename):
                ext = f.filename.rsplit(".", 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                save_path = UPLOAD_DIR / filename
                f.save(str(save_path))
                saved_paths.append(str(save_path))

        storage = get_storage()
        post = storage.add_post(text, scheduled_at, saved_paths if saved_paths else None)
        flash(f"✅ 予約完了！ {scheduled_at.strftime('%Y年%m月%d日 %H:%M')} に投稿されます。", "success")
        return redirect(url_for("index"))

    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M")
    return render_template("add.html", form={}, now_str=now_str)


@app.route("/delete/<int:post_id>", methods=["POST"])
def delete(post_id: int):
    storage = get_storage()
    post = storage.get_post(post_id)
    if not post:
        flash("投稿が見つかりませんでした。", "danger")
    elif post.status == "posted":
        flash("送信済みの投稿は削除できません。", "warning")
    else:
        storage.delete_post(post_id)
        flash("投稿を削除しました。", "success")
    return redirect(url_for("index"))


@app.route("/settings", methods=["GET", "POST"])
def settings():
    if request.method == "POST":
        handle = request.form.get("handle", "").strip()
        password = request.form.get("password", "").strip()

        if not handle or not password:
            flash("ハンドルとアプリパスワードを両方入力してください。", "danger")
            return render_template("settings.html", handle=handle)

        # .env ファイルに保存
        if not ENV_PATH.exists():
            ENV_PATH.write_text("")
        set_key(str(ENV_PATH), "BLUESKY_HANDLE", handle)
        set_key(str(ENV_PATH), "BLUESKY_APP_PASSWORD", password)

        # 環境変数を更新
        os.environ["BLUESKY_HANDLE"] = handle
        os.environ["BLUESKY_APP_PASSWORD"] = password

        # 接続テスト
        try:
            from bluesky_scheduler.client import BlueskyClient
            client = BlueskyClient(handle, password)
            name = client.verify_credentials()
            flash(f"✅ 接続成功！ {name} (@{handle}) としてログインしました。", "success")
            return redirect(url_for("index"))
        except Exception as e:
            flash(f"❌ 接続失敗: {e}", "danger")
            return render_template("settings.html", handle=handle)

    handle, _ = get_credentials()
    return render_template("settings.html", handle=handle)


# ── テンプレートジェネレーター ────────────────────────────────────

@app.route("/templates")
def templates_list():
    if not credentials_set():
        flash("まず設定画面でBlueskyのIDとパスワードを入力してください。", "warning")
        return redirect(url_for("settings"))
    storage = get_storage()
    templates = storage.list_templates()
    return render_template("templates_list.html", templates=templates)


@app.route("/templates/new", methods=["GET", "POST"])
def template_new():
    if not credentials_set():
        flash("まず設定画面でBlueskyのIDとパスワードを入力してください。", "warning")
        return redirect(url_for("settings"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        body = request.form.get("body", "").strip()
        hashtags = request.form.get("hashtags", "").strip()

        errors = []
        if not name:
            errors.append("テンプレート名を入力してください。")
        if not body:
            errors.append("テンプレート本文を入力してください。")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template("template_new.html", form=request.form)

        storage = get_storage()
        storage.add_template(name, body, hashtags)
        flash(f"✅ テンプレート「{name}」を保存しました。", "success")
        return redirect(url_for("templates_list"))

    return render_template("template_new.html", form={})


@app.route("/templates/<int:template_id>/delete", methods=["POST"])
def template_delete(template_id: int):
    storage = get_storage()
    storage.delete_template(template_id)
    flash("テンプレートを削除しました。", "success")
    return redirect(url_for("templates_list"))


@app.route("/templates/<int:template_id>/use", methods=["GET", "POST"])
def template_use(template_id: int):
    if not credentials_set():
        flash("まず設定画面でBlueskyのIDとパスワードを入力してください。", "warning")
        return redirect(url_for("settings"))

    storage = get_storage()
    tmpl = storage.get_template(template_id)
    if not tmpl:
        flash("テンプレートが見つかりませんでした。", "danger")
        return redirect(url_for("templates_list"))

    now_str = datetime.now().strftime("%Y-%m-%dT%H:%M")

    if request.method == "POST":
        # Collect variable values
        values = {var: request.form.get(f"var_{var}", "").strip() for var in tmpl.variables()}
        generated_text = tmpl.render(values)
        scheduled_at_str = request.form.get("scheduled_at", "").strip()

        errors = []
        if len(generated_text) > 300:
            errors.append(f"生成されたテキストが300文字を超えています（{len(generated_text)}文字）。テンプレートまたは入力を短くしてください。")
        if not scheduled_at_str:
            errors.append("投稿日時を選択してください。")

        scheduled_at = None
        if scheduled_at_str:
            try:
                scheduled_at = datetime.fromisoformat(scheduled_at_str).astimezone()
                if scheduled_at <= datetime.now().astimezone():
                    errors.append("投稿日時は現在より未来の時刻を指定してください。")
            except ValueError:
                errors.append("日時の形式が正しくありません。")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template(
                "template_use.html",
                tmpl=tmpl,
                generated_text=generated_text,
                form=request.form,
                now_str=now_str,
            )

        storage.add_post(generated_text, scheduled_at)
        flash(f"✅ 予約完了！ {scheduled_at.strftime('%Y年%m月%d日 %H:%M')} に投稿されます。", "success")
        return redirect(url_for("index"))

    return render_template(
        "template_use.html",
        tmpl=tmpl,
        generated_text="",
        form={},
        now_str=now_str,
    )


@app.route("/thumbnail-generator")
def thumbnail_generator():
    return render_template("thumbnail_generator.html")


# ── メルマガ ────────────────────────────────────────────────────────

def get_smtp_config():
    """SMTP設定を環境変数から取得する。"""
    return {
        "host": os.environ.get("SMTP_HOST", ""),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "メルマガ"),
        "from_email": os.environ.get("SMTP_FROM_EMAIL", ""),
    }


def smtp_configured() -> bool:
    cfg = get_smtp_config()
    return bool(cfg["host"] and cfg["user"] and cfg["password"] and cfg["from_email"])


def send_newsletter_email(subject: str, body: str, recipients: list[dict]) -> int:
    """指定の宛先リストにメルマガを送信し、送信件数を返す。"""
    cfg = get_smtp_config()
    sent = 0
    with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
        server.starttls()
        server.login(cfg["user"], cfg["password"])
        for r in recipients:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
            msg["To"] = r["email"]
            msg.attach(MIMEText(body, "plain", "utf-8"))
            server.sendmail(cfg["from_email"], r["email"], msg.as_string())
            sent += 1
    return sent


@app.route("/newsletter")
def newsletter_index():
    storage = get_storage()
    newsletters = storage.list_newsletters()
    subscriber_count = len(storage.list_subscribers())
    return render_template(
        "newsletter_index.html",
        newsletters=newsletters,
        subscriber_count=subscriber_count,
        smtp_ok=smtp_configured(),
    )


@app.route("/newsletter/new", methods=["GET", "POST"])
def newsletter_new():
    if request.method == "POST":
        subject = request.form.get("subject", "").strip()
        body = request.form.get("body", "").strip()

        errors = []
        if not subject:
            errors.append("件名を入力してください。")
        if not body:
            errors.append("本文を入力してください。")

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template("newsletter_new.html", form=request.form)

        storage = get_storage()
        nl = storage.add_newsletter(subject, body)
        flash(f"✅ メルマガ「{subject}」を下書き保存しました。", "success")
        return redirect(url_for("newsletter_detail", newsletter_id=nl.id))

    return render_template("newsletter_new.html", form={})


@app.route("/newsletter/<int:newsletter_id>")
def newsletter_detail(newsletter_id: int):
    storage = get_storage()
    nl = storage.get_newsletter(newsletter_id)
    if not nl:
        flash("メルマガが見つかりませんでした。", "danger")
        return redirect(url_for("newsletter_index"))
    subscribers = storage.list_subscribers()
    return render_template(
        "newsletter_detail.html",
        nl=nl,
        subscribers=subscribers,
        smtp_ok=smtp_configured(),
    )


@app.route("/newsletter/<int:newsletter_id>/send", methods=["POST"])
def newsletter_send(newsletter_id: int):
    if not smtp_configured():
        flash("SMTP設定が完了していません。設定画面でメール設定を行ってください。", "danger")
        return redirect(url_for("newsletter_detail", newsletter_id=newsletter_id))

    storage = get_storage()
    nl = storage.get_newsletter(newsletter_id)
    if not nl:
        flash("メルマガが見つかりませんでした。", "danger")
        return redirect(url_for("newsletter_index"))

    if nl.status == "sent":
        flash("このメルマガは既に送信済みです。", "warning")
        return redirect(url_for("newsletter_detail", newsletter_id=newsletter_id))

    subscribers = storage.list_subscribers()
    if not subscribers:
        flash("購読者が登録されていません。", "warning")
        return redirect(url_for("newsletter_detail", newsletter_id=newsletter_id))

    try:
        recipients = [{"email": s.email, "name": s.name} for s in subscribers]
        sent = send_newsletter_email(nl.subject, nl.body, recipients)
        storage.mark_newsletter_sent(newsletter_id, sent)
        flash(f"✅ {sent}件のアドレスに送信しました。", "success")
    except Exception as e:
        flash(f"送信エラー: {e}", "danger")

    return redirect(url_for("newsletter_detail", newsletter_id=newsletter_id))


@app.route("/newsletter/<int:newsletter_id>/delete", methods=["POST"])
def newsletter_delete(newsletter_id: int):
    storage = get_storage()
    storage.delete_newsletter(newsletter_id)
    flash("メルマガを削除しました。", "success")
    return redirect(url_for("newsletter_index"))


@app.route("/newsletter/subscribers")
def newsletter_subscribers():
    storage = get_storage()
    subscribers = storage.list_subscribers()
    return render_template("newsletter_subscribers.html", subscribers=subscribers)


@app.route("/newsletter/subscribers/add", methods=["POST"])
def newsletter_subscriber_add():
    email = request.form.get("email", "").strip().lower()
    name = request.form.get("name", "").strip()

    if not email or "@" not in email:
        flash("有効なメールアドレスを入力してください。", "danger")
        return redirect(url_for("newsletter_subscribers"))

    storage = get_storage()
    if storage.subscriber_exists(email):
        flash(f"{email} は既に登録されています。", "warning")
        return redirect(url_for("newsletter_subscribers"))

    storage.add_subscriber(email, name)
    flash(f"✅ {email} を購読者に追加しました。", "success")
    return redirect(url_for("newsletter_subscribers"))


@app.route("/newsletter/subscribers/<int:subscriber_id>/delete", methods=["POST"])
def newsletter_subscriber_delete(subscriber_id: int):
    storage = get_storage()
    storage.delete_subscriber(subscriber_id)
    flash("購読者を削除しました。", "success")
    return redirect(url_for("newsletter_subscribers"))


@app.route("/newsletter/smtp-settings", methods=["GET", "POST"])
def newsletter_smtp_settings():
    if request.method == "POST":
        fields = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD",
                  "SMTP_FROM_NAME", "SMTP_FROM_EMAIL"]
        form_keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_password",
                     "smtp_from_name", "smtp_from_email"]

        if not ENV_PATH.exists():
            ENV_PATH.write_text("")

        for env_key, form_key in zip(fields, form_keys):
            value = request.form.get(form_key, "").strip()
            if value:
                set_key(str(ENV_PATH), env_key, value)
                os.environ[env_key] = value

        flash("✅ SMTP設定を保存しました。", "success")
        return redirect(url_for("newsletter_smtp_settings"))

    cfg = get_smtp_config()
    return render_template("newsletter_smtp_settings.html", cfg=cfg)


# ── バックグラウンドスケジューラー ────────────────────────────────

def _scheduler_loop():
    """60秒ごとに期限到来の投稿を送信するバックグラウンドスレッド"""
    while True:
        try:
            if credentials_set():
                from bluesky_scheduler.scheduler import post_once
                post_once()
        except Exception as e:
            print(f"[Scheduler] エラー: {e}")
        time.sleep(60)


def start_scheduler():
    t = threading.Thread(target=_scheduler_loop, daemon=True)
    t.start()


# ── エントリーポイント ────────────────────────────────────────────

if __name__ == "__main__":
    # Flask の reloader が2重起動するのを防ぐ
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        start_scheduler()
        print()
        print("=" * 50)
        print("  🦋 Bluesky 予約投稿ツール")
        print("=" * 50)
        print()
        print("  ブラウザで以下のURLを開いてください:")
        print()
        print("  📱 スマホ(同じWi-Fi) → お使いのPCのIPアドレス:5000")
        print("  💻 このPC           → http://localhost:5000")
        print()
        print("  終了するには Ctrl+C を押してください")
        print("=" * 50)
        print()

    app.run(host="0.0.0.0", port=5000, debug=False)
