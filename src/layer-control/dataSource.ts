import {
  Viewer,
  DataSource,
  GeoJsonDataSource,
  CustomDataSource,
  PolylineGraphics,
  PolygonGraphics,
  PointGraphics,
  HeightReference,
} from "cesium";

import { ConvertTool } from "../converter";
import { generateColor } from "../common";
import type { DataSourceOptions } from "../types/options";

const defaultOption = {
  clampToGround: true,
  alpha: 1,
  markerSize: 8,
  strokeWidth: 2,
  show: true,
};

export class DataSourceControl {
  private viewer: Viewer;
  private converter: ConvertTool;
  dataMap: Map<string, DataSource> = new Map();

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.converter = new ConvertTool(this.viewer);
  }

  addDataSource(
    key: string,
    dataSource: CustomDataSource,
    isShow: boolean = false
  ) {
    if (this.dataMap.has(key)) return;
    this.viewer.dataSources.add(dataSource);
    this.dataMap.set(key, dataSource);
    dataSource.show = isShow;
    this.viewer.scene.requestRender();
  }

  async addGeoJson(
    key: string,
    url: string,
    isShow: boolean = false,
    options?: DataSourceOptions
  ) {
    if (this.dataMap.has(key)) return;
    try {
      const dataSource = await GeoJsonDataSource.load(url);
      dataSource.name = key;
      // console.debug(key, dataSource);

      const opt = { ...defaultOption, ...options };
      opt.fill = opt.fill ? opt.fill : generateColor();
      opt.stroke = opt.stroke ? opt.stroke : opt.fill;
      opt.markerColor = opt.markerColor ? opt.markerColor : opt.fill;

      dataSource.entities.values.forEach((entity) => {
        if (entity.polygon) {
          const hierarchy = entity.polygon.hierarchy?.getValue();
          if (!hierarchy || !hierarchy.positions) return;

          // 驗證座標是否包含 NaN
          const validPositions = hierarchy.positions.filter((position: any) => {
            return (
              position &&
              !isNaN(position.x) &&
              !isNaN(position.y) &&
              !isNaN(position.z)
            );
          });

          if (validPositions.length < 3) {
            console.warn(`跳過無效的多邊形 ${entity.id}: 有效座標數量不足`);
            return;
          }

          console.debug("重新繪製多邊形");
          entity.polyline = new PolylineGraphics({
            positions: validPositions,
            clampToGround: opt?.clampToGround,
            width: opt?.strokeWidth,
            material: ConvertTool.HexToColor(opt.stroke),
          });

          entity.polygon = new PolygonGraphics({
            hierarchy: { ...hierarchy, positions: validPositions },
            heightReference: opt?.clampToGround
              ? HeightReference.CLAMP_TO_GROUND
              : HeightReference.NONE,
            material: ConvertTool.HexToColor(opt.fill, 0.4),
            outline: false,
          });
        }
        if (entity.position) {
          const position = entity.position.getValue();
          // 驗證點座標是否有效
          if (
            position &&
            !isNaN(position.x) &&
            !isNaN(position.y) &&
            !isNaN(position.z)
          ) {
            entity.billboard = undefined;
            entity.point = new PointGraphics({
              pixelSize: opt.markerSize,
              color: ConvertTool.HexToColor(opt.markerColor, 0.8),
              outlineColor: ConvertTool.HexToColor(opt.stroke),
              outlineWidth: opt.strokeWidth,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              heightReference: opt.clampToGround
                ? HeightReference.CLAMP_TO_GROUND
                : HeightReference.NONE,
            });
          } else {
            console.warn(`跳過無效的點 ${entity.id}: 座標包含 NaN`);
          }
        }
      });
      this.addDataSource(key, dataSource, isShow);
      // this.viewer.dataSources.add(dataSource);
      // dataSource.show = isShow;
      // this.dataMap.set(key, dataSource);
      // this.viewer.scene.requestRender();
    } catch (error) {
      console.error("❌ Failed to add GeoJson:", error);
    }
  }

  createDataSource(key: string, isShow: boolean = false) {
    const ds = new CustomDataSource(key);
    this.addDataSource(key, ds, isShow);
    console.debug(`Add DataSource ${key} successfully.`);
  }

  getDataSource(key: string) {
    if (this.dataMap.has(key)) return this.dataMap.get(key);
    return this.viewer.dataSources.getByName(key);
  }

  removeDataSource(key: string) {
    const ds = this.dataMap.get(key);
    if (ds) {
      this.viewer.dataSources.remove(ds);
      this.dataMap.delete(key);
      this.viewer.scene.requestRender();
    }
  }

  updateDataSourceOptions(key: string, options: DataSourceOptions) {
    // console.debug(this.dataMap)
    const ds = this.dataMap.get(key) as any;
    if (!ds) {
      console.error(`❌ ${key} not exist in data sources.`);
      return;
    }
    Object.entries(options).forEach(([k, v]) => {
      if (k === "alpha") {
        return;
      }
      if (["fill", "markerColor", "stroke"].includes(k)) {
        v = this.converter.HexToColor(v, options?.alpha);
      }
      ds[k] = v;
    });
    this.viewer.scene.requestRender();
  }
}
