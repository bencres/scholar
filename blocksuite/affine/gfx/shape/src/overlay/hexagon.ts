import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { flatTopHexagonPointsRelative } from '@blocksuite/global/gfx';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class HexagonShape extends Shape {
  draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void {
    if (this.shapeStyle === 'Scribbled') {
      const [x, y, w, h] = this.xywh;
      const points = flatTopHexagonPointsRelative(w, h).map(
        ([px, py]) => [x + px, y + py] as [number, number]
      );
      rc.polygon(points, this.options);
    } else {
      drawGeneralShape(ctx, 'hexagon', this.xywh, this.options);
    }
  }
}
