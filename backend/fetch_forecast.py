#!/usr/bin/env python3
"""Fetch wind + wave forecast from Open-Meteo and write today.json and week.json."""

import json
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import math

import numpy as np
import openmeteo_requests
import requests_cache
from retry_requests import retry
from pytides.tide import Tide
from pytides.constituent import noaa as ALL_CONSTITUENTS

KMH_TO_KN = 0.539957

SPOTS = [
    {"slug": "ijmuiden",      "name": "IJmuiden",      "lat": 52.456281, "lon": 4.559704, "active": True},
    {"slug": "wijk-aan-zee",  "name": "Wijk aan Zee",  "lat": 52.482630, "lon": 4.581581, "active": True},
    {"slug": "schellinkhout", "name": "Schellinkhout", "lat": 52.633241, "lon": 5.121027, "active": True},
    {"slug": "kijkduin",      "name": "Kijkduin",      "lat": 52.052664, "lon": 4.195335, "active": True},
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")

# IJmuiden (IJMH) harmonic constituents from IHO, referenced to NAP.
# Format: (constituent_name, amplitude_m, phase_deg)
_IJMUIDEN_CONSTITUENTS = [
    ("M2",  0.726, 114.0),
    ("S2",  0.176, 152.0),
    ("N2",  0.139,  97.0),
    ("K2",  0.048, 152.0),
    ("K1",  0.077, 210.0),
    ("O1",  0.027, 178.0),
    ("P1",  0.025, 210.0),
    ("Q1",  0.006, 161.0),
    ("Mf",  0.012,   0.0),
    ("Mm",  0.007,   0.0),
    ("Ssa", 0.047,   0.0),
]

_AMSTERDAM = ZoneInfo("Europe/Amsterdam")

_TIDE_MODEL = None


def _get_tide_model():
    global _TIDE_MODEL
    if _TIDE_MODEL is not None:
        return _TIDE_MODEL
    constituent_map = {c.name: c for c in ALL_CONSTITUENTS}
    constituents = []
    amplitudes = []
    phases = []
    for name, amp, phase in _IJMUIDEN_CONSTITUENTS:
        if name in constituent_map:
            constituents.append(constituent_map[name])
            amplitudes.append(amp)
            phases.append(phase)
    _TIDE_MODEL = Tide(constituents=constituents, amplitudes=amplitudes, phases=phases)
    return _TIDE_MODEL


def compute_tides(start_date: datetime, days: int = 7) -> dict:
    """
    Compute astronomical tide extrema for IJmuiden for `days` days starting at start_date.
    Returns {date_str: [{"time": "HH:MM", "heightM": float, "type": "high"|"low"}, ...]}
    """
    tide = _get_tide_model()
    ams_midnight = start_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=_AMSTERDAM)

    # Generate heights every 10 minutes for the full window to find accurate extrema
    total_minutes = days * 24 * 60
    step_minutes = 10
    n_steps = total_minutes // step_minutes + 1
    times = [ams_midnight + timedelta(minutes=i * step_minutes) for i in range(n_steps)]
    times_utc = [t.astimezone(timezone.utc).replace(tzinfo=None) for t in times]

    heights = tide.at(times_utc)

    # Find local extrema by scanning for direction changes
    tides_by_date: dict = {}
    prev_direction = None
    for i in range(1, len(heights) - 1):
        direction = heights[i] - heights[i - 1]
        if prev_direction is not None:
            if prev_direction > 0 and direction <= 0:
                kind = "high"
            elif prev_direction < 0 and direction >= 0:
                kind = "low"
            else:
                prev_direction = direction
                continue
            local_t = times[i].astimezone(_AMSTERDAM)
            date_str = local_t.strftime("%Y-%m-%d")
            entry = {
                "time": local_t.strftime("%H:%M"),
                "heightM": round(float(heights[i]), 2),
                "type": kind,
            }
            tides_by_date.setdefault(date_str, []).append(entry)
        prev_direction = direction

    return tides_by_date


def _safe(arr, i, decimals):
    """Return rounded float from arr[i], or 0.0 if out of bounds or NaN."""
    if i >= len(arr):
        return 0.0
    v = float(arr[i])
    return round(v, decimals) if not math.isnan(v) else 0.0


def make_client():
    session = requests_cache.CachedSession(".cache_forecast", expire_after=3600)
    session = retry(session, retries=5, backoff_factor=0.2)
    return openmeteo_requests.Client(session=session)


def fetch_spot(client, spot):
    lat, lon = spot["lat"], spot["lon"]

    # --- Wind + weather forecast ---
    wind_resp = client.weather_api("https://api.open-meteo.com/v1/forecast", params={
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
            "temperature_2m", "precipitation", "cloud_cover",
        ],
        "current": ["wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"],
        "models": "knmi_seamless",
        "forecast_days": 7,
        "timezone": "Europe/Amsterdam",
    })[0]

    # --- Marine / wave forecast ---
    wave_resp = client.weather_api("https://marine-api.open-meteo.com/v1/marine", params={
        "latitude": lat,
        "longitude": lon,
        "hourly": ["wave_height", "wave_period"],
        "forecast_days": 7,
        "timezone": "Europe/Amsterdam",
    })[0]

    # Current conditions
    c = wind_resp.Current()
    current = {
        "windKn": round(c.Variables(0).Value() * KMH_TO_KN, 1),
        "gustKn": round(c.Variables(2).Value() * KMH_TO_KN, 1),
        "dirDeg": round(c.Variables(1).Value()),
    }

    # Hourly arrays
    wh = wind_resp.Hourly()
    speeds = wh.Variables(0).ValuesAsNumpy()
    dirs = wh.Variables(1).ValuesAsNumpy()
    gusts = wh.Variables(2).ValuesAsNumpy()
    temps = wh.Variables(3).ValuesAsNumpy()
    rain = wh.Variables(4).ValuesAsNumpy()
    cloud = wh.Variables(5).ValuesAsNumpy()

    mh = wave_resp.Hourly()
    wave_heights = mh.Variables(0).ValuesAsNumpy()
    wave_periods = mh.Variables(1).ValuesAsNumpy()

    # Build timestamps — Open-Meteo returns a start time + interval
    start = wh.Time()
    interval = wh.Interval()
    n = len(speeds)
    timestamps = [
        datetime.fromtimestamp(start + i * interval, tz=timezone.utc).astimezone()
        for i in range(n)
    ]

    # Today's date in local time
    today_str = datetime.now().strftime("%Y-%m-%d")
    generated_at = datetime.now().astimezone().isoformat(timespec="seconds")

    hourly_all = []
    today_hourly = []

    for i in range(n):
        ts = timestamps[i]
        iso = ts.strftime("%Y-%m-%dT%H:%M")
        date_str = ts.strftime("%Y-%m-%d")
        hour = ts.hour

        entry = {
            "iso": iso,
            "windKn": round(float(speeds[i]) * KMH_TO_KN, 1),
            "gustKn": round(float(gusts[i]) * KMH_TO_KN, 1),
            "dirDeg": round(float(dirs[i])),
            "waveM": _safe(wave_heights, i, 2),
            "wavePeriodS": _safe(wave_periods, i, 1),
            "tempC": round(float(temps[i]), 1),
            "rainMm": round(float(rain[i]), 2),
            "cloudPct": round(float(cloud[i])),
        }
        if date_str >= today_str:
            hourly_all.append(entry)

        if date_str == today_str:
            today_hourly.append({
                "hour": hour,
                "forecastWindKn": entry["windKn"],
                "forecastGustKn": entry["gustKn"],
                "dirDeg": entry["dirDeg"],
                "waveM": entry["waveM"],
                "wavePeriodS": entry["wavePeriodS"],
                "tempC": entry["tempC"],
                "rainMm": entry["rainMm"],
                "cloudPct": entry["cloudPct"],
            })

    tides_by_date = compute_tides(datetime.now(tz=_AMSTERDAM), days=7)

    return {
        "today": {
            "spot": spot["name"],
            "generatedAt": generated_at,
            "current": current,
            "hourly": today_hourly,
        },
        "week": {
            "spot": spot["name"],
            "generatedAt": generated_at,
            "forecast": hourly_all,
            "tidesByDate": tides_by_date,
        },
    }


def main():
    client = make_client()

    for spot in SPOTS:
        if not spot["active"]:
            continue

        print(f"Fetching {spot['name']}...")
        data = fetch_spot(client, spot)

        out_dir = os.path.join(OUTPUT_DIR, spot["slug"])
        os.makedirs(out_dir, exist_ok=True)

        today_path = os.path.join(out_dir, "today.json")
        week_path = os.path.join(out_dir, "week.json")

        with open(today_path, "w") as f:
            json.dump(data["today"], f, indent=2)

        with open(week_path, "w") as f:
            json.dump(data["week"], f, indent=2)

        print(f"  today.json: {len(data['today']['hourly'])} hourly entries")
        print(f"  week.json:  {len(data['week']['forecast'])} hourly entries")
        print(f"  current: {data['today']['current']}")
        print(f"  Written to {out_dir}")


if __name__ == "__main__":
    main()
