export interface PodcastPlaylistItem {
  episodeId: number;
  addedAt: string;
}

export interface PodcastPlaylist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  items: PodcastPlaylistItem[];
}

const STORAGE_KEY = "podcast_playlists_v1";

function loadRaw(): PodcastPlaylist[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed as PodcastPlaylist[];
  } catch {
    return [];
  }
}

function saveRaw(playlists: PodcastPlaylist[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export function getPlaylists(): PodcastPlaylist[] {
  return loadRaw().sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

export function getPlaylistById(playlistId: string): PodcastPlaylist | null {
  const playlists = loadRaw();
  return playlists.find((p) => p.id === playlistId) ?? null;
}

export function createPlaylist(name: string): PodcastPlaylist {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Playlist name is required");
  }
  const now = new Date().toISOString();
  const playlist: PodcastPlaylist = {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    createdAt: now,
    updatedAt: now,
    items: [],
  };
  const playlists = loadRaw();
  playlists.unshift(playlist);
  saveRaw(playlists);
  return playlist;
}

export function deletePlaylist(playlistId: string): void {
  const playlists = loadRaw().filter((p) => p.id !== playlistId);
  saveRaw(playlists);
}

export function renamePlaylist(
  playlistId: string,
  name: string,
): PodcastPlaylist {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Playlist name is required");
  }
  const playlists = loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }
  target.name = trimmed;
  target.updatedAt = new Date().toISOString();
  saveRaw(playlists);
  return target;
}

export function addEpisodeToPlaylist(
  playlistId: string,
  episodeId: number,
): PodcastPlaylist {
  const playlists = loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }

  const exists = target.items.some((item) => item.episodeId === episodeId);
  if (!exists) {
    target.items.push({
      episodeId,
      addedAt: new Date().toISOString(),
    });
    target.updatedAt = new Date().toISOString();
    saveRaw(playlists);
  }

  return target;
}

export function removeEpisodeFromPlaylist(
  playlistId: string,
  episodeId: number,
): PodcastPlaylist {
  const playlists = loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }
  target.items = target.items.filter((item) => item.episodeId !== episodeId);
  target.updatedAt = new Date().toISOString();
  saveRaw(playlists);
  return target;
}

export function moveEpisodeInPlaylist(
  playlistId: string,
  episodeId: number,
  direction: "up" | "down",
): PodcastPlaylist {
  const playlists = loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }

  const index = target.items.findIndex((item) => item.episodeId === episodeId);
  if (index < 0) {
    throw new Error("Episode not in playlist");
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= target.items.length) {
    return target;
  }

  const [moved] = target.items.splice(index, 1);
  target.items.splice(nextIndex, 0, moved);
  target.updatedAt = new Date().toISOString();
  saveRaw(playlists);
  return target;
}
