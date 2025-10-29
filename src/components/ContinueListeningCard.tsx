"use client";

import Image from "next/image";

interface ContinueListeningCardProps {
  id: string;
  title: string;
  artist: string;
  coverImage: string | null;
  progress: number;
  currentTime: number;
  duration: number;
  onPlay: () => void;
}

export default function ContinueListeningCard({
  title,
  artist,
  coverImage,
  progress,
  currentTime,
  duration,
  onPlay,
}: ContinueListeningCardProps) {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const remaining = duration - currentTime;

  return (
    <div className="group relative flex-shrink-0 w-48">
      {/* Cover Image with Play Button Overlay */}
      <div className="relative aspect-[2/3] bg-surface rounded-lg overflow-hidden shadow-lg mb-3">
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/20 to-surface">
            <div className="text-6xl">📚</div>
          </div>
        )}

        {/* Progress Bar at Bottom of Cover */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface/60">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={onPlay}
            className="px-6 py-3 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center gap-2 shadow-xl transition-transform hover:scale-110 font-medium text-background"
            aria-label={`Continue playing ${title}`}
          >
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-background border-b-[8px] border-b-transparent ml-0.5"></div>
            Resume
          </button>
        </div>
      </div>

      {/* Book Info */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm text-text-light line-clamp-2 leading-tight">
          {title}
        </h3>
        <p className="text-xs text-text-light/60 line-clamp-1">{artist}</p>

        {/* Progress Info */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-accent font-medium">{progress}% complete</span>
          <span className="text-text-light/50">
            {formatTime(remaining)} left
          </span>
        </div>
      </div>
    </div>
  );
}
