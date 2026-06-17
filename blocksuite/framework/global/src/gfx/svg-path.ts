import { cloudPath } from './cloud.js';
import { cylinderPath } from './cylinder.js';
import {
  flatTopHexagonPointsRelative,
  flatTopHexagonPointsString,
} from './hexagon.js';
import { SVGPathBuilder } from './svg-path-builder.js';

export { SVGPathBuilder } from './svg-path-builder.js';

/**
 * Create SVG polygon points string for common shapes
 */
export class SVGShapeBuilder {
  static diamond(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    const halfStroke = strokeWidth / 2;
    return [
      `${width / 2},${halfStroke}`,
      `${width - halfStroke},${height / 2}`,
      `${width / 2},${height - halfStroke}`,
      `${halfStroke},${height / 2}`,
    ].join(' ');
  }

  static triangle(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    const halfStroke = strokeWidth / 2;
    return [
      `${width / 2},${halfStroke}`,
      `${width - halfStroke},${height - halfStroke}`,
      `${halfStroke},${height - halfStroke}`,
    ].join(' ');
  }

  static diamondPath(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    const halfStroke = strokeWidth / 2;
    const pathBuilder = new SVGPathBuilder();

    return pathBuilder
      .moveTo(width / 2, halfStroke)
      .lineTo(width - halfStroke, height / 2)
      .lineTo(width / 2, height - halfStroke)
      .lineTo(halfStroke, height / 2)
      .closePath()
      .build();
  }

  static trianglePath(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    const halfStroke = strokeWidth / 2;
    const pathBuilder = new SVGPathBuilder();

    return pathBuilder
      .moveTo(width / 2, halfStroke)
      .lineTo(width - halfStroke, height - halfStroke)
      .lineTo(halfStroke, height - halfStroke)
      .closePath()
      .build();
  }

  static hexagon(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    return flatTopHexagonPointsString(width, height, strokeWidth);
  }

  static hexagonPath(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    const points = flatTopHexagonPointsRelative(width, height, strokeWidth);
    const pathBuilder = new SVGPathBuilder();

    pathBuilder.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      pathBuilder.lineTo(points[i][0], points[i][1]);
    }
    return pathBuilder.closePath().build();
  }

  static cylinder(
    width: number,
    height: number,
    strokeWidth: number = 0
  ): string {
    return cylinderPath(width, height, strokeWidth);
  }

  static cloud(width: number, height: number, strokeWidth: number = 0): string {
    return cloudPath(width, height, strokeWidth);
  }
}
