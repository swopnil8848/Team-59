import { Character } from "./character";
import { Lantern } from "./lantern";
import { Maps } from "./maps";
import { Ui } from "./ui";
import { NPC } from "./npc";
import { ClockPickup } from "./clockPickup";

export type DirectionalSprites = {
  front: HTMLImageElement[];
  back: HTMLImageElement[];
  left: HTMLImageElement[];
  right: HTMLImageElement[];
};

export enum GameState {
  running = "running",
  finished = "finished",
}

export const keyDown = {
  E: false,
};

export const stateVariables = {
  ctx: {} as CanvasRenderingContext2D,
  player: {} as Character,
  bgImage: {} as Maps,
  windowWidth: window.innerWidth,
  windowHeight: window.innerHeight,
  debugCollider: false,
  adjustDeviceColliderX: (window.innerWidth - 1536) / 2,
  adjustDeviceColliderY: (window.innerHeight - 753) / 2,
  lantern: {} as Lantern,
  ui: {} as Ui,
  keyState: {} as { [key: number]: boolean },
  gameState: GameState.running,
  npcs: [] as NPC[],
  npcSprites: {
    front: [] as HTMLImageElement[],
    back: [] as HTMLImageElement[],
    left: [] as HTMLImageElement[],
    right: [] as HTMLImageElement[],
  },
  clockPickups: [] as ClockPickup[],
  clockImage: new Image(),
  endTimeMs: 0,
  lightCooldownMs: 6000,
  lightDurationMs: 5000,
  lightLastUsedMs: 0,
  assetsLoadCount: 0,
};
