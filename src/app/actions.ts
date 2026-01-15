"use server";

import { getSession, updateSession } from "@/lib/kv";
import { spotifyFetch, SpotifyDevicesResponse, SpotifyPlaylist, SpotifyCurrentlyPlaying } from "@/lib/spotify";

export interface Device {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface Progress {
  lastPlayedTrackUri: string | null;
  lastPlayedPosition: number | null;
  playlistId: string | null;
  playlistName: string | null;
  playlistTotal: number | null;
}

export async function getProgress(): Promise<Progress | null> {
  const session = await getSession();
  if (!session) return null;

  const playlist = session.playlistId
    ? await spotifyFetch<SpotifyPlaylist>(`/playlists/${session.playlistId}`)
    : null;

  return {
    lastPlayedTrackUri: session.lastPlayedTrackUri || null,
    lastPlayedPosition: session.lastPlayedPosition ?? null,
    playlistId: session.playlistId || null,
    playlistName: playlist?.name || null,
    playlistTotal: playlist?.tracks.total || null,
  };
}

export async function getDevices(): Promise<Device[]> {
  const data = await spotifyFetch<SpotifyDevicesResponse>("/me/player/devices");
  return data?.devices || [];
}

export async function playOnDevice(deviceId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  if (!session.playlistId) {
    return { success: false, error: "No playlist configured" };
  }

  const playbackBody: Record<string, unknown> = {
    context_uri: `spotify:playlist:${session.playlistId}`,
  };

  if (session.lastPlayedPosition !== undefined) {
    playbackBody.offset = { position: session.lastPlayedPosition };
  }

  const result = await spotifyFetch(`/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    body: JSON.stringify(playbackBody),
  });

  if (result === null) {
    return { success: false, error: "Failed to start playback" };
  }

  return { success: true };
}

export async function syncProgress(): Promise<{
  success: boolean;
  error?: string;
  trackName?: string;
  artist?: string;
  position?: number;
}> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const current = await spotifyFetch<SpotifyCurrentlyPlaying>("/me/player/currently-playing");

  if (!current || !current.item) {
    return { success: false, error: "Nothing currently playing" };
  }

  const playlistUri = `spotify:playlist:${session.playlistId}`;
  if (current.context?.uri !== playlistUri) {
    return { success: false, error: "Not playing from tracked playlist" };
  }

  const trackUri = current.item.uri;
  let position: number | null = null;
  let offset = 0;
  const limit = 100;

  while (position === null) {
    const tracksResponse = await spotifyFetch<{
      items: { track: { uri: string } }[];
      total: number;
    }>(`/playlists/${session.playlistId}/tracks?offset=${offset}&limit=${limit}`);

    if (!tracksResponse) break;

    const index = tracksResponse.items.findIndex(
      (item) => item.track?.uri === trackUri
    );

    if (index !== -1) {
      position = offset + index;
      break;
    }

    offset += limit;
    if (offset >= tracksResponse.total) break;
  }

  if (position === null) {
    return { success: false, error: "Track not found in playlist" };
  }

  await updateSession({
    lastPlayedTrackUri: trackUri,
    lastPlayedPosition: position,
  });

  return {
    success: true,
    trackName: current.item.name,
    artist: current.item.artists.map((a) => a.name).join(", "),
    position,
  };
}
