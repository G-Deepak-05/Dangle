import { useSyncExternalStore } from "react";
import { charmsStore, findCharm, settingsReady, settingsStore } from "../state/stores";

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
