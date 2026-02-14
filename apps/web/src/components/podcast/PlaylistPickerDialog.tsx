import { useEffect, useMemo, useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { Dialog, DialogButton, Input, useToast } from "../ui";
import {
  addEpisodeToPlaylist,
  createPlaylist,
  getPlaylists,
  type PodcastPlaylist,
} from "../../utils/podcastPlaylists";

interface PlaylistPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  episodeId: number | null;
  episodeTitle?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

export default function PlaylistPickerDialog({
  isOpen,
  onClose,
  episodeId,
  episodeTitle,
}: PlaylistPickerDialogProps) {
  const { addToast } = useToast();
  const [playlists, setPlaylists] = useState<PodcastPlaylist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewPlaylistName("");
      return;
    }
    setPlaylists(getPlaylists());
  }, [isOpen]);

  const normalizedName = useMemo(
    () => newPlaylistName.trim(),
    [newPlaylistName],
  );

  function isAlreadyInPlaylist(playlist: PodcastPlaylist): boolean {
    if (episodeId == null) return false;
    return playlist.items.some((item) => item.episodeId === episodeId);
  }

  function handleClose() {
    if (!saving) onClose();
  }

  function addToPlaylist(playlist: PodcastPlaylist) {
    if (episodeId == null) return;
    try {
      const before = playlist.items.some(
        (item) => item.episodeId === episodeId,
      );
      addEpisodeToPlaylist(playlist.id, episodeId);
      const message = before
        ? `Already in ${playlist.name}`
        : `Added to ${playlist.name}`;
      addToast(message, before ? "info" : "success");
      setPlaylists(getPlaylists());
      if (!before) onClose();
    } catch (error: unknown) {
      addToast("Failed to add playlist: " + getErrorMessage(error), "error");
    }
  }

  async function handleCreateAndAdd() {
    if (!normalizedName || episodeId == null) return;
    try {
      setSaving(true);
      const playlist = createPlaylist(normalizedName);
      addEpisodeToPlaylist(playlist.id, episodeId);
      addToast(`Added to ${playlist.name}`, "success");
      setPlaylists(getPlaylists());
      setNewPlaylistName("");
      onClose();
    } catch (error: unknown) {
      addToast("Failed to create playlist: " + getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add to Playlist"
      maxWidth="max-w-lg"
      footer={
        <>
          <DialogButton variant="ghost" onClick={handleClose} disabled={saving}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            onClick={handleCreateAndAdd}
            disabled={!normalizedName || saving || episodeId == null}
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Create and Add
          </DialogButton>
        </>
      }
    >
      <div className="space-y-5">
        {episodeTitle && (
          <p className="text-sm text-white/80 line-clamp-2">{episodeTitle}</p>
        )}

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Create New Playlist
          </p>
          <Input
            placeholder="Playlist name"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateAndAdd();
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-white/40">
            Existing Playlists
          </p>
          {playlists.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
              No playlists yet. Create one above.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {playlists.map((playlist) => {
                const already = isAlreadyInPlaylist(playlist);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => addToPlaylist(playlist)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">
                        {playlist.name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {playlist.items.length} episodes
                      </p>
                    </div>
                    {already ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-accent-success">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-accent-primary">
                        <ListPlus className="w-3.5 h-3.5" /> Add
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
