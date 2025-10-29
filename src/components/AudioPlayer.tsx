"use client";

import { useState, useRef, useEffect } from "react";
import { usePlayer } from "../contexts/PlayerContext";
import { PlaybackSessionTracker } from "../lib/analytics";
import { ProgressTracker, getProgress, clearProgress } from "../lib/progress";
import SpeedSelector from "./SpeedSelector";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { useToast } from "./Toast";
import { logError, ErrorCodes } from "@/lib/errorHandling";

export default function AudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying } = usePlayer();
  const { showError, showToast } = useToast();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedTrackIdRef = useRef<string | null>(null);
  const trackerRef = useRef<PlaybackSessionTracker | null>(null);
  const progressTrackerRef = useRef<ProgressTracker | null>(null);
  const hasAutoSeekedRef = useRef<boolean>(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const previousVolumeRef = useRef<number>(0.7); // Store volume before muting

  // Handle audio errors
  const handleAudioError = (error: any) => {
    logError(error, "Audio Player");
    setIsLoading(false);
    setIsPlaying(false);

    const audio = audioRef.current;
    if (audio?.error) {
      const errorMessage =
        audio.error.code === MediaError.MEDIA_ERR_NETWORK
          ? "Network error while loading audio. Please check your connection."
          : audio.error.code === MediaError.MEDIA_ERR_DECODE
            ? "This audio file is corrupted or in an unsupported format."
            : audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
              ? "This audio format is not supported by your browser."
              : "Failed to load audio. Please try again.";

      showError(new Error(errorMessage));
    } else {
      showError(error);
    }
  };

  // Load saved playback speed preference on mount
  useEffect(() => {
    const savedSpeed = localStorage.getItem("playbackSpeed");
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      if (speed >= 0.5 && speed <= 2.0) {
        setPlaybackRate(speed);
      }
    }
  }, []);

  // Apply playback rate to audio element whenever it changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Apply volume to audio element whenever it changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Function to change playback speed
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackRate(speed);
    localStorage.setItem("playbackSpeed", speed.toString());
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);

      // Get duration directly from audio element (state might not be updated yet)
      const audioDuration = audio.duration;

      // Track playback progress with analytics
      if (trackerRef.current && isFinite(audioDuration) && audioDuration > 0) {
        trackerRef.current.updateProgress(audio.currentTime, audioDuration);
      }

      // Save progress every time it updates (use audio.duration directly)
      if (
        progressTrackerRef.current &&
        isFinite(audioDuration) &&
        audioDuration > 0
      ) {
        progressTrackerRef.current.update(audio.currentTime, audioDuration);
      }
    };

    const updateDuration = () => {
      const dur = audio.duration;
      if (isFinite(dur) && dur > 0) {
        setDuration(dur);
        console.log("Duration loaded:", dur);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setIsLoading(false);

      // Mark session as complete
      if (trackerRef.current) {
        trackerRef.current.complete();
        trackerRef.current = null;
      }
    };
    const handleLoadedData = () => {
      // Ensure duration is set when data is fully loaded
      updateDuration();
      setIsLoading(false);
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      console.warn(
        "Audio loading error - this is expected without a valid audio source"
      );
    };

    const handlePause = () => {
      // Pause progress tracker when audio pauses
      if (progressTrackerRef.current) {
        progressTrackerRef.current.pause();
      }
    };

    const handlePlay = () => {
      // Resume progress tracker when audio plays
      if (progressTrackerRef.current) {
        progressTrackerRef.current.resume();
      }
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("loadeddata", handleLoadedData); // Better for seeking
    audio.addEventListener("durationchange", updateDuration); // Additional event for duration changes
    audio.addEventListener("canplay", updateDuration); // Sometimes duration is only available on canplay
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("canplay", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, []);

  // Update audio source when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    console.log("Current track changed:", currentTrack);

    // Check if this is actually a different track using track ID
    const isDifferentTrack = loadedTrackIdRef.current !== currentTrack.id;

    if (isDifferentTrack) {
      console.log("Loading new track:", currentTrack.title);

      // Stop previous track's analytics session
      if (trackerRef.current) {
        trackerRef.current.stop();
        trackerRef.current = null;
      }

      // Stop previous track's progress tracking and save final position
      if (progressTrackerRef.current) {
        progressTrackerRef.current.stop();
        progressTrackerRef.current = null;
      }

      // Reset audio state only for new tracks
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
      setShowResumePrompt(false);
      setSavedProgress(null);
      hasAutoSeekedRef.current = false; // Reset auto-seek flag for new track

      // Load new audio source
      audio.src = currentTrack.src;
      audio.load();

      // Update the loaded track ID
      loadedTrackIdRef.current = currentTrack.id;

      // Check for saved progress or use provided startTime
      if (currentTrack.startTime !== undefined && currentTrack.startTime > 0) {
        // Auto-resume from provided startTime (e.g., from Continue Listening)
        setSavedProgress(currentTrack.startTime);
        setShowResumePrompt(false); // Don't show prompt, auto-resume
      } else {
        // Check database for saved progress
        getProgress(currentTrack.id).then((progress) => {
          if (progress && progress.progressSeconds > 30) {
            // Only show resume if they're more than 30 seconds in
            setSavedProgress(progress.progressSeconds);
            setShowResumePrompt(true);
          }
        });
      }

      // Add event listeners for new track
      const handleCanPlay = () => {
        setIsLoading(false);

        // Auto-seek if startTime was provided (from Continue Listening) - only once
        if (
          !hasAutoSeekedRef.current &&
          currentTrack.startTime !== undefined &&
          currentTrack.startTime > 0
        ) {
          hasAutoSeekedRef.current = true;
          audio.currentTime = currentTrack.startTime;
        }

        // Auto-play if isPlaying is true from context
        if (isPlaying) {
          audio.play().catch((error) => {
            console.log("Auto-play prevented by browser:", error);
            setIsPlaying(false);
          });
        }
      };

      const handleLoadStart = () => {
        console.log("Audio loading started:", currentTrack.title);
        setIsLoading(true);
      };

      audio.addEventListener("canplay", handleCanPlay);
      audio.addEventListener("loadstart", handleLoadStart);

      return () => {
        audio.removeEventListener("canplay", handleCanPlay);
        audio.removeEventListener("loadstart", handleLoadStart);
      };
    } else {
      console.log("Same track, not reloading:", currentTrack.title);
    }
  }, [currentTrack, isPlaying]);

  // Handle play/pause state changes from context
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying && audio.paused) {
      // Should be playing but audio is paused
      audio.play().catch((error) => {
        console.log("Play failed:", error);
        setIsPlaying(false);
      });

      // Start analytics tracking when play begins
      if (!trackerRef.current && currentTrack.id) {
        trackerRef.current = new PlaybackSessionTracker(currentTrack.id);
      }

      // Start progress tracking when play begins
      if (!progressTrackerRef.current && currentTrack.id) {
        progressTrackerRef.current = new ProgressTracker(currentTrack.id);
      } else if (progressTrackerRef.current) {
        // Resume tracking if it already exists
        progressTrackerRef.current.resume();
      }
    } else if (!isPlaying && !audio.paused) {
      // Should be paused but audio is playing
      audio.pause();

      // Pause the progress tracker (saves current position and stops interval)
      if (progressTrackerRef.current) {
        progressTrackerRef.current.pause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const audio = audioRef.current;
      if (!audio || !currentTrack) return;

      // Don't trigger shortcuts if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      // Handle special case for "?" which doesn't need toLowerCase
      if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ": // Space - play/pause
          e.preventDefault();
          // Toggle the playing state
          setIsPlaying(!isPlaying);
          break;

        case "arrowleft": // Left arrow - seek backward 15s
          e.preventDefault();
          audio.currentTime = Math.max(0, audio.currentTime - 15);
          break;

        case "arrowright": // Right arrow - seek forward 15s
          e.preventDefault();
          audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
          break;

        case "arrowup": // Up arrow - increase volume
          e.preventDefault();
          setVolume((v) => {
            const newVolume = Math.min(1, v + 0.1);
            previousVolumeRef.current = newVolume; // Save for unmute
            return newVolume;
          });
          break;

        case "arrowdown": // Down arrow - decrease volume
          e.preventDefault();
          setVolume((v) => {
            const newVolume = Math.max(0, v - 0.1);
            if (newVolume > 0) {
              previousVolumeRef.current = newVolume; // Save for unmute
            }
            return newVolume;
          });
          break;

        case "m": // M - toggle mute
          e.preventDefault();
          setVolume((v) => {
            if (v > 0) {
              previousVolumeRef.current = v; // Save current volume before muting
              return 0;
            } else {
              return previousVolumeRef.current || 0.7; // Restore previous volume
            }
          });
          break;

        case "f": // F - toggle fullscreen
          e.preventDefault();
          if (isFullScreen) {
            handleCloseFullScreen();
          } else {
            setIsFullScreen(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen, isPlaying, currentTrack?.id]); // Use currentTrack?.id instead of currentTrack object

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || isLoading) return;

    setIsLoading(true);

    // Add timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setIsPlaying(false);
      console.warn("Audio play timeout - no valid audio source");
    }, 3000);

    try {
      if (isPlaying) {
        clearTimeout(timeoutId);
        audio.pause(); // This will trigger 'pause' event → handlePause()
        setIsPlaying(false);
        setIsLoading(false);
      } else {
        // Check if audio has a valid source
        if (!audio.src || !hasValidSource) {
          clearTimeout(timeoutId);
          setIsLoading(false);
          console.warn("No valid audio source available");
          return;
        }

        // Wait for any previous operations to complete
        await audio.play(); // This will trigger 'play' event → handlePlay()
        clearTimeout(timeoutId);
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      // Handle AbortError and other playback errors gracefully
      if (error instanceof Error && error.name !== "AbortError") {
        console.warn("Audio playback error:", error.message);
      }
      // Reset playing state on any error
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Check if duration is valid before seeking
    if (!isFinite(duration) || duration === 0) {
      console.warn("Cannot seek: audio duration not yet available");
      return;
    }

    const newTime = (parseFloat(e.target.value) / 100) * duration;

    // Validate the new time is within bounds
    if (isFinite(newTime) && newTime >= 0 && newTime <= duration) {
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const newVolume = parseFloat(e.target.value) / 100;

    setVolume(newVolume);
    if (audio) {
      audio.volume = newVolume;
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time) || time < 0) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleCloseFullScreen = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFullScreen(false);
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  const handleResume = () => {
    const audio = audioRef.current;
    if (audio && savedProgress) {
      audio.currentTime = savedProgress;
      setCurrentTime(savedProgress);
      setShowResumePrompt(false);
      setSavedProgress(null);
    }
  };

  const handleStartOver = async () => {
    const audio = audioRef.current;
    if (audio && currentTrack) {
      await clearProgress(currentTrack.id);
      audio.currentTime = 0;
      setCurrentTime(0);
      setShowResumePrompt(false);
      setSavedProgress(null);
    }
  };

  const progress =
    isFinite(duration) && duration > 0 ? (currentTime / duration) * 100 : 0;

  // Check if there's a valid audio source
  const hasValidSource =
    currentTrack && currentTrack.src && currentTrack.src.trim() !== "";

  // console.log("AudioPlayer render:", { currentTrack, hasValidSource });

  return (
    <>
      {/* Full Screen Now Playing View */}
      {isFullScreen && currentTrack && (
        <div
          className={`fixed inset-0 bg-background z-[9999] flex flex-col ${
            isClosing ? "animate-slide-down" : "animate-slide-up"
          }`}
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between p-6 border-b border-surface">
            <h2 className="text-lg font-semibold text-text-light">
              Now Playing
            </h2>
            <button
              onClick={handleCloseFullScreen}
              className="w-10 h-10 rounded-full bg-surface hover:bg-surface-light transition flex items-center justify-center text-text-light"
              aria-label="Close full screen"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 overflow-y-auto">
            {/* Album Art */}
            <div className="w-full max-w-[320px] md:max-w-[400px] mx-auto">
              <div className="aspect-[2/3] bg-gradient-to-br from-accent/20 to-surface rounded-lg shadow-2xl overflow-hidden">
                {currentTrack.cover ? (
                  <img
                    src={currentTrack.cover}
                    alt={currentTrack.title}
                    className="w-full h-full object-contain bg-surface/20"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-accent/20 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-accent"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Track Info */}
            <div className="text-center px-4 max-w-2xl">
              <h1 className="text-2xl md:text-3xl font-bold text-text-light mb-2 line-clamp-2">
                {currentTrack.title}
              </h1>
              <p className="text-lg text-text-light/70">
                {currentTrack.artist}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-2xl px-4">
              <div className="flex items-center gap-2 text-sm text-text-light/70 mb-2">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${progress}%, var(--color-surface) ${progress}%, var(--color-surface) 100%)`,
                    }}
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Large Playback Controls */}
            <div className="flex items-center gap-8">
              <button className="w-14 h-14 flex items-center justify-center rounded-full hover:bg-surface transition group">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-6 bg-text-light/70 group-hover:bg-accent transition"></div>
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-r-[16px] border-r-text-light/70 group-hover:border-r-accent border-b-[12px] border-b-transparent transition"></div>
                </div>
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading || !hasValidSource}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition ${
                  isLoading
                    ? "bg-accent/50 cursor-not-allowed"
                    : !hasValidSource
                      ? "bg-surface border-2 border-accent/50 cursor-not-allowed"
                      : "bg-accent hover:bg-accent/80 cursor-pointer shadow-xl"
                }`}
              >
                {isLoading ? (
                  <div className="w-8 h-8 border-4 border-background/30 border-t-background rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <div className="flex gap-2">
                    <div className="w-2 h-8 bg-background"></div>
                    <div className="w-2 h-8 bg-background"></div>
                  </div>
                ) : (
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-background border-b-[12px] border-b-transparent ml-1"></div>
                )}
              </button>

              <button className="w-14 h-14 flex items-center justify-center rounded-full hover:bg-surface transition group">
                <div className="flex items-center gap-1">
                  <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[16px] border-l-text-light/70 group-hover:border-l-accent border-b-[12px] border-b-transparent transition"></div>
                  <div className="w-2 h-6 bg-text-light/70 group-hover:bg-accent transition"></div>
                </div>
              </button>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-4 w-full max-w-md px-4">
              <div className="flex items-center text-text-light/70">
                <div className="relative flex items-center">
                  <div className="w-3 h-4 bg-text-light/70 rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-text-light/70 ml-1"></div>
                  <div className="w-1.5 h-3 bg-text-light/70 ml-1"></div>
                  <div className="w-1.5 h-4 bg-text-light/70 ml-1"></div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={handleVolumeChange}
                className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${volume * 100}%, var(--color-surface) ${volume * 100}%, var(--color-surface) 100%)`,
                }}
              />
            </div>

            {/* Playback Speed Control */}
            <div className="flex items-center gap-4 w-full max-w-md px-4">
              <span className="text-sm text-text-light/70 font-medium min-w-[80px]">
                Speed:
              </span>
              <SpeedSelector
                currentSpeed={playbackRate}
                onSpeedChange={changePlaybackSpeed}
                size="lg"
              />
            </div>
          </div>
        </div>
      )}

      <div className="w-full bg-surface/95 text-text-light backdrop-blur-md border-t border-surface/40 px-6 py-4">
        <audio
          ref={audioRef}
          preload="metadata"
          onError={(e) => handleAudioError(e)}
        >
          {/* Add your audio source here */}
          {currentTrack && <source src={currentTrack.src} type="audio/mpeg" />}
        </audio>

        {/* Resume Prompt */}
        {showResumePrompt && savedProgress && (
          <div className="max-w-6xl mx-auto mb-4 bg-accent/10 border border-accent/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-accent"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-light">
                  Resume from {formatTime(savedProgress)}?
                </p>
                <p className="text-xs text-text-light/60">
                  You were listening to this book before
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-surface hover:bg-surface/80 text-text-light rounded-lg text-sm font-medium transition"
              >
                Start Over
              </button>
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-accent hover:bg-accent/90 text-background rounded-lg text-sm font-medium transition"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsFullScreen(true)}
              disabled={!hasValidSource}
              className={`w-12 h-12 bg-surface rounded-lg flex items-center justify-center overflow-hidden transition-transform hover:scale-105 ${
                hasValidSource
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-50"
              }`}
              aria-label="Open full screen player"
            >
              {hasValidSource && currentTrack.cover ? (
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-accent"></div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2">
                    <div className="w-full h-0.5 bg-accent/60 rounded transform rotate-12"></div>
                    <div className="w-full h-0.5 bg-accent/60 rounded transform -rotate-12 -mt-0.5"></div>
                  </div>
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm text-text-light truncate">
                {hasValidSource ? currentTrack.title : "No audio loaded"}
              </h3>
              <p className="text-xs text-text-light/70 truncate">
                {hasValidSource
                  ? currentTrack.artist
                  : "Add an audio source to play"}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface/50 transition group">
                <div className="flex items-center gap-0.5">
                  <div className="w-1 h-3 bg-text-light/70 group-hover:bg-accent transition"></div>
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-text-light/70 group-hover:border-r-accent border-b-[6px] border-b-transparent transition"></div>
                </div>
              </button>

              <button
                onClick={togglePlay}
                disabled={isLoading || !hasValidSource}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition relative ${
                  isLoading
                    ? "bg-accent/50 cursor-not-allowed"
                    : !hasValidSource
                      ? "bg-surface border border-accent/50 cursor-not-allowed"
                      : "bg-accent hover:bg-accent/80 cursor-pointer"
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                ) : !hasValidSource ? (
                  <div className="w-4 h-4 rounded-full border-2 border-accent/50 flex items-center justify-center">
                    <div className="w-2 h-0.5 bg-accent/50 transform rotate-45 absolute"></div>
                    <div className="w-2 h-0.5 bg-accent/50 transform -rotate-45 absolute"></div>
                  </div>
                ) : isPlaying ? (
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-background"></div>
                    <div className="w-1 h-4 bg-background"></div>
                  </div>
                ) : (
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-background border-b-[6px] border-b-transparent ml-0.5"></div>
                )}
              </button>

              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface/50 transition group">
                <div className="flex items-center gap-0.5">
                  <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[8px] border-l-text-light/70 group-hover:border-l-accent border-b-[6px] border-b-transparent transition"></div>
                  <div className="w-1 h-3 bg-text-light/70 group-hover:bg-accent transition"></div>
                </div>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full text-xs text-text-light/70">
              <span>{formatTime(currentTime)}</span>

              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${progress}%, var(--color-surface) ${progress}%, var(--color-surface) 100%)`,
                  }}
                />
              </div>

              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
            <div className="flex items-center gap-2">
              <div className="flex items-center text-text-light/70">
                <div className="relative flex items-center">
                  <div className="w-2 h-3 bg-text-light/70 rounded-sm"></div>
                  <div className="w-1 h-1 bg-text-light/70 ml-0.5"></div>
                  <div className="w-1 h-2 bg-text-light/70 ml-0.5"></div>
                  <div className="w-1 h-3 bg-text-light/70 ml-0.5"></div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={handleVolumeChange}
                className="w-40 h-1 bg-surface rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${volume * 100}%, var(--color-surface) ${volume * 100}%, var(--color-surface) 100%)`,
                }}
              />
            </div>

            {/* Speed Control */}
            <SpeedSelector
              currentSpeed={playbackRate}
              onSpeedChange={changePlaybackSpeed}
              size="sm"
            />
          </div>
        </div>

        {/* Full Screen Now Playing View */}
        {isFullScreen && (
          <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-6 border-b border-surface">
              <h2 className="text-lg font-semibold text-text-light">
                Now Playing
              </h2>
              <button
                onClick={() => setIsFullScreen(false)}
                className="w-10 h-10 rounded-full bg-surface hover:bg-surface-light transition flex items-center justify-center text-text-light"
                aria-label="Close full screen"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-auto">
              <div className="max-w-lg w-full flex flex-col items-center gap-6 md:gap-8">
                {/* Large Album Art */}
                <div className="w-full max-w-[320px] md:max-w-[400px] mx-auto">
                  <div className="aspect-[2/3] bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl overflow-hidden shadow-2xl">
                    {hasValidSource && currentTrack.cover ? (
                      <img
                        src={currentTrack.cover}
                        alt={currentTrack.title}
                        className="w-full h-full object-contain bg-surface/20"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-9xl">🎧</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Info */}
                <div className="text-center space-y-2 w-full px-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-text-light line-clamp-2">
                    {hasValidSource ? currentTrack.title : "No audio loaded"}
                  </h1>
                  <p className="text-lg md:text-xl text-text-light/70">
                    {hasValidSource
                      ? currentTrack.artist
                      : "Add an audio source to play"}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full space-y-2 px-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${(currentTime / (duration || 1)) * 100}%, rgb(var(--surface)) ${(currentTime / (duration || 1)) * 100}%, rgb(var(--surface)) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-sm text-text-light/70">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Large Controls */}
                <div className="flex items-center gap-6">
                  <button className="w-14 h-14 flex items-center justify-center rounded-full hover:bg-surface transition group">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-6 bg-text-light/70 group-hover:bg-accent transition"></div>
                      <div className="w-0 h-0 border-t-[10px] border-t-transparent border-r-[14px] border-r-text-light/70 group-hover:border-r-accent border-b-[10px] border-b-transparent transition"></div>
                    </div>
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={isLoading || !hasValidSource}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition relative ${
                      isLoading
                        ? "bg-accent/50 cursor-not-allowed"
                        : !hasValidSource
                          ? "bg-surface border-2 border-accent/50 cursor-not-allowed"
                          : "bg-accent hover:bg-accent/80 cursor-pointer shadow-xl"
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-8 h-8 border-4 border-background/30 border-t-background rounded-full animate-spin"></div>
                    ) : !hasValidSource ? (
                      <div className="w-8 h-8 rounded-full border-4 border-accent/50 flex items-center justify-center">
                        <div className="w-4 h-1 bg-accent/50 transform rotate-45 absolute"></div>
                        <div className="w-4 h-1 bg-accent/50 transform -rotate-45 absolute"></div>
                      </div>
                    ) : isPlaying ? (
                      <div className="flex gap-2">
                        <div className="w-2 h-8 bg-background"></div>
                        <div className="w-2 h-8 bg-background"></div>
                      </div>
                    ) : (
                      <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-background border-b-[12px] border-b-transparent ml-1"></div>
                    )}
                  </button>

                  <button className="w-14 h-14 flex items-center justify-center rounded-full hover:bg-surface transition group">
                    <div className="flex items-center gap-1">
                      <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[14px] border-l-text-light/70 group-hover:border-l-accent border-b-[10px] border-b-transparent transition"></div>
                      <div className="w-2 h-6 bg-text-light/70 group-hover:bg-accent transition"></div>
                    </div>
                  </button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-4 w-full max-w-sm">
                  <div className="flex items-center text-text-light/70">
                    <div className="relative flex items-center">
                      <div className="w-3 h-5 bg-text-light/70 rounded-sm"></div>
                      <div className="w-1.5 h-1.5 bg-text-light/70 ml-1"></div>
                      <div className="w-1.5 h-3 bg-text-light/70 ml-1"></div>
                      <div className="w-1.5 h-5 bg-text-light/70 ml-1"></div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={handleVolumeChange}
                    className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${volume * 100}%, rgb(var(--surface)) ${volume * 100}%, rgb(var(--surface)) 100%)`,
                    }}
                  />
                  <span className="text-sm text-text-light/70 w-12 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>

                {/* Playback Speed Control */}
                <div className="flex items-center gap-4 w-full max-w-sm">
                  <span className="text-sm text-text-light/70 font-medium min-w-[80px]">
                    Speed:
                  </span>
                  <SpeedSelector
                    currentSpeed={playbackRate}
                    onSpeedChange={changePlaybackSpeed}
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </>
  );
}
