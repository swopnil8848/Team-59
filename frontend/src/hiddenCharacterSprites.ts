import { upCounter } from "./functions";

const SHEET_COLUMNS = 15;
const SHEET_ROWS = 6;
const BACKGROUND_TOLERANCE = 34;
const MIN_VISIBLE_PIXELS = 120;

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
) {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
}

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

function extractTile(
  sheet: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
) {
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh);
  const imageData = ctx.getImageData(0, 0, sw, sh);
  const { data } = imageData;

  const background = [
    data[0],
    data[1],
    data[2],
    data[(sw - 1) * 4],
    data[(sh - 1) * sw * 4],
    data[(sh * sw - 1) * 4],
  ];

  const bgR = Math.round((background[0] + background[3] + background[4] + background[5]) / 4);
  const bgG = Math.round((data[1] + data[(sw - 1) * 4 + 1] + data[(sh - 1) * sw * 4 + 1] + data[(sh * sw - 1) * 4 + 1]) / 4);
  const bgB = Math.round((data[2] + data[(sw - 1) * 4 + 2] + data[(sh - 1) * sw * 4 + 2] + data[(sh * sw - 1) * 4 + 2]) / 4);

  let visiblePixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB);
    if (dist <= BACKGROUND_TOLERANCE) {
      data[i + 3] = 0;
      continue;
    }

    visiblePixels++;
  }

  if (visiblePixels < MIN_VISIBLE_PIXELS) return null;

  ctx.putImageData(imageData, 0, 0);
  return trimCanvas(canvas);
}

export function loadHiddenCharacterSpriteSheet(onReady: (sprites: HTMLCanvasElement[]) => void) {
  const sheet = new Image();
  sheet.src = "assets/characters/freepik_0001.png";
  sheet.onload = () => {
    upCounter();

    const tileWidth = Math.floor(sheet.width / SHEET_COLUMNS);
    const tileHeight = Math.floor(sheet.height / SHEET_ROWS);
    const sprites: HTMLCanvasElement[] = [];

    for (let row = 0; row < SHEET_ROWS; row++) {
      for (let column = 0; column < SHEET_COLUMNS; column++) {
        const sprite = extractTile(
          sheet,
          column * tileWidth,
          row * tileHeight,
          tileWidth,
          tileHeight
        );

        if (sprite) sprites.push(sprite);
      }
    }

    onReady(sprites);
  };
}
