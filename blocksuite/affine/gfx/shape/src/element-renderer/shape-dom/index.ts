import type { DomRenderer } from '@blocksuite/affine-block-surface';
import { isRTL } from '@blocksuite/affine-gfx-text';
import type { ShapeElementModel } from '@blocksuite/affine-model';
import { DefaultTheme } from '@blocksuite/affine-model';
import { SVGShapeBuilder } from '@blocksuite/global/gfx';

import { manageClassNames, setStyles } from './utils';

const SVG_NS = 'http://www.w3.org/2000/svg';

type RetainedShapeDom = {
  path: SVGPathElement | null;
  polygon: SVGPolygonElement | null;
  svg: SVGSVGElement | null;
  text: HTMLDivElement | null;
};

type RetainedShapeSvg = {
  polygon: SVGPolygonElement;
  svg: SVGSVGElement;
};

type RetainedShapeSvgPath = {
  path: SVGPathElement;
  svg: SVGSVGElement;
};

const retainedShapeDom = new WeakMap<HTMLElement, RetainedShapeDom>();

function getRetainedShapeDom(element: HTMLElement): RetainedShapeDom {
  const existing = retainedShapeDom.get(element);

  if (existing) {
    return existing;
  }

  const retained = {
    svg: null,
    polygon: null,
    path: null,
    text: null,
  };
  retainedShapeDom.set(element, retained);
  return retained;
}

function applyShapeSpecificStyles(
  model: ShapeElementModel,
  element: HTMLElement,
  zoom: number
) {
  // Reset properties that might be set by different shape types
  element.style.removeProperty('clip-path');
  element.style.removeProperty('border-radius');

  switch (model.shapeType) {
    case 'rect': {
      const w = model.w * zoom;
      const h = model.h * zoom;
      const r = model.radius ?? 0;
      const borderRadius =
        r < 1 ? `${Math.min(w * r, h * r)}px` : `${r * zoom}px`;
      element.style.borderRadius = borderRadius;
      break;
    }
    case 'ellipse':
      element.style.borderRadius = '50%';
      break;
    case 'diamond':
      element.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      break;
    case 'triangle':
      element.style.clipPath = 'polygon(50% 0%, 100% 100%, 0% 100%)';
      break;
  }
  // No 'else' needed to clear styles, as they are reset at the beginning of the function.
}

function getOrCreateSvgPolygon(
  retained: RetainedShapeDom,
  element: HTMLElement
): RetainedShapeSvg {
  if (retained.svg && retained.polygon) {
    return {
      svg: retained.svg,
      polygon: retained.polygon,
    };
  }

  removeSvg(retained);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'none');

  const polygon = document.createElementNS(SVG_NS, 'polygon');
  svg.append(polygon);

  retained.svg = svg;
  retained.polygon = polygon;
  element.prepend(svg);

  return { svg, polygon };
}

function getOrCreateSvgPath(
  retained: RetainedShapeDom,
  element: HTMLElement
): RetainedShapeSvgPath {
  if (retained.svg && retained.path) {
    return {
      svg: retained.svg,
      path: retained.path,
    };
  }

  removeSvg(retained);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'none');

  const path = document.createElementNS(SVG_NS, 'path');
  svg.append(path);

  retained.svg = svg;
  retained.path = path;
  element.prepend(svg);

  return { svg, path };
}

function removeSvg(retained: RetainedShapeDom) {
  retained.svg?.remove();
  retained.svg = null;
  retained.polygon = null;
  retained.path = null;
}

function applySvgStrokeAttributes(
  element: SVGPolygonElement | SVGPathElement,
  model: ShapeElementModel,
  strokeColor: string,
  strokeW: number
) {
  const finalStrokeColor =
    model.strokeStyle !== 'none' && strokeW > 0 ? strokeColor : 'transparent';
  const finalStrokeDasharray =
    model.strokeStyle === 'dash' && finalStrokeColor !== 'transparent'
      ? '12, 12'
      : 'none';

  element.setAttribute('stroke', finalStrokeColor);
  element.setAttribute('stroke-width', String(strokeW));
  if (finalStrokeDasharray !== 'none') {
    element.setAttribute('stroke-dasharray', finalStrokeDasharray);
  } else {
    element.removeAttribute('stroke-dasharray');
  }
}

function getOrCreateText(retained: RetainedShapeDom, element: HTMLElement) {
  if (retained.text) {
    return retained.text;
  }

  const text = document.createElement('div');
  retained.text = text;
  element.append(text);
  return text;
}

function removeText(retained: RetainedShapeDom) {
  retained.text?.remove();
  retained.text = null;
}

function applyBorderStyles(
  model: ShapeElementModel,
  element: HTMLElement,
  strokeColor: string,
  zoom: number
) {
  element.style.border =
    model.strokeStyle !== 'none'
      ? `${model.strokeWidth * zoom}px ${model.strokeStyle === 'dash' ? 'dashed' : 'solid'} ${strokeColor}`
      : 'none';
}

function applyTransformStyles(model: ShapeElementModel, element: HTMLElement) {
  if (model.rotate && model.rotate !== 0) {
    setStyles(element, {
      transform: `rotate(${model.rotate}deg)`,
      transformOrigin: 'center',
    });
  } else {
    setStyles(element, {
      transform: '',
      transformOrigin: '',
    });
  }
}

function applyShadowStyles(
  model: ShapeElementModel,
  element: HTMLElement,
  renderer: DomRenderer
) {
  if (model.shadow) {
    const { offsetX, offsetY, blur, color } = model.shadow;
    setStyles(element, {
      boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${renderer.getColorValue(color)}`,
    });
  } else {
    setStyles(element, { boxShadow: '' });
  }
}

/**
 * Renders a ShapeElementModel to a given HTMLElement using DOM properties.
 * This function is intended to be registered via the DomElementRendererExtension.
 *
 * @param model - The shape element model containing rendering properties.
 * @param element - The HTMLElement to apply the shape's styles to.
 * @param renderer - The main DOMRenderer instance, providing access to viewport and color utilities.
 */
export const shapeDomRenderer = (
  model: ShapeElementModel,
  element: HTMLElement,
  renderer: DomRenderer
): void => {
  const { zoom } = renderer.viewport;
  const unscaledWidth = model.w;
  const unscaledHeight = model.h;
  const retained = getRetainedShapeDom(element);

  const fillColor = renderer.getColorValue(
    model.fillColor,
    DefaultTheme.shapeFillColor,
    true
  );
  const strokeColor = renderer.getColorValue(
    model.strokeColor,
    DefaultTheme.shapeStrokeColor,
    true
  );

  element.style.width = `${unscaledWidth * zoom}px`;
  element.style.height = `${unscaledHeight * zoom}px`;
  element.style.boxSizing = 'border-box';

  // Apply shape-specific clipping, border-radius, and potentially clear innerHTML
  applyShapeSpecificStyles(model, element, zoom);

  if (
    model.shapeType === 'diamond' ||
    model.shapeType === 'triangle' ||
    model.shapeType === 'hexagon'
  ) {
    element.style.border = 'none';
    element.style.backgroundColor = 'transparent';
    const { polygon, svg } = getOrCreateSvgPolygon(retained, element);
    const strokeW = model.strokeWidth;

    let svgPoints = '';
    if (model.shapeType === 'diamond') {
      svgPoints = SVGShapeBuilder.diamond(
        unscaledWidth,
        unscaledHeight,
        strokeW
      );
    } else if (model.shapeType === 'triangle') {
      svgPoints = SVGShapeBuilder.triangle(
        unscaledWidth,
        unscaledHeight,
        strokeW
      );
    } else {
      svgPoints = SVGShapeBuilder.hexagon(
        unscaledWidth,
        unscaledHeight,
        strokeW
      );
    }

    const finalFillColor = model.filled ? fillColor : 'transparent';

    svg.setAttribute('viewBox', `0 0 ${unscaledWidth} ${unscaledHeight}`);
    polygon.setAttribute('points', svgPoints);
    polygon.setAttribute('fill', finalFillColor);
    applySvgStrokeAttributes(polygon, model, strokeColor, strokeW);
  } else if (model.shapeType === 'cylinder' || model.shapeType === 'cloud') {
    element.style.border = 'none';
    element.style.backgroundColor = 'transparent';
    const { path, svg } = getOrCreateSvgPath(retained, element);
    const strokeW = model.strokeWidth;
    const pathD =
      model.shapeType === 'cylinder'
        ? SVGShapeBuilder.cylinder(unscaledWidth, unscaledHeight, strokeW)
        : SVGShapeBuilder.cloud(unscaledWidth, unscaledHeight, strokeW);
    const finalFillColor = model.filled ? fillColor : 'transparent';

    svg.setAttribute('viewBox', `0 0 ${unscaledWidth} ${unscaledHeight}`);
    path.setAttribute('d', pathD);
    path.setAttribute('fill', finalFillColor);
    applySvgStrokeAttributes(path, model, strokeColor, strokeW);
  } else {
    // Standard rendering for other shapes (e.g., rect, ellipse)
    removeSvg(retained);
    element.style.backgroundColor = model.filled ? fillColor : 'transparent';
    applyBorderStyles(model, element, strokeColor, zoom); // Uses standard CSS border
  }

  if (model.textDisplay && model.text) {
    const str = model.text.toString();
    const textElement = getOrCreateText(retained, element);
    if (isRTL(str)) {
      textElement.dir = 'rtl';
    } else {
      textElement.removeAttribute('dir');
    }
    textElement.style.position = 'absolute';
    textElement.style.inset = '0';
    textElement.style.display = 'flex';
    textElement.style.flexDirection = 'column';
    textElement.style.justifyContent =
      model.textVerticalAlign === 'center'
        ? 'center'
        : model.textVerticalAlign === 'top'
          ? 'flex-start'
          : 'flex-end';
    textElement.style.whiteSpace = 'pre-wrap';
    textElement.style.wordBreak = 'break-word';
    textElement.style.textAlign = model.textAlign;
    textElement.style.alignmentBaseline = 'alphabetic';
    textElement.style.fontFamily = model.fontFamily;
    textElement.style.fontSize = `${model.fontSize * zoom}px`;
    textElement.style.fontWeight = model.fontWeight;
    textElement.style.color = renderer.getColorValue(
      model.color,
      DefaultTheme.shapeTextColor,
      true
    );
    textElement.textContent = str;
  } else {
    removeText(retained);
  }

  applyTransformStyles(model, element);

  manageClassNames(model, element);
  applyShadowStyles(model, element, renderer);
};
