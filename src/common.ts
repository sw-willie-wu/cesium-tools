import { Cartesian3, Cartographic, EllipsoidGeodesic } from "cesium";

import { ConvertTool } from "./converter";
import type { Bounds, Position, Shape } from "./types";

export function generateUUID() {
  // 簡單的 uuid4 產生器
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function calculateBoxByDiagonal(diagonalArray?: Cartesian3[]):
  | {
      bounds: Bounds;
      center: Position;
      shape: Shape;
    }
  | undefined {
  if (!diagonalArray || diagonalArray.length < 2) {
    return; // 沒有兩個點就不畫
  }

  const carto1 = Cartographic.fromCartesian(diagonalArray[0]);
  const carto2 = Cartographic.fromCartesian(diagonalArray[1]);
  const geodesic = new EllipsoidGeodesic(carto1, carto2);

  // 計算中心
  const midpoint = geodesic.interpolateUsingFraction(0.5);
  const distance = geodesic.surfaceDistance; // 對角線公尺

  const lonMin = ConvertTool.RadToDeg(
    Math.min(carto1.longitude, carto2.longitude)
  );
  const lonMax = ConvertTool.RadToDeg(
    Math.max(carto1.longitude, carto2.longitude)
  );
  const latMin = ConvertTool.RadToDeg(
    Math.min(carto1.latitude, carto2.latitude)
  );
  const latMax = ConvertTool.RadToDeg(
    Math.max(carto1.latitude, carto2.latitude)
  );

  const dx = lonMax - lonMin; // 經度差
  const dy = latMax - latMin; // 緯度差
  const theta = Math.atan2(dy, dx); // 弧度

  return {
    bounds: {
      left: lonMin,
      right: lonMax,
      top: latMax,
      bottom: latMin,
    },
    shape: {
      height: distance * Math.sin(theta),
      width: distance * Math.cos(theta),
    },
    center: ConvertTool.CartoToPosition(midpoint),
  };
}

export function calculatePolygonPosition(
  diagonalArray: Cartesian3[],
  sideNum: number,
) {
  const angleStep = (2 * Math.PI) / sideNum;
  const angleOffset = sideNum % 2 === 0 ? angleStep / 2 : 0;
  const boxElem = calculateBoxByDiagonal(diagonalArray);
  const center = boxElem ? boxElem.center : ConvertTool.LLAToPosition(0, 0, 0);
  const semiX = boxElem
    ? ((boxElem.bounds.right - boxElem.bounds.left) / 2) *
      (sideNum < 16 ? Math.sqrt(2) : 1)
    : 1;
  const semiY = boxElem
    ? ((boxElem.bounds.top - boxElem.bounds.bottom) / 2) *
      (sideNum < 16 ? Math.sqrt(2) : 1)
    : 1;
  const posResult: Cartesian3[] = [];
  for (let i = 0; i <= sideNum; i++) {
    const theta = i * angleStep + angleOffset;
    const dLon = semiX * Math.cos(theta);
    const dLat = semiY * Math.sin(theta);
    posResult.push(
      ConvertTool.LLAToPosition(
        center.lon.degree + dLon,
        center.lat.degree + dLat
      ).c3
    );
  }
  posResult.push(posResult[0]);
  return posResult;
}

// import {
//   Viewer,
//   Cartesian2,
//   Cartesian3,
//   ScreenSpaceEventHandler,
// } from "cesium";
// import { ConvertTool } from "./convert";
// import type { Position, CameraParams, MapParams, CanvasParams } from "./types";

// export function calculateDistance(p1: Position, p2: Position): number {
//   return Cartesian3.distance(p1.c3, p2.c3);
// }

// // 取得滑鼠位置
// export function getMousePosition(
//   viewer: Viewer,
//   movement: ScreenSpaceEventHandler.MotionEvent
// ) {
//   const pos = movement.endPosition;
//   return getPositionFromCanvas(viewer, pos.x, pos.y);
// }

// // 取得螢幕位置在地球的實際坐標
// export function getPositionFromCanvas(
//   viewer: Viewer,
//   width: number,
//   height: number
// ): Position | undefined {
//   const canvasCoords = new Cartesian2(width, height);
//   const positionc3 = viewer.camera.pickEllipsoid(canvasCoords);
//   if (!positionc3) return;
//   return ConvertTool.C3ToPosition(positionc3);
// }

// // 取得地圖參數
// export function getMapParams(viewer: Viewer): MapParams | undefined {
//   const width = viewer.canvas.clientWidth;
//   const height = viewer.canvas.clientHeight;
//   const center = getPositionFromCanvas(viewer, width / 2, height / 2);
//   if (!center) return;

//   const sacleBarLength = 100;
//   const left = getPositionFromCanvas(
//     viewer,
//     width / 2 - sacleBarLength / 2,
//     height / 2
//   );
//   const right = getPositionFromCanvas(
//     viewer,
//     width / 2 + sacleBarLength / 2,
//     height / 2
//   );
//   if (!left || !right) return;

//   return {
//     height: height,
//     width: width,
//     center: center,
//     scale: calculateDistance(left, right) / sacleBarLength,
//   };
// }

// // 取得相機外方位參數
// export function getCameraParams(viewer: Viewer): CameraParams {
//   const camera = viewer.camera;
//   return {
//     position: ConvertTool.C3ToPosition(camera.positionWC),
//     heading: { deg: ConvertTool.RadToDeg(camera.heading), rad: camera.heading },
//     pitch: { deg: ConvertTool.RadToDeg(camera.pitch), rad: camera.pitch },
//     roll: { deg: ConvertTool.RadToDeg(camera.roll), rad: camera.roll },
//   };
// }
