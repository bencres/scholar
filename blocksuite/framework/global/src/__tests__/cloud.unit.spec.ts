import { describe, expect, test } from 'vitest';

import { cloudPath, cloudPathAt, cloudPoints } from '../gfx/cloud.js';

describe('cloudPath', () => {
  test('should generate cloud path with stroke inset', () => {
    const result = cloudPath(100, 60, 2);
    expect(result.startsWith('M ')).toBe(true);
    expect(result.includes('C ')).toBe(true);
    expect(result.endsWith('Z')).toBe(true);
  });

  test('should support absolute coordinates', () => {
    const result = cloudPathAt(10, 20, 100, 60, 0);
    expect(result.startsWith('M 25 60.8')).toBe(true);
  });
});

describe('cloudPoints', () => {
  test('should map outline fractions to bound coordinates', () => {
    const points = cloudPoints({ x: 0, y: 0, w: 100, h: 100 });
    expect(points[0]).toEqual([15, 68]);
    expect(points.at(-1)).toEqual([85, 68]);
  });
});
