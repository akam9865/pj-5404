import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/kv";

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  // Exchange code for tokens
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
  });

  const tokenResponse = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: params,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Token exchange failed:", errorText);
    return NextResponse.redirect(
      new URL("/?error=token_exchange_failed", request.url)
    );
  }

  const tokenData = await tokenResponse.json();

  await setSession({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  });

  return NextResponse.redirect(new URL("/", request.url));
}
