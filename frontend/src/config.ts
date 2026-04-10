import type { WindZones } from './utils/windZone'

export const DATA_BASE_URL_FOR = (slug: string) =>
  `https://raw.githubusercontent.com/Milovdz/kite-app/data/${slug}`

export type SpotSlug = 'ijmuiden' | 'wijk-aan-zee' | 'schellinkhout' | 'kijkduin'

export const SPOTS: ReadonlyArray<{ slug: SpotSlug; name: string; windZones: WindZones }> = [
  {
    slug: 'ijmuiden',
    name: 'IJmuiden',
    windZones: {
      onshore:      [{ from: 247, to: 293 }],
      crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }],
      sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23  }],
      offshore:     [{ from: 23,  to: 157 }],
    },
  },
  {
    slug: 'wijk-aan-zee',
    name: 'Wijk aan Zee',
    windZones: {
      onshore:      [{ from: 247, to: 293 }],
      crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }],
      sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23  }],
      offshore:     [{ from: 23,  to: 157 }],
    },
  },
  {
    slug: 'schellinkhout',
    name: 'Schellinkhout',
    windZones: {
      onshore:      [{ from: 68,  to: 113 }],
      crossOnshore: [{ from: 23,  to: 68  }, { from: 113, to: 158 }],
      sideShore:    [{ from: 338, to: 23  }, { from: 158, to: 203 }],
      offshore:     [{ from: 203, to: 338 }],
    },
  },
  {
    slug: 'kijkduin',
    name: 'Kijkduin',
    windZones: {
      onshore:      [{ from: 247, to: 293 }],
      crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }],
      sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23  }],
      offshore:     [{ from: 23,  to: 157 }],
    },
  },
]

export const APP_TZ = 'Europe/Amsterdam'
