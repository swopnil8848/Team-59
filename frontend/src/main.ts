import "./style.css";
import "./controls";
import { adjustCanvasSize, drawChannelledAnimation, initializeGame } from "./functions";
import { handleMovementControls, handleOtherControls } from "./controls";
import { GameState, stateVariables } from "./stateVariables";

export const canvas = document.querySelector(
  "#gameCanvas"
) as HTMLCanvasElement;
stateVariables.ctx = canvas.getContext("2d")!;

initializeGame();

function draw() {
  adjustCanvasSize();

  stateVariables.bgImage.show();

  stateVariables.npcs.forEach((npc) => npc.show());
  stateVariables.clockPickups.forEach((clock) => clock.show());

  stateVariables.player.show();
  stateVariables.bgImage.showDepth();
  stateVariables.lantern.showLuminosity();
  stateVariables.lantern.changeLuminosity();

  handleOtherControls();
  handleMovementControls();

  stateVariables.clockPickups = stateVariables.clockPickups.filter((clock) => {
    if (clock.isCollected()) {
      stateVariables.endTimeMs += 5000;
      return false;
    }
    return true;
  });

  if (stateVariables.isHoldingMeditationKey && stateVariables.meditationStart != null) {
    drawChannelledAnimation();
  }

  const remainingMs = stateVariables.endTimeMs - Date.now();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  stateVariables.ui.renderTimer(remainingSeconds);
  stateVariables.ui.renderScore();

  if (remainingMs <= 0) {
    stateVariables.gameState = GameState.finished;
  }

  if (stateVariables.gameState === GameState.finished) {
    stateVariables.ui.renderGameOver();
  }

  requestAnimationFrame(draw);
}

draw();
