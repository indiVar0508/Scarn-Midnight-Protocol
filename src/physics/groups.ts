/**
 * Interaction groups in rapier's bit layout: memberships in the high 16 bits, filter in the low
 * 16. Two colliders interact only if each one's memberships intersect the other's filter.
 * Same signature as `@react-three/rapier`'s helper (the Rust side decodes the same layout).
 */
export function interactionGroups(memberships: number | number[], filters?: number | number[]): number {
  const bits = (g: number | number[] | undefined, fallback: number) =>
    g === undefined ? fallback : (Array.isArray(g) ? g : [g]).reduce((acc, n) => acc | (1 << n), 0);
  return (((bits(memberships, 0) & 0xffff) << 16) | (bits(filters, 0xffff) & 0xffff)) >>> 0;
}
