import {
    Viewer,
    Cesium3DTileset,
    Cesium3DTileStyle
} from "cesium";

import { ConvertTool } from "../converter";
import { point } from "@turf/turf";


export class PrimitiveControl {
    private viewer: Viewer;
    // private converter: ConvertTool;
    dataMap: Map<string, Cesium3DTileset> = new Map();

    constructor(viewer: Viewer) {
        this.viewer = viewer;
        // this.converter = new ConvertTool(this.viewer);
    }

    async addTileset(
        key: string,
        url: string,
        isShow: boolean = false,
        index?: number,
        options?: Cesium3DTileset.ConstructorOptions,
        // styleOptions?: Object

    ) {
        // let providerOptions: UrlTemplateImageryProvider.ConstructorOptions = {
        //     url: url,
        //     rectangle: this.converter.BoundsToRectangle(options?.bounds),
        //     ...options,
        // };
        try {
            const tileset = await Cesium3DTileset.fromUrl(url, options);
            tileset.show = isShow;
            tileset.style = new Cesium3DTileStyle({
                pointSize: 5.0, // 對點雲特別重要
            });
            this.viewer.scene.primitives.add(tileset);
            this.dataMap.set(key, tileset);
            // const provider = new UrlTemplateImageryProvider(providerOptions);
            // this.addProvider(key, provider, isShow, index);
            console.debug(`Add new Tileset ${key} successfully`);
        } catch (error) {
            console.error("❌ Failed to add Tileset:", error);
        }
    }

    getTileset(key: string) {
        return this.dataMap.get(key);
        // return dataSource
        //   ? dataSource.entities.getById(key)
        //   : this.viewer.entities.getById(key);
      }

    //   async addTileset(
    //     key: string,
    //     url: string,
    //     options?: Cesium3DTileset.ConstructorOptions
    //   ) {
    //     const tileset = await Cesium3DTileset.fromUrl(url, options);
    //     tileset.style = new Cesium3DTileStyle({
    //       pointSize: 5.0, // 對點雲特別重要
    //     });
    //     this.viewer.scene.primitives.add(tileset);
    //     this.layers.Tilesets.set(key, tileset);
    //     this.viewer.scene.requestRender();
    //   }

    updateTilesetOptions(key: string, options: Record<string, any>) {
        const tileset = this.dataMap.get(key);
        if (!tileset) return
        Object.entries(options).forEach(([k, v]) => {
            // if (k === "alpha") {
            //     return;
            // }
            // if (["fill", "markerColor", "stroke"].includes(k)) {
            //     v = this.converter.HexToColor(v, options?.alpha);
            // }
            (tileset as any)[k] = v;
            // tileset[k] = v;
        });
        this.viewer.scene.requestRender();
        //   {
        // tileset.show = options.show;
        // console.debug("tilseset update", key, options.show);
        // this.viewer.scene.requestRender();
        // }
    }

    removeTileset(key: string) {
        const tileset = this.dataMap.get(key);
        if (!tileset) return;
        this.viewer.scene.primitives.remove(tileset);
        this.dataMap.delete(key);
    }
}