import {
  Viewer,
  Math as CMath,
  Color,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Rectangle,
} from "cesium";
import type { Angle, Bounds, Position, CanvasPosition } from "../types";

export class ConvertTool {
  private viewer: Viewer;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
  }
  static DegToRad = (deg: number) => CMath.toRadians(deg);
  static RadToDeg = (rad: number) => CMath.toDegrees(rad);

  static CartoToPosition(carto: Cartographic): Position {
    return {
      lon: {
        degree: this.RadToDeg(carto.longitude),
        radians: carto.longitude,
      },
      lat: {
        degree: this.RadToDeg(carto.latitude),
        radians: carto.latitude,
      },
      height: carto.height,
      c3: Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height),
    };
  }

  static C3ToPosition(c3: Cartesian3): Position {
    const carto = Cartographic.fromCartesian(c3);
    return this.CartoToPosition(carto);
  }

  static LLAToPosition(lon: number, lat: number, height?: number) {
    const c3 = Cartesian3.fromDegrees(lon, lat, height);
    return this.C3ToPosition(c3);
  }

  static DegToAngle(deg: number): Angle {
    return { degree: deg, radians: this.DegToRad(deg) };
  }

  static RadToAngle(rad: number): Angle {
    return { degree: this.RadToDeg(rad), radians: rad };
  }

  static BoundsToRectangle(bounds?: Bounds): Rectangle {
    if (!bounds) return Rectangle.MAX_VALUE;
    return Rectangle.fromDegrees(
      bounds.left,
      bounds.bottom,
      bounds.right,
      bounds.top
    );
  }

  static HexToColor(
    colorHex: string | undefined,
    alpha?: number
  ): Color | undefined {
    if (colorHex === undefined) return;
    if (!colorHex.startsWith("#")) {
      colorHex = `#${colorHex}`;
    }
    if (colorHex.length === 9) {
      alpha = alpha ? alpha : parseInt(colorHex.slice(7), 16) / 255;
    }
    let color = Color.fromCssColorString(colorHex.slice(0, 7));
    if (alpha !== undefined) {
      color = color.withAlpha(alpha);
    }
    return color;
  }

  DegToRad = (deg: number) => CMath.toRadians(deg);
  RadToDeg = (rad: number) => CMath.toDegrees(rad);

  CartoToPosition(carto: Cartographic): Position {
    return {
      lon: {
        degree: this.RadToDeg(carto.longitude),
        radians: carto.longitude,
      },
      lat: {
        degree: this.RadToDeg(carto.latitude),
        radians: carto.latitude,
      },
      height: carto.height,
      c3: Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height),
    };
  }

  C3ToPosition(c3: Cartesian3): Position {
    const carto = Cartographic.fromCartesian(c3);
    return this.CartoToPosition(carto);
  }

  LLAToPosition(lon: number, lat: number, height?: number) {
    const c3 = Cartesian3.fromDegrees(lon, lat, height);
    return this.C3ToPosition(c3);
  }

  DegToAngle(deg: number): Angle {
    return { degree: deg, radians: this.DegToRad(deg) };
  }

  RadToAngle(rad: number): Angle {
    return { degree: this.RadToDeg(rad), radians: rad };
  }

  BoundsToRectangle(bounds?: Bounds): Rectangle {
    if (!bounds) return Rectangle.MAX_VALUE;
    return Rectangle.fromDegrees(
      bounds.left,
      bounds.bottom,
      bounds.right,
      bounds.top
    );
  }

  HexToColor(
    colorHex: string | undefined,
    alpha?: number
  ): Color | undefined {
    if (colorHex === undefined) return;
    if (!colorHex.startsWith("#")) {
      colorHex = `#${colorHex}`;
    }
    if (colorHex.length === 9) {
      alpha = alpha ? alpha : parseInt(colorHex.slice(7), 16) / 255;
    }
    let color = Color.fromCssColorString(colorHex.slice(0, 7));
    if (alpha !== undefined) {
      color = color.withAlpha(alpha);
    }
    return color;
  }

  CanvasToPosition(canvas: CanvasPosition): Position | undefined {
    const c2 = new Cartesian2(canvas.x, canvas.y);
    const c3 = this.viewer.camera.pickEllipsoid(c2);
    if (!c3) return;
    return ConvertTool.C3ToPosition(c3);
  }
}
