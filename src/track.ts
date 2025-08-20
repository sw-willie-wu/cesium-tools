import { Viewer, ScreenSpaceEventHandler, ScreenSpaceEventType } from "cesium"
import { throttle } from "lodash"
import * as CommonTool from "./common"


export class TrackTool {
    viewer: Viewer
    handler: ScreenSpaceEventHandler

    constructor(viewer: Viewer, handler?: ScreenSpaceEventHandler) {
        this.viewer = viewer
        this.handler = handler ? handler : new ScreenSpaceEventHandler(viewer.scene.canvas)
    }

    trackMousePosition(freq: number = 100, refOutput: Object) {
        const _throttleFunc = throttle((movement: ScreenSpaceEventHandler.MotionEvent) => {
            const pos = CommonTool.getMousePosition(this.viewer, movement)
            Object.assign(refOutput, pos)
        }, freq)
        this.handler.setInputAction(_throttleFunc, ScreenSpaceEventType.MOUSE_MOVE)
    }

    trackMapParams(freq: number = 100, refOutput: Object) {
        const _throttleFunc = throttle(() => {
            const params = CommonTool.getMapParams(this.viewer)
            Object.assign(refOutput, params)
        }, freq)
        this.viewer.camera.changed.addEventListener(() => {_throttleFunc()})
    }

    trackCameraParams(freq: number = 100, refOutput: Object) {
        const _throttleFunc = throttle(() => {
            const params = CommonTool.getCameraParams(this.viewer)
            Object.assign(refOutput, params)
        }, freq)
        this.viewer.camera.changed.addEventListener(() => {_throttleFunc()})
    }
}