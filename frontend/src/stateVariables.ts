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
  clockPickups: [] as ClockPickup[],
  clockImage: new Image(),
  npcPortraits: [] as HTMLCanvasElement[],
  activeNpcIndex: -1,
  dialogueVisibleText: "",
  dialogueTargetText: "",
  dialogueLastNpcIndex: -1,
  dialogueLastStepMs: 0,
  dialogueOptionsRevealAtMs: 0,
  dialogueHoveredOptionIndex: -1,
  dialogueSelectedOptionIndex: -1,
  dialogueSelectionStartedMs: 0,
  dialogueSelectionNpcIndex: -1,
  dialogueSuppressedNpcIndex: -1,
  dialogueDismissNpcIndex: -1,
  dialoguePanelNpcIndex: -1,
  dialoguePanelAnim: 0,
  dialoguePanelTarget: 0,
  dialoguePanelLastMs: 0,
  dialogueThankYouNpcIndex: -1,
  dialogueThankYouStartedMs: 0,
  dialogueThankYouOptionIndex: -1,
  dialogueThankYouPendingNpcIndex: -1,
  dialogueThankYouPendingOptionIndex: -1,
  dialogueForceCloseNpcIndex: -1,
  mouseX: 0,
  mouseY: 0,
  mouseClicked: false,
  mouseClickX: 0,
  mouseClickY: 0,
  isClickMoving: false,
  clickMoveTargetX: 0,
  clickMoveTargetY: 0,
  clickIndicatorX: 0,
  clickIndicatorY: 0,
  clickIndicatorStartMs: 0,
  endTimeMs: 0,
  lightCooldownMs: 6000,
  lightDurationMs: 5000,
  lightLastUsedMs: 0,
  assetsLoadCount: 0,
  cursorImages: {
    default: new Image(),
  },
  cursorImage: new Image(),
  isHoldingMeditationKey: false,
  meditationStart: null as number | null,
  selectedAvatarId: "Ophelia",
  playerProfile: {
    name: "",
    age: "",
    gender: "",
    occupation: "",
  } as {
    name: string;
    age: string;
    gender: string;
    occupation: string;
  },
};
