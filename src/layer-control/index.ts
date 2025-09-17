import { Viewer, DataSource } from "cesium";

import { ImageryControl } from "./imagery";
import { DataSourceControl } from "./dataSource";
import { EntityControl } from "./entity";
import type { LayerTypes } from "../types";

export class LayerTool {
  private viewer: Viewer;
  private imageController: ImageryControl;
  private dataSourceController: DataSourceControl;
  private entityController: EntityControl;
  dataMap: Map<string, LayerTypes> = new Map();

  constructor(viewer: Viewer, removeDefault: boolean = true) {
    this.viewer = viewer;
    this.imageController = new ImageryControl(this.viewer);
    this.dataSourceController = new DataSourceControl(this.viewer);
    this.entityController = new EntityControl(this.viewer);

    if (removeDefault) this.imageController.removeAll();
  }

  async addLayerFromUrl(params: {
    key: string;
    url: string;
    layerType: Partial<LayerTypes>;
    isShow?: boolean;
    overwrite?: boolean;
    index?: number;
    options?: any;
    coords?: { lon: number; lat: number; height: number };
    dataSource?: DataSource;
  }) {
    if (this.dataMap.has(params.key)) {
      if (params.overwrite) {
        console.warn(`Overwrite ${params.key} in ${params.layerType}`);
        this.removeLayer(params.key);
      } else {
        console.warn(`${params.key} already exists in ${params.layerType}`);
        return;
      }
    }

    switch (params.layerType) {
      case "WMTS":
        this.imageController.addWMTS(
          params.key,
          params.url,
          params?.isShow,
          params?.index,
          params?.options
        );
        break;
      case "Single":
        this.imageController.addSingleImage(
          params.key,
          params.url,
          params?.isShow,
          params?.index,
          params?.options
        );
        break;
      case "Geometry":
        await this.dataSourceController.addGeoJson(
          params.key,
          params.url,
          params?.isShow,
          params?.options
        );
        break;
      case "Model":
        this.entityController.addModel(
          params.key,
          params.url,
          params.isShow,
          params.coords,
          params?.options,
          params?.dataSource
        );
        break;
      default:
        console.error(`Got wrong layer type ${params.layerType}`);
    }
    this.dataMap.set(params.key, params.layerType);
  }

  createDataSource(key: string, isShow: boolean = false) {
    this.dataSourceController.createDataSource(key, isShow);
    this.dataMap.set(key, "DataSource");
  }

  async addLayer(params: {
    key: string;
    layer: any;
    layerType: Partial<LayerTypes>;
    isShow?: boolean;
    overwrite?: boolean;
    index?: number;
    options?: any;
    coords?: { lon: number; lat: number; height: number };
    dataSource?: DataSource;
  }) {
    if (this.dataMap.has(params.key)) {
      if (params.overwrite) {
        console.warn(`Overwrite ${params.key} in ${params.layerType}`);
        this.removeLayer(params.key);
      } else {
        console.warn(`${params.key} already exists in ${params.layerType}`);
        return;
      }
    }

    switch (params.layerType) {
      case "Entity":
        this.entityController.addEntity(
          params.key,
          params.layer,
          params?.isShow,
          params?.dataSource
        );
        break;
      default:
        console.error(
          `Add layer ${params.key} failed, got wrong layer type ${params.layerType}`
        );
    }
    this.dataMap.set(params.key, params.layerType);
    console.debug(`Add ${params.layerType} ${params.key} successfully.`);
  }

  getLayer(key: string) {
    const layerType = this.dataMap.get(key);
    if (!layerType) return;
    switch (layerType) {
      case "WMTS":
        return this.imageController.getImage(key);
      case "Single":
        return this.imageController.getImage(key);
      case "Geometry":
        return this.dataSourceController.getDataSource(key);
      case "DataSource":
        return this.dataSourceController.getDataSource(key);
      case "Model":
        return this.entityController.getEntity(key);
      case "Entity":
        return this.entityController.getEntity(key);
      default:
        console.error(`Got wrong layer type ${layerType}`);
    }
  }

  removeLayer(key: string) {
    const layerType = this.dataMap.get(key);
    if (!layerType) return;
    switch (layerType) {
      case "WMTS":
        this.imageController.removeImage(key);
        break;
      case "Single":
        this.imageController.removeImage(key);
        break;
      case "Geometry":
        this.dataSourceController.removeDataSource(key);
        break;
      case "DataSource":
        this.dataSourceController.removeDataSource(key);
        break;
      case "Model":
        this.entityController.removeEntity(key);
        break;
      case "Entity":
        this.entityController.removeEntity(key);
        break;
      default:
        console.error(
          `Remove layer ${key} failed, got wrong layer type ${layerType}`
        );
        return;
    }
    this.dataMap.delete(key);
    console.debug(`Remove ${layerType} ${key} successfully.`);
  }

  updateLayerOptions(key: string, options: any) {
    const layerType = this.dataMap.get(key);
    if (!layerType) return;
    switch (layerType) {
      case "WMTS":
        this.imageController.updateImageOptions(key, options);
        break;
      case "Single":
        this.imageController.updateImageOptions(key, options);
        break;
      case "Geometry":
        this.dataSourceController.updateDataSourceOptions(key, options);
        break;
      case "Entity":
        this.entityController.updateEntityOptions(key, options);
        break;
      case "Model":
        this.entityController.updateEntityOptions(key, options);
        break;
      default:
        console.error(
          `Update layer ${key} failed, got wrong layer type ${layerType}.`
        );
    }
    this.viewer.scene.requestRender();
  }

  fixEntityPosition(key: string) {
    const layerType = this.dataMap.get(key);
    if (layerType !== "Entity" && layerType !== "Model") {
      console.error(
        `Fix entity position failed, ${key} is not Entity or Model.`
      );
      return;
    }
    this.entityController.fixEntityPosition(key);
  }
}
