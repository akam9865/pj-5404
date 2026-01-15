import { NextResponse } from "next/server";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    show_dialog: "false",
  });

  return NextResponse.redirect(`${SPOTIFY_AUTH_URL}?${params.toString()}`);
}
