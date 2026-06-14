import type { IBound } from './model/bound.js';
import type { IVec } from './model/vec.js';

/**
 * Flat-top regular hexagon vertices within a bounding box.
 * Used for systems design diagrams (service nodes, etc.).
 */
export function flatTopHexagonPoints({ x, y, w, h }: IBound): IVec[] {
  return [
    [x + w * 0.25, y],
    [x + w * 0.75, y],
    [x + w, y + h / 2],
    [x + w * 0.75, y + h],
    [x + w * 0.25, y + h],
    [x, y + h / 2],
  ];
}

export function flatTopHexagonPointsRelative(
  width: number,
  height: number,
  strokeWidth = 0
): IVec[] {
  const halfStroke = strokeWidth / 2;
  return [
    [width * 0.25, halfStroke],
    [width * 0.75, halfStroke],
    [width - halfStroke, height / 2],
    [width * 0.75, height - halfStroke],
    [width * 0.25, height - halfStroke],
    [halfStroke, height / 2],
  ];
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
