"use client";

import { useEffect, useState, useCallback } from "react";
import { getProgress, getDevices, playOnDevice, syncProgress, Device, Progress } from "./actions";

export default function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [progressData, devicesData] = await Promise.all([
        getProgress(),
        getDevices(),
      ]);
      setProgress(progressData);
      setDevices(devicesData);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    const result = await syncProgress();
    if (result.success) {
      await fetchData();
    } else {
      setError(result.error || "Sync failed");
    }
    setSyncing(false);
  };

  const handlePlay = async (deviceId: string) => {
    setPlaying(deviceId);
    setError(null);
    const result = await playOnDevice(deviceId);
    if (!result.success) {
      setError(result.error || "Failed to start playback");
    }
    setPlaying(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-6">
        <h1 className="text-2xl font-bold">Playlist Progress Tracker</h1>
        <p className="text-zinc-400">Track your progress through a long playlist</p>
        <a
          href="/api/auth/spotify"
          className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-full font-semibold transition-colors"
        >
          Login with Spotify
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Playlist Progress</h1>
          {progress.playlistName && (
            <p className="text-zinc-400">{progress.playlistName}</p>
          )}
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Current Position</span>
            <span className="text-2xl font-mono">
              {progress.lastPlayedPosition !== null
                ? `${progress.lastPlayedPosition + 1}`
                : "—"}
              <span className="text-zinc-500 text-lg">
                {progress.playlistTotal ? ` / ${progress.playlistTotal}` : ""}
              </span>
            </span>
          </div>

          {progress.playlistTotal && progress.lastPlayedPosition !== null && (
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${((progress.lastPlayedPosition + 1) / progress.playlistTotal) * 100}%`,
                }}
              />
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-2 rounded transition-colors"
          >
            {syncing ? "Syncing..." : "Sync Current Position"}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-300">Play On Device</h2>
          {devices.length === 0 ? (
            <p className="text-zinc-500">
              No devices found. Open Spotify on a device to see it here.
            </p>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handlePlay(device.id)}
                  disabled={playing !== null}
                  className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 px-4 py-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <DeviceIcon type={device.type} />
                    <div className="text-left">
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-zinc-500">{device.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {device.is_active && (
                      <span className="text-xs bg-green-600 px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                    {playing === device.id ? (
                      <span className="text-zinc-400">Starting...</span>
                    ) : (
                      <PlayIcon />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function DeviceIcon({ type }: { type: string }) {
  const className = "w-6 h-6 text-zinc-400";

  switch (type.toLowerCase()) {
    case "computer":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "smartphone":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "speaker":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
  }
}

function PlayIcon() {
  return (
    <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
