import { flow, makeAutoObservable } from "mobx";
import {
  getProgress,
  playOnDevice,
  syncTrackPosition,
  Progress,
} from "@/app/actions";

export class ProgressStore {
  progress: Progress | null = null;
  loading = true;
  error: string | null = null;
  private lastTrackUri: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  fetchProgress = flow(function* (this: ProgressStore) {
    this.loading = true;
    this.error = null;
    try {
      const data: Progress | null = yield getProgress();
      this.progress = data;
    } catch {
      this.error = "Failed to load progress";
    } finally {
      this.loading = false;
    }
  });

  syncFromTrackUri = flow(function* (this: ProgressStore, trackUri: string) {
    try {
      const result: Awaited<ReturnType<typeof syncTrackPosition>> =
        yield syncTrackPosition(trackUri);
      if (result.updated) {
        yield this.fetchProgress();
      }
      return result;
    } catch (e) {
      this.error = e instanceof Error ? e.message : "Failed to sync progress";
      return {
        success: false,
        position: null,
        updated: false,
        error: this.error,
      };
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
    if (!this.progress?.playlistTotal || this.progress.furthestIndex === null)
      return 0;
    return (
      ((this.progress.furthestIndex + 1) / this.progress.playlistTotal) * 100
    );
  }

  get isAuthenticated(): boolean {
    return this.progress !== null;
  }
}
