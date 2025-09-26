import {
  Viewer,
  Cartesian3,
  ConstantProperty,
  ConstantPositionProperty,
  DataSource,
  Entity,
  ModelGraphics,
} from "cesium";

import { ConvertTool } from "../converter";


export class EntityControl {
  private viewer: Viewer;
  private converter: ConvertTool;
  dataMap: Map<string, Entity> = new Map();
  entityDataSourceMap: Map<string, DataSource> = new Map();

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.converter = new ConvertTool(this.viewer);
  }

  addEntity(
    key: string,
    entity: Entity | Entity.ConstructorOptions,
    isShow: boolean = false,
    dataSource?: DataSource
  ) {
    if (!entity.id) entity.id = key;
    if (!entity.name) entity.name = key;
    const res = dataSource
      ? dataSource.entities.add(entity)
      : this.viewer.entities.add(entity);
    res.show = isShow;
    this.dataMap.set(key, res);
    if (dataSource) this.entityDataSourceMap.set(key, dataSource);
  }

  addModel(
    key: string,
    url: string,
    isShow: boolean = false,
    coords?: { lon: number; lat: number; height: number },
    options?: ModelGraphics.ConstructorOptions,
    dataSource?: DataSource
  ) {
    const position = coords
      ? this.converter.LLAToPosition(coords.lon, coords.lat, coords.height)
      : this.converter.C3ToPosition(new Cartesian3(0, 0, 0));
    const entityOptions: Entity.ConstructorOptions = {
      id: key,
      position: position.c3,
      model: !options ? { uri: url } : options,
    };
    this.addEntity(key, entityOptions, isShow, dataSource);
  }

  getEntity(key: string, dataSource?: DataSource) {
    if (this.dataMap.has(key)) return this.dataMap.get(key);
    return dataSource
      ? dataSource.entities.getById(key)
      : this.viewer.entities.getById(key);
  }

  removeEntity(key: string) {
    const entity = this.dataMap.get(key);
    if (!entity) return;
    const ds = this.entityDataSourceMap.get(key);
    if (ds) {
      ds.entities.remove(entity);
    } else {
      this.viewer.entities.remove(entity);
    }
    // 清理 Map 項目
    this.dataMap.delete(key);
    this.entityDataSourceMap.delete(key);
  }

  // selectEntity(key: string, entity: Entity, options?: any) {
  //   let layer: Entity.ConstructorOptions | undefined = undefined
  //   const defaultOptions = {
  //     clampToGround: true,
  //     fill: "#ffd900ff",
  //     alpha: 1,
  //     markerColor: "#ffd90000",
  //     markerSize: 8,
  //     stroke: "#ffd900",
  //     strokeWidth: 10,
  //     show: true,
  //   };
  //   options = { ...defaultOptions, ...options };
  //   // if (entity.polygon) {
  //   //   const hierarchy = entity.polygon.hierarchy?.getValue();
  //   //   layer = Creater.createLine(hierarchy.positions, false, options);
  //   // } else
  //   if (entity.polyline) {
  //     const positions = entity.polyline.positions?.getValue();
  //     layer = Creater.createLine(positions, false, options);

  //   } else if (entity.point) {
  //     const position = entity.position?.getValue();
  //     if (!position) return;
  //     layer = Creater.createPoint(position, options);
  //     options.strokeWidth = 7;
  //     options.markerSize = entity.point.pixelSize;
  //     // this.addEntity(key, layer, options.show);
  //   }
  //   if (!layer) return;
  //   this.addEntity(key, layer, options.show);
  // }

  updateEntityOptions(key: string, options: any) {
    const entity = this.dataMap.get(key);
    if (!entity) {
      console.error(`❌ ${key} not exist in entities.`);
      return;
    }

    Object.entries(options).forEach(([k, v]) => {
      if (k === "alpha") {
        return; // 跳過 alpha 處理
      }

      // 處理顏色相關屬性
      if (["fill", "markerColor", "stroke"].includes(k) && typeof v === "string") {
        const colorValue = this.converter.HexToColor(v as string, options?.alpha || 1);
        (entity as any)[k] = colorValue;
        return;
      }

      // 處理 show 屬性
      if (k === "show" && typeof v === "boolean") {
        entity.show = v;
        return;
      }

      // 其他屬性直接設置
      if (entity.hasOwnProperty(k)) {
        (entity as any)[k] = v;
      }
    });

    this.viewer.scene.requestRender();
  }

  fixEntityPosition(key: string) {
    const entity = this.dataMap.get(key);
    if (!entity) return;
    if (entity.position) {
      entity.position = new ConstantPositionProperty(
        entity.position.getValue()
      );
    }
    if (entity.polyline) {
      entity.polyline.positions = new ConstantProperty(
        entity.polyline.positions?.getValue()
      );
    }
    if (entity.polygon) {
      entity.polygon.hierarchy = new ConstantProperty(
        entity.polygon.hierarchy?.getValue()
      );
    }
  }
}
