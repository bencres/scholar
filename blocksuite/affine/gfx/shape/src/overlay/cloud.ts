import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { cloudPathAt } from '@blocksuite/global/gfx';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class CloudShape extends Shape {
  draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void {
    const [x, y, w, h] = this.xywh;
    if (this.shapeStyle === 'Scribbled') {
      rc.path(cloudPathAt(x, y, w, h), this.options);
    } else {
      drawGeneralShape(ctx, 'cloud', this.xywh, this.options);
    }
  }
}
