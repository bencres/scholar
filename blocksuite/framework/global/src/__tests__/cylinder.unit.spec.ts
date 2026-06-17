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
      ry: 10,
      topY: 10,
      bottomY: 70,
    });
  });
});

describe('cylinderPath', () => {
  test('should generate cylinder path with stroke inset', () => {
    const result = cylinderPath(100, 80, 2);
    expect(result.startsWith('M 1 10.75 A 49 9.75 0 0 0')).toBe(true);
    expect(result.includes('A 49 9.75 0 0 1 99 10.75')).toBe(true);
  });

  test('should support absolute coordinates', () => {
    const result = cylinderPathAt(10, 20, 100, 80, 0);
    expect(result).toBe(
      'M 10 30 A 50 10 0 0 0 110 30 L 110 90 A 50 10 0 0 1 10 90 Z M 10 30 A 50 10 0 0 1 110 30'
    );
  });
});

describe('cylinderPoints', () => {
  test('should sample top and bottom cap outlines', () => {
    const points = cylinderPoints({ x: 0, y: 0, w: 100, h: 80 });
    expect(points[0][0]).toBeCloseTo(0);
    expect(points[0][1]).toBeCloseTo(10);
    expect(points[8][0]).toBeCloseTo(100);
    expect(points[8][1]).toBeCloseTo(10);
    expect(points[9][0]).toBeCloseTo(100);
    expect(points[9][1]).toBeCloseTo(70);
    expect(points[17][0]).toBeCloseTo(0);
    expect(points[17][1]).toBeCloseTo(70);
    expect(CYLINDER_CAP_RATIO).toBe(0.25);
  });
});
