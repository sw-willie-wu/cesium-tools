import { Viewer, Cartesian3, DataSource, Entity, ModelGraphics } from "cesium";

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
    if (this.dataMap.has(key)) return this.dataMap.get(key)
    return dataSource ? dataSource.entities.getById(key) : this.viewer.entities.getById(key)
  }

  removeEntity(key: string) {
    const ds = this.entityDataSourceMap.get(key);
    const entity = this.dataMap.get(key);
    if (!entity) return;
    if (ds) {
      ds.entities.remove(entity);
    } else {
      this.viewer.entities.remove(entity);
    }
  }
}
