import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import PodcastCoverPlayButton from "../../components/podcast/PodcastCoverPlayButton";
import * as podcastApi from "../../api/podcast";
import { Dialog, DialogButton, Input, useToast } from "../../components/ui";
import { usePodcast } from "../../context/PodcastContext";
import {
  getPlaylistById,
  moveEpisodeInPlaylist,
  removeEpisodeFromPlaylist,
  renamePlaylist,
  type PodcastPlaylist,
} from "../../utils/podcastPlaylists";

interface EpisodeBatchItem {
  episode: {
    id: number;
    title: string;
    audio_url: string;
    image_url?: string | null;
    published_at?: string | null;
    current_position?: number;
  };
  feed: {
    id: number;
    title: string;
    image_url?: string | null;
  };
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export default function PodcastPlaylistDetailView() {
  const { playlistId = "" } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { playEpisode, currentEpisode, isPlaying } = usePodcast();
  const [playlist, setPlaylist] = useState<PodcastPlaylist | null>(null);
  const [items, setItems] = useState<EpisodeBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const episodeIds = useMemo(
    () => playlist?.items.map((item) => item.episodeId) ?? [],
    [playlist],
  );
  const episodeIdsKey = useMemo(() => episodeIds.join(","), [episodeIds]);

  useEffect(() => {
    const current = getPlaylistById(playlistId);
    setPlaylist(current);
  }, [playlistId]);

  useEffect(() => {
    async function loadItems() {
      if (!playlist || episodeIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = (await podcastApi.getEpisodesBatch(
          episodeIds,
        )) as EpisodeBatchItem[];
        const indexMap = new Map<number, number>();
        episodeIds.forEach((id, index) => indexMap.set(id, index));
        const sorted = [...data].sort(
          (a, b) =>
            (indexMap.get(a.episode.id) ?? Number.MAX_SAFE_INTEGER) -
            (indexMap.get(b.episode.id) ?? Number.MAX_SAFE_INTEGER),
        );
        setItems(sorted);
      } catch (error: unknown) {
        addToast(
          "Failed to load playlist episodes: " + getErrorMessage(error),
          "error",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadItems();
  }, [playlistId, playlist, episodeIdsKey]);

  function refreshPlaylist() {
    setPlaylist(getPlaylistById(playlistId));
  }

  function handleRename() {
    if (!playlist || !renameValue.trim()) return;
    try {
      renamePlaylist(playlist.id, renameValue.trim());
      refreshPlaylist();
      setIsRenameOpen(false);
      addToast("Playlist renamed", "success");
    } catch (error: unknown) {
      addToast("Rename failed: " + getErrorMessage(error), "error");
    }
  }

  function handleRemoveEpisode(episodeId: number) {
    if (!playlist) return;
    removeEpisodeFromPlaylist(playlist.id, episodeId);
    refreshPlaylist();
    setItems((prev) => prev.filter((item) => item.episode.id !== episodeId));
    addToast("Episode removed", "info");
  }

  function handleMove(episodeId: number, direction: "up" | "down") {
    if (!playlist) return;
    moveEpisodeInPlaylist(playlist.id, episodeId, direction);
    refreshPlaylist();
  }

  if (!playlist) {
    return (
      <PodcastLayout title="Playlist">
        <div className="text-center py-20 space-y-4">
          <p className="text-white/70">Playlist not found</p>
          <button
            onClick={() => navigate("/podcast/playlists")}
            className="px-4 py-2 rounded-lg border border-white/10 text-white/70"
          >
            Back to Playlists
          </button>
        </div>
      </PodcastLayout>
    );
  }

  return (
    <PodcastLayout title={playlist.name}>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/podcast/playlists")}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={() => {
            setRenameValue(playlist.name);
            setIsRenameOpen(true);
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white"
        >
          <Pencil className="w-4 h-4" />
          Rename
        </button>
      </div>

      {loading ? (
        <div className="text-white/60">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-white/50">
          This playlist is empty.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const isCurrent = currentEpisode?.id === item.episode.id;
            const isCurrentAndPlaying = isCurrent && isPlaying;

            return (
              <div
                key={item.episode.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10"
              >
                <span className="w-6 text-center text-white/40 text-xs">
                  {index + 1}
                </span>
                <PodcastCoverPlayButton
                  imageUrl={item.episode.image_url || item.feed.image_url}
                  isCurrent={isCurrent}
                  isPlaying={isCurrentAndPlaying}
                  onClick={() => playEpisode(item.episode, item.feed, null)}
                  sizeClassName="w-12 h-12"
                  iconClassName="w-3.5 h-3.5"
                  fallbackIconClassName="w-4 h-4"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {item.episode.title}
                  </p>
                  <p className="text-white/50 text-xs truncate">
                    {item.feed.title}
                  </p>
                </div>

                {isCurrent && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-mono text-accent-primary border border-accent-primary/30 bg-accent-primary/10">
                    <Check className="w-3 h-3 inline mr-1" />
                    NOW
                  </span>
                )}

                <button
                  onClick={() => handleMove(item.episode.id, "up")}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  title="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleMove(item.episode.id, "down")}
                  className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                  title="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleRemoveEpisode(item.episode.id)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Playlist"
        footer={
          <>
            <DialogButton
              variant="ghost"
              onClick={() => setIsRenameOpen(false)}
            >
              Cancel
            </DialogButton>
            <DialogButton
              variant="primary"
              onClick={handleRename}
              disabled={!renameValue.trim()}
            >
              Save
            </DialogButton>
          </>
        }
      >
        <Input
          placeholder="Playlist name"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleRename();
            }
          }}
        />
      </Dialog>
    </PodcastLayout>
  );
}
