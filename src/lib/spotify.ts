import { getSession, updateSession } from "./kv";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  // Check if token is expired (with 60s buffer)
  if (Date.now() > session.expiresAt - 60000) {
    // Refresh the token
    const refreshed = await refreshAccessToken(session.refreshToken);
    if (!refreshed) return null;
    return refreshed.accessToken;
  }

  return session.accessToken;
}

async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: params,
  });

  if (!response.ok) {
    console.error("Failed to refresh token:", await response.text());
    return null;
  }

  const data = await response.json();

  await updateSession({
    accessToken: data.access_token,
    // Spotify may or may not return a new refresh token
    ...(data.refresh_token && { refreshToken: data.refresh_token }),
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return { accessToken: data.access_token };
}

export async function spotifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    console.error(`Spotify API error (${endpoint}):`, await response.text());
    return null;
  }

  // Some endpoints return no content (204)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Spotify API types
export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  name: string;
  type: string;
}

export interface SpotifyDevicesResponse {
  devices: SpotifyDevice[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: {
    total: number;
  };
}

export interface SpotifyTrack {
  uri: string;
  name: string;
  artists: { name: string }[];
}

export interface SpotifyCurrentlyPlaying {
  item: SpotifyTrack | null;
  context: {
    uri: string;
  } | null;
  progress_ms: number;
  is_playing: boolean;
}
