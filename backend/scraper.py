"""
scraper.py
----------
Scrapes the "Highlights for Students" notice list from the Kathmandu
University website and normalizes it into a simple JSON-friendly shape.

KU's site is server-rendered (no JS needed to see the list), so a plain
requests + BeautifulSoup scrape works. The markup does not expose stable
CSS class names for automated tooling, so we use a resilient heuristic:

  1. Find every <a> that points to a notice detail page
     (href contains "/news-app/" and a query string with search_category).
  2. Use the anchor text as the title (skipping "more" / image-only links).
  3. Walk a few parent levels up to find the nearest <img> (thumbnail).
  4. Search the surrounding HTML for a YYYY-MM-DD date pattern.

If KU changes their markup this heuristic may need adjusting, but it
degrades gracefully -- worst case some fields come back as null rather
than the whole scrape failing.
"""

import re
import logging
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("studyhub.scraper")

KU_LIST_URL = (
    "https://ku.edu.np/news-app"
    "?search_category=5&search_school=10&search_site_name=kuhome"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}

DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
SKIP_TEXT = {"", "more", "view details", "view all"}


def _find_nearby_image(anchor):
    """Walk up a few parent levels looking for an <img> thumbnail."""
    node = anchor
    for _ in range(5):
        if node is None:
            break
        img = node.find("img") if hasattr(node, "find") else None
        if img and img.get("src"):
            return img["src"]
        node = node.parent
    return None


def _find_nearby_date(anchor):
    """Search the anchor's ancestor blocks for a YYYY-MM-DD date."""
    node = anchor.parent
    for _ in range(4):
        if node is None:
            break
        match = DATE_RE.search(str(node))
        if match:
            return match.group(0)
        node = node.parent
    return None


def _clean_href(href: str) -> str:
    if href.startswith("http"):
        return href
    if not href.startswith("/"):
        href = "/" + href
    return f"https://ku.edu.np{href}"


def fetch_notices(limit: int = 12, timeout: int = 15):
    """Fetch and parse the current Highlights-for-Students notice list."""
    response = requests.get(KU_LIST_URL, headers=HEADERS, timeout=timeout)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    notices = []
    seen_links = set()

    candidate_anchors = [
        a
        for a in soup.find_all("a", href=True)
        if "/news-app/" in a["href"] and "search_category" in a["href"]
    ]

    for anchor in candidate_anchors:
        href = anchor["href"]
        if href in seen_links:
            continue

        text = anchor.get_text(strip=True)
        if text.lower() in SKIP_TEXT:
            continue

        seen_links.add(href)

        notices.append(
            {
                "title": text,
                "link": _clean_href(href),
                "image": _find_nearby_image(anchor),
                "date": _find_nearby_date(anchor),
            }
        )

        if len(notices) >= limit:
            break

    return notices


def fetch_notices_safe(limit: int = 12):
    """Same as fetch_notices but never raises -- returns (data, error)."""
    try:
        data = fetch_notices(limit=limit)
        return data, None
    except Exception as exc:  # noqa: BLE001 - want to surface any failure
        logger.exception("Failed to fetch KU notices")
        return [], str(exc)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
