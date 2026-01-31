/**
 * Re-hydrate all persisted Zustand stores.
 *
 * In React Native the module-level store creation runs before
 * setStorageAdapter() can swap in AsyncStorage, so the first
 * hydration attempt reads from the (broken) localStorage default
 * and returns empty state. This function triggers a second
 * hydration pass against the now-correct adapter.
 */
import { useAuthStore } from "../modules/auth";
import { useSettingsStore } from "../modules/settings";
import { useDownloadStore } from "../modules/podcast";

export function rehydratePersistedStores() {
  // Zustand persist middleware adds a `.persist` property to the store
  // with a `rehydrate()` method that re-reads from storage.
  (useAuthStore as any).persist?.rehydrate?.();
  (useSettingsStore as any).persist?.rehydrate?.();
  (useDownloadStore as any).persist?.rehydrate?.();

  console.log("[Store] Rehydration triggered for all persisted stores");
}
