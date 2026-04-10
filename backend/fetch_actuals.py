#!/usr/bin/env python3
"""Fetch 10-minute wind observations from KNMI EDR API and write current.json."""

import json
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import requests

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

MS_TO_KN = 1.94384

EDR_BASE = "https://api.dataplatform.knmi.nl/edr/v1/collections/10-minute-in-situ-meteorological-observations"

# ff = 10-min mean wind speed (m/s, 10m representative)
# dd = 10-min mean wind direction (degrees)
# gff = 10-min max wind gust (m/s, 10m representative)
PARAMETERS = "ff,dd,gff"

SPOTS = [
    {"slug": "ijmuiden",      "name": "IJmuiden",      "lat": 52.456281, "lon": 4.559704, "active": True,  "station_id": "0-20000-0-06225"},
    {"slug": "wijk-aan-zee",  "name": "Wijk aan Zee",  "lat": 52.482630, "lon": 4.581581, "active": True,  "station_id": "0-20000-0-06225"},
    {"slug": "schellinkhout", "name": "Schellinkhout", "lat": 52.633241, "lon": 5.121027, "active": True,  "station_id": "0-20000-0-06235"},
    {"slug": "kijkduin",      "name": "Kijkduin",      "lat": 52.052664, "lon": 4.195335, "active": True,  "station_id": "0-20000-0-06290"},
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

AMSTERDAM_TZ = ZoneInfo("Europe/Amsterdam")


def fetch_actuals(api_key: str, spot: dict) -> dict:
    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)

    datetime_param = (
        f"{today_utc.strftime('%Y-%m-%dT%H:%MZ')}"
        f"/{now_utc.strftime('%Y-%m-%dT%H:%MZ')}"
    )

    url = f"{EDR_BASE}/locations/{spot['station_id']}"
    params = {
        "parameter-name": PARAMETERS,
        "datetime": datetime_param,
        "f": "CoverageJSON",
    }
    headers = {"Authorization": f"Bearer {api_key}"}

    resp = requests.get(url, params=params, headers=headers, timeout=30)
    if resp.status_code != 200:
        print(f"EDR API error {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
        sys.exit(1)

    data = resp.json()

    # Response is a CoverageCollection with one coverage per station
    coverages = data.get("coverages", [])
    if not coverages:
        print("No coverage data returned from EDR API.", file=sys.stderr)
        sys.exit(1)

    coverage = coverages[0]
    domain = coverage.get("domain", {})
    axes = domain.get("axes", {})
    timestamps = axes.get("t", {}).get("values", [])

    ranges = coverage.get("ranges", {})
    ff_vals = ranges.get("ff", {}).get("values", [])   # wind speed m/s
    dd_vals = ranges.get("dd", {}).get("values", [])   # direction degrees
    gff_vals = ranges.get("gff", {}).get("values", []) # gust m/s

    actuals = []
    for i, ts_str in enumerate(timestamps):
        ts_utc = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        ts_local = ts_utc.astimezone(AMSTERDAM_TZ)
        time_label = ts_local.strftime("%H:%M")

        speed_ms = ff_vals[i] if i < len(ff_vals) else None
        gust_ms = gff_vals[i] if i < len(gff_vals) else None
        dir_deg = dd_vals[i] if i < len(dd_vals) else None

        actuals.append({
            "time": time_label,
            "windKn": round(speed_ms * MS_TO_KN, 1) if speed_ms is not None else None,
            "gustKn": round(gust_ms * MS_TO_KN, 1) if gust_ms is not None else None,
            "dirDeg": round(dir_deg) if dir_deg is not None else None,
        })

    # Current = most recent observation with non-null wind speed
    current_obs = next(
        (a for a in reversed(actuals) if a["windKn"] is not None),
        actuals[-1] if actuals else None,
    )
    current = {
        "windKn": current_obs["windKn"] if current_obs else None,
        "gustKn": current_obs["gustKn"] if current_obs else None,
        "dirDeg": current_obs["dirDeg"] if current_obs else None,
    }

    generated_at = datetime.now().astimezone().isoformat(timespec="seconds")

    return {
        "spot": spot["name"],
        "generatedAt": generated_at,
        "current": current,
        "actuals": actuals,
    }


def main():
    api_key = os.environ.get("EDR_API_KEY")
    if not api_key:
        print("EDR_API_KEY not set. Export it or add it to .env.", file=sys.stderr)
        sys.exit(1)

    for spot in SPOTS:
        if not spot["active"]:
            continue

        print(f"Fetching actuals for {spot['name']}...")
        data = fetch_actuals(api_key, spot)

        out_dir = os.path.join(OUTPUT_DIR, spot["slug"])
        os.makedirs(out_dir, exist_ok=True)

        out_path = os.path.join(out_dir, "current.json")
        with open(out_path, "w") as f:
            json.dump(data, f, indent=2)

        print(f"  {len(data['actuals'])} observations written")
        print(f"  current: {data['current']}")
        print(f"  Written to {out_path}")


if __name__ == "__main__":
    main()
