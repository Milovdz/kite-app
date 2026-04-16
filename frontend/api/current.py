from http.server import BaseHTTPRequestHandler
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from urllib.parse import urlparse, parse_qs
import json
import os
import urllib.request

MS_TO_KN = 1.94384
AMSTERDAM_TZ = ZoneInfo("Europe/Amsterdam")
EDR_BASE = "https://api.dataplatform.knmi.nl/edr/v1/collections/10-minute-in-situ-meteorological-observations"

STATION_IDS = {
    "ijmuiden":      "0-20000-0-06225",
    "wijk-aan-zee":  "0-20000-0-06225",
    "schellinkhout": "0-20000-0-06235",
    "kijkduin":      "0-20000-0-06290",
}

SPOT_NAMES = {
    "ijmuiden":      "IJmuiden",
    "wijk-aan-zee":  "Wijk aan Zee",
    "schellinkhout": "Schellinkhout",
    "kijkduin":      "Kijkduin",
}


def fetch_actuals(slug: str) -> dict:
    station_id = STATION_IDS[slug]
    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    datetime_param = (
        f"{today_utc.strftime('%Y-%m-%dT%H:%MZ')}"
        f"/{now_utc.strftime('%Y-%m-%dT%H:%MZ')}"
    )

    url = (
        f"{EDR_BASE}/locations/{station_id}"
        f"?parameter-name=ff,dd,gff"
        f"&datetime={datetime_param}"
        f"&f=CoverageJSON"
    )

    api_key = os.environ["EDR_API_KEY"]
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())

    coverages = data.get("coverages", [])
    if not coverages:
        return _empty(slug, now_utc)

    coverage = coverages[0]
    timestamps = coverage["domain"]["axes"]["t"]["values"]
    ranges = coverage.get("ranges", {})
    ff_vals = ranges.get("ff", {}).get("values", [])
    dd_vals = ranges.get("dd", {}).get("values", [])
    gff_vals = ranges.get("gff", {}).get("values", [])

    actuals = []
    for i, ts_str in enumerate(timestamps):
        ts_utc = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        time_label = ts_utc.astimezone(AMSTERDAM_TZ).strftime("%H:%M")
        speed_ms = ff_vals[i] if i < len(ff_vals) else None
        gust_ms = gff_vals[i] if i < len(gff_vals) else None
        dir_deg = dd_vals[i] if i < len(dd_vals) else None
        actuals.append({
            "time": time_label,
            "windKn": round(speed_ms * MS_TO_KN, 1) if speed_ms is not None else None,
            "gustKn": round(gust_ms * MS_TO_KN, 1) if gust_ms is not None else None,
            "dirDeg": round(dir_deg) if dir_deg is not None else None,
        })

    current_obs = next(
        (a for a in reversed(actuals) if a["windKn"] is not None),
        actuals[-1] if actuals else None,
    )
    current = {
        "windKn": current_obs["windKn"] if current_obs else None,
        "gustKn": current_obs["gustKn"] if current_obs else None,
        "dirDeg": current_obs["dirDeg"] if current_obs else None,
    }

    return {
        "spot": SPOT_NAMES[slug],
        "generatedAt": now_utc.astimezone().isoformat(timespec="seconds"),
        "current": current,
        "actuals": actuals,
    }


def _empty(slug: str, now_utc: datetime) -> dict:
    return {
        "spot": SPOT_NAMES[slug],
        "generatedAt": now_utc.astimezone().isoformat(timespec="seconds"),
        "current": None,
        "actuals": [],
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        slug = (qs.get("spot") or ["ijmuiden"])[0]

        if slug not in STATION_IDS:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"unknown spot"}')
            return

        try:
            result = fetch_actuals(slug)
            body = json.dumps(result).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "s-maxage=60, stale-while-revalidate=30")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
