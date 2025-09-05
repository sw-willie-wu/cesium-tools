import type { Position, Attitude, Shape } from "./position"


export interface MapParams {
    shape: Shape
    center: Position
    scale: number
}

export interface CameraParams extends Position, Attitude {}