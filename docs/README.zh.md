[English](./README.en.md)

# cesium-tools

Cesium 工具函式庫，提供地圖互動、地理計算、繪圖、導航、追蹤、轉換等常用功能，適用於 CesiumJS 應用開發。

## 安裝

本地開發（建議用 npm link）：
```bash
cd cesium-tools
npm install
npm run build
npm link
# 回到主專案
cd ../
npm link cesium-tools
```

## 使用方式

```ts
import { DrawTool, TrackTool, CommonTool, NavigateTool, ConvertTool, LayerTool } from 'cesium-tools'
import type { Position, Angle, MapParams, CameraParams } from 'cesium-tools'

// 例：計算距離
const dist = CommonTool.calculateDistance(pos1, pos2)

// 例：繪圖
const draw = new DrawTool(viewer)
draw.startDraw('polyline')

// 例：追蹤滑鼠
const track = new TrackTool(viewer)
track.trackMousePosition(100, refOutput)
```

## 主要功能與 API

### CommonTool（地理計算與互動工具）
- `calculateDistance(p1, p2)`：計算兩點空間距離
- `getMousePosition(viewer, movement)`：取得滑鼠地理座標
- `getPositionFromCanvas(viewer, x, y)`：螢幕座標轉地理座標
- `getMapParams(viewer)`：取得地圖中心、比例、寬高等參數
- `getCameraParams(viewer)`：取得相機外方位參數

### DrawTool（繪圖工具）
- `startDraw(drawType)`：啟動繪圖（折線、多邊形）
- `stopDraw()`：結束繪圖
- `createLine(positions, options, lineType)`：建立線段 Entity
- `createPolygon(positions, options)`：建立多邊形 Entity

### TrackTool（追蹤工具）
- `trackMousePosition(freq, refOutput)`：追蹤滑鼠地理座標
- `trackMapParams(freq, refOutput)`：追蹤地圖參數
- `trackCameraParams(freq, refOutput)`：追蹤相機參數

### NavigateTool（地圖導航工具）
- `lockPOV(position, heading, pitch, range)`：鎖定視角
- `lockCurrentPOV()`：鎖定目前視角
- `unlockPOV()`：解除視角鎖定
- `rotateMap(target)`：平滑旋轉地圖
- `zoomIn()` / `zoomOut()`：地圖縮放

### ConvertTool（座標/角度轉換工具）
- `C3ToPosition(cartesian3)`：Cartesian3 轉地理座標
- `DegToRad(deg)` / `RadToDeg(rad)`：角度與弧度轉換
- ...（依 convert.ts 內容擴充）

### LayerTool（圖層管理工具）
- ...（依 layers.ts 內容擴充）

## 型別定義

- `Position`：地理座標（含經緯度、角度、高度、Cartesian3）
- `Angle`：角度（度、弧度）
- `MapParams`：地圖參數
- `CameraParams`：相機參數

## 目錄結構

```
cesium-tools/
├── src/
│   ├── common.ts
│   ├── convert.ts
│   ├── draw.ts
│   ├── index.ts
│   ├── layers.ts
│   ├── navigate.ts
│   ├── track.ts
│   └── types/
│       ├── index.ts
│       ├── params.ts
│       └── position.ts
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## 作者

- **Willie Wu** - *Owner* - [sw-willie-wu](https://github.com/sw-willie-wu)

另請參閱所有參與本專案的 [contributors]()。

## 授權

詳見 [LICENSE](../LICENSE) 以取得更多資訊。

## 致謝

感謝所有貢獻者、測試者與建議者，以及 CesiumJS 團隊與開源社群的技術支持。

特別感謝：

[<img src="./imgs/ttl_logo.png" width="250"/>](https://www.thinktronltd.com/)

本專案亦受惠於多個開源專案，特此致謝。