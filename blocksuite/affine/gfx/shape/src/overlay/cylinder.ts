import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { cylinderPathAt } from '@blocksuite/global/gfx';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class CylinderShape extends Shape {
  draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void {
    const [x, y, w, h] = this.xywh;
    if (this.shapeStyle === 'Scribbled') {
      rc.path(cylinderPathAt(x, y, w, h), this.options);
    } else {
      drawGeneralShape(ctx, 'cylinder', this.xywh, this.options);
    }
  }
}
