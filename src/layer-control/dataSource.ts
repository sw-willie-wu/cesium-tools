import {
  Viewer,
  DataSource,
  GeoJsonDataSource,
  CustomDataSource,
} from "cesium";

import { ConvertTool } from "../converter";

export interface DataSourceOptions {
  clampToGround?: boolean;
  fill?: string;
  alpha?: number;
  markerColor?: string;
  markerSize?: number;
  markerSymbol?: string;
  stroke?: string;
  strokeWidth?: number;
  show?: boolean;
}

export class DataSourceControl {
  private viewer: Viewer;
  private converter: ConvertTool;
  dataMap: Map<string, DataSource> = new Map();

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.converter = new ConvertTool(this.viewer);
  }

  async addGeoJson(
    key: string,
    url: string,
    isShow: boolean = false,
    options?: GeoJsonDataSource.LoadOptions
  ) {
    if (this.dataMap.has(key)) return;
    try {
      const dataSource = await GeoJsonDataSource.load(url, options);
      dataSource.name = key
      this.viewer.dataSources.add(dataSource);
      dataSource.show = isShow;
      this.dataMap.set(key, dataSource);
      this.viewer.scene.requestRender();
    } catch (error) {
      console.error("❌ Failed to add GeoJson:", error);
    }
  }

  addDataSource(
    key: string,
    dataSource: CustomDataSource,
    isShow: boolean = false
  ) {
    if (this.dataMap.has(key)) return;
    this.viewer.dataSources.add(dataSource);
    dataSource.show = isShow;
  }

  createDataSource(
    key: string,
    isShow: boolean = false
  ) {
    const ds = new CustomDataSource(key)
    this.addDataSource(key, ds, isShow)
  }

  getDataSource(key: string) {
    if (this.dataMap.has(key)) return this.dataMap.get(key)
    return this.viewer.dataSources.getByName(key)
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
    const ds = this.dataMap.get(key) as any;
    if (!ds) {
      console.error(`❌ ${key} not exist in data sources.`);
      return;
    }
    Object.entries(options).forEach(([k, v]) => {
        if (k === "alpha") {
            return
        };
      if (["fill", "markerColor", "stroke"].includes(k)) {
        v = this.converter.HexToColor(v, options?.alpha);
      }
      ds[k] = v;
    });
    this.viewer.scene.requestRender();
  }
}
