interface PathCommand {
  command: string;
  coordinates: number[];
}

/**
 * A utility class for building SVG path strings using command-based API.
 * Supports moveTo, lineTo, curveTo operations and can build complete path strings.
 */
export class SVGPathBuilder {
  private commands: PathCommand[] = [];

  moveTo(x: number, y: number): this {
    this.commands.push({
      command: 'M',
      coordinates: [x, y],
    });
    return this;
  }

  lineTo(x: number, y: number): this {
    this.commands.push({
      command: 'L',
      coordinates: [x, y],
    });
    return this;
  }

  curveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number
  ): this {
    this.commands.push({
      command: 'C',
      coordinates: [cp1x, cp1y, cp2x, cp2y, x, y],
    });
    return this;
  }

  arcTo(
    rx: number,
    ry: number,
    xAxisRotation: number,
    largeArc: 0 | 1,
    sweep: 0 | 1,
    x: number,
    y: number
  ): this {
    this.commands.push({
      command: 'A',
      coordinates: [rx, ry, xAxisRotation, largeArc, sweep, x, y],
    });
    return this;
  }

  closePath(): this {
    this.commands.push({
      command: 'Z',
      coordinates: [],
    });
    return this;
  }

  build(): string {
    const pathSegments = this.commands.map(cmd => {
      const coords = cmd.coordinates.join(' ');
      return coords ? `${cmd.command} ${coords}` : cmd.command;
    });

    return pathSegments.join(' ');
  }

  clear(): this {
    this.commands = [];
    return this;
  }
}
