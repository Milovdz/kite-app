#!/usr/bin/env python3
"""Fetch wind forecast data from Open-Meteo KNMI Seamless model."""

import sys
import openmeteo_requests
import requests_cache
from retry_requests import retry

LATITUDE = 52.482630
LONGITUDE = 4.581581

def fetch_wind(latitude=LATITUDE, longitude=LONGITUDE):
    session = requests_cache.CachedSession('.cache', expire_after=3600)
    session = retry(session, retries=5, backoff_factor=0.2)
    om = openmeteo_requests.Client(session=session)

    response = om.weather_api('https://api.open-meteo.com/v1/forecast', params={
        'latitude': latitude,
        'longitude': longitude,
        'hourly': [
            'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'
        ],
        'current': ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'],
        'models': 'knmi_seamless',
        'forecast_days': 7,
        'timezone': 'Europe/Amsterdam',
    })[0]

    c = response.Current()
    print(f"=== Current conditions ({latitude}, {longitude}) ===")
    print(f"  Wind speed:     {c.Variables(0).Value():.1f} km/h")
    print(f"  Wind direction: {c.Variables(1).Value():.0f}°")
    print(f"  Wind gusts:     {c.Variables(2).Value():.1f} km/h")

    h = response.Hourly()
    speeds = h.Variables(0).ValuesAsNumpy()
    directions = h.Variables(1).ValuesAsNumpy()
    gusts = h.Variables(2).ValuesAsNumpy()

    print(f"\n=== Hourly forecast (first 12 hours) ===")
    print(f"{'Hour':>4}  {'10m spd':>8}  {'10m dir':>8}  {'gusts':>7}")
    for i in range(min(12, len(speeds))):
        print(f"{i:>4}  {speeds[i]:>8.1f}  {directions[i]:>8.0f}  {gusts[i]:>7.1f}")

    print(f"\nTotal hourly entries: {len(speeds)}")

if __name__ == '__main__':
    lat = float(sys.argv[1]) if len(sys.argv) > 1 else LATITUDE
    lon = float(sys.argv[2]) if len(sys.argv) > 2 else LONGITUDE
    fetch_wind(lat, lon)
