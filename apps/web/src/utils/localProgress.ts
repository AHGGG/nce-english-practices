/**
 * Local Progress Storage using IndexedDB.
 * Handles high-frequency position saves and device identification.
 */

import * as podcastApi from "../api/podcast";

const DB_NAME = "podcast_progress_db";
const DB_VERSION = 1;

const STORES = {
  POSITIONS: "positions",
} as const;

type DeviceType = "mobile" | "tablet" | "desktop";

interface LocalPositionRecord {
  episodeId: number;
  position: number;
  isFinished: boolean;
  timestamp: number;
  deviceId: string;
  deviceType: DeviceType;
  playbackRate: number;
}

interface ServerPosition {
  position_seconds: number;
  is_finished?: boolean;
}

interface ResolvePositionResponse {
  position: number;
  is_finished?: boolean;
  server_timestamp?: number;
}

interface LatestPositionResult {
  position: number;
  isFinished: boolean;
  timestamp?: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.POSITIONS)) {
        db.createObjectStore(STORES.POSITIONS, { keyPath: "episodeId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

export function getDeviceId() {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID
      ? crypto.randomUUID()
      : `device-${Math.random().toString(36).slice(2, 11)}${Date.now()}`;
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
}

export function getDeviceType(): DeviceType {
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

export async function savePositionLocal(
  episodeId: number,
  position: number,
  playbackRate = 1.0,
  isFinished = false,
) {
  try {
    const db = await openDB();
    return await new Promise<LocalPositionRecord>((resolve, reject) => {
      const transaction = db.transaction(STORES.POSITIONS, "readwrite");
      const store = transaction.objectStore(STORES.POSITIONS);

      const data: LocalPositionRecord = {
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
    return undefined;
  }
}

export async function getLocalPosition(episodeId: number) {
  try {
    const db = await openDB();
    return await new Promise<LocalPositionRecord | null>((resolve, reject) => {
      const transaction = db.transaction(STORES.POSITIONS, "readonly");
      const store = transaction.objectStore(STORES.POSITIONS);
      const request = store.get(episodeId);

      request.onsuccess = () =>
        resolve((request.result as LocalPositionRecord) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get local position:", error);
    return null;
  }
}

export async function getLatestPosition(
  episodeId: number,
): Promise<LatestPositionResult> {
  try {
    const local = await getLocalPosition(episodeId);

    let server: ServerPosition | null = null;
    try {
      server = (await podcastApi.getEpisodePosition(
        episodeId,
      )) as ServerPosition;
    } catch (error) {
      console.warn("Failed to fetch server position:", error);
    }

    if (!local && !server) return { position: 0, isFinished: false };
    if (!local && server) {
      return {
        position: server.position_seconds,
        isFinished: Boolean(server.is_finished),
      };
    }
    if (local && !server) {
      return { position: local.position, isFinished: local.isFinished };
    }

    if (!local) return { position: 0, isFinished: false };

    try {
      const resolveRes = (await podcastApi.resolvePosition(episodeId, {
        position: local.position,
        timestamp: local.timestamp,
        device_id: local.deviceId,
        device_type: local.deviceType,
        playback_rate: local.playbackRate,
      })) as ResolvePositionResponse;

      return {
        position: resolveRes.position,
        isFinished: resolveRes.is_finished || local.isFinished,
        timestamp: resolveRes.server_timestamp,
      };
    } catch (error) {
      console.error("Resolve failed, falling back to local:", error);
      return { position: local.position, isFinished: local.isFinished };
    }
  } catch (error) {
    console.error("getLatestPosition error:", error);
    return { position: 0, isFinished: false };
  }
}
