import type { ShapeType } from '../../../consts/shape.js';
import { cloud } from './cloud.js';
import { cylinder } from './cylinder.js';
import { diamond } from './diamond.js';
import { ellipse } from './ellipse.js';
import { hexagon } from './hexagon.js';
import { rect } from './rect.js';
import { triangle } from './triangle.js';

export const shapeMethods: Record<ShapeType, typeof rect> = {
  rect,
  triangle,
  ellipse,
  diamond,
  hexagon,
  cylinder,
  cloud,
};
