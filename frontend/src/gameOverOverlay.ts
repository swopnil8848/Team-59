import type { NpcInteraction } from "./stateVariables";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function showGameOverOverlay(params: {
  appRoot: HTMLDivElement;
  canvas: HTMLCanvasElement;
  score: number;
  interactions: NpcInteraction[];
  avatarId?: string;
  onReplay: () => void;
  onDashboard: () => void;
}) {
  const { appRoot, canvas, score, interactions, avatarId, onReplay, onDashboard } = params;


  const highScoreKey = "mindtrail:highScore";
  const storedHigh = Number(window.localStorage.getItem(highScoreKey) ?? "0");
  const highScore = Number.isFinite(storedHigh) ? storedHigh : 0;
  const nextHighScore = Math.max(highScore, score);
  if (nextHighScore !== highScore) {
    window.localStorage.setItem(highScoreKey, String(nextHighScore));
  }

  const lastChoiceByNpc = new Map<string, string>();
  interactions.forEach((interaction) => {
    lastChoiceByNpc.set(interaction.npcName, interaction.optionText);
  });
  const people = Array.from(lastChoiceByNpc.entries()).map(([npcName, optionText]) => ({
    npcName,
    optionText,
  }));

  const safeAvatarId = (avatarId ?? "Ophelia").replace(/[^A-Za-z0-9_-]/g, "");
  const mascotFrames = [1, 2, 3, 4].map(
    (i) =>
      `/assets/character/images/characters/${safeAvatarId}/front/front (${i}).png`
  );

  appRoot.dataset.theme = "gameover";
  appRoot.style.display = "block";
  appRoot.innerHTML = `
    <div class="gameover-overlay gameover-overlay--cute-grid" role="dialog" aria-modal="true" aria-label="Game Over">
      <div class="cute-modal">
        <button class="cute-close" type="button" data-action="go-dashboard" aria-label="Close to Dashboard">×</button>
        <div class="cute-header">
          <div class="cute-title">Game Over!</div>
          <div class="cute-subtitle">We hope you enjoyed the journey.</div>
        </div>

        <div class="cute-hud">
          <div class="cute-stat">
            <span class="cute-stat-label">SCORE</span>
            <span class="cute-stat-value">${score}</span>
          </div>

          <div class="cute-stat">
            <span class="cute-stat-label">PEOPLE</span>
            <span class="cute-stat-value">${people.length}</span>
          </div>
        </div>

        <div class="cute-panels">
          <div class="cute-panel">
            <div class="cute-panel-title">Your Connections</div>
            <div class="cute-list" data-role="go-list"></div>
          </div>
        </div>

        <div class="cute-actions">
          <button class="cute-btn cute-btn--primary" type="button" data-action="go-replay">Play Again</button>
        </div>

        <div class="cute-mascot" aria-hidden="true">
          <img data-role="go-mascot" alt="" src="${mascotFrames[0] ?? ""}" />
        </div>
      </div>
    </div>
  `;

  const listEl = appRoot.querySelector('[data-role="go-list"]') as HTMLDivElement | null;
  if (listEl) {
    if (!people.length) {
      listEl.innerHTML = `<div class="cute-empty">No conversations yet.</div>`;
    } else {
      listEl.innerHTML = people
        .map(({ npcName, optionText }) => {
          const line = optionText ? ` <span class="cute-option-text">— ${escapeHtml(optionText)}</span>` : "";
          return `<div class="cute-item"><span class="cute-dot"></span><strong>${escapeHtml(npcName)}</strong>${line}</div>`;
        })
        .join("");
    }
  }

  let mascotTimer: number | null = null;
  const mascotImg = appRoot.querySelector('[data-role="go-mascot"]') as HTMLImageElement | null;
  if (mascotImg && mascotFrames.length) {
    let idx = 0;
    mascotTimer = window.setInterval(() => {
      idx = (idx + 1) % mascotFrames.length;
      mascotImg.src = mascotFrames[idx]!;
    }, 170);
  }

  const stopMascot = () => {
    if (mascotTimer != null) {
      window.clearInterval(mascotTimer);
      mascotTimer = null;
    }
  };

  appRoot.querySelector('[data-action="go-replay"]')?.addEventListener("click", () => {
    stopMascot();
    appRoot.style.display = "none";
    appRoot.dataset.theme = "";
    canvas.style.display = "block";
    onReplay();
  });

  appRoot.querySelector('[data-action="go-dashboard"]')?.addEventListener("click", () => {
    stopMascot();
    canvas.style.display = "none";
    onDashboard();
  });
}
