import { useSyncExternalStore } from "react";
import { appInfoStore, charmsStore, findCharm, settingsReady, settingsStore, updateProgressStore, updateStore } from "../state/stores";

export function useSettings() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get);
}

export function useSettingsReady() {
  return useSyncExternalStore(settingsReady.subscribe, settingsReady.get);
}

export function useCharms() {
  return useSyncExternalStore(charmsStore.subscribe, charmsStore.get);
}

export function useActiveCharm() {
  const settings = useSettings();
  const charms = useCharms();
  return findCharm(charms, settings.activeCharmId);
}

export function useAppInfo() {
  return useSyncExternalStore(appInfoStore.subscribe, appInfoStore.get);
}

export function useUpdate() {
  return useSyncExternalStore(updateStore.subscribe, updateStore.get);
}

export function useStore<T>(store: { subscribe: (l: () => void) => () => void; get: () => T }): T {
  return useSyncExternalStore(store.subscribe, store.get);
}

export function useUpdateProgress() {
  return useSyncExternalStore(updateProgressStore.subscribe, updateProgressStore.get);
}
