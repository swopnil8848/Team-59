import { Point } from "./shapes/point";
import { stateVariables } from "./stateVariables";
import { distance } from "./utils/util";

export type NpcDialogue = {
  name: string;
  scenario: string;
  options: string[];
};

export class NPC {
  startPoint: Point;
  sprite: HTMLCanvasElement;
  dialogue: NpcDialogue;
  w: number;
  h: number;
  interactionRadius: number;

  constructor(x: number, y: number, sprite: HTMLCanvasElement, dialogue: NpcDialogue) {
    this.startPoint = new Point(x, y);
    this.sprite = sprite;
    this.dialogue = dialogue;
    this.w = 58;
    this.h = 82;
    this.interactionRadius = 92;
  }

  show(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sprite, this.startPoint.x, this.startPoint.y, this.w, this.h);
    ctx.restore();
  }

  isPlayerNearby() {
    const npcCenter = new Point(
      this.startPoint.x + this.w / 2,
      this.startPoint.y + this.h / 2
    );
    const playerCenter = new Point(
      stateVariables.player.startPoint.x + 28,
      stateVariables.player.startPoint.y + 40
    );

    return distance(npcCenter, playerCenter) <= this.interactionRadius;
  }
}
