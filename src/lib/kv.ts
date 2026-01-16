import { Redis } from "@upstash/redis";
import {
  SpotifySessionSchema,
  PlaylistProgressSchema,
  PlaylistTrackIndexCacheSchema,
  type SpotifySession,
  type PlaylistProgress,
  type PlaylistTrackIndexCache,
} from "./schemas";

const redis = Redis.fromEnv();
const SESSION_KEY = "spotify:session";
const PROGRESS_KEY = "playlist:progress";
const TRACK_INDEX_CACHE_PREFIX = "playlist:trackIndex:";

export async function getSession(): Promise<SpotifySession | null> {
  const data = await redis.get(SESSION_KEY);
  if (!data) return null;
  const result = SpotifySessionSchema.safeParse(data);
  return result.success ? result.data : null;
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
  const data = await redis.get(PROGRESS_KEY);
  if (!data) return null;
  const result = PlaylistProgressSchema.safeParse(data);
  return result.success ? result.data : null;
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
  const data = await redis.get(`${TRACK_INDEX_CACHE_PREFIX}${playlistId}`);
  if (!data) return null;
  const result = PlaylistTrackIndexCacheSchema.safeParse(data);
  return result.success ? result.data : null;
}

export async function setPlaylistTrackIndexCache(
  playlistId: string,
  cache: PlaylistTrackIndexCache,
  ttlSeconds = 30 * 24 * 60 * 60 // tracks are static
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
