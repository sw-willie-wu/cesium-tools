import { SingleTileImageryProvider, UrlTemplateImageryProvider } from "cesium";

import type { Bounds, Shape } from "./position";
// import type { Shape } from "./params";

type UrlTemplateOpts = Omit<
  UrlTemplateImageryProvider.ConstructorOptions,
  "url" | "rectangle"
>;
type SingleTileOpts = Omit<
  SingleTileImageryProvider.ConstructorOptions,
  "url" | "rectangle"
>;

export interface ImageOptions
  extends UrlTemplateOpts,
    SingleTileOpts,
    Partial<Shape> {
  bounds?: Bounds;
}

export interface DataSourceOptions {
  clampToGround?: boolean;
  fill?: string;
  alpha?: number;
  markerColor?: string;
  markerSize?: number;
  markerSymbol?: string;
  stroke?: string;
  strokeWidth?: number;
  show?: boolean;
}
