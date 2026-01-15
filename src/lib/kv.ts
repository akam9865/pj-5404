import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const SESSION_KEY = "spotify:session";
const PROGRESS_KEY = "playlist:progress";
const TRACK_INDEX_CACHE_PREFIX = "playlist:trackIndex:";

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface PlaylistProgress {
  furthestIndex: number; // 0-based, only increments forward
}

export interface PlaylistTrackIndexCache {
  playlistId: string;
  snapshotId: string;
  total: number;
  createdAt: number;
  indexByUri: Record<string, number>;
}

export async function getSession(): Promise<SpotifySession | null> {
  return redis.get<SpotifySession>(SESSION_KEY);
}

export async function setSession(session: SpotifySession): Promise<void> {
  await redis.set(SESSION_KEY, session);
}

export async function updateSession(
  updates: Partial<SpotifySession>
): Promise<void> {
  const current = await getSession();
  if (!current) return;

  await redis.set(SESSION_KEY, { ...current, ...updates });
}

export async function clearSession(): Promise<void> {
  await redis.del(SESSION_KEY);
}

export async function getPlaylistProgress(): Promise<PlaylistProgress | null> {
  return redis.get<PlaylistProgress>(PROGRESS_KEY);
}

export async function setPlaylistProgress(
  progress: PlaylistProgress
): Promise<void> {
  await redis.set(PROGRESS_KEY, progress);
}

export async function updateProgressIfFurther(
  newIndex: number
): Promise<boolean> {
  const current = await getPlaylistProgress();
  if (newIndex > (current?.furthestIndex ?? -1)) {
    await setPlaylistProgress({ furthestIndex: newIndex });
    return true;
  }
  return false;
}

export async function getPlaylistTrackIndexCache(
  playlistId: string
): Promise<PlaylistTrackIndexCache | null> {
  return redis.get<PlaylistTrackIndexCache>(
    `${TRACK_INDEX_CACHE_PREFIX}${playlistId}`
  );
}

export async function setPlaylistTrackIndexCache(
  playlistId: string,
  cache: PlaylistTrackIndexCache,
  ttlSeconds = 60 * 60 // 1 hour
): Promise<void> {
  await redis.set(`${TRACK_INDEX_CACHE_PREFIX}${playlistId}`, cache, {
    ex: ttlSeconds,
  });
}

export async function clearPlaylistTrackIndexCache(
  playlistId: string
): Promise<void> {
  await redis.del(`${TRACK_INDEX_CACHE_PREFIX}${playlistId}`);
}
