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

/**
 * One transparent layer takes all pointer input and hands it to the charm under the cursor.
 * The per-charm canvases overlap (they are wider than their charms), so letting them take
 * events directly made the topmost canvas swallow clicks meant for its neighbours.
 */
const inputLayer = document.createElement("div");
inputLayer.style.cssText = "position:fixed;inset:0;z-index:10;touch-action:none;";
document.body.appendChild(inputLayer);
let activeSlot: Slot | null = null;

inputLayer.addEventListener("pointerdown", (e) => {
  const hit = [...slots].reverse().find((slot) => slot.stage.hits(e));
  if (!hit) return;
  activeSlot = hit;
  hit.stage.onPointerDown(e);
});
const forward = (e: PointerEvent) => {
  if (activeSlot) activeSlot.stage.onPointerMove(e);
};
const finish = (e: PointerEvent) => {
  if (!activeSlot) return;
  activeSlot.stage.onPointerUp(e);
  if (!activeSlot.stage.isDragging) activeSlot = null;
};
inputLayer.addEventListener("pointermove", forward);
inputLayer.addEventListener("pointerup", finish);
inputLayer.addEventListener("pointercancel", finish);
inputLayer.addEventListener("lostpointercapture", finish);
let geometry: OverlayGeometry | null = null;
let systemIdle = false;
let trayName = "";
let lastBucket: number | null = null;

function stageWidth(): number {
  const s = settingsStore.get();
  const size = SIZES[s.size];
  const k = s.charmScale;
  const rope = size.rope * s.threadLength * Math.min(1.25, Math.max(0.8, k));
  const stack = s.hangMode === "stacked" ? s.extraSlots.length * (size.charm * k * 1.25 + 20) : 0;
  return Math.round(2 * (rope * 1.15 + size.charm * k + stack) + 80);
}

/** One entry per string. In stacked mode every charm shares the main string. */
function slotAnchors(): { charmId: string; anchorX: number; stack: string[] }[] {
  const s = settingsStore.get();
  if (s.hangMode === "stacked") {
    return [{ charmId: s.activeCharmId, anchorX: s.anchorX, stack: s.extraSlots.map((x) => x.charmId) }];
  }
  return [
    { charmId: s.activeCharmId, anchorX: s.anchorX, stack: [] },
    ...s.extraSlots.map((x) => ({ ...x, stack: [] })),
  ];
}

function createSlot(index: number): Slot {
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const slot: Slot = {
    canvas,
    left: 0,
    width: 0,
    stage: new CharmStage(canvas, {
      onHitbox: (hits) =>
        void backend.overlayHitbox(
          index,
          hits.map((h) => ({ x: h.x + slot.left, y: h.y, r: h.r })),
        ),
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
      externalInput: inputLayer,
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
    const drop = Math.round(settingsStore.get().anchorY * g.displayHeight);
    slot.stage.setViewport(width, g.height, anchorGlobal - left, drop);
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
    void backend.overlayHitbox(slots.length, []);
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
    const stack = spec.stack.map((id) => findCharm(charms, id));
    void stage.configure({ ...stageConfigFor(settings, charm), stack });
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

// The charms are objects, not a web page: no browser context menu on right-click.
window.addEventListener("contextmenu", (e) => e.preventDefault());

async function main() {
  await events.geometry((next) => {
    const prev = geometry;
    geometry = next;
    layoutSlots(prev);
  });
  await events.hover((index) =>
    {
      // Others first, so the hovered charm's cursor is the one left on the shared layer.
      slots.forEach((slot, i) => i !== index && slot.stage.setHover(false));
      if (index !== null && slots[index]) slots[index].stage.setHover(true);
    },
  );
  await events.poke(({ slot, body, vx, vy }) => slots[slot]?.stage.poke(body, vx, vy));
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
