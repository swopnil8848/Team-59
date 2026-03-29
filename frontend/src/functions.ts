import { Character } from "./character";
import { ClockPickup } from "./clockPickup";
import { loadHiddenCharacterSpriteSheet } from "./hiddenCharacterSprites";
import { Lantern } from "./lantern";
import { Maps } from "./maps";
import { NPC, NpcDialogue } from "./npc";
import { Ui } from "./ui";
import { GameState, stateVariables, DirectionalSprites } from "./stateVariables";

export function adjustCanvasSize() {
  const oldWidth = stateVariables.windowWidth;
  const oldHeight = stateVariables.windowHeight;
  
  stateVariables.windowWidth = window.innerWidth;
  stateVariables.windowHeight = window.innerHeight;
  
  const canvas = stateVariables.ctx.canvas;
  if (canvas) {
    canvas.width = stateVariables.windowWidth;
    canvas.height = stateVariables.windowHeight;
  }
  
  if (stateVariables.player && stateVariables.player.startPoint && stateVariables.lantern) {
    const dx = (stateVariables.windowWidth - oldWidth) / 2;
    const dy = (stateVariables.windowHeight - oldHeight) / 2;
    
    if (dx !== 0 || dy !== 0) {
      stateVariables.player.startPoint.x += dx;
      stateVariables.player.startPoint.y += dy;
      stateVariables.lantern.x += dx;
      stateVariables.lantern.y += dy;
    }
  }
}

export function upCounter() {
  stateVariables.assetsLoadCount++;
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export async function preloadGameAssets(): Promise<void> {
  // Best-effort preloading; failures should not block gameplay.
  const assets = [
    "assets/main-map.jpg",
    "assets/ui/stamina.png",
    "assets/cursor.png",
  ];

  await Promise.allSettled(assets.map((src) => preloadImage(src)));
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

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
}

type ApiGameQuestion = {
  id?: string;
  questionText?: string;
  answers?: Array<{ id?: string; answerText?: string; feedback?: string | null }>;
};

function createRandomHiddenCharacters(centerX: number, centerY: number, questions: ApiGameQuestion[]) {
  const spawnOffsets = [
    { x: 260, y: -200 },
    { x: -340, y: -260 },
    { x: 560, y: -120 },
    { x: 860, y: 160 },
    { x: 220, y: 520 },
    { x: -420, y: 560 },
    { x: -840, y: 180 },
    { x: -700, y: -540 },
  ];

  const npcNamePool = [
    "Mentor Anushka Shrestha",
    "Shreyas K. Shrestha",
    "Samartha Shrestha",
    "Nasana Bajracharya",
    "Suvasha Shrestha",
    "Christina Kayastha",
    "Binam Kayastha",
    "Sanjay Manandhar",
  ];

  const dialoguePool: NpcDialogue[] = [
    {
      name: npcNamePool[0] ?? "Mentor Anushka Shrestha",
      scenario: "I am feeling confused. I thought my daughter was supposed to come this morning. What should I do now?",
      options: [
        "Sit with me and gently remind me what day it is.",
        "Tell me I am wrong and should stop worrying.",
        "Leave me alone so I can figure it out myself.",
      ],
    },
    {
      name: npcNamePool[1] ?? "Shreyas K. Shrestha",
      scenario: "I cannot remember where I kept my shawl, and it is making me anxious.",
      options: [
        "Help me look slowly and reassure me.",
        "Laugh and say it is probably gone forever.",
        "Tell me to search faster because time is being wasted.",
      ],
    },
    {
      name: npcNamePool[2] ?? "Samartha Shrestha",
      scenario: "I think I need to go home, even though I am already here. Can you help me?",
      options: [
        "Speak calmly and help me feel safe in the present moment.",
        "Block the door and argue with me.",
        "Ignore me until I stop talking.",
      ],
    },
    {
      name: npcNamePool[3] ?? "Nasana Bajracharya",
      scenario: "Too many things are happening around me. I feel overwhelmed.",
      options: [
        "Reduce the noise and talk to me softly.",
        "Ask many questions quickly.",
        "Tell me to just get used to it.",
      ],
    },
  ];

  const apiDialogues: NpcDialogue[] = (Array.isArray(questions) ? questions : [])
    .filter((q) => q && typeof q === "object")
    .map((q, idx) => {
      const qText =
        typeof q.questionText === "string" && q.questionText.trim().length > 0
          ? q.questionText.trim()
          : `Question ${idx + 1}`;
      const answers = Array.isArray(q.answers) ? q.answers : [];
      const options = answers
        .map((a) => (typeof a?.answerText === "string" ? a.answerText.trim() : ""))
        .filter(Boolean);
      const answerIds = answers
        .map((a) => (typeof a?.id === "string" ? a.id : ""))
        .filter(Boolean);
      const optionFeedbacks = answers.map((a) =>
        typeof a?.feedback === "string" ? a.feedback.trim() : null
      );

      return {
        name: npcNamePool[idx % npcNamePool.length] ?? `Wanderer ${idx + 1}`,
        scenario: qText,
        options: options.length > 0 ? options : (dialoguePool[idx % dialoguePool.length]?.options ?? []),
        questionId: typeof q.id === "string" ? q.id : undefined,
        answerIds: answerIds.length > 0 ? answerIds : undefined,
        optionFeedbacks: optionFeedbacks.length > 0 ? optionFeedbacks : undefined,
      };
    });

  const chosenSprites = shuffleArray(stateVariables.npcPortraits).slice(0, 4);
  const chosenOffsets = shuffleArray(spawnOffsets).slice(0, chosenSprites.length);

  return chosenSprites.map(
    (sprites, index) =>
      new NPC(
        centerX + chosenOffsets[index].x,
        centerY + chosenOffsets[index].y,
        sprites,
        apiDialogues[index] ?? dialoguePool[index % dialoguePool.length]
      )
  );
}

function loadPlayerSprites(): DirectionalSprites {
  const basePath = `assets/character/images/characters/${stateVariables.selectedAvatarId}`;
  return {
    front: loadCharacterImages("front", 4, basePath),
    back: loadCharacterImages("back", 4, basePath),
    left: loadCharacterImages("left", 4, basePath),
    right: loadCharacterImages("right", 4, basePath),
  };
}

// `questions` is optional for compatibility with the API-driven session flow.
export function initializeGame(_questions?: any[]) {
  adjustCanvasSize();
  stateVariables.keyState = {};

  stateVariables.bgImage = new Maps("main-map.jpg");
  stateVariables.bgImage.initialiseImages();

  stateVariables.player = new Character();
  stateVariables.player.setSprites(loadPlayerSprites());
  stateVariables.player.startPoint.x = stateVariables.windowWidth / 2;
  stateVariables.player.startPoint.y = stateVariables.windowHeight / 2;

  stateVariables.lantern = new Lantern();
  stateVariables.ui = new Ui();

  const centerX = stateVariables.windowWidth / 2;
  const centerY = stateVariables.windowHeight / 2;
  stateVariables.npcs = [];

  stateVariables.clockImage = new Image();
  stateVariables.clockImage.src =
    "assets/pickups/health_pack/health_pack (1).png";
  stateVariables.clockImage.onload = upCounter;

  stateVariables.staminaImage.src = "assets/ui/stamina.png";
  stateVariables.staminaImage.onload = upCounter;

  stateVariables.clockPickups = [
    new ClockPickup(centerX + 100, centerY + 250),
    new ClockPickup(centerX - 400, centerY - 200),
    new ClockPickup(centerX + 600, centerY - 350),
  ];

  stateVariables.cursorImages.default.src = "assets/cursor.png";
  stateVariables.cursorImages.default.onload = upCounter;
  stateVariables.cursorImage = stateVariables.cursorImages.default;

  loadHiddenCharacterSpriteSheet((sprites) => {
    stateVariables.npcPortraits = sprites;
    stateVariables.npcs = createRandomHiddenCharacters(centerX, centerY, stateVariables.gameQuestions as any);
  });

  // Timer set to 120s
  stateVariables.endTimeMs = Date.now() + 120000;
  stateVariables.gameState = GameState.running;
}

// meditating animation
export function drawChannelledAnimation() {
  if (!stateVariables.isHoldingMeditationKey || stateVariables.meditationStart == null) {
    return;
  }

  const holdDuration = stateVariables.meditationDurationMs;
  const text = "Meditating";
  const currentTime = Date.now();
  const elapsedTime = currentTime - stateVariables.meditationStart;
  const remainingTime = Math.max(0, holdDuration - elapsedTime);
  const progress = 1 - Math.min(elapsedTime / holdDuration, 1);

  const barWidth = 360;
  const barHeight = 8;
  const barX = (stateVariables.windowWidth - barWidth) / 2;
  const barY = Math.floor(stateVariables.windowHeight * 0.78);
  const radius = barHeight / 2;

  const drawRoundedRect = (
    x: number,
    y: number,
    width: number,
    height: number,
    r: number
  ) => {
    const clampedR = Math.min(r, width / 2, height / 2);
    stateVariables.ctx.beginPath();
    stateVariables.ctx.moveTo(x + clampedR, y);
    stateVariables.ctx.arcTo(x + width, y, x + width, y + height, clampedR);
    stateVariables.ctx.arcTo(x + width, y + height, x, y + height, clampedR);
    stateVariables.ctx.arcTo(x, y + height, x, y, clampedR);
    stateVariables.ctx.arcTo(x, y, x + width, y, clampedR);
    stateVariables.ctx.closePath();
  };

  stateVariables.ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  drawRoundedRect(barX, barY, barWidth, barHeight, radius);
  stateVariables.ctx.fill();

  stateVariables.ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  drawRoundedRect(barX, barY, barWidth, barHeight, radius);
  stateVariables.ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  stateVariables.ctx.stroke();

  const fillWidth = Math.max(0, barWidth * progress);
  stateVariables.ctx.fillStyle = "#e6f2f0";
  drawRoundedRect(barX, barY, fillWidth, barHeight, radius);
  stateVariables.ctx.fill();

  stateVariables.ctx.font = "16px Outfit";
  stateVariables.ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  stateVariables.ctx.textAlign = "center";
  stateVariables.ctx.fillText(
    `${text} ${(remainingTime / 1000).toFixed(1)}s`,
    stateVariables.windowWidth / 2,
    barY - 10
  );
}

// cursor movement
export function drawCursorImage(
  ctx: CanvasRenderingContext2D = stateVariables.ctx
) {
  const image = stateVariables.cursorImage;
  if (!image || !image.complete || !image.naturalWidth) {
    return;
  }

  const size = 40;
  const x = stateVariables.mouseX - size / 2;
  const y = stateVariables.mouseY - size / 2;
  ctx.drawImage(image, x, y, size, size);
}

export function drawClickIndicator(
  ctx: CanvasRenderingContext2D = stateVariables.ctx
) {
  const start = stateVariables.clickIndicatorStartMs;
  if (!start) {
    return;
  }

  const durationMs = 800;
  const elapsed = Date.now() - start;
  if (elapsed > durationMs) {
    return;
  }

  const t = elapsed / durationMs;
  const alpha = Math.max(0, 0.6 * (1 - t));
  const radius = 6 + t * 18;
  const x = stateVariables.clickIndicatorX + stateVariables.bgImage.startPoint.x;
  const y = stateVariables.clickIndicatorY + stateVariables.bgImage.startPoint.y;

  ctx.save();
  ctx.strokeStyle = `rgba(230, 242, 240, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
