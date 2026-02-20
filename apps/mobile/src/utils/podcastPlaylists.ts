import AsyncStorage from "@react-native-async-storage/async-storage";

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

async function loadRaw(): Promise<PodcastPlaylist[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? (parsed as PodcastPlaylist[]) : [];
  } catch {
    return [];
  }
}

async function saveRaw(playlists: PodcastPlaylist[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export async function getPlaylists(): Promise<PodcastPlaylist[]> {
  const playlists = await loadRaw();
  return playlists.sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

export async function getPlaylistById(
  playlistId: string,
): Promise<PodcastPlaylist | null> {
  const playlists = await loadRaw();
  return playlists.find((p) => p.id === playlistId) ?? null;
}

export async function createPlaylist(name: string): Promise<PodcastPlaylist> {
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
  const playlists = await loadRaw();
  playlists.unshift(playlist);
  await saveRaw(playlists);
  return playlist;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const playlists = (await loadRaw()).filter((p) => p.id !== playlistId);
  await saveRaw(playlists);
}

export async function renamePlaylist(
  playlistId: string,
  name: string,
): Promise<PodcastPlaylist> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Playlist name is required");
  }

  const playlists = await loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }
  target.name = trimmed;
  target.updatedAt = new Date().toISOString();
  await saveRaw(playlists);
  return target;
}

export async function addEpisodeToPlaylist(
  playlistId: string,
  episodeId: number,
): Promise<PodcastPlaylist> {
  const playlists = await loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }

  const exists = target.items.some((item) => item.episodeId === episodeId);
  if (!exists) {
    target.items.push({ episodeId, addedAt: new Date().toISOString() });
    target.updatedAt = new Date().toISOString();
    await saveRaw(playlists);
  }

  return target;
}

export async function removeEpisodeFromPlaylist(
  playlistId: string,
  episodeId: number,
): Promise<PodcastPlaylist> {
  const playlists = await loadRaw();
  const target = playlists.find((p) => p.id === playlistId);
  if (!target) {
    throw new Error("Playlist not found");
  }
  target.items = target.items.filter((item) => item.episodeId !== episodeId);
  target.updatedAt = new Date().toISOString();
  await saveRaw(playlists);
  return target;
}

export async function moveEpisodeInPlaylist(
  playlistId: string,
  episodeId: number,
  direction: "up" | "down",
): Promise<PodcastPlaylist> {
  const playlists = await loadRaw();
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
  await saveRaw(playlists);
  return target;
}
