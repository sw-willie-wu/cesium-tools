import { Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType } from "cesium";
import { throttle } from "lodash";
import { NavigateTool } from "../navigator";
import { ConvertTool } from "../converter";

export class TrackTool {
  private viewer: Viewer;
  private handler: ScreenSpaceEventHandler;
  private navigator: NavigateTool;
  private converter: ConvertTool;

  constructor(viewer: Viewer, handler?: ScreenSpaceEventHandler) {
    this.viewer = viewer;
    this.handler = handler
      ? handler
      : new ScreenSpaceEventHandler(viewer.scene.canvas);
    this.navigator = new NavigateTool(this.viewer);
    this.converter = new ConvertTool(this.viewer);
    console.log("啟用 Track");
  }

  trackMousePosition(freq: number = 100, refOutput: Object) {
    const _throttleFunc = throttle(
      (movement: ScreenSpaceEventHandler.MotionEvent) => {
        const pos = this.converter.CanvasToPosition(movement.endPosition);
        Object.assign(refOutput, pos);
      },
      freq
    );
    this.handler.setInputAction(_throttleFunc, ScreenSpaceEventType.MOUSE_MOVE);
  }

  trackMapParams(freq: number = 100, refOutput: Object) {
    const _throttleFunc = throttle(() => {
      Object.assign(refOutput, this.navigator.map);
    }, freq);
    this.viewer.camera.changed.addEventListener(() => {
      _throttleFunc();
    });
  }

  trackCameraParams(freq: number = 100, refOutput: Object) {
    console.log("track camera");
    const _throttleFunc = throttle(() => {
      Object.assign(refOutput, this.navigator.camera);
    }, freq);
    this.viewer.camera.changed.addEventListener(() => {
      _throttleFunc();
    });
  }
}
