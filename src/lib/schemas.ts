import { z } from "zod";

export const SpotifySessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
});
export type SpotifySession = z.infer<typeof SpotifySessionSchema>;

export const PlaylistProgressSchema = z.object({
  furthestIndex: z.number(),
});
export type PlaylistProgress = z.infer<typeof PlaylistProgressSchema>;

export const PlaylistTrackIndexCacheSchema = z.object({
  playlistId: z.string(),
  snapshotId: z.string(),
  total: z.number(),
  createdAt: z.number(),
  indexByUri: z.record(z.string(), z.number()),
});
export type PlaylistTrackIndexCache = z.infer<typeof PlaylistTrackIndexCacheSchema>;

export const SpotifyPlaylistSchema = z.object({
  name: z.string(),
  tracks: z.object({ total: z.number() }),
});

export const SpotifyPlaylistMetaSchema = z.object({
  snapshot_id: z.string(),
  tracks: z.object({ total: z.number() }),
});

export const SpotifyPlaylistTracksPageSchema = z.object({
  items: z.array(z.object({ track: z.object({ uri: z.string().nullable() }).nullable() })),
  total: z.number(),
});

export type Playlist = {
  id: string;
  name: string;
  total: number;
};
