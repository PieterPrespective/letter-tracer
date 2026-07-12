import { describe, expect, it } from 'vitest'
import { indexForOffset, offsetForIndex } from './wheel-snap'

const H = 56

describe('wheel-snap', () => {
  it('round-trips index → offset → index', () => {
    for (let i = 0; i < 26; i++) {
      expect(indexForOffset(offsetForIndex(i, H), H, 26)).toBe(i)
    }
  })

  it('snaps a mid-item offset to the nearer index', () => {
    expect(indexForOffset(2 * H + H * 0.4, H, 10)).toBe(2)
    expect(indexForOffset(2 * H + H * 0.6, H, 10)).toBe(3)
  })

  it('clamps at both ends', () => {
    expect(indexForOffset(-100, H, 10)).toBe(0)
    expect(indexForOffset(9999, H, 10)).toBe(9)
  })

  it('is defensive about degenerate inputs', () => {
    expect(indexForOffset(100, 0, 10)).toBe(0)
    expect(indexForOffset(100, H, 0)).toBe(0)
  })
})
