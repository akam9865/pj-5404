"use server";

import {
  getSession,
  getPlaylistProgress,
  getPlaylistTrackIndexCache,
  setPlaylistTrackIndexCache,
  updateProgressIfFurther,
} from "@/lib/kv";
import { spotifyFetch } from "@/lib/spotify";
import {
  SpotifyPlaylistSchema,
  SpotifyPlaylistMetaSchema,
  SpotifyPlaylistTracksPageSchema,
  type Playlist,
} from "@/lib/schemas";

export async function getPlaylist(): Promise<Playlist | null> {
  const session = await getSession();
  if (!session) return null;

  const playlistId = process.env.PLAYLIST_ID;
  if (!playlistId) throw new Error("PLAYLIST_ID not configured");

  const data = await spotifyFetch(`/playlists/${playlistId}`);
  const playlist = SpotifyPlaylistSchema.parse(data);

  return {
    id: playlistId,
    name: playlist.name,
    total: playlist.tracks.total,
  };
}

export async function getFurthestIndex(): Promise<number | null> {
  const progress = await getPlaylistProgress();
  return progress?.furthestIndex ?? null;
}

export async function playOnDevice(
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "Not authenticated" };

  const playlistId = process.env.PLAYLIST_ID;
  if (!playlistId) return { success: false, error: "No playlist configured" };

  const progress = await getPlaylistProgress();

  const body: Record<string, unknown> = {
    context_uri: `spotify:playlist:${playlistId}`,
  };

  if (progress?.furthestIndex !== undefined) {
    body.offset = { position: progress.furthestIndex };
  }

  try {
    await spotifyFetch(`/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return { success: true };
  } catch {
    return { success: false, error: "Device not available" };
  }
}

export async function syncTrackPosition(trackUri: string): Promise<{
  position: number;
  updated: boolean;
}> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");

  const playlistId = process.env.PLAYLIST_ID;
  if (!playlistId) throw new Error("No playlist configured");

  const position = await getTrackPositionInPlaylist(playlistId, trackUri);
  if (position === null) throw new Error("Track not found in playlist");

  const updated = await updateProgressIfFurther(position);

  return { position, updated };
}

async function getTrackPositionInPlaylist(
  playlistId: string,
  trackUri: string
): Promise<number | null> {
  const metaData = await spotifyFetch(`/playlists/${playlistId}?fields=snapshot_id,tracks.total`);
  const meta = SpotifyPlaylistMetaSchema.parse(metaData);

  const cached = await getPlaylistTrackIndexCache(playlistId);
  if (cached && cached.snapshotId === meta.snapshot_id) {
    const pos = cached.indexByUri[trackUri];
    return typeof pos === "number" ? pos : null;
  }

  const indexByUri: Record<string, number> = {};
  let offset = 0;
  const limit = 100;

  while (offset < meta.tracks.total) {
    const pageData = await spotifyFetch(
      `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}&fields=items(track(uri)),total`
    );
    const page = SpotifyPlaylistTracksPageSchema.parse(pageData);

    for (let i = 0; i < page.items.length; i++) {
      const uri = page.items[i]?.track?.uri ?? null;
      if (uri && indexByUri[uri] === undefined) {
        indexByUri[uri] = offset + i;
      }
    }

    offset += limit;
    if (offset >= page.total) break;
  }

  await setPlaylistTrackIndexCache(playlistId, {
    playlistId,
    snapshotId: meta.snapshot_id,
    total: meta.tracks.total,
    createdAt: Date.now(),
    indexByUri,
  });

  const pos = indexByUri[trackUri];
  return typeof pos === "number" ? pos : null;
}
