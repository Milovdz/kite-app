#!/usr/bin/env python3
"""Fetch wind + wave forecast from Open-Meteo and write today.json and week.json."""

import json
import os
from datetime import datetime, timezone

import math

import openmeteo_requests
import requests_cache
from retry_requests import retry

KMH_TO_KN = 0.539957

SPOTS = [
    {"slug": "ijmuiden", "name": "IJmuiden", "lat": 52.482630, "lon": 4.581581, "active": True},
    {"slug": "schellinkhout", "name": "Schellinkhout", "lat": 52.658889, "lon": 5.241944, "active": False},
    {"slug": "kijkduin", "name": "Kijkduin", "lat": 52.044444, "lon": 4.224722, "active": False},
    {"slug": "brouwersdam", "name": "Brouwersdam", "lat": 51.741667, "lon": 3.883333, "active": False},
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")


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
            "temperature_2m", "precipitation",
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

    mh = wave_resp.Hourly()
    wave_heights = mh.Variables(0).ValuesAsNumpy()
    wave_periods = mh.Variables(1).ValuesAsNumpy()

    # Build timestamps — Open-Meteo returns a start time + interval
    import numpy as np
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
        }
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
            })

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
