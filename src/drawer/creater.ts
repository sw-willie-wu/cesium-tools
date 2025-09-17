import {
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian3,
  PolylineDashMaterialProperty,
  PolygonHierarchy,
  HeightReference,
} from "cesium";

import { ConvertTool } from "../converter";
import { calculatePolygonPosition } from "../common";
import type { PolyTypes, DataSourceOptions } from "../types";

export function createPoint(
  position: CallbackPositionProperty | Cartesian3,
  options: DataSourceOptions
) {
  return {
    position: position,
    point: {
      pixelSize: options?.markerSize,
      color: ConvertTool.HexToColor(options?.markerColor),
      outlineColor: ConvertTool.HexToColor(options?.stroke),
      outlineWidth: options?.strokeWidth,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: options?.clampToGround
        ? HeightReference.CLAMP_TO_GROUND
        : HeightReference.NONE,
    },
  };
}

export function createLine(
  positions: CallbackProperty | Cartesian3[],
  isDash: boolean = false,
  options: DataSourceOptions
) {
  const lineColor = ConvertTool.HexToColor(options.stroke);
  return {
    polyline: {
      positions: positions,
      clampToGround: options?.clampToGround,
      width: options?.strokeWidth,
      material: isDash
        ? new PolylineDashMaterialProperty({
            color: lineColor,
            dashLength: 10,
            dashPattern: 255,
          })
        : lineColor,
    },
  };
}

export function createPolygon(
  positions: CallbackProperty | Cartesian3[],
  isDash: boolean = false,
  options: DataSourceOptions
) {
  const hierCallback = new CallbackProperty((time) => {
    const posArray = Array.isArray(positions)
      ? positions
      : positions.getValue(time);
    return new PolygonHierarchy(posArray);
  }, false);
  return {
    ...createLine(positions, isDash, options),
    polygon: {
      hierarchy: hierCallback,
      heightReference: options?.clampToGround
        ? HeightReference.CLAMP_TO_GROUND
        : HeightReference.NONE,
      material: ConvertTool.HexToColor(options.fill, 0.4),
      outline: false,
    },
  };
}

export function createPolygonByDiagonal(
  positions: CallbackProperty | Cartesian3[],
  isDash: boolean = false,
  sideNum: number = 4,
  options: DataSourceOptions
) {
  const posCallback = new CallbackProperty((time) => {
    const posArray = Array.isArray(positions)
      ? positions
      : positions.getValue(time);
    return calculatePolygonPosition(posArray, sideNum);
  }, false);
  return createPolygon(posCallback, isDash, options);
}

export function createPoly(
  drawType: PolyTypes,
  pointList: Cartesian3[],
  isDash: boolean = false,
  options: DataSourceOptions
) {
  switch (drawType) {
    case "Line":
      return createLine(
        new CallbackProperty(() => pointList, false),
        isDash,
        options
      );
    case "Circle":
      return createPolygonByDiagonal(
        new CallbackProperty(() => pointList, false),
        isDash,
        64,
        options
      );
    case "Square":
      return createPolygonByDiagonal(
        new CallbackProperty(() => pointList, false),
        isDash,
        4,
        options
      );
  }
}
