import type { IBound } from './model/bound.js';
import type { IVec } from './model/vec.js';
import { SVGPathBuilder } from './svg-path-builder.js';

export const CLOUD_DEFAULT_WIDTH = 180;
export const CLOUD_DEFAULT_HEIGHT = 110;

const CLOUD_OUTLINE: ReadonlyArray<readonly [number, number]> = [
  [0.25, 0.675],
  [0.725, 0.675],
  [0.9, 0.51],
  [0.75, 0.33],
  [0.55, 0.175],
  [0.375, 0.265],
  [0.2, 0.405],
  [0.075, 0.57],
];

function buildCloudPathBuilder(
  sx: (value: number) => number,
  sy: (value: number) => number
) {
  return new SVGPathBuilder()
    .moveTo(sx(5), sy(13.5))
    .lineTo(sx(14.5), sy(13.5))
    .curveTo(sx(16.4), sy(13.5), sx(18), sy(12.1), sx(18), sy(10.2))
    .curveTo(sx(18), sy(8.5), sx(16.8), sy(7), sx(15), sy(6.6))
    .curveTo(sx(14.6), sy(4.7), sx(12.9), sy(3.5), sx(11), sy(3.5))
    .curveTo(sx(9.6), sy(3.5), sx(8.3), sy(4.2), sx(7.5), sy(5.3))
    .curveTo(sx(5.8), sy(5.1), sx(4.2), sy(6.4), sx(4), sy(8.1))
    .curveTo(sx(2.6), sy(8.5), sx(1.5), sy(9.8), sx(1.5), sy(11.4))
    .curveTo(sx(1.5), sy(12.7), sx(2.6), sy(13.5), sx(4), sy(13.5))
    .lineTo(sx(5), sy(13.5))
    .closePath();
}

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
  const sx = (value: number) => x + inset + (value / 20) * w;
  const sy = (value: number) => y + inset + (value / 20) * h;

  return buildCloudPathBuilder(sx, sy).build();
}

export function drawCloudPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const sx = (value: number) => (value / 20) * width;
  const sy = (value: number) => (value / 20) * height;

  ctx.beginPath();
  ctx.moveTo(sx(5), sy(13.5));
  ctx.lineTo(sx(14.5), sy(13.5));
  ctx.bezierCurveTo(sx(16.4), sy(13.5), sx(18), sy(12.1), sx(18), sy(10.2));
  ctx.bezierCurveTo(sx(18), sy(8.5), sx(16.8), sy(7), sx(15), sy(6.6));
  ctx.bezierCurveTo(sx(14.6), sy(4.7), sx(12.9), sy(3.5), sx(11), sy(3.5));
  ctx.bezierCurveTo(sx(9.6), sy(3.5), sx(8.3), sy(4.2), sx(7.5), sy(5.3));
  ctx.bezierCurveTo(sx(5.8), sy(5.1), sx(4.2), sy(6.4), sx(4), sy(8.1));
  ctx.bezierCurveTo(sx(2.6), sy(8.5), sx(1.5), sy(9.8), sx(1.5), sy(11.4));
  ctx.bezierCurveTo(sx(1.5), sy(12.7), sx(2.6), sy(13.5), sx(4), sy(13.5));
  ctx.lineTo(sx(5), sy(13.5));
  ctx.closePath();
}
