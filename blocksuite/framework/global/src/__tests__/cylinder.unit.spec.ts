import { describe, expect, test } from 'vitest';

import {
  CYLINDER_CAP_RATIO,
  cylinderPath,
  cylinderPathAt,
  cylinderPoints,
  getCylinderMetrics,
} from '../gfx/cylinder.js';

describe('getCylinderMetrics', () => {
  test('should derive cap dimensions from bounding box', () => {
    expect(getCylinderMetrics(100, 80)).toEqual({
      rx: 50,
      ry: 8,
      topY: 8,
      bottomY: 72,
    });
  });
});

describe('cylinderPath', () => {
  test('should generate cylinder path with stroke inset', () => {
    const result = cylinderPath(100, 80, 2);
    expect(result.startsWith('M 1 8.8 A 49')).toBe(true);
    expect(result.endsWith('Z')).toBe(true);
  });

  test('should support absolute coordinates', () => {
    const result = cylinderPathAt(10, 20, 100, 80, 0);
    expect(result).toBe(
      'M 10 28 A 50 8 0 0 1 110 28 L 110 92 A 50 8 0 0 1 10 92 Z'
    );
  });
});

describe('cylinderPoints', () => {
  test('should sample top and bottom cap outlines', () => {
    const points = cylinderPoints({ x: 0, y: 0, w: 100, h: 80 });
    expect(points[0][0]).toBeCloseTo(0);
    expect(points[0][1]).toBeCloseTo(8);
    expect(points[8][0]).toBeCloseTo(100);
    expect(points[8][1]).toBeCloseTo(8);
    expect(points[9][0]).toBeCloseTo(100);
    expect(points[9][1]).toBeCloseTo(72);
    expect(points[17][0]).toBeCloseTo(0);
    expect(points[17][1]).toBeCloseTo(72);
    expect(CYLINDER_CAP_RATIO).toBe(0.2);
  });
});
