import { z } from "zod";
import { getSession, updateSession } from "./kv";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  if (Date.now() > session.expiresAt - 60000) {
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

  if (!response.ok) return null;

  const json = await response.json();
  const result = TokenResponseSchema.safeParse(json);
  if (!result.success) return null;

  const data = result.data;

  await updateSession({
    accessToken: data.access_token,
    ...(data.refresh_token && { refreshToken: data.refresh_token }),
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return { accessToken: data.access_token };
}

export async function spotifyFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("No access token");

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
