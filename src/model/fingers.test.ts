import { describe, expect, it } from 'vitest'
import { handsForCount } from './fingers'

describe('handsForCount', () => {
  it('shows a single fist for zero', () => {
    expect(handsForCount(0)).toEqual([{ fingers: 0, hand: 'right' }])
  })

  it('uses one hand for 1..5', () => {
    expect(handsForCount(3)).toEqual([{ fingers: 3, hand: 'right' }])
    expect(handsForCount(5)).toEqual([{ fingers: 5, hand: 'right' }])
  })

  it('splits 6..10 into a full hand plus the remainder', () => {
    expect(handsForCount(7)).toEqual([
      { fingers: 5, hand: 'right' },
      { fingers: 2, hand: 'left' },
    ])
    expect(handsForCount(10)).toEqual([
      { fingers: 5, hand: 'right' },
      { fingers: 5, hand: 'left' },
    ])
  })

  it('chunks larger counts into groups of five', () => {
    expect(handsForCount(12)).toEqual([
      { fingers: 5, hand: 'right' },
      { fingers: 5, hand: 'left' },
      { fingers: 2, hand: 'right' },
    ])
  })
})
