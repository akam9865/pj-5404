"use client";

import { useEffect } from "react";
import { observer } from "mobx-react-lite";
import { Player } from "@/components/Player";
import { playerStore, progressStore } from "@/stores";

const Home = observer(function Home() {
  useEffect(() => {
    progressStore.fetchProgress();
  }, []);

  const isAuthenticated = progressStore.progress !== null;

  useEffect(() => {
    if (!isAuthenticated) return;
    playerStore.init();
    return () => playerStore.disconnect();
  }, [isAuthenticated]);

  if (progressStore.loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!progressStore.progress) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-6">
        <h1 className="text-2xl font-bold">PJ 5404</h1>

        <a
          href="/api/auth/spotify"
          className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-full font-semibold transition-colors"
        >
          Login with Spotify
        </a>
      </main>
    );
  }

  const { progress, progressPercent } = progressStore;

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header & Progress */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Playlist Progress</h1>
            {progress.playlistName && (
              <p className="text-zinc-400">{progress.playlistName}</p>
            )}
          </div>

          <div className="bg-zinc-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Furthest Position</span>
              <span className="text-xl font-mono">
                {progress.furthestIndex !== null
                  ? progress.furthestIndex + 1
                  : "—"}
                <span className="text-zinc-500 text-base">
                  {progress.playlistTotal ? ` / ${progress.playlistTotal}` : ""}
                </span>
              </span>
            </div>

            {progress.playlistTotal && progress.furthestIndex !== null && (
              <div className="space-y-1">
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 text-right">
                  {progressPercent.toFixed(2)}% complete
                </p>
              </div>
            )}
          </div>
        </div>

        {progressStore.error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {progressStore.error}
          </div>
        )}

        {/* Player */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-300">Web Player</h2>
          <Player />

          {playerStore.isReady && !playerStore.track && (
            <button
              onClick={() =>
                progressStore.startPlaybackOnDevice(playerStore.deviceId!)
              }
              className="w-full bg-green-600 hover:bg-green-500 px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              Start Playing from Furthest Position
            </button>
          )}
        </div>
      </div>
    </main>
  );
});

export default Home;
