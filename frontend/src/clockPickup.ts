import { Point } from "./shapes/point";
import { stateVariables } from "./stateVariables";
import { distance } from "./utils/util";

export class ClockPickup {
  startPoint: Point;
  w: number;
  h: number;
  r: number;

  constructor(x: number, y: number) {
    this.startPoint = new Point(x, y);
    this.w = 40;
    this.h = 40;
    this.r = 30;
  }

  show(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    if (!stateVariables.clockImage) return;
    ctx.drawImage(
      stateVariables.clockImage,
      this.startPoint.x,
      this.startPoint.y,
      this.w,
      this.h
    );
  }

  isCollected(): boolean {
    const dist = distance(this.startPoint, stateVariables.player.startPoint);
    return dist < this.r;
  }
}
