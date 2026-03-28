import { keyDown, stateVariables } from "./stateVariables";

window.addEventListener(
  "keydown",
  function (e) {
    stateVariables.keyState[e.keyCode || e.which] = true;
  },
  true
);
window.addEventListener(
  "keyup",
  function (e) {
    stateVariables.keyState[e.keyCode || e.which] = false;
  },
  true
);

export function handleMovementControls() {
  if (stateVariables.isHoldingMeditationKey) {
    stateVariables.player.dirX = 0;
    stateVariables.player.dirY = 0;
    return;
  }

  const panel = stateVariables.dialoguePanelRect;
  const clickInDialogue =
    panel.visible &&
    stateVariables.mouseClickX >= panel.x &&
    stateVariables.mouseClickX <= panel.x + panel.width &&
    stateVariables.mouseClickY >= panel.y &&
    stateVariables.mouseClickY <= panel.y + panel.height;

  if (stateVariables.mouseClicked && !clickInDialogue) {
    stateVariables.clickMoveTargetX =
      stateVariables.mouseX - stateVariables.bgImage.startPoint.x;
    stateVariables.clickMoveTargetY =
      stateVariables.mouseY - stateVariables.bgImage.startPoint.y;
    stateVariables.isClickMoving = true;
    stateVariables.clickIndicatorX = stateVariables.clickMoveTargetX;
    stateVariables.clickIndicatorY = stateVariables.clickMoveTargetY;
    stateVariables.clickIndicatorStartMs = Date.now();
  }

  const isMovingKey =
    !!stateVariables.keyState[87] ||
    !!stateVariables.keyState[65] ||
    !!stateVariables.keyState[83] ||
    !!stateVariables.keyState[68];

  if (isMovingKey) {
    stateVariables.isClickMoving = false;
  }

  if (stateVariables.keyState[87] && stateVariables.keyState[68]) {
    stateVariables.player.direction = "u";
    stateVariables.player.dirX = -0.72;
    stateVariables.player.dirY = 0.72;
    stateVariables.player.move();
  } else if (stateVariables.keyState[87] && stateVariables.keyState[65]) {
    stateVariables.player.direction = "u";
    stateVariables.player.dirX = 0.72;
    stateVariables.player.dirY = 0.72;
    stateVariables.player.move();
  } else if (stateVariables.keyState[83] && stateVariables.keyState[65]) {
    stateVariables.player.direction = "d";
    stateVariables.player.dirX = 0.72;
    stateVariables.player.dirY = -0.72;
    stateVariables.player.move();
  } else if (stateVariables.keyState[83] && stateVariables.keyState[68]) {
    stateVariables.player.direction = "d";
    stateVariables.player.dirX = -0.72;
    stateVariables.player.dirY = -0.72;
    stateVariables.player.move();
  } else if (stateVariables.keyState[65]) {
    stateVariables.player.direction = "l";
    stateVariables.player.dirX = 1;
    stateVariables.player.dirY = 0;
    stateVariables.player.move();
  } else if (stateVariables.keyState[68]) {
    stateVariables.player.direction = "r";
    stateVariables.player.dirX = -1;
    stateVariables.player.dirY = 0;
    stateVariables.player.move();
  } else if (stateVariables.keyState[83]) {
    stateVariables.player.direction = "d";
    stateVariables.player.dirX = 0;
    stateVariables.player.dirY = -1;
    stateVariables.player.move();
  } else if (stateVariables.keyState[87]) {
    stateVariables.player.direction = "u";
    stateVariables.player.dirX = 0;
    stateVariables.player.dirY = 1;
    stateVariables.player.move();
  } else if (stateVariables.isClickMoving) {
    const playerWorldX =
      stateVariables.player.startPoint.x - stateVariables.bgImage.startPoint.x;
    const playerWorldY =
      stateVariables.player.startPoint.y - stateVariables.bgImage.startPoint.y;
    const dx = stateVariables.clickMoveTargetX - playerWorldX;
    const dy = stateVariables.clickMoveTargetY - playerWorldY;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      stateVariables.isClickMoving = false;
      stateVariables.player.dirX = 0;
      stateVariables.player.dirY = 0;
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      stateVariables.player.direction = dx >= 0 ? "r" : "l";
    } else {
      stateVariables.player.direction = dy >= 0 ? "d" : "u";
    }

    stateVariables.player.dirX = -dx / dist;
    stateVariables.player.dirY = -dy / dist;

    const prevX = stateVariables.bgImage.startPoint.x;
    const prevY = stateVariables.bgImage.startPoint.y;
    stateVariables.player.move();
    if (
      stateVariables.bgImage.startPoint.x === prevX &&
      stateVariables.bgImage.startPoint.y === prevY
    ) {
      stateVariables.isClickMoving = false;
    }
  } else {
    stateVariables.player.dirX = 0;
    stateVariables.player.dirY = 0;
  }
}

export function handleOtherControls() {
  const isMovingKey =
    !!stateVariables.keyState[87] ||
    !!stateVariables.keyState[65] ||
    !!stateVariables.keyState[83] ||
    !!stateVariables.keyState[68];
  const isMoving = isMovingKey || stateVariables.isClickMoving;
  if (stateVariables.player.stamina <= 0) {
    stateVariables.player.isExhausted = true;
  } else if (stateVariables.player.stamina >= 20) { // recover some stamina before allowing sprint again
    stateVariables.player.isExhausted = false;
  }

  const canSprint =
    !!stateVariables.keyState[16] &&
    !stateVariables.isHoldingMeditationKey &&
    !stateVariables.player.isExhausted &&
    stateVariables.player.stamina > 0;

  if (canSprint && isMoving) {
    stateVariables.player.movement_speed = stateVariables.player.default_speed * 1.6;
    stateVariables.player.frameTime = 4;
    stateVariables.player.isRunning = true;
    stateVariables.player.stamina = Math.max(0, stateVariables.player.stamina - 0.6);
  } else {
    stateVariables.player.movement_speed = stateVariables.player.default_speed;
    stateVariables.player.frameTime = 6;
    stateVariables.player.isRunning = false;
    stateVariables.player.stamina = Math.min(
      stateVariables.player.staminaMax,
      stateVariables.player.stamina + 0.25
    );
  }

  const isHoldingE = !!stateVariables.keyState[69];
  const shouldMeditate = isHoldingE && !isMovingKey;

  if (shouldMeditate) {
    if (!keyDown.E) {
      const now = Date.now();
      stateVariables.isHoldingMeditationKey = true;
      stateVariables.meditationStart = now;
      keyDown.E = true;
    }
  } else {
    if (keyDown.E && stateVariables.isHoldingMeditationKey) {
      stateVariables.isHoldingMeditationKey = false;
      stateVariables.meditationStart = null;
    }
    keyDown.E = false;
  }
}
