import { Assets } from './../public/assets/index';
import "./style.css";
import "./controls";
import {
  adjustCanvasSize,
  drawChannelledAnimation,
  drawClickIndicator,
  drawCursorImage,
  initializeGame,
} from "./functions";
import { handleMovementControls, handleOtherControls } from "./controls";
import { GameState, stateVariables } from "./stateVariables";
import { showGameOverOverlay } from "./gameOverOverlay";
import { ApiService, getAuthToken, setAuthToken, clearAuthToken } from "./services/api";

type AvatarOption = {
  id: string;
  label: string;
  previewSrc: string;
};

function avatarFrontFrameSrc(avatarId: string, frameIndex1Based: number) {
  return `/assets/character/images/characters/${avatarId}/front/front (${frameIndex1Based}).png`;
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

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
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

let avatarIndex = 0;
stateVariables.selectedAvatarId = avatars[avatarIndex]?.id ?? "Ophelia";

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
        const body = await withTimeout(ApiService.getMe(), 1200);
        if (body.success && body.data && body.data.user) {
          stateVariables.playerProfile.name = body.data.user.name || "";
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

  const avatar = avatars[avatarIndex] ?? avatars[0];
  const soundKey = "mindtrail:soundEnabled";
  const stored = window.localStorage.getItem(soundKey);
  if (stored === "true" || stored === "false") {
    stateVariables.soundEnabled = stored === "true";
  }

  const controlsSrc = `${import.meta.env.BASE_URL}assets/controls.png`;

  appRoot.innerHTML = `
    <div class="onboard onboard--popin">
      <div class="sound">
        <div>Sound</div>
        <button class="switch" type="button" data-role="sound-switch" data-on="${stateVariables.soundEnabled ? "true" : "false"}"></button>
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
                      <div class="hub-avatar">
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
                <div class="progress-box">TOTAL GAMES PLAYED: 12</div>
                <div class="progress-box">TOTAL INTERACTION SCORE: 30</div>
                <div class="progress-footer">
                  <div>Thanks for playing!</div>
                  <div>Hope you had a great time—see you again on the trail 🌿</div>
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

  const hubAvatarImg = appRoot.querySelector('[data-role="hub-avatar-img"]') as HTMLImageElement | null;
  if (hubAvatarImg) startAvatarAnimation(hubAvatarImg, avatar.id);

  const updateAvatar = () => {
    const next = avatars[avatarIndex] ?? avatars[0];
    stateVariables.selectedAvatarId = next.id;
    const img = appRoot.querySelector('[data-role="hub-avatar-img"]') as HTMLImageElement | null;
    const name = appRoot.querySelector('[data-role="hub-avatar-name"]') as HTMLDivElement | null;
    if (img) img.src = next.previewSrc;
    if (name) name.textContent = next.label;
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
    slideTo(startGame);
  });

  const hubStage = appRoot.querySelector('[data-state]') as HTMLDivElement | null;
  const aboutPanel = appRoot.querySelector('[data-role="hub-about-panel"]') as HTMLDivElement | null;
  const controlsPanel = appRoot.querySelector('[data-role="hub-controls-panel"]') as HTMLDivElement | null;
  const progressPanel = appRoot.querySelector('[data-role="hub-progress-panel"]') as HTMLDivElement | null;

  const setPanelState = (state: "hub" | "about" | "controls" | "progress") => {
    if (!hubStage) return;
    hubStage.dataset.state = state;
    aboutPanel?.setAttribute("aria-hidden", state === "about" ? "false" : "true");
    controlsPanel?.setAttribute("aria-hidden", state === "controls" ? "false" : "true");
    progressPanel?.setAttribute("aria-hidden", state === "progress" ? "false" : "true");
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
                <input data-field="password" type="password" placeholder="Min 8 characters" />
                <div class="error" data-error="password" style="display:none;"></div>
              </div>
              <div>
                <label>Your age (optional)</label>
                <input data-field="age" placeholder="Age" inputmode="numeric" />
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
  const ageInput = appRoot.querySelector('[data-field="age"]') as HTMLInputElement | null;
  const continueButton = appRoot.querySelector('[data-action="register-continue"]') as HTMLButtonElement | null;

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
      ageRaw.length === 0 ||
      (/^[0-9]{1,3}$/.test(ageRaw) && Number(ageRaw) >= 6 && Number(ageRaw) <= 120);

    const genderOk = stateVariables.playerProfile.gender.length > 0;
    const environmentOk = stateVariables.playerProfile.environment.length > 0;

    if (showErrors) {
      setError("name", nameOk ? null : "Name must be at least 2 characters.");
      setError("email", emailOk ? null : "Please enter a valid email.");
      setError("password", passwordOk ? null : "Password must be at least 8 characters.");
      setError("age", ageOk ? null : "Age must be a valid number.");
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
      const regBody = await ApiService.register(email, password);
      const token = regBody.data?.tokens?.accessToken;
      if (token) {
        setAuthToken(token);
        const profileData: any = {
          gender: stateVariables.playerProfile.gender,
          environment: stateVariables.playerProfile.environment,
        };
        if (name) profileData.name = name;
        if (age) profileData.age = Number(age);

        try {
          await ApiService.updateMe(profileData);
          stateVariables.playerProfile.name = name;
          stateVariables.playerProfile.age = age;
          slideTo(renderHub);
          return;
        } catch (patchErr) {
          console.error("Profile update failed:", patchErr);
        }
      }
      slideTo(renderHub);
    } catch (err: any) {
      // Hackathon-friendly fallback: allow the user to continue even if backend is unreachable.
      console.error("Registration failed, continuing offline:", err);
      stateVariables.playerProfile.name = name;
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

  togglePasswordBtn?.addEventListener("click", () => {
    if (!passwordInput) return;
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";

    const eye = togglePasswordBtn.querySelector('[data-icon="eye"]') as HTMLElement | null;
    const eyeOff = togglePasswordBtn.querySelector('[data-icon="eye-off"]') as HTMLElement | null;

    if (eye) eye.style.display = isHidden ? "none" : "block";
    if (eyeOff) eyeOff.style.display = isHidden ? "block" : "none";
  });

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
      const body = await ApiService.login(email, password);
      const token = body.data?.tokens?.accessToken;
      if (token) {
        setAuthToken(token);

        // fetch user profile just like registration
        try {
          const uBody = await ApiService.getMe();
          if (uBody.success && uBody.data?.user) {
            stateVariables.playerProfile.name = uBody.data.user.name || "";
            stateVariables.playerProfile.age = uBody.data.user.age?.toString() || "";
            stateVariables.playerProfile.gender = uBody.data.user.gender || "";
            stateVariables.playerProfile.environment = uBody.data.user.environment || "";
          }
        } catch (profileErr) {
          console.error("Failed to fetch user profile", profileErr);
        }

        // slide to hub
        slideTo(renderHub);
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

function startGame() {
  if (!getAuthToken()) {
    slideTo(renderLogin);
    return;
  }
  stopAvatarAnimation();
  appRoot.style.display = "none";
  canvas.style.display = "block";
  stateVariables.interactions = [];
  stateVariables.gamePaused = false;
  stateVariables.gameOverShown = false;
  stateVariables.gameState = GameState.running;
  initializeGame();
  requestAnimationFrame(draw);
}

function openGameOverOverlay() {
  stateVariables.gamePaused = true;
  stateVariables.gameOverShown = true;

  const score = stateVariables.player?.score ?? 0;
  showGameOverOverlay({
    appRoot,
    canvas,
    score,
    interactions: stateVariables.interactions,
    avatarId: stateVariables.selectedAvatarId,
    onReplay: () => {
      stateVariables.interactions = [];
      stateVariables.gamePaused = false;
      stateVariables.gameOverShown = false;
      stateVariables.gameState = GameState.running;
      initializeGame();
      requestAnimationFrame(draw);
    },
    onDashboard: () => {
      stateVariables.gamePaused = true;
      slideTo(renderHub);
    },
  });
}

function draw() {
  if (stateVariables.gamePaused) {
    return;
  }

  adjustCanvasSize();
  stateVariables.ctx.imageSmoothingEnabled = false;

  stateVariables.ctx.save();
  const targetZoom = (stateVariables.isHoldingMeditationKey && stateVariables.meditationStart != null) ? 0.75 : 1.0;
  stateVariables.meditationZoomLevel += (targetZoom - stateVariables.meditationZoomLevel) * 0.05;

  const cx = stateVariables.windowWidth / 2;
  const cy = stateVariables.windowHeight / 2;
  stateVariables.ctx.translate(cx, cy);
  stateVariables.ctx.scale(stateVariables.meditationZoomLevel, stateVariables.meditationZoomLevel);
  stateVariables.ctx.translate(-cx, -cy);

  stateVariables.bgImage.show();
  drawClickIndicator();

  stateVariables.npcs.forEach((npc) => npc.show());
  stateVariables.clockPickups.forEach((clock) => clock.show());

  stateVariables.player.show();
  stateVariables.bgImage.showDepth();
  stateVariables.lantern.showLuminosity();
  stateVariables.lantern.changeLuminosity();

  stateVariables.ctx.restore();

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
  stateVariables.ui.renderStamina();
  stateVariables.ui.renderScore();
  stateVariables.ui.renderNpcHint();
  stateVariables.ui.renderDialogue();
  drawCursorImage();
  stateVariables.mouseClicked = false;

  if (remainingMs <= 0) {
    stateVariables.gameState = GameState.finished;
  }

  if (stateVariables.gameState === GameState.finished) {
    if (!stateVariables.gameOverShown) {
      openGameOverOverlay();
    }
    return;
  }

  requestAnimationFrame(draw);
}

renderLoader();
