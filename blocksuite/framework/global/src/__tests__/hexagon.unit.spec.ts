import { describe, expect, test } from 'vitest';

import {
  flatTopHexagonPoints,
  flatTopHexagonPointsString,
} from '../gfx/hexagon.js';

describe('flatTopHexagonPoints', () => {
  test('should generate regular hexagon vertices within bounds', () => {
    const points = flatTopHexagonPoints({ x: 0, y: 0, w: 100, h: 80 });
    expect(points[0][0]).toBeCloseTo(26.906, 2);
    expect(points[0][1]).toBeCloseTo(0);
    expect(points[2][0]).toBeCloseTo(96.188, 2);
    expect(points[2][1]).toBeCloseTo(40);
    expect(points[4][0]).toBeCloseTo(26.906, 2);
    expect(points[4][1]).toBeCloseTo(80);
  });

  test('should center a regular hexagon in a square bounding box', () => {
    const points = flatTopHexagonPoints({ x: 0, y: 0, w: 100, h: 100 });
    expect(points[0][1]).toBeCloseTo(6.698, 2);
    expect(points[2][1]).toBeCloseTo(50);
    expect(points[4][1]).toBeCloseTo(93.301, 2);
  });
});

describe('flatTopHexagonPointsString', () => {
  test('should generate hexagon polygon points with stroke offset', () => {
    const result = flatTopHexagonPointsString(100, 80, 2);
    const [firstX, firstY] = result.split(' ')[0].split(',').map(Number);
    expect(firstX).toBeCloseTo(27.483, 2);
    expect(firstY).toBe(1);
    expect(result).toContain('95.033');
  });

  test('should handle zero stroke width', () => {
    const result = flatTopHexagonPointsString(100, 80, 0);
    const [firstX, firstY] = result.split(' ')[0].split(',').map(Number);
    expect(firstX).toBeCloseTo(26.906, 2);
    expect(firstY).toBe(0);
    expect(result).toContain('96.188');
  });
});
