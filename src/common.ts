import {
  type Viewer,
  Cartesian2,
  Cartesian3,
  ScreenSpaceEventHandler,
} from "cesium";
import * as ConvertTool from "./convert";
import type { Position } from "./types";
import type { CameraParams, MapParams } from "./types/params";

export function calculateDistance(p1: Position, p2: Position): number {
  return Cartesian3.distance(p1.c3, p2.c3);
}

// 取得滑鼠位置
export function getMousePosition(
  viewer: Viewer,
  movement: ScreenSpaceEventHandler.MotionEvent
) {
  const pos = movement.endPosition;
  return getPositionFromCanvas(viewer, pos.x, pos.y);
}

// 取得螢幕位置在地球的實際坐標
export function getPositionFromCanvas(
  viewer: Viewer,
  width: number,
  height: number
): Position | undefined {
  const canvasCoords = new Cartesian2(width, height);
  const positionc3 = viewer.camera.pickEllipsoid(canvasCoords);
  if (!positionc3) return;
  return ConvertTool.C3ToPosition(positionc3);
}

// 取得地圖參數
export function getMapParams(viewer: Viewer): MapParams | undefined {
  const width = viewer.canvas.clientWidth;
  const height = viewer.canvas.clientHeight;
  const center = getPositionFromCanvas(viewer, width / 2, height / 2);
  if (!center) return;

  const sacleBarLength = 100;
  const left = getPositionFromCanvas(
    viewer,
    width / 2 - sacleBarLength / 2,
    height / 2
  );
  const right = getPositionFromCanvas(
    viewer,
    width / 2 + sacleBarLength / 2,
    height / 2
  );
  if (!left || !right) return;

  return {
    height: height,
    width: width,
    center: center,
    scale: calculateDistance(left, right) / sacleBarLength,
  };
}

// 取得相機外方位參數
export function getCameraParams(viewer: Viewer): CameraParams {
  const camera = viewer.camera;
  return {
    position: ConvertTool.C3ToPosition(camera.positionWC),
    heading: { deg: ConvertTool.RadToDeg(camera.heading), rad: camera.heading },
    pitch: { deg: ConvertTool.RadToDeg(camera.pitch), rad: camera.pitch },
    roll: { deg: ConvertTool.RadToDeg(camera.roll), rad: camera.roll },
  };
}
