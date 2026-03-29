import { Assets } from './../public/assets/index';
import "./style.css";
import "./controls";
import {
  adjustCanvasSize,
  drawChannelledAnimation,
  drawClickIndicator,
  drawCursorImage,
  initializeGame,
  preloadGameAssets,
  preloadImage,
} from "./functions";
import { handleMovementControls, handleOtherControls } from "./controls";
import { GameState, stateVariables } from "./stateVariables";
import { showGameOverOverlay } from "./gameOverOverlay";
import { getAuthToken, setAuthToken, clearAuthToken } from "./api/client";
import { AuthApi } from "./api/auth";
import { UserApi } from "./api/user";
import { GameApi } from "./api/game";
import { ProgressReportsApi } from "./api/progressReports";
import { logoutToLogin } from "./logout";

type AvatarOption = {
  id: string;
  label: string;
  previewSrc: string;
  gender?: "FEMALE" | "MALE" | "OTHER";
};

const USE_DUMMY_PROGRESS_REPORT = false;
const USE_RANDOM_NPC_PROFILE_AVATAR = true;

function assetUrl(path: string) {
  const base = (import.meta as any)?.env?.BASE_URL ?? "/";
  const normalizedBase = typeof base === "string" ? base : "/";
  return `${normalizedBase}${String(path).replace(/^\//, "")}`;
}

function avatarFrontFrameSrc(avatarId: string, frameIndex1Based: number) {
  const suffix = ["Ophelia", "Noah"].includes(avatarId) ? ` (${frameIndex1Based})` : `(${frameIndex1Based})`;
  return assetUrl(
    `/assets/character/images/characters/${avatarId}/front/front${suffix}.png`
  );
}

function avatarDirectionalFrameSrc(
  avatarId: string,
  direction: "front" | "back" | "left" | "right",
  frameIndex1Based: number
) {
  const suffix = ["Ophelia", "Noah"].includes(avatarId) ? ` (${frameIndex1Based})` : `(${frameIndex1Based})`;
  return assetUrl(
    `/assets/character/images/characters/${avatarId}/${direction}/${direction}${suffix}.png`
  );
}

function npcFrontFrameSrc(npcName: string, frameIndex1Based: number) {
  // NPC assets live in /public/assets/npc/**, so they are served from /assets/npc/** at runtime.
  // Encode path segments because NPC folders include spaces.
  return assetUrl(
    `/assets/npc/${encodeURIComponent(npcName)}/front/front(${frameIndex1Based}).png`
  );
}

let avatarAnimTimer: number | null = null;
function stopAvatarAnimation() {
  if (avatarAnimTimer != null) {
    window.clearInterval(avatarAnimTimer);
    avatarAnimTimer = null;
  }
}

function startAvatarAnimation(img: HTMLImageElement, avatarId: string) {
  stopAvatarAnimation();
  const frames = [1, 2, 3, 4].map((i) => avatarFrontFrameSrc(avatarId, i));
  let idx = 0;
  img.src = frames[0] ?? img.src;
  avatarAnimTimer = window.setInterval(() => {
    idx = (idx + 1) % frames.length;
    img.src = frames[idx]!;
  }, 180);
}

const avatars: AvatarOption[] = [
  {
    id: "Ophelia",
    label: "Ophelia",
    previewSrc: avatarFrontFrameSrc("Ophelia", 1),
    gender: "FEMALE",
  },
  {
    id: "Jess",
    label: "Jess",
    previewSrc: avatarFrontFrameSrc("Jess", 1),
    gender: "FEMALE",
  },
  {
    id: "Rizu",
    label: "Rizu",
    previewSrc: avatarFrontFrameSrc("Rizu", 1),
    gender: "FEMALE",
  },
  {
    id: "Noah",
    label: "Noah",
    previewSrc: avatarFrontFrameSrc("Noah", 1),
    gender: "MALE",
  },
];

export const canvas = document.querySelector(
  "#gameCanvas"
) as HTMLCanvasElement;
const appRoot = document.querySelector("#app") as HTMLDivElement;
stateVariables.ctx = canvas.getContext("2d")!;
stateVariables.ctx.imageSmoothingEnabled = false;

function slideTo(nextRender: () => void) {
  const current = appRoot.querySelector(".onboard") as HTMLDivElement | null;
  if (!current) {
    nextRender();
    return;
  }
  if (current.classList.contains("onboard--loader")) {
    current.classList.add("onboard--exit-slide");
  } else {
    current.classList.add("onboard--exit-fade");
  }
  const fallback = window.setTimeout(() => nextRender(), 720);
  current.addEventListener(
    "transitionend",
    () => {
      window.clearTimeout(fallback);
      nextRender();
    },
    { once: true }
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function setupPasswordToggle(
  input: HTMLInputElement | null,
  button: HTMLButtonElement | null
) {
  if (!input || !button) return;

  input.type = "password";

  button.addEventListener("click", () => {
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";

    const eye = button.querySelector('[data-icon="eye"]') as HTMLElement | null;
    const eyeOff = button.querySelector('[data-icon="eye-off"]') as HTMLElement | null;

    if (eye) eye.style.display = isHidden ? "none" : "block";
    if (eyeOff) eyeOff.style.display = isHidden ? "block" : "none";
  });
}


type HubModalOptions = {
  id: string;
  childrenHtml: string;
  className?: string;
  panelClassName?: string;
  closeLabel?: string;
};

function renderHubModal({
  id,
  childrenHtml,
  className = "",
  panelClassName = "",
  closeLabel = "Close",
}: HubModalOptions) {
  return `
    <div class="hub-panel hub-panel--modal ${panelClassName}" data-role="${id}" aria-hidden="true">
      <div class="hub-modal-shell">
        <button class="hub-modal-close" type="button" data-action="${id}-close" aria-label="${closeLabel}">
          X
        </button>
        <div class="modal hub hub-modal ${className}">
          <div class="modal-inner">
            ${childrenHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function updateMousePosition(e: PointerEvent) {
  const rect = canvas.getBoundingClientRect();
  stateVariables.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  stateVariables.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
}

canvas.addEventListener("pointermove", (e) => updateMousePosition(e));
canvas.addEventListener("pointerdown", (e) => updateMousePosition(e));
canvas.addEventListener("pointerup", (e) => {
  updateMousePosition(e);
  stateVariables.mouseClicked = true;
  stateVariables.mouseClickX = stateVariables.mouseX;
  stateVariables.mouseClickY = stateVariables.mouseY;
});
canvas.addEventListener("wheel", (e) => {
  if (stateVariables.dialoguePanelRect.visible) {
    const isOverPanel =
      stateVariables.mouseX >= stateVariables.dialoguePanelRect.x &&
      stateVariables.mouseX <= stateVariables.dialoguePanelRect.x + stateVariables.dialoguePanelRect.width &&
      stateVariables.mouseY >= stateVariables.dialoguePanelRect.y &&
      stateVariables.mouseY <= stateVariables.dialoguePanelRect.y + stateVariables.dialoguePanelRect.height;
    if (isOverPanel) {
      stateVariables.dialogueScrollY += e.deltaY * 0.5;
      e.preventDefault();
    }
  }
}, { passive: false });

let avatarIndex = 0;
stateVariables.selectedAvatarId = avatars[avatarIndex]?.id ?? "Ophelia";

function normalizeGender(value: string | null | undefined): "FEMALE" | "MALE" | "OTHER" | null {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v === "female" || v === "f") return "FEMALE";
  if (v === "male" || v === "m") return "MALE";
  if (v === "other" || v === "nonbinary" || v === "non-binary") return "OTHER";
  return null;
}

function hydrateAvatarSelectionFromProfile() {
  const stored = window.localStorage.getItem("mindtrail:avatarId");
  if (stored) {
    const idx = avatars.findIndex((a) => a.id === stored);
    if (idx >= 0) {
      avatarIndex = idx;
      stateVariables.selectedAvatarId = avatars[avatarIndex]?.id ?? stateVariables.selectedAvatarId;
      return;
    }
  }

  const g = normalizeGender(stateVariables.playerProfile.gender);
  if (!g) return;
  const idx = avatars.findIndex((a) => a.gender === g);
  if (idx >= 0) {
    avatarIndex = idx;
    stateVariables.selectedAvatarId = avatars[avatarIndex]?.id ?? stateVariables.selectedAvatarId;
  }
}

function renderLoader() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  appRoot.dataset.theme = "loader";
  appRoot.innerHTML = `
    <div class="onboard onboard--loader">
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="loader">
          <img src="${Assets.onboarding.namecard}" alt="Mindtrail" style="max-width: 100%; height: auto; display: block;" />
        </div>
      </div>
    </div>
  `;

  const avatar = avatars[avatarIndex] ?? avatars[0];
  const assetsToPreload = [
    "/assets/onboarding/bg.jpg",
    avatar.previewSrc,
    avatarFrontFrameSrc(avatar.id, 2),
    avatarFrontFrameSrc(avatar.id, 3),
    avatarFrontFrameSrc(avatar.id, 4),
  ];

  Promise.all([
    // Fonts are optional; don't block forever if unsupported.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).fonts?.ready?.catch?.(() => undefined) ?? Promise.resolve(),
    Promise.all(assetsToPreload.map((src) => preloadImage(src))),
    new Promise((r) => window.setTimeout(r, 800)),
  ]).then(async () => {
    const token = getAuthToken();
    if (token) {
      try {
        const body = await withTimeout(UserApi.getMe(), 1200);
        if (body.success && body.data && body.data.user) {
          stateVariables.playerProfile.name = body.data.user.name || "";
          stateVariables.playerProfile.email = body.data.user.email || "";
          stateVariables.playerProfile.age = body.data.user.age?.toString() || "";
          stateVariables.playerProfile.gender = body.data.user.gender || "";
          stateVariables.playerProfile.environment = body.data.user.environment || "";
          slideTo(renderHub);
          return;
        }
      } catch (e) {
        console.error("Auth verify error:", e);
        clearAuthToken();
      }
    }
    slideTo(renderInfo);
  });
}

function renderInfo() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  appRoot.dataset.theme = "sky";
  appRoot.innerHTML = `
    <div class="onboard onboard--popin">
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="modal">
          <div class="modal-inner">
            <div class="modal-text modal-content">
              <div>This world holds familiar situations.</div>
              <div style="margin-top: 14px;">You'll come across people, place and moments.</div>
              <div style="margin-top: 14px;">There’s no right or wrong ways to move through them.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" data-action="info-continue">CONTINUE</button>
          </div>
        </div>
      </div>
    </div>
  `;

  appRoot.querySelector('[data-action="info-continue"]')?.addEventListener("click", () => {
    slideTo(renderRegister);
  });
}

function renderHub() {
  if (!getAuthToken()) {
    slideTo(renderLogin);
    return;
  }
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  appRoot.dataset.theme = "sky";

  hydrateAvatarSelectionFromProfile();

  const avatar = avatars[avatarIndex] ?? avatars[0];
  const soundKey = "mindtrail:soundEnabled";
  const stored = window.localStorage.getItem(soundKey);
  if (stored === "true" || stored === "false") {
    stateVariables.soundEnabled = stored === "true";
  }

  const controlsSrc = `${import.meta.env.BASE_URL}assets/controls.png`;

  appRoot.innerHTML = `
    <div class="onboard onboard--popin">
      <div class="hub-top-right">
        <div class="sound">
          <div>Sound</div>
          <button class="switch" type="button" data-role="sound-switch" data-on="${stateVariables.soundEnabled ? "true" : "false"}"></button>
        </div>
        <div class="hub-logout">
          <button class="primary-btn hub-logout-btn" type="button" data-action="hub-logout" title="Logout" aria-label="Logout">
            <svg class="hub-logout-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
              <path d="M10 17l1.41-1.41L8.83 13H20v-2H8.83l2.58-2.59L10 7l-7 7 7 7z" />
              <path d="M4 4h8V2H4c-1.1 0-2 .9-2 2v6h2V4zm0 16h8v-2H4v-6H2v6c0 1.1.9 2 2 2z" />
            </svg>
            <span>LOGOUT</span>
          </button>
        </div>
      </div>
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="hub-stage" data-state="hub">
          <div class="hub-panel hub-panel--hub" data-role="hub-panel">
            <div class="modal hub">
              <div class="modal-inner">
                <div class="modal-title">THE SPACE IS YOURS.</div>
                <div class="hub-grid modal-content">
                  <div>
                    <div class="hub-menu">
                      <div class="hub-link" data-action="hub-controls"><span>CONTROL</span><span class="arrow">↗</span></div>
                      <div class="hub-link" data-action="hub-about"><span>ABOUT US</span><span class="arrow">↗</span></div>
                      <div class="hub-link" data-action="hub-progress"><span>YOUR PROGRESS</span><span class="arrow">↗</span></div>
                    </div>
                  </div>
                  <div class="hub-right">
                    <div class="avatar-label">CHOOSE YOUR AVATAR</div>
                    <div class="hub-avatar-row">
                      <button class="hub-avatar-arrow" type="button" data-action="avatar-prev" ${avatars.length <= 1 ? "disabled" : ""}>&lsaquo;</button>
                      <div class="hub-avatar" data-avatar="${avatar.id}">
                        <img alt="Avatar" data-role="hub-avatar-img" src="${avatar.previewSrc}" />
                      </div>
                      <button class="hub-avatar-arrow" type="button" data-action="avatar-next" ${avatars.length <= 1 ? "disabled" : ""}>&rsaquo;</button>
                    </div>
                    <div class="hub-avatar-name" data-role="hub-avatar-name">${avatar.label}</div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="primary-btn" data-action="hub-enter">ENTER THE WORLD</button>
              </div>
            </div>
          </div>
          ${renderHubModal({
    id: "hub-about-panel",
    closeLabel: "Close about",
    panelClassName: "hub-panel--about",
    childrenHtml: `
              <div class="modal-title">ABOUT US</div>
              <div class="modal-content">
                <div class="modal-text">
                  <div>Mindtrail is a gamified mental health experience built to reduce stigma and encourage early support—especially in culturally conservative communities where such conversations are often avoided.</div>
                  <div style="margin-top: 14px;">We believe awareness begins with small, safe interactions. Through an interactive journey, users step into the role of a guide—walking along pathways, engaging with characters, and navigating real-life situations. By helping others, they gradually build self-awareness, empathy, and confidence to address their own mental health.</div>
                  <div style="margin-top: 14px;">Our approach blends psychology with storytelling—making difficult conversations feel natural, relatable, and stigma-free.</div>
                </div>
                <div class="about-credit">
                  <div>TEAM PONEGLYPH</div>
                  <div>Nepal-US Hackathon 2026</div>
                </div>
              </div>
            `,
  })}
          ${renderHubModal({
    id: "hub-controls-panel",
    closeLabel: "Close controls",
    panelClassName: "hub-panel--controls",
    childrenHtml: `
              <div class="modal-title">CONTROLS</div>
              <img class="hub-controls-image modal-content" src="${controlsSrc}" alt="Game controls" />
            `,
  })}
          ${renderHubModal({
    id: "hub-progress-panel",
    closeLabel: "Close progress",
    panelClassName: "hub-panel--progress",
    childrenHtml: `
              <div class="modal-title">YOUR PROGRESS</div>
              <div class="modal-content hub-progress-content">
                <div class="progress-user-card">
                  <div class="progress-user-avatar" data-avatar="${avatar.id}" aria-hidden="true">
                    <img data-role="progress-user-avatar" alt="" src="${avatarFrontFrameSrc(avatar.id, 1)}" />
                  </div>
                  <div class="progress-user-info">
                    <div class="progress-user-name" data-role="progress-user-name"></div>
                    <div class="progress-user-email" data-role="progress-user-email"></div>
                    <div class="progress-user-meta">
                      <div class="progress-user-meta-item">
                        <span class="label">AGE</span>
                        <span class="value" data-role="progress-user-age">—</span>
                      </div>
                      <div class="progress-user-meta-item">
                        <span class="label">REPORTS</span>
                        <span class="value" data-role="progress-user-reports">—</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="progress-report-shell" data-role="hub-progress-shell">
                  <div class="progress-report-loading" data-role="hub-progress-loading">Loading your report…</div>
                </div>
                <div class="progress-footer">
                  <div>These insights update after you finish a session.</div>
                </div>
              </div>
            `,
  })}
        </div>
      </div>
    </div>
  `;

  const soundSwitch = appRoot.querySelector('[data-role="sound-switch"]') as HTMLButtonElement | null;
  soundSwitch?.addEventListener("click", () => {
    stateVariables.soundEnabled = !stateVariables.soundEnabled;
    window.localStorage.setItem(soundKey, stateVariables.soundEnabled ? "true" : "false");
    if (soundSwitch) soundSwitch.dataset.on = stateVariables.soundEnabled ? "true" : "false";
  });

  appRoot.querySelector('[data-action="hub-logout"]')?.addEventListener("click", () => {
    void logoutToLogin({
      canvas,
      exitFullscreenBestEffort,
      stopSessionBestEffort,
      resetGameState,
      navigateToLogin: () => {
        clearAuthToken();
        slideTo(renderLogin);
      },
    });
  });

  const hubAvatarImg = appRoot.querySelector('[data-role="hub-avatar-img"]') as HTMLImageElement | null;
  if (hubAvatarImg) startAvatarAnimation(hubAvatarImg, avatar.id);

  const updateAvatar = () => {
    const next = avatars[avatarIndex] ?? avatars[0];
    stateVariables.selectedAvatarId = next.id;
    window.localStorage.setItem("mindtrail:avatarId", next.id);

    const img = appRoot.querySelector('[data-role="hub-avatar-img"]') as HTMLImageElement | null;
    const name = appRoot.querySelector('[data-role="hub-avatar-name"]') as HTMLDivElement | null;
    const progressImg = appRoot.querySelector('[data-role="progress-user-avatar"]') as HTMLImageElement | null;

    const container = appRoot.querySelector('.hub-avatar') as HTMLDivElement | null;
    const progressContainer = appRoot.querySelector('.progress-user-avatar') as HTMLDivElement | null;

    if (img) img.src = next.previewSrc;
    if (name) name.textContent = next.label;
    if (progressImg) progressImg.src = avatarFrontFrameSrc(next.id, 1);
    if (container) container.dataset.avatar = next.id;
    if (progressContainer) progressContainer.dataset.avatar = next.id;
    if (img) startAvatarAnimation(img, next.id);
  };

  appRoot.querySelector('[data-action="avatar-prev"]')?.addEventListener("click", () => {
    avatarIndex = (avatarIndex - 1 + avatars.length) % avatars.length;
    updateAvatar();
  });
  appRoot.querySelector('[data-action="avatar-next"]')?.addEventListener("click", () => {
    avatarIndex = (avatarIndex + 1) % avatars.length;
    updateAvatar();
  });

  appRoot.querySelector('[data-action="hub-enter"]')?.addEventListener("click", () => {
    void (async () => {
      // Call fullscreen inside a user gesture (this click) so browsers allow it.
      await enterFullscreenBestEffort();
      if (getFullscreenElement()) {
        slideTo(renderGameLoader);
        return;
      }

      showFullscreenRequiredOverlay({
        mode: "hub",
        message: "Fullscreen is needed to start the game. Tap “Enter fullscreen” to continue.",
        enterLabel: "Enter fullscreen",
        exitLabel: "Exit game",
        onSuccess: () => slideTo(renderGameLoader),
        onCancel: () => slideTo(renderHub),
      });
    })();
  });

  const hubStage = appRoot.querySelector('[data-state]') as HTMLDivElement | null;
  const aboutPanel = appRoot.querySelector('[data-role="hub-about-panel"]') as HTMLDivElement | null;
  const controlsPanel = appRoot.querySelector('[data-role="hub-controls-panel"]') as HTMLDivElement | null;
  const progressPanel = appRoot.querySelector('[data-role="hub-progress-panel"]') as HTMLDivElement | null;

  const setProfileHeader = () => {
    const nameEl = appRoot.querySelector('[data-role="progress-user-name"]') as HTMLDivElement | null;
    const emailEl = appRoot.querySelector('[data-role="progress-user-email"]') as HTMLDivElement | null;
    const ageEl = appRoot.querySelector('[data-role="progress-user-age"]') as HTMLSpanElement | null;
    if (nameEl) nameEl.textContent = stateVariables.playerProfile.name || "Traveler";
    if (emailEl) emailEl.textContent = stateVariables.playerProfile.email || "—";
    if (ageEl) ageEl.textContent = stateVariables.playerProfile.age || "—";
  };

  type ParsedWellbeingReport = {
    burnout?: string;
    stress?: string;
    uncertainty?: string;
    analysis?: string;
    feedback?: string;
  };

  const parseWellbeingReport = (raw: unknown): ParsedWellbeingReport & { rawText?: string } => {
    const coerce = (value: any) => (typeof value === "string" ? value : undefined);

    const fromObject = (obj: any): ParsedWellbeingReport => {
      if (!obj || typeof obj !== "object") return {};
      if (obj.report && typeof obj.report === "object") {
        return {
          burnout: coerce(obj.report.burnout),
          stress: coerce(obj.report.stress),
          uncertainty: coerce(obj.report.uncertainty),
          analysis: coerce(obj.report.analysis),
          feedback: coerce(obj.feedback),
        };
      }
      return {
        burnout: coerce(obj.burnout),
        stress: coerce(obj.stress),
        uncertainty: coerce(obj.uncertainty),
        analysis: coerce(obj.analysis),
        feedback: coerce(obj.feedback),
      };
    };

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return { ...fromObject(parsed) };
        } catch {
          return { rawText: raw };
        }
      }
      return { rawText: raw };
    }

    return fromObject(raw);
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  let progressFetchInFlight = false;
  const renderProgressInto = (shell: HTMLElement, html: string) => {
    shell.innerHTML = html;
  };

  const renderProgressEmpty = (shell: HTMLElement, message: string) => {
    renderProgressInto(
      shell,
      `<div class="progress-report-empty">${escapeHtml(message)}</div>`
    );
  };

  const renderProgressReportCard = (
    shell: HTMLElement,
    progressReport: any
  ) => {
    const status = typeof progressReport?.status === "string" ? progressReport.status : "UNKNOWN";

    const parsed = parseWellbeingReport(progressReport?.report);
    const burnout = parsed.burnout ?? "—";
    const stress = parsed.stress ?? "—";
    const uncertainty = parsed.uncertainty ?? "—";
    const analysis = parsed.analysis ?? parsed.rawText ?? "";
    const feedback =
      (typeof progressReport?.feedback === "string" && progressReport.feedback.trim().length > 0
        ? progressReport.feedback.trim()
        : parsed.feedback) ?? "";

    const hasAnalysis = typeof analysis === "string" && analysis.trim().length > 0;
    const hasFeedback = typeof feedback === "string" && feedback.trim().length > 0;

    renderProgressInto(
      shell,
      `
        <div class="progress-report-card">
          <div class="progress-report-stats">
            <div class="progress-report-stat" data-metric="burnout">
              <div class="progress-report-stat-label">BURNOUT</div>
              <div class="progress-report-stat-value">${escapeHtml(burnout)}</div>
            </div>
            <div class="progress-report-stat" data-metric="stress">
              <div class="progress-report-stat-label">STRESS</div>
              <div class="progress-report-stat-value">${escapeHtml(stress)}</div>
            </div>
            <div class="progress-report-stat" data-metric="uncertainty">
              <div class="progress-report-stat-label">UNCERTAINTY</div>
              <div class="progress-report-stat-value">${escapeHtml(uncertainty)}</div>
            </div>
          </div>

          ${
            status === "PENDING" && !hasAnalysis && !hasFeedback
              ? `<div class="progress-report-note">Your latest report is generating. Check back in a bit.</div>`
              : ""
          }

          ${
            hasAnalysis
              ? `
                <div class="progress-report-section">
                  <div class="progress-report-section-title">ANALYSIS</div>
                  <div class="progress-report-section-text">${escapeHtml(analysis)}</div>
                </div>
              `
              : ""
          }

          ${
            hasFeedback
              ? `
                <div class="progress-report-section">
                  <div class="progress-report-section-title">FEEDBACK</div>
                  <div class="progress-report-section-text">${escapeHtml(feedback)}</div>
                </div>
              `
              : ""
          }
        </div>
      `
    );
  };

  const loadLatestProgressReport = async () => {
    if (progressFetchInFlight) return;
    progressFetchInFlight = true;
    try {
      const shell = appRoot.querySelector('[data-role="hub-progress-shell"]') as HTMLDivElement | null;
      if (!shell) return;
      renderProgressInto(shell, `<div class="progress-report-loading">Loading your report…</div>`);

      if (USE_DUMMY_PROGRESS_REPORT) {
        const reportsEl = appRoot.querySelector('[data-role="progress-user-reports"]') as HTMLSpanElement | null;
        if (reportsEl) reportsEl.textContent = "1";
        renderProgressReportCard(shell, {
          id: "progress-dummy",
          status: "COMPLETED",
          createdAt: new Date().toISOString(),
          report: {
            burnout: "Low",
            stress: "Low",
            uncertainty: "Low",
            analysis:
              "Your recent sessions indicate low burnout and stress, with a balanced focus on problem-solving and emotional regulation strategies. Some uncertainty and external attribution were noted, suggesting areas where clarity and personal agency could be enhanced.",
          },
          feedback:
            "Consider expanding your problem-focused strategies to further tackle feelings of uncertainty. Engaging more actively with your support network may provide additional insights and comfort. Reflecting on your values can help find meaning in any challenges you face.",
        });
        return;
      }

      const body: any = await ProgressReportsApi.list();
      const reports = body?.data?.progressReports;
      if (!Array.isArray(reports) || reports.length === 0) {
        const reportsEl = appRoot.querySelector('[data-role="progress-user-reports"]') as HTMLSpanElement | null;
        if (reportsEl) reportsEl.textContent = "0";
        renderProgressEmpty(shell, "No progress reports yet. Finish a session to generate one.");
        return;
      }

      const latest = reports[0];

      const reportsEl = appRoot.querySelector('[data-role="progress-user-reports"]') as HTMLSpanElement | null;
      if (reportsEl) reportsEl.textContent = String(reports.length);

      renderProgressReportCard(shell, latest);
    } catch (err: any) {
      const shell = appRoot.querySelector('[data-role="hub-progress-shell"]') as HTMLDivElement | null;
      if (!shell) return;
      const msg = err instanceof Error ? err.message : "Failed to load progress reports.";
      renderProgressEmpty(shell, msg);
    } finally {
      progressFetchInFlight = false;
    }
  };

  let progressAvatarTimer: number | null = null;
  let progressNpcName: string | null = null;
  const stopProgressAvatarAnimation = () => {
    if (progressAvatarTimer != null) {
      window.clearInterval(progressAvatarTimer);
      progressAvatarTimer = null;
    }
    const img = appRoot.querySelector('[data-role="progress-user-avatar"]') as HTMLImageElement | null;
    if (img) img.style.transform = "";
    progressNpcName = null;
  };

  const startProgressAvatarAnimation = () => {
    stopProgressAvatarAnimation();
    const img = appRoot.querySelector('[data-role="progress-user-avatar"]') as HTMLImageElement | null;
    if (!img) return;

    if (USE_RANDOM_NPC_PROFILE_AVATAR) {
      const npcPool = Array.from({ length: 10 }, (_, i) => `Character ${i + 1}`);
      const stored = window.localStorage.getItem("mindtrail:profileNpc");
      const storedOk = stored && npcPool.includes(stored) ? stored : null;
      progressNpcName =
        progressNpcName ??
        storedOk ??
        (npcPool[Math.floor(Math.random() * npcPool.length)] ?? "Character 1");
      if (progressNpcName) window.localStorage.setItem("mindtrail:profileNpc", progressNpcName);
      const frames = [1, 2].map((i) => npcFrontFrameSrc(progressNpcName!, i));
      let idx = 0;
      img.style.transform = "";
      img.onerror = () => {
        // If the NPC asset path fails (usually base URL / deploy path issues), fallback to the player avatar.
        const fallback = avatarFrontFrameSrc(avatars[avatarIndex]?.id ?? "Ophelia", 1);
        img.src = fallback;
      };
      img.src = frames[0] ?? img.src;
      progressAvatarTimer = window.setInterval(() => {
        idx = (idx + 1) % frames.length;
        img.src = frames[idx] ?? img.src;
      }, 220);
      return;
    }

    const avatarId = stateVariables.selectedAvatarId || (avatars[avatarIndex]?.id ?? "Ophelia");
    const leftFrames = [1, 2, 3, 4].map((i) => avatarDirectionalFrameSrc(avatarId, "left", i));
    const rightFrames = [1, 2, 3, 4].map((i) => avatarDirectionalFrameSrc(avatarId, "right", i));
    let frameIdx = 0;
    let x = 0;
    let dir = 1; // 1 = right, -1 = left

    const container = img.parentElement as HTMLElement | null;
    const containerW = container?.clientWidth ?? 84;
    const spriteW = img.clientWidth || 70;
    const pad = 6;
    const maxX = Math.max(0, containerW - spriteW - pad * 2);

    img.style.transform = `translateX(${pad}px)`;
    img.src = rightFrames[0] ?? img.src;
    progressAvatarTimer = window.setInterval(() => {
      x += dir * 3;
      if (x <= 0) {
        x = 0;
        dir = 1;
      } else if (x >= maxX) {
        x = maxX;
        dir = -1;
      }

      frameIdx = (frameIdx + 1) % 4;
      img.src = (dir === 1 ? rightFrames : leftFrames)[frameIdx] ?? img.src;
      img.style.transform = `translateX(${pad + x}px)`;
    }, 120);
  };

  const setPanelState = (state: "hub" | "about" | "controls" | "progress") => {
    if (!hubStage) return;
    hubStage.dataset.state = state;
    aboutPanel?.setAttribute("aria-hidden", state === "about" ? "false" : "true");
    controlsPanel?.setAttribute("aria-hidden", state === "controls" ? "false" : "true");
    progressPanel?.setAttribute("aria-hidden", state === "progress" ? "false" : "true");
    if (state === "progress") {
      setProfileHeader();
      startProgressAvatarAnimation();
      void loadLatestProgressReport();
    } else {
      stopProgressAvatarAnimation();
    }
  };

  appRoot.querySelector('[data-action="hub-about"]')?.addEventListener("click", () => {
    setPanelState("about");
  });
  appRoot.querySelector('[data-action="hub-controls"]')?.addEventListener("click", () => {
    setPanelState("controls");
  });
  appRoot.querySelector('[data-action="hub-progress"]')?.addEventListener("click", () => {
    setPanelState("progress");
  });
  appRoot.querySelector('[data-action="hub-about-panel-close"]')?.addEventListener("click", () => {
    setPanelState("hub");
  });
  appRoot.querySelector('[data-action="hub-controls-panel-close"]')?.addEventListener("click", () => {
    setPanelState("hub");
  });
  appRoot.querySelector('[data-action="hub-progress-panel-close"]')?.addEventListener("click", () => {
    setPanelState("hub");
  });
}

function renderRegister() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  appRoot.dataset.theme = "sky";
  appRoot.innerHTML = `
    <div class="onboard onboard--popin">
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="modal">
          <div class="modal-inner">
            <div class="modal-title">A FEW THINGS ABOUT YOU</div>
            <div class="form modal-content">
              <div>
                <label>What should we call you?</label>
                <input data-field="name" placeholder="Your name (optional)" />
                <div class="error" data-error="name" style="display:none;"></div>
              </div>
              <div>
                <label>Email *</label>
                <input data-field="email" type="email" placeholder="Your email" />
                <div class="error" data-error="email" style="display:none;"></div>
              </div>
              <div>
                <label>Password *</label>
                <div class="password-wrapper" style="position: relative; display: flex; align-items: center;">
                  <input data-field="password" type="password" placeholder="Min 8 characters" style="width: 100%; padding-right: 40px;" />
                  <button type="button" data-action="toggle-password-register"
                    style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; padding: 0; color: inherit;">
                    
                    <svg data-icon="eye" style="display: block; width: 20px; height: 20px; fill: currentColor; opacity: 0.6;" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    <svg data-icon="eye-off" style="display: none; width: 20px; height: 20px; fill: currentColor; opacity: 0.6;" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                  </button>
                </div>
                <div class="error" data-error="password" style="display:none;"></div>
              </div>
              <div>
                <label>Your age *</label>
                <input data-field="age" placeholder="Age (required)" inputmode="numeric" />
                <div class="error" data-error="age" style="display:none;"></div>
              </div>
              <div>
                <label>Gender</label>
                <div class="form-grid" data-group="gender">
                  <button class="pill" type="button" data-value="male">Male</button>
                  <button class="pill" type="button" data-value="female">Female</button>
                  <button class="pill" type="button" data-value="other">Non-binary</button>
                </div>
                <div class="error" data-error="gender" style="display:none;"></div>
              </div>
              <div>
                <label>Primary Environment</label>
                <div class="form-grid" data-group="environment">
                  <button class="pill" type="button" data-value="school">School</button>
                  <button class="pill" type="button" data-value="office">Office</button>
                  <button class="pill" type="button" data-value="relationship">Relationship</button>
                </div>
                <div class="error" data-error="environment" style="display:none;"></div>
              </div>
              <div class="error" data-error="api" style="display:none; text-align:center; margin-top: 10px; color: #ff4d4d;"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" data-action="register-continue" disabled>CONTINUE</button>
            <div style="margin-top: 15px; text-align: center; font-size: 14px;">
              Already have an account? 
              <a href="#" data-action="go-login" style="color: #1C92B2; text-decoration: underline; font-weight: bold;">
                Log In
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const nameInput = appRoot.querySelector('[data-field="name"]') as HTMLInputElement | null;
  const emailInput = appRoot.querySelector('[data-field="email"]') as HTMLInputElement | null;
  const passwordInput = appRoot.querySelector('[data-field="password"]') as HTMLInputElement | null;
  const togglePasswordBtn = appRoot.querySelector('[data-action="toggle-password-register"]') as HTMLButtonElement | null;
  const ageInput = appRoot.querySelector('[data-field="age"]') as HTMLInputElement | null;
  const continueButton = appRoot.querySelector('[data-action="register-continue"]') as HTMLButtonElement | null;

  setupPasswordToggle(passwordInput, togglePasswordBtn);

  const setError = (key: string, message: string | null) => {
    const el = appRoot.querySelector(`[data-error="${key}"]`) as HTMLDivElement | null;
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.style.display = "none";
    } else {
      el.textContent = message;
      el.style.display = "block";
    }
  };

  const validate = (showErrors: boolean) => {
    const name = (nameInput?.value ?? "").trim();
    const email = (emailInput?.value ?? "").trim();
    const password = (passwordInput?.value ?? "").trim();
    const ageRaw = (ageInput?.value ?? "").trim();

    const nameOk = name.length === 0 || name.length >= 2;
    const emailOk = email.length > 0 && email.includes("@");
    const passwordOk = password.length >= 8;
    const ageOk =
      /^[0-9]{1,3}$/.test(ageRaw) && Number(ageRaw) >= 6 && Number(ageRaw) <= 120;

    const genderOk = stateVariables.playerProfile.gender.length > 0;
    const environmentOk = stateVariables.playerProfile.environment.length > 0;

    if (showErrors) {
      setError("name", nameOk ? null : "Name must be at least 2 characters.");
      setError("email", emailOk ? null : "Please enter a valid email.");
      setError("password", passwordOk ? null : "Password must be at least 8 characters.");
      setError("age", ageOk ? null : "Age is required (6–120).");
      setError("gender", genderOk ? null : "Please choose a gender option.");
      setError("environment", environmentOk ? null : "Please choose an environment.");
    }

    return nameOk && emailOk && passwordOk && ageOk && genderOk && environmentOk;
  };

  const refreshContinue = () => {
    if (!continueButton) return;
    continueButton.disabled = !validate(false);
  };

  const wireChipGroup = (group: "gender" | "environment") => {
    const container = appRoot.querySelector(`[data-group="${group}"]`) as HTMLDivElement | null;
    if (!container) return;
    container.querySelectorAll<HTMLButtonElement>(".pill").forEach((button) => {
      button.addEventListener("click", () => {
        container.querySelectorAll<HTMLButtonElement>(".pill").forEach((b) => {
          b.dataset.selected = "false";
        });
        button.dataset.selected = "true";
        const value = button.dataset.value ?? "";
        if (group === "gender") stateVariables.playerProfile.gender = value;
        if (group === "environment") stateVariables.playerProfile.environment = value;
        setError(group, null);
        refreshContinue();
      });
    });
  };

  wireChipGroup("gender");
  wireChipGroup("environment");

  nameInput?.addEventListener("input", () => { setError("name", null); refreshContinue(); });
  emailInput?.addEventListener("input", () => { setError("email", null); refreshContinue(); });
  passwordInput?.addEventListener("input", () => { setError("password", null); refreshContinue(); });
  ageInput?.addEventListener("input", () => { setError("age", null); refreshContinue(); });

  refreshContinue();

  appRoot.querySelector('[data-action="go-login"]')?.addEventListener("click", () => {
    slideTo(renderLogin);
  });

  appRoot.querySelector('[data-action="register-continue"]')?.addEventListener("click", async () => {
    if (!validate(true)) return;
    const email = emailInput?.value.trim() ?? "";
    const password = passwordInput?.value.trim() ?? "";
    const name = nameInput?.value.trim() ?? "";
    const age = ageInput?.value.trim() ?? "";

    if (!continueButton) return;
    continueButton.disabled = true;
    continueButton.textContent = "REGISTERING...";
    setError("api", null);

    try {
      const regBody = await AuthApi.register(email, password);
      const token = regBody.data?.tokens?.accessToken;
      if (token) {
        setAuthToken(token);
        stateVariables.playerProfile.name = name;
        stateVariables.playerProfile.email = email;
        stateVariables.playerProfile.age = age;
        const profileData: any = {
          gender: stateVariables.playerProfile.gender,
          environment: stateVariables.playerProfile.environment,
        };
        if (name) profileData.name = name;
        profileData.age = Number(age);

        try {
          await UserApi.updateMe(profileData);
        } catch (patchErr) {
          console.error("Profile update failed:", patchErr);
        }

        // Start creating the game session immediately after registration (prefetch),
        // so the "Enter the world" step doesn't have to wait as long.
        stateVariables.sessionPrefetchPromise = GameApi.createSession()
          .then((sessionResponse: any) => {
            if (sessionResponse?.success && sessionResponse?.data?.session?.id) {
              stateVariables.currentSessionId = sessionResponse.data.session.id;
              stateVariables.gameQuestions = sessionResponse.data.questions || [];
            }
            return sessionResponse;
          })
          .catch((err) => {
            console.warn("Session prefetch failed:", err);
            return Promise.reject(err);
          });
      }
      slideTo(renderHub);
    } catch (err: any) {
      // Hackathon-friendly fallback: allow the user to continue even if backend is unreachable.
      console.error("Registration failed, continuing offline:", err);
      stateVariables.playerProfile.name = name;
      stateVariables.playerProfile.email = email;
      stateVariables.playerProfile.age = age;
      setError(
        "api",
        "Server unreachable — continuing in offline mode (progress will stay on this device)."
      );
      continueButton.textContent = "CONTINUE";
      continueButton.disabled = false;
      window.setTimeout(() => slideTo(renderHub), 450);
    }
  });
}

function renderLogin() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  appRoot.dataset.theme = "sky";
  appRoot.innerHTML = `
    <div class="onboard onboard--popin">
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="modal">
          <div class="modal-inner">
            <div class="modal-title">LOG IN</div>
            <div class="form modal-content">
              <div>
                <label class="normal-text" >Email address</label>
                <input data-field="login-email" type="email" placeholder="Enter your email" />
                <div class="error" data-error="login" style="display:none;"></div>
              </div>
              <div>
                <label>Password</label>
                <div class="password-wrapper" style="position: relative; display: flex; align-items: center;">
                  <input data-field="login-password" type="password" placeholder="Enter your password" style="width: 100%; padding-right: 40px;" />
                  <button type="button" data-action="toggle-password" style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; padding: 0; color: inherit;">
                    <svg data-icon="eye" style="display: block; width: 20px; height: 20px; fill: currentColor; opacity: 0.6;" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    <svg data-icon="eye-off" style="display: none; width: 20px; height: 20px; fill: currentColor; opacity: 0.6;" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" data-action="login-continue" style="width: 100%;">LOGIN</button>
            <div style="margin-top: 15px; text-align: center; font-size: 14px;">
              Don't have an account? <a href="#" data-action="back-register" style="color: #1C92B2; text-decoration: underline; font-weight: bold;">Sign up</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const emailInput = appRoot.querySelector('[data-field="login-email"]') as HTMLInputElement | null;
  const togglePasswordBtn = appRoot.querySelector('[data-action="toggle-password"]') as HTMLButtonElement | null;
  const passwordInput = appRoot.querySelector('[data-field="login-password"]') as HTMLInputElement | null;
  const loginBtn = appRoot.querySelector('[data-action="login-continue"]') as HTMLButtonElement | null;

  setupPasswordToggle(passwordInput, togglePasswordBtn);

  const setError = (key: string, message: string | null) => {
    const el = appRoot.querySelector(`[data-error="${key}"]`) as HTMLDivElement | null;
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.style.display = "none";
    } else {
      el.textContent = message;
      el.style.display = "block";
    }
  };

  appRoot.querySelector('[data-action="back-register"]')?.addEventListener("click", (e) => {
    e.preventDefault();
    slideTo(renderRegister);
  });

  loginBtn?.addEventListener("click", async () => {
    const email = (emailInput?.value ?? "").trim();
    const password = (passwordInput?.value ?? "").trim();
    let hasError = false;

    // simple validation
    if (!email || !email.includes("@")) { setError("login-email", "Enter a valid email."); hasError = true; }
    else setError("login-email", null);

    if (!password || password.length < 8) { setError("login-password", "Password must be at least 8 characters."); hasError = true; }
    else setError("login-password", null);

    if (hasError) return;

    // Disable button & show progress text
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "LOGGING IN...";
    }
    setError("login-api", null);

    try {
      const body = await AuthApi.login(email, password);
      const token = body.data?.tokens?.accessToken;
      if (token) {
        setAuthToken(token);
        // Prefetch the game session as soon as auth is saved,
        // so entering the world later doesn't have to wait as long.
        stateVariables.sessionPrefetchPromise = null;

        try {
          const uBody = await UserApi.getMe();
          if (uBody.success && uBody.data?.user) {
            stateVariables.playerProfile.name = uBody.data.user.name || "";
            stateVariables.playerProfile.email = uBody.data.user.email || "";
            stateVariables.playerProfile.age = uBody.data.user.age?.toString() || "";
            stateVariables.playerProfile.gender = uBody.data.user.gender || "";
            stateVariables.playerProfile.environment = uBody.data.user.environment || "";
          }
        } catch (profileErr) {
          console.error("Failed to fetch user profile", profileErr);
          stateVariables.playerProfile.email = email;
        }
        // slide to hub
        slideTo(renderHub);

        stateVariables.sessionPrefetchPromise = GameApi.createSession()
          .then((sessionResponse: any) => {
            if (sessionResponse?.success && sessionResponse?.data?.session?.id) {
              stateVariables.currentSessionId = sessionResponse.data.session.id;
              stateVariables.gameQuestions = sessionResponse.data.questions || [];
            }
            return sessionResponse;
          })
          .catch((err) => {
            console.warn("Session prefetch failed:", err);
            return Promise.reject(err);
          });
      }
    } catch (err: any) {
      // show error & reset button
      setError("login-api", err.message || "Login failed");
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "LOGIN";
      }
    }
  });
}

function renderGameLoader() {
  // If we already have a session (e.g., prefetched after register), skip the wait.
  if (stateVariables.currentSessionId && stateVariables.gameQuestions.length > 0) {
    startGame();
    return;
  }

  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  appRoot.dataset.theme = "game-loader";
  appRoot.innerHTML = `
    <div class="onboard onboard--game-loader">
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="game-loader">
          <div class="game-loader-text">Preparing the path ahead...</div>
          <div class="game-loader-progress-container">
            <div class="game-loader-progress-bar game-loader-progress-bar--animate"></div>
          </div>
          <button class="secondary-btn" data-action="back-hub" style="margin-top: 18px; width: 100%;">BACK</button>
        </div>
      </div>
    </div>
  `;

  appRoot.querySelector('[data-action="back-hub"]')?.addEventListener("click", () => {
    slideTo(renderHub);
  });

  const showSessionError = (message: string) => {
    appRoot.dataset.theme = "sky";
    appRoot.innerHTML = `
      <div class="onboard onboard--popin">
        <div class="onboard-bg"></div>
        <div class="onboard-content onboard-content--center">
          <div class="modal">
            <div class="modal-inner">
              <div class="modal-title">COULDN'T START SESSION</div>
              <div class="modal-content">
                <div class="modal-text">${message}</div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="primary-btn" data-action="retry-session" style="width:100%;">RETRY</button>
              <button class="secondary-btn" data-action="back-hub" style="width:100%; margin-top: 10px;">BACK</button>
            </div>
          </div>
        </div>
      </div>
    `;

    appRoot.querySelector('[data-action="retry-session"]')?.addEventListener("click", () => {
      slideTo(renderGameLoader);
    });
    appRoot.querySelector('[data-action="back-hub"]')?.addEventListener("click", () => {
      slideTo(renderHub);
    });
  };

  const sessionPromise =
    stateVariables.sessionPrefetchPromise ??
    GameApi.createSession();
  // Consume prefetched promise so we don't accidentally reuse a stale one later.
  stateVariables.sessionPrefetchPromise = null;

  const assetsPromise = withTimeout(preloadGameAssets(), 15000).catch((err) => {
    console.warn("Optional asset preloading failed:", err);
    return true;
  });

  Promise.allSettled([sessionPromise, assetsPromise]).then(([sessionResult]) => {
    if (sessionResult.status !== "fulfilled") {
      console.warn("Session creation failed:", sessionResult.reason);
      showSessionError(
        (sessionResult.reason && sessionResult.reason.message) ||
          "The server didn’t respond. Please try again."
      );
      return;
    }

    const sessionResponse = sessionResult.value as any;
    if (!sessionResponse?.success || !sessionResponse?.data?.session?.id) {
      showSessionError("Invalid server response. Please try again.");
      return;
    }

    stateVariables.currentSessionId = sessionResponse.data.session.id;
    stateVariables.gameQuestions = sessionResponse.data.questions || [];
    startGame();
  });
}

function startGame() {
  if (!getAuthToken()) {
    slideTo(renderLogin);
    return;
  }
  appRoot.style.display = "none";
  canvas.style.display = "block";
  canvas.style.zIndex = "100"; // Force above everything else
  
  // Strict fullscreen: do not start gameplay unless fullscreen is active.
  stateVariables.gamePaused = true;
  pauseGameTimerIfRunning();
  stateVariables.gameOverShown = false;
  stateVariables.gameState = GameState.running;

  void (async () => {
    await enterFullscreenBestEffort();
    if (!getFullscreenElement()) {
      showFullscreenRequiredOverlay({
        mode: "game",
        message: "Fullscreen is required to play. Tap “Enter fullscreen” to continue.",
        enterLabel: "Enter fullscreen",
        exitLabel: "Exit game",
        onSuccess: () => startGame(),
        onCancel: () => {
          void exitGameToHub();
        },
      });
      return;
    }

    stateVariables.gamePaused = false;
    resumeGameTimerIfPaused();
    // Final check to ensure canvas is ready
    adjustCanvasSize();

    try {
      initializeGame(stateVariables.gameQuestions);
      // Render the first frame immediately so we don't show a black canvas.
      draw();
    } catch (err: any) {
      console.error("Game initialization failed:", err);
      appRoot.style.display = "block";
      appRoot.innerHTML = `<div style="color:white; background:rgba(20,10,30,0.95); padding: 40px; text-align:center; position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column; justify-content:center; align-items:center; font-family:sans-serif;">
        <h2 style="color:#ff6b6b; margin-bottom:10px;">Game Critical Error</h2>
        <p style="background:rgba(255,0,0,0.05); padding:15px; border-radius:8px; border:1px solid rgba(255,0,0,0.3); max-width:600px; text-align:left; font-family:monospace; margin:20px 0; overflow:auto; max-height:300px;">
          <strong>Error:</strong> ${err.message}<br/><br/>
          <span style="font-size:11px; opacity:0.6; white-space:pre-wrap;">${err.stack || "No stack trace available"}</span>
        </p>
        <button onclick="location.reload()" style="background:#007c9d; color:white; border:none; padding:12px 24px; border-radius:5px; cursor:pointer; font-weight:bold; font-size:16px;">Restart Application</button>
      </div>`;
    }
  })();

}

async function enterFullscreenBestEffort() {
  try {
    if (getFullscreenElement()) return;
    const root = document.documentElement as any;
    const maybePromise =
      root.requestFullscreen?.({ navigationUI: "hide" }) ??
      root.requestFullscreen?.() ??
      root.webkitRequestFullscreen?.();
    if (maybePromise && typeof maybePromise.then === "function") {
      await maybePromise;
    }
  } catch {
    // Best-effort; ignore if blocked (e.g., not a user gesture).
  }
}

async function exitFullscreenBestEffort() {
  try {
    if (!getFullscreenElement()) return;
    const doc = document as any;
    const maybePromise = doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.();
    if (maybePromise && typeof maybePromise.then === "function") {
      await maybePromise;
    }
  } catch {
    // ignore
  }
}

function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ??
    ((document as any).webkitFullscreenElement as Element | null) ??
    null
  );
}

function pauseGameTimerIfRunning() {
  if (!stateVariables.endTimeMs) return;
  if (stateVariables.timerPausedAtMs != null) return;
  stateVariables.timerPausedAtMs = Date.now();
}

function resumeGameTimerIfPaused() {
  if (!stateVariables.endTimeMs) return;
  if (stateVariables.timerPausedAtMs == null) return;
  const pausedForMs = Date.now() - stateVariables.timerPausedAtMs;
  stateVariables.endTimeMs += pausedForMs;
  stateVariables.timerPausedAtMs = null;
}

let fullscreenRequiredOverlay: HTMLDivElement | null = null;
let fullscreenGateOpen = false;
let fullscreenOverlayMode: "game" | "hub" = "game";
let fullscreenOverlayOnSuccess: (() => void) | null = null;
let fullscreenOverlayOnCancel: (() => void) | null = null;
function getOrCreateFullscreenRequiredOverlay() {
  if (fullscreenRequiredOverlay) return fullscreenRequiredOverlay;

  const overlay = document.createElement("div");
  overlay.id = "fullscreen-required-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "100000";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(10, 10, 20, 0.85)";
  overlay.style.backdropFilter = "blur(6px)";

  const panel = document.createElement("div");
  panel.style.width = "min(520px, 92vw)";
  panel.style.padding = "20px";
  panel.style.borderRadius = "12px";
  panel.style.border = "1px solid rgba(255,255,255,0.18)";
  panel.style.background = "rgba(25, 20, 40, 0.9)";
  panel.style.color = "white";
  panel.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

  const title = document.createElement("div");
  title.textContent = "Fullscreen needed";
  title.style.fontSize = "18px";
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";

  const message = document.createElement("div");
  message.id = "fullscreen-required-message";
  message.textContent = "This game works best in fullscreen. Tap “Enter fullscreen” to continue.";
  message.style.opacity = "0.9";
  message.style.marginBottom = "14px";
  message.style.lineHeight = "1.35";

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.justifyContent = "flex-end";

  const enterBtn = document.createElement("button");
  enterBtn.type = "button";
  enterBtn.textContent = "Enter fullscreen";
  enterBtn.dataset.role = "fullscreen-enter";
  enterBtn.style.background = "#007c9d";
  enterBtn.style.color = "white";
  enterBtn.style.border = "none";
  enterBtn.style.padding = "10px 14px";
  enterBtn.style.borderRadius = "8px";
  enterBtn.style.cursor = "pointer";
  enterBtn.style.fontWeight = "700";

  const exitBtn = document.createElement("button");
  exitBtn.type = "button";
  exitBtn.textContent = "Exit game";
  exitBtn.dataset.role = "fullscreen-exit";
  exitBtn.style.background = "rgba(255,255,255,0.08)";
  exitBtn.style.color = "white";
  exitBtn.style.border = "1px solid rgba(255,255,255,0.18)";
  exitBtn.style.padding = "10px 14px";
  exitBtn.style.borderRadius = "8px";
  exitBtn.style.cursor = "pointer";

  enterBtn.addEventListener("click", async () => {
    const msgEl = overlay.querySelector("#fullscreen-required-message") as HTMLDivElement | null;
    msgEl && (msgEl.textContent = "Requesting fullscreen…");

    await enterFullscreenBestEffort();

    // Give the browser a moment to update fullscreen state.
    setTimeout(() => {
      if (getFullscreenElement()) {
        overlay.style.display = "none";
        fullscreenGateOpen = false;
        if (fullscreenOverlayOnSuccess) {
          fullscreenOverlayOnSuccess();
          return;
        }
        if (fullscreenOverlayMode === "game") {
          stateVariables.gamePaused = false;
          resumeGameTimerIfPaused();
          requestAnimationFrame(draw);
        }
        return;
      }
      if (msgEl) {
        msgEl.textContent =
          "Fullscreen is required to play. Please allow fullscreen, then tap “Enter fullscreen” again.";
      }
    }, 150);
  });

  exitBtn.addEventListener("click", () => {
    overlay.style.display = "none";
    fullscreenGateOpen = false;
    if (fullscreenOverlayOnCancel) {
      fullscreenOverlayOnCancel();
    } else if (fullscreenOverlayMode === "game") {
      void exitGameToHub();
    }
  });

  actions.append(exitBtn, enterBtn);
  panel.append(title, message, actions);
  overlay.append(panel);
  document.body.append(overlay);

  fullscreenRequiredOverlay = overlay;
  return overlay;
}

function showFullscreenRequiredOverlay(opts: {
  mode: "game" | "hub";
  message: string;
  exitLabel: string;
  enterLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  if (getFullscreenElement()) return;
  if (fullscreenGateOpen) return;

  fullscreenOverlayMode = opts.mode;
  fullscreenOverlayOnSuccess = opts.onSuccess ?? null;
  fullscreenOverlayOnCancel = opts.onCancel ?? null;

  fullscreenGateOpen = true;
  if (opts.mode === "game") {
    stateVariables.gamePaused = true;
    pauseGameTimerIfRunning();
  }

  const overlay = getOrCreateFullscreenRequiredOverlay();
  const enterBtn = overlay.querySelector('[data-role="fullscreen-enter"]') as HTMLButtonElement | null;
  const exitBtn = overlay.querySelector('[data-role="fullscreen-exit"]') as HTMLButtonElement | null;
  const msgEl = overlay.querySelector("#fullscreen-required-message") as HTMLDivElement | null;
  if (enterBtn) enterBtn.textContent = opts.enterLabel;
  if (exitBtn) {
    exitBtn.textContent = opts.exitLabel;
    exitBtn.style.display = opts.exitLabel ? "" : "none";
  }
  if (msgEl) msgEl.textContent = opts.message;
  overlay.style.display = "flex";
}

function ensureFullscreenOrShowRequirementForGame() {
  if (!isGameVisible()) return;
  if (stateVariables.gameOverShown) return;
  showFullscreenRequiredOverlay({
    mode: "game",
    message: "Fullscreen is required to play. Tap “Enter fullscreen” to continue.",
    enterLabel: "Enter fullscreen",
    exitLabel: "Exit game",
    onCancel: () => {
      void exitGameToHub();
    },
  });
}

let visibilityExitPromptPending = false;
function isGameVisible() {
  return window.getComputedStyle(canvas).display !== "none";
}

function resetGameState() {
  stateVariables.gamePaused = true;
  stateVariables.gameOverShown = false;
  stateVariables.gameState = GameState.running;

  stateVariables.endTimeMs = 0;
  stateVariables.timerPausedAtMs = null;
  stateVariables.interactions = [];
  stateVariables.completedNpcKeys.clear();
  stateVariables.pendingFeedbackNpcKey = null;

  stateVariables.npcs = [];
  stateVariables.clockPickups = [];
  stateVariables.activeNpcIndex = -1;

  stateVariables.dialogueVisibleText = "";
  stateVariables.dialogueTargetText = "";
  stateVariables.dialogueLastNpcIndex = -1;
  stateVariables.dialogueLastStepMs = 0;
  stateVariables.dialogueOptionsRevealAtMs = 0;
  stateVariables.dialogueHoveredOptionIndex = -1;
  stateVariables.dialogueSelectedOptionIndex = -1;
  stateVariables.dialogueSelectionStartedMs = 0;
  stateVariables.dialogueSelectionNpcIndex = -1;
  stateVariables.dialogueSuppressedNpcIndex = -1;
  stateVariables.dialogueDismissNpcIndex = -1;
  stateVariables.dialoguePanelNpcIndex = -1;
  stateVariables.dialoguePanelAnim = 0;
  stateVariables.dialoguePanelTarget = 0;
  stateVariables.dialoguePanelLastMs = 0;
  stateVariables.dialogueThankYouNpcIndex = -1;
  stateVariables.dialogueThankYouStartedMs = 0;
  stateVariables.dialogueThankYouOptionIndex = -1;
  stateVariables.dialogueThankYouText = "";
  stateVariables.dialogueThankYouPendingNpcIndex = -1;
  stateVariables.dialogueThankYouPendingOptionIndex = -1;
  stateVariables.dialogueThankYouPendingText = "";
  stateVariables.dialogueForceCloseNpcIndex = -1;

  stateVariables.mouseClicked = false;
  stateVariables.isClickMoving = false;
  stateVariables.clickIndicatorStartMs = 0;
  stateVariables.isHoldingMeditationKey = false;
  stateVariables.meditationStart = null;
  stateVariables.meditationZoomLevel = 1;
  stateVariables.keyState = {};

  stateVariables.currentSessionId = null;
  stateVariables.gameQuestions = [];
  stateVariables.sessionPrefetchPromise = null;

  stateVariables.player = {} as any;
  stateVariables.bgImage = {} as any;
  stateVariables.lantern = {} as any;
  stateVariables.ui = {} as any;
}

async function stopSessionBestEffort(status: "ABANDONED" | "COMPLETED") {
  if (!stateVariables.currentSessionId) return;
  if (status !== "COMPLETED") return;
  const id = stateVariables.currentSessionId;
  GameApi.endSession(id).catch((err) => console.error("Failed to end session:", err));
}

async function exitGameToHub() {
  stateVariables.gamePaused = true;
  canvas.style.display = "none";
  await exitFullscreenBestEffort();
  if (stateVariables.currentSessionId && stateVariables.gameState !== GameState.finished) {
    await stopSessionBestEffort("ABANDONED");
  }
  resetGameState();
  slideTo(renderHub);
}

document.addEventListener("visibilitychange", () => {
  if (!isGameVisible()) return;
  if (stateVariables.gameOverShown) return;

  if (document.hidden) {
    // User minimized / switched away; pause and ask when they return.
    if (!stateVariables.gamePaused) {
      stateVariables.gamePaused = true;
      pauseGameTimerIfRunning();
    }
    visibilityExitPromptPending = true;
    return;
  }

  if (!visibilityExitPromptPending) return;
  visibilityExitPromptPending = false;
  // Resume gameplay when the user returns.
  stateVariables.gamePaused = false;
  resumeGameTimerIfPaused();
  void enterFullscreenBestEffort();
  setTimeout(() => ensureFullscreenOrShowRequirementForGame(), 0);
  requestAnimationFrame(draw);
});

function onFullscreenExited() {
  if (getFullscreenElement()) return;
  if (!isGameVisible()) return;
  if (stateVariables.gameOverShown) return;

  ensureFullscreenOrShowRequirementForGame();
}

document.addEventListener("fullscreenchange", onFullscreenExited);
document.addEventListener("webkitfullscreenchange" as any, onFullscreenExited);

window.addEventListener("beforeunload", (e) => {
  // User is closing the tab/window or navigating away.
  if (!isGameVisible()) return;
  if (stateVariables.gameOverShown) return;

  stateVariables.gamePaused = true;
  pauseGameTimerIfRunning();

  // Trigger browser-native "Leave site?" confirmation dialog.
  e.preventDefault();
  (e as any).returnValue = "";
  return "";
});

window.addEventListener("focus", () => {
  // If the user cancels the tab-close/navigation prompt, resume the timer and attempt fullscreen again.
  if (!isGameVisible()) return;
  if (stateVariables.gameOverShown) return;
  if (fullscreenGateOpen) return;
  if (visibilityExitPromptPending) return; // handled by visibilitychange -> promptExitOrResume()

  if (stateVariables.gamePaused) {
    stateVariables.gamePaused = false;
    resumeGameTimerIfPaused();
    void enterFullscreenBestEffort();
    setTimeout(() => ensureFullscreenOrShowRequirementForGame(), 0);
    requestAnimationFrame(draw);
  }
});

function openGameOverOverlay() {
  stateVariables.gamePaused = true;
  stateVariables.gameOverShown = true;

  if (stateVariables.currentSessionId) {
    GameApi.endSession(stateVariables.currentSessionId).catch((err) =>
      console.error("Failed to end session:", err)
    );
  }

  showGameOverOverlay({
    appRoot,
    canvas,
    score: stateVariables.player.score,
    interactions: stateVariables.interactions,
    avatarId: stateVariables.selectedAvatarId,
    onReplay: () => {
      stateVariables.interactions = [];
      stateVariables.gamePaused = false;
      stateVariables.gameOverShown = false;
      stateVariables.gameState = GameState.running;
      void enterFullscreenBestEffort();
      initializeGame();
      requestAnimationFrame(draw);
    },
    onDashboard: () => {
      void exitGameToHub();
    },
  });
}

function draw() {
  if (stateVariables.gamePaused) return;

  if (!stateVariables.bgImage || !stateVariables.bgImage.show || !stateVariables.player || !stateVariables.player.show) {
    console.warn("Draw called before initialization finished, skipping frame.");
    requestAnimationFrame(draw);
    return;
  }

  adjustCanvasSize();
  const ctx = stateVariables.ctx;

  // Original clear
  ctx.clearRect(0, 0, stateVariables.windowWidth, stateVariables.windowHeight);

  // Meditation zoom was original, but and it was applied to the whole context
  ctx.save();
  const targetZoom = (stateVariables.isHoldingMeditationKey && stateVariables.meditationStart != null) ? 0.75 : 1.0;
  stateVariables.meditationZoomLevel += (targetZoom - stateVariables.meditationZoomLevel) * 0.05;

  const cx = stateVariables.windowWidth / 2;
  const cy = stateVariables.windowHeight / 2;
  ctx.translate(cx, cy);
  ctx.scale(stateVariables.meditationZoomLevel, stateVariables.meditationZoomLevel);
  ctx.translate(-cx, -cy);

  stateVariables.bgImage.show();

  // Debug bit
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 2, 2);

  stateVariables.player.show();
  stateVariables.lantern.show();

  stateVariables.npcs.forEach((npc) => npc.show());
  stateVariables.clockPickups.forEach((pickup) => pickup.show());

  stateVariables.lantern.showLuminosity();

  ctx.restore(); // END MEDITATION ZOOM

  // Render UI and Indicators in original physical space
  stateVariables.ui.show();
  drawChannelledAnimation();
  drawClickIndicator();
  drawCursorImage();

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
  if (remainingMs <= 0) {
    stateVariables.gameState = GameState.finished;
  }

  if (stateVariables.gameState === GameState.finished) {
    if (!stateVariables.gameOverShown) {
      openGameOverOverlay();
    }
    return;
  }

  stateVariables.mouseClicked = false;
  requestAnimationFrame(draw);
}

renderLoader();
