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
import { Dialog, DialogButton, Input, useToast } from "../../components/ui";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export default function PodcastPlaylistsView() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [version, setVersion] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PodcastPlaylist | null>(
    null,
  );

  const playlists = useMemo(() => {
    void version;
    return getPlaylists();
  }, [version]);

  function handleCreate() {
    const name = newPlaylistName.trim();
    if (!name) return;
    try {
      const playlist = createPlaylist(name);
      setVersion((v) => v + 1);
      addToast("Playlist created", "success");
      setIsCreateOpen(false);
      setNewPlaylistName("");
      navigate(`/podcast/playlist/${playlist.id}`);
    } catch (error: unknown) {
      addToast("Failed to create playlist: " + getErrorMessage(error), "error");
    }
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    deletePlaylist(deleteTarget.id);
    setVersion((v) => v + 1);
    setDeleteTarget(null);
    addToast("Playlist deleted", "info");
  }

  return (
    <PodcastLayout title="Playlists">
      <div className="flex items-center justify-between mb-6">
        <p className="text-white/50 text-sm">{playlists.length} playlists</p>
        <button
          onClick={() => setIsCreateOpen(true)}
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
                onClick={() => setDeleteTarget(playlist)}
                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                title="Delete playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Playlist"
        footer={
          <>
            <DialogButton
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </DialogButton>
            <DialogButton
              variant="primary"
              onClick={handleCreate}
              disabled={!newPlaylistName.trim()}
            >
              Create
            </DialogButton>
          </>
        }
      >
        <Input
          placeholder="Playlist name"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
      </Dialog>

      <Dialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Playlist"
        footer={
          <>
            <DialogButton variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </DialogButton>
            <DialogButton variant="danger" onClick={handleDeleteConfirmed}>
              Delete
            </DialogButton>
          </>
        }
      >
        <p>
          Delete playlist{" "}
          <span className="text-white">{deleteTarget?.name}</span>? This only
          removes the local playlist and does not affect downloaded audio.
        </p>
      </Dialog>
    </PodcastLayout>
  );
}
