import {
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian3,
  PolylineDashMaterialProperty,
  PolygonHierarchy,
  HeightReference,
  Billboard,
  HorizontalOrigin,
} from "cesium";

import { ConvertTool } from "../converter";
import {
  generateLabelCanvas,
  generatePolygonPositions,
  calculatePolygonPosition,
  calculateGeodesic,
  calculateGeodesicDistance,
  formatUnit
} from "../common";
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
      material: ConvertTool.HexToColor(options.fill),
      outline: false,
    },
  };
}

export function createPolygonFromCenter(
  positions: Cartesian3[] | CallbackProperty,
  // position: Cartesian3,
  // distance: CallbackProperty | number,
  isDash: boolean = false,
  sideNum: number = 4,
  options: DataSourceOptions
) {
  const posCallback = new CallbackProperty((time) => {
    const posArray = Array.isArray(positions)
      ? positions
      : positions.getValue(time);
    if (posArray.length < 2) return;
    const center = ConvertTool.C3ToPosition(posArray[0]);
    const posEnd = ConvertTool.C3ToPosition(posArray[1]);
    // const distance = calculateGeodesicDistance(posArray[0], posArray[1]);
    const distance = Math.sqrt((posEnd.lon.degree - center.lon.degree)**2 + (posEnd.lat.degree - center.lat.degree)**2);
    // console.log(distance);
    const semiX = distance;
    const semiY = distance;
    const p = generatePolygonPositions(center, semiX, semiY, sideNum);
    // console.debug(p)
    return p;
  }, false);
  return createPolygon(posCallback, isDash, options);
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
  pointList: Cartesian3[] | CallbackProperty,
  isDash: boolean = false,
  options: DataSourceOptions
) {
  switch (drawType) {
    case "Line":
      return createLine(
        pointList,
        isDash,
        options
      );
    case "Circle":
      return createPolygonByDiagonal(
        pointList,
        isDash,
        64,
        options
      );
    case "Square":
      return createPolygonByDiagonal(
        pointList,
        isDash,
        4,
        options
      );
    case "Buffer":
      return createPolygonFromCenter(
        pointList,
        isDash,
        64,
        options
      );
  }
}

function getImageURL(p1: Cartesian3, p2: Cartesian3, style?: Record<string, any>) {
  const dist = calculateGeodesicDistance(p1, p2);
  const text = formatUnit(dist);
  if (!text) return "";
  return generateLabelCanvas(text, style);
}


export function createDistanceLabel(
  p1: CallbackPositionProperty | Cartesian3,
  p2: CallbackPositionProperty | Cartesian3,
  style?: Record<string, any>
) {
  const useCallback = !(p1 instanceof Cartesian3 && p2 instanceof Cartesian3)

  const label = useCallback ? new CallbackProperty((time) => {
    const pos1 = (p1 instanceof Cartesian3) ? p1 : p1.getValue(time);
    const pos2 = (p2 instanceof Cartesian3) ? p2 : p2.getValue(time);
    if (!pos1 || !pos2) return "";
    return getImageURL(pos1, pos2, style)
  }, false) : getImageURL(p1, p2, style);
  const pos = useCallback ? new CallbackProperty((time) => {
    const pos1 = (p1 instanceof Cartesian3) ? p1 : p1.getValue(time);
    const pos2 = (p2 instanceof Cartesian3) ? p2 : p2.getValue(time);
    if (!pos1 || !pos2) return;
    const geodesic = calculateGeodesic(pos1, pos2);
    return ConvertTool.CartoToPosition(geodesic.interpolateUsingFraction(0.5)).c3;
  }, false) : ConvertTool.CartoToPosition(calculateGeodesic(p1, p2).interpolateUsingFraction(0.5)).c3;

  return {
    position: pos,
    billboard: {
      image: label,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      heightReference: HeightReference.CLAMP_TO_GROUND
    },
    // label: {
    //   text: labelCallback,
    //   font: "16px arial",
    //   showBackground: true,
    //   backgroundColor: ConvertTool.HexToColor("#000000ff", 0.6),
    //   heightReference: HeightReference.CLAMP_TO_GROUND,
    //   horizontalOrigin: HorizontalOrigin.CENTER,
    //   disableDepthTestDistance: Number.POSITIVE_INFINITY
    // }
  }
}
