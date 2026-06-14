import type { ShapeToolOption } from '@blocksuite/affine-gfx-shape';
import { ShapeType } from '@blocksuite/affine-model';
import {
  DiamondIcon,
  EllipseIcon,
  RoundedRectangleIcon,
  SquareIcon,
  TriangleIcon,
} from '@blocksuite/icons/lit';
import type { TemplateResult } from 'lit';

import {
  GeneralCloudIcon,
  GeneralCylinderIcon,
  GeneralHexagonIcon,
  ScribbledCloudIcon,
  ScribbledCylinderIcon,
  ScribbledDiamondIcon,
  ScribbledEllipseIcon,
  ScribbledHexagonIcon,
  ScribbledRoundedRectangleIcon,
  ScribbledSquareIcon,
  ScribbledTriangleIcon,
} from './icons';

type Config = {
  name: ShapeToolOption['shapeName'];
  generalIcon: TemplateResult<1>;
  scribbledIcon: TemplateResult<1>;
  tooltip: string;
  disabled: boolean;
};

export type ShapeComponentConfigGroup = {
  label: string;
  shapes: Config[];
};

export const BasicShapeComponentConfig: Config[] = [
  {
    name: ShapeType.Rect,
    generalIcon: SquareIcon(),
    scribbledIcon: ScribbledSquareIcon,
    tooltip: 'Square',
    disabled: false,
  },
  {
    name: ShapeType.Ellipse,
    generalIcon: EllipseIcon(),
    scribbledIcon: ScribbledEllipseIcon,
    tooltip: 'Ellipse',
    disabled: false,
  },
  {
    name: ShapeType.Diamond,
    generalIcon: DiamondIcon(),
    scribbledIcon: ScribbledDiamondIcon,
    tooltip: 'Diamond',
    disabled: false,
  },
  {
    name: ShapeType.Triangle,
    generalIcon: TriangleIcon(),
    scribbledIcon: ScribbledTriangleIcon,
    tooltip: 'Triangle',
    disabled: false,
  },
  {
    name: 'roundedRect',
    generalIcon: RoundedRectangleIcon(),
    scribbledIcon: ScribbledRoundedRectangleIcon,
    tooltip: 'Rounded rectangle',
    disabled: false,
  },
];

export const ArchitectureShapeComponentConfig: Config[] = [
  {
    name: ShapeType.Hexagon,
    generalIcon: GeneralHexagonIcon,
    scribbledIcon: ScribbledHexagonIcon,
    tooltip: 'Hexagon',
    disabled: false,
  },
  {
    name: ShapeType.Cylinder,
    generalIcon: GeneralCylinderIcon,
    scribbledIcon: ScribbledCylinderIcon,
    tooltip: 'Cylinder',
    disabled: false,
  },
  {
    name: ShapeType.Cloud,
    generalIcon: GeneralCloudIcon,
    scribbledIcon: ScribbledCloudIcon,
    tooltip: 'Cloud',
    disabled: false,
  },
];

export const ShapeComponentConfigGroups: ShapeComponentConfigGroup[] = [
  {
    label: 'Basic',
    shapes: BasicShapeComponentConfig,
  },
  {
    label: 'Architecture',
    shapes: ArchitectureShapeComponentConfig,
  },
];

export const ShapeComponentConfig: Config[] = [
  ...BasicShapeComponentConfig,
  ...ArchitectureShapeComponentConfig,
];

export const ShapeComponentConfigMap = ShapeComponentConfig.reduce(
  (acc, config) => {
    acc[config.name] = config;
    return acc;
  },
  {} as Record<Config['name'], Config>
);
