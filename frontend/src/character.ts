import { Point } from "./shapes/point";
import { stateVariables } from "./stateVariables";
import { PLAYER_MOVEMENT_SPEED } from "./constants";
import { DirectionalSprites } from "./stateVariables";

export class Character {
  startPoint: Point;
  movement_speed: number;
  default_speed: number;
  dirX: number;
  dirY: number;
  direction: "u" | "d" | "l" | "r";
  images_back: HTMLImageElement[];
  images_front: HTMLImageElement[];
  images_right: HTMLImageElement[];
  images_left: HTMLImageElement[];
  frameToShow: number;
  frameTime: number;
  isWalking: boolean;
  isRunning: boolean;
  isBlowingLantern: boolean;
  score: number;
  stamina: number;
  staminaMax: number;
  isExhausted: boolean;

  constructor() {
    this.startPoint = new Point(0, 0);
    this.movement_speed = PLAYER_MOVEMENT_SPEED;
    this.default_speed = this.movement_speed;
    this.dirX = 0;
    this.dirY = 0;
    this.direction = "r";
    this.images_back = [];
    this.images_front = [];
    this.images_left = [];
    this.images_right = [];
    this.frameToShow = 0;
    this.frameTime = 6;
    this.isWalking = false;
    this.isRunning = false;
    this.isBlowingLantern = false;
    this.score = 0;
    this.staminaMax = 100;
    this.stamina = this.staminaMax;
    this.isExhausted = false;
  }

  setSprites(sprites: DirectionalSprites) {
    this.images_back = sprites.back;
    this.images_front = sprites.front;
    this.images_left = sprites.left;
    this.images_right = sprites.right;
  }

  change_frames() {
    if (this.isWalking) this.frameToShow++;
    if (this.frameToShow >= 24) this.frameToShow = 0;
  }

  show(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const frame = Math.floor(this.frameToShow / this.frameTime);
    let img = this.images_right[frame] || this.images_right[0];

    if (this.direction === "l") img = this.images_left[frame] || this.images_left[0];
    if (this.direction === "u") img = this.images_back[frame] || this.images_back[0];
    if (this.direction === "d") img = this.images_front[frame] || this.images_front[0];

    ctx.drawImage(img, this.startPoint.x, this.startPoint.y);

    if (this.direction !== "d") {
      ctx.drawImage(img, this.startPoint.x, this.startPoint.y);
    }
    if (this.direction !== "u") stateVariables.lantern.show();
  }

  move() {
    if (this.dirX === 0 && this.dirY === 0) {
      this.isWalking = false;
      this.frameToShow = 0;
      return;
    }

    const speed = this.movement_speed;

    const checkNpcCollision = (offsetX: number, offsetY: number) => {
      for (const npc of stateVariables.npcs) {
        if (npc.checkCollision(offsetX, offsetY)) return true;
      }
      return false;
    };

    let moved = false;

    // Try horizontal movement
    if (this.dirX !== 0) {
      const canMoveX = !stateVariables.bgImage.checkCollision(
        stateVariables.bgImage.startPoint.x + speed * this.dirX,
        stateVariables.bgImage.startPoint.y
      ) && !checkNpcCollision(speed * this.dirX, 0);

      if (canMoveX) {
        stateVariables.bgImage.startPoint.x += speed * this.dirX;
        stateVariables.npcs.forEach((npc) => (npc.startPoint.x += speed * this.dirX));
        stateVariables.clockPickups.forEach(
          (clock) => (clock.startPoint.x += speed * this.dirX)
        );
        moved = true;
      }
    }

    // Try vertical movement
    if (this.dirY !== 0) {
      const canMoveY = !stateVariables.bgImage.checkCollision(
        stateVariables.bgImage.startPoint.x,
        stateVariables.bgImage.startPoint.y + speed * this.dirY
      ) && !checkNpcCollision(0, speed * this.dirY);

      if (canMoveY) {
        stateVariables.bgImage.startPoint.y += speed * this.dirY;
        stateVariables.npcs.forEach((npc) => (npc.startPoint.y += speed * this.dirY));
        stateVariables.clockPickups.forEach(
          (clock) => (clock.startPoint.y += speed * this.dirY)
        );
        moved = true;
      }
    }

    if (moved) {
      this.isWalking = true;
      this.change_frames();
    } else {
      this.isWalking = false;
      this.frameToShow = 0;
    }
  }
}