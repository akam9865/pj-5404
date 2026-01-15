"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { observer } from "mobx-react-lite";
import { playerStore } from "@/stores";

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const Player = observer(function Player() {
  const [localPosition, setLocalPosition] = useState(0);
  const [localVolume, setLocalVolume] = useState(0.5);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isReady, error, track, position, duration, paused, volume } =
    playerStore;

  useEffect(() => {
    if (!isDraggingSeek) {
      setLocalPosition(position);
    }
  }, [position, isDraggingSeek]);

  useEffect(() => {
    if (!isDraggingVolume) {
      setLocalVolume(volume);
    }
  }, [volume, isDraggingVolume]);

  useEffect(() => {
    if (!paused && !isDraggingSeek && duration > 0) {
      intervalRef.current = setInterval(() => {
        setLocalPosition((prev) => Math.min(prev + 1000, duration));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, isDraggingSeek, duration]);

  if (error) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6">
        <div className="text-red-400 text-center">
          <p className="font-medium">Player Error</p>
          <p className="text-sm text-red-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6">
        <div className="text-zinc-400 text-center">
          <p>Connecting to Spotify...</p>
        </div>
      </div>
    );
  }

  const albumArt = track?.album.images[0]?.url;
  const progressPercent = duration ? (localPosition / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPosition(Number(e.target.value));
  };

  const handleSeekCommit = async () => {
    setIsDraggingSeek(false);
    await playerStore.seek(localPosition);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVolume(Number(e.target.value) / 100);
  };

  const handleVolumeCommit = async () => {
    setIsDraggingVolume(false);
    await playerStore.setVolume(localVolume);
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
      {/* Track Info */}
      <div className="flex items-center gap-4">
        {albumArt ? (
          <Image
            src={albumArt}
            alt={track?.album.name || "Album art"}
            width={80}
            height={80}
            className="rounded shadow-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded bg-zinc-800 flex items-center justify-center">
            <MusicIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {track ? (
            <>
              <p className="font-semibold text-white truncate">{track.name}</p>
              <p className="text-sm text-zinc-400 truncate">
                {track.artists.map((a) => a.name).join(", ")}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {track.album.name}
              </p>
            </>
          ) : (
            <p className="text-zinc-400">No track playing</p>
          )}
        </div>
      </div>

      {/* Seek Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={localPosition}
          onChange={handleSeekChange}
          onMouseDown={() => setIsDraggingSeek(true)}
          onMouseUp={handleSeekCommit}
          onTouchStart={() => setIsDraggingSeek(true)}
          onTouchEnd={handleSeekCommit}
          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          style={{
            background: `linear-gradient(to right, #22c55e ${progressPercent}%, #3f3f46 ${progressPercent}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{formatTime(localPosition)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => playerStore.previousTrack()}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Previous"
        >
          <PreviousIcon className="w-6 h-6" />
        </button>

        <button
          onClick={() => playerStore.togglePlay()}
          className="p-3 bg-white rounded-full text-black hover:scale-105 transition-transform"
          title={paused ? "Play" : "Pause"}
        >
          {paused ? (
            <PlayIcon className="w-6 h-6" />
          ) : (
            <PauseIcon className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={() => playerStore.nextTrack()}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Next"
        >
          <NextIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3">
        <VolumeIcon className="w-5 h-5 text-zinc-400" />
        <input
          type="range"
          min={0}
          max={100}
          value={localVolume * 100}
          onChange={handleVolumeChange}
          onMouseDown={() => setIsDraggingVolume(true)}
          onMouseUp={handleVolumeCommit}
          onTouchStart={() => setIsDraggingVolume(true)}
          onTouchEnd={handleVolumeCommit}
          className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          style={{
            background: `linear-gradient(to right, #22c55e ${
              localVolume * 100
            }%, #3f3f46 ${localVolume * 100}%)`,
          }}
        />
      </div>
    </div>
  );
});

// Icons
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function PreviousIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 18l8.5-6L6 6v12zm8.5 0V6l2 0v12h-2z" />
    </svg>
  );
}

function VolumeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  );
}
