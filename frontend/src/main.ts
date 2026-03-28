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

function renderLanding() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  const avatar = avatars[avatarIndex] ?? avatars[0];
  appRoot.innerHTML = `
    <div class="onboard">
      <div class="onboard-bg"></div>
      <div class="onboard-content onboard-content--landing">
        <div class="landing-center">
          <div class="title">MINDTRAIL</div>
          <div class="tagline">Move through everyday moments. Notice what unfolds.</div>
          <div class="btn-row btn-row--center">
            <button class="btn" data-action="landing-continue">Continue</button>
          </div>
        </div>
        <div class="landing-sprite">
          <img alt="Avatar" data-role="landing-sprite" src="${avatar.previewSrc}" />
        </div>
      </div>
    </div>
  `;

  const spriteImg = appRoot.querySelector('[data-role="landing-sprite"]') as HTMLImageElement | null;
  if (spriteImg) startAvatarAnimation(spriteImg, avatar.id);

  appRoot.querySelector('[data-action="landing-continue"]')?.addEventListener("click", () => {
    renderInfo();
  });
}

function renderInfo() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  const avatar = avatars[avatarIndex] ?? avatars[0];
  appRoot.innerHTML = `
    <div class="onboard">
      <div class="onboard-bg"></div>
      <div class="onboard-content">
        <div class="card">
          <h2>This world holds familiar situations.</h2>
          <div style="color: rgba(0,0,0,0.7); line-height: 1.5;">
            <div>You'll come across people, place and moments.</div>
            <div style="margin-top: 10px;">There’s no right or wrong ways to move through them.</div>
          </div>
          <div class="btn-row">
            <button class="btn" data-action="info-continue">Continue</button>
          </div>
        </div>
        <div class="avatar-pane">
          <div class="avatar-label">CHOOSE YOUR AVATAR</div>
          <div class="avatar-frame">
            <img alt="Avatar" data-role="avatar-img" src="${avatar.previewSrc}" />
          </div>
          <div class="arrow-row">
            <button class="arrow" data-action="avatar-prev" ${avatars.length <= 1 ? "disabled" : ""}>&lsaquo;</button>
            <div style="font-weight: 800; color: rgba(0,0,0,0.7);" data-role="avatar-label">${avatar.label}</div>
            <button class="arrow" data-action="avatar-next" ${avatars.length <= 1 ? "disabled" : ""}>&rsaquo;</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const updateAvatar = () => {
    const next = avatars[avatarIndex] ?? avatars[0];
    stateVariables.selectedAvatarId = next.id;
    const img = appRoot.querySelector('[data-role="avatar-img"]') as HTMLImageElement | null;
    const label = appRoot.querySelector('[data-role="avatar-label"]') as HTMLDivElement | null;
    if (img) img.src = next.previewSrc;
    if (label) label.textContent = next.label;
  };

  appRoot.querySelector('[data-action="avatar-prev"]')?.addEventListener("click", () => {
    avatarIndex = (avatarIndex - 1 + avatars.length) % avatars.length;
    updateAvatar();
  });
  appRoot.querySelector('[data-action="avatar-next"]')?.addEventListener("click", () => {
    avatarIndex = (avatarIndex + 1) % avatars.length;
    updateAvatar();
  });

  appRoot.querySelector('[data-action="info-continue"]')?.addEventListener("click", () => {
    renderRegister();
  });
}

function renderRegister() {
  stopAvatarAnimation();
  canvas.style.display = "none";
  appRoot.style.display = "block";
  const avatar = avatars[avatarIndex] ?? avatars[0];
  appRoot.innerHTML = `
    <div class="onboard">
      <div class="onboard-bg"></div>
      <div class="onboard-content">
        <div class="card">
          <h2>A FEW THINGS ABOUT YOU</h2>
          <div class="field">
            <label>What should we call you?</label>
            <input data-field="name" placeholder="Your name (optional)" />
          </div>
          <div class="field">
            <label>Your age</label>
            <input data-field="age" placeholder="Age (optional)" inputmode="numeric" />
          </div>
          <div style="margin-top: 12px; font-size: 12px; font-weight: 800; color: rgba(0,0,0,0.65);">Gender</div>
          <div class="chips" data-group="gender">
            <button class="chip" type="button" data-value="Male">Male</button>
            <button class="chip" type="button" data-value="Female">Female</button>
            <button class="chip" type="button" data-value="Non-binary">Non-binary</button>
            <button class="chip" type="button" data-value="Prefer not to say">Prefer not to say</button>
          </div>
          <div style="margin-top: 12px; font-size: 12px; font-weight: 800; color: rgba(0,0,0,0.65);">What do you do?</div>
          <div class="chips" data-group="occupation">
            <button class="chip" type="button" data-value="Student">Student</button>
            <button class="chip" type="button" data-value="Working Professional">Working Professional</button>
            <button class="chip" type="button" data-value="Self-Employed">Self-Employed</button>
            <button class="chip" type="button" data-value="Others">Others</button>
          </div>
          <div class="btn-row">
            <button class="btn" data-action="register-continue">Continue</button>
          </div>
        </div>
        <div class="avatar-pane">
          <div class="avatar-label">CHOOSE YOUR AVATAR</div>
          <div class="avatar-frame">
            <img alt="Avatar" src="${avatar.previewSrc}" />
          </div>
        </div>
      </div>
    </div>
  `;

  const wireChipGroup = (group: "gender" | "occupation") => {
    const container = appRoot.querySelector(`[data-group="${group}"]`) as HTMLDivElement | null;
    if (!container) return;
    container.querySelectorAll<HTMLButtonElement>(".chip").forEach((button) => {
      button.addEventListener("click", () => {
        container.querySelectorAll<HTMLButtonElement>(".chip").forEach((b) => {
          b.dataset.selected = "false";
        });
        button.dataset.selected = "true";
        const value = button.dataset.value ?? "";
        if (group === "gender") stateVariables.playerProfile.gender = value;
        if (group === "occupation") stateVariables.playerProfile.occupation = value;
      });
    });
  };

  wireChipGroup("gender");
  wireChipGroup("occupation");

  appRoot.querySelector('[data-action="register-continue"]')?.addEventListener("click", () => {
    const name = (appRoot.querySelector('[data-field="name"]') as HTMLInputElement | null)?.value ?? "";
    const age = (appRoot.querySelector('[data-field="age"]') as HTMLInputElement | null)?.value ?? "";
    stateVariables.playerProfile.name = name.trim();
    stateVariables.playerProfile.age = age.trim();
    startGame();
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

renderLanding();
