import { FALLBACK_CHARM_ID } from "../charms/builtin";
import { CharmStage } from "../engine/stage";
import { backend, events, type OverlayGeometry } from "../ipc/backend";
import {
  charmsStore,
  findCharm,
  settingsStore,
  stageConfigFor,
  startStores,
  updateSettings,
} from "../state/stores";

const canvas = document.getElementById("stage") as HTMLCanvasElement;

const stage = new CharmStage(canvas, {
  onHitbox: (hitbox) => void backend.overlayHitbox(hitbox),
  onDragChange: (dragging) => void backend.overlayDrag(dragging),
  onReelChange: (reeling) => void backend.overlayReel(reeling),
  onThreadLengthCommit: (threadLength) => void updateSettings({ threadLength }),
  onCharmError: (charm) => {
    if (charm.id !== FALLBACK_CHARM_ID) void updateSettings({ activeCharmId: FALLBACK_CHARM_ID });
  },
  breeze: true,
});

let geometry: OverlayGeometry | null = null;
let systemIdle = false;
let trayName = "";

function applyGeometry(next: OverlayGeometry) {
  const prev = geometry;
  geometry = next;
  stage.setViewport(next.width, next.height, next.anchorX, 0);
  if (prev && prev.displayId === next.displayId) {
    // Keep the charm where it was on screen so the string visibly pulls it to the new spot.
    const prevLeft = prev.globalAnchorX - prev.anchorX;
    const nextLeft = next.globalAnchorX - next.anchorX;
    stage.translate(prevLeft - nextLeft, prev.globalTop - next.globalTop);
  }
}

function applySettings() {
  const settings = settingsStore.get();
  const charm = findCharm(charmsStore.get(), settings.activeCharmId);
  if (!charm) return;
  void stage.configure(stageConfigFor(settings, charm));
  stage.setPaused(settings.paused);
  stage.setBreeze(!(settings.pauseWhenInactive && systemIdle));
  stage.setDebug(import.meta.env.DEV && settings.debugOverlay);
  if (charm.name !== trayName) {
    trayName = charm.name;
    void backend.setTrayCharm(charm.name);
  }
}

async function main() {
  await events.geometry(applyGeometry);
  await events.hover((over) => stage.setHover(over));
  await events.systemIdle((idle) => {
    systemIdle = idle;
    applySettings();
  });
  settingsStore.subscribe(applySettings);
  charmsStore.subscribe(applySettings);
  await startStores();
  const initial = await backend.overlayGeometry();
  if (initial) applyGeometry(initial);
  applySettings();
}

void main();
