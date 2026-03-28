import { Character } from "./character";
import { ClockPickup } from "./clockPickup";
import { Lantern } from "./lantern";
import { Maps } from "./maps";
import { NPC } from "./npc";
import { Ui } from "./ui";
import { GameState, stateVariables, DirectionalSprites } from "./stateVariables";

export function adjustCanvasSize() {
  stateVariables.windowWidth = window.innerWidth;
  stateVariables.windowHeight = window.innerHeight;
  const canvas = stateVariables.ctx.canvas;
  canvas.width = stateVariables.windowWidth;
  canvas.height = stateVariables.windowHeight;
}

export function upCounter() {
  stateVariables.assetsLoadCount++;
}

export function loadCharacterImages(
  direction: string,
  no_of_frames: number,
  path: string
) {
  const imagesArray = [] as HTMLImageElement[];
  for (let i = 1; i <= no_of_frames; i++) {
    const img = new Image();
    img.src = `${path}/${direction}/${direction} (${i}).png`;
    img.onload = upCounter;
    imagesArray.push(img);
  }
  return imagesArray;
}

export function loadGoblinImages(
  direction: string,
  no_of_frames: number,
  path: string
) {
  const imagesArray = [] as HTMLImageElement[];
  for (let i = 1; i <= no_of_frames; i++) {
    const img = new Image();
    img.src = `${path}/${direction}/${direction} (${i}).png`;
    img.onload = upCounter;
    imagesArray.push(img);
  }
  return imagesArray;
}

export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r1: number,
  r2: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x - r1, y - r2);
  ctx.scale(r1, r2);
  ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);
  ctx.restore();
  ctx.fill();
}

function loadPlayerSprites(): DirectionalSprites {
  const basePath = "assets/character/images/characters/Ophelia";
  return {
    front: loadCharacterImages("front", 4, basePath),
    back: loadCharacterImages("back", 4, basePath),
    left: loadCharacterImages("left", 4, basePath),
    right: loadCharacterImages("right", 4, basePath),
  };
}

function loadNpcSprites(): DirectionalSprites {
  const basePath = "assets/enemy/goblin";
  return {
    front: loadGoblinImages("front", 6, basePath),
    back: loadGoblinImages("back", 6, basePath),
    left: loadGoblinImages("left", 6, basePath),
    right: loadGoblinImages("right", 6, basePath),
  };
}

export function initializeGame() {
  stateVariables.bgImage = new Maps("main-map.jpg");
  stateVariables.bgImage.initialiseImages();

  stateVariables.player = new Character();
  stateVariables.player.setSprites(loadPlayerSprites());
  stateVariables.player.startPoint.x = stateVariables.windowWidth / 2;
  stateVariables.player.startPoint.y = stateVariables.windowHeight / 2;

  stateVariables.lantern = new Lantern();
  stateVariables.ui = new Ui();

  stateVariables.npcSprites = loadNpcSprites();

  const centerX = stateVariables.windowWidth / 2;
  const centerY = stateVariables.windowHeight / 2;
  stateVariables.npcs = [
    new NPC(centerX + 200, centerY - 100, "d"),
    new NPC(centerX - 300, centerY + 150, "l"),
    new NPC(centerX + 500, centerY + 300, "r"),
  ];

  stateVariables.clockImage = new Image();
  stateVariables.clockImage.src =
    "assets/pickups/health_pack/health_pack (1).png";
  stateVariables.clockImage.onload = upCounter;

  stateVariables.clockPickups = [
    new ClockPickup(centerX + 100, centerY + 250),
    new ClockPickup(centerX - 400, centerY - 200),
    new ClockPickup(centerX + 600, centerY - 350),
  ];

  stateVariables.endTimeMs = Date.now() + 120000;
  stateVariables.gameState = GameState.running;
}
