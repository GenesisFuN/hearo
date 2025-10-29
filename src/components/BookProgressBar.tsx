"use client";

import { useState, useEffect } from "react";
import { getProgress } from "../lib/progress";

interface BookProgressBarProps {
  bookId: string;
  className?: string;
}

export default function BookProgressBar({
  bookId,
  className = "",
}: BookProgressBarProps) {
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const progressData = await getProgress(bookId);
        if (progressData && progressData.completionPercentage) {
          setProgress(progressData.completionPercentage);
        }
      } catch (error) {
        console.error("Error fetching progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [bookId]);

  // Don't render anything if no progress or still loading
  if (loading || progress === 0) {
    return null;
  }

  return (
    <div className={`w-full h-1 bg-surface/60 ${className}`}>
      <div
        className="h-full bg-accent transition-all duration-300"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
