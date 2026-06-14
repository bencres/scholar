import type { IBound } from './model/bound.js';
import type { IVec } from './model/vec.js';
import { SVGPathBuilder } from './svg-path-builder.js';

const CLOUD_OUTLINE: ReadonlyArray<readonly [number, number]> = [
  [0.15, 0.68],
  [0, 0.5],
  [0.02, 0.28],
  [0.18, 0.15],
  [0.35, 0.05],
  [0.52, 0.08],
  [0.65, 0.02],
  [0.82, 0.12],
  [0.98, 0.28],
  [0.95, 0.48],
  [0.85, 0.68],
];

export function cloudPoints({ x, y, w, h }: IBound): IVec[] {
  return CLOUD_OUTLINE.map(([fx, fy]) => [x + w * fx, y + h * fy]);
}

export function cloudPath(
  width: number,
  height: number,
  strokeWidth = 0
): string {
  return cloudPathAt(0, 0, width, height, strokeWidth);
}

export function cloudPathAt(
  x: number,
  y: number,
  width: number,
  height: number,
  strokeWidth = 0
): string {
  const inset = strokeWidth / 2;
  const w = Math.max(width - strokeWidth, 0);
  const h = Math.max(height - strokeWidth, 0);
  const sx = (value: number) => x + inset + value * w;
  const sy = (value: number) => y + inset + value * h;

  return new SVGPathBuilder()
    .moveTo(sx(0.15), sy(0.68))
    .curveTo(sx(0.02), sy(0.72), sx(0), sy(0.58), sx(0), sy(0.4))
    .curveTo(sx(0), sy(0.18), sx(0.12), sy(0.06), sx(0.28), sy(0.12))
    .curveTo(sx(0.36), sy(0.02), sx(0.5), sy(0), sx(0.62), sy(0.08))
    .curveTo(sx(0.72), sy(0), sx(0.88), sy(0.04), sx(0.95), sy(0.16))
    .curveTo(sx(1), sy(0.1), sx(1), sy(0.28), sx(0.98), sy(0.4))
    .curveTo(sx(1), sy(0.55), sx(0.92), sy(0.68), sx(0.78), sy(0.68))
    .lineTo(sx(0.15), sy(0.68))
    .closePath()
    .build();
}

export function drawCloudPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const inset = 0;
  const w = width;
  const h = height;
  const sx = (value: number) => inset + value * w;
  const sy = (value: number) => inset + value * h;

  ctx.beginPath();
  ctx.moveTo(sx(0.15), sy(0.68));
  ctx.bezierCurveTo(sx(0.02), sy(0.72), sx(0), sy(0.58), sx(0), sy(0.4));
  ctx.bezierCurveTo(sx(0), sy(0.18), sx(0.12), sy(0.06), sx(0.28), sy(0.12));
  ctx.bezierCurveTo(sx(0.36), sy(0.02), sx(0.5), sy(0), sx(0.62), sy(0.08));
  ctx.bezierCurveTo(sx(0.72), sy(0), sx(0.88), sy(0.04), sx(0.95), sy(0.16));
  ctx.bezierCurveTo(sx(1), sy(0.1), sx(1), sy(0.28), sx(0.98), sy(0.4));
  ctx.bezierCurveTo(sx(1), sy(0.55), sx(0.92), sy(0.68), sx(0.78), sy(0.68));
  ctx.lineTo(sx(0.15), sy(0.68));
  ctx.closePath();
}
