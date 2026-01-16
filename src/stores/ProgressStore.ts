import { flow, makeAutoObservable } from "mobx";
import { getPlaylist, getFurthestIndex, playOnDevice, syncTrackPosition } from "@/app/actions";
import { Playlist } from "@/lib/schemas";

export class ProgressStore {
  playlist: Playlist | null = null;
  furthestIndex: number | null = null;
  loading = true;
  error: string | null = null;
  private lastTrackUri: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  fetchPlaylist = flow(function* (this: ProgressStore) {
    this.loading = true;
    this.error = null;
    try {
      this.playlist = yield getPlaylist();
    } catch {
      this.error = "Failed to load playlist";
    } finally {
      this.loading = false;
    }
  });

  fetchFurthestIndex = flow(function* (this: ProgressStore) {
    try {
      this.furthestIndex = yield getFurthestIndex();
    } catch {
      this.error = "Failed to load progress";
    }
  });

  syncFromTrackUri = flow(function* (this: ProgressStore, trackUri: string) {
    try {
      const result: Awaited<ReturnType<typeof syncTrackPosition>> =
        yield syncTrackPosition(trackUri);
      if (result.updated) {
        this.furthestIndex = result.position;
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Failed to sync progress";
    }
  });

  handlePlayerStateChanged(state: Spotify.PlaybackState) {
    const trackUri = state.track_window.current_track?.uri ?? null;
    if (!trackUri || trackUri === this.lastTrackUri) return;
    this.lastTrackUri = trackUri;
    this.syncFromTrackUri(trackUri);
  }

  startPlaybackOnDevice = flow(function* (
    this: ProgressStore,
    deviceId: string
  ) {
    this.error = null;
    const result: Awaited<ReturnType<typeof playOnDevice>> = yield playOnDevice(
      deviceId
    );
    if (!result.success) {
      this.error = result.error || "Failed to start playback";
    }
    return result;
  });

  get progressPercent(): number {
    if (!this.playlist || this.furthestIndex === null) return 0;
    return ((this.furthestIndex + 1) / this.playlist.total) * 100;
  }
}
