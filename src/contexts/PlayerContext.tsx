"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { getProgress } from "../lib/progress";

interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  duration?: number;
  album?: string;
  startTime?: number; // Optional start time for resuming playback
}

interface PlayerContextType {
  currentTrack: Track | null;
  setCurrentTrack: (track: Track) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  queue: Track[];
  setQueue: (tracks: Track[]) => void;
  playTrack: (track: Track) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);

  const playTrack = async (track: Track) => {
    // Automatically fetch saved progress if not already provided
    if (track.startTime === undefined) {
      const progress = await getProgress(track.id);
      if (progress && progress.progressSeconds > 30) {
        // Auto-resume if more than 30 seconds in
        track.startTime = progress.progressSeconds;
      }
    }

    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const value = useMemo(
    () => ({
      currentTrack,
      setCurrentTrack,
      isPlaying,
      setIsPlaying,
      queue,
      setQueue,
      playTrack,
    }),
    [currentTrack, isPlaying, queue]
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};
