import {
  Viewer,
  Cartesian3,
  ImageryLayer,
  UrlTemplateImageryProvider,
  SingleTileImageryProvider,
  GeoJsonDataSource,
  CustomDataSource,
  DataSource,
  Rectangle,
  Cesium3DTileset,
  Cesium3DTileStyle,
  ModelGraphics,
} from "cesium";

type WMTSOptions = Omit<
  UrlTemplateImageryProvider.ConstructorOptions,
  "url" | "rectangle"
> & {
  extent?: number[]; // [lon_min, lat_min, lon_max, lat_max]
};

type SingleOptions = Omit<
  SingleTileImageryProvider.ConstructorOptions,
  "url" | "rectangle"
> & {
  extent?: number[]; // [lon_min, lat_min, lon_max, lat_max]
};

type DataSourceLoadOptions = Omit<GeoJsonDataSource.LoadOptions, "url">;
type DataSourceOptions = {
  show: boolean;
  alpha: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
};

type ModelOptions = {
  show: boolean;
  alpha: number;
};

type TilesetOptions = {
  show: boolean;
  alpha: number;
};

export class LayerTool {
  viewer: Viewer;
  layers: {
    Images: Map<string, ImageryLayer>;
    DataSources: Map<string, DataSource>;
    Tilesets: Map<string, Cesium3DTileset>;
  };

  constructor(viewer: Viewer, removeDefault: boolean = true) {
    this.viewer = viewer;
    this.layers = {
      Images: new Map(),
      DataSources: new Map(),
      Tilesets: new Map(),
    };
    if (removeDefault) {
      this.imLyr.removeAll();
    }
  }

  get imLyr() {
    return this.viewer.imageryLayers;
  }

  get dsLyr() {
    return this.viewer.dataSources;
  }

  addImage(
    key: string,
    url: string,
    type: "wmts" | "single",
    index?: number,
    options?: WMTSOptions | SingleOptions
  ) {
    if (this.layers.Images.has(key)) return;

    let providerOptions:
      | UrlTemplateImageryProvider.ConstructorOptions
      | SingleTileImageryProvider.ConstructorOptions;
    let provider:
      | UrlTemplateImageryProvider
      | SingleTileImageryProvider
      | undefined;
    let r;
    switch (type) {
      case "wmts":
        r = options?.extent
          ? Rectangle.fromDegrees(...options.extent)
          : Rectangle.MAX_VALUE;
        providerOptions = { url: url, rectangle: r };
        if (options) {
          Object.assign(
            providerOptions,
            Object.fromEntries(
              Object.entries(options).filter(([_, v]) => v !== undefined)
            )
          );
        }
        try {
          provider = new UrlTemplateImageryProvider(providerOptions);
        } catch (e) {
          console.error("❌ Failed to create WMTS layer:", e, providerOptions);
        }
        break;
      case "single":
        r = options?.extent
          ? Rectangle.fromDegrees(...options.extent)
          : Rectangle.MAX_VALUE;
        providerOptions = { url: url, rectangle: r };
        if (options) {
          Object.assign(
            providerOptions,
            Object.fromEntries(
              Object.entries(options).filter(([_, v]) => v !== undefined)
            )
          );
        }
        try {
          provider = new SingleTileImageryProvider(providerOptions);
        } catch (e) {
          console.error(
            "❌ Failed to create SingleTile layer:",
            e,
            providerOptions
          );
        }
        break;
      default:
        console.error("wrong type for image");
    }
    if (!provider) return;
    const lyr = this.imLyr.addImageryProvider(provider, index);
    this.layers.Images.set(key, lyr);
    this.viewer.scene.requestRender();
  }

  removeImage(key: string) {
    const lyr = this.layers.Images.get(key);
    if (lyr) {
      this.imLyr.remove(lyr);
      this.layers.Images.delete(key);
      this.viewer.scene.requestRender();
    }
  }

  updateImageOptions(key: string, options: ImageryLayer.ConstructorOptions) {
    const lyr = this.layers.Images.get(key);
    if (!lyr) return;
    Object.entries(options).forEach(([k, v]) => {
      if (v !== undefined && k in lyr) {
        // @ts-ignore
        lyr[k] = v;
      }
    });
    this.viewer.scene.requestRender();
  }

  async addDataSource(
    key: string,
    url: string,
    options?: DataSourceLoadOptions
  ) {
    if (this.layers.DataSources.has(key)) return;
    try {
      const dataSource = await GeoJsonDataSource.load(url, options);
      //   dataSources.entities.values.forEach((entity) => {
      //     if (entity.polygon) {
      //       const positions = entity.polygon.hierarchy?.getValue().positions;
      //       entity.polyline = new Cesium.PolylineGraphics({
      //         positions: positions,
      //         width: 2,
      //         material: Cesium.Color.fromCssColorString("#dc143c"),
      //         clampToGround: true,
      //         show: true,
      //       });
      //     }
      // 點資料
      //     if (entity.position) {
      //       entity.point = new Cesium.PointGraphics({
      //         color: Cesium.Color.fromCssColorString("#dc143c"),
      //         pixelSize: 10,
      //         heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      //       });
      //     }
      //   });

      //   this.dataLayers[key] = { layer: geojson, type: "entity" };
      this.viewer.dataSources.add(dataSource);
      this.layers.DataSources.set(key, dataSource);
      this.viewer.scene.requestRender();
    } catch (error) {
      console.error(`Load geojson ${url} error: ${error}`);
    }
  }

  updateDataSourceOptions(key: string, options: DataSourceOptions) {
    const dataSource = this.layers.DataSources.get(key);
    if (!dataSource) return;
    dataSource.show = options.show;
    console.debug("datasource update", key, options.show);
    this.viewer.scene.requestRender();
    // Object.entries(options).forEach(([k, v]) => {
    //   if (v !== undefined && k in lyr) {
    //     // @ts-ignore
    //     lyr[k] = v;
    //   }
    // });
  }

  async addTileset(
    key: string,
    url: string,
    options?: Cesium3DTileset.ConstructorOptions
  ) {
    const tileset = await Cesium3DTileset.fromUrl(url, options);
    tileset.style = new Cesium3DTileStyle({
      pointSize: 5.0, // 對點雲特別重要
    });
    this.viewer.scene.primitives.add(tileset);
    this.layers.Tilesets.set(key, tileset);
    this.viewer.scene.requestRender();
  }

  updateTilesetOptions(key: string, options: TilesetOptions) {
    const tileset = this.layers.Tilesets.get(key);
    if (tileset) {
      tileset.show = options.show;
      console.debug("tilseset update", key, options.show);
      this.viewer.scene.requestRender();
    }
  }

  async addModel(
    key: string,
    url: string,
    position: { lon: number; lat: number; height: number },
    options?: ModelGraphics.ConstructorOptions
  ) {
    const dataSource = new CustomDataSource(key);
    const c3 = Cartesian3.fromDegrees(
      position.lon,
      position.lat,
      position.height
    );
    if (options === undefined) {
      options = {};
    }
    options.uri = url;
    options.minimumPixelSize = 128;
    options.maximumScale = 20000;

    dataSource.entities.add({
      position: c3,
      model: options,
    });
    this.viewer.dataSources.add(dataSource);
    this.layers.DataSources.set(key, dataSource);
    console.debug(`add ${key} to layer`)
    this.viewer.scene.requestRender();
  }

  updateModelOptions(key: string, options: ModelOptions) {
    console.debug("call update model");
    const dataSource = this.layers.DataSources.get(key);
    if (!dataSource) return;
    dataSource.show = options.show;
    console.debug("model update", key, options.show);
    this.viewer.scene.requestRender();
    // Object.entries(options).forEach(([k, v]) => {
    //   if (v !== undefined && k in lyr) {
    //     // @ts-ignore
    //     lyr[k] = v;
    //   }
    // });
  }
}
