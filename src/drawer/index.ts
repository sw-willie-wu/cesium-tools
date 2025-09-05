import {
  Viewer,
  CallbackProperty,
  CallbackPositionProperty,
  Cartesian3,
  Color,
  ConstantProperty,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  PolylineDashMaterialProperty,
  PolygonHierarchy,
  HeightReference,
  Entity,
} from "cesium";
import { throttle } from "lodash";

import { LayerTool } from "../layer-control";
import { ConvertTool } from "../converter";
import { NavigateTool } from "../navigator";
import { generateUUID, calculatePolygonPosition } from "../common";
import type { PolyTypes, DataSourceOptions } from "../types";

const defaultOption = {
  clampToGround: true,
  fill: "#ffd900",
  alpha: 1,
  markerColor: "#ffd900",
  markerSize: 8,
  stroke: "#ffd900",
  strokeWidth: 2,
  show: true,
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
  private dynamicKey: string = generateUUID();
  private drawType: PolyTypes = "Line";
  private keepNode: Entity | undefined;
  private clickTimeout: NodeJS.Timeout | null = null;
  private isDoubleClick: boolean = false;

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

  createPoint(
    position: CallbackPositionProperty | Cartesian3,
    options?: DataSourceOptions
  ) {
    options = { ...this.drawOptions, ...options };
    return {
      position: position,
      point: {
        pixelSize: options?.markerSize,
        color: this.converter.HexToColor(options.markerColor),
        outlineColor: this.converter.HexToColor(options.stroke),
        outlineWidth: options.strokeWidth,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: options?.clampToGround
          ? HeightReference.CLAMP_TO_GROUND
          : HeightReference.NONE,
      },
    };
  }

  createLine(
    positions: CallbackProperty | Cartesian3[],
    isDash: boolean = false,
    options?: DataSourceOptions
  ) {
    options = { ...this.drawOptions, ...options };
    const lineColor = this.converter.HexToColor(options.stroke);

    return {
      polyline: {
        positions: positions,
        clampToGround: options?.clampToGround,
        width: options?.strokeWidth,
        material: isDash
          ? new PolylineDashMaterialProperty({
              color: lineColor,
              dashLength: 10,
              dashPattern: 255,
            })
          : lineColor,
      },
    };
  }

  createPolygon(
    positions: CallbackProperty | Cartesian3[],
    isDash: boolean = false,
    options?: DataSourceOptions
  ) {
    options = { ...this.drawOptions, ...options };
    const hierCallback = new CallbackProperty((time) => {
      const posArray = Array.isArray(positions)
        ? positions
        : positions.getValue(time);
      return new PolygonHierarchy(posArray);
    }, false);
    return {
      ...this.createLine(positions, isDash, options),
      polygon: {
        hierarchy: hierCallback,
        heightReference: options?.clampToGround
          ? HeightReference.CLAMP_TO_GROUND
          : HeightReference.NONE,
        material: this.converter.HexToColor(options.fill, 0.4),
        outline: false,
      },
    };
  }

  createPolygonByDiagonal(
    positions: CallbackProperty | Cartesian3[],
    isDash: boolean = false,
    sideNum: number = 4,
    options?: DataSourceOptions
  ) {
    const posCallback = new CallbackProperty((time) => {
      const posArray = Array.isArray(positions)
        ? positions
        : positions.getValue(time);
      return calculatePolygonPosition(posArray, sideNum);
    }, false);
    return this.createPolygon(posCallback, isDash, options);
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
          layer: this.createPoint(
            new CallbackPositionProperty(() => pointList[i], false),
            {
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
      // this.viewer.scene.screenSpaceCameraController.ena
      pointList.push(cartesian);

      this.layerManager.addLayer({
        key: `${this.currentLayerKey}`,
        layer: this.createLine(new CallbackProperty(() => pointList, false)),
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
        const cartesian = this.viewer.camera.pickEllipsoid(
          click.position,
          this.viewer.scene.globe.ellipsoid
        );
        if (!cartesian) return;

        // 點擊新增成polygon
        const nodePos = this.keepNode?.position?.getValue();
        if (nodePos && this.drawType == "Line") {
          pointList.push(nodePos);
          this.layerManager.addLayer({
            key: this.currentLayerKey,
            layer: this.createPolygon(pointList),
            layerType: "Entity",
            overwrite: true,
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
            layer: this.createPoint(
              new CallbackPositionProperty(() => pointList.at(pointIdx), false),
              { strokeWidth: 0 }
            ),
            layerType: "Entity",
            isShow: true,
          });
        } else {
          // 只有一個點，產生
          // 1. 起始節點
          // 2. 動態線 / 動態形狀
          if (pointList.length === 1) {
            let dynamicPoly;
            switch (this.drawType) {
              case "Line":
                dynamicPoly = this.createLine(
                  new CallbackProperty(() => this.dynamicPointList, false),
                  true
                );
                break;
              case "Circle":
                dynamicPoly = this.createPolygonByDiagonal(
                  new CallbackProperty(() => this.dynamicPointList, false),
                  true,
                  64
                );
                break;
              case "Square":
                dynamicPoly = this.createPolygonByDiagonal(
                  new CallbackProperty(() => this.dynamicPointList, false),
                  true,
                  4
                );
                break;
            }
            this.layerManager.addLayer({
              key: this.dynamicKey,
              layer: dynamicPoly,
              layerType: "Entity",
              isShow: true,
            });
          }
          // 有兩個點，可以畫實際線段 或 產製多邊形並結束
          if (pointList.length === 2) {
            switch (this.drawType) {
              case "Line":
                this.layerManager.addLayer({
                  key: this.currentLayerKey,
                  layer: this.createLine(
                    new CallbackProperty(() => pointList, false),
                    false
                  ),
                  layerType: "Entity",
                  isShow: true,
                });
                break;
              case "Circle":
                this.layerManager.addLayer({
                  key: this.currentLayerKey,
                  layer: this.createPolygonByDiagonal(
                    new CallbackProperty(() => pointList, false),
                    false,
                    64
                  ),
                  layerType: "Entity",
                  isShow: true,
                });
                this.stop();
                this.start();
                break;
              case "Square":
                this.layerManager.addLayer({
                  key: this.currentLayerKey,
                  layer: this.createPolygonByDiagonal(
                    new CallbackProperty(() => pointList, false),
                    false,
                    4
                  ),
                  layerType: "Entity",
                  isShow: true,
                });
                this.stop();
                this.start();
                break;
            }
          }
          // 每次點擊都更新節點
          this.updateNodes();
          console.log("click");
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
        const cartesian = this.viewer.camera.pickEllipsoid(
          movement.endPosition,
          this.viewer.scene.globe.ellipsoid
        );
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
      const cartesian = this.viewer.camera.pickEllipsoid(
        click.position,
        this.viewer.scene.globe.ellipsoid
      );
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
    this.currentLayerKey = generateUUID();
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
    console.log("end draw");
    const pointList = this.existPointListMap.get(this.currentLayerKey);
    if (pointList === undefined) return;
    if (pointList.length < 2) {
      this.layerManager.removeLayer(this.currentLayerKey);
      this.existPointListMap.delete(this.currentLayerKey);
    }
    this.removeNodes(0);
    this.layerManager.removeLayer(this.dynamicKey);
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
