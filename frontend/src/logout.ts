import { GameState, stateVariables } from "./stateVariables";

type LogoutDeps = {
  canvas: HTMLCanvasElement;
  exitFullscreenBestEffort: () => Promise<void>;
  stopSessionBestEffort: (status: "ABANDONED" | "COMPLETED") => Promise<void>;
  resetGameState: () => void;
  navigateToLogin: () => void;
};

function clearPlayerProfile() {
  stateVariables.playerProfile.name = "";
  stateVariables.playerProfile.age = "";
  stateVariables.playerProfile.gender = "";
  stateVariables.playerProfile.environment = "";
}

function clearClientStorageOnLogout() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("mindtrail:")) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (err) {
    console.warn("Failed to clear localStorage:", err);
  }

  try {
    window.sessionStorage.clear();
  } catch (err) {
    console.warn("Failed to clear sessionStorage:", err);
  }
}

export async function logoutToLogin(deps: LogoutDeps) {
  const { canvas, exitFullscreenBestEffort, stopSessionBestEffort, resetGameState, navigateToLogin } =
    deps;

  stateVariables.gamePaused = true;
  canvas.style.display = "none";
  await exitFullscreenBestEffort();

  if (stateVariables.currentSessionId && stateVariables.gameState !== GameState.finished) {
    await stopSessionBestEffort("ABANDONED");
  }

  resetGameState();
  clearPlayerProfile();
  stateVariables.soundEnabled = true;
  clearClientStorageOnLogout();
  navigateToLogin();
}

