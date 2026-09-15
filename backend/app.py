```python
"""
StudyHub Backend
----------------
Flask API for the StudyHub Angular frontend.

Endpoints
---------
GET  /api/health
GET  /api/notices
POST /api/notices/refresh
GET  /api/routine
PUT  /api/routine
GET  /api/semesters
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


# --------------------------------------------------------------------------
# Logging
# --------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("studyhub.app")


# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")

ROUTINE_PATH = os.path.join(DATA_DIR, "routine.json")
SEMESTERS_PATH = os.path.join(DATA_DIR, "semesters.json")


# Make sure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

# Render provides PORT automatically.
PORT = int(os.environ.get("PORT", 5000))

# Refresh notices every 60 seconds.
REFRESH_INTERVAL_SECONDS = int(
    os.environ.get("REFRESH_INTERVAL_SECONDS", 60)
)

# Frontend URL.
#
# During development you can leave this empty.
#
# On Render, set:
#
# FRONTEND_URL=https://your-site.netlify.app
#
FRONTEND_URL = os.environ.get("FRONTEND_URL", "").strip()


# --------------------------------------------------------------------------
# Flask application
# --------------------------------------------------------------------------

app = Flask(__name__)


# --------------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------------

if FRONTEND_URL:
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    FRONTEND_URL,
                    "http://localhost:4200",
                    "http://127.0.0.1:4200",
                ]
            }
        },
    )

    logger.info("CORS enabled for frontend: %s", FRONTEND_URL)

else:
    # Useful during initial deployment/testing.
    # Once your Netlify URL is known, set FRONTEND_URL in Render.
    CORS(app)

    logger.warning(
        "FRONTEND_URL is not configured. "
        "CORS is currently allowing all origins."
    )


# --------------------------------------------------------------------------
# Thread lock
# --------------------------------------------------------------------------

_lock = threading.Lock()


# --------------------------------------------------------------------------
# Notice cache
# --------------------------------------------------------------------------

_notice_cache = {
    "notices": [],
    "lastUpdated": None,
    "error": None,
}


# --------------------------------------------------------------------------
# Notice scraping
# --------------------------------------------------------------------------

def refresh_notice_cache():
    """
    Fetch latest notices and update the in-memory cache.

    If scraping fails, keep the last successfully fetched notices.
    """

    try:
        logger.info("Refreshing KU notices...")

        notices, error = fetch_notices_safe(limit=12)

        with _lock:

            if notices:
                _notice_cache["notices"] = notices
                _notice_cache["error"] = None

            else:
                # Keep previous successful data if scraping failed.
                _notice_cache["error"] = error

            _notice_cache["lastUpdated"] = utc_now_iso()

        if error:
            logger.warning(
                "Notice refresh completed with error: %s",
                error,
            )
        else:
            logger.info(
                "Notice cache refreshed successfully: %d notices",
                len(notices),
            )

    except Exception as exc:

        logger.exception(
            "Unexpected error while refreshing notices: %s",
            exc,
        )

        with _lock:
            _notice_cache["error"] = str(exc)
            _notice_cache["lastUpdated"] = utc_now_iso()


# --------------------------------------------------------------------------
# Scheduler
# --------------------------------------------------------------------------

scheduler = None


def start_scheduler():
    """
    Start the background scheduler.

    This is kept separate so the scheduler can be controlled safely
    when running behind Gunicorn.
    """

    global scheduler

    # Prevent accidental duplicate schedulers.
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
        "Notice scheduler started. Refresh interval: %s seconds",
        REFRESH_INTERVAL_SECONDS,
    )


# --------------------------------------------------------------------------
# JSON helpers
# --------------------------------------------------------------------------

def read_json(path):
    """
    Read JSON file safely.
    """

    try:

        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)

    except FileNotFoundError:

        logger.error("JSON file not found: %s", path)

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
    Write JSON data to disk.
    """

    directory = os.path.dirname(path)

    if directory:
        os.makedirs(directory, exist_ok=True)

    # Write to a temporary file first, then replace the original.
    # This reduces the chance of leaving a partially-written JSON file.
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

    os.replace(temp_path, path)


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------

@app.get("/api/health")
def health():

    return jsonify(
        {
            "status": "ok",
            "time": utc_now_iso(),
        }
    )


# --------------------------------------------------------------------------
# Notices
# --------------------------------------------------------------------------

@app.get("/api/notices")
def get_notices():

    with _lock:
        payload = dict(_notice_cache)

    payload["refreshIntervalSeconds"] = REFRESH_INTERVAL_SECONDS

    return jsonify(payload)


@app.post("/api/notices/refresh")
def force_refresh_notices():

    refresh_notice_cache()

    with _lock:
        payload = dict(_notice_cache)

    payload["refreshIntervalSeconds"] = REFRESH_INTERVAL_SECONDS

    return jsonify(payload)


# --------------------------------------------------------------------------
# Routine
# --------------------------------------------------------------------------

@app.get("/api/routine")
def get_routine():

    return jsonify(
        read_json(ROUTINE_PATH)
    )


@app.put("/api/routine")
def update_routine():

    """
    Replace the complete routine.

    Expected payload:

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

    missing_keys = required_keys - body.keys()

    if missing_keys:

        return jsonify(
            {
                "error": "Missing required fields",
                "missing": sorted(missing_keys),
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


# --------------------------------------------------------------------------
# Semesters
# --------------------------------------------------------------------------

@app.get("/api/semesters")
def get_semesters():

    return jsonify(
        read_json(SEMESTERS_PATH)
    )


# --------------------------------------------------------------------------
# Error handlers
# --------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(error):

    return jsonify(
        {
            "error": "Endpoint not found"
        }
    ), 404


@app.errorhandler(500)
def internal_error(error):

    logger.exception(
        "Internal server error: %s",
        error,
    )

    return jsonify(
        {
            "error": "Internal server error"
        }
    ), 500


# --------------------------------------------------------------------------
# Start scheduler
# --------------------------------------------------------------------------

# Render/Gunicorn imports this module directly.
#
# Start the scheduler when the application is imported.
#
# If you later use multiple Gunicorn workers, use ONE worker for this
# in-memory cache + scheduler architecture.
#
if os.environ.get("DISABLE_SCHEDULER", "").lower() != "true":
    start_scheduler()


# --------------------------------------------------------------------------
# Local development
# --------------------------------------------------------------------------

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
```
