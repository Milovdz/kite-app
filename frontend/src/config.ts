import type { WindZones } from './utils/windZone'

export const DATA_BASE_URL_FOR = (slug: string) =>
  `https://raw.githubusercontent.com/Milovdz/kite-app/data/${slug}`

export const CURRENT_API_URL_FOR = (slug: string) =>
  `/api/current?spot=${slug}`

export type SpotSlug = 'ijmuiden' | 'wijk-aan-zee' | 'schellinkhout' | 'kijkduin'

// Given an offshore arc (from→to, clockwise), divides the remaining 360° into:
//   sideShore 1/4 | crossOnshore 1/4 | onshore 1/4 | crossOnshore 1/4 | sideShore
// where sideShore is split equally across both edges of the non-offshore arc.
function zonesFromOffshore(offshoreFrom: number, offshoreTo: number): WindZones {
  const span = ((offshoreTo - offshoreFrom) + 360) % 360 || 360
  const nonSpan = 360 - span
  const Q = nonSpan / 4
  const start = offshoreTo
  const r = (deg: number) => Math.round(((deg % 360) + 360) % 360)
  return {
    onshore:      [{ from: r(start + Q * 1.5), to: r(start + Q * 2.5) }],
    crossOnshore: [{ from: r(start + Q * 0.5), to: r(start + Q * 1.5) }, { from: r(start + Q * 2.5), to: r(start + Q * 3.5) }],
    sideShore:    [{ from: r(start),            to: r(start + Q * 0.5) }, { from: r(start + Q * 3.5), to: offshoreFrom }],
    offshore:     [{ from: offshoreFrom, to: offshoreTo }],
  }
}

export const SPOTS: ReadonlyArray<{ slug: SpotSlug; name: string; windZones: WindZones }> = [
  { slug: 'ijmuiden',      name: 'IJmuiden',      windZones: zonesFromOffshore(0,   170) },
  { slug: 'wijk-aan-zee',  name: 'Wijk aan Zee',  windZones: zonesFromOffshore(10,  230) },
  { slug: 'schellinkhout', name: 'Schellinkhout', windZones: zonesFromOffshore(280, 140) },
  { slug: 'kijkduin',      name: 'Kijkduin',      windZones: zonesFromOffshore(10,  230) },
]

export const APP_TZ = 'Europe/Amsterdam'
