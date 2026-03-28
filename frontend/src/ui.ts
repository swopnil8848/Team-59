import { stateVariables } from "./stateVariables";

export class Ui {
  private updateTypewriterText(fullText: string, npcIndex: number) {
    const now = Date.now();
    const hasNpcChanged = stateVariables.dialogueLastNpcIndex !== npcIndex;
    const hasTextChanged = stateVariables.dialogueTargetText !== fullText;

    if (hasNpcChanged || hasTextChanged) {
      stateVariables.dialogueLastNpcIndex = npcIndex;
      stateVariables.dialogueTargetText = fullText;
      stateVariables.dialogueVisibleText = "";
      stateVariables.dialogueLastStepMs = now;
      stateVariables.dialogueOptionsRevealAtMs = 0;
      stateVariables.dialogueHoveredOptionIndex = -1;
      stateVariables.dialogueSelectedOptionIndex = -1;
      stateVariables.dialogueSelectionStartedMs = 0;
      stateVariables.dialogueSelectionNpcIndex = -1;
    }

    if (stateVariables.dialogueVisibleText.length >= fullText.length) {
      return stateVariables.dialogueVisibleText;
    }

    if (now - stateVariables.dialogueLastStepMs >= 20) {
      const nextLength = Math.min(
        stateVariables.dialogueVisibleText.length + 1,
        fullText.length
      );
      stateVariables.dialogueVisibleText = fullText.slice(0, nextLength);
      stateVariables.dialogueLastStepMs = now;
    }

    return stateVariables.dialogueVisibleText;
  }

  private easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  private drawAnimatedTick(
    x: number,
    y: number,
    progress: number,
    ctx: CanvasRenderingContext2D = stateVariables.ctx
  ) {
    const eased = this.easeOutCubic(Math.max(0, Math.min(1, progress)));
    const size = 12 * (0.6 + 0.4 * eased);
    const alpha = 0.2 + 0.8 * eased;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(size / 12, size / 12);

    ctx.fillStyle = "rgba(139, 211, 255, 0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(139, 211, 255, 0.95)";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-4.6, 0.4);
    ctx.lineTo(-1.3, 3.8);
    ctx.lineTo(5.6, -3.8);
    ctx.stroke();

    ctx.restore();
  }

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

  renderNpcHint(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    if (stateVariables.activeNpcIndex === -1) return;

    const now = Date.now();
    const npc = stateVariables.npcs[stateVariables.activeNpcIndex];
    const isThanking =
      !!npc &&
      stateVariables.dialogueThankYouNpcIndex === stateVariables.activeNpcIndex &&
      stateVariables.dialogueThankYouStartedMs > 0;

    if (isThanking) {
      const elapsed = now - stateVariables.dialogueThankYouStartedMs;
      const durationMs = 1300;
      if (elapsed >= durationMs) {
        stateVariables.dialogueThankYouNpcIndex = -1;
        stateVariables.dialogueThankYouStartedMs = 0;
        stateVariables.dialogueThankYouOptionIndex = -1;
        return;
      }

      const t = Math.max(0, Math.min(1, elapsed / durationMs));
      const eased = this.easeOutCubic(t);
      const alpha = 1 - t;

      const centerX = npc.startPoint.x + npc.w / 2;
      const baseY = npc.startPoint.y - 14;
      const slideDownY = 20 * eased;
      const bubbleY = baseY + slideDownY;

      const text = "Thank you!";
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "600 17px Outfit";
      const bubbleH = 34;
      const bubbleTopY = bubbleY - bubbleH;

      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.textAlign = "center";
      ctx.fillText(text, centerX, bubbleTopY + 22);

      const pulseAlpha = Math.max(0, 0.32 - 0.32 * t);
      ctx.globalAlpha = pulseAlpha;
      ctx.strokeStyle = "rgba(139, 211, 255, 0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, bubbleTopY + bubbleH / 2, 14 + 22 * eased, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return;
    }

    ctx.save();
    ctx.font = "18px Outfit";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(
      "Press closer to talk...",
      stateVariables.windowWidth / 2,
      stateVariables.windowHeight - 228
    );
    ctx.restore();
  }

  renderDialogue(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const now = Date.now();
    const desiredNpcIndex = stateVariables.activeNpcIndex;

    if (
      stateVariables.dialogueSuppressedNpcIndex !== -1 &&
      desiredNpcIndex !== -1 &&
      stateVariables.dialogueSuppressedNpcIndex !== desiredNpcIndex
    ) {
      stateVariables.dialogueSuppressedNpcIndex = -1;
    }

    if (
      stateVariables.dialogueThankYouPendingNpcIndex !== -1 &&
      desiredNpcIndex !== -1 &&
      stateVariables.dialogueThankYouPendingNpcIndex !== desiredNpcIndex
    ) {
      stateVariables.dialogueThankYouPendingNpcIndex = -1;
      stateVariables.dialogueThankYouPendingOptionIndex = -1;
      stateVariables.dialogueForceCloseNpcIndex = -1;
    }

    const shouldShowDialogue =
      desiredNpcIndex !== -1 &&
      desiredNpcIndex !== stateVariables.dialogueSuppressedNpcIndex;

    if (shouldShowDialogue) {
      stateVariables.dialoguePanelNpcIndex = desiredNpcIndex;
      stateVariables.dialoguePanelTarget = 1;
    } else {
      stateVariables.dialoguePanelTarget = 0;
    }

    if (
      stateVariables.dialogueForceCloseNpcIndex !== -1 &&
      desiredNpcIndex !== -1 &&
      stateVariables.dialogueForceCloseNpcIndex === desiredNpcIndex
    ) {
      stateVariables.dialoguePanelTarget = 0;
    }

    if (
      desiredNpcIndex !== -1 &&
      stateVariables.dialoguePanelNpcIndex !== -1 &&
      desiredNpcIndex !== stateVariables.dialoguePanelNpcIndex
    ) {
      stateVariables.dialoguePanelNpcIndex = desiredNpcIndex;
    }

    if (stateVariables.dialoguePanelLastMs === 0) {
      stateVariables.dialoguePanelLastMs = now;
    }

    const dt = Math.min(50, Math.max(0, now - stateVariables.dialoguePanelLastMs));
    const openSpeedMs = 240;
    const closeSpeedMs = 200;
    if (stateVariables.dialoguePanelTarget === 1) {
      stateVariables.dialoguePanelAnim = Math.min(
        1,
        stateVariables.dialoguePanelAnim + dt / openSpeedMs
      );
    } else {
      stateVariables.dialoguePanelAnim = Math.max(
        0,
        stateVariables.dialoguePanelAnim - dt / closeSpeedMs
      );
    }
    stateVariables.dialoguePanelLastMs = now;

    if (stateVariables.dialoguePanelAnim <= 0.001) {
      stateVariables.dialoguePanelAnim = 0;
      let dismissedNpcIndex = -1;
      if (stateVariables.dialogueDismissNpcIndex !== -1) {
        dismissedNpcIndex = stateVariables.dialogueDismissNpcIndex;
        stateVariables.dialogueSuppressedNpcIndex = dismissedNpcIndex;
        stateVariables.dialogueDismissNpcIndex = -1;
        if (stateVariables.dialogueForceCloseNpcIndex === dismissedNpcIndex) {
          stateVariables.dialogueForceCloseNpcIndex = -1;
        }

        if (stateVariables.dialogueThankYouPendingNpcIndex === dismissedNpcIndex) {
          stateVariables.dialogueThankYouNpcIndex = dismissedNpcIndex;
          stateVariables.dialogueThankYouStartedMs = now;
          stateVariables.dialogueThankYouOptionIndex =
            stateVariables.dialogueThankYouPendingOptionIndex;
          stateVariables.dialogueThankYouPendingNpcIndex = -1;
          stateVariables.dialogueThankYouPendingOptionIndex = -1;
        }
      }

      const shouldShowNow =
        desiredNpcIndex !== -1 &&
        desiredNpcIndex !== stateVariables.dialogueSuppressedNpcIndex;

      if (!shouldShowNow) {
        stateVariables.dialoguePanelNpcIndex = -1;
        stateVariables.dialogueLastNpcIndex = -1;
        stateVariables.dialogueTargetText = "";
        stateVariables.dialogueVisibleText = "";
        stateVariables.dialogueOptionsRevealAtMs = 0;
        stateVariables.dialogueHoveredOptionIndex = -1;
        stateVariables.dialogueSelectedOptionIndex = -1;
        stateVariables.dialogueSelectionStartedMs = 0;
        stateVariables.dialogueSelectionNpcIndex = -1;
        return;
      }
    }

    const shownNpcIndex =
      stateVariables.dialoguePanelNpcIndex !== -1
        ? stateVariables.dialoguePanelNpcIndex
        : desiredNpcIndex;
    const npc = shownNpcIndex !== -1 ? stateVariables.npcs[shownNpcIndex] : undefined;
    if (!npc) return;

    const fullScenario = npc.dialogue.scenario;
    const typedScenario = this.updateTypewriterText(fullScenario, shownNpcIndex);

    const panelWidth = Math.min(stateVariables.windowWidth - 48, 760);
    const panelHeight = 238;
    const panelX = (stateVariables.windowWidth - panelWidth) / 2;
    const panelY = stateVariables.windowHeight - panelHeight - 28;
    const portraitBoxWidth = 118;
    const textStartX = panelX + portraitBoxWidth + 28;
    const textWidth = panelWidth - portraitBoxWidth - 46;
    const slideOffsetY = (1 - this.easeOutCubic(stateVariables.dialoguePanelAnim)) * (panelHeight + 36);
    const mouseX = stateVariables.mouseX;
    const mouseY = stateVariables.mouseY - slideOffsetY;
    const clickXRaw = stateVariables.mouseClickX;
    const clickYRaw = stateVariables.mouseClickY - slideOffsetY;
    ctx.save();
    ctx.translate(0, slideOffsetY);
    ctx.fillStyle = "rgba(14, 18, 24, 0.95)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(panelX + 16, panelY + 16, portraitBoxWidth - 20, 116);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(npc.sprite, panelX + 24, panelY + 18, 82, 108);
    ctx.restore();

    ctx.fillStyle = "#8bd3ff";
    ctx.fillRect(panelX + 18, panelY - 18, 164, 32);
    ctx.fillStyle = "#09131a";
    ctx.font = "bold 18px Outfit";
    ctx.textAlign = "center";
    ctx.fillText(npc.dialogue.name, panelX + 100, panelY + 4);

    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.font = "16px Outfit";
    const scenarioEndY = this.drawWrappedText(
      typedScenario,
      textStartX,
      panelY + 38,
      textWidth,
      24,
      ctx
    );

    const typingComplete = typedScenario.length >= fullScenario.length;
    if (typingComplete && stateVariables.dialogueOptionsRevealAtMs === 0) {
      stateVariables.dialogueOptionsRevealAtMs = now + 160;
    }

    const canShowOptions =
      typingComplete && now >= stateVariables.dialogueOptionsRevealAtMs;

    if (!canShowOptions) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "13px Outfit";
      ctx.fillText("...", textStartX, Math.min(panelY + panelHeight - 10, scenarioEndY + 6));
    } else {
      const optionHeight = 30;
      const optionPadding = 8;
      const optionsStartY = Math.max(panelY + 90, scenarioEndY + 60);
      const optionX = textStartX;
      const optionWidth = panelX + panelWidth - 18 - optionX;

      stateVariables.dialogueHoveredOptionIndex = -1;
      const isClickPending = stateVariables.mouseClicked;
      const clickX = clickXRaw;
      const clickY = clickYRaw;

      ctx.font = "14px Outfit";
      npc.dialogue.options.forEach((option, index) => {
        const optionY = optionsStartY + index * (optionHeight + optionPadding);
        const rectX = optionX;
        const rectY = optionY - optionHeight + 6;

        const isHovered =
          mouseX >= rectX &&
          mouseX <= rectX + optionWidth &&
          mouseY >= rectY &&
          mouseY <= rectY + optionHeight;

        if (isHovered) stateVariables.dialogueHoveredOptionIndex = index;

        const isSelected =
          stateVariables.dialogueSelectionNpcIndex === shownNpcIndex &&
          stateVariables.dialogueSelectedOptionIndex === index;

        ctx.fillStyle = isHovered
          ? "rgba(139, 211, 255, 0.18)"
          : "rgba(139, 211, 255, 0.10)";
        ctx.fillRect(rectX, rectY, optionWidth, optionHeight);

        ctx.strokeStyle = isSelected
          ? "rgba(139, 211, 255, 0.65)"
          : "rgba(139, 211, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.strokeRect(rectX, rectY, optionWidth, optionHeight);

        ctx.fillStyle = "rgba(255,255,255,0.92)";
        this.drawWrappedText(
          `${index + 1}. ${option}`,
          rectX + 12,
          optionY,
          optionWidth - 44,
          18,
          ctx
        );

        if (isSelected) {
          const progress = Math.min(1, (now - stateVariables.dialogueSelectionStartedMs) / 220);
          this.drawAnimatedTick(rectX + optionWidth - 20, rectY + optionHeight / 2, progress, ctx);
        }
      });

      if (isClickPending) {
        const clickedIndex = npc.dialogue.options.findIndex((_, index) => {
          const optionY = optionsStartY + index * (optionHeight + optionPadding);
          const rectX = optionX;
          const rectY = optionY - optionHeight + 6;
          return (
            clickX >= rectX &&
            clickX <= rectX + optionWidth &&
            clickY >= rectY &&
            clickY <= rectY + optionHeight
          );
        });

        if (clickedIndex !== -1) {
          stateVariables.dialogueSelectedOptionIndex = clickedIndex;
          stateVariables.dialogueSelectionStartedMs = now;
          stateVariables.dialogueSelectionNpcIndex = shownNpcIndex;
          stateVariables.dialogueThankYouPendingNpcIndex = shownNpcIndex;
          stateVariables.dialogueThankYouPendingOptionIndex = clickedIndex;
          stateVariables.dialogueDismissNpcIndex = shownNpcIndex;
          stateVariables.dialogueForceCloseNpcIndex = shownNpcIndex;
          stateVariables.dialoguePanelTarget = 0;
        }

        stateVariables.mouseClicked = false;
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "12px Outfit";
    ctx.textAlign = "right";
    ctx.fillText("Nearby conversation", panelX + panelWidth - 18, panelY + panelHeight - 16);
    ctx.restore();
  }

  drawWrappedText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    ctx: CanvasRenderingContext2D = stateVariables.ctx
  ) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    words.forEach((word) => {
      const testLine = `${line}${word} `;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, currentY);
        line = `${word} `;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    });

    if (line) {
      ctx.fillText(line.trim(), x, currentY);
    }

    return currentY;
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
