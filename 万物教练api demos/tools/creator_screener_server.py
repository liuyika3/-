# Local web UI for Apify TikTok creator screener.
# Run from repo root: python tools/creator_screener_server.py
# Open http://127.0.0.1:5180/

from __future__ import annotations

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "creator_screener_index.html"
PORT = int(os.environ.get("PORT", "5180"))
MAX_HANDLES = 60

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apify_creator_screener import _parse_handles, screen_creators  # noqa: E402


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, code: int, obj: dict):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(raw)

    def _send_bytes(self, code: int, ctype: str, raw: bytes):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            if not INDEX.exists():
                return self._send_json(
                    500,
                    {"ok": False, "error": "missing tools/creator_screener_index.html"},
                )
            return self._send_bytes(200, "text/html; charset=utf-8", INDEX.read_bytes())
        if path.startswith("/api/health"):
            return self._send_json(200, {"ok": True})
        return self._send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/api/screen"):
            return self._send_json(404, {"ok": False, "error": "not found"})
        try:
            n = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(n) if n > 0 else b"{}"
            payload = json.loads(body.decode("utf-8"))
        except Exception as e:
            return self._send_json(400, {"ok": False, "error": "invalid json: %s" % e})

        token = (payload.get("apifyToken") or "").strip()
        raw_handles = (payload.get("handles") or "").strip()
        if not token:
            return self._send_json(400, {"ok": False, "error": "apifyToken required"})
        if not raw_handles:
            return self._send_json(400, {"ok": False, "error": "handles required"})

        lines = [ln for ln in raw_handles.splitlines() if ln.strip()]
        handles = _parse_handles(None, lines)
        if not handles:
            return self._send_json(400, {"ok": False, "error": "no valid handles"})
        if len(handles) > MAX_HANDLES:
            return self._send_json(
                400,
                {"ok": False, "error": "too many handles (max %s)" % MAX_HANDLES},
            )

        threshold = payload.get("threshold") or "tiktok"
        if threshold not in ("tiktok", "other"):
            return self._send_json(400, {"ok": False, "error": "threshold must be tiktok or other"})

        try:
            rows = screen_creators(
                token,
                handles,
                actor=(payload.get("actor") or "").strip() or None,
                results_per_page=int(payload.get("resultsPerPage") or 80),
                days=int(payload.get("days") or 30),
                min_followers=int(payload.get("minFollowers") or 1000),
                threshold=threshold,
                chunk_size=int(payload.get("chunkSize") or 25),
                wait_secs=int(payload.get("waitSecs") or 900),
                keywords=(payload.get("keywords") or "").strip() or None,
            )
        except ValueError as e:
            return self._send_json(400, {"ok": False, "error": str(e)})
        except SystemExit as e:
            return self._send_json(502, {"ok": False, "error": str(e)})
        except Exception as e:
            return self._send_json(
                502,
                {"ok": False, "error": str(e), "trace": traceback.format_exc()},
            )

        return self._send_json(200, {"ok": True, "rows": rows, "count": len(rows)})


def main() -> None:
    httpd = HTTPServer(("127.0.0.1", PORT), Handler)
    print("Open http://127.0.0.1:%s/  (Ctrl+C to stop)" % PORT)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
