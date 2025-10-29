"use client";

import { useBookProgress } from "../hooks/useBookProgress";

interface PlayButtonProps {
  bookId: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function PlayButton({
  bookId,
  onClick,
  size = "md",
  className = "",
}: PlayButtonProps) {
  const { hasProgress } = useBookProgress(bookId);

  const sizeClasses = {
    sm: "py-1.5 text-xs gap-1",
    md: "py-2 text-sm gap-2",
    lg: "py-3 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full bg-accent hover:bg-accent/90 text-background rounded font-medium transition flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      <svg className={`${iconSizes[size]} fill-current`} viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      {hasProgress ? "Resume" : "Play"}
    </button>
  );
}
