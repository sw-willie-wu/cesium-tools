import {
    Math as CMath,
    Cartesian3,
    Cartographic,
    
} from "cesium"
import type { Position } from "./types"


export const DegToRad = (deg: number) => CMath.toRadians(deg)
export const RadToDeg = (rad: number) => CMath.toDegrees(rad)

// 坐標轉換
export function C3ToPosition(c3: Cartesian3): Position {
    const llaRad = Cartographic.fromCartesian(c3)
    return {
        lon: { deg: RadToDeg(llaRad.longitude), rad: llaRad.longitude },
        lat: { deg: RadToDeg(llaRad.latitude), rad: llaRad.latitude },
        height: llaRad.height,
        c3: c3
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