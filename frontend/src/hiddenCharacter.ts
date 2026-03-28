import { Point } from "./shapes/point";
import { stateVariables } from "./stateVariables";
import { distance } from "./utils/util";

export class HiddenCharacter {
  startPoint: Point;
  sprite: HTMLCanvasElement;
  w: number;
  h: number;
  r: number;
  collected: boolean;

  constructor(x: number, y: number, sprite: HTMLCanvasElement) {
    this.startPoint = new Point(x, y);
    this.sprite = sprite;
    this.w = 54;
    this.h = 78;
    this.r = 42;
    this.collected = false;
  }

  show(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    if (this.collected) return;
    ctx.drawImage(this.sprite, this.startPoint.x, this.startPoint.y, this.w, this.h);
  }

  tryCollect(): boolean {
    if (this.collected) return false;

    const spriteCenter = new Point(
      this.startPoint.x + this.w / 2,
      this.startPoint.y + this.h / 2
    );
    const playerCenter = new Point(
      stateVariables.player.startPoint.x + this.w / 2,
      stateVariables.player.startPoint.y + this.h / 2
    );

    if (distance(spriteCenter, playerCenter) < this.r) {
      this.collected = true;
      return true;
    }

    return false;
  }
}
