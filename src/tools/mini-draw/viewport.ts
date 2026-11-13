/** Viewport math: screen = world * zoom + offset. */

export interface Viewport { x: number; y: number; zoom: number }

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export function screenToWorld(v: Viewport, sx: number, sy: number): [number, number] {
  return [(sx - v.x) / v.zoom, (sy - v.y) / v.zoom];
}

export function worldToScreen(v: Viewport, wx: number, wy: number): [number, number] {
  return [wx * v.zoom + v.x, wy * v.zoom + v.y];
}

/** Zoom to `zoom` keeping screen point (sx,sy) fixed over the same world point. */
export function zoomAt(v: Viewport, zoom: number, sx: number, sy: number): Viewport {
  const z = clampZoom(zoom);
  const k = z / v.zoom;
  return { x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k, zoom: z };
}
