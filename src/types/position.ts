import { Cartesian3 } from "cesium";

export interface Angle {
  degree: number;
  radians: number;
}

export interface Attitude {
  heading: Angle;
  pitch: Angle;
  roll: Angle;
}

export interface Shape {
    height: number
    width: number
}

export interface Bounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface Position {
  lon: Angle;
  lat: Angle;
  height: number;
  c3: Cartesian3;
}
