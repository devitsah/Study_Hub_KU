# StudyHub

A full-stack student dashboard for Kathmandu University CS students, built with
**Angular** (frontend) and **Flask** (backend).

## Features

- **Live KU notices** — the Flask backend scrapes KU's "Highlights for
  Students" page (`https://ku.edu.np/news-app?search_category=5&search_school=10&search_site_name=kuhome`)
  every **60 seconds** in a background thread and caches the result. The
  Angular app polls `/api/notices` every 60 seconds so notices update
  automatically without a page refresh. There's also a manual "Refresh now"
  button.
- **Editable class routine** — the routine (subject, teacher, room, day,
  time, color) is stored as JSON on the backend. Click **"Edit Routine"** on
  the Routine page to add, edit, delete classes, rename time slots, or add
  new time slots — then **Save Changes** to persist it, so whenever your
  actual schedule changes you can update it yourself instead of it being
  hard-coded.
- **All Semesters** — each semester card links straight to that semester's
  Google Drive folder (since the subjects differ every semester, there's no
  point hard-coding a subject list — clicking a card just opens the right
  Drive folder in a new tab). 8th semester is marked "Coming soon" until you
  add a link.

## Project layout

```
studyhub/
├── backend/                 Flask API
│   ├── app.py                Routes + background scheduler
│   ├── scraper.py             KU notice scraper
│   ├── requirements.txt
│   ├── run.sh                 Convenience start script
│   └── data/
│       ├── routine.json       Editable routine (persisted here)
│       └── semesters.json     Semester -> Google Drive link map
└── frontend/                 Angular app (standalone components, Angular 17)
    ├── src/app/
    │   ├── components/
    │   │   ├── sidebar/        Dark sidebar nav (matches the design)
    │   │   ├── dashboard/      Home page: notices + routine + semesters
    │   │   ├── notices-page/   Full notices list with filter
    │   │   └── routine/        Full editable routine page
    │   ├── services/           HTTP calls to the Flask API
    │   └── models/             TypeScript interfaces
    └── proxy.conf.json         Forwards /api/* to http://localhost:5000
```

## Running it

### 1. Backend (Flask)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API starts on `http://localhost:5000`. On boot it immediately scrapes KU
once, then re-scrapes every 60 seconds. Check it's alive:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/notices
```

(Or just run `./run.sh` which does the venv + install + start for you.)

### 2. Frontend (Angular)

```bash
cd frontend
npm install
npm start        # ng serve, proxies /api to the Flask server on :5000
```

Visit `http://localhost:4200`.

> The frontend was authored by hand (no `ng new` scaffold was run in this
> environment), so the very first `npm install` will pull down Angular's
> CLI/build tooling from npm — that's normal and only happens once.

## Notes on the notice scraper

KU's site doesn't expose a public JSON API for notices, and the HTML
doesn't have stable/documented class names, so `scraper.py` uses a
resilient heuristic (find links to notice detail pages, then look for a
nearby thumbnail `<img>` and a `YYYY-MM-DD` date in the surrounding markup).
If KU redesigns the page and the scraper starts returning empty results,
the API keeps serving the last successful result rather than showing
nothing, and logs the error server-side — check the Flask console output
first if notices stop updating.

## Customizing

- **Routine**: don't hand-edit `data/routine.json` unless the app is
  stopped — just use the in-app "Edit Routine" screen once it's running,
  since edits there are saved straight back to that file.
- **Semester Drive links**: edit `data/semesters.json` directly (id, name,
  driveLink, color) — e.g. fill in the 8th semester once that folder exists.
- **Refresh interval**: change `REFRESH_INTERVAL_SECONDS` in `backend/app.py`
  and `POLL_INTERVAL_MS` in `frontend/src/app/services/notice.service.ts`
  (keep them equal).
