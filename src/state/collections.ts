import { MAX_EXTRA_SLOTS, type UserCollection } from "./settings";
import { charmsStore, settingsStore, updateSettings } from "./stores";

function newId() {
  return `uc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function setCollections(next: UserCollection[]) {
  return updateSettings({ userCollections: next });
}

export async function createCollection(name: string, charmIds: string[] = []): Promise<string> {
  const id = newId();
  const clean = name.trim().slice(0, 40) || "My collection";
  await setCollections([...settingsStore.get().userCollections, { id, name: clean, charmIds }]);
  return id;
}

export function renameCollection(id: string, name: string) {
  const clean = name.trim().slice(0, 40);
  if (!clean) return Promise.resolve();
  return setCollections(settingsStore.get().userCollections.map((c) => (c.id === id ? { ...c, name: clean } : c)));
}

export function deleteCollection(id: string) {
  const s = settingsStore.get();
  return updateSettings({
    userCollections: s.userCollections.filter((c) => c.id !== id),
    ...(s.rotateSource === `collection:${id}` ? { rotateSource: "favorites" } : {}),
  });
}

export function toggleInCollection(collectionId: string, charmId: string) {
  return setCollections(
    settingsStore.get().userCollections.map((c) =>
      c.id !== collectionId
        ? c
        : {
            ...c,
            charmIds: c.charmIds.includes(charmId)
              ? c.charmIds.filter((id) => id !== charmId)
              : [...c.charmIds, charmId],
          },
    ),
  );
}

/** Slot 0 is the main charm; 1 and 2 are the extra charms. */
export function chooseCharmForSlot(slot: number, charmId: string) {
  if (slot === 0) return updateSettings({ activeCharmId: charmId });
  const extra = settingsStore.get().extraSlots.map((s, i) => (i === slot - 1 ? { ...s, charmId } : s));
  return updateSettings({ extraSlots: extra });
}

export function setSlotAnchor(slot: number, anchorX: number) {
  if (slot === 0) return updateSettings({ anchorX });
  const extra = settingsStore.get().extraSlots.map((s, i) => (i === slot - 1 ? { ...s, anchorX } : s));
  return updateSettings({ extraSlots: extra });
}

/** Adds a charm in the widest free gap along the top of the screen. */
export function addSlot(charmId?: string) {
  const s = settingsStore.get();
  if (s.extraSlots.length >= MAX_EXTRA_SLOTS) return Promise.resolve();
  const taken = [s.anchorX, ...s.extraSlots.map((x) => x.anchorX)].sort((a, b) => a - b);
  const edges = [0.06, ...taken, 0.94];
  let best = 0.5;
  let gap = -1;
  for (let i = 0; i < edges.length - 1; i++) {
    if (edges[i + 1] - edges[i] > gap) {
      gap = edges[i + 1] - edges[i];
      best = (edges[i] + edges[i + 1]) / 2;
    }
  }
  const used = new Set([s.activeCharmId, ...s.extraSlots.map((x) => x.charmId)]);
  const pool = charmsStore.get().filter((c) => !used.has(c.id));
  const pick = charmId ?? (pool[Math.floor(Math.random() * pool.length)] ?? charmsStore.get()[0]).id;
  return updateSettings({ extraSlots: [...s.extraSlots, { charmId: pick, anchorX: best }] });
}

export function removeSlot(slot: number) {
  if (slot === 0) return Promise.resolve();
  return updateSettings({ extraSlots: settingsStore.get().extraSlots.filter((_, i) => i !== slot - 1) });
}

export function canAddSlot() {
  return settingsStore.get().extraSlots.length < MAX_EXTRA_SLOTS;
}

/** Swaps a charm with its neighbour; positions along the top stay where they were. */
export function moveSlot(slot: number, direction: -1 | 1) {
  const s = settingsStore.get();
  const ids = [s.activeCharmId, ...s.extraSlots.map((x) => x.charmId)];
  const other = slot + direction;
  if (other < 0 || other >= ids.length) return Promise.resolve();
  [ids[slot], ids[other]] = [ids[other], ids[slot]];
  return updateSettings({
    activeCharmId: ids[0],
    extraSlots: s.extraSlots.map((x, i) => ({ ...x, charmId: ids[i + 1] })),
  });
}
