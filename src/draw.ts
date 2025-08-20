import * as Cesium from "cesium"

interface ColorOption {
    Value: string
    Alpha: number
}

interface DrawOptions {
    lineWidth: number
    lineColor: ColorOption
    fillColor: ColorOption
    isClampToGround: boolean
}

export class DrawTool {
    viewer: Cesium.Viewer
    handler: Cesium.ScreenSpaceEventHandler
    drawOptions: DrawOptions
    drawingMode: string | null = null
    lineCollection: Cesium.CustomDataSource = new Cesium.CustomDataSource('drawLineEntities')

    private cursorHint: Cesium.Entity | null = null

    constructor(viewer: Cesium.Viewer) {
        this.viewer = viewer
        this.viewer.dataSources.add(this.lineCollection)
        this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
        this.drawOptions = {
            lineWidth: 3,
            lineColor: {
                Value: '#ffff00',
                Alpha: 1
            },
            fillColor: {
                Value: '#ffff00',
                Alpha: 0.5
            },
            isClampToGround: true
        }
    }

    createLine(
        positions: Cesium.CallbackProperty | Cesium.Cartesian3[],
        options: DrawOptions | null = null,
        lineType: string = ''
    ) {
        let material: Cesium.Color | Cesium.MaterialProperty
        options = options ? options : this.drawOptions

        switch (lineType.toLowerCase()) {
            case 'dash':
                material = new Cesium.PolylineDashMaterialProperty({
                    color: Cesium.Color.fromCssColorString(options.lineColor.Value).withAlpha(options.lineColor.Alpha),
                    dashLength: 10,
                    dashPattern: 255
                })
                break
            default:
                material = Cesium.Color.fromCssColorString(options.lineColor.Value).withAlpha(options.lineColor.Alpha)
        }

        return new Cesium.Entity({
            polyline: {
                positions: positions,
                clampToGround: options.isClampToGround,
                width: options.lineWidth,
                material: material
            }
        })
    }

    createPolygon(
        positions: Cesium.CallbackProperty | Cesium.Cartesian3[],
        options: DrawOptions = this.drawOptions
    ) {
        return new Cesium.Entity({
            polygon: {
                hierarchy: positions,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                material: Cesium.Color.fromCssColorString(options.fillColor.Value).withAlpha(options.fillColor.Alpha),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(options.lineColor.Value).withAlpha(options.lineColor.Alpha)
            }
        })
    }

    enableCursorHint() {
        this.cursorHint = this.viewer.entities.add({
            position: undefined,
            point: {
                pixelSize: 8,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                color: Cesium.Color.WHITE.withAlpha(0.6),
                disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
        })
    }

    destroyCursorHint() {
        if (this.cursorHint) {
            this.viewer.entities.remove(this.cursorHint)
            this.cursorHint = null
        } 
    }

    startDraw(drawType: string = 'polyline') {
        this.enableCursorHint()

        let pointList: Cesium.Cartesian3[] = []
        let dynamicPointList: Cesium.Cartesian3[] = []
        let dynamicLine: Cesium.Entity
        
        // 滑鼠左鍵點擊事件
        this.handler.setInputAction((click: any) => {
            const cartesian = this.viewer.camera.pickEllipsoid(click.position, this.viewer.scene.globe.ellipsoid)
            if (!cartesian) return

            pointList.push(cartesian)
            // 只點了一個點，只有動態線
            if (pointList.length === 1) {
                dynamicLine = this.createLine(new Cesium.CallbackProperty(() => dynamicPointList, false), null, 'dash')
                this.lineCollection.entities.add(dynamicLine)
            }
            // 有兩個點了，可以畫實際的線
            if (pointList.length === 2) {
                this.lineCollection.entities.add(this.createLine(new Cesium.CallbackProperty(() => pointList, false)))
            }
            this.viewer.scene.requestRender()
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        this.handler.setInputAction((movement: any) => {
            if (!this.cursorHint) return
            const cartesian = this.viewer.camera.pickEllipsoid(movement.endPosition, this.viewer.scene.globe.ellipsoid)
            if (!cartesian) {
                this.cursorHint.position = new Cesium.ConstantPositionProperty(undefined)
                return
            }
            // 更新滑鼠點
            this.cursorHint.position = new Cesium.ConstantPositionProperty(cartesian)
            if (pointList.length === 0) return
            //更新動態線
            dynamicPointList = pointList.slice(-1).concat([cartesian])
            this.viewer.scene.requestRender()
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        this.handler.setInputAction((click: any) => {
            if (dynamicLine) {
                this.lineCollection.entities.remove(dynamicLine)
            }
            this.stopDraw()
            this.startDraw()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }

    stopDraw() {
        console.log('end draw')
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        this.destroyCursorHint()
    }
}
