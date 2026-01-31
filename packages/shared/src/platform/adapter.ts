/**
 * Platform Adapter Interface
 *
 * This allows shared hooks to work on both Web and React Native
 * by abstracting platform-specific APIs.
 */

export interface VisibilityAdapter {
  /**
   * Subscribe to visibility changes
   * @param callback - Called with true when app becomes visible, false when hidden
   * @returns Cleanup function
   */
  onVisibilityChange: (callback: (isVisible: boolean) => void) => () => void;
}

export interface PlatformAdapter {
  visibility: VisibilityAdapter;
}

// Global adapter instance
let platformAdapter: PlatformAdapter | null = null;

/**
 * Set the platform adapter
 *
 * Call this early in your app initialization:
 *
 * Web:
 * ```ts
 * setPlatformAdapter({
 *   visibility: {
 *     onVisibilityChange: (cb) => {
 *       const handler = () => cb(!document.hidden);
 *       document.addEventListener('visibilitychange', handler);
 *       return () => document.removeEventListener('visibilitychange', handler);
 *     },
 *   },
 * });
 * ```
 *
 * React Native:
 * ```ts
 * import { AppState } from 'react-native';
 *
 * setPlatformAdapter({
 *   visibility: {
 *     onVisibilityChange: (cb) => {
 *       const subscription = AppState.addEventListener('change', (state) => {
 *         cb(state === 'active');
 *       });
 *       return () => subscription.remove();
 *     },
 *   },
 * });
 * ```
 */
export function setPlatformAdapter(adapter: PlatformAdapter) {
  platformAdapter = adapter;
}

/**
 * Get the current platform adapter
 */
export function getPlatformAdapter(): PlatformAdapter | null {
  return platformAdapter;
}
