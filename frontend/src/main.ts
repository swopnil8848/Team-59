import "./style.css";
import "./controls";
import { adjustCanvasSize, drawChannelledAnimation, initializeGame } from "./functions";
import { handleMovementControls, handleOtherControls } from "./controls";
import { GameState, stateVariables } from "./stateVariables";

export const canvas = document.querySelector(
  "#gameCanvas"
) as HTMLCanvasElement;
stateVariables.ctx = canvas.getContext("2d")!;
stateVariables.ctx.imageSmoothingEnabled = false;

function updateMousePosition(e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  stateVariables.mouseX = (e.clientX - rect.left) * scaleX;
  stateVariables.mouseY = (e.clientY - rect.top) * scaleY;
}

canvas.addEventListener("pointermove", (e) => updateMousePosition(e));
canvas.addEventListener("pointerdown", (e) => updateMousePosition(e));
canvas.addEventListener("pointerup", (e) => {
  updateMousePosition(e);
  stateVariables.mouseClicked = true;
  stateVariables.mouseClickX = stateVariables.mouseX;
  stateVariables.mouseClickY = stateVariables.mouseY;
});

initializeGame();

function draw() {
  adjustCanvasSize();
  stateVariables.ctx.imageSmoothingEnabled = false;

  stateVariables.bgImage.show();

  stateVariables.npcs.forEach((npc) => npc.show());
  stateVariables.clockPickups.forEach((clock) => clock.show());

  stateVariables.player.show();
  stateVariables.bgImage.showDepth();
  stateVariables.lantern.showLuminosity();
  stateVariables.lantern.changeLuminosity();

  handleOtherControls();
  handleMovementControls();

  const nearbyNpcIndex = stateVariables.npcs.findIndex((npc) => npc.isPlayerNearby());
  stateVariables.activeNpcIndex = nearbyNpcIndex;
  if (nearbyNpcIndex === -1) {
    stateVariables.dialogueSuppressedNpcIndex = -1;
    stateVariables.dialogueDismissNpcIndex = -1;
    stateVariables.dialogueForceCloseNpcIndex = -1;
    stateVariables.dialogueThankYouNpcIndex = -1;
    stateVariables.dialogueThankYouStartedMs = 0;
    stateVariables.dialogueThankYouOptionIndex = -1;
    stateVariables.dialogueThankYouPendingNpcIndex = -1;
    stateVariables.dialogueThankYouPendingOptionIndex = -1;
  }

  stateVariables.clockPickups = stateVariables.clockPickups.filter((clock) => {
    if (clock.isCollected()) {
      stateVariables.endTimeMs += 5000;
      return false;
    }
    return true;
  });

  const remainingMs = stateVariables.endTimeMs - Date.now();
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  drawChannelledAnimation();
  stateVariables.ui.renderTimer(remainingSeconds);
  stateVariables.ui.renderScore();
  stateVariables.ui.renderNpcHint();
  stateVariables.ui.renderDialogue();
  stateVariables.mouseClicked = false;

  if (remainingMs <= 0) {
    stateVariables.gameState = GameState.finished;
  }

  if (stateVariables.gameState === GameState.finished) {
    stateVariables.ui.renderGameOver();
  }

  requestAnimationFrame(draw);
}

draw();
