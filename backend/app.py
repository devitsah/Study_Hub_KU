"""
StudyHub backend
-----------------
Flask API that powers the StudyHub Angular frontend.

Endpoints
  GET  /api/notices          -> latest KU "Highlights for Students" notices
                                 (refreshed automatically every 60 seconds
                                  by a background scheduler)
  POST /api/notices/refresh  -> force an immediate re-scrape
  GET  /api/routine          -> current class routine
  PUT  /api/routine          -> replace/update the routine (fully editable)
  GET  /api/semesters        -> list of semesters + their Google Drive links
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("studyhub.app")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
ROUTINE_PATH = os.path.join(DATA_DIR, "routine.json")
SEMESTERS_PATH = os.path.join(DATA_DIR, "semesters.json")

REFRESH_INTERVAL_SECONDS = 60

app = Flask(__name__)
CORS(app)  # allow the Angular dev server (any origin) to call this API

_lock = threading.Lock()
_notice_cache = {
    "notices": [],
    "lastUpdated": None,
    "error": None,
}


# --------------------------------------------------------------------------
# Notice cache + background refresh
# --------------------------------------------------------------------------
def refresh_notice_cache():
    notices, error = fetch_notices_safe(limit=12)
    with _lock:
        if notices:
            _notice_cache["notices"] = notices
            _notice_cache["error"] = None
        else:
            # keep the last good data if the scrape failed / KU is down
            _notice_cache["error"] = error
        _notice_cache["lastUpdated"] = utc_now_iso()
    if error:
        logger.warning("Notice refresh finished with error: %s", error)
    else:
        logger.info("Notice cache refreshed (%d items)", len(notices))


scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(
    refresh_notice_cache,
    "interval",
    seconds=REFRESH_INTERVAL_SECONDS,
    id="notice_refresh",
    next_run_time=datetime.now(timezone.utc),  # run once immediately on boot
)
scheduler.start()


# --------------------------------------------------------------------------
# Routine persistence helpers
# --------------------------------------------------------------------------
def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "time": utc_now_iso()})


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
    return jsonify(payload)


@app.get("/api/routine")
def get_routine():
    return jsonify(read_json(ROUTINE_PATH))


@app.put("/api/routine")
def update_routine():
    """
    Fully replaces the stored routine. The Angular app sends the entire
    routine object back (days / slots / classes), so whenever a student's
    schedule changes they can edit it in the UI and it's persisted here.
    """
    body = request.get_json(force=True, silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid routine payload"}), 400

    required_keys = {"days", "slots", "classes"}
    if not required_keys.issubset(body.keys()):
        return jsonify({"error": f"Payload must include {required_keys}"}), 400

    body["lastUpdated"] = utc_now_iso()
    write_json(ROUTINE_PATH, body)
    return jsonify(body)


@app.get("/api/semesters")
def get_semesters():
    return jsonify(read_json(SEMESTERS_PATH))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
