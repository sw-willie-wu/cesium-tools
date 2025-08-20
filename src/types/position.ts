import { Cartesian3 } from 'cesium'


export interface Angle {
    deg: number
    rad: number
}

export interface Position {
    lon: Angle
    lat: Angle
    height: number
    c3: Cartesian3
}