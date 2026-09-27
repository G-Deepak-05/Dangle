import { BUILTIN_CHARMS, FALLBACK_CHARM_ID } from "../charms/builtin";
import type { StageConfig } from "../engine/stage";
import type { Charm, RopeStyle } from "../charms/types";
import { backend, events, type CustomCharmRecord } from "../ipc/backend";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

type Listener = () => void;

/** Minimal observable value, readable from React (useSyncExternalStore) and plain TS. */
class Store<T> {
  private listeners = new Set<Listener>();
  constructor(private value: T) {}
  get = (): T => this.value;
  set(value: T) {
    this.value = value;
    this.listeners.forEach((l) => l());
  }
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const settingsStore = new Store<Settings>(DEFAULT_SETTINGS);
export const settingsReady = new Store<boolean>(false);
export const charmsStore = new Store<Charm[]>(BUILTIN_CHARMS);

export function customToCharm(c: CustomCharmRecord): Charm {
  return {
    id: c.id,
    name: c.name,
    category: "custom",
    tags: [],
    image: c.imageDataUrl,
    thumbnail: c.imageDataUrl,
    defaultScale: c.defaultScale,
    ropeStyle: c.ropeStyle,
    anchorOffset: c.anchorOffset,
    metadata: { source: "custom", createdAt: c.createdAt, author: "You" },
  };
}

async function refreshCustomCharms() {
  try {
    const custom = await backend.listCustomCharms();
    charmsStore.set([...BUILTIN_CHARMS, ...custom.map(customToCharm)]);
  } catch (err) {
    console.error("Dangle: could not load custom charms", err);
  }
}

let started: Promise<void> | null = null;

/** Loads settings and charms once per window and keeps them in sync with Rust. */
export function startStores(): Promise<void> {
  started ??= (async () => {
    await events.settings((s) => settingsStore.set(s));
    await events.customCharmsChanged(() => void refreshCustomCharms());
    try {
      settingsStore.set(await backend.getSettings());
    } catch (err) {
      console.error("Dangle: could not load settings", err);
    }
    await refreshCustomCharms();
    settingsReady.set(true);
  })();
  return started;
}

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set({ ...settingsStore.get(), ...patch });
  return backend.updateSettings(patch).then((s) => {
    settingsStore.set(s);
    return s;
  });
}

export function findCharm(charms: Charm[], id: string): Charm {
  return (
    charms.find((c) => c.id === id) ??
    charms.find((c) => c.id === FALLBACK_CHARM_ID) ??
    charms[0]
  );
}

export function ropeFor(settings: Settings, charm: Charm): RopeStyle {
  return settings.ropeByCharm[charm.id] ?? charm.ropeStyle;
}

export function toggleFavorite(id: string) {
  const favorites = settingsStore.get().favorites;
  const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
  return updateSettings({ favorites: next });
}

/** Everything a CharmStage needs to show `charm` the way the user has set it up. */
export function stageConfigFor(settings: Settings, charm: Charm): StageConfig {
  return {
    charm,
    size: settings.size,
    rope: ropeFor(settings, charm),
    threadColor: settings.threadColor,
    beads: settings.beads,
    threadLength: settings.threadLength,
    physics: settings.physics,
    reduceMotion: settings.reduceMotion,
  };
}
