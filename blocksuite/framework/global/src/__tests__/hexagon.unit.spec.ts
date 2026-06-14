import { describe, expect, test } from 'vitest';

import {
  flatTopHexagonPoints,
  flatTopHexagonPointsString,
} from '../gfx/hexagon.js';

describe('flatTopHexagonPoints', () => {
  test('should generate hexagon vertices within bounds', () => {
    const points = flatTopHexagonPoints({ x: 0, y: 0, w: 100, h: 80 });
    expect(points).toEqual([
      [25, 0],
      [75, 0],
      [100, 40],
      [75, 80],
      [25, 80],
      [0, 40],
    ]);
  });
});

describe('flatTopHexagonPointsString', () => {
  test('should generate hexagon polygon points with stroke offset', () => {
    const result = flatTopHexagonPointsString(100, 80, 2);
    expect(result).toBe('25,1 75,1 99,40 75,79 25,79 1,40');
  });

  test('should handle zero stroke width', () => {
    const result = flatTopHexagonPointsString(100, 80, 0);
    expect(result).toBe('25,0 75,0 100,40 75,80 25,80 0,40');
  });
});
