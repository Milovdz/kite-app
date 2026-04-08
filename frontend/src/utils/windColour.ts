export function windColour(knots: number): string {
  if (knots < 15) return interpolate('#4a4a4a', '#6b6b6b', knots, 0, 14)
  if (knots <= 20) return interpolate('#b8860b', '#ffd700', knots, 15, 20)
  if (knots <= 25) return interpolate('#cc5500', '#ff8c00', knots, 21, 25)
  if (knots <= 32) return interpolate('#8b0000', '#dc143c', knots, 26, 32)
  return interpolate('#4b0082', '#800080', knots, 33, 45)
}

function interpolate(dark: string, light: string, value: number, min: number, max: number): string {
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)))
  return blendHex(dark, light, t)
}

function blendHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ]
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}
