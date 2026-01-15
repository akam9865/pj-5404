import { kv } from "@vercel/kv";

const SESSION_KEY = "spotify_session";

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  lastPlayedTrackUri?: string;
  lastPlayedPosition?: number; // 0-based index in playlist
  playlistId?: string;
}

export async function getSession(): Promise<SpotifySession | null> {
  return kv.get<SpotifySession>(SESSION_KEY);
}

export async function setSession(session: SpotifySession): Promise<void> {
  await kv.set(SESSION_KEY, session);
}

export async function updateSession(
  updates: Partial<SpotifySession>
): Promise<void> {
  const current = await getSession();
  if (!current) return;

  await kv.set(SESSION_KEY, { ...current, ...updates });
}

export async function clearSession(): Promise<void> {
  await kv.del(SESSION_KEY);
}
