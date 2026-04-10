export type WindZoneName = 'onshore' | 'crossOnshore' | 'sideShore' | 'offshore'

export interface ArcRange { from: number; to: number }

export interface WindZones {
  onshore:      ArcRange[]
  crossOnshore: ArcRange[]
  sideShore:    ArcRange[]
  offshore:     ArcRange[]
}

function inArc(deg: number, arc: ArcRange): boolean {
  const d = ((deg % 360) + 360) % 360
  if (arc.from <= arc.to) return d >= arc.from && d < arc.to
  return d >= arc.from || d < arc.to
}

export function getWindZone(dirDeg: number, zones: WindZones): WindZoneName {
  for (const zone of ['onshore', 'crossOnshore', 'sideShore', 'offshore'] as WindZoneName[]) {
    if (zones[zone].some(arc => inArc(dirDeg, arc))) return zone
  }
  return 'offshore'
}
