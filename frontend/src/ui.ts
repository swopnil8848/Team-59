import { stateVariables } from "./stateVariables";

export class Ui {
  renderScore(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    ctx.font = "28px Outfit";
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    const xPos = stateVariables.windowWidth - 30;
    ctx.fillText(`Score: ${stateVariables.player.score}`, xPos, 40);
  }

  renderTimer(secondsLeft: number, ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    ctx.font = "28px Outfit";
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.fillText(`Time: ${secondsLeft}s`, 30, 40);
  }

  renderGameOver(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, stateVariables.windowWidth, stateVariables.windowHeight);
    ctx.font = "48px Outfit";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("Time's up!", stateVariables.windowWidth / 2, stateVariables.windowHeight / 2 - 20);
    ctx.font = "32px Outfit";
    ctx.fillText(`Final Score: ${stateVariables.player.score}`, stateVariables.windowWidth / 2, stateVariables.windowHeight / 2 + 30);
  }
}
