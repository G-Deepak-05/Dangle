import { FALLBACK_CHARM_ID } from "../charms/builtin";
import { CharmStage } from "../engine/stage";
import { backend, events, type OverlayGeometry } from "../ipc/backend";
import { SIZES } from "../physics/profiles";
import { pickForBucket, rotationBucket, rotationPool } from "../state/rotation";
import {
  charmsStore,
  findCharm,
  settingsStore,
  stageConfigFor,
  startStores,
  updateSettings,
} from "../state/stores";

/** One hanging charm: its own canvas, string, and spot along the top of the screen. */
interface Slot {
  canvas: HTMLCanvasElement;
  stage: CharmStage;
  left: number;
  width: number;
}

const slots: Slot[] = [];
let geometry: OverlayGeometry | null = null;
let systemIdle = false;
let trayName = "";
let lastBucket: number | null = null;

function stageWidth(): number {
  const s = settingsStore.get();
  const size = SIZES[s.size];
  const rope = size.rope * s.threadLength;
  return Math.round(2 * (rope * 1.15 + size.charm) + 80);
}

function slotAnchors(): { charmId: string; anchorX: number }[] {
  const s = settingsStore.get();
  return [{ charmId: s.activeCharmId, anchorX: s.anchorX }, ...s.extraSlots];
}

function createSlot(index: number): Slot {
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  document.body.appendChild(canvas);
  const slot: Slot = {
    canvas,
    left: 0,
    width: 0,
    stage: new CharmStage(canvas, {
      onHitbox: (hb) =>
        void backend.overlayHitbox(index, hb ? { x: hb.x + slot.left, y: hb.y, r: hb.r } : null),
      onDragChange: (dragging) => void backend.overlayDrag(dragging),
      onReelChange: (reeling) => void backend.overlayReel(reeling),
      onThreadLengthCommit: (threadLength) => void updateSettings({ threadLength }),
      onClick: (charm) => {
        if (charm.launch) void backend.launchCharm(charm.id).catch(() => undefined);
      },
      onCharmError: (charm) => {
        if (index === 0 && charm.id !== FALLBACK_CHARM_ID) {
          void updateSettings({ activeCharmId: FALLBACK_CHARM_ID });
        }
      },
      breeze: true,
    }),
  };
  return slot;
}

/** Places each slot's canvas around its anchor; moving one keeps it still on screen first. */
function layoutSlots(prevGeometry: OverlayGeometry | null) {
  if (!geometry) return;
  const g = geometry;
  const width = Math.min(stageWidth(), g.width);
  slotAnchors().forEach((spec, i) => {
    const slot = slots[i];
    if (!slot) return;
    const anchorGlobal = Math.min(g.width - 24, Math.max(24, spec.anchorX * g.width));
    const left = Math.round(Math.min(g.width - width, Math.max(0, anchorGlobal - width / 2)));
    const prevLeft = slot.left;
    const hadLayout = slot.width > 0;
    slot.left = left;
    slot.width = width;
    slot.canvas.style.left = `${left}px`;
    slot.stage.setViewport(width, g.height, anchorGlobal - left, 0);
    if (hadLayout && (!prevGeometry || prevGeometry.displayId === g.displayId)) {
      const shiftX = prevLeft - left + (prevGeometry ? prevGeometry.globalLeft - g.globalLeft : 0);
      const shiftY = prevGeometry ? prevGeometry.globalTop - g.globalTop : 0;
      if (Math.abs(shiftX) < 2000) slot.stage.translate(shiftX, shiftY);
    }
  });
}

function syncSlotCount() {
  const wanted = slotAnchors().length;
  while (slots.length < wanted) slots.push(createSlot(slots.length));
  while (slots.length > wanted) {
    const slot = slots.pop()!;
    slot.stage.destroy();
    slot.canvas.remove();
    void backend.overlayHitbox(slots.length, null);
  }
}

function applySettings() {
  const settings = settingsStore.get();
  const charms = charmsStore.get();
  syncSlotCount();
  layoutSlots(geometry);
  const debug = import.meta.env.DEV && settings.debugOverlay;
  slotAnchors().forEach((spec, i) => {
    const charm = findCharm(charms, spec.charmId);
    if (!charm) return;
    const stage = slots[i].stage;
    void stage.configure(stageConfigFor(settings, charm));
    stage.setPaused(settings.paused);
    stage.setBreeze(!(settings.pauseWhenInactive && systemIdle));
    stage.setDebug(debug && i === 0);
  });
  const primary = findCharm(charms, settings.activeCharmId);
  if (primary && primary.name !== trayName) {
    trayName = primary.name;
    void backend.setTrayCharm(primary.name);
  }
  rotateIfDue();
}

/** Swaps the main charm when the hour or day ticks over, without overriding manual picks in between. */
function rotateIfDue() {
  const settings = settingsStore.get();
  const bucket = rotationBucket(settings.rotate, new Date());
  if (bucket === null) {
    lastBucket = null;
    return;
  }
  if (bucket === lastBucket) return;
  lastBucket = bucket;
  const next = pickForBucket(rotationPool(settings, charmsStore.get()), bucket, settings.activeCharmId);
  if (next && next.id !== settings.activeCharmId) void updateSettings({ activeCharmId: next.id });
}

async function main() {
  await events.geometry((next) => {
    const prev = geometry;
    geometry = next;
    layoutSlots(prev);
  });
  await events.hover((index) => slots.forEach((slot, i) => slot.stage.setHover(i === index)));
  await events.systemIdle((idle) => {
    systemIdle = idle;
    applySettings();
  });
  settingsStore.subscribe(applySettings);
  charmsStore.subscribe(applySettings);
  await startStores();
  geometry = await backend.overlayGeometry();
  applySettings();
  window.setInterval(rotateIfDue, 60_000);
}

void main();
