"use client";

import { usePlayer } from "../contexts/PlayerContext";

interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  duration?: number;
  album?: string;
}

interface TrackCardProps {
  track: Track;
  className?: string;
}

export default function TrackCard({ track, className = "" }: TrackCardProps) {
  const { currentTrack, playTrack, isPlaying } = usePlayer();

  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlay = () => {
    console.log("TrackCard clicked:", track.title);
    playTrack(track); // This will set the track and auto-play it
  };

  return (
    <div
      className={`group bg-surface/80 hover:bg-surface rounded-lg p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={handlePlay}
    >
      <div className="flex items-center gap-4">
        {/* Cover Art */}
        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-surface flex-shrink-0">
          {track.cover ? (
            <img
              src={track.cover}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-accent"></div>
              </div>
            </div>
          )}

          {/* Play Overlay */}
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isCurrentTrack && isPlaying ? (
              <div className="flex gap-1">
                <div
                  className="w-1 h-4 bg-accent animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-1 h-4 bg-accent animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
              </div>
            ) : (
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-accent border-b-[8px] border-b-transparent ml-1"></div>
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium text-sm truncate transition-colors ${
              isCurrentTrack
                ? "text-accent"
                : "text-text-light group-hover:text-accent"
            }`}
          >
            {track.title}
          </h3>
          <p className="text-xs text-text-light/70 truncate">{track.artist}</p>
          {track.album && (
            <p className="text-xs text-text-light/50 truncate">{track.album}</p>
          )}
        </div>

        {/* Duration */}
        {track.duration && (
          <div className="text-xs text-text-light/70 flex-shrink-0">
            {Math.floor(track.duration / 60)}:
            {(track.duration % 60).toString().padStart(2, "0")}
          </div>
        )}

        {/* Playing Indicator */}
        {isCurrentTrack && (
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1">
              <div
                className="w-1 h-3 bg-accent animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-1 h-3 bg-accent animate-bounce"
                style={{ animationDelay: "100ms" }}
              ></div>
              <div
                className="w-1 h-3 bg-accent animate-bounce"
                style={{ animationDelay: "200ms" }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
