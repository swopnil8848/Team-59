import { Point } from "./shapes/point";
import { stateVariables } from "./stateVariables";

export class NPC {
  startPoint: Point;
  direction: "u" | "d" | "l" | "r";
  w: number;
  h: number;
  spritePos: number;

  constructor(x: number, y: number, direction: "u" | "d" | "l" | "r" = "d") {
    this.startPoint = new Point(x, y);
    this.direction = direction;
    this.w = 70;
    this.h = 70;
    this.spritePos = 0;
  }

  show(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const sprites = stateVariables.npcSprites;
    const staggerFrame = 8;
    const frame = Math.floor(this.spritePos / staggerFrame) % sprites.front.length;

    let img = sprites.front[frame];
    if (this.direction === "u") img = sprites.back[frame];
    if (this.direction === "l") img = sprites.left[frame];
    if (this.direction === "r") img = sprites.right[frame];

    ctx.drawImage(img, this.startPoint.x, this.startPoint.y, this.w, this.h);
    this.spritePos++;
  }
}
