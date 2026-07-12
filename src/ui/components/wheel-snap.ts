// Pure snap arithmetic for the scroll-selector wheel, kept out of the DOM so it
// can be unit-tested. With a track padded by one item top and bottom, the scroll
// offset that centres item `i` is simply `i * itemHeight`.
// See Prompts/lt-06/02-scroll-selector-component.md.

/** Nearest item index for a given scroll offset, clamped to [0, count-1]. */
export function indexForOffset(scrollTop: number, itemHeight: number, count: number): number {
  if (itemHeight <= 0 || count <= 0) return 0
  const i = Math.round(scrollTop / itemHeight)
  return Math.max(0, Math.min(count - 1, i))
}

/** Scroll offset that centres a given item index. */
export function offsetForIndex(index: number, itemHeight: number): number {
  return index * itemHeight
}
