import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListMusic, Plus, Trash2 } from "lucide-react";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import {
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  type PodcastPlaylist,
} from "../../utils/podcastPlaylists";
import { useToast } from "../../components/ui";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export default function PodcastPlaylistsView() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [version, setVersion] = useState(0);

  const playlists = useMemo(() => {
    void version;
    return getPlaylists();
  }, [version]);

  function handleCreate() {
    const name = window.prompt("Playlist name");
    if (!name) return;
    try {
      const playlist = createPlaylist(name);
      setVersion((v) => v + 1);
      addToast("Playlist created", "success");
      navigate(`/podcast/playlist/${playlist.id}`);
    } catch (error: unknown) {
      addToast("Failed to create playlist: " + getErrorMessage(error), "error");
    }
  }

  function handleDelete(playlist: PodcastPlaylist) {
    if (!window.confirm(`Delete playlist \"${playlist.name}\"?`)) {
      return;
    }
    deletePlaylist(playlist.id);
    setVersion((v) => v + 1);
    addToast("Playlist deleted", "info");
  }

  return (
    <PodcastLayout title="Playlists">
      <div className="flex items-center justify-between mb-6">
        <p className="text-white/50 text-sm">{playlists.length} playlists</p>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-black font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <ListMusic className="w-12 h-12 text-white/30 mx-auto" />
          <h3 className="text-lg text-white">No playlists yet</h3>
          <p className="text-white/50 text-sm">
            Create a playlist and add episodes from feed pages.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10"
            >
              <button
                onClick={() => navigate(`/podcast/playlist/${playlist.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-white font-medium truncate">
                  {playlist.name}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {playlist.items.length} episodes
                </p>
              </button>

              <button
                onClick={() => handleDelete(playlist)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                title="Delete playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </PodcastLayout>
  );
}
