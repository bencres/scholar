import type { IBound } from './model/bound.js';
import type { IVec } from './model/vec.js';

export const FLAT_TOP_HEXAGON_SQRT3 = Math.sqrt(3);
export const HEXAGON_DEFAULT_WIDTH = 160;
export const HEXAGON_DEFAULT_HEIGHT = 100;

function getRegularFlatTopHexagonSide(width: number, height: number): number {
  return Math.min(width / 2, height / FLAT_TOP_HEXAGON_SQRT3);
}

function regularFlatTopHexagonVertices(
  cx: number,
  cy: number,
  side: number
): IVec[] {
  const halfW = side / 2;
  const halfH = (FLAT_TOP_HEXAGON_SQRT3 * side) / 2;

  return [
    [cx - halfW, cy - halfH],
    [cx + halfW, cy - halfH],
    [cx + side, cy],
    [cx + halfW, cy + halfH],
    [cx - halfW, cy + halfH],
    [cx - side, cy],
  ];
}

/**
 * Flat-top regular hexagon vertices inscribed in a bounding box.
 * Used for systems design diagrams (service nodes, etc.).
 */
export function flatTopHexagonPoints({ x, y, w, h }: IBound): IVec[] {
  const side = getRegularFlatTopHexagonSide(w, h);
  return regularFlatTopHexagonVertices(x + w / 2, y + h / 2, side);
}

export function flatTopHexagonPointsRelative(
  width: number,
  height: number,
  strokeWidth = 0
): IVec[] {
  const inset = strokeWidth / 2;
  const w = Math.max(width - strokeWidth, 0);
  const h = Math.max(height - strokeWidth, 0);
  const side = getRegularFlatTopHexagonSide(w, h);

  return regularFlatTopHexagonVertices(inset + w / 2, inset + h / 2, side);
}

export function flatTopHexagonPointsString(
  width: number,
  height: number,
  strokeWidth = 0
): string {
  return flatTopHexagonPointsRelative(width, height, strokeWidth)
    .map(([px, py]) => `${px},${py}`)
    .join(' ');
}
