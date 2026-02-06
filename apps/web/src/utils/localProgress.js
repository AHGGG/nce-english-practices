/**
 * Local Progress Storage using IndexedDB.
 * Handles high-frequency position saves and device identification.
 */

import * as podcastApi from "../api/podcast";

const DB_NAME = "podcast_progress_db";
const DB_VERSION = 1;

const STORES = {
  POSITIONS: "positions", // { episodeId, position, timestamp, deviceId, playbackRate }
};

let dbPromise = null;

/**
 * Open IndexedDB connection
 */
function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.POSITIONS)) {
        db.createObjectStore(STORES.POSITIONS, { keyPath: "episodeId" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Generate or retrieve unique device ID
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    // Generate simple UUID-like string
    deviceId = crypto.randomUUID
      ? crypto.randomUUID()
      : "device-" + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

/**
 * Get device type based on User Agent
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua,
    )
  ) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Save position locally to IndexedDB
 */
export async function savePositionLocal(
  episodeId,
  position,
  playbackRate = 1.0,
  isFinished = false,
) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.POSITIONS, "readwrite");
      const store = transaction.objectStore(STORES.POSITIONS);

      const data = {
        episodeId,
        position,
        isFinished,
        timestamp: Date.now(),
        deviceId: getDeviceId(),
        deviceType: getDeviceType(),
        playbackRate,
      };

      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save local position:", error);
  }
}

/**
 * Get local position from IndexedDB
 */
export async function getLocalPosition(episodeId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.POSITIONS, "readonly");
      const store = transaction.objectStore(STORES.POSITIONS);
      const request = store.get(episodeId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get local position:", error);
    return null;
  }
}

/**
 * Get latest position (resolving conflict between Local and Server)
 * Used on initial load / resume.
 */
export async function getLatestPosition(episodeId) {
  try {
    // 1. Get Local
    const local = await getLocalPosition(episodeId);

    // 2. Get Server (using new resolve endpoint or just getPosition)
    // We use the standard getEpisodePosition first for speed, or resolve if we want full check
    // Actually, let's use the resolve endpoint if we have local data to compare,
    // otherwise just get standard position.

    // BUT, since we want to be "offline first" in logic, let's fetch both.

    let server = null;
    try {
      const res = await podcastApi.getEpisodePosition(episodeId);
      server = res; // { position_seconds: float }
      // Note: standard endpoint doesn't return timestamp currently?
      // We might need to use the new /resolve endpoint or update getEpisodePosition to return timestamp.
      // For now, let's assume we use the new /resolve endpoint if we have local data.
    } catch (e) {
      console.warn("Failed to fetch server position:", e);
    }

    if (!local && !server) return { position: 0, isFinished: false };
    if (!local) return { position: server.position_seconds, isFinished: server.is_finished };
    if (!server) return { position: local.position, isFinished: local.isFinished };

    // If we have both, we need timestamps.
    // Since getEpisodePosition might not return timestamp, let's call the resolve endpoint
    // which handles the logic on server side or returns server timestamp.

    try {
      const resolveRes = await podcastApi.resolvePosition(episodeId, {
        position: local.position,
        timestamp: local.timestamp,
        device_id: local.deviceId,
        device_type: local.deviceType,
        playback_rate: local.playbackRate,
      });

      return {
        position: resolveRes.position,
        isFinished: resolveRes.is_finished || local.isFinished, // Take server preference but keep local if True
        timestamp: resolveRes.server_timestamp,
      };
    } catch (e) {
      console.error("Resolve failed, falling back to local:", e);
      return { position: local.position, isFinished: local.isFinished };
    }
  } catch (error) {
    console.error("getLatestPosition error:", error);
    return { position: 0, isFinished: false };
  }
}
