"""
StudyHub Backend
----------------
Flask API that powers the StudyHub Angular frontend.

Endpoints
---------
GET  /api/health
GET  /api/notices
POST /api/notices/refresh
GET  /api/routine
PUT  /api/routine
GET  /api/semesters
GET  /api/tutorials
"""

import json
import logging
import os
import threading
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

from scraper import fetch_notices_safe, utc_now_iso


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("studyhub.app")


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")

ROUTINE_PATH = os.path.join(DATA_DIR, "routine.json")
SEMESTERS_PATH = os.path.join(DATA_DIR, "semesters.json")
TUTORIALS_PATH = os.path.join(DATA_DIR, "tutorials.json")

os.makedirs(DATA_DIR, exist_ok=True)


# ============================================================
# CONFIGURATION
# ============================================================

# Render provides PORT automatically.
PORT = int(os.environ.get("PORT", 5000))

# Notice refresh interval.
REFRESH_INTERVAL_SECONDS = int(
    os.environ.get("REFRESH_INTERVAL_SECONDS", 60)
)

# Angular/Netlify frontend URL.
#
# Example on Render:
# FRONTEND_URL=https://your-site.netlify.app
#
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)


# ============================================================
# CORS
# ============================================================

if FRONTEND_URL:

    allowed_origins = [
        FRONTEND_URL,
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ]

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins
            }
        },
    )

    logger.info(
        "CORS enabled for frontend: %s",
        FRONTEND_URL,
    )

else:

    # Used before the Netlify frontend URL is configured.
    CORS(app)

    logger.warning(
        "FRONTEND_URL is not configured. "
        "CORS is allowing all origins."
    )


# ============================================================
# THREAD LOCK
# ============================================================

_lock = threading.Lock()


# ============================================================
# NOTICE CACHE
# ============================================================

_notice_cache = {
    "notices": [],
    "lastUpdated": None,
    "error": None,
}


# ============================================================
# NOTICE SCRAPER
# ============================================================

def refresh_notice_cache():
    """
    Fetch the latest KU notices and update the cache.

    If scraping fails, previously fetched notices are preserved.
    """

    try:

        logger.info("Refreshing KU notices...")

        notices, error = fetch_notices_safe(limit=12)

        with _lock:

            if notices:

                _notice_cache["notices"] = notices
                _notice_cache["error"] = None

            else:

                # Keep previous successful notices.
                _notice_cache["error"] = error

            _notice_cache["lastUpdated"] = utc_now_iso()

        if error:

            logger.warning(
                "Notice refresh finished with error: %s",
                error,
            )

        else:

            logger.info(
                "Notice cache refreshed successfully: %d notices",
                len(notices),
            )

    except Exception as exc:

        logger.exception(
            "Unexpected error while refreshing notices"
        )

        with _lock:

            _notice_cache["error"] = str(exc)
            _notice_cache["lastUpdated"] = utc_now_iso()


# ============================================================
# BACKGROUND SCHEDULER
# ============================================================

scheduler = None


def start_scheduler():
    """
    Start APScheduler for automatic notice refreshing.
    """

    global scheduler

    if scheduler is not None:
        return

    scheduler = BackgroundScheduler(
        daemon=True,
        timezone="UTC",
    )

    scheduler.add_job(
        refresh_notice_cache,
        trigger="interval",
        seconds=REFRESH_INTERVAL_SECONDS,
        id="notice_refresh",
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc),
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()

    logger.info(
        "Notice scheduler started. "
        "Refresh interval: %s seconds",
        REFRESH_INTERVAL_SECONDS,
    )


# ============================================================
# JSON HELPERS
# ============================================================

def read_json(path):
    """
    Read JSON data from a file.
    """

    try:

        with open(
            path,
            "r",
            encoding="utf-8",
        ) as file:

            return json.load(file)

    except FileNotFoundError:

        logger.error(
            "JSON file not found: %s",
            path,
        )

        return {}

    except json.JSONDecodeError as exc:

        logger.error(
            "Invalid JSON in %s: %s",
            path,
            exc,
        )

        return {}


def write_json(path, data):
    """
    Write JSON data safely to disk.
    """

    directory = os.path.dirname(path)

    if directory:

        os.makedirs(
            directory,
            exist_ok=True,
        )

    temp_path = f"{path}.tmp"

    with open(
        temp_path,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
            ensure_ascii=False,
        )

    os.replace(
        temp_path,
        path,
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    return jsonify(
        {
            "status": "ok",
            "time": utc_now_iso(),
        }
    )


# ============================================================
# NOTICES
# ============================================================

@app.get("/api/notices")
def get_notices():

    with _lock:

        payload = dict(_notice_cache)

    payload[
        "refreshIntervalSeconds"
    ] = REFRESH_INTERVAL_SECONDS

    return jsonify(payload)


@app.post("/api/notices/refresh")
def force_refresh_notices():

    refresh_notice_cache()

    with _lock:

        payload = dict(_notice_cache)

    payload[
        "refreshIntervalSeconds"
    ] = REFRESH_INTERVAL_SECONDS

    return jsonify(payload)


# ============================================================
# ROUTINE
# ============================================================

@app.get("/api/routine")
def get_routine():

    return jsonify(
        read_json(ROUTINE_PATH)
    )


@app.put("/api/routine")
def update_routine():

    """
    Replace the complete routine.

    Required fields:

    {
        "days": [...],
        "slots": [...],
        "classes": [...]
    }
    """

    body = request.get_json(
        force=True,
        silent=True,
    )

    if not isinstance(body, dict):

        return jsonify(
            {
                "error": "Invalid routine payload"
            }
        ), 400

    required_keys = {
        "days",
        "slots",
        "classes",
    }

    missing_keys = (
        required_keys - body.keys()
    )

    if missing_keys:

        return jsonify(
            {
                "error": "Missing required fields",
                "missing": sorted(
                    missing_keys
                ),
            }
        ), 400

    body["lastUpdated"] = utc_now_iso()

    try:

        write_json(
            ROUTINE_PATH,
            body,
        )

    except Exception as exc:

        logger.exception(
            "Failed to save routine: %s",
            exc,
        )

        return jsonify(
            {
                "error": "Failed to save routine"
            }
        ), 500

    return jsonify(body)


# ============================================================
# SEMESTERS
# ============================================================

@app.get("/api/semesters")
def get_semesters():

    return jsonify(
        read_json(SEMESTERS_PATH)
    )


# ============================================================
# TUTORIALS
# ============================================================

@app.get("/api/tutorials")
def get_tutorials():

    return jsonify(
        read_json(TUTORIALS_PATH)
    )


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify(
        {
            "error": "Endpoint not found"
        }
    ), 404


@app.errorhandler(500)
def internal_error(error):

    logger.error(
        "Internal server error: %s",
        error,
    )

    return jsonify(
        {
            "error": "Internal server error"
        }
    ), 500


# ============================================================
# START SCHEDULER
# ============================================================

if os.environ.get(
    "DISABLE_SCHEDULER",
    ""
).lower() != "true":

    start_scheduler()


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":

    logger.info(
        "Starting StudyHub backend on port %s",
        PORT,
    )

    app.run(
        host="0.0.0.0",
        port=PORT,
        debug=False,
        use_reloader=False,
    )
