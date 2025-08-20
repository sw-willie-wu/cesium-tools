import type { Angle, Position } from "./position"


export interface MapParams {
    height: number
    width: number
    center: Position
    scale: number
}

export interface CameraParams {
    position: Position
    heading: Angle
    pitch: Angle
    roll: Angle
}