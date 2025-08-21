import type { GeoPosition, Attitude } from "./position"


export interface CanvasParams {
    height: number
    width: number
}

export interface MapParams {
    shape: CanvasParams
    center: GeoPosition
    scale: number
}

export interface CameraParams extends GeoPosition, Attitude {}