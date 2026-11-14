import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from datetime import datetime, timezone, timedelta
from functools import wraps

import requests
from flask import Flask, g, render_template, request, redirect, url_for, session, jsonify, flash


def load_dotenv():
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "gisele_games.db"))
# Railway (and most hosts) attach a Postgres addon by setting DATABASE_URL and give
# the app an ephemeral filesystem otherwise — a SQLite file written to disk there
# gets wiped on every redeploy/restart. Local dev with no DATABASE_URL keeps using
# the simple SQLite file untouched.
DATABASE_URL = os.environ.get("DATABASE_URL")
USE_POSTGRES = bool(DATABASE_URL)
if USE_POSTGRES:
    import psycopg2
    import psycopg2.extras

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
RESEND_URL = "https://api.resend.com/emails"
PASSWORD_RESET_TTL_MINUTES = 30

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# ---------------- rate limiting ----------------
# Simple in-memory per-IP sliding window, only counted on POST (form submits),
# never on GET (page views). Good enough for a small friends-and-family app on
# a single worker process; would need a shared store (e.g. Redis) across
# multiple gunicorn workers/dynos, but this app runs one.
_rate_limit_hits = defaultdict(deque)


def rate_limit(max_calls, window_seconds):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if request.method != "POST":
                return fn(*args, **kwargs)
            key = fn.__name__ + ":" + (request.remote_addr or "unknown")
            now = time.time()
            hits = _rate_limit_hits[key]
            while hits and hits[0] < now - window_seconds:
                hits.popleft()
            if len(hits) >= max_calls:
                flash("試得太密啦，等幾分鐘先再試。")
                return redirect(request.path)
            hits.append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator

MAZE_POINTS = {"easy": 10, "medium": 20, "hard": 30}
MAZE_DIFFICULTIES = set(MAZE_POINTS)

OPERATION_POINTS = {"easy": 15, "medium": 25, "hard": 35}
OPERATION_DIFFICULTIES = set(OPERATION_POINTS)
OPERATION_MAX_LIVES = 5

TTT_POINTS = {
    "easy": {"win": 5, "draw": 2, "lose": 0},
    "medium": {"win": 12, "draw": 5, "lose": 0},
    "hard": {"win": 30, "draw": 15, "lose": 0},
}
TTT_DIFFICULTIES = set(TTT_POINTS)

SPOT_MAX_STRIKES = 3
SPOT_DIFF_COUNT = 5

DIAMOND_HACHER_POINTS = 12
DIAMOND_HACHER_GOAL = 10

BADGE_LABELS = {
    "first_win": "🎉 初次過關",
    "maze_hard_win": "🌀 攻破高難度迷宮",
    "wordsmith": "📖 零提示估中",
    "no_mistakes": "💯 全對無失手",
    "marathon": "🏃 長字馬拉松",
    "steady_hand": "🖐 穩定嘅手",
    "surgeon": "🩺 神級醫生",
    "fox_outsmarted": "🦊 打敗聰明狐狸",
    "dragon_tamer": "🐉 馴服神級小龍",
    "eagle_eye": "🦅 鷹眼搜查",
    "diamond_thief": "💎 偷鑽高手",
}

GAMES = [
    {
        "key": "maze",
        "endpoint": "play_maze",
        "title": "Gisele's Maze",
        "desc": "迷宮愈難愈刺激！諗路線、避開陷阱，睇下你可以幾快走到終點。",
        "tags": ["益智", "計時挑戰"],
        "cover": "maze_cover.png",
    },
    {
        "key": "guess_word",
        "endpoint": "play_guess_word",
        "title": "Gisele's Word Melt",
        "desc": "限次數猜出神秘單字！每次猜完有提示，睇下你要幾多次先估到。",
        "tags": ["估字", "英文"],
        "cover": "guess_word_cover.png",
    },
    {
        "key": "operation",
        "endpoint": "play_operation",
        "title": "Gisele's Operation",
        "desc": "手要穩！沿住彎彎曲曲嘅路拖去終點，唔可以掂到邊，睇下你捱唔捱到到尾。",
        "tags": ["考眼界", "手穩挑戰"],
        "cover": "operation_cover.jpg",
    },
    {
        "key": "tictactoe",
        "endpoint": "play_tictactoe",
        "title": "Gisele's Tic-Tac-Toe",
        "desc": "揀傻兔仔、聰明狐狸或者神級小龍對戰，砌成一條線就贏！難度愈高，分數愈高。",
        "tags": ["棋類", "鬥智"],
        "cover": "tictactoe_cover.png",
    },
    {
        "key": "spot_diff",
        "endpoint": "play_spot_diff",
        "title": "Gisele's Spot the Difference",
        "desc": "兩張圖睇落一樣，其實藏住5個唔同！揾晒佢哋，睇下你嘅眼力夠唔夠尖。",
        "tags": ["觀察力", "眼明手快"],
        "cover": "spot_diff_cover.png",
    },
    {
        "key": "diamond_hacher",
        "endpoint": "play_diamond_hacher",
        "title": "Diamond Hacher",
        "desc": "Hacher 企喺度，手袋一次跌一件：鑽石快啲偷，石頭唔好撳。同佢搶快，第一個到10粒贏！",
        "tags": ["對戰電腦", "眼明手快"],
        "cover": "diamond_hacher_cover.jpg",
    },
]


# ---------------- db ----------------

class PGConnWrapper:
    """Makes a psycopg2 connection support sqlite3.Connection's `.execute()`
    shortcut (returning a fetchable cursor) and dict-style row access, so every
    `db.execute(...).fetchone()/.fetchall()` call site elsewhere in this file
    works unchanged regardless of which backend is active."""

    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql, params=()):
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql.replace("?", "%s"), params)
        return cur

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def get_db():
    if "db" not in g:
        if USE_POSTGRES:
            conn = psycopg2.connect(DATABASE_URL)
            g.db = PGConnWrapper(conn)
        else:
            g.db = sqlite3.connect(DB_PATH)
            g.db.row_factory = sqlite3.Row
            g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


SQLITE_SCHEMA = """
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets(
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS points_ledger(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        game TEXT NOT NULL,
        difficulty TEXT,
        seconds REAL,
        steps INTEGER,
        length INTEGER,
        lives_left INTEGER,
        hints_used INTEGER,
        won INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS badges(
        user_id INTEGER NOT NULL REFERENCES users(id),
        badge_key TEXT NOT NULL,
        earned_at TEXT NOT NULL,
        PRIMARY KEY(user_id, badge_key)
    );
"""

POSTGRES_SCHEMA = """
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets(
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS points_ledger(
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS results(
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        game TEXT NOT NULL,
        difficulty TEXT,
        seconds REAL,
        steps INTEGER,
        length INTEGER,
        lives_left INTEGER,
        hints_used INTEGER,
        won INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS badges(
        user_id INTEGER NOT NULL REFERENCES users(id),
        badge_key TEXT NOT NULL,
        earned_at TEXT NOT NULL,
        PRIMARY KEY(user_id, badge_key)
    );
"""


def init_db():
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(POSTGRES_SCHEMA)
        conn.commit()
        conn.close()
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.executescript(SQLITE_SCHEMA)
        conn.commit()
        conn.close()


init_db()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------------- auth helpers ----------------

def current_user():
    uid = session.get("user_id")
    if not uid:
        return None
    return get_db().execute("SELECT id, email, display_name FROM users WHERE id=?", (uid,)).fetchone()


def login_required_page(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return redirect(url_for("login", next=request.path))
        return fn(*args, **kwargs)
    return wrapper


def login_required_api(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "not_logged_in"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ---------------- points / badges ----------------

def get_total_points(db, user_id):
    row = db.execute("SELECT SUM(amount) AS total FROM points_ledger WHERE user_id=?", (user_id,)).fetchone()
    return row["total"] or 0


def award_points(db, user_id, amount, reason):
    db.execute(
        "INSERT INTO points_ledger(user_id, amount, reason, created_at) VALUES (?,?,?,?)",
        (user_id, amount, reason, now_iso()),
    )
    db.commit()


def award_badge(db, user_id, badge_key):
    sql = (
        "INSERT INTO badges(user_id, badge_key, earned_at) VALUES (?,?,?) "
        "ON CONFLICT (user_id, badge_key) DO NOTHING"
        if USE_POSTGRES else
        "INSERT OR IGNORE INTO badges(user_id, badge_key, earned_at) VALUES (?,?,?)"
    )
    db.execute(sql, (user_id, badge_key, now_iso()))
    db.commit()


def has_any_win(db, user_id):
    row = db.execute("SELECT 1 FROM results WHERE user_id=? AND won=1 LIMIT 1", (user_id,)).fetchone()
    return row is not None


def get_badges(db, user_id):
    rows = db.execute("SELECT badge_key FROM badges WHERE user_id=? ORDER BY earned_at", (user_id,)).fetchall()
    return [BADGE_LABELS.get(r["badge_key"], r["badge_key"]) for r in rows]


# ---------------- shared template context ----------------

@app.context_processor
def inject_globals():
    user = current_user()
    points = get_total_points(get_db(), user["id"]) if user else 0
    return dict(user=user, points=points, games=GAMES)


# ---------------- public / auth pages ----------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    return app.send_static_file("img/icon-192.png")


@app.route("/sw.js")
def service_worker():
    # served at root (not /static/sw.js) so its default scope covers the whole
    # app, not just /static/ — needed for it to control game/auth pages too.
    resp = app.send_static_file("sw.js")
    resp.headers["Service-Worker-Allowed"] = "/"
    return resp


@app.route("/register", methods=["GET", "POST"])
@rate_limit(5, 600)
def register():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not name:
            flash("要填個花名。")
            return render_template("register.html", email=email, name=name)
        if not EMAIL_RE.match(email):
            flash("電郵格式唔啱，check多次。")
            return render_template("register.html", email=email, name=name)
        if len(password) < 6:
            flash("密碼要至少6個字。")
            return render_template("register.html", email=email, name=name)

        from werkzeug.security import generate_password_hash

        db = get_db()
        existing = db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            flash("呢個電郵已經註冊咗，直接登入啦。")
            return render_template("register.html", email=email, name=name)

        insert_sql = "INSERT INTO users(email, password_hash, display_name, created_at) VALUES (?,?,?,?)"
        if USE_POSTGRES:
            cur = db.execute(insert_sql + " RETURNING id", (email, generate_password_hash(password), name, now_iso()))
            new_id = cur.fetchone()["id"]
        else:
            cur = db.execute(insert_sql, (email, generate_password_hash(password), name, now_iso()))
            new_id = cur.lastrowid
        db.commit()
        session["user_id"] = new_id
        return redirect(request.args.get("next") or url_for("index"))

    return render_template("register.html", email="", name="")


@app.route("/login", methods=["GET", "POST"])
@rate_limit(8, 300)
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        from werkzeug.security import check_password_hash

        db = get_db()
        row = db.execute("SELECT id, password_hash FROM users WHERE email=?", (email,)).fetchone()
        if not row or not check_password_hash(row["password_hash"], password):
            flash("電郵或者密碼唔啱。")
            return render_template("login.html", email=email)

        session["user_id"] = row["id"]
        return redirect(request.args.get("next") or url_for("index"))

    return render_template("login.html", email="")


@app.route("/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("index"))


def send_reset_email(to_email, token):
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY not configured")

    reset_url = url_for("reset_password", token=token, _external=True)
    resp = requests.post(
        RESEND_URL,
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "重設你嘅 Gisele's Games 密碼",
            "html": (
                "<p>你好，我哋收到你嘅重設密碼要求。</p>"
                f"<p><a href=\"{reset_url}\">撳呢度重設密碼</a>"
                f"（{PASSWORD_RESET_TTL_MINUTES}分鐘內有效）</p>"
                "<p>如果唔係你要求嘅，可以忽略呢封email。</p>"
            ),
        },
        timeout=15,
    )
    resp.raise_for_status()


@app.route("/forgot-password", methods=["GET", "POST"])
@rate_limit(3, 600)
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        db = get_db()
        user = db.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if user:
            token = secrets.token_urlsafe(32)
            expires_at = (datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES)).isoformat()
            db.execute(
                "INSERT INTO password_resets(token, user_id, created_at, expires_at) VALUES (?,?,?,?)",
                (token, user["id"], now_iso(), expires_at),
            )
            db.commit()
            try:
                send_reset_email(email, token)
            except Exception:
                flash("而家send唔到email，請遲啲再試或者聯絡我哋。")
                return render_template("forgot_password.html", email=email)
        flash("如果呢個電郵有註冊，我哋已經send咗重設密碼link俾你，check下你個inbox。")
        return render_template("forgot_password.html", email="")

    return render_template("forgot_password.html", email="")


@app.route("/reset-password/<token>", methods=["GET", "POST"])
def reset_password(token):
    db = get_db()
    row = db.execute(
        "SELECT user_id, expires_at, used FROM password_resets WHERE token=?", (token,)
    ).fetchone()
    valid = bool(row) and not row["used"] and row["expires_at"] > now_iso()
    if not valid:
        flash("重設密碼link已經失效或者用咗，請重新申請。")
        return redirect(url_for("forgot_password"))

    if request.method == "POST":
        password = request.form.get("password", "")
        if len(password) < 6:
            flash("密碼要至少6個字。")
            return render_template("reset_password.html", token=token)

        from werkzeug.security import generate_password_hash

        db.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(password), row["user_id"]))
        db.execute("UPDATE password_resets SET used=1 WHERE token=?", (token,))
        db.commit()
        flash("密碼已經重設好，用返新密碼登入啦。")
        return redirect(url_for("login"))

    return render_template("reset_password.html", token=token)


# ---------------- games ----------------

@app.route("/games/maze")
@login_required_page
def play_maze():
    return render_template("maze.html")


@app.route("/games/guess-word")
@login_required_page
def play_guess_word():
    return render_template("guess_words.html")


@app.route("/games/operation")
@login_required_page
def play_operation():
    return render_template("operation.html")


@app.route("/games/tictactoe")
@login_required_page
def play_tictactoe():
    return render_template("tictactoe.html")


@app.route("/games/spot-diff")
@login_required_page
def play_spot_diff():
    return render_template("spot_diff.html")


@app.route("/games/diamond-hacher")
@login_required_page
def play_diamond_hacher():
    return render_template("diamond_hacher.html")


@app.route("/leaderboard")
@login_required_page
def leaderboard():
    db = get_db()
    rows = db.execute(
        """
        SELECT u.id, u.display_name AS name, COALESCE(SUM(pl.amount), 0) AS total,
               (SELECT COUNT(*) FROM badges b WHERE b.user_id = u.id) AS badge_count
        FROM users u
        LEFT JOIN points_ledger pl ON pl.user_id = u.id
        GROUP BY u.id
        ORDER BY total DESC, u.created_at ASC
        """
    ).fetchall()
    user = current_user()
    badges = get_badges(db, user["id"])
    return render_template("leaderboard.html", rows=rows, badges=badges)


# ---------------- game result APIs ----------------

@app.route("/api/maze/finish", methods=["POST"])
@login_required_api
def api_maze_finish():
    data = request.get_json(silent=True) or {}
    difficulty = data.get("difficulty")
    seconds = data.get("seconds")
    steps = data.get("steps")
    won = bool(data.get("won"))

    if difficulty not in MAZE_DIFFICULTIES:
        return jsonify({"error": "bad_difficulty"}), 400
    try:
        seconds = max(0, float(seconds))
        steps = max(0, int(steps))
    except (TypeError, ValueError):
        return jsonify({"error": "bad_metrics"}), 400

    db = get_db()
    user = current_user()
    points = MAZE_POINTS[difficulty] if won else 0
    is_first_win_ever = won and not has_any_win(db, user["id"])

    db.execute(
        "INSERT INTO results(user_id, game, difficulty, seconds, steps, won, points, created_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (user["id"], "maze", difficulty, seconds, steps, int(won), points, now_iso()),
    )
    db.commit()

    new_badges = []
    if won:
        award_points(db, user["id"], points, f"maze_win:{difficulty}")
        if is_first_win_ever:
            award_badge(db, user["id"], "first_win")
            new_badges.append("first_win")
        if difficulty == "hard":
            award_badge(db, user["id"], "maze_hard_win")
            new_badges.append("maze_hard_win")

    return jsonify({
        "points_awarded": points,
        "total_points": get_total_points(db, user["id"]),
        "new_badges": [BADGE_LABELS.get(b, b) for b in new_badges],
    })


@app.route("/api/guess-word/finish", methods=["POST"])
@login_required_api
def api_guess_word_finish():
    data = request.get_json(silent=True) or {}
    length = data.get("length")
    lives_left = data.get("lives_left")
    hints_used = data.get("hints_used")
    won = bool(data.get("won"))

    try:
        length = int(length)
        lives_left = max(0, int(lives_left))
        hints_used = max(0, int(hints_used))
    except (TypeError, ValueError):
        return jsonify({"error": "bad_metrics"}), 400
    if not (4 <= length <= 12):
        return jsonify({"error": "bad_length"}), 400

    db = get_db()
    user = current_user()
    points = max(5, length * 2 + lives_left - hints_used * 2) if won else 0
    is_first_win_ever = won and not has_any_win(db, user["id"])

    db.execute(
        "INSERT INTO results(user_id, game, length, lives_left, hints_used, won, points, created_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (user["id"], "guess_word", length, lives_left, hints_used, int(won), points, now_iso()),
    )
    db.commit()

    new_badges = []
    if won:
        award_points(db, user["id"], points, f"guess_word_win:{length}")
        if is_first_win_ever:
            award_badge(db, user["id"], "first_win")
            new_badges.append("first_win")
        if hints_used == 0:
            award_badge(db, user["id"], "wordsmith")
            new_badges.append("wordsmith")
        if lives_left == 8:
            award_badge(db, user["id"], "no_mistakes")
            new_badges.append("no_mistakes")
        if length >= 10:
            award_badge(db, user["id"], "marathon")
            new_badges.append("marathon")

    return jsonify({
        "points_awarded": points,
        "total_points": get_total_points(db, user["id"]),
        "new_badges": [BADGE_LABELS.get(b, b) for b in new_badges],
    })


@app.route("/api/operation/finish", methods=["POST"])
@login_required_api
def api_operation_finish():
    data = request.get_json(silent=True) or {}
    difficulty = data.get("difficulty")
    seconds = data.get("seconds")
    lives_left = data.get("lives_left")
    won = bool(data.get("won"))

    if difficulty not in OPERATION_DIFFICULTIES:
        return jsonify({"error": "bad_difficulty"}), 400
    try:
        seconds = max(0, float(seconds))
        lives_left = max(0, min(OPERATION_MAX_LIVES, int(lives_left)))
    except (TypeError, ValueError):
        return jsonify({"error": "bad_metrics"}), 400

    db = get_db()
    user = current_user()
    points = OPERATION_POINTS[difficulty] + lives_left * 3 if won else 0
    is_first_win_ever = won and not has_any_win(db, user["id"])

    db.execute(
        "INSERT INTO results(user_id, game, difficulty, seconds, lives_left, won, points, created_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (user["id"], "operation", difficulty, seconds, lives_left, int(won), points, now_iso()),
    )
    db.commit()

    new_badges = []
    if won:
        award_points(db, user["id"], points, f"operation_win:{difficulty}")
        if is_first_win_ever:
            award_badge(db, user["id"], "first_win")
            new_badges.append("first_win")
        if lives_left == OPERATION_MAX_LIVES:
            award_badge(db, user["id"], "steady_hand")
            new_badges.append("steady_hand")
        if difficulty == "hard":
            award_badge(db, user["id"], "surgeon")
            new_badges.append("surgeon")

    return jsonify({
        "points_awarded": points,
        "total_points": get_total_points(db, user["id"]),
        "new_badges": [BADGE_LABELS.get(b, b) for b in new_badges],
    })


@app.route("/api/tictactoe/finish", methods=["POST"])
@login_required_api
def api_tictactoe_finish():
    data = request.get_json(silent=True) or {}
    difficulty = data.get("difficulty")
    outcome = data.get("outcome")
    moves = data.get("moves")

    if difficulty not in TTT_DIFFICULTIES:
        return jsonify({"error": "bad_difficulty"}), 400
    if outcome not in ("win", "draw", "lose"):
        return jsonify({"error": "bad_outcome"}), 400
    try:
        moves = max(0, int(moves))
    except (TypeError, ValueError):
        return jsonify({"error": "bad_metrics"}), 400

    db = get_db()
    user = current_user()
    won = outcome == "win"
    points = TTT_POINTS[difficulty][outcome]
    is_first_win_ever = won and not has_any_win(db, user["id"])

    db.execute(
        "INSERT INTO results(user_id, game, difficulty, steps, won, points, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (user["id"], "tictactoe", difficulty, moves, int(won), points, now_iso()),
    )
    db.commit()

    new_badges = []
    if points > 0:
        award_points(db, user["id"], points, f"tictactoe_{outcome}:{difficulty}")
    if won and is_first_win_ever:
        award_badge(db, user["id"], "first_win")
        new_badges.append("first_win")
    if won and difficulty == "medium":
        award_badge(db, user["id"], "fox_outsmarted")
        new_badges.append("fox_outsmarted")
    if difficulty == "hard" and outcome in ("win", "draw"):
        award_badge(db, user["id"], "dragon_tamer")
        new_badges.append("dragon_tamer")

    return jsonify({
        "points_awarded": points,
        "total_points": get_total_points(db, user["id"]),
        "new_badges": [BADGE_LABELS.get(b, b) for b in new_badges],
    })


@app.route("/api/spot-diff/finish", methods=["POST"])
@login_required_api
def api_spot_diff_finish():
    data = request.get_json(silent=True) or {}
    level_key = data.get("level_key")
    strikes_left = data.get("strikes_left")
    won = bool(data.get("won"))

    if not level_key or not isinstance(level_key, str):
        return jsonify({"error": "bad_level"}), 400
    try:
        strikes_left = max(0, min(SPOT_MAX_STRIKES, int(strikes_left)))
    except (TypeError, ValueError):
        return jsonify({"error": "bad_metrics"}), 400

    db = get_db()
    user = current_user()
    points = 20 + strikes_left * 5 if won else 0
    is_first_win_ever = won and not has_any_win(db, user["id"])

    db.execute(
        "INSERT INTO results(user_id, game, difficulty, lives_left, won, points, created_at) "
        "VALUES (?,?,?,?,?,?,?)",
        (user["id"], "spot_diff", level_key, strikes_left, int(won), points, now_iso()),
    )
    db.commit()

    new_badges = []
    if won:
        award_points(db, user["id"], points, f"spot_diff_win:{level_key}")
        if is_first_win_ever:
            award_badge(db, user["id"], "first_win")
            new_badges.append("first_win")
        if strikes_left == SPOT_MAX_STRIKES:
            award_badge(db, user["id"], "eagle_eye")
            new_badges.append("eagle_eye")

    return jsonify({
        "points_awarded": points,
        "total_points": get_total_points(db, user["id"]),
        "new_badges": [BADGE_LABELS.get(b, b) for b in new_badges],
    })


@app.route("/api/diamond-hacher/finish", methods=["POST"])
@login_required_api
def api_diamond_hacher_finish():
    data = request.get_json(silent=True) or {}
    winner = data.get("winner")
    player_score = data.get("player_score")
    hacher_score = data.get("hacher_score")

    if winner not in ("player", "hacher"):
        return jsonify({"error": "bad_winner"}), 400
    try:
        player_score = max(0, min(DIAMOND_HACHER_GOAL, int(player_score)))
        hacher_score = max(0, min(DIAMOND_HACHER_GOAL, int(hacher_score)))
    except (TypeError, ValueError):
        return jsonify({"error": "bad_metrics"}), 400
    if (winner == "player" and player_score < DIAMOND_HACHER_GOAL) or (
        winner == "hacher" and hacher_score < DIAMOND_HACHER_GOAL
    ):
        return jsonify({"error": "winner_score"}), 400

    db = get_db()
    user = current_user()
    won = winner == "player"
    points = DIAMOND_HACHER_POINTS if won else 0
    is_first_win_ever = won and not has_any_win(db, user["id"])

    db.execute(
        "INSERT INTO results(user_id, game, difficulty, steps, lives_left, won, points, created_at) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (user["id"], "diamond_hacher", winner, player_score, hacher_score, int(won), points, now_iso()),
    )
    db.commit()

    new_badges = []
    if won:
        award_points(db, user["id"], points, "diamond_hacher_win")
        if is_first_win_ever:
            award_badge(db, user["id"], "first_win")
            new_badges.append("first_win")
        had_thief = db.execute(
            "SELECT 1 FROM badges WHERE user_id=? AND badge_key=? LIMIT 1",
            (user["id"], "diamond_thief"),
        ).fetchone()
        award_badge(db, user["id"], "diamond_thief")
        if not had_thief:
            new_badges.append("diamond_thief")

    return jsonify({
        "points_awarded": points,
        "total_points": get_total_points(db, user["id"]),
        "new_badges": [BADGE_LABELS.get(b, b) for b in new_badges],
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
