#!/usr/bin/env python3
"""
Experiment: compare data freshness between KNMI Open Data file API and EDR API.

Fetches the latest NetCDF file from the Open Data API, extracts the most recent
observation for station 06225 (IJmuiden), then queries the EDR API for the same
station and compares the most recent timestamps from each source.

Usage:
    EDR_API_KEY=... python backend/experiment_open_data_api.py
"""

import os
import sys
import tempfile
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import numpy as np
import requests

try:
    import netCDF4 as nc
except ImportError:
    print("netCDF4 not installed. Run: pip install netCDF4 numpy", file=sys.stderr)
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

AMSTERDAM_TZ = ZoneInfo("Europe/Amsterdam")
MS_TO_KN = 1.94384

OPEN_DATA_BASE = "https://api.dataplatform.knmi.nl/open-data/v1/datasets/10-minute-in-situ-meteorological-observations/versions/1.0"
EDR_BASE = "https://api.dataplatform.knmi.nl/edr/v1/collections/10-minute-in-situ-meteorological-observations"

# WMO station number (integer) for IJmuiden used inside the NetCDF files
STATION_WMO = 6225


def fetch_latest_open_data(api_key: str) -> dict | None:
    """Download the most recent NetCDF file and return the latest obs for station 6225."""
    headers = {"Authorization": f"Bearer {api_key}"}

    # List files, newest first
    resp = requests.get(
        f"{OPEN_DATA_BASE}/files",
        params={"orderBy": "created", "sorting": "desc", "maxKeys": 5},
        headers=headers,
        timeout=30,
    )
    if resp.status_code != 200:
        print(f"Open Data list error {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
        return None

    files = resp.json().get("files", [])
    if not files:
        print("No files returned from Open Data API.", file=sys.stderr)
        return None

    print(f"Latest 5 files from Open Data API:")
    for f in files:
        print(f"  {f.get('filename')}  created={f.get('created')}")

    latest_filename = files[0]["filename"]

    # Get a temporary download URL
    url_resp = requests.get(
        f"{OPEN_DATA_BASE}/files/{latest_filename}/url",
        headers=headers,
        timeout=30,
    )
    if url_resp.status_code != 200:
        print(f"Failed to get download URL: {url_resp.status_code}", file=sys.stderr)
        return None

    download_url = url_resp.json().get("temporaryDownloadUrl")
    if not download_url:
        print("No temporaryDownloadUrl in response.", file=sys.stderr)
        return None

    # Download the NetCDF file
    print(f"\nDownloading {latest_filename} ...")
    dl_resp = requests.get(download_url, timeout=60)
    if dl_resp.status_code != 200:
        print(f"Download failed: {dl_resp.status_code}", file=sys.stderr)
        return None

    with tempfile.NamedTemporaryFile(suffix=".nc", delete=False) as tmp:
        tmp.write(dl_resp.content)
        tmp_path = tmp.name

    try:
        return parse_netcdf(tmp_path)
    finally:
        os.unlink(tmp_path)


def parse_netcdf(path: str) -> dict | None:
    """Extract the latest non-null wind obs for station 6225 from a NetCDF file."""
    ds = nc.Dataset(path)

    try:
        # Station dimension — variable name varies but typically "station" or "stationId"
        station_var = None
        for candidate in ("station", "stationId", "station_id", "wmo_id"):
            if candidate in ds.variables:
                station_var = ds.variables[candidate]
                break

        if station_var is None:
            print("Could not find station variable. Variables:", list(ds.variables.keys()))
            return None

        station_ids = np.array(station_var[:]).flatten()

        # Find index for station 6225
        station_idx = None
        for i, sid in enumerate(station_ids):
            try:
                val = int(sid)
            except (ValueError, TypeError):
                # May be a string like b'06225'
                try:
                    val = int(bytes(sid).decode().strip())
                except Exception:
                    continue
            if val == STATION_WMO:
                station_idx = i
                break

        if station_idx is None:
            print(f"Station {STATION_WMO} not found. Available station IDs (first 10): {station_ids[:10]}")
            return None

        # Time variable (seconds since epoch or CF convention)
        time_var = ds.variables["time"]
        times = nc.num2date(time_var[:], units=time_var.units, calendar=getattr(time_var, "calendar", "standard"))

        # Wind variables — try common names
        def get_var(candidates):
            for name in candidates:
                if name in ds.variables:
                    return ds.variables[name][:]
            return None

        ff = get_var(["ff", "wind_speed", "F010"])
        dd = get_var(["dd", "wind_direction", "D010"])
        gff = get_var(["gff", "wind_gust", "FX10"])

        # Data may be shaped (time,) or (time, station)
        def extract_station(arr, idx):
            if arr is None:
                return None
            if arr.ndim == 1:
                return np.array(arr)
            return np.array(arr[:, idx])

        ff_s = extract_station(ff, station_idx)
        dd_s = extract_station(dd, station_idx)
        gff_s = extract_station(gff, station_idx)

        # Find most recent non-masked/non-nan value
        latest_idx = None
        for i in range(len(times) - 1, -1, -1):
            val = ff_s[i] if ff_s is not None else None
            if val is not None and not np.ma.is_masked(val) and not np.isnan(float(val)):
                latest_idx = i
                break

        if latest_idx is None:
            print("No valid wind speed found for station 6225 in file.")
            return None

        t = times[latest_idx]
        # Convert cftime to Python datetime (UTC)
        obs_dt = datetime(t.year, t.month, t.day, t.hour, t.minute, tzinfo=timezone.utc)

        return {
            "source": "Open Data file API",
            "filename": os.path.basename(path),
            "obs_time_utc": obs_dt,
            "windKn": round(float(ff_s[latest_idx]) * MS_TO_KN, 1) if ff_s is not None else None,
            "gustKn": round(float(gff_s[latest_idx]) * MS_TO_KN, 1) if gff_s is not None and not np.ma.is_masked(gff_s[latest_idx]) else None,
            "dirDeg": round(float(dd_s[latest_idx])) if dd_s is not None and not np.ma.is_masked(dd_s[latest_idx]) else None,
        }
    finally:
        ds.close()


def fetch_latest_edr(api_key: str) -> dict | None:
    """Return the most recent observation for station 06225 via EDR API."""
    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    datetime_param = f"{today_utc.strftime('%Y-%m-%dT%H:%MZ')}/{now_utc.strftime('%Y-%m-%dT%H:%MZ')}"

    url = f"{EDR_BASE}/locations/0-20000-0-06225"
    params = {"parameter-name": "ff,dd,gff", "datetime": datetime_param, "f": "CoverageJSON"}
    headers = {"Authorization": f"Bearer {api_key}"}

    resp = requests.get(url, params=params, headers=headers, timeout=30)
    if resp.status_code != 200:
        print(f"EDR API error {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
        return None

    data = resp.json()
    coverages = data.get("coverages", [])
    if not coverages:
        return None

    coverage = coverages[0]
    timestamps = coverage["domain"]["axes"]["t"]["values"]
    ranges = coverage.get("ranges", {})
    ff_vals = ranges.get("ff", {}).get("values", [])
    gff_vals = ranges.get("gff", {}).get("values", [])
    dd_vals = ranges.get("dd", {}).get("values", [])

    # Most recent non-null
    latest_idx = None
    for i in range(len(timestamps) - 1, -1, -1):
        if i < len(ff_vals) and ff_vals[i] is not None:
            latest_idx = i
            break

    if latest_idx is None:
        return None

    ts_str = timestamps[latest_idx]
    obs_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

    return {
        "source": "EDR API",
        "obs_time_utc": obs_dt,
        "windKn": round(ff_vals[latest_idx] * MS_TO_KN, 1) if ff_vals[latest_idx] is not None else None,
        "gustKn": round(gff_vals[latest_idx] * MS_TO_KN, 1) if latest_idx < len(gff_vals) and gff_vals[latest_idx] is not None else None,
        "dirDeg": round(dd_vals[latest_idx]) if latest_idx < len(dd_vals) and dd_vals[latest_idx] is not None else None,
    }


def print_result(result: dict | None, now_utc: datetime) -> None:
    if result is None:
        print("  [no data]")
        return
    obs = result["obs_time_utc"]
    lag_min = (now_utc - obs).total_seconds() / 60
    obs_local = obs.astimezone(AMSTERDAM_TZ).strftime("%H:%M")
    print(f"  Source     : {result['source']}")
    print(f"  Latest obs : {obs_local} Amsterdam ({obs.strftime('%H:%M')} UTC)")
    print(f"  Lag        : {lag_min:.1f} minutes behind wall-clock")
    print(f"  Wind       : {result['windKn']} kn  Gust: {result['gustKn']} kn  Dir: {result['dirDeg']}°")


def main():
    api_key = os.environ.get("EDR_API_KEY")
    if not api_key:
        print("EDR_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(AMSTERDAM_TZ).strftime("%H:%M")
    print(f"Wall-clock time: {now_local} Amsterdam ({now_utc.strftime('%H:%M')} UTC)\n")

    print("=" * 50)
    print("OPEN DATA FILE API")
    print("=" * 50)
    od_result = fetch_latest_open_data(api_key)
    print()
    print_result(od_result, now_utc)

    print()
    print("=" * 50)
    print("EDR API")
    print("=" * 50)
    edr_result = fetch_latest_edr(api_key)
    print()
    print_result(edr_result, now_utc)

    if od_result and edr_result:
        diff = (od_result["obs_time_utc"] - edr_result["obs_time_utc"]).total_seconds() / 60
        print()
        if diff > 0:
            print(f">> Open Data is {diff:.0f} minutes FRESHER than EDR")
        elif diff < 0:
            print(f">> EDR is {abs(diff):.0f} minutes FRESHER than Open Data")
        else:
            print(">> Both APIs return the same latest timestamp")


if __name__ == "__main__":
    main()
