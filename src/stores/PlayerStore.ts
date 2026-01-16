import { action, flow, makeAutoObservable } from "mobx";

export class PlayerStore {
  isReady = false;
  deviceId: string | null = null;
  track: Spotify.Track | null = null;
  position = 0;
  duration = 0;
  paused = true;
  volume = 0.5;
  error: string | null = null;

  private player: Spotify.Player | null = null;

  constructor(
    private onPlayerStateChangedCb: (
      state: Spotify.PlaybackState
    ) => void = () => {}
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  private onPlayerReady = action(({ device_id }: { device_id: string }) => {
    this.deviceId = device_id;
    this.isReady = true;
  });

  private onPlayerNotReady = action(() => {
    this.isReady = false;
  });

  private onPlayerStateChanged = action(
    (state: Spotify.PlaybackState | null) => {
      if (!state) return;

      const currentTrack = state.track_window.current_track;

      this.track = currentTrack;
      this.position = state.position;
      this.duration = state.duration;
      this.paused = state.paused;
      this.onPlayerStateChangedCb(state);
    }
  );

  private onError = (errorType: string) =>
    action(({ message }: { message: string }) => {
      this.error = `${errorType}: ${message}`;
    });

  async init() {
    this.initPlayer();
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/token");
      if (!response.ok) return null;
      const data = await response.json();
      return data.accessToken;
    } catch {
      return null;
    }
  }

  private initPlayer = flow(function* (this: PlayerStore) {
    if (typeof window === "undefined") return;

    if (!window.Spotify) {
      window.onSpotifyWebPlaybackSDKReady = () => this.initPlayer();
      return;
    }

    const token: string | null = yield this.fetchToken();
    if (!token) {
      this.error = "No access token available";
      return;
    }

    const player = new window.Spotify.Player({
      name: "Playlist Progress Tracker",
      getOAuthToken: async (cb) => {
        const freshToken = await this.fetchToken();
        if (freshToken) cb(freshToken);
      },
      volume: 0.5,
    });

    player.addListener("ready", this.onPlayerReady);
    player.addListener("not_ready", this.onPlayerNotReady);
    player.addListener("player_state_changed", this.onPlayerStateChanged);
    player.addListener(
      "initialization_error",
      this.onError("Initialization error")
    );
    player.addListener(
      "authentication_error",
      this.onError("Authentication error")
    );
    player.addListener("account_error", this.onError("Account error"));
    player.addListener("playback_error", this.onError("Playback error"));

    const connected: boolean = yield player.connect();
    if (connected) {
      this.player = player;
    } else {
      this.error = "Failed to connect to Spotify";
    }
  });

  async togglePlay() {
    await this.player?.togglePlay();
  }

  async previousTrack() {
    await this.player?.previousTrack();
  }

  async nextTrack() {
    await this.player?.nextTrack();
  }

  async seek(positionMs: number) {
    await this.player?.seek(positionMs);
  }

  setVolume = flow(function* (this: PlayerStore, volume: number) {
    yield this.player?.setVolume(volume);
    this.volume = volume;
  });

  disconnect() {
    this.player?.disconnect();
  }
}
