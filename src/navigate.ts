import { Viewer, HeadingPitchRange, Matrix4, Cartesian3 } from "cesium"
import * as Common from './common'
// import * as MeasureControl from "./measure"
import * as ConvertTool from './convert'
import type { Position } from "./types"
import { CommonTool } from "."


export class NavigateTool {
    viewer: Viewer

    constructor(viewer: Viewer) {
        this.viewer = viewer
    }

    lockPOV(position: Position | number[], heading: number, pitch: number, range: number) {
        let center
        if (Array.isArray(position)) {
            center = Cartesian3.fromDegrees(position[0], position[1], position[2])
        } else {
            center = position.C3
        }
        this.viewer.camera.lookAt(
            center,
            new HeadingPitchRange(
                ConvertTool.DegToRad(heading),
                ConvertTool.DegToRad(pitch),
                range
            )
        )
    }

    lockCurrentPOV() {
        const mapCenter = CommonTool.getMapParams(this.viewer)?.Center
        const cameraEOP = CommonTool.getCameraParams(this.viewer)
        if (!mapCenter || !cameraEOP) return
        const distance = CommonTool.calculateDistance(mapCenter, cameraEOP.Position)
        this.viewer.camera.lookAt(
            mapCenter.C3,
            new HeadingPitchRange(
                cameraEOP.Heading.Rad,
                cameraEOP.Pitch.Rad,
                distance
            )
        )
    }

    unlockPOV() {
        this.viewer.camera.lookAtTransform(Matrix4.IDENTITY)
    }

    rotateMap(target: { heading?: number, pitch?: number }) {
        const mapCenter = Common.getMapParams(this.viewer)?.Center
        const cameraEOP = Common.getCameraParams(this.viewer)
        if (!mapCenter) return

        const distance = CommonTool.calculateDistance(mapCenter, cameraEOP.Position)
        const targetHeading = target.heading === undefined ? cameraEOP.Heading.Deg : target.heading
        const targetPitch = target.pitch === undefined ? cameraEOP.Pitch.Deg : target.pitch

        let currentHeading = cameraEOP.Heading.Deg
        let currentPitch = cameraEOP.Pitch.Deg

        // console.log(targetHeading, currentHeading, targetPitch, currentPitch)

        // 每移動 1 度需要 10ms
        const intervalTime = 10
        let frame = 0
        const totalFrame = Math.ceil(Math.max(Math.abs(targetHeading - currentHeading), Math.abs(targetPitch - currentPitch)))


        // 限制極限值避免相機跳動
        const clampPitch = (pitch: number) => (pitch <= -90 ? -89.9 : pitch)
        const clampHeading = (heading: number) => ((heading < 0 || heading > 360) ? 360 : heading)

        // 確保新的值不會超過目標
        const insureTarget = (current: number, target: number, step: number) => {
            return step > 0 ? Math.min(current, target) : step < 0 ? Math.max(current, target) : target
        }

        // 確認旋轉方向
        const checkStep = (current: number, target: number) => target > current ? 1 : target < current ? -1 : 0
        const headingStepSign = checkStep(currentHeading, targetHeading)
        const pitchStepSign = checkStep(currentPitch, targetPitch)

        // 持續旋轉直到抵達目標
        const intervalId = setInterval(() => {
            currentHeading += headingStepSign
            currentPitch += pitchStepSign
            currentHeading = clampHeading(insureTarget(currentHeading, targetHeading, headingStepSign))
            currentPitch = clampPitch(insureTarget(currentPitch, targetPitch, pitchStepSign))
            frame++

            // 透過鎖定相機視角與距離，保持中心點不變
            this.lockPOV(mapCenter, currentHeading, currentPitch, distance)

            // 清除定時器並解除鎖定視角
            if (frame > totalFrame) {
                clearInterval(intervalId)
                this.unlockPOV()
            }
        }, intervalTime)
    }

    zoomIn() {
        const mapCenter = Common.getMapParams(this.viewer)?.Center
        const cameraEOP = Common.getCameraParams(this.viewer)
        if (!mapCenter || !cameraEOP) return
        const d = CommonTool.calculateDistance(mapCenter, cameraEOP.Position)
        this.lockPOV(mapCenter, cameraEOP.Heading.Deg, cameraEOP.Pitch.Deg, d * 0.9)
        this.unlockPOV()
    }

    zoomOut() {
        const mapCenter = Common.getMapParams(this.viewer)?.Center
        const cameraEOP = Common.getCameraParams(this.viewer)
        if (!mapCenter || !cameraEOP) return
        const d = CommonTool.calculateDistance(mapCenter, cameraEOP.Position)
        this.lockPOV(mapCenter, cameraEOP.Heading.Deg, cameraEOP.Pitch.Deg, d * 1.1)
        this.unlockPOV()
    }
}


// export function rotateMap(viewer: Viewer, target: { heading?: number, pitch?: number }) {
//     const mapCenter = Common.getMapParams(viewer)?.Center
//     const cameraEOP = Common.getCameraParams(viewer)
//     if (!mapCenter) return

//     const distance = MeasureControl.calculateDistance(mapCenter, cameraEOP.Position)
//     const targetHeading = target.heading ? target.heading : cameraEOP.Heading.Deg
//     const targetPitch = target.pitch ? target.pitch : cameraEOP.Pitch.Deg

//     let currentHeading = cameraEOP.Heading.Deg
//     let currentPitch = cameraEOP.Pitch.Deg

//     // 每移動 1 度需要 10ms
//     const intervalTime = 10
//     let frame = 0
//     const totalFrame = Math.ceil(Math.max(Math.abs(targetHeading - currentHeading), Math.abs(targetPitch - currentPitch)))

//     // 限制極限值避免相機跳動
//     const clampPitch = (pitch: number) => (pitch <= -90 ? -89.9 : pitch)
//     const clampHeading = (heading: number) => ((heading <= 0 || heading > 360) ? 360 : heading)

//     // 確保新的值不會超過目標
//     const insureTarget = (current: number, target: number, step: number) => {
//         return step > 0 ? Math.min(current, target) : step < 0 ? Math.max(current, target) : target
//     }

//     // 確認旋轉方向
//     const checkStep = (current: number, target: number) => target > current ? 1 : target < current ? -1 : 0
//     const headingStepSign = checkStep(currentHeading, targetHeading)
//     const pitchStepSign = checkStep(currentPitch, targetPitch)

//     // 持續旋轉直到抵達目標
//     const intervalId = setInterval(() => {
//         currentHeading += headingStepSign
//         currentPitch += pitchStepSign
//         currentHeading = clampHeading(insureTarget(currentHeading, targetHeading, headingStepSign))
//         currentPitch = clampPitch(insureTarget(currentPitch, targetPitch, pitchStepSign))
//         frame++

//         // 設定相機位置與方向，保持中心點不變
//         viewer.camera.lookAt(
//             mapCenter.C3,
//             new HeadingPitchRange(
//                 Common.degToRad(currentHeading),
//                 Common.degToRad(currentPitch),
//                 distance
//             )
//         )
//         // 清除定時器並解除相機綁定
//         if (frame > totalFrame) {
//             clearInterval(intervalId)
//             viewer.camera.lookAtTransform(Matrix4.IDENTITY)
//         }
//     }, intervalTime)
// }