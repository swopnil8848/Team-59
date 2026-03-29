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

  checkCollision(offsetX: number, offsetY: number) {
    if (this.collected) return false;
    const nextCenterX = this.startPoint.x + offsetX + this.w / 2;
    const nextCenterY = this.startPoint.y + offsetY + this.h / 2;
    const playerCenterX = stateVariables.player.startPoint.x + 28;
    const playerCenterY = stateVariables.player.startPoint.y + 40;
    const dx = nextCenterX - playerCenterX;
    const dy = nextCenterY - playerCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.w / 2 + 10;
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
