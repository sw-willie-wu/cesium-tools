import { Viewer, HeadingPitchRange, Matrix4, Cartesian3 } from "cesium";

import { ConvertTool } from "../converter";
import type {
  Attitude,
  Position,
  CameraParams,
  Shape,
  MapParams,
} from "../types";

/**
 * NavigateTool
 * 主要用於控制 Cesium Viewer 的相機與地圖視角，包含取得相機參數、地圖中心、縮放、旋轉等功能。
 *
 * 屬性說明：
 * - viewer: Cesium 的 Viewer 實例
 * - converter: 負責座標與角度轉換的工具
 *
 * 方法簡介：
 * - camera：取得目前相機的空間位置與姿態（heading/pitch/roll）
 * - canvas：取得畫布尺寸
 * - map：取得地圖中心點、比例尺等資訊
 * - setFOV：設定相機視角（位置、朝向、俯仰、距離）
 * - lockCurrentFOV：將相機鎖定在目前地圖中心
 * - resetFOV：重設相機視角
 * - rotateMap：平滑旋轉地圖（heading/pitch）
 * - zoom/zoomIn/zoomOut：縮放地圖
 */
export class NavigateTool {
  private viewer: Viewer;
  converter: ConvertTool;

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.converter = new ConvertTool(this.viewer);
  }

  get camera(): CameraParams {
    const cam = this.viewer.camera;
    const position: Position = this.converter.C3ToPosition(cam.positionWC);
    const attitude: Attitude = {
      heading: this.converter.RadToAngle(cam.heading),
      pitch: this.converter.RadToAngle(cam.pitch),
      roll: this.converter.RadToAngle(cam.roll),
    };
    return { ...position, ...attitude };
  }

  get canvas(): Shape {
    return {
      width: this.viewer.canvas.clientWidth,
      height: this.viewer.canvas.clientHeight,
    };
  }

  get map(): Partial<MapParams> {
    const canvas = this.canvas;
    const center = this.converter.CanvasToPosition({
      x: canvas.width / 2,
      y: canvas.height / 2,
    });
    if (!center) return {};

    const sacleBarLength = 100;
    const left = this.converter.CanvasToPosition({
      x: canvas.width / 2 - sacleBarLength / 2,
      y: canvas.height / 2 - sacleBarLength / 2,
    });
    const right = this.converter.CanvasToPosition({
      x: canvas.width / 2 + sacleBarLength / 2,
      y: canvas.height / 2 + sacleBarLength / 2,
    });
    if (!left || !right) return {};

    return {
      shape: canvas,
      center: center,
      scale: Cartesian3.distance(left.c3, right.c3) / sacleBarLength,
    };
  }

  static disableDefaultControl(viewer: Viewer) {
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = false;
    controller.enableTranslate = false;
    controller.enableZoom = false;
    controller.enableTilt = false;
    controller.enableLook = false;
  }

  static enableDefaultControl(viewer: Viewer) {
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableTranslate = true;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = true;
  }

  disableDefaultControl() {
    NavigateTool.disableDefaultControl(this.viewer);
  }

  enableDefaultControl() {
    NavigateTool.enableDefaultControl(this.viewer);
  }

  setFOV(
    position: Position | number[],
    heading: number,
    pitch: number,
    range: number
  ) {
    if (Array.isArray(position)) {
      position = this.converter.LLAToPosition(
        position[0],
        position[1],
        position[2]
      );
    }
    this.viewer.camera.lookAt(
      position.c3,
      new HeadingPitchRange(
        this.converter.DegToRad(heading),
        this.converter.DegToRad(pitch),
        range
      )
    );
  }

  lockCurrentFOV() {
    const mapCenter = this.map?.center;
    const camera = this.camera;
    if (!mapCenter || !camera) return;

    this.viewer.camera.lookAt(
      mapCenter.c3,
      new HeadingPitchRange(
        camera.heading.radians,
        camera.pitch.radians,
        Cartesian3.distance(mapCenter.c3, camera.c3)
      )
    );
  }

  resetFOV() {
    this.viewer.camera.lookAtTransform(Matrix4.IDENTITY);
  }

  rotateMap(target: { heading?: number; pitch?: number }) {
    const mapCenter = this.map?.center;
    if (!mapCenter) return;
    const cameraEOP = this.camera;
    const distance = Cartesian3.distance(mapCenter.c3, cameraEOP.c3);
    const targetHeading =
      target.heading === undefined ? cameraEOP.heading.degree : target.heading;
    const targetPitch =
      target.pitch === undefined ? cameraEOP.pitch.degree : target.pitch;

    let currentHeading = cameraEOP.heading.degree;
    let currentPitch = cameraEOP.pitch.degree;

    // 每移動 1 度耗時 10 ms
    const intervalTime = 10;
    let frame = 0;
    const totalFrame = Math.ceil(
      Math.max(
        Math.abs(targetHeading - currentHeading),
        Math.abs(targetPitch - currentPitch)
      )
    );

    // 限制極限值避免相機跳動
    const clampPitch = (pitch: number) => (pitch <= -90 ? -89.9 : pitch);
    const clampHeading = (heading: number) =>
      heading <= 0 || heading > 360 ? 360 : heading;

    // 確保新的值不會超過目標
    const insureTarget = (current: number, target: number, step: number) => {
      return step > 0
        ? Math.min(current, target)
        : step < 0
        ? Math.max(current, target)
        : target;
    };

    // 確認旋轉方向
    const checkStep = (current: number, target: number) =>
      target > current ? 1 : target < current ? -1 : 0;
    const headingStepSign = checkStep(currentHeading, targetHeading);
    const pitchStepSign = checkStep(currentPitch, targetPitch);

    // 持續旋轉直到抵達目標
    const intervalId = setInterval(() => {
      currentHeading += headingStepSign;
      currentPitch += pitchStepSign;
      currentHeading = clampHeading(
        insureTarget(currentHeading, targetHeading, headingStepSign)
      );
      currentPitch = clampPitch(
        insureTarget(currentPitch, targetPitch, pitchStepSign)
      );
      frame++;

      // 透過鎖定相機視角與距離，保持中心點不變
      this.setFOV(mapCenter, currentHeading, currentPitch, distance);

      // 清除定時器並重設視角
      if (frame > totalFrame) {
        clearInterval(intervalId);
        this.resetFOV();
      }
    }, intervalTime);
  }

  zoom(scale: number) {
    const mapCenter = this.map?.center;
    const cameraEOP = this.camera;
    if (!mapCenter || !cameraEOP) return;
    const d = Cartesian3.distance(mapCenter.c3, cameraEOP.c3);
    this.setFOV(
      mapCenter,
      cameraEOP.heading.degree,
      cameraEOP.pitch.degree,
      d * scale
    );
    this.resetFOV();
  }

  zoomIn() {
    this.zoom(0.9);
  }

  zoomOut() {
    this.zoom(1.1);
  }
}
