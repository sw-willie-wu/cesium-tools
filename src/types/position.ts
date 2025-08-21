import { Cartesian3 } from 'cesium'


export interface Angle {
    degree: number
    radians: number
}

export interface CanvasPosition {
    x: number
    y: number
}

export interface GeoPosition {
    lon: Angle
    lat: Angle
    height: number
    c3: Cartesian3
}

export interface Attitude {
    heading: Angle
    pitch: Angle
    Roll: Angle
}