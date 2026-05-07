# Apify TikTok creator screener (stdlib). CLI: APIFY_TOKEN=... python tools/apify_creator_screener.py --handles ...
# Default actor: clockworks/tiktok-profile-scraper

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

DEFAULT_ACTOR = "clockworks/tiktok-profile-scraper"


def _must_env(name: str) -> str:
    v = os.environ.get(name)
    if not v:
        raise SystemExit("Missing environment variable: %s" % name)
    return v


def _http_json(method: str, url: str, payload: Optional[dict] = None, timeout: int = 120) -> Any:
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url=url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise SystemExit("HTTP %s %s\n%s" % (e.code, url, body)) from e


def apify_run_actor(token: str, actor_id: str, actor_input: dict, wait_secs: int = 900) -> list:
    q = urllib.parse.urlencode({"token": token})
    run_url = (
        "https://api.apify.com/v2/acts/"
        + urllib.parse.quote(actor_id, safe="")
        + "/runs?"
        + q
    )
    run_json = _http_json("POST", run_url, actor_input or {})
    run_id = run_json.get("data", {}).get("id")
    if not run_id:
        raise SystemExit("Apify: missing run id in response")

    # Apify blocks on GET /v2/actor-runs/:id?waitForFinish=... (max 60s per request).
    # There is no /wait-for-finish path (that URL returns HTTP 404).
    deadline = time.time() + max(30, wait_secs)
    data = {}
    while True:
        if time.time() > deadline:
            raise SystemExit("Apify wait timeout after %ss (run id %s)" % (wait_secs, run_id))
        wf = min(60, max(1, int(deadline - time.time())))
        get_run_url = (
            "https://api.apify.com/v2/actor-runs/"
            + urllib.parse.quote(run_id, safe="")
            + "?"
            + urllib.parse.urlencode({"token": token, "waitForFinish": wf})
        )
        wait_json = _http_json("GET", get_run_url, timeout=wf + 45)
        data = wait_json.get("data", {}) or {}
        status = data.get("status")
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break

    status = data.get("status")
    if status != "SUCCEEDED":
        raise SystemExit("Apify run status=%r run_id=%s" % (status, run_id))

    dataset_id = data.get("defaultDatasetId")
    if not dataset_id:
        raise SystemExit("Apify: missing defaultDatasetId")

    items_url = (
        "https://api.apify.com/v2/datasets/"
        + urllib.parse.quote(dataset_id, safe="")
        + "/items?"
        + urllib.parse.urlencode({"token": token, "clean": "true", "format": "json"})
    )
    out = _http_json("GET", items_url)
    return out if isinstance(out, list) else []


def _parse_handles(path: Optional[Path], inline: list) -> list:
    raw = []
    if path:
        text = path.read_text(encoding="utf-8", errors="replace")
        for line in text.splitlines():
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            raw.append(s)
    for h in inline:
        s = str(h).strip().lstrip("@")
        if s:
            raw.append(s)
    out = []
    seen = set()
    for h in raw:
        key = h.lstrip("@").strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(h.lstrip("@").strip())
    return out


def _num(v) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def _video_ts(item: dict) -> Optional[float]:
    t = item.get("createTimeISO") or item.get("createTime")
    if t is None:
        return None
    if isinstance(t, (int, float)):
        return float(t)
    if isinstance(t, str):
        try:
            s = t
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            return datetime.fromisoformat(s).timestamp()
        except ValueError:
            return None
    return None


def analyze_profile(
    username: str,
    items: list,
    window_start: float,
    threshold_mode: str,
    min_followers: int,
) -> dict:
    fans = None
    bio = ""
    for it in items:
        am = it.get("authorMeta") or {}
        if isinstance(am, dict):
            if fans is None:
                fans = _num(am.get("fans"))
            if not bio:
                bio = (am.get("signature") or am.get("nickName") or "") or ""

    plays_in_window = []
    texts_recent = []
    last_ts = None

    for it in items:
        ts = _video_ts(it)
        if ts is None:
            continue
        last_ts = ts if last_ts is None else max(last_ts, ts)
        if ts >= window_start:
            pc = _num(it.get("playCount"))
            if pc is not None:
                plays_in_window.append(pc)
            cap = (it.get("text") or "")[:500]
            if cap:
                texts_recent.append(cap)

    avg_play = (
        sum(plays_in_window) / len(plays_in_window) if plays_in_window else None
    )
    followers = fans or 0
    ratio_needed = 1.0 if threshold_mode == "tiktok" else 0.5
    threshold_views = followers * ratio_needed

    passes_followers = followers > min_followers
    passes_views = (
        avg_play is not None
        and followers > 0
        and avg_play > threshold_views
        and len(plays_in_window) > 0
    )

    last_post_iso = None
    if last_ts is not None:
        last_post_iso = datetime.fromtimestamp(last_ts, tz=timezone.utc).isoformat()

    return {
        "username": username,
        "followers": followers,
        "bio": bio.replace("\n", " ")[:300],
        "posts_in_window": len(plays_in_window),
        "avg_play_in_window": round(avg_play, 2) if avg_play is not None else None,
        "threshold_mode": threshold_mode,
        "required_avg_for_rule": round(threshold_views, 2),
        "last_post_at": last_post_iso,
        "pass_min_followers": passes_followers,
        "pass_view_rule": passes_views,
        "pass_all": bool(passes_followers and passes_views),
        "recent_captions_sample": " | ".join(texts_recent[:3])[:400],
    }


def match_keywords(bio: str, captions_blob: str, kws: list) -> bool:
    hay = ("%s\n%s" % (bio, captions_blob)).lower()
    return any(k.strip().lower() in hay for k in kws if k.strip())


def screen_creators(
    token: str,
    handles: list,
    *,
    actor: Optional[str] = None,
    results_per_page: int = 80,
    days: int = 30,
    min_followers: int = 1000,
    threshold: str = "tiktok",
    chunk_size: int = 25,
    wait_secs: int = 900,
    keywords: Optional[str] = None,
) -> list:
    if not token or not str(token).strip():
        raise ValueError("missing Apify token")
    actor_id = actor or os.environ.get("APIFY_ACTOR_TIKTOK") or DEFAULT_ACTOR
    kws = [x for x in (keywords or "").split(",") if x.strip()]
    window_start = (datetime.now(timezone.utc) - timedelta(days=days)).timestamp()
    actor_input_base = {
        "shouldDownloadCovers": False,
        "shouldDownloadSlideshowImages": False,
        "shouldDownloadSubtitles": False,
        "shouldDownloadVideos": False,
        "resultsPerPage": max(1, min(int(results_per_page), 200)),
    }
    all_rows: list = []
    for i in range(0, len(handles), chunk_size):
        chunk = handles[i : i + chunk_size]
        inp = dict(actor_input_base)
        inp["profiles"] = chunk
        t0 = time.perf_counter()
        items = apify_run_actor(token, actor_id, inp, wait_secs=wait_secs)
        elapsed = time.perf_counter() - t0
        by_user = defaultdict(list)
        for it in items:
            am = it.get("authorMeta") or {}
            u = None
            if isinstance(am, dict):
                u = am.get("name")
            if not u:
                u = it.get("input")
            if isinstance(u, str):
                by_user[u.lstrip("@").lower()].append(it)
        for h in chunk:
            key = h.lstrip("@").lower()
            prof_items = by_user.get(key, [])
            row = analyze_profile(
                h,
                prof_items,
                window_start,
                threshold,
                min_followers,
            )
            row["keyword_matched"] = (
                match_keywords(row["bio"], row["recent_captions_sample"], kws)
                if kws
                else None
            )
            row["apify_chunk_sec"] = round(elapsed, 2)
            row["actor"] = actor_id
            all_rows.append(row)
    return all_rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Screen creators via Apify TikTok profile scraper")
    parser.add_argument("--handles", type=Path, help="One handle per line")
    parser.add_argument("extra_handles", nargs="*", help="Usernames")
    parser.add_argument("--actor", default=os.environ.get("APIFY_ACTOR_TIKTOK", DEFAULT_ACTOR))
    parser.add_argument("--results-per-page", type=int, default=80)
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--min-followers", type=int, default=1000)
    parser.add_argument("--threshold", choices=("tiktok", "other"), default="tiktok")
    parser.add_argument("--chunk-size", type=int, default=25)
    parser.add_argument("--wait-secs", type=int, default=900)
    parser.add_argument("--keywords", help="Comma-separated substrings")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    handles = _parse_handles(args.handles, list(args.extra_handles))
    if not handles:
        raise SystemExit("No handles")

    token = _must_env("APIFY_TOKEN")
    all_rows = screen_creators(
        token,
        handles,
        actor=args.actor,
        results_per_page=args.results_per_page,
        days=args.days,
        min_followers=args.min_followers,
        threshold=args.threshold,
        chunk_size=args.chunk_size,
        wait_secs=args.wait_secs,
        keywords=args.keywords,
    )

    if args.json:
        print(json.dumps(all_rows, ensure_ascii=False, indent=2))
        return

    if not all_rows:
        return
    fields = list(all_rows[0].keys())
    writer = csv.DictWriter(sys.stdout, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for row in all_rows:
        writer.writerow(row)


if __name__ == "__main__":
    main()
