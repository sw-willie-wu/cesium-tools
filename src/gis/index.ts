import { intersect } from "@turf/intersect";
import { union } from "@turf/union";
import { featureCollection } from "@turf/helpers";
import { Entity } from "cesium";

import { ConvertTool } from "../converter";


export function intersectEntities(entities: Entity[]) {
    const turfPolys = entities.map((entity: Entity) =>
        ConvertTool.EntityToPolygon(entity)
    );
    const validPolys = turfPolys.filter((poly) => poly !== undefined);
    return intersect(featureCollection(validPolys));
}

export function unionEntities(entities: Entity[]) {
    const turfPolys = entities.map((entity: Entity) =>
        ConvertTool.EntityToPolygon(entity)
    );
    const validPolys = turfPolys.filter((poly) => poly !== undefined);
    return union(featureCollection(validPolys));
}
