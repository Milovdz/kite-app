export const DATA_BASE_URL_FOR = (slug: string) =>
  `https://raw.githubusercontent.com/Milovdz/kite-app/data/${slug}`

export const SPOTS = [
  { slug: 'ijmuiden',      name: 'IJmuiden'      },
  { slug: 'wijk-aan-zee',  name: 'Wijk aan Zee'  },
  { slug: 'schellinkhout', name: 'Schellinkhout' },
  { slug: 'kijkduin',      name: 'Kijkduin'      },
] as const

export type SpotSlug = typeof SPOTS[number]['slug']

export const APP_TZ = 'Europe/Amsterdam'
