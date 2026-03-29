import { GameApi } from "./api/game";
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
      stateVariables.dialogueScrollY = 0;
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

  private drawThematicText(
    label: string,
    val: string,
    x: number,
    y: number,
    align: CanvasTextAlign,
    ctx: CanvasRenderingContext2D = stateVariables.ctx
  ) {
    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = "top";

    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fillText(label, x, y);

    ctx.font = '16px "Press Start 2P", monospace';

    const grad = ctx.createLinearGradient(0, y, 0, y + 26);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(1, "#cce6ff");
    ctx.fillStyle = grad;

    if (align === "right") {
      ctx.fillText(val, x, y + 16);
    } else if (align === "center") {
      ctx.fillText(val, x, y + 16);
    } else {
      ctx.fillText(val, x, y + 16);
    }

    ctx.restore();
  }

  renderScore(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const xPos = stateVariables.windowWidth - 32;
    this.drawThematicText("SCORE", stateVariables.player.score.toString(), xPos, 16, "right", ctx);
  }

  renderStamina(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const ICON_SIZE = 28;
    const BAR_X = 16 + ICON_SIZE + 8;
    const BAR_Y = 14;
    const BAR_H = 16;
    const BAR_W = 210;
    const BAR_CY = BAR_Y + BAR_H / 2;
    const RADIUS = BAR_H / 2;

    const stamina = stateVariables.player.stamina;
    const fillW = (stamina / stateVariables.player.staminaMax) * BAR_W;
    const segments = 5;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(
      stateVariables.staminaImage,
      12,
      BAR_CY - ICON_SIZE / 2,
      ICON_SIZE,
      ICON_SIZE
    );
    ctx.restore();

    ctx.fillStyle = "rgba(12, 14, 18, 0.82)";
    ctx.beginPath();
    ctx.moveTo(BAR_X + RADIUS, BAR_Y);
    ctx.lineTo(BAR_X + BAR_W - RADIUS, BAR_Y);
    ctx.arc(BAR_X + BAR_W - RADIUS, BAR_CY, RADIUS, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(BAR_X + RADIUS, BAR_Y + BAR_H);
    ctx.arc(BAR_X + RADIUS, BAR_CY, RADIUS, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < segments; i++) {
      const x = BAR_X + (BAR_W / segments) * i;
      ctx.beginPath();
      ctx.moveTo(x, BAR_Y + 3);
      ctx.lineTo(x, BAR_Y + BAR_H - 3);
      ctx.stroke();
    }

    const grad = ctx.createLinearGradient(0, BAR_Y, 0, BAR_Y + BAR_H);
    grad.addColorStop(0, "#FFC822");
    grad.addColorStop(0.55, "#FFC822");
    grad.addColorStop(1, "#F26A21");
    ctx.fillStyle = grad;
    if (fillW > 0) {
      const fillRadius = Math.min(RADIUS, fillW / 2);
      ctx.beginPath();
      ctx.moveTo(BAR_X + fillRadius, BAR_Y);
      ctx.lineTo(BAR_X + fillW - fillRadius, BAR_Y);
      ctx.arc(
        BAR_X + fillW - fillRadius,
        BAR_CY,
        fillRadius,
        -Math.PI / 2,
        Math.PI / 2
      );
      ctx.lineTo(BAR_X + fillRadius, BAR_Y + BAR_H);
      ctx.arc(
        BAR_X + fillRadius,
        BAR_CY,
        fillRadius,
        Math.PI / 2,
        (Math.PI * 3) / 2
      );
      ctx.closePath();
      ctx.fill();

      const highlightH = Math.max(2, Math.floor(BAR_H * 0.35));
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(BAR_X + 2, BAR_Y + 2, Math.max(0, fillW - 4), highlightH);

      const shadeH = Math.max(2, Math.floor(BAR_H * 0.25));
      ctx.fillStyle = "rgba(242, 106, 33, 0.45)";
      ctx.fillRect(
        BAR_X + 2,
        BAR_Y + BAR_H - shadeH - 1,
        Math.max(0, fillW - 4),
        shadeH
      );

      ctx.save();
      ctx.beginPath();
      ctx.rect(BAR_X, BAR_Y, fillW, BAR_H);
      ctx.clip();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 1;
      for (let i = 1; i < segments; i++) {
        const x = BAR_X + (BAR_W / segments) * i;
        ctx.beginPath();
        ctx.moveTo(x, BAR_Y + 3);
        ctx.lineTo(x, BAR_Y + BAR_H - 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BAR_X + RADIUS, BAR_Y);
    ctx.lineTo(BAR_X + BAR_W - RADIUS, BAR_Y);
    ctx.arc(BAR_X + BAR_W - RADIUS, BAR_CY, RADIUS, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(BAR_X + RADIUS, BAR_Y + BAR_H);
    ctx.arc(BAR_X + RADIUS, BAR_CY, RADIUS, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
    ctx.stroke();
  }

  renderTimer(secondsLeft: number, ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const centerX = stateVariables.windowWidth / 2;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
    this.drawThematicText("TIME", timeStr, centerX, 16, "center", ctx);
  }

  renderNpcHint(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const now = Date.now();

    // 1. Handle "Thank you" feedback bubble if active
    if (stateVariables.dialogueThankYouNpcIndex !== -1 && stateVariables.dialogueThankYouStartedMs > 0) {
      const thankNpc = stateVariables.npcs[stateVariables.dialogueThankYouNpcIndex];
      if (thankNpc) {
        const elapsed = now - stateVariables.dialogueThankYouStartedMs;
        const durationMs = 1300;
        if (elapsed >= 0) {
          if (elapsed >= durationMs) {
            stateVariables.dialogueThankYouNpcIndex = -1;
            stateVariables.dialogueThankYouStartedMs = 0;
            stateVariables.dialogueThankYouOptionIndex = -1;
            stateVariables.dialogueThankYouText = "";
          } else {
            const t = Math.max(0, Math.min(1, elapsed / durationMs));
            const eased = this.easeOutCubic(t);
            const alpha = 1 - t;

            const centerX = thankNpc.startPoint.x + thankNpc.currentWidth / 2;
            const baseY = thankNpc.startPoint.y - 14;
            const slideDownY = 20 * eased;
            const bubbleY = baseY + slideDownY;

            const text = stateVariables.dialogueThankYouText || "Thank you!";
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = '20px vtfont, "Courier New", monospace';

            const maxBubbleW = 280;
            const padX = 14;
            const padY = 10;
            const lineH = 18;

            const words = text.split(/\s+/).filter(Boolean);
            const lines: string[] = [];
            let lineStr = "";
            for (const word of words) {
              const test = lineStr ? `${lineStr} ${word}` : word;
              if (ctx.measureText(test).width > maxBubbleW - padX * 2 && lineStr) {
                lines.push(lineStr);
                lineStr = word;
              } else {
                lineStr = test;
              }
            }
            if (lineStr) lines.push(lineStr);

            const lineWidths = lines.map((l) => ctx.measureText(l).width);
            const contentW = Math.min(
              maxBubbleW - padX * 2,
              Math.max(0, ...lineWidths)
            );
            const bubbleW = Math.max(120, Math.ceil(contentW + padX * 2));
            const bubbleH = Math.max(34, Math.ceil(lines.length * lineH + padY * 2));

            const bubbleTopY = bubbleY - bubbleH;
            const bubbleX = centerX - bubbleW / 2;
            const r = 10;

            // Bubble background
            ctx.fillStyle = "rgba(255,255,255,0.96)";
            ctx.beginPath();
            ctx.moveTo(bubbleX + r, bubbleTopY);
            ctx.lineTo(bubbleX + bubbleW - r, bubbleTopY);
            ctx.arcTo(bubbleX + bubbleW, bubbleTopY, bubbleX + bubbleW, bubbleTopY + r, r);
            ctx.lineTo(bubbleX + bubbleW, bubbleTopY + bubbleH - r);
            ctx.arcTo(
              bubbleX + bubbleW,
              bubbleTopY + bubbleH,
              bubbleX + bubbleW - r,
              bubbleTopY + bubbleH,
              r
            );
            ctx.lineTo(bubbleX + r, bubbleTopY + bubbleH);
            ctx.arcTo(bubbleX, bubbleTopY + bubbleH, bubbleX, bubbleTopY + bubbleH - r, r);
            ctx.lineTo(bubbleX, bubbleTopY + r);
            ctx.arcTo(bubbleX, bubbleTopY, bubbleX + r, bubbleTopY, r);
            ctx.closePath();
            ctx.fill();

            // Text
            ctx.fillStyle = "#09131a";
            ctx.textAlign = "center";
            const textCenterY = bubbleTopY + bubbleH / 2 - ((lines.length - 1) * lineH) / 2;
            lines.forEach((l, i) => {
              ctx.fillText(l, centerX, textCenterY + i * lineH + 5);
            });

            const pulseAlpha = Math.max(0, 0.32 - 0.32 * t);
            ctx.globalAlpha = pulseAlpha;
            ctx.strokeStyle = "rgba(139, 211, 255, 0.75)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, bubbleTopY + bubbleH / 2, 14 + 22 * eased, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
            return; // Don't show "talk" hint while bubble is active
          }
        }
      }
    }

    // handle "Press closer to talk" hint
    if (stateVariables.activeNpcIndex !== -1) {
      const npc = stateVariables.npcs[stateVariables.activeNpcIndex];
      // Only show hint if player is near but NOT yet "at" the interaction threshold
      if (npc && !npc.isPlayerAt()) {
        ctx.save();
        ctx.font = '22px vtfont, "Courier New", monospace';
        ctx.textAlign = "center";

        // Text Shadow for readability
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillText(
          "Press closer to talk...",
          stateVariables.windowWidth / 2 + 1,
          stateVariables.windowHeight - 228 + 1
        );

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText(
          "Press closer to talk...",
          stateVariables.windowWidth / 2,
          stateVariables.windowHeight - 228
        );
        ctx.restore();
      }
    }
  }


  renderDialogue(ctx: CanvasRenderingContext2D = stateVariables.ctx) {
    const now = Date.now();
    
    // Only show dialogue if the active NPC is within the interaction threshold
    const activeNpc = stateVariables.activeNpcIndex !== -1 ? stateVariables.npcs[stateVariables.activeNpcIndex] : null;
    const isAtNpc = activeNpc && activeNpc.isPlayerAt();
    const desiredNpcIndex = isAtNpc ? stateVariables.activeNpcIndex : -1;

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
      stateVariables.dialogueThankYouPendingText = "";
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
          stateVariables.dialogueThankYouText = stateVariables.dialogueThankYouPendingText || "";
          stateVariables.dialogueThankYouPendingNpcIndex = -1;
          stateVariables.dialogueThankYouPendingOptionIndex = -1;
          stateVariables.dialogueThankYouPendingText = "";
        }
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
      stateVariables.dialoguePanelRect.visible = false;
      return;
    }

    const shownNpcIndex =
      stateVariables.dialoguePanelNpcIndex !== -1
        ? stateVariables.dialoguePanelNpcIndex
        : desiredNpcIndex;
    const npc = shownNpcIndex !== -1 ? stateVariables.npcs[shownNpcIndex] : undefined;
    if (!npc) {
      stateVariables.dialoguePanelRect.visible = false;
      return;
    }

    const fullScenario = npc.dialogue.scenario;
    const typedScenario = this.updateTypewriterText(fullScenario, shownNpcIndex);

    const panelWidth = Math.min(stateVariables.windowWidth - 32, 900);
    const panelHeight = 300;
    const panelX = (stateVariables.windowWidth - panelWidth) / 2;
    const panelY = stateVariables.windowHeight - panelHeight - 32;
    const portraitBoxWidth = 140;
    const textStartX = panelX + portraitBoxWidth + 20;
    const textWidth = panelWidth - portraitBoxWidth - 40;
    const slideOffsetY =
      (1 - this.easeOutCubic(stateVariables.dialoguePanelAnim)) *
      (panelHeight + 40);
    const mouseX = stateVariables.mouseX;
    const mouseY = stateVariables.mouseY - slideOffsetY;
    const clickXRaw = stateVariables.mouseClickX;
    const clickYRaw = stateVariables.mouseClickY - slideOffsetY;
    ctx.save();
    ctx.translate(0, slideOffsetY);

    // Main Retro Panel
    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(panelX + 6, panelY + 6, panelWidth, panelHeight);

    // Deep Dark Background
    ctx.fillStyle = "#0c0e12";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Multilayered Retro Border
    // Outer highlight border
    ctx.strokeStyle = "#4a5a6a";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1);

    // Inner thicker frame
    ctx.strokeStyle = "#2a3a4a";
    ctx.lineWidth = 4;
    ctx.strokeRect(panelX + 4, panelY + 4, panelWidth - 8, panelHeight - 8);

    // Inner bright bezel
    ctx.strokeStyle = "rgba(139, 211, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 8.5, panelY + 8.5, panelWidth - 17, panelHeight - 17);

    // Corner Accents (L-shapes)
    ctx.strokeStyle = "#8bd3ff";
    ctx.lineWidth = 2;
    const cs = 14; // corner size
    const co = 8; // corner offset

    // Top-left
    ctx.beginPath();
    ctx.moveTo(panelX + co + cs, panelY + co);
    ctx.lineTo(panelX + co, panelY + co);
    ctx.lineTo(panelX + co, panelY + co + cs);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(panelX + panelWidth - co - cs, panelY + co);
    ctx.lineTo(panelX + panelWidth - co, panelY + co);
    ctx.lineTo(panelX + panelWidth - co, panelY + co + cs);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(panelX + co + cs, panelY + panelHeight - co);
    ctx.lineTo(panelX + co, panelY + panelHeight - co);
    ctx.lineTo(panelX + co, panelY + panelHeight - co - cs);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(panelX + panelWidth - co - cs, panelY + panelHeight - co);
    ctx.lineTo(panelX + panelWidth - co, panelY + panelHeight - co);
    ctx.lineTo(panelX + panelWidth - co, panelY + panelHeight - co - cs);
    ctx.stroke();

    stateVariables.dialoguePanelRect = {
      x: panelX,
      y: panelY + slideOffsetY,
      width: panelWidth,
      height: panelHeight,
      visible: stateVariables.dialoguePanelAnim > 0,
    };

    // Portrait Frame
    const portX = panelX + 22;
    const portY = panelY + 22;
    const portW = 100;
    const portH = 126;

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(portX, portY, portW, portH);
    ctx.strokeStyle = "rgba(139, 211, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(portX + 1, portY + 1, portW - 2, portH - 2);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Center portrait in frame
    const imgObj = npc.sprites[0];
    const targetImgW = 86;
    const targetImgH = 112;
    ctx.drawImage(
      imgObj,
      portX + (portW - targetImgW) / 2,
      portY + (portH - targetImgH) / 2,
      targetImgW,
      targetImgH
    );
    ctx.restore();

    // Name Plate (Floating Retro Style)
    const nameX = panelX + 20;
    const nameY = panelY - 14;
    const nameW = 200;
    const nameH = 36;

    // Plate Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(nameX + 4, nameY + 4, nameW, nameH);

    // Plate Box
    ctx.fillStyle = "#1a3a5a";
    ctx.fillRect(nameX, nameY, nameW, nameH);
    ctx.strokeStyle = "#8bd3ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(nameX + 1, nameY + 1, nameW - 2, nameH - 2);

    ctx.fillStyle = "#fff";
    ctx.font = '22px vtfont, "Courier New", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(npc.dialogue.name.toUpperCase(), nameX + nameW / 2, nameY + nameH / 2 + 2);

    // Calculate Content Height
    const scenarioHeight = this.measureWrappedText(fullScenario, textWidth, 28, ctx);
    const optionsGap = 20;
    const optionH = 36;
    const optionP = 10;
    const typingComplete = typedScenario.length >= fullScenario.length;
    const canShowOptions = typingComplete && now >= stateVariables.dialogueOptionsRevealAtMs;
    const totalOptionsHeight = canShowOptions ? npc.dialogue.options.length * (optionH + optionP) : 0;
    const totalContentHeight = scenarioHeight + (canShowOptions ? optionsGap + totalOptionsHeight : 40) + 10;
    const clipH = panelHeight - 48;
    const clipY = panelY + 24;

    // Bounds for scrolling
    const maxScroll = Math.max(0, totalContentHeight - clipH);
    stateVariables.dialogueScrollY = Math.max(0, Math.min(maxScroll, stateVariables.dialogueScrollY));

    ctx.save();
    // Use a Clip path for the text area
    ctx.beginPath();
    ctx.rect(textStartX - 5, clipY, textWidth + 10, clipH);
    ctx.clip();

    ctx.translate(0, -stateVariables.dialogueScrollY);

    // Dialogue Text
    ctx.fillStyle = "#e8eff5";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = '20px vtfont, "Courier New", monospace';
    const scenarioEndY = this.drawWrappedText(
      typedScenario,
      textStartX,
      panelY + 36,
      textWidth,
      28, // Increased line height for clarity
      ctx
    );

    if (typingComplete && stateVariables.dialogueOptionsRevealAtMs === 0) {
      stateVariables.dialogueOptionsRevealAtMs = now + 160;
    }

    if (!canShowOptions) {
      if (Math.floor(now / 500) % 2 === 0) {
        ctx.fillStyle = "#8bd3ff";
        ctx.font = '18px vtfont';
        // Simplified cursor position for robustness while typing
        ctx.fillText("_", textStartX, scenarioEndY + 28);
      }
    } else {
      const optionsStartY = Math.max(panelY + 95, scenarioEndY + 35);
      const optionX = textStartX;
      const optionWidth = panelWidth - portraitBoxWidth - 50; // Narrower to fit scrollbar

      stateVariables.dialogueHoveredOptionIndex = -1;
      const isClickPending = stateVariables.mouseClicked;
      const clickX = clickXRaw;
      const clickY = clickYRaw + stateVariables.dialogueScrollY; // Offset click by scroll

      ctx.font = '19px vtfont, "Courier New", monospace';
      npc.dialogue.options.forEach((option, index) => {
        const optionY = optionsStartY + index * (optionH + optionP);
        const rectX = optionX;
        const rectY = optionY;

        const isHovered =
          mouseX >= rectX &&
          mouseX <= rectX + optionWidth &&
          (mouseY + stateVariables.dialogueScrollY) >= rectY &&
          (mouseY + stateVariables.dialogueScrollY) <= rectY + optionH;

        if (isHovered) stateVariables.dialogueHoveredOptionIndex = index;

        const isSelected =
          stateVariables.dialogueSelectionNpcIndex === shownNpcIndex &&
          stateVariables.dialogueSelectedOptionIndex === index;

        // Option Background
        if (isHovered) {
          ctx.fillStyle = "rgba(139, 211, 255, 0.15)";
          ctx.fillRect(rectX, rectY, optionWidth, optionH);
          ctx.strokeStyle = "rgba(139, 211, 255, 0.5)";
          ctx.lineWidth = 1;
          ctx.strokeRect(rectX + 0.5, rectY + 0.5, optionWidth - 1, optionH - 1);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
          ctx.fillRect(rectX, rectY, optionWidth, optionH);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 1;
          ctx.strokeRect(rectX + 0.5, rectY + 0.5, optionWidth - 1, optionH - 1);
        }

        if (isSelected) {
          ctx.strokeStyle = "#8bd3ff";
          ctx.lineWidth = 2;
          ctx.strokeRect(rectX + 1, rectY + 1, optionWidth - 2, optionH - 2);
        }

        // Option Text
        ctx.fillStyle = isHovered ? "#fff" : "rgba(255, 255, 255, 0.85)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const arrow = isHovered ? "> " : "  ";
        ctx.fillText(
          `${arrow}${index + 1}. ${option}`,
          rectX + 16,
          rectY + optionH / 2 + 2
        );

        if (isSelected) {
          const progress = Math.min(1, (now - stateVariables.dialogueSelectionStartedMs) / 220);
          this.drawAnimatedTick(rectX + optionWidth - 24, rectY + optionH / 2, progress, ctx);
        }
      });

      if (isClickPending) {
        const clickedIndex = npc.dialogue.options.findIndex((_, index) => {
          const optionY = optionsStartY + index * (optionH + optionP);
          const rectX = optionX;
          const rectY = optionY;
          return (
            clickX >= rectX &&
            clickX <= rectX + optionWidth &&
            clickY >= rectY &&
            clickY <= rectY + optionH
          );
        });

        if (clickedIndex !== -1) {
          const chosenText = npc.dialogue.options[clickedIndex] ?? "";
          const questionId = npc.dialogue.questionId;
          const answerId = npc.dialogue.answerIds?.[clickedIndex];
          const responseTimeMs = Math.max(0, now - stateVariables.dialogueOptionsRevealAtMs);

          if (stateVariables.currentSessionId && questionId && answerId) {
            GameApi.answerQuestion(
              stateVariables.currentSessionId,
              questionId,
              answerId,
              responseTimeMs
            )
              .then((resp: any) => {
                const feedback = resp?.data?.selectedAnswer?.feedback;
                if (typeof feedback === "string" && feedback.trim().length > 0) {
                  if (stateVariables.dialogueThankYouPendingNpcIndex === shownNpcIndex) {
                    stateVariables.dialogueThankYouPendingText = feedback.trim();
                  }
                  if (stateVariables.dialogueThankYouNpcIndex === shownNpcIndex) {
                    stateVariables.dialogueThankYouText = feedback.trim();
                  }
                }
              })
              .catch((err) => console.error("Failed to report answer:", err));
          }
          stateVariables.interactions.push({
            npcName: npc.dialogue.name,
            optionIndex: clickedIndex,
            optionText: chosenText,
            timeMs: now,
          });
          stateVariables.player.score += 1;

          stateVariables.dialogueSelectedOptionIndex = clickedIndex;
          stateVariables.dialogueSelectionStartedMs = now;
          stateVariables.dialogueSelectionNpcIndex = shownNpcIndex;
          stateVariables.dialogueThankYouPendingNpcIndex = shownNpcIndex;
          stateVariables.dialogueThankYouPendingOptionIndex = clickedIndex;
          stateVariables.dialogueThankYouPendingText =
            npc.dialogue.optionFeedbacks?.[clickedIndex] ?? "Thanks for sharing.";
          stateVariables.dialogueDismissNpcIndex = shownNpcIndex;
          stateVariables.dialogueForceCloseNpcIndex = shownNpcIndex;
          stateVariables.dialoguePanelTarget = 0;
        }

        stateVariables.mouseClicked = false;
      }
    }
    ctx.restore();

    // Scrollbar (Retro themed)
    if (totalContentHeight > clipH) {
      const sbW = 6;
      const sbX = panelX + panelWidth - 20;
      const sbY = clipY;
      const sbH = clipH;

      // Track
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fillRect(sbX, sbY, sbW, sbH);

      // Thumb
      const thumbH = Math.max(30, (clipH / totalContentHeight) * clipH);
      const thumbY = sbY + (stateVariables.dialogueScrollY / maxScroll) * (sbH - thumbH);

      ctx.fillStyle = "#4a5a6a";
      ctx.fillRect(sbX, thumbY, sbW, thumbH);
      ctx.fillStyle = "#8bd3ff";
      ctx.fillRect(sbX + 1, thumbY + 1, sbW - 2, thumbH - 2);
    }

    ctx.fillStyle = "rgba(139, 211, 255, 0.4)";
    ctx.font = '14px vtfont';
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("NEARBY CONVERSATION", panelX + panelWidth - 20, panelY + panelHeight - 16);
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
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, stateVariables.windowWidth, stateVariables.windowHeight);

    // Title Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.font = '48px "Press Start 2P", monospace';
    ctx.fillStyle = "#FFC822"; // Gold retro color
    ctx.textAlign = "center";
    ctx.fillText("TIME'S UP!", stateVariables.windowWidth / 2, stateVariables.windowHeight / 2 - 40);

    ctx.font = '28px vtfont, "Courier New", monospace';
    ctx.fillStyle = "white";
    ctx.fillText(`Final Score: ${stateVariables.player.score}`, stateVariables.windowWidth / 2, stateVariables.windowHeight / 2 + 20);

    ctx.font = '20px vtfont, "Courier New", monospace';
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText("Check your results in the dashboard", stateVariables.windowWidth / 2, stateVariables.windowHeight / 2 + 60);

    ctx.restore();
  }

  measureWrappedText(
    text: string,
    maxWidth: number,
    lineHeight: number,
    ctx: CanvasRenderingContext2D = stateVariables.ctx
  ) {
    const words = text.split(" ");
    let line = "";
    let lines = 1;

    words.forEach((word) => {
      const testLine = `${line}${word} `;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        line = `${word} `;
        lines++;
      } else {
        line = testLine;
      }
    });

    return lines * lineHeight;
  }
}
