import type { IBound } from './model/bound.js';
import type { IVec } from './model/vec.js';
import { SVGPathBuilder } from './svg-path-builder.js';

export const CYLINDER_CAP_RATIO = 0.25;
export const CYLINDER_DEFAULT_HEIGHT_RATIO = 1.4;
export const CYLINDER_DEFAULT_WIDTH = 100;
export const CYLINDER_DEFAULT_HEIGHT = 130;

export type CylinderMetrics = {
  rx: number;
  ry: number;
  topY: number;
  bottomY: number;
};

export function getCylinderMetrics(
  width: number,
  height: number,
  strokeWidth = 0
): CylinderMetrics {
  const inset = strokeWidth / 2;
  const w = Math.max(width - strokeWidth, 0);
  const h = Math.max(height - strokeWidth, 0);
  const ry = Math.max((h * CYLINDER_CAP_RATIO) / 2, 1);
  const rx = w / 2;

  return {
    rx,
    ry,
    topY: inset + ry,
    bottomY: inset + h - ry,
  };
}

export function cylinderPath(
  width: number,
  height: number,
  strokeWidth = 0
): string {
  return cylinderPathAt(0, 0, width, height, strokeWidth);
}

export function cylinderPathAt(
  x: number,
  y: number,
  width: number,
  height: number,
  strokeWidth = 0
): string {
  const inset = strokeWidth / 2;
  const w = Math.max(width - strokeWidth, 0);
  const { rx, ry, topY, bottomY } = getCylinderMetrics(
    width,
    height,
    strokeWidth
  );
  const left = x + inset;
  const right = x + inset + w;

  const body = new SVGPathBuilder()
    .moveTo(left, y + topY)
    .arcTo(rx, ry, 0, 0, 0, right, y + topY)
    .lineTo(right, y + bottomY)
    .arcTo(rx, ry, 0, 0, 1, left, y + bottomY)
    .closePath()
    .build();

  const rim = new SVGPathBuilder()
    .moveTo(left, y + topY)
    .arcTo(rx, ry, 0, 0, 1, right, y + topY)
    .build();

  return `${body} ${rim}`;
}

export function cylinderPoints({ x, y, w, h }: IBound): IVec[] {
  const { rx, ry, topY, bottomY } = getCylinderMetrics(w, h);
  const cx = x + w / 2;
  const points: IVec[] = [];
  const segments = 8;

  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI + (Math.PI * i) / segments;
    points.push([cx + rx * Math.cos(angle), y + topY + ry * Math.sin(angle)]);
  }

  for (let i = 0; i <= segments; i++) {
    const angle = (Math.PI * i) / segments;
    points.push([
      cx + rx * Math.cos(angle),
      y + bottomY + ry * Math.sin(angle),
    ]);
  }

  return points;
}

export function drawCylinderPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const { rx, ry, topY, bottomY } = getCylinderMetrics(width, height);
  const cx = x + width / 2;
  const left = x;
  const right = x + width;

  ctx.beginPath();
  ctx.moveTo(left, y + topY);
  ctx.ellipse(cx, y + topY, rx, ry, 0, Math.PI, 0, false);
  ctx.lineTo(right, y + bottomY);
  ctx.ellipse(cx, y + bottomY, rx, ry, 0, 0, Math.PI, false);
  ctx.lineTo(left, y + topY);
  ctx.closePath();
  ctx.moveTo(left, y + topY);
  ctx.ellipse(cx, y + topY, rx, ry, 0, 0, Math.PI, false);
}
