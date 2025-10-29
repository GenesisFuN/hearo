"use client";

import { useState, useRef, useEffect } from "react";

interface SpeedOption {
  value: number;
  label: string;
}

const SPEED_OPTIONS: SpeedOption[] = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1.0, label: "Normal" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 1.75, label: "1.75x" },
  { value: 2.0, label: "2x" },
];

interface SpeedSelectorProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  size?: "sm" | "md" | "lg";
}

export default function SpeedSelector({
  currentSpeed,
  onSpeedChange,
  size = "md",
}: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSpeedSelect = (speed: number) => {
    onSpeedChange(speed);
    setIsOpen(false);
  };

  const currentLabel = currentSpeed === 1.0 ? "1x" : `${currentSpeed}x`;

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Speed Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${sizeClasses[size]} bg-surface hover:bg-surface/80 text-text-light rounded-lg font-medium transition flex items-center gap-1 min-w-[60px] justify-center`}
        aria-label="Playback speed"
      >
        <span>{currentLabel}</span>
        <svg
          className={`w-3 h-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-surface border border-surface-light rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]">
          {SPEED_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSpeedSelect(option.value)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-light transition ${
                currentSpeed === option.value
                  ? "bg-accent/20 text-accent font-semibold"
                  : "text-text-light"
              }`}
            >
              {option.label}
              {currentSpeed === option.value && (
                <span className="float-right">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
