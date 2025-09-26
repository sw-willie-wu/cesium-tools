import { EventEmitter } from "events";
import { intersect } from "@turf/intersect";
import { polygon, featureCollection } from "@turf/helpers";
import { Viewer, DataSource, Cartesian3, Entity } from "cesium";

import { ConvertTool } from "../converter";
import { generateUUID } from "../common";
import { ImageryControl } from "./imagery";
import { DataSourceControl } from "./dataSource";
import { EntityControl } from "./entity";
import { PrimitiveControl } from "./primitive";
import * as Creater from "../drawer/creater";
import type { LayerTypes } from "../types";

export class LayerTool extends EventEmitter {
  private viewer: Viewer;
  // private handler: ScreenSpaceEventHandler;
  private imageController: ImageryControl;
  private dataSourceController: DataSourceControl;
  private entityController: EntityControl;
  private primitiveController: PrimitiveControl;
  dataMap: Map<string, LayerTypes> = new Map();

  constructor(viewer: Viewer, removeDefault: boolean = true) {
    super();
    this.viewer = viewer;
    // this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.imageController = new ImageryControl(this.viewer);
    this.dataSourceController = new DataSourceControl(this.viewer);
    this.entityController = new EntityControl(this.viewer);
    this.primitiveController = new PrimitiveControl(this.viewer);

    if (removeDefault) this.imageController.removeAll();
  }

  changed = {
    addEventListener: (callback: (event: any) => void) => {
      this.on("changed", callback);
    },
    removeEventListener: (callback: (event: any) => void) => {
      this.off("changed", callback);
    },
  };

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
      case "Tileset":
        await this.primitiveController.addTileset(
          params.key,
          params.url,
          params?.isShow,
          params?.index,
          params?.options,
        );
        break;
      default:
        console.error(`Got wrong layer type ${params.layerType}`);
    }
    this.dataMap.set(params.key, params.layerType);
    console.debug(`Add ${params.layerType} ${params.key} successfully.`);
    this.emit("changed", { type: 'add', key: params.key, layerType: params.layerType });
  }

  createDataSource(key: string, isShow: boolean = false) {
    if (this.dataMap.has(key)) {
      console.warn(`${key} already exists`);
      this.updateLayerOptions(key, { show: isShow });
    } else {
      this.dataSourceController.createDataSource(key, isShow);
      this.dataMap.set(key, "DataSource");
      console.debug(`Add DataSource ${key} into layer-control successfully.`);
      this.emit("changed", { type: 'add', key: key, layerType: "DataSource" });
    }
    return this.getLayer(key);
  }

  addLayer(params: {
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
    this.emit("changed", { type: 'add', key: params.key, layerType: params.layerType });
  }

  selectEntity(
    key: string,
    entity: Entity,
    options?: any
  ) {
    const defaultOptions = {
      clampToGround: true,
      fill: "#ffff00ff",
      markerColor: "#ffff0000",
      stroke: "#ffff00ff",
      strokeWidth: 10,
    };
    options = { ...defaultOptions, ...options };
    let layer: Entity.ConstructorOptions | undefined = undefined
    // if (entity.polygon) {
    //   const hierarchy = entity.polygon.hierarchy?.getValue();
    //   layer = Creater.createLine(hierarchy.positions, false, options);
    // } else
    if (entity.polyline) {
      const positions = entity.polyline.positions?.getValue();
      layer = Creater.createLine(positions, false, options);
    } else if (entity.point) {
      const position = entity.position?.getValue();
      if (!position) return;
      options.strokeWidth = 7;
      options.markerSize = entity.point.pixelSize;
      layer = Creater.createPoint(position, options);
    }
    if (!layer) return;
    this.addLayer({
      key: key,
      layer: layer,
      layerType: "Entity",
      isShow: true,
      options: options,
      overwrite: true
    });
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
      case "Tileset":
        return this.primitiveController.getTileset(key);
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
      case "Tileset":
        this.primitiveController.removeTileset(key);
        break;
      default:
        console.error(
          `Remove layer ${key} failed, got wrong layer type ${layerType}`
        );
        return;
    }
    this.dataMap.delete(key);
    console.debug(`Remove ${layerType} ${key} successfully.`);
    this.emit("changed", { type: 'remove', key: key, layerType: layerType });
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
      case "DataSource":
        this.dataSourceController.updateDataSourceOptions(key, options);
        break;
      case "Entity":
        this.entityController.updateEntityOptions(key, options);
        break;
      case "Model":
        this.entityController.updateEntityOptions(key, options);
        break;
      case "Tileset":
        this.primitiveController.updateTilesetOptions(key, options);
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

  // enableSelectMode(mode: string) {

  // }
}
