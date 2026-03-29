import { upCounter } from "./functions";

const NPC_FOLDERS = [
  "Character 1",
  "Character 2",
  "Character 3",
  "Character 4", // Double space consistent with filesystem
  "Character 5",
  "Character 6",
  "Character 7",
  "Character 8",
  "Character 9",
  "Character 10",
];

function trimCanvas(sourceCanvas: HTMLCanvasElement) {
  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  const { width, height } = sourceCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      if (data[index + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX === -1 || maxY === -1) return sourceCanvas;

  const padding = 4;
  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;
  const canvas = document.createElement("canvas");
  canvas.width = trimmedWidth + padding * 2;
  canvas.height = trimmedHeight + padding * 2;

  const trimmedCtx = canvas.getContext("2d");
  if (!trimmedCtx) return sourceCanvas;

  trimmedCtx.drawImage(
    sourceCanvas,
    minX,
    minY,
    trimmedWidth,
    trimmedHeight,
    padding,
    padding,
    trimmedWidth,
    trimmedHeight
  );

  return canvas;
}

function imageToCanvas(img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  
  // Since these are PNGs with likely transparent backgrounds, 
  // we just need to trim any empty space.
  return trimCanvas(canvas);
}

export function loadHiddenCharacterSpriteSheet(onReady: (sprites: HTMLCanvasElement[][]) => void) {
  const promises = NPC_FOLDERS.map((folder) => {
    const frames = [1, 2];
    const framePromises = frames.map((f) => {
      return new Promise<HTMLCanvasElement | null>((resolve) => {
        const img = new Image();
        img.src = `assets/npc/${folder}/front/front(${f}).png`;
        img.onload = () => {
          upCounter();
          resolve(imageToCanvas(img));
        };
        img.onerror = () => {
          console.warn(`Failed to load NPC sprite: ${img.src}`);
          resolve(null);
        };
      });
    });

    return Promise.all(framePromises).then((results) => {
      const validFrames = results.filter((s): s is HTMLCanvasElement => s !== null);
      return validFrames.length > 0 ? validFrames : null;
    });
  });

  Promise.all(promises).then((results) => {
    const allNpcSprites = results.filter((s): s is HTMLCanvasElement[] => s !== null);
    onReady(allNpcSprites);
  });
}

