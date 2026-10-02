import { settingsStore, Store } from "./stores";

export type LibraryFilter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "custom" }
  | { kind: "collection"; id: string }
  | { kind: "user"; id: string };

/** Which list the Library opens on, so other screens can deep-link into it. */
export const libraryFilterStore = new Store<LibraryFilter>({ kind: "all" });

/** 0 is the main charm; 1–2 are extra charms. Picking in the Library fills this slot. */
export const targetSlotStore = new Store<number>(0);

settingsStore.subscribe(() => {
  if (targetSlotStore.get() > settingsStore.get().extraSlots.length) targetSlotStore.set(0);
});
