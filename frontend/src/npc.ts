import { Point } from "./shapes/point";
import { stateVariables } from "./stateVariables";
import { distance } from "./utils/util";

export type NpcDialogue = {
  name: string;
  scenario: string;
  options: string[];
  questionId?: string;
  answerIds?: string[];
  optionFeedbacks?: Array<string | null>;
};

export class NPC {
  startPoint: Point;
  sprites: HTMLCanvasElement[];
  dialogue: NpcDialogue;
  interactionRadius: number;
  frameToShow: number;
  frameTime: number;

  constructor(x: number, y: number, sprites: HTMLCanvasElement[], dialogue: NpcDialogue) {
    this.startPoint = new Point(x, y);
    this.sprites = sprites;
    this.dialogue = dialogue;
    this.interactionRadius = 92;
    this.frameToShow = 0;
    this.frameTime = 24; // Slow animation for idling NPCs
  }

  get currentWidth() {
    return this.sprites[0]?.width || 58;
  }

  get currentHeight() {
    return this.sprites[0]?.height || 82;
  }

  show(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const isInteracting =
      stateVariables.dialoguePanelNpcIndex !== -1 &&
      stateVariables.npcs[stateVariables.dialoguePanelNpcIndex] === this &&
      stateVariables.dialoguePanelAnim > 0;

    if (isInteracting) {
      this.frameToShow = 0; // dont move and show first frame during dialogue
    } else {
      this.frameToShow++;
      if (this.frameToShow >= this.sprites.length * this.frameTime) {
        this.frameToShow = 0;
      }
    }

    const frameIdx = Math.floor(this.frameToShow / this.frameTime);
    const sprite = this.sprites[frameIdx] || this.sprites[0];

    if (!sprite) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // draw using natural sprite dimensions, matching character.ts
    ctx.drawImage(sprite, this.startPoint.x, this.startPoint.y);
    ctx.restore();
  }

  isPlayerNearby() {
    const npcCenter = new Point(
      this.startPoint.x + this.currentWidth / 2,
      this.startPoint.y + this.currentHeight / 2
    );
    const playerCenter = new Point(
      stateVariables.player.startPoint.x + 28,
      stateVariables.player.startPoint.y + 40
    );

    return distance(npcCenter, playerCenter) <= this.interactionRadius;
  }
}
