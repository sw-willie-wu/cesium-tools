import {
  Viewer,
  ImageryLayer,
  SingleTileImageryProvider,
  UrlTemplateImageryProvider,
} from "cesium";

import { ConvertTool } from "../converter";
import { ImageOptions } from "../types";

export class ImageryControl {
  private viewer: Viewer;
  private converter: ConvertTool;
  dataMap: Map<string, ImageryLayer> = new Map();

  constructor(viewer: Viewer) {
    this.viewer = viewer;
    this.converter = new ConvertTool(this.viewer);
  }

  private addProvider(
    key: string,
    provider: UrlTemplateImageryProvider | SingleTileImageryProvider,
    isShow: boolean = false,
    index?: number
  ) {
    const lyr = this.viewer.imageryLayers.addImageryProvider(provider, index);
    lyr.show = isShow;
    this.dataMap.set(key, lyr);
    this.viewer.scene.requestRender();
  }

  addWMTS(
    key: string,
    url: string,
    isShow: boolean = false,
    index?: number,
    options?: ImageOptions
  ) {
    let providerOptions: UrlTemplateImageryProvider.ConstructorOptions = {
      url: url,
      rectangle: this.converter.BoundsToRectangle(options?.bounds),
      ...options,
    };
    try {
      const provider = new UrlTemplateImageryProvider(providerOptions);
      this.addProvider(key, provider, isShow, index);
      console.debug(`Add new WMTS ${key} successfully`);
    } catch (error) {
      console.error("❌ Failed to add WMTS:", error);
    }
  }

  addSingleImage(
    key: string,
    url: string,
    isShow: boolean = false,
    index?: number,
    options?: ImageOptions
  ) {
    let providerOptions: SingleTileImageryProvider.ConstructorOptions = {
      url: url,
      rectangle: this.converter.BoundsToRectangle(options?.bounds),
      tileHeight: options?.height,
      tileWidth: options?.width,
      ...options,
    };
    try {
      const provider = new SingleTileImageryProvider(providerOptions);
      this.addProvider(key, provider, isShow, index);
      console.debug(`Add new Single image ${key} successfully`);
    } catch (error) {
      console.error("❌ Failed to add Single image:", error);
    }
  }

  getImage(key: string) {
    return this.dataMap.get(key)
  }

  removeImage(key: string) {
    const lyr = this.dataMap.get(key);
    if (!lyr) {
      console.error(`❌ ${key} not exist in image layers.`);
      return;
    }
    this.viewer.imageryLayers.remove(lyr);
    this.dataMap.delete(key);
    this.viewer.scene.requestRender();
  }

  removeAll() {
    this.viewer.imageryLayers.removeAll();
  }

  updateImageOptions(key: string, options: ImageryLayer.ConstructorOptions) {
    const lyr = this.dataMap.get(key) as any;
    if (!lyr) {
      console.error(`❌ ${key} not exist in image layers.`);
      return;
    }
    Object.entries(options).forEach(([k, v]) => {
      lyr[k] = v;
    });
    this.viewer.scene.requestRender();
  }
}
