"use server";

import {
  getSession,
  getPlaylistProgress,
  getPlaylistTrackIndexCache,
  setPlaylistTrackIndexCache,
  updateProgressIfFurther,
} from "@/lib/kv";
import {
  spotifyFetch,
  SpotifyDevicesResponse,
  SpotifyPlaylist,
  SpotifyCurrentlyPlaying,
} from "@/lib/spotify";
import assert from "assert";

export interface Device {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface Progress {
  furthestIndex: number | null;
  playlistId: string | null;
  playlistName: string | null;
  playlistTotal: number | null;
}

export async function getProgress(): Promise<Progress | null> {
  const session = await getSession();
  if (!session) return null;

  const playlistId = process.env.PLAYLIST_ID || null;
  const progress = await getPlaylistProgress();

  const playlist = playlistId
    ? await spotifyFetch<SpotifyPlaylist>(`/playlists/${playlistId}`)
    : null;

  return {
    furthestIndex: progress?.furthestIndex ?? null,
    playlistId,
    playlistName: playlist?.name || null,
    playlistTotal: playlist?.tracks.total || null,
  };
}

export async function getDevices(): Promise<Device[]> {
  const data = await spotifyFetch<SpotifyDevicesResponse>("/me/player/devices");
  return data?.devices || [];
}

export async function playOnDevice(
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const playlistId = process.env.PLAYLIST_ID;
  if (!playlistId) {
    return { success: false, error: "No playlist configured" };
  }

  const progress = await getPlaylistProgress();

  const playbackBody: Record<string, unknown> = {
    context_uri: `spotify:playlist:${playlistId}`,
  };

  if (progress?.furthestIndex !== undefined) {
    playbackBody.offset = { position: progress.furthestIndex };
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
  updated?: boolean;
}> {
  const session = await getSession();

  if (!session) {
    return { success: false, error: "Not authenticated" };
  }

  const playlistId = process.env.PLAYLIST_ID;
  if (!playlistId) {
    return { success: false, error: "No playlist configured" };
  }

  const current = await spotifyFetch<SpotifyCurrentlyPlaying>(
    "/me/player/currently-playing"
  );

  if (!current || !current.item) {
    return { success: false, error: "Nothing currently playing" };
  }

  const playlistUri = `spotify:playlist:${playlistId}`;
  if (current.context?.uri !== playlistUri) {
    return { success: false, error: "Not playing from tracked playlist" };
  }

  const trackUri = current.item.uri;
  const position = await getTrackPositionInPlaylist(playlistId, trackUri);
  if (position === null)
    return { success: false, error: "Track not found in playlist" };

  // Only update if this position is further than the stored furthest index
  const updated = await updateProgressIfFurther(position);

  return {
    success: true,
    trackName: current.item.name,
    artist: current.item.artists.map((a) => a.name).join(", "),
    position,
    updated,
  };
}

type PlaylistMeta = {
  snapshot_id: string;
  tracks: { total: number };
};

type PlaylistTracksPage = {
  items: { track: { uri: string | null } | null }[];
  total: number;
  offset: number;
  limit: number;
};

const MAX_TRACKS_TO_CACHE = 2000; // safety: avoid storing very large maps in KV

async function getTrackPositionInPlaylist(
  playlistId: string,
  trackUri: string
): Promise<number | null> {
  const meta = await spotifyFetch<PlaylistMeta>(
    `/playlists/${playlistId}?fields=snapshot_id,tracks.total`
  );
  if (!meta?.snapshot_id) return null;

  const cached = await getPlaylistTrackIndexCache(playlistId);
  if (cached && cached.snapshotId === meta.snapshot_id) {
    const cachedPos = cached.indexByUri[trackUri];
    return typeof cachedPos === "number" ? cachedPos : null;
  }

  // Rebuild map (or do a one-off scan if playlist is huge)
  const shouldCache = meta.tracks.total <= MAX_TRACKS_TO_CACHE;
  const indexByUri: Record<string, number> = {};

  let offset = 0;
  const limit = 100;

  while (offset < meta.tracks.total) {
    const page = await spotifyFetch<PlaylistTracksPage>(
      `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}&fields=items(track(uri)),total,offset,limit`
    );
    if (!page) break;

    for (let i = 0; i < page.items.length; i++) {
      const uri = page.items[i]?.track?.uri ?? null;
      if (uri && indexByUri[uri] === undefined) {
        indexByUri[uri] = offset + i;
      }
    }

    offset += limit;
    if (offset >= page.total) break;
  }

  if (shouldCache) {
    await setPlaylistTrackIndexCache(playlistId, {
      playlistId,
      snapshotId: meta.snapshot_id,
      total: meta.tracks.total,
      createdAt: Date.now(),
      indexByUri,
    });
  }

  const pos = indexByUri[trackUri];
  return typeof pos === "number" ? pos : null;
}

// Used by the Web Playback SDK when track changes
export async function syncTrackPosition(trackUri: string): Promise<{
  success: boolean;
  position: number | null;
  updated: boolean;
  error?: string;
}> {
  const session = await getSession();
  assert(session, "Not authenticated");

  const playlistId = process.env.PLAYLIST_ID;
  assert(playlistId, "playlistId is required");

  const position = await getTrackPositionInPlaylist(playlistId, trackUri);
  assert(position !== null, "Track not found in playlist");

  // Only update if this position is further than the stored furthest index
  const updated = await updateProgressIfFurther(position);

  return { success: true, position, updated };
}
