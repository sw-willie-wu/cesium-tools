import {
    Math as CMath,
    Cartesian3,
    Cartographic,
    
} from "cesium"
import type { Position } from "./types"


export const DegToRad = (deg: number) => CMath.toRadians(deg)
export const RadToDeg = (rad: number) => CMath.toDegrees(rad)

// 坐標轉換
export function C3ToPosition(C3: Cartesian3): Position {
    const llaRad = Cartographic.fromCartesian(C3)
    return {
        Lon: { Deg: RadToDeg(llaRad.longitude), Rad: llaRad.longitude },
        Lat: { Deg: RadToDeg(llaRad.latitude), Rad: llaRad.latitude },
        Height: llaRad.height,
        C3: C3
    }
}

export function LLAToPosition(lon: number, lat: number, height?: number) {
    const c3 = Cartesian3.fromDegrees(lon, lat, height)
    return C3ToPosition(c3)
}

export function DegToAngle(deg: number) {
    return {Deg: deg, Rad: DegToRad(deg)}
}

export function RadToAngle(rad: number) {
    return {Deg: RadToDeg(rad), Rad: rad}
}