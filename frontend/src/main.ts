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
      <div class="onboard-content">
        <div class="loader">
          <div class="loader-title">MINDTRAIL</div>
          <div class="loader-tagline">Move through everyday moments • Notice what unfolds.</div>
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
  ]).then(() => {
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
            <div class="modal-text">
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

  appRoot.innerHTML = `
    <div class="onboard onboard--popin">
      <div class="sound">
        <div>Sound</div>
        <button class="switch" type="button" data-role="sound-switch" data-on="${stateVariables.soundEnabled ? "true" : "false"}"></button>
      </div>
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--center">
        <div class="modal hub">
          <div class="modal-inner">
            <div class="modal-title">THE SPACE IS YOURS.</div>
            <div class="hub-grid">
              <div>
                <div class="hub-menu">
                  <div class="hub-link"><span>CONTROL</span><span class="arrow">↗</span></div>
                  <div class="hub-link"><span>ABOUT US</span><span class="arrow">↗</span></div>
                  <div class="hub-link"><span>YOUR PROGRESS</span><span class="arrow">↗</span></div>
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
            <button class="primary-btn" data-action="hub-enter">GET STARTED</button>
          </div>
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
            <div class="form">
              <div>
                <label>What should we call you?</label>
                <input data-field="name" placeholder="Your name (optional)" />
                <div class="error" data-error="name" style="display:none;"></div>
              </div>
              <div>
                <label>Your age</label>
                <input data-field="age" placeholder="Age (optional)" inputmode="numeric" />
                <div class="error" data-error="age" style="display:none;"></div>
              </div>
              <div>
                <label>Gender</label>
                <div class="form-grid" data-group="gender">
                  <button class="pill" type="button" data-value="Male">Male</button>
                  <button class="pill" type="button" data-value="Female">Female</button>
                  <button class="pill" type="button" data-value="Non-binary">Non-binary</button>
                  <button class="pill" type="button" data-value="Prefer not to say">Prefer not to say</button>
                </div>
                <div class="error" data-error="gender" style="display:none;"></div>
              </div>
              <div>
                <label>What do you do?</label>
                <div class="form-grid" data-group="occupation">
                  <button class="pill" type="button" data-value="Student">Student</button>
                  <button class="pill" type="button" data-value="Working Professional">Working Professional</button>
                  <button class="pill" type="button" data-value="Self-Employed">Self-Employed</button>
                  <button class="pill" type="button" data-value="Others">Others</button>
                </div>
                <div class="error" data-error="occupation" style="display:none;"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" data-action="register-continue" disabled>CONTINUE</button>
            <button class="secondary-btn" data-action="go-login" type="button">ALREADY REGISTERED? LOGIN</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const nameInput = appRoot.querySelector('[data-field="name"]') as HTMLInputElement | null;
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
    const ageRaw = (ageInput?.value ?? "").trim();

    const nameOk = name.length === 0 || name.length >= 2;
    const ageOk =
      ageRaw.length === 0 ||
      (/^[0-9]{1,3}$/.test(ageRaw) && Number(ageRaw) >= 6 && Number(ageRaw) <= 120);

    const genderOk = stateVariables.playerProfile.gender.length > 0;
    const occupationOk = stateVariables.playerProfile.occupation.length > 0;

    if (showErrors) {
      setError("name", nameOk ? null : "Name must be at least 2 characters (or leave it empty).");
      setError("age", ageOk ? null : "Age must be a number between 6 and 120 (or leave it empty).");
      setError("gender", genderOk ? null : "Please choose a gender option.");
      setError("occupation", occupationOk ? null : "Please choose what you do.");
      if (nameInput) nameInput.setAttribute("aria-invalid", nameOk ? "false" : "true");
      if (ageInput) ageInput.setAttribute("aria-invalid", ageOk ? "false" : "true");
    } else {
      if (nameInput) nameInput.setAttribute("aria-invalid", "false");
      if (ageInput) ageInput.setAttribute("aria-invalid", "false");
    }

    return nameOk && ageOk && genderOk && occupationOk;
  };

  const refreshContinue = () => {
    if (!continueButton) return;
    continueButton.disabled = !validate(false);
  };

  const wireChipGroup = (group: "gender" | "occupation") => {
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
        if (group === "occupation") stateVariables.playerProfile.occupation = value;
        if (group === "gender") setError("gender", null);
        if (group === "occupation") setError("occupation", null);
        refreshContinue();
      });
    });
  };

  wireChipGroup("gender");
  wireChipGroup("occupation");

  nameInput?.addEventListener("input", () => {
    setError("name", null);
    refreshContinue();
  });
  ageInput?.addEventListener("input", () => {
    setError("age", null);
    refreshContinue();
  });

  refreshContinue();

  appRoot.querySelector('[data-action="go-login"]')?.addEventListener("click", () => {
    slideTo(renderLogin);
  });

  appRoot.querySelector('[data-action="register-continue"]')?.addEventListener("click", () => {
    if (!validate(true)) return;
    const name = nameInput?.value ?? "";
    const age = ageInput?.value ?? "";
    stateVariables.playerProfile.name = name.trim();
    stateVariables.playerProfile.age = age.trim();
    slideTo(renderHub);
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
            <div class="modal-title">LOGIN</div>
            <div class="form">
              <div>
                <label  class="normal-text">Your name</label>
                <input data-field="login-name" placeholder="Enter your name" />
                <div class="error" data-error="login" style="display:none;"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" data-action="login-continue">LOGIN</button>
            <button class="secondary-btn" data-action="back-register" type="button">BACK TO REGISTER</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const loginInput = appRoot.querySelector('[data-field="login-name"]') as HTMLInputElement | null;
  const loginError = appRoot.querySelector('[data-error="login"]') as HTMLDivElement | null;

  const setLoginError = (message: string | null) => {
    if (!loginError) return;
    if (!message) {
      loginError.textContent = "";
      loginError.style.display = "none";
    } else {
      loginError.textContent = message;
      loginError.style.display = "block";
    }
  };

  appRoot.querySelector('[data-action="back-register"]')?.addEventListener("click", () => {
    slideTo(renderRegister);
  });

  appRoot.querySelector('[data-action="login-continue"]')?.addEventListener("click", () => {
    const name = (loginInput?.value ?? "").trim();
    if (name.length < 2) {
      setLoginError("Please enter at least 2 characters.");
      return;
    }
    stateVariables.playerProfile.name = name;
    setLoginError(null);
    slideTo(renderHub);
  });
}

let gameStarted = false;
function startGame() {
  if (gameStarted) return;
  gameStarted = true;
  stopAvatarAnimation();
  appRoot.style.display = "none";
  canvas.style.display = "block";
  initializeGame();
  requestAnimationFrame(draw);
}

function draw() {
  adjustCanvasSize();
  stateVariables.ctx.imageSmoothingEnabled = false;

  stateVariables.bgImage.show();
  drawClickIndicator();

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
  drawCursorImage();
  stateVariables.mouseClicked = false;

  if (remainingMs <= 0) {
    stateVariables.gameState = GameState.finished;
  }

  if (stateVariables.gameState === GameState.finished) {
    stateVariables.ui.renderGameOver();
  }

  requestAnimationFrame(draw);
}

renderLoader();
