import {
  Viewer,
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian3,
  Color,
  ConstantProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  DataSource,
  Entity,
} from "cesium";
import { throttle } from "lodash";

import { LayerTool } from "../layer-control";
import { ConvertTool } from "../converter";
import { NavigateTool } from "../navigator";
import { generateUUID } from "../common";
import { createPoint, createPolygon, createPoly, createDistanceLabel } from "./creater";
import type { PolyTypes, DataSourceOptions } from "../types";

const defaultOption = {
  clampToGround: true,
  fill: "#ffd900",
  alpha: 1,
  markerColor: "#ffd900",
  markerSize: 8,
  stroke: "#ffd900",
  strokeWidth: 2,
  show: true
};

export class DrawTool {
  private viewer: Viewer;
  private handler: ScreenSpaceEventHandler;
  private converter: ConvertTool;
  private layerManager: LayerTool;
  private existPointListMap: Map<string, Cartesian3[]> = new Map();
  private dynamicPointList: Cartesian3[] = [];
  private drawOptions: DataSourceOptions = defaultOption;
  private currentLayerKey: string = "";
  private dynamicKey: string = `tmp_${generateUUID()}`;
  private drawType: PolyTypes = "Line";
  private keepNode: Entity | undefined;
  private clickTimeout: NodeJS.Timeout | null = null;
  private isDoubleClick: boolean = false;
  enableLabel: boolean = false;

  constructor(viewer: Viewer, layerManager?: LayerTool) {
    this.viewer = viewer;
    this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.converter = new ConvertTool(this.viewer);
    this.layerManager = layerManager
      ? layerManager
      : new LayerTool(this.viewer, false);
  }

  updateDrawType(drawType: PolyTypes) {
    this.drawType = drawType;
  }

  updateDrawOptions(options: DataSourceOptions) {
    Object.assign(this.drawOptions, options);
  }

  updateNodes() {
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (pointList === undefined) return;

    for (let i = 0; i < pointList.length; i++) {
      const node = this.layerManager.getLayer(`tmpNode${i}`) as
        | Entity
        | undefined;

      if (!node?.point) {
        this.layerManager.addLayer({
          key: `tmpNode${i}`,
          layer: createPoint(
            new CallbackPositionProperty(() => pointList[i], false),
            {
              ...this.drawOptions,
              markerSize: 8,
              markerColor: "#ffffffff",
              strokeWidth: 3,
            }
          ),
          layerType: "Entity",
          isShow: true,
        });
      }
      // 移除多餘節點
      const extraIndex = pointList.length;
      this.removeNodes(extraIndex);
    }
  }

  removeNodes(startIdx: number) {
    while (true) {
      const node = this.layerManager.getLayer(`tmpNode${startIdx}`) as
        | Entity
        | undefined;
      if (!node) break;
      this.layerManager.removeLayer(`tmpNode${startIdx}`);
      startIdx++;
    }
  }

  handleLeftDown() {
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (
      pointList === undefined ||
      pointList.length > 0 ||
      this.drawType !== "Gesture"
    )
      return;
    this.handler.setInputAction((click: any) => {
      const cartesian = this.viewer.camera.pickEllipsoid(
        click.position,
        this.viewer.scene.globe.ellipsoid
      );
      if (!cartesian) return; // 沒在地圖上
      NavigateTool.disableDefaultControl(this.viewer);
      pointList.push(cartesian);

      this.layerManager.addLayer({
        key: `${this.currentLayerKey}`,
        layer: createPoly(
          'Line',
          new CallbackProperty(() => pointList, false),
          false,
          this.drawOptions
        ),
        layerType: "Entity",
        isShow: true,
      });
    }, ScreenSpaceEventType.LEFT_DOWN);
  }

  handleLeftClick() {
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (pointList === undefined) return;

    this.handler.setInputAction((click: any) => {
      if (this.clickTimeout) clearTimeout(this.clickTimeout);
      this.clickTimeout = setTimeout(() => {
        if (this.isDoubleClick) {
          this.isDoubleClick = false;
          return;
        }
        const cartesian = this.converter.CanvasToPosition(click.position)?.c3;
        if (!cartesian) return;

        // 點擊新增成polygon
        const nodePos = this.keepNode?.position?.getValue();
        if (nodePos && this.drawType == "Line") {
          pointList.push(nodePos);
          this.layerManager.removeLayer(this.currentLayerKey);
          this.layerManager.addLayer({
            key: `drawPolygon_${this.currentLayerKey.split('_')[1]}`,
            layer: createPolygon(pointList, false, this.drawOptions),
            layerType: "Entity",
            // overwrite: true,
            isShow: true,
          });
          this.viewer.scene.requestRender();
          this.stop();
          this.start();
        } else {
          pointList.push(cartesian);
        }

        if (this.drawType === "Point" && pointList.length > 0) {
          const pointIdx = pointList.length - 1;
          this.layerManager.addLayer({
            key: `${this.currentLayerKey}_${pointIdx}`,
            layer: createPoint(
              new CallbackPositionProperty(() => pointList.at(pointIdx), false),
              {
                ...this.drawOptions,
                strokeWidth: 0
              }
            ),
            layerType: "Entity",
            isShow: true,
          });
        } else {
          // 只有一個點，產生
          // 1. 起始節點
          // 2. 動態線 / 動態形狀
          if (pointList.length === 1) {
            console.debug(`只有一個點，產生起始節點與動態${this.drawType}`, this.dynamicPointList);
            this.layerManager.addLayer({
              key: this.dynamicKey,
              layer: createPoly(
                this.drawType,
                new CallbackProperty(() => this.dynamicPointList, false),
                true,
                this.drawOptions
              ),
              layerType: "Entity",
              isShow: true,
            });
          }
          // 有兩個點，可以畫實際線段 或 產製多邊形並結束
          if (pointList.length === 2) {
            this.layerManager.addLayer({
              key: this.currentLayerKey,
              layer: createPoly(
                this.drawType,
                new CallbackProperty(() => pointList, false),
                false,
                this.drawOptions
              ),
              layerType: "Entity",
              isShow: true,
            });
          }
          // if (this.drawType == 'Line' && this.enableLabel) {
          if (this.enableLabel) {
            const ds = this.layerManager.createDataSource(`label_${this.currentLayerKey.split('_')[1]}`, true)
            for (let i = 0; i < pointList.length - 1; i++) {
              this.layerManager.addLayer({
                key: `label_${this.currentLayerKey.split('_')[1]}_${i}`,
                layer: createDistanceLabel(
                  pointList[i],
                  pointList[i + 1],
                ),
                layerType: "Entity",
                isShow: true,
                overwrite: true,
                dataSource: ds as DataSource
              });
            }
            this.layerManager.addLayer({
              key: `tmpLabel`,
              layer: createDistanceLabel(
                new CallbackPositionProperty(() => this.dynamicPointList[0], false),
                new CallbackPositionProperty(() => this.dynamicPointList[1], false),
              ),
              layerType: "Entity",
              isShow: true,
              overwrite: true
            });
            if (this.drawType === "Buffer") {
              this.layerManager.addLayer({
                key: `tmpRadius`,
                layer: createPoly(
                  "Line",
                  new CallbackProperty(() => this.dynamicPointList, false),
                  true,
                  this.drawOptions
                ),
                layerType: "Entity",
                isShow: true,
                overwrite: true
              });
              this.layerManager.addLayer({
                key: `label_${this.currentLayerKey.split('_')[1]}_radius`,
                layer: createPoly(
                  "Line",
                  new CallbackProperty(() => pointList, false),
                  true,
                  this.drawOptions
                ),
                layerType: "Entity",
                isShow: true,
                overwrite: true,
                dataSource: ds as DataSource
              });
            }
          }

          if (pointList.length === 2 && (this.drawType === "Circle" || this.drawType === "Square" || this.drawType === "Buffer")) {
            this.stop();
            this.start();
          }
          // 每次點擊都更新節點
          this.updateNodes();
        }
        this.viewer.scene.requestRender();
      }, 250); // 250ms 內若有雙擊則不執行單擊
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  handleMouseMove() {
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (pointList === undefined) return;

    this.handler.setInputAction(
      throttle((movement: any) => {
        const cartesian = this.converter.CanvasToPosition(movement.endPosition)?.c3;
        if (!cartesian) return; // 沒在地圖上
        if (pointList.length === 0) return; // 沒有畫任何東西

        if (this.drawType === "Gesture") {
          pointList.push(cartesian);
          this.viewer.scene.requestRender();
          return;
        }

        // 物件 hover 檢查
        const picked = this.viewer.scene.pick(movement.endPosition);
        let entity = picked && picked.id ? (picked.id as Entity) : undefined;
        if (
          this.drawType === "Line" &&
          pointList.length >= 3 &&
          entity?.point &&
          entity?.position &&
          Cartesian3.distance(
            entity.position.getValue() as Cartesian3,
            pointList.at(0) as Cartesian3
          ) < 0.01
        ) {
          entity.point.outlineColor = new ConstantProperty(Color.WHITESMOKE);
          this.keepNode = entity;
          this.dynamicPointList = pointList.slice(-1).concat([pointList[0]]);
        } else {
          if (this.keepNode?.point) {
            this.keepNode.point.outlineColor = new ConstantProperty(
              ConvertTool.HexToColor(this.drawOptions.stroke)
            );
            this.keepNode = undefined;
          }
          this.dynamicPointList = pointList.slice(-1).concat([cartesian]);
        }
        this.viewer.scene.requestRender();
      }, 50),
      ScreenSpaceEventType.MOUSE_MOVE
    );
  }

  handleLeftUp() {
    this.handler.setInputAction(() => {
      NavigateTool.enableDefaultControl(this.viewer);
      if (this.drawType !== "Gesture") return;
      this.stop();
      this.start();
      this.viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_UP);
  }

  handleRightClick() {
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (pointList === undefined) return;

    this.handler.setInputAction((click: any) => {
      const cartesian = this.converter.CanvasToPosition(click.position)?.c3;
      if (!cartesian) return;
      if (pointList.length <= 1) {
        this.stop();
        this.start();
        this.viewer.scene.requestRender();
      }

      //更新實體線
      pointList.pop();

      if (this.drawType === "Point") {
        this.layerManager.removeLayer(
          `${this.currentLayerKey}_${pointList.length}`
        );
      } else {
        //更新動態線
        this.dynamicPointList = pointList.slice(-1).concat([cartesian]);

        // 每次點擊都更新節點
        this.updateNodes();
      }
      this.viewer.scene.requestRender();
    }, ScreenSpaceEventType.RIGHT_CLICK);
  }

  handleLeftDoubleClick() {
    this.handler.setInputAction((click: any) => {
      this.isDoubleClick = true;
      if (this.clickTimeout) clearTimeout(this.clickTimeout);
      this.stop();
      this.start();
      this.viewer.scene.requestRender();
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  start() {
    this.currentLayerKey = `draw${this.drawType}_${generateUUID()}`;
    this.existPointListMap.set(this.currentLayerKey, []);
    // this.enableCursorHint();
    // this.existPointLists.push([]);
    this.dynamicPointList = [];

    this.clickTimeout = null;
    this.isDoubleClick = false;
    this.handleLeftDown();
    this.handleLeftClick();
    this.handleLeftUp();
    this.handleMouseMove();
    this.handleRightClick();
    this.handleLeftDoubleClick();
  }

  stop() {
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (pointList === undefined) return;
    if (pointList.length < 2) {
      this.layerManager.removeLayer(this.currentLayerKey);
      this.existPointListMap.delete(this.currentLayerKey);
    }
    this.removeNodes(0);
    this.layerManager.removeLayer(this.dynamicKey);
    this.layerManager.removeLayer('tmpLabel');
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_DOWN);
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_UP);
    this.handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
    this.handler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    this.handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
    this.viewer.scene.requestRender();
    // this.destroyCursorHint();
  }
}