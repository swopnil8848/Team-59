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
  } else {
    stateVariables.player.dirX = 0;
    stateVariables.player.dirY = 0;
  }
}

export function handleOtherControls() {
  const isHoldingE = !!stateVariables.keyState[69];
  const isMovingKey =
    !!stateVariables.keyState[87] ||
    !!stateVariables.keyState[65] ||
    !!stateVariables.keyState[83] ||
    !!stateVariables.keyState[68];
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
